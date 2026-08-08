import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import { Users, Lock, BookOpen, Plus, CheckCircle, Phone, Pencil, Trash2 } from 'lucide-react'
import type { Employe, Succursale } from '../types'

type Tab = 'employes' | 'securite' | 'aide'

export function ParametresPage() {
  const [tab, setTab] = useState<Tab>('employes')

  // Employés
  const [employes, setEmployes] = useState<Employe[]>([])
  const [succursales, setSuccursales] = useState<Succursale[]>([])
  const [loadingEmps, setLoadingEmps] = useState(true)

  // Modal ajout / édition employé
  const [empModal, setEmpModal] = useState(false)
  const [editEmp, setEditEmp] = useState<Employe | null>(null)
  const [formNom, setFormNom] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPw, setFormPw] = useState('')
  const [formSucc, setFormSucc] = useState('')
  const [savingEmp, setSavingEmp] = useState(false)
  const [empError, setEmpError] = useState('')

  // Sécurité (admin)
  const [adminEmail, setAdminEmail] = useState('')
  const [newAdminPw, setNewAdminPw] = useState('')
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [adminMsg, setAdminMsg] = useState('')

  const tabs = [
    { key: 'employes' as Tab, label: 'Employés', icon: Users },
    { key: 'securite' as Tab, label: 'Sécurité', icon: Lock },
    { key: 'aide' as Tab, label: 'Aide', icon: BookOpen },
  ]

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoadingEmps(true)
    const [{ data: emps }, { data: succs }, { data: cfg }] = await Promise.all([
      supabase.from('mla_employes').select('*, succursale:mla_succursales(id, nom)').order('nom'),
      supabase.from('mla_succursales').select('*').eq('actif', true).order('nom'),
      supabase.from('mla_config').select('valeur').eq('id', 'admin_email').single(),
    ])
    setEmployes(emps || [])
    setSuccursales(succs || [])
    setAdminEmail(cfg?.valeur || '')
    setLoadingEmps(false)
  }

  const openNew = () => {
    setEditEmp(null)
    setFormNom(''); setFormEmail(''); setFormPw(''); setFormSucc(succursales[0]?.id || '')
    setEmpError(''); setEmpModal(true)
  }

  const openEdit = (e: Employe) => {
    setEditEmp(e)
    setFormNom(e.nom); setFormEmail(e.email || ''); setFormPw(''); setFormSucc(e.succursale_id || '')
    setEmpError(''); setEmpModal(true)
  }

  const saveEmploye = async () => {
    if (!formNom.trim()) { setEmpError('Le nom est requis'); return }
    if (!formEmail.trim()) { setEmpError("L'email est requis"); return }
    if (!editEmp && !formPw.trim()) { setEmpError('Le mot de passe est requis'); return }
    if (!formSucc) { setEmpError('La succursale est requise'); return }
    setSavingEmp(true); setEmpError('')
    const payload: Record<string, unknown> = {
      nom: formNom.trim(),
      email: formEmail.trim().toLowerCase(),
      succursale_id: formSucc,
      actif: true,
    }
    if (formPw.trim()) payload.mot_de_passe = formPw.trim()
    if (editEmp) {
      const { error } = await supabase.from('mla_employes').update(payload).eq('id', editEmp.id)
      if (error) { setEmpError(error.message); setSavingEmp(false); return }
    } else {
      const { error } = await supabase.from('mla_employes').insert(payload)
      if (error) { setEmpError(error.message.includes('unique') ? 'Cet email est déjà utilisé' : error.message); setSavingEmp(false); return }
    }
    setSavingEmp(false); setEmpModal(false)
    await loadData()
  }

  const deleteEmploye = async (id: string) => {
    await supabase.from('mla_employes').delete().eq('id', id)
    setEmployes(prev => prev.filter(e => e.id !== id))
  }

  const saveAdmin = async () => {
    setSavingAdmin(true)
    if (adminEmail.trim()) {
      await supabase.from('mla_config').upsert({ id: 'admin_email', valeur: adminEmail.trim().toLowerCase() })
    }
    if (newAdminPw.trim().length >= 4) {
      await supabase.from('mla_config').upsert({ id: 'admin_password', valeur: newAdminPw.trim() })
    }
    setSavingAdmin(false)
    setNewAdminPw('')
    setAdminMsg('Paramètres administrateur mis à jour ✓')
    setTimeout(() => setAdminMsg(''), 3000)
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-24">
      <h2 className="text-2xl font-black tracking-tight text-[#1A1210]">Paramètres</h2>
      <div className="w-10 h-0.5 bg-[#8B6400] rounded-full mt-1 mb-2" />

      {/* Tabs */}
      <div className="flex gap-1 bg-[#E8E0D0] rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === key ? 'bg-white text-[#2D6B2D] shadow-sm' : 'text-[#78726A]'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── EMPLOYÉS ────────────────────────────────────────────────────────── */}
      {tab === 'employes' && (
        <div className="space-y-3">
          <button
            onClick={openNew}
            className="w-full flex items-center justify-center gap-2 bg-[#2D6B2D] hover:bg-[#1E4E1E] text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            <Plus size={16} /> Ajouter un compte employé
          </button>

          {loadingEmps ? (
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          ) : employes.length === 0 ? (
            <Card>
              <p className="text-sm text-[#A09589] text-center py-4">Aucun compte employé configuré</p>
            </Card>
          ) : (
            employes.map(e => {
              const succ = Array.isArray(e.succursale) ? e.succursale[0] : e.succursale
              return (
                <Card key={e.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${e.actif ? 'bg-[#EEF7EE] text-[#2D6B2D]' : 'bg-[#F0EBE0] text-[#A09589]'}`}>
                        {e.nom.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#2C2420] truncate">{e.nom}</p>
                        <p className="text-[11px] text-[#A09589] truncate">{e.email || 'Pas d\'email'}</p>
                        {succ?.nom && (
                          <p className="text-[10px] font-semibold text-[#3DAA35]">{succ.nom}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openEdit(e)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#EEF7EE] text-[#2D6B2D] hover:bg-[#D6EED6] transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteEmploye(e.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FEF2F2] text-red-300 hover:text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ── SÉCURITÉ ────────────────────────────────────────────────────────── */}
      {tab === 'securite' && (
        <div className="space-y-4">
          {adminMsg && (
            <div className="flex items-center gap-2 bg-[#EEF7EE] border border-[#3DAA35] rounded-xl px-4 py-2.5 text-sm text-[#2D6B2D] font-medium">
              <CheckCircle size={15} className="text-[#3DAA35]" /> {adminMsg}
            </div>
          )}
          <Card>
            <p className="text-xs font-semibold text-[#78726A] uppercase tracking-wide mb-3">Compte Administrateur</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#78726A] mb-1">Email admin</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="email@domaine.com"
                  className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#78726A] mb-1">Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                <input
                  type="password"
                  value={newAdminPw}
                  onChange={e => setNewAdminPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
                />
              </div>
              <Button variant="primary" fullWidth onClick={saveAdmin} loading={savingAdmin}>
                Enregistrer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── AIDE ────────────────────────────────────────────────────────────── */}
      {tab === 'aide' && (
        <div className="space-y-3">
          <Card>
            <p className="text-xs font-semibold text-[#78726A] uppercase tracking-wide mb-4">Guide d'utilisation</p>
            <div className="space-y-4">
              {[
                { n: '01', titre: 'Faire une vente', texte: 'Ventes → Taper le nom du produit → Sélectionner → Entrer la quantité → Ajouter → Valider.' },
                { n: '02', titre: 'Ajouter un produit', texte: 'Stock → "Nouveau produit" → Remplir nom, catégorie, coût, prix, quantité → Enregistrer.' },
                { n: '03', titre: 'Enregistrer un achat', texte: 'Achats → Fournisseur → Produit → Quantité + Prix → Confirmer. Stock mis à jour automatiquement.' },
                { n: '04', titre: 'Voir les rapports', texte: 'Rapports → Choisir la période → Consulter CA, bénéfices, top produits.' },
                { n: '05', titre: 'Créer un compte employé', texte: 'Paramètres → Employés → "Ajouter" → Saisir nom, email, mot de passe et succursale.' },
              ].map(({ n, titre, texte }) => (
                <div key={n} className="flex gap-3">
                  <span className="text-[10px] font-black text-[#3DAA35] bg-[#EEF7EE] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#2C2420] mb-0.5">{titre}</p>
                    <p className="text-xs text-[#78726A] leading-relaxed">{texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-xs font-semibold text-[#78726A] uppercase tracking-wide mb-3">Support technique</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#EEF7EE] rounded-full flex items-center justify-center">
                <Phone size={18} className="text-[#3DAA35]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2C2420]">Toussaint Roodeley</p>
                <p className="text-xs text-[#78726A]">Développeur — LWAI</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL EMPLOYÉ ───────────────────────────────────────────────────── */}
      <Modal
        open={empModal}
        onClose={() => setEmpModal(false)}
        title={editEmp ? 'Modifier le compte' : 'Nouveau compte employé'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-1.5">Nom *</label>
            <input type="text" value={formNom} onChange={e => setFormNom(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="Prénom Nom" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-1.5">Email *</label>
            <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="email@domaine.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-1.5">
              Mot de passe {editEmp && <span className="font-normal text-[#A09589]">(laisser vide pour ne pas changer)</span>}
            </label>
            <input type="password" value={formPw} onChange={e => setFormPw(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35]"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4A4540] mb-1.5">Succursale *</label>
            <select value={formSucc} onChange={e => setFormSucc(e.target.value)}
              className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] bg-white">
              <option value="">Choisir une succursale...</option>
              {succursales.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          {empError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{empError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" fullWidth onClick={() => setEmpModal(false)}>Annuler</Button>
            <Button variant="primary" fullWidth loading={savingEmp} onClick={saveEmploye}>
              {editEmp ? 'Modifier' : 'Créer le compte'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
