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
  Usuario,
} from '../models/domain'
import type { DataService } from './api'

interface StoredUser {
  id: string
  nome: string
  email: string
  senha: string
  perfil: PerfilUsuario
}

interface LocalDatabase {
  users: StoredUser[]
  funcionarios: Funcionario[]
  atividades: Atividade[]
  atribuicoes: AtribuicaoAtividade[]
  apontamentos: {
    id: string
    atividadeId: string
    funcionarioId: string
    inicio: string
    termino: string | null
  }[]
  faltas: Falta[]
}

const STORAGE_KEY = 'obraflow_local_db_v1'

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

function createSeedDatabase(): LocalDatabase {
  const now = new Date().toISOString()

  const gestorId = 'usr-gestor-seed'
  const funcionarioUserId = 'usr-funcionario-seed'
  const funcionarioId = 'func-seed-001'
  const atividadeId = 'atv-seed-001'
  const atribuicaoId = 'atr-seed-001'

  return {
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
        id: funcionarioId,
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
    ],
    atividades: [
      {
        id: atividadeId,
        titulo: 'Levantamento de alvenaria no bloco A',
        descricao: 'Executar primeira fiada e conferência de prumo.',
        status: 'nao_iniciada',
        dataCriacao: now,
      },
    ],
    atribuicoes: [
      {
        id: atribuicaoId,
        funcionarioId,
        atividadeId,
        dataAtribuicao: now,
      },
    ],
    apontamentos: [],
    faltas: [],
  }
}

function readDatabase(): LocalDatabase {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    const seed = createSeedDatabase()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return seed
  }

  try {
    return JSON.parse(raw) as LocalDatabase
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
      ensureRequired(input.senha, 'senha')

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
        senha: input.senha,
        perfil: 'funcionario',
      })
      db.funcionarios.push(funcionario)
      writeDatabase(db)

      return funcionario
    },

    async listAtividades(): Promise<Atividade[]> {
      const db = readDatabase()

      return [...db.atividades].sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
    },

    async createAtividade(input: CreateAtividadeInput): Promise<Atividade> {
      ensureRequired(input.titulo, 'título')
      ensureRequired(input.descricao, 'descrição')

      const db = readDatabase()
      const atividade: Atividade = {
        id: createId('atv'),
        titulo: input.titulo.trim(),
        descricao: input.descricao.trim(),
        status: 'nao_iniciada',
        dataCriacao: new Date().toISOString(),
      }

      db.atividades.push(atividade)
      writeDatabase(db)

      return atividade
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
      atividade.status = 'em_andamento'
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
      atividade.status = 'concluida'
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
  }
}
