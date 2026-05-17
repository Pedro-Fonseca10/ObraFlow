import type {
  Atividade,
  AtividadeDoFuncionario,
  AtividadePendente,
  AtribuicaoAtividade,
  AtribuicaoDetalhada,
  AuthCredentials,
  CampoHistoricoAtividade,
  CreateAtividadeInput,
  CreateAtribuicaoInput,
  CreateFaltaInput,
  CreateFuncionarioInput,
  CreateObservacaoInput,
  Falta,
  FaltaDetalhada,
  Funcionario,
  HistoricoAtividade,
  IndicadoresDashboard,
  Observacao,
  PendenciasOperacionais,
  PerfilUsuario,
  PrioridadeAtividade,
  ProdutividadeFuncionario,
  RelatorioConsolidado,
  StatusAtividade,
  StatusFuncionario,
  UpdateAtividadeInput,
  UpdateAtividadeOptions,
  UpdateObservacaoInput,
  Usuario,
} from '../models/domain'
import { supabase } from '../lib/supabase'
import type { DataService } from './api'

interface UserRow {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
}

interface FuncionarioRow {
  id: string
  nome: string
  matricula: string
  cpf: string
  cargo: string
  equipe: string | null
  status: StatusFuncionario
  email: string
  user_id: string | null
  created_at: string
}

interface AtividadeRow {
  id: string
  titulo: string
  descricao: string
  status: StatusAtividade
  data_criacao: string
  responsavel_id: string | null
  data_prevista: string | null
  prioridade: PrioridadeAtividade
}

interface HistoricoAtividadeRow {
  id: string
  atividade_id: string
  campo: CampoHistoricoAtividade
  valor_anterior: string | null
  valor_novo: string | null
  alterado_por: string | null
  alterado_por_nome: string | null
  data_alteracao: string
  motivo: string | null
}

interface ObservacaoRow {
  id: string
  data: string
  texto: string
  criado_em: string
  atualizado_em: string | null
  criado_por: string | null
}

interface AtribuicaoRow {
  id: string
  funcionario_id: string
  atividade_id: string
  data_atribuicao: string
}

interface ApontamentoRow {
  id: string
  atividade_id: string
  funcionario_id: string
  inicio: string
  termino: string | null
}

interface FaltaRow {
  id: string
  funcionario_id: string
  data: string
  motivo: string
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Verifique o arquivo .env.')
  }

  return supabase
}

function ensureRequired(value: string, label: string): void {
  if (!value.trim()) {
    throw new Error(`O campo ${label} é obrigatório.`)
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function roundToSingleDecimal(value: number): number {
  return Number(value.toFixed(1))
}

function mapFuncionario(row: FuncionarioRow): Funcionario {
  return {
    id: row.id,
    nome: row.nome,
    matricula: row.matricula,
    cpf: row.cpf,
    cargo: row.cargo,
    equipe: row.equipe,
    status: row.status,
    email: row.email,
    userId: row.user_id,
    createdAt: row.created_at,
  }
}

function mapAtividade(
  row: AtividadeRow,
  status: StatusAtividade = row.status,
  responsavelNome: string | null = null,
): Atividade {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    status,
    dataCriacao: row.data_criacao,
    responsavelId: row.responsavel_id,
    responsavelNome,
    dataPrevista: row.data_prevista,
    prioridade: row.prioridade,
  }
}

function mapHistorico(row: HistoricoAtividadeRow): HistoricoAtividade {
  return {
    id: row.id,
    atividadeId: row.atividade_id,
    campo: row.campo,
    valorAnterior: row.valor_anterior,
    valorNovo: row.valor_novo,
    alteradoPor: row.alterado_por,
    alteradoPorNome: row.alterado_por_nome,
    dataAlteracao: row.data_alteracao,
    motivo: row.motivo,
  }
}

function mapObservacao(
  row: ObservacaoRow,
  criadoPorNome: string | null = null,
): Observacao {
  return {
    id: row.id,
    data: row.data,
    texto: row.texto,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    criadoPor: row.criado_por,
    criadoPorNome,
  }
}

function diffDays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime()
  const to = new Date(`${toIso}T00:00:00`).getTime()
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.floor((to - from) / (1000 * 60 * 60 * 24))
}

function mapAtribuicao(row: AtribuicaoRow): AtribuicaoAtividade {
  return {
    id: row.id,
    funcionarioId: row.funcionario_id,
    atividadeId: row.atividade_id,
    dataAtribuicao: row.data_atribuicao,
  }
}

function mapFalta(row: FaltaRow): Falta {
  return {
    id: row.id,
    funcionarioId: row.funcionario_id,
    data: row.data,
    motivo: row.motivo,
  }
}

