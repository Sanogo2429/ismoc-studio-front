import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, Phone, Sparkles, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { forgotPassword, login, register, startGoogleLogin } from '../services/authService'
import { postLoginPath } from '../services/session'
import './Portal.css'

/** État de navigation transmis à la page de connexion (après une inscription réussie). */
interface AuthLocationState {
  registeredEmail?: string
}

interface ApiErrorBody {
  message?: string
  title?: string
  errors?: Record<string, string[]>
}

/** Message exact renvoyé par l'API (validation, règle métier, erreur serveur), sinon `fallback`. */
function authErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return 'Impossible de joindre le serveur IsMoc. Vérifiez votre connexion puis réessayez (le premier accès peut prendre jusqu’à une minute).'
    }
    const data = error.response.data
    if (data && typeof data === 'object') {
      const validationMessage = data.errors ? Object.values(data.errors).flat().join(' ') : ''
      return validationMessage || data.message || data.title || fallback
    }
    return fallback
  }
  return error instanceof Error && error.message ? error.message : fallback
}

function AuthPage() {
  const location = useLocation()
  const isSignup = location.pathname === '/inscription'
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('session') === 'expired') return 'Votre session a expiré. Reconnectez-vous pour continuer.'
    if (params.get('error') === 'google') return 'La connexion avec Google a échoué ou a été annulée. Réessayez, ou connectez-vous avec votre e-mail.'
    return ''
  })
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  // Arrivée depuis une inscription réussie : message de confirmation + e-mail pré-rempli.
  const registeredEmail = isSignup ? undefined : (location.state as AuthLocationState | null)?.registeredEmail

  useEffect(() => {
    // Retour de Google : le jeton arrive dans le fragment (#token=…), jamais envoyé aux serveurs ni dans le
    // Referer. (La query ?token= reste lue pour compatibilité avec une API pas encore redémarrée.)
    const params = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.search)
    const token = params.get('token') ?? new URLSearchParams(location.search).get('token')
    const name = params.get('name') ?? new URLSearchParams(location.search).get('name')

    if (token === null || name === null) return

    localStorage.setItem('token', token)
    localStorage.setItem('userName', name)
    // replace : l'URL contenant le jeton disparaît de l'historique du navigateur.
    // Cockpit pour un administrateur, « Mon espace » pour un client.
    navigate(postLoginPath(), { replace: true })
  }, [location.hash, location.search, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const credentials = { email, password }

    setIsLoading(true)

    try {
      if (isSignup) {
        await register({
            firstName: String(formData.get('firstName') ?? ''),
            lastName: String(formData.get('lastName') ?? ''),
            phoneNumber: String(formData.get('phoneNumber') ?? ''),
            email,
            password,
          })
        // Inscription réussie : PAS de connexion automatique (le jeton renvoyé est ignoré). L'utilisateur
        // s'authentifie explicitement sur la page de connexion, son e-mail déjà pré-rempli.
        navigate('/connexion', { replace: true, state: { registeredEmail: email } satisfies AuthLocationState })
        return
      }

      const response = await login(credentials)
      localStorage.setItem('token', response.token)
      localStorage.setItem('userName', response.fullName)
      // Administrateur → cockpit /admin ; client → « Mon espace ».
      navigate(postLoginPath(), { replace: true })
    } catch (requestError: unknown) {
      // Échec : message exact du serveur, jamais de message de succès.
      setError(authErrorMessage(requestError, isSignup
        ? 'L’inscription a échoué. Vérifiez vos informations et réessayez.'
        : 'Une erreur est survenue. Vérifiez vos informations et réessayez.'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('forgotEmail') ?? '')

    setIsLoading(true)

    try {
      await forgotPassword(email)
      setForgotPasswordSuccess(true)
    } catch (requestError: unknown) {
      setError(authErrorMessage(requestError, 'Impossible de traiter la demande pour le moment. Veuillez réessayer.'))
    } finally {
      setIsLoading(false)
    }
  }

  function returnToLogin() {
    setIsForgotPassword(false)
    setForgotPasswordSuccess(false)
    setError('')
  }

  return (
    <main className="auth-layout">
      {/* Zone sécurisée du haut gérée dans Portal.css (bandeau sur téléphone, logo et panneau sur grand écran). */}
      <section className="auth-story" aria-label="Présentation d'IsMoc Studio">
        <img
          className="auth-story-image"
          src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1500&q=85"
          alt="Une équipe échange autour d'un projet numérique"
        />
        <div className="auth-story-shade" />
        <Link className="portal-brand" to="/" aria-label="Retour à l'accueil IsMoc Studio">
          <span className="portal-brand-mark">I<span>/</span>M</span>
          <span><strong>IsMoc</strong><small>STUDIO</small></span>
        </Link>
        <div className="auth-story-copy">
          <span className="auth-quote-mark">“</span>
          <h1>Votre projet mérite mieux qu’un simple template.</h1>
          <p>Un parcours guidé, un résultat unique, une équipe à vos côtés.</p>
          <div className="auth-founders">
            <span className="founder-initials"><b>I</b><b>M</b></span>
            <span><strong>Ismael &amp; Moctar</strong><small>Fondateurs, IsMoc Studio · France</small></span>
          </div>
        </div>
        <span className="auth-location">STUDIO DIGITAL · FRANCE</span>
      </section>

      <section className="auth-panel">
        <Link className="auth-back" to="/"><ArrowLeft size={15} /> Retour au site</Link>
        <div className="auth-content">
          <p className="auth-eyebrow"><span /> Votre espace</p>
          <h2>{isForgotPassword ? 'Réinitialiser le mot de passe.' : isSignup ? 'Créons votre espace.' : 'Ravi de vous revoir.'}</h2>
          <p className="auth-subtitle">
            {isForgotPassword ? 'Indiquez votre adresse e-mail pour recevoir les instructions.' : isSignup ? 'Quelques secondes suffisent pour démarrer.' : 'Accédez à vos projets et échangez avec notre équipe.'}
          </p>

          {!isForgotPassword && <div className="auth-tabs" role="tablist" aria-label="Accès au compte">
            <Link role="tab" aria-selected={!isSignup} className={!isSignup ? 'is-active' : ''} to="/connexion">Se connecter</Link>
            <Link role="tab" aria-selected={isSignup} className={isSignup ? 'is-active' : ''} to="/inscription">S’inscrire</Link>
          </div>}

          {isForgotPassword ? (
            forgotPasswordSuccess ? (
              <div className="forgot-success-view">
                <p className="auth-success" role="status">Si un compte est associé à cette adresse, un e-mail avec un mot de passe temporaire vient d’être envoyé. Connectez-vous avec ce mot de passe, puis modifiez-le dans « Paramètres ».</p>
                <button className="auth-submit" type="button" onClick={returnToLogin}>Retour à la connexion</button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleForgotPassword}>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <label htmlFor="forgot-email">Email</label>
                <div className="auth-input-wrap"><Mail size={17} /><input id="forgot-email" name="forgotEmail" type="email" autoComplete="email" placeholder="vous@exemple.com" required /></div>
                <button className="auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'Envoi en cours…' : 'Envoyer les instructions'} <ArrowRight size={18} /></button>
                <button className="forgot-return" type="button" onClick={returnToLogin}><ArrowLeft size={14} /> Retour à la connexion</button>
              </form>
            )
          ) : <>
          {/* key : formulaire remonté à chaque navigation (inscription → connexion) pour appliquer l'e-mail pré-rempli. */}
          <form className="auth-form" key={location.key} onSubmit={handleSubmit}>
            {registeredEmail && !error && <p className="auth-success" role="status">Votre compte a bien été créé. Connectez-vous avec vos identifiants pour accéder à votre espace.</p>}
            {isSignup && <>
              <label htmlFor="auth-first-name">Prénom</label>
              <div className="auth-input-wrap"><UserRound size={17} /><input id="auth-first-name" name="firstName" type="text" autoComplete="given-name" placeholder="Votre prénom" required /></div>
              <label htmlFor="auth-last-name">Nom</label>
              <div className="auth-input-wrap"><UserRound size={17} /><input id="auth-last-name" name="lastName" type="text" autoComplete="family-name" placeholder="Votre nom" required /></div>
              <label htmlFor="auth-phone">Téléphone</label>
              <div className="auth-input-wrap"><Phone size={17} /><input id="auth-phone" name="phoneNumber" type="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" required /></div>
            </>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <label htmlFor="auth-email">Email</label>
            <div className="auth-input-wrap"><Mail size={17} /><input defaultValue={registeredEmail} id="auth-email" name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" required /></div>
            <label htmlFor="auth-password">Mot de passe</label>
            <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={8} placeholder="8 caractères minimum" required /><button className="password-toggle" type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {!isSignup && <button className="forgot-link" type="button" onClick={() => { setError(''); setIsForgotPassword(true) }}>Mot de passe oublié ?</button>}
            <button className="auth-submit" type="submit" disabled={isLoading}>{isLoading ? isSignup ? 'Création en cours…' : 'Connexion en cours…' : isSignup ? 'Créer mon compte' : 'Se connecter'} <ArrowRight size={18} /></button>
          </form>

          <div className="auth-divider"><span>ou continuer avec</span></div>
          <div className="auth-provider-row">
            <button type="button" className="auth-provider" onClick={startGoogleLogin}><b>G</b> Google</button>
            <button type="button" className="auth-provider" onClick={() => window.alert('La connexion Apple sera disponible prochainement.')}><b>●</b> Apple</button>
          </div>
          <button type="button" className="auth-phone" onClick={() => window.alert('La connexion par téléphone sera disponible prochainement.')}><Phone size={16} /> Se connecter par téléphone</button>
          <p className="auth-terms">En continuant, vous acceptez nos conditions et notre politique de confidentialité.</p>
          <div className="auth-trust"><span><Check size={14} /> Espace sécurisé</span><span><Sparkles size={14} /> Accompagnement humain</span></div>
          </>}
        </div>
      </section>
    </main>
  )
}

export default AuthPage