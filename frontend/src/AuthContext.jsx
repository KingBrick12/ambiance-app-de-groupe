import { useEffect, useState } from 'react'
import { api, session } from './api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(session.get()))
  const [sessionMessage, setSessionMessage] = useState('')
  const logout = (message = '') => { session.set(null); setUser(null); setSessionMessage(message) }
  useEffect(() => {
    session.onUnauthorized(() => logout('Votre session a expiré. Veuillez vous reconnecter.'))
    if (!session.get()) return setLoading(false)
    api.me().then(({ data }) => setUser(data)).catch(() => logout('Votre session a expiré.')).finally(() => setLoading(false))
  }, [])
  const authenticate = async (action, values) => {
    const { data } = await api[action](values)
    session.set(data.token); setUser(data.user); setSessionMessage('')
  }
  return <AuthContext.Provider value={{ user, loading, sessionMessage, login: (v) => authenticate('login', v), register: (v) => authenticate('register', v), logout }}>{children}</AuthContext.Provider>
}
