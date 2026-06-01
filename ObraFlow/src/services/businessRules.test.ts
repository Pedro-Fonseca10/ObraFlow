import { describe, expect, it } from 'vitest'
import {
  assertAtividadePodeSerReprogramada,
  assertPeriodoValido,
  assertUpdateAtividadeValido,
  isValidIsoDate,
} from './businessRules'

describe('businessRules', () => {
  it('bloqueia reprogramação de atividade concluída', () => {
    expect(() => assertAtividadePodeSerReprogramada('concluida')).toThrow(
      'Atividades concluídas não podem ser reprogramadas.',
    )
  })

  it('permite reprogramação de atividade pendente ou em andamento', () => {
    expect(() => assertAtividadePodeSerReprogramada('nao_iniciada')).not.toThrow()
    expect(() => assertAtividadePodeSerReprogramada('em_andamento')).not.toThrow()
  })

  it('valida datas ISO reais', () => {
    expect(isValidIsoDate('2026-05-31')).toBe(true)
    expect(isValidIsoDate('2026-02-31')).toBe(false)
    expect(isValidIsoDate('31/05/2026')).toBe(false)
  })

  it('valida intervalo de período', () => {
    expect(() => assertPeriodoValido('2026-05-01', '2026-05-31')).not.toThrow()
    expect(() => assertPeriodoValido('2026-06-01', '2026-05-31')).toThrow(
      'A data inicial precisa ser anterior ou igual à final.',
    )
  })

  it('valida responsável, data prevista e prioridade de atualização', () => {
    expect(() =>
      assertUpdateAtividadeValido(
        {
          responsavelId: 'func-1',
          dataPrevista: '2026-05-31',
          prioridade: 'alta',
        },
        true,
      ),
    ).not.toThrow()

    expect(() =>
      assertUpdateAtividadeValido({ responsavelId: 'func-inexistente' }, false),
    ).toThrow('Responsável informado não encontrado.')

    expect(() =>
      assertUpdateAtividadeValido({ dataPrevista: '2026-13-01' }, true),
    ).toThrow('A data prevista precisa ser uma data válida.')
  })
})
