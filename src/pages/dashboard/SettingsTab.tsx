import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { CircleCheck, Eye, EyeOff, Globe, LoaderCircle, Lock, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SettingsSkeleton } from '../../components/Skeleton'
import { api } from '../../services/api'
import { apiErrorMessage } from '../../services/apiError'
import type { AuthResponse } from '../../services/authService'
import { formatDate } from '../../services/projectTypes'
import { isGoogleSession } from '../../services/session'
import { useConnectionRestoredKey } from '../../hooks/useConnectionRestoredKey'
import PageHeader from '../../components/PageHeader'

interface AccountProfile {
  id: number
  firstName: string
  lastName: string
  fullName: string
  email: string
  phoneNumber: string
  role: string
  createdAt: string
  /** Faux pour un compte créé avec Google sans mot de passe IsMoc. */
  hasPassword?: boolean
}

function roleLabel(role: string): string {
  return role === 'Admin' ? 'Administrateur · équipe IsMoc' : 'Client'
}

function passwordError(value: string): string {
  if (value.length < 8) return 'Au moins 8 caractères.'
  if (!/[A-Za-zÀ-ÿ]/.test(value) || !/\d/.test(value)) return 'Au moins une lettre et un chiffre.'
  return ''
}

function SettingsTab({ onProfileUpdated }: { onProfileUpdated: (fullName: string) => void }) {
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loadError, setLoadError] = useState('')
  const connectionRestored = useConnectionRestoredKey()

  useEffect(() => {
    let isActive = true
    api.get<AccountProfile>('/api/Auth/me')
      .then((response) => { if (isActive) { setProfile(response.data); setLoadError('') } })
      .catch((error: unknown) => { if (isActive) setLoadError(apiErrorMessage(error, 'Impossible de charger votre compte.')) })
    return () => { isActive = false }
  }, [connectionRestored])

  return (
    <>
      <PageHeader subtitle="Vos informations personnelles et la sécurité de votre compte IsMoc Studio." title="Profil" />
      {loadError ? (
        <p className="mt-10 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{loadError}</p>
      ) : !profile ? (
        <SettingsSkeleton />
      ) : (
        <div className="mt-10 grid gap-6 xl:grid-cols-2">
          <ProfileForm
            onSaved={(updated) => {
              setProfile(updated)
              onProfileUpdated(updated.fullName)
            }}
            profile={profile}
          />
          {/* Compte Google (créé avec Google ou session Google) : pas de changement de mot de passe IsMoc. */}
          {profile.hasPassword === false || isGoogleSession() ? <GoogleAccountCard /> : <PasswordForm />}
        </div>
      )}
      {/* Lien discret vers le site public (retiré de la barre de navigation de l'espace client). */}
      <Link className="mt-8 inline-flex min-h-[44px] items-center gap-2 text-[13px] font-medium text-slate-500 transition hover:text-[#0B132B]" to="/"><Globe size={15} /> Voir le site IsMoc Studio</Link>
    </>
  )
}

