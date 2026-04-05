import { useEffect, useState } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import type { AtividadeDoFuncionario } from '../../models/domain'
import { dataService } from '../../services/api'
import { formatDateTime } from '../../utils/formatters'

export function MyActivitiesPage() {
  const { user } = useAuth()

  const [atividades, setAtividades] = useState<AtividadeDoFuncionario[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingActivityId, setPendingActivityId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user?.funcionarioId) {
      void loadAtividades(user.funcionarioId)
      return
    }

    setLoading(false)
    setErrorMessage('Seu usuário não está vinculado a um cadastro de funcionário.')
  }, [user])

  async function loadAtividades(funcionarioId: string) {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = await dataService.listAtividadesDoFuncionario(funcionarioId)
      setAtividades(data)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Falha ao carregar suas atividades.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  async function iniciarAtividade(atividadeId: string) {
    if (!user?.funcionarioId) {
      return
    }

    setPendingActivityId(atividadeId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await dataService.iniciarAtividade(user.funcionarioId, atividadeId)
      setSuccessMessage('Atividade iniciada com sucesso.')
      await loadAtividades(user.funcionarioId)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao iniciar atividade.'
      setErrorMessage(message)
    } finally {
      setPendingActivityId(null)
    }
  }

  async function finalizarAtividade(atividadeId: string) {
    if (!user?.funcionarioId) {
      return
    }

    setPendingActivityId(atividadeId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await dataService.finalizarAtividade(user.funcionarioId, atividadeId)
      setSuccessMessage('Atividade finalizada com sucesso.')
      await loadAtividades(user.funcionarioId)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao finalizar atividade.'
      setErrorMessage(message)
    } finally {
      setPendingActivityId(null)
    }
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredAtividades =
    normalizedSearch === ''
      ? atividades
      : atividades.filter((atividade) =>
          [atividade.titulo, atividade.atividadeId]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch),
        )

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-black text-slate-900">
              Minhas Atividades
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Inicie e finalize somente as atividades atribuídas ao seu cadastro.
            </p>
          </div>

          <label className="w-full max-w-sm text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Buscar atividade
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Título ou ID da atividade"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>
        </div>
      </article>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}
      {successMessage && <FeedbackMessage type="success" message={successMessage} />}

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-sm">
          Carregando atividades...
        </p>
      ) : atividades.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-sm">
          Nenhuma atividade atribuída no momento.
        </p>
      ) : filteredAtividades.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600 shadow-sm">
          Nenhuma atividade encontrada para "{searchTerm}".
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredAtividades.map((atividade) => {
            const isBusy = pendingActivityId === atividade.atividadeId
            const canStart = atividade.status === 'nao_iniciada'
            const canFinish = atividade.status === 'em_andamento'

            return (
              <article
                key={atividade.atribuicaoId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-black text-slate-900">
                      {atividade.titulo}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{atividade.descricao}</p>
                  </div>
                  <StatusBadge status={atividade.status} />
                </div>

                <dl className="mt-4 space-y-2 text-sm text-slate-600">
                  <div>
                    <dt className="inline font-semibold text-slate-700">ID:</dt>{' '}
                    <dd className="inline">{atividade.atividadeId}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-slate-700">Atribuída em:</dt>{' '}
                    <dd className="inline">{formatDateTime(atividade.dataAtribuicao)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-slate-700">Início:</dt>{' '}
                    <dd className="inline">
                      {atividade.inicio ? formatDateTime(atividade.inicio) : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-slate-700">Término:</dt>{' '}
                    <dd className="inline">
                      {atividade.termino ? formatDateTime(atividade.termino) : '-'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void iniciarAtividade(atividade.atividadeId)}
                    disabled={!canStart || isBusy}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBusy && canStart ? 'Iniciando...' : 'Iniciar atividade'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void finalizarAtividade(atividade.atividadeId)}
                    disabled={!canFinish || isBusy}
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBusy && canFinish ? 'Finalizando...' : 'Finalizar atividade'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
