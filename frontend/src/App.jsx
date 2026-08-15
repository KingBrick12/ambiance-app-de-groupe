import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Route, Routes, useSearchParams } from 'react-router-dom'
import { api } from './api'
import { useAuth } from './auth-context'
import './App.css'

const PublicMapPage = lazy(() => import('./pages/PublicMapPage'))
const LocationDetailsPage = lazy(() => import('./pages/LocationDetailsPage'))
const CompareLocationsPage = lazy(() => import('./pages/CompareLocationsPage'))

function MemberArea() {
  const auth = useAuth()
  const [searchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const [view, setView] = useState(requestedView || 'home')
  useEffect(() => {
    if (['home', 'auth', 'observe', 'account'].includes(requestedView)) setView(requestedView)
  }, [requestedView])
  if (auth.loading) return <main className="shell"><p>Restauration de votre session…</p></main>
  return <div className="member-area">
    {auth.sessionMessage && <p className="notice error">{auth.sessionMessage}</p>}
    {view === 'home' && <Home user={auth.user} setView={setView} />}
    {view === 'auth' && <AuthScreen onDone={() => setView('account')} />}
    {view === 'observe' && <ObservationForm user={auth.user} onLogin={() => setView('auth')} />}
    {view === 'account' && (auth.user ? <Account /> : <Protected onLogin={() => setView('auth')} />)}
  </div>
}

function Home({ user, setView }) { return <main className="hero"><p className="eyebrow">Parcs de Montréal · données citoyennes</p><h1>Comprendre l’ambiance, un lieu à la fois.</h1><p>Consultez les portraits publics et contribuez à une lecture collective des parcs montréalais.</p><div className="actions"><button className="primary" onClick={() => setView(user ? 'observe' : 'auth')}>{user ? 'Ajouter une observation' : 'Se connecter pour contribuer'}</button><button onClick={() => setView('account')}>Voir mon espace</button></div></main> }

function AuthScreen({ onDone }) {
  const { login, register } = useAuth(); const [mode, setMode] = useState('login'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); const values = Object.fromEntries(new FormData(event.currentTarget)); try { await (mode === 'login' ? login(values) : register(values)); onDone() } catch (e) { setError(e.message) } finally { setBusy(false) } }
  return <main className="panel narrow"><h1>{mode === 'login' ? 'Bon retour' : 'Créer un compte'}</h1><form onSubmit={submit}>{mode === 'register' && <label>Nom affiché<input name="displayName" minLength="2" required /></label>}<label>Courriel<input name="email" type="email" required /></label><label>Mot de passe<input name="password" type="password" minLength="8" required /></label>{error && <p className="notice error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Patientez…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button></form><button className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Pas encore de compte ? S’inscrire' : 'Déjà un compte ? Se connecter'}</button></main>
}

function Protected({ onLogin }) { return <main className="panel narrow"><h1>Connexion requise</h1><p>Cette action est réservée aux personnes connectées.</p><button className="primary" onClick={onLogin}>Se connecter</button></main> }

const LOCATION_LABELS = { 'parc-lafontaine': 'Parc Lafontaine', 'parc-jean-mance': 'Parc Jean-Mance', 'parc-maisonneuve': 'Parc Maisonneuve' }
const LOCATION_ZONES = { 'parc-lafontaine': 'zone-banc-central', 'parc-jean-mance': 'zone-principale', 'parc-maisonneuve': 'zone-principale' }
const locationLabel = (slug) => LOCATION_LABELS[slug] || slug
const localDateTimeMax = () => { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); return now.toISOString().slice(0, 16) }

function ObservationForm({ user, onLogin }) {
  const [locations, setLocations] = useState([]); const [status, setStatus] = useState({});
  useEffect(() => { if (user) api.locations().then(r => setLocations(r.data)).catch(e => setStatus({ error: e.message })) }, [user])
  if (!user) return <Protected onLogin={onLogin} />
  async function submit(event) { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); const timestamp = new Date(data.timestamp); if (timestamp > new Date()) return setStatus({ error: 'La date et l’heure ne peuvent pas être dans le futur.' }); setStatus({ busy: true }); data.peopleCount = Number(data.peopleCount); data.timestamp = timestamp.toISOString(); try { await api.addObservation(data); form.reset(); window.dispatchEvent(new CustomEvent('ambiance-updated', { detail: { location: data.location } })); setStatus({ success: 'Observation enregistrée. Le portrait public du parc et la carte sont maintenant à jour.' }) } catch (e) { setStatus({ error: e.message }) } }
  function chooseLocation(event) { const form = event.currentTarget.form; if (form) form.elements.zone.value = LOCATION_ZONES[event.currentTarget.value] || '' }
  return <main className="panel"><h1>Nouvelle observation</h1>{locations.length === 0 && !status.error && <p>Aucun lieu recueilli n’est encore disponible.</p>}<form className="grid" onSubmit={submit}><label>Lieu<select name="location" required onChange={chooseLocation}><option value="">Choisir…</option>{locations.map(l => <option key={l} value={l}>{locationLabel(l)}</option>)}</select></label><label>Zone<input name="zone" required readOnly /></label><label>Date et heure<input name="timestamp" type="datetime-local" max={localDateTimeMax()} required /></label><label>Nombre de personnes<input name="peopleCount" type="number" min="0" required /></label><label>Achalandage<select name="crowdLevel"><option value="faible">Faible</option><option value="moyenne">Moyen</option><option value="elevee">Élevé</option></select></label><label>Proximité<select name="proximity"><option value="loin">Loin</option><option value="moyenne">Moyenne</option><option value="proche">Proche</option></select></label><label>Ambiance<select name="vibe"><option value="calme">Calme</option><option value="moderee">Modérée</option><option value="animee">Animée</option><option value="bruyante">Bruyante</option></select></label><label className="wide">Notes<textarea name="notes" /></label>{status.error && <p className="notice error wide">{status.error}</p>}{status.success && <p className="notice success wide">{status.success}</p>}<button className="primary" disabled={status.busy || !locations.length}>{status.busy ? 'Envoi…' : 'Soumettre'}</button></form></main>
}

