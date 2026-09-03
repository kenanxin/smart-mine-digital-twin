create extension if not exists "pgcrypto";

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(), key text not null unique,
  name text not null, description text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(), key text not null unique,
  name text not null, description text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique, display_name text not null, organization text not null default '',
  status text not null default 'active' check (status in ('active', 'disabled', 'locked')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_login_at timestamptz
);
create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, role_id)
);
create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
create table if not exists public.roof_events (
  id uuid primary key default gen_random_uuid(), event_id text not null unique, risk_level text not null,
  status text not null default 'open', current_progress integer not null default 0 check (current_progress between 0 and 100),
  updated_at timestamptz not null default now()
);
create table if not exists public.closed_loop_actions (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.roof_events(id) on delete cascade,
  operator_id uuid not null references public.profiles(id), action text not null, comment text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), operator_id uuid references public.profiles(id), action text not null,
  target_type text not null default '', target_id text not null default '', details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

insert into public.roles (key, name, description) values
  ('super_admin', '超级管理员', '管理用户、角色、权限和审计日志'),
  ('enterprise', '企业端', '现场监测和风险处置'),
  ('regulator', '监管端', '区域监管和闭环督办'),
  ('expert', '智库端', '模型解释和风险复盘'),
  ('viewer', '只读用户', '只读访问共享风险数据') on conflict (key) do nothing;

insert into public.permissions (key, name, description) values
  ('roof_risk.read', '查看风险数据', '读取当前风险、历史和模型解释'),
  ('roof_risk.select', '选择事件', '选择共享代表事件'),
  ('closed_loop.advance', '推进闭环', '提交处置或监管复核'),
  ('closed_loop.archive', '归档闭环', '完成监管归档'),
  ('closed_loop.reset', '重置闭环', '重置企业处置状态'),
  ('users.manage', '管理用户', '创建、禁用和重置用户'),
  ('audit.read', '查看审计日志', '查看用户和业务操作日志') on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.key = 'super_admin' on conflict do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.key in ('roof_risk.read', 'roof_risk.select', 'closed_loop.advance', 'closed_loop.reset') where r.key = 'enterprise' on conflict do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.key in ('roof_risk.read', 'roof_risk.select', 'closed_loop.advance', 'closed_loop.archive') where r.key = 'regulator' on conflict do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.key in ('roof_risk.read', 'roof_risk.select') where r.key in ('expert', 'viewer') on conflict do nothing;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.roof_events enable row level security;
alter table public.closed_loop_actions enable row level security;
alter table public.audit_logs enable row level security;

create policy "authenticated users can read roles" on public.roles for select to authenticated using (true);
create policy "authenticated users can read permissions" on public.permissions for select to authenticated using (true);
create policy "users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "users can read own assignments" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "authenticated users can read role permissions" on public.role_permissions for select to authenticated using (true);
create policy "authenticated users can read roof events" on public.roof_events for select to authenticated using (true);
create policy "users can read own loop actions" on public.closed_loop_actions for select to authenticated using (operator_id = auth.uid());
create policy "users can read own audit records" on public.audit_logs for select to authenticated using (operator_id = auth.uid());
