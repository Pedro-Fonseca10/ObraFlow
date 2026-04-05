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
  Usuario,
} from '../models/domain'
import { isSupabaseConfigured } from '../lib/supabase'
import { createLocalService } from './localService'
import { createSupabaseService } from './supabaseService'

export interface DataService {
  readonly mode: 'supabase' | 'local'
  login(credentials: AuthCredentials): Promise<Usuario>
  listFuncionarios(): Promise<Funcionario[]>
  createFuncionario(input: CreateFuncionarioInput): Promise<Funcionario>
  listAtividades(): Promise<Atividade[]>
  createAtividade(input: CreateAtividadeInput): Promise<Atividade>
  listAtribuicoesDetalhadas(): Promise<AtribuicaoDetalhada[]>
  createAtribuicao(input: CreateAtribuicaoInput): Promise<AtribuicaoAtividade>
  listAtividadesDoFuncionario(funcionarioId: string): Promise<AtividadeDoFuncionario[]>
  iniciarAtividade(funcionarioId: string, atividadeId: string): Promise<void>
  finalizarAtividade(funcionarioId: string, atividadeId: string): Promise<void>
  listFaltasDetalhadas(): Promise<FaltaDetalhada[]>
  createFalta(input: CreateFaltaInput): Promise<Falta>
  getIndicadoresDashboard(dataReferencia: string): Promise<IndicadoresDashboard>
}

export const dataService: DataService = isSupabaseConfigured
  ? createSupabaseService()
  : createLocalService()

export const dataMode = dataService.mode
