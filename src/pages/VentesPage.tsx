import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { formatHTG, formatTime, formatDate, todayStart } from '../lib/utils'
import { Plus, Trash2, RotateCcw, ShoppingCart, Receipt, CreditCard, FileText, X, MapPin, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ReceiptModal } from '../components/ReceiptModal'
import { CreditTab } from '../components/CreditTab'
import { ProductSearch } from '../components/ProductSearch'
import { genererProformaPDF } from '../lib/pdf'
import type { ProformaData } from '../lib/pdf'
import type { Produit, Vente, VenteLigne, VenteStatut } from '../types'

type Tab = 'vente' | 'credits'

function proformaNumero() {
  const d = new Date()
  return `PRO-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`
}
function proformaDateFR() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

interface CartItem {
  produit: Produit
  quantite: number
  prix_unitaire: number
}

interface VenteExpanded extends Vente {
  expanded?: boolean
  lignes?: VenteLigne[]
}


const STATUT_BADGE: Record<VenteStatut, { label: string; color: string }> = {
  completee: { label: 'Payé',    color: 'bg-green-100 text-green-700' },
  annulee:   { label: 'Annulé',  color: 'bg-red-100 text-red-600'    },
  retour:    { label: 'Retour',  color: 'bg-yellow-100 text-yellow-700' },
  credit:    { label: 'Crédit',  color: 'bg-amber-100 text-amber-700' },
}

