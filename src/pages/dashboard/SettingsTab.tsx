import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { CircleCheck, Globe, LoaderCircle, Lock, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SettingsSkeleton } from '../../components/Skeleton'
import { api } from '../../services/api'
import { apiErrorMessage } from '../../services/apiError'
import type { AuthResponse } from '../../services/authService'
import { formatDate } from '../../services/projectTypes'
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

  useEffect(() => {
    let isActive = true
    api.get<AccountProfile>('/api/Auth/me')
      .then((response) => { if (isActive) setProfile(response.data) })
      .catch((error: unknown) => { if (isActive) setLoadError(apiErrorMessage(error, 'Impossible de charger votre compte.')) })
    return () => { isActive = false }
  }, [])

  return (
    <>
      <PageHeader subtitle="Les informations de votre compte IsMoc Studio." title="Paramètres" />
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
          <PasswordForm />
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
      <dl className="mb-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">E-mail</dt><dd className="mt-1 break-all font-medium">{profile.email}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rôle</dt><dd className="mt-1 font-medium">{roleLabel(profile.role)}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Membre depuis</dt><dd className="mt-1 font-medium">{formatDate(profile.createdAt, { month: 'long', year: 'numeric' })}</dd></div>
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
        <Field label="Mot de passe actuel"><input autoComplete="current-password" className={INPUT} onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} /></Field>
        <Field error={newError} label="Nouveau mot de passe"><input autoComplete="new-password" className={INPUT} onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} /></Field>
        <Field error={confirmError} label="Confirmer le nouveau mot de passe"><input autoComplete="new-password" className={INPUT} onChange={(event) => setConfirmation(event.target.value)} type="password" value={confirmation} /></Field>
        <p className="text-[11px] leading-5 text-slate-500">Compte créé avec Google ? Utilisez « Mot de passe oublié » sur la page de connexion pour définir un mot de passe.</p>
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

function Field({ children, className = '', error, label }: { children: ReactNode; className?: string; error?: string; label: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
    </label>
  )
}

function Feedback({ ok, text }: { ok: boolean; text: string }) {
  return <p className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-red-600'}`} role={ok ? 'status' : 'alert'}>{ok && <CircleCheck size={14} />}{text}</p>
}

export default SettingsTab
