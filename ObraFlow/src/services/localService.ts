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
  UpdateAtividadeInput,
  UpdateObservacaoInput,
  Usuario,
} from '../models/domain'
import {
  assertAtividadePodeSerReprogramada,
  assertPeriodoValido,
  assertUpdateAtividadeValido,
} from './businessRules'
import type { DataService } from './api'

interface StoredUser {
  id: string
  nome: string
  email: string
  senha: string
  perfil: PerfilUsuario
}

interface StoredAtividade {
  id: string
  titulo: string
  descricao: string
  status: StatusAtividade
  dataCriacao: string
  responsavelId: string | null
  dataPrevista: string | null
  prioridade: PrioridadeAtividade
}

interface StoredHistorico {
  id: string
  atividadeId: string
  campo: CampoHistoricoAtividade
  valorAnterior: string | null
  valorNovo: string | null
  alteradoPor: string | null
  alteradoPorNome: string | null
  dataAlteracao: string
  motivo: string | null
}

interface StoredObservacao {
  id: string
  data: string
  texto: string
  criadoEm: string
  atualizadoEm: string | null
  criadoPor: string | null
}

interface LocalDatabase {
  version: 3
  users: StoredUser[]
  funcionarios: Funcionario[]
  atividades: StoredAtividade[]
  atribuicoes: AtribuicaoAtividade[]
  apontamentos: {
    id: string
    atividadeId: string
    funcionarioId: string
    inicio: string
    termino: string | null
  }[]
  faltas: Falta[]
  historicoAtividades: StoredHistorico[]
  observacoes: StoredObservacao[]
  sessionUserId: string | null
}

const STORAGE_KEY = 'obraflow_local_db_v3'
const LEGACY_STORAGE_KEYS = ['obraflow_local_db_v1', 'obraflow_local_db_v2']

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function roundToSingleDecimal(value: number): number {
  return Number(value.toFixed(1))
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function diffDays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime()
  const to = new Date(`${toIso}T00:00:00`).getTime()
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return 0
  }
  return Math.floor((to - from) / (1000 * 60 * 60 * 24))
}

function latestApontamento(
  apontamentos: LocalDatabase['apontamentos'],
  atividadeId: string,
  funcionarioId: string,
): LocalDatabase['apontamentos'][number] | null {
  const match = apontamentos
    .filter(
      (item) =>
        item.atividadeId === atividadeId && item.funcionarioId === funcionarioId,
    )
    .sort((a, b) => b.inicio.localeCompare(a.inicio))

  return match[0] ?? null
}

function daysAgoIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function dateAtHour(daysOffset: number, hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function createSeedDatabase(): LocalDatabase {
  const now = new Date().toISOString()

  // ---- IDs estáveis para vinculação ----
  const gestorId = 'usr-gestor-seed'
  const funcionarioUserId = 'usr-funcionario-seed'

  const funcJoao = 'func-001-joao'
  const funcMaria = 'func-002-maria'
  const funcCarlos = 'func-003-carlos'
  const funcAna = 'func-004-ana'
  const funcRoberto = 'func-005-roberto'
  const funcLucia = 'func-006-lucia'

  const atvAlvenaria = 'atv-alvenaria'
  const atvEletrica = 'atv-eletrica'
  const atvConcretagem = 'atv-concretagem'
  const atvPintura = 'atv-pintura'
  const atvHidraulica = 'atv-hidraulica'
  const atvRevestimento = 'atv-revestimento'
  const atvEscoramento = 'atv-escoramento'
  const atvReforco = 'atv-reforco'
  const atvVistoria = 'atv-vistoria'
  const atvLimpeza = 'atv-limpeza'
  const atvVedacao = 'atv-vedacao'
  const atvChapisco = 'atv-chapisco'
  const atvCabeamento = 'atv-cabeamento'
  const atvTesteHidro = 'atv-teste-hidro'

  return {
    version: 3,
    users: [
      {
        id: gestorId,
        nome: 'Marina Costa',
        email: 'gestor@obraflow.com',
        senha: '123456',
        perfil: 'gestor',
      },
      {
        id: funcionarioUserId,
        nome: 'João Silva',
        email: 'funcionario@obraflow.com',
        senha: '123456',
        perfil: 'funcionario',
      },
    ],
    funcionarios: [
      {
        id: funcJoao,
        nome: 'João Silva',
        matricula: 'OBR-001',
        cpf: '111.111.111-11',
        cargo: 'Pedreiro',
        equipe: 'Alvenaria',
        status: 'ativo',
        email: 'funcionario@obraflow.com',
        userId: funcionarioUserId,
        createdAt: now,
      },
      {
        id: funcMaria,
        nome: 'Maria Santos',
        matricula: 'OBR-002',
        cpf: '222.222.222-22',
        cargo: 'Pedreira',
        equipe: 'Alvenaria',
        status: 'ativo',
        email: 'maria.santos@obraflow.com',
        userId: null,
        createdAt: now,
      },
      {
        id: funcCarlos,
        nome: 'Carlos Almeida',
        matricula: 'OBR-003',
        cpf: '333.333.333-33',
        cargo: 'Eletricista',
        equipe: 'Instalações',
        status: 'ativo',
        email: 'carlos.almeida@obraflow.com',
        userId: null,
        createdAt: now,
      },
      {
        id: funcAna,
        nome: 'Ana Paula Souza',
        matricula: 'OBR-004',
        cpf: '444.444.444-44',
        cargo: 'Encanadora',
        equipe: 'Hidráulica',
        status: 'ativo',
        email: 'ana.souza@obraflow.com',
        userId: null,
        createdAt: now,
      },
      {
        id: funcRoberto,
        nome: 'Roberto Oliveira',
        matricula: 'OBR-005',
        cpf: '555.555.555-55',
        cargo: 'Carpinteiro',
        equipe: 'Estrutura',
        status: 'ativo',
        email: 'roberto.oliveira@obraflow.com',
        userId: null,
        createdAt: now,
      },
      {
        id: funcLucia,
        nome: 'Lucia Ferreira',
        matricula: 'OBR-006',
        cpf: '666.666.666-66',
        cargo: 'Pintora',
        equipe: 'Acabamento',
        status: 'inativo',
        email: 'lucia.ferreira@obraflow.com',
        userId: null,
        createdAt: now,
      },
    ],
    atividades: [
      // Em andamento (hoje)
      {
        id: atvAlvenaria,
        titulo: 'Levantamento de alvenaria no bloco A',
        descricao: 'Executar primeira fiada e conferência de prumo.',
        status: 'em_andamento',
        dataCriacao: now,
        responsavelId: funcJoao,
        dataPrevista: todayIso(),
        prioridade: 'media',
      },
      // Atrasadas / não iniciadas no prazo (US18)
      {
        id: atvEletrica,
        titulo: 'Instalação elétrica do pavimento 2',
        descricao: 'Execução do quadro de distribuição e tomadas de uso geral.',
        status: 'nao_iniciada',
        dataCriacao: now,
        responsavelId: funcCarlos,
        dataPrevista: daysAgoIso(5),
        prioridade: 'alta',
      },
      {
        id: atvConcretagem,
        titulo: 'Concretagem da laje técnica',
        descricao: 'Lançamento e nivelamento do concreto, inclusive cura inicial.',
        status: 'em_andamento',
        dataCriacao: now,
        responsavelId: funcRoberto,
        dataPrevista: daysAgoIso(3),
        prioridade: 'alta',
      },
      {
        id: atvPintura,
        titulo: 'Pintura do hall principal',
        descricao: 'Aplicação de duas demãos de tinta acrílica.',
        status: 'nao_iniciada',
        dataCriacao: now,
        responsavelId: funcLucia,
        dataPrevista: todayIso(),
        prioridade: 'alta',
      },
      // Futuras
      {
        id: atvHidraulica,
        titulo: 'Instalação hidráulica do banheiro 3',
        descricao: 'Montagem do shaft e teste de estanqueidade.',
        status: 'nao_iniciada',
        dataCriacao: now,
        responsavelId: funcAna,
        dataPrevista: daysAgoIso(-5),
        prioridade: 'media',
      },
      {
        id: atvRevestimento,
        titulo: 'Revestimento cerâmico da cozinha',
        descricao: 'Assentamento e rejunte da cerâmica importada.',
        status: 'nao_iniciada',
        dataCriacao: now,
        responsavelId: funcMaria,
        dataPrevista: daysAgoIso(-10),
        prioridade: 'baixa',
      },
      // Concluídas (alimentam produtividade)
      {
        id: atvEscoramento,
        titulo: 'Escoramento do mezanino',
        descricao: 'Montagem de escoras metálicas para concretagem.',
        status: 'concluida',
        dataCriacao: now,
        responsavelId: funcRoberto,
        dataPrevista: daysAgoIso(10),
        prioridade: 'alta',
      },
      {
        id: atvReforco,
        titulo: 'Reforço estrutural da coluna B2',
        descricao: 'Aplicação de fibra de carbono e finalização.',
        status: 'concluida',
        dataCriacao: now,
        responsavelId: funcMaria,
        dataPrevista: daysAgoIso(7),
        prioridade: 'media',
      },
      {
        id: atvVistoria,
        titulo: 'Vistoria de qualidade do bloco A',
        descricao: 'Checklist final de acabamento e prumo.',
        status: 'concluida',
        dataCriacao: now,
        responsavelId: funcJoao,
        dataPrevista: daysAgoIso(2),
        prioridade: 'baixa',
      },
      {
        id: atvLimpeza,
        titulo: 'Limpeza pós-obra do bloco C',
        descricao: 'Remoção de entulho e limpeza fina.',
        status: 'concluida',
        dataCriacao: now,
        responsavelId: funcRoberto,
        dataPrevista: daysAgoIso(15),
        prioridade: 'baixa',
      },
      {
        id: atvVedacao,
        titulo: 'Vedação de juntas do bloco A',
        descricao: 'Selante poliuretânico nas juntas de dilatação.',
        status: 'concluida',
        dataCriacao: now,
        responsavelId: funcMaria,
        dataPrevista: daysAgoIso(12),
        prioridade: 'media',
      },
      {
        id: atvChapisco,
        titulo: 'Aplicação de chapisco no muro',
        descricao: 'Chapisco rolado em parede externa do bloco B.',
        status: 'concluida',
        dataCriacao: now,
        responsavelId: funcMaria,
        dataPrevista: daysAgoIso(5),
        prioridade: 'baixa',
      },
      {
        id: atvCabeamento,
        titulo: 'Cabeamento estruturado da sala técnica',
        descricao: 'Passagem de cabos cat6 e organização do rack.',
        status: 'concluida',
        dataCriacao: now,
        responsavelId: funcCarlos,
        dataPrevista: daysAgoIso(8),
        prioridade: 'media',
      },
      {
        id: atvTesteHidro,
        titulo: 'Teste hidráulico do shaft principal',
        descricao: 'Pressurização da coluna e verificação de vazamentos.',
        status: 'concluida',
        dataCriacao: now,
        responsavelId: funcAna,
        dataPrevista: daysAgoIso(4),
        prioridade: 'alta',
      },
    ],
    atribuicoes: [
      { id: 'atr-001', atividadeId: atvAlvenaria, funcionarioId: funcJoao, dataAtribuicao: now },
      { id: 'atr-002', atividadeId: atvEletrica, funcionarioId: funcCarlos, dataAtribuicao: now },
      { id: 'atr-003', atividadeId: atvConcretagem, funcionarioId: funcRoberto, dataAtribuicao: now },
      { id: 'atr-004', atividadeId: atvPintura, funcionarioId: funcLucia, dataAtribuicao: now },
      { id: 'atr-005', atividadeId: atvHidraulica, funcionarioId: funcAna, dataAtribuicao: now },
      { id: 'atr-006', atividadeId: atvRevestimento, funcionarioId: funcMaria, dataAtribuicao: now },
      { id: 'atr-007', atividadeId: atvEscoramento, funcionarioId: funcRoberto, dataAtribuicao: now },
      { id: 'atr-008', atividadeId: atvReforco, funcionarioId: funcMaria, dataAtribuicao: now },
      { id: 'atr-009', atividadeId: atvVistoria, funcionarioId: funcJoao, dataAtribuicao: now },
      { id: 'atr-010', atividadeId: atvLimpeza, funcionarioId: funcRoberto, dataAtribuicao: now },
      { id: 'atr-011', atividadeId: atvVedacao, funcionarioId: funcMaria, dataAtribuicao: now },
      { id: 'atr-012', atividadeId: atvChapisco, funcionarioId: funcMaria, dataAtribuicao: now },
      { id: 'atr-013', atividadeId: atvCabeamento, funcionarioId: funcCarlos, dataAtribuicao: now },
      { id: 'atr-014', atividadeId: atvTesteHidro, funcionarioId: funcAna, dataAtribuicao: now },
    ],
    apontamentos: [
      // Em andamento (sem termino)
      {
        id: 'apo-alv',
        atividadeId: atvAlvenaria,
        funcionarioId: funcJoao,
        inicio: dateAtHour(0, 8),
        termino: null,
      },
      {
        id: 'apo-con',
        atividadeId: atvConcretagem,
        funcionarioId: funcRoberto,
        inicio: dateAtHour(-3, 7),
        termino: null,
      },
      // Concluídos
      {
        id: 'apo-esc',
        atividadeId: atvEscoramento,
        funcionarioId: funcRoberto,
        inicio: dateAtHour(-10, 8),
        termino: dateAtHour(-10, 17),
      },
      {
        id: 'apo-ref',
        atividadeId: atvReforco,
        funcionarioId: funcMaria,
        inicio: dateAtHour(-7, 8),
        termino: dateAtHour(-7, 16),
      },
      {
        id: 'apo-vis',
        atividadeId: atvVistoria,
        funcionarioId: funcJoao,
        inicio: dateAtHour(-2, 9),
        termino: dateAtHour(-2, 12),
      },
      {
        id: 'apo-lim',
        atividadeId: atvLimpeza,
        funcionarioId: funcRoberto,
        inicio: dateAtHour(-15, 8),
        termino: dateAtHour(-15, 15),
      },
      {
        id: 'apo-ved',
        atividadeId: atvVedacao,
        funcionarioId: funcMaria,
        inicio: dateAtHour(-12, 8),
        termino: dateAtHour(-12, 17),
      },
      {
        id: 'apo-cha',
        atividadeId: atvChapisco,
        funcionarioId: funcMaria,
        inicio: dateAtHour(-5, 8),
        termino: dateAtHour(-5, 16),
      },
      {
        id: 'apo-cab',
        atividadeId: atvCabeamento,
        funcionarioId: funcCarlos,
        inicio: dateAtHour(-8, 8),
        termino: dateAtHour(-8, 17),
      },
      {
        id: 'apo-th',
        atividadeId: atvTesteHidro,
        funcionarioId: funcAna,
        inicio: dateAtHour(-4, 9),
        termino: dateAtHour(-4, 14),
      },
    ],
    faltas: [
      { id: 'falt-001', funcionarioId: funcMaria, data: daysAgoIso(1), motivo: 'Consulta médica agendada' },
      { id: 'falt-002', funcionarioId: funcCarlos, data: todayIso(), motivo: 'Atestado por gripe' },
      { id: 'falt-003', funcionarioId: funcRoberto, data: daysAgoIso(3), motivo: 'Compromisso pessoal' },
      { id: 'falt-004', funcionarioId: funcLucia, data: daysAgoIso(5), motivo: 'Falta justificada — luto familiar' },
    ],
    historicoAtividades: [
      {
        id: 'hist-001',
        atividadeId: atvConcretagem,
        campo: 'prioridade',
        valorAnterior: 'media',
        valorNovo: 'alta',
        alteradoPor: gestorId,
        alteradoPorNome: 'Marina Costa',
        dataAlteracao: dateAtHour(-4, 10),
        motivo: 'Cronograma do cliente foi adiantado',
      },
      {
        id: 'hist-002',
        atividadeId: atvConcretagem,
        campo: 'data_prevista',
        valorAnterior: daysAgoIso(-2),
        valorNovo: daysAgoIso(3),
        alteradoPor: gestorId,
        alteradoPorNome: 'Marina Costa',
        dataAlteracao: dateAtHour(-5, 15),
        motivo: 'Adiantamento solicitado pelo cliente',
      },
      {
        id: 'hist-003',
        atividadeId: atvPintura,
        campo: 'responsavel',
        valorAnterior: 'Maria Santos',
        valorNovo: 'Lucia Ferreira',
        alteradoPor: gestorId,
        alteradoPorNome: 'Marina Costa',
        dataAlteracao: dateAtHour(-2, 11),
        motivo: 'Realocação por disponibilidade da equipe',
      },
      {
        id: 'hist-004',
        atividadeId: atvVistoria,
        campo: 'status',
        valorAnterior: 'em_andamento',
        valorNovo: 'concluida',
        alteradoPor: gestorId,
        alteradoPorNome: 'Marina Costa',
        dataAlteracao: dateAtHour(-2, 12),
        motivo: null,
      },
    ],
    observacoes: [
      {
        id: 'obs-001',
        data: todayIso(),
        texto:
          'Chegada de material atrasada — concreto previsto chegou às 11h, atrasando o cronograma da concretagem da laje técnica.',
        criadoEm: dateAtHour(0, 11),
        atualizadoEm: null,
        criadoPor: gestorId,
      },
      {
        id: 'obs-002',
        data: daysAgoIso(1),
        texto:
          'Reunião com fornecedor sobre cerâmica importada — entrega confirmada para a próxima semana.',
        criadoEm: dateAtHour(-1, 16),
        atualizadoEm: null,
        criadoPor: gestorId,
      },
      {
        id: 'obs-003',
        data: daysAgoIso(3),
        texto:
          'Equipe relatou ruído elevado de obra vizinha. Engenheiro acionado para mediação com vizinhos.',
        criadoEm: dateAtHour(-3, 14),
        atualizadoEm: null,
        criadoPor: gestorId,
      },
      {
        id: 'obs-004',
        data: daysAgoIso(7),
        texto:
          'Inspeção da CIPA realizada sem apontamentos críticos. Necessário atualizar treinamento de altura para 2 colaboradores.',
        criadoEm: dateAtHour(-7, 9),
        atualizadoEm: null,
        criadoPor: gestorId,
      },
    ],
    sessionUserId: null,
  }
}

function readDatabase(): LocalDatabase {
  // Limpa storages legados (v1, v2) — schema mudou na Sprint 3
  for (const legacy of LEGACY_STORAGE_KEYS) {
    if (localStorage.getItem(legacy)) {
      localStorage.removeItem(legacy)
    }
  }

  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    const seed = createSeedDatabase()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return seed
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>
    if (parsed.version !== 3) {
      const seed = createSeedDatabase()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
      return seed
    }
    return parsed as LocalDatabase
  } catch {
    const seed = createSeedDatabase()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return seed
  }
}

