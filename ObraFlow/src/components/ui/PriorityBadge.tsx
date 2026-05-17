import type { PrioridadeAtividade } from '../../models/domain'

interface PriorityBadgeProps {
  prioridade: PrioridadeAtividade
}

const labels: Record<PrioridadeAtividade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

const styles: Record<PrioridadeAtividade, string> = {
  baixa: 'border-slate-300 bg-slate-100 text-slate-700',
  media: 'border-amber-300 bg-amber-100 text-amber-900',
  alta: 'border-rose-300 bg-rose-100 text-rose-900',
}

export function PriorityBadge({ prioridade }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles[prioridade]}`}
    >
      {labels[prioridade]}
    </span>
  )
}