function Account() {
  const { user, logout } = useAuth(); const [data, setData] = useState(null); const [error, setError] = useState('')
  const load = () => Promise.all([api.contributions(), api.contributedLocations(), api.favorites(), api.locations()]).then(([c,l,f,a]) => setData({ contributions:c.data, locations:l.data, favorites:f.data, available:a.data })).catch(e => setError(e.message))
  useEffect(() => { load() }, [])
  async function toggle(location) { try { if (data.favorites.includes(location)) await api.removeFavorite(location); else await api.addFavorite(location); await load() } catch(e) { setError(e.message) } }
  return <main className="account"><section className="profile"><p className="eyebrow">Mon espace</p><h1>{user.displayName}</h1><p>{user.email}</p><p>Membre depuis le {new Date(user.createdAt).toLocaleDateString('fr-CA')}</p><button onClick={() => logout()}>Se déconnecter</button></section>{error && <p className="notice error">{error}</p>}{!data ? <p>Chargement de vos données…</p> : <div className="cards"><Section title="Mes contributions" empty="Vous n’avez encore partagé aucune observation.">{data.contributions.map(o => <article key={o._id}><strong>{locationLabel(o.location)}</strong><span>{new Date(o.timestamp).toLocaleString('fr-CA')} · {o.vibe} · {o.peopleCount} personne(s)</span></article>)}</Section><Section title="Mes lieux" empty="Aucun lieu visité pour le moment.">{data.locations.map(l => <article key={l.location}><strong>{locationLabel(l.location)}</strong><span>{l.contributionCount} contribution(s)</span></article>)}</Section><Section title="Favoris" empty="Aucun favori. Ajoutez-en ci-dessous.">{data.favorites.map(l => <article key={l}><strong>{locationLabel(l)}</strong><button onClick={() => toggle(l)}>Retirer</button></article>)}<div className="chips">{data.available.filter(l => !data.favorites.includes(l)).map(l => <button key={l} onClick={() => toggle(l)}>＋ {locationLabel(l)}</button>)}</div></Section></div>}</main>
}
function Section({ title, empty, children }) { const items = Array.isArray(children) ? children.flat().filter(Boolean) : [children]; return <section className="card"><h2>{title}</h2>{items.length ? children : <p>{empty}</p>}</section> }

function GlobalHeader() {
  const { user, logout } = useAuth()
  return <header>
    <Link className="brand" to="/">Ambiance Montréal</Link>
    <nav aria-label="Navigation principale">
      <Link to="/">Carte publique</Link>
      <Link to="/comparer">Comparer les lieux</Link>
      {user ? <>
        <Link className="header-action" to="/espace?view=observe">Contribuer</Link>
        <Link to="/espace?view=account">Mon compte</Link>
        <button className="header-logout" onClick={() => logout()}>Se déconnecter</button>
      </> : <Link className="header-action" to="/espace?view=auth">Se connecter</Link>}
    </nav>
  </header>
}

function App() {
  return (
    <div className="shell">
      <GlobalHeader />

      <Suspense fallback={<main className="public-page"><p>Chargement de la page…</p></main>}>
      <Routes>
        <Route path="/" element={<PublicMapPage />} />
        <Route path="/comparer" element={<CompareLocationsPage />} />
        <Route path="/lieux/:slug" element={<LocationDetailsPage />} />
        <Route path="/espace" element={<MemberArea />} />
        <Route path="*" element={<main className="public-page"><h1>Page introuvable</h1><Link to="/">Retour à la carte</Link></main>} />
      </Routes>
      </Suspense>
    </div>
  )
}

export default App
