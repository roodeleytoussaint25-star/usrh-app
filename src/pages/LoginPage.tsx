import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Shield, Eye, EyeOff } from 'lucide-react'

interface Props { onLogin: () => void }

export function LoginPage({ onLogin }: Props) {
  const { login } = useAuth()
  const [nom, setNom] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(nom, password)
    setLoading(false)
    if (result.ok) {
      onLogin()
    } else {
      setError(result.error || 'Erreur de connexion')
    }
  }

  return (
    <div className="min-h-screen bg-[#1B2A8A] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center mb-5 shadow-lg">
            <img
              src="/logo.png"
              alt="USRH"
              className="h-36 w-36 object-contain"
            />
          </div>
          <p className="text-white/50 text-sm tracking-wide uppercase">Système de gestion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Identifiant</label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="Nom d'utilisateur"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#A01020] hover:bg-[#A50E28] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 mt-2"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-10 text-white/30 text-xs">
          <Shield size={12} />
          <span>Mèt Biznis · +509 56173528</span>
        </div>
      </div>
    </div>
  )
}
