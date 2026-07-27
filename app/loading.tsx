export default function Loading() {
  return (
    <div className="w-full space-y-6 animate-pulse min-h-[55vh] py-6">
      <div className="h-24 w-full bg-white/5 border border-white/10 rounded-none" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-52 bg-white/5 border border-white/10 rounded-none" />
        <div className="h-52 bg-white/5 border border-white/10 rounded-none" />
        <div className="h-52 bg-white/5 border border-white/10 rounded-none" />
      </div>
    </div>
  )
}

