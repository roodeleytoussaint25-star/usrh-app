import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ChevronDown, GraduationCap, Package, TrendingUp,
  Search, Phone, X, CreditCard, Mail, MapPin, AlertCircle, StickyNote, CheckCircle,
} from 'lucide-react'

type MainTab = 'etudiants' | 'finances'
type Period  = '7j' | '30j' | 'mois' | 'tout'
type SubTab  = 'frais' | 'ventes' | 'credits'
type Filter  = 'tous' | 'dettes' | 'ajour'

interface Props {
  onPayEtudiant: (id: number) => void
}

interface Etudiant {
  id: number
  nom: string
  contact?: string
  email?: string
  date_naissance?: string
  sexe?: 'M' | 'F'
  adresse?: string
  contact_urgence?: string
  notes?: string
  cours_id?: number
  cours_nom?: string
  frais_inscription: number
  frais_inscription_paye: number
  frais_formation_v1: number
  frais_formation_v1_paye: number
  frais_formation_v2: number
  frais_formation_v2_paye: number
  dette: number
  created_at: string
}

const PERIOD_LABELS: Record<Period, string> = {
  '7j': '7 derniers jours', '30j': '30 derniers jours',
  'mois': 'Ce mois', 'tout': 'Tout',
}

const FRAIS_ROWS = [
  { label: 'Inscription',  total: 'frais_inscription',  paye: 'frais_inscription_paye'  },
  { label: 'Formation V1', total: 'frais_formation_v1', paye: 'frais_formation_v1_paye' },
  { label: 'Formation V2', total: 'frais_formation_v2', paye: 'frais_formation_v2_paye' },
]

const fmt = (n: number) => n.toLocaleString('fr-HT') + ' HTG'

