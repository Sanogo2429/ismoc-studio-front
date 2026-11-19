import { useEffect, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { LEGAL } from '../config/legal'

export type LegalDoc = 'mentions' | 'cgv' | 'confidentialite'

const DOCS: Array<{ id: LegalDoc; path: string; title: string; short: string }> = [
  { id: 'mentions', path: '/mentions-legales', title: 'Mentions légales', short: 'Mentions légales' },
  { id: 'cgv', path: '/cgv', title: 'Conditions générales de vente', short: 'CGV' },
  { id: 'confidentialite', path: '/confidentialite', title: 'Politique de confidentialité', short: 'Confidentialité' },
]

/** Valeur de src/config/legal.ts, ou repère visible « À compléter » tant qu'elle n'est pas renseignée. */
function Info({ value, hint }: { value: string | null; hint: string }) {
  if (value) return <>{value}</>
  return <mark className="rounded bg-amber-100 px-1.5 py-0.5 text-[0.92em] font-semibold text-amber-900">À compléter : {hint}</mark>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight text-[#111a2e]" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-slate-600 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[#111a2e]">{children}</div>
    </section>
  )
}

const Company = () => <Info hint="raison sociale" value={LEGAL.companyName} />
const Email = () => (LEGAL.email ? <a className="font-semibold text-[#b45309] underline underline-offset-2" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> : <Info hint="e-mail de contact" value={null} />)

function Mentions() {
  return (
    <>
      <Section title="Éditeur du site">
        <p>Le site IsMoc Studio est édité par <strong><Company /></strong>, <Info hint="forme juridique et capital" value={LEGAL.legalForm} />.</p>
        <ul>
          <li>Siège : <Info hint="adresse du siège" value={LEGAL.address} /></li>
          <li>Immatriculation : <Info hint="SIREN / SIRET et RCS" value={LEGAL.registration} /></li>
          <li>TVA : <Info hint="n° de TVA ou mention d'exonération" value={LEGAL.vat} /></li>
          <li>Contact : <Email />{LEGAL.phone && <> · {LEGAL.phone}</>}</li>
          <li>Directeur de la publication : <Info hint="nom du directeur de la publication" value={LEGAL.publicationDirector} /></li>
        </ul>
      </Section>
      <Section title="Hébergement">
        <ul>
          <li><strong>Site web</strong> : Vercel Inc. — vercel.com</li>
          <li><strong>Serveur applicatif</strong> : Render Services, Inc. — render.com</li>
          <li><strong>Base de données et fichiers</strong> : Supabase, Inc. — supabase.com (données hébergées en Europe, Irlande)</li>
        </ul>
        <p><Info hint="adresse postale et téléphone de chaque hébergeur (obligatoires), à reprendre de leurs propres mentions légales" value={null} /></p>
      </Section>
      <Section title="Propriété intellectuelle">
        <p>Les textes, logos, éléments graphiques et le code du site sont la propriété de <Company />. Toute reproduction sans autorisation écrite est interdite.</p>
        <p>Les droits sur les maquettes et projets réalisés pour un client sont régis par les <Link className="font-semibold text-[#b45309] underline underline-offset-2" to="/cgv">conditions générales de vente</Link>.</p>
      </Section>
      <Section title="Données personnelles">
        <p>Le traitement de vos données est décrit dans la <Link className="font-semibold text-[#b45309] underline underline-offset-2" to="/confidentialite">politique de confidentialité</Link>.</p>
      </Section>
    </>
  )
}

function Cgv() {
  return (
    <>
      <Section title="Objet">
        <p>Les présentes conditions encadrent les prestations de <Company /> : conception et développement de sites et d’applications sur mesure, à partir d’une maquette réalisée sur la plateforme IsMoc Studio.</p>
      </Section>
      <Section title="Maquette et devis">
        <ul>
          <li>La création d’un compte est gratuite. Chaque compte dispose de <strong>3 générations</strong> et <strong>6 retouches</strong> de maquette par l’IA, gratuites. Le mode manuel est gratuit et illimité.</li>
          <li>Le prix du projet est calculé à partir de la maquette et affiché avant toute commande. Toute modification de la maquette après le devis entraîne un nouveau calcul.</li>
          <li>Les prix sont exprimés en euros, <Info hint="HT ou TTC" value={null} />.</li>
        </ul>
      </Section>
      <Section title="Commande et paiement">
        <ul>
          <li>Le prix du projet est réglé en <strong>trois échéances égales</strong> : à la commande, à mi-parcours, puis à la livraison.</li>
          <li>Moyens de paiement acceptés : carte bancaire, Orange Money, Wave, MTN Mobile Money, Moov Money ou virement bancaire.</li>
          <li><Info hint="conséquences d'un retard ou d'un défaut de paiement" value={null} /></li>
        </ul>
      </Section>
      <Section title="Maintenance">
        <p>Une formule de maintenance peut être ajoutée à la commande : sans maintenance, mensuelle, ou annuelle (15 % de remise par rapport au tarif mensuel). <Info hint="durée d'engagement et modalités de résiliation" value={null} /></p>
      </Section>
      <Section title="Délais et livraison">
        <p><Info hint="délai de livraison et point de départ (ex. première version développée sous 14 jours après le premier paiement)" value={null} /></p>
      </Section>
      <Section title="Droit de rétractation">
        <p><Info hint="conditions du droit de rétractation de 14 jours pour les clients particuliers, et ses exceptions (prestation personnalisée, exécution commencée avec accord exprès)" value={null} /></p>
      </Section>
      <Section title="Propriété du projet livré">
        <p><Info hint="moment du transfert des droits sur le projet au client (ex. au paiement complet) et éléments exclus" value={null} /></p>
      </Section>
      <Section title="Responsabilité et litiges">
        <p><Info hint="limites de responsabilité, droit applicable, médiateur de la consommation et tribunal compétent" value={null} /></p>
      </Section>
    </>
  )
}

function Confidentialite() {
  return (
    <>
      <Section title="Responsable du traitement">
        <p><strong><Company /></strong>, joignable à <Email />.</p>
      </Section>
      <Section title="Données collectées">
        <ul>
          <li><strong>Compte</strong> : prénom, nom, e-mail, téléphone et mot de passe (stocké sous forme chiffrée, jamais en clair). Avec la connexion Google : nom et e-mail transmis par Google.</li>
          <li><strong>Projets</strong> : descriptions de vos idées, maquettes générées et images d’inspiration jointes.</li>
          <li><strong>Messagerie</strong> : messages, pièces jointes et notes vocales échangés avec l’équipe.</li>
          <li><strong>Appels audio et vidéo</strong> : transmis directement entre les participants et <strong>jamais enregistrés</strong>.</li>
          <li><strong>Paiement</strong> : seuls le nom figurant sur la carte et ses 4 derniers chiffres sont conservés. Le numéro complet, la date d’expiration et le cryptogramme ne quittent jamais votre appareil.</li>
        </ul>
      </Section>
      <Section title="Pourquoi nous les utilisons">
        <p>Pour gérer votre compte, générer vos maquettes, établir devis, commandes et factures, et échanger avec vous sur votre projet. Base légale : l’exécution du contrat, et nos obligations légales pour la facturation.</p>
        <p>Le site n’utilise <strong>ni cookie publicitaire ni outil de mesure d’audience</strong>. Votre session est conservée dans le stockage local de votre navigateur.</p>
      </Section>
      <Section title="Prestataires qui traitent vos données">
        <ul>
          <li>Vercel (hébergement du site) et Render (serveur applicatif).</li>
          <li>Supabase (base de données et fichiers, hébergés en Irlande).</li>
          <li>Anthropic et OpenAI : génération des maquettes à partir de vos descriptions.</li>
          <li>Google : connexion avec un compte Google, et mise en relation des appels.</li>
          <li>Envoi des e-mails : <Info hint="prestataire d'envoi d'e-mails" value={LEGAL.emailProvider} />.</li>
        </ul>
        <p>Certains de ces prestataires sont situés aux États-Unis. Ces transferts sont encadrés par : <Info hint="garanties des transferts hors UE" value={LEGAL.transferSafeguards} />.</p>
      </Section>
      <Section title="Durée de conservation">
        <p><Info hint="durée de conservation des comptes et des projets" value={LEGAL.retention} /> Les factures sont conservées 10 ans, comme l’exige le Code de commerce.</p>
      </Section>
      <Section title="Vos droits">
        <p>Vous pouvez accéder à vos données, les corriger, les supprimer, les exporter ou vous opposer à leur traitement en écrivant à <Email />. Pour supprimer votre compte, faites-en la demande à la même adresse.</p>
        <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr).</p>
      </Section>
    </>
  )
}

