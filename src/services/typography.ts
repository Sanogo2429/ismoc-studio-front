/**
 * Typographie française pour les textes dynamiques (messages de la messagerie, réponses d'IsMoc AI, textes déjà
 * enregistrés) : espace fine insécable (U+202F) avant ! ? ; et espace insécable (U+00A0) avant « : ».
 * Les textes fixes de l'application sont déjà écrits avec ces espaces.
 * Les adresses (https://…), les heures (11:48) et les signes doublés en milieu de mot ne sont pas modifiés.
 */
const NNBSP = ' '
const NBSP = ' '

export function frenchTypography(text: string): string {
  return text
    // Espace ordinaire (ou mal choisie) avant le signe -> espace insécable adéquate.
    .replace(/([^\s([{«“‘'"/\\])[    ]([!?;:])(?=[\s'"’”»)\]}.,…!?]|$)/gu, (_, before: string, mark: string) => `${before}${mark === ':' ? NBSP : NNBSP}${mark}`)
    // Signe collé au mot (« Merci! », « Prix: 300 € ») -> espace insécable ajoutée.
    .replace(/(\p{L})([!?])(?=[\s'"’”»)\]}]|$)/gu, (_, before: string, mark: string) => `${before}${NNBSP}${mark}`)
    .replace(/(\p{L})([:;])(?=\s)/gu, (_, before: string, mark: string) => `${before}${mark === ':' ? NBSP : NNBSP}${mark}`)
}
