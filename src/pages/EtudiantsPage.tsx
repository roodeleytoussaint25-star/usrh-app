import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, GraduationCap, Pencil, Trash2, X,
  Phone, Check, Users, CreditCard, Clock, AlertCircle, CheckCircle,
  Mail, MapPin, StickyNote, Calendar, BookOpen, Clock3, UserCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import type { Etudiant, Cours } from '@/types'

type TypeFrais = 'inscription' | 'formation_v1' | 'formation_v2' | 'graduation'

const FRAIS_CONFIG = [
  { type: 'inscription'  as TypeFrais, label: 'Inscr.',    fullLabel: 'Inscription',      key: 'frais_inscription'  as keyof Etudiant, paye: 'frais_inscription_paye'  as keyof Etudiant },
  { type: 'formation_v1' as TypeFrais, label: 'Doc.',      fullLabel: 'Document',          key: 'frais_formation_v1' as keyof Etudiant, paye: 'frais_formation_v1_paye' as keyof Etudiant },
  { type: 'formation_v2' as TypeFrais, label: '1er Vers.', fullLabel: 'Premier versement', key: 'frais_formation_v2' as keyof Etudiant, paye: 'frais_formation_v2_paye' as keyof Etudiant },
  { type: 'graduation'   as TypeFrais, label: 'Diplôme',   fullLabel: 'Graduation',        key: 'frais_graduation'   as keyof Etudiant, paye: 'frais_graduation_paye'   as keyof Etudiant },
]

const fmt = (n: number) => n.toLocaleString('fr-HT') + ' HTG'
const getInitials = (nom: string) => nom.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

function DOBPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parse = (v: string) => {
    if (!v) return { y: '', m: '', d: '' }
    const p = v.split('-')
    return { y: p[0] || '', m: p[1] ? String(parseInt(p[1])) : '', d: p[2] ? String(parseInt(p[2])) : '' }
  }
  const [y, setY] = useState(() => parse(value).y)
  const [m, setM] = useState(() => parse(value).m)
  const [d, setD] = useState(() => parse(value).d)

  useEffect(() => {
    const p = parse(value)
    setY(p.y); setM(p.m); setD(p.d)
  }, [value])

  const commit = (ny: string, nm: string, nd: string) => {
    setY(ny); setM(nm); setD(nd)
    if (ny && nm && nd) onChange(`${ny}-${nm.padStart(2, '0')}-${nd.padStart(2, '0')}`)
    else if (!ny && !nm && !nd) onChange('')
  }
  const thisYear = new Date().getFullYear()
  const cls = "flex-1 bg-white border border-[#E8E2DC] rounded-xl px-2 py-3 text-sm focus:outline-none focus:border-[#1B2A8A] appearance-none"
  return (
    <div className="flex gap-2">
      <select value={d} onChange={e => commit(y, m, e.target.value)} className={cls}>
        <option value="">Jour</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map(v => <option key={v} value={String(v)}>{v}</option>)}
      </select>
      <select value={m} onChange={e => commit(y, e.target.value, d)} className={cls}>
        <option value="">Mois</option>
        {['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'].map((name, i) =>
          <option key={i + 1} value={String(i + 1)}>{name}</option>
        )}
      </select>
      <select value={y} onChange={e => commit(e.target.value, m, d)} className={cls}>
        <option value="">Année</option>
        {Array.from({ length: thisYear - 1939 }, (_, i) => thisYear - i).map(v => <option key={v} value={String(v)}>{v}</option>)}
      </select>
    </div>
  )
}

