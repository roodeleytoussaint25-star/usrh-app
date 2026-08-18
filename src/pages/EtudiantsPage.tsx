import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, GraduationCap, Pencil, Trash2, X,
  Phone, Check, Users, CreditCard, Clock, AlertCircle, CheckCircle, BookOpen,
  Mail, MapPin, StickyNote, Calendar,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import type { Etudiant, Cours } from '@/types'

type TypeFrais = 'inscription' | 'formation_v1' | 'formation_v2'

const FRAIS_CONFIG = [
  { type: 'inscription'  as TypeFrais, label: 'Inscr.',    key: 'frais_inscription'  as keyof Etudiant, paye: 'frais_inscription_paye'  as keyof Etudiant },
  { type: 'formation_v1' as TypeFrais, label: 'V1',        key: 'frais_formation_v1' as keyof Etudiant, paye: 'frais_formation_v1_paye' as keyof Etudiant },
  { type: 'formation_v2' as TypeFrais, label: 'V2',        key: 'frais_formation_v2' as keyof Etudiant, paye: 'frais_formation_v2_paye' as keyof Etudiant },
]

const fmt = (n: number) => n.toLocaleString('fr-HT') + ' HTG'
const getInitials = (nom: string) => nom.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

interface Props { onPayEtudiant: (id: number) => void }

