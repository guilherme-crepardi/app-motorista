# AGENTES.md — Planejamento Motorista

Documento de contexto para agentes de IA e novos devs. Resume arquitetura, convenções e funcionalidades do projeto.

## Visão geral

App web PWA para motoristas de aplicativo registrarem ganhos (Uber/99), gastos, manutenções e metas, com cálculo de saldo por dia, semana e mês. Dados persistidos no Supabase (Postgres + Auth + RLS).

- **Stack:** React 19 + TypeScript + Vite 8, React Router 7, Recharts (gráficos), lucide-react (ícones), @supabase/supabase-js.
- **PWA:** `vite-plugin-pwa` (manifest + service worker com `generateSW`); instalável como app no celular (Android e iOS) e funciona offline. Ícones gerados em `public/` (pwa-192/512, maskable, apple-touch).
- **Lint:** oxlint (`npm run lint`). **Build:** `npm run build` (tsc -b && vite build).
- **Dev server:** `npm run dev -- --host 127.0.0.1` (roda em `http://127.0.0.1:5173`).
- **Idioma:** código e UI em português (pt-BR). Formatação de moeda/data via `Intl`.

## Arquitetura

```
src/
  main.tsx                     Entrada: BrowserRouter + AuthProvider + App
  App.tsx                      Definição de rotas (tabela de rotas abaixo)
  index.css                    Estilos globais (CSS puro, tema claro/escuro via [data-theme])
  components/
    Layout.tsx                 Sidebar/nav com itens + botão de tema + logout
    ProtectedRoute.tsx         Redireciona para /login se não autenticado
    Modal.tsx                  Modal reutilizável (open, title, onClose)
    MonthPicker.tsx            Seletor mês + ano (2000–2050)
  contexts/
    AuthContext.tsx            Sessão Supabase (useAuth) + login/logout
  lib/
    supabase.ts                Cliente Supabase (URL + anon key via VITE_*)
    constants.ts               PLATAFORMAS, CATEGORIAS, TIPOS_META, MANUTENCOES_TIPOS, PERIODICIDADES + labels/cores
    utils.ts                   Datas (startOfWeek, lastDayOfMonthISO, todayISO...), moeda, sum, horasToText/textToHoras
    despesasFixas.ts           Cálculo de despesas fixas por período
    theme.ts                   Tema claro/escuro (localStorage + data-theme)
  pages/                       Uma pasta-por-página (Dashboard, Semana, Mes, Ganhos, Gastos, DespesasFixas, Manutencoes, Metas, Login)
  types/index.ts               Tipos de domínio (Ganho, Gasto, DespesaFixa, Meta, Manutencao, etc.)
supabase/
  schema.sql                   Schema completo (recriar banco do zero)
  migrations/                  Migrações incrementais (rodar no SQL Editor do Supabase)
```

### Rotas

| Rota | Página | Observação |
|---|---|---|
| `/` | Dashboard | **Só resumo**: cards hoje/semana/mês, metas, gráficos, resultado do mês. Card "Ganhos do mês" mostra também `Km: X km`. Sem edição de dados. |
| `/semana` | Semana | Totais da semana, plataformas e **dias da semana com horas (1–12) e ganho/hora** |
| `/mes` | Mês | Totais do mês, plataformas, semanas. "Média por dia" = total ÷ dias do mês |
| `/ganhos` | Ganhos | CRUD de ganhos + filtro mês/semana; campos km e horas trabalhadas (**horas em formato `HH:MM`**, ex.: `8:30`) |
| `/gastos` | Gastos | CRUD de gastos + filtro de categoria |
| `/despesas-fixas` | DespesasFixas | CRUD de despesas recorrentes |
| `/manutencoes` | Manutencoes | CRUD de manutenções (pneus, óleo, etc.) + **histórico do ano** ao lado (por mês, total do ano) |
| `/metas` | Metas | Metas diária/semanal/mensal |
| `/historico` | Historico | Resumo mensal dos ganhos (meses anteriores) |
| `/login` | Login | Autenticação Supabase |

### Fluxo de dados

Todas as queries vão direto ao Supabase (sem backend próprio), com RLS por `user_id`. Cada página carrega seus dados com `supabase.from(...).select('*').eq('user_id', user.id)` em `useEffect`. Despesas fixas usam o hook `useDespesasFixas()` (carrega a lista do usuário) + funções puras de cálculo.

## Ganhos e métricas (semana/mês)

- **Tabela `ganhos`:** colunas `data`, `plataforma`, `valor`, `corridas`, `horas_trabalhadas`, `km`, `descricao`. `km` e `horas_trabalhadas` são opcionais (migração 007).
- **Formulário de ganhos (`src/pages/Ganhos.tsx`):** campos Valor, Corridas, **Km rodados** e **Horas trabalhadas**; a tabela mostra coluna Km.
- **Horas trabalhadas (formato `HH:MM`):** o campo aceita dois pontos (`1:20`, `1:25`, `8:30`) ou número inteiro (`8`). O valor digitado é convertido para decimal (horas + minutos÷60) antes de salvar em `horas_trabalhadas`, e o banco continua armazenando decimal. Ao editar, o valor é reconvertido para `HH:MM`. A conversão fica em `src/lib/utils.ts`:
  - `textToHoras(text)` → `number | null`: parseia `"1:20"` → `1.33`, `"8"` → `8`; aceita vírgula como separador alternativo (`replace(',', ':')`).
  - `horasToText(horas)` → `string`: `1.33` → `"1:20"`, `8` → `"8"`, valores nulos/≤0 → `""`.
