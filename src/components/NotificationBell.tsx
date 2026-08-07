import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, PackageX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Produit } from '@/types'

interface Alert {
  id: string
  nom: string
  quantite: number
  seuil_alerte: number
  unite: string
  type: 'rupture' | 'bas'
}

export function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = async () => {
    const { data } = await supabase
      .from('mla_produits')
      .select('id, nom, quantite, seuil_alerte, unite')
      .eq('actif', true)
    if (!data) return
    const filtered = (data as Pick<Produit, 'id' | 'nom' | 'quantite' | 'seuil_alerte' | 'unite'>[])
      .filter(p => p.quantite <= p.seuil_alerte)
      .map(p => ({
        id: p.id,
        nom: p.nom,
        quantite: p.quantite,
        seuil_alerte: p.seuil_alerte,
        unite: p.unite,
        type: (p.quantite === 0 ? 'rupture' : 'bas') as 'rupture' | 'bas',
      }))
    setAlerts(filtered)
  }

  // Chargement initial + rafraîchissement auto toutes les 60s
  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  // Rechargement immédiat à chaque ouverture du dropdown
  useEffect(() => {
    if (open) load()
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const ruptures = alerts.filter(a => a.type === 'rupture')
  const bas = alerts.filter(a => a.type === 'bas')

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1E4E1E] transition-colors"
        title="Alertes stock"
      >
        <Bell size={18} className={alerts.length > 0 ? 'text-[#E8A820]' : 'text-white'} />
        {alerts.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-72 bg-white rounded-xl shadow-xl border border-[#D4CAB8] z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E0D0] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1A1210]">Alertes stock</h3>
            <span className="text-xs text-[#A09589]">
              {alerts.length === 0 ? 'Aucune alerte' : `${alerts.length} alerte${alerts.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell size={28} className="text-[#D4CAB8] mx-auto mb-2" />
              <p className="text-sm text-[#A09589]">Tout est en stock</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {ruptures.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-red-50 border-b border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
                      Ruptures de stock ({ruptures.length})
                    </p>
                  </div>
                  {ruptures.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F5F0E8]">
                      <PackageX size={15} className="text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C2420] truncate">{a.nom}</p>
                        <p className="text-xs text-red-500 font-semibold">0 {a.unite} — rupture totale</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {bas.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                      Stock bas ({bas.length})
                    </p>
                  </div>
                  {bas.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F5F0E8]">
                      <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C2420] truncate">{a.nom}</p>
                        <p className="text-xs text-[#A09589]">
                          {a.quantite} {a.unite} — seuil : {a.seuil_alerte}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
