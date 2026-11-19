/**
 * Secteurs de l'accueil → configurateur (/configurator?secteur=<key>).
 * manualSector : secteur présélectionné dans le Mode Manuel (null = aucun équivalent direct).
 * ideas : suggestions en un clic dans le Mode IA (remplissent la description, modifiable ensuite).
 */
export interface SectorPreset {
  key: string
  title: string
  manualSector: string | null
  ideas: string[]
}

export const SECTOR_PRESETS: SectorPreset[] = [
  {
    key: 'restauration',
    title: 'Restauration',
    manualSector: 'Restauration & livraison',
    ideas: [
      'Un site pour mon restaurant avec le menu du jour, la réservation de table et la commande à emporter.',
      'Une application de livraison de repas pour les restaurants de mon quartier, avec suivi de la commande.',
    ],
  },
  {
    key: 'e-commerce',
    title: 'E-commerce',
    manualSector: 'E-commerce & boutique',
    ideas: [
      'Une boutique en ligne pour mes créations de bijoux, avec paiement Mobile Money et suivi des commandes.',
      'Un catalogue en ligne pour mon magasin de vêtements, avec commande par WhatsApp.',
    ],
  },
  {
    key: 'voyage',
    title: 'Voyage',
    manualSector: 'Tourisme & hôtellerie',
    ideas: [
      'Un site d’agence de voyage avec nos circuits, une demande de devis et les avis des voyageurs.',
      'Un site de réservation pour ma maison d’hôtes, avec le calendrier des disponibilités.',
    ],
  },
  {
    key: 'sante',
    title: 'Santé',
    manualSector: 'Santé & bien-être',
    ideas: [
      'Un site pour mon cabinet médical avec prise de rendez-vous en ligne et informations pratiques.',
      'Une application pour les patients d’une clinique : rendez-vous, documents et rappels.',
    ],
  },
  {
    key: 'services',
    title: 'Services',
    manualSector: null,
    ideas: [
      'Un site vitrine pour mon salon de coiffure, avec les tarifs et la prise de rendez-vous.',
      'Un site pour mon entreprise de plomberie, avec une demande de devis en ligne.',
    ],
  },
  { key: 'sur-mesure', title: 'Sur mesure', manualSector: null, ideas: [] },
]

export function findSectorPreset(key: string | null): SectorPreset | undefined {
  return key ? SECTOR_PRESETS.find((preset) => preset.key === key) : undefined
}

/** Suggestions affichées : celles du secteur choisi, sinon une idée par secteur. */
export function suggestedIdeas(preset: SectorPreset | undefined): string[] {
  if (preset?.ideas.length) return preset.ideas
  return SECTOR_PRESETS.filter((item) => item.ideas.length).slice(0, 3).map((item) => item.ideas[0])
}
