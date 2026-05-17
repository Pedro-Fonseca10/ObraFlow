interface BarChartItem {
  label: string
  value: number
  caption?: string
}

interface BarChartProps {
  items: BarChartItem[]
  emptyMessage?: string
  barClassName?: string
  valueFormatter?: (value: number) => string
}

export function BarChart({
  items,
  emptyMessage = 'Sem dados para o período selecionado.',
  barClassName = 'bg-sky-500',
  valueFormatter,
}: BarChartProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    )
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const percent = (item.value / maxValue) * 100
        return (
          <li key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-800">{item.label}</span>
              <span className="font-heading text-base font-bold text-slate-950">
                {valueFormatter ? valueFormatter(item.value) : item.value}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barClassName}`}
                style={{ width: `${Math.max(percent, item.value === 0 ? 0 : 4)}%` }}
              />
            </div>
            {item.caption && (
              <p className="mt-1 text-xs text-slate-500">{item.caption}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
