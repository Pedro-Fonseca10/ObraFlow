# Sprint 4 — Decisões de Consolidação

## US14 — Reprogramação de atividades

- A reprogramação fica bloqueada para atividades com status `concluida`.
- A regra é aplicada na tela de atividades e também nos serviços local/Supabase.
- Alterações permitidas em atividades abertas continuam registrando histórico quando há mudança de responsável, data prevista, prioridade, título ou descrição.

## US15 a US18 — Consolidação

- Produtividade e relatório consolidado consideram apenas apontamentos finalizados vinculados a atividades `concluida`.
- Intervalos de datas são validados como datas ISO reais no formato `YYYY-MM-DD`.
- Observações operacionais mantêm validação de texto obrigatório.
- Pendências operacionais seguem separadas por atividades atrasadas, não iniciadas no prazo e ausências na data de referência.

## Testes

- Foi adicionado Vitest para testes unitários em TypeScript.
- Os testes cobrem validações de reprogramação, prioridade, responsável e períodos de consulta.
