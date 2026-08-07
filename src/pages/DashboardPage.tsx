import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui/Spinner'
import { formatHTG, formatDate, formatTime, todayStart } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle, TrendingUp, ArrowUpRight, ShoppingCart, Package, TrendingDown, CreditCard } from 'lucide-react'

import type { Produit, Vente } from '../types'
import type { Page } from '../App'
import { Tooltip } from '../components/ui/Tooltip'

interface DayData {
  day: string
  total: number
}

interface AlertProduit extends Produit {
  categorie?: { nom: string }
}

interface DashboardPageProps {
  onNavigate?: (page: Page) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [caAujourdhui, setCaAujourdhui] = useState(0)
  const [nbVentes, setNbVentes] = useState(0)
  const [beneficesJour, setBeneficesJour] = useState(0)
  const [depensesMois, setDepensesMois] = useState(0)
  const [valeurStock, setValeurStock] = useState(0)
  const [dettesRestantes, setDettesRestantes] = useState(0)
  const [stockBas, setStockBas] = useState<AlertProduit[]>([])
  const [totalProduits, setTotalProduits] = useState(0)
  const [dernieresVentes, setDernieresVentes] = useState<Vente[]>([])
  const [ca7Jours, setCa7Jours] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(() => loadDashboard(true), 60000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboard = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    const todayStr = todayStart()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const tomorrowStr = tomorrow.toISOString()

    const { data: ventesAuj } = await supabase
      .from('mla_ventes')
      .select('total, employe_id, mla_employes(nom)')
      .gte('created_at', todayStr)
      .lt('created_at', tomorrowStr)

    if (ventesAuj) {
      const total = (ventesAuj as Array<{ total: number }>).reduce((acc, v) => acc + (v.total || 0), 0)
      setCaAujourdhui(total)
      setNbVentes(ventesAuj.length)
    }

    // Dépenses du mois en cours
    const debutMois = new Date()
    debutMois.setDate(1)
    debutMois.setHours(0, 0, 0, 0)
    const { data: depMois } = await supabase
      .from('mla_depenses')
      .select('montant')
      .gte('date_depense', debutMois.toISOString().split('T')[0])
    const totalDepMois = (depMois || []).reduce((s: number, d: { montant: number }) => s + d.montant, 0)
    setDepensesMois(totalDepMois)

    // Bénéfices jour = CA - coût d'achat des produits vendus aujourd'hui
    const venteIdsAuj = (ventesAuj || []).map((v: any) => v.id).filter(Boolean)
    let coutAchat = 0
    if (venteIdsAuj.length > 0) {
      const { data: lignesAuj } = await supabase
        .from('mla_ventes_lignes')
        .select('quantite, mla_produits(prix_achat)')
        .in('vente_id', venteIdsAuj)
      coutAchat = (lignesAuj || []).reduce((s: number, l: any) => {
        const pa = Array.isArray(l.mla_produits) ? (l.mla_produits[0]?.prix_achat || 0) : (l.mla_produits?.prix_achat || 0)
        return s + (l.quantite || 0) * pa
      }, 0)
    }
    setBeneficesJour(Math.max(0, (ventesAuj || []).reduce((acc: number, v: any) => acc + (v.total || 0), 0) - coutAchat))

    // Dettes restantes
    const { data: emprunts } = await supabase
      .from('mla_emprunts')
      .select('montant_restant')
      .eq('statut', 'actif')
    setDettesRestantes((emprunts || []).reduce((s: number, e: { montant_restant: number }) => s + e.montant_restant, 0))

    const { data: allProduits } = await supabase
      .from('mla_produits')
      .select('*, categorie:mla_categories(nom)')
      .eq('actif', true)

    if (allProduits) {
      setTotalProduits(allProduits.length)
      setStockBas(allProduits.filter((p: Produit) => p.quantite <= p.seuil_alerte))
      const vStock = allProduits.reduce((s: number, p: Produit) => s + p.quantite * (p.prix_achat || 0), 0)
      setValeurStock(vStock)
    }

    const { data: lastVentes } = await supabase
      .from('mla_ventes')
      .select('*, employe:mla_employes(nom)')
      .order('created_at', { ascending: false })
      .limit(5)

    if (lastVentes) setDernieresVentes(lastVentes as Vente[])

    const dayLabels = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
    const days7 = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      const { data } = await supabase
        .from('mla_ventes')
        .select('total')
        .gte('created_at', d.toISOString())
        .lt('created_at', next.toISOString())
      days7.push({ day: dayLabels[d.getDay()], total: (data || []).reduce((a: number, v: { total: number }) => a + (v.total || 0), 0) })
    }
    setCa7Jours(days7)
    if (!isRefresh) setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const maxBar = Math.max(...ca7Jours.map(d => d.total), 1)