- **Semana (`src/pages/Semana.tsx`):**
  - Card **"Ganho por hora"** = `totalGanhosSemana ÷ totalHoras` (horas por dia, sem duplicar quando há +1 ganho no dia). Sub mostrando "Média por dia" e total de horas.
  - **"Média por dia"** = `totalGanhos ÷ diasTrabalhados` (dias com ganho > 0), não ÷ 7.
  - **"Dias da semana"**: cada dia mostra ganho, gasto, um **seletor de horas (1–12)** que salva `horas_trabalhadas` em todos os ganhos daquele dia (`setDiaHoras`, update `.in('id', ids)` + reload) e o **ganho/hora do dia** (`ganhosDia ÷ horasDia`). Seletor habilitado só em dias com ganho.
- **Mês (`src/pages/Mes.tsx`):** "Média por dia" = `totalGanhos ÷ daysInMonth` (total de dias do mês).
- **Dashboard (`src/pages/Dashboard.tsx`):** é só resumo. Total de **km do mês** = soma de `km` dos ganhos do mês, exibido no card "Ganhos do mês" ("Gastos: R$X · Km: X km").

## Despesas fixas (feature mais recente)

Cadastro de gastos recorrentes que somam automaticamente nos totais (sem precisar lançar manualmente). Ex.: seguro R$ 10/dia.

- **Tabela:** `despesas_fixas` (`id`, `user_id`, `categoria`, `valor`, `periodicidade`, `descricao`, `ativo`, `created_at`).
- **Periodicidade:** `diaria` (valor × dias do período), `semanal` (valor × semanas), `mensal` (valor × meses).
- **Cálculo:** `src/lib/despesasFixas.ts`
  - `totalFixoPorCategoria(fixas, fromISO, toISO)` / `totalFixo(...)` → totais agregados por período.
  - `fixoDiario(fixas)` → só despesas **diárias**; usado em visões por dia (gráfico de 7 dias, dias da semana, semanas do mês) para não distorcer semanal/mensal.
- **Onde entram:** Gastos (total + cards por categoria + aviso "inclui R$ X automáticos"), Semana, Mês, Dashboard (gastos de hoje, gastos do mês, pizza por categoria, gráfico de 7 dias).
- **Regra:** lançamento manual e fixa automática coexistem; a fixa só soma nos totais (não cria linhas na tabela de gastos).

## Categorias de gasto

`combustivel, manutencao, pneus, alimentacao, seguro, aluguel_carro, aluguel_moto, financiamento_carro, financiamento_moto, outro`

Estão no tipo `CategoriaGasto` e na constante `CATEGORIAS` (label + cor). **Importante:** as tabelas `gastos` e `despesas_fixas` têm `CHECK` no banco com essa lista — ao adicionar categoria, atualizar também o SQL (schema + migração) e rodar no Supabase.

## Banco de dados (Supabase)

Tabelas: `ganhos`, `gastos`, `metas`, `manutencoes`, `despesas_fixas`, `historico_ganhos`, `preferencias`. Todas com RLS habilitado e política "Usuarios acessam suas <tabela>" (`auth.uid() = user_id`).

**Tema (claro/escuro):** salvo por usuário na tabela `preferencias` (`tema`) e sincronizado entre aparelhos. Ao abrir o app, `Layout` busca o tema do usuário (`fetchTema`) e aplica; ao alternar, salva (`salvarTema` via upsert em `user_id`). localStorage (`lib/theme.ts`) serve como cache instantâneo por aparelho.

**Histórico mensal de ganhos:** a tabela `historico_ganhos` guarda um resumo por mês (`mes`, `total`, `total_uber`, `total_99`, `total_outra`, `corridas`, `horas`). `syncHistorico()` em `src/lib/historico.ts` roda ao abrir o app (no Layout) e salva um resumo de cada mês **anterior** ao atual que ainda não tenha registro (backfill cobre meses antigos). A página `/historico` lista os meses com botão "Atualizar".

**Migrações a aplicar no SQL Editor** (manualmente, via interface do Supabase):
- `001_categoria_seguro.sql` — adiciona categoria 'seguro' na constraint de `gastos`.
- `002_tabela_manutencoes.sql` — cria tabela `manutencoes`.
- `003_tabela_despesas_fixas.sql` — cria tabela `despesas_fixas`.
- `004_categorias_aluguel_financiamento.sql` — adiciona aluguel/financiamento (carro/moto) nas constraints de `gastos` e `despesas_fixas`.
- `005_tabela_historico_ganhos.sql` — cria tabela `historico_ganhos` (resumo mensal de ganhos).
- `006_tabela_preferencias.sql` — cria tabela `preferencias` (tema por usuário).
- `007_add_km_ganhos.sql` — adiciona coluna `km` (km rodados) em `ganhos`.

Após rodar SQL que altera schema, o PostgREST precisa recarregar o schema (`notify pgrst, 'reload schema';` — já incluso nos arquivos).

Credenciais em `.env` (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY); `.env.example` como referência. **Nunca commitar o `.env`.**

## Convenções

- Não adicionar comentários no código salvo se pedido.
- Páginas seguem padrão: `useState` para dados/formulário, `Modal` para novo/editar/excluir, botões `btn btn-primary/secondary/danger`, tabelas `.table`, cards `.stat-card`.
- Gráficos Recharts com cores fixas por categoria (ver `constants.ts`).
- `npm run lint` e `npm run build` devem passar antes de concluir mudanças (lint tem 1 warning aceito em `AuthContext.tsx`).
