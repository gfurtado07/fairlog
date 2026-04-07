-- ====================================================================
-- FAIRLOG SUPABASE SETUP
-- Complete SQL setup for FairLog project
-- ====================================================================

-- ====================================================================
-- SEÇÃO 1: TABELAS PRINCIPAIS
-- Define a estrutura de dados completa do FairLog
-- ====================================================================

-- TABELA: events
-- Armazena informações dos eventos/feiras onde produtos são encontrados
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  country text,
  currency text default 'USD',
  start_date date,
  end_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- TABELA: event_members
-- Define membros de cada evento e seus papéis (member, admin, etc)
create table if not exists event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references auth.users(id),
  role text default 'member',
  invited_email text,
  joined_at timestamptz default now()
);

-- TABELA: suppliers
-- Armazena informações de fornecedores encontrados em eventos
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  stand_number text,
  country text,
  category text,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_wechat text,
  website text,
  rating integer check (rating between 1 and 5),
  notes text,
  photos text[],
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- TABELA: products
-- Armazena informações de produtos de fornecedores
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  tags text[],
  photos text[],
  price_unit numeric,
  price_fob numeric,
  currency text default 'USD',
  moq integer,
  lead_time text,
  payment_terms text,
  variations text,
  dimensions text,
  weight text,
  rating integer check (rating between 1 and 5),
  notes text,
  is_shortlisted boolean default false,
  shortlist_status text default 'new',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- TABELA: product_comments
-- Armazena comentários de usuários sobre produtos
create table if not exists product_comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references auth.users(id),
  content text not null,
  created_at timestamptz default now()
);

-- TABELA: profiles
-- Armazena dados de perfil de usuários
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- ====================================================================
-- SEÇÃO 2: ROW LEVEL SECURITY (RLS)
-- Define políticas de segurança e controle de acesso baseado em linhas
-- ====================================================================

-- HABILITAR RLS EM TODAS AS TABELAS
alter table events enable row level security;
alter table event_members enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table product_comments enable row level security;
alter table profiles enable row level security;

-- ===== POLÍTICAS PARA A TABELA: events =====
-- Usuários podem ler eventos dos quais são membros
create policy "Usuários podem ler seus eventos"
  on events for select
  using (
    auth.uid() in (
      select user_id from event_members where event_id = events.id
    ) or created_by = auth.uid()
  );

-- Usuários podem criar eventos
create policy "Usuários autenticados podem criar eventos"
  on events for insert
  with check (auth.uid() = created_by);

-- Apenas criador pode atualizar seu evento
create policy "Criador pode atualizar seu evento"
  on events for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Apenas criador pode deletar seu evento
create policy "Criador pode deletar seu evento"
  on events for delete
  using (auth.uid() = created_by);

-- ===== POLÍTICAS PARA A TABELA: event_members =====
-- Usuários podem ler membros de eventos que pertencem
create policy "Ler membros de eventos do usuário"
  on event_members for select
  using (
    auth.uid() in (
      select user_id from event_members em2 where em2.event_id = event_members.event_id
    ) or user_id = auth.uid()
  );

-- Apenas admins do evento podem adicionar membros
create policy "Admin pode adicionar membros"
  on event_members for insert
  with check (
    exists (
      select 1 from event_members em2
      where em2.event_id = event_members.event_id
      and em2.user_id = auth.uid()
      and em2.role = 'admin'
    ) or
    exists (
      select 1 from events e
      where e.id = event_members.event_id
      and e.created_by = auth.uid()
    )
  );

-- Apenas admins podem atualizar membros
create policy "Admin pode atualizar membros"
  on event_members for update
  using (
    exists (
      select 1 from event_members em2
      where em2.event_id = event_members.event_id
      and em2.user_id = auth.uid()
      and em2.role = 'admin'
    ) or
    exists (
      select 1 from events e
      where e.id = event_members.event_id
      and e.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from event_members em2
      where em2.event_id = event_members.event_id
      and em2.user_id = auth.uid()
      and em2.role = 'admin'
    ) or
    exists (
      select 1 from events e
      where e.id = event_members.event_id
      and e.created_by = auth.uid()
    )
  );

-- ===== POLÍTICAS PARA A TABELA: suppliers =====
-- Usuários podem ler fornecedores de eventos que pertencem
create policy "Ler fornecedores de seus eventos"
  on suppliers for select
  using (
    auth.uid() in (
      select user_id from event_members where event_id = suppliers.event_id
    )
  );

-- Usuários podem criar fornecedores em seus eventos
create policy "Criar fornecedores em seus eventos"
  on suppliers for insert
  with check (
    auth.uid() in (
      select user_id from event_members where event_id = suppliers.event_id
    )
  );

-- Usuários podem atualizar fornecedores que criaram
create policy "Atualizar fornecedores criados por você"
  on suppliers for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Usuários podem deletar fornecedores que criaram
create policy "Deletar fornecedores criados por você"
  on suppliers for delete
  using (auth.uid() = created_by);

