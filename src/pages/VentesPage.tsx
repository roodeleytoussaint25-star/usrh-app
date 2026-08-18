import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Minus, Trash2, ShoppingBag, GraduationCap, Check, Search, X, CreditCard, ChevronRight, Printer, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ReceiptModal } from '@/components/ReceiptModal'
import type { RecuDirectData } from '@/components/ReceiptModal'
import type { Article, VenteLigne, TypeFrais } from '@/types'

type Mode = 'frais' | 'produit' | 'credits'


interface CreditVente {
  id: number
  total: number
  montant_paye: number
  created_at: string
  etudiant_nom: string | null
  articles: string
}

interface Props {
  preselectStudentId: number | null
  onMounted: () => void
}

const FRAIS_CONFIG = [
  { type: 'inscription'  as TypeFrais, label: 'Inscription',  fieldTotal: 'frais_inscription',  fieldPaye: 'frais_inscription_paye'  },
  { type: 'formation_v1' as TypeFrais, label: 'Formation V1', fieldTotal: 'frais_formation_v1', fieldPaye: 'frais_formation_v1_paye' },
  { type: 'formation_v2' as TypeFrais, label: 'Formation V2', fieldTotal: 'frais_formation_v2', fieldPaye: 'frais_formation_v2_paye' },
]

const fmt = (n: number) => Math.round(n).toString() + ' HTG'
const shortRef = (id: number) => 'RE-' + String(id).padStart(6, '0')
const TYPE_FRAIS_LABEL: Record<string, string> = { inscription: 'Inscription', formation_v1: 'Formation V1', formation_v2: 'Formation V2' }

interface EtudiantSearchProps {
  searchText: string
  selectedId: number | null
  suggestions: { id: number; nom: string }[]
  showSuggestions: boolean
  placeholder: string
  onChangeText: (v: string) => void
  onFocus: () => void
  onBlur: () => void
  onSelect: (e: { id: number; nom: string }) => void
  onClear: () => void
}

