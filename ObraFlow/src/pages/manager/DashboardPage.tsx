import { useEffect, useState } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { StatCard } from '../../components/ui/StatCard'
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

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-black text-slate-900">
          Dashboard Operacional
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Indicadores de atribuição, ausência, absenteísmo e turnover inicial.
        </p>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <label className="w-full text-sm font-semibold text-slate-700 md:max-w-xs">
            Data de referência
            <input
              type="date"
              value={dataReferencia}
              onChange={(event) => setDataReferencia(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <button
            type="button"
            onClick={() => void loadIndicadores(dataReferencia)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
          >
            Atualizar
          </button>
        </div>
      </div>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Funcionários com tarefa"
          value={
            loading
              ? '...'
              : `${indicadorAtribuicao.funcionariosComTarefa}/${indicadorAtribuicao.totalFuncionarios}`
          }
          subtitle={
            loading
              ? 'Calculando cobertura de atribuição...'
              : `${formatPercentage(indicadorAtribuicao.taxaAtribuicao)} da equipe com tarefa atribuída`
          }
        />

        <StatCard
          title="Ausentes"
          value={loading ? '...' : String(indicadores.ausentes)}
          subtitle="Funcionários com falta registrada"
        />

        <StatCard
          title="Absenteísmo"
          value={loading ? '...' : formatPercentage(indicadores.taxaAbsenteismo)}
          subtitle="Taxa diária de ausências"
        />

        <StatCard
          title="Turnover Inicial"
          value={loading ? '...' : formatPercentage(indicadores.turnoverInicial)}
          subtitle="Percentual simplificado de inativos"
        />
      </div>
    </section>
  )
}