-- ===== POLÍTICAS PARA A TABELA: products =====
-- Usuários podem ler produtos de eventos que pertencem
create policy "Ler produtos de seus eventos"
  on products for select
  using (
    auth.uid() in (
      select user_id from event_members where event_id = products.event_id
    )
  );

-- Usuários podem criar produtos em eventos que pertencem
create policy "Criar produtos em seus eventos"
  on products for insert
  with check (
    auth.uid() in (
      select user_id from event_members where event_id = products.event_id
    )
  );

-- Usuários podem atualizar produtos que criaram
create policy "Atualizar produtos criados por você"
  on products for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Usuários podem deletar produtos que criaram
create policy "Deletar produtos criados por você"
  on products for delete
  using (auth.uid() = created_by);

-- ===== POLÍTICAS PARA A TABELA: product_comments =====
-- Usuários podem ler comentários de produtos em seus eventos
create policy "Ler comentários de produtos em seus eventos"
  on product_comments for select
  using (
    auth.uid() in (
      select em.user_id from event_members em
      join products p on p.event_id = em.event_id
      where p.id = product_comments.product_id
    )
  );

-- Usuários podem criar seus próprios comentários
create policy "Criar comentários em produtos do seu evento"
  on product_comments for insert
  with check (
    auth.uid() = user_id and
    auth.uid() in (
      select em.user_id from event_members em
      join products p on p.event_id = em.event_id
      where p.id = product_comments.product_id
    )
  );

-- Usuários podem atualizar seus próprios comentários
create policy "Atualizar seus comentários"
  on product_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Usuários podem deletar seus próprios comentários
create policy "Deletar seus comentários"
  on product_comments for delete
  using (auth.uid() = user_id);

-- ===== POLÍTICAS PARA A TABELA: profiles =====
-- Qualquer usuário autenticado pode ler todos os perfis
create policy "Usuários podem ler todos os perfis"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Usuários podem atualizar apenas seu próprio perfil
create policy "Usuários podem atualizar seu próprio perfil"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ====================================================================
-- SEÇÃO 3: STORAGE (Armazenamento de Arquivos)
-- Configuração de buckets para fotos e arquivos
-- ====================================================================

-- Criar bucket 'fairlog-photos' para armazenar fotos
-- Este bucket é criado via Dashboard do Supabase ou via REST API
-- Para criar via SQL, use o painel de controle do Supabase

-- ===== POLÍTICAS DE STORAGE =====
-- Política: Usuários autenticados podem fazer upload de fotos
-- Política: Qualquer pessoa pode ler (visualizar) fotos
-- Estas políticas devem ser configuradas no painel Storage do Supabase

-- ====================================================================
-- SEÇÃO 4: REALTIME
-- Habilita atualizações em tempo real para tabelas específicas
-- ====================================================================

-- Habilitar Realtime para a tabela suppliers
alter publication supabase_realtime add table suppliers;

-- Habilitar Realtime para a tabela products
alter publication supabase_realtime add table products;

-- Habilitar Realtime para a tabela product_comments
alter publication supabase_realtime add table product_comments;

-- ====================================================================
-- SEÇÃO 5: INDEXES (Índices para Performance)
-- Cria índices para acelerar queries comuns
-- ====================================================================

-- Índice para buscar fornecedores por evento
create index if not exists idx_suppliers_event_id on suppliers(event_id);

-- Índice para buscar produtos por fornecedor
create index if not exists idx_products_supplier_id on products(supplier_id);

-- Índice para buscar produtos por evento
create index if not exists idx_products_event_id on products(event_id);

-- Índice para buscar comentários por produto
create index if not exists idx_product_comments_product_id on product_comments(product_id);

-- Índice para buscar membros de evento por event_id e user_id
create index if not exists idx_event_members_event_user on event_members(event_id, user_id);

-- ====================================================================
-- SEÇÃO 6: FUNÇÕES E TRIGGERS
-- Funções automáticas para manter dados sincronizados
-- ====================================================================

-- FUNÇÃO: Criar perfil automaticamente ao registrar novo usuário
-- Executada sempre que um novo usuário é criado na tabela auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- TRIGGER: Chamar função de criação de perfil após inserção de novo usuário
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ====================================================================
-- SEÇÃO 7: COMENTÁRIOS FINAIS
-- ====================================================================

-- Este arquivo SQL contém toda a configuração necessária para o FairLog
-- Instruções para usar:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para a seção "SQL Editor"
-- 3. Cole todo o conteúdo deste arquivo
-- 4. Clique em "Run" para executar
-- 5. Crie o bucket 'fairlog-photos' manualmente no painel Storage
-- 6. Configure as políticas de Storage conforme necessário

-- Para criar o bucket 'fairlog-photos' via Dashboard:
-- 1. Vá em Storage → New Bucket
-- 2. Nome: fairlog-photos
-- 3. Defina como público para leitura
-- 4. Adicione políticas de segurança para upload (usuários autenticados)

-- Fim do arquivo de setup
