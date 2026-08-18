import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

interface AuthContextType {
  session: Session | null
  loading: boolean
  appActive: boolean
  login: (nom: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>(null!)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [appActive, setAppActive] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('usr_session')
    if (stored) {
      try { setSession(JSON.parse(stored)) } catch {}
    }
    supabase.from('usr_config').select('value').eq('key', 'app_active').single()
      .then(({ data }) => { if (data) setAppActive(data.value === 'true') })
    setLoading(false)
  }, [])

  const login = async (nom: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const trimNom = nom.trim()
    const trimPw = password.trim()

    // Check admin password dans config
    const { data: cfg } = await supabase
      .from('usr_config')
      .select('value')
      .eq('key', 'admin_password')
      .single()

    if (cfg?.value === trimPw && trimNom.toLowerCase() === 'admin') {
      const s: Session = { role: 'admin', employeNom: 'Admin' }
      setSession(s)
      localStorage.setItem('usr_session', JSON.stringify(s))
      return { ok: true }
    }

    // Check employés
    const { data: employe } = await supabase
      .from('usr_employes')
      .select('*')
      .ilike('nom', trimNom)
      .eq('actif', true)
      .single()

    if (!employe) return { ok: false, error: 'Aucun compte trouvé' }
    if (employe.mot_de_passe !== trimPw) return { ok: false, error: 'Mot de passe incorrect' }

    const s: Session = {
      role: employe.role as 'admin' | 'employe',
      employeId: employe.id,
      employeNom: employe.nom,
    }
    setSession(s)
    localStorage.setItem('usr_session', JSON.stringify(s))
    return { ok: true }
  }

  const logout = () => {
    setSession(null)
    localStorage.removeItem('usr_session')
  }

  return (
    <AuthContext.Provider value={{ session, loading, appActive, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
