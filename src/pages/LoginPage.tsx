import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LoginPageProps {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { loginWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Remplissez tous les champs'); return }
    setError('')
    setLoading(true)
    const { ok, error: err } = await loginWithEmail(email, password)
    if (ok) {
      onLogin()
    } else {
      setError(err || 'Identifiants incorrects')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Card unique — logo + form */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Bande tricolore */}
          <div className="h-1.5 bg-gradient-to-r from-[#3DAA35] via-[#E8A820] to-[#2D6B2D]" />

          <div className="px-8 pt-10 pb-10">
            {/* Logo centré dans la card */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-[#F5F0E8] rounded-2xl p-3 mb-4 shadow-inner">
                <img
                  src="/logo.png"
                  alt="Manno Lavi Agrikol"
                  className="h-16 w-16 object-contain"
                />
              </div>
              <h1 className="text-xl font-black text-[#1A1210] tracking-tight">Manno Lavi Agrikol</h1>
              <p className="text-sm text-[#A09589] mt-1">Gestion intrants agricoles</p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#78726A] uppercase tracking-wider mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] focus:border-transparent bg-[#FAF7F2]"
                  placeholder="votre@email.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#78726A] uppercase tracking-wider mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-[#D4CAB8] rounded-xl px-4 py-3.5 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-[#3DAA35] focus:border-transparent bg-[#FAF7F2]"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09589] hover:text-[#4A4540]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-base font-bold text-white bg-[#2D6B2D] hover:bg-[#1E4E1E] disabled:bg-[#8DC88D] rounded-xl transition-colors shadow-md mt-2"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#C4BAB0] mt-5">
          Manno Lavi Agrikol · Hinche, Haiti
        </p>
      </div>
    </div>
  )
}
