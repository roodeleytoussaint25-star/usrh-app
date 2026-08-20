import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Minus, Trash2, ShoppingBag, GraduationCap, Check, Search, X, CreditCard, ChevronRight, Printer, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ReceiptModal } from '@/components/ReceiptModal'
import type { RecuDirectData } from '@/components/ReceiptModal'
import type { Article, VenteLigne, TypeFrais } from '@/types'

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
  preselectFraisType: TypeFrais | null
  onMounted: () => void
}

const FRAIS_CONFIG = [
  { type: 'inscription'  as TypeFrais, label: 'Inscription',       fieldTotal: 'frais_inscription',  fieldPaye: 'frais_inscription_paye'  },
  { type: 'formation_v1' as TypeFrais, label: 'Document',          fieldTotal: 'frais_formation_v1', fieldPaye: 'frais_formation_v1_paye' },
  { type: 'formation_v2' as TypeFrais, label: 'Premier versement', fieldTotal: 'frais_formation_v2', fieldPaye: 'frais_formation_v2_paye' },
  { type: 'graduation'   as TypeFrais, label: 'Graduation',        fieldTotal: 'frais_graduation',   fieldPaye: 'frais_graduation_paye'   },
  { type: 'seminaire'    as TypeFrais, label: 'Séminaire',         fieldTotal: 'frais_seminaire',    fieldPaye: 'frais_seminaire_paye'    },
]

const fmt = (n: number) => Math.round(n).toString() + ' HTG'
const shortRef = (id: number) => 'RE-' + String(id).padStart(6, '0')
const TYPE_FRAIS_LABEL: Record<string, string> = { inscription: 'Inscription', formation_v1: 'Document', formation_v2: 'Premier versement', graduation: 'Graduation', seminaire: 'Séminaire' }

const selectCls = "w-full appearance-none bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm text-gray-800 focus:outline-none focus:border-[#1B2A8A] pr-10"

function SelectWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

