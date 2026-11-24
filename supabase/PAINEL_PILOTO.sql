-- ============================================================
-- ÁLBUM COMBATE AO BULLYING — PAINEL DO PILOTO
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
--
-- Privacidade (LGPD):
--  * Nenhum nome de aluno é guardado. O aluno é identificado por um
--    código aleatório; a relação código ↔ nome fica só com o professor.
--  * O app do aluno só ENVIA o próprio progresso (figurinhas, simulados,
--    pacotes e data de uso). Não consegue ler nada do banco.
--  * Professores (login da escola) veem só a própria escola;
--    a Secretaria (login da rede) vê todas.
--  * Todas as tabelas têm RLS ligado e nenhuma política: o acesso é
--    feito apenas pelas funções abaixo.
-- ============================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cbp_escolas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

create table if not exists public.cbp_turmas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.cbp_escolas(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (escola_id, nome)
);

create table if not exists public.cbp_alunos (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.cbp_turmas(id) on delete cascade,
  numero int not null,
  codigo text not null unique,
  device_id text,
  vinculado_em timestamptz,
  figurinhas int not null default 0,
  simulados int not null default 0,
  pacotes int not null default 0,
  ultimo_uso timestamptz,
  tentativa_outro_aparelho timestamptz,
  unique (turma_id, numero)
);

create table if not exists public.cbp_usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  senha_hash text not null,
  nome text not null,
  perfil text not null check (perfil in ('secretaria','escola')),
  escola_id uuid references public.cbp_escolas(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.cbp_sessoes (
  token uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.cbp_usuarios(id) on delete cascade,
  expira_em timestamptz not null default now() + interval '12 hours'
);

alter table public.cbp_escolas  enable row level security;
alter table public.cbp_turmas   enable row level security;
alter table public.cbp_alunos   enable row level security;
alter table public.cbp_usuarios enable row level security;
alter table public.cbp_sessoes  enable row level security;
revoke all on public.cbp_escolas, public.cbp_turmas, public.cbp_alunos, public.cbp_usuarios, public.cbp_sessoes from anon, authenticated;

-- ---------- utilitários internos ----------
create or replace function public.cbp_novo_codigo() returns text
language plpgsql security definer set search_path = public as $$
declare alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..5 loop
      c := c || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from cbp_alunos where codigo = c);
  end loop;
  return c;
end $$;

create or replace function public.cbp_sessao(p_token uuid) returns public.cbp_usuarios
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios;
begin
  select us.* into u from cbp_sessoes s join cbp_usuarios us on us.id = s.usuario_id
   where s.token = p_token and s.expira_em > now();
  if u.id is null then raise exception 'sessao_invalida'; end if;
  return u;
end $$;

create or replace function public.cbp_pode_turma(u public.cbp_usuarios, p_turma uuid) returns boolean
language sql security definer set search_path = public as $$
  select u.perfil = 'secretaria' or exists (select 1 from cbp_turmas t where t.id = p_turma and t.escola_id = u.escola_id);
$$;

-- ---------- funções do aluno (app) ----------
create or replace function public.cbp_aluno_vincular(p_codigo text, p_device text) returns json
language plpgsql security definer set search_path = public as $$
declare a cbp_alunos; t cbp_turmas; e cbp_escolas;
begin
  select * into a from cbp_alunos where codigo = upper(trim(p_codigo));
  if a.id is null then return json_build_object('ok', false, 'erro', 'codigo_invalido'); end if;
  if a.device_id is not null and a.device_id <> p_device then
    update cbp_alunos set tentativa_outro_aparelho = now() where id = a.id;
    return json_build_object('ok', false, 'erro', 'outro_aparelho');
  end if;
  if a.device_id is null then
    update cbp_alunos set device_id = p_device, vinculado_em = now() where id = a.id;
  end if;
  select * into t from cbp_turmas where id = a.turma_id;
  select * into e from cbp_escolas where id = t.escola_id;
  return json_build_object('ok', true, 'escola', e.nome, 'turma', t.nome, 'numero', a.numero);
end $$;

create or replace function public.cbp_aluno_progresso(p_codigo text, p_device text, p_figurinhas int, p_simulados int, p_pacotes int) returns json
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update cbp_alunos set
    figurinhas = least(greatest(coalesce(p_figurinhas,0),0),36),
    simulados  = least(greatest(coalesce(p_simulados,0),0),5),
    pacotes    = least(greatest(coalesce(p_pacotes,0),0),999),
    ultimo_uso = now()
  where codigo = upper(trim(p_codigo)) and device_id = p_device;
  get diagnostics n = row_count;
  return json_build_object('ok', n = 1);
end $$;

