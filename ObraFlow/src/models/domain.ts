export type PerfilUsuario = 'gestor' | 'funcionario'

export type StatusFuncionario = 'ativo' | 'inativo'

export type StatusAtividade = 'nao_iniciada' | 'em_andamento' | 'concluida'

export type PrioridadeAtividade = 'baixa' | 'media' | 'alta'

export type CampoHistoricoAtividade =
  | 'responsavel'
  | 'data_prevista'
  | 'prioridade'
  | 'status'
  | 'titulo'
  | 'descricao'

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  funcionarioId: string | null
}

export interface Funcionario {
  id: string
  nome: string
  matricula: string
  cpf: string
  cargo: string
  equipe: string | null
  status: StatusFuncionario
  email: string
  userId: string | null
  createdAt: string
}

export interface Atividade {
  id: string
  titulo: string
  descricao: string
  status: StatusAtividade
  dataCriacao: string
  responsavelId: string | null
  responsavelNome: string | null
  dataPrevista: string | null
  prioridade: PrioridadeAtividade
}

export interface AtribuicaoAtividade {
  id: string
  funcionarioId: string
  atividadeId: string
  dataAtribuicao: string
}

export interface ApontamentoAtividade {
  id: string
  atividadeId: string
  funcionarioId: string
  inicio: string
  termino: string | null
}

export interface Falta {
  id: string
  funcionarioId: string
  data: string
  motivo: string
}

export interface IndicadoresDashboard {
  presentes: number
  ausentes: number
  taxaAbsenteismo: number
  turnoverInicial: number
}

export interface CreateFuncionarioInput {
  nome: string
  matricula: string
  cpf: string
  cargo: string
  equipe: string
  status: StatusFuncionario
  email: string
  senha?: string
}

export interface CreateAtividadeInput {
  titulo: string
  descricao: string
  responsavelId?: string | null
  dataPrevista?: string | null
  prioridade?: PrioridadeAtividade
}

export interface UpdateAtividadeInput {
  responsavelId?: string | null
  dataPrevista?: string | null
  prioridade?: PrioridadeAtividade
  titulo?: string
  descricao?: string
}

export interface UpdateAtividadeOptions {
  autorizarPosConclusao?: boolean
  motivo?: string
}

export interface HistoricoAtividade {
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

export interface CreateAtribuicaoInput {
  funcionarioId: string
  atividadeId: string
}

export interface CreateFaltaInput {
  funcionarioId: string
  data: string
  motivo: string
}

export interface AuthCredentials {
  email: string
  senha: string
}

export interface AtividadeDoFuncionario {
  atribuicaoId: string
  atividadeId: string
  titulo: string
  descricao: string
  status: StatusAtividade
  dataAtribuicao: string
  inicio: string | null
  termino: string | null
  dataPrevista: string | null
  prioridade: PrioridadeAtividade
}

export interface AtribuicaoDetalhada {
  atribuicaoId: string
  funcionarioId: string
  funcionarioNome: string
  atividadeId: string
  atividadeTitulo: string
  atividadeDescricao: string
  atividadeStatus: StatusAtividade
  dataAtribuicao: string
  inicio: string | null
  termino: string | null
}

export interface FaltaDetalhada {
  faltaId: string
  funcionarioId: string
  funcionarioNome: string
  data: string
  motivo: string
}

// Sprint 3 — US15
export interface ProdutividadeFuncionario {
  funcionarioId: string
  funcionarioNome: string
  cargo: string
  equipe: string | null
  totalConcluidas: number
}

// Sprint 3 — US16
export interface RelatorioConsolidado {
  inicio: string
  fim: string
  totalPresencas: number
  totalAusencias: number
  totalAtividadesConcluidas: number
  totalObservacoes: number
  produtividade: ProdutividadeFuncionario[]
  ausenciasPorFuncionario: { funcionarioNome: string; total: number }[]
  atividadesConcluidasDetalhadas: {
    atividadeId: string
    titulo: string
    responsavelNome: string | null
    termino: string
  }[]
}

// Sprint 3 — US17
export interface Observacao {
  id: string
  data: string
  texto: string
  criadoEm: string
  atualizadoEm: string | null
  criadoPor: string | null
  criadoPorNome: string | null
}

export interface CreateObservacaoInput {
  data: string
  texto: string
}

export interface UpdateObservacaoInput {
  data?: string
  texto?: string
}

// Sprint 3 — US18
export interface AtividadePendente {
  id: string
  titulo: string
  status: StatusAtividade
  prioridade: PrioridadeAtividade
  dataPrevista: string | null
  responsavelId: string | null
  responsavelNome: string | null
  diasAtraso: number
}

export interface PendenciasOperacionais {
  atividadesAtrasadas: AtividadePendente[]
  atividadesNaoIniciadasNoPrazo: AtividadePendente[]
  ausenciasHoje: FaltaDetalhada[]
  totalPendencias: number
}
