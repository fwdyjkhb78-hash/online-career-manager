import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setMessage('')

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        window.location.href = '/'
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Compte créé ✅')
      }
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: 'auto' }}>
      <h2>{isLogin ? 'Connexion' : 'Inscription'}</h2>

      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">
          {isLogin ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      <p>{message}</p>

      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Créer un compte" : "J'ai déjà un compte"}
      </button>
    </div>
  )
}