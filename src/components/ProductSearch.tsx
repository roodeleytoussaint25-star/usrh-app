import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { formatHTG } from '@/lib/utils'
import type { Produit } from '@/types'

interface ProductSearchProps {
  produits: Produit[]
  onSelect: (produit: Produit | null) => void
  placeholder?: string
  className?: string
  clearAfterSelect?: boolean
}

export function ProductSearch({ produits, onSelect, placeholder, className, clearAfterSelect }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Produit | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()
  const filtered = q.length === 0
    ? []
    : produits
        .filter(p => p.nom.toLowerCase().startsWith(q))
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
        .slice(0, 10)

  const handleSelect = (p: Produit) => {
    if (clearAfterSelect) {
      setQuery('')
      setSelected(null)
    } else {
      setQuery(p.nom)
      setSelected(p)
    }
    setOpen(false)
    onSelect(p)
  }

  const handleClear = () => {
    setQuery('')
    setSelected(null)
    setOpen(false)
    onSelect(null)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09589] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (selected) { setSelected(null); onSelect(null) } }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || 'Taper pour chercher un produit...'}
          className="w-full border border-[#D4CAB8] rounded-lg pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white"
        />
        {(query || selected) && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A09589] hover:text-[#78726A] p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-[#D4CAB8] rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => handleSelect(p)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#EEF7EE] transition-colors flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-[#2C2420] truncate">{p.nom}</p>
                {p.categorie?.nom && (
                  <p className="text-[10px] text-[#A09589]">{p.categorie.nom}</p>
                )}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${p.quantite <= 0 ? 'text-red-500' : 'text-[#2D6B2D]'}`}>
                {p.quantite <= 0 ? '⚠ Rupture' : formatHTG(p.prix)}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.trim().length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 w-full bg-white border border-[#D4CAB8] rounded-lg shadow-lg mt-1 px-3 py-3 text-sm text-[#A09589] text-center">
          Aucun produit trouvé
        </div>
      )}
    </div>
  )
}
