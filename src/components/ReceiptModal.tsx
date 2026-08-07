import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner } from './ui/Spinner'
import { X, Printer } from 'lucide-react'

const PRINT_BASE = 'https://tzgssgfbbumvmzkaefnk.supabase.co/functions/v1/print-receipt'
const SEP = '--------------------------------'

interface ReceiptLigne {
  nom: string
  quantite: number
  prix_unitaire: number
  sous_total: number
}

interface ReceiptData {
  id: string
  total: number
  rabais_montant: number
  nom_client: string | null
  montant_paye: number
  created_at: string
  employe_nom: string | null
  lignes: ReceiptLigne[]
}

interface Props {
  venteId: string | null
  onClose: () => void
}

function pad(n: number) { return String(n).padStart(2, '0') }
function formatDate(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function formatG(n: number) { return n.toLocaleString('fr-FR') + 'G' }
const shortRef = (id: string) => 'VE-' + id.slice(0, 6).toUpperCase()

export function ReceiptModal({ venteId, onClose }: Props) {
  const [data, setData] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!venteId) { setData(null); return }
    setLoading(true)
    supabase
      .from('mla_ventes')
      .select(`
        id, total, rabais_montant, nom_client, montant_paye, created_at,
        employe:mla_employes(nom),
        lignes:mla_ventes_lignes(quantite, prix_unitaire, sous_total, produit:mla_produits(nom))
      `)
      .eq('id', venteId)
      .single()
      .then(({ data: v }) => {
        if (!v) { setLoading(false); return }
        setData({
          id: v.id,
          total: Number(v.total),
          rabais_montant: Number(v.rabais_montant),
          nom_client: (v as Record<string, unknown>).nom_client as string | null,
          montant_paye: Number((v as Record<string, unknown>).montant_paye ?? v.total),
          created_at: v.created_at,
          employe_nom: (v.employe as unknown as { nom: string } | null)?.nom ?? null,
          lignes: ((v.lignes as unknown[]) || []).map((l: unknown) => {
            const line = l as { quantite: number; prix_unitaire: number; sous_total: number; produit: { nom: string } | null }
            return {
              nom: line.produit?.nom || 'Article',
              quantite: line.quantite,
              prix_unitaire: Number(line.prix_unitaire),
              sous_total: Number(line.sous_total),
            }
          }),
        })
        setLoading(false)
      })
  }, [venteId])

  if (!venteId) return null

  const reste = data ? Math.max(0, data.total - data.montant_paye) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-xs flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute -top-9 right-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium"
        >
          <X size={16} /> Fermer
        </button>

        {/* ── REÇU THERMIQUE ──────────────────────────────────────────── */}
        <div className="w-full bg-white shadow-2xl overflow-hidden"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : data ? (
            <div className="px-4 pt-5 pb-3 text-[13px] text-black leading-snug">
              {/* Logo */}
              <div className="flex justify-center mb-2">
                <img src="/logo.png" alt="Manno Lavi Agrikol" className="w-28"
                  style={{ filter: 'grayscale(100%) contrast(1.3)' }} />
              </div>

              <div className="text-center text-[11px] mb-1">
                <p className="font-bold">MANNO LAVI AGRIKOL</p>
                <p>Intrants Agricoles</p>
                <p>Hinche & Saint-Raphaël, Haïti</p>
                <p>Tel: +509 47 59 6225</p>
              </div>

              <p className="text-center text-[12px] mb-2">{SEP}</p>

              <p>Date: {formatDate(data.created_at)}</p>
              <p className="font-bold">Recu #: {shortRef(data.id)}</p>
              {data.employe_nom && <p>Vendeur: {data.employe_nom}</p>}
              {data.nom_client && <p>Client: <strong>{data.nom_client}</strong></p>}

              <p className="text-center my-2">{SEP}</p>

              <div className="flex font-bold mb-1">
                <span className="flex-1">Article</span>
                <span className="w-8 text-center">Qte</span>
                <span className="w-14 text-right">Prix</span>
                <span className="w-16 text-right">Total</span>
              </div>

              {data.lignes.map((l, i) => (
                <div key={i} className="flex mb-1 items-start">
                  <span className="flex-1 pr-1 break-words leading-tight" style={{ wordBreak: 'break-word' }}>
                    {l.nom}
                  </span>
                  <span className="w-8 text-center flex-shrink-0">{l.quantite}</span>
                  <span className="w-14 text-right flex-shrink-0">{formatG(l.prix_unitaire)}</span>
                  <span className="w-16 text-right flex-shrink-0">{formatG(l.sous_total)}</span>
                </div>
              ))}

              <p className="text-center my-2">{SEP}</p>

              {data.rabais_montant > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>Sous-total:</span>
                    <span>{formatG(data.lignes.reduce((a, l) => a + l.sous_total, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rabais:</span>
                    <span>-{formatG(data.rabais_montant)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-baseline mt-1">
                <span className="text-[17px] font-black">TOTAL:</span>
                <span className="text-[17px] font-black">{formatG(data.total)}</span>
              </div>

              {reste > 0 && (
                <>
                  <div className="flex justify-between mt-1">
                    <span>Paye:</span>
                    <span>{formatG(data.montant_paye)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>RESTE:</span>
                    <span>{formatG(reste)}</span>
                  </div>
                </>
              )}

              <p className="text-center my-2">{SEP}</p>
              <p className="text-center font-bold mb-3">Mesi pou konfyans ou !</p>
            </div>
          ) : (
            <p className="text-center text-sm text-[#A09589] py-10">Reçu introuvable</p>
          )}
        </div>

        {data && (
          <a
            href={`my.bluetoothprint.scheme://${PRINT_BASE}?vente_id=${data.id}`}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-black hover:bg-zinc-900 text-white rounded-xl py-3.5 font-bold text-sm transition-colors shadow-lg"
          >
            <Printer size={17} />
            Imprimer le reçu
          </a>
        )}
      </div>
    </div>
  )
}
