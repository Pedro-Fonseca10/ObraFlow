import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import type { FaltaDetalhada, Funcionario } from '../../models/domain'
import { dataService } from '../../services/api'
import { formatDate, todayIsoDate } from '../../utils/formatters'

interface AbsenceFormState {
  funcionarioId: string
  data: string
  motivo: string
}

const initialFormState: AbsenceFormState = {
  funcionarioId: '',
  data: todayIsoDate(),
  motivo: '',
}

export function AbsencesPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [faltas, setFaltas] = useState<FaltaDetalhada[]>([])
  const [form, setForm] = useState<AbsenceFormState>(initialFormState)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setErrorMessage('')

    try {
      const [funcionariosData, faltasData] = await Promise.all([
        dataService.listFuncionarios(),
        dataService.listFaltasDetalhadas(),
      ])

      const ativos = funcionariosData.filter((item) => item.status === 'ativo')
      setFuncionarios(ativos)
      setFaltas(faltasData)
      setForm((previous) => ({
        ...previous,
        funcionarioId: ativos.some((item) => item.id === previous.funcionarioId)
          ? previous.funcionarioId
          : (ativos[0]?.id ?? ''),
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao carregar faltas.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.funcionarioId || !form.data || !form.motivo.trim()) {
      setErrorMessage('Informe funcionário, data e motivo da falta.')
      return
    }

    setSubmitting(true)

    try {
      await dataService.createFalta(form)
      setSuccessMessage('Falta registrada com sucesso.')
      setForm((previous) => ({ ...previous, motivo: '' }))
      await loadData()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao registrar falta.'
      setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredFaltas =
    normalizedSearch === ''
      ? faltas
      : faltas.filter((falta) =>
          [
            falta.funcionarioNome,
            falta.motivo,
            falta.data,
            formatDate(falta.data),
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch),
        )

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-black text-slate-900">
          Registro de Faltas
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Registre ausência com motivo para compor os indicadores de absenteísmo.
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
                  {funcionario.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Data *
            <input
              type="date"
              value={form.data}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  data: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Motivo *
            <textarea
              value={form.motivo}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  motivo: event.target.value,
                }))
              }
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting || funcionarios.length === 0}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Registrando...' : 'Registrar Falta'}
            </button>
          </div>
        </form>
      </article>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}
      {successMessage && <FeedbackMessage type="success" message={successMessage} />}

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-heading text-lg font-black text-slate-900">
                Faltas Registradas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? 'Atualizando histórico de faltas...'
                  : `${filteredFaltas.length} de ${faltas.length} registros exibidos.`}
              </p>
            </div>

            <label className="w-full max-w-sm text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Buscar falta
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Funcionário, motivo ou data"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-600">Carregando...</p>
        ) : faltas.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Nenhuma falta registrada.
          </p>
        ) : filteredFaltas.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Nenhuma falta encontrada para "{searchTerm}".
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Funcionário</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {filteredFaltas.map((falta) => (
                  <tr key={falta.faltaId}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {falta.funcionarioNome}
                    </td>
                    <td className="px-4 py-3">{formatDate(falta.data)}</td>
                    <td className="px-4 py-3">{falta.motivo}</td>
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
