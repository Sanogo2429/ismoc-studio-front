import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Action « Nouveau projet » : même libellé et même style (ambre) dans tout l'espace client
 * (accueil, Mes projets, états vides de Messages et Facturation).
 */
function NewProjectLink({ className = '' }: { className?: string }) {
  return (
    <Link className={`inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-6 text-[13px] font-bold text-[#0B132B] shadow-lg shadow-amber-500/25 transition hover:brightness-95 ${className}`} to="/configurator">
      <Plus size={18} /> Nouveau projet
    </Link>
  )
}

export default NewProjectLink