-- ---------- funções do painel ----------
create or replace function public.cbp_login(p_usuario text, p_senha text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u cbp_usuarios; tk uuid;
begin
  select * into u from cbp_usuarios where usuario = lower(trim(p_usuario));
  if u.id is null or u.senha_hash <> extensions.crypt(p_senha, u.senha_hash) then
    perform pg_sleep(0.6);
    return json_build_object('ok', false, 'erro', 'Usuário ou senha incorretos.');
  end if;
  delete from cbp_sessoes where expira_em < now();
  insert into cbp_sessoes(usuario_id) values (u.id) returning token into tk;
  return json_build_object('ok', true, 'token', tk, 'nome', u.nome, 'perfil', u.perfil);
end $$;

create or replace function public.cbp_logout(p_token uuid) returns json
language sql security definer set search_path = public as $$
  delete from cbp_sessoes where token = p_token; select json_build_object('ok', true);
$$;

create or replace function public.cbp_trocar_senha(p_token uuid, p_atual text, p_nova text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u cbp_usuarios := cbp_sessao(p_token);
begin
  if u.senha_hash <> extensions.crypt(p_atual, u.senha_hash) then return json_build_object('ok', false, 'erro', 'Senha atual incorreta.'); end if;
  if length(coalesce(p_nova,'')) < 8 then return json_build_object('ok', false, 'erro', 'A nova senha precisa ter pelo menos 8 caracteres.'); end if;
  update cbp_usuarios set senha_hash = extensions.crypt(p_nova, extensions.gen_salt('bf')) where id = u.id;
  return json_build_object('ok', true);
end $$;

create or replace function public.cbp_painel(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token);
begin
  return json_build_object(
    'ok', true, 'nome', u.nome, 'perfil', u.perfil,
    'escolas', coalesce((
      select json_agg(json_build_object(
        'id', e.id, 'nome', e.nome,
        'usuarios', coalesce((select json_agg(json_build_object('usuario', us.usuario, 'nome', us.nome) order by us.usuario)
                              from cbp_usuarios us where us.escola_id = e.id), '[]'::json),
        'turmas', coalesce((select json_agg(json_build_object(
            'id', t.id, 'nome', t.nome,
            'alunos', coalesce((select json_agg(json_build_object(
                'id', a.id, 'numero', a.numero, 'codigo', a.codigo,
                'vinculado', a.device_id is not null, 'figurinhas', a.figurinhas,
                'simulados', a.simulados, 'pacotes', a.pacotes, 'ultimo_uso', a.ultimo_uso,
                'alerta_aparelho', a.tentativa_outro_aparelho) order by a.numero)
              from cbp_alunos a where a.turma_id = t.id), '[]'::json)) order by t.nome)
          from cbp_turmas t where t.escola_id = e.id), '[]'::json)) order by e.nome)
      from cbp_escolas e where u.perfil = 'secretaria' or e.id = u.escola_id), '[]'::json));
end $$;

create or replace function public.cbp_criar_escola(p_token uuid, p_nome text) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token);
begin
  if u.perfil <> 'secretaria' then return json_build_object('ok', false, 'erro', 'Apenas a Secretaria cadastra escolas.'); end if;
  if length(trim(coalesce(p_nome,''))) < 3 then return json_build_object('ok', false, 'erro', 'Informe o nome da escola.'); end if;
  insert into cbp_escolas(nome) values (trim(p_nome));
  return json_build_object('ok', true);
exception when unique_violation then return json_build_object('ok', false, 'erro', 'Essa escola já está cadastrada.');
end $$;

create or replace function public.cbp_criar_turma(p_token uuid, p_escola uuid, p_nome text, p_alunos int) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token); tid uuid; i int;
begin
  if not (u.perfil = 'secretaria' or u.escola_id = p_escola) then return json_build_object('ok', false, 'erro', 'Sem permissão para esta escola.'); end if;
  if length(trim(coalesce(p_nome,''))) < 1 then return json_build_object('ok', false, 'erro', 'Informe o nome da turma.'); end if;
  if coalesce(p_alunos,0) < 1 or p_alunos > 60 then return json_build_object('ok', false, 'erro', 'Informe de 1 a 60 alunos.'); end if;
  insert into cbp_turmas(escola_id, nome) values (p_escola, trim(p_nome)) returning id into tid;
  for i in 1..p_alunos loop
    insert into cbp_alunos(turma_id, numero, codigo) values (tid, i, cbp_novo_codigo());
  end loop;
  return json_build_object('ok', true, 'turma', tid);
exception when unique_violation then return json_build_object('ok', false, 'erro', 'Já existe uma turma com esse nome nesta escola.');
end $$;

create or replace function public.cbp_adicionar_aluno(p_token uuid, p_turma uuid) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token); n int;
begin
  if not cbp_pode_turma(u, p_turma) then return json_build_object('ok', false, 'erro', 'Sem permissão.'); end if;
  select coalesce(max(numero),0) + 1 into n from cbp_alunos where turma_id = p_turma;
  insert into cbp_alunos(turma_id, numero, codigo) values (p_turma, n, cbp_novo_codigo());
  return json_build_object('ok', true, 'numero', n);
end $$;

