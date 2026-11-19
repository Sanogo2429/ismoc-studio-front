import { useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDashed,
  LogOut,
  Menu,
  Plus,
  Settings2,
  Sparkles,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { getDisplayName, hasValidSession, loginPathFor } from '../services/session'
import './HomePage.css'
import { clearSessionCache } from '../services/sessionCache'

const navigation = [
  { label: 'Services', href: '#expertises' },
  { label: 'Notre méthode', href: '#methode' },
  { label: 'Le studio', href: '#studio' },
]

// sector : clé de src/config/sectors.ts → la carte ouvre le configurateur avec ce secteur et ses idées.
const expertise = [
  { number: '01', sector: 'restauration', title: 'Restauration', detail: 'Menus, réservations & livraison', icon: Sparkles },
  { number: '02', sector: 'e-commerce', title: 'E-commerce', detail: 'Boutiques qui transforment', icon: CircleDashed },
  { number: '03', sector: 'voyage', title: 'Voyage', detail: 'Expériences & réservations', icon: WandSparkles },
  { number: '04', sector: 'sante', title: 'Santé', detail: 'Parcours patients simplifiés', icon: Plus },
  { number: '05', sector: 'services', title: 'Services', detail: 'Vitrine & prise de rendez-vous', icon: Settings2 },
  { number: '06', sector: 'sur-mesure', title: 'Sur mesure', detail: 'Votre idée n’entre dans aucune case', icon: ArrowUpRight, featured: true },
]

const method = [
  {
    number: '01',
    title: 'Façonnez',
    detail: "Utilisez l'IA ou notre parcours manuel pour donner une structure claire à votre idée.",
    icon: Sparkles,
  },
  {
    number: '02',
    title: 'Construisons',
    detail: 'Ismael & Moctar conçoivent et codent votre produit entièrement sur mesure.',
    icon: WandSparkles,
  },
  {
    number: '03',
    title: 'Lancez',
    detail: 'Votre site ou application passe en ligne, avec un suivi et une maintenance continue.',
    icon: Settings2,
  },
]

/** Cofondateurs. `photo` : URL d'une VRAIE photo (ex. /team/ismael.webp dans public/) ; null = monogramme. */
const FOUNDERS: Array<{ name: string; initials: string; role: string; photo: string | null; tone: 'ink' | 'amber' }> = [
  { name: 'Ismael', initials: 'Is', role: 'Stratégie & conception', photo: null, tone: 'ink' },
  { name: 'Moctar', initials: 'Mo', role: 'Développement & produit', photo: null, tone: 'amber' },
]

function Brand() {
  return (
    <a className="brand" href="#accueil" aria-label="IsMoc Studio, accueil">
      <span className="brand-mark" aria-hidden="true">
        <span>I</span><span>/</span><span>M</span>
      </span>
      <span className="brand-copy">
        <strong>IsMoc</strong>
        <small>STUDIO</small>
      </span>
    </a>
  )
}

interface SessionInfo {
  isLoggedIn: boolean
  name: string
  /** « Mon espace » : toujours l'espace client (/dashboard). Le cockpit /admin reste un accès séparé, réservé aux Admin. */
  spacePath: string
  /** « Créer / Démarrer mon projet » : configurateur si connecté ; sinon connexion, puis page d'accueil selon le rôle. */
  projectPath: string
}

const CONFIGURATOR_PATH = '/configurator'
const CLIENT_SPACE_PATH = '/dashboard'

function readSession(): SessionInfo {
  const isLoggedIn = hasValidSession()
  return {
    isLoggedIn,
    name: getDisplayName('Mon compte'),
    spacePath: isLoggedIn ? CLIENT_SPACE_PATH : '/connexion',
    projectPath: isLoggedIn ? CONFIGURATOR_PATH : loginPathFor(CONFIGURATOR_PATH),
  }
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase('fr-FR')).join('') || 'IM'
}

