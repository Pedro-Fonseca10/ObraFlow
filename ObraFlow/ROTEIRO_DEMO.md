# 🎬 Roteiro de Demonstração — Sprint 3 (US14 → US18)

> **Objetivo:** apresentar as novas funcionalidades de auditoria, produtividade, relatórios, observações operacionais e visão de pendências do ObraFlow.
> **Duração estimada:** 12–15 minutos.
> **Perfil de login:** Gestor.

---

## 🧰 Preparação (antes de iniciar a apresentação)

1. Faça login com um usuário **gestor**.
2. Garanta que existam, na base, ao menos:
   - 3 funcionários ativos (em equipes distintas).
   - 5 atividades, contendo:
     - 1 atividade **concluída** dentro dos últimos 7 dias.
     - 1 atividade **em andamento** com data prevista **vencida** (atrasada).
     - 1 atividade **não iniciada** com data prevista para **hoje ou já vencida**.
   - 1–2 **faltas** registradas para a data de hoje.
   - 1 **observação** registrada nos últimos dias.
3. Deixe abertas, em abas separadas, as telas:
   `Dashboard`, `Atividades`, `Produtividade`, `Relatórios`, `Observações`.

---

## 1. 🕓 US14 — Histórico de Alterações em Atividades

**Onde:** `Gestor → Atividades` (`/gestor/atividades`)

**Narrativa:**
> "Toda alteração relevante em uma atividade — responsável, prazo, prioridade, status, título ou descrição — agora é rastreada com autor, data e motivo opcional."

**Passos do roteiro:**
1. Na listagem, escolha uma atividade existente e clique em **Editar**.
2. Altere **dois campos** simultaneamente (ex.: trocar o **responsável** e adiantar a **data prevista**).
3. Salve. Mostre o feedback **"Alterações salvas e histórico atualizado"**.
4. Clique em **Histórico** na mesma linha da atividade.
5. Demonstre a **modal de histórico**, evidenciando:
   - Campo alterado (ex.: *Responsável*, *Data prevista*).
   - Valor anterior → valor novo.
   - Quem alterou e quando.
6. **Cenário especial — edição pós-conclusão:**
   - Abra uma atividade já **concluída** e edite-a.
   - Mostre o **ConfirmDialog** exigindo **motivo** da alteração.
   - Confirme e mostre o motivo gravado no histórico.

**Mensagem-chave:** *auditoria completa, sem perder o "porquê" das mudanças.*

---

## 2. 📈 US15 — Produtividade por Colaborador

**Onde:** `Gestor → Produtividade` (`/gestor/produtividade`)

**Narrativa:**
> "Mostra quantas atividades cada colaborador **efetivamente concluiu** num período. Pendentes, em andamento ou atrasadas não entram na conta."

**Passos do roteiro:**
1. Apresente o **DateRangePicker** já preenchido com os últimos 30 dias.
2. Destaque os 3 KPIs:
   - **Total concluído** no período.
   - **Colaboradores ativos** (com ao menos uma conclusão).
   - **Equipe analisada**.
3. Mostre o **gráfico de barras comparativo** (BarChart, em verde).
4. Desça até a **tabela detalhada**: nome, cargo, equipe e total concluídas.
5. Troque o período para os **últimos 7 dias** e clique em **Atualizar leitura** para evidenciar a recalculagem em tempo real.

**Mensagem-chave:** *visão objetiva de entrega por pessoa, livre de ruído.*

---

## 3. 📊 US16 — Relatório Consolidado (com export PDF)

**Onde:** `Gestor → Relatórios` (`/gestor/relatorios`)

**Narrativa:**
> "Consolida em um só lugar presenças, ausências, atividades concluídas, observações e produtividade — pronto para exportar em PDF."

**Passos do roteiro:**
1. Selecione o período (sugestão: últimos 30 dias).
2. Mostre os indicadores consolidados:
   - **Presenças registradas**
   - **Ausências registradas**
   - **Atividades concluídas**
   - **Observações registradas**
3. Apresente as seções:
   - **Produtividade por colaborador** (reutiliza US15).
   - **Ausências por colaborador**.
   - **Atividades concluídas no período** (com responsável e data).
4. Clique em **Exportar PDF**.
5. Abra o PDF gerado e percorra: cabeçalho com período, indicadores, tabelas de produtividade, ausências e atividades concluídas.

**Mensagem-chave:** *uma fonte única para reuniões de obra e prestação de contas.*

---

## 4. 📝 US17 — Observações Operacionais

**Onde:** `Gestor → Observações` (`/gestor/observacoes`)

**Narrativa:**
> "Registro livre do que aconteceu na obra: incidente, atraso de material, visita técnica… com filtro por data ou período e edição auditável."

**Passos do roteiro:**
1. Crie uma observação para **hoje** (ex.: *"Concretagem do pilar P-12 adiada por falta de bomba."*) e salve.
2. Mostre a observação aparecendo na lista, com **autor**, **data** e **criado em**.
3. Clique em **Editar** sobre a observação criada:
   - Ajuste o texto.
   - Salve e evidencie o campo **atualizado em** sendo preenchido.
4. Alterne o filtro de **"Por data"** para **"Por período"** e mostre a listagem agrupada.
5. (Opcional) Exclua uma observação antiga para mostrar a operação completa de CRUD.

**Mensagem-chave:** *o diário de obra digital, integrado ao restante da operação.*

---

## 5. 🚨 US18 — Pendências Operacionais (Dashboard)

**Onde:** `Gestor → Dashboard` (`/gestor/dashboard`)

**Narrativa:**
> "Logo ao abrir o sistema, o gestor enxerga o que está travando a obra **hoje**: atividades atrasadas, atividades que deveriam ter começado e quem faltou."

**Passos do roteiro:**
1. No topo da página, mostre o card consolidado com o **total de pendências** na data de referência.
2. Apresente as três colunas:
   - **Atrasadas** — atividades em andamento/não iniciadas com `dataPrevista` vencida, exibindo **dias de atraso**, prioridade e responsável.
   - **Não iniciadas no prazo** — atividades ainda em `nao_iniciada` cujo prazo é hoje ou já passou.
   - **Ausências de hoje** — faltas registradas para a data de referência.
3. Troque a **data de referência** para um dia anterior e mostre o recálculo do quadro.
4. Aponte os indicadores em destaque (ex.: "+ N outras atrasadas") para evidenciar que a lista é truncada nas 5 primeiras para legibilidade.

**Mensagem-chave:** *do "como está a obra hoje?" para uma resposta em 5 segundos.*

---

## 🎯 Encerramento (1 minuto)

> "Com a Sprint 3 fechamos o ciclo de **governança operacional**:
> - **US14** dá auditoria sobre o que mudou nas atividades.
> - **US15 + US16** transformam execução em indicadores e relatórios.
> - **US17** captura o contexto do dia-a-dia da obra.
> - **US18** entrega visão imediata do que precisa de ação agora.
>
> O gestor agora tem **registro, métrica, contexto e prioridade** — em um único fluxo."

---

## ✅ Checklist rápido de demonstração

- [ ] US14 — Editei atividade, mostrei histórico e motivo em atividade concluída.
- [ ] US15 — Mostrei KPIs, gráfico e tabela com troca de período.
- [ ] US16 — Apresentei seções do relatório e exportei o PDF.
- [ ] US17 — Criei, editei e filtrei observações por data e por período.
- [ ] US18 — Mostrei atrasadas, não iniciadas no prazo, ausências e troca da data de referência.
