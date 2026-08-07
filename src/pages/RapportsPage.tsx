import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui/Spinner'
import { formatHTG } from '../lib/utils'
import {
  TrendingUp, TrendingDown, Package, Truck, CreditCard,
  AlertTriangle, Filter, Calendar,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { CreditTab } from '../components/CreditTab'

// ── Helpers dates ─────────────────────────────────────────────────────────────

function subDays(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function fmtDay(d: Date) { return DAY_NAMES[d.getDay()] }
function fmtDDMM(d: Date) { return `${d.getDate()}/${d.getMonth() + 1}` }
function fmtMonth(d: Date) { return MONTH_NAMES[d.getMonth()] }

interface Bucket { label: string; start: Date; end: Date }

function getBuckets(startDate: Date, endDate: Date): Bucket[] {
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const buckets: Bucket[] = []

  if (diffDays <= 8) {
    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      buckets.push({ label: fmtDay(d), start: startOfDay(d), end: endOfDay(d) })
    }
  } else if (diffDays <= 32) {
    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      buckets.push({ label: fmtDDMM(d), start: startOfDay(d), end: endOfDay(d) })
    }
  } else if (diffDays <= 100) {
    // Semaines
    const cur = new Date(startDate)
    while (cur <= endDate) {
      const wEnd = new Date(cur)
      wEnd.setDate(wEnd.getDate() + 6)
      wEnd.setHours(23, 59, 59, 999)
      buckets.push({
        label: fmtDDMM(cur),
        start: new Date(cur),
        end: wEnd > endDate ? endDate : wEnd,
      })
      cur.setDate(cur.getDate() + 7)
    }
  } else {
    // Mois
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (cur <= endDate) {
      const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999)
      buckets.push({
        label: fmtMonth(cur),
        start: new Date(cur),
        end: mEnd > endDate ? endDate : mEnd,
      })
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  return buckets
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface VenteRaw { created_at: string; total: number }
interface VenteLigneRaw { produit_id: string; quantite: number; prix_unitaire: number; sous_total: number; mla_produits: { nom: string; prix_achat: number } | null }
interface AchatRaw { created_at: string; montant_total: number; mla_fournisseurs: { nom: string } | null }
interface DepenseRaw { date_depense: string; montant: number }
interface ProduitRaw { id: string; prix_achat: number }

type Tab = 'tendances' | 'produits' | 'fournisseurs' | 'credits'

const PERIODES = [
  { key: 'today',   label: "Aujourd'hui", days: 0 },
  { key: '7days',   label: '7 derniers jours', days: 7 },
  { key: '30days',  label: '30 derniers jours', days: 30 },
  { key: '3months', label: '3 mois', days: 90 },
  { key: 'year',    label: 'Cette année', days: 365 },
]

// ── Composant KPI ─────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, color, icon, negative }:
  { title: string; value: string; sub?: string; color: string; icon: React.ReactNode; negative?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-[#D4CAB8] p-3.5 shadow-sm">
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-xs font-medium text-[#78726A]">{title}</p>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className={`text-xl font-black leading-tight ${negative ? 'text-red-600' : 'text-[#2C2420]'}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-[#A09589] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function RapportsPage() {
  const [periode, setPeriode] = useState('7days')
  const [periodeOpen, setPeriodeOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('tendances')
  const [loading, setLoading] = useState(true)

  const [ventes, setVentes] = useState<VenteRaw[]>([])
  const [lignes, setLignes] = useState<VenteLigneRaw[]>([])
  const [achats, setAchats] = useState<AchatRaw[]>([])
  const [depenses, setDepenses] = useState<DepenseRaw[]>([])
  const [produitsSansCout, setProduitsSansCout] = useState(0)

  const periodeLabel = PERIODES.find(p => p.key === periode)?.label || ''

  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    if (periode === 'today') {
      return { startDate: startOfDay(now), endDate: endOfDay(now) }
    }
    const days = PERIODES.find(p => p.key === periode)?.days || 7
    return { startDate: subDays(days), endDate: now }
  }, [periode])

  useEffect(() => { loadData() }, [periode])

  const loadData = async () => {
    setLoading(true)
    const now = new Date()
    const sd = periode === 'today' ? startOfDay(now) : subDays(PERIODES.find(p => p.key === periode)?.days || 7)

    const [{ data: v }, { data: a }, { data: dep }, { data: prods }] = await Promise.all([
      supabase.from('mla_ventes').select('id, created_at, total').gte('created_at', sd.toISOString()).neq('statut', 'annulee'),
      supabase.from('mla_achats').select('created_at, montant_total, mla_fournisseurs(nom)').gte('created_at', sd.toISOString()),
      supabase.from('mla_depenses').select('date_depense, montant').gte('date_depense', sd.toISOString().split('T')[0]),
      supabase.from('mla_produits').select('id, prix_achat').eq('actif', true),
    ])

    const venteIds = (v || []).map((x: Record<string, unknown>) => (x as { id?: string }).id).filter(Boolean)
    let l: VenteLigneRaw[] = []
    if (venteIds.length > 0) {
      // Fetch lignes for CMV calculation
      const { data: lData } = await supabase
        .from('mla_ventes_lignes')
        .select('produit_id, quantite, prix_unitaire, sous_total, mla_produits(nom, prix_achat)')
        .in('vente_id', venteIds)
      l = (lData || []) as unknown as VenteLigneRaw[]
    }

    setVentes((v || []) as VenteRaw[])
    setLignes(l)
    setAchats((a || []) as unknown as AchatRaw[])
    setDepenses((dep || []) as DepenseRaw[])
    setProduitsSansCout((prods || []).filter((p: ProduitRaw) => !p.prix_achat || p.prix_achat === 0).length)
    setLoading(false)
  }

  // ── Totaux ──────────────────────────────────────────────────────────────────

  const caTotal = useMemo(() => ventes.reduce((a, v) => a + (v.total || 0), 0), [ventes])
  const totalAchats = useMemo(() => achats.reduce((a, x) => a + (x.montant_total || 0), 0), [achats])
  const totalDepenses = useMemo(() => depenses.reduce((a, d) => a + (d.montant || 0), 0), [depenses])
  const cmv = useMemo(() =>
    lignes.reduce((a, l) => {
      const pa = l.mla_produits?.prix_achat || 0
      return a + (l.quantite || 0) * pa
    }, 0), [lignes])
  const margeBrute = caTotal - cmv
  const benefice = margeBrute - totalDepenses
  const margePct = caTotal > 0 ? ((benefice / caTotal) * 100).toFixed(1) : '0'

  // ── Chart data ───────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (!ventes.length && !achats.length) return []
    const buckets = getBuckets(startDate, endDate)
    return buckets.map(b => {
      let revenus = 0; let depensesB = 0
      ventes.forEach(v => {
        const d = new Date(v.created_at)
        if (d >= b.start && d <= b.end) revenus += v.total || 0
      })
      achats.forEach(a => {
        const d = new Date(a.created_at)
        if (d >= b.start && d <= b.end) depensesB += a.montant_total || 0
      })
      return { name: b.label, Revenus: revenus, Depenses: depensesB }
    })
  }, [ventes, achats, startDate, endDate])

  // ── Tendances (LineChart CA journalier) ──────────────────────────────────────

  const trendsData = useMemo(() => {
    const buckets = getBuckets(startDate, endDate)
    return buckets.map(b => {
      let ca = 0
      ventes.forEach(v => {
        const d = new Date(v.created_at)
        if (d >= b.start && d <= b.end) ca += v.total || 0
      })
      return { name: b.label, CA: ca }
    })
  }, [ventes, startDate, endDate])

  // ── Top produits ─────────────────────────────────────────────────────────────

  const topProduits = useMemo(() => {
    const byProd: Record<string, { nom: string; qte: number; ca: number; marge: number }> = {}
    lignes.forEach(l => {
      const nom = l.mla_produits?.nom || 'Inconnu'
      const pa = l.mla_produits?.prix_achat || 0
      if (!byProd[l.produit_id]) byProd[l.produit_id] = { nom, qte: 0, ca: 0, marge: 0 }
      byProd[l.produit_id].qte += l.quantite || 0
      byProd[l.produit_id].ca += l.sous_total || 0
      byProd[l.produit_id].marge += (l.quantite || 0) * (l.prix_unitaire - pa)
    })
    return Object.values(byProd).sort((a, b) => b.ca - a.ca).slice(0, 10)
  }, [lignes])

  // ── Top fournisseurs ─────────────────────────────────────────────────────────

  const topFournisseurs = useMemo(() => {
    const byF: Record<string, { nom: string; total: number }> = {}
    achats.forEach(a => {
      const nom = a.mla_fournisseurs?.nom || 'Inconnu'
      if (!byF[nom]) byF[nom] = { nom, total: 0 }
      byF[nom].total += a.montant_total || 0
    })
    return Object.values(byF).sort((a, b) => b.total - a.total)
  }, [achats])

  const tooltipStyle = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#1A1210]">Rapports</h2>
        <div className="w-10 h-0.5 bg-[#8B6400] rounded-full mt-1 mb-0.5" />
        <p className="text-[11px] text-[#A09589]">Analyses et statistiques financières</p>
      </div>

      {/* Sélecteur période */}
      <div className="relative">
        <button
          onClick={() => setPeriodeOpen(p => !p)}
          className="w-full flex items-center justify-between border border-[#D4CAB8] rounded-xl px-4 py-3 bg-white text-sm font-semibold text-[#4A4540] hover:border-[#3DAA35] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-[#A09589]" />
            {periodeLabel}
          </div>
          <Filter size={14} className="text-[#A09589]" />
        </button>
        {periodeOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D4CAB8] rounded-xl shadow-xl z-20 overflow-hidden">
            {PERIODES.map(p => (
              <button
                key={p.key}
                onClick={() => { setPeriode(p.key); setPeriodeOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  periode === p.key
                    ? 'bg-[#3DAA35] text-[#2D6B2D] font-bold'
                    : 'text-[#4A4540] hover:bg-[#FAF7F2]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Warning produits sans coût */}
      {produitsSansCout > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">
                {produitsSansCout} produit{produitsSansCout > 1 ? 's' : ''} sans coût d'achat renseigné
              </p>
              <p className="text-xs text-amber-600 mt-0.5">La marge brute est sous-estimée et le bénéfice peut être surestimé.</p>
            </div>
          </div>
          <button
            className="mt-2.5 w-full border border-amber-300 text-amber-700 rounded-lg py-2 text-xs font-semibold hover:bg-amber-100 transition-colors"
            onClick={() => {}}
          >
            Compléter les coûts dans Stock
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* ── 6 KPI CARDS ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2.5">
            <KpiCard
              title="Ventes"
              value={formatHTG(caTotal)}
              sub={`Sur la période`}
              color="bg-green-100"
              icon={<TrendingUp size={13} className="text-[#3DAA35]" />}
            />
            <KpiCard
              title="Achats fournisseurs"
              value={formatHTG(totalAchats)}
              sub={`${achats.length} commande${achats.length !== 1 ? 's' : ''}`}
              color="bg-[#EEF7EE]"
              icon={<Truck size={13} className="text-[#3DAA35]" />}
            />
            <KpiCard
              title="Dépenses"
              value={formatHTG(totalDepenses)}
              sub="Charges d'exploitation"
              color="bg-red-100"
              icon={<TrendingDown size={13} className="text-red-500" />}
              negative={totalDepenses > 0}
            />
            <KpiCard
              title="Marge brute"
              value={formatHTG(margeBrute)}
              sub={`CMV: ${formatHTG(cmv)}`}
              color="bg-emerald-100"
              icon={<TrendingUp size={13} className="text-emerald-500" />}
              negative={margeBrute < 0}
            />
            <KpiCard
              title="Bénéfice"
              value={formatHTG(benefice)}
              sub="Marge - Dépenses"
              color={benefice >= 0 ? 'bg-[#EEF7EE]' : 'bg-red-100'}
              icon={<TrendingUp size={13} className={benefice >= 0 ? 'text-[#3DAA35]' : 'text-red-500'} />}
              negative={benefice < 0}
            />
            <KpiCard
              title="Marge %"
              value={`${margePct}%`}
              sub="Objectif: 30%"
              color={Number(margePct) >= 30 ? 'bg-[#EEF7EE]' : 'bg-amber-100'}
              icon={<Filter size={13} className={Number(margePct) >= 30 ? 'text-[#3DAA35]' : 'text-amber-500'} />}
              negative={Number(margePct) < 0}
            />
          </div>

          {/* ── CHART Revenus vs Dépenses ───────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#D4CAB8] p-4 shadow-sm">
            <h3 className="text-sm font-bold text-[#2C2420] mb-1">Revenus vs Dépenses</h3>
            <p className="text-[11px] text-[#A09589] mb-4">Évolution sur la période</p>
            {chartData.every(d => d.Revenus === 0 && d.Depenses === 0) ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Package size={32} className="text-slate-200 mb-2" />
                <p className="text-sm text-[#A09589]">Aucune donnée sur cette période</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B7355' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B7355' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatHTG(Number(v))} contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Revenus" fill="#3DAA35" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Depenses" fill="#EF4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── TABS ───────────────────────────────────────────────────────── */}
          <div>
            {/* Tab nav */}
            <div className="flex overflow-x-auto gap-1 bg-[#E8E0D0] rounded-xl p-1 mb-4 scrollbar-hide">
              {([
                { key: 'tendances', label: 'Tend.' },
                { key: 'produits',  label: 'Prod.' },
                { key: 'fournisseurs', label: 'Fourn.' },
                { key: 'credits',   label: 'Crédits' },
              ] as { key: Tab; label: string }[]).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`shrink-0 flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === t.key ? 'bg-white text-[#2D6B2D] shadow-sm' : 'text-[#78726A]'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── TENDANCES ─────────────────────────────────────────────── */}
            {activeTab === 'tendances' && (
              <div className="bg-white rounded-xl border border-[#D4CAB8] p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#2C2420] mb-4">Évolution des ventes</h3>
                {trendsData.every(d => d.CA === 0) ? (
                  <p className="text-sm text-[#A09589] text-center py-6">Aucune vente sur cette période</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={trendsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B7355' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#8B7355' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => formatHTG(Number(v))} contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="CA" stroke="#3DAA35" strokeWidth={2}
                        dot={{ r: 3, fill: '#3DAA35' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* ── PRODUITS ──────────────────────────────────────────────── */}
            {activeTab === 'produits' && (
              <div className="bg-white rounded-xl border border-[#D4CAB8] p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#2C2420] mb-1">Top produits</h3>
                <p className="text-[11px] text-[#A09589] mb-4">Meilleurs vendeurs</p>
                {topProduits.length === 0 ? (
                  <p className="text-sm text-[#A09589] text-center py-6">Aucune vente sur cette période</p>
                ) : (
                  <div className="space-y-3">
                    {topProduits.map((p, i) => (
                      <div key={p.nom} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          i === 0 ? 'bg-[#E8A820] text-[#2D6B2D]' :
                          i === 1 ? 'bg-slate-300 text-[#4A4540]' :
                          i === 2 ? 'bg-amber-700 text-white' :
                          'bg-[#F0EBE0] text-[#78726A]'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#2C2420] truncate">{p.nom}</p>
                          <p className="text-[10px] text-[#A09589]">{p.qte} unité{p.qte > 1 ? 's' : ''} vendues</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#2C2420]">{formatHTG(p.ca)}</p>
                          <p className={`text-[10px] font-semibold ${p.marge >= 0 ? 'text-[#3DAA35]' : 'text-red-500'}`}>
                            Marge {formatHTG(p.marge)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── FOURNISSEURS ──────────────────────────────────────────── */}
            {activeTab === 'fournisseurs' && (
              <div className="bg-white rounded-xl border border-[#D4CAB8] p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#2C2420] mb-1">Achats par fournisseur</h3>
                <p className="text-[11px] text-[#A09589] mb-4">{periodeLabel}</p>
                {topFournisseurs.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Truck size={28} className="text-slate-200 mb-2" />
                    <p className="text-sm text-[#A09589]">Aucun achat sur cette période</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topFournisseurs.map((f, i) => {
                      const pct = totalAchats > 0 ? Math.round((f.total / totalAchats) * 100) : 0
                      return (
                        <div key={f.nom}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                i === 0 ? 'bg-[#2D6B2D] text-white' : 'bg-[#EEF7EE] text-[#3DAA35]'
                              }`}>{i + 1}</span>
                              <span className="text-sm font-medium text-[#4A4540]">{f.nom}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-[#2D6B2D]">{formatHTG(f.total)}</span>
                              <span className="text-[10px] text-[#A09589] ml-1">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#F0EBE0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#3DAA35] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                    <div className="pt-2 border-t border-[#D4CAB8] flex justify-between text-sm font-bold">
                      <span className="text-[#4A4540]">Total achats</span>
                      <span className="text-[#2D6B2D]">{formatHTG(totalAchats)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CRÉDITS ───────────────────────────────────────────────── */}
            {activeTab === 'credits' && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={14} className="text-amber-500" />
                  <p className="text-sm font-bold text-[#4A4540]">Soldes clients en attente</p>
                </div>
                <CreditTab />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