function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Menu burger ouvert : la page ne défile plus derrière ; Échap le ferme.
  useBodyScrollLock(mobileMenuOpen)
  useEffect(() => {
    if (!mobileMenuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [mobileMenuOpen])
  const [session, setSession] = useState<SessionInfo>(readSession)

  // Déconnexion : session effacée et en-tête mis à jour immédiatement.
  function logout() {
    localStorage.removeItem('token')
    clearSessionCache()
    localStorage.removeItem('userName')
    setSession(readSession())
    setMobileMenuOpen(false)
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav className={`main-nav${mobileMenuOpen ? ' is-open' : ''}`} aria-label="Navigation principale">
            <div className="nav-links">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </a>
              ))}
              {session.isLoggedIn ? (
                <span className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2" title={session.name}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FDF0D5] text-[12px] font-bold text-[#AF5109]">{initialsOf(session.name)}</span>
                    <span className="max-w-[140px] truncate text-[13px] font-bold text-[#111a2e]">{session.name}</span>
                  </span>
                  <Link className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-bold text-[#111a2e] transition hover:border-slate-400" to={session.spacePath} onClick={() => setMobileMenuOpen(false)}>Mon espace</Link>
                  <button className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 transition hover:text-[#111a2e]" onClick={logout} type="button"><LogOut size={14} /> Déconnexion</button>
                </span>
              ) : (
                <Link className="nav-login" to="/connexion" onClick={() => setMobileMenuOpen(false)}>Connexion</Link>
              )}
            </div>
            <Link className="button button-orange header-cta" to={session.projectPath} onClick={() => setMobileMenuOpen(false)}>
              Créer mon projet <ArrowRight size={17} strokeWidth={1.8} />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero section-wrap" id="accueil">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> Studio digital · basé en France</p>
            <h1>
              Votre application<br />
              ou site,<br />
              <span>façonné par vous</span><br />
              <span>— construit par<br className="desktop-break" /> nous.</span>
            </h1>
            <p className="hero-intro">
              Donnez forme à votre idée avec notre configurateur intelligent. Ismael &amp; Moctar
              transforment ensuite votre vision en un produit digital prêt à grandir.
            </p>
            <div className="hero-actions">
              <Link className="button button-orange" to={session.projectPath}>
                Démarrer mon projet <ArrowRight size={18} />
              </Link>
              <Link className="button button-outline" to={session.spacePath}>
                {session.isLoggedIn ? 'Mon espace' : 'Se connecter'} <UserRound size={17} strokeWidth={1.8} />
              </Link>
            </div>
            {/* Preuve vérifiable : les deux interlocuteurs réels (initiales), pas de photos de banque d'images ni de note invérifiable. */}
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>Is</span>
                <span className="avatar-alt">Mo</span>
              </div>
              <p><strong>Ismael &amp; Moctar</strong><span>vos interlocuteurs, du brief à la livraison</span></p>
            </div>
          </div>

          <div className="hero-art" role="img" aria-label="Aperçu d'une expérience digitale conçue par IsMoc Studio">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-label">DIGITAL PRODUCTS — 2025</div>
            <div className="device-shadow" />
            <div className="laptop">
              <div className="laptop-screen">
                <div className="prototype-topbar"><span>NOA</span><span>Menu</span></div>
                <div className="prototype-canvas">
                  <span className="prototype-kicker">VOYAGE SUR MESURE</span>
                  <div className="prototype-phone">
                    <img src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=680&q=85" alt="Vagues sur une plage au coucher du soleil" />
                    <div className="phone-overlay" />
                    <div className="phone-content">
                      <span>UNE AUTRE IDÉE DU VOYAGE</span>
                      <strong>Réservez<br />l’ailleurs.</strong>
                      <span className="phone-button">Explorer <ArrowRight size={11} /></span>
                    </div>
                  </div>
                  <span className="prototype-pagination">01 — 04</span>
                </div>
                <div className="prototype-footer"><span>VOYAGE SUR MESURE</span><span>01 — 04</span></div>
              </div>
            </div>
            <div className="floating-note note-ai">
              <span className="note-icon note-icon-orange"><Sparkles size={18} /></span>
              <span><strong>Conçu avec intelligence</strong><small>Votre idée, accélérée par l’IA</small></span>
            </div>
            <div className="floating-note note-human">
              <span className="note-icon note-icon-green"><Check size={18} /></span>
              <span><strong>Suivi humain</strong><small>Du brief jusqu’à la livraison</small></span>
            </div>
          </div>
        </section>

        <section className="stats-band" aria-label="IsMoc Studio en chiffres">
          <div className="stats-inner">
            {/* Chiffres vérifiables uniquement : 3 générations IA gratuites par compte (quota de l'API). */}
            <p><strong>3</strong><span>maquettes IA gratuites</span></p>
            <p><strong>06</strong><span>secteurs maîtrisés</span></p>
            <p><strong>14j</strong><span>pour une première version développée</span></p>
            <blockquote>“Une agence qui écoute avant de créer.”</blockquote>
          </div>
        </section>

        <section className="expertise-section section-wrap" id="expertises">
          <div className="section-heading expertise-heading">
            <p className="section-index">01 — Expertises</p>
            <h2>Chaque secteur a ses codes.<br /><span>Nous créons les vôtres.</span></h2>
            <p className="section-description">Des expériences digitales pensées autour de vos clients, de vos ambitions et de la réalité de votre marché.</p>
          </div>
          <div className="expertise-grid">
            {expertise.map(({ number, sector, title, detail, icon: Icon, featured }) => {
              const target = `${CONFIGURATOR_PATH}?secteur=${sector}`
              return (
              <Link className={`expertise-card${featured ? ' expertise-card-featured' : ''}`} key={number} to={session.isLoggedIn ? target : loginPathFor(target)}>
                <span className="card-number">{number}</span>
                <Icon className="card-icon" size={21} strokeWidth={1.8} />
                <span className="card-bottom">
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </span>
                <ArrowRight className="card-arrow" size={17} />
              </Link>
              )
            })}
          </div>
        </section>

        <section className="method-section" id="methode">
          <div className="method-inner section-wrap">
            <div className="section-heading method-heading">
              <p className="section-index">02 — Notre méthode</p>
              <h2>Le meilleur de la technologie.<br /><span>Et surtout, de l’humain.</span></h2>
            </div>
            <div className="method-grid">
              {method.map(({ number, title, detail, icon: Icon }) => (
                <article className="method-card" key={number}>
                  <span className="card-number">{number}</span>
                  <span className="method-icon"><Icon size={25} strokeWidth={1.7} /></span>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="studio-section section-wrap" id="studio">
          <div className="section-heading studio-heading">
            <p className="section-index">03 — Le studio</p>
            <h2>Deux expertises.<br /><span>Une même exigence.</span></h2>
          </div>
          <div className="studio-grid">
            {/* Monogrammes en attendant de vraies photos (champ `photo` de FOUNDERS) : jamais de portraits de banque d'images. */}
            {FOUNDERS.map(({ name, initials, role, photo, tone }) => (
              <article className={`founder-card founder-card-${tone}`} key={name}>
                {photo
                  ? <img src={photo} alt={`Portrait de ${name}, cofondateur d’IsMoc Studio`} loading="lazy" />
                  : <span className="founder-monogram" aria-hidden="true">{initials}</span>}
                <div className="founder-caption"><strong>{name}</strong><span>{role}</span></div>
              </article>
            ))}
            <blockquote className="studio-quote">
              <Sparkles size={22} />
              <p>“Nous ne créons pas juste des interfaces. Nous construisons les outils qui font avancer vos idées.”</p>
              <span>Ismael &amp; Moctar, cofondateurs</span>
            </blockquote>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact-inner">
            <p className="eyebrow"><span className="eyebrow-dot" /> Une idée en tête ?</p>
            <h2>Faisons-en quelque chose<br /><span>de remarquable.</span></h2>
            <Link className="button button-dark" to={session.projectPath}>
              Démarrer mon projet <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <Brand />
          <p>© 2026 IsMoc Studio. Tous droits réservés.</p>
          <nav aria-label="Liens de pied de page">
            <a href="#contact">Contact</a>
            <Link to="/mentions-legales">Mentions légales</Link>
            <Link to="/cgv">CGV</Link>
            <Link to="/confidentialite">Confidentialité</Link>
          </nav>
        </div>
      </footer>

      <a className="scroll-cue" href="#expertises" aria-label="Découvrir nos expertises">
        <ArrowDown size={16} />
      </a>
    </div>
  )
}

export default HomePage