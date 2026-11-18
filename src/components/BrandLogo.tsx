/**
 * Logo IsMoc Studio : pictogramme I/M + « IsMoc » / « STUDIO », identique sur toutes les pages applicatives.
 * tone : fond sur lequel le logo est posé (clair : pictogramme marine ; sombre : pictogramme blanc).
 */
interface BrandLogoProps {
  tone?: 'light' | 'dark'
  size?: 'sm' | 'lg'
}

function BrandLogo({ size = 'sm', tone = 'light' }: BrandLogoProps) {
  const isLarge = size === 'lg'
  const mark = tone === 'dark' ? 'bg-white text-[#0B132B]' : 'bg-[#0B132B] text-white'
  return (
    <span className="flex items-center gap-3">
      <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-xl font-extrabold tracking-tight ${mark} ${isLarge ? 'h-[46px] w-[46px] text-lg' : 'h-10 w-10 text-sm'}`}>
        I<span className="text-[#F59E0B]">/</span>M
      </span>
      <span className="leading-none">
        <strong className={`block font-bold tracking-tight ${isLarge ? 'text-[22px]' : 'text-[18px]'}`}>IsMoc</strong>
        <small className={`mt-1 block text-[11px] font-semibold tracking-[0.35em] ${tone === 'dark' ? 'text-white/80' : 'text-slate-500'}`}>STUDIO</small>
      </span>
    </span>
  )
}

export default BrandLogo
