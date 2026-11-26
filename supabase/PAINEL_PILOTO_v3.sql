-- ============================================================
-- PAINEL DO PILOTO — v3: pesquisas em papel lançadas no painel
-- (anônimas: só turma, tipo e as marcações 1 a 4 de cada folha)
-- ============================================================
create table if not exists public.cbp_pesquisas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.cbp_turmas(id) on delete cascade,
  tipo text not null check (tipo in ('inicial','final')),
  respostas smallint[] not null,
  lancado_por uuid references public.cbp_usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.cbp_pesquisas enable row level security;
revoke all on public.cbp_pesquisas from anon, authenticated;

create or replace function public.cbp_lancar_pesquisa(p_token uuid, p_turma uuid, p_tipo text, p_respostas int[]) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token); n int := coalesce(array_length(p_respostas,1),0); x int; nid uuid; total int;
begin
  if not cbp_pode_turma(u, p_turma) then return json_build_object('ok', false, 'erro', 'Sem permissão para esta turma.'); end if;
  if p_tipo not in ('inicial','final') then return json_build_object('ok', false, 'erro', 'Tipo inválido.'); end if;
  if (p_tipo = 'inicial' and n <> 10) or (p_tipo = 'final' and n <> 15) then
    return json_build_object('ok', false, 'erro', case when p_tipo='inicial' then 'A pesquisa inicial tem 10 respostas.' else 'A pesquisa final tem 15 respostas.' end);
  end if;
  foreach x in array p_respostas loop
    if x is not null and (x < 0 or x > 4) then return json_build_object('ok', false, 'erro', 'Use apenas 1, 2, 3, 4 (ou 0 para em branco).'); end if;
  end loop;
  insert into cbp_pesquisas(turma_id, tipo, respostas, lancado_por) values (p_turma, p_tipo, p_respostas::smallint[], u.id) returning id into nid;
  select count(*) into total from cbp_pesquisas where turma_id = p_turma and tipo = p_tipo;
  return json_build_object('ok', true, 'id', nid, 'total', total);
end $$;

create or replace function public.cbp_excluir_pesquisa(p_token uuid, p_id uuid) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token); t uuid;
begin
  select turma_id into t from cbp_pesquisas where id = p_id;
  if t is null or not cbp_pode_turma(u, t) then return json_build_object('ok', false, 'erro', 'Sem permissão.'); end if;
  delete from cbp_pesquisas where id = p_id;
  return json_build_object('ok', true);
end $$;

-- Resumo por turma: para cada pergunta, quantas folhas marcaram 3 ou 4, e quantas responderam
create or replace function public.cbp_pesquisas_resumo(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare u cbp_usuarios := cbp_sessao(p_token);
begin
  return coalesce((
    select json_agg(json_build_object('turma', g.turma_id, 'tipo', g.tipo, 'folhas', g.folhas,
      'positivas', (select array_agg((select count(*) from cbp_pesquisas p where p.turma_id = g.turma_id and p.tipo = g.tipo and p.respostas[i] >= 3) order by i)
                    from generate_series(1, case when g.tipo = 'inicial' then 10 else 15 end) i),
      'respondidas', (select array_agg((select count(*) from cbp_pesquisas p where p.turma_id = g.turma_id and p.tipo = g.tipo and p.respostas[i] between 1 and 4) order by i)
                    from generate_series(1, case when g.tipo = 'inicial' then 10 else 15 end) i)))
    from (select turma_id, tipo, count(*) as folhas from cbp_pesquisas group by turma_id, tipo) g
    join cbp_turmas t on t.id = g.turma_id
    where u.perfil = 'secretaria' or t.escola_id = u.escola_id), '[]'::json);
end $$;

revoke all on function public.cbp_lancar_pesquisa(uuid, uuid, text, int[]) from public, anon, authenticated;
revoke all on function public.cbp_excluir_pesquisa(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cbp_pesquisas_resumo(uuid) from public, anon, authenticated;
grant execute on function public.cbp_lancar_pesquisa(uuid, uuid, text, int[]) to anon, authenticated;
grant execute on function public.cbp_excluir_pesquisa(uuid, uuid) to anon, authenticated;
grant execute on function public.cbp_pesquisas_resumo(uuid) to anon, authenticated;
