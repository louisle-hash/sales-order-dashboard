create table if not exists public.ai_chat_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  expires_at timestamptz not null
);

create index if not exists ai_chat_rate_limits_expires_at_idx
  on public.ai_chat_rate_limits(expires_at);

alter table public.ai_chat_rate_limits enable row level security;
revoke all on public.ai_chat_rate_limits from public, anon, authenticated;

create or replace function public.consume_ai_chat_quota(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_expires timestamptz;
begin
  if p_bucket_key is null or length(p_bucket_key) > 160
    or p_limit < 1 or p_limit > 1000
    or p_window_seconds < 1 or p_window_seconds > 604800 then
    raise exception 'invalid quota parameters';
  end if;

  delete from public.ai_chat_rate_limits
  where expires_at < v_now - interval '1 day';

  insert into public.ai_chat_rate_limits (
    bucket_key,
    window_started_at,
    request_count,
    expires_at
  ) values (
    p_bucket_key,
    v_now,
    1,
    v_now + make_interval(secs => p_window_seconds)
  )
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when ai_chat_rate_limits.expires_at <= v_now then v_now
      else ai_chat_rate_limits.window_started_at
    end,
    request_count = case
      when ai_chat_rate_limits.expires_at <= v_now then 1
      else ai_chat_rate_limits.request_count + 1
    end,
    expires_at = case
      when ai_chat_rate_limits.expires_at <= v_now
        then v_now + make_interval(secs => p_window_seconds)
      else ai_chat_rate_limits.expires_at
    end
  returning request_count, expires_at into v_count, v_expires;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_expires;
end;
$$;

revoke all on function public.consume_ai_chat_quota(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_ai_chat_quota(text, integer, integer)
  to service_role;
