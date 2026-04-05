import { useEffect, useState } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import type { IndicadoresDashboard } from '../../models/domain'
import { dataService } from '../../services/api'
import { formatPercentage, todayIsoDate } from '../../utils/formatters'

const defaultIndicators: IndicadoresDashboard = {
  presentes: 0,
  ausentes: 0,
  taxaAbsenteismo: 0,
  turnoverInicial: 0,
}

interface IndicadorAtribuicao {
  funcionariosComTarefa: number
  totalFuncionarios: number
  taxaAtribuicao: number
}

const defaultIndicadorAtribuicao: IndicadorAtribuicao = {
  funcionariosComTarefa: 0,
  totalFuncionarios: 0,
  taxaAtribuicao: 0,
}

interface WorkspaceMetric {
  label: string
  value: string
  detail: string
  insight: string
  rate: number
  barClassName: string
  valueClassName: string
}

const referenceDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function clampRate(value: number): number {
  return Math.max(0, Math.min(value, 100))
}

function formatReferenceDate(value: string): string {
  const parsedDate = new Date(`${value}T12:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return referenceDateFormatter.format(parsedDate)
}

function getCoverageInsight(rate: number): string {
  if (rate >= 85) {
    return 'A maior parte da equipe já está distribuída na referência.'
  }

  if (rate >= 60) {
    return 'Há frente ativa, mas ainda existe equipe livre para redistribuição.'
  }

  if (rate > 0) {
    return 'Priorize novas atribuições para fechar o turno.'
  }

  return 'Nenhuma atribuição vinculada até o momento.'
}

function getPresenceInsight(rate: number): string {
  if (rate >= 92) {
    return 'Presença sólida para tocar a operação sem pressão.'
  }

  if (rate >= 80) {
    return 'Presença estável, com margem curta para remanejamentos.'
  }

  if (rate > 0) {
    return 'A disponibilidade da equipe pede revisão de cobertura.'
  }

  return 'Sem presença registrada para a referência selecionada.'
}

function getAbsenceInsight(rate: number): string {
  if (rate <= 3) {
    return 'Absenteísmo sob controle para a leitura atual.'
  }

  if (rate <= 8) {
    return 'Atenção moderada para remanejamento de equipe.'
  }

  return 'Pressão alta: revise faltas e cobertura imediatamente.'
}

function getTurnoverInsight(rate: number): string {
  if (rate <= 5) {
    return 'Rotação inicial baixa e dentro de uma faixa estável.'
  }

  if (rate <= 10) {
    return 'Acompanhe desligamentos e vínculos recentes.'
  }

  return 'Rotação pressionada: vale revisar retenção e substituições.'
}

export function DashboardPage() {
  const [dataReferencia, setDataReferencia] = useState(todayIsoDate())
  const [indicadores, setIndicadores] =
    useState<IndicadoresDashboard>(defaultIndicators)
  const [indicadorAtribuicao, setIndicadorAtribuicao] =
    useState<IndicadorAtribuicao>(defaultIndicadorAtribuicao)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    void loadIndicadores(dataReferencia)
  }, [dataReferencia])

  async function loadIndicadores(date: string) {
    setLoading(true)
    setErrorMessage('')

    try {
      const [result, funcionarios, atribuicoes] = await Promise.all([
        dataService.getIndicadoresDashboard(date),
        dataService.listFuncionarios(),
        dataService.listAtribuicoesDetalhadas(),
      ])

      const totalFuncionarios = funcionarios.length
      const funcionariosComTarefa = new Set(
        atribuicoes.map((item) => item.funcionarioId),
      ).size
      const taxaAtribuicao =
        totalFuncionarios === 0
          ? 0
          : Number(((funcionariosComTarefa / totalFuncionarios) * 100).toFixed(1))

      setIndicadores(result)
      setIndicadorAtribuicao({
        funcionariosComTarefa,
        totalFuncionarios,
        taxaAtribuicao,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao carregar os indicadores.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const totalFuncionarios = indicadorAtribuicao.totalFuncionarios
  const funcionariosSemTarefa = Math.max(
    totalFuncionarios - indicadorAtribuicao.funcionariosComTarefa,
    0,
  )
  const taxaPresenca =
    totalFuncionarios === 0
      ? 0
      : Number(((indicadores.presentes / totalFuncionarios) * 100).toFixed(1))
  const referenceLabel = formatReferenceDate(dataReferencia)

  const workspaceMetrics: WorkspaceMetric[] = [
    {
      label: 'Cobertura de atribuição',
      value: loading ? '...' : formatPercentage(indicadorAtribuicao.taxaAtribuicao),
      detail: loading
        ? 'Conferindo funcionários com tarefa atribuída.'
        : totalFuncionarios === 0
          ? 'Cadastre a equipe para medir a cobertura das atribuições.'
          : `${indicadorAtribuicao.funcionariosComTarefa} de ${totalFuncionarios} funcionários alocados na referência.`,
      insight: getCoverageInsight(indicadorAtribuicao.taxaAtribuicao),
      rate: indicadorAtribuicao.taxaAtribuicao,
      barClassName: 'bg-sky-500',
      valueClassName: 'text-sky-700',
    },
    {
      label: 'Presença registrada',
      value: loading ? '...' : String(indicadores.presentes),
      detail: loading
        ? 'Conferindo presença útil da equipe.'
        : totalFuncionarios === 0
          ? 'Sem equipe base cadastrada para compor a presença.'
          : `${formatPercentage(taxaPresenca)} da equipe disponível na data de referência.`,
      insight: getPresenceInsight(taxaPresenca),
      rate: taxaPresenca,
      barClassName: 'bg-emerald-500',
      valueClassName: 'text-emerald-700',
    },
    {
      label: 'Ausências registradas',
      value: loading ? '...' : String(indicadores.ausentes),
      detail: loading
        ? 'Somando faltas registradas.'
        : 'Funcionários com falta registrada no turno selecionado.',
      insight: getAbsenceInsight(indicadores.taxaAbsenteismo),
      rate: indicadores.taxaAbsenteismo,
      barClassName: 'bg-slate-900',
      valueClassName: 'text-slate-950',
    },
    {
      label: 'Absenteísmo diário',
      value: loading ? '...' : formatPercentage(indicadores.taxaAbsenteismo),
      detail: loading
        ? 'Calculando pressão diária de faltas.'
        : 'Taxa diária de ausências com base na equipe selecionada.',
      insight: getAbsenceInsight(indicadores.taxaAbsenteismo),
      rate: indicadores.taxaAbsenteismo,
      barClassName: 'bg-sky-400',
      valueClassName: 'text-sky-700',
    },
    {
      label: 'Turnover inicial',
      value: loading ? '...' : formatPercentage(indicadores.turnoverInicial),
      detail: loading
        ? 'Atualizando rotação simplificada.'
        : 'Percentual simplificado de inativos sobre a base atual.',
      insight: getTurnoverInsight(indicadores.turnoverInicial),
      rate: indicadores.turnoverInicial,
      barClassName: 'bg-emerald-400',
      valueClassName: 'text-emerald-700',
    },
  ]

  const priorities = [
    {
      label: 'Redistribuição',
      value: loading ? '...' : `${funcionariosSemTarefa} livres`,
      detail: loading
        ? 'Analisando disponibilidade da equipe.'
        : funcionariosSemTarefa === 0
          ? 'Toda a base já está vinculada a uma atividade.'
          : `${funcionariosSemTarefa} funcionários seguem sem tarefa e podem ser realocados.`,
      note:
        funcionariosSemTarefa === 0
          ? 'Cobertura total'
          : 'Ajustar distribuição',
      markerClassName:
        funcionariosSemTarefa === 0 ? 'bg-emerald-500' : 'bg-sky-500',
      valueClassName:
        funcionariosSemTarefa === 0 ? 'text-emerald-700' : 'text-slate-950',
    },
    {
      label: 'Cobertura de faltas',
      value: loading ? '...' : formatPercentage(indicadores.taxaAbsenteismo),
      detail: loading
        ? 'Lendo faltas registradas.'
        : getAbsenceInsight(indicadores.taxaAbsenteismo),
      note: indicadores.ausentes === 0 ? 'Sem pressão' : 'Revisar escala',
      markerClassName:
        indicadores.ausentes === 0 ? 'bg-emerald-500' : 'bg-slate-900',
      valueClassName:
        indicadores.ausentes === 0 ? 'text-emerald-700' : 'text-slate-950',
    },
    {
      label: 'Retenção inicial',
      value: loading ? '...' : formatPercentage(indicadores.turnoverInicial),
      detail: loading
        ? 'Calculando rotação da base.'
        : getTurnoverInsight(indicadores.turnoverInicial),
      note:
        indicadores.turnoverInicial <= 5 ? 'Faixa estável' : 'Acompanhar vínculos',
      markerClassName:
        indicadores.turnoverInicial <= 5 ? 'bg-emerald-500' : 'bg-sky-500',
      valueClassName:
        indicadores.turnoverInicial <= 5 ? 'text-emerald-700' : 'text-slate-950',
    },
  ]

  const summaryItems = [
    {
      label: 'Base da equipe',
      value: loading ? '...' : String(totalFuncionarios),
      caption: 'Funcionários cadastrados para compor a obra.',
      valueClassName: 'text-slate-950',
    },
    {
      label: 'Com tarefa',
      value: loading ? '...' : String(indicadorAtribuicao.funcionariosComTarefa),
      caption: 'Equipe vinculada a alguma atividade na referência.',
      valueClassName: 'text-sky-700',
    },
    {
      label: 'Sem tarefa',
      value: loading ? '...' : String(funcionariosSemTarefa),
      caption: 'Base disponível para redistribuição ou nova frente.',
      valueClassName: 'text-slate-950',
    },
    {
      label: 'Presentes',
      value: loading ? '...' : String(indicadores.presentes),
      caption: 'Equipe efetivamente útil na leitura do turno.',
      valueClassName: 'text-emerald-700',
    },
  ]

  let consolidatedMessage = 'Atualizando indicadores da referência selecionada.'

  if (!loading) {
    if (totalFuncionarios === 0) {
      consolidatedMessage =
        'Ainda não há funcionários cadastrados para compor a leitura operacional.'
    } else {
      consolidatedMessage = `${indicadorAtribuicao.funcionariosComTarefa} de ${totalFuncionarios} funcionários estão com tarefa, ${indicadores.ausentes} ausentes foram registrados e o absenteísmo marca ${formatPercentage(indicadores.taxaAbsenteismo)} na referência de ${referenceLabel}.`
    }
  }

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-900/5">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Painel do turno
            </p>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="font-heading text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">
                  Dashboard Operacional
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Leitura consolidada de presença, atribuição e rotação para
                  orientar a operação na referência selecionada.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Referência
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {referenceLabel}
                </p>
              </div>
            </div>

            <div className="mt-8 divide-y divide-slate-200">
              {workspaceMetrics.map((metric) => (
                <article
                  key={metric.label}
                  className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1.15fr)_auto_minmax(0,0.9fr)] lg:items-center"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {metric.detail}
                    </p>
                  </div>

                  <p
                    className={`font-heading text-4xl font-black tracking-[-0.05em] ${metric.valueClassName}`}
                  >
                    {metric.value}
                  </p>

                  <div className="lg:justify-self-end lg:text-right">
                    <div className="h-2.5 w-full max-w-56 overflow-hidden rounded-full bg-slate-200 lg:ml-auto">
                      <div
                        className={`h-full rounded-full ${metric.barClassName}`}
                        style={{ width: `${clampRate(metric.rate)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {metric.insight}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="relative overflow-hidden border-t border-slate-200 bg-slate-950 px-6 py-6 text-slate-50 xl:border-l xl:border-t-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.16),_transparent_28%)]" />

            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                Atualização
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Selecione a data de referência para recalcular os indicadores do
                turno e revisar o estado operacional.
              </p>

              <label className="mt-6 block text-sm font-semibold text-slate-100">
                Data de referência
                <input
                  type="date"
                  value={dataReferencia}
                  onChange={(event) => setDataReferencia(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/20 [color-scheme:dark]"
                />
              </label>

              <button
                type="button"
                onClick={() => void loadIndicadores(dataReferencia)}
                className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Atualizar leitura
              </button>

              <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Base da equipe</span>
                  <strong className="text-lg font-semibold text-white">
                    {loading ? '...' : totalFuncionarios}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Com tarefa</span>
                  <strong className="text-lg font-semibold text-sky-200">
                    {loading ? '...' : indicadorAtribuicao.funcionariosComTarefa}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Sem tarefa</span>
                  <strong className="text-lg font-semibold text-white">
                    {loading ? '...' : funcionariosSemTarefa}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-300">Presença útil</span>
                  <strong className="text-lg font-semibold text-emerald-200">
                    {loading ? '...' : formatPercentage(taxaPresenca)}
                  </strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-900/5 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Prioridades do turno
              </p>
              <h2 className="mt-2 font-heading text-2xl font-black tracking-[-0.04em] text-slate-950">
                Onde a operação pede resposta rápida
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Leitura orientada por cobertura, faltas e retenção.
            </p>
          </div>

          <div className="mt-8 divide-y divide-slate-200">
            {priorities.map((item) => (
              <article
                key={item.label}
                className="grid gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${item.markerClassName}`}
                />

                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.detail}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className={`text-lg font-semibold ${item.valueClassName}`}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {item.note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-900/5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Quadro resumido
          </p>
          <h2 className="mt-2 font-heading text-2xl font-black tracking-[-0.04em] text-slate-950">
            Composição atual da equipe
          </h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {item.label}
                </p>
                <p
                  className={`mt-3 font-heading text-3xl font-black tracking-[-0.04em] ${item.valueClassName}`}
                >
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.caption}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[24px] bg-slate-950 px-5 py-5 text-slate-50">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
              Leitura consolidada
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {consolidatedMessage}
            </p>
          </div>
        </section>
      </div>
    </section>
  )
}