  return (
    <div className="p-5 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#1A1210]">Tableau de bord</h1>
        <p className="text-sm text-[#78726A] mt-0.5">Vue d'ensemble de votre commerce d'intrants</p>
        <div className="w-10 h-0.5 bg-[#8B6400] rounded-full mt-1 mb-0.5" />
        <p className="text-[11px] text-[#A09589] capitalize">{formatDate(new Date().toISOString())}</p>
      </div>

      {/* Stats — row 1 : CA + Bénéfices + Ventes */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Hero card — CA */}
        <div className="rounded-xl p-4 text-white relative overflow-hidden shadow-lg" style={{background: 'linear-gradient(135deg, #2D6B2D 0%, #3DAA35 100%)'}}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-white/60">CA Aujourd'hui</p>
            <Tooltip text="Voir les rapports" side="left">
              <button
                onClick={() => onNavigate?.('rapports')}
                className="w-6 h-6 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <ArrowUpRight size={13} className="text-white" />
              </button>
            </Tooltip>
          </div>
          <p className="text-2xl font-bold leading-none mb-2">{formatHTG(caAujourdhui)}</p>
          <div className="flex items-center gap-1">
            <TrendingUp size={11} className="text-white/60" />
            <p className="text-[10px] text-white/60">Mis à jour maintenant</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -right-1 -bottom-8 w-14 h-14 bg-white/10 rounded-full" />
        </div>

        {/* Bénéfices */}
        <div className="bg-white rounded-xl p-4 border border-[#D4CAB8] border-l-4 border-l-[#F59E0B] shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-amber-700">Bénéfices</p>
            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
              <TrendingUp size={13} className="text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 leading-none mb-2">{formatHTG(beneficesJour)}</p>
          <p className="text-[10px] text-amber-500">Après coût d'achat</p>
        </div>

        {/* Ventes */}
        <div className="bg-white rounded-xl p-4 border border-[#D4CAB8] border-l-4 border-l-[#3DAA35] shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-[#78726A]">Ventes du jour</p>
            <div className="w-6 h-6 bg-[#EEF7EE] rounded-full flex items-center justify-center">
              <ShoppingCart size={13} className="text-[#3DAA35]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#2C2420] leading-none mb-2">{nbVentes}</p>
          <p className="text-[10px] text-[#A09589]">transactions</p>
        </div>
      </div>

      {/* Stats — row 2 : Dépenses + Stock + Dettes + Alertes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-[#D4CAB8] border-l-4 border-l-[#DC2626] shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-red-700">Dépenses (mois)</p>
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingDown size={13} className="text-red-500" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-600 leading-none mb-1">{formatHTG(depensesMois)}</p>
          <p className="text-[10px] text-red-400">Ce mois-ci</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#D4CAB8] border-l-4 border-l-emerald-400 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-[#78726A]">Valeur stock</p>
            <div className="w-6 h-6 bg-[#F0EBE0] rounded-full flex items-center justify-center">
              <Package size={13} className="text-[#78726A]" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#2C2420] leading-none mb-1">{formatHTG(valeurStock)}</p>
          <p className="text-[10px] text-[#A09589]">{totalProduits} produits</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#D4CAB8] border-l-4 border-l-[#F59E0B] shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-[#78726A]">Dettes restantes</p>
            <div className="w-6 h-6 bg-amber-50 rounded-full flex items-center justify-center">
              <CreditCard size={13} className="text-amber-500" />
            </div>
          </div>
          <p className={`text-xl font-bold leading-none mb-1 ${dettesRestantes > 0 ? 'text-amber-600' : 'text-[#2C2420]'}`}>
            {formatHTG(dettesRestantes)}
          </p>
          <p className="text-[10px] text-[#A09589]">{dettesRestantes > 0 ? 'Emprunts actifs' : 'Aucune dette'}</p>
        </div>

        <div className={`bg-white rounded-xl p-4 border border-[#D4CAB8] border-l-4 shadow-sm ${
          stockBas.length > 0 ? 'border-l-[#DC2626]' : 'border-l-green-500'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <p className={`text-xs font-medium ${stockBas.length > 0 ? 'text-red-700' : 'text-green-700'}`}>Alertes stock</p>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${stockBas.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <AlertTriangle size={13} className={stockBas.length > 0 ? 'text-red-500' : 'text-green-500'} />
            </div>
          </div>
          <p className={`text-xl font-bold leading-none mb-1 ${stockBas.length > 0 ? 'text-red-600' : 'text-green-700'}`}>
            {stockBas.length}
          </p>
          <p className={`text-[10px] ${stockBas.length > 0 ? 'text-red-400' : 'text-green-600'}`}>
            {stockBas.length > 0 ? 'à réapprovisionner' : 'Tout est OK'}
          </p>
        </div>
      </div>

      {/* Row 2 — Chart + Last vente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#D4CAB8] p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#2C2420] flex items-center gap-2">
              <span className="w-1 h-4 bg-[#3DAA35] rounded-full" />
              CA des 7 derniers jours
            </h3>
            <p className="text-xs text-[#A09589] mt-0.5 ml-3">Évolution de vos ventes sur la semaine</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={ca7Jours} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <RechartsTooltip
                formatter={(value) => [formatHTG(Number(value)), 'CA']}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Bar
                dataKey="total"
                fill="#3DAA35"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Last vente card — blue gradient */}
        {dernieresVentes.length > 0 ? (
          <div className="rounded-xl p-5 text-white flex flex-col justify-between relative overflow-hidden shadow-lg" style={{background: 'linear-gradient(135deg, #2D6B2D 0%, #3DAA35 100%)'}}>
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Dernière vente</p>
              <p className="text-lg font-bold leading-tight mb-1">
                {dernieresVentes[0].nom_client || 'Client de passage'}
              </p>
              <p className="text-xs text-white/60">{formatTime(dernieresVentes[0].created_at)}</p>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{formatHTG(dernieresVentes[0].total)}</p>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-2 -top-6 w-16 h-16 bg-white/10 rounded-full" />
          </div>
        ) : (
          <div className="rounded-xl p-5 text-white flex flex-col items-center justify-center shadow-lg" style={{background: 'linear-gradient(135deg, #2D6B2D 0%, #3DAA35 100%)'}}>
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-3">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <p className="text-sm text-white/60 text-center">Aucune vente enregistrée aujourd'hui</p>
          </div>
        )}
      </div>

      {/* Alertes stock */}
      {stockBas.length > 0 && (
        <div className="bg-white rounded-xl border border-[#D4CAB8] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#2C2420] flex items-center gap-2">
                <span className="w-1 h-4 bg-[#DC2626] rounded-full" />
                Stock bas
              </h3>
              <p className="text-xs text-[#A09589] mt-0.5 ml-3">Produits à réapprovisionner en priorité</p>
            </div>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {stockBas.length}
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {stockBas.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-[#4A4540] truncate">{p.nom}</p>
                <span className="text-xs font-bold text-red-500 ml-2 flex-shrink-0">{p.quantite}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernières ventes list */}
      <div className="bg-white rounded-xl border border-[#D4CAB8] p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#2C2420] flex items-center gap-2">
            <span className="w-1 h-4 bg-[#3DAA35] rounded-full" />
            Dernières ventes
          </h3>
          <p className="text-xs text-[#A09589] mt-0.5 ml-3">Dernières transactions enregistrées</p>
        </div>
        {dernieresVentes.length === 0 ? (
          <p className="text-sm text-[#A09589]">Aucune vente enregistrée</p>
        ) : (
          <div className="space-y-0">
            {dernieresVentes.map((v, i) => (
              <div key={v.id} className={`flex items-center justify-between py-3 ${i < dernieresVentes.length - 1 ? 'border-b border-[#D4CAB8]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#EEF7EE] rounded-full flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={14} className="text-[#3DAA35]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#4A4540]">
                      {v.nom_client || 'Client de passage'}
                    </p>
                    <p className="text-xs text-[#A09589]">{formatTime(v.created_at)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#F59E0B]">{formatHTG(v.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