function ProfileForm({ onSaved, profile }: { onSaved: (profile: AccountProfile) => void; profile: AccountProfile }) {
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const isDirty = firstName.trim() !== profile.firstName || lastName.trim() !== profile.lastName || phoneNumber.trim() !== profile.phoneNumber

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!firstName.trim() || !lastName.trim() || isSaving) return
    setIsSaving(true)
    setFeedback(null)
    try {
      const response = await api.put<AuthResponse>('/api/Auth/profile', { firstName: firstName.trim(), lastName: lastName.trim(), phoneNumber: phoneNumber.trim() })
      // Le nom figure dans le JWT : on remplace le jeton pour que la messagerie affiche le nouveau nom.
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('userName', response.data.fullName)
      onSaved({ ...profile, firstName: firstName.trim(), lastName: lastName.trim(), phoneNumber: phoneNumber.trim(), fullName: response.data.fullName })
      setFeedback({ ok: true, text: 'Vos informations ont été enregistrées.' })
    } catch (error: unknown) {
      setFeedback({ ok: false, text: apiErrorMessage(error, 'Enregistrement impossible.') })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card icon={<UserRound size={18} />} subtitle="Nom affiché dans vos échanges avec l’équipe et sur vos factures." title="Informations personnelles">
      {/* Rôle : affiché seulement pour l'équipe (pour un client, « Client » n'apporte rien). */}
      <dl className={`mb-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm ${profile.role === 'Admin' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">E-mail</dt><dd className="mt-1 break-all font-medium">{profile.email}</dd></div>
        {profile.role === 'Admin' && <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">Rôle</dt><dd className="mt-1 font-medium">{roleLabel(profile.role)}</dd></div>}
        <div><dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">Membre depuis</dt><dd className="mt-1 font-medium">{formatDate(profile.createdAt, { month: 'long', year: 'numeric' })}</dd></div>
      </dl>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <Field label="Prénom"><input autoComplete="given-name" className={INPUT} maxLength={60} onChange={(event) => setFirstName(event.target.value)} required value={firstName} /></Field>
        <Field label="Nom"><input autoComplete="family-name" className={INPUT} maxLength={60} onChange={(event) => setLastName(event.target.value)} required value={lastName} /></Field>
        <Field className="sm:col-span-2" label="Téléphone"><input autoComplete="tel" className={INPUT} inputMode="tel" maxLength={20} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+33 6 12 34 56 78" value={phoneNumber} /></Field>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <button className={PRIMARY_BUTTON} disabled={!isDirty || !firstName.trim() || !lastName.trim() || isSaving} type="submit">{isSaving && <LoaderCircle className="animate-spin" size={15} />} Enregistrer</button>
          {feedback && <Feedback {...feedback} />}
        </div>
      </form>
    </Card>
  )
}

/** Compte Google : la connexion passe par Google, il n'y a pas de mot de passe IsMoc à modifier. */
function GoogleAccountCard() {
  return (
    <Card icon={<Lock size={18} />} subtitle="Votre compte est relié à Google." title="Connexion avec Google">
      <p className="text-sm leading-6 text-slate-600">Vous vous connectez avec votre compte Google : il n’y a pas de mot de passe IsMoc à modifier ici. La sécurité de votre connexion est gérée par Google.</p>
      <p className="mt-3 text-[13px] leading-5 text-slate-500">Pour pouvoir aussi vous connecter avec votre e-mail, définissez un mot de passe via « Mot de passe oublié » sur la page de connexion.</p>
    </Card>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  const newError = submitted ? passwordError(newPassword) : ''
  const confirmError = submitted && confirmation !== newPassword ? 'Les mots de passe ne correspondent pas.' : ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setFeedback(null)
    if (!currentPassword || passwordError(newPassword) || confirmation !== newPassword || isSaving) return
    setIsSaving(true)
    try {
      await api.post('/api/Auth/change-password', { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSubmitted(false)
      setFeedback({ ok: true, text: 'Votre mot de passe a été modifié.' })
    } catch (error: unknown) {
      setFeedback({ ok: false, text: apiErrorMessage(error, 'Modification impossible.') })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card icon={<Lock size={18} />} subtitle="8 caractères minimum, avec au moins une lettre et un chiffre." title="Mot de passe">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field label="Mot de passe actuel"><PasswordInput autoComplete="current-password" onChange={setCurrentPassword} required value={currentPassword} /></Field>
        <Field error={newError} label="Nouveau mot de passe"><PasswordInput autoComplete="new-password" onChange={setNewPassword} value={newPassword} /></Field>
        <Field error={confirmError} label="Confirmer le nouveau mot de passe"><PasswordInput autoComplete="new-password" onChange={setConfirmation} value={confirmation} /></Field>
        <div className="flex flex-wrap items-center gap-4">
          <button className={PRIMARY_BUTTON} disabled={isSaving} type="submit">{isSaving && <LoaderCircle className="animate-spin" size={15} />} Modifier le mot de passe</button>
          {feedback && <Feedback {...feedback} />}
        </div>
      </form>
    </Card>
  )
}

const INPUT = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#F59E0B] focus:ring-4 focus:ring-amber-100'
const PRIMARY_BUTTON = 'inline-flex items-center gap-2 rounded-xl bg-[#0B132B] px-5 py-3 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

function Card({ children, icon, subtitle, title }: { children: ReactNode; icon: ReactNode; subtitle: string; title: string }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDF0D5] text-[#AF5109]">{icon}</span>
        <div><h2 className="text-base font-bold">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div>
      </div>
      {children}
    </section>
  )
}

/** Champ mot de passe avec bouton afficher / masquer (même comportement que l'écran de connexion). */
function PasswordInput({ autoComplete, onChange, required = false, value }: { autoComplete: string; onChange: (value: string) => void; required?: boolean; value: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative block">
      <input autoComplete={autoComplete} className={`${INPUT} pr-12`} onChange={(event) => onChange(event.target.value)} required={required} type={visible ? 'text' : 'password'} value={value} />
      <button aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-[#0B132B]" onClick={() => setVisible((current) => !current)} type="button">
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  )
}

function Field({ children, className = '', error, label }: { children: ReactNode; className?: string; error?: string; label: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-red-600">{error}</span>}
    </label>
  )
}

function Feedback({ ok, text }: { ok: boolean; text: string }) {
  return <p className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-red-600'}`} role={ok ? 'status' : 'alert'}>{ok && <CircleCheck size={14} />}{text}</p>
}

export default SettingsTab
