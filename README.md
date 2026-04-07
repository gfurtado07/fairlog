# FairLog — Catálogo de Feiras Internacionais

PWA para catalogação de fornecedores e produtos em feiras de negócios internacionais.

## Setup Rápido

### 1. Instalar dependências

```bash
cd fairlog
npm install
```

### 2. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Abra o **SQL Editor** do Supabase
3. Cole e execute todo o conteúdo do arquivo `supabase-setup.sql`
4. Vá em **Storage** e crie um bucket chamado `fairlog-photos` com acesso público
5. Vá em **Database > Replication** e habilite Realtime para: `suppliers`, `products`, `product_comments`

### 3. Configurar variáveis de ambiente

Edite o arquivo `.env` na raiz do projeto:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 4. Rodar o projeto

```bash
npm run dev
```

O app estará disponível em `http://localhost:5173`

### 5. Deploy na Vercel

```bash
npm run build
```

O projeto já está configurado com `vercel.json` para deploy direto:

```bash
npx vercel --prod
```

## Estrutura do Projeto

```
src/
  components/
    ui/          ← Componentes reutilizáveis (Button, Input, StarRating, etc.)
    layout/      ← Layout (Header, BottomNav, PageWrapper)
  pages/         ← Todas as telas do app
  lib/           ← Utilitários (Supabase, Dexie, sync, export, imagens)
  hooks/         ← Hooks customizados (auth, offline sync, realtime)
  context/       ← Contextos React (Auth, Sync)
```

## Funcionalidades

- Login/cadastro com Supabase Auth
- CRUD de eventos, fornecedores e produtos
- Upload de fotos (câmera do celular)
- Funciona 100% offline (Dexie.js + sync queue)
- Colaboração em tempo real (Supabase Realtime)
- Shortlist com status (novo, amostra pedida, cotação, aprovado, descartado)
- Busca e filtros avançados
- Exportação Excel (.xlsx) e PDF
- Convite de membros por e-mail
- PWA instalável em iOS e Android
- Dark theme com acento âmbar
