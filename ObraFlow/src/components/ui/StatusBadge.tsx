import type { StatusAtividade, StatusFuncionario } from '../../models/domain'

interface StatusBadgeProps {
  status: StatusAtividade | StatusFuncionario
}

const labels: Record<StatusAtividade | StatusFuncionario, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  ativo: 'Ativo',
  inativo: 'Inativo',
}

const styles: Record<StatusAtividade | StatusFuncionario, string> = {
  nao_iniciada: 'border-slate-300 bg-slate-100 text-slate-700',
  em_andamento: 'border-amber-300 bg-amber-100 text-amber-900',
  concluida: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  ativo: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  inativo: 'border-rose-300 bg-rose-100 text-rose-900',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}
