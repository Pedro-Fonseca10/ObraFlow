import { useEffect, useState } from 'react'
import { BarChart } from '../../components/ui/BarChart'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import type { ProdutividadeFuncionario } from '../../models/domain'
import { dataService } from '../../services/api'
import { daysFromNowIso, todayIsoDate } from '../../utils/formatters'

export function ProductivityPage() {
  const [inicio, setInicio] = useState(daysFromNowIso(-30))
  const [fim, setFim] = useState(todayIsoDate())
  const [data, setData] = useState<ProdutividadeFuncionario[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    void load(inicio, fim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(rangeInicio: string, rangeFim: string) {
    if (!rangeInicio || !rangeFim) return
    setLoading(true)
    setErrorMessage('')
    try {
      const result = await dataService.getProdutividadePorFuncionario(
        rangeInicio,
        rangeFim,
      )
      setData(result)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao calcular produtividade.',
      )
    } finally {
      setLoading(false)
    }
  }

  const totalConcluidas = data.reduce((acc, item) => acc + item.totalConcluidas, 0)
  const colaboradoresAtivos = data.filter((item) => item.totalConcluidas > 0).length

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-black text-slate-900">
              Produtividade por Colaborador
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Contagem de atividades efetivamente <strong>concluídas</strong> por
              colaborador no período selecionado. Atividades pendentes, em andamento
              ou atrasadas são ignoradas.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <DateRangePicker
            inicio={inicio}
            fim={fim}
            onChange={(novoInicio, novoFim) => {
              setInicio(novoInicio)
              setFim(novoFim)
            }}
          />
          <button
            type="button"
            onClick={() => void load(inicio, fim)}
            disabled={loading}
            className="h-fit rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Calculando...' : 'Atualizar leitura'}
          </button>
        </div>
      </article>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Total concluído
          </p>
          <p className="mt-2 font-heading text-3xl font-black text-slate-950">
            {loading ? '...' : totalConcluidas}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Atividades finalizadas no período.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Colaboradores ativos
          </p>
          <p className="mt-2 font-heading text-3xl font-black text-emerald-700">
            {loading ? '...' : colaboradoresAtivos}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Pessoas com ao menos uma conclusão.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Equipe analisada
          </p>
          <p className="mt-2 font-heading text-3xl font-black text-sky-700">
            {loading ? '...' : data.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Colaboradores comparados no relatório.
          </p>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-lg font-black text-slate-900">
          Comparativo visual
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ranking proporcional de conclusões dentro do período.
        </p>

        <div className="mt-5">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : (
            <BarChart
              items={data.map((item) => ({
                label: item.funcionarioNome,
                value: item.totalConcluidas,
                caption: `${item.cargo}${item.equipe ? ` • ${item.equipe}` : ''}`,
              }))}
              barClassName="bg-emerald-500"
              emptyMessage="Nenhum colaborador concluiu atividades no período."
            />
          )}
        </div>
      </article>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-heading text-lg font-black text-slate-900">
            Tabela detalhada
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Equipe</th>
                <th className="px-4 py-3 text-right">Atividades concluídas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {data.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                    Sem dados para o período selecionado.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.funcionarioId}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.funcionarioNome}
                    </td>
                    <td className="px-4 py-3">{item.cargo}</td>
                    <td className="px-4 py-3">{item.equipe ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-heading text-base font-bold text-emerald-700">
                      {item.totalConcluidas}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
