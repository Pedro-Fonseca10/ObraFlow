import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { BarChart } from '../../components/ui/BarChart'
import type { RelatorioConsolidado } from '../../models/domain'
import { dataService } from '../../services/api'
import {
  daysFromNowIso,
  formatDateTime,
  formatIsoDate,
  todayIsoDate,
} from '../../utils/formatters'

export function ReportsPage() {
  const [inicio, setInicio] = useState(daysFromNowIso(-30))
  const [fim, setFim] = useState(todayIsoDate())
  const [relatorio, setRelatorio] = useState<RelatorioConsolidado | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    void load(inicio, fim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(rangeInicio: string, rangeFim: string) {
    if (!rangeInicio || !rangeFim) return
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await dataService.getRelatorioConsolidado(
        rangeInicio,
        rangeFim,
      )
      setRelatorio(result)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao gerar relatório.',
      )
      setRelatorio(null)
    } finally {
      setLoading(false)
    }
  }

  function exportarPdf() {
    if (!relatorio) return

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const periodo = `${formatIsoDate(relatorio.inicio)} a ${formatIsoDate(relatorio.fim)}`

    doc.setFontSize(18)
    doc.text('ObraFlow — Relatório Consolidado', 40, 50)
    doc.setFontSize(11)
    doc.setTextColor(80)
    doc.text(`Período: ${periodo}`, 40, 72)
    doc.text(`Gerado em: ${formatDateTime(new Date().toISOString())}`, 40, 88)

    autoTable(doc, {
      startY: 110,
      head: [['Indicador', 'Valor']],
      body: [
        ['Presenças registradas', String(relatorio.totalPresencas)],
        ['Ausências registradas', String(relatorio.totalAusencias)],
        ['Atividades concluídas', String(relatorio.totalAtividadesConcluidas)],
        ['Observações registradas', String(relatorio.totalObservacoes)],
      ],
      styles: { fontSize: 11, cellPadding: 6 },
      headStyles: { fillColor: [15, 23, 42] },
    })

    let cursorY = (doc as unknown as { lastAutoTable: { finalY: number } })
      .lastAutoTable.finalY + 24

    doc.setFontSize(13)
    doc.setTextColor(15)
    doc.text('Produtividade por colaborador', 40, cursorY)
    autoTable(doc, {
      startY: cursorY + 8,
      head: [['Colaborador', 'Cargo', 'Equipe', 'Concluídas']],
      body: relatorio.produtividade.map((p) => [
        p.funcionarioNome,
        p.cargo,
        p.equipe ?? '—',
        String(p.totalConcluidas),
      ]),
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [16, 185, 129] },
    })

    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } })
      .lastAutoTable.finalY + 24

    if (relatorio.ausenciasPorFuncionario.length > 0) {
      doc.text('Ausências por colaborador', 40, cursorY)
      autoTable(doc, {
        startY: cursorY + 8,
        head: [['Colaborador', 'Total de ausências']],
        body: relatorio.ausenciasPorFuncionario.map((item) => [
          item.funcionarioNome,
          String(item.total),
        ]),
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [225, 29, 72] },
      })
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 24
    }

    if (relatorio.atividadesConcluidasDetalhadas.length > 0) {
      doc.text('Atividades concluídas no período', 40, cursorY)
      autoTable(doc, {
        startY: cursorY + 8,
        head: [['Atividade', 'Responsável', 'Concluída em']],
        body: relatorio.atividadesConcluidasDetalhadas.map((item) => [
          item.titulo,
          item.responsavelNome ?? '—',
          formatDateTime(item.termino),
        ]),
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [56, 189, 248] },
      })
    }

    doc.save(`obraflow-relatorio-${relatorio.inicio}-a-${relatorio.fim}.pdf`)
    setSuccessMessage('Relatório PDF exportado com sucesso.')
  }

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="font-heading text-2xl font-black text-slate-900">
          Relatório Consolidado por Período
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Analise a evolução operacional dentro de um intervalo. O relatório
          considera apenas dados efetivamente registrados no período.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <DateRangePicker
            inicio={inicio}
            fim={fim}
            onChange={(novoInicio, novoFim) => {
              setInicio(novoInicio)
              setFim(novoFim)
            }}
          />
          <button
            type="button"
            onClick={() => void load(inicio, fim)}
            disabled={loading}
            className="h-fit rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Carregando...' : 'Gerar relatório'}
          </button>
          <button
            type="button"
            onClick={exportarPdf}
            disabled={!relatorio || loading}
            className="h-fit rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            Exportar PDF
          </button>
        </div>
      </article>

      {errorMessage && <FeedbackMessage type="error" message={errorMessage} />}
      {successMessage && <FeedbackMessage type="success" message={successMessage} />}

      {!relatorio ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Selecione um período e clique em "Gerar relatório" para consolidar os dados.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Presenças
              </p>
              <p className="mt-2 font-heading text-3xl font-black text-emerald-700">
                {relatorio.totalPresencas}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Soma diária de presença útil no período.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Ausências
              </p>
              <p className="mt-2 font-heading text-3xl font-black text-rose-700">
                {relatorio.totalAusencias}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Faltas registradas dentro do intervalo.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Atividades concluídas
              </p>
              <p className="mt-2 font-heading text-3xl font-black text-sky-700">
                {relatorio.totalAtividadesConcluidas}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Atividades finalizadas no período.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Observações
              </p>
              <p className="mt-2 font-heading text-3xl font-black text-slate-900">
                {relatorio.totalObservacoes}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Observações operacionais registradas.
              </p>
            </article>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-lg font-black text-slate-900">
              Produtividade no período
            </h2>
            <div className="mt-4">
              <BarChart
                items={relatorio.produtividade.map((p) => ({
                  label: p.funcionarioNome,
                  value: p.totalConcluidas,
                  caption: p.cargo,
                }))}
                barClassName="bg-emerald-500"
                emptyMessage="Nenhuma atividade concluída no período."
              />
            </div>
          </article>

          {relatorio.ausenciasPorFuncionario.length > 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-heading text-lg font-black text-slate-900">
                Ausências por colaborador
              </h2>
              <div className="mt-4">
                <BarChart
                  items={relatorio.ausenciasPorFuncionario.map((item) => ({
                    label: item.funcionarioNome,
                    value: item.total,
                  }))}
                  barClassName="bg-rose-500"
                />
              </div>
            </article>
          )}

          {relatorio.atividadesConcluidasDetalhadas.length > 0 && (
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-heading text-lg font-black text-slate-900">
                  Atividades concluídas no período
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Atividade</th>
                      <th className="px-4 py-3">Responsável</th>
                      <th className="px-4 py-3">Concluída em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {relatorio.atividadesConcluidasDetalhadas.map((item, idx) => (
                      <tr key={`${item.atividadeId}-${idx}`}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.titulo}
                        </td>
                        <td className="px-4 py-3">{item.responsavelNome ?? '—'}</td>
                        <td className="px-4 py-3">{formatDateTime(item.termino)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}
        </>
      )}
    </section>
  )
}
