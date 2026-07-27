import { ReactNode } from 'react'

export function SectionTitle({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
}) {
  return (
    <div className="mb-2">
      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white italic flex items-center gap-3">
        {icon}
        {title}
      </h2>
      {subtitle ? <p className="text-xs md:text-sm text-slate-400 mt-1">{subtitle}</p> : null}
    </div>
  )
}
