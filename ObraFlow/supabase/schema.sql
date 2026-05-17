-- ============================================================
-- ObraFlow MVP - versão pronta para Supabase Auth + RLS seguras
-- Execute este script no SQL Editor do Supabase
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1) TABELAS
-- ============================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  perfil text not null check (perfil in ('gestor', 'funcionario')),
  created_at timestamptz not null default now()
);

create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  matricula text not null unique,
  cpf text not null unique,
  cargo text not null,
  equipe text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  email text not null unique,
  user_id uuid unique references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  status text not null default 'nao_iniciada'
    check (status in ('nao_iniciada', 'em_andamento', 'concluida')),
  data_criacao timestamptz not null default now(),
  responsavel_id uuid references public.funcionarios(id) on delete set null,
  data_prevista date,
  prioridade text not null default 'media'
    check (prioridade in ('baixa', 'media', 'alta'))
);

alter table public.atividades
  add column if not exists responsavel_id uuid references public.funcionarios(id) on delete set null;
alter table public.atividades
  add column if not exists data_prevista date;
alter table public.atividades
  add column if not exists prioridade text not null default 'media'
    check (prioridade in ('baixa', 'media', 'alta'));

create table if not exists public.atribuicoes_atividade (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  data_atribuicao timestamptz not null default now(),
  unique (funcionario_id, atividade_id)
);

create table if not exists public.apontamentos_atividade (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  inicio timestamptz not null,
  termino timestamptz,
  constraint apontamento_periodo_valido
    check (termino is null or termino >= inicio)
);

create table if not exists public.faltas (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  data date not null,
  motivo text not null,
  unique (funcionario_id, data)
);

-- ============================================================
-- Sprint 3 — Histórico de alterações em atividades (US14)
-- ============================================================
create table if not exists public.historico_atividades (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  campo text not null
    check (campo in ('responsavel', 'data_prevista', 'prioridade', 'status', 'titulo', 'descricao')),
  valor_anterior text,
  valor_novo text,
  alterado_por uuid references public.users(id) on delete set null,
  alterado_por_nome text,
  data_alteracao timestamptz not null default now(),
  motivo text
);

-- ============================================================
-- Sprint 3 — Observações operacionais (US17)
-- ============================================================
create table if not exists public.observacoes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  texto text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz,
  criado_por uuid references public.users(id) on delete set null,
  constraint observacao_texto_nao_vazio
    check (length(btrim(texto)) > 0)
);

create or replace function public.observacoes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_observacoes_set_updated_at on public.observacoes;
create trigger trg_observacoes_set_updated_at
before update on public.observacoes
for each row execute function public.observacoes_set_updated_at();

-- ============================================================
-- 2) FUNÇÃO/TRIGGER PARA SINCRONIZAR auth.users -> public.users
--    Cria automaticamente o perfil público quando um usuário
--    é criado no Supabase Auth.
--
--    Pode receber:
--      raw_user_meta_data.nome
--      raw_user_meta_data.perfil
--
--    Se não vier perfil, assume 'funcionario'
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_perfil text;
begin
  v_nome := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1));
  v_perfil := coalesce(new.raw_user_meta_data->>'perfil', 'funcionario');

  if v_perfil not in ('gestor', 'funcionario') then
    v_perfil := 'funcionario';
  end if;

  insert into public.users (id, nome, email, perfil)
  values (new.id, v_nome, new.email, v_perfil)
  on conflict (id) do update
  set
    nome = excluded.nome,
    email = excluded.email,
    perfil = excluded.perfil;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- ============================================================
-- 3) FUNÇÕES AUXILIARES PARA RLS
--    Uso via SELECT para evitar reavaliações por linha, conforme
--    boas práticas de performance em RLS do Supabase.
-- ============================================================

create or replace function public.current_user_is_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.perfil = 'gestor'
  );
$$;

create or replace function public.current_funcionario_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select f.id
  from public.funcionarios f
  where f.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_assigned_to_atividade(p_atividade_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.atribuicoes_atividade aa
    where aa.atividade_id = p_atividade_id
      and aa.funcionario_id = (select public.current_funcionario_id())
  );
$$;

-- ============================================================
-- 4) RLS ON
-- ============================================================

alter table public.users enable row level security;
alter table public.funcionarios enable row level security;
alter table public.atividades enable row level security;
alter table public.atribuicoes_atividade enable row level security;
alter table public.apontamentos_atividade enable row level security;
alter table public.faltas enable row level security;
alter table public.historico_atividades enable row level security;
alter table public.observacoes enable row level security;

