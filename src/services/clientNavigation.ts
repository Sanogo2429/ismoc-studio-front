import { isGeneralThread, isPaid, type ProjectSummary } from './projectTypes'

/** Rubriques de l'espace client, portées par /dashboard?tab=… */
export type ClientNavId = 'projects' | 'messages' | 'billing' | 'settings'

export const CLIENT_NAV_IDS: ClientNavId[] = ['projects', 'messages', 'billing', 'settings']

/** id du champ de saisie de la messagerie du dashboard (pour « Nous écrire »). */
export const DASHBOARD_CHAT_INPUT_ID = 'dashboard-message'

/**
 * Hauteur de la messagerie sur téléphone : la zone visible (100dvh) moins l'en-tête (4rem), la barre de
 * navigation inférieure (4rem), les zones de sécurité et une marge de respiration (2rem) — la barre de
 * saisie flotte ainsi toujours au-dessus de la barre du bas. Tablette / ordinateur : hauteur fixe (md:h-…).
 */
export const MOBILE_CHAT_HEIGHT = 'h-[calc(100dvh-10rem-var(--safe-top)-var(--safe-bottom))] min-h-[420px]'

/**
 * Conversation ouverte par défaut : un projet payé, sinon le projet le plus récent,
 * sinon la « Discussion générale · Avant-projet » (client sans projet).
 */
export function defaultConversationProject(projects: ProjectSummary[]): ProjectSummary | undefined {
  const realProjects = projects.filter((project) => !isGeneralThread(project))
  return realProjects.find((project) => isPaid(project.status)) ?? realProjects[0] ?? projects.find(isGeneralThread)
}
