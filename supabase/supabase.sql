-- =====================================================================
--  MÉMO 52 — base de données du classement (Supabase, offre gratuite)
--  Version 2 : classements séparés par difficulté (Normal / Difficile / Expert)
--
--  À coller tel quel dans Supabase > SQL Editor > New query > Run.
--  Peut être relancé sans risque : les joueurs et les scores existants
--  sont conservés (les anciens scores passent dans la difficulté Normal).
-- =====================================================================

-- 1) Joueurs ------------------------------------------------------------
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  pseudo      text not null,
  secret      text not null,                 -- code de sauvegarde (jamais lisible depuis le site)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint pseudo_format check (pseudo ~ '^[A-Za-z0-9_-]{3,20}$')
);
create unique index if not exists players_pseudo_unique on public.players (lower(pseudo));
create unique index if not exists players_secret_unique on public.players (secret);

-- 2) Scores : une ligne par joueur et par classement ---------------------
--    board = '<difficulté>.<mode>'  ex : 'normal.classic', 'expert.c15'
--    classic  : v1 = paquets terminés, v2 = carte atteinte, seed = paquet en cours
--    infinite : v1 = cartes mémorisées       c15  : v1 = cartes en 15 minutes
--    half/full: v1 = temps en millisecondes (plus petit = meilleur)
create table if not exists public.scores (
  player_id   uuid not null references public.players(id) on delete cascade,
  board       text not null,
  v1          bigint not null,
  v2          bigint,
  seed        bigint,
  updated_at  timestamptz not null default now(),
  primary key (player_id, board),
  constraint board_format check (board ~ '^(normal|hard|expert)\.(classic|infinite|half|full|c15)$')
);
create index if not exists scores_board_idx on public.scores (board, v1);

-- 3) Reprise des scores de la version 1 (si elle a été installée) -------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'players' and column_name = 'classic_packs') then
    insert into public.scores (player_id, board, v1, v2, seed)
      select id, 'normal.classic', classic_packs, classic_card, classic_seed from public.players
       where classic_packs > 0 or classic_card > 0
    on conflict do nothing;
    insert into public.scores (player_id, board, v1)
      select id, 'normal.infinite', infinite_best from public.players where infinite_best > 0
    on conflict do nothing;
    insert into public.scores (player_id, board, v1)
      select id, 'normal.half', chrono_half_ms from public.players where chrono_half_ms is not null
    on conflict do nothing;
    insert into public.scores (player_id, board, v1)
      select id, 'normal.full', chrono_full_ms from public.players where chrono_full_ms is not null
    on conflict do nothing;
    insert into public.scores (player_id, board, v1)
      select id, 'normal.c15', chrono_15_best from public.players where chrono_15_best > 0
    on conflict do nothing;
  end if;
end $$;

-- Personne ne peut lire/écrire les tables directement depuis le site :
-- tout passe par les fonctions ci-dessous.
alter table public.players enable row level security;
alter table public.scores  enable row level security;
revoke all on public.players from anon, authenticated;
revoke all on public.scores  from anon, authenticated;

-- Suppression des anciennes fonctions (version 1)
drop function if exists public.save_progress(uuid, text, int, int, bigint, int, int, int, int);
drop function if exists public.recover_player(text);
drop function if exists public.get_leaderboard(text, int);
drop function if exists public.get_my_rank(uuid, text);
drop function if exists public._board(text);

