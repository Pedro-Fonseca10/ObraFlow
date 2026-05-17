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
  CreateObservacaoInput,
  Falta,
  FaltaDetalhada,
  Funcionario,
  HistoricoAtividade,
  IndicadoresDashboard,
  Observacao,
  PendenciasOperacionais,
  ProdutividadeFuncionario,
  RelatorioConsolidado,
  UpdateAtividadeInput,
  UpdateAtividadeOptions,
  UpdateObservacaoInput,
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
  updateAtividade(
    atividadeId: string,
    input: UpdateAtividadeInput,
    options?: UpdateAtividadeOptions,
  ): Promise<Atividade>
  listHistoricoAtividade(atividadeId: string): Promise<HistoricoAtividade[]>
  listAtribuicoesDetalhadas(): Promise<AtribuicaoDetalhada[]>
  createAtribuicao(input: CreateAtribuicaoInput): Promise<AtribuicaoAtividade>
  listAtividadesDoFuncionario(funcionarioId: string): Promise<AtividadeDoFuncionario[]>
  iniciarAtividade(funcionarioId: string, atividadeId: string): Promise<void>
  finalizarAtividade(funcionarioId: string, atividadeId: string): Promise<void>
  listFaltasDetalhadas(): Promise<FaltaDetalhada[]>
  createFalta(input: CreateFaltaInput): Promise<Falta>
  getIndicadoresDashboard(dataReferencia: string): Promise<IndicadoresDashboard>
  getProdutividadePorFuncionario(
    inicio: string,
    fim: string,
  ): Promise<ProdutividadeFuncionario[]>
  getRelatorioConsolidado(inicio: string, fim: string): Promise<RelatorioConsolidado>
  listObservacoes(filtro?: {
    data?: string
    inicio?: string
    fim?: string
  }): Promise<Observacao[]>
  createObservacao(input: CreateObservacaoInput): Promise<Observacao>
  updateObservacao(id: string, input: UpdateObservacaoInput): Promise<Observacao>
  deleteObservacao(id: string): Promise<void>
  getPendenciasOperacionais(
    dataReferencia: string,
  ): Promise<PendenciasOperacionais>
}

export const dataService: DataService = isSupabaseConfigured
  ? createSupabaseService()
  : createLocalService()

export const dataMode = dataService.mode