create or replace function public.cbp_liberar_aparelho(p_token uuid, p_aluno uuid, p_novo_codigo boolean default false) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token); a cbp_alunos;
begin
  select * into a from cbp_alunos where id = p_aluno;
  if a.id is null or not cbp_pode_turma(u, a.turma_id) then return json_build_object('ok', false, 'erro', 'Sem permissão.'); end if;
  update cbp_alunos set device_id = null, vinculado_em = null, tentativa_outro_aparelho = null,
    codigo = case when p_novo_codigo then cbp_novo_codigo() else codigo end
  where id = a.id;
  return json_build_object('ok', true);
end $$;

create or replace function public.cbp_excluir_turma(p_token uuid, p_turma uuid) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token);
begin
  if not cbp_pode_turma(u, p_turma) then return json_build_object('ok', false, 'erro', 'Sem permissão.'); end if;
  delete from cbp_turmas where id = p_turma;
  return json_build_object('ok', true);
end $$;

create or replace function public.cbp_criar_usuario_escola(p_token uuid, p_escola uuid, p_usuario text, p_nome text, p_senha text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u cbp_usuarios := cbp_sessao(p_token);
begin
  if u.perfil <> 'secretaria' then return json_build_object('ok', false, 'erro', 'Apenas a Secretaria cria logins.'); end if;
  if length(coalesce(p_senha,'')) < 8 then return json_build_object('ok', false, 'erro', 'A senha precisa ter pelo menos 8 caracteres.'); end if;
  if lower(trim(coalesce(p_usuario,''))) !~ '^[a-z0-9._-]{3,40}$' then return json_build_object('ok', false, 'erro', 'Usuário: use de 3 a 40 letras minúsculas, números, ponto, hífen ou sublinhado.'); end if;
  insert into cbp_usuarios(usuario, senha_hash, nome, perfil, escola_id)
  values (lower(trim(p_usuario)), extensions.crypt(p_senha, extensions.gen_salt('bf')), coalesce(nullif(trim(p_nome),''), p_usuario), 'escola', p_escola);
  return json_build_object('ok', true);
exception when unique_violation then return json_build_object('ok', false, 'erro', 'Esse usuário já existe.');
end $$;

-- Somente as funções abaixo ficam acessíveis pela chave pública.
revoke all on function public.cbp_novo_codigo() from public, anon, authenticated;
revoke all on function public.cbp_sessao(uuid) from public, anon, authenticated;
revoke all on function public.cbp_pode_turma(public.cbp_usuarios, uuid) from public, anon, authenticated;
revoke all on function public.cbp_aluno_vincular(text, text) from public, anon, authenticated;
revoke all on function public.cbp_aluno_progresso(text, text, int, int, int) from public, anon, authenticated;
revoke all on function public.cbp_login(text, text) from public, anon, authenticated;
revoke all on function public.cbp_logout(uuid) from public, anon, authenticated;
revoke all on function public.cbp_trocar_senha(uuid, text, text) from public, anon, authenticated;
revoke all on function public.cbp_painel(uuid) from public, anon, authenticated;
revoke all on function public.cbp_criar_escola(uuid, text) from public, anon, authenticated;
revoke all on function public.cbp_criar_turma(uuid, uuid, text, int) from public, anon, authenticated;
revoke all on function public.cbp_adicionar_aluno(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cbp_liberar_aparelho(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.cbp_excluir_turma(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cbp_criar_usuario_escola(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.cbp_aluno_vincular(text, text) to anon, authenticated;
grant execute on function public.cbp_aluno_progresso(text, text, int, int, int) to anon, authenticated;
grant execute on function public.cbp_login(text, text) to anon, authenticated;
grant execute on function public.cbp_logout(uuid) to anon, authenticated;
grant execute on function public.cbp_trocar_senha(uuid, text, text) to anon, authenticated;
grant execute on function public.cbp_painel(uuid) to anon, authenticated;
grant execute on function public.cbp_criar_escola(uuid, text) to anon, authenticated;
grant execute on function public.cbp_criar_turma(uuid, uuid, text, int) to anon, authenticated;
grant execute on function public.cbp_adicionar_aluno(uuid, uuid) to anon, authenticated;
grant execute on function public.cbp_liberar_aparelho(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.cbp_excluir_turma(uuid, uuid) to anon, authenticated;
grant execute on function public.cbp_criar_usuario_escola(uuid, uuid, text, text, text) to anon, authenticated;

-- ---------- primeiro acesso da Secretaria ----------
-- O login "secretaria" é criado com uma senha aleatória que ninguém conhece.
-- Para definir a sua senha, rode depois, no SQL Editor, trocando o texto:
--   update public.cbp_usuarios set senha_hash = extensions.crypt('SUA-SENHA-AQUI', extensions.gen_salt('bf')) where usuario = 'secretaria';
insert into public.cbp_usuarios(usuario, senha_hash, nome, perfil)
values ('secretaria', extensions.crypt(encode(extensions.gen_random_bytes(24), 'base64'), extensions.gen_salt('bf')), 'Secretaria Municipal de Educação', 'secretaria')
on conflict (usuario) do nothing;
