import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PriorityBadge } from '../../components/ui/PriorityBadge'
import type {
  Atividade,
  Funcionario,
  HistoricoAtividade,
  PrioridadeAtividade,
  UpdateAtividadeInput,
} from '../../models/domain'
import { dataService } from '../../services/api'
import {
  formatDateTime,
  formatIsoDate,
  todayIsoDate,
} from '../../utils/formatters'

interface ActivityFormState {
  titulo: string
  descricao: string
  responsavelId: string
  dataPrevista: string
  prioridade: PrioridadeAtividade
}

const initialFormState: ActivityFormState = {
  titulo: '',
  descricao: '',
  responsavelId: '',
  dataPrevista: '',
  prioridade: 'media',
}

interface EditState {
  atividadeId: string
  titulo: string
  descricao: string
  responsavelId: string
  dataPrevista: string
  prioridade: PrioridadeAtividade
  statusOriginal: 'nao_iniciada' | 'em_andamento' | 'concluida'
}

const campoLabels: Record<HistoricoAtividade['campo'], string> = {
  responsavel: 'Responsável',
  data_prevista: 'Data prevista',
  prioridade: 'Prioridade',
  status: 'Status',
  titulo: 'Título',
  descricao: 'Descrição',
}

export function ActivitiesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [form, setForm] = useState<ActivityFormState>(initialFormState)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [edit, setEdit] = useState<EditState | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [historicoOpen, setHistoricoOpen] = useState<{
    atividadeId: string
    titulo: string
  } | null>(null)
  const [historico, setHistorico] = useState<HistoricoAtividade[]>([])
  const [historicoLoading, setHistoricoLoading] = useState(false)

  useEffect(() => {
    void loadInicial()
  }, [])

  async function loadInicial() {
    setLoading(true)
    setErrorMessage('')
    try {
      const [a, f] = await Promise.all([
        dataService.listAtividades(),
        dataService.listFuncionarios(),
      ])
      setAtividades(a)
      setFuncionarios(f)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao carregar atividades.',
      )
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
      await dataService.createAtividade({
        titulo: form.titulo,
        descricao: form.descricao,
        responsavelId: form.responsavelId || null,
        dataPrevista: form.dataPrevista || null,
        prioridade: form.prioridade,
      })
      setSuccessMessage('Atividade cadastrada com sucesso.')
      setForm(initialFormState)
      await loadInicial()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao cadastrar atividade.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(atividade: Atividade) {
    setErrorMessage('')
    setSuccessMessage('')

    if (atividade.status === 'concluida') {
      setErrorMessage('Atividades concluídas não podem ser reprogramadas.')
      return
    }

    setEdit({
      atividadeId: atividade.id,
      titulo: atividade.titulo,
      descricao: atividade.descricao,
      responsavelId: atividade.responsavelId ?? '',
      dataPrevista: atividade.dataPrevista ?? '',
      prioridade: atividade.prioridade,
      statusOriginal: atividade.status,
    })
  }

  function closeEdit() {
    setEdit(null)
  }

  async function saveEdit() {
    if (!edit) return

    const patch: UpdateAtividadeInput = {
      titulo: edit.titulo,
      descricao: edit.descricao,
      responsavelId: edit.responsavelId || null,
      dataPrevista: edit.dataPrevista || null,
      prioridade: edit.prioridade,
    }

    setSavingEdit(true)
    setErrorMessage('')
    try {
      await dataService.updateAtividade(edit.atividadeId, patch)
      setSuccessMessage('Alterações salvas e histórico atualizado.')
      closeEdit()
      await loadInicial()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao salvar alterações.',
      )
    } finally {
      setSavingEdit(false)
    }
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!edit) return
    if (!edit.titulo.trim() || !edit.descricao.trim()) {
      setErrorMessage('Título e descrição não podem ficar em branco.')
      return
    }
    void saveEdit()
  }

  async function openHistorico(atividade: Atividade) {
    setHistoricoOpen({ atividadeId: atividade.id, titulo: atividade.titulo })
    setHistoricoLoading(true)
    try {
      const data = await dataService.listHistoricoAtividade(atividade.id)
      setHistorico(data)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao carregar histórico.',
      )
    } finally {
      setHistoricoLoading(false)
    }
  }

  function closeHistorico() {
    setHistoricoOpen(null)
    setHistorico([])
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredAtividades = useMemo(() => {
    if (normalizedSearch === '') return atividades
    return atividades.filter((atividade) =>
      [
        atividade.titulo,
        atividade.id,
        atividade.responsavelNome ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [atividades, normalizedSearch])

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-black text-slate-900">
          Cadastro de Atividades
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Registre as atividades da obra com responsável, prioridade e prazo.
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
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

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Descrição *
            <textarea
              value={form.descricao}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, descricao: event.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Responsável
            <select
              value={form.responsavelId}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, responsavelId: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Sem responsável definido —</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} — {f.cargo}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Data prevista
            <input
              type="date"
              value={form.dataPrevista}
              min={todayIsoDate()}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, dataPrevista: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Prioridade
            <select
              value={form.prioridade}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  prioridade: event.target.value as PrioridadeAtividade,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </label>

          <div className="md:col-span-2">
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-heading text-lg font-black text-slate-900">
                Atividades Cadastradas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? 'Atualizando catálogo de atividades...'
                  : `${filteredAtividades.length} de ${atividades.length} atividades exibidas.`}
              </p>
            </div>

            <label className="w-full max-w-sm text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Buscar atividade
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Título, responsável ou ID"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-600">Carregando...</p>
        ) : atividades.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Nenhuma atividade cadastrada.
          </p>
        ) : filteredAtividades.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Nenhuma atividade encontrada para "{searchTerm}".
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Atividade</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Data prevista</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {filteredAtividades.map((atividade) => (
                  <tr key={atividade.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {atividade.titulo}
                      </div>
                      <div className="text-xs text-slate-500">
                        {atividade.descricao}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {atividade.responsavelNome ?? (
                        <span className="text-slate-400">Sem responsável</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge prioridade={atividade.prioridade} />
                    </td>
                    <td className="px-4 py-3">
                      {atividade.dataPrevista
                        ? formatIsoDate(atividade.dataPrevista)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={atividade.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(atividade)}
                          disabled={atividade.status === 'concluida'}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          title={
                            atividade.status === 'concluida'
                              ? 'Atividades concluídas não podem ser reprogramadas'
                              : 'Reprogramar atividade'
                          }
                        >
                          Reprogramar
                        </button>
                        <button
                          type="button"
                          onClick={() => void openHistorico(atividade)}
                          className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          Histórico
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {edit && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 px-4"
          onClick={closeEdit}
        >
          <form
            onSubmit={handleEditSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-black text-slate-900">
                  Reprogramar atividade
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Alterar responsável, prazo ou prioridade. As mudanças geram um
                  registro no histórico.
                </p>
              </div>
              <StatusBadge status={edit.statusOriginal} />
            </div>

            {edit.statusOriginal === 'concluida' && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Esta atividade está concluída e não pode ser reprogramada.
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Título *
                <input
                  type="text"
                  value={edit.titulo}
                  onChange={(event) =>
                    setEdit((previous) =>
                      previous ? { ...previous, titulo: event.target.value } : previous,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Descrição *
                <textarea
                  value={edit.descricao}
                  onChange={(event) =>
                    setEdit((previous) =>
                      previous ? { ...previous, descricao: event.target.value } : previous,
                    )
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Responsável
                <select
                  value={edit.responsavelId}
                  onChange={(event) =>
                    setEdit((previous) =>
                      previous
                        ? { ...previous, responsavelId: event.target.value }
                        : previous,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">— Sem responsável —</option>
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} — {f.cargo}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Data prevista
                <input
                  type="date"
                  value={edit.dataPrevista}
                  onChange={(event) =>
                    setEdit((previous) =>
                      previous
                        ? { ...previous, dataPrevista: event.target.value }
                        : previous,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Prioridade
                <select
                  value={edit.prioridade}
                  onChange={(event) =>
                    setEdit((previous) =>
                      previous
                        ? {
                            ...previous,
                            prioridade: event.target.value as PrioridadeAtividade,
                          }
                        : previous,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingEdit ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {historicoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 px-4"
          onClick={closeHistorico}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-black text-slate-900">
                  Histórico de alterações
                </h2>
                <p className="mt-1 text-sm text-slate-600">{historicoOpen.titulo}</p>
              </div>
              <button
                type="button"
                onClick={closeHistorico}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {historicoLoading ? (
                <p className="text-sm text-slate-600">Carregando histórico...</p>
              ) : historico.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Nenhuma alteração registrada nesta atividade.
                </p>
              ) : (
                historico.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {campoLabels[item.campo]}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(item.dataAlteracao)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      <strong>De:</strong> {item.valorAnterior ?? '—'}
                    </p>
                    <p className="text-sm text-slate-700">
                      <strong>Para:</strong> {item.valorNovo ?? '—'}
                    </p>
                    {item.alteradoPorNome && (
                      <p className="mt-2 text-xs text-slate-500">
                        Por {item.alteradoPorNome}
                      </p>
                    )}
                    {item.motivo && (
                      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Motivo: {item.motivo}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
