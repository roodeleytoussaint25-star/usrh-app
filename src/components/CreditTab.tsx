import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner } from './ui/Spinner'
import { formatHTG, formatDate } from '../lib/utils'
import { CreditCard, CheckCircle, ChevronDown, ChevronUp, Plus, Phone } from 'lucide-react'
import type { Vente, VenteLigne, CreditPaiement } from '../types'

interface VenteCredit extends Vente {
  lignes?: VenteLigne[]
  paiements?: CreditPaiement[]
  expanded?: boolean
}

export function CreditTab() {
  const [credits, setCredits] = useState<VenteCredit[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [montantPay, setMontantPay] = useState('')
  const [notesPay, setNotesPay] = useState('')
  const [saving, setSaving] = useState(false)
  const [soldeMsg, setSoldeMsg] = useState<string | null>(null)

  const loadCredits = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('mla_ventes')
      .select('*, employe:mla_employes(nom)')
      .eq('statut', 'credit')
      .order('created_at', { ascending: false })
    setCredits((data || []) as VenteCredit[])
    setLoading(false)
  }, [])

  useEffect(() => { loadCredits() }, [loadCredits])

  const toggleExpand = async (venteId: string) => {
    setCredits(prev => prev.map(v => v.id !== venteId ? v : { ...v, expanded: !v.expanded }))
    const v = credits.find(c => c.id === venteId)
    if (!v?.lignes) {
      const [{ data: lignes }, { data: paiements }] = await Promise.all([
        supabase.from('mla_ventes_lignes').select('*, produit:mla_produits(nom)').eq('vente_id', venteId),
        supabase.from('mla_credits_paiements').select('*').eq('vente_id', venteId).order('date_paiement'),
      ])
      setCredits(prev => prev.map(c =>
        c.id !== venteId ? c : { ...c, lignes: (lignes || []) as VenteLigne[], paiements: (paiements || []) as CreditPaiement[] }
      ))
    }
  }

  const handlePayer = async (venteId: string, totalVente: number, dejaPane: number) => {
    const montant = parseFloat(montantPay)
    if (!montant || montant <= 0) return
    setSaving(true)
    const nouveauPaye = dejaPane + montant
    const statut = nouveauPaye >= totalVente ? 'completee' : 'credit'

    await Promise.all([
      supabase.from('mla_credits_paiements').insert({
        vente_id: venteId,
        montant,
        date_paiement: new Date().toISOString().split('T')[0],
        notes: notesPay || null,
      }),
      supabase.from('mla_ventes').update({
        montant_paye: Math.min(nouveauPaye, totalVente),
        statut,
      }).eq('id', venteId),
    ])

    setPayingId(null)
    setMontantPay('')
    setNotesPay('')
    setSaving(false)
    if (statut === 'completee') {
      setSoldeMsg('Crédit soldé')
      setTimeout(() => setSoldeMsg(null), 3000)
    }
    await loadCredits()
  }

  const reste = (v: VenteCredit) => v.total - (v.montant_paye || 0)
  const shortRef = (id: string) => 'VE-' + id.slice(0, 6).toUpperCase()

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>

  if (credits.length === 0) {
    return (
      <div className="flex flex-col items-center py-14 text-center">
        {soldeMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1210] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap">
            {soldeMsg}
          </div>
        )}
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
          <CheckCircle size={24} className="text-green-500" />
        </div>
        <p className="text-sm font-semibold text-[#78726A]">Aucun crédit en attente</p>
        <p className="text-xs text-[#A09589] mt-1">Tous les clients sont à jour</p>
      </div>
    )
  }

  const totalDu = credits.reduce((a, v) => a + reste(v), 0)

  return (
    <div className="space-y-4">
      {soldeMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1210] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap">
          {soldeMsg}
        </div>
      )}
      {/* Banner total dû */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">{credits.length} crédit{credits.length > 1 ? 's' : ''} en attente</span>
        </div>
        <span className="text-base font-bold text-amber-700">{formatHTG(totalDu)}</span>
      </div>

      {/* Liste crédits */}
      <div className="space-y-3">
        {credits.map(v => {
          const resteV = reste(v)
          const pctPaye = v.total > 0 ? Math.round(((v.montant_paye || 0) / v.total) * 100) : 0
          const isPaying = payingId === v.id

          return (
            <div key={v.id} className="bg-white border border-[#D4CAB8] rounded-xl overflow-hidden shadow-sm">
              {/* Ligne principale */}
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#2C2420]">{v.nom_client || 'Client inconnu'}</span>
                      <span className="text-xs text-[#A09589]">{shortRef(v.id)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-[#A09589]">{formatDate(v.created_at)}</p>
                      {v.telephone_client && (
                        <a
                          href={`tel:${v.telephone_client}`}
                          className="flex items-center gap-1 text-xs font-medium text-[#3DAA35] hover:text-[#2D8B2D]"
                        >
                          <Phone size={11} />
                          {v.telephone_client}
                        </a>
                      )}
                    </div>

                    {/* Barre progression */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#78726A]">Payé : {formatHTG(v.montant_paye || 0)}</span>
                        <span className="font-semibold text-red-500">Reste : {formatHTG(resteV)}</span>
                      </div>
                      <div className="h-1.5 bg-[#F0EBE0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3DAA35] rounded-full transition-all duration-500"
                          style={{ width: `${pctPaye}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-[#A09589]">Total</p>
                      <p className="font-bold text-[#2C2420]">{formatHTG(v.total)}</p>
                    </div>
                    <button
                      onClick={() => toggleExpand(v.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#A09589] hover:bg-[#FAF7F2]"
                    >
                      {v.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Détail expandé */}
              {v.expanded && (
                <div className="border-t border-[#D4CAB8] px-4 pb-4 pt-3 space-y-3">
                  {/* Lignes articles */}
                  {v.lignes && (
                    <div className="space-y-1">
                      {v.lignes.map((l, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-[#78726A]">
                            {(l.produit as { nom: string } | undefined)?.nom || 'Produit'} × {l.quantite}
                          </span>
                          <span className="text-[#4A4540] font-medium">{formatHTG(l.sous_total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Historique paiements */}
                  {v.paiements && v.paiements.length > 0 && (
                    <div className="bg-[#FAF7F2] rounded-lg p-3">
                      <p className="text-xs font-semibold text-[#78726A] mb-2">Historique paiements</p>
                      <div className="space-y-1">
                        {v.paiements.map(p => (
                          <div key={p.id} className="flex justify-between text-xs">
                            <span className="text-[#78726A]">{p.date_paiement}</span>
                            <span className="font-semibold text-green-600">+ {formatHTG(p.montant)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formulaire paiement */}
                  {isPaying ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="1"
                        max={resteV}
                        placeholder={`Montant (max ${formatHTG(resteV)})`}
                        value={montantPay}
                        onChange={e => setMontantPay(e.target.value)}
                        className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Notes (optionnel)"
                        value={notesPay}
                        onChange={e => setNotesPay(e.target.value)}
                        className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setPayingId(null); setMontantPay(''); setNotesPay('') }}
                          className="flex-1 py-2 border border-[#D4CAB8] rounded-lg text-sm font-medium text-[#78726A] hover:bg-[#FAF7F2]"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handlePayer(v.id, v.total, v.montant_paye || 0)}
                          disabled={saving || !montantPay}
                          className="flex-1 py-2 bg-[#3DAA35] rounded-lg text-sm font-bold text-[#2D6B2D] hover:bg-[#2D8B2D] disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {saving ? <Spinner size="sm" className="text-[#2D6B2D]" /> : <CheckCircle size={14} />}
                          Confirmer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setPayingId(v.id); setMontantPay(String(resteV)) }}
                      className="w-full flex items-center justify-center gap-2 border border-dashed border-[#3DAA35] text-[#3DAA35] rounded-xl py-2.5 text-sm font-semibold hover:bg-[#EEF7EE] transition-colors"
                    >
                      <Plus size={15} /> Enregistrer un paiement
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