alter table public.users force row level security;
alter table public.funcionarios force row level security;
alter table public.atividades force row level security;
alter table public.atribuicoes_atividade force row level security;
alter table public.apontamentos_atividade force row level security;
alter table public.faltas force row level security;
alter table public.historico_atividades force row level security;
alter table public.observacoes force row level security;

-- ============================================================
-- 5) PERMISSÕES BASE
-- ============================================================

revoke all on public.users from anon, authenticated;
revoke all on public.funcionarios from anon, authenticated;
revoke all on public.atividades from anon, authenticated;
revoke all on public.atribuicoes_atividade from anon, authenticated;
revoke all on public.apontamentos_atividade from anon, authenticated;
revoke all on public.faltas from anon, authenticated;

revoke all on public.historico_atividades from anon, authenticated;
revoke all on public.observacoes from anon, authenticated;

grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.funcionarios to authenticated;
grant select, insert, update, delete on public.atividades to authenticated;
grant select, insert, update, delete on public.atribuicoes_atividade to authenticated;
grant select, insert, update, delete on public.apontamentos_atividade to authenticated;
grant select, insert, update, delete on public.faltas to authenticated;
grant select, insert, update, delete on public.historico_atividades to authenticated;
grant select, insert, update, delete on public.observacoes to authenticated;

-- ============================================================
-- 6) LIMPEZA DE POLICIES ANTIGAS
-- ============================================================

drop policy if exists "users_select_own_or_gestor" on public.users;
drop policy if exists "users_insert_own_or_gestor" on public.users;
drop policy if exists "users_update_own_or_gestor" on public.users;
drop policy if exists "users_delete_gestor" on public.users;

drop policy if exists "funcionarios_select_own_or_gestor" on public.funcionarios;
drop policy if exists "funcionarios_insert_gestor" on public.funcionarios;
drop policy if exists "funcionarios_update_gestor" on public.funcionarios;
drop policy if exists "funcionarios_delete_gestor" on public.funcionarios;

drop policy if exists "atividades_select_assigned_or_gestor" on public.atividades;
drop policy if exists "atividades_insert_gestor" on public.atividades;
drop policy if exists "atividades_update_gestor" on public.atividades;
drop policy if exists "atividades_delete_gestor" on public.atividades;

drop policy if exists "atribuicoes_select_own_or_gestor" on public.atribuicoes_atividade;
drop policy if exists "atribuicoes_insert_gestor" on public.atribuicoes_atividade;
drop policy if exists "atribuicoes_update_gestor" on public.atribuicoes_atividade;
drop policy if exists "atribuicoes_delete_gestor" on public.atribuicoes_atividade;

drop policy if exists "apontamentos_select_own_or_gestor" on public.apontamentos_atividade;
drop policy if exists "apontamentos_insert_own_assigned_or_gestor" on public.apontamentos_atividade;
drop policy if exists "apontamentos_update_own_assigned_or_gestor" on public.apontamentos_atividade;
drop policy if exists "apontamentos_delete_own_or_gestor" on public.apontamentos_atividade;

drop policy if exists "faltas_select_own_or_gestor" on public.faltas;
drop policy if exists "faltas_insert_gestor" on public.faltas;
drop policy if exists "faltas_update_gestor" on public.faltas;
drop policy if exists "faltas_delete_gestor" on public.faltas;

-- ============================================================
-- 7) POLICIES - public.users
-- ============================================================

create policy "users_select_own_or_gestor"
on public.users
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.current_user_is_gestor())
);

create policy "users_insert_own_or_gestor"
on public.users
for insert
to authenticated
with check (
  id = (select auth.uid())
  or (select public.current_user_is_gestor())
);

create policy "users_update_own_or_gestor"
on public.users
for update
to authenticated
using (
  id = (select auth.uid())
  or (select public.current_user_is_gestor())
)
with check (
  id = (select auth.uid())
  or (select public.current_user_is_gestor())
);

create policy "users_delete_gestor"
on public.users
for delete
to authenticated
using (
  (select public.current_user_is_gestor())
);

-- ============================================================
-- 8) POLICIES - public.funcionarios
--    gestor: CRUD total
--    funcionario: só lê o próprio cadastro
-- ============================================================

create policy "funcionarios_select_own_or_gestor"
on public.funcionarios
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.current_user_is_gestor())
);

create policy "funcionarios_insert_gestor"
on public.funcionarios
for insert
to authenticated
with check (
  (select public.current_user_is_gestor())
);