-- 4) Inscription ---------------------------------------------------------
create or replace function public.register_player(p_pseudo text, p_secret text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_secret is null or char_length(p_secret) < 12 then
    raise exception 'CODE_INVALIDE';
  end if;
  insert into players (pseudo, secret) values (p_pseudo, p_secret) returning id into v_id;
  return v_id;
exception
  when unique_violation then raise exception 'PSEUDO_PRIS';
  when check_violation  then raise exception 'PSEUDO_INVALIDE';
end $$;

-- 5) Changement de pseudo -----------------------------------------------
create or replace function public.rename_player(p_id uuid, p_secret text, p_pseudo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update players set pseudo = p_pseudo, updated_at = now()
   where id = p_id and secret = p_secret;
  if not found then raise exception 'AUTH'; end if;
exception
  when unique_violation then raise exception 'PSEUDO_PRIS';
  when check_violation  then raise exception 'PSEUDO_INVALIDE';
end $$;

-- 6) Sauvegarde : ne garde que les meilleurs scores ----------------------
--    p_scores = {"normal.classic":{"v1":3,"v2":26,"seed":123}, "hard.infinite":{"v1":40}, ...}
create or replace function public.save_scores(p_id uuid, p_secret text, p_scores jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record; v_mode text; n1 bigint; n2 bigint; v_seed bigint;
begin
  if not exists (select 1 from players where id = p_id and secret = p_secret) then
    raise exception 'AUTH';
  end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then return; end if;

  for r in select key, value from jsonb_each(p_scores) loop
    continue when r.key !~ '^(normal|hard|expert)\.(classic|infinite|half|full|c15)$';
    continue when jsonb_typeof(r.value) <> 'object' or jsonb_typeof(r.value->'v1') <> 'number';
    v_mode := split_part(r.key, '.', 2);
    n1 := floor((r.value->>'v1')::numeric);
    n2 := case when jsonb_typeof(r.value->'v2') = 'number' then floor((r.value->>'v2')::numeric) end;
    v_seed := case when jsonb_typeof(r.value->'seed') = 'number' then floor((r.value->>'seed')::numeric) end;

    -- valeurs impossibles refusées
    if v_mode = 'classic' then
      continue when n1 < 0 or n1 > 100000 or n2 is null or n2 < 0 or n2 > 54;
    elsif v_mode = 'half' then
      continue when n1 < 2000;
    elsif v_mode = 'full' then
      continue when n1 < 4000;
    else
      continue when n1 <= 0 or n1 > 10000000;
      n2 := null;
    end if;
    if v_mode <> 'classic' then v_seed := null; end if;

    insert into scores as s (player_id, board, v1, v2, seed)
    values (p_id, r.key, n1, n2, v_seed)
    on conflict (player_id, board) do update
      set v1 = excluded.v1, v2 = excluded.v2, seed = excluded.seed, updated_at = now()
      where case
        when v_mode = 'classic'          then (excluded.v1, excluded.v2) >= (s.v1, s.v2)
        when v_mode in ('half', 'full')  then excluded.v1 < s.v1
        else excluded.v1 > s.v1
      end;
  end loop;
  update players set updated_at = now() where id = p_id;
end $$;

-- 7) Récupération avec le code de sauvegarde ----------------------------
create or replace function public.recover_player(p_secret text)
returns table (id uuid, pseudo text, scores jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, p.pseudo,
         coalesce((select jsonb_object_agg(s.board, jsonb_build_object('v1', s.v1, 'v2', s.v2, 'seed', s.seed))
                     from scores s where s.player_id = p.id), '{}'::jsonb)
    from players p where p.secret = p_secret limit 1;
$$;

-- 8) Classements ---------------------------------------------------------
create or replace function public._board(p_board text)
returns table (id uuid, pseudo text, v1 bigint, v2 bigint, pos bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.pseudo, s.v1, s.v2,
         rank() over (order by
           case when split_part(p_board, '.', 2) in ('half', 'full') then s.v1 else -s.v1 end,
           -coalesce(s.v2, 0))
    from scores s join players p on p.id = s.player_id
   where s.board = p_board;
$$;

create or replace function public.get_leaderboard(p_board text, p_limit int default 100)
returns table (pos bigint, pseudo text, v1 bigint, v2 bigint)
language sql stable security definer set search_path = public as $$
  select b.pos, b.pseudo, b.v1, b.v2 from public._board(p_board) b
   order by b.pos, b.pseudo
   limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

create or replace function public.get_my_rank(p_id uuid, p_board text)
returns table (pos bigint, total bigint, v1 bigint, v2 bigint)
language sql stable security definer set search_path = public as $$
  select b.pos, (select count(*) from public._board(p_board)), b.v1, b.v2
    from public._board(p_board) b where b.id = p_id;
$$;

-- 9) Droits : le site (rôle anon) ne peut appeler QUE ces fonctions ------
revoke all on function public._board(text)                          from public, anon, authenticated;
revoke all on function public.register_player(text, text)          from public;
revoke all on function public.rename_player(uuid, text, text)      from public;
revoke all on function public.save_scores(uuid, text, jsonb)       from public;
revoke all on function public.recover_player(text)                 from public;
revoke all on function public.get_leaderboard(text, int)           from public;
revoke all on function public.get_my_rank(uuid, text)              from public;
grant execute on function public.register_player(text, text)       to anon, authenticated;
grant execute on function public.rename_player(uuid, text, text)   to anon, authenticated;
grant execute on function public.save_scores(uuid, text, jsonb)    to anon, authenticated;
grant execute on function public.recover_player(text)              to anon, authenticated;
grant execute on function public.get_leaderboard(text, int)        to anon, authenticated;
grant execute on function public.get_my_rank(uuid, text)           to anon, authenticated;

-- Recharge le cache de l'API pour que les fonctions soient visibles tout de suite
notify pgrst, 'reload schema';
