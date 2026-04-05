# ObraFlow MVP

MVP para gestão operacional da mão de obra em canteiro de obras.

## Arquitetura

- Frontend: `React + Vite + TypeScript + Tailwind`.
- Backend: `Supabase` via SDK (`@supabase/supabase-js`).
- Fallback de demonstração: se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não estiverem definidos, o app roda com persistência local em `localStorage` e dados seed.
- Autenticação: login simples por perfil (`gestor` e `funcionario`) usando tabela `users`.
- Organização: separação por `pages`, `components`, `contexts`, `services`, `models` e `routes`.

## Estrutura de Pastas

```text
src/
  components/
    layout/
      AppShell.tsx
    ui/
      FeedbackMessage.tsx
      StatCard.tsx
      StatusBadge.tsx
  contexts/
    AuthContext.tsx
  lib/
    supabase.ts
  models/
    domain.ts
  pages/
    LoginPage.tsx
    manager/
      DashboardPage.tsx
      EmployeesPage.tsx
      ActivitiesPage.tsx
      AssignmentsPage.tsx
      AbsencesPage.tsx
    worker/
      MyActivitiesPage.tsx
  routes/
    AppRouter.tsx
    ProtectedRoute.tsx
    RootRedirect.tsx
  services/
    api.ts
    localService.ts
    supabaseService.ts
  utils/
    formatters.ts
  App.tsx
  main.tsx
  index.css
supabase/
  schema.sql
```

## Funcionalidades Implementadas

- Login por perfil.
- Cadastro e listagem de funcionários.
- Cadastro e listagem de atividades.
- Atribuição de atividade para funcionário.
- Início e finalização de atividade pelo funcionário.
- Registro de falta com motivo.
- Dashboard com:
  - presentes;
  - ausentes;
  - taxa de absenteísmo;
  - turnover inicial simplificado.

## Setup do Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, execute `supabase/schema.sql`.
3. Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Se não configurar as variáveis, o app inicia em modo local de demonstração.

## Como Executar

```bash
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173`.

## Credenciais Seed

- Gestor: `gestor@obraflow.com` / `123456`
- Funcionário: `funcionario@obraflow.com` / `123456`
