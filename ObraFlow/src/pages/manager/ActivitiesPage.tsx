import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { Atividade } from '../../models/domain'
import { dataService } from '../../services/api'
import { formatDateTime } from '../../utils/formatters'

interface ActivityFormState {
  titulo: string
  descricao: string
}

const initialFormState: ActivityFormState = {
  titulo: '',
  descricao: '',
}

export function ActivitiesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [form, setForm] = useState<ActivityFormState>(initialFormState)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    void loadAtividades()
  }, [])

  async function loadAtividades() {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = await dataService.listAtividades()
      setAtividades(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao carregar atividades.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.titulo.trim() || !form.descricao.trim()) {
      setErrorMessage('Preencha título e descrição da atividade.')
      return
    }

    setSubmitting(true)

    try {
      await dataService.createAtividade(form)
      setSuccessMessage('Atividade cadastrada com sucesso.')
      setForm(initialFormState)
      await loadAtividades()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao cadastrar atividade.'
      setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-black text-slate-900">
          Cadastro de Atividades
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Registre as atividades da obra para distribuição diária da equipe.
        </p>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <label className="text-sm font-semibold text-slate-700">
            Título *
            <input
              type="text"
              value={form.titulo}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, titulo: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Descrição *
            <textarea
              value={form.descricao}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  descricao: event.target.value,
                }))
              }
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Cadastrar Atividade'}
            </button>
          </div>
        </form>
      </article>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}
      {successMessage && <FeedbackMessage type="success" message={successMessage} />}

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-heading text-lg font-black text-slate-900">
            Atividades Cadastradas
          </h2>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-600">Carregando...</p>
        ) : atividades.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Nenhuma atividade cadastrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {atividades.map((atividade) => (
                  <tr key={atividade.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {atividade.titulo}
                    </td>
                    <td className="px-4 py-3">{atividade.descricao}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={atividade.status} />
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(atividade.dataCriacao)}
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