function writeDatabase(db: LocalDatabase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function mapToUsuario(user: StoredUser, funcionarios: Funcionario[]): Usuario {
  const funcionario = funcionarios.find((item) => item.userId === user.id)

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    funcionarioId: funcionario?.id ?? null,
  }
}

function ensureRequired(value: string, label: string): void {
  if (!value.trim()) {
    throw new Error(`O campo ${label} é obrigatório.`)
  }
}

function mapAtividade(
  stored: StoredAtividade,
  funcionarios: Funcionario[],
): Atividade {
  const responsavel = stored.responsavelId
    ? funcionarios.find((item) => item.id === stored.responsavelId) ?? null
    : null

  return {
    id: stored.id,
    titulo: stored.titulo,
    descricao: stored.descricao,
    status: stored.status,
    dataCriacao: stored.dataCriacao,
    responsavelId: stored.responsavelId,
    responsavelNome: responsavel?.nome ?? null,
    dataPrevista: stored.dataPrevista,
    prioridade: stored.prioridade,
  }
}

function getCurrentUser(db: LocalDatabase): StoredUser | null {
  if (!db.sessionUserId) {
    return null
  }
  return db.users.find((user) => user.id === db.sessionUserId) ?? null
}

function recordHistorico(
  db: LocalDatabase,
  atividadeId: string,
  campo: CampoHistoricoAtividade,
  valorAnterior: string | null,
  valorNovo: string | null,
  motivo: string | null,
): void {
  const currentUser = getCurrentUser(db)

  db.historicoAtividades.push({
    id: createId('hist'),
    atividadeId,
    campo,
    valorAnterior,
    valorNovo,
    alteradoPor: currentUser?.id ?? null,
    alteradoPorNome: currentUser?.nome ?? null,
    dataAlteracao: new Date().toISOString(),
    motivo,
  })
}

