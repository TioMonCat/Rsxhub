'use client'

interface ClassBadgeProps {
  className?: string
  classTag: string
}

export function ClassBadge({ classTag, className = '' }: ClassBadgeProps) {
  const tag = String(classTag || '').trim().toUpperCase()
  
  let bgClass = 'bg-slate-800 text-slate-350 border border-white/10'
  
  if (tag.includes('GT3') || tag === 'GT') {
    // Pure WEC GT3 green from image
    bgClass = 'bg-[#009f00] text-white font-black italic border border-green-400/20'
  } else if (tag.includes('LMP2') || tag === 'P2' || tag.includes('PROT')) {
    // Pure WEC LMP2 blue from image
    bgClass = 'bg-[#0072f0] text-white font-black italic border border-blue-400/20'
  } else if (tag.includes('HYPERCAR') || tag === 'HC' || tag.includes('LMH') || tag.includes('LMDH')) {
    // Pure WEC Hypercar red
    bgClass = 'bg-[#e10600] text-white font-black italic border border-red-500/20'
  }

  return (
    <span className={`inline-block px-2 py-0.5 text-[9px] tracking-wider uppercase rounded-none select-none ${bgClass} ${className}`}>
      {tag}
    </span>
  )
}
