import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Users, Package, AlertTriangle, TrendingUp,
  TrendingDown, ChevronRight, ShoppingCart, CreditCard,
} from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import type { Page } from '@/App'

interface Props { onNavigate: (page: Page) => void }

interface DayData { day: string; label: string; total: number }

const PERIODES = [
  { key: 'today', label: 'Auj.' },
  { key: '7j',   label: '7 j' },
  { key: '30j',  label: '30 j' },
]

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const fmtH = (n: number) => n.toLocaleString('fr-HT') + ' HTG'
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })

function AlertCard({
  icon, label, value, sub, color, onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub: string
  color: 'blue' | 'red' | 'amber' | 'green'
  onClick?: () => void
}) {
  const styles = {
    blue:  { card: 'bg-[#1B2A8A] shadow-sm',                 iconBg: 'bg-white/20',       iconC: 'text-white',         val: 'text-white',        sub2: 'text-white/70',    meta: 'text-white/50'    },
    red:   { card: 'bg-[#A01020] shadow-sm',                 iconBg: 'bg-white/20',       iconC: 'text-white',         val: 'text-white',        sub2: 'text-white/70',    meta: 'text-white/50'    },
    amber: { card: 'bg-amber-50 border border-amber-200',   iconBg: 'bg-amber-200/60',   iconC: 'text-amber-700',     val: 'text-amber-900',    sub2: 'text-amber-700',   meta: 'text-amber-500'   },
    green: { card: 'bg-emerald-50 border border-emerald-200', iconBg: 'bg-emerald-200/60', iconC: 'text-emerald-700', val: 'text-emerald-900',  sub2: 'text-emerald-700', meta: 'text-emerald-500' },
  }
  const s = styles[color]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick}
      className={`rounded-2xl p-4 text-left transition-all active:scale-95 w-full ${s.card} ${onClick ? 'cursor-pointer' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.iconBg} ${s.iconC}`}>
        {icon}
      </div>
      <p className={`text-3xl font-black leading-none ${s.val}`}>{value}</p>
      <p className={`text-[11px] font-bold mt-1 leading-tight ${s.sub2}`}>{sub}</p>
      <p className={`text-[10px] mt-0.5 ${s.meta}`}>{label}</p>
    </Tag>
  )
}

