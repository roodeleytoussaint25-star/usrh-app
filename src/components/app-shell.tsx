import React, { useState } from 'react'
import {
  LayoutDashboard, ShoppingCart, Package, Truck, BarChart2,
  Menu, X, LogOut, Settings,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import type { Page } from '@/App'
import { NotificationBell } from '@/components/NotificationBell'

const menuItems = [
  { page: 'dashboard' as Page, icon: LayoutDashboard, label: 'Accueil',  adminOnly: true  },
  { page: 'ventes'    as Page, icon: ShoppingCart,    label: 'Ventes',   adminOnly: false },
  { page: 'stock'     as Page, icon: Package,          label: 'Stock',    adminOnly: false },
  { page: 'fournisseurs' as Page, icon: Truck,         label: 'Achats',   adminOnly: true  },
  { page: 'rapports'  as Page, icon: BarChart2,        label: 'Rapports', adminOnly: true  },
]

interface AppShellProps {
  children: React.ReactNode
  currentPage: Page
  onNavigate: (page: Page) => void
  pageTitle: string
}

function NavItem({
  icon: Icon, label, active, onClick,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left',
        active
          ? 'bg-[#E8A820] text-[#1A3A1A] font-bold shadow-sm'
          : 'text-[#A8D5A8] hover:bg-[#1E4E1E] hover:text-white'
      )}
    >
      <Icon
        size={18}
        className={active ? 'text-[#1A3A1A]' : 'text-[#6BAF6B]'}
      />
      <span className="flex-1">{label}</span>
    </button>
  )
}

export function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  const { session, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = session?.role === 'admin'
  const navItems = menuItems.filter(item => !item.adminOnly || isAdmin)

  const handleNav = (page: Page) => {
    onNavigate(page)
    setMobileOpen(false)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#2D6B2D]">
      {/* Bande tricolore */}
      <div className="h-1 bg-gradient-to-r from-[#E8A820] via-[#3DAA35] to-[#8B6400] flex-shrink-0" />

      {/* Logo + nom */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1E4E1E]">
        <div className="bg-white rounded-xl p-1.5 flex-shrink-0">
          <img
            src="/logo.png"
            alt="Manno Lavi Agrikol"
            className="h-10 w-10 object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-bold leading-tight">Manno Lavi</p>
          <p className="text-[#6BAF6B] text-[11px]">Agrikol</p>
        </div>
        {/* Bouton fermer drawer (mobile only) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden ml-auto p-1 rounded-lg hover:bg-[#1E4E1E] transition-colors"
        >
          <X size={16} className="text-[#A8D5A8]" />
        </button>
      </div>

      {/* Nav principale */}
      <nav className="flex-1 px-3 pt-1 space-y-0.5 overflow-y-auto">
        {navItems.map(({ page, icon, label }) => (
          <NavItem
            key={page}
            icon={icon}
            label={label}
            active={currentPage === page}
            onClick={() => handleNav(page)}
          />
        ))}
      </nav>

      <div className="h-px bg-[#1E4E1E] mx-4 my-2" />

      {/* Bas : Paramètres + Déconnexion */}
      <div className="px-3 pb-5 space-y-0.5">
        {isAdmin && (
          <NavItem
            icon={Settings}
            label="Paramètres"
            active={currentPage === 'parametres'}
            onClick={() => handleNav('parametres')}
          />
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors"
        >
          <LogOut size={18} className="text-red-400" />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-[#F5F0E8]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#2D6B2D] fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-y-0 left-0 w-64 z-50 shadow-2xl">
          <SidebarContent />
        </div>
      )}

      {/* Zone principale */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">

        {/* Header épuré */}
        <header className="sticky top-0 z-20 bg-[#2D6B2D] h-14 flex items-center px-4 gap-3">
          {/* Hamburger mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-[#1E4E1E] transition-colors flex-shrink-0"
          >
            <Menu size={20} className="text-white" />
          </button>

          {/* Logo (mobile uniquement — sur desktop il est dans la sidebar) */}
          <div className="lg:hidden bg-white rounded-lg p-1.5 flex-shrink-0">
            <img
              src="/logo.png"
              alt="Manno Lavi Agrikol"
              className="h-7 w-7 object-contain"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cloche */}
          <NotificationBell />
        </header>

        {/* Contenu */}
        <main className="flex-1 overflow-auto pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
