import { LayoutDashboard, ShoppingCart, Package, Truck, BarChart2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type Page = 'dashboard' | 'ventes' | 'stock' | 'fournisseurs' | 'rapports'

interface BottomNavProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const adminItems = [
  { page: 'dashboard' as Page, icon: LayoutDashboard, label: 'Accueil' },
  { page: 'ventes' as Page, icon: ShoppingCart, label: 'Ventes' },
  { page: 'stock' as Page, icon: Package, label: 'Stock' },
  { page: 'fournisseurs' as Page, icon: Truck, label: 'Achats' },
  { page: 'rapports' as Page, icon: BarChart2, label: 'Rapports' },
]

const vendeurItems = [
  { page: 'ventes' as Page, icon: ShoppingCart, label: 'Ventes' },
  { page: 'stock' as Page, icon: Package, label: 'Stock' },
]

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const { session } = useAuth()
  const items = session?.role === 'admin' ? adminItems : vendeurItems

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-16 z-40">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
        {items.map(({ page, icon: Icon, label }) => {
          const isActive = currentPage === page
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-colors min-w-0 ${
                isActive
                  ? 'text-[#3DAA35] bg-[#EEF7EE]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
