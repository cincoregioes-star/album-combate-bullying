-- ============================================================
-- PAINEL DO PILOTO — ATUALIZAÇÃO v2 (rode uma vez no SQL Editor,
-- depois do PAINEL_PILOTO.sql)
--  * O progresso nunca diminui no painel (ex.: aluno que reinicia o álbum).
--  * Bloqueio de 15 minutos após 5 senhas erradas seguidas.
-- ============================================================

create table if not exists public.cbp_tentativas (
  usuario text primary key,
  falhas int not null default 0,
  bloqueado_ate timestamptz
);
alter table public.cbp_tentativas enable row level security;
revoke all on public.cbp_tentativas from anon, authenticated;

alter table public.cbp_alunos add column if not exists reinicios int not null default 0;

create or replace function public.cbp_aluno_progresso(p_codigo text, p_device text, p_figurinhas int, p_simulados int, p_pacotes int) returns json
language plpgsql security definer set search_path = public as $$
declare n int; f int := least(greatest(coalesce(p_figurinhas,0),0),36);
begin
  update cbp_alunos set
    reinicios  = reinicios + case when f < figurinhas then 1 else 0 end,
    figurinhas = greatest(figurinhas, f),
    simulados  = greatest(simulados, least(greatest(coalesce(p_simulados,0),0),5)),
    pacotes    = least(greatest(coalesce(p_pacotes,0),0),999),
    ultimo_uso = now()
  where codigo = upper(trim(p_codigo)) and device_id = p_device;
  get diagnostics n = row_count;
  return json_build_object('ok', n = 1);
end $$;

create or replace function public.cbp_login(p_usuario text, p_senha text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u cbp_usuarios; tk uuid; t cbp_tentativas; nome_u text := lower(trim(coalesce(p_usuario,'')));
begin
  select * into t from cbp_tentativas where usuario = nome_u;
  if t.bloqueado_ate is not null and t.bloqueado_ate > now() then
    return json_build_object('ok', false, 'erro', 'Muitas tentativas erradas. Tente de novo em 15 minutos.');
  end if;
  select * into u from cbp_usuarios where usuario = nome_u;
  if u.id is null or u.senha_hash <> extensions.crypt(p_senha, u.senha_hash) then
    insert into cbp_tentativas(usuario, falhas) values (nome_u, 1)
      on conflict (usuario) do update set
        falhas = case when cbp_tentativas.bloqueado_ate is not null and cbp_tentativas.bloqueado_ate <= now() then 1 else cbp_tentativas.falhas + 1 end,
        bloqueado_ate = case when (case when cbp_tentativas.bloqueado_ate is not null and cbp_tentativas.bloqueado_ate <= now() then 1 else cbp_tentativas.falhas + 1 end) >= 5
                             then now() + interval '15 minutes' else null end;
    perform pg_sleep(0.6);
    return json_build_object('ok', false, 'erro', 'Usuário ou senha incorretos.');
  end if;
  delete from cbp_tentativas where usuario = nome_u;
  delete from cbp_sessoes where expira_em < now();
  insert into cbp_sessoes(usuario_id) values (u.id) returning token into tk;
  return json_build_object('ok', true, 'token', tk, 'nome', u.nome, 'perfil', u.perfil);
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
                'reinicios', a.reinicios, 'alerta_aparelho', a.tentativa_outro_aparelho) order by a.numero)
              from cbp_alunos a where a.turma_id = t.id), '[]'::json)) order by t.nome)
          from cbp_turmas t where t.escola_id = e.id), '[]'::json)) order by e.nome)
      from cbp_escolas e where u.perfil = 'secretaria' or e.id = u.escola_id), '[]'::json));
end $$;

revoke all on function public.cbp_aluno_progresso(text, text, int, int, int) from public, anon, authenticated;
revoke all on function public.cbp_login(text, text) from public, anon, authenticated;
revoke all on function public.cbp_painel(uuid) from public, anon, authenticated;
grant execute on function public.cbp_aluno_progresso(text, text, int, int, int) to anon, authenticated;
grant execute on function public.cbp_login(text, text) to anon, authenticated;
grant execute on function public.cbp_painel(uuid) to anon, authenticated;
