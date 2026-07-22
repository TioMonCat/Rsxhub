export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 md:mb-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">RSX Panel</p>
      <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-1 max-w-3xl text-sm text-slate-300 md:text-base">{subtitle}</p> : null}
    </div>
  )
}

