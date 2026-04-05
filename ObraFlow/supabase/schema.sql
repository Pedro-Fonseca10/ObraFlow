-- ObraFlow MVP - Esquema e seed inicial
-- Use este script no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  senha text not null,
  perfil text not null check (perfil in ('gestor', 'funcionario')),
  created_at timestamptz not null default now()
);

create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  matricula text not null unique,
  cpf text not null unique,
  cargo text not null,
  equipe text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  email text not null unique,
  user_id uuid unique references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists atividades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  status text not null default 'nao_iniciada' check (status in ('nao_iniciada', 'em_andamento', 'concluida')),
  data_criacao timestamptz not null default now()
);

create table if not exists atribuicoes_atividade (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  atividade_id uuid not null references atividades(id) on delete cascade,
  data_atribuicao timestamptz not null default now(),
  unique (funcionario_id, atividade_id)
);

create table if not exists apontamentos_atividade (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references atividades(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  inicio timestamptz not null,
  termino timestamptz
);

create table if not exists faltas (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  data date not null,
  motivo text not null,
  unique (funcionario_id, data)
);

-- MVP em modo simples: sem RLS para facilitar demonstração.
alter table users disable row level security;
alter table funcionarios disable row level security;
alter table atividades disable row level security;
alter table atribuicoes_atividade disable row level security;
alter table apontamentos_atividade disable row level security;
alter table faltas disable row level security;

insert into users (nome, email, senha, perfil)
values
  ('Marina Costa', 'gestor@obraflow.com', '123456', 'gestor'),
  ('João Silva', 'funcionario@obraflow.com', '123456', 'funcionario')
on conflict (email) do update
set
  nome = excluded.nome,
  senha = excluded.senha,
  perfil = excluded.perfil;

insert into funcionarios (nome, matricula, cpf, cargo, equipe, status, email, user_id)
select
  'João Silva',
  'OBR-001',
  '111.111.111-11',
  'Pedreiro',
  'Alvenaria',
  'ativo',
  'funcionario@obraflow.com',
  (select id from users where email = 'funcionario@obraflow.com')
on conflict (matricula) do update
set
  nome = excluded.nome,
  cpf = excluded.cpf,
  cargo = excluded.cargo,
  equipe = excluded.equipe,
  status = excluded.status,
  email = excluded.email,
  user_id = excluded.user_id;

insert into atividades (titulo, descricao, status)
select
  'Levantamento de alvenaria no bloco A',
  'Executar primeira fiada e conferência de prumo.',
  'nao_iniciada'
where not exists (
  select 1
  from atividades
  where titulo = 'Levantamento de alvenaria no bloco A'
);

insert into atribuicoes_atividade (funcionario_id, atividade_id)
select
  f.id,
  a.id
from funcionarios f
join atividades a on a.titulo = 'Levantamento de alvenaria no bloco A'
where f.matricula = 'OBR-001'
on conflict (funcionario_id, atividade_id) do nothing;
