import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner } from './ui/Spinner'
import { X, Printer } from 'lucide-react'

const PRINT_BASE = 'https://ofrybimftwriaxhfuljt.supabase.co/functions/v1/print-receipt'
const SEP = '--------------------------------'
const THERMAL_LOGO = '/logo-thermal.png'

function buildFraisUrl(d: RecuDirectData): string {
  const p = new URLSearchParams()
  p.set('type',   'frais')
  p.set('titre',  d.titre)
  p.set('mode',   d.mode)
  p.set('total',  String(d.total))
  p.set('date',   formatDate(d.date))
  if (d.code)     p.set('code',     d.code)
  if (d.etudiant) p.set('etudiant', d.etudiant)
  if (d.employe)  p.set('employe',  d.employe)
  d.lignes.forEach((l, i) => {
    p.set('n' + i, l.nom)
    p.set('m' + i, String(l.montant))
  })
  return `my.bluetoothprint.scheme://${PRINT_BASE}?${p.toString()}`
}

export interface RecuDirectData {
  titre: string
  etudiant?: string
  employe?: string
  lignes: { nom: string; montant: number }[]
  total: number
  mode: string
  notes?: string
  date: Date
  code?: string
  venteId?: number
}

interface FetchedData {
  id: number
  total: number
  montant_paye: number
  mode_paiement: string
  created_at: string
  etudiant_nom: string | null
  employe_nom: string | null
  lignes: { nom: string; quantite: number; prix_unitaire: number; total: number }[]
}

interface Props {
  venteId?: number | null
  directData?: RecuDirectData | null
  onClose: () => void
}

function pad(n: number) { return String(n).padStart(2, '0') }
function formatDate(d: Date) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtG(n: number) { return Math.round(n).toString() + ' HTG' }
const shortRef = (id: number) => 'RE-' + String(id).padStart(6, '0')