create policy "funcionarios_update_gestor"
on public.funcionarios
for update
to authenticated
using (
  (select public.current_user_is_gestor())
)
with check (
  (select public.current_user_is_gestor())
);

create policy "funcionarios_delete_gestor"
on public.funcionarios
for delete
to authenticated
using (
  (select public.current_user_is_gestor())
);

-- ============================================================
-- 9) POLICIES - public.atividades
--    gestor: CRUD total
--    funcionario: só lê atividades atribuídas a ele
-- ============================================================

create policy "atividades_select_assigned_or_gestor"
on public.atividades
for select
to authenticated
using (
  (select public.current_user_is_gestor())
  or exists (
    select 1
    from public.atribuicoes_atividade aa
    where aa.atividade_id = atividades.id
      and aa.funcionario_id = (select public.current_funcionario_id())
  )
);

create policy "atividades_insert_gestor"
on public.atividades
for insert
to authenticated
with check (
  (select public.current_user_is_gestor())
);

create policy "atividades_update_gestor"
on public.atividades
for update
to authenticated
using (
  (select public.current_user_is_gestor())
)
with check (
  (select public.current_user_is_gestor())
);

create policy "atividades_delete_gestor"
on public.atividades
for delete
to authenticated
using (
  (select public.current_user_is_gestor())
);

-- ============================================================
-- 10) POLICIES - public.atribuicoes_atividade
--     gestor: CRUD total
--     funcionario: só lê suas próprias atribuições
-- ============================================================

create policy "atribuicoes_select_own_or_gestor"
on public.atribuicoes_atividade
for select
to authenticated
using (
  funcionario_id = (select public.current_funcionario_id())
  or (select public.current_user_is_gestor())
);

create policy "atribuicoes_insert_gestor"
on public.atribuicoes_atividade
for insert
to authenticated
with check (
  (select public.current_user_is_gestor())
);

create policy "atribuicoes_update_gestor"
on public.atribuicoes_atividade
for update
to authenticated
using (
  (select public.current_user_is_gestor())
)
with check (
  (select public.current_user_is_gestor())
);

create policy "atribuicoes_delete_gestor"
on public.atribuicoes_atividade
for delete
to authenticated
using (
  (select public.current_user_is_gestor())
);

-- ============================================================
-- 11) POLICIES - public.apontamentos_atividade
--     gestor: CRUD total
--     funcionario:
--       - vê apenas os próprios apontamentos
--       - cria/edita apenas apontamentos próprios
--       - só em atividades atribuídas a ele
-- ============================================================

create policy "apontamentos_select_own_or_gestor"
on public.apontamentos_atividade
for select
to authenticated
using (
  funcionario_id = (select public.current_funcionario_id())
  or (select public.current_user_is_gestor())
);

create policy "apontamentos_insert_own_assigned_or_gestor"
on public.apontamentos_atividade
for insert
to authenticated
with check (
  (select public.current_user_is_gestor())
  or (
    funcionario_id = (select public.current_funcionario_id())
    and (select public.is_assigned_to_atividade(atividade_id))
  )
);

create policy "apontamentos_update_own_assigned_or_gestor"
on public.apontamentos_atividade
for update
to authenticated
using (
  (select public.current_user_is_gestor())
  or (
    funcionario_id = (select public.current_funcionario_id())
    and (select public.is_assigned_to_atividade(atividade_id))
  )
)
with check (
  (select public.current_user_is_gestor())
  or (
    funcionario_id = (select public.current_funcionario_id())
    and (select public.is_assigned_to_atividade(atividade_id))
  )
);

create policy "apontamentos_delete_own_or_gestor"
on public.apontamentos_atividade
for delete
to authenticated
using (
  funcionario_id = (select public.current_funcionario_id())
  or (select public.current_user_is_gestor())
);

-- ============================================================
-- 12) POLICIES - public.faltas
--     gestor: CRUD total
--     funcionario: só lê as próprias faltas
-- ============================================================

create policy "faltas_select_own_or_gestor"
on public.faltas
for select
to authenticated
using (
  funcionario_id = (select public.current_funcionario_id())
  or (select public.current_user_is_gestor())
);

create policy "faltas_insert_gestor"
on public.faltas
for insert
to authenticated
with check (
  (select public.current_user_is_gestor())
);

create policy "faltas_update_gestor"
on public.faltas
for update
to authenticated
using (
  (select public.current_user_is_gestor())
)
with check (
  (select public.current_user_is_gestor())
);

