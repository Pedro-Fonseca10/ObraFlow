interface StatCardProps {
  title: string
  value: string
  subtitle: string
}

export function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
    </article>
  )
}
