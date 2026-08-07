import { useState, useEffect } from 'react'
import { X, Plus, Trash2, FileText, Download, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { genererProformaPDF } from '../lib/pdf'
import { Spinner } from './ui/Spinner'
import type { Produit } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

interface LigneProforma {
  id: string
  description: string
  quantite: number
  prix_unitaire: number
  produit_id?: string
}

const uid = () => Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36)

function genNumero() {
  const d = new Date()
  return `PRO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
}
function todayFR() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
const fmtG = (n: number) => n.toLocaleString('fr-FR') + ' HTG'

export function ProformaModal({ open, onClose }: Props) {
  const [produits, setProduits] = useState<Produit[]>([])
  const [clientNom, setClientNom] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [validite, setValidite] = useState('30')
  const [lignes, setLignes] = useState<LigneProforma[]>([
    { id: uid(), description: '', quantite: 1, prix_unitaire: 0 },
  ])
  const [generating, setGenerating] = useState(false)
  const [selectedProduitId, setSelectedProduitId] = useState('')

  useEffect(() => {
    if (open) {
      supabase.from('mla_produits').select('*').eq('actif', true).order('nom')
        .then(({ data }) => setProduits(data || []))
    }
  }, [open])

  if (!open) return null

  const addFromCatalog = () => {
    if (!selectedProduitId) return
    const prod = produits.find(p => p.id === selectedProduitId)
    if (!prod) return
    setLignes(prev => [...prev, {
      id: uid(),
      description: prod.nom,
      quantite: 1,
      prix_unitaire: prod.prix,
      produit_id: prod.id,
    }])
    setSelectedProduitId('')
  }

  const addLigneLibre = () =>
    setLignes(prev => [...prev, { id: uid(), description: '', quantite: 1, prix_unitaire: 0 }])

  const removeLigne = (id: string) =>
    setLignes(prev => prev.filter(l => l.id !== id))

  const updateLigne = (id: string, field: keyof LigneProforma, val: string | number) =>
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l))

  const lignesValides = lignes.filter(l => l.description.trim())
  const total = lignesValides.reduce((a, l) => a + l.quantite * l.prix_unitaire, 0)
  const numero = genNumero()

  const handleGenerate = () => {
    if (!clientNom.trim() || lignesValides.length === 0) return
    setGenerating(true)
    try {
      genererProformaPDF({
        numero,
        date: todayFR(),
        client_nom: clientNom.trim(),
        client_contact: clientContact || undefined,
        lignes: lignesValides.map(l => ({
          description: l.description,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire,
        })),
        validite_jours: parseInt(validite) || 30,
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden mx-3">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ background: 'linear-gradient(135deg, #2D6B2D 0%, #3DAA35 100%)' }}>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-white" />
            <p className="text-white font-bold text-lg">Créer une proforma</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Corps — 2 colonnes */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

          {/* ── FORMULAIRE ────────────────────────────────────────────── */}
          <div className="lg:w-1/2 overflow-y-auto px-5 py-4 space-y-4 border-r border-[#D4CAB8]">

            {/* Client */}
            <div>
              <p className="text-xs font-bold text-[#78726A] uppercase tracking-wide mb-2">Destinataire</p>
              <div className="space-y-2">
                <input type="text" placeholder="Nom du client / organisation *"
                  value={clientNom} onChange={e => setClientNom(e.target.value)}
                  className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                />
                <input type="text" placeholder="Contact / téléphone (optionnel)"
                  value={clientContact} onChange={e => setClientContact(e.target.value)}
                  className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#78726A] shrink-0">Valable</label>
                  <input type="number" min="1" value={validite}
                    onChange={e => setValidite(e.target.value)}
                    className="w-16 border border-[#D4CAB8] rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                  />
                  <label className="text-xs text-[#78726A]">jours</label>
                </div>
              </div>
            </div>

            {/* Sélecteur depuis le catalogue */}
            <div>
              <p className="text-xs font-bold text-[#78726A] uppercase tracking-wide mb-2 flex items-center gap-1">
                <Package size={12} /> Ajouter depuis le stock
              </p>
              <div className="flex gap-2">
                <select value={selectedProduitId}
                  onChange={e => setSelectedProduitId(e.target.value)}
                  className="flex-1 border border-[#D4CAB8] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white">
                  <option value="">Choisir un produit...</option>
                  {produits.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nom} — {fmtG(p.prix)}
                    </option>
                  ))}
                </select>
                <button onClick={addFromCatalog} disabled={!selectedProduitId}
                  className="px-3 bg-[#3DAA35] text-[#2D6B2D] rounded-lg font-bold text-sm hover:bg-[#2D8B2D] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Lignes */}
            <div>
              <p className="text-xs font-bold text-[#78726A] uppercase tracking-wide mb-2">Articles</p>
              <div className="space-y-2">
                {lignes.map(l => (
                  <div key={l.id} className="border border-[#D4CAB8] rounded-xl p-3 space-y-2 bg-[#FAF7F2]">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Description"
                        value={l.description}
                        onChange={e => updateLigne(l.id, 'description', e.target.value)}
                        className="flex-1 border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white"
                      />
                      <button onClick={() => removeLigne(l.id)}
                        className="text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="text-[10px] text-[#A09589]">Qté</label>
                        <input type="number" min="1" value={l.quantite}
                          onChange={e => updateLigne(l.id, 'quantite', parseInt(e.target.value) || 1)}
                          className="w-full border border-[#D4CAB8] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#A09589]">Prix unit. (HTG)</label>
                        <input type="number" min="0" value={l.prix_unitaire}
                          onChange={e => updateLigne(l.id, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                          className="w-full border border-[#D4CAB8] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white"
                        />
                      </div>
                      <div className="text-right">
                        <label className="text-[10px] text-[#A09589]">Sous-total</label>
                        <p className="text-sm font-bold text-[#3DAA35]">{fmtG(l.quantite * l.prix_unitaire)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addLigneLibre}
                className="mt-2 w-full flex items-center justify-center gap-2 border border-dashed border-[#D4CAB8] text-[#A09589] rounded-xl py-2 text-sm hover:border-[#3DAA35] hover:text-[#3DAA35] transition-colors">
                <Plus size={14} /> Ajouter ligne libre
              </button>
            </div>
          </div>

          {/* ── APERÇU ────────────────────────────────────────────────── */}
          <div className="lg:w-1/2 overflow-y-auto bg-[#FAF7F2] px-4 py-4">
            <p className="text-xs font-bold text-[#78726A] uppercase tracking-wide mb-3">Aperçu du document</p>

            {/* Document preview */}
            <div className="bg-white rounded-xl shadow-sm border border-[#D4CAB8] overflow-hidden text-[11px]">
              {/* Header MLA */}
              <div className="px-4 py-3 flex items-start justify-between"
                style={{ background: 'linear-gradient(135deg, #2D6B2D 0%, #3DAA35 100%)' }}>
                <div>
                  <p className="text-white font-black text-sm">MANNO LAVI AGRIKOL</p>
                  <p className="text-white/70 text-[10px]">Intrants Agricoles • Hinche & Saint-Raphaël</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-[10px] bg-white/20 px-2 py-1 rounded-lg">PROFORMA</p>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Infos */}
                <div className="flex justify-between">
                  <div>
                    <p className="text-[#A09589] text-[9px] uppercase font-bold">Réf</p>
                    <p className="font-mono font-bold text-[#4A4540]">{numero}</p>
                    <p className="text-[#A09589] mt-0.5">Date : {todayFR()}</p>
                    <p className="text-[#A09589]">Valable : {validite || 30} jours</p>
                  </div>
                  <div className="text-right bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <p className="text-[#A09589] text-[9px] uppercase font-bold">Destinataire</p>
                    <p className="font-bold text-[#2C2420]">{clientNom || '—'}</p>
                    {clientContact && <p className="text-[#78726A]">{clientContact}</p>}
                  </div>
                </div>

                {/* Tableau articles */}
                <div className="border border-[#D4CAB8] rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 bg-[#2D6B2D] text-white px-2 py-1.5 text-[9px] font-bold uppercase">
                    <span className="col-span-5">Description</span>
                    <span className="col-span-2 text-center">Qté</span>
                    <span className="col-span-2 text-right">P.U</span>
                    <span className="col-span-3 text-right">Montant</span>
                  </div>
                  {lignesValides.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[#D4CAB8] text-[10px]">
                      Aucun article ajouté
                    </div>
                  ) : (
                    lignesValides.map((l, i) => (
                      <div key={l.id}
                        className={`grid grid-cols-12 px-2 py-1.5 text-[10px] ${i % 2 === 0 ? 'bg-white' : 'bg-green-50'}`}>
                        <span className="col-span-5 font-medium text-[#4A4540] truncate">{l.description}</span>
                        <span className="col-span-2 text-center text-[#78726A]">{l.quantite}</span>
                        <span className="col-span-2 text-right text-[#78726A]">{fmtG(l.prix_unitaire)}</span>
                        <span className="col-span-3 text-right font-semibold text-[#2C2420]">{fmtG(l.quantite * l.prix_unitaire)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center bg-[#3DAA35] rounded-lg px-3 py-2">
                  <span className="font-black text-[#2D6B2D] text-xs">TOTAL</span>
                  <span className="font-black text-[#2D6B2D] text-sm">{fmtG(total)}</span>
                </div>

                {/* Conditions */}
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-[9px] text-[#78726A] space-y-0.5">
                  <p>• Valable {validite || 30} jours à compter de la date d'émission</p>
                  <p>• Prix en Gourdes haïtiennes (HTG)</p>
                  <p>• Document non contractuel — ne constitue pas une facture</p>
                </div>

                {/* Footer */}
                <div className="text-center text-[9px] text-[#A09589] border-t border-[#D4CAB8] pt-2">
                  Manno Lavi Agrikol • Hinche, Haïti • +509 47 59 6225
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton générer */}
        <div className="px-5 py-4 border-t border-[#D4CAB8] bg-white shrink-0">
          <button
            onClick={handleGenerate}
            disabled={!clientNom.trim() || lignesValides.length === 0 || generating}
            className="w-full flex items-center justify-center gap-2 bg-[#2D6B2D] hover:bg-[#1E4E1E] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
          >
            {generating ? <Spinner size="sm" className="text-white" /> : <Download size={16} />}
            Télécharger la proforma en PDF
          </button>
        </div>
      </div>
    </div>
  )
}