export function ReceiptModal({ venteId, directData, onClose }: Props) {
  const [fetched, setFetched] = useState<FetchedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const doFetch = async (id: number) => {
    setLoading(true)
    setFetchError(false)
    try {
      const { data: v, error } = await supabase
        .from('usr_ventes')
        .select(`
          id, total, montant_paye, mode_paiement, created_at,
          etudiant:usr_etudiants(nom),
          employe:usr_employes(nom),
          usr_ventes_lignes(article_nom, quantite, prix_unitaire, total)
        `)
        .eq('id', id)
        .single()
      if (error || !v) { setLoading(false); setFetchError(true); return }
      setFetched({
        id: v.id,
        total: v.total,
        montant_paye: v.montant_paye,
        mode_paiement: v.mode_paiement === 'credit' ? 'Crédit' : 'Cash',
        created_at: v.created_at,
        etudiant_nom: Array.isArray(v.etudiant) ? v.etudiant[0]?.nom ?? null : (v.etudiant as any)?.nom ?? null,
        employe_nom:  Array.isArray(v.employe)  ? v.employe[0]?.nom  ?? null : (v.employe  as any)?.nom ?? null,
        lignes: ((v.usr_ventes_lignes as any[]) || []).map(l => ({
          nom: l.article_nom,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire,
          total: l.total,
        })),
      })
      setLoading(false)
    } catch {
      setLoading(false)
      setFetchError(true)
    }
  }

  useEffect(() => {
    if (!venteId) { setFetched(null); setFetchError(false); return }
    doFetch(venteId)
  }, [venteId])

  const isOpen = !!(venteId || directData)
  if (!isOpen) return null

  const reste = fetched ? Math.max(0, fetched.total - fetched.montant_paye) : 0
  const printId = fetched?.id

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Bouton fermer */}
      <div className="relative z-10 flex justify-end px-4 pt-4 pb-2 flex-shrink-0">
        <button onClick={onClose}
          className="text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium">
          <X size={16} /> Fermer
        </button>
      </div>

      {/* Contenu scrollable */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6">
        <div className="mx-auto w-full max-w-xs flex flex-col items-center">

          {/* Reçu thermique */}
          <div className="w-full bg-white shadow-2xl overflow-hidden"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}>

            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : fetchError ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <p className="text-sm text-red-500 font-semibold">Erreur de chargement</p>
                <button onClick={() => venteId && doFetch(venteId)}
                  className="text-xs text-[#1B2A8A] underline">Réessayer</button>
              </div>
            ) : (
              <div className="px-4 pt-5 pb-3 text-[13px] text-black leading-snug">

                {/* Logo + entête */}
                <div className="flex justify-center mb-2">
                  <img src={THERMAL_LOGO} alt="USRH" className="w-20" />
                </div>
                <div className="text-center text-[11px] mb-1">
                  <p className="font-bold text-[14px]">USRH</p>
                  <p>Unité Spéciale Rapprochée d'Haïti</p>
                  <p>Jacquet toto, en face eglise Adventiste</p>
                  <p>3735-3055 / 3717-7630 / 4147-5862</p>
                </div>
                <p className="text-center my-2">{SEP}</p>

                {/* Méta */}
                {fetched && (
                  <>
                    <p>Date: {formatDate(new Date(fetched.created_at))}</p>
                    <p className="font-bold">Recu #: {shortRef(fetched.id)}</p>
                    {fetched.employe_nom  && <p>Employe: {fetched.employe_nom}</p>}
                    {fetched.etudiant_nom && <p>Etudiant: <strong>{fetched.etudiant_nom}</strong></p>}
                  </>
                )}
                {directData && (
                  <>
                    <p>Date: {formatDate(directData.date)}</p>
                    {directData.employe  && <p>Employe: {directData.employe}</p>}
                    {directData.etudiant && <p>Etudiant: <strong>{directData.etudiant}</strong></p>}
                  </>
                )}

                <p className="text-center my-2">{SEP}</p>

                {/* Lignes — vente fetchée */}
                {fetched && (
                  <>
                    <div className="flex font-bold mb-1">
                      <span className="flex-1">Article</span>
                      <span className="w-6 text-center">Q</span>
                      <span className="w-20 text-right">Total</span>
                    </div>
                    {fetched.lignes.map((l, i) => (
                      <div key={i} className="flex mb-1 items-start">
                        <span className="flex-1 pr-1 break-words leading-tight">{l.nom}</span>
                        <span className="w-6 text-center flex-shrink-0">{l.quantite}</span>
                        <span className="w-20 text-right flex-shrink-0">{fmtG(l.total)}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Lignes — frais direct */}
                {directData && (
                  <>
                    <p className="font-bold mb-1">{directData.titre}</p>
                    {directData.lignes.map((l, i) => (
                      <div key={i} className="flex justify-between mb-1">
                        <span>{l.nom}</span>
                        <span>{fmtG(l.montant)}</span>
                      </div>
                    ))}
                  </>
                )}

                <p className="text-center my-2">{SEP}</p>

                {/* Total */}
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-[17px] font-black">TOTAL:</span>
                  <span className="text-[17px] font-black">
                    {fmtG(fetched ? fetched.total : (directData?.total ?? 0))}
                  </span>
                </div>

                {/* Mode paiement */}
                <div className="flex justify-between mt-1">
                  <span>Mode:</span>
                  <span>{fetched ? fetched.mode_paiement : directData?.mode}</span>
                </div>

                {/* Crédit — reste dû */}
                {fetched && reste > 0 && (
                  <>
                    <div className="flex justify-between mt-1">
                      <span>Paye:</span><span>{fmtG(fetched.montant_paye)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>RESTE DU:</span><span>{fmtG(reste)}</span>
                    </div>
                  </>
                )}

                {directData?.notes && (
                  <>
                    <p className="text-center my-2">{SEP}</p>
                    <p className="text-[11px] italic">Note: {directData.notes}</p>
                  </>
                )}

                <p className="text-center my-2">{SEP}</p>
                <p className="text-center font-bold mb-1">Mesi pou konfyans ou !</p>
                <p className="text-center text-[10px] text-gray-500">Dokiman ofisyel — USRH</p>
              </div>
            )}
          </div>

          {/* Bouton Bluetooth print — vente par ID (historique) */}
          {venteId && !directData && (
            <a
              href={`my.bluetoothprint.scheme://${PRINT_BASE}?type=vente&vente_id=${venteId}`}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-black text-white rounded-xl py-3.5 font-bold text-sm shadow-lg active:scale-95 transition-transform">
              <Printer size={17} />
              Imprimer le reçu
            </a>
          )}

          {/* Bouton Bluetooth print — frais/vente direct */}
          {directData && (
            <a
              href={directData.venteId
                ? `my.bluetoothprint.scheme://${PRINT_BASE}?type=vente&vente_id=${directData.venteId}`
                : buildFraisUrl(directData)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-black text-white rounded-xl py-3.5 font-bold text-sm shadow-lg active:scale-95 transition-transform">
              <Printer size={17} />
              Imprimer le reçu
            </a>
          )}

          {/* Fermer */}
          <button onClick={onClose}
            className="mt-3 w-full border border-gray-300 text-gray-700 rounded-xl py-3 font-semibold text-sm active:scale-95 transition-transform bg-white">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