function latestApontamentoByPair(
  apontamentos: ApontamentoRow[],
): Map<string, ApontamentoRow> {
  const map = new Map<string, ApontamentoRow>()

  for (const item of apontamentos) {
    const key = `${item.funcionario_id}:${item.atividade_id}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }

  return map
}

function latestApontamentoByActivity(
  apontamentos: ApontamentoRow[],
): Map<string, ApontamentoRow> {
  const map = new Map<string, ApontamentoRow>()

  for (const item of apontamentos) {
    if (!map.has(item.atividade_id)) {
      map.set(item.atividade_id, item)
    }
  }

  return map
}

function deriveStatusFromApontamento(
  apontamento: Pick<ApontamentoRow, 'termino'> | null | undefined,
  fallback: StatusAtividade,
): StatusAtividade {
  if (!apontamento) {
    return fallback
  }

  return apontamento.termino ? 'concluida' : 'em_andamento'
}

function mapAuthErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Credenciais inválidas.'
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Confirme o email antes de entrar.'
  }

  return message
}

async function buildUsuarioFromProfile(
  profile: UserRow,
): Promise<Usuario> {
  const client = requireSupabase()

  let funcionarioId: string | null = null

  if (profile.perfil === 'funcionario') {
    const { data: funcionario, error: funcionarioError } = await client
      .from('funcionarios')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle<{ id: string }>()

    if (funcionarioError) {
      throw new Error(
        `Falha ao buscar vínculo do funcionário: ${funcionarioError.message}`,
      )
    }

    if (!funcionario) {
      throw new Error('Funcionário sem cadastro vinculado para este usuário.')
    }

    funcionarioId = funcionario.id
  }

  return {
    id: profile.id,
    nome: profile.nome,
    email: profile.email,
    perfil: profile.perfil,
    funcionarioId,
  }
}

export async function getAuthenticatedSupabaseUser(): Promise<Usuario | null> {
  const client = requireSupabase()

  const {
    data: { user: authUser },
    error: authError,
  } = await client.auth.getUser()

  if (authError) {
    throw new Error(`Falha ao recuperar sessão do Supabase: ${authError.message}`)
  }

  if (!authUser) {
    return null
  }

  const { data: profile, error: profileError } = await client
    .from('users')
    .select('id, nome, email, perfil')
    .eq('id', authUser.id)
    .maybeSingle<UserRow>()

  if (profileError) {
    throw new Error(`Falha ao carregar perfil público: ${profileError.message}`)
  }

  if (!profile) {
    throw new Error(
      'Usuário autenticado sem registro correspondente em public.users.',
    )
  }

  return buildUsuarioFromProfile(profile)
}

export function createSupabaseService(): DataService {
  return {
    mode: 'supabase',

    async login(credentials: AuthCredentials): Promise<Usuario> {
      const client = requireSupabase()
      const email = normalizeEmail(credentials.email)

      ensureRequired(email, 'email')
      ensureRequired(credentials.senha, 'senha')

      const { error: authError } = await client.auth.signInWithPassword({
        email,
        password: credentials.senha,
      })

      if (authError) {
        throw new Error(mapAuthErrorMessage(authError.message))
      }

      try {
        const authenticatedUser = await getAuthenticatedSupabaseUser()

        if (!authenticatedUser) {
          throw new Error('Sessão criada, mas o usuário autenticado não foi encontrado.')
        }

        return authenticatedUser
      } catch (error) {
        await client.auth.signOut()
        throw error
      }
    },

    async listFuncionarios(): Promise<Funcionario[]> {
      const client = requireSupabase()
      const { data, error } = await client
        .from('funcionarios')
        .select('*')
        .order('nome', { ascending: true })

      if (error) {
        throw new Error(`Falha ao listar funcionários: ${error.message}`)
      }

      return (data ?? []).map((row) => mapFuncionario(row as FuncionarioRow))
    },

    async createFuncionario(input: CreateFuncionarioInput): Promise<Funcionario> {
      const client = requireSupabase()

      ensureRequired(input.nome, 'nome')
      ensureRequired(input.matricula, 'matrícula')
      ensureRequired(input.cpf, 'CPF')
      ensureRequired(input.cargo, 'cargo')
      ensureRequired(input.email, 'email')

      const email = normalizeEmail(input.email)

      const [
        publicUserResponse,
        existingMatriculaResponse,
        existingCpfResponse,
        existingEmailResponse,
      ] = await Promise.all([
        client
          .from('users')
          .select('id, email, perfil')
          .eq('email', email)
          .maybeSingle<{ id: string; email: string; perfil: PerfilUsuario }>(),
        client
          .from('funcionarios')
          .select('id')
          .eq('matricula', input.matricula.trim())
          .limit(1),
        client
          .from('funcionarios')
          .select('id')
          .eq('cpf', input.cpf.trim())
          .limit(1),
        client
          .from('funcionarios')
          .select('id')
          .eq('email', email)
          .limit(1),
      ])

      if (publicUserResponse.error) {
        throw new Error(
          `Falha ao validar usuário no Supabase Auth: ${publicUserResponse.error.message}`,
        )
      }

      const publicUser = publicUserResponse.data

      if (!publicUser) {
        throw new Error(
          'No modo Supabase, crie primeiro o usuário em Authentication > Users para que o perfil seja gerado em public.users.',
        )
      }

      if (publicUser.perfil !== 'funcionario') {
        throw new Error(
          'O usuário autenticável informado precisa ter perfil "funcionario" em public.users.',
        )
      }

      if (existingMatriculaResponse.error) {
        throw new Error(
          `Falha ao validar matrícula: ${existingMatriculaResponse.error.message}`,
        )
      }

      if ((existingMatriculaResponse.data ?? []).length > 0) {
        throw new Error('Matrícula já cadastrada.')
      }

      if (existingCpfResponse.error) {
        throw new Error(`Falha ao validar CPF: ${existingCpfResponse.error.message}`)
      }

      if ((existingCpfResponse.data ?? []).length > 0) {
        throw new Error('CPF já cadastrado.')
      }

      if (existingEmailResponse.error) {
        throw new Error(
          `Falha ao validar email do funcionário: ${existingEmailResponse.error.message}`,
        )
      }

      if ((existingEmailResponse.data ?? []).length > 0) {
        throw new Error('Já existe um funcionário com este email.')
      }

      const { data: existingLinkedFuncionario, error: existingFuncionarioByUserError } =
        await client
          .from('funcionarios')
          .select('id')
          .eq('user_id', publicUser.id)
          .maybeSingle<{ id: string }>()

      if (existingFuncionarioByUserError) {
        throw new Error(
          `Falha ao validar vínculo do usuário: ${existingFuncionarioByUserError.message}`,
        )
      }

      if (existingLinkedFuncionario) {
        throw new Error('Este usuário já está vinculado a outro funcionário.')
      }

      const { data: funcionario, error: funcionarioError } = await client
        .from('funcionarios')
        .insert({
          nome: input.nome.trim(),
          matricula: input.matricula.trim(),
          cpf: input.cpf.trim(),
          cargo: input.cargo.trim(),
          equipe: input.equipe.trim() || null,
          status: input.status,
          email,
          user_id: publicUser.id,
        })
        .select('*')
        .single<FuncionarioRow>()

      if (funcionarioError || !funcionario) {
        throw new Error(
          `Falha ao criar funcionário: ${funcionarioError?.message ?? 'erro desconhecido'}`,
        )
      }

      return mapFuncionario(funcionario)
    },

    async listAtividades(): Promise<Atividade[]> {
      const client = requireSupabase()
      const { data, error } = await client
        .from('atividades')
        .select('*')
        .order('data_criacao', { ascending: false })

      if (error) {
        throw new Error(`Falha ao listar atividades: ${error.message}`)
      }

      const atividades = (data ?? []) as AtividadeRow[]

      if (atividades.length === 0) {
        return []
      }

      const atividadeIds = atividades.map((atividade) => atividade.id)
      const responsavelIds = atividades
        .map((item) => item.responsavel_id)
        .filter((item): item is string => Boolean(item))

      const [apontamentosResponse, responsaveisResponse] = await Promise.all([
        client
          .from('apontamentos_atividade')
          .select('id, atividade_id, funcionario_id, inicio, termino')
          .in('atividade_id', atividadeIds)
          .order('inicio', { ascending: false }),
        responsavelIds.length > 0
          ? client
              .from('funcionarios')
              .select('id, nome')
              .in('id', [...new Set(responsavelIds)])
          : Promise.resolve({ data: [], error: null }),
      ])

      if (apontamentosResponse.error) {
        throw new Error(
          `Falha ao listar apontamentos das atividades: ${apontamentosResponse.error.message}`,
        )
      }

      if (responsaveisResponse.error) {
        throw new Error(
          `Falha ao listar responsáveis das atividades: ${responsaveisResponse.error.message}`,
        )
      }

      const latestApontamentos = latestApontamentoByActivity(
        (apontamentosResponse.data ?? []) as ApontamentoRow[],
      )

      const responsaveisById = new Map<string, string>()
      for (const item of (responsaveisResponse.data ?? []) as {
        id: string
        nome: string
      }[]) {
        responsaveisById.set(item.id, item.nome)
      }

      return atividades.map((atividade) =>
        mapAtividade(
          atividade,
          deriveStatusFromApontamento(
            latestApontamentos.get(atividade.id),
            atividade.status,
          ),
          atividade.responsavel_id
            ? responsaveisById.get(atividade.responsavel_id) ?? null
            : null,
        ),
      )
    },

    async createAtividade(input: CreateAtividadeInput): Promise<Atividade> {
      const client = requireSupabase()

      ensureRequired(input.titulo, 'título')
      ensureRequired(input.descricao, 'descrição')

      let responsavelNome: string | null = null
      if (input.responsavelId) {
        const { data: responsavel, error: responsavelError } = await client
          .from('funcionarios')
          .select('id, nome')
          .eq('id', input.responsavelId)
          .maybeSingle<{ id: string; nome: string }>()

        if (responsavelError) {
          throw new Error(
            `Falha ao validar responsável: ${responsavelError.message}`,
          )
        }

        if (!responsavel) {
          throw new Error('Responsável informado não encontrado.')
        }

        responsavelNome = responsavel.nome
      }

      const { data, error } = await client
        .from('atividades')
        .insert({
          titulo: input.titulo.trim(),
          descricao: input.descricao.trim(),
          status: 'nao_iniciada',
          responsavel_id: input.responsavelId ?? null,
          data_prevista: input.dataPrevista ?? null,
          prioridade: input.prioridade ?? 'media',
        })
        .select('*')
        .single<AtividadeRow>()

      if (error || !data) {
        throw new Error(
          `Falha ao criar atividade: ${error?.message ?? 'erro desconhecido'}`,
        )
      }

      if (input.responsavelId) {
        const { error: atribuicaoError } = await client
          .from('atribuicoes_atividade')
          .insert({
            funcionario_id: input.responsavelId,
            atividade_id: data.id,
          })
        if (atribuicaoError && !atribuicaoError.message.includes('duplicate key')) {
          throw new Error(
            `Falha ao vincular responsável à atividade: ${atribuicaoError.message}`,
          )
        }
      }

      return mapAtividade(data, data.status, responsavelNome)
    },

    async updateAtividade(
      atividadeId: string,
      input: UpdateAtividadeInput,
      options?: UpdateAtividadeOptions,
    ): Promise<Atividade> {
      const client = requireSupabase()

      const { data: atual, error: atualError } = await client
        .from('atividades')
        .select('*')
        .eq('id', atividadeId)
        .maybeSingle<AtividadeRow>()

      if (atualError) {
        throw new Error(`Falha ao localizar atividade: ${atualError.message}`)
      }

      if (!atual) {
        throw new Error('Atividade não encontrada.')
      }

      if (atual.status === 'concluida') {
        if (!options?.autorizarPosConclusao) {
          throw new Error(
            'Esta atividade já foi concluída. É necessário autorização especial para reprogramá-la.',
          )
        }
        if (!options.motivo || !options.motivo.trim()) {
          throw new Error(
            'Informe o motivo da reprogramação de uma atividade concluída.',
          )
        }
      }

      let novoResponsavelNome: string | null = null
      let responsavelAtualNome: string | null = null
      if (atual.responsavel_id) {
        const { data: rAtual } = await client
          .from('funcionarios')
          .select('nome')
          .eq('id', atual.responsavel_id)
          .maybeSingle<{ nome: string }>()
        responsavelAtualNome = rAtual?.nome ?? null
      }

      if (input.responsavelId !== undefined && input.responsavelId !== null) {
        const { data: r, error: rError } = await client
          .from('funcionarios')
          .select('id, nome')
          .eq('id', input.responsavelId)
          .maybeSingle<{ id: string; nome: string }>()
        if (rError) {
          throw new Error(`Falha ao validar responsável: ${rError.message}`)
        }
        if (!r) {
          throw new Error('Responsável informado não encontrado.')
        }
        novoResponsavelNome = r.nome
      }

      const motivo = options?.motivo?.trim() || null

      const { data: profile } = await client.auth.getUser()
      const alteradoPor: string | null = profile?.user?.id ?? null
      let alteradoPorNome: string | null = null
      if (alteradoPor) {
        const { data: userRow } = await client
          .from('users')
          .select('nome')
          .eq('id', alteradoPor)
          .maybeSingle<{ nome: string }>()
        alteradoPorNome = userRow?.nome ?? null
      }

      const historicoEntries: Omit<HistoricoAtividadeRow, 'id' | 'data_alteracao'>[] =
        []
      const patch: Partial<AtividadeRow> = {}

      if (
        input.responsavelId !== undefined &&
        input.responsavelId !== atual.responsavel_id
      ) {
        historicoEntries.push({
          atividade_id: atividadeId,
          campo: 'responsavel',
          valor_anterior: responsavelAtualNome,
          valor_novo: novoResponsavelNome,
          alterado_por: alteradoPor,
          alterado_por_nome: alteradoPorNome,
          motivo,
        })
        patch.responsavel_id = input.responsavelId
      }

      if (
        input.dataPrevista !== undefined &&
        input.dataPrevista !== atual.data_prevista
      ) {
        historicoEntries.push({
          atividade_id: atividadeId,
          campo: 'data_prevista',
          valor_anterior: atual.data_prevista,
          valor_novo: input.dataPrevista,
          alterado_por: alteradoPor,
          alterado_por_nome: alteradoPorNome,
          motivo,
        })
        patch.data_prevista = input.dataPrevista
      }

      if (input.prioridade && input.prioridade !== atual.prioridade) {
        historicoEntries.push({
          atividade_id: atividadeId,
          campo: 'prioridade',
          valor_anterior: atual.prioridade,
          valor_novo: input.prioridade,
          alterado_por: alteradoPor,
          alterado_por_nome: alteradoPorNome,
          motivo,
        })
        patch.prioridade = input.prioridade
      }

      if (input.titulo !== undefined) {
        const novoTitulo = input.titulo.trim()
        ensureRequired(novoTitulo, 'título')
        if (novoTitulo !== atual.titulo) {
          historicoEntries.push({
            atividade_id: atividadeId,
            campo: 'titulo',
            valor_anterior: atual.titulo,
            valor_novo: novoTitulo,
            alterado_por: alteradoPor,
            alterado_por_nome: alteradoPorNome,
            motivo,
          })
          patch.titulo = novoTitulo
        }
      }

      if (input.descricao !== undefined) {
        const novaDescricao = input.descricao.trim()
        ensureRequired(novaDescricao, 'descrição')
        if (novaDescricao !== atual.descricao) {
          historicoEntries.push({
            atividade_id: atividadeId,
            campo: 'descricao',
            valor_anterior: atual.descricao,
            valor_novo: novaDescricao,
            alterado_por: alteradoPor,
            alterado_por_nome: alteradoPorNome,
            motivo,
          })
          patch.descricao = novaDescricao
        }
      }

      if (Object.keys(patch).length === 0) {
        return mapAtividade(atual, atual.status, responsavelAtualNome)
      }

      const { data: atualizada, error: updateError } = await client
        .from('atividades')
        .update(patch)
        .eq('id', atividadeId)
        .select('*')
        .single<AtividadeRow>()

      if (updateError || !atualizada) {
        throw new Error(
          `Falha ao atualizar atividade: ${updateError?.message ?? 'erro desconhecido'}`,
        )
      }

      if (historicoEntries.length > 0) {
        const { error: historicoError } = await client
          .from('historico_atividades')
          .insert(historicoEntries)
        if (historicoError) {
          throw new Error(
            `Falha ao registrar histórico de alterações: ${historicoError.message}`,
          )
        }
      }

      if (patch.responsavel_id) {
        const { error: atribuicaoError } = await client
          .from('atribuicoes_atividade')
          .insert({
            funcionario_id: patch.responsavel_id,
            atividade_id: atividadeId,
          })
        if (atribuicaoError && !atribuicaoError.message.includes('duplicate key')) {
          throw new Error(
            `Falha ao vincular responsável atualizado: ${atribuicaoError.message}`,
          )
        }
      }

      const novoNome =
        patch.responsavel_id !== undefined
          ? novoResponsavelNome
          : responsavelAtualNome

      return mapAtividade(atualizada, atualizada.status, novoNome)
    },

    async listHistoricoAtividade(
      atividadeId: string,
    ): Promise<HistoricoAtividade[]> {
      const client = requireSupabase()
      const { data, error } = await client
        .from('historico_atividades')
        .select('*')
        .eq('atividade_id', atividadeId)
        .order('data_alteracao', { ascending: false })

      if (error) {
        throw new Error(`Falha ao carregar histórico: ${error.message}`)
      }

      return ((data ?? []) as HistoricoAtividadeRow[]).map(mapHistorico)
    },

    async listAtribuicoesDetalhadas(): Promise<AtribuicaoDetalhada[]> {
      const client = requireSupabase()
      const { data: atribuicoesRows, error: atribuicoesError } = await client
        .from('atribuicoes_atividade')
        .select('*')
        .order('data_atribuicao', { ascending: false })

      if (atribuicoesError) {
        throw new Error(
          `Falha ao listar atribuições: ${atribuicoesError.message}`,
        )
      }

      const atribuicoes = (atribuicoesRows ?? []) as AtribuicaoRow[]
      if (atribuicoes.length === 0) {
        return []
      }

      const funcionarioIds = [...new Set(atribuicoes.map((item) => item.funcionario_id))]
      const atividadeIds = [...new Set(atribuicoes.map((item) => item.atividade_id))]

      const [funcionariosResponse, atividadesResponse, apontamentosResponse] =
        await Promise.all([
          client.from('funcionarios').select('id, nome').in('id', funcionarioIds),
          client
            .from('atividades')
            .select('id, titulo, descricao, status')
            .in('id', atividadeIds),
          client
            .from('apontamentos_atividade')
            .select('id, atividade_id, funcionario_id, inicio, termino')
            .in('atividade_id', atividadeIds)
            .in('funcionario_id', funcionarioIds)
            .order('inicio', { ascending: false }),
        ])

      if (funcionariosResponse.error) {
        throw new Error(
          `Falha ao listar funcionários das atribuições: ${funcionariosResponse.error.message}`,
        )
      }

      if (atividadesResponse.error) {
        throw new Error(
          `Falha ao listar atividades das atribuições: ${atividadesResponse.error.message}`,
        )
      }

      if (apontamentosResponse.error) {
        throw new Error(
          `Falha ao listar apontamentos das atribuições: ${apontamentosResponse.error.message}`,
        )
      }

      const funcionariosById = new Map<string, { id: string; nome: string }>()
      for (const funcionario of (funcionariosResponse.data ?? []) as {
        id: string
        nome: string
      }[]) {
        funcionariosById.set(funcionario.id, funcionario)
      }

      const atividadesById = new Map<
        string,
        { id: string; titulo: string; descricao: string; status: StatusAtividade }
      >()
      for (const atividade of (atividadesResponse.data ?? []) as {
        id: string
        titulo: string
        descricao: string
        status: StatusAtividade
      }[]) {
        atividadesById.set(atividade.id, atividade)
      }

      const latestApontamentos = latestApontamentoByPair(
        (apontamentosResponse.data ?? []) as ApontamentoRow[],
      )

      return atribuicoes
        .map((atribuicao) => {
          const funcionario = funcionariosById.get(atribuicao.funcionario_id)
          const atividade = atividadesById.get(atribuicao.atividade_id)

          if (!funcionario || !atividade) {
            return null
          }

          const apontamento = latestApontamentos.get(
            `${atribuicao.funcionario_id}:${atribuicao.atividade_id}`,
          )

          return {
            atribuicaoId: atribuicao.id,
            funcionarioId: funcionario.id,
            funcionarioNome: funcionario.nome,
            atividadeId: atividade.id,
            atividadeTitulo: atividade.titulo,
            atividadeDescricao: atividade.descricao,
            atividadeStatus: deriveStatusFromApontamento(
              apontamento,
              atividade.status,
            ),
            dataAtribuicao: atribuicao.data_atribuicao,
            inicio: apontamento?.inicio ?? null,
            termino: apontamento?.termino ?? null,
          } satisfies AtribuicaoDetalhada
        })
        .filter((item): item is AtribuicaoDetalhada => item !== null)
    },

    async createAtribuicao(
      input: CreateAtribuicaoInput,
    ): Promise<AtribuicaoAtividade> {
      const client = requireSupabase()

      ensureRequired(input.funcionarioId, 'funcionário')
      ensureRequired(input.atividadeId, 'atividade')

      const [funcionarioResponse, atividadeResponse, existingResponse] =
        await Promise.all([
          client
            .from('funcionarios')
            .select('id')
            .eq('id', input.funcionarioId)
            .maybeSingle<{ id: string }>(),
          client
            .from('atividades')
            .select('id')
            .eq('id', input.atividadeId)
            .maybeSingle<{ id: string }>(),
          client
            .from('atribuicoes_atividade')
            .select('id')
            .eq('funcionario_id', input.funcionarioId)
            .eq('atividade_id', input.atividadeId)
            .limit(1),
        ])

      if (funcionarioResponse.error) {
        throw new Error(
          `Falha ao validar funcionário: ${funcionarioResponse.error.message}`,
        )
      }

      if (!funcionarioResponse.data) {
        throw new Error('Funcionário não encontrado.')
      }

      if (atividadeResponse.error) {
        throw new Error(
          `Falha ao validar atividade: ${atividadeResponse.error.message}`,
        )
      }

      if (!atividadeResponse.data) {
        throw new Error('Atividade não encontrada.')
      }

      if (existingResponse.error) {
        throw new Error(
          `Falha ao validar atribuição existente: ${existingResponse.error.message}`,
        )
      }

      if ((existingResponse.data ?? []).length > 0) {
        throw new Error('Atividade já atribuída para este funcionário.')
      }

      const { data, error } = await client
        .from('atribuicoes_atividade')
        .insert({
          funcionario_id: input.funcionarioId,
          atividade_id: input.atividadeId,
        })
        .select('*')
        .single<AtribuicaoRow>()

      if (error || !data) {
        throw new Error(
          `Falha ao criar atribuição: ${error?.message ?? 'erro desconhecido'}`,
        )
      }

      return mapAtribuicao(data)
    },

    async listAtividadesDoFuncionario(
      funcionarioId: string,
    ): Promise<AtividadeDoFuncionario[]> {
      const client = requireSupabase()

      const { data: atribuicoesRows, error: atribuicoesError } = await client
        .from('atribuicoes_atividade')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .order('data_atribuicao', { ascending: false })

      if (atribuicoesError) {
        throw new Error(
          `Falha ao listar atribuições do funcionário: ${atribuicoesError.message}`,
        )
      }

      const atribuicoes = (atribuicoesRows ?? []) as AtribuicaoRow[]

      if (atribuicoes.length === 0) {
        return []
      }

      const atividadeIds = [...new Set(atribuicoes.map((item) => item.atividade_id))]

      const [atividadesResponse, apontamentosResponse] = await Promise.all([
        client
          .from('atividades')
          .select('id, titulo, descricao, status, data_prevista, prioridade')
          .in('id', atividadeIds),
        client
          .from('apontamentos_atividade')
          .select('id, atividade_id, funcionario_id, inicio, termino')
          .eq('funcionario_id', funcionarioId)
          .in('atividade_id', atividadeIds)
          .order('inicio', { ascending: false }),
      ])

      if (atividadesResponse.error) {
        throw new Error(
          `Falha ao listar atividades do funcionário: ${atividadesResponse.error.message}`,
        )
      }

      if (apontamentosResponse.error) {
        throw new Error(
          `Falha ao listar apontamentos do funcionário: ${apontamentosResponse.error.message}`,
        )
      }

      const atividadesById = new Map<
        string,
        {
          id: string
          titulo: string
          descricao: string
          status: StatusAtividade
          data_prevista: string | null
          prioridade: PrioridadeAtividade
        }
      >()
      for (const atividade of (atividadesResponse.data ?? []) as {
        id: string
        titulo: string
        descricao: string
        status: StatusAtividade
        data_prevista: string | null
        prioridade: PrioridadeAtividade
      }[]) {
        atividadesById.set(atividade.id, atividade)
      }

      const latestApontamentoMap = latestApontamentoByActivity(
        (apontamentosResponse.data ?? []) as ApontamentoRow[],
      )

      return atribuicoes
        .map((atribuicao) => {
          const atividade = atividadesById.get(atribuicao.atividade_id)

          if (!atividade) {
            return null
          }

          const apontamento = latestApontamentoMap.get(atribuicao.atividade_id)

          return {
            atribuicaoId: atribuicao.id,
            atividadeId: atividade.id,
            titulo: atividade.titulo,
            descricao: atividade.descricao,
            status: deriveStatusFromApontamento(apontamento, atividade.status),
            dataAtribuicao: atribuicao.data_atribuicao,
            inicio: apontamento?.inicio ?? null,
            termino: apontamento?.termino ?? null,
            dataPrevista: atividade.data_prevista,
            prioridade: atividade.prioridade,
          } satisfies AtividadeDoFuncionario
        })
        .filter((item): item is AtividadeDoFuncionario => item !== null)
    },

    async iniciarAtividade(
      funcionarioId: string,
      atividadeId: string,
    ): Promise<void> {
      const client = requireSupabase()

      const [atribuicaoResponse, atividadeResponse, latestApontamentoResponse] =
        await Promise.all([
          client
            .from('atribuicoes_atividade')
            .select('id')
            .eq('funcionario_id', funcionarioId)
            .eq('atividade_id', atividadeId)
            .maybeSingle<{ id: string }>(),
          client
            .from('atividades')
            .select('id, status')
            .eq('id', atividadeId)
            .maybeSingle<{ id: string; status: StatusAtividade }>(),
          client
            .from('apontamentos_atividade')
            .select('id, inicio, termino')
            .eq('funcionario_id', funcionarioId)
            .eq('atividade_id', atividadeId)
            .order('inicio', { ascending: false })
            .limit(1)
            .maybeSingle<{ id: string; inicio: string; termino: string | null }>(),
        ])

      if (atribuicaoResponse.error) {
        throw new Error(
          `Falha ao validar atribuição da atividade: ${atribuicaoResponse.error.message}`,
        )
      }

      if (!atribuicaoResponse.data) {
        throw new Error('Você só pode iniciar atividades atribuídas a você.')
      }

      if (atividadeResponse.error) {
        throw new Error(`Falha ao validar atividade: ${atividadeResponse.error.message}`)
      }

      if (!atividadeResponse.data) {
        throw new Error('Atividade não encontrada.')
      }

      if (latestApontamentoResponse.error) {
        throw new Error(
          `Falha ao validar apontamentos da atividade: ${latestApontamentoResponse.error.message}`,
        )
      }

      if (latestApontamentoResponse.data?.termino === null) {
        throw new Error('Atividade já iniciada.')
      }

      if (latestApontamentoResponse.data?.termino) {
        throw new Error('Atividade já concluída.')
      }

      const { error: apontamentoError } = await client
        .from('apontamentos_atividade')
        .insert({
          atividade_id: atividadeId,
          funcionario_id: funcionarioId,
          inicio: new Date().toISOString(),
          termino: null,
        })

      if (apontamentoError) {
        throw new Error(
          `Falha ao registrar início da atividade: ${apontamentoError.message}`,
        )
      }
    },

    async finalizarAtividade(
      funcionarioId: string,
      atividadeId: string,
    ): Promise<void> {
      const client = requireSupabase()

      const [atribuicaoResponse, apontamentoResponse] = await Promise.all([
        client
          .from('atribuicoes_atividade')
          .select('id')
          .eq('funcionario_id', funcionarioId)
          .eq('atividade_id', atividadeId)
          .maybeSingle<{ id: string }>(),
        client
          .from('apontamentos_atividade')
          .select('id')
          .eq('funcionario_id', funcionarioId)
          .eq('atividade_id', atividadeId)
          .is('termino', null)
          .order('inicio', { ascending: false })
          .limit(1)
          .maybeSingle<{ id: string }>(),
      ])

      if (atribuicaoResponse.error) {
        throw new Error(
          `Falha ao validar atribuição da atividade: ${atribuicaoResponse.error.message}`,
        )
      }

      if (!atribuicaoResponse.data) {
        throw new Error('Você só pode finalizar atividades atribuídas a você.')
      }

      if (apontamentoResponse.error) {
        throw new Error(
          `Falha ao localizar apontamento aberto: ${apontamentoResponse.error.message}`,
        )
      }

      if (!apontamentoResponse.data) {
        throw new Error('Nenhum apontamento em andamento encontrado.')
      }

      const { error: finalizarApontamentoError } = await client
        .from('apontamentos_atividade')
        .update({ termino: new Date().toISOString() })
        .eq('id', apontamentoResponse.data.id)

      if (finalizarApontamentoError) {
        throw new Error(
          `Falha ao finalizar apontamento: ${finalizarApontamentoError.message}`,
        )
      }
    },

    async listFaltasDetalhadas(): Promise<FaltaDetalhada[]> {
      const client = requireSupabase()

      const { data: faltasRows, error: faltasError } = await client
        .from('faltas')
        .select('*')
        .order('data', { ascending: false })

      if (faltasError) {
        throw new Error(`Falha ao listar faltas: ${faltasError.message}`)
      }

      const faltas = (faltasRows ?? []) as FaltaRow[]

      if (faltas.length === 0) {
        return []
      }

      const funcionarioIds = [...new Set(faltas.map((item) => item.funcionario_id))]
      const { data: funcionariosRows, error: funcionariosError } = await client
        .from('funcionarios')
        .select('id, nome')
        .in('id', funcionarioIds)

      if (funcionariosError) {
        throw new Error(
          `Falha ao listar funcionários das faltas: ${funcionariosError.message}`,
        )
      }

      const funcionariosById = new Map<string, string>()
      for (const funcionario of (funcionariosRows ?? []) as {
        id: string
        nome: string
      }[]) {
        funcionariosById.set(funcionario.id, funcionario.nome)
      }

      return faltas
        .map((falta) => {
          const nome = funcionariosById.get(falta.funcionario_id)
          if (!nome) {
            return null
          }

          return {
            faltaId: falta.id,
            funcionarioId: falta.funcionario_id,
            funcionarioNome: nome,
            data: falta.data,
            motivo: falta.motivo,
          } satisfies FaltaDetalhada
        })
        .filter((item): item is FaltaDetalhada => item !== null)
    },

    async createFalta(input: CreateFaltaInput): Promise<Falta> {
      const client = requireSupabase()

      ensureRequired(input.funcionarioId, 'funcionário')
      ensureRequired(input.data, 'data')
      ensureRequired(input.motivo, 'motivo')

      const [funcionarioResponse, duplicateResponse] = await Promise.all([
        client
          .from('funcionarios')
          .select('id')
          .eq('id', input.funcionarioId)
          .maybeSingle<{ id: string }>(),
        client
          .from('faltas')
          .select('id')
          .eq('funcionario_id', input.funcionarioId)
          .eq('data', input.data)
          .limit(1),
      ])

      if (funcionarioResponse.error) {
        throw new Error(
          `Falha ao validar funcionário: ${funcionarioResponse.error.message}`,
        )
      }

      if (!funcionarioResponse.data) {
        throw new Error('Funcionário não encontrado.')
      }

      if (duplicateResponse.error) {
        throw new Error(
          `Falha ao validar duplicidade de falta: ${duplicateResponse.error.message}`,
        )
      }

      if ((duplicateResponse.data ?? []).length > 0) {
        throw new Error('Falta já registrada para este funcionário nesta data.')
      }

      const { data, error } = await client
        .from('faltas')
        .insert({
          funcionario_id: input.funcionarioId,
          data: input.data,
          motivo: input.motivo.trim(),
        })
        .select('*')
        .single<FaltaRow>()

      if (error || !data) {
        throw new Error(
          `Falha ao registrar falta: ${error?.message ?? 'erro desconhecido'}`,
        )
      }

      return mapFalta(data)
    },

    async getIndicadoresDashboard(
      dataReferencia: string,
    ): Promise<IndicadoresDashboard> {
      const client = requireSupabase()

      const [funcionariosResponse, faltasResponse] = await Promise.all([
        client.from('funcionarios').select('id, status'),
        client.from('faltas').select('funcionario_id').eq('data', dataReferencia),
      ])

      if (funcionariosResponse.error) {
        throw new Error(
          `Falha ao calcular indicadores (funcionários): ${funcionariosResponse.error.message}`,
        )
      }

      if (faltasResponse.error) {
        throw new Error(
          `Falha ao calcular indicadores (faltas): ${faltasResponse.error.message}`,
        )
      }

      const funcionarios = (funcionariosResponse.data ?? []) as {
        id: string
        status: StatusFuncionario
      }[]

      const ativos = funcionarios.filter((item) => item.status === 'ativo').length
      const desligados = funcionarios.filter((item) => item.status === 'inativo').length

      const ausentes = new Set(
        ((faltasResponse.data ?? []) as { funcionario_id: string }[]).map(
          (item) => item.funcionario_id,
        ),
      ).size

      const presentes = Math.max(ativos - ausentes, 0)
      const taxaAbsenteismo =
        ativos === 0 ? 0 : roundToSingleDecimal((ausentes / ativos) * 100)
      const turnoverInicial =
        funcionarios.length === 0
          ? 0
          : roundToSingleDecimal((desligados / funcionarios.length) * 100)

      return {
        presentes,
        ausentes,
        taxaAbsenteismo,
        turnoverInicial,
      }
    },

    async getProdutividadePorFuncionario(
      inicio: string,
      fim: string,
    ): Promise<ProdutividadeFuncionario[]> {
      const client = requireSupabase()

      ensureRequired(inicio, 'data inicial')
      ensureRequired(fim, 'data final')
      if (inicio > fim) {
        throw new Error('A data inicial precisa ser anterior ou igual à final.')
      }

      const inicioIso = `${inicio}T00:00:00.000Z`
      const fimIso = `${fim}T23:59:59.999Z`

      const [funcionariosResponse, atividadesResponse] = await Promise.all([
        client
          .from('funcionarios')
          .select('id, nome, cargo, equipe')
          .order('nome', { ascending: true }),
        client
          .from('atividades')
          .select('id')
          .eq('status', 'concluida'),
      ])

      if (funcionariosResponse.error) {
        throw new Error(
          `Falha ao listar funcionários: ${funcionariosResponse.error.message}`,
        )
      }

      if (atividadesResponse.error) {
        throw new Error(
          `Falha ao listar atividades concluídas: ${atividadesResponse.error.message}`,
        )
      }

      const atividadesConcluidasIds = ((atividadesResponse.data ?? []) as {
        id: string
      }[]).map((item) => item.id)

      const funcionarios = (funcionariosResponse.data ?? []) as {
        id: string
        nome: string
        cargo: string
        equipe: string | null
      }[]

      if (atividadesConcluidasIds.length === 0) {
        return funcionarios.map((f) => ({
          funcionarioId: f.id,
          funcionarioNome: f.nome,
          cargo: f.cargo,
          equipe: f.equipe,
          totalConcluidas: 0,
        }))
      }

      const { data: apontamentos, error: apontamentosError } = await client
        .from('apontamentos_atividade')
        .select('funcionario_id, atividade_id, termino')
        .in('atividade_id', atividadesConcluidasIds)
        .gte('termino', inicioIso)
        .lte('termino', fimIso)
        .not('termino', 'is', null)

      if (apontamentosError) {
        throw new Error(
          `Falha ao calcular produtividade: ${apontamentosError.message}`,
        )
      }

      const concluiuPor: Record<string, number> = {}
      for (const item of (apontamentos ?? []) as {
        funcionario_id: string
        atividade_id: string
        termino: string | null
      }[]) {
        if (!item.termino) continue
        concluiuPor[item.funcionario_id] =
          (concluiuPor[item.funcionario_id] ?? 0) + 1
      }

      return funcionarios
        .map((f) => ({
          funcionarioId: f.id,
          funcionarioNome: f.nome,
          cargo: f.cargo,
          equipe: f.equipe,
          totalConcluidas: concluiuPor[f.id] ?? 0,
        }))
        .sort((a, b) => b.totalConcluidas - a.totalConcluidas)
    },

    async getRelatorioConsolidado(
      inicio: string,
      fim: string,
    ): Promise<RelatorioConsolidado> {
      const client = requireSupabase()
      ensureRequired(inicio, 'data inicial')
      ensureRequired(fim, 'data final')
      if (inicio > fim) {
        throw new Error('A data inicial precisa ser anterior ou igual à final.')
      }

      const inicioIso = `${inicio}T00:00:00.000Z`
      const fimIso = `${fim}T23:59:59.999Z`

      const [
        funcionariosResponse,
        faltasResponse,
        observacoesResponse,
        atividadesConcluidasResponse,
      ] = await Promise.all([
        client.from('funcionarios').select('id, nome, status'),
        client
          .from('faltas')
          .select('funcionario_id, data')
          .gte('data', inicio)
          .lte('data', fim),
        client
          .from('observacoes')
          .select('id')
          .gte('data', inicio)
          .lte('data', fim),
        client.from('atividades').select('id, titulo, status').eq('status', 'concluida'),
      ])

      if (funcionariosResponse.error) {
        throw new Error(
          `Falha ao consolidar relatório (funcionários): ${funcionariosResponse.error.message}`,
        )
      }
      if (faltasResponse.error) {
        throw new Error(
          `Falha ao consolidar relatório (faltas): ${faltasResponse.error.message}`,
        )
      }
      if (observacoesResponse.error) {
        throw new Error(
          `Falha ao consolidar relatório (observações): ${observacoesResponse.error.message}`,
        )
      }
      if (atividadesConcluidasResponse.error) {
        throw new Error(
          `Falha ao consolidar relatório (atividades): ${atividadesConcluidasResponse.error.message}`,
        )
      }

      const funcionarios = (funcionariosResponse.data ?? []) as {
        id: string
        nome: string
        status: StatusFuncionario
      }[]

      const ativos = funcionarios.filter((f) => f.status === 'ativo').length
      const faltas = (faltasResponse.data ?? []) as {
        funcionario_id: string
        data: string
      }[]
      const totalAusencias = faltas.length

      const datasNoPeriodo: string[] = []
      const cursor = new Date(`${inicio}T00:00:00`)
      const fimDate = new Date(`${fim}T00:00:00`)
      while (cursor <= fimDate) {
        datasNoPeriodo.push(cursor.toISOString().slice(0, 10))
        cursor.setDate(cursor.getDate() + 1)
      }

      let totalPresencas = 0
      for (const dia of datasNoPeriodo) {
        const ausentesDia = new Set(
          faltas.filter((f) => f.data === dia).map((f) => f.funcionario_id),
        )
        totalPresencas += Math.max(ativos - ausentesDia.size, 0)
      }

      const atividadesConcluidas = (atividadesConcluidasResponse.data ??
        []) as {
        id: string
        titulo: string
        status: StatusAtividade
      }[]
      const atividadesConcluidasIds = atividadesConcluidas.map((a) => a.id)

      let atividadesConcluidasDetalhadas: RelatorioConsolidado['atividadesConcluidasDetalhadas'] =
        []

      if (atividadesConcluidasIds.length > 0) {
        const { data: apontamentos, error: apontamentosError } = await client
          .from('apontamentos_atividade')
          .select('atividade_id, funcionario_id, termino')
          .in('atividade_id', atividadesConcluidasIds)
          .gte('termino', inicioIso)
          .lte('termino', fimIso)
          .not('termino', 'is', null)

        if (apontamentosError) {
          throw new Error(
            `Falha ao consolidar relatório (apontamentos): ${apontamentosError.message}`,
          )
        }

        const atividadesById = new Map(atividadesConcluidas.map((a) => [a.id, a]))
        const funcionariosById = new Map(funcionarios.map((f) => [f.id, f]))

        atividadesConcluidasDetalhadas = ((apontamentos ?? []) as {
          atividade_id: string
          funcionario_id: string
          termino: string | null
        }[])
          .filter((item) => item.termino)
          .map((item) => ({
            atividadeId: item.atividade_id,
            titulo: atividadesById.get(item.atividade_id)?.titulo ?? '—',
            responsavelNome:
              funcionariosById.get(item.funcionario_id)?.nome ?? null,
            termino: item.termino as string,
          }))
      }

      const totalAtividadesConcluidas = atividadesConcluidasDetalhadas.length

      const produtividade = await (this as DataService).getProdutividadePorFuncionario(
        inicio,
        fim,
      )

      const ausenciasPorFuncionarioMap = new Map<string, number>()
      for (const f of faltas) {
        ausenciasPorFuncionarioMap.set(
          f.funcionario_id,
          (ausenciasPorFuncionarioMap.get(f.funcionario_id) ?? 0) + 1,
        )
      }
      const ausenciasPorFuncionario = Array.from(
        ausenciasPorFuncionarioMap.entries(),
      )
        .map(([id, total]) => ({
          funcionarioNome: funcionarios.find((f) => f.id === id)?.nome ?? '—',
          total,
        }))
        .sort((a, b) => b.total - a.total)

      return {
        inicio,
        fim,
        totalPresencas,
        totalAusencias,
        totalAtividadesConcluidas,
        totalObservacoes: (observacoesResponse.data ?? []).length,
        produtividade,
        ausenciasPorFuncionario,
        atividadesConcluidasDetalhadas,
      }
    },

    async listObservacoes(filtro?: {
      data?: string
      inicio?: string
      fim?: string
    }): Promise<Observacao[]> {
      const client = requireSupabase()
      let query = client
        .from('observacoes')
        .select('*')
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false })

      if (filtro?.data) {
        query = query.eq('data', filtro.data)
      } else if (filtro?.inicio && filtro?.fim) {
        if (filtro.inicio > filtro.fim) {
          throw new Error('A data inicial precisa ser anterior ou igual à final.')
        }
        query = query.gte('data', filtro.inicio).lte('data', filtro.fim)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Falha ao listar observações: ${error.message}`)
      }

      const observacoes = (data ?? []) as ObservacaoRow[]
      const criadorIds = [
        ...new Set(observacoes.map((o) => o.criado_por).filter((id): id is string => Boolean(id))),
      ]

      let nomesPorId = new Map<string, string>()
      if (criadorIds.length > 0) {
        const { data: usuariosData, error: usuariosError } = await client
          .from('users')
          .select('id, nome')
          .in('id', criadorIds)
        if (usuariosError) {
          throw new Error(`Falha ao carregar autores das observações: ${usuariosError.message}`)
        }
        nomesPorId = new Map(
          ((usuariosData ?? []) as { id: string; nome: string }[]).map((u) => [u.id, u.nome]),
        )
      }

      return observacoes.map((row) =>
        mapObservacao(row, row.criado_por ? nomesPorId.get(row.criado_por) ?? null : null),
      )
    },

    async createObservacao(input: CreateObservacaoInput): Promise<Observacao> {
      const client = requireSupabase()
      ensureRequired(input.data, 'data')
      const texto = input.texto?.trim() ?? ''
      if (!texto) {
        throw new Error('A observação não pode estar vazia.')
      }

      const { data: profile } = await client.auth.getUser()
      const criadoPor = profile?.user?.id ?? null

      const { data, error } = await client
        .from('observacoes')
        .insert({
          data: input.data,
          texto,
          criado_por: criadoPor,
        })
        .select('*')
        .single<ObservacaoRow>()

      if (error || !data) {
        throw new Error(
          `Falha ao registrar observação: ${error?.message ?? 'erro desconhecido'}`,
        )
      }

      let criadoPorNome: string | null = null
      if (criadoPor) {
        const { data: userRow } = await client
          .from('users')
          .select('nome')
          .eq('id', criadoPor)
          .maybeSingle<{ nome: string }>()
        criadoPorNome = userRow?.nome ?? null
      }

      return mapObservacao(data, criadoPorNome)
    },

    async updateObservacao(
      id: string,
      input: UpdateObservacaoInput,
    ): Promise<Observacao> {
      const client = requireSupabase()
      const patch: Partial<ObservacaoRow> = {}
      if (input.texto !== undefined) {
        const texto = input.texto.trim()
        if (!texto) {
          throw new Error('A observação não pode estar vazia.')
        }
        patch.texto = texto
      }
      if (input.data !== undefined) {
        ensureRequired(input.data, 'data')
        patch.data = input.data
      }

      const { data, error } = await client
        .from('observacoes')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single<ObservacaoRow>()

      if (error || !data) {
        throw new Error(
          `Falha ao atualizar observação: ${error?.message ?? 'erro desconhecido'}`,
        )
      }

      let criadoPorNome: string | null = null
      if (data.criado_por) {
        const { data: userRow } = await client
          .from('users')
          .select('nome')
          .eq('id', data.criado_por)
          .maybeSingle<{ nome: string }>()
        criadoPorNome = userRow?.nome ?? null
      }

      return mapObservacao(data, criadoPorNome)
    },

    async deleteObservacao(id: string): Promise<void> {
      const client = requireSupabase()
      const { error } = await client.from('observacoes').delete().eq('id', id)
      if (error) {
        throw new Error(`Falha ao remover observação: ${error.message}`)
      }
    },

    async getPendenciasOperacionais(
      dataReferencia: string,
    ): Promise<PendenciasOperacionais> {
      const client = requireSupabase()
      const hoje = dataReferencia

      const [atrasadasResponse, naoIniciadasResponse, faltasResponse] =
        await Promise.all([
          client
            .from('atividades')
            .select('id, titulo, status, prioridade, data_prevista, responsavel_id')
            .neq('status', 'concluida')
            .not('data_prevista', 'is', null)
            .lt('data_prevista', hoje),
          client
            .from('atividades')
            .select('id, titulo, status, prioridade, data_prevista, responsavel_id')
            .eq('status', 'nao_iniciada')
            .not('data_prevista', 'is', null)
            .lte('data_prevista', hoje),
          client
            .from('faltas')
            .select('id, funcionario_id, data, motivo')
            .eq('data', hoje),
        ])

      if (atrasadasResponse.error) {
        throw new Error(
          `Falha ao buscar atividades atrasadas: ${atrasadasResponse.error.message}`,
        )
      }
      if (naoIniciadasResponse.error) {
        throw new Error(
          `Falha ao buscar atividades não iniciadas: ${naoIniciadasResponse.error.message}`,
        )
      }
      if (faltasResponse.error) {
        throw new Error(
          `Falha ao buscar ausências do dia: ${faltasResponse.error.message}`,
        )
      }

      const todasAtividades = [
        ...((atrasadasResponse.data ?? []) as {
          id: string
          titulo: string
          status: StatusAtividade
          prioridade: PrioridadeAtividade
          data_prevista: string | null
          responsavel_id: string | null
        }[]),
        ...((naoIniciadasResponse.data ?? []) as {
          id: string
          titulo: string
          status: StatusAtividade
          prioridade: PrioridadeAtividade
          data_prevista: string | null
          responsavel_id: string | null
        }[]),
      ]

      const responsavelIds = [
        ...new Set(
          todasAtividades
            .map((item) => item.responsavel_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ]
      const funcionarioIdsFaltas = [
        ...new Set(
          ((faltasResponse.data ?? []) as { funcionario_id: string }[]).map(
            (f) => f.funcionario_id,
          ),
        ),
      ]
      const idsParaBuscar = [
        ...new Set([...responsavelIds, ...funcionarioIdsFaltas]),
      ]

      let nomesPorId = new Map<string, string>()
      if (idsParaBuscar.length > 0) {
        const { data: funcs } = await client
          .from('funcionarios')
          .select('id, nome')
          .in('id', idsParaBuscar)
        nomesPorId = new Map(
          ((funcs ?? []) as { id: string; nome: string }[]).map((f) => [
            f.id,
            f.nome,
          ]),
        )
      }

      const buildPendente = (item: {
        id: string
        titulo: string
        status: StatusAtividade
        prioridade: PrioridadeAtividade
        data_prevista: string | null
        responsavel_id: string | null
      }): AtividadePendente => ({
        id: item.id,
        titulo: item.titulo,
        status: item.status,
        prioridade: item.prioridade,
        dataPrevista: item.data_prevista,
        responsavelId: item.responsavel_id,
        responsavelNome: item.responsavel_id
          ? nomesPorId.get(item.responsavel_id) ?? null
          : null,
        diasAtraso:
          item.data_prevista && item.data_prevista < hoje
            ? diffDays(item.data_prevista, hoje)
            : 0,
      })

      const atividadesAtrasadas = (atrasadasResponse.data ?? [])
        .map((item) =>
          buildPendente(
            item as {
              id: string
              titulo: string
              status: StatusAtividade
              prioridade: PrioridadeAtividade
              data_prevista: string | null
              responsavel_id: string | null
            },
          ),
        )
        .sort((a, b) => b.diasAtraso - a.diasAtraso)

      const atividadesNaoIniciadasNoPrazo = (naoIniciadasResponse.data ?? [])
        .map((item) =>
          buildPendente(
            item as {
              id: string
              titulo: string
              status: StatusAtividade
              prioridade: PrioridadeAtividade
              data_prevista: string | null
              responsavel_id: string | null
            },
          ),
        )
        .sort((a, b) => {
          const ordem = { alta: 0, media: 1, baixa: 2 } as const
          return ordem[a.prioridade] - ordem[b.prioridade]
        })

      const ausenciasHoje = ((faltasResponse.data ?? []) as {
        id: string
        funcionario_id: string
        data: string
        motivo: string
      }[]).map((falta) => ({
        faltaId: falta.id,
        funcionarioId: falta.funcionario_id,
        funcionarioNome: nomesPorId.get(falta.funcionario_id) ?? '—',
        data: falta.data,
        motivo: falta.motivo,
      })) satisfies FaltaDetalhada[]

      return {
        atividadesAtrasadas,
        atividadesNaoIniciadasNoPrazo,
        ausenciasHoje,
        totalPendencias:
          atividadesAtrasadas.length +
          atividadesNaoIniciadasNoPrazo.length +
          ausenciasHoje.length,
      }
    },
  }
}
