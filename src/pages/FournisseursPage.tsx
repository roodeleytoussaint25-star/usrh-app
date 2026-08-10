import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { formatHTG } from '../lib/utils'
import { Plus, Truck, Phone, Mail, User, Building2, Trash2, DollarSign, CheckCircle, ShoppingBag, X } from 'lucide-react'
import { ProductSearch } from '../components/ProductSearch'
import type { Fournisseur, Produit, DepenseCategorie } from '../types'

interface AchatRow {
  id: string
  montant_total: number
  montant_paye: number
  statut_paiement: 'paye' | 'credit'
  notes: string | null
  date_achat: string
  created_at: string
  mla_fournisseurs: { nom: string } | null
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getDate())} ${['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'][d.getMonth()]} ${d.getFullYear()}`
}

type FormTab = 'achat' | 'depense'

const CATEGORIES_DEP: { value: DepenseCategorie; label: string }[] = [
  { value: 'loyer', label: 'Loyer' },
  { value: 'salaires', label: 'Salaires' },
  { value: 'transport', label: 'Transport' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'eau', label: 'Eau' },
  { value: 'stockage', label: 'Stockage' },
  { value: 'autres', label: 'Autres' },
]

export function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [achats, setAchats] = useState<AchatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [formTab, setFormTab] = useState<FormTab>('achat')
  const [toast, setToast] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [versementId, setVersementId] = useState<string | null>(null)
  const [versementInput, setVersementInput] = useState('')
  const [savingVersement, setSavingVersement] = useState(false)

  // Panier achat
  interface AchatCartItem { produitId: string; nom: string; quantite: number; prix: number }
  const [achatCart, setAchatCart] = useState<AchatCartItem[]>([])
  const [cartSearchKey, setCartSearchKey] = useState(0)

  // Formulaire achat rapide
  const [fournisseurId, setFournisseurId] = useState('')
  const [produitId, setProduitId] = useState('')
  const [quantite, setQuantite] = useState('')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [statutPaiement, setStatutPaiement] = useState<'paye' | 'credit'>('paye')
  const [acompteInput, setAcompteInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Formulaire dépense générale
  const [depCategorie, setDepCategorie] = useState<DepenseCategorie>('autres')
  const [depDescription, setDepDescription] = useState('')
  const [depMontant, setDepMontant] = useState('')
  const [savingDep, setSavingDep] = useState(false)
  const [errorDep, setErrorDep] = useState('')

  // Modal fournisseur
  const [modalOpen, setModalOpen] = useState(false)
  const [editF, setEditF] = useState<Fournisseur | null>(null)
  const [formNom, setFormNom] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formTel, setFormTel] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [savingF, setSavingF] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: f }, { data: p }, { data: a }] = await Promise.all([
      supabase.from('mla_fournisseurs').select('*').eq('actif', true).order('nom'),
      supabase.from('mla_produits').select('*').eq('actif', true).order('nom'),
      supabase.from('mla_achats')
        .select('id, montant_total, statut_paiement, notes, date_achat, created_at, mla_fournisseurs(nom)')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    setFournisseurs(f || [])
    setProduits(p || [])
    setAchats((a || []) as unknown as AchatRow[])
    setLoading(false)
  }

  const handleProduitChange = (id: string) => {
    setProduitId(id)
    const prod = produits.find(p => p.id === id)
    if (prod?.prix_achat) setPrixUnitaire(String(prod.prix_achat))
    else setPrixUnitaire('')
  }

  const handleAjouterAuPanier = () => {
    if (!produitId) { setError('Choisissez un produit'); return }
    const qte = parseFloat(quantite)
    const prix = parseFloat(prixUnitaire)
    if (!qte || qte <= 0) { setError('Quantité invalide'); return }
    if (!prix || prix < 0) { setError('Prix invalide'); return }
    const prod = produits.find(p => p.id === produitId)
    if (!prod) return
    setAchatCart(prev => {
      const existing = prev.find(i => i.produitId === produitId)
      if (existing) return prev.map(i => i.produitId === produitId ? { ...i, quantite: i.quantite + qte, prix } : i)
      return [...prev, { produitId, nom: prod.nom, quantite: qte, prix }]
    })
    setProduitId(''); setQuantite(''); setPrixUnitaire(''); setError('')
    setCartSearchKey(k => k + 1)
  }

  const handleSaveAchat = async () => {
    if (!fournisseurId) { setError('Choisissez un fournisseur'); return }
    if (achatCart.length === 0) { setError('Ajoutez au moins un produit au panier'); return }

    setSaving(true); setError('')
    const totalAchat = achatCart.reduce((a, i) => a + i.quantite * i.prix, 0)
    const acompte = statutPaiement === 'credit' ? Math.min(parseFloat(acompteInput) || 0, totalAchat) : totalAchat
    const statutFinal = acompte >= totalAchat ? 'paye' : statutPaiement

    try {
      const { data: achatData, error: err } = await supabase
        .from('mla_achats')
        .insert({
          fournisseur_id: fournisseurId,
          montant_total: totalAchat,
          montant_paye: acompte,
          statut_paiement: statutFinal,
          date_achat: new Date().toISOString().split('T')[0],
          notes: achatCart.map(i => i.nom).join(', '),
        })
        .select().single()

      if (err || !achatData) { setError("Erreur lors de l'enregistrement"); setSaving(false); return }

      await supabase.from('mla_achats_lignes').insert(
        achatCart.map(i => ({
          achat_id: achatData.id,
          produit_id: i.produitId,
          quantite: i.quantite,
          prix_achat: i.prix,
          sous_total: i.quantite * i.prix,
        }))
      )

      for (const item of achatCart) {
        const prod = produits.find(p => p.id === item.produitId)
        if (prod) {
          await supabase.from('mla_produits')
            .update({ quantite: prod.quantite + item.quantite, prix_achat: item.prix })
            .eq('id', item.produitId)
        }
      }

      setAchatCart([])
      setCartSearchKey(k => k + 1)
      setAcompteInput('')
      await loadData()
      showToast(`Achat enregistré — ${achatCart.length} produit${achatCart.length > 1 ? 's' : ''}`)
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDepense = async () => {
    const montant = parseFloat(depMontant)
    if (!montant || montant <= 0) { setErrorDep('Montant invalide'); return }
    setSavingDep(true); setErrorDep('')
    const { error: err } = await supabase.from('mla_depenses').insert({
      categorie: depCategorie,
      description: depDescription.trim() || null,
      montant,
      date_depense: new Date().toISOString().split('T')[0],
    })
    setSavingDep(false)
    if (err) { setErrorDep('Erreur lors de l\'enregistrement'); return }
    setDepDescription(''); setDepMontant('')
    showToast('Dépense enregistrée')
  }

  const handleVersement = async (achat: AchatRow) => {
    const montant = parseFloat(versementInput)
    if (!montant || montant <= 0) return
    setSavingVersement(true)
    const nouveauPaye = Math.min(achat.montant_paye + montant, achat.montant_total)
    const statut = nouveauPaye >= achat.montant_total ? 'paye' : 'credit'
    await supabase.from('mla_achats').update({ montant_paye: nouveauPaye, statut_paiement: statut }).eq('id', achat.id)
    setSavingVersement(false)
    setVersementId(null)
    setVersementInput('')
    await loadData()
    showToast(statut === 'paye' ? 'Achat soldé ✓' : 'Versement enregistré')
  }

  const handleMarkPaid = async (achatId: string) => {
    setMarkingPaid(achatId)
    const achat = achats.find(a => a.id === achatId)
    await supabase.from('mla_achats').update({
      statut_paiement: 'paye',
      montant_paye: achat?.montant_total ?? 0,
    }).eq('id', achatId)
    setMarkingPaid(null)
    await loadData()
    showToast('Marqué comme payé')
  }

  const handleDeleteAchat = async (id: string) => {
    await supabase.from('mla_achats').delete().eq('id', id)
    setAchats(prev => prev.filter(a => a.id !== id))
  }

  const openNew = () => {
    setEditF(null); setFormNom(''); setFormContact(''); setFormTel(''); setFormEmail('')
    setModalOpen(true)
  }

  const handleSaveFournisseur = async () => {
    if (!formNom.trim()) return
    setSavingF(true)
    const payload = { nom: formNom.trim(), contact: formContact || null, telephone: formTel || null, email: formEmail || null, actif: true }
    if (editF) {
      await supabase.from('mla_fournisseurs').update(payload).eq('id', editF.id)
    } else {
      await supabase.from('mla_fournisseurs').insert(payload)
    }
    setSavingF(false); setModalOpen(false)
    await loadData()
    showToast(editF ? 'Fournisseur modifié' : 'Fournisseur ajouté')
  }

  const visibleAchats = showAll ? achats : achats.slice(0, 5)

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
        <h2 className="text-2xl font-black tracking-tight text-[#1A1210]">Fournisseurs</h2>
        <div className="w-10 h-0.5 bg-[#8B6400] rounded-full mt-1 mb-0.5" />
        <p className="text-[11px] text-[#A09589]">Achats et dépenses</p>
      </div>

      {/* Bouton + Fournisseur */}
      <button
        onClick={openNew}
        className="w-full flex items-center justify-center gap-2 bg-[#2D6B2D] hover:bg-[#1E4E1E] text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-sm"
      >
        <Plus size={17} />
        Nouveau fournisseur
      </button>

      {/* ── FORMULAIRE ACHAT / DÉPENSE ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#D4CAB8] shadow-sm overflow-hidden">
        {/* Tabs achat / dépense */}
        <div className="flex border-b border-[#D4CAB8]">
          <button
            onClick={() => setFormTab('achat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
              formTab === 'achat' ? 'text-[#2D6B2D] border-b-2 border-[#2D6B2D]' : 'text-[#A09589]'
            }`}
          >
            <ShoppingBag size={14} /> Achat produit
          </button>
          <button
            onClick={() => setFormTab('depense')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
              formTab === 'depense' ? 'text-[#2D6B2D] border-b-2 border-[#2D6B2D]' : 'text-[#A09589]'
            }`}
          >
            <DollarSign size={14} /> Dépense
          </button>
        </div>

        <div className="p-4 space-y-3">
          {formTab === 'achat' ? (
            <>
              {/* Fournisseur */}
              <select
                value={fournisseurId}
                onChange={e => setFournisseurId(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white text-[#4A4540]"
              >
                <option value="">Choisir un fournisseur...</option>
                {fournisseurs.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>

              {/* Produit */}
              <ProductSearch
                key={cartSearchKey}
                produits={produits}
                onSelect={p => p ? handleProduitChange(p.id) : (setProduitId(''), setPrixUnitaire(''))}
                placeholder="Chercher un produit..."
              />

              {/* Quantité */}
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Quantité"
                value={quantite}
                onChange={e => setQuantite(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] placeholder-[#A09589]"
              />

              {/* Prix unitaire */}
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Prix unitaire (G)"
                value={prixUnitaire}
                onChange={e => setPrixUnitaire(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] placeholder-[#A09589]"
              />

              {/* Bouton ajouter au panier */}
              <button
                onClick={handleAjouterAuPanier}
                disabled={!produitId}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                  produitId
                    ? 'bg-[#3DAA35] text-white shadow-md hover:bg-[#2D8B2D] active:scale-95'
                    : 'border border-dashed border-[#D4CAB8] text-[#A09589] cursor-not-allowed'
                }`}
              >
                <Plus size={16} /> Ajouter au panier
              </button>

              {/* Panier */}
              {achatCart.length > 0 && (
                <div className="border border-[#D4CAB8] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] text-xs text-[#78726A] font-semibold">
                        <th className="text-left px-3 py-2">Produit</th>
                        <th className="text-center px-2 py-2">Qté</th>
                        <th className="text-right px-2 py-2">Total</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {achatCart.map(item => (
                        <tr key={item.produitId} className="bg-white">
                          <td className="px-3 py-2.5 text-[#2C2420] font-medium max-w-[110px]">
                            <span className="block truncate">{item.nom}</span>
                          </td>
                          <td className="px-2 py-2.5 text-center text-[#78726A]">{item.quantite}</td>
                          <td className="px-2 py-2.5 text-right font-semibold text-[#2C2420] whitespace-nowrap">
                            {formatHTG(item.quantite * item.prix)}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => setAchatCart(prev => prev.filter(i => i.produitId !== item.produitId))}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FAF7F2] border-t border-[#D4CAB8]">
                        <td colSpan={2} className="px-3 py-2.5 text-sm font-bold text-[#2C2420]">TOTAL</td>
                        <td className="px-2 py-2.5 text-right font-bold text-[#2D6B2D] whitespace-nowrap">
                          {formatHTG(achatCart.reduce((a, i) => a + i.quantite * i.prix, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Statut paiement — visible seulement si panier non vide */}
              {achatCart.length > 0 && (
                <div className="space-y-2">
                  <select
                    value={statutPaiement}
                    onChange={e => { setStatutPaiement(e.target.value as 'paye' | 'credit'); setAcompteInput('') }}
                    className="w-full border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white text-[#4A4540]"
                  >
                    <option value="paye">Payé comptant</option>
                    <option value="credit">À crédit</option>
                  </select>
                  {statutPaiement === 'credit' && (
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Acompte versé (0 si rien payé)"
                      value={acompteInput}
                      onChange={e => setAcompteInput(e.target.value)}
                      className="w-full border border-amber-300 bg-amber-50 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-400"
                    />
                  )}
                  {statutPaiement === 'credit' && achatCart.length > 0 && (
                    <div className="flex justify-between text-xs px-1">
                      <span className="text-[#78726A]">Reste dû :</span>
                      <span className="font-bold text-amber-600">
                        {(() => {
                          const total = achatCart.reduce((a, i) => a + i.quantite * i.prix, 0)
                          const acompte = Math.min(parseFloat(acompteInput) || 0, total)
                          return (total - acompte).toLocaleString('fr-FR') + ' G'
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              {achatCart.length > 0 && (
                <button
                  onClick={handleSaveAchat}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-[#1C2B6E] hover:bg-[#14204F] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
                >
                  {saving ? <Spinner size="sm" /> : <DollarSign size={16} />}
                  Enregistrer l'achat ({achatCart.length} produit{achatCart.length > 1 ? 's' : ''})
                </button>
              )}
            </>
          ) : (
            <>
              {/* Catégorie */}
              <select
                value={depCategorie}
                onChange={e => setDepCategorie(e.target.value as DepenseCategorie)}
                className="w-full border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white text-[#4A4540]"
              >
                {CATEGORIES_DEP.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              {/* Description */}
              <input
                type="text"
                placeholder="Description (ex: loyer bureau août)"
                value={depDescription}
                onChange={e => setDepDescription(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] placeholder-[#A09589]"
              />

              {/* Montant */}
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Montant (G)"
                value={depMontant}
                onChange={e => setDepMontant(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] placeholder-[#A09589]"
              />

              {errorDep && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorDep}</p>}

              <button
                onClick={handleSaveDepense}
                disabled={savingDep}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
              >
                {savingDep ? <Spinner size="sm" /> : <DollarSign size={16} />}
                Enregistrer la dépense
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── ACHATS RÉCENTS ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#D4CAB8] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#D4CAB8]">
          <div className="flex items-center gap-2">
            <Truck size={15} className="text-[#2D6B2D]" />
            <p className="text-sm font-bold text-[#2C2420]">Achats récents</p>
          </div>
          {achats.length > 5 && (
            <button
              onClick={() => setShowAll(p => !p)}
              className="text-xs text-[#3DAA35] font-semibold"
            >
              {showAll ? 'Réduire' : `Voir tout (${achats.length})`}
            </button>
          )}
        </div>

        {achats.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Truck size={28} className="text-slate-200 mb-2" />
            <p className="text-sm text-[#A09589]">Aucun achat enregistré</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {visibleAchats.map((a, i) => (
              <div key={a.id}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-7 h-7 rounded-full bg-[#EEF7EE] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#3DAA35]">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2C2420] truncate">
                      {a.mla_fournisseurs?.nom || 'Sans fournisseur'}
                      {a.notes ? ` • ${a.notes}` : ''}
                    </p>
                    <p className="text-[11px] text-[#A09589]">{fmtDate(a.date_achat || a.created_at)}</p>
                    {a.statut_paiement === 'credit' && (
                      <div className="flex gap-3 text-[11px] mt-0.5">
                        <span className="text-[#78726A]">Payé : <span className="font-semibold text-[#2D6B2D]">{formatHTG(a.montant_paye)}</span></span>
                        <span className="text-amber-600 font-semibold">Reste : {formatHTG(a.montant_total - a.montant_paye)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-[#4A4540]">{formatHTG(a.montant_total)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      a.statut_paiement === 'paye'
                        ? 'bg-[#EEF7EE] text-[#2D6B2D]'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {a.statut_paiement === 'paye' ? 'Payé' : 'Crédit'}
                    </span>
                    {a.statut_paiement === 'credit' && (
                      <button
                        onClick={() => { setVersementId(versementId === a.id ? null : a.id); setVersementInput('') }}
                        className="text-amber-500 hover:text-amber-700 transition-colors"
                        title="Enregistrer un versement"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAchat(a.id)}
                      className="text-[#D4CAB8] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Formulaire versement inline */}
                {versementId === a.id && (
                  <div className="px-4 pb-3 pt-0 bg-amber-50 border-t border-amber-100 space-y-2">
                    <p className="text-xs font-semibold text-amber-700">Versement au fournisseur</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={a.montant_total - a.montant_paye}
                        placeholder={`Max ${formatHTG(a.montant_total - a.montant_paye)}`}
                        value={versementInput}
                        onChange={e => setVersementInput(e.target.value)}
                        autoFocus
                        className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        onClick={() => { setVersementId(null); setVersementInput('') }}
                        className="px-3 py-2 border border-[#D4CAB8] rounded-lg text-sm text-[#78726A] hover:bg-[#FAF7F2]"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleVersement(a)}
                        disabled={savingVersement || !versementInput}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-1"
                      >
                        {savingVersement ? <Spinner size="sm" /> : <CheckCircle size={14} />}
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LISTE FOURNISSEURS ───────────────────────────────────────────── */}
      {fournisseurs.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#D4CAB8] shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#D4CAB8]">
            <p className="text-sm font-bold text-[#2C2420]">Mes fournisseurs</p>
          </div>
          <div className="divide-y divide-slate-50">
            {fournisseurs.map(f => (
              <div key={f.id} className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-9 h-9 bg-[#EEF7EE] rounded-full flex items-center justify-center shrink-0">
                  <Building2 size={15} className="text-[#3DAA35]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2C2420]">{f.nom}</p>
                  <div className="mt-0.5 space-y-0.5">
                    {f.contact && (
                      <div className="flex items-center gap-1.5">
                        <User size={10} className="text-[#A09589]" />
                        <span className="text-[11px] text-[#78726A]">{f.contact}</span>
                      </div>
                    )}
                    {f.telephone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={10} className="text-[#A09589]" />
                        <span className="text-[11px] text-[#78726A]">{f.telephone}</span>
                      </div>
                    )}
                    {f.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={10} className="text-[#A09589]" />
                        <span className="text-[11px] text-[#78726A]">{f.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditF(f); setFormNom(f.nom); setFormContact(f.contact || '')
                    setFormTel(f.telephone || ''); setFormEmail(f.email || '')
                    setModalOpen(true)
                  }}
                  className="text-xs text-[#A09589] hover:text-[#4A4540] border border-[#D4CAB8] rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
                >
                  Modifier
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Fournisseur */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editF ? 'Modifier fournisseur' : 'Nouveau fournisseur'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
            <input type="text" value={formNom} onChange={e => setFormNom(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="Nom du fournisseur" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact</label>
            <input type="text" value={formContact} onChange={e => setFormContact(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="Nom du contact" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
            <input type="tel" value={formTel} onChange={e => setFormTel(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="+509 ..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="email@exemple.com" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" fullWidth loading={savingF} onClick={handleSaveFournisseur}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
