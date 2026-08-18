import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, ShoppingCart, Package, BookOpen,
  BarChart2, Settings, LogOut, Menu, X, Bell,
  House, ShoppingBasket, Archive, BookMarked, ChartBar,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Page } from '@/App'

const NAV_ITEMS = [
  { page: 'dashboard'  as Page, icon: LayoutDashboard, iconActive: House,          label: 'Accueil',    adminOnly: true  },
  { page: 'etudiants'  as Page, icon: BookOpen,        iconActive: BookMarked,     label: 'Étudiants',  adminOnly: false },
  { page: 'ventes'     as Page, icon: ShoppingCart,    iconActive: ShoppingBasket, label: 'Ventes',     adminOnly: false },
  { page: 'stock'      as Page, icon: Package,         iconActive: Archive,        label: 'Stock',      adminOnly: false },
  { page: 'rapports'   as Page, icon: BarChart2,       iconActive: ChartBar,       label: 'Rapports',   adminOnly: true  },
]

interface AppShellProps {
  children: React.ReactNode
  currentPage: Page
  onNavigate: (page: Page) => void
  pageTitle: string
}

export function AppShell({ children, currentPage, onNavigate, pageTitle }: AppShellProps) {
  const { session, logout } = useAuth()
  const isAdmin = session?.role === 'admin'
  const navItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  const [open, setOpen]           = useState(false)
  const [bellOpen, setBellOpen]   = useState(false)
  const [debiteurs, setDebiteurs] = useState<{ nom: string; dette: number }[]>([])

  useEffect(() => {
    supabase.from('usr_etudiants')
      .select('nom, frais_inscription, frais_inscription_paye, frais_formation_v1, frais_formation_v1_paye, frais_formation_v2, frais_formation_v2_paye')
      .eq('actif', true)
      .then(({ data }) => {
        const liste = (data || []).map(e => ({
          nom: e.nom,
          dette:
            Math.max(0, (e.frais_inscription   || 0) - (e.frais_inscription_paye   || 0)) +
            Math.max(0, (e.frais_formation_v1  || 0) - (e.frais_formation_v1_paye  || 0)) +
            Math.max(0, (e.frais_formation_v2  || 0) - (e.frais_formation_v2_paye  || 0)),
        })).filter(e => e.dette > 0).sort((a, b) => b.dette - a.dette)
        setDebiteurs(liste)
      })
  }, [])

  const fmt = (n: number) => n.toLocaleString('fr-HT') + ' HTG'

  const navigate = (page: Page) => {
    onNavigate(page)
    setOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F4]">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-3 shadow-sm">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <Menu size={22} className="text-gray-700" />
        </button>
        <img src="/logo.png" alt="USRH" className="h-8 w-8 object-contain rounded-full" />
        <p className="font-bold text-gray-900 flex-1">{pageTitle}</p>
        <button onClick={() => setBellOpen(true)} className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <Bell size={20} className="text-gray-600" />
          {debiteurs.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#A01020] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {debiteurs.length > 99 ? '99+' : debiteurs.length}
            </span>
          )}
        </button>
      </header>

      {/* ── CONTENU ── */}
      <main className="flex-1 overflow-auto">
        <div key={currentPage} className="animate-page-in">
          {children}
        </div>
      </main>

      {/* ── BACKDROP ── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── PANNEAU CLOCHE ── */}
      {bellOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={e => { if (e.target === e.currentTarget) setBellOpen(false) }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[75vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">Retards de paiement</h3>
                <p className="text-xs text-gray-400">{debiteurs.length} étudiant{debiteurs.length !== 1 ? 's' : ''} avec solde dû</p>
              </div>
              <button onClick={() => setBellOpen(false)} className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center shadow-sm">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-5 pb-6">
              {debiteurs.length === 0 ? (
                <div className="text-center py-12">
                  <Bell size={28} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Aucun retard de paiement</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl divide-y divide-[#F0EDE8] border border-[#F0EDE8] shadow-sm">
                  {debiteurs.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#A01020]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#A01020]">{d.nom[0].toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{d.nom}</p>
                      </div>
                      <p className="text-sm font-bold text-[#A01020]">{fmt(d.dette)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER SIDEBAR ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 bg-[#1B2A8A] flex flex-col transition-transform duration-300 ease-in-out shadow-2xl',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Bande rouge */}
        <div className="h-1 bg-[#A01020] flex-shrink-0" />

        {/* En-tête drawer */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md">
                <img src="/logo.png" alt="USRH" className="h-10 w-10 object-contain" />
              </div>
            <div>
              <p className="text-white font-bold leading-tight">USRH</p>
              <p className="text-white/50 text-xs">Unité Spéciale Rapprochée</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X size={16} className="text-white/70" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ page, icon: Icon, iconActive: IconActive, label }) => {
            const isActive = currentPage === page
            const NavIcon = isActive ? IconActive : Icon
            return (
              <button
                key={page}
                onClick={() => navigate(page)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-all text-left',
                  isActive
                    ? 'bg-[#A01020] text-white font-bold shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <NavIcon size={20} className={isActive ? 'text-white' : 'text-white/50'} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="h-px bg-white/10 mx-4 my-2" />

        {/* Bas drawer */}
        <div className="px-3 pb-6 space-y-0.5">
          {isAdmin && (() => {
            const isActive = currentPage === 'parametres'
            return (
              <button
                onClick={() => navigate('parametres')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-all text-left',
                  isActive
                    ? 'bg-[#A01020] text-white font-bold shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Settings size={20} className={isActive ? 'text-white' : 'text-white/50'} fill={isActive ? 'white' : 'none'} />
                <span>Paramètres</span>
              </button>
            )
          })()}
          <button
            onClick={() => { logout(); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} className="text-red-400" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

    </div>
  )
}
