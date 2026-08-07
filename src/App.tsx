import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppShell } from './components/app-shell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { VentesPage } from './pages/VentesPage'
import { StockPage } from './pages/StockPage'
import { FournisseursPage } from './pages/FournisseursPage'
import { RapportsPage } from './pages/RapportsPage'
import { ParametresPage } from './pages/ParametresPage'
import { Spinner } from './components/ui/Spinner'

export type Page = 'dashboard' | 'ventes' | 'stock' | 'fournisseurs' | 'rapports' | 'parametres'

const pageTitles: Record<Page, string> = {
  dashboard: 'Tableau de bord',
  ventes: 'Ventes',
  stock: 'Stock',
  fournisseurs: 'Achats',
  rapports: 'Rapports',
  parametres: 'Paramètres',
}

function AppContent() {
  const { session, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) {
    return <LoginPage onLogin={() => setCurrentPage('dashboard')} />
  }

  const allowedPages: Page[] = session.role === 'admin'
    ? ['dashboard', 'ventes', 'stock', 'fournisseurs', 'rapports', 'parametres']
    : ['ventes', 'stock']

  const effectivePage: Page = session.role === 'employe' && currentPage === 'dashboard'
    ? 'ventes'
    : allowedPages.includes(currentPage)
      ? currentPage
      : allowedPages[0]

  const handleNavigate = (page: Page) => {
    if (allowedPages.includes(page)) {
      setCurrentPage(page)
    }
  }

  const renderPage = () => {
    switch (effectivePage) {
      case 'dashboard':   return <DashboardPage onNavigate={handleNavigate} />
      case 'ventes':      return <VentesPage />
      case 'stock':       return <StockPage />
      case 'fournisseurs': return <FournisseursPage />
      case 'rapports':    return <RapportsPage />
      case 'parametres':  return <ParametresPage />
    }
  }

  return (
    <AppShell currentPage={effectivePage} onNavigate={handleNavigate} pageTitle={pageTitles[effectivePage]}>
      {renderPage()}
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