function syncAtribuicaoPrincipal(
  db: LocalDatabase,
  atividadeId: string,
  responsavelId: string | null,
): void {
  if (!responsavelId) {
    return
  }
  const existing = db.atribuicoes.find(
    (item) =>
      item.atividadeId === atividadeId && item.funcionarioId === responsavelId,
  )
  if (existing) {
    return
  }
  db.atribuicoes.push({
    id: createId('atr'),
    atividadeId,
    funcionarioId: responsavelId,
    dataAtribuicao: new Date().toISOString(),
  })
}

export function createLocalService(): DataService {
  return {
    mode: 'local',

    async login(credentials: AuthCredentials): Promise<Usuario> {
      const email = normalizeEmail(credentials.email)
      ensureRequired(email, 'email')
      ensureRequired(credentials.senha, 'senha')

      const db = readDatabase()
      const user = db.users.find(
        (item) =>
          normalizeEmail(item.email) === email && item.senha === credentials.senha,
      )

      if (!user) {
        throw new Error('Credenciais inválidas.')
      }

      if (user.perfil === 'funcionario') {
        const funcionario = db.funcionarios.find((item) => item.userId === user.id)
        if (!funcionario) {
          throw new Error('Funcionário sem cadastro vinculado.')
        }
      }

      db.sessionUserId = user.id
      writeDatabase(db)

      return mapToUsuario(user, db.funcionarios)
    },

    async listFuncionarios(): Promise<Funcionario[]> {
      const db = readDatabase()

      return [...db.funcionarios].sort((a, b) => a.nome.localeCompare(b.nome))
    },

    async createFuncionario(input: CreateFuncionarioInput): Promise<Funcionario> {
      ensureRequired(input.nome, 'nome')
      ensureRequired(input.matricula, 'matrícula')
      ensureRequired(input.cpf, 'CPF')
      ensureRequired(input.cargo, 'cargo')
      ensureRequired(input.email, 'email')

      const senha = input.senha?.trim() ?? ''
      ensureRequired(senha, 'senha')

      const db = readDatabase()
      const email = normalizeEmail(input.email)

      if (db.users.some((user) => normalizeEmail(user.email) === email)) {
        throw new Error('Já existe um usuário com este email.')
      }

      if (db.funcionarios.some((item) => item.matricula === input.matricula)) {
        throw new Error('Matrícula já cadastrada.')
      }

      if (db.funcionarios.some((item) => item.cpf === input.cpf)) {
        throw new Error('CPF já cadastrado.')
      }

      const userId = createId('usr')
      const funcionario: Funcionario = {
        id: createId('func'),
        nome: input.nome.trim(),
        matricula: input.matricula.trim(),
        cpf: input.cpf.trim(),
        cargo: input.cargo.trim(),
        equipe: input.equipe.trim() || null,
        status: input.status,
        email,
        userId,
        createdAt: new Date().toISOString(),
      }

      db.users.push({
        id: userId,
        nome: input.nome.trim(),
        email,
        senha,
        perfil: 'funcionario',
      })
      db.funcionarios.push(funcionario)
      writeDatabase(db)

      return funcionario
    },

    async listAtividades(): Promise<Atividade[]> {
      const db = readDatabase()

      return [...db.atividades]
        .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
        .map((stored) => mapAtividade(stored, db.funcionarios))
    },

    async createAtividade(input: CreateAtividadeInput): Promise<Atividade> {
      ensureRequired(input.titulo, 'título')
      ensureRequired(input.descricao, 'descrição')

      const db = readDatabase()

      if (input.responsavelId) {
        const funcionario = db.funcionarios.find(
          (item) => item.id === input.responsavelId,
        )
        if (!funcionario) {
          throw new Error('Responsável informado não encontrado.')
        }
      }

      const stored: StoredAtividade = {
        id: createId('atv'),
        titulo: input.titulo.trim(),
        descricao: input.descricao.trim(),
        status: 'nao_iniciada',
        dataCriacao: new Date().toISOString(),
        responsavelId: input.responsavelId ?? null,
        dataPrevista: input.dataPrevista ?? null,
        prioridade: input.prioridade ?? 'media',
      }

      db.atividades.push(stored)
      syncAtribuicaoPrincipal(db, stored.id, stored.responsavelId)
      writeDatabase(db)

      return mapAtividade(stored, db.funcionarios)
    },

    async updateAtividade(
      atividadeId: string,
      input: UpdateAtividadeInput,
    ): Promise<Atividade> {
      const db = readDatabase()
      const atividade = db.atividades.find((item) => item.id === atividadeId)

      if (!atividade) {
        throw new Error('Atividade não encontrada.')
      }

      assertAtividadePodeSerReprogramada(atividade.status)

      let responsavelExiste =
        input.responsavelId === undefined || input.responsavelId === null
      if (input.responsavelId !== undefined && input.responsavelId !== null) {
        const funcionario = db.funcionarios.find(
          (item) => item.id === input.responsavelId,
        )
        responsavelExiste = Boolean(funcionario)
      }

      assertUpdateAtividadeValido(input, responsavelExiste)

      const motivo = null

      if (
        input.responsavelId !== undefined &&
        input.responsavelId !== atividade.responsavelId
      ) {
        const anteriorNome =
          db.funcionarios.find((item) => item.id === atividade.responsavelId)
            ?.nome ?? null
        const novoNome =
          db.funcionarios.find((item) => item.id === input.responsavelId)?.nome ??
          null

        recordHistorico(
          db,
          atividadeId,
          'responsavel',
          anteriorNome,
          novoNome,
          motivo,
        )
        atividade.responsavelId = input.responsavelId
        if (input.responsavelId) {
          syncAtribuicaoPrincipal(db, atividadeId, input.responsavelId)
        }
      }

      if (
        input.dataPrevista !== undefined &&
        input.dataPrevista !== atividade.dataPrevista
      ) {
        recordHistorico(
          db,
          atividadeId,
          'data_prevista',
          atividade.dataPrevista,
          input.dataPrevista,
          motivo,
        )
        atividade.dataPrevista = input.dataPrevista
      }

      if (input.prioridade && input.prioridade !== atividade.prioridade) {
        recordHistorico(
          db,
          atividadeId,
          'prioridade',
          atividade.prioridade,
          input.prioridade,
          motivo,
        )
        atividade.prioridade = input.prioridade
      }

      if (input.titulo !== undefined) {
        const novoTitulo = input.titulo.trim()
        ensureRequired(novoTitulo, 'título')
        if (novoTitulo !== atividade.titulo) {
          recordHistorico(
            db,
            atividadeId,
            'titulo',
            atividade.titulo,
            novoTitulo,
            motivo,
          )
          atividade.titulo = novoTitulo
        }
      }

      if (input.descricao !== undefined) {
        const novaDescricao = input.descricao.trim()
        ensureRequired(novaDescricao, 'descrição')
        if (novaDescricao !== atividade.descricao) {
          recordHistorico(
            db,
            atividadeId,
            'descricao',
            atividade.descricao,
            novaDescricao,
            motivo,
          )
          atividade.descricao = novaDescricao
        }
      }

      writeDatabase(db)
      return mapAtividade(atividade, db.funcionarios)
    },

    async listHistoricoAtividade(
      atividadeId: string,
    ): Promise<HistoricoAtividade[]> {
      const db = readDatabase()
      return db.historicoAtividades
        .filter((item) => item.atividadeId === atividadeId)
        .sort((a, b) => b.dataAlteracao.localeCompare(a.dataAlteracao))
        .map((item) => ({ ...item }))
    },

    async listAtribuicoesDetalhadas(): Promise<AtribuicaoDetalhada[]> {
      const db = readDatabase()

      return db.atribuicoes
        .map((atribuicao) => {
          const funcionario = db.funcionarios.find(
            (item) => item.id === atribuicao.funcionarioId,
          )
          const atividade = db.atividades.find(
            (item) => item.id === atribuicao.atividadeId,
          )

          if (!funcionario || !atividade) {
            return null
          }

          const apontamento = latestApontamento(
            db.apontamentos,
            atividade.id,
            funcionario.id,
          )

          return {
            atribuicaoId: atribuicao.id,
            funcionarioId: funcionario.id,
            funcionarioNome: funcionario.nome,
            atividadeId: atividade.id,
            atividadeTitulo: atividade.titulo,
            atividadeDescricao: atividade.descricao,
            atividadeStatus: atividade.status,
            dataAtribuicao: atribuicao.dataAtribuicao,
            inicio: apontamento?.inicio ?? null,
            termino: apontamento?.termino ?? null,
          } satisfies AtribuicaoDetalhada
        })
        .filter((item): item is AtribuicaoDetalhada => item !== null)
        .sort((a, b) => b.dataAtribuicao.localeCompare(a.dataAtribuicao))
    },

    async createAtribuicao(
      input: CreateAtribuicaoInput,
    ): Promise<AtribuicaoAtividade> {
      const db = readDatabase()
      const funcionario = db.funcionarios.find(
        (item) => item.id === input.funcionarioId,
      )
      const atividade = db.atividades.find((item) => item.id === input.atividadeId)

      if (!funcionario) {
        throw new Error('Funcionário não encontrado.')
      }

      if (!atividade) {
        throw new Error('Atividade não encontrada.')
      }

      const existing = db.atribuicoes.find(
        (item) =>
          item.funcionarioId === input.funcionarioId &&
          item.atividadeId === input.atividadeId,
      )

      if (existing) {
        throw new Error('Atividade já atribuída para este funcionário.')
      }

      const atribuicao: AtribuicaoAtividade = {
        id: createId('atr'),
        funcionarioId: input.funcionarioId,
        atividadeId: input.atividadeId,
        dataAtribuicao: new Date().toISOString(),
      }

      db.atribuicoes.push(atribuicao)
      writeDatabase(db)

      return atribuicao
    },

    async listAtividadesDoFuncionario(
      funcionarioId: string,
    ): Promise<AtividadeDoFuncionario[]> {
      const db = readDatabase()
      const atribuicoes = db.atribuicoes.filter(
        (item) => item.funcionarioId === funcionarioId,
      )

      return atribuicoes
        .map((atribuicao) => {
          const atividade = db.atividades.find(
            (item) => item.id === atribuicao.atividadeId,
          )

          if (!atividade) {
            return null
          }

          const apontamento = latestApontamento(
            db.apontamentos,
            atividade.id,
            funcionarioId,
          )

          return {
            atribuicaoId: atribuicao.id,
            atividadeId: atividade.id,
            titulo: atividade.titulo,
            descricao: atividade.descricao,
            status: atividade.status,
            dataAtribuicao: atribuicao.dataAtribuicao,
            inicio: apontamento?.inicio ?? null,
            termino: apontamento?.termino ?? null,
            dataPrevista: atividade.dataPrevista,
            prioridade: atividade.prioridade,
          } satisfies AtividadeDoFuncionario
        })
        .filter((item): item is AtividadeDoFuncionario => item !== null)
        .sort((a, b) => b.dataAtribuicao.localeCompare(a.dataAtribuicao))
    },

    async iniciarAtividade(
      funcionarioId: string,
      atividadeId: string,
    ): Promise<void> {
      const db = readDatabase()
      const atividade = db.atividades.find((item) => item.id === atividadeId)

      if (!atividade) {
        throw new Error('Atividade não encontrada.')
      }

      const atribuida = db.atribuicoes.some(
        (item) =>
          item.funcionarioId === funcionarioId && item.atividadeId === atividadeId,
      )

      if (!atribuida) {
        throw new Error('Você só pode iniciar atividades atribuídas a você.')
      }

      if (atividade.status !== 'nao_iniciada') {
        throw new Error('Atividade já iniciada ou concluída.')
      }

      db.apontamentos.push({
        id: createId('apo'),
        atividadeId,
        funcionarioId,
        inicio: new Date().toISOString(),
        termino: null,
      })
      const statusAnterior = atividade.status
      atividade.status = 'em_andamento'
      recordHistorico(db, atividadeId, 'status', statusAnterior, atividade.status, null)
      writeDatabase(db)
    },

    async finalizarAtividade(
      funcionarioId: string,
      atividadeId: string,
    ): Promise<void> {
      const db = readDatabase()
      const atividade = db.atividades.find((item) => item.id === atividadeId)

      if (!atividade) {
        throw new Error('Atividade não encontrada.')
      }

      const atribuida = db.atribuicoes.some(
        (item) =>
          item.funcionarioId === funcionarioId && item.atividadeId === atividadeId,
      )

      if (!atribuida) {
        throw new Error('Você só pode finalizar atividades atribuídas a você.')
      }

      if (atividade.status !== 'em_andamento') {
        throw new Error('A atividade precisa estar em andamento para ser finalizada.')
      }

      const apontamento = db.apontamentos
        .filter(
          (item) =>
            item.funcionarioId === funcionarioId &&
            item.atividadeId === atividadeId &&
            item.termino === null,
        )
        .sort((a, b) => b.inicio.localeCompare(a.inicio))[0]

      if (!apontamento) {
        throw new Error('Nenhum apontamento em andamento encontrado.')
      }

      apontamento.termino = new Date().toISOString()
      const statusAnterior = atividade.status
      atividade.status = 'concluida'
      recordHistorico(db, atividadeId, 'status', statusAnterior, atividade.status, null)
      writeDatabase(db)
    },

    async listFaltasDetalhadas(): Promise<FaltaDetalhada[]> {
      const db = readDatabase()

      return db.faltas
        .map((falta) => {
          const funcionario = db.funcionarios.find(
            (item) => item.id === falta.funcionarioId,
          )

          if (!funcionario) {
            return null
          }

          return {
            faltaId: falta.id,
            funcionarioId: funcionario.id,
            funcionarioNome: funcionario.nome,
            data: falta.data,
            motivo: falta.motivo,
          } satisfies FaltaDetalhada
        })
        .filter((item): item is FaltaDetalhada => item !== null)
        .sort((a, b) => b.data.localeCompare(a.data))
    },

    async createFalta(input: CreateFaltaInput): Promise<Falta> {
      ensureRequired(input.funcionarioId, 'funcionário')
      ensureRequired(input.data, 'data')
      ensureRequired(input.motivo, 'motivo')

      const db = readDatabase()
      const funcionario = db.funcionarios.find(
        (item) => item.id === input.funcionarioId,
      )

      if (!funcionario) {
        throw new Error('Funcionário não encontrado.')
      }

      const alreadyExists = db.faltas.some(
        (item) =>
          item.funcionarioId === input.funcionarioId && item.data === input.data,
      )

      if (alreadyExists) {
        throw new Error('Falta já registrada para este funcionário nesta data.')
      }

      const falta: Falta = {
        id: createId('falt'),
        funcionarioId: input.funcionarioId,
        data: input.data,
        motivo: input.motivo.trim(),
      }

      db.faltas.push(falta)
      writeDatabase(db)

      return falta
    },

    async getIndicadoresDashboard(
      dataReferencia: string,
    ): Promise<IndicadoresDashboard> {
      const db = readDatabase()
      const funcionariosAtivos = db.funcionarios.filter(
        (item) => item.status === 'ativo',
      )
      const ausentesNoDia = new Set(
        db.faltas
          .filter((falta) => falta.data === dataReferencia)
          .map((falta) => falta.funcionarioId),
      )

      const ausentes = ausentesNoDia.size
      const presentes = Math.max(funcionariosAtivos.length - ausentes, 0)
      const taxaAbsenteismo =
        funcionariosAtivos.length === 0
          ? 0
          : roundToSingleDecimal((ausentes / funcionariosAtivos.length) * 100)

      const totalFuncionarios = db.funcionarios.length
      const desligados = db.funcionarios.filter(
        (item) => item.status === 'inativo',
      ).length

      const turnoverInicial =
        totalFuncionarios === 0
          ? 0
          : roundToSingleDecimal((desligados / totalFuncionarios) * 100)

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
      ensureRequired(inicio, 'data inicial')
      ensureRequired(fim, 'data final')
      assertPeriodoValido(inicio, fim)

      const db = readDatabase()
      const inicioIso = `${inicio}T00:00:00.000Z`
      const fimIso = `${fim}T23:59:59.999Z`

      const atividadesConcluidasIds = new Set(
        db.atividades.filter((item) => item.status === 'concluida').map((item) => item.id),
      )

      const concluiuPor: Record<string, number> = {}

      for (const apontamento of db.apontamentos) {
        if (!apontamento.termino) continue
        if (!atividadesConcluidasIds.has(apontamento.atividadeId)) continue
        if (apontamento.termino < inicioIso || apontamento.termino > fimIso) continue

        concluiuPor[apontamento.funcionarioId] =
          (concluiuPor[apontamento.funcionarioId] ?? 0) + 1
      }

      return db.funcionarios
        .map((funcionario) => ({
          funcionarioId: funcionario.id,
          funcionarioNome: funcionario.nome,
          cargo: funcionario.cargo,
          equipe: funcionario.equipe,
          totalConcluidas: concluiuPor[funcionario.id] ?? 0,
        }))
        .sort((a, b) => b.totalConcluidas - a.totalConcluidas)
    },

    async getRelatorioConsolidado(
      inicio: string,
      fim: string,
    ): Promise<RelatorioConsolidado> {
      ensureRequired(inicio, 'data inicial')
      ensureRequired(fim, 'data final')
      assertPeriodoValido(inicio, fim)

      const db = readDatabase()
      const inicioIso = `${inicio}T00:00:00.000Z`
      const fimIso = `${fim}T23:59:59.999Z`

      const ausenciasPeriodo = db.faltas.filter(
        (item) => item.data >= inicio && item.data <= fim,
      )
      const totalAusencias = ausenciasPeriodo.length

      const funcionariosAtivos = db.funcionarios.filter(
        (item) => item.status === 'ativo',
      ).length

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
          db.faltas
            .filter((falta) => falta.data === dia)
            .map((falta) => falta.funcionarioId),
        )
        totalPresencas += Math.max(funcionariosAtivos - ausentesDia.size, 0)
      }

      const atividadesConcluidasIds = new Set(
        db.atividades.filter((item) => item.status === 'concluida').map((item) => item.id),
      )

      const apontamentosFinalizados = db.apontamentos.filter(
        (item) =>
          item.termino &&
          item.termino >= inicioIso &&
          item.termino <= fimIso &&
          atividadesConcluidasIds.has(item.atividadeId),
      )

      const atividadesConcluidasDetalhadas = apontamentosFinalizados.map((item) => {
        const atividade = db.atividades.find((a) => a.id === item.atividadeId)
        const funcionario = db.funcionarios.find((f) => f.id === item.funcionarioId)
        return {
          atividadeId: item.atividadeId,
          titulo: atividade?.titulo ?? '—',
          responsavelNome: funcionario?.nome ?? null,
          termino: item.termino as string,
        }
      })

      const totalAtividadesConcluidas = atividadesConcluidasDetalhadas.length

      const observacoesPeriodo = db.observacoes.filter(
        (item) => item.data >= inicio && item.data <= fim,
      )

      const produtividade = await this.getProdutividadePorFuncionario(inicio, fim)

      const ausenciasPorFuncionarioMap = new Map<string, number>()
      for (const falta of ausenciasPeriodo) {
        ausenciasPorFuncionarioMap.set(
          falta.funcionarioId,
          (ausenciasPorFuncionarioMap.get(falta.funcionarioId) ?? 0) + 1,
        )
      }
      const ausenciasPorFuncionario = Array.from(ausenciasPorFuncionarioMap.entries())
        .map(([funcionarioId, total]) => ({
          funcionarioNome:
            db.funcionarios.find((item) => item.id === funcionarioId)?.nome ?? '—',
          total,
        }))
        .sort((a, b) => b.total - a.total)

      return {
        inicio,
        fim,
        totalPresencas,
        totalAusencias,
        totalAtividadesConcluidas,
        totalObservacoes: observacoesPeriodo.length,
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
      const db = readDatabase()

      let items = [...db.observacoes]

      if (filtro?.data) {
        items = items.filter((item) => item.data === filtro.data)
      } else if (filtro?.inicio && filtro?.fim) {
        assertPeriodoValido(filtro.inicio, filtro.fim)
        items = items.filter(
          (item) =>
            item.data >= (filtro.inicio as string) &&
            item.data <= (filtro.fim as string),
        )
      }

      return items
        .sort(
          (a, b) =>
            b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm),
        )
        .map((item) => ({
          id: item.id,
          data: item.data,
          texto: item.texto,
          criadoEm: item.criadoEm,
          atualizadoEm: item.atualizadoEm,
          criadoPor: item.criadoPor,
          criadoPorNome:
            db.users.find((user) => user.id === item.criadoPor)?.nome ?? null,
        }))
    },

    async createObservacao(input: CreateObservacaoInput): Promise<Observacao> {
      ensureRequired(input.data, 'data')
      const texto = input.texto?.trim() ?? ''
      if (!texto) {
        throw new Error('A observação não pode estar vazia.')
      }

      const db = readDatabase()
      const currentUser = getCurrentUser(db)

      const stored: StoredObservacao = {
        id: createId('obs'),
        data: input.data,
        texto,
        criadoEm: new Date().toISOString(),
        atualizadoEm: null,
        criadoPor: currentUser?.id ?? null,
      }

      db.observacoes.push(stored)
      writeDatabase(db)

      return {
        id: stored.id,
        data: stored.data,
        texto: stored.texto,
        criadoEm: stored.criadoEm,
        atualizadoEm: stored.atualizadoEm,
        criadoPor: stored.criadoPor,
        criadoPorNome: currentUser?.nome ?? null,
      }
    },

    async updateObservacao(
      id: string,
      input: UpdateObservacaoInput,
    ): Promise<Observacao> {
      const db = readDatabase()
      const stored = db.observacoes.find((item) => item.id === id)
      if (!stored) {
        throw new Error('Observação não encontrada.')
      }

      if (input.texto !== undefined) {
        const texto = input.texto.trim()
        if (!texto) {
          throw new Error('A observação não pode estar vazia.')
        }
        stored.texto = texto
      }

      if (input.data !== undefined) {
        ensureRequired(input.data, 'data')
        stored.data = input.data
      }

      stored.atualizadoEm = new Date().toISOString()
      writeDatabase(db)

      return {
        id: stored.id,
        data: stored.data,
        texto: stored.texto,
        criadoEm: stored.criadoEm,
        atualizadoEm: stored.atualizadoEm,
        criadoPor: stored.criadoPor,
        criadoPorNome:
          db.users.find((user) => user.id === stored.criadoPor)?.nome ?? null,
      }
    },

    async deleteObservacao(id: string): Promise<void> {
      const db = readDatabase()
      db.observacoes = db.observacoes.filter((item) => item.id !== id)
      writeDatabase(db)
    },

    async getPendenciasOperacionais(
      dataReferencia: string,
    ): Promise<PendenciasOperacionais> {
      const db = readDatabase()
      const hoje = dataReferencia

      const buildPendente = (atividade: StoredAtividade): AtividadePendente => {
        const responsavel = db.funcionarios.find(
          (f) => f.id === atividade.responsavelId,
        )
        return {
          id: atividade.id,
          titulo: atividade.titulo,
          status: atividade.status,
          prioridade: atividade.prioridade,
          dataPrevista: atividade.dataPrevista,
          responsavelId: atividade.responsavelId,
          responsavelNome: responsavel?.nome ?? null,
          diasAtraso:
            atividade.dataPrevista && atividade.dataPrevista < hoje
              ? diffDays(atividade.dataPrevista, hoje)
              : 0,
        }
      }

      const atividadesAtrasadas = db.atividades
        .filter(
          (item) =>
            item.dataPrevista &&
            item.dataPrevista < hoje &&
            item.status !== 'concluida',
        )
        .map(buildPendente)
        .sort((a, b) => b.diasAtraso - a.diasAtraso)

      const atividadesNaoIniciadasNoPrazo = db.atividades
        .filter(
          (item) =>
            item.status === 'nao_iniciada' &&
            item.dataPrevista !== null &&
            item.dataPrevista <= hoje,
        )
        .map(buildPendente)
        .sort((a, b) => {
          const ordem = { alta: 0, media: 1, baixa: 2 } as const
          return ordem[a.prioridade] - ordem[b.prioridade]
        })

      const ausenciasHoje = db.faltas
        .filter((falta) => falta.data === hoje)
        .map((falta) => {
          const funcionario = db.funcionarios.find(
            (item) => item.id === falta.funcionarioId,
          )
          if (!funcionario) return null
          return {
            faltaId: falta.id,
            funcionarioId: funcionario.id,
            funcionarioNome: funcionario.nome,
            data: falta.data,
            motivo: falta.motivo,
          } satisfies FaltaDetalhada
        })
        .filter((item): item is FaltaDetalhada => item !== null)

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
