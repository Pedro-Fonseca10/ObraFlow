interface DateRangePickerProps {
  inicio: string
  fim: string
  onChange: (inicio: string, fim: string) => void
  inicioLabel?: string
  fimLabel?: string
  className?: string
}

export function DateRangePicker({
  inicio,
  fim,
  onChange,
  inicioLabel = 'Data inicial',
  fimLabel = 'Data final',
  className = '',
}: DateRangePickerProps) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {inicioLabel}
        <input
          type="date"
          value={inicio}
          max={fim || undefined}
          onChange={(event) => onChange(event.target.value, fim)}
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {fimLabel}
        <input
          type="date"
          value={fim}
          min={inicio || undefined}
          onChange={(event) => onChange(inicio, event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
    </div>
  )
}
