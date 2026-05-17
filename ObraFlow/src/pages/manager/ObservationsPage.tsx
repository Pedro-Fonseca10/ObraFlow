import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import type { Observacao } from '../../models/domain'
import { dataService } from '../../services/api'
import {
  daysFromNowIso,
  formatDateTime,
  formatIsoDate,
  todayIsoDate,
} from '../../utils/formatters'

type FilterMode = 'data' | 'periodo'

export function ObservationsPage() {
  const [filterMode, setFilterMode] = useState<FilterMode>('data')
  const [dataFiltro, setDataFiltro] = useState(todayIsoDate())
  const [inicio, setInicio] = useState(daysFromNowIso(-7))
  const [fim, setFim] = useState(todayIsoDate())

  const [observacoes, setObservacoes] = useState<Observacao[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [formData, setFormData] = useState(todayIsoDate())
  const [formTexto, setFormTexto] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState('')
  const [editTexto, setEditTexto] = useState('')

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, dataFiltro, inicio, fim])

  async function load() {
    setLoading(true)
    setErrorMessage('')
    try {
      const filtro =
        filterMode === 'data' ? { data: dataFiltro } : { inicio, fim }
      const result = await dataService.listObservacoes(filtro)
      setObservacoes(result)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao carregar observações.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!formTexto.trim()) {
      setErrorMessage('A observação não pode ficar em branco.')
      return
    }

    setSubmitting(true)
    try {
      await dataService.createObservacao({ data: formData, texto: formTexto })
      setSuccessMessage('Observação registrada com sucesso.')
      setFormTexto('')
      await load()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao registrar observação.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(observacao: Observacao) {
    setEditId(observacao.id)
    setEditData(observacao.data)
    setEditTexto(observacao.texto)
  }

  function cancelEdit() {
    setEditId(null)
    setEditData('')
    setEditTexto('')
  }

  async function saveEdit() {
    if (!editId) return
    setErrorMessage('')
    setSuccessMessage('')
    if (!editTexto.trim()) {
      setErrorMessage('A observação não pode ficar em branco.')
      return
    }
    try {
      await dataService.updateObservacao(editId, {
        data: editData,
        texto: editTexto,
      })
      setSuccessMessage('Observação atualizada.')
      cancelEdit()
      await load()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao atualizar observação.',
      )
    }
  }

  async function deleteObservacao(id: string) {
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await dataService.deleteObservacao(id)
      setSuccessMessage('Observação removida.')
      await load()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao remover observação.',
      )
    }
  }

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-black text-slate-900">
          Observações Operacionais
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Documente ocorrências relevantes do dia a dia que não se enquadram em
          atividades ou presenças.
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-[180px_1fr_auto]" onSubmit={handleCreate}>
          <label className="text-sm font-semibold text-slate-700">
            Data *
            <input
              type="date"
              value={formData}
              onChange={(event) => setFormData(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Observação *
            <textarea
              value={formTexto}
              onChange={(event) => setFormTexto(event.target.value)}
              rows={2}
              placeholder="Descreva a ocorrência operacional..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="h-fit self-end rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? 'Salvando...' : 'Registrar'}
          </button>
        </form>
      </article>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}
      {successMessage && <FeedbackMessage type="success" message={successMessage} />}

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-black text-slate-900">
              Consultar observações
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filtre por uma data específica ou por um intervalo.
            </p>
          </div>

          <div className="inline-flex overflow-hidden rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterMode('data')}
              className={`px-4 py-2 text-xs font-semibold transition ${
                filterMode === 'data'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Por data
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('periodo')}
              className={`px-4 py-2 text-xs font-semibold transition ${
                filterMode === 'periodo'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Por período
            </button>
          </div>
        </div>

        <div className="mt-4">
          {filterMode === 'data' ? (
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Data
              <input
                type="date"
                value={dataFiltro}
                onChange={(event) => setDataFiltro(event.target.value)}
                className="mt-1.5 w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          ) : (
            <DateRangePicker
              inicio={inicio}
              fim={fim}
              onChange={(novoInicio, novoFim) => {
                setInicio(novoInicio)
                setFim(novoFim)
              }}
            />
          )}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-lg font-black text-slate-900">
          Registros
        </h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando observações...</p>
          ) : observacoes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Nenhuma observação registrada para o filtro selecionado.
            </p>
          ) : (
            observacoes.map((observacao) => (
              <div
                key={observacao.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                {editId === observacao.id ? (
                  <div className="grid gap-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Data
                      <input
                        type="date"
                        value={editData}
                        onChange={(event) => setEditData(event.target.value)}
                        className="mt-1.5 w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                    <textarea
                      value={editTexto}
                      onChange={(event) => setEditTexto(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit()}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {formatIsoDate(observacao.data)}
                      </span>
                      <div className="text-xs text-slate-500">
                        {observacao.atualizadoEm
                          ? `Editado em ${formatDateTime(observacao.atualizadoEm)}`
                          : `Criado em ${formatDateTime(observacao.criadoEm)}`}
                        {observacao.criadoPorNome &&
                          ` • por ${observacao.criadoPorNome}`}
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {observacao.texto}
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(observacao)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteObservacao(observacao.id)}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remover
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  )
}