export function VentesPage() {
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('vente')
  const [produits, setProduits]     = useState<Produit[]>([])
  const [cart, setCart]             = useState<CartItem[]>([])
  const [historique, setHistorique] = useState<VenteExpanded[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  // Formulaire produit
  const [selectedId, setSelectedId]   = useState('')
  const [qte, setQte]                 = useState(1)
  const [prixUnit, setPrixUnit]       = useState(0)

  // Panier — clé pour reset le champ search après ajout
  const [searchKey, setSearchKey] = useState(0)

  // Client + paiement
  const [nomClient, setNomClient]               = useState('')
  const [telephoneClient, setTelephoneClient]   = useState('')
  const [notesVente, setNotesVente]             = useState('')
  const [paiementPartiel, setPaiementPartiel]   = useState(false)
  const [montantPayeInput, setMontantPayeInput] = useState('')
  const [modePaiement, setModePaiement]         = useState('especes')

  // Proforma (mode overlay)
  const [proformaMode, setProformaMode]       = useState(false)
  const [proformaContact, setProformaContact] = useState('')
  const [proformaValidite, setProformaValidite] = useState('30')

  // Recherche historique
  const [searchHisto, setSearchHisto] = useState('')
  const [dateHisto, setDateHisto]     = useState('')

  // Modals
  const [receiptVenteId, setReceiptVenteId] = useState<string | null>(null)
  const [creditsBadge, setCreditsBadge]     = useState(0)

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadVentes(dateHisto) }, [dateHisto])

  const loadData = async () => {
    setLoading(true)
    const [{ data: prods }, { data: creditsCount }] = await Promise.all([
      supabase.from('mla_produits').select('*').eq('actif', true).order('nom'),
      supabase.from('mla_ventes').select('id', { count: 'exact', head: true }).eq('statut', 'credit'),
    ])
    setProduits(prods || [])
    setCreditsBadge(creditsCount?.length ?? 0)
    await loadVentes(dateHisto)
    setLoading(false)
  }

  const loadVentes = async (date: string) => {
    let query = supabase
      .from('mla_ventes')
      .select('*, employe:mla_employes(nom)')
      .order('created_at', { ascending: false })
    if (date) {
      // Parse as local midnight to avoid UTC offset issues
      const start = new Date(date + 'T00:00:00')
      const end   = new Date(date + 'T23:59:59.999')
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
    } else {
      query = query.limit(50)
    }
    const { data: ventes } = await query
    setHistorique((ventes || []) as VenteExpanded[])
  }

  // ── Panier ─────────────────────────────────────────────────────────────────

  const handleSelectProduit = (id: string) => {
    setSelectedId(id)
    const prod = produits.find(p => p.id === id)
    setPrixUnit(prod?.prix || 0)
    setQte(1)
  }

  const handleAjouter = () => {
    if (!selectedId) return
    const prod = produits.find(p => p.id === selectedId)
    if (!prod) return
    if (qte <= 0) return
    if (qte > prod.quantite) {
      setError(`Stock insuffisant pour "${prod.nom}" (dispo: ${prod.quantite})`)
      return
    }
    setCart(prev => {
      const existing = prev.find(i => i.produit.id === selectedId)
      if (existing) {
        const newQty = existing.quantite + qte
        if (newQty > prod.quantite) { setError(`Stock insuffisant (dispo: ${prod.quantite})`); return prev }
        return prev.map(i => i.produit.id === selectedId ? { ...i, quantite: newQty } : i)
      }
      return [...prev, { produit: prod, quantite: qte, prix_unitaire: prixUnit }]
    })
    setSelectedId(''); setQte(1); setPrixUnit(0); setError('')
    setSearchKey(k => k + 1)
  }

  const removeFromCart = (produitId: string) =>
    setCart(prev => prev.filter(i => i.produit.id !== produitId))

  const updateQtyInCart = (produitId: string, newQty: number) => {
    if (!newQty || newQty < 1) return
    const item = cart.find(i => i.produit.id === produitId)
    if (!item) return
    if (newQty > item.produit.quantite) {
      setError(`Stock insuffisant pour "${item.produit.nom}" (dispo: ${item.produit.quantite})`)
      return
    }
    setError('')
    setCart(prev => prev.map(i => i.produit.id === produitId ? { ...i, quantite: newQty } : i))
  }

  // ── Totaux ─────────────────────────────────────────────────────────────────

  const sousTotal  = cart.reduce((acc, i) => acc + i.quantite * i.prix_unitaire, 0)
  const nbArticles = cart.reduce((acc, i) => acc + i.quantite, 0)

  const total = sousTotal

  const montantPayeCalc = paiementPartiel
    ? Math.min(parseFloat(montantPayeInput) || 0, total)
    : total
  const resteAPayer = Math.max(0, total - montantPayeCalc)
  const estCredit   = paiementPartiel && montantPayeCalc < total

  // ── Enregistrer ────────────────────────────────────────────────────────────

  const resetCart = () => {
    setCart([])
    setNomClient(''); setTelephoneClient(''); setNotesVente('')
    setPaiementPartiel(false); setMontantPayeInput(''); setModePaiement('especes')
    setProformaMode(false); setProformaContact(''); setProformaValidite('30')
    setSearchKey(k => k + 1)
  }

  const handleSave = async () => {
    if (cart.length === 0) { setError('Ajoutez au moins un article'); return }

    // ── Proforma : génère PDF, ne sauvegarde pas ──
    if (proformaMode) {
      if (!nomClient.trim()) { setError('Entrez le nom du client pour la proforma'); return }
      setSaving(true)
      genererProformaPDF({
        numero: proformaNumero(),
        date: proformaDateFR(),
        client_nom: nomClient.trim(),
        client_contact: proformaContact.trim() || undefined,
        lignes: cart.map(i => ({ description: i.produit.nom, quantite: i.quantite, prix_unitaire: i.prix_unitaire })),
        validite_jours: parseInt(proformaValidite) || 30,
      } as ProformaData)
      resetCart()
      setSaving(false)
      return
    }

    if (paiementPartiel && (!montantPayeInput || parseFloat(montantPayeInput) <= 0)) {
      setError('Entrez le montant payé (doit être supérieur à 0)')
      return
    }
    if (estCredit && !nomClient.trim()) { setError('Entrez le nom du client pour un paiement partiel'); return }
    setSaving(true); setError('')
    try {
      const statut: VenteStatut = estCredit ? 'credit' : 'completee'

      const { data: venteData, error: venteErr } = await supabase
        .from('mla_ventes')
        .insert({
          employe_id: session?.employeId || null,
          succursale_id: session?.succursaleId || null,
          total,
          statut,
          nom_client: nomClient.trim() || null,
          telephone_client: telephoneClient.trim() || null,
          notes: notesVente.trim() || null,
          montant_paye: montantPayeCalc,
        })
        .select().single()

      if (venteErr || !venteData) { setError("Erreur lors de l'enregistrement"); return }

      await supabase.from('mla_ventes_lignes').insert(
        cart.map(i => ({
          vente_id: venteData.id,
          produit_id: i.produit.id,
          quantite: i.quantite,
          prix_unitaire: i.prix_unitaire,
          sous_total: i.quantite * i.prix_unitaire,
        }))
      )

      if (estCredit && montantPayeCalc > 0) {
        await supabase.from('mla_credits_paiements').insert({
          vente_id: venteData.id,
          montant: montantPayeCalc,
          date_paiement: new Date().toISOString().split('T')[0],
          notes: 'Acompte à la vente',
        })
      }

      for (const i of cart) {
        await supabase.from('mla_produits')
          .update({ quantite: i.produit.quantite - i.quantite })
          .eq('id', i.produit.id)
      }

      resetCart()
      await loadVentes(dateHisto)
      setReceiptVenteId(venteData.id)
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  // ── Historique ─────────────────────────────────────────────────────────────

  const changerStatut = async (venteId: string, statut: VenteStatut) => {
    await supabase.from('mla_ventes').update({ statut }).eq('id', venteId)
    setHistorique(prev => prev.map(v => v.id === venteId ? { ...v, statut } : v))
  }

  const toggleExpand = async (venteId: string) => {
    setHistorique(prev => prev.map(v => v.id !== venteId ? v : { ...v, expanded: !v.expanded }))
    const vente = historique.find(v => v.id === venteId)
    if (vente && !vente.lignes) {
      const { data } = await supabase
        .from('mla_ventes_lignes')
        .select('*, produit:mla_produits(nom, prix)')
        .eq('vente_id', venteId)
      setHistorique(prev => prev.map(v => v.id !== venteId ? v : { ...v, lignes: (data || []) as VenteLigne[] }))
    }
  }

  const shortRef = (id: string) => 'VE-' + id.slice(0, 6).toUpperCase()

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <>
      <ReceiptModal venteId={receiptVenteId} onClose={() => setReceiptVenteId(null)} />

      <div className="p-4 space-y-4 pb-24">
        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#1A1210]">Ventes</h1>
            <p className="text-[11px] text-[#78726A] mt-0.5">Enregistrez vos ventes et consultez l'historique</p>
            <div className="w-10 h-0.5 bg-[#8B6400] rounded-full mt-1 mb-0.5" />
            <p className="text-[11px] text-[#A09589] capitalize">{formatDate(new Date().toISOString())}</p>
          </div>
          {session?.succursaleNom && (
            <div className="flex items-center gap-1.5 bg-[#2D6B2D] text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
              <MapPin size={11} />
              {session.succursaleNom}
            </div>
          )}
        </div>

        {/* ── TABS ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-[#E8E0D0] rounded-xl p-1">
          <button
            onClick={() => setActiveTab('vente')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'vente' ? 'bg-white text-[#2D6B2D] shadow-sm' : 'text-[#78726A]'
            }`}
          >
            <ShoppingCart size={14} /> Vente rapide
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'credits' ? 'bg-white text-[#2D6B2D] shadow-sm' : 'text-[#78726A]'
            }`}
          >
            <CreditCard size={14} /> Crédits
            {creditsBadge > 0 && (
              <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {creditsBadge}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB CRÉDITS ───────────────────────────────────────────────── */}
        {activeTab === 'credits' && <CreditTab />}

        {/* ── TAB VENTE RAPIDE ──────────────────────────────────────────── */}
        {activeTab === 'vente' && (
          <>
            <Card>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={17} className="text-[#4A4540]" />
                  <h2 className="text-base font-bold text-[#1A1210]">Vente rapide</h2>
                  {cart.length > 0 && (
                    <Badge variant="info">{nbArticles} article{nbArticles > 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {session?.employeNom && <Badge variant="warning">{session.employeNom}</Badge>}
                  <button
                    onClick={() => setProformaMode(p => !p)}
                    className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                      proformaMode
                        ? 'bg-[#1C2B6E] text-white border-[#1C2B6E]'
                        : 'border-[#D4CAB8] text-[#78726A] hover:border-[#1C2B6E]'
                    }`}
                  >
                    <FileText size={12} /> Proforma
                  </button>
                </div>
              </div>

              {/* Sélecteur produit */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#78726A] font-medium mb-1 block">Produit</label>
                  <ProductSearch
                    key={searchKey}
                    produits={produits}
                    onSelect={p => p ? handleSelectProduit(p.id) : (setSelectedId(''), setPrixUnit(0))}
                    placeholder="Taper pour chercher un produit..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#78726A] font-medium mb-1 block">Qté</label>
                    <input type="number" min={1} value={qte}
                      onChange={e => setQte(parseInt(e.target.value) || 1)}
                      className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#78726A] font-medium mb-1 block">Prix unit. (HTG)</label>
                    <input type="number" min={0} value={prixUnit}
                      onChange={e => setPrixUnit(parseFloat(e.target.value) || 0)}
                      className="w-full border border-[#D4CAB8] rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAjouter}
                  disabled={!selectedId}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-[#3DAA35] text-[#3DAA35] rounded-lg py-2.5 text-sm font-semibold hover:bg-[#EEF7EE] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={16} /> Ajouter au panier
                </button>
              </div>

              {/* Panier */}
              {cart.length > 0 && (
                <div className="mt-4 border border-[#D4CAB8] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] text-xs text-[#78726A] font-semibold">
                        <th className="text-left px-3 py-2">Article</th>
                        <th className="text-center px-2 py-2">Qté</th>
                        <th className="text-right px-2 py-2">Prix</th>
                        <th className="text-right px-2 py-2">Total</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cart.map(item => (
                        <tr key={item.produit.id} className="bg-white">
                          <td className="px-3 py-2.5 text-[#2C2420] font-medium max-w-[100px]">
                            <span className="block truncate">{item.produit.nom}</span>
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <input
                              type="number"
                              min="1"
                              max={item.produit.quantite}
                              value={item.quantite}
                              onChange={e => {
                                const v = parseInt(e.target.value)
                                if (!isNaN(v)) updateQtyInCart(item.produit.id, v)
                              }}
                              onFocus={e => e.target.select()}
                              className="w-14 text-center border border-[#D4CAB8] rounded-lg py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#3DAA35]"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-right text-[#78726A] whitespace-nowrap">
                            {item.prix_unitaire.toLocaleString()} G
                          </td>
                          <td className="px-2 py-2.5 text-right font-semibold text-[#2C2420] whitespace-nowrap">
                            {(item.quantite * item.prix_unitaire).toLocaleString()} G
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button onClick={() => removeFromCart(item.produit.id)} className="text-red-400 hover:text-red-600">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FAF7F2] border-t border-[#D4CAB8]">
                        <td colSpan={3} className="px-3 py-2.5 text-sm font-bold text-[#2C2420]">SOUS-TOTAL</td>
                        <td className="px-2 py-2.5 text-right font-bold text-base text-[#F59E0B] whitespace-nowrap">
                          {sousTotal.toLocaleString()} G
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ── PAIEMENT + CLIENT ─────────────────────────────── */}
              {cart.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#D4CAB8] space-y-4">
                  {!proformaMode ? (
                    <>
                      {/* ── Infos client ── */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#78726A] block">
                          Client {estCredit && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          placeholder={estCredit ? 'Nom du client (requis)' : 'Client de passage'}
                          value={nomClient}
                          onChange={e => setNomClient(e.target.value)}
                          className={`w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 ${
                            estCredit && !nomClient.trim()
                              ? 'border-amber-300 bg-amber-50 focus:ring-amber-400'
                              : 'border-[#D4CAB8] focus:ring-[#3DAA35]'
                          }`}
                        />
                        <input
                          type="tel"
                          placeholder="Téléphone (optionnel)"
                          value={telephoneClient}
                          onChange={e => setTelephoneClient(e.target.value)}
                          className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                        />
                      </div>

                      {/* Paiement : Total / Partiel */}
                      <div>
                        <label className="text-xs font-semibold text-[#78726A] mb-2 block">Paiement</label>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="paiement" checked={!paiementPartiel}
                              onChange={() => { setPaiementPartiel(false); setMontantPayeInput('') }}
                              className="w-5 h-5 accent-[#3DAA35]"
                            />
                            <span className="text-sm font-medium text-[#2C2420]">Total</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="paiement" checked={paiementPartiel}
                              onChange={() => setPaiementPartiel(true)}
                              className="w-5 h-5 accent-[#3DAA35]"
                            />
                            <span className="text-sm font-medium text-[#2C2420]">Partiel</span>
                          </label>
                        </div>
                        {paiementPartiel && (
                          <input
                            type="number" min="0"
                            placeholder="Montant payé (G)"
                            value={montantPayeInput}
                            onChange={e => setMontantPayeInput(e.target.value)}
                            className="mt-2 w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                          />
                        )}
                      </div>

                      {/* Mode paiement */}
                      <div>
                        <label className="text-xs font-semibold text-[#78726A] mb-1.5 block">Mode</label>
                        <select
                          value={modePaiement}
                          onChange={e => setModePaiement(e.target.value)}
                          className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white"
                        >
                          <option value="especes">Espèces</option>
                          <option value="moncash">MonCash</option>
                          <option value="cheque">Chèque</option>
                          <option value="virement">Virement</option>
                        </select>
                      </div>

                      {/* Barre récap */}
                      <div className="bg-[#FAF7F2] rounded-xl px-4 py-3 border border-[#E8E0D0]">
                        {/* Reste dû — valeur principale */}
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#78726A]">Reste dû</p>
                          <p className={`text-2xl font-black ${resteAPayer > 0 ? 'text-amber-600' : 'text-[#3DAA35]'}`}>
                            {formatHTG(resteAPayer)}
                          </p>
                        </div>
                        {/* Total + Payé — secondaires */}
                        <div className="flex items-center justify-between text-xs text-[#A09589] border-t border-[#E8E0D0] pt-2">
                          <span>Total : <span className="font-semibold text-[#4A4540]">{formatHTG(total)}</span></span>
                          <span>Payé : <span className="font-semibold text-[#3DAA35]">{formatHTG(montantPayeCalc)}</span></span>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs font-semibold text-[#78726A] mb-1.5 block">Notes (optionnel)</label>
                        <textarea
                          placeholder="Observations, remarques..."
                          value={notesVente}
                          onChange={e => setNotesVente(e.target.value)}
                          rows={2}
                          className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] resize-none"
                        />
                      </div>

                      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

                      <Button onClick={handleSave} loading={saving} className="w-full py-4 text-base font-bold rounded-xl">
                        Vendre ({nbArticles} article{nbArticles > 1 ? 's' : ''})
                      </Button>
                    </>
                  ) : (
                    /* Mode Proforma */
                    <>
                      <p className="text-xs text-[#A09589] bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                        PDF généré à partir du panier. Aucune vente enregistrée.
                      </p>
                      <div>
                        <label className="text-xs font-semibold text-[#78726A] mb-1.5 block">Client *</label>
                        <input
                          type="text" placeholder="Nom du client"
                          value={nomClient} onChange={e => setNomClient(e.target.value)}
                          className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1C2B6E]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#78726A] mb-1.5 block">Contact (optionnel)</label>
                        <input
                          type="text" placeholder="Tél, email..."
                          value={proformaContact} onChange={e => setProformaContact(e.target.value)}
                          className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1C2B6E]"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-[#78726A] whitespace-nowrap">Valide</label>
                        <input
                          type="number" min="1" value={proformaValidite}
                          onChange={e => setProformaValidite(e.target.value)}
                          className="w-24 border border-[#D4CAB8] rounded-xl px-3 py-3 text-base text-center focus:outline-none focus:ring-2 focus:ring-[#1C2B6E]"
                        />
                        <label className="text-xs text-[#78726A]">jours</label>
                      </div>
                      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                      <Button onClick={handleSave} loading={saving} className="w-full py-4 text-base font-bold rounded-xl">
                        <span className="flex items-center justify-center gap-2"><FileText size={16} /> Générer PDF Proforma</span>
                      </Button>
                    </>
                  )}
                </div>
              )}

              {cart.length === 0 && error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">{error}</p>
              )}
            </Card>

            {/* ── HISTORIQUE ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-[#F59E0B] rounded-full" />
                <h3 className="text-base font-bold text-[#1A1210]">Reçus</h3>
              </div>

              {/* Recherche + date */}
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09589]" />
                  <input
                    type="text"
                    placeholder="Client, réf..."
                    value={searchHisto}
                    onChange={e => setSearchHisto(e.target.value)}
                    className="w-full border border-[#D4CAB8] rounded-xl pl-9 pr-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={dateHisto}
                    onChange={e => setDateHisto(e.target.value)}
                    className="border border-[#D4CAB8] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white pr-8"
                  />
                  {dateHisto && (
                    <button
                      onClick={() => setDateHisto('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A09589] hover:text-[#2C2420]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    const d = new Date()
                    const y = d.getFullYear()
                    const m = String(d.getMonth() + 1).padStart(2, '0')
                    const j = String(d.getDate()).padStart(2, '0')
                    setDateHisto(`${y}-${m}-${j}`)
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    dateHisto === (() => {
                      const d = new Date()
                      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                    })()
                      ? 'bg-[#3DAA35] text-white border-[#3DAA35]'
                      : 'border-[#D4CAB8] text-[#78726A] bg-white'
                  }`}
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => setDateHisto('')}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    !dateHisto ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'border-[#D4CAB8] text-[#78726A] bg-white'
                  }`}
                >
                  Récentes
                </button>
              </div>

              {(() => {
                const q = searchHisto.trim().toLowerCase()
                const filtres = q
                  ? historique.filter(v =>
                      (v.nom_client || '').toLowerCase().includes(q) ||
                      shortRef(v.id).toLowerCase().includes(q) ||
                      (v.telephone_client || '').includes(q)
                    )
                  : historique
                return filtres.length === 0 ? (
                <Card>
                  <p className="text-sm text-[#A09589] text-center py-4">
                    {q ? 'Aucun reçu correspondant' : dateHisto ? 'Aucune vente ce jour' : 'Aucune vente enregistrée'}
                  </p>
                </Card>
              ) : (
                <>
                  <p className="text-[11px] text-[#A09589] mb-2">{filtres.length} vente{filtres.length > 1 ? 's' : ''}</p>
                  <div className="space-y-2">
                  {filtres.map(v => (
                    <Card key={v.id} className="p-0 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-[#2C2420]">{formatHTG(v.total)}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUT_BADGE[v.statut || 'completee'].color}`}>
                              {STATUT_BADGE[v.statut || 'completee'].label}
                            </span>
                            {v.nom_client && (
                              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                {v.nom_client}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#A09589]">
                            <span>{formatTime(v.created_at)}</span>
                            {(v.employe as { nom: string } | undefined)?.nom && (
                              <span className="font-medium text-[#78726A]">• {(v.employe as { nom: string }).nom}</span>
                            )}
                            <span className="text-[#D4CAB8]">{shortRef(v.id)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setReceiptVenteId(v.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#A09589] hover:text-[#3DAA35] hover:bg-[#EEF7EE] transition-colors"
                          >
                            <Receipt size={16} />
                          </button>
                          <button
                            onClick={() => toggleExpand(v.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#A09589] hover:bg-[#FAF7F2] transition-colors text-xs font-bold"
                          >
                            {v.expanded ? '▲' : '▼'}
                          </button>
                          {v.statut === 'completee' && session?.role === 'admin' && (
                            <button
                              onClick={() => changerStatut(v.id, 'annulee')}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {v.expanded && (
                        <div className="border-t border-slate-50 px-4 pb-3 pt-2 space-y-1.5">
                          {v.lignes ? v.lignes.map((l, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-[#78726A]">
                                {(l.produit as Produit | undefined)?.nom || 'Produit'} × {l.quantite}
                              </span>
                              <span className="text-[#4A4540] font-medium">{formatHTG(l.sous_total)}</span>
                            </div>
                          )) : (
                            <div className="flex justify-center py-2"><Spinner size="sm" /></div>
                          )}
                          {v.statut === 'completee' && session?.role === 'admin' && (
                            <button
                              onClick={() => changerStatut(v.id, 'retour')}
                              className="flex items-center gap-1 text-xs text-[#F59E0B] font-semibold hover:underline pt-1"
                            >
                              <RotateCcw size={12} /> Marquer comme retour
                            </button>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                  </div>
                </>
              )
              })()}
            </div>
          </>
        )}
      </div>
    </>
  )
}
