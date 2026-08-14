# Planejamento Motorista

Aplicativo web para motoristas de aplicativo (Uber, 99) registrarem **ganhos**, **gastos** e definirem **metas** de planejamento financeiro diária, semanal e mensal.

## Funcionalidades

- **Login e cadastro** por e-mail (autenticação via Supabase)
- **Ganhos**: registro por plataforma (Uber, 99, Outra), com data, valor, quantidade de corridas e descrição
- **Gastos**: categorias de Combustível, Manutenção, Pneus, Alimentação e Outros
- **Metas**: defina metas de ganho diária, semanal e mensal e acompanhe o progresso
- **Dashboard**: resumo do dia, da semana e do mês, gráfico de ganhos/gastos dos últimos 7 dias e gráfico de gastos por categoria

## Tecnologias

- React + TypeScript + Vite
- React Router
- Recharts (gráficos)
- Supabase (autenticação + banco PostgreSQL na nuvem)

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta/projeto gratuito.
2. No painel do projeto, abra o **SQL Editor**.
3. Copie o conteúdo de `supabase/schema.sql` e execute (cria as tabelas `ganhos`, `gastos`, `metas`, índices e políticas de segurança).

### 3. Configurar as credenciais

1. No painel do Supabase, acesse **Project Settings → API**.
2. Copie o **Project URL** e a **anon public key**.
3. Crie um arquivo `.env` na raiz do projeto (veja `.env.example`):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

4. Em **Authentication → Providers**, confirme que o login por **Email** está habilitado. Para desenvolvimento rápido, você pode desativar "Confirm email".

### 4. Rodar o app

```bash
npm run dev
```

Acesse `http://localhost:5173`.

## Comandos úteis

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run preview  # visualizar o build
npm run lint     # verificação de código (oxlint)
```

## Publicação

Para publicar, faça o build (`npm run build`) e envie a pasta `dist/` para qualquer hospedagem estática (Vercel, Netlify, Cloudflare Pages, etc.).