export function EtudiantsPage({ onPayEtudiant }: Props) {
  const { session } = useAuth()
  const { showToast } = useToast()
  const isAdmin = session?.role === 'admin'

  const [cours, setCours]         = useState<Cours[]>([])
  const [etudiants, setEtudiants] = useState<Etudiant[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [filterStatus, setFilterStatus] = useState<'tous' | 'retards' | 'ajour'>('tous')
  const [sortBy, setSortBy]             = useState<'az' | 'dette'>('az')

  // Ajouter étudiant
  const [showForm, setShowForm]             = useState(false)
  const [formNom, setFormNom]               = useState('')
  const [formContact, setFormContact]       = useState('')
  const [formEmail, setFormEmail]           = useState('')
  const [formSexe, setFormSexe]             = useState<'M' | 'F' | ''>('')
  const [formNaissance, setFormNaissance]   = useState('')
  const [formAdresse, setFormAdresse]       = useState('')
  const [formUrgence, setFormUrgence]       = useState('')
  const [formNotes, setFormNotes]           = useState('')
  const [formCoursId, setFormCoursId]       = useState('')

  // Ajouter cours
  const [showCoursForm, setShowCoursForm]               = useState(false)
  const [newCoursNom, setNewCoursNom]                   = useState('')
  const [newCoursHoraire, setNewCoursHoraire]           = useState('')
  const [newCoursDuree, setNewCoursDuree]               = useState('')
  const [newCoursProfesseur, setNewCoursProfesseur]     = useState('')
  const [newCoursInscription, setNewCoursInscription]   = useState('5000')
  const [newCoursV1, setNewCoursV1]                     = useState('30000')
  const [newCoursV2, setNewCoursV2]                     = useState('30000')

  // Détail / édition cours
  const [selectedCours, setSelectedCours]               = useState<Cours | null>(null)
  const [editCours, setEditCours]                       = useState<Cours | null>(null)
  const [confirmDeleteCours, setConfirmDeleteCours]     = useState(false)

  // Modifier / Supprimer
  const [editData, setEditData]               = useState<Etudiant | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  // Détail frais
  const [selectedEtudiant, setSelectedEtudiant] = useState<Etudiant | null>(null)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [coursRes, etuRes] = await Promise.all([
      supabase.from('usr_cours').select('*').eq('actif', true).order('nom'),
      supabase.from('usr_etudiants').select('*, cours:usr_cours(nom)').eq('actif', true).order('nom'),
    ])
    setCours(coursRes.data || [])
    setEtudiants(etuRes.data || [])
    setLoading(false)
  }

  const ajouterEtudiant = async (e: React.FormEvent) => {
    e.preventDefault()
    const nom = formNom.trim()
    if (!nom) return
    setSaving(true)
    const coursChoisi = cours.find(c => c.id === parseInt(formCoursId))
    await supabase.from('usr_etudiants').insert({
      nom,
      contact:          formContact.trim()  || null,
      email:            formEmail.trim()    || null,
      sexe:             formSexe            || null,
      date_naissance:   formNaissance       || null,
      adresse:          formAdresse.trim()  || null,
      contact_urgence:  formUrgence.trim()  || null,
      notes:            formNotes.trim()    || null,
      cours_id:           coursChoisi?.id || null,
      frais_inscription:  coursChoisi?.frais_inscription  ?? 5000,
      frais_formation_v1: coursChoisi?.frais_formation_v1 ?? 30000,
      frais_formation_v2: coursChoisi?.frais_formation_v2 ?? 30000,
    })
    setSaving(false)
    setFormNom(''); setFormContact(''); setFormEmail(''); setFormSexe(''); setFormNaissance(''); setFormAdresse(''); setFormUrgence(''); setFormNotes(''); setFormCoursId('')
    setShowForm(false)
    showToast(`${nom} inscrit`)
    loadAll()
  }

  const ajouterCours = async (e: React.FormEvent) => {
    e.preventDefault()
    const nom = newCoursNom.trim()
    if (!nom) return
    setSaving(true)
    await supabase.from('usr_cours').insert({
      nom,
      horaire:    newCoursHoraire.trim() || null,
      duree:      newCoursDuree.trim()   || null,
      professeur: newCoursProfesseur.trim() || null,
      frais_inscription:  parseFloat(newCoursInscription) || 5000,
      frais_formation_v1: parseFloat(newCoursV1) || 30000,
      frais_formation_v2: parseFloat(newCoursV2) || 30000,
    })
    setSaving(false)
    setNewCoursNom(''); setNewCoursHoraire(''); setNewCoursDuree(''); setNewCoursProfesseur('')
    setNewCoursInscription('5000'); setNewCoursV1('30000'); setNewCoursV2('30000')
    setShowCoursForm(false)
    showToast(`Cours "${nom}" créé`)
    loadAll()
  }

  const saveCours = async () => {
    if (!editCours) return
    setSaving(true)
    await supabase.from('usr_cours').update({
      nom:        editCours.nom.trim(),
      horaire:    editCours.horaire?.trim() || null,
      duree:      editCours.duree?.trim()   || null,
      professeur: editCours.professeur?.trim() || null,
      frais_inscription:  editCours.frais_inscription,
      frais_formation_v1: editCours.frais_formation_v1,
      frais_formation_v2: editCours.frais_formation_v2,
    }).eq('id', editCours.id)
    setSaving(false)
    setEditCours(null)
    setSelectedCours(null)
    showToast('Cours mis à jour')
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
      cours_id:           editData.cours_id || null,
      frais_inscription:  editData.frais_inscription,
      frais_formation_v1: editData.frais_formation_v1,
      frais_formation_v2: editData.frais_formation_v2,
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

  const deleteCours = async () => {
    if (!selectedCours) return
    await supabase.from('usr_cours').update({ actif: false }).eq('id', selectedCours.id)
    setCours(prev => prev.filter(c => c.id !== selectedCours.id))
    setConfirmDeleteCours(false)
    setSelectedCours(null)
    showToast('Cours supprimé')
  }

  const getDette = (e: Etudiant) =>
    Math.max(0, e.frais_inscription  - e.frais_inscription_paye)  +
    Math.max(0, e.frais_formation_v1 - e.frais_formation_v1_paye) +
    Math.max(0, e.frais_formation_v2 - e.frais_formation_v2_paye)

  const getStatus = (e: Etudiant) => {
    const dette = getDette(e)
    if (dette === 0) return 'paid'
    const totalPaye = e.frais_inscription_paye + e.frais_formation_v1_paye + e.frais_formation_v2_paye
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
    .sort((a, b) => {
      if (sortBy === 'dette') return getDette(b) - getDette(a)
      return a.nom.localeCompare(b.nom)
    })

  if (loading) return (
    <div className="p-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-[#F0EDE8]" />)}
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-auto">

      {/* ── SECTION COURS ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={17} className="text-[#1B2A8A]" />
            <span className="text-sm font-bold text-gray-900">Cours ({cours.length})</span>
          </div>
          {isAdmin && (
            <button onClick={() => setShowCoursForm(true)}
              className="flex items-center gap-1 text-xs font-semibold text-[#1B2A8A] border border-[#1B2A8A]/30 px-2.5 py-1.5 rounded-xl active:bg-[#1B2A8A]/5">
              <Plus size={13} />Cours
            </button>
          )}
        </div>

        {cours.length === 0 ? (
          <div className="bg-white rounded-2xl py-8 text-center border border-[#F0EDE8] animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-2.5">
              <BookOpen size={18} className="text-[#1B2A8A]/50" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Aucun cours</p>
            <p className="text-xs text-gray-400 mt-0.5">Créez votre premier cours ↑</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {cours.map((c, idx) => {
              const inscrits = etudiants.filter(e => e.cours_id === c.id).length
              return (
                <button key={c.id} onClick={() => setSelectedCours(c)}
                  className="flex-shrink-0 w-40 bg-white rounded-2xl border border-[#E8E2DC] shadow-sm p-3.5 text-left active:scale-[0.97] transition-transform animate-card-in"
                  style={{ animationDelay: `${Math.min(idx, 5) * 20}ms` }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#1B2A8A]/10 flex items-center justify-center">
                      <GraduationCap size={16} className="text-[#1B2A8A]" />
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-semibold">
                      <Users size={9} />{inscrits}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{c.nom}</p>
                  {c.duree && <p className="text-[11px] text-gray-400 mt-1">{c.duree}</p>}
                  {c.professeur && (
                    <p className="text-[11px] text-[#1B2A8A] font-medium mt-1 truncate">{c.professeur}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SECTION ÉTUDIANTS ── */}
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
            {/* Recherche */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-white border border-[#E8E2DC] rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A] shadow-sm" />
            </div>

            {/* Chips filtre + tri */}
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
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    filterStatus === f.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                  }`}>{f.count}</span>
                </button>
              ))}

              {/* Tri */}
              <button onClick={() => setSortBy(s => s === 'az' ? 'dette' : 'az')}
                className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  sortBy === 'dette'
                    ? 'bg-[#1B2A8A]/10 text-[#1B2A8A] border-[#1B2A8A]/30'
                    : 'bg-white text-gray-500 border-[#E8E2DC]'
                }`}>
                {sortBy === 'dette' ? '↓ Dette' : 'A → Z'}
              </button>
            </div>

            {/* Compteur résultats */}
            {(search || filterStatus !== 'tous') && (
              <p className="text-xs text-gray-400 mt-1">
                {filtered.length} étudiant{filtered.length !== 1 ? 's' : ''}
                {filterStatus === 'retards' && ` · ${fmt(filtered.reduce((s, e) => s + getDette(e), 0))} total dû`}
              </p>
            )}
          </>
        )}
      </div>

      {/* Liste étudiants */}
      <div className="px-4 pb-6 space-y-2.5">
        {etudiants.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#F0EDE8] animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[#1B2A8A]/8 flex items-center justify-center mx-auto mb-3">
              <GraduationCap size={22} className="text-[#1B2A8A]/40" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Aucun étudiant inscrit</p>
          </div>
        )}

        {etudiants.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#F0EDE8] animate-fade-in">
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
              {/* Barre de statut gauche */}
              <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ background: statusBar }} />

              <div className="flex-1 min-w-0">
                {/* Zone cliquable principale */}
                <button onClick={() => setSelectedEtudiant(etudiant)} className="w-full text-left px-3.5 pt-3.5 pb-2 active:bg-gray-50">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
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
                      {etudiant.cours?.nom && <p className="text-xs text-[#1B2A8A] font-medium mt-0.5">{etudiant.cours.nom}</p>}
                      {etudiant.contact && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Phone size={9} />{etudiant.contact}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Barres frais */}
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

                  {hasDebt && (
                    <p className="text-xs font-bold text-[#A01020] mt-2">{fmt(dette)} restant</p>
                  )}
                </button>

                {/* Actions */}
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

      {/* ── DÉTAIL ÉTUDIANT (profil complet + frais) ── */}
      {selectedEtudiant && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setSelectedEtudiant(null) }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[92vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>

            {/* Header */}
            <div className="px-5 pt-2 pb-3 border-b border-[#F0EDE8] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1B2A8A] flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-black text-white">{selectedEtudiant.nom[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedEtudiant.nom}</h3>
                    {selectedEtudiant.cours?.nom && <p className="text-sm text-[#1B2A8A] font-medium">{selectedEtudiant.cours.nom}</p>}
                  </div>
                </div>
                <button onClick={() => setSelectedEtudiant(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center shadow-sm flex-shrink-0">
                  <X size={15} className="text-gray-500" />
                </button>
              </div>
              {/* Infos rapides */}
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
                      <p className="font-semibold text-gray-800 text-sm">{cfg.label === 'Inscr.' ? 'Inscription' : cfg.label === 'V1' ? 'Formation V1' : 'Formation V2'}</p>
                      {isPaid
                        ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold"><Check size={10} />Payé</span>
                        : <span className="text-xs text-red-500 font-semibold">{fmt(restant)} restant</span>}
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isPaid ? '#22c55e' : pct > 0 ? '#f97316' : '#e5e7eb' }} />
                    </div>
                    <p className="text-xs text-gray-400">{fmt(paye)} / {fmt(total)}</p>
                  </div>
                )
              })}

              {getDette(selectedEtudiant) > 0 && (
                <button onClick={() => { onPayEtudiant(selectedEtudiant.id); setSelectedEtudiant(null) }}
                  className="w-full bg-[#A01020] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md">
                  <CreditCard size={18} />Encaisser — {fmt(getDette(selectedEtudiant))}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DÉTAIL COURS ── */}
      {selectedCours && !editCours && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) { setSelectedCours(null); setConfirmDeleteCours(false) } }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[85vh] overflow-auto">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="px-5 pt-3 pb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedCours.nom}</h3>
                {selectedCours.professeur && <p className="text-sm text-[#1B2A8A] font-medium mt-0.5">{selectedCours.professeur}</p>}
              </div>
              <button onClick={() => { setSelectedCours(null); setConfirmDeleteCours(false) }}
                className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center shadow-sm">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 pb-4 space-y-3">
              <div className="bg-white rounded-2xl border border-[#F0EDE8] divide-y divide-[#F0EDE8]">
                {[
                  { label: 'Étudiants inscrits', value: String(etudiants.filter(e => e.cours_id === selectedCours.id).length) },
                  selectedCours.duree    ? { label: 'Durée',   value: selectedCours.duree }    : null,
                  selectedCours.horaire  ? { label: 'Horaire', value: selectedCours.horaire }   : null,
                ].filter(Boolean).map((row: any) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm text-gray-500">{row.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{row.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-[#F0EDE8] divide-y divide-[#F0EDE8]">
                {[
                  { label: 'Frais inscription',  value: fmt(selectedCours.frais_inscription)  },
                  { label: 'Formation V1',        value: fmt(selectedCours.frais_formation_v1) },
                  { label: 'Formation V2',        value: fmt(selectedCours.frais_formation_v2) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm text-gray-500">{row.label}</p>
                    <p className="text-sm font-semibold text-[#1B2A8A]">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {isAdmin && (
              <div className="px-5 pb-6 space-y-3">
                <button onClick={() => setEditCours({ ...selectedCours })}
                  className="w-full bg-[#1B2A8A] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md">
                  <Pencil size={16} />Modifier ce cours
                </button>
                {etudiants.filter(e => e.cours_id === selectedCours.id).length === 0 ? (
                  confirmDeleteCours ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-red-700 text-center">Confirmer la suppression ?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDeleteCours(false)}
                          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm bg-white">
                          Annuler
                        </button>
                        <button onClick={deleteCours}
                          className="flex-1 py-3 rounded-xl bg-[#A01020] text-white font-bold text-sm">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteCours(true)}
                      className="w-full border border-red-300 text-red-600 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform bg-red-50">
                      Supprimer ce cours
                    </button>
                  )
                ) : (
                  <p className="text-xs text-center text-gray-400">Ce cours a des étudiants inscrits — impossible de le supprimer</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ÉDITION COURS ── */}
      {editCours && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setEditCours(null) }}>
          <div className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[90vh] overflow-auto">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 pt-3 pb-4">
              <h3 className="text-lg font-bold text-gray-900">Modifier le cours</h3>
              <button onClick={() => setEditCours(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 space-y-4 pb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom du cours</label>
                <input type="text" value={editCours.nom} onChange={e => setEditCours({...editCours, nom: e.target.value})}
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Professeur</label>
                <input type="text" value={editCours.professeur || ''} onChange={e => setEditCours({...editCours, professeur: e.target.value})}
                  placeholder="Ex: Prof. Jean Marie"
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Durée</label>
                  <input type="text" value={editCours.duree || ''} onChange={e => setEditCours({...editCours, duree: e.target.value})}
                    placeholder="Ex: 6 mois"
                    className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horaire</label>
                  <input type="text" value={editCours.horaire || ''} onChange={e => setEditCours({...editCours, horaire: e.target.value})}
                    placeholder="Ex: Lundi 8h-12h"
                    className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Frais (HTG)</p>
                <div className="space-y-3">
                  {([['Inscription','frais_inscription'],['Formation V1','frais_formation_v1'],['Formation V2','frais_formation_v2']] as [string, keyof Cours][]).map(([label, field]) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input type="number" value={editCours[field] as number}
                        onChange={e => setEditCours({...editCours, [field]: parseFloat(e.target.value)||0})}
                        className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={saveCours} disabled={saving}
                className="w-full bg-[#1B2A8A] text-white font-bold py-4 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
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

              {/* Section identité */}
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Identité</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet *</label>
                <input type="text" value={formNom} onChange={e => setFormNom(e.target.value)}
                  placeholder="Ex: Jean Pierre" required autoFocus
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
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
                <input type="date" value={formNaissance} onChange={e => setFormNaissance(e.target.value)}
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>

              {/* Section contact */}
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Contact</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
                <input type="tel" value={formContact} onChange={e => setFormContact(e.target.value)}
                  placeholder="Ex: 509 3700 0000"
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  placeholder="Ex: jean@email.com"
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse</label>
                <input type="text" value={formAdresse} onChange={e => setFormAdresse(e.target.value)}
                  placeholder="Ex: Rue Pavée, Port-au-Prince"
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact d'urgence</label>
                <input type="tel" value={formUrgence} onChange={e => setFormUrgence(e.target.value)}
                  placeholder="Nom + téléphone proche"
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>

              {/* Section scolarité */}
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Scolarité</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cours</label>
                <div className="relative">
                  <select value={formCoursId} onChange={e => setFormCoursId(e.target.value)}
                    className="w-full appearance-none bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A] pr-10">
                    <option value="">Sélectionner un cours (optionnel)</option>
                    {cours.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes / Observations</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)}
                  placeholder="Notes sur l'étudiant, discipline, remarques..."
                  rows={3}
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A] resize-none" />
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-[#1B2A8A] text-white font-bold py-4 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── FORM NOUVEAU COURS ── */}
      {showCoursForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setShowCoursForm(false) }}>
          <form onSubmit={ajouterCours} className="bg-[#FAF7F4] w-full rounded-t-3xl animate-modal-up max-h-[90vh] overflow-auto">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 pt-3 pb-4">
              <h3 className="text-lg font-bold text-gray-900">Nouveau cours</h3>
              <button type="button" onClick={() => setShowCoursForm(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 space-y-4 pb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom du cours *</label>
                <input type="text" value={newCoursNom} onChange={e => setNewCoursNom(e.target.value)}
                  placeholder="Ex: Protection VIP" required autoFocus
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Professeur</label>
                <input type="text" value={newCoursProfesseur} onChange={e => setNewCoursProfesseur(e.target.value)}
                  placeholder="Ex: Prof. Jean Marie"
                  className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Durée</label>
                  <input type="text" value={newCoursDuree} onChange={e => setNewCoursDuree(e.target.value)}
                    placeholder="Ex: 6 mois"
                    className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horaire</label>
                  <input type="text" value={newCoursHoraire} onChange={e => setNewCoursHoraire(e.target.value)}
                    placeholder="Ex: Lundi 8h-12h"
                    className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Frais (HTG)</p>
                <div className="space-y-3">
                  {([["Inscription", newCoursInscription, setNewCoursInscription],
                    ['Formation V1', newCoursV1, setNewCoursV1],
                    ['Formation V2', newCoursV2, setNewCoursV2],
                  ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                    <div key={label}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input type="number" value={val} onChange={e => setter(e.target.value)}
                        className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                    </div>
                  ))}
                </div>
              </div>
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
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Modifier l'étudiant</h3>
              <button onClick={() => setEditData(null)} className="w-8 h-8 rounded-full bg-white border border-[#E8E2DC] flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 pb-8 space-y-4">

              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Identité</p>
              <input type="text" value={editData.nom} onChange={e => setEditData({...editData, nom: e.target.value})}
                placeholder="Nom complet *"
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              <div className="flex gap-3">
                {(['M','F'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setEditData({...editData, sexe: editData.sexe === s ? undefined : s})}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all
                      ${editData.sexe === s ? 'bg-[#1B2A8A] text-white border-[#1B2A8A]' : 'bg-white text-gray-500 border-[#E8E2DC]'}`}>
                    {s === 'M' ? 'Masculin' : 'Féminin'}
                  </button>
                ))}
              </div>
              <input type="date" value={editData.date_naissance || ''} onChange={e => setEditData({...editData, date_naissance: e.target.value})}
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />

              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Contact</p>
              <input type="tel" value={editData.contact || ''} onChange={e => setEditData({...editData, contact: e.target.value})}
                placeholder="Téléphone"
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              <input type="email" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})}
                placeholder="Email"
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              <input type="text" value={editData.adresse || ''} onChange={e => setEditData({...editData, adresse: e.target.value})}
                placeholder="Adresse"
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
              <input type="text" value={editData.contact_urgence || ''} onChange={e => setEditData({...editData, contact_urgence: e.target.value})}
                placeholder="Contact d'urgence"
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />

              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest pt-1">Scolarité</p>
              <select value={editData.cours_id || ''} onChange={e => setEditData({...editData, cours_id: e.target.value ? parseInt(e.target.value) : undefined})}
                className="w-full bg-white border border-[#E8E2DC] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1B2A8A]">
                <option value="">— Sans cours —</option>
                {cours.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                {([['Inscription','frais_inscription'],['V1','frais_formation_v1'],['V2','frais_formation_v2']] as [string, keyof Etudiant][]).map(([label, field]) => (
                  <div key={field}>
                    <label className="text-xs text-gray-500 mb-1 block">{label} (HTG)</label>
                    <input type="number" value={editData[field] as number}
                      onChange={e => setEditData({...editData, [field]: parseFloat(e.target.value)||0})}
                      className="w-full bg-white border border-[#E8E2DC] rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:border-[#1B2A8A]" />
                  </div>
                ))}
              </div>

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
