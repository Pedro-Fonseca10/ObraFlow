import { describe, expect, it } from 'vitest'
import {
  assertPeriodoValido,
  assertUpdateAtividadeValido,
  isPrioridadeAtividade,
  isValidIsoDate,
} from './businessRules'

describe('businessRules edge cases', () => {
  it('rejeita datas inexistentes mesmo quando seguem o formato ISO', () => {
    expect(isValidIsoDate('2026-04-31')).toBe(false)
    expect(isValidIsoDate('2026-00-10')).toBe(false)
    expect(isValidIsoDate('2026-12-32')).toBe(false)
  })

  it('aceita somente prioridades previstas pelo domínio', () => {
    expect(isPrioridadeAtividade('baixa')).toBe(true)
    expect(isPrioridadeAtividade('media')).toBe(true)
    expect(isPrioridadeAtividade('alta')).toBe(true)
    expect(isPrioridadeAtividade('urgente')).toBe(false)
    expect(isPrioridadeAtividade(null)).toBe(false)
  })

  it('permite remover responsável e data prevista de uma atividade aberta', () => {
    expect(() =>
      assertUpdateAtividadeValido(
        {
          responsavelId: null,
          dataPrevista: null,
          prioridade: 'media',
        },
        false,
      ),
    ).not.toThrow()
  })

  it('bloqueia prioridade inválida mesmo quando os demais campos são válidos', () => {
    expect(() =>
      assertUpdateAtividadeValido(
        {
          responsavelId: 'func-1',
          dataPrevista: '2026-06-10',
          prioridade: 'urgente' as never,
        },
        true,
      ),
    ).toThrow('Prioridade inválida para a atividade.')
  })

  it('bloqueia períodos com datas inválidas antes de comparar ordem', () => {
    expect(() => assertPeriodoValido('2026-02-31', '2026-01-01')).toThrow(
      'A data inicial precisa ser uma data válida.',
    )

    expect(() => assertPeriodoValido('2026-01-01', '2026-02-31')).toThrow(
      'A data final precisa ser uma data válida.',
    )
  })
})