// ─────────────────────────────────────────────
// VUE COURS — matières du cursus
// ─────────────────────────────────────────────
function CoursView() {
  const { showToast } = useToast()
  const [cours, setCours] = useState<Cours[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Cours | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const emptyForm = { nom: '', horaire: '', duree: '', professeur: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('usr_cours').select('*').eq('actif', true).order('nom')
    setCours(data || [])
    setLoading(false)
  }

  const openCreate = () => { setForm(emptyForm); setShowForm(true) }
  const openEdit = (c: Cours) => {
    setEditData(c)
    setForm({ nom: c.nom, horaire: c.horaire || '', duree: c.duree || '', professeur: c.professeur || '' })
  }

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom.trim()) return
    setSaving(true)
    const payload = {
      nom:        form.nom.trim(),
      horaire:    form.horaire.trim()    || null,
      duree:      form.duree.trim()      || null,
      professeur: form.professeur.trim() || null,
    }
    if (editData) {
      await supabase.from('usr_cours').update(payload).eq('id', editData.id)
      showToast('Cours mis à jour')
      setEditData(null)
    } else {
      await supabase.from('usr_cours').insert(payload)
      showToast('Cours créé')
      setShowForm(false)
    }
    setSaving(false)
    load()
  }

  const archiver = async (id: number) => {
    await supabase.from('usr_cours').update({ actif: false }).eq('id', id)
    setCours(prev => prev.filter(c => c.id !== id))
    setConfirmDeleteId(null)
    showToast('Cours archivé')
  }

  const inputCls = "w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]"

  if (loading) return (
    <div className="px-4 pt-4 space-y-3">
      {[1,2].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-[#F0EDE8]" />)}
    </div>
  )

  const formModal = (isEdit: boolean) => (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
      onClick={e => { if (e.target === e.currentTarget) { isEdit ? setEditData(null) : setShowForm(false) } }}>
      <form onSubmit={saveForm} className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[85vh] overflow-auto">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 pt-3 pb-4">
          <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Modifier le cours' : 'Nouveau cours'}</h3>
          <button type="button" onClick={() => isEdit ? setEditData(null) : setShowForm(false)}
            className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        <div className="px-5 space-y-4 pb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom du cours *</label>
            <input type="text" value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))}
              placeholder="Ex: Sécurité rapprochée niveau 1" required autoFocus className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Professeur / Instructeur</label>
            <input type="text" value={form.professeur} onChange={e => setForm(f => ({...f, professeur: e.target.value}))}
              placeholder="Ex: Jean-Pierre Dumont" className={inputCls} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horaire</label>
              <input type="text" value={form.horaire} onChange={e => setForm(f => ({...f, horaire: e.target.value}))}
                placeholder="Ex: Lun-Mer 8h-12h" className={inputCls} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Durée</label>
              <input type="text" value={form.duree} onChange={e => setForm(f => ({...f, duree: e.target.value}))}
                placeholder="Ex: 3 mois" className={inputCls} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-[#1B2A8A] text-white font-bold py-4 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md mt-2">
            {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le cours'}
          </button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="flex flex-col overflow-auto">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={17} className="text-[#1B2A8A]" />
          <span className="text-sm font-bold text-gray-900">Cours du cursus ({cours.length})</span>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 bg-[#1B2A8A] text-white px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-transform">
          <Plus size={13} />Nouveau cours
        </button>
      </div>

      <div className="px-4 pb-6 space-y-3">
        {cours.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#F0EDE8]">
            <div className="w-12 h-12 rounded-2xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={22} className="text-[#1B2A8A]/40" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Aucun cours créé</p>
            <p className="text-xs text-gray-400 mt-1">Ajoutez les matières du cursus</p>
          </div>
        )}

        {cours.map((c, idx) => (
          <div key={c.id} className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm overflow-hidden animate-card-in" style={{ animationDelay: `${Math.min(idx, 6) * 20}ms` }}>
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1B2A8A] flex items-center justify-center flex-shrink-0">
                  <BookOpen size={17} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{c.nom}</p>
                  {c.professeur && (
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <UserCheck size={10} className="text-[#1B2A8A]" />{c.professeur}
                    </p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {c.horaire && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock3 size={10} />{c.horaire}
                      </span>
                    )}
                    {c.duree && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />{c.duree}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex border-t border-[#F0EDE8]">
              <button onClick={() => openEdit(c)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] text-gray-500 font-semibold active:bg-gray-50">
                <Pencil size={11} />Modifier
              </button>
              <div className="w-px bg-[#F0EDE8]" />
              <button onClick={() => setConfirmDeleteId(c.id)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] text-red-400 font-semibold active:bg-red-50">
                <Trash2 size={11} />Archiver
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && formModal(false)}
      {editData && formModal(true)}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <p className="font-bold text-gray-900 text-center mb-2">Archiver ce cours ?</p>
            <p className="text-sm text-gray-400 text-center mb-6">Il ne sera plus visible dans la liste.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-[#E8E2DC] text-gray-600 py-3 rounded-2xl text-sm font-semibold">Annuler</button>
              <button onClick={() => archiver(confirmDeleteId)}
                className="flex-1 bg-red-500 text-white py-3 rounded-2xl text-sm font-bold">Archiver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────
interface Props { onPayEtudiant: (id: number, fraisType?: TypeFrais) => void }

export function EtudiantsPage({ onPayEtudiant }: Props) {
  const { } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'etudiants' | 'cours'>('etudiants')

  const [etudiants, setEtudiants]       = useState<Etudiant[]>([])
  const [fraisConfig, setFraisConfig]   = useState<Record<string, number>>({})
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [saving, setSaving]             = useState(false)
  const [filterStatus, setFilterStatus] = useState<'tous' | 'retards' | 'ajour'>('tous')
  const [sortBy, setSortBy]             = useState<'az' | 'dette'>('az')

  const [showForm, setShowForm]           = useState(false)
  const [formNom, setFormNom]             = useState('')
  const [formContact, setFormContact]     = useState('')
  const [formEmail, setFormEmail]         = useState('')
  const [formSexe, setFormSexe]           = useState<'M' | 'F' | ''>('')
  const [formNaissance, setFormNaissance] = useState('')
  const [formAdresse, setFormAdresse]     = useState('')
  const [formUrgence, setFormUrgence]     = useState('')
  const [formNotes, setFormNotes]         = useState('')

  const [editData, setEditData]               = useState<Etudiant | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [selectedEtudiant, setSelectedEtudiant] = useState<Etudiant | null>(null)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [etuRes, cfgRes] = await Promise.all([
      supabase.from('usr_etudiants').select('*').eq('actif', true).order('nom'),
      supabase.from('usr_config').select('key,value').in('key', ['frais_inscription','frais_formation_v1','frais_formation_v2','frais_graduation']),
    ])
    setEtudiants(etuRes.data || [])
    const cfg: Record<string, number> = {}
    for (const r of cfgRes.data || []) cfg[r.key] = parseFloat(r.value) || 0
    setFraisConfig(cfg)
    setLoading(false)
  }

  const ajouterEtudiant = async (e: React.FormEvent) => {
    e.preventDefault()
    const nom = formNom.trim()
    if (!nom) return
    setSaving(true)
    await supabase.from('usr_etudiants').insert({
      nom,
      contact:          formContact.trim() || null,
      email:            formEmail.trim()   || null,
      sexe:             formSexe           || null,
      date_naissance:   formNaissance      || null,
      adresse:          formAdresse.trim() || null,
      contact_urgence:  formUrgence.trim() || null,
      notes:            formNotes.trim()   || null,
      frais_inscription:  fraisConfig['frais_inscription']  ?? 5000,
      frais_formation_v1: fraisConfig['frais_formation_v1'] ?? 30000,
      frais_formation_v2: fraisConfig['frais_formation_v2'] ?? 30000,
      frais_graduation:   fraisConfig['frais_graduation']   ?? 0,
    })
    setSaving(false)
    setFormNom(''); setFormContact(''); setFormEmail(''); setFormSexe('')
    setFormNaissance(''); setFormAdresse(''); setFormUrgence(''); setFormNotes('')
    setShowForm(false)
    showToast(`${nom} inscrit`)
    loadAll()
  }

  const saveEdit = async () => {
    if (!editData) return
    setSaving(true)
    await supabase.from('usr_etudiants').update({
      nom:             editData.nom.trim(),
      contact:         editData.contact         || null,
      email:           editData.email           || null,
      sexe:            editData.sexe            || null,
      date_naissance:  editData.date_naissance  || null,
      adresse:         editData.adresse         || null,
      contact_urgence: editData.contact_urgence || null,
      notes:           editData.notes           || null,
    }).eq('id', editData.id)
    setSaving(false)
    setEditData(null)
    showToast('Étudiant mis à jour')
    loadAll()
  }

  const deleteEtudiant = async (id: number) => {
    await supabase.from('usr_etudiants').update({ actif: false }).eq('id', id)
    setEtudiants(prev => prev.filter(e => e.id !== id))
    setConfirmDeleteId(null)
    showToast('Étudiant archivé')
  }

  const getDette = (e: Etudiant) =>
    Math.max(0, e.frais_inscription  - e.frais_inscription_paye)  +
    Math.max(0, e.frais_formation_v1 - e.frais_formation_v1_paye) +
    Math.max(0, e.frais_formation_v2 - e.frais_formation_v2_paye) +
    Math.max(0, (e.frais_graduation || 0) - (e.frais_graduation_paye || 0))

  const getStatus = (e: Etudiant) => {
    const dette = getDette(e)
    if (dette === 0) return 'paid'
    const totalPaye = e.frais_inscription_paye + e.frais_formation_v1_paye + e.frais_formation_v2_paye + (e.frais_graduation_paye || 0)
    return totalPaye > 0 ? 'partial' : 'unpaid'
  }

  const nbRetards = etudiants.filter(e => getDette(e) > 0).length

  const filtered = etudiants
    .filter(e => {
      if (search && !e.nom.toLowerCase().includes(search.toLowerCase())) return false
      if (filterStatus === 'retards') return getDette(e) > 0
      if (filterStatus === 'ajour')   return getDette(e) === 0
      return true
    })
    .sort((a, b) => sortBy === 'dette' ? getDette(b) - getDette(a) : a.nom.localeCompare(b.nom))

  const inputCls = "w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]"

  if (loading) return (
    <div className="p-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-[#F0EDE8]" />)}
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* ── TABS ── */}
      <div className="px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex bg-[#F0F2F5] rounded-2xl p-1 gap-1">
          {([
            { key: 'etudiants', label: 'Étudiants', icon: Users },
            { key: 'cours',     label: 'Cours',      icon: BookOpen },
          ] as { key: 'etudiants'|'cours'; label: string; icon: React.ElementType }[]).map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-[#1B2A8A] shadow-sm'
                    : 'text-gray-400'
                }`}>
                <Icon size={14} />{tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── COURS ── */}
      {activeTab === 'cours' && (
        <div className="flex-1 overflow-auto">
          <CoursView />
        </div>
      )}

      {/* ── ÉTUDIANTS ── */}
      {activeTab === 'etudiants' && (
        <div className="flex-1 overflow-auto">
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-[#1B2A8A]" />
                <span className="text-sm font-bold text-gray-900">Étudiants ({etudiants.length})</span>
              </div>
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 bg-[#1B2A8A] text-white px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-transform">
                <Plus size={13} />Inscrire
              </button>
            </div>

            {etudiants.length > 0 && (
              <>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full bg-white border border-[#E8E2DC] rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A] shadow-sm" />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {([
                    { key: 'tous',    label: 'Tous',    count: etudiants.length },
                    { key: 'retards', label: 'Retards', count: nbRetards },
                    { key: 'ajour',   label: 'À jour',  count: etudiants.length - nbRetards },
                  ] as { key: 'tous'|'retards'|'ajour'; label: string; count: number }[]).map(f => (
                    <button key={f.key} onClick={() => setFilterStatus(f.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        filterStatus === f.key
                          ? f.key === 'retards' ? 'bg-[#A01020] text-white border-[#A01020]'
                            : f.key === 'ajour' ? 'bg-green-500 text-white border-green-500'
                            : 'bg-[#1B2A8A] text-white border-[#1B2A8A]'
                          : 'bg-white text-gray-600 border-[#E8E2DC]'
                      }`}>
                      {f.label}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filterStatus === f.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{f.count}</span>
                    </button>
                  ))}
                  <button onClick={() => setSortBy(s => s === 'az' ? 'dette' : 'az')}
                    className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      sortBy === 'dette' ? 'bg-[#1B2A8A]/10 text-[#1B2A8A] border-[#1B2A8A]/30' : 'bg-white text-gray-500 border-[#E8E2DC]'
                    }`}>
                    {sortBy === 'dette' ? '↓ Dette' : 'A → Z'}
                  </button>
                </div>

                {(search || filterStatus !== 'tous') && (
                  <p className="text-xs text-gray-400 mt-1">
                    {filtered.length} étudiant{filtered.length !== 1 ? 's' : ''}
                    {filterStatus === 'retards' && ` · ${fmt(filtered.reduce((s, e) => s + getDette(e), 0))} total dû`}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="px-4 pb-6 pt-3 space-y-2.5">
            {etudiants.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center border border-[#F0EDE8]">
                <div className="w-12 h-12 rounded-2xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-3">
                  <GraduationCap size={22} className="text-[#1B2A8A]/40" />
                </div>
                <p className="text-sm font-semibold text-gray-500">Aucun étudiant inscrit</p>
              </div>
            )}

            {etudiants.length > 0 && filtered.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#F0EDE8]">
                <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-500">
                  {filterStatus === 'retards' ? 'Aucun retard' : 'Aucun résultat'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filterStatus === 'retards' ? 'Tous les étudiants sont à jour !' : 'Essayez un autre filtre'}
                </p>
              </div>
            )}

            {filtered.map((etudiant, idx) => {
              const status  = getStatus(etudiant)
              const dette   = getDette(etudiant)
              const hasDebt = dette > 0
              const statusBar = status === 'paid' ? '#22c55e' : status === 'partial' ? '#f97316' : '#A01020'

              return (
                <div key={etudiant.id} className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm overflow-hidden flex animate-card-in" style={{ animationDelay: `${Math.min(idx, 6) * 20}ms` }}>
                  <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ background: statusBar }} />
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setSelectedEtudiant(etudiant)} className="w-full text-left px-3.5 pt-3.5 pb-2 active:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1B2A8A] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {getInitials(etudiant.nom)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-gray-900 text-sm truncate">{etudiant.nom}</p>
                            {status === 'paid' && (
                              <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                                <Check size={9} />Payé
                              </span>
                            )}
                            {status === 'partial' && (
                              <span className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                                <Clock size={9} />Partiel
                              </span>
                            )}
                            {status === 'unpaid' && (
                              <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                                <AlertCircle size={9} />Dû
                              </span>
                            )}
                          </div>
                          {etudiant.contact && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Phone size={9} />{etudiant.contact}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {FRAIS_CONFIG.map(cfg => {
                          const total = etudiant[cfg.key] as number
                          const paye  = etudiant[cfg.paye] as number
                          const pct   = total > 0 ? Math.round((paye / total) * 100) : 0
                          return (
                            <div key={cfg.type} className="flex-1">
                              <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                                <span>{cfg.label}</span><span>{pct}%</span>
                              </div>
                              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : pct > 0 ? '#f97316' : '#e5e7eb' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {hasDebt && <p className="text-xs font-bold text-[#A01020] mt-2">{fmt(dette)} restant</p>}
                    </button>

                    <div className="flex border-t border-[#F0EDE8]">
                      <button onClick={() => setEditData({ ...etudiant })}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] text-gray-500 font-semibold active:bg-gray-50">
                        <Pencil size={11} />Modifier
                      </button>
                      <div className="w-px bg-[#F0EDE8]" />
                      <button onClick={() => setConfirmDeleteId(etudiant.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] text-red-400 font-semibold active:bg-red-50">
                        <Trash2 size={11} />Archiver
                      </button>
                      {hasDebt && (
                        <>
                          <div className="w-px bg-[#F0EDE8]" />
                          <button onClick={() => onPayEtudiant(etudiant.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] text-[#A01020] font-bold active:bg-red-50">
                            <CreditCard size={11} />Payer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DÉTAIL ÉTUDIANT ── */}
      {selectedEtudiant && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setSelectedEtudiant(null) }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[92vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="px-5 pt-2 pb-3 border-b border-[#F0EDE8] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1B2A8A] flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-black text-white">{selectedEtudiant.nom[0].toUpperCase()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedEtudiant.nom}</h3>
                </div>
                <button onClick={() => setSelectedEtudiant(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center shadow-sm flex-shrink-0">
                  <X size={15} className="text-gray-500" />
                </button>
              </div>
              <div className="mt-3 space-y-1.5">
                {selectedEtudiant.contact && (
                  <div className="flex items-center gap-2"><Phone size={12} className="text-gray-400" /><p className="text-sm text-gray-700">{selectedEtudiant.contact}</p></div>
                )}
                {selectedEtudiant.email && (
                  <div className="flex items-center gap-2"><Mail size={12} className="text-gray-400" /><p className="text-sm text-gray-700">{selectedEtudiant.email}</p></div>
                )}
                {selectedEtudiant.adresse && (
                  <div className="flex items-center gap-2"><MapPin size={12} className="text-gray-400" /><p className="text-sm text-gray-700">{selectedEtudiant.adresse}</p></div>
                )}
                {selectedEtudiant.date_naissance && (
                  <div className="flex items-center gap-2"><Calendar size={12} className="text-gray-400" /><p className="text-sm text-gray-700">Né(e) le {new Date(selectedEtudiant.date_naissance).toLocaleDateString('fr-HT')}</p></div>
                )}
                {selectedEtudiant.sexe && (
                  <p className="text-xs text-[#1B2A8A] font-semibold">{selectedEtudiant.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                )}
                {selectedEtudiant.contact_urgence && (
                  <div className="flex items-center gap-2"><AlertCircle size={12} className="text-orange-400" /><p className="text-sm text-gray-700"><span className="text-orange-500 font-semibold">Urgence : </span>{selectedEtudiant.contact_urgence}</p></div>
                )}
                {selectedEtudiant.notes && (
                  <div className="flex items-start gap-2 mt-1 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                    <StickyNote size={12} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">{selectedEtudiant.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Frais scolaires</p>
              {FRAIS_CONFIG.map(cfg => {
                const total   = selectedEtudiant[cfg.key]  as number
                const paye    = selectedEtudiant[cfg.paye] as number
                const restant = total - paye
                const pct     = total > 0 ? Math.round((paye / total) * 100) : 0
                const isPaid  = restant <= 0
                return (
                  <div key={cfg.type} className="bg-white rounded-2xl p-4 border border-[#F0EDE8]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-800 text-sm">{cfg.fullLabel}</p>
                      {isPaid
                        ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold"><Check size={10} />Payé</span>
                        : <span className="text-xs text-red-500 font-semibold">{fmt(restant)} restant</span>}
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isPaid ? '#22c55e' : pct > 0 ? '#f97316' : '#e5e7eb' }} />
                    </div>
                    <p className="text-xs text-gray-400">{fmt(paye)} / {fmt(total)}</p>
                    {!isPaid && (
                      <button onClick={() => { onPayEtudiant(selectedEtudiant.id, cfg.type); setSelectedEtudiant(null) }}
                        className="mt-2.5 w-full bg-[#A01020]/10 text-[#A01020] text-sm font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:bg-[#A01020]/20 transition-colors">
                        <CreditCard size={13} />Payer — {fmt(restant)}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FORM NOUVEL ÉTUDIANT ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <form onSubmit={ajouterEtudiant} className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[90vh] overflow-auto">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 pt-3 pb-4">
              <h3 className="text-lg font-bold text-gray-900">Nouvel étudiant</h3>
              <button type="button" onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 space-y-4 pb-8">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Identité</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet *</label>
                <input type="text" value={formNom} onChange={e => setFormNom(e.target.value)}
                  placeholder="Ex: Jean Pierre" required autoFocus className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sexe</label>
                <div className="flex gap-3">
                  {(['M','F'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setFormSexe(formSexe === s ? '' : s)}
                      className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all
                        ${formSexe === s ? 'bg-[#1B2A8A] text-white border-[#1B2A8A]' : 'bg-white text-gray-500 border-[#E8E2DC]'}`}>
                      {s === 'M' ? 'Masculin' : 'Féminin'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date de naissance</label>
                <DOBPicker value={formNaissance} onChange={setFormNaissance} />
              </div>

              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Contact</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
                <input type="tel" value={formContact} onChange={e => setFormContact(e.target.value)}
                  placeholder="Ex: 509 3700 0000" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  placeholder="Ex: jean@email.com" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse</label>
                <input type="text" value={formAdresse} onChange={e => setFormAdresse(e.target.value)}
                  placeholder="Ex: Rue Pavée, Port-au-Prince" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact d'urgence</label>
                <input type="tel" value={formUrgence} onChange={e => setFormUrgence(e.target.value)}
                  placeholder="Nom + téléphone proche" className={inputCls} />
              </div>

              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Notes</p>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)}
                placeholder="Notes sur l'étudiant, discipline, remarques..."
                rows={3}
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A] resize-none" />

              <button type="submit" disabled={saving}
                className="w-full bg-[#1B2A8A] text-white font-bold py-4 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── EDIT ÉTUDIANT ── */}
      {editData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[92vh] overflow-auto">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Modifier l'étudiant</h3>
              <button onClick={() => setEditData(null)} className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 pb-8 space-y-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Identité</p>
              <input type="text" value={editData.nom} onChange={e => setEditData({...editData, nom: e.target.value})}
                placeholder="Nom complet *" className={inputCls} />
              <div className="flex gap-3">
                {(['M','F'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setEditData({...editData, sexe: editData.sexe === s ? undefined : s})}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all
                      ${editData.sexe === s ? 'bg-[#1B2A8A] text-white border-[#1B2A8A]' : 'bg-white text-gray-500 border-[#E8E2DC]'}`}>
                    {s === 'M' ? 'Masculin' : 'Féminin'}
                  </button>
                ))}
              </div>
              <DOBPicker value={editData.date_naissance || ''} onChange={v => setEditData({...editData, date_naissance: v})} />

              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Contact</p>
              <input type="tel" value={editData.contact || ''} onChange={e => setEditData({...editData, contact: e.target.value})}
                placeholder="Téléphone" className={inputCls} />
              <input type="email" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})}
                placeholder="Email" className={inputCls} />
              <input type="text" value={editData.adresse || ''} onChange={e => setEditData({...editData, adresse: e.target.value})}
                placeholder="Adresse" className={inputCls} />
              <input type="text" value={editData.contact_urgence || ''} onChange={e => setEditData({...editData, contact_urgence: e.target.value})}
                placeholder="Contact d'urgence" className={inputCls} />

              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Notes</p>
              <textarea value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})}
                placeholder="Observations, discipline, remarques..."
                rows={3}
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A] resize-none" />

              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditData(null)}
                  className="flex-1 border border-[#E8E2DC] text-gray-600 py-3.5 rounded-2xl text-sm font-semibold">Annuler</button>
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 bg-[#1B2A8A] text-white py-3.5 rounded-2xl text-sm font-bold disabled:opacity-50">
                  {saving ? '...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <p className="font-bold text-gray-900 text-center mb-2">Archiver cet étudiant ?</p>
            <p className="text-sm text-gray-400 text-center mb-6">Il ne sera plus visible dans la liste active.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-[#E8E2DC] text-gray-600 py-3 rounded-2xl text-sm font-semibold">Annuler</button>
              <button onClick={() => deleteEtudiant(confirmDeleteId)}
                className="flex-1 bg-red-500 text-white py-3 rounded-2xl text-sm font-bold">Archiver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
