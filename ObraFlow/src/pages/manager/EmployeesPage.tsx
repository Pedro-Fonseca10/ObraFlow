import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { Funcionario, StatusFuncionario } from '../../models/domain'
import { dataService } from '../../services/api'
import { formatDateTime } from '../../utils/formatters'

interface EmployeeFormState {
  nome: string
  matricula: string
  cpf: string
  cargo: string
  equipe: string
  status: StatusFuncionario
  email: string
  senha: string
}

const initialFormState: EmployeeFormState = {
  nome: '',
  matricula: '',
  cpf: '',
  cargo: '',
  equipe: '',
  status: 'ativo',
  email: '',
  senha: '',
}

export function EmployeesPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [form, setForm] = useState<EmployeeFormState>(initialFormState)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    void loadFuncionarios()
  }, [])

  async function loadFuncionarios() {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = await dataService.listFuncionarios()
      setFuncionarios(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao carregar funcionários.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  function updateField<K extends keyof EmployeeFormState>(
    field: K,
    value: EmployeeFormState[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (
      !form.nome.trim() ||
      !form.matricula.trim() ||
      !form.cpf.trim() ||
      !form.cargo.trim() ||
      !form.email.trim() ||
      !form.senha.trim()
    ) {
      setErrorMessage('Preencha todos os campos obrigatórios do cadastro.')
      return
    }

    setSubmitting(true)

    try {
      await dataService.createFuncionario(form)
      setSuccessMessage('Funcionário cadastrado com sucesso.')
      setForm(initialFormState)
      await loadFuncionarios()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao cadastrar funcionário.'
      setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-black text-slate-900">
          Cadastro de Funcionários
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Mantenha o quadro da obra atualizado com vínculo de login do
          funcionário.
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm font-semibold text-slate-700">
            Nome *
            <input
              type="text"
              value={form.nome}
              onChange={(event) => updateField('nome', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Matrícula *
            <input
              type="text"
              value={form.matricula}
              onChange={(event) => updateField('matricula', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            CPF *
            <input
              type="text"
              value={form.cpf}
              onChange={(event) => updateField('cpf', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Cargo *
            <input
              type="text"
              value={form.cargo}
              onChange={(event) => updateField('cargo', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Equipe / Frente
            <input
              type="text"
              value={form.equipe}
              onChange={(event) => updateField('equipe', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                updateField('status', event.target.value as StatusFuncionario)
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Email de login *
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Senha inicial *
            <input
              type="password"
              value={form.senha}
              onChange={(event) => updateField('senha', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Cadastrar Funcionário'}
            </button>
          </div>
        </form>
      </article>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}
      {successMessage && <FeedbackMessage type="success" message={successMessage} />}

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-heading text-lg font-black text-slate-900">
            Funcionários Cadastrados
          </h2>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-600">Carregando...</p>
        ) : funcionarios.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Nenhum funcionário cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Equipe</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {funcionarios.map((funcionario) => (
                  <tr key={funcionario.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{funcionario.nome}</div>
                      <div className="text-xs text-slate-500">{funcionario.email}</div>
                    </td>
                    <td className="px-4 py-3">{funcionario.matricula}</td>
                    <td className="px-4 py-3">{funcionario.cargo}</td>
                    <td className="px-4 py-3">{funcionario.equipe || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={funcionario.status} />
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(funcionario.createdAt)}
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