create policy "faltas_delete_gestor"
on public.faltas
for delete
to authenticated
using (
  (select public.current_user_is_gestor())
);

-- ============================================================
-- 12b) POLICIES - public.historico_atividades (Sprint 3 / US14)
--      gestor: CRUD total
--      funcionario: lê apenas histórico de atividades atribuídas a ele
-- ============================================================

drop policy if exists "historico_select_assigned_or_gestor" on public.historico_atividades;
drop policy if exists "historico_insert_gestor" on public.historico_atividades;
drop policy if exists "historico_update_gestor" on public.historico_atividades;
drop policy if exists "historico_delete_gestor" on public.historico_atividades;

create policy "historico_select_assigned_or_gestor"
on public.historico_atividades
for select
to authenticated
using (
  (select public.current_user_is_gestor())
  or (select public.is_assigned_to_atividade(atividade_id))
);

create policy "historico_insert_gestor"
on public.historico_atividades
for insert
to authenticated
with check (
  (select public.current_user_is_gestor())
);

create policy "historico_update_gestor"
on public.historico_atividades
for update
to authenticated
using ((select public.current_user_is_gestor()))
with check ((select public.current_user_is_gestor()));

create policy "historico_delete_gestor"
on public.historico_atividades
for delete
to authenticated
using ((select public.current_user_is_gestor()));

-- ============================================================
-- 12c) POLICIES - public.observacoes (Sprint 3 / US17)
--      gestor: CRUD total
-- ============================================================

drop policy if exists "observacoes_select_gestor" on public.observacoes;
drop policy if exists "observacoes_insert_gestor" on public.observacoes;
drop policy if exists "observacoes_update_gestor" on public.observacoes;
drop policy if exists "observacoes_delete_gestor" on public.observacoes;

create policy "observacoes_select_gestor"
on public.observacoes
for select
to authenticated
using ((select public.current_user_is_gestor()));

create policy "observacoes_insert_gestor"
on public.observacoes
for insert
to authenticated
with check ((select public.current_user_is_gestor()));

create policy "observacoes_update_gestor"
on public.observacoes
for update
to authenticated
using ((select public.current_user_is_gestor()))
with check ((select public.current_user_is_gestor()));

create policy "observacoes_delete_gestor"
on public.observacoes
for delete
to authenticated
using ((select public.current_user_is_gestor()));

-- ============================================================
-- 13) ÍNDICES ÚTEIS PARA PERFORMANCE DAS POLICIES
-- ============================================================

create index if not exists idx_users_email
  on public.users (email);

create index if not exists idx_users_id_perfil
  on public.users (id, perfil);

create index if not exists idx_funcionarios_user_id
  on public.funcionarios (user_id);

create index if not exists idx_funcionarios_email
  on public.funcionarios (email);

create index if not exists idx_atribuicoes_funcionario_id
  on public.atribuicoes_atividade (funcionario_id);

create index if not exists idx_atribuicoes_atividade_id
  on public.atribuicoes_atividade (atividade_id);

create index if not exists idx_apontamentos_funcionario_id
  on public.apontamentos_atividade (funcionario_id);

create index if not exists idx_apontamentos_atividade_id
  on public.apontamentos_atividade (atividade_id);

create index if not exists idx_faltas_funcionario_id
  on public.faltas (funcionario_id);

create index if not exists idx_atividades_responsavel_id
  on public.atividades (responsavel_id);

create index if not exists idx_atividades_data_prevista_status
  on public.atividades (data_prevista, status);

create index if not exists idx_historico_atividade_id
  on public.historico_atividades (atividade_id, data_alteracao desc);

create index if not exists idx_observacoes_data
  on public.observacoes (data desc);

create index if not exists idx_faltas_data
  on public.faltas (data);

create index if not exists idx_apontamentos_termino
  on public.apontamentos_atividade (termino);

-- ============================================================
-- 14) SEED DO MVP (Sprint 3) — Dados Mockados para Visualização
--
-- IMPORTANTE:
-- Este seed pressupõe que os usuários já existem em auth.users.
-- Crie antes no Supabase Auth:
--
--   gestor@obraflow.com
--   funcionario@obraflow.com
--
-- Pelo Dashboard > Authentication > Users, signup ou Admin API.
-- Após isso, o trigger handle_new_auth_user criará linhas em public.users.
-- ============================================================

-- Ajusta nomes/perfis dos usuários já existentes no Auth
update public.users
set nome = 'Marina Costa', perfil = 'gestor'
where email = 'gestor@obraflow.com';

