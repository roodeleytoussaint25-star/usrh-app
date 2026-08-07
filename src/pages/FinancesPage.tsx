import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { formatHTG, formatDate } from '../lib/utils'
import { Plus, X, TrendingDown, CreditCard, TrendingUp } from 'lucide-react'
import type { Depense, DepenseCategorie, Emprunt, PaiementEmprunt, Investissement } from '../types'

type Onglet = 'depenses' | 'emprunts' | 'investissements'

const CATEGORIES: { value: DepenseCategorie; label: string }[] = [
  { value: 'loyer', label: 'Loyer' },
  { value: 'salaires', label: 'Salaires' },
  { value: 'transport', label: 'Transport' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'eau', label: 'Eau' },
  { value: 'stockage', label: 'Stockage' },
  { value: 'autres', label: 'Autres' },
]

interface EmpruntAvecPaiements extends Emprunt {
  paiements: PaiementEmprunt[]
  showPaiements: boolean
}

export function FinancesPage() {
  const [onglet, setOnglet] = useState<Onglet>('depenses')
  const [loading, setLoading] = useState(true)

  // Dépenses
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [showAddDepense, setShowAddDepense] = useState(false)
  const [depCategorie, setDepCategorie] = useState<DepenseCategorie>('autres')
  const [depDescription, setDepDescription] = useState('')
  const [depMontant, setDepMontant] = useState('')
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0])

  // Emprunts
  const [emprunts, setEmprunts] = useState<EmpruntAvecPaiements[]>([])
  const [showAddEmprunt, setShowAddEmprunt] = useState(false)
  const [empSource, setEmpSource] = useState('')
  const [empDescription, setEmpDescription] = useState('')
  const [empMontant, setEmpMontant] = useState('')
  const [empDate, setEmpDate] = useState(new Date().toISOString().split('T')[0])
  const [paiementEmpruntId, setPaiementEmpruntId] = useState<string | null>(null)
  const [paiementMontant, setPaiementMontant] = useState('')
  const [paiementDate, setPaiementDate] = useState(new Date().toISOString().split('T')[0])

  // Investissements
  const [investissements, setInvestissements] = useState<Investissement[]>([])
  const [showAddInvest, setShowAddInvest] = useState(false)
  const [invDescription, setInvDescription] = useState('')
  const [invMontant, setInvMontant] = useState('')
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0])
  const [invNotes, setInvNotes] = useState('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: dep }, { data: emp }, { data: inv }, { data: paie }] = await Promise.all([
      supabase.from('mla_depenses').select('*').order('date_depense', { ascending: false }),
      supabase.from('mla_emprunts').select('*').order('created_at', { ascending: false }),
      supabase.from('mla_investissements').select('*').order('date_investissement', { ascending: false }),
      supabase.from('mla_paiements_emprunt').select('*').order('date_paiement', { ascending: false }),
    ])
    setDepenses((dep || []) as Depense[])
    setInvestissements((inv || []) as Investissement[])
    const paiements = (paie || []) as PaiementEmprunt[]
    setEmprunts(((emp || []) as Emprunt[]).map(e => ({
      ...e,
      paiements: paiements.filter(p => p.emprunt_id === e.id),
      showPaiements: false,
    })))
    setLoading(false)
  }

  const ajouterDepense = async () => {
    if (!depMontant) return
    setSaving(true)
    const { data } = await supabase.from('mla_depenses').insert({
      categorie: depCategorie,
      description: depDescription || null,
      montant: parseFloat(depMontant),
      date_depense: depDate,
    }).select().single()
    if (data) {
      setDepenses(prev => [data as Depense, ...prev])
      setShowAddDepense(false)
      setDepDescription('')
      setDepMontant('')
    }
    setSaving(false)
  }

  const ajouterEmprunt = async () => {
    if (!empSource || !empMontant) return
    setSaving(true)
    const montant = parseFloat(empMontant)
    const { data } = await supabase.from('mla_emprunts').insert({
      source: empSource,
      description: empDescription || null,
      montant_initial: montant,
      montant_restant: montant,
      date_debut: empDate,
      statut: 'actif',
    }).select().single()
    if (data) {
      setEmprunts(prev => [{ ...(data as Emprunt), paiements: [], showPaiements: false }, ...prev])
      setShowAddEmprunt(false)
      setEmpSource('')
      setEmpDescription('')
      setEmpMontant('')
    }
    setSaving(false)
  }

  const ajouterPaiement = async (empruntId: string) => {
    if (!paiementMontant) return
    setSaving(true)
    const montant = parseFloat(paiementMontant)
    const { data } = await supabase.from('mla_paiements_emprunt').insert({
      emprunt_id: empruntId,
      montant,
      date_paiement: paiementDate,
    }).select().single()
    if (data) {
      const emprunt = emprunts.find(e => e.id === empruntId)
      if (emprunt) {
        const nouveauRestant = Math.max(0, emprunt.montant_restant - montant)
        const nouveauStatut = nouveauRestant <= 0 ? 'rembourse' : 'actif'
        await supabase.from('mla_emprunts').update({ montant_restant: nouveauRestant, statut: nouveauStatut }).eq('id', empruntId)
        setEmprunts(prev => prev.map(e => e.id === empruntId
          ? { ...e, montant_restant: nouveauRestant, statut: nouveauStatut, paiements: [data as PaiementEmprunt, ...e.paiements] }
          : e
        ))
      }
      setPaiementEmpruntId(null)
      setPaiementMontant('')
    }
    setSaving(false)
  }

  const ajouterInvestissement = async () => {
    if (!invDescription || !invMontant) return
    setSaving(true)
    const { data } = await supabase.from('mla_investissements').insert({
      description: invDescription,
      montant: parseFloat(invMontant),
      date_investissement: invDate,
      notes: invNotes || null,
    }).select().single()
    if (data) {
      setInvestissements(prev => [data as Investissement, ...prev])
      setShowAddInvest(false)
      setInvDescription('')
      setInvMontant('')
      setInvNotes('')
    }
    setSaving(false)
  }

  const totalDepensesMois = depenses
    .filter(d => d.date_depense >= new Date().toISOString().slice(0, 7))
    .reduce((s, d) => s + d.montant, 0)
  const totalDettes = emprunts.filter(e => e.statut === 'actif').reduce((s, e) => s + e.montant_restant, 0)
  const totalInvest = investissements.reduce((s, i) => s + i.montant, 0)

  if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-5 bg-[#8B6400] rounded-sm" />
          <h1 className="text-xl font-bold tracking-tight text-[#1A1210]">Finances</h1>
        </div>
        <p className="text-[11px] text-[#A09589] mt-0.5 pl-3.5">Dépenses, emprunts et investissements</p>
      </div>

      {/* Cards résumé */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 border-l-4 border-l-[#DC2626]">
          <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center mb-2">
            <TrendingDown size={14} className="text-red-600" />
          </div>
          <p className="text-[11px] text-[#78726A] leading-tight">Dépenses (mois)</p>
          <p className="text-sm font-bold text-red-600">{formatHTG(totalDepensesMois)}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-[#F59E0B]">
          <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center mb-2">
            <CreditCard size={14} className="text-[#F59E0B]" />
          </div>
          <p className="text-[11px] text-[#78726A] leading-tight">Dettes restantes</p>
          <p className="text-sm font-bold text-[#F59E0B]">{formatHTG(totalDettes)}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-[#3DAA35]">
          <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center mb-2">
            <TrendingUp size={14} className="text-[#3DAA35]" />
          </div>
          <p className="text-[11px] text-[#78726A] leading-tight">Investissements</p>
          <p className="text-sm font-bold text-[#8B6400]">{formatHTG(totalInvest)}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#E8E0D0] rounded-lg p-1">
        {(['depenses', 'emprunts', 'investissements'] as Onglet[]).map(tab => (
          <button
            key={tab}
            onClick={() => setOnglet(tab)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all capitalize ${
              onglet === tab ? 'bg-white text-[#2C2420] shadow-sm' : 'text-[#78726A]'
            }`}
          >
            {tab === 'depenses' ? 'Dépenses' : tab === 'emprunts' ? 'Emprunts' : 'Investissements'}
          </button>
        ))}
      </div>

      {/* ---- DÉPENSES ---- */}
      {onglet === 'depenses' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddDepense(true)} size="sm">
              <Plus size={14} className="mr-1" /> Ajouter
            </Button>
          </div>

          {showAddDepense && (
            <Card className="p-4 border-red-200 bg-red-50">
              <h4 className="font-semibold text-sm text-red-700 mb-3">Nouvelle dépense</h4>
              <select
                value={depCategorie}
                onChange={e => setDepCategorie(e.target.value as DepenseCategorie)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input
                type="text"
                value={depDescription}
                onChange={e => setDepDescription(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Description (optionnel)"
              />
              <input
                type="number" min="0" step="0.01"
                value={depMontant}
                onChange={e => setDepMontant(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Montant (HTG)"
              />
              <input
                type="date"
                value={depDate}
                onChange={e => setDepDate(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-3"
              />
              <div className="flex gap-2">
                <Button onClick={ajouterDepense} disabled={saving} size="sm" className="flex-1">Enregistrer</Button>
                <button onClick={() => setShowAddDepense(false)} className="px-3 py-1.5 text-sm text-[#78726A] hover:bg-[#F0EBE0] rounded-lg"><X size={15} /></button>
              </div>
            </Card>
          )}

          {depenses.length === 0 ? (
            <Card className="p-6 text-center"><p className="text-[#A09589] text-sm">Aucune dépense enregistrée</p></Card>
          ) : (
            depenses.map(d => (
              <Card key={d.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="inline-block text-[10px] bg-[#F0EBE0] text-[#78726A] font-semibold px-2 py-0.5 rounded-full uppercase mb-0.5">
                      {CATEGORIES.find(c => c.value === d.categorie)?.label || d.categorie}
                    </span>
                    {d.description && <p className="text-sm text-[#4A4540]">{d.description}</p>}
                    <p className="text-xs text-[#A09589]">{formatDate(d.date_depense)}</p>
                  </div>
                  <p className="font-bold text-red-600">{formatHTG(d.montant)}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ---- EMPRUNTS ---- */}
      {onglet === 'emprunts' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddEmprunt(true)} size="sm">
              <Plus size={14} className="mr-1" /> Ajouter
            </Button>
          </div>

          {showAddEmprunt && (
            <Card className="p-4 border-green-200 bg-[#EEF7EE]">
              <h4 className="font-semibold text-sm text-[#F59E0B] mb-3">Nouvel emprunt</h4>
              <input
                type="text"
                value={empSource}
                onChange={e => setEmpSource(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Source (banque, mutuelle, famille...)"
              />
              <input
                type="text"
                value={empDescription}
                onChange={e => setEmpDescription(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Description (optionnel)"
              />
              <input
                type="number" min="0" step="0.01"
                value={empMontant}
                onChange={e => setEmpMontant(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Montant emprunté (HTG)"
              />
              <input
                type="date"
                value={empDate}
                onChange={e => setEmpDate(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-3"
              />
              <div className="flex gap-2">
                <Button onClick={ajouterEmprunt} disabled={saving} size="sm" className="flex-1">Enregistrer</Button>
                <button onClick={() => setShowAddEmprunt(false)} className="px-3 py-1.5 text-sm text-[#78726A] hover:bg-[#F0EBE0] rounded-lg"><X size={15} /></button>
              </div>
            </Card>
          )}

          {emprunts.length === 0 ? (
            <Card className="p-6 text-center"><p className="text-[#A09589] text-sm">Aucun emprunt enregistré</p></Card>
          ) : (
            emprunts.map(e => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[#2C2420]">{e.source}</p>
                    {e.description && <p className="text-xs text-[#78726A]">{e.description}</p>}
                    <p className="text-xs text-[#A09589]">Depuis le {formatDate(e.date_debut)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${e.statut === 'actif' ? 'bg-amber-100 text-[#F59E0B]' : 'bg-green-100 text-green-700'}`}>
                    {e.statut === 'actif' ? 'Actif' : 'Remboursé'}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-[#78726A]">Initial: {formatHTG(e.montant_initial)}</span>
                  <span className="font-bold text-[#F59E0B]">Restant: {formatHTG(e.montant_restant)}</span>
                </div>
                {/* Barre de progression */}
                <div className="w-full bg-[#F0EBE0] rounded-full h-1.5 mb-3">
                  <div
                    className="bg-[#EEF7EE]0 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.round(((e.montant_initial - e.montant_restant) / e.montant_initial) * 100)}%` }}
                  />
                </div>
                {e.statut === 'actif' && (
                  <>
                    {paiementEmpruntId === e.id ? (
                      <div className="bg-[#FAF7F2] rounded-lg p-3 space-y-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={paiementMontant}
                          onChange={ev => setPaiementMontant(ev.target.value)}
                          className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm"
                          placeholder="Montant payé (HTG)"
                        />
                        <input
                          type="date"
                          value={paiementDate}
                          onChange={ev => setPaiementDate(ev.target.value)}
                          className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => ajouterPaiement(e.id)} disabled={saving} size="sm" className="flex-1">Confirmer</Button>
                          <button onClick={() => setPaiementEmpruntId(null)} className="px-3 text-[#78726A] hover:bg-[#F0EBE0] rounded-lg"><X size={15} /></button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPaiementEmpruntId(e.id)}
                        className="text-xs text-[#3DAA35] font-semibold hover:underline"
                      >
                        + Enregistrer un paiement
                      </button>
                    )}
                  </>
                )}
                {e.paiements.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#D4CAB8] space-y-1">
                    {e.paiements.slice(0, 3).map(p => (
                      <div key={p.id} className="flex justify-between text-xs text-[#78726A]">
                        <span>{formatDate(p.date_paiement)}</span>
                        <span className="text-[#F59E0B] font-semibold">-{formatHTG(p.montant)}</span>
                      </div>
                    ))}
                    {e.paiements.length > 3 && (
                      <p className="text-xs text-[#A09589]">{e.paiements.length - 3} autre(s) paiement(s)</p>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* ---- INVESTISSEMENTS ---- */}
      {onglet === 'investissements' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddInvest(true)} size="sm">
              <Plus size={14} className="mr-1" /> Ajouter
            </Button>
          </div>

          {showAddInvest && (
            <Card className="p-4 border-green-200 bg-[#EEF7EE]">
              <h4 className="font-semibold text-sm text-[#8B6400] mb-3">Nouvel investissement</h4>
              <input
                type="text"
                value={invDescription}
                onChange={e => setInvDescription(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Description (équipement, stock, autre...)"
              />
              <input
                type="number" min="0" step="0.01"
                value={invMontant}
                onChange={e => setInvMontant(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
                placeholder="Montant (HTG)"
              />
              <input
                type="date"
                value={invDate}
                onChange={e => setInvDate(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-2"
              />
              <input
                type="text"
                value={invNotes}
                onChange={e => setInvNotes(e.target.value)}
                className="w-full border border-[#D4CAB8] rounded-lg px-3 py-2 text-sm mb-3"
                placeholder="Notes (optionnel)"
              />
              <div className="flex gap-2">
                <Button onClick={ajouterInvestissement} disabled={saving} size="sm" className="flex-1">Enregistrer</Button>
                <button onClick={() => setShowAddInvest(false)} className="px-3 py-1.5 text-sm text-[#78726A] hover:bg-[#F0EBE0] rounded-lg"><X size={15} /></button>
              </div>
            </Card>
          )}

          {investissements.length === 0 ? (
            <Card className="p-6 text-center"><p className="text-[#A09589] text-sm">Aucun investissement enregistré</p></Card>
          ) : (
            investissements.map(i => (
              <Card key={i.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#2C2420]">{i.description}</p>
                    {i.notes && <p className="text-xs text-[#78726A]">{i.notes}</p>}
                    <p className="text-xs text-[#A09589]">{formatDate(i.date_investissement)}</p>
                  </div>
                  <p className="font-bold text-[#8B6400]">{formatHTG(i.montant)}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
