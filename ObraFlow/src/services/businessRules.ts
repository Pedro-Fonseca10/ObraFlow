import type {
  PrioridadeAtividade,
  StatusAtividade,
  UpdateAtividadeInput,
} from '../models/domain'

const PRIORIDADES_ACEITAS = ['baixa', 'media', 'alta'] as const

export function isPrioridadeAtividade(
  value: unknown,
): value is PrioridadeAtividade {
  return (
    typeof value === 'string' &&
    PRIORIDADES_ACEITAS.includes(value as PrioridadeAtividade)
  )
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

export function assertPeriodoValido(inicio: string, fim: string): void {
  if (!isValidIsoDate(inicio)) {
    throw new Error('A data inicial precisa ser uma data válida.')
  }

  if (!isValidIsoDate(fim)) {
    throw new Error('A data final precisa ser uma data válida.')
  }

  if (inicio > fim) {
    throw new Error('A data inicial precisa ser anterior ou igual à final.')
  }
}

export function assertAtividadePodeSerReprogramada(
  status: StatusAtividade,
): void {
  if (status === 'concluida') {
    throw new Error('Atividades concluídas não podem ser reprogramadas.')
  }
}

export function assertUpdateAtividadeValido(
  input: UpdateAtividadeInput,
  responsavelExiste: boolean,
): void {
  if (input.responsavelId !== undefined && input.responsavelId !== null) {
    if (!responsavelExiste) {
      throw new Error('Responsável informado não encontrado.')
    }
  }

  if (input.dataPrevista !== undefined && input.dataPrevista !== null) {
    if (!isValidIsoDate(input.dataPrevista)) {
      throw new Error('A data prevista precisa ser uma data válida.')
    }
  }

  if (input.prioridade !== undefined && !isPrioridadeAtividade(input.prioridade)) {
    throw new Error('Prioridade inválida para a atividade.')
  }
}