function EtudiantSearch({ searchText, selectedId, suggestions, showSuggestions, placeholder, onChangeText, onFocus, onBlur, onSelect, onClear }: EtudiantSearchProps) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={searchText}
        onChange={e => onChangeText(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full bg-[#FAF7F4] border rounded-xl pl-8 pr-8 py-2.5 text-sm focus:outline-none transition-colors
          ${selectedId ? 'border-[#1B2A8A] font-semibold text-gray-900' : 'border-[#E8E2DC] text-gray-700 focus:border-[#1B2A8A]'}`}
      />
      {searchText && (
        <button onClick={onClear} className="absolute right-3 top-2.5 text-gray-400 active:text-gray-600">
          <X size={15} />
        </button>
      )}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-[#E8E2DC] overflow-hidden z-30">
          {suggestions.map(e => (
            <button key={e.id} onMouseDown={() => onSelect(e)}
              className="w-full px-4 py-3 text-left text-sm text-gray-800 font-medium active:bg-[#1B2A8A]/5 hover:bg-gray-50 flex items-center gap-2 border-b border-[#F0EDE8] last:border-0">
              <div className="w-6 h-6 rounded-lg bg-[#1B2A8A]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-[#1B2A8A]">{e.nom[0].toUpperCase()}</span>
              </div>
              {e.nom}
            </button>
          ))}
        </div>
      )}
      {showSuggestions && searchText && !selectedId && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-[#E8E2DC] px-4 py-3 z-30">
          <p className="text-sm text-gray-400">Aucun étudiant trouvé</p>
        </div>
      )}
    </div>
  )
}

export function VentesPage({ preselectStudentId, onMounted }: Props) {
  const { session } = useAuth()
  const { showToast } = useToast()

  const [mode, setMode]                     = useState<Mode>('frais')
  const [etudiants, setEtudiants]           = useState<{ id: number; nom: string }[]>([])
  const [selectedId, setSelectedId]         = useState<number | null>(null)
  const [etudiantInfo, setEtudiantInfo]     = useState<any>(null)
  const [searchText, setSearchText]         = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Frais
  const [fraisType, setFraisType]       = useState<TypeFrais>('inscription')
  const [fraisMontant, setFraisMontant] = useState('')
  const [savingFrais, setSavingFrais]   = useState(false)

  // Produit
  const [articles, setArticles]           = useState<Article[]>([])
  const [panier, setPanier]               = useState<VenteLigne[]>([])
  const [modeCredit, setModeCredit]       = useState(false)
  const [montantPaye, setMontantPaye]     = useState('')
  const [savingVente, setSavingVente]     = useState(false)
  const [articleSearch, setArticleSearch] = useState('')
  const [showArticleSug, setShowArticleSug] = useState(false)

  // Reçu
  const [recuDirect, setRecuDirect]   = useState<RecuDirectData | null>(null)
  const [recuVenteId, setRecuVenteId] = useState<number | null>(null)

  // Crédits
  const [credits, setCredits]           = useState<CreditVente[]>([])
  const [selectedCredit, setSelectedCredit] = useState<CreditVente | null>(null)
  const [creditMontant, setCreditMontant]   = useState('')
  const [savingCredit, setSavingCredit]     = useState(false)

  // Transactions récentes
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    if (preselectStudentId !== null) {
      setSelectedId(preselectStudentId)
      setMode('frais')
      onMounted()
    }
    loadBase()
    loadTransactions()
    loadCredits()
  }, [])

  useEffect(() => {
    if (selectedId) loadEtudiantInfo(selectedId)
    else setEtudiantInfo(null)
  }, [selectedId])

  // Sync nom dans l'input après chargement (preselect)
  useEffect(() => {
    if (selectedId && etudiants.length > 0 && !searchText) {
      const found = etudiants.find(e => e.id === selectedId)
      if (found) setSearchText(found.nom)
    }
  }, [selectedId, etudiants])

  const handleSearchChange = (val: string) => {
    setSearchText(val)
    if (selectedId) { setSelectedId(null); setEtudiantInfo(null) }
    setShowSuggestions(true)
  }

  const selectEtudiant = (e: { id: number; nom: string }) => {
    setSelectedId(e.id)
    setSearchText(e.nom)
    setShowSuggestions(false)
  }

  const clearEtudiant = () => {
    setSelectedId(null)
    setSearchText('')
    setShowSuggestions(false)
    setEtudiantInfo(null)
  }

  const suggestions = showSuggestions && searchText && !selectedId
    ? etudiants.filter(e => e.nom.toLowerCase().includes(searchText.toLowerCase())).slice(0, 6)
    : []

  const loadBase = async () => {
    const [etuRes, artRes] = await Promise.all([
      supabase.from('usr_etudiants').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('usr_articles').select('*').eq('actif', true).order('nom'),
    ])
    setEtudiants(etuRes.data || [])
    setArticles(artRes.data || [])
  }

  const loadEtudiantInfo = async (id: number) => {
    const { data } = await supabase.from('usr_etudiants')
      .select('id, nom, frais_inscription, frais_inscription_paye, frais_formation_v1, frais_formation_v1_paye, frais_formation_v2, frais_formation_v2_paye')
      .eq('id', id).single()
    setEtudiantInfo(data)
    if (data) {
      for (const cfg of FRAIS_CONFIG) {
        const d = data as Record<string, number>
        const restant = (d[cfg.fieldTotal] || 0) - (d[cfg.fieldPaye] || 0)
        if (restant > 0) {
          setFraisType(cfg.type)
          setFraisMontant(String(restant))
          break
        }
      }
    }
  }

  const loadTransactions = async () => {
    const [ventesRes, paiementsRes] = await Promise.all([
      supabase.from('usr_ventes').select('id, total, mode_paiement, montant_paye, created_at, etudiant:usr_etudiants(nom)').order('created_at', { ascending: false }).limit(15),
      supabase.from('usr_paiements').select('id, montant, type_frais, created_at, etudiant:usr_etudiants(nom)').order('created_at', { ascending: false }).limit(15),
    ])
    const ventes    = (ventesRes.data    || []).map(v => ({ ...v, _type: 'vente'    }))
    const paiements = (paiementsRes.data || []).map(p => ({ ...p, _type: 'paiement' }))
    const mixed = [...ventes, ...paiements]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
    setTransactions(mixed)
  }

  const loadCredits = async () => {
    const { data: ventes } = await supabase
      .from('usr_ventes')
      .select('id, total, montant_paye, created_at, etudiant:usr_etudiants(nom), usr_ventes_lignes(article_nom, quantite)')
      .eq('mode_paiement', 'credit')
      .order('created_at', { ascending: false })
    const liste: CreditVente[] = (ventes || [])
      .filter((v: any) => v.total - v.montant_paye > 0)
      .map((v: any) => ({
        id: v.id,
        total: v.total,
        montant_paye: v.montant_paye,
        created_at: v.created_at,
        etudiant_nom: Array.isArray(v.etudiant) ? v.etudiant[0]?.nom ?? null : v.etudiant?.nom ?? null,
        articles: (v.usr_ventes_lignes || []).map((l: any) => `${l.article_nom} ×${l.quantite}`).join(', '),
      }))
    setCredits(liste)
  }

  const encaisserCredit = async () => {
    if (!selectedCredit || !creditMontant) return
    const montant = parseFloat(creditMontant)
    if (!montant || montant <= 0) return
    const max = selectedCredit.total - selectedCredit.montant_paye
    const paye = Math.min(montant, max)
    setSavingCredit(true)
    const newMontantPaye = selectedCredit.montant_paye + paye
    await supabase.from('usr_ventes').update({ montant_paye: newMontantPaye }).eq('id', selectedCredit.id)
    setSelectedCredit(null)
    setCreditMontant('')
    setSavingCredit(false)
    setRecuDirect({
      titre: 'Reçu — paiement crédit',
      etudiant: selectedCredit.etudiant_nom ?? undefined,
      employe: session?.employeNom,
      lignes: [{ nom: `Acompte crédit`, montant: paye }],
      total: paye,
      mode: 'Cash',
      notes: `Reste dû après paiement : ${fmt(selectedCredit.total - newMontantPaye)}`,
      date: new Date(),
      code: 'FP-' + Date.now().toString(36).toUpperCase().slice(-6),
    })
    showToast(`${fmt(paye)} encaissé sur le crédit`)
    loadCredits()
    loadTransactions()
  }

  // ── Frais ──
  const fraisRestant = (type: TypeFrais) => {
    const cfg = FRAIS_CONFIG.find(c => c.type === type)!
    return Math.max(0, (etudiantInfo?.[cfg.fieldTotal] || 0) - (etudiantInfo?.[cfg.fieldPaye] || 0))
  }

  const encaisserFrais = async () => {
    if (!selectedId || !fraisMontant) return
    const montant = parseFloat(fraisMontant)
    if (!montant || montant <= 0) return
    setSavingFrais(true)
    const cfg = FRAIS_CONFIG.find(c => c.type === fraisType)!
    const currentPaye = etudiantInfo?.[cfg.fieldPaye] || 0
    setFraisMontant('')
    await Promise.all([
      supabase.from('usr_etudiants').update({ [cfg.fieldPaye]: currentPaye + montant }).eq('id', selectedId),
      supabase.from('usr_paiements').insert({ etudiant_id: selectedId, employe_id: session?.employeId || null, type_frais: fraisType, montant }),
    ])
    setSavingFrais(false)
    setRecuDirect({
      titre: 'Reçu de paiement frais',
      etudiant: etudiantInfo?.nom,
      employe: session?.employeNom,
      lignes: [{ nom: cfg.label, montant }],
      total: montant,
      mode: 'Cash',
      date: new Date(),
      code: 'FP-' + Date.now().toString(36).toUpperCase().slice(-6),
    })
    loadEtudiantInfo(selectedId)
    loadTransactions()
  }

  // ── Produit ──
  const addToCart = (article: Article) => {
    setPanier(prev => {
      const ex = prev.find(l => l.article_id === article.id)
      if (ex) return prev.map(l => l.article_id === article.id ? { ...l, quantite: l.quantite + 1, total: (l.quantite + 1) * l.prix_unitaire } : l)
      return [...prev, { article_id: article.id, article_nom: article.nom, quantite: 1, prix_unitaire: article.prix, total: article.prix }]
    })
  }

  const updateQty = (article_id: number, delta: number) => {
    setPanier(prev =>
      prev.map(l => l.article_id === article_id ? { ...l, quantite: l.quantite + delta, total: (l.quantite + delta) * l.prix_unitaire } : l)
          .filter(l => l.quantite > 0)
    )
  }

  const totalPanier = panier.reduce((s, l) => s + l.total, 0)

  const finaliserVente = async () => {
    if (panier.length === 0) return
    // Vérifier stock disponible
    for (const l of panier) {
      const art = articles.find(a => a.id === l.article_id)
      if (art && art.stock < l.quantite) {
        showToast(`Stock insuffisant : ${l.article_nom} (${art.stock} dispo)`)
        return
      }
    }
    const panierSnap = [...panier]
    const totalSnap  = totalPanier
    const etudiantNom = selectedId ? etudiants.find(e => e.id === selectedId)?.nom : undefined
    const paye = modeCredit ? parseFloat(montantPaye) || 0 : totalSnap
    setPanier([]); setModeCredit(false); setMontantPaye('')
    showToast(`Vente de ${fmt(totalSnap)} enregistrée`)
    setSavingVente(true)
    const { data: vente } = await supabase.from('usr_ventes').insert({
      etudiant_id: selectedId || null, employe_id: session?.employeId || null,
      total: totalSnap, mode_paiement: modeCredit ? 'credit' : 'cash', montant_paye: paye,
    }).select().single()
    if (vente) {
      await supabase.from('usr_ventes_lignes').insert(panierSnap.map(l => ({
        vente_id: vente.id, article_id: l.article_id, article_nom: l.article_nom,
        quantite: l.quantite, prix_unitaire: l.prix_unitaire, total: l.total,
      })))
      for (const l of panierSnap) {
        await supabase.from('usr_articles').update({ stock: Math.max(0, (articles.find(a => a.id === l.article_id)?.stock ?? l.quantite) - l.quantite) }).eq('id', l.article_id)
      }
      // Affichage immédiat sans fetch supplémentaire
      setRecuDirect({
        titre: 'Recu de vente',
        etudiant: etudiantNom,
        employe: session?.employeNom,
        lignes: panierSnap.map(l => ({ nom: l.article_nom, montant: l.total })),
        total: totalSnap,
        mode: modeCredit ? 'Credit' : 'Cash',
        date: new Date(),
        code: shortRef(vente.id),
        venteId: vente.id,
      })
      // Mettre à jour le stock local pour que l'UI reflète le nouveau stock
      setArticles(prev => prev.map(a => {
        const l = panierSnap.find(x => x.article_id === a.id)
        return l ? { ...a, stock: Math.max(0, a.stock - l.quantite) } : a
      }))
    }
    setSavingVente(false)
    loadTransactions()
  }

  return (
    <div className="h-[calc(100vh-56px)] overflow-auto">
      <div className="p-4 space-y-4 pb-10">

        {/* ── Toggle mode ── */}
        <div className="bg-white rounded-2xl p-1.5 flex shadow-sm border border-[#E8E2DC] gap-1">
          {([
            { m: 'frais'   as Mode, Icon: GraduationCap, label: 'Frais'    },
            { m: 'produit' as Mode, Icon: ShoppingBag,   label: 'Vente'    },
            { m: 'credits' as Mode, Icon: CreditCard,    label: 'Crédits', badge: credits.length },
          ]).map(({ m, Icon, label, badge }) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 relative flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all
                ${mode === m ? 'bg-[#1B2A8A] text-white shadow-sm' : 'text-gray-400 active:bg-gray-50'}`}>
              <Icon size={14} />{label}
              {badge != null && badge > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none
                  ${mode === m ? 'bg-white text-[#1B2A8A]' : 'bg-[#A01020] text-white'}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── MODE FRAIS : étudiant d'abord ── */}
        {mode === 'frais' && (
          <>
            {/* Étudiant (requis) */}
            <EtudiantSearch
              searchText={searchText} selectedId={selectedId}
              suggestions={suggestions} showSuggestions={showSuggestions}
              placeholder="Chercher un étudiant..."
              onChangeText={handleSearchChange}
              onFocus={() => { if (!selectedId) setShowSuggestions(true) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onSelect={selectEtudiant} onClear={clearEtudiant}
            />

            {!selectedId ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-[#F0EDE8]">
                <GraduationCap size={28} className="text-[#1B2A8A]/30 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Sélectionne un étudiant pour encaisser ses frais</p>
              </div>
            ) : etudiantInfo ? (
              <>
                {(() => {
                  const nonSoldes = FRAIS_CONFIG.filter(cfg =>
                    Math.max(0, (etudiantInfo[cfg.fieldTotal] || 0) - (etudiantInfo[cfg.fieldPaye] || 0)) > 0
                  )
                  if (nonSoldes.length === 0) return (
                    <div className="bg-white rounded-2xl p-6 text-center border border-[#F0EDE8]">
                      <Check size={22} className="text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">Tout est soldé</p>
                      <p className="text-xs text-gray-400 mt-1">Aucun frais en attente pour cet étudiant</p>
                    </div>
                  )
                  return nonSoldes.map(cfg => {
                    const total   = etudiantInfo[cfg.fieldTotal] || 0
                    const paye    = etudiantInfo[cfg.fieldPaye]  || 0
                    const restant = Math.max(0, total - paye)
                    const pct     = total > 0 ? Math.round((paye / total) * 100) : 0
                    const isSel   = fraisType === cfg.type
                    return (
                      <button key={cfg.type}
                        onClick={() => { setFraisType(cfg.type); setFraisMontant(String(restant)) }}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all shadow-sm
                          ${isSel ? 'bg-[#1B2A8A]/5 border-[#1B2A8A]' : 'bg-white border-[#E8E2DC]'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-sm text-gray-800">{cfg.label}</p>
                          <span className={`text-sm font-bold ${isSel ? 'text-[#1B2A8A]' : 'text-[#A01020]'}`}>{fmt(restant)} dû</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 0 ? '#f97316' : '#e5e7eb' }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{fmt(paye)} payé / {fmt(total)}</p>
                      </button>
                    )
                  })
                })()}
                {fraisRestant(fraisType) > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E2DC] space-y-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Montant à encaisser</p>
                    <input type="number" value={fraisMontant} onChange={e => setFraisMontant(e.target.value)}
                      placeholder={`Max ${fmt(fraisRestant(fraisType))}`}
                      className="w-full bg-[#FAF7F4] border border-[#E8E2DC] rounded-xl px-4 py-3 text-2xl font-bold text-gray-900 focus:outline-none focus:border-[#1B2A8A]" />
                    <button onClick={encaisserFrais} disabled={savingFrais || !fraisMontant}
                      className="w-full bg-[#A01020] text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50 shadow-md">
                      {savingFrais ? 'Enregistrement...' : `Confirmer — ${fraisMontant ? fmt(parseFloat(fraisMontant) || 0) : '0 HTG'}`}
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}

        {/* ── MODE PRODUIT : produit d'abord, étudiant après ── */}
        {mode === 'produit' && (
          <>
            {/* 1. Recherche produit */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              <input type="text" value={articleSearch}
                onChange={e => { setArticleSearch(e.target.value) }}
                placeholder="Filtrer les produits..."
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl pl-8 pr-8 py-3 text-sm focus:outline-none focus:border-[#1B2A8A] shadow-sm"
              />
              {articleSearch && (
                <button onClick={() => setArticleSearch('')} className="absolute right-3 top-3 text-gray-400">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* 1b. Grille articles */}
            {(() => {
              const filtered = articles.filter(a =>
                !articleSearch || a.nom.toLowerCase().includes(articleSearch.toLowerCase())
              )
              if (filtered.length === 0) return (
                <div className="bg-white rounded-2xl p-6 text-center border border-[#E8E2DC]">
                  <p className="text-sm text-gray-400">Aucun produit trouvé</p>
                </div>
              )
              return (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map(a => {
                    const inCart = panier.find(l => l.article_id === a.id)
                    const stockOk = a.stock > 0
                    return (
                      <button key={a.id}
                        onClick={() => { if (stockOk) addToCart(a) }}
                        disabled={!stockOk}
                        className={`bg-white rounded-2xl p-3 text-left border shadow-sm active:scale-[0.97] transition-transform flex flex-col gap-1 ${
                          inCart ? 'border-[#1B2A8A] bg-[#1B2A8A]/3' : stockOk ? 'border-[#E8E2DC]' : 'border-[#E8E2DC] opacity-45'
                        }`}>
                        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">{a.nom}</p>
                        <p className="text-xs font-bold text-[#A01020]">{fmt(a.prix)}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            a.stock === 0 ? 'bg-red-100 text-red-500' :
                            a.stock < 5  ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {a.stock === 0 ? 'Rupture' : `Stock: ${a.stock}`}
                          </span>
                          {inCart && (
                            <span className="text-[10px] font-bold text-[#1B2A8A] bg-[#1B2A8A]/10 px-1.5 py-0.5 rounded-full">
                              ×{inCart.quantite}
                            </span>
                          )}
                        </div>
                        {stockOk && (
                          <div className="w-full bg-[#A01020] text-white rounded-xl py-1 text-center text-[11px] font-bold mt-1">
                            + Ajouter
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })()}

            {/* 2. Panier */}
            {panier.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E2DC] space-y-2.5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Panier</p>
                {panier.map(l => (
                  <div key={l.article_id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{l.article_nom}</p>
                      <p className="text-xs text-gray-400">{fmt(l.prix_unitaire)} × {l.quantite}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(l.article_id, -1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={12} /></button>
                      <span className="w-6 text-center text-sm font-bold">{l.quantite}</span>
                      <button onClick={() => updateQty(l.article_id, 1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><Plus size={12} /></button>
                      <button onClick={() => setPanier(p => p.filter(x => x.article_id !== l.article_id))} className="w-7 h-7 rounded-lg bg-red-50 ml-1 flex items-center justify-center"><Trash2 size={12} className="text-red-400" /></button>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-20 text-right">{fmt(l.total)}</span>
                  </div>
                ))}

                {/* 3. Étudiant (optionnel, dans le panier) */}
                <div className="pt-2 border-t border-[#F0EDE8]">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5">Étudiant (optionnel)</p>
                  <EtudiantSearch
                    searchText={searchText} selectedId={selectedId}
                    suggestions={suggestions} showSuggestions={showSuggestions}
                    placeholder="Attacher à un étudiant..."
                    onChangeText={handleSearchChange}
                    onFocus={() => { if (!selectedId) setShowSuggestions(true) }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onSelect={selectEtudiant} onClear={clearEtudiant}
                  />
                </div>

                {/* 4. Total + confirmer */}
                <div className="pt-2 border-t border-[#F0EDE8] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-[#A01020]">{fmt(totalPanier)}</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={modeCredit} onChange={e => setModeCredit(e.target.checked)} className="accent-[#1B2A8A]" />
                    À crédit
                  </label>
                  {modeCredit && (
                    <input type="number" value={montantPaye} onChange={e => setMontantPaye(e.target.value)}
                      placeholder="Montant reçu (HTG)"
                      className="w-full bg-[#FAF7F4] border border-[#E8E2DC] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                  )}
                  <button onClick={finaliserVente} disabled={savingVente}
                    className="w-full bg-[#A01020] text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50 shadow-md">
                    {savingVente ? 'Enregistrement...' : `Confirmer — ${fmt(totalPanier)}`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── MODE CRÉDITS ── */}
        {mode === 'credits' && (
          credits.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-[#F0EDE8]">
              <CreditCard size={28} className="text-[#1B2A8A]/30 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-semibold">Aucun crédit en attente</p>
              <p className="text-gray-300 text-xs mt-1">Toutes les ventes à crédit sont soldées</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{credits.length} crédit{credits.length > 1 ? 's' : ''} en attente</p>
              {credits.map((c, idx) => {
                const restant = c.total - c.montant_paye
                const pct = Math.round((c.montant_paye / c.total) * 100)
                return (
                  <button key={c.id} onClick={() => { setSelectedCredit(c); setCreditMontant(String(restant)) }}
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-[#E8E2DC] active:scale-[0.99] transition-transform animate-card-in"
                    style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-gray-900 text-sm truncate">{c.etudiant_nom || 'Client anonyme'}</p>
                          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Crédit</span>
                        </div>
                        {c.articles && <p className="text-xs text-gray-400 truncate mt-0.5">{c.articles}</p>}
                        <p className="text-xs text-gray-300 mt-1">{new Date(c.created_at).toLocaleDateString('fr-HT')}</p>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-sm font-black text-[#A01020]">{fmt(restant)}</p>
                          <p className="text-xs text-gray-400">restant</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fmt(c.montant_paye)} payé / {fmt(c.total)}</p>
                  </button>
                )
              })}
            </div>
          )
        )}

        {/* ── TRANSACTIONS RÉCENTES ── */}
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">Transactions récentes</p>
          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#E8E2DC] animate-fade-in">
              <div className="w-11 h-11 rounded-2xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={20} className="text-[#1B2A8A]/40" />
              </div>
              <p className="font-semibold text-gray-500 text-sm">Aucune transaction</p>
              <p className="text-xs text-gray-400 mt-1">Les ventes et frais encaissés apparaissent ici</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t, i) => {
                const etudiantNom = Array.isArray(t.etudiant) ? t.etudiant[0]?.nom : t.etudiant?.nom
                const isVente = t._type === 'vente'
                return (
                  <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#F0EDE8] flex items-center gap-3 animate-card-in" style={{ animationDelay: `${Math.min(i, 6) * 25}ms` }}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isVente ? 'bg-[#1B2A8A]/10' : 'bg-[#A01020]/10'}`}>
                      {isVente ? <ShoppingBag size={14} className="text-[#1B2A8A]" /> : <GraduationCap size={14} className="text-[#A01020]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{etudiantNom || 'Caisse'}</p>
                      <p className="text-xs text-gray-400">
                        {isVente ? 'Vente produit' : (TYPE_FRAIS_LABEL[t.type_frais] || t.type_frais)}
                        {' · '}{new Date(t.created_at).toLocaleDateString('fr-HT')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className={`text-sm font-bold ${isVente ? 'text-[#1B2A8A]' : 'text-[#A01020]'}`}>
                          {fmt(isVente ? t.total : t.montant)}
                        </p>
                        {isVente && t.mode_paiement === 'credit' && (
                          <p className="text-xs text-orange-500">Crédit</p>
                        )}
                      </div>
                      {isVente ? (
                        <button
                          onClick={() => setRecuVenteId(t.id)}
                          className="w-8 h-8 rounded-xl bg-[#1B2A8A]/8 flex items-center justify-center active:bg-[#1B2A8A]/20 transition-colors flex-shrink-0">
                          <Printer size={14} className="text-[#1B2A8A]" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setRecuDirect({
                            titre: 'Recu de paiement frais',
                            etudiant: etudiantNom || undefined,
                            employe: session?.employeNom,
                            lignes: [{ nom: TYPE_FRAIS_LABEL[t.type_frais] || t.type_frais, montant: t.montant }],
                            total: t.montant,
                            mode: 'Cash',
                            date: new Date(t.created_at),
                            code: 'FP-' + t.id.toString(36).toUpperCase().slice(-6),
                          })}
                          className="w-8 h-8 rounded-xl bg-[#A01020]/8 flex items-center justify-center active:bg-[#A01020]/20 transition-colors flex-shrink-0">
                          <Printer size={14} className="text-[#A01020]" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      <ReceiptModal
        directData={recuDirect}
        onClose={() => setRecuDirect(null)}
      />
      <ReceiptModal
        venteId={recuVenteId}
        onClose={() => setRecuVenteId(null)}
      />

      {/* ── BOTTOM SHEET : Paiement crédit ── */}
      {selectedCredit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setSelectedCredit(null) }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="px-5 pt-3 pb-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Encaisser un crédit</h3>
                  <p className="text-sm text-gray-400">{selectedCredit.etudiant_nom || 'Client anonyme'}</p>
                </div>
                <button onClick={() => setSelectedCredit(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
                  <X size={15} className="text-gray-500" />
                </button>
              </div>

              {selectedCredit.articles && (
                <div className="bg-white rounded-2xl px-4 py-3 border border-[#E8E2DC]">
                  <p className="text-xs text-gray-400 mb-1">Articles</p>
                  <p className="text-sm text-gray-700">{selectedCredit.articles}</p>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-[#E8E2DC] text-center">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-base font-bold text-gray-900">{fmt(selectedCredit.total)}</p>
                </div>
                <div className="flex-1 bg-white rounded-2xl px-4 py-3 border border-[#E8E2DC] text-center">
                  <p className="text-xs text-gray-400">Déjà payé</p>
                  <p className="text-base font-bold text-green-600">{fmt(selectedCredit.montant_paye)}</p>
                </div>
                <div className="flex-1 bg-orange-50 rounded-2xl px-4 py-3 border border-orange-200 text-center">
                  <p className="text-xs text-orange-500">Restant</p>
                  <p className="text-base font-bold text-orange-600">{fmt(selectedCredit.total - selectedCredit.montant_paye)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Montant encaissé</label>
                <input type="number" value={creditMontant} onChange={e => setCreditMontant(e.target.value)}
                  placeholder={`Max ${fmt(selectedCredit.total - selectedCredit.montant_paye)}`}
                  className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-2xl font-bold text-gray-900 focus:outline-none focus:border-[#1B2A8A]" />
              </div>

              <button onClick={encaisserCredit} disabled={savingCredit || !creditMontant}
                className="w-full bg-[#A01020] text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50 shadow-md">
                {savingCredit ? 'Enregistrement...' : `Confirmer — ${creditMontant ? fmt(parseFloat(creditMontant) || 0) : '0 HTG'}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
