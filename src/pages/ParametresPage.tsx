import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Eye, EyeOff, X, LogOut } from 'lucide-react'
import type { Employe } from '@/types'

const FRAIS_LABELS: { key: string; label: string }[] = [
  { key: 'frais_inscription',  label: 'Inscription' },
  { key: 'frais_formation_v1', label: 'Document' },
  { key: 'frais_formation_v2', label: 'Premier versement' },
  { key: 'frais_graduation',   label: 'Graduation' },
]

export function ParametresPage() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<'employes' | 'frais' | 'mdp' | 'infos'>('employes')
  const [employes, setEmployes] = useState<Employe[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newMdp, setNewMdp] = useState('')
  const [newRole, setNewRole] = useState<'employe' | 'admin'>('employe')
  const [showMdp, setShowMdp] = useState(false)
  const [adminMdp, setAdminMdp] = useState('')
  const [newAdminMdp, setNewAdminMdp] = useState('')
  const [confirmAdminMdp, setConfirmAdminMdp] = useState('')
  const [mdpMsg, setMdpMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Frais école
  const [fraisValues, setFraisValues] = useState<Record<string, string>>({})
  const [fraisMsg, setFraisMsg] = useState('')

  useEffect(() => {
    if (tab === 'employes') loadEmployes()
    if (tab === 'frais') loadFrais()
  }, [tab])

  const loadFrais = async () => {
    const { data } = await supabase.from('usr_config').select('key,value').in('key', FRAIS_LABELS.map(f => f.key))
    const vals: Record<string, string> = {}
    for (const r of data || []) vals[r.key] = r.value
    setFraisValues(vals)
  }

  const saveFrais = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await Promise.all(
      FRAIS_LABELS.map(({ key }) =>
        supabase.from('usr_config').upsert({ key, value: fraisValues[key] ?? '0' }, { onConflict: 'key' })
      )
    )
    setSaving(false)
    setFraisMsg('Frais mis à jour !')
    setTimeout(() => setFraisMsg(''), 2500)
  }

  const loadEmployes = async () => {
    const { data } = await supabase.from('usr_employes').select('*').eq('actif', true).order('nom')
    setEmployes(data || [])
  }

  const addEmploye = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('usr_employes').insert({ nom: newNom.trim(), mot_de_passe: newMdp.trim(), role: newRole })
    setNewNom(''); setNewMdp(''); setNewRole('employe')
    setShowAdd(false)
    setSaving(false)
    loadEmployes()
  }

  const deleteEmploye = async (id: number) => {
    if (!confirm('Désactiver cet employé ?')) return
    await supabase.from('usr_employes').update({ actif: false }).eq('id', id)
    loadEmployes()
  }

  const changerMdpAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newAdminMdp !== confirmAdminMdp) { setMdpMsg('Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    const { data: cfg } = await supabase.from('usr_config').select('value').eq('key', 'admin_password').single()
    if (cfg?.value !== adminMdp) { setMdpMsg('Mot de passe actuel incorrect'); setSaving(false); return }
    await supabase.from('usr_config').update({ value: newAdminMdp }).eq('key', 'admin_password')
    setAdminMdp(''); setNewAdminMdp(''); setConfirmAdminMdp('')
    setMdpMsg('Mot de passe mis à jour !')
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        {(['employes', 'frais', 'mdp', 'infos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors ${
              tab === t ? 'text-[#A01020] border-b-2 border-[#A01020]' : 'text-gray-400'
            }`}
          >
            {t === 'employes' ? 'Employés' : t === 'frais' ? 'Frais' : t === 'mdp' ? 'Mdp' : 'Infos'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Employés */}
        {tab === 'employes' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Comptes employés</h3>
              <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 bg-[#1B2A8A] text-white px-3 py-2 rounded-xl text-sm font-semibold">
                <Plus size={14} /> Ajouter
              </button>
            </div>

            {showAdd && (
              <form onSubmit={addEmploye} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <input type="text" value={newNom} onChange={e => setNewNom(e.target.value)} placeholder="Nom" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                <input type="text" value={newMdp} onChange={e => setNewMdp(e.target.value)} placeholder="Mot de passe" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                <select value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'employe')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="employe">Employé</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-[#A01020] text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? '...' : 'Créer'}</button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {employes.map(emp => (
                <div key={emp.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{emp.nom}</p>
                    <p className="text-xs text-gray-400">{emp.role}</p>
                  </div>
                  <button onClick={() => deleteEmploye(emp.id)} className="text-red-400 hover:text-red-600 p-1">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Frais école */}
        {tab === 'frais' && (
          <form onSubmit={saveFrais} className="space-y-4">
            <p className="text-xs text-gray-400">Ces montants s'appliquent à tous les nouveaux étudiants inscrits.</p>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              {FRAIS_LABELS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 font-semibold mb-1">{label} (HTG)</label>
                  <input
                    type="number"
                    value={fraisValues[key] ?? ''}
                    onChange={e => setFraisValues(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]"
                    min="0"
                    step="100"
                  />
                </div>
              ))}
            </div>
            {fraisMsg && <p className="text-sm text-green-600 font-semibold">{fraisMsg}</p>}
            <button type="submit" disabled={saving}
              className="w-full bg-[#A01020] text-white py-3 rounded-xl font-bold disabled:opacity-50">
              {saving ? '...' : 'Enregistrer les frais'}
            </button>
          </form>
        )}

        {/* Mot de passe admin */}
        {tab === 'mdp' && (
          <form onSubmit={changerMdpAdmin} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">Changer le mot de passe admin</h3>
            <div className="relative">
              <input type={showMdp ? 'text' : 'password'} value={adminMdp} onChange={e => setAdminMdp(e.target.value)} placeholder="Mot de passe actuel" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A] pr-10" />
              <button type="button" onClick={() => setShowMdp(!showMdp)} className="absolute right-3 top-3 text-gray-400">{showMdp ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            <input type="password" value={newAdminMdp} onChange={e => setNewAdminMdp(e.target.value)} placeholder="Nouveau mot de passe" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
            <input type="password" value={confirmAdminMdp} onChange={e => setConfirmAdminMdp(e.target.value)} placeholder="Confirmer" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
            {mdpMsg && <p className={`text-sm ${mdpMsg.includes('!') ? 'text-green-600' : 'text-red-500'}`}>{mdpMsg}</p>}
            <button type="submit" disabled={saving} className="w-full bg-[#A01020] text-white py-3 rounded-xl font-bold disabled:opacity-50">{saving ? '...' : 'Modifier'}</button>
          </form>
        )}

        {/* Infos */}
        {tab === 'infos' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
              <p className="text-sm font-semibold text-gray-700">Application</p>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Nom</span><span className="font-medium">USRH</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Version</span><span className="font-medium">1.0</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Support</span><span className="font-medium">+509 56173528</span></div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 font-semibold py-3.5 rounded-2xl">
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