export function DashboardPage({ onNavigate }: Props) {
  const [periode, setPeriode] = useState('today')
  const [caTotal, setCaTotal] = useState(0)
  const [nbTransactions, setNbTransactions] = useState(0)
  const [caHier, setCaHier] = useState(0)
  const [creditsRestants, setCreditsRestants] = useState(0)
  const [totalEtudiants, setTotalEtudiants] = useState(0)
  const [etudiantsAvecDette, setEtudiantsAvecDette] = useState(0)
  const [recouvrementPct, setRecouvrementPct] = useState(0)
  const [stockRuptures, setStockRuptures] = useState(0)
  const [caWeek, setCaWeek] = useState(0)
  const [chartData, setChartData] = useState<DayData[]>([])
  const [recents, setRecents] = useState<{
    label: string; montant: number; heure: string; type: 'vente' | 'frais'; sub?: string
  }[]>([])
  const [loading, setLoading] = useState(true)

  const getRange = useCallback(() => {
    const now = new Date()
    let start: string
    if (periode === 'today') {
      const d = new Date(now); d.setHours(0, 0, 0, 0); start = d.toISOString()
    } else if (periode === '7j') {
      const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); start = d.toISOString()
    } else {
      const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); start = d.toISOString()
    }
    return { start, end: now.toISOString() }
  }, [periode])

  const loadDashboard = useCallback(async () => {
    const { start, end } = getRange()

    const hierStart = new Date(); hierStart.setDate(hierStart.getDate() - 1); hierStart.setHours(0, 0, 0, 0)
    const hierEnd   = new Date(); hierEnd.setDate(hierEnd.getDate() - 1); hierEnd.setHours(23, 59, 59, 999)
    const since7 = new Date(); since7.setDate(since7.getDate() - 6); since7.setHours(0, 0, 0, 0)

    const [
      ventesRes, paiementsRes,
      ventesHierRes, paiementsHierRes,
      ventesCreditRes,
      etudiantsRes, articlesRes,
      ventes7Res, paiements7Res,
      ventesRecentRes, paiementsRecentRes,
    ] = await Promise.all([
      supabase.from('usr_ventes').select('montant_paye, total, mode_paiement').gte('created_at', start).lte('created_at', end),
      supabase.from('usr_paiements').select('montant').gte('created_at', start).lte('created_at', end),
      supabase.from('usr_ventes').select('montant_paye').gte('created_at', hierStart.toISOString()).lte('created_at', hierEnd.toISOString()),
      supabase.from('usr_paiements').select('montant').gte('created_at', hierStart.toISOString()).lte('created_at', hierEnd.toISOString()),
      supabase.from('usr_ventes').select('total, montant_paye').eq('mode_paiement', 'credit'),
      supabase.from('usr_etudiants').select('frais_inscription,frais_inscription_paye,frais_formation_v1,frais_formation_v1_paye,frais_formation_v2,frais_formation_v2_paye').eq('actif', true),
      supabase.from('usr_articles').select('stock').eq('actif', true),
      supabase.from('usr_ventes').select('montant_paye, created_at').gte('created_at', since7.toISOString()),
      supabase.from('usr_paiements').select('montant, created_at').gte('created_at', since7.toISOString()),
      supabase.from('usr_ventes').select('total, created_at, etudiant:usr_etudiants(nom)').order('created_at', { ascending: false }).limit(4),
      supabase.from('usr_paiements').select('montant, type_frais, created_at, etudiant:usr_etudiants(nom)').order('created_at', { ascending: false }).limit(4),
    ])

    // CA période
    const ventes = ventesRes.data || []
    const paiements = paiementsRes.data || []
    const ca = ventes.reduce((s, v) => s + (v.montant_paye || 0), 0)
             + paiements.reduce((s, p) => s + (p.montant || 0), 0)
    setCaTotal(ca)
    setNbTransactions(ventes.length + paiements.length)

    // CA hier
    const ch = (ventesHierRes.data || []).reduce((s, v) => s + (v.montant_paye || 0), 0)
             + (paiementsHierRes.data || []).reduce((s, p) => s + (p.montant || 0), 0)
    setCaHier(ch)

    // Crédits restants
    setCreditsRestants((ventesCreditRes.data || []).reduce((s, v) => s + Math.max(0, (v.total || 0) - (v.montant_paye || 0)), 0))

    // Étudiants frais
    const etus = etudiantsRes.data || []
    let totalDu = 0, totalPercu = 0, avecDette = 0
    for (const e of etus) {
      totalDu += (e.frais_inscription || 0) + (e.frais_formation_v1 || 0) + (e.frais_formation_v2 || 0)
      totalPercu += (e.frais_inscription_paye || 0) + (e.frais_formation_v1_paye || 0) + (e.frais_formation_v2_paye || 0)
      const dette = Math.max(0, e.frais_inscription - e.frais_inscription_paye)
               + Math.max(0, e.frais_formation_v1 - e.frais_formation_v1_paye)
               + Math.max(0, e.frais_formation_v2 - e.frais_formation_v2_paye)
      if (dette > 0) avecDette++
    }
    setTotalEtudiants(etus.length)
    setEtudiantsAvecDette(avecDette)
    setRecouvrementPct(totalDu > 0 ? Math.round((totalPercu / totalDu) * 100) : 100)

    // Stock
    setStockRuptures((articlesRes.data || []).filter(a => a.stock <= 0).length)

    // Chart 7 jours
    const days: DayData[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0)
      return { day: JOURS[d.getDay()], label: `${d.getDate()}/${d.getMonth() + 1}`, total: 0 }
    })
    const dateKey = (iso: string) => {
      const d = new Date(iso); d.setHours(0, 0, 0, 0); return d.toDateString()
    }
    const dayDates = days.map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0)
      return d.toDateString()
    })
    for (const v of (ventes7Res.data || [])) {
      const idx = dayDates.indexOf(dateKey(v.created_at))
      if (idx >= 0) days[idx].total += v.montant_paye || 0
    }
    for (const p of (paiements7Res.data || [])) {
      const idx = dayDates.indexOf(dateKey(p.created_at))
      if (idx >= 0) days[idx].total += p.montant || 0
    }
    setChartData(days)
    setCaWeek(days.reduce((s, d) => s + d.total, 0))

    // Recents
    const FLABELS: Record<string, string> = {
      inscription: 'Inscription',
      formation_v1: 'Formation V1',
      formation_v2: 'Formation V2',
    }
    const rv = (ventesRecentRes.data || []).map((v: any) => {
      const nom = Array.isArray(v.etudiant) ? v.etudiant[0]?.nom : v.etudiant?.nom
      return { label: nom || 'Caisse', montant: v.total, heure: v.created_at, type: 'vente' as const }
    })
    const rp = (paiementsRecentRes.data || []).map((p: any) => {
      const nom = Array.isArray(p.etudiant) ? p.etudiant[0]?.nom : p.etudiant?.nom
      return { label: nom || '—', montant: p.montant, heure: p.created_at, type: 'frais' as const, sub: FLABELS[p.type_frais] }
    })
    setRecents([...rv, ...rp].sort((a, b) => new Date(b.heure).getTime() - new Date(a.heure).getTime()).slice(0, 6))
    setLoading(false)
  }, [getRange])

  useEffect(() => {
    setLoading(true)
    loadDashboard()
    const t = setInterval(loadDashboard, 60_000)
    return () => clearInterval(t)
  }, [loadDashboard])

  const caChange = caHier > 0 ? Math.round(((caTotal - caHier) / caHier) * 100) : null
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const displayCA = useCountUp(caTotal)
  const displayEtus = useCountUp(totalEtudiants)
  const displayDette = useCountUp(etudiantsAvecDette)
  const displayRecouvrement = useCountUp(recouvrementPct)
  const displayRuptures = useCountUp(stockRuptures)
  const displayWeek = useCountUp(caWeek)

  if (loading) return (
    <div className="p-4 space-y-4 pb-24">
      <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-44 bg-[#1B2A8A]/20 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-56 bg-white rounded-2xl animate-pulse" />
    </div>
  )

  return (
    <div className="p-4 space-y-4 pb-24 max-w-5xl mx-auto">

      {/* Header + sélecteur période */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-800 capitalize">{dateLabel}</p>
          <p className="text-xs text-gray-400">USRH</p>
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {PERIODES.map(p => (
            <button key={p.key} onClick={() => setPeriode(p.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periode === p.key ? 'bg-[#1B2A8A] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero CA */}
      <div className="bg-[#1B2A8A] rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, white 0%, transparent 55%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
            Chiffre d'affaires
          </p>
          <p className="text-[11px] text-white/40 mb-3">
            {periode === 'today' ? "Aujourd'hui" : periode === '7j' ? '7 derniers jours' : '30 derniers jours'}
          </p>
          <p className="text-5xl font-black tracking-tight leading-none mb-3">
            {fmtShort(displayCA)}{' '}
            <span className="text-xl font-medium text-white/40">HTG</span>
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm">
              <ShoppingCart size={13} className="text-white/50" />
              <span className="font-semibold">{nbTransactions}</span>
              <span className="text-white/50 text-xs">transaction{nbTransactions !== 1 ? 's' : ''}</span>
            </div>
            {caChange !== null && periode === 'today' && (
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                caChange >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-400/20 text-red-300'
              }`}>
                {caChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {caChange > 0 ? '+' : ''}{caChange}% vs hier
              </div>
            )}
            {creditsRestants > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <CreditCard size={12} className="text-white/50" />
                <span className="font-semibold text-amber-300">{fmtShort(creditsRestants)}</span>
                <span className="text-white/40">à encaisser</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cartes alertes 2×2 */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-3">
          Vue opérationnelle
        </p>
        <div className="grid grid-cols-2 gap-3">
          <AlertCard
            icon={<Users size={17} />}
            label="Étudiants"
            value={displayEtus}
            sub="inscrits actifs"
            color="blue"
            onClick={() => onNavigate('etudiants')}
          />
          <AlertCard
            icon={<AlertTriangle size={17} />}
            label="Dettes frais"
            value={displayDette}
            sub={etudiantsAvecDette > 0 ? 'avec solde dû' : 'tout à jour'}
            color={etudiantsAvecDette > 0 ? 'red' : 'green'}
            onClick={() => onNavigate('etudiants')}
          />
          <AlertCard
            icon={<TrendingUp size={17} />}
            label="Recouvrement"
            value={displayRecouvrement}
            sub="% des frais perçus"
            color={recouvrementPct >= 80 ? 'green' : recouvrementPct >= 50 ? 'amber' : 'red'}
          />
          <AlertCard
            icon={<Package size={17} />}
            label="Stock"
            value={displayRuptures}
            sub={stockRuptures > 0 ? 'rupture(s)' : 'tout en stock'}
            color={stockRuptures > 0 ? 'amber' : 'green'}
            onClick={() => onNavigate('stock')}
          />
        </div>
      </div>

      {/* Line chart CA 7 jours */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Chiffre d'affaires</h3>
            <p className="text-[11px] text-gray-400">7 derniers jours</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-[#1B2A8A]">{fmtShort(displayWeek)}</p>
            <p className="text-[10px] text-gray-400">total semaine</p>
          </div>
        </div>
        {chartData.every(d => d.total === 0) ? (
          <div className="flex flex-col items-center py-10">
            <TrendingUp size={28} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Pas encore de transactions</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => v === 0 ? '0' : `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(value) => [fmtH(Number(value)), 'CA']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ''}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Line type="monotone" dataKey="total" stroke="#A01020" strokeWidth={2.5}
                dot={(props: any) => {
                  const isToday = props.index === 6
                  return (
                    <circle key={props.index} cx={props.cx} cy={props.cy}
                      r={isToday ? 5 : 3}
                      fill={isToday ? '#A01020' : '#fff'}
                      stroke="#A01020" strokeWidth={2} />
                  )
                }}
                activeDot={{ r: 6, fill: '#A01020', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Transactions récentes */}
      {recents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-[#1B2A8A]" />
              <h3 className="text-sm font-bold text-gray-800">Transactions récentes</h3>
            </div>
            <button onClick={() => onNavigate('ventes')}
              className="text-[11px] text-[#1B2A8A] font-semibold flex items-center gap-0.5">
              Tout voir <ChevronRight size={13} />
            </button>
          </div>
          {recents.map((r, i) => (
            <div key={i}
              className={`flex items-center gap-3 px-4 py-3 ${i < recents.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                r.type === 'frais' ? 'bg-[#1B2A8A]/10' : 'bg-gray-100'
              }`}>
                {r.type === 'frais'
                  ? <CreditCard size={13} className="text-[#1B2A8A]" />
                  : <ShoppingCart size={13} className="text-gray-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{r.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    r.type === 'frais' ? 'bg-[#1B2A8A]/10 text-[#1B2A8A]' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {r.type === 'frais' ? (r.sub || 'Frais') : 'Produit'}
                  </span>
                  <span className="text-[10px] text-gray-400">{fmtTime(r.heure)}</span>
                </div>
              </div>
              <p className="text-sm font-black text-gray-800 flex-shrink-0">{fmtH(r.montant)}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