export function RapportsPage({ onPayEtudiant }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('etudiants')

  // ── Étudiants ──
  const [etudiants, setEtudiants]     = useState<Etudiant[]>([])
  const [etuLoading, setEtuLoading]   = useState(true)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState<Filter>('tous')
  const [selected, setSelected]       = useState<Etudiant | null>(null)
  const [history, setHistory]         = useState<{ type_frais: string; montant: number; created_at: string }[]>([])
  const [histLoading, setHistLoading] = useState(false)

  // ── Finances ──
  const [period, setPeriod]       = useState<Period>('7j')
  const [showPicker, setShowPicker] = useState(false)
  const [subTab, setSubTab]       = useState<SubTab>('frais')
  const [finLoading, setFinLoading] = useState(true)

  const [fraisPercus, setFraisPercus] = useState(0)
  const [caVentes, setCaVentes]       = useState(0)
  const [nbVentes, setNbVentes]       = useState(0)
  const [creances, setCreances]       = useState(0)
  const [nbCredits, setNbCredits]     = useState(0)
  const [dettesEtu, setDettesEtu]     = useState(0)
  const [nbEtuDette, setNbEtuDette]   = useState(0)
  const [fraisBreak, setFraisBreak]   = useState<{ label: string; type: string; montant: number }[]>([])
  const [topArticles, setTopArticles] = useState<{ nom: string; qty: number; total: number }[]>([])
  const [creditsData, setCreditsData] = useState<{ nom: string; dette: number }[]>([])

  useEffect(() => { loadEtudiants() }, [])
  useEffect(() => { if (mainTab === 'finances') loadFinances() }, [mainTab, period])

  const loadEtudiants = async () => {
    setEtuLoading(true)
    const { data } = await supabase
      .from('usr_etudiants')
      .select('id, nom, contact, email, date_naissance, sexe, adresse, contact_urgence, notes, cours_id, cours:usr_cours(nom), frais_inscription, frais_inscription_paye, frais_formation_v1, frais_formation_v1_paye, frais_formation_v2, frais_formation_v2_paye, created_at')
      .eq('actif', true)
      .order('nom')
    const liste: Etudiant[] = (data || []).map((e: any) => {
      const dette =
        Math.max(0, (e.frais_inscription  || 0) - (e.frais_inscription_paye  || 0)) +
        Math.max(0, (e.frais_formation_v1 || 0) - (e.frais_formation_v1_paye || 0)) +
        Math.max(0, (e.frais_formation_v2 || 0) - (e.frais_formation_v2_paye || 0))
      return {
        ...e,
        cours_nom: Array.isArray(e.cours) ? e.cours[0]?.nom : e.cours?.nom,
        dette,
      }
    })
    setEtudiants(liste)
    setEtuLoading(false)
  }

  const openDetail = async (e: Etudiant) => {
    setSelected(e)
    setHistLoading(true)
    const { data } = await supabase
      .from('usr_paiements')
      .select('type_frais, montant, created_at')
      .eq('etudiant_id', e.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistory(data || [])
    setHistLoading(false)
  }

  const loadFinances = async () => {
    setFinLoading(true)
    const getPeriodStart = (): string | null => {
      const d = new Date()
      if (period === '7j')   { d.setDate(d.getDate() - 7);  return d.toISOString() }
      if (period === '30j')  { d.setDate(d.getDate() - 30); return d.toISOString() }
      if (period === 'mois') { d.setDate(1); d.setHours(0,0,0,0); return d.toISOString() }
      return null
    }
    const from = getPeriodStart()
    let fraisQ  = supabase.from('usr_paiements').select('montant, type_frais')
    let ventesQ = supabase.from('usr_ventes').select('total, montant_paye, mode_paiement')
    let lignesQ = supabase.from('usr_ventes_lignes').select('article_nom, quantite, total')
    if (from) { fraisQ = fraisQ.gte('created_at', from); ventesQ = ventesQ.gte('created_at', from) }

    const [fraisRes, ventesRes, etuRes, lignesRes] = await Promise.all([
      fraisQ, ventesQ,
      supabase.from('usr_etudiants')
        .select('nom, frais_inscription, frais_inscription_paye, frais_formation_v1, frais_formation_v1_paye, frais_formation_v2, frais_formation_v2_paye')
        .eq('actif', true),
      lignesQ,
    ])

    const paiements = fraisRes.data || []
    const percus = paiements.reduce((s: number, p: any) => s + p.montant, 0)
    setFraisPercus(percus)
    setFraisBreak([
      { label: 'Inscription',  type: 'inscription'  },
      { label: 'Formation V1', type: 'formation_v1' },
      { label: 'Formation V2', type: 'formation_v2' },
    ].map(b => ({
      ...b,
      montant: paiements.filter((p: any) => p.type_frais === b.type).reduce((s: number, p: any) => s + p.montant, 0),
    })))

    const ventes = ventesRes.data || []
    const caV = ventes.reduce((s: number, v: any) => s + (v.montant_paye || 0), 0)
    const creds = ventes.filter((v: any) => v.mode_paiement === 'credit')
    setCaVentes(caV); setNbVentes(ventes.length)
    setCreances(creds.reduce((s: number, v: any) => s + Math.max(0, v.total - v.montant_paye), 0))
    setNbCredits(creds.length)

    const etus = etuRes.data || []
    let totalDette = 0; let nbAvec = 0
    const cData: { nom: string; dette: number }[] = []
    for (const e of etus) {
      const d = Math.max(0,(e.frais_inscription||0)-(e.frais_inscription_paye||0)) +
                Math.max(0,(e.frais_formation_v1||0)-(e.frais_formation_v1_paye||0)) +
                Math.max(0,(e.frais_formation_v2||0)-(e.frais_formation_v2_paye||0))
      if (d > 0) { totalDette += d; nbAvec++; cData.push({ nom: e.nom, dette: d }) }
    }
    setDettesEtu(totalDette); setNbEtuDette(nbAvec)
    setCreditsData(cData.sort((a,b) => b.dette - a.dette))

    const lignes = lignesRes.data || []
    const map: Record<string, { nom: string; total: number; qty: number }> = {}
    for (const l of lignes) {
      if (!map[l.article_nom]) map[l.article_nom] = { nom: l.article_nom, total: 0, qty: 0 }
      map[l.article_nom].total += l.total; map[l.article_nom].qty += l.quantite
    }
    setTopArticles(Object.values(map).sort((a,b) => b.total - a.total).slice(0, 10))
    setFinLoading(false)
  }

  // ── Derived ──
  const totalDette      = etudiants.reduce((s, e) => s + e.dette, 0)
  const nbDebiteurs     = etudiants.filter(e => e.dette > 0).length

  const filtered = etudiants
    .filter(e => {
      if (search && !e.nom.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'dettes') return e.dette > 0
      if (filter === 'ajour')  return e.dette === 0
      return true
    })
    .sort((a, b) => filter === 'dettes' ? b.dette - a.dette : a.nom.localeCompare(b.nom))

  const caTotal  = fraisPercus + caVentes
  const pctFrais = caTotal > 0 ? Math.round((fraisPercus / caTotal) * 100) : 0

  const typeLabel: Record<string, string> = { inscription: 'Inscription', formation_v1: 'Formation V1', formation_v2: 'Formation V2' }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Onglets principaux ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="bg-white rounded-2xl p-1 flex shadow-sm border border-[#E8E2DC]">
          <button onClick={() => setMainTab('etudiants')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mainTab === 'etudiants' ? 'bg-[#1B2A8A] text-white shadow-sm' : 'text-gray-400'}`}>
            Étudiants
          </button>
          <button onClick={() => setMainTab('finances')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mainTab === 'finances' ? 'bg-[#1B2A8A] text-white shadow-sm' : 'text-gray-400'}`}>
            Finances
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">

        {/* ══════════════ ONGLET ÉTUDIANTS ══════════════ */}
        {mainTab === 'etudiants' && (
          <div className="px-4 pb-10 space-y-3">

            {/* Bannière résumé */}
            {!etuLoading && (
              <div className="bg-[#1B2A8A] rounded-3xl px-5 py-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Étudiants actifs</p>
                    <p className="text-4xl font-black mt-0.5 tracking-tight">{etudiants.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-xs font-medium">Total dettes frais</p>
                    <p className="text-2xl font-black text-[#fca5a5] mt-0.5">{fmt(totalDette)}</p>
                    <p className="text-white/50 text-xs mt-0.5">{nbDebiteurs} débiteur{nbDebiteurs !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recherche */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un étudiant..."
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A] shadow-sm" />
            </div>

            {/* Filtres */}
            <div className="flex gap-2">
              {([
                { key: 'tous',   label: 'Tous'        },
                { key: 'dettes', label: 'Avec dettes' },
                { key: 'ajour',  label: 'À jour'      },
              ] as { key: Filter; label: string }[]).map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all
                    ${filter === f.key
                      ? f.key === 'dettes' ? 'bg-red-500 text-white border-red-500'
                        : f.key === 'ajour' ? 'bg-green-500 text-white border-green-500'
                        : 'bg-[#1B2A8A] text-white border-[#1B2A8A]'
                      : 'bg-white text-gray-600 border-[#E8E2DC]'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Liste */}
            {etuLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-[#F0EDE8]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-[#E8E2DC] animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-3">
                  <GraduationCap size={22} className="text-[#1B2A8A]/40" />
                </div>
                <p className="font-semibold text-gray-500 text-sm">Aucun étudiant trouvé</p>
                <p className="text-xs text-gray-400 mt-1">Essayez un autre filtre</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl divide-y divide-[#F0EDE8] border border-[#F0EDE8] shadow-sm overflow-hidden animate-card-in">
                {filtered.map((e, idx) => (
                  <button key={e.id} onClick={() => openDetail(e)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors animate-card-in"
                    style={{ animationDelay: `${Math.min(idx, 6) * 20}ms` }}>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-2xl bg-[#1B2A8A] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-black text-white">{e.nom[0].toUpperCase()}</span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{e.nom}</p>
                      <p className="text-xs text-gray-400 truncate">{e.cours_nom || 'Cours non assigné'}</p>
                    </div>
                    {/* Statut dette */}
                    {e.dette > 0 ? (
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-red-600">{fmt(e.dette)}</p>
                        <p className="text-[10px] text-red-400">dû</p>
                      </div>
                    ) : (
                      <span className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-600">
                        À jour
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ ONGLET FINANCES ══════════════ */}
        {mainTab === 'finances' && (
          <div className="px-4 pb-10 space-y-4">

            {/* Period selector */}
            <div className="relative">
              <button onClick={() => setShowPicker(p => !p)}
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm">
                <span className="text-sm font-semibold text-gray-800">{PERIOD_LABELS[period]}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
              </button>
              {showPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-[#E8E2DC] overflow-hidden z-20">
                  {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                    <button key={p} onClick={() => { setPeriod(p); setShowPicker(false) }}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors
                        ${period === p ? 'font-bold text-[#1B2A8A] bg-[#1B2A8A]/5' : 'text-gray-700 active:bg-gray-50'}`}>
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CA card */}
            <div className="bg-[#1B2A8A] rounded-3xl px-5 py-6 text-white shadow-lg">
              <p className="text-white/60 text-sm font-medium">CA total</p>
              <p className="text-4xl font-black mt-1 tracking-tight">
                {finLoading ? '— HTG' : fmt(caTotal)}
              </p>
              <p className="text-white/50 text-sm mt-2">
                {finLoading ? '...' : `${nbVentes} vente${nbVentes !== 1 ? 's' : ''} produit sur la période`}
              </p>
            </div>

            {/* 2×2 KPIs */}
            {finLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-[#F0EDE8]" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 font-medium">Frais encaissés</p>
                  <p className="text-xl font-black text-green-600 mt-1 leading-tight">{fmt(fraisPercus)}</p>
                  <p className="text-xs text-gray-400 mt-1">{pctFrais}% du CA</p>
                </div>
                <div className="bg-white border border-[#F0EDE8] rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-500 font-medium">Ventes produits</p>
                  <p className="text-xl font-black text-[#1B2A8A] mt-1 leading-tight">{fmt(caVentes)}</p>
                  <p className="text-xs text-gray-400 mt-1">{nbVentes} vente{nbVentes !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                  <p className="text-xs text-orange-600 font-semibold">Créances clients</p>
                  <p className="text-xl font-black text-orange-600 mt-1 leading-tight">{fmt(creances)}</p>
                  <p className="text-xs text-gray-400 mt-1">{nbCredits} en attente</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <p className="text-xs text-red-600 font-semibold">Dettes étudiants</p>
                  <p className="text-xl font-black text-red-600 mt-1 leading-tight">{fmt(dettesEtu)}</p>
                  <p className="text-xs text-gray-400 mt-1">{nbEtuDette} non soldé{nbEtuDette !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-white rounded-2xl p-1 border border-[#E8E2DC] shadow-sm">
              {([['frais','Frais'],['ventes','Ventes'],['credits','Crédits']] as [SubTab,string][]).map(([k,l]) => (
                <button key={k} onClick={() => setSubTab(k)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all
                    ${subTab === k ? 'bg-[#1B2A8A] text-white shadow-sm' : 'text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Frais */}
            {subTab === 'frais' && !finLoading && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0EDE8] space-y-4">
                <p className="font-bold text-gray-900">Frais encaissés</p>
                {fraisBreak.every(b => b.montant === 0) ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-2.5">
                      <CreditCard size={18} className="text-[#1B2A8A]/40" />
                    </div>
                    <p className="font-semibold text-gray-500 text-sm">Aucun paiement</p>
                    <p className="text-xs text-gray-400 mt-0.5">sur cette période</p>
                  </div>
                ) : fraisBreak.map(b => (
                  <div key={b.type}>
                    <div className="flex justify-between mb-1.5">
                      <p className="text-sm font-semibold text-gray-700">{b.label}</p>
                      <p className="text-sm font-bold text-[#1B2A8A]">{fmt(b.montant)}</p>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1B2A8A] rounded-full" style={{ width: fraisPercus > 0 ? `${Math.round(b.montant / fraisPercus * 100)}%` : '0%' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fraisPercus > 0 ? Math.round(b.montant / fraisPercus * 100) : 0}% du total frais</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ventes */}
            {subTab === 'ventes' && !finLoading && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0EDE8]">
                <p className="font-bold text-gray-900 mb-4">Top produits</p>
                {topArticles.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-2.5">
                      <Package size={18} className="text-[#1B2A8A]/40" />
                    </div>
                    <p className="font-semibold text-gray-500 text-sm">Aucune vente</p>
                    <p className="text-xs text-gray-400 mt-0.5">sur cette période</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topArticles.map((a, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#1B2A8A]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#1B2A8A]">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{a.nom}</p>
                          <p className="text-xs text-gray-400">{a.qty} vendu{a.qty !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="text-sm font-bold text-[#1B2A8A]">{fmt(a.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Crédits */}
            {subTab === 'credits' && !finLoading && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0EDE8]">
                <p className="font-bold text-gray-900 mb-4">Dettes étudiants</p>
                {creditsData.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-2.5">
                      <CheckCircle size={18} className="text-green-500" />
                    </div>
                    <p className="font-semibold text-gray-500 text-sm">Aucune dette</p>
                    <p className="text-xs text-gray-400 mt-0.5">Tous les étudiants sont à jour</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0EDE8]">
                    {creditsData.map((e, i) => (
                      <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <p className="text-sm font-semibold text-gray-800">{e.nom}</p>
                        <p className="text-sm font-bold text-red-600">{fmt(e.dette)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* ══════════════ FICHE ÉTUDIANT BOTTOM SHEET ══════════════ */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[90vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4 border-b border-[#F0EDE8] flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#1B2A8A] flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-black text-white">{selected.nom[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">{selected.nom}</h3>
                    <p className="text-sm text-gray-400">{selected.cours_nom || 'Cours non assigné'}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center flex-shrink-0">
                  <X size={15} className="text-gray-500" />
                </button>
              </div>
              {/* Infos rapides sous le nom */}
              <div className="mt-2 space-y-1.5 ml-1">
                {selected.sexe && (
                  <p className="text-xs text-[#1B2A8A] font-semibold">
                    {selected.sexe === 'M' ? 'Masculin' : 'Féminin'}
                    {selected.date_naissance && ` · Né(e) le ${new Date(selected.date_naissance).toLocaleDateString('fr-HT')}`}
                  </p>
                )}
                {selected.contact && (
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{selected.contact}</p>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{selected.email}</p>
                  </div>
                )}
                {selected.adresse && (
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{selected.adresse}</p>
                  </div>
                )}
                {selected.contact_urgence && (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={12} className="text-orange-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600"><span className="text-orange-500 font-semibold">Urgence : </span>{selected.contact_urgence}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <GraduationCap size={12} className="text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-400">Inscrit le {new Date(selected.created_at).toLocaleDateString('fr-HT')}</p>
                </div>
              </div>
              {selected.notes && (
                <div className="mt-2 mx-1 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 flex items-start gap-2">
                  <StickyNote size={13} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-800">{selected.notes}</p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto px-5 py-4 space-y-5">

              {/* Frais */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">Frais scolaires</p>
                <div className="bg-white rounded-2xl p-4 border border-[#F0EDE8] shadow-sm space-y-4">
                  {FRAIS_ROWS.map(row => {
                    const total   = (selected as any)[row.total] || 0
                    const paye    = (selected as any)[row.paye]  || 0
                    const restant = Math.max(0, total - paye)
                    const pct     = total > 0 ? Math.round(paye / total * 100) : 0
                    if (total === 0) return null
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-700">{row.label}</p>
                          {restant > 0
                            ? <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{fmt(restant)} dû</span>
                            : <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Soldé</span>
                          }
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#f97316' }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <p className="text-xs text-gray-400">{fmt(paye)} payé</p>
                          <p className="text-xs text-gray-400">{fmt(total)} total</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Dette totale */}
              {selected.dette > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-red-700">Dette totale</p>
                  <p className="text-xl font-black text-red-600">{fmt(selected.dette)}</p>
                </div>
              )}

              {/* Historique paiements */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">Historique paiements</p>
                {histLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-12 animate-pulse border border-[#F0EDE8]" />)}
                  </div>
                ) : history.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center border border-[#F0EDE8] animate-fade-in">
                    <div className="w-9 h-9 rounded-xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-2">
                      <CreditCard size={16} className="text-[#1B2A8A]/40" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Aucun paiement enregistré</p>
                    <p className="text-xs text-gray-400 mt-0.5">Les frais encaissés apparaissent ici</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl divide-y divide-[#F0EDE8] border border-[#F0EDE8] shadow-sm overflow-hidden">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{typeLabel[h.type_frais] || h.type_frais}</p>
                          <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString('fr-HT')}</p>
                        </div>
                        <p className="text-sm font-bold text-green-600">+{fmt(h.montant)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              <button
                onClick={() => { setSelected(null); onPayEtudiant(selected.id) }}
                className="w-full bg-[#A01020] text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform shadow-md">
                Encaisser un paiement
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
