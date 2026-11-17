import type { ReactNode } from 'react'

/**
 * Squelettes de chargement : mêmes dimensions que le contenu final, pour que la page ne « saute » pas
 * quand les données arrivent (stabilité visuelle / CLS). Annoncés aux lecteurs d'écran via role="status".
 */

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded-lg bg-slate-200/70 motion-reduce:animate-none ${className}`} />
}

function Loading({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className={className} role="status">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** Cartes de projet (onglet Mes projets). */
export function ProjectCardsSkeleton() {
  return (
    <Loading className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3" label="Chargement de vos projets…">
      {[0, 1].map((index) => (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" key={index}>
          <SkeletonBlock className="h-36 rounded-none" />
          <div className="space-y-3 p-6">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-5 w-3/4" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="mt-4 h-2 w-full rounded-full" />
          </div>
        </div>
      ))}
    </Loading>
  )
}

/** Bulles de messages (dans la messagerie, avant l'arrivée de l'historique). */
export function MessageBubblesSkeleton() {
  return (
    <Loading className="space-y-5 py-2" label="Chargement des messages…">
      {['w-2/3', 'ml-auto w-1/2', 'w-3/5', 'ml-auto w-2/5'].map((width, index) => (
        <SkeletonBlock className={`h-14 rounded-xl ${width}`} key={index} />
      ))}
    </Loading>
  )
}

/** Messagerie complète (onglet Messages, avant la liste des conversations). */
export function ConversationSkeleton() {
  return (
    <Loading className="flex min-h-0 flex-1 flex-col md:block" label="Chargement de vos conversations…">
      <SkeletonBlock className="mb-3 h-16 rounded-2xl md:mb-4 md:h-[76px]" />
      <div className="flex h-[min(620px,calc(var(--app-height)-15rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white md:h-[620px]">
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3 md:px-6 md:py-5">
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2"><SkeletonBlock className="h-3 w-32" /><SkeletonBlock className="h-2.5 w-24" /></div>
        </div>
        <div className="flex-1 bg-[#F7F8FA] px-4 py-4 md:px-6"><MessageBubblesSkeleton /></div>
        <div className="border-t border-slate-200/80 px-3 py-2.5"><SkeletonBlock className="h-11 w-full rounded-xl" /></div>
      </div>
    </Loading>
  )
}

/** Cartes de commande (onglet Facturation). */
export function BillingSkeleton() {
  return (
    <Loading className="mt-10 space-y-6" label="Chargement de vos factures…">
      {[0, 1].map((index) => (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6" key={index}>
          <div className="flex justify-between gap-4"><SkeletonBlock className="h-5 w-1/2" /><SkeletonBlock className="h-7 w-24" /></div>
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-5/6" />
          <SkeletonBlock className="h-3 w-2/3" />
        </div>
      ))}
    </Loading>
  )
}

/** Formulaires de profil et de mot de passe (onglet Paramètres). */
export function SettingsSkeleton() {
  return (
    <Loading className="mt-10 grid gap-6 xl:grid-cols-2" label="Chargement de votre compte…">
      {[4, 3].map((fields, index) => (
        <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6" key={index}>
          <SkeletonBlock className="h-5 w-40" />
          {Array.from({ length: fields }, (_, field) => (
            <div className="space-y-2" key={field}><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-12 w-full rounded-xl" /></div>
          ))}
          <SkeletonBlock className="h-12 w-40 rounded-xl" />
        </div>
      ))}
    </Loading>
  )
}

/** Page de suivi d'un projet. */
export function ProjectPageSkeleton() {
  return (
    <Loading className="space-y-6" label="Chargement de votre projet…">
      <div className="space-y-3"><SkeletonBlock className="h-3 w-28" /><SkeletonBlock className="h-9 w-2/3" /><SkeletonBlock className="h-3 w-1/2" /></div>
      <SkeletonBlock className="h-28 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonBlock className="h-64 w-full rounded-2xl" />
        <SkeletonBlock className="h-64 w-full rounded-2xl" />
      </div>
    </Loading>
  )
}
