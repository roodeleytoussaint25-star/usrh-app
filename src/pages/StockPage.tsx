import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { formatHTG } from '../lib/utils'
import {
  Search, Plus, FolderPlus, AlertTriangle, Package,
  ArrowUpDown, Pencil, Trash2, PackagePlus,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { Produit, Categorie } from '../types'

type ActiveTab = 'catalogue' | 'inventaire'
type SortKey = 'nom_az' | 'prix_desc' | 'stock_asc'

interface FilterChips {
  bas: boolean
  rupture: boolean
  sans_cout: boolean
}

function marge(p: Produit) {
  if (!p.prix || !p.prix_achat) return null
  return Math.round(((p.prix - p.prix_achat) / p.prix) * 100)
}

function stockColor(p: Produit) {
  if (p.quantite === 0) return 'text-red-500'
  if (p.quantite <= p.seuil_alerte) return 'text-amber-500'
  return 'text-[#3DAA35]'
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
        active
          ? 'bg-[#2D6B2D] text-white border-[#2D6B2D]'
          : 'text-[#78726A] border-[#D4CAB8] bg-white hover:border-slate-400'
      }`}
    >
      {label}
    </button>
  )
}

export function StockPage() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'admin'

  const [tab, setTab] = useState<ActiveTab>('catalogue')
  const [produits, setProduits] = useState<Produit[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [sort, setSort] = useState<SortKey>('nom_az')
  const [chips, setChips] = useState<FilterChips>({ bas: false, rupture: false, sans_cout: false })

  // Modal produit
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduit, setEditProduit] = useState<Produit | null>(null)
  const [saving, setSaving] = useState(false)
  const [formNom, setFormNom] = useState('')
  const [formCatId, setFormCatId] = useState('')
  const [formPrix, setFormPrix] = useState('')
  const [formPrixAchat, setFormPrixAchat] = useState('')
  const [formQte, setFormQte] = useState('')
  const [formSeuil, setFormSeuil] = useState('5')
  const [formUnite, setFormUnite] = useState('unité')
  const [formModeCout, setFormModeCout] = useState<'unitaire' | 'gros'>('unitaire')
  const [formPrixLot, setFormPrixLot] = useState('')
  const [formUnitesParLot, setFormUnitesParLot] = useState('')

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Modal catégorie
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [formCatNom, setFormCatNom] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  // Modal entrée rapide (Inventaire tab)
  const [entreeModal, setEntreeModal] = useState<Produit | null>(null)
  const [entreeQte, setEntreeQte] = useState('')
  const [savingEntree, setSavingEntree] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('mla_produits').select('*, categorie:mla_categories(nom)').order('nom'),
      supabase.from('mla_categories').select('*').order('nom'),
    ])
    setProduits((prods || []) as Produit[])
    setCategories(cats || [])
    setLoading(false)
  }

  // ── Filtre + tri ────────────────────────────────────────────────────────────

  const produitsFiltres = produits
    .filter(p => {
      if (!p.actif) return false
      if (chips.bas && !(p.quantite > 0 && p.quantite <= p.seuil_alerte)) return false
      if (chips.rupture && p.quantite !== 0) return false
      if (chips.sans_cout && (p.prix_achat || 0) > 0) return false
      if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCat && p.categorie_id !== filterCat) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'prix_desc') return b.prix - a.prix
      if (sort === 'stock_asc') return a.quantite - b.quantite
      return a.nom.localeCompare(b.nom, 'fr')
    })

  const aReappro = produits.filter(p => p.actif && (p.quantite === 0 || p.quantite <= p.seuil_alerte))

  // ── Handlers modal produit ──────────────────────────────────────────────────

  const openNew = () => {
    setEditProduit(null)
    setFormNom(''); setFormCatId(categories[0]?.id || ''); setFormPrix('')
    setFormPrixAchat(''); setFormQte(''); setFormSeuil('5'); setFormUnite('unité')
    setFormModeCout('unitaire'); setFormPrixLot(''); setFormUnitesParLot('')
    setModalOpen(true)
  }

  const openEdit = (p: Produit) => {
    setEditProduit(p)
    setFormNom(p.nom); setFormCatId(p.categorie_id || ''); setFormPrix(String(p.prix))
    setFormPrixAchat(String(p.prix_achat || 0)); setFormQte(String(p.quantite))
    setFormSeuil(String(p.seuil_alerte)); setFormUnite(p.unite || 'unité')
    setFormModeCout(p.mode_cout || 'unitaire')
    setFormPrixLot(p.prix_lot ? String(p.prix_lot) : '')
    setFormUnitesParLot(p.unites_par_lot ? String(p.unites_par_lot) : '')
    setModalOpen(true)
  }

  const prixAchatCalc = formModeCout === 'gros' && formPrixLot && formUnitesParLot
    ? parseFloat(formPrixLot) / parseInt(formUnitesParLot)
    : parseFloat(formPrixAchat) || 0

  const handleSave = async () => {
    if (!formNom.trim()) return
    setSaving(true)
    const payload = {
      nom: formNom.trim(),
      categorie_id: formCatId || null,
      prix: parseFloat(formPrix) || 0,
      prix_achat: prixAchatCalc,
      quantite: parseInt(formQte) || 0,
      seuil_alerte: parseInt(formSeuil) || 0,
      unite: formUnite,
      mode_cout: formModeCout,
      prix_lot: formModeCout === 'gros' ? parseFloat(formPrixLot) || null : null,
      unites_par_lot: formModeCout === 'gros' ? parseInt(formUnitesParLot) || null : null,
      actif: true,
    }
    if (editProduit) {
      await supabase.from('mla_produits').update(payload).eq('id', editProduit.id)
    } else {
      await supabase.from('mla_produits').insert(payload)
    }
    setSaving(false); setModalOpen(false)
    await loadData()
    showToast(editProduit ? 'Produit modifié' : 'Produit ajouté')
  }

  const handleToggleActif = async (p: Produit) => {
    await supabase.from('mla_produits').update({ actif: !p.actif }).eq('id', p.id)
    setProduits(prev => prev.map(x => x.id === p.id ? { ...x, actif: !x.actif } : x))
  }

  const handleDelete = async (id: string) => {
    await supabase.from('mla_produits').delete().eq('id', id)
    setProduits(prev => prev.filter(x => x.id !== id))
    showToast('Produit supprimé')
  }

  const handleSaveCat = async () => {
    if (!formCatNom.trim()) return
    setSavingCat(true)
    await supabase.from('mla_categories').insert({ nom: formCatNom.trim() })
    setSavingCat(false); setCatModalOpen(false); setFormCatNom('')
    await loadData()
  }

  const handleEntree = async () => {
    if (!entreeModal) return
    const qte = parseFloat(entreeQte)
    if (!qte || qte <= 0) return
    setSavingEntree(true)
    await supabase.from('mla_produits')
      .update({ quantite: entreeModal.quantite + qte })
      .eq('id', entreeModal.id)
    setSavingEntree(false); setEntreeModal(null); setEntreeQte('')
    await loadData()
  }

  const toggleChip = (key: keyof FilterChips) =>
    setChips(prev => ({ ...prev, [key]: !prev[key] }))

  const activeProduits = produits.filter(p => p.actif)

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-4 space-y-4 pb-24">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1210] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#1A1210]">Produits</h2>
        <div className="w-10 h-0.5 bg-[#E8A820] rounded-full mt-1 mb-0.5" />
        <p className="text-[11px] text-[#A09589]">Catalogue, coûts d'achat et gestion du stock</p>
      </div>

      {/* Boutons Cat. + Produit */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setCatModalOpen(true)}
          className="flex items-center justify-center gap-2 border border-[#D4CAB8] bg-white text-[#4A4540] font-bold py-3 rounded-xl text-sm hover:border-[#3DAA35] transition-colors"
        >
          <FolderPlus size={16} />
          Cat.
        </button>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 bg-[#2D6B2D] hover:bg-[#1E4E1E] text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus size={16} />
          Produit
        </button>
      </div>

      {/* Tabs Catalogue / Inventaire */}
      <div className="flex bg-[#E8E0D0] rounded-xl p-1">
        <button
          onClick={() => setTab('catalogue')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === 'catalogue' ? 'bg-white text-[#1A1210] shadow-sm' : 'text-[#A09589]'
          }`}
        >
          Catalogue
        </button>
        <button
          onClick={() => setTab('inventaire')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all relative ${
            tab === 'inventaire' ? 'bg-white text-[#1A1210] shadow-sm' : 'text-[#A09589]'
          }`}
        >
          Inventaire
          {aReappro.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {aReappro.length > 9 ? '9+' : aReappro.length}
            </span>
          )}
        </button>
      </div>

      {/* ── CATALOGUE ──────────────────────────────────────────────────────── */}
      {tab === 'catalogue' && (
        <div className="space-y-3">
          {/* Section header */}
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[#2D6B2D]" />
            <p className="text-sm font-bold text-[#2C2420]">Catalogue ({activeProduits.length})</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A09589]" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white"
            />
          </div>

          {/* Category + Sort */}
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white text-[#4A4540]"
          >
            <option value="">Toutes</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 border border-[#D4CAB8] rounded-xl px-4 py-3 bg-white">
            <ArrowUpDown size={14} className="text-[#A09589] shrink-0" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="flex-1 text-sm text-[#4A4540] focus:outline-none bg-transparent"
            >
              <option value="nom_az">Nom (A-Z)</option>
              <option value="prix_desc">Prix (décroissant)</option>
              <option value="stock_asc">Stock (croissant)</option>
            </select>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            <Chip label="Stock bas" active={chips.bas} onClick={() => toggleChip('bas')} />
            <Chip label="Rupture" active={chips.rupture} onClick={() => toggleChip('rupture')} />
            <Chip label="Coût manquant" active={chips.sans_cout} onClick={() => toggleChip('sans_cout')} />
          </div>

          {/* Product count */}
          <p className="text-[11px] text-[#A09589]">{produitsFiltres.length} produit{produitsFiltres.length !== 1 ? 's' : ''}</p>

          {/* Product list */}
          {produitsFiltres.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Package size={32} className="text-slate-200 mb-2" />
              <p className="text-sm text-[#A09589]">Aucun produit trouvé</p>
              {(search || filterCat || Object.values(chips).some(Boolean)) && (
                <button
                  onClick={() => { setSearch(''); setFilterCat(''); setChips({ bas: false, rupture: false, sans_cout: false }) }}
                  className="mt-2 text-xs text-[#3DAA35] font-semibold"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {produitsFiltres.map(p => {
                const m = marge(p)
                const estRupture = p.quantite === 0
                const estBas = !estRupture && p.quantite <= p.seuil_alerte
                return (
                  <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    !p.actif ? 'opacity-50 border-[#D4CAB8]' : 'border-[#D4CAB8]'
                  }`}>
                    {/* Main info */}
                    <div className="px-4 pt-3.5 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1A1210] leading-tight">{p.nom}</p>
                          {p.categorie?.nom && (
                            <span className="inline-block mt-1 text-[10px] font-semibold bg-[#F0EBE0] text-[#78726A] px-2 py-0.5 rounded-full">
                              {p.categorie.nom}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-[#1A1210]">{p.prix.toLocaleString('fr-FR')} G</p>
                          <p className="text-[10px] text-[#A09589]">
                            Coût {(p.prix_achat || 0).toLocaleString('fr-FR')} G
                            {m !== null ? ` · Marge ${m}%` : ''}
                          </p>
                          <p className={`text-xs font-bold ${stockColor(p)}`}>
                            {estRupture ? 'Rupture' : `Stock: ${p.quantite}`}
                          </p>
                        </div>
                      </div>

                      {/* Warning badges */}
                      {(estRupture || estBas || (p.prix_achat || 0) === 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {estRupture && (
                            <span className="text-[10px] font-bold border border-red-400 text-red-500 px-2 py-0.5 rounded-full">Rupture</span>
                          )}
                          {estBas && !estRupture && (
                            <span className="text-[10px] font-bold border border-amber-400 text-amber-600 px-2 py-0.5 rounded-full">Stock bas</span>
                          )}
                          {(p.prix_achat || 0) === 0 && (
                            <span className="text-[10px] font-bold border border-[#D4CAB8] text-[#78726A] px-2 py-0.5 rounded-full">Coût manquant</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action row */}
                    <div className="flex items-center border-t border-[#E8E0D0] px-3 py-2 gap-2">
                      {isAdmin && (
                        <button
                          onClick={() => openEdit(p)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-[#2D6B2D] bg-[#EEF7EE] rounded-xl hover:bg-[#D6EED6] transition-colors"
                        >
                          <Pencil size={14} /> Modifier
                        </button>
                      )}
                      <button
                        onClick={() => { setEntreeModal(p); setEntreeQte('') }}
                        className={`${isAdmin ? 'w-11 h-11' : 'flex-1 py-3 gap-1.5 text-sm font-semibold'} flex items-center justify-center rounded-xl bg-[#EAF4FF] text-[#1C2B6E] hover:bg-[#C7DEFF] transition-colors`}
                      >
                        <PackagePlus size={isAdmin ? 16 : 14} />
                        {!isAdmin && <span>+ Entrée stock</span>}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#FEF2F2] text-red-300 hover:text-red-500 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INVENTAIRE ─────────────────────────────────────────────────────── */}
      {tab === 'inventaire' && (
        <div className="space-y-3">
          {aReappro.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="w-14 h-14 bg-[#EEF7EE] rounded-full flex items-center justify-center mb-3">
                <Package size={26} className="text-[#3DAA35]" />
              </div>
              <p className="text-sm font-bold text-[#4A4540]">Stock en ordre</p>
              <p className="text-xs text-[#A09589] mt-1">Aucun produit à réapprovisionner</p>
            </div>
          ) : (
            <>
              {/* Header alerte */}
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <p className="text-sm font-bold text-amber-700">
                  À réapprovisionner ({aReappro.length})
                </p>
              </div>

              {/* Produits à réappro */}
              <div className="space-y-2.5">
                {aReappro.map(p => {
                  const estRupture = p.quantite === 0
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-[#D4CAB8] shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1A1210]">{p.nom}</p>
                          <p className="text-[11px] text-[#A09589] mt-0.5">
                            Stock {p.quantite} {p.unite || 'unité'} · minimum {p.seuil_alerte}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-bold border rounded-full px-2.5 py-1 ${
                            estRupture
                              ? 'border-red-400 text-red-500'
                              : 'border-amber-400 text-amber-600'
                          }`}>
                            {estRupture ? 'Rupture' : 'Stock bas'}
                          </span>
                          <button
                            onClick={() => { setEntreeModal(p); setEntreeQte('') }}
                            className="flex items-center gap-1.5 border border-[#D4CAB8] text-[#78726A] rounded-full px-3 py-1.5 text-xs font-semibold hover:border-[#3DAA35] hover:text-[#3DAA35] transition-colors"
                          >
                            <PackagePlus size={13} /> Entrée
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODAL ENTRÉE RAPIDE ─────────────────────────────────────────────── */}
      <Modal open={!!entreeModal} onClose={() => setEntreeModal(null)} title="Entrée stock">
        {entreeModal && (
          <div className="space-y-4">
            <div className="bg-[#FAF7F2] rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-[#2C2420]">{entreeModal.nom}</p>
              <p className="text-xs text-[#A09589] mt-0.5">
                Stock actuel : {entreeModal.quantite} {entreeModal.unite || 'unité'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4540] mb-1.5">Quantité à ajouter</label>
              <input
                type="number"
                min="1"
                step="any"
                value={entreeQte}
                onChange={e => setEntreeQte(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                placeholder="0"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleEntree()}
              />
            </div>
            {entreeQte && parseFloat(entreeQte) > 0 && (
              <p className="text-xs text-[#3DAA35] font-semibold">
                Nouveau stock : {entreeModal.quantite + parseFloat(entreeQte)} {entreeModal.unite || 'unité'}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setEntreeModal(null)}>Annuler</Button>
              <Button variant="primary" fullWidth loading={savingEntree} onClick={handleEntree}>
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL PRODUIT ──────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editProduit ? 'Modifier le produit' : 'Nouveau produit'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-2">Nom *</label>
            <input type="text" value={formNom} onChange={e => setFormNom(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="Nom du produit" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-2">Catégorie</label>
            <select value={formCatId} onChange={e => setFormCatId(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white">
              <option value="">Sans catégorie</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          {/* Mode de saisie du coût */}
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-2">Mode de saisie du coût</label>
            <select value={formModeCout} onChange={e => setFormModeCout(e.target.value as 'unitaire' | 'gros')}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white">
              <option value="unitaire">Coût par unité</option>
              <option value="gros">Achat en gros (lot)</option>
            </select>
          </div>

          {formModeCout === 'unitaire' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[#4A4540] mb-2">Coût achat (HTG)</label>
                <input type="number" min={0} value={formPrixAchat}
                  onChange={e => setFormPrixAchat(e.target.value)}
                  className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                  placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#4A4540] mb-2">Prix vente (HTG)</label>
                <input type="number" min={0} value={formPrix}
                  onChange={e => setFormPrix(e.target.value)}
                  className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                  placeholder="0" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#4A4540] mb-2">Prix du lot (HTG)</label>
                  <input type="number" min={0} value={formPrixLot}
                    onChange={e => setFormPrixLot(e.target.value)}
                    className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#4A4540] mb-2">Unités par lot</label>
                  <input type="number" min={1} value={formUnitesParLot}
                    onChange={e => setFormUnitesParLot(e.target.value)}
                    className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                    placeholder="Ex : 24" />
                </div>
              </div>
              {formPrixLot && formUnitesParLot && parseInt(formUnitesParLot) > 0 && (
                <div className="bg-[#FAF7F2] rounded-lg px-3 py-2.5 text-sm text-[#78726A] border border-[#D4CAB8]">
                  Coût unitaire calculé : <span className="font-bold text-[#1A1210]">{formatHTG(parseFloat(formPrixLot) / parseInt(formUnitesParLot))}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-[#4A4540] mb-2">Prix vente (HTG)</label>
                <input type="number" min={0} value={formPrix}
                  onChange={e => setFormPrix(e.target.value)}
                  className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                  placeholder="0" />
              </div>
            </>
          )}
          {formPrix && parseFloat(formPrix) > 0 && prixAchatCalc > 0 && (
            <div className="bg-[#EEF7EE] rounded-lg px-3 py-2 flex justify-between">
              <span className="text-xs text-[#78726A]">Marge</span>
              <span className="text-xs font-bold text-[#3DAA35]">
                {Math.round(((parseFloat(formPrix) - prixAchatCalc) / parseFloat(formPrix)) * 100)}%
                &nbsp;·&nbsp;{formatHTG(parseFloat(formPrix) - prixAchatCalc)} / {formUnite}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#4A4540] mb-2">Quantité</label>
              <input type="number" min={0} value={formQte}
                onChange={e => setFormQte(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#4A4540] mb-2">Seuil alerte</label>
              <input type="number" min={0} value={formSeuil}
                onChange={e => setFormSeuil(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                placeholder="5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-2">Unité</label>
            <select value={formUnite} onChange={e => setFormUnite(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white">
              <option value="unité">Unité</option>
              <option value="sac">Sac</option>
              <option value="caisse">Caisse</option>
              <option value="sachet">Sachet</option>
              <option value="Mamit">Mamit</option>
              <option value="kg">Kg</option>
              <option value="lbs">Lbs</option>
              <option value="litre">Litre</option>
              <option value="ml">Ml</option>
              <option value="gallon">Gallon</option>
              <option value="boîte">Boîte</option>
              <option value="bouteille">Bouteille</option>
              <option value="paquet">Paquet</option>
              <option value="gr">Gramme</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleSave}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL CATÉGORIE ─────────────────────────────────────────────────── */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Nouvelle catégorie">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-2">Nom *</label>
            <input type="text" value={formCatNom}
              onChange={e => setFormCatNom(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="Ex: Engrais, Pesticides, Semences..."
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveCat()}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setCatModalOpen(false)}>Annuler</Button>
            <Button variant="primary" fullWidth loading={savingCat} onClick={handleSaveCat}>Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
