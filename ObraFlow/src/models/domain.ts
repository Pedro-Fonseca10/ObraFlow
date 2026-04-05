export type PerfilUsuario = 'gestor' | 'funcionario'

export type StatusFuncionario = 'ativo' | 'inativo'

export type StatusAtividade = 'nao_iniciada' | 'em_andamento' | 'concluida'

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
  senha: string
}

export interface CreateAtividadeInput {
  titulo: string
  descricao: string
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
