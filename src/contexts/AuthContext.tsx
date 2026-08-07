import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

interface AuthContextType {
  session: Session | null
  loading: boolean
  loginWithEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>(null!)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('mla_session')
    if (stored) {
      try { setSession(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const loginWithEmail = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const trimEmail = email.trim().toLowerCase()
    const trimPw = password.trim()

    // ── Vérifier compte admin ──────────────────────────────────────────
    const [{ data: cfgEmail }, { data: cfgPw }] = await Promise.all([
      supabase.from('mla_config').select('valeur').eq('id', 'admin_email').single(),
      supabase.from('mla_config').select('valeur').eq('id', 'admin_password').single(),
    ])

    const adminEmail = cfgEmail?.valeur?.trim().toLowerCase() || ''
    const adminPw = cfgPw?.valeur || ''

    if ((!adminEmail || trimEmail === adminEmail) && trimPw === adminPw) {
      // Si admin_email vide → accepte n'importe quel email avec le bon mot de passe admin
      // (permet la première connexion avant configuration)
      if (adminEmail && trimEmail !== adminEmail) {
        // email admin configuré mais ne correspond pas → continuer vers employés
      } else {
        const s: Session = { role: 'admin' }
        setSession(s)
        localStorage.setItem('mla_session', JSON.stringify(s))
        return { ok: true }
      }
    }

    // ── Vérifier compte employé ────────────────────────────────────────
    const { data: employe } = await supabase
      .from('mla_employes')
      .select('*, succursale:mla_succursales(id, nom)')
      .eq('email', trimEmail)
      .eq('actif', true)
      .single()

    if (!employe) return { ok: false, error: 'Aucun compte trouvé pour cet email' }
    if (employe.mot_de_passe !== trimPw) return { ok: false, error: 'Mot de passe incorrect' }
    if (!employe.succursale_id) return { ok: false, error: 'Aucune succursale configurée pour ce compte' }

    const succursale = Array.isArray(employe.succursale) ? employe.succursale[0] : employe.succursale

    const s: Session = {
      role: 'employe',
      employeId: employe.id,
      employeNom: employe.nom,
      succursaleId: employe.succursale_id,
      succursaleNom: succursale?.nom || '',
    }
    setSession(s)
    localStorage.setItem('mla_session', JSON.stringify(s))
    return { ok: true }
  }

  const logout = () => {
    setSession(null)
    localStorage.removeItem('mla_session')
  }

  return (
    <AuthContext.Provider value={{ session, loading, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
