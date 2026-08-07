import React from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { BottomNav } from './BottomNav'

type Page = 'dashboard' | 'ventes' | 'stock' | 'fournisseurs' | 'rapports'

const pageTitles: Record<Page, string> = {
  dashboard: 'Tableau de bord',
  ventes: 'Ventes',
  stock: 'Stock',
  fournisseurs: 'Fournisseurs & Achats',
  rapports: 'Rapports',
}

interface LayoutProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  children: React.ReactNode
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { logout, session } = useAuth()

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#2D6B2D] z-40 h-14">
        <div className="flex items-center justify-between h-full px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#3DAA35] rounded-lg flex items-center justify-center">
              <span className="text-sm">🌿</span>
            </div>
            <h1 className="text-base font-bold text-white">{pageTitles[currentPage]}</h1>
          </div>
          <div className="flex items-center gap-2">
            {session?.employeNom && (
              <span className="text-xs text-white/60 font-medium">{session.employeNom}</span>
            )}
            <button
              onClick={logout}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Déconnexion"
            >
              <LogOut size={18} className="text-white/60" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-14 pb-20 min-h-screen">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
    </div>
  )
}
