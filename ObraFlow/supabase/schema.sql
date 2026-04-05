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
  data_criacao timestamptz not null default now()
);

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

alter table public.users force row level security;
alter table public.funcionarios force row level security;
alter table public.atividades force row level security;
alter table public.atribuicoes_atividade force row level security;
alter table public.apontamentos_atividade force row level security;
alter table public.faltas force row level security;

-- ============================================================
-- 5) PERMISSÕES BASE
-- ============================================================

revoke all on public.users from anon, authenticated;
revoke all on public.funcionarios from anon, authenticated;
revoke all on public.atividades from anon, authenticated;
revoke all on public.atribuicoes_atividade from anon, authenticated;
revoke all on public.apontamentos_atividade from anon, authenticated;
revoke all on public.faltas from anon, authenticated;

grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.funcionarios to authenticated;
grant select, insert, update, delete on public.atividades to authenticated;
grant select, insert, update, delete on public.atribuicoes_atividade to authenticated;
grant select, insert, update, delete on public.apontamentos_atividade to authenticated;
grant select, insert, update, delete on public.faltas to authenticated;

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

-- ============================================================
-- 14) SEED DO MVP
--
-- IMPORTANTE:
-- Este seed pressupõe que os usuários já existem em auth.users.
-- Crie antes no Supabase Auth:
--
--   gestor@obraflow.com
--   funcionario@obraflow.com
--
-- Você pode criá-los:
-- - pelo Dashboard > Authentication > Users
-- - pelo signup da aplicação
-- - pela Admin API
--
-- Após isso, o trigger acima criará as linhas em public.users.
-- ============================================================

-- Ajusta nomes/perfis dos usuários já existentes no Auth
update public.users
set
  nome = 'Marina Costa',
  perfil = 'gestor'
where email = 'gestor@obraflow.com';

update public.users
set
  nome = 'João Silva',
  perfil = 'funcionario'
where email = 'funcionario@obraflow.com';

insert into public.funcionarios (nome, matricula, cpf, cargo, equipe, status, email, user_id)
select
  'João Silva',
  'OBR-001',
  '111.111.111-11',
  'Pedreiro',
  'Alvenaria',
  'ativo',
  'funcionario@obraflow.com',
  u.id
from public.users u
where u.email = 'funcionario@obraflow.com'
on conflict (matricula) do update
set
  nome = excluded.nome,
  cpf = excluded.cpf,
  cargo = excluded.cargo,
  equipe = excluded.equipe,
  status = excluded.status,
  email = excluded.email,
  user_id = excluded.user_id;

insert into public.atividades (titulo, descricao, status)
select
  'Levantamento de alvenaria no bloco A',
  'Executar primeira fiada e conferência de prumo.',
  'nao_iniciada'
where not exists (
  select 1
  from public.atividades
  where titulo = 'Levantamento de alvenaria no bloco A'
);

insert into public.atribuicoes_atividade (funcionario_id, atividade_id)
select
  f.id,
  a.id
from public.funcionarios f
join public.atividades a
  on a.titulo = 'Levantamento de alvenaria no bloco A'
where f.matricula = 'OBR-001'
on conflict (funcionario_id, atividade_id) do nothing;

commit;
