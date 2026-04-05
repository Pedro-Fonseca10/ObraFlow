import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type {
  Atividade,
  AtribuicaoDetalhada,
  Funcionario,
} from '../../models/domain'
import { dataService } from '../../services/api'
import { formatDateTime } from '../../utils/formatters'

interface AssignmentFormState {
  funcionarioId: string
  atividadeId: string
}

const initialFormState: AssignmentFormState = {
  funcionarioId: '',
  atividadeId: '',
}

export function AssignmentsPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoDetalhada[]>([])
  const [form, setForm] = useState<AssignmentFormState>(initialFormState)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setErrorMessage('')

    try {
      const [funcionariosData, atividadesData, atribuicoesData] =
        await Promise.all([
          dataService.listFuncionarios(),
          dataService.listAtividades(),
          dataService.listAtribuicoesDetalhadas(),
        ])

      const ativos = funcionariosData.filter((item) => item.status === 'ativo')

      setFuncionarios(ativos)
      setAtividades(atividadesData)
      setAtribuicoes(atribuicoesData)
      setForm((previous) => ({
        funcionarioId: ativos.some((item) => item.id === previous.funcionarioId)
          ? previous.funcionarioId
          : (ativos[0]?.id ?? ''),
        atividadeId: atividadesData.some(
          (item) => item.id === previous.atividadeId,
        )
          ? previous.atividadeId
          : (atividadesData[0]?.id ?? ''),
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao carregar atribuições.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.funcionarioId || !form.atividadeId) {
      setErrorMessage('Selecione funcionário e atividade para atribuição.')
      return
    }

    setSubmitting(true)

    try {
      await dataService.createAtribuicao(form)
      setSuccessMessage('Atividade atribuída com sucesso.')
      await loadData()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao atribuir atividade.'
      setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-black text-slate-900">
          Atribuição de Atividades
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Vincule as atividades aos funcionários para organizar a execução diária.
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm font-semibold text-slate-700">
            Funcionário *
            <select
              value={form.funcionarioId}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  funcionarioId: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={funcionarios.length === 0}
            >
              {funcionarios.length === 0 && <option value="">Sem funcionários ativos</option>}
              {funcionarios.map((funcionario) => (
                <option key={funcionario.id} value={funcionario.id}>
                  {funcionario.nome} ({funcionario.cargo})
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Atividade *
            <select
              value={form.atividadeId}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  atividadeId: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={atividades.length === 0}
            >
              {atividades.length === 0 && <option value="">Sem atividades cadastradas</option>}
              {atividades.map((atividade) => (
                <option key={atividade.id} value={atividade.id}>
                  {atividade.titulo} ({atividade.status})
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={
                submitting ||
                funcionarios.length === 0 ||
                atividades.length === 0
              }
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Atribuindo...' : 'Atribuir Atividade'}
            </button>
          </div>
        </form>
      </article>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}
      {successMessage && <FeedbackMessage type="success" message={successMessage} />}

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-heading text-lg font-black text-slate-900">
            Atividades Atribuídas
          </h2>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-600">Carregando...</p>
        ) : atribuicoes.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Nenhuma atribuição registrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Funcionário</th>
                  <th className="px-4 py-3">Atividade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Atribuída em</th>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Término</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {atribuicoes.map((atribuicao) => (
                  <tr key={atribuicao.atribuicaoId}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {atribuicao.funcionarioNome}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {atribuicao.atividadeTitulo}
                      </div>
                      <div className="text-xs text-slate-500">
                        {atribuicao.atividadeDescricao}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={atribuicao.atividadeStatus} />
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(atribuicao.dataAtribuicao)}
                    </td>
                    <td className="px-4 py-3">
                      {atribuicao.inicio ? formatDateTime(atribuicao.inicio) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {atribuicao.termino ? formatDateTime(atribuicao.termino) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
