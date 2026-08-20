import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Pencil, Trash2, PackagePlus, AlertTriangle, X, ArrowUpDown, Package } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Article } from '@/types'

type SortOrder  = 'az' | 'za' | 'stock_asc' | 'stock_desc'
type FilterChip = 'bas' | 'rupture' | null

const fmt = (n: number) => n.toLocaleString('fr-HT') + ' HTG'
const SORT_LABELS: Record<SortOrder, string> = { az: 'A → Z', za: 'Z → A', stock_asc: 'Stock ↑', stock_desc: 'Stock ↓' }
const SORT_CYCLE: SortOrder[] = ['az', 'za', 'stock_asc', 'stock_desc']

export function StockPage() {
  const { showToast } = useToast()
  const { session }   = useAuth()
  const isAdmin = session?.role === 'admin'

  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<FilterChip>(null)
  const [sort, setSort]         = useState<SortOrder>('az')

  // Entrée stock
  const [showEntree, setShowEntree] = useState<number | null>(null)
  const [entreeQty, setEntreeQty]   = useState('')

  // Modifier (bottom sheet)
  const [editArticle, setEditArticle]         = useState<Article | null>(null)
  const [editNom, setEditNom]                 = useState('')
  const [editPrix, setEditPrix]               = useState('')
  const [editPrixAchat, setEditPrixAchat]     = useState('')
  const [editTypeAchat, setEditTypeAchat]     = useState<'unitaire' | 'gros'>('unitaire')
  const [editUnites, setEditUnites]           = useState('1')
  const [editPrixLot, setEditPrixLot]         = useState('0')
  const [saving, setSaving]                   = useState(false)

  // Nouveau produit (bottom sheet)
  const [showAdd, setShowAdd]             = useState(false)
  const [newNom, setNewNom]               = useState('')
  const [newPrix, setNewPrix]             = useState('')
  const [newPrixAchat, setNewPrixAchat]   = useState('')
  const [newTypeAchat, setNewTypeAchat]   = useState<'unitaire' | 'gros'>('unitaire')
  const [newUnites, setNewUnites]         = useState('1')
  const [newPrixLot, setNewPrixLot]       = useState('0')
  const [newStock, setNewStock]           = useState('0')

  // Supprimer
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('usr_articles').select('*').eq('actif', true).order('nom')
    setArticles(data || [])
    setLoading(false)
  }

  const ajouterEntree = async (id: number) => {
    const qty = parseInt(entreeQty)
    if (!qty || qty <= 0) return
    const article = articles.find(a => a.id === id)
    if (!article) return
    const newStockVal = article.stock + qty
    setArticles(prev => prev.map(a => a.id === id ? { ...a, stock: newStockVal } : a))
    setShowEntree(null); setEntreeQty('')
    showToast(`+${qty} unités ajoutées`)
    await Promise.all([
      supabase.from('usr_articles').update({ stock: newStockVal }).eq('id', id),
      supabase.from('usr_stock_entrees').insert({ article_id: id, quantite: qty }),
    ])
  }

  const saveEdit = async () => {
    if (!editArticle) return
    const nom           = editNom.trim()
    const prix          = parseFloat(editPrix)       || 0
    const prix_achat    = parseFloat(editPrixAchat)  || 0
    const type_achat    = editTypeAchat
    const unites_par_lot = parseInt(editUnites) || 1
    const prix_lot       = parseFloat(editPrixLot) || 0
    if (!nom) return
    setSaving(true)
    setArticles(prev => prev.map(a => a.id === editArticle.id ? { ...a, nom, prix, prix_achat, type_achat, unites_par_lot, prix_lot } : a))
    setEditArticle(null)
    showToast('Article mis à jour')
    await supabase.from('usr_articles').update({ nom, prix, prix_achat, type_achat, unites_par_lot, prix_lot }).eq('id', editArticle.id)
    setSaving(false)
  }

  const ajouterArticle = async (e: React.FormEvent) => {
    e.preventDefault()
    const nom = newNom.trim()
    if (!nom) return
    setSaving(true)
    const prix           = parseFloat(newPrix)      || 0
    const prix_achat     = parseFloat(newPrixAchat) || 0
    const type_achat     = newTypeAchat
    const unites_par_lot = parseInt(newUnites) || 1
    const prix_lot       = parseFloat(newPrixLot) || 0
    const stock          = parseInt(newStock)       || 0
    const { error } = await supabase.from('usr_articles').insert({ nom, prix, prix_achat, type_achat, unites_par_lot, prix_lot, stock })
    setSaving(false)
    if (error) { showToast('Erreur — produit non enregistré'); return }
    setShowAdd(false); setNewNom(''); setNewPrix(''); setNewPrixAchat(''); setNewTypeAchat('unitaire'); setNewUnites('1'); setNewPrixLot('0'); setNewStock('0')
    showToast(`"${nom}" ajouté`)
    load()
  }

  const deleteArticle = async (id: number) => {
    setArticles(prev => prev.filter(a => a.id !== id))
    setConfirmDeleteId(null)
    showToast('Article supprimé')
    await supabase.from('usr_articles').update({ actif: false }).eq('id', id)
  }

  const rupture = articles.filter(a => a.stock <= 0).length
  const bas     = articles.filter(a => a.stock > 0 && a.stock <= 3).length

  const filtered = [...articles]
    .filter(a => {
      if (search && !a.nom.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'rupture') return a.stock <= 0
      if (filter === 'bas')     return a.stock > 0 && a.stock <= 3
      return true
    })
    .sort((a, b) => {
      if (sort === 'az')         return a.nom.localeCompare(b.nom)
      if (sort === 'za')         return b.nom.localeCompare(a.nom)
      if (sort === 'stock_asc')  return a.stock - b.stock
      if (sort === 'stock_desc') return b.stock - a.stock
      return 0
    })

  if (loading) return (
    <div className="bg-white">
      {[1,2,3,4].map(i => (
        <div key={i} className="px-4 py-4 border-b border-[#F0EDE8] animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex-1 overflow-auto">

        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Stock</h1>
            <p className="text-sm text-gray-400">{articles.length} produit{articles.length !== 1 ? 's' : ''} actif{articles.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#A01020] text-white px-4 py-2.5 rounded-full text-sm font-bold active:scale-95 transition-transform shadow-md">
            <Plus size={16} />Produit
          </button>
        </div>

        <div className="px-4 pb-4 space-y-3">

          {/* ── Alert banner ── */}
          {(rupture > 0 || bas > 0) && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertTriangle size={17} className="text-red-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-700">
                {rupture > 0 && `${rupture} en rupture`}
                {rupture > 0 && bas > 0 && ' · '}
                {bas > 0 && `${bas} stock bas`}
              </p>
            </div>
          )}

          {/* ── Search ── */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Chercher un produit..."
              className="w-full bg-white border border-[#E8E2DC] rounded-2xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A] shadow-sm" />
          </div>

          {/* ── Filter chips ── */}
          <div className="flex items-center gap-2">
            {(['bas', 'rupture'] as FilterChip[]).map(chip => (
              <button key={chip!} onClick={() => setFilter(filter === chip ? null : chip)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all
                  ${filter === chip
                    ? chip === 'rupture' ? 'bg-red-500 text-white border-red-500' : 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-[#E8E2DC]'
                  }`}>
                {chip === 'bas' ? 'Stock bas' : 'Rupture'}
              </button>
            ))}
          </div>

          {/* ── Sort + count ── */}
          <div className="flex items-center justify-between">
            <button onClick={() => setSort(SORT_CYCLE[(SORT_CYCLE.indexOf(sort) + 1) % SORT_CYCLE.length])}
              className="flex items-center gap-1.5 bg-white border border-[#E8E2DC] rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm active:scale-95 transition-transform">
              <ArrowUpDown size={12} />{SORT_LABELS[sort]}
            </button>
            <p className="text-sm text-gray-400">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* ── Article list ── */}
        {filtered.length === 0 ? (
          <div className="mx-4 bg-white rounded-2xl p-10 text-center border border-[#E8E2DC] animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-3">
              <Package size={22} className="text-[#1B2A8A]/50" />
            </div>
            <p className="font-semibold text-gray-500 text-sm">Aucun article</p>
            <p className="text-gray-400 text-xs mt-1">Ajoutez votre premier produit ↑</p>
          </div>
        ) : (
          <div className="px-4 pb-6 space-y-2">
            {filtered.map((a, idx) => {
              const isRupture  = a.stock <= 0
              const isBas      = a.stock > 0 && a.stock <= 3
              const accentBar  = isRupture ? 'bg-red-400'    : isBas ? 'bg-amber-400'    : 'bg-emerald-400'
              const rowBg      = isRupture ? 'bg-red-50'     : isBas ? 'bg-amber-50'     : 'bg-white'
              const rowBorder  = isRupture ? 'border-red-100': isBas ? 'border-amber-100': 'border-[#F0EDE8]'
              const stockColor = isRupture ? 'text-red-500'  : isBas ? 'text-amber-500'  : 'text-emerald-600'
              const isEntree   = showEntree === a.id
              return (
                <div key={a.id} className={`rounded-2xl border overflow-hidden flex animate-card-in ${rowBg} ${rowBorder}`} style={{ animationDelay: `${idx * 45}ms` }}>
                  {/* Barre de statut gauche */}
                  <div className={`w-1 flex-shrink-0 ${accentBar}`} />

                  <div className="flex-1 min-w-0 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-base leading-snug">{a.nom}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-sm font-bold text-gray-700">Vente : {fmt(a.prix)}</p>
                          {a.prix_achat > 0 && (
                            <p className="text-sm text-gray-400">Achat : {fmt(a.prix_achat)}</p>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                            ${a.type_achat === 'gros' ? 'bg-[#1B2A8A]/10 text-[#1B2A8A]' : 'bg-gray-100 text-gray-500'}`}>
                            {a.type_achat === 'gros' ? 'En gros' : 'Unitaire'}
                          </span>
                        </div>
                        {a.type_achat === 'gros' && (a.unites_par_lot > 1 || a.prix_lot > 0) && (
                          <p className="text-xs text-[#1B2A8A] mt-1">
                            Lot : {a.unites_par_lot} unités · {fmt(a.prix_lot)}
                          </p>
                        )}

                        {/* Action chips */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <button
                            onClick={() => { setShowEntree(isEntree ? null : a.id); setEntreeQty('') }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                              ${isEntree ? 'bg-[#1B2A8A] text-white border-[#1B2A8A]' : 'bg-white text-[#1B2A8A] border-[#1B2A8A]/40'}`}>
                            <PackagePlus size={12} />Entrée
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => { setEditArticle(a); setEditNom(a.nom); setEditPrix(String(a.prix)); setEditPrixAchat(String(a.prix_achat || 0)); setEditTypeAchat(a.type_achat || 'unitaire'); setEditUnites(String(a.unites_par_lot || 1)); setEditPrixLot(String(a.prix_lot || 0)) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-white text-gray-600 border-gray-200">
                                <Pencil size={12} />Modifier
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(a.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-white text-red-500 border-red-200">
                                <Trash2 size={12} />Suppr.
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stock count */}
                      <div className="text-right flex-shrink-0 pt-0.5">
                        <p className={`text-3xl font-black leading-none ${stockColor}`}>{a.stock}</p>
                        <p className="text-xs text-gray-400 mt-1">en stock</p>
                      </div>
                    </div>

                    {/* Entrée inline */}
                    {isEntree && (
                      <div className="flex gap-2 mt-3">
                        <input type="number" value={entreeQty} onChange={e => setEntreeQty(e.target.value)}
                          placeholder="Quantité à ajouter" autoFocus
                          className="flex-1 bg-white border border-[#E8E2DC] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]"
                          onKeyDown={e => { if (e.key === 'Enter') ajouterEntree(a.id) }} />
                        <button onClick={() => ajouterEntree(a.id)}
                          className="bg-[#1B2A8A] text-white px-4 py-2.5 rounded-xl text-sm font-bold">
                          Ajouter
                        </button>
                        <button onClick={() => { setShowEntree(null); setEntreeQty('') }}
                          className="w-10 border border-[#E8E2DC] rounded-xl flex items-center justify-center text-gray-400">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── BOTTOM SHEET : Modifier ── */}
      {editArticle && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setEditArticle(null) }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="px-5 pt-3 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Modifier l'article</h3>
                <button onClick={() => setEditArticle(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
                  <X size={15} className="text-gray-500" />
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Nom</label>
                <input type="text" value={editNom} onChange={e => setEditNom(e.target.value)}
                  className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Prix de vente (HTG)</label>
                  <input type="number" value={editPrix} onChange={e => setEditPrix(e.target.value)}
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Prix d'achat (HTG)</label>
                  <input type="number" value={editPrixAchat} onChange={e => setEditPrixAchat(e.target.value)}
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Type d'achat</label>
                <div className="flex gap-2">
                  {(['unitaire', 'gros'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setEditTypeAchat(t)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all
                        ${editTypeAchat === t ? 'bg-[#1B2A8A] text-white border-[#1B2A8A]' : 'bg-white text-gray-500 border-[#E8E2DC]'}`}>
                      {t === 'unitaire' ? 'Unitaire' : 'En gros'}
                    </button>
                  ))}
                </div>
              </div>
              {editTypeAchat === 'gros' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Unités / lot</label>
                    <input type="number" value={editUnites} onChange={e => setEditUnites(e.target.value)} min="1"
                      className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Prix du lot (HTG)</label>
                    <input type="number" value={editPrixLot} onChange={e => setEditPrixLot(e.target.value)}
                      className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                  </div>
                </div>
              )}
              <button onClick={saveEdit} disabled={saving}
                className="w-full bg-[#1B2A8A] text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform disabled:opacity-50">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM SHEET : Nouveau produit ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <form onSubmit={ajouterArticle} className="px-5 pt-3 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Nouveau produit</h3>
                <button type="button" onClick={() => setShowAdd(false)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
                  <X size={15} className="text-gray-500" />
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Nom du produit</label>
                <input type="text" value={newNom} onChange={e => setNewNom(e.target.value)} required autoFocus
                  className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Prix de vente</label>
                  <input type="number" value={newPrix} onChange={e => setNewPrix(e.target.value)}
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Prix d'achat</label>
                  <input type="number" value={newPrixAchat} onChange={e => setNewPrixAchat(e.target.value)}
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Type d'achat</label>
                <div className="flex gap-2">
                  {(['unitaire', 'gros'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setNewTypeAchat(t)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all
                        ${newTypeAchat === t ? 'bg-[#1B2A8A] text-white border-[#1B2A8A]' : 'bg-white text-gray-500 border-[#E8E2DC]'}`}>
                      {t === 'unitaire' ? 'Unitaire' : 'En gros'}
                    </button>
                  ))}
                </div>
              </div>
              {newTypeAchat === 'gros' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Unités / lot</label>
                    <input type="number" value={newUnites} onChange={e => setNewUnites(e.target.value)} min="1"
                      className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Prix du lot (HTG)</label>
                    <input type="number" value={newPrixLot} onChange={e => setNewPrixLot(e.target.value)}
                      className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5 block">Stock initial</label>
                <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)}
                  className="w-full bg-white border border-[#E8E2DC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-[#A01020] text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform disabled:opacity-50">
                Ajouter le produit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 text-center mb-2">Supprimer l'article ?</h3>
            <p className="text-sm text-gray-400 text-center mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 border border-[#E8E2DC] rounded-2xl text-sm font-semibold text-gray-600">
                Annuler
              </button>
              <button onClick={() => deleteArticle(confirmDeleteId)}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