update public.users
set nome = 'João Silva', perfil = 'funcionario'
where email = 'funcionario@obraflow.com';

-- ------------------------------------------------------------
-- 14.1) Funcionários (1 vinculado ao auth user + 5 mockados)
-- ------------------------------------------------------------

insert into public.funcionarios (nome, matricula, cpf, cargo, equipe, status, email, user_id)
select
  'João Silva', 'OBR-001', '111.111.111-11', 'Pedreiro', 'Alvenaria',
  'ativo', 'funcionario@obraflow.com', u.id
from public.users u
where u.email = 'funcionario@obraflow.com'
on conflict (matricula) do update set
  nome = excluded.nome, cpf = excluded.cpf, cargo = excluded.cargo,
  equipe = excluded.equipe, status = excluded.status,
  email = excluded.email, user_id = excluded.user_id;

insert into public.funcionarios (nome, matricula, cpf, cargo, equipe, status, email)
values
  ('Maria Santos',     'OBR-002', '222.222.222-22', 'Pedreira',    'Alvenaria',    'ativo',   'maria.santos@obraflow.com'),
  ('Carlos Almeida',   'OBR-003', '333.333.333-33', 'Eletricista', 'Instalações',  'ativo',   'carlos.almeida@obraflow.com'),
  ('Ana Paula Souza',  'OBR-004', '444.444.444-44', 'Encanadora',  'Hidráulica',   'ativo',   'ana.souza@obraflow.com'),
  ('Roberto Oliveira', 'OBR-005', '555.555.555-55', 'Carpinteiro', 'Estrutura',    'ativo',   'roberto.oliveira@obraflow.com'),
  ('Lucia Ferreira',   'OBR-006', '666.666.666-66', 'Pintora',     'Acabamento',   'inativo', 'lucia.ferreira@obraflow.com')
on conflict (matricula) do update set
  nome = excluded.nome, cpf = excluded.cpf, cargo = excluded.cargo,
  equipe = excluded.equipe, status = excluded.status, email = excluded.email;

-- ------------------------------------------------------------
-- 14.2) Atividades, apontamentos, faltas, observações e histórico
--       Bloco procedural para resolver IDs dinamicamente.
-- ------------------------------------------------------------

do $$
declare
  -- usuários
  v_user_gestor uuid;
  v_gestor_nome text := 'Marina Costa';

  -- funcionarios
  v_func_joao    uuid;
  v_func_maria   uuid;
  v_func_carlos  uuid;
  v_func_ana     uuid;
  v_func_roberto uuid;
  v_func_lucia   uuid;

  -- atividades
  v_atv_alvenaria    uuid;
  v_atv_eletrica     uuid;
  v_atv_concretagem  uuid;
  v_atv_pintura      uuid;
  v_atv_hidraulica   uuid;
  v_atv_revestimento uuid;
  v_atv_escoramento  uuid;
  v_atv_reforco      uuid;
  v_atv_vistoria     uuid;
  v_atv_limpeza      uuid;
  v_atv_vedacao      uuid;
  v_atv_chapisco     uuid;
  v_atv_cabeamento   uuid;
  v_atv_teste_hidro  uuid;
