import type {
  Atividade,
  AtividadeDoFuncionario,
  AtribuicaoAtividade,
  AtribuicaoDetalhada,
  AuthCredentials,
  CreateAtividadeInput,
  CreateAtribuicaoInput,
  CreateFaltaInput,
  CreateFuncionarioInput,
  Falta,
  FaltaDetalhada,
  Funcionario,
  IndicadoresDashboard,
  PerfilUsuario,
  StatusAtividade,
  StatusFuncionario,
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
): Atividade {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    status,
    dataCriacao: row.data_criacao,
  }
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
      const { data: apontamentosRows, error: apontamentosError } = await client
        .from('apontamentos_atividade')
        .select('id, atividade_id, funcionario_id, inicio, termino')
        .in('atividade_id', atividadeIds)
        .order('inicio', { ascending: false })

      if (apontamentosError) {
        throw new Error(
          `Falha ao listar apontamentos das atividades: ${apontamentosError.message}`,
        )
      }

      const latestApontamentos = latestApontamentoByActivity(
        (apontamentosRows ?? []) as ApontamentoRow[],
      )

      return atividades.map((atividade) =>
        mapAtividade(
          atividade,
          deriveStatusFromApontamento(
            latestApontamentos.get(atividade.id),
            atividade.status,
          ),
        ),
      )
    },

    async createAtividade(input: CreateAtividadeInput): Promise<Atividade> {
      const client = requireSupabase()

      ensureRequired(input.titulo, 'título')
      ensureRequired(input.descricao, 'descrição')

      const { data, error } = await client
        .from('atividades')
        .insert({
          titulo: input.titulo.trim(),
          descricao: input.descricao.trim(),
          status: 'nao_iniciada',
        })
        .select('*')
        .single<AtividadeRow>()

      if (error || !data) {
        throw new Error(
          `Falha ao criar atividade: ${error?.message ?? 'erro desconhecido'}`,
        )
      }

      return mapAtividade(data)
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
          .select('id, titulo, descricao, status')
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
  }
}
