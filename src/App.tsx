import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { AppShell } from './components/app-shell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { VentesPage } from './pages/VentesPage'
import { StockPage } from './pages/StockPage'
import { EtudiantsPage } from './pages/EtudiantsPage'
import { RapportsPage } from './pages/RapportsPage'
import { ParametresPage } from './pages/ParametresPage'
import { Spinner } from './components/ui/Spinner'

export type Page = 'dashboard' | 'etudiants' | 'ventes' | 'stock' | 'rapports' | 'parametres'

const pageTitles: Record<Page, string> = {
  dashboard: 'Vue Globale',
  etudiants: 'Cours & Étudiants',
  ventes: 'Ventes',
  stock: 'Stock',
  rapports: 'Rapports',
  parametres: 'Paramètres',
}

function SuspendedScreen() {
  return (
    <div className="min-h-screen bg-[#1B2A8A] flex flex-col items-center justify-center text-white px-6 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold mb-2">Accès suspendu</h1>
      <p className="text-white/70">Contactez Mèt Biznis au +509 56173528</p>
    </div>
  )
}

function AppContent() {
  const { session, loading, appActive } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [ventesPreselect, setVentesPreselect] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!appActive) return <SuspendedScreen />
  if (!session) return <LoginPage onLogin={() => setCurrentPage('dashboard')} />

  const adminPages: Page[] = ['dashboard', 'etudiants', 'ventes', 'stock', 'rapports', 'parametres']
  const employePages: Page[] = ['etudiants', 'ventes', 'stock']
  const allowedPages = session.role === 'admin' ? adminPages : employePages

  const effectivePage: Page = allowedPages.includes(currentPage)
    ? currentPage
    : allowedPages[0]

  const handleNavigate = (page: Page) => {
    if (allowedPages.includes(page)) setCurrentPage(page)
  }

  const renderPage = () => {
    switch (effectivePage) {
      case 'dashboard':  return <DashboardPage onNavigate={handleNavigate} />
      case 'etudiants':  return <EtudiantsPage onPayEtudiant={(id) => { setVentesPreselect(id); handleNavigate('ventes') }} />
      case 'ventes':     return <VentesPage preselectStudentId={ventesPreselect} onMounted={() => setVentesPreselect(null)} />
      case 'stock':      return <StockPage />
      case 'rapports':   return <RapportsPage onPayEtudiant={(id) => { setVentesPreselect(id); handleNavigate('ventes') }} />
      case 'parametres': return <ParametresPage />
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
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}
