import { isGeneralThread, isPaid, type ProjectSummary } from './projectTypes'

/** Rubriques de l'espace client, portées par /dashboard?tab=… (Accueil par défaut). */
export type ClientNavId = 'home' | 'projects' | 'messages' | 'billing' | 'settings'

export const CLIENT_NAV_IDS: ClientNavId[] = ['home', 'projects', 'messages', 'billing', 'settings']

/** id du champ de saisie de la messagerie du dashboard (pour « Nous écrire »). */
export const DASHBOARD_CHAT_INPUT_ID = 'dashboard-message'

/**
 * Hauteur de la messagerie (page Suivi de projet) sur téléphone : la zone visible (--app-height, réduite par le clavier) moins l'en-tête (4rem), la barre de
 * navigation inférieure (4rem), les zones de sécurité et une marge de respiration (2rem) — la barre de
 * saisie flotte ainsi toujours au-dessus de la barre du bas. Tablette / ordinateur : hauteur fixe (md:h-…).
 */
export const MOBILE_CHAT_HEIGHT = 'h-[calc(var(--app-height)-10rem-var(--safe-top)-var(--safe-bottom))] min-h-[420px]'

/**
 * Conversation ouverte par défaut : un projet payé, sinon le projet le plus récent,
 * sinon la « Discussion générale · Avant-projet » (client sans projet).
 */
export function defaultConversationProject(projects: ProjectSummary[]): ProjectSummary | undefined {
  const realProjects = projects.filter((project) => !isGeneralThread(project))
  return realProjects.find((project) => isPaid(project.status)) ?? realProjects[0] ?? projects.find(isGeneralThread)
}

/** Page d'un projet selon son état : suivi (payé), paiement (commandé) ou maquette (brouillon). */
export function projectPath(project: ProjectSummary): string {
  const id = encodeURIComponent(project.projectId)
  if (isPaid(project.status)) return `/client/project/${id}`
  if (project.status === 'ordered') return `/configurator/checkout?id=${id}`
  return `/configurator/preview?id=${id}`
}