begin
  select id into v_user_gestor from public.users where email = 'gestor@obraflow.com';

  select id into v_func_joao    from public.funcionarios where matricula = 'OBR-001';
  select id into v_func_maria   from public.funcionarios where matricula = 'OBR-002';
  select id into v_func_carlos  from public.funcionarios where matricula = 'OBR-003';
  select id into v_func_ana     from public.funcionarios where matricula = 'OBR-004';
  select id into v_func_roberto from public.funcionarios where matricula = 'OBR-005';
  select id into v_func_lucia   from public.funcionarios where matricula = 'OBR-006';

  -- 14.2.a) Atividade pré-existente: alvenaria (atualiza com campos novos)
  update public.atividades
  set responsavel_id = v_func_joao,
      data_prevista  = current_date,
      prioridade     = 'media',
      status         = 'em_andamento'
  where titulo = 'Levantamento de alvenaria no bloco A';

  -- garante existência (caso o seed do MVP antigo não tenha rodado)
  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Levantamento de alvenaria no bloco A',
         'Executar primeira fiada e conferência de prumo.',
         'em_andamento', v_func_joao, current_date, 'media'
  where not exists (
    select 1 from public.atividades where titulo = 'Levantamento de alvenaria no bloco A'
  );

  select id into v_atv_alvenaria from public.atividades where titulo = 'Levantamento de alvenaria no bloco A';

  -- 14.2.b) ATIVIDADES PENDENTES — atrasadas + não iniciadas no prazo (US18)

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Instalação elétrica do pavimento 2',
         'Execução do quadro de distribuição e tomadas de uso geral.',
         'nao_iniciada', v_func_carlos, current_date - 5, 'alta'
  where not exists (select 1 from public.atividades where titulo = 'Instalação elétrica do pavimento 2');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Concretagem da laje técnica',
         'Lançamento e nivelamento do concreto, inclusive cura inicial.',
         'em_andamento', v_func_roberto, current_date - 3, 'alta'
  where not exists (select 1 from public.atividades where titulo = 'Concretagem da laje técnica');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Pintura do hall principal',
         'Aplicação de duas demãos de tinta acrílica.',
         'nao_iniciada', v_func_lucia, current_date, 'alta'
  where not exists (select 1 from public.atividades where titulo = 'Pintura do hall principal');

  -- 14.2.c) ATIVIDADES FUTURAS — sem pendência
  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Instalação hidráulica do banheiro 3',
         'Montagem do shaft e teste de estanqueidade.',
         'nao_iniciada', v_func_ana, current_date + 5, 'media'
  where not exists (select 1 from public.atividades where titulo = 'Instalação hidráulica do banheiro 3');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Revestimento cerâmico da cozinha',
         'Assentamento e rejunte da cerâmica importada.',
         'nao_iniciada', v_func_maria, current_date + 10, 'baixa'
  where not exists (select 1 from public.atividades where titulo = 'Revestimento cerâmico da cozinha');

  -- 14.2.d) ATIVIDADES CONCLUÍDAS — alimentam produtividade (US15) e relatório (US16)
  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Escoramento do mezanino',
         'Montagem de escoras metálicas para concretagem.',
         'concluida', v_func_roberto, current_date - 10, 'alta'
  where not exists (select 1 from public.atividades where titulo = 'Escoramento do mezanino');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Reforço estrutural da coluna B2',
         'Aplicação de fibra de carbono e finalização.',
         'concluida', v_func_maria, current_date - 7, 'media'
  where not exists (select 1 from public.atividades where titulo = 'Reforço estrutural da coluna B2');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Vistoria de qualidade do bloco A',
         'Checklist final de acabamento e prumo.',
         'concluida', v_func_joao, current_date - 2, 'baixa'
  where not exists (select 1 from public.atividades where titulo = 'Vistoria de qualidade do bloco A');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Limpeza pós-obra do bloco C',
         'Remoção de entulho e limpeza fina.',
         'concluida', v_func_roberto, current_date - 15, 'baixa'
  where not exists (select 1 from public.atividades where titulo = 'Limpeza pós-obra do bloco C');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Vedação de juntas do bloco A',
         'Selante poliuretânico nas juntas de dilatação.',
         'concluida', v_func_maria, current_date - 12, 'media'
  where not exists (select 1 from public.atividades where titulo = 'Vedação de juntas do bloco A');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Aplicação de chapisco no muro',
         'Chapisco rolado em parede externa do bloco B.',
         'concluida', v_func_maria, current_date - 5, 'baixa'
  where not exists (select 1 from public.atividades where titulo = 'Aplicação de chapisco no muro');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Cabeamento estruturado da sala técnica',
         'Passagem de cabos cat6 e organização do rack.',
         'concluida', v_func_carlos, current_date - 8, 'media'
  where not exists (select 1 from public.atividades where titulo = 'Cabeamento estruturado da sala técnica');

  insert into public.atividades (titulo, descricao, status, responsavel_id, data_prevista, prioridade)
  select 'Teste hidráulico do shaft principal',
         'Pressurização da coluna e verificação de vazamentos.',
         'concluida', v_func_ana, current_date - 4, 'alta'
  where not exists (select 1 from public.atividades where titulo = 'Teste hidráulico do shaft principal');

  -- Resolve IDs
  select id into v_atv_eletrica     from public.atividades where titulo = 'Instalação elétrica do pavimento 2';
  select id into v_atv_concretagem  from public.atividades where titulo = 'Concretagem da laje técnica';
  select id into v_atv_pintura      from public.atividades where titulo = 'Pintura do hall principal';
  select id into v_atv_hidraulica   from public.atividades where titulo = 'Instalação hidráulica do banheiro 3';
  select id into v_atv_revestimento from public.atividades where titulo = 'Revestimento cerâmico da cozinha';
  select id into v_atv_escoramento  from public.atividades where titulo = 'Escoramento do mezanino';
  select id into v_atv_reforco      from public.atividades where titulo = 'Reforço estrutural da coluna B2';
  select id into v_atv_vistoria     from public.atividades where titulo = 'Vistoria de qualidade do bloco A';
  select id into v_atv_limpeza      from public.atividades where titulo = 'Limpeza pós-obra do bloco C';
  select id into v_atv_vedacao      from public.atividades where titulo = 'Vedação de juntas do bloco A';
  select id into v_atv_chapisco     from public.atividades where titulo = 'Aplicação de chapisco no muro';
  select id into v_atv_cabeamento   from public.atividades where titulo = 'Cabeamento estruturado da sala técnica';
  select id into v_atv_teste_hidro  from public.atividades where titulo = 'Teste hidráulico do shaft principal';

  -- 14.2.e) Atribuições (sincronizar responsável principal como atribuído)
  insert into public.atribuicoes_atividade (funcionario_id, atividade_id) values
    (v_func_joao,    v_atv_alvenaria),
    (v_func_carlos,  v_atv_eletrica),
    (v_func_roberto, v_atv_concretagem),
    (v_func_lucia,   v_atv_pintura),
    (v_func_ana,     v_atv_hidraulica),
    (v_func_maria,   v_atv_revestimento),
    (v_func_roberto, v_atv_escoramento),
    (v_func_maria,   v_atv_reforco),
    (v_func_joao,    v_atv_vistoria),
    (v_func_roberto, v_atv_limpeza),
    (v_func_maria,   v_atv_vedacao),
    (v_func_maria,   v_atv_chapisco),
    (v_func_carlos,  v_atv_cabeamento),
    (v_func_ana,     v_atv_teste_hidro)
  on conflict (funcionario_id, atividade_id) do nothing;

  -- 14.2.f) Apontamentos
  --   Em andamento: 1 aberto para alvenaria e 1 para concretagem
  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_alvenaria, v_func_joao,
         (current_date::timestamptz + interval '8 hours'), null
  where not exists (
    select 1 from public.apontamentos_atividade
    where atividade_id = v_atv_alvenaria and funcionario_id = v_func_joao
  );

  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_concretagem, v_func_roberto,
         ((current_date - 3)::timestamptz + interval '7 hours'), null
  where not exists (
    select 1 from public.apontamentos_atividade
    where atividade_id = v_atv_concretagem and funcionario_id = v_func_roberto
  );

  --   Concluídos: inicio e termino na mesma data prevista (jornada útil)
  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_escoramento, v_func_roberto,
         ((current_date - 10)::timestamptz + interval '8 hours'),
         ((current_date - 10)::timestamptz + interval '17 hours')
  where not exists (select 1 from public.apontamentos_atividade where atividade_id = v_atv_escoramento);

  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_reforco, v_func_maria,
         ((current_date - 7)::timestamptz + interval '8 hours'),
         ((current_date - 7)::timestamptz + interval '16 hours')
  where not exists (select 1 from public.apontamentos_atividade where atividade_id = v_atv_reforco);

  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_vistoria, v_func_joao,
         ((current_date - 2)::timestamptz + interval '9 hours'),
         ((current_date - 2)::timestamptz + interval '12 hours')
  where not exists (select 1 from public.apontamentos_atividade where atividade_id = v_atv_vistoria);

  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_limpeza, v_func_roberto,
         ((current_date - 15)::timestamptz + interval '8 hours'),
         ((current_date - 15)::timestamptz + interval '15 hours')
  where not exists (select 1 from public.apontamentos_atividade where atividade_id = v_atv_limpeza);

  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_vedacao, v_func_maria,
         ((current_date - 12)::timestamptz + interval '8 hours'),
         ((current_date - 12)::timestamptz + interval '17 hours')
  where not exists (select 1 from public.apontamentos_atividade where atividade_id = v_atv_vedacao);

  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_chapisco, v_func_maria,
         ((current_date - 5)::timestamptz + interval '8 hours'),
         ((current_date - 5)::timestamptz + interval '16 hours')
  where not exists (select 1 from public.apontamentos_atividade where atividade_id = v_atv_chapisco);

  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_cabeamento, v_func_carlos,
         ((current_date - 8)::timestamptz + interval '8 hours'),
         ((current_date - 8)::timestamptz + interval '17 hours')
  where not exists (select 1 from public.apontamentos_atividade where atividade_id = v_atv_cabeamento);

  insert into public.apontamentos_atividade (atividade_id, funcionario_id, inicio, termino)
  select v_atv_teste_hidro, v_func_ana,
         ((current_date - 4)::timestamptz + interval '9 hours'),
         ((current_date - 4)::timestamptz + interval '14 hours')
  where not exists (select 1 from public.apontamentos_atividade where atividade_id = v_atv_teste_hidro);

  -- 14.2.g) Faltas
  insert into public.faltas (funcionario_id, data, motivo) values
    (v_func_maria,   current_date - 1, 'Consulta médica agendada'),
    (v_func_carlos,  current_date,     'Atestado por gripe'),
    (v_func_roberto, current_date - 3, 'Compromisso pessoal'),
    (v_func_lucia,   current_date - 5, 'Falta justificada — luto familiar')
  on conflict (funcionario_id, data) do nothing;

  -- 14.2.h) Observações operacionais
  insert into public.observacoes (data, texto, criado_por)
  select current_date,
         'Chegada de material atrasada — concreto previsto chegou às 11h, atrasando o cronograma da concretagem da laje técnica.',
         v_user_gestor
  where not exists (
    select 1 from public.observacoes
    where data = current_date and texto like 'Chegada de material atrasada%'
  );

  insert into public.observacoes (data, texto, criado_por)
  select current_date - 1,
         'Reunião com fornecedor sobre cerâmica importada — entrega confirmada para a próxima semana.',
         v_user_gestor
  where not exists (
    select 1 from public.observacoes
    where data = current_date - 1 and texto like 'Reunião com fornecedor%'
  );

  insert into public.observacoes (data, texto, criado_por)
  select current_date - 3,
         'Equipe relatou ruído elevado de obra vizinha. Engenheiro acionado para mediação com vizinhos.',
         v_user_gestor
  where not exists (
    select 1 from public.observacoes
    where data = current_date - 3 and texto like 'Equipe relatou ruído%'
  );

  insert into public.observacoes (data, texto, criado_por)
  select current_date - 7,
         'Inspeção da CIPA realizada sem apontamentos críticos. Necessário atualizar treinamento de altura para 2 colaboradores.',
         v_user_gestor
  where not exists (
    select 1 from public.observacoes
    where data = current_date - 7 and texto like 'Inspeção da CIPA%'
  );

  -- 14.2.i) Histórico de alterações (US14)
  insert into public.historico_atividades
    (atividade_id, campo, valor_anterior, valor_novo, alterado_por, alterado_por_nome, data_alteracao, motivo)
  select v_atv_concretagem, 'prioridade', 'media', 'alta',
         v_user_gestor, v_gestor_nome,
         now() - interval '4 days',
         'Cronograma do cliente foi adiantado'
  where not exists (
    select 1 from public.historico_atividades
    where atividade_id = v_atv_concretagem and campo = 'prioridade'
  );

  insert into public.historico_atividades
    (atividade_id, campo, valor_anterior, valor_novo, alterado_por, alterado_por_nome, data_alteracao, motivo)
  select v_atv_concretagem, 'data_prevista', (current_date + 2)::text, (current_date - 3)::text,
         v_user_gestor, v_gestor_nome,
         now() - interval '5 days',
         'Adiantamento solicitado pelo cliente'
  where not exists (
    select 1 from public.historico_atividades
    where atividade_id = v_atv_concretagem and campo = 'data_prevista'
  );

  insert into public.historico_atividades
    (atividade_id, campo, valor_anterior, valor_novo, alterado_por, alterado_por_nome, data_alteracao, motivo)
  select v_atv_pintura, 'responsavel', 'Maria Santos', 'Lucia Ferreira',
         v_user_gestor, v_gestor_nome,
         now() - interval '2 days',
         'Realocação por disponibilidade da equipe'
  where not exists (
    select 1 from public.historico_atividades
    where atividade_id = v_atv_pintura and campo = 'responsavel'
  );

  insert into public.historico_atividades
    (atividade_id, campo, valor_anterior, valor_novo, alterado_por, alterado_por_nome, data_alteracao, motivo)
  select v_atv_vistoria, 'status', 'em_andamento', 'concluida',
         v_user_gestor, v_gestor_nome,
         (current_date - 2)::timestamptz + interval '12 hours',
         null
  where not exists (
    select 1 from public.historico_atividades
    where atividade_id = v_atv_vistoria and campo = 'status'
  );
end $$;

commit;
