import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { formatHTG } from '../lib/utils'
import { Plus, Truck, Phone, Mail, User, Building2, Trash2, DollarSign } from 'lucide-react'
import { ProductSearch } from '../components/ProductSearch'
import type { Fournisseur, Produit } from '../types'

interface AchatRow {
  id: string
  montant_total: number
  statut_paiement: 'paye' | 'credit'
  notes: string | null
  date_achat: string
  created_at: string
  mla_fournisseurs: { nom: string } | null
  lignes_count?: number
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getDate())} ${['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'][d.getMonth()]} ${d.getFullYear()}`
}

export function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [achats, setAchats] = useState<AchatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  // Formulaire achat rapide
  const [fournisseurId, setFournisseurId] = useState('')
  const [produitId, setProduitId] = useState('')
  const [quantite, setQuantite] = useState('')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [statutPaiement, setStatutPaiement] = useState<'paye' | 'credit'>('paye')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Modal fournisseur
  const [modalOpen, setModalOpen] = useState(false)
  const [editF, setEditF] = useState<Fournisseur | null>(null)
  const [formNom, setFormNom] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formTel, setFormTel] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [savingF, setSavingF] = useState(false)

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

  const handleSave = async () => {
    if (!fournisseurId) { setError('Choisissez un fournisseur'); return }
    if (!produitId) { setError('Choisissez un produit'); return }
    const qte = parseFloat(quantite)
    const prix = parseFloat(prixUnitaire)
    if (!qte || qte <= 0) { setError('Quantité invalide'); return }
    if (!prix || prix < 0) { setError('Prix invalide'); return }

    setSaving(true); setError('')
    const total = qte * prix
    const prod = produits.find(p => p.id === produitId)

    try {
      const { data: achatData, error: err } = await supabase
        .from('mla_achats')
        .insert({
          fournisseur_id: fournisseurId,
          montant_total: total,
          statut_paiement: statutPaiement,
          date_achat: new Date().toISOString().split('T')[0],
          notes: prod?.nom || null,
        })
        .select().single()

      if (err || !achatData) { setError("Erreur lors de l'enregistrement"); setSaving(false); return }

      await supabase.from('mla_achats_lignes').insert({
        achat_id: achatData.id,
        produit_id: produitId,
        quantite: qte,
        prix_achat: prix,
        sous_total: total,
      })

      if (prod) {
        await supabase.from('mla_produits')
          .update({ quantite: prod.quantite + qte, prix_achat: prix })
          .eq('id', produitId)
      }

      setFournisseurId(''); setProduitId(''); setQuantite(''); setPrixUnitaire(''); setStatutPaiement('paye')
      await loadData()
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
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
  }

  const visibleAchats = showAll ? achats : achats.slice(0, 5)

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-4 space-y-4 pb-24">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#1A1210]">Fournisseurs</h2>
        <div className="w-10 h-0.5 bg-[#8B6400] rounded-full mt-1 mb-0.5" />
        <p className="text-[11px] text-[#A09589]">Gérez vos fournisseurs et achats</p>
      </div>

      {/* Bouton + Fournisseur */}
      <button
        onClick={openNew}
        className="w-full flex items-center justify-center gap-2 bg-[#2D6B2D] hover:bg-[#1E4E1E] text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-sm"
      >
        <Plus size={17} />
        Fournisseur
      </button>

      {/* ── ACHAT RAPIDE ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#D4CAB8] shadow-sm p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 bg-[#EEF7EE] rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={16} className="text-[#3DAA35]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1A1210]">Achat rapide</p>
            <p className="text-[11px] text-[#A09589]">Enregistrez un achat fournisseur</p>
          </div>
        </div>

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

        {/* Produit + Quantité */}
        <div className="grid grid-cols-2 gap-2.5">
          <ProductSearch
            produits={produits}
            onSelect={p => p ? handleProduitChange(p.id) : (setProduitId(''), setPrixUnitaire(''))}
            placeholder="Chercher produit..."
          />
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Quantité"
            value={quantite}
            onChange={e => setQuantite(e.target.value)}
            className="border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] placeholder-[#A09589]"
          />
        </div>

        {/* Prix + À payer */}
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Prix unitaire G"
            value={prixUnitaire}
            onChange={e => setPrixUnitaire(e.target.value)}
            className="border border-[#D4CAB8] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] placeholder-[#A09589]"
          />
          <select
            value={statutPaiement}
            onChange={e => setStatutPaiement(e.target.value as 'paye' | 'credit')}
            className="border border-[#D4CAB8] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white text-[#4A4540]"
          >
            <option value="paye">Payé</option>
            <option value="credit">À crédit</option>
          </select>
        </div>

        {/* Total preview */}
        {quantite && prixUnitaire && parseFloat(quantite) > 0 && parseFloat(prixUnitaire) > 0 && (
          <div className="flex justify-between items-center bg-[#EEF7EE] rounded-xl px-4 py-2.5">
            <span className="text-sm text-[#78726A]">Total</span>
            <span className="text-base font-black text-[#2D6B2D]">
              {formatHTG(parseFloat(quantite) * parseFloat(prixUnitaire))}
            </span>
          </div>
        )}

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-[#3DAA35] hover:bg-[#2D8B2D] disabled:opacity-50 text-[#2D6B2D] font-bold py-3.5 rounded-xl text-sm transition-colors"
        >
          {saving ? <Spinner size="sm" /> : <DollarSign size={16} />}
          Enregistrer l'achat
        </button>
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
              className="text-xs text-[#3DAA35] font-semibold flex items-center gap-1"
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
              <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-7 h-7 rounded-full bg-[#EEF7EE] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#3DAA35]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2C2420]">
                    Achat {a.mla_fournisseurs?.nom || '—'}
                    {a.notes ? ` • ${a.notes}` : ''}
                  </p>
                  <p className="text-[11px] text-[#A09589]">{fmtDate(a.date_achat || a.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-[#4A4540]">{formatHTG(a.montant_total)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    a.statut_paiement === 'paye'
                      ? 'bg-[#3DAA35] text-[#2D6B2D]'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {a.statut_paiement === 'paye' ? 'Payé' : 'Crédit'}
                  </span>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-[#D4CAB8] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
                  className="text-xs text-[#A09589] hover:text-[#4A4540] border border-[#D4CAB8] rounded-lg px-2.5 py-1.5 transition-colors"
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
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="Nom du fournisseur" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact</label>
            <input type="text" value={formContact} onChange={e => setFormContact(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="Nom du contact" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
            <input type="tel" value={formTel} onChange={e => setFormTel(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="+509 ..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
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