export function VentesPage({ preselectStudentId, preselectFraisType, onMounted }: Props) {
  const { session } = useAuth()
  const { showToast } = useToast()

  const [etudiants, setEtudiants] = useState<{ id: number; nom: string }[]>([])
  const [articles, setArticles]   = useState<Article[]>([])

  // ── Frais section ──
  const [fraisEtuId, setFraisEtuId]   = useState<number | ''>('')
  const [fraisType, setFraisType]     = useState<TypeFrais>('inscription')
  const [fraisInfo, setFraisInfo]     = useState<Record<string, number> | null>(null)
  const [fraisMontant, setFraisMontant] = useState('')
  const [fraisMode, setFraisMode]     = useState<'cash' | 'virement'>('cash')
  const [savingFrais, setSavingFrais] = useState(false)

  // ── Vente section ──
  const [venteEtuId, setVenteEtuId]   = useState<number | ''>('')
  const [panier, setPanier]           = useState<VenteLigne[]>([])
  const [modeCredit, setModeCredit]   = useState(false)
  const [montantPaye, setMontantPaye] = useState('')
  const [savingVente, setSavingVente] = useState(false)
  const [articleSearch, setArticleSearch] = useState('')

  // ── Crédits ──
  const [credits, setCredits]           = useState<CreditVente[]>([])
  const [selectedCredit, setSelectedCredit] = useState<CreditVente | null>(null)
  const [creditMontant, setCreditMontant]   = useState('')
  const [savingCredit, setSavingCredit]     = useState(false)

  // ── Transactions ──
  const [transactions, setTransactions] = useState<any[]>([])
  const [filterTx, setFilterTx]         = useState<'tout' | 'vente' | 'frais'>('tout')

  // ── Reçus ──
  const [recuDirect, setRecuDirect]   = useState<RecuDirectData | null>(null)
  const [recuVenteId, setRecuVenteId] = useState<number | null>(null)

  const initFraisTypeRef = useRef<TypeFrais | null>(preselectFraisType)

  useEffect(() => {
    if (preselectStudentId !== null) {
      setFraisEtuId(preselectStudentId)
      onMounted()
    }
    loadBase()
    loadTransactions()
    loadCredits()
  }, [])

  useEffect(() => {
    if (fraisEtuId) {
      const ft = initFraisTypeRef.current ?? undefined
      initFraisTypeRef.current = null
      loadFraisInfo(Number(fraisEtuId), ft)
    } else {
      setFraisInfo(null)
      setFraisMontant('')
    }
  }, [fraisEtuId])

  useEffect(() => {
    if (fraisInfo) autoFillMontant(fraisType)
  }, [fraisType, fraisInfo])

  const autoFillMontant = (type: TypeFrais) => {
    const cfg = FRAIS_CONFIG.find(c => c.type === type)!
    const restant = Math.max(0, (fraisInfo?.[cfg.fieldTotal] || 0) - (fraisInfo?.[cfg.fieldPaye] || 0))
    setFraisMontant(restant > 0 ? String(restant) : '')
  }

  const loadBase = async () => {
    const [etuRes, artRes] = await Promise.all([
      supabase.from('usr_etudiants').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('usr_articles').select('*').eq('actif', true).order('nom'),
    ])
    setEtudiants(etuRes.data || [])
    setArticles(artRes.data || [])
  }

  const loadFraisInfo = async (id: number, targetFraisType?: TypeFrais) => {
    const { data } = await supabase.from('usr_etudiants')
      .select('id, nom, frais_inscription, frais_inscription_paye, frais_formation_v1, frais_formation_v1_paye, frais_formation_v2, frais_formation_v2_paye, frais_graduation, frais_graduation_paye, frais_seminaire, frais_seminaire_paye')
      .eq('id', id).single()
    if (!data) return
    const d = data as Record<string, number>
    setFraisInfo(d)
    const type = targetFraisType ?? (() => {
      for (const cfg of FRAIS_CONFIG) {
        if ((d[cfg.fieldTotal] || 0) - (d[cfg.fieldPaye] || 0) > 0) return cfg.type
      }
      return 'inscription' as TypeFrais
    })()
    setFraisType(type)
    const cfg = FRAIS_CONFIG.find(c => c.type === type)!
    const restant = Math.max(0, (d[cfg.fieldTotal] || 0) - (d[cfg.fieldPaye] || 0))
    setFraisMontant(restant > 0 ? String(restant) : '')
  }

  const loadTransactions = async () => {
    const [ventesRes, paiementsRes] = await Promise.all([
      supabase.from('usr_ventes').select('id, total, mode_paiement, montant_paye, created_at, etudiant:usr_etudiants(nom)').order('created_at', { ascending: false }).limit(15),
      supabase.from('usr_paiements').select('id, montant, type_frais, created_at, etudiant:usr_etudiants(nom)').order('created_at', { ascending: false }).limit(15),
    ])
    const ventes    = (ventesRes.data    || []).map(v => ({ ...v, _type: 'vente'    }))
    const paiements = (paiementsRes.data || []).map(p => ({ ...p, _type: 'paiement' }))
    setTransactions([...ventes, ...paiements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20))
  }

  const loadCredits = async () => {
    const { data } = await supabase.from('usr_ventes')
      .select('id, total, montant_paye, created_at, etudiant:usr_etudiants(nom), usr_ventes_lignes(article_nom, quantite)')
      .eq('mode_paiement', 'credit').order('created_at', { ascending: false })
    setCredits(
      (data || [])
        .filter((v: any) => v.total - v.montant_paye > 0)
        .map((v: any) => ({
          id: v.id, total: v.total, montant_paye: v.montant_paye, created_at: v.created_at,
          etudiant_nom: Array.isArray(v.etudiant) ? v.etudiant[0]?.nom ?? null : v.etudiant?.nom ?? null,
          articles: (v.usr_ventes_lignes || []).map((l: any) => `${l.article_nom} ×${l.quantite}`).join(', '),
        }))
    )
  }

  // ── Encaissement frais ──
  const encaisserFrais = async () => {
    if (!fraisEtuId || !fraisMontant) return
    const montant = parseFloat(fraisMontant)
    if (!montant || montant <= 0) return
    setSavingFrais(true)
    const cfg = FRAIS_CONFIG.find(c => c.type === fraisType)!
    const currentPaye = fraisInfo?.[cfg.fieldPaye] || 0
    setFraisMontant('')
    await Promise.all([
      supabase.from('usr_etudiants').update({ [cfg.fieldPaye]: currentPaye + montant }).eq('id', fraisEtuId),
      supabase.from('usr_paiements').insert({ etudiant_id: fraisEtuId, employe_id: session?.employeId || null, type_frais: fraisType, montant }),
    ])
    setSavingFrais(false)
    setRecuDirect({
      titre: 'Reçu de paiement frais',
      etudiant: etudiants.find(e => e.id === Number(fraisEtuId))?.nom,
      employe: session?.employeNom,
      lignes: [{ nom: cfg.label, montant }],
      total: montant,
      mode: fraisMode === 'cash' ? 'Cash' : 'Virement',
      date: new Date(),
      code: 'FP-' + Date.now().toString(36).toUpperCase().slice(-6),
    })
    await loadFraisInfo(Number(fraisEtuId))
    loadTransactions()
  }

  // ── Vente produit ──
  const addToCart = (article: Article) => {
    setPanier(prev => {
      const ex = prev.find(l => l.article_id === article.id)
      if (ex) return prev.map(l => l.article_id === article.id ? { ...l, quantite: l.quantite + 1, total: (l.quantite + 1) * l.prix_unitaire } : l)
      return [...prev, { article_id: article.id, article_nom: article.nom, quantite: 1, prix_unitaire: article.prix, total: article.prix }]
    })
  }

  const updateQty = (article_id: number, delta: number) => {
    setPanier(prev => prev.map(l => l.article_id === article_id ? { ...l, quantite: l.quantite + delta, total: (l.quantite + delta) * l.prix_unitaire } : l).filter(l => l.quantite > 0))
  }

  const totalPanier = panier.reduce((s, l) => s + l.total, 0)

  const finaliserVente = async () => {
    if (panier.length === 0) return
    for (const l of panier) {
      const art = articles.find(a => a.id === l.article_id)
      if (art && art.stock < l.quantite) { showToast(`Stock insuffisant : ${l.article_nom} (${art.stock} dispo)`); return }
    }
    const panierSnap = [...panier]
    const totalSnap  = totalPanier
    const etudiantNom = venteEtuId ? etudiants.find(e => e.id === Number(venteEtuId))?.nom : undefined
    const paye = modeCredit ? parseFloat(montantPaye) || 0 : totalSnap
    setPanier([]); setModeCredit(false); setMontantPaye('')
    showToast(`Vente de ${fmt(totalSnap)} enregistrée`)
    setSavingVente(true)
    const { data: vente } = await supabase.from('usr_ventes').insert({
      etudiant_id: venteEtuId || null, employe_id: session?.employeId || null,
      total: totalSnap, mode_paiement: modeCredit ? 'credit' : 'cash', montant_paye: paye,
    }).select().single()
    if (vente) {
      setRecuDirect({
        titre: 'Reçu de vente',
        etudiant: etudiantNom,
        employe: session?.employeNom,
        lignes: panierSnap.map(l => ({ nom: l.article_nom, montant: l.total })),
        total: totalSnap,
        mode: modeCredit ? 'Crédit' : 'Cash',
        date: new Date(),
        code: shortRef(vente.id),
        venteId: vente.id,
      })
      await Promise.all([
        supabase.from('usr_ventes_lignes').insert(panierSnap.map(l => ({
          vente_id: vente.id, article_id: l.article_id, article_nom: l.article_nom,
          quantite: l.quantite, prix_unitaire: l.prix_unitaire, total: l.total,
        }))),
        ...panierSnap.map(l =>
          supabase.from('usr_articles').update({ stock: Math.max(0, (articles.find(a => a.id === l.article_id)?.stock ?? l.quantite) - l.quantite) }).eq('id', l.article_id)
        ),
      ])
      setArticles(prev => prev.map(a => {
        const l = panierSnap.find(x => x.article_id === a.id)
        return l ? { ...a, stock: Math.max(0, a.stock - l.quantite) } : a
      }))
    }
    setSavingVente(false)
    loadTransactions()
  }

  const encaisserCredit = async () => {
    if (!selectedCredit || !creditMontant) return
    const montant = parseFloat(creditMontant)
    if (!montant || montant <= 0) return
    const max  = selectedCredit.total - selectedCredit.montant_paye
    const paye = Math.min(montant, max)
    setSavingCredit(true)
    const newMontantPaye = selectedCredit.montant_paye + paye
    await supabase.from('usr_ventes').update({ montant_paye: newMontantPaye }).eq('id', selectedCredit.id)
    setSelectedCredit(null); setCreditMontant('')
    setSavingCredit(false)
    setRecuDirect({
      titre: 'Reçu — paiement crédit',
      etudiant: selectedCredit.etudiant_nom ?? undefined,
      employe: session?.employeNom,
      lignes: [{ nom: 'Acompte crédit', montant: paye }],
      total: paye, mode: 'Cash',
      notes: `Reste dû après paiement : ${fmt(selectedCredit.total - newMontantPaye)}`,
      date: new Date(),
      code: 'FP-' + Date.now().toString(36).toUpperCase().slice(-6),
    })
    showToast(`${fmt(paye)} encaissé`)
    loadCredits(); loadTransactions()
  }

  // Frais restant pour type sélectionné
  const fraisRestant = fraisInfo
    ? Math.max(0, (fraisInfo[FRAIS_CONFIG.find(c => c.type === fraisType)!.fieldTotal] || 0) - (fraisInfo[FRAIS_CONFIG.find(c => c.type === fraisType)!.fieldPaye] || 0))
    : 0

  const filteredArticles = articles.filter(a => !articleSearch || a.nom.toLowerCase().includes(articleSearch.toLowerCase()))

  return (
    <div className="h-[calc(100vh-56px)] overflow-auto bg-[#F0F2F5]">
      <div className="p-4 space-y-4 pb-10">

        {/* ══════════════════════════════
            CARD 1 — Encaissement frais
        ══════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-[#E8E2DC] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#F0EDE8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1B2A8A]/10 flex items-center justify-center flex-shrink-0">
                <CreditCard size={18} className="text-[#1B2A8A]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base leading-tight">Encaissement frais</h2>
                <p className="text-xs text-gray-400 mt-0.5">Enregistrez un frais scolaire (partiel ou total)</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-5 py-4 space-y-3">

            {/* Étudiant */}
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Étudiant</label>
              <SelectWrap>
                <select value={fraisEtuId} onChange={e => setFraisEtuId(e.target.value ? Number(e.target.value) : '')} className={selectCls}>
                  <option value="">— Sélectionner un étudiant —</option>
                  {etudiants.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </SelectWrap>
            </div>

            {/* Type frais + mode paiement côte à côte */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Type de frais</label>
                <SelectWrap>
                  <select value={fraisType} onChange={e => setFraisType(e.target.value as TypeFrais)} className={selectCls}>
                    {FRAIS_CONFIG.map(cfg => {
                      const restant = fraisInfo
                        ? Math.max(0, (fraisInfo[cfg.fieldTotal] || 0) - (fraisInfo[cfg.fieldPaye] || 0))
                        : null
                      return (
                        <option key={cfg.type} value={cfg.type}>
                          {cfg.label}{restant !== null ? ` — ${fmt(restant)}` : ''}
                        </option>
                      )
                    })}
                  </select>
                </SelectWrap>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Mode</label>
                <SelectWrap>
                  <select value={fraisMode} onChange={e => setFraisMode(e.target.value as 'cash' | 'virement')} className={selectCls}>
                    <option value="cash">Espèces</option>
                    <option value="virement">Virement</option>
                  </select>
                </SelectWrap>
              </div>
            </div>

            {/* Infos restant si étudiant sélectionné */}
            {fraisEtuId && fraisInfo && (
              <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${fraisRestant > 0 ? 'bg-[#A01020]/5 border border-[#A01020]/20' : 'bg-green-50 border border-green-200'}`}>
                <span className="text-xs font-semibold text-gray-600">{TYPE_FRAIS_LABEL[fraisType]}</span>
                {fraisRestant > 0
                  ? <span className="text-sm font-bold text-[#A01020]">{fmt(fraisRestant)} restant</span>
                  : <span className="text-sm font-bold text-green-600 flex items-center gap-1"><Check size={13} />Soldé</span>
                }
              </div>
            )}

            {/* Montant */}
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Montant (HTG)</label>
              <input
                type="number"
                value={fraisMontant}
                onChange={e => setFraisMontant(e.target.value)}
                placeholder={fraisRestant > 0 ? `Max ${fmt(fraisRestant)}` : 'Montant à encaisser'}
                className="w-full bg-[#F7F5F2] border border-[#E8E2DC] rounded-2xl px-4 py-4 text-2xl font-bold text-gray-900 focus:outline-none focus:border-[#1B2A8A] placeholder:text-gray-300 placeholder:text-base placeholder:font-normal"
              />
            </div>

            {/* Bouton encaisser */}
            <button
              onClick={encaisserFrais}
              disabled={savingFrais || !fraisEtuId || !fraisMontant}
              className="w-full bg-[#1B2A8A] text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40 shadow-md">
              <CreditCard size={16} />
              {savingFrais ? 'Enregistrement...' : fraisMontant ? `Encaisser — ${fmt(parseFloat(fraisMontant) || 0)}` : 'Encaisser'}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════
            CARD 2 — Vente produit
        ══════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-[#E8E2DC] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#F0EDE8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={18} className="text-orange-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base leading-tight">Vente produit</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ajoutez des produits au panier puis validez</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">

            {/* Étudiant (optionnel) */}
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Étudiant <span className="normal-case font-normal">(optionnel)</span></label>
              <SelectWrap>
                <select value={venteEtuId} onChange={e => setVenteEtuId(e.target.value ? Number(e.target.value) : '')} className={selectCls}>
                  <option value="">— Client anonyme —</option>
                  {etudiants.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </SelectWrap>
            </div>

            {/* Recherche produit */}
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Produit</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={articleSearch}
                  onChange={e => setArticleSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full bg-[#F7F5F2] border border-[#E8E2DC] rounded-2xl pl-9 pr-9 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]"
                />
                {articleSearch && (
                  <button onClick={() => setArticleSearch('')} className="absolute right-3.5 top-3.5 text-gray-400"><X size={15} /></button>
                )}
              </div>
            </div>

            {/* Grille articles */}
            {filteredArticles.length === 0 ? (
              <div className="bg-[#F7F5F2] rounded-2xl py-6 text-center">
                <p className="text-sm text-gray-400">Aucun produit trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredArticles.map(a => {
                  const inCart = panier.find(l => l.article_id === a.id)
                  const stockOk = a.stock > 0
                  return (
                    <button key={a.id}
                      onClick={() => { if (stockOk) addToCart(a) }}
                      disabled={!stockOk}
                      className={`bg-[#F7F5F2] rounded-2xl p-3.5 text-left border active:scale-[0.97] transition-transform flex flex-col gap-1.5 ${
                        inCart ? 'border-[#1B2A8A] bg-[#1B2A8A]/5' : stockOk ? 'border-[#E8E2DC]' : 'border-[#E8E2DC] opacity-40'
                      }`}>
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 flex-1">{a.nom}</p>
                        {inCart && (
                          <span className="text-[10px] font-bold text-[#1B2A8A] bg-[#1B2A8A]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">×{inCart.quantite}</span>
                        )}
                      </div>
                      <p className="text-sm font-black text-[#A01020]">{fmt(a.prix)}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          a.stock === 0 ? 'bg-red-100 text-red-500' : a.stock < 5 ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {a.stock === 0 ? 'Rupture' : `Stock: ${a.stock}`}
                        </span>
                        {stockOk && (
                          <span className="text-[10px] font-bold text-[#1B2A8A]">+ Ajouter</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Panier */}
            {panier.length > 0 && (
              <div className="bg-[#F7F5F2] rounded-2xl border border-[#E8E2DC] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E8E2DC]">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Panier</p>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {panier.map(l => (
                    <div key={l.article_id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{l.article_nom}</p>
                        <p className="text-xs text-gray-400">{fmt(l.prix_unitaire)} × {l.quantite}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(l.article_id, -1)} className="w-7 h-7 rounded-xl bg-white border border-[#E8E2DC] flex items-center justify-center"><Minus size={11} /></button>
                        <span className="w-5 text-center text-sm font-bold">{l.quantite}</span>
                        <button onClick={() => updateQty(l.article_id, 1)} className="w-7 h-7 rounded-xl bg-white border border-[#E8E2DC] flex items-center justify-center"><Plus size={11} /></button>
                        <button onClick={() => setPanier(p => p.filter(x => x.article_id !== l.article_id))} className="w-7 h-7 rounded-xl bg-red-50 ml-1 flex items-center justify-center"><Trash2 size={11} className="text-red-400" /></button>
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-20 text-right">{fmt(l.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-[#E8E2DC] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">Total</span>
                    <span className="text-xl font-black text-[#A01020]">{fmt(totalPanier)}</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                    <input type="checkbox" checked={modeCredit} onChange={e => setModeCredit(e.target.checked)} className="accent-[#1B2A8A] w-4 h-4" />
                    À crédit
                  </label>
                  {modeCredit && (
                    <input type="number" value={montantPaye} onChange={e => setMontantPaye(e.target.value)}
                      placeholder="Montant reçu maintenant (HTG)"
                      className="w-full bg-white border border-[#E8E2DC] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                  )}
                  <button onClick={finaliserVente} disabled={savingVente}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 shadow-md">
                    <ShoppingBag size={16} />
                    {savingVente ? 'Enregistrement...' : `Confirmer — ${fmt(totalPanier)}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════
            Crédits en attente
        ══════════════════════════════ */}
        {credits.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3 px-1">
              {credits.length} crédit{credits.length > 1 ? 's' : ''} en attente
            </p>
            <div className="space-y-2">
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
                        {c.articles && <p className="text-xs text-gray-400 truncate">{c.articles}</p>}
                        <p className="text-xs text-gray-300 mt-1">{new Date(c.created_at).toLocaleDateString('fr-HT')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black text-[#A01020]">{fmt(restant)}</p>
                          <p className="text-xs text-gray-400">restant</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fmt(c.montant_paye)} payé / {fmt(c.total)}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            Transactions récentes
        ══════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Transactions récentes</p>
            <div className="flex gap-1">
              {(['tout','vente','frais'] as const).map(f => (
                <button key={f} onClick={() => setFilterTx(f)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    filterTx === f ? 'bg-[#1B2A8A] text-white border-[#1B2A8A]' : 'bg-white text-gray-500 border-[#E8E2DC]'
                  }`}>
                  {f === 'tout' ? 'Tout' : f === 'vente' ? 'Ventes' : 'Frais'}
                </button>
              ))}
            </div>
          </div>

          {transactions.filter(t => filterTx === 'tout' || (filterTx === 'vente' ? t._type === 'vente' : t._type === 'paiement')).length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#E8E2DC]">
              <div className="w-11 h-11 rounded-2xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={20} className="text-[#1B2A8A]/40" />
              </div>
              <p className="font-semibold text-gray-500 text-sm">Aucune transaction</p>
              <p className="text-xs text-gray-400 mt-1">Les ventes et frais apparaissent ici</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions
                .filter(t => filterTx === 'tout' || (filterTx === 'vente' ? t._type === 'vente' : t._type === 'paiement'))
                .map((t, i) => {
                  const etudiantNom = Array.isArray(t.etudiant) ? t.etudiant[0]?.nom : t.etudiant?.nom
                  const isVente = t._type === 'vente'
                  return (
                    <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#F0EDE8] flex items-center gap-3 animate-card-in" style={{ animationDelay: `${Math.min(i, 6) * 25}ms` }}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isVente ? 'bg-orange-100' : 'bg-[#1B2A8A]/10'}`}>
                        {isVente ? <ShoppingBag size={15} className="text-orange-500" /> : <CreditCard size={15} className="text-[#1B2A8A]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{etudiantNom || 'Client anonyme'}</p>
                        <p className="text-xs text-gray-400">
                          {isVente ? 'Vente produit' : (TYPE_FRAIS_LABEL[t.type_frais] || t.type_frais)}
                          {' · '}{new Date(t.created_at).toLocaleDateString('fr-HT')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isVente ? 'text-orange-500' : 'text-[#1B2A8A]'}`}>
                            {fmt(isVente ? t.total : t.montant)}
                          </p>
                          {isVente && t.mode_paiement === 'credit' && <p className="text-[10px] text-orange-400">Crédit</p>}
                        </div>
                        {isVente ? (
                          <button onClick={() => setRecuVenteId(t.id)}
                            className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center active:bg-orange-100 flex-shrink-0">
                            <Printer size={14} className="text-orange-500" />
                          </button>
                        ) : (
                          <button onClick={() => setRecuDirect({
                            titre: 'Reçu de paiement frais',
                            etudiant: etudiantNom || undefined,
                            employe: session?.employeNom,
                            lignes: [{ nom: TYPE_FRAIS_LABEL[t.type_frais] || t.type_frais, montant: t.montant }],
                            total: t.montant, mode: 'Cash',
                            date: new Date(t.created_at),
                            code: 'FP-' + t.id.toString(36).toUpperCase().slice(-6),
                          })}
                            className="w-8 h-8 rounded-xl bg-[#1B2A8A]/8 flex items-center justify-center active:bg-[#1B2A8A]/20 flex-shrink-0">
                            <Printer size={14} className="text-[#1B2A8A]" />
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

      {/* Reçus */}
      <ReceiptModal directData={recuDirect} onClose={() => setRecuDirect(null)} />
      <ReceiptModal venteId={recuVenteId} onClose={() => setRecuVenteId(null)} />

      {/* Bottom sheet — Crédit */}
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
                <button onClick={() => setSelectedCredit(null)} className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center"><X size={15} className="text-gray-500" /></button>
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
                  <p className="text-xs text-gray-400">Payé</p>
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
                className="w-full bg-[#A01020] text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform disabled:opacity-50 shadow-md">
                {savingCredit ? 'Enregistrement...' : `Confirmer — ${creditMontant ? fmt(parseFloat(creditMontant) || 0) : '0 HTG'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
