-- =====================================================================
-- Running — sauvegarde en ligne (§10 du cahier des charges)
-- À exécuter UNE fois dans Supabase : menu « SQL Editor » → New query →
-- coller tout ce fichier → Run. Ré-exécutable sans danger (idempotent).
--
-- Principe : aucun compte, aucun e-mail. Le code de récupération (12 caractères)
-- est à la fois l'identifiant et la clé. Le serveur ne stocke que son empreinte
-- SHA-256. Les tables sont fermées (RLS sans policy) : on n'y accède que par
-- trois fonctions (register / load / save) exécutées avec les droits du
-- propriétaire, chacune ne voyant que la ligne correspondant au code fourni.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tables ----------

create table if not exists public.backups (
  code_hash      text primary key,
  data           jsonb not null,
  schema_version int not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Journal anti-abus : échecs (« fail ») et enregistrements (« register ») par source.
create table if not exists public.backup_attempts (
  ip_hash text not null,
  kind    text not null default 'fail',
  at      timestamptz not null default now()
);
alter table public.backup_attempts add column if not exists kind text not null default 'fail';
create index if not exists backup_attempts_lookup on public.backup_attempts (ip_hash, kind, at);

alter table public.backups enable row level security;
alter table public.backup_attempts enable row level security;
-- Aucune policy : l'accès direct aux tables est refusé à anon et authenticated.
revoke all on table public.backups, public.backup_attempts from anon, authenticated;

-- ---------- Fonctions internes ----------

create or replace function public.norm_code(p text) returns text
language sql immutable as
$$ select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function public.code_hash(p text) returns text
language sql immutable set search_path = public, extensions as
$$ select encode(digest(public.norm_code(p), 'sha256'), 'hex') $$;

-- Source de la requête : première adresse de x-forwarded-for, hachée (jamais stockée en clair).
create or replace function public.client_ip_hash() returns text
language sql stable set search_path = public, extensions as
$$ select encode(digest(coalesce(
     nullif(trim(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1)), ''),
     'unknown'), 'sha256'), 'hex') $$;

-- true si la source a atteint p_max tentatives de ce type dans la fenêtre.
create or replace function public.is_throttled(p_kind text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  delete from public.backup_attempts where at < now() - interval '1 day';
  select count(*) into n from public.backup_attempts
   where ip_hash = public.client_ip_hash() and kind = p_kind and at > now() - p_window;
  return n >= p_max;
end $$;

create or replace function public.log_attempt(p_kind text) returns void
language sql security definer set search_path = public, extensions as
$$ insert into public.backup_attempts(ip_hash, kind) values (public.client_ip_hash(), p_kind) $$;

-- Ancienne signature (versions précédentes du script) : retirée si elle existe.
drop function if exists public.is_throttled();
drop function if exists public.log_failure();

-- ---------- Fonctions publiques (appelées par l'app) ----------
-- Elles renvoient { ok, error } au lieu de lever une exception : ainsi
-- l'enregistrement des échecs n'est jamais annulé. « Code inconnu » et
-- « code faux » donnent la même réponse : rien n'est révélé.

-- Enregistre un code généré par le téléphone. Limite : 20 enregistrements / heure / source.
create or replace function public.backup_register(p_code text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v timestamptz;
begin
  if public.norm_code(p_code) !~ '^[A-HJ-NP-Z2-9]{12}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;
  if public.is_throttled('register', 20, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  if pg_column_size(p_data) > 1000000 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  perform public.log_attempt('register');
  insert into public.backups(code_hash, data, schema_version)
  values (public.code_hash(p_code), p_data, coalesce((p_data->>'schemaVersion')::int, 1))
  on conflict (code_hash) do nothing
  returning updated_at into v;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'code_taken');
  end if;
  return jsonb_build_object('ok', true, 'updated_at', v);
end $$;

-- Lit la sauvegarde d'un code. Limite : 10 échecs / minute / source.
create or replace function public.backup_load(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r public.backups;
begin
  if public.is_throttled('fail', 10, interval '1 minute') then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  select * into r from public.backups where code_hash = public.code_hash(p_code);
  if not found then
    perform public.log_attempt('fail');
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  return jsonb_build_object('ok', true, 'data', r.data, 'updated_at', r.updated_at);
end $$;

-- Remplace la sauvegarde, sauf si quelqu'un (un autre appareil) a écrit depuis
-- p_base_updated_at : on renvoie alors « conflict » avec la version serveur, à fusionner.
create or replace function public.backup_save(p_code text, p_data jsonb, p_base_updated_at timestamptz) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r public.backups; v timestamptz;
begin
  if public.is_throttled('fail', 10, interval '1 minute') then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  if pg_column_size(p_data) > 1000000 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  select * into r from public.backups where code_hash = public.code_hash(p_code) for update;
  if not found then
    perform public.log_attempt('fail');
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if p_base_updated_at is not null and r.updated_at > p_base_updated_at then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'data', r.data, 'updated_at', r.updated_at);
  end if;
  update public.backups
     set data = p_data,
         schema_version = coalesce((p_data->>'schemaVersion')::int, schema_version),
         updated_at = now()
   where code_hash = r.code_hash
  returning updated_at into v;
  return jsonb_build_object('ok', true, 'updated_at', v);
end $$;

-- ---------- Droits ----------
revoke all on function public.norm_code(text), public.code_hash(text), public.client_ip_hash(),
  public.is_throttled(text, int, interval), public.log_attempt(text)
  from public, anon, authenticated;
revoke all on function public.backup_register(text, jsonb), public.backup_load(text),
  public.backup_save(text, jsonb, timestamptz) from public, authenticated;
grant execute on function public.backup_register(text, jsonb), public.backup_load(text),
  public.backup_save(text, jsonb, timestamptz) to anon;