/** Pages légales publiques : mentions légales, CGV, confidentialité (contenu à compléter dans src/config/legal.ts). */
function LegalPage({ doc }: { doc: LegalDoc }) {
  const current = DOCS.find((item) => item.id === doc)!
  useEffect(() => { document.title = `${current.title} · IsMoc Studio` }, [current.title])

  return (
    <div className="min-h-screen bg-white text-[#111a2e]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link aria-label="IsMoc Studio, accueil" to="/"><BrandLogo /></Link>
          <Link className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#111a2e]" to="/"><ArrowLeft size={16} /> Retour au site</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10" id="contenu">
        <nav aria-label="Documents légaux" className="flex flex-wrap gap-2">
          {DOCS.map((item) => (
            <NavLink className={({ isActive }) => `inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition ${isActive ? 'bg-[#111a2e] text-white' : 'border border-slate-200 text-slate-600 hover:border-slate-400'}`} key={item.id} to={item.path}>
              {item.short}
            </NavLink>
          ))}
        </nav>
        <h1 className="mt-8 text-[clamp(30px,5vw,44px)] font-extrabold leading-tight tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>{current.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : <Info hint="date" value={LEGAL.updatedAt} /></p>
        <div className="max-w-[68ch]">
          {doc === 'mentions' && <Mentions />}
          {doc === 'cgv' && <Cgv />}
          {doc === 'confidentialite' && <Confidentialite />}
        </div>
      </main>
    </div>
  )
}

export default LegalPage
