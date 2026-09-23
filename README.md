# Marthi Totem API

Backend da aplicação de totem para venda de produtos e operações de PDV. O projeto nasceu modular para crescer com catálogo, pedidos, pagamentos, dispositivos de totem e relatórios sem reescrever a base.

## Stack

- Node.js 20+
- NestJS 11
- TypeScript
- Prisma + PostgreSQL
- JWT HS256 (7 dias, contrato da UI)
- Swagger em `/api/v1/docs`

## Estrutura

```
src/                      código da API
config/                   eslint e prettier
docker/                   postgres local
prisma/                   schema, migrations e seed
```

Na raiz ficam só os arquivos que as ferramentas exigem (`package.json`, `tsconfig`, `nest-cli`, `.gitignore`, `.env.example`).

Rotas privadas exigem Bearer token. Rotas públicas: auth providers/login/google, cadastro de parceiro, health, catálogo `/products`, `POST /api/v1/totem/leads` (fila PDV) e `POST /api/v1/totem/analytics/clicks`.

## Deploy Discloud (Site público)

App alvo: Site `ID=marthi-backend` → `https://marthi-backend.discloud.app`

1. ZIP da raiz do repo (`discloud.config`, `package.json`, `index.js`, `src/`, `prisma/`). Não inclua `dist/` nem `node_modules/`.
2. O `MAIN` é `src/main.ts`. A Discloud gera `dist/main.js` no `BUILD` e sobe com `npm run start`.
3. Dashboard → **+ Upload** como **Site** (não reusar o Bot numérico só com Commit)
4. Domínios: `marthi-backend` → **Em uso**
5. Variáveis (mínimo):

```text
DATABASE_URL=postgresql://...@...:5432/MarthiDB?schema=public
JWT_SECRET=...
CORS_ORIGINS=https://marthi-totem.discloud.app,http://localhost:5173
PORT=8080
API_PREFIX=api/v1
GOOGLE_CLIENT_ID=...
AUTH_DEV_EMAIL=teste@marthi.com.br
AUTH_DEV_PASSWORD=123
```

6. Aceite: `GET https://marthi-backend.discloud.app/health` → `database.connected: true`

O front (`Marthi-Tec`) deve buildar com `VITE_API_URL=https://marthi-backend.discloud.app`. Ver `docs/specs/backend-nest-wiring.md` no monorepo da plataforma.

## Pré-requisitos

- Node.js >= 20
- PostgreSQL 16 (local ou via Docker)

```bash
npm run docker:up
```

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

A API sobe em `http://localhost:8080`. Health em `/health`, restante em `/api/v1`.

O seed cria a loja **Cell Ponto** e o usuário de painel:

- e-mail: `teste@marthi.com.br`
- senha: `123`

Altere esses valores em produção. Os secrets JWT no `.env` também precisam ser trocados.

## Autenticação

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET` | `/api/v1/auth/providers` | público |
| `POST` | `/api/v1/auth/login` | público |
| `POST` | `/api/v1/auth/google` | público |
| `GET` | `/api/v1/auth/me` | Bearer token |
| `POST` | `/api/v1/partners/signup` | público |
| `GET` | `/api/v1/partners/signup/pending` | Bearer token |
| `GET` | `/api/v1/products` | público (totem) |
| `GET` | `/api/v1/products/:id` | público |
| `GET` | `/api/v1/products/:id/images` | público |
| `GET` | `/api/v1/products/:id/variants` | público |
| `GET` | `/health` | público |
| `POST` | `/api/v1/totem/leads` | público (cria ticket `open` na Cell Ponto) |
| `POST` | `/api/v1/totem/analytics/clicks` | público (clique de produto na Cell Ponto) |
| `GET` | `/api/v1/docs` | Swagger |

JWT único, 7 dias. Resposta de login no contrato da UI:

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": "password:teste@marthi.com.br",
      "email": "teste@marthi.com.br",
      "name": "Marthi Teste",
      "picture": null,
      "provider": "password"
    }
  }
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "teste@marthi.com.br",
  "password": "123"
}
```

Rotas autenticadas enviam:

```http
Authorization: Bearer <token>
```

## Fase 3 P0 — Registry + fila totem/PDV

Leads do totem e tickets da fila passam a ser o Nest (`https://marthi-backend.discloud.app`). O Site totem **não** precisa mais do Express para `/totem/leads` e `/pos/tickets`.

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET/POST` | `/api/v1/sellers` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/sellers/:id` | Bearer (DELETE = `active=false`) |
| `GET/POST` | `/api/v1/suppliers` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/suppliers/:id` | Bearer |
| `GET/POST` | `/api/v1/employees` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/employees/:id` | Bearer |
| `GET` | `/api/v1/me/access` | Bearer `{ role, accessAreas, employeeId?, sellerId? }` |
| `POST` | `/api/v1/totem/leads` | público |
| `GET` | `/api/v1/pos/tickets` | Bearer (`data.items`, query `status?`) |
| `GET/PATCH` | `/api/v1/pos/tickets/:id` | Bearer |
| `POST` | `/api/v1/pos/tickets` | Bearer (source `manual`) |

`POST /api/v1/pos/sales` com `ticketId` marca o ticket `sold` + `closedAt` na mesma transação.

Seed P0: `EMP-ADMIN` (`teste@marthi.com.br`, todas as áreas), `EMP-ANA`, `VEN-BRUNO`, `FOR-CELSUL`.

## Fase 3 P1 — Livro financeiro + almoxarifado + notas de estoque

Domínio separado de `GET/POST /finance` (extrato de caixa lógico). Saldo de conta é **derivado** (`initialBalance` + tesouraria ± baixas).

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET/POST` | `/api/v1/bank-accounts` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/bank-accounts/:id` | Bearer (DELETE = `active=false`) |
| `GET/POST` | `/api/v1/payables` | Bearer (`status?`, `from?`, `to?`) |
| `GET/PATCH` | `/api/v1/payables/:id` | Bearer |
| `POST` | `/api/v1/payables/:id/pay` | Bearer `{ amount, accountId?, at? }` |
| `GET/POST` | `/api/v1/receivables` | Bearer |
| `GET/PATCH` | `/api/v1/receivables/:id` | Bearer |
| `POST` | `/api/v1/receivables/:id/receive` | Bearer |
| `GET/POST` | `/api/v1/treasury` | Bearer |
| `GET/POST` | `/api/v1/advances` | Bearer |
| `POST` | `/api/v1/advances/:id/apply` · `/refund` | Bearer |
| `GET/POST` | `/api/v1/warehouses` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/warehouses/:id` | Bearer |
| `GET/POST` | `/api/v1/lots` | Bearer (`stockId?`) |
| `PATCH` | `/api/v1/lots/:id` | Bearer `{ qty }` |
| `GET/POST` | `/api/v1/kits` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/kits/:id` | Bearer |
| `GET/POST` | `/api/v1/warehouse-moves` | Bearer (POST ajusta estoque/lote) |
| `GET/POST` | `/api/v1/stock-invoices` | Bearer (`kind?`, `status?`) |
| `GET/PATCH` | `/api/v1/stock-invoices/:id` | Bearer (PATCH só `draft`) |
| `POST` | `/api/v1/stock-invoices/:id/lines` | Bearer |
| `DELETE` | `/api/v1/stock-invoices/:id/lines/:lineId` | Bearer |
| `POST` | `/api/v1/stock-invoices/:id/post` | Bearer (entrada `qty+=`, saída `qty-=`) |
| `POST` | `/api/v1/stock-invoices/:id/cancel` | Bearer (estorna se `posted`) |

`POST /stock` e `PATCH /stock/:id` validam `warehouseId` se informado.

Seed P1: almoxarifados `ALX-01` (Loja) e `ALX-BANC` (Bancada OS); contas `ACC-CAIXA` (Caixa loja) e `ACC-OPER` (Conta operacional).

## Fase 3 P2 — Caixa PDV + cadastro fiscal

Sem transmissão SEFAZ. No máximo **1 sessão `open` por loja**. `POST /pos/sales` lança movimento `sale` na sessão aberta (mesma transação).

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET` | `/api/v1/cash/sessions` · `/cash/sessions/open` · `/cash/sessions/:id` | Bearer |
| `POST` | `/api/v1/cash/sessions/open` | Bearer `{ openingFloat, operatorName }` |
| `POST` | `/api/v1/cash/sessions/:id/aporte` · `/sangria` · `/drawer` | Bearer |
| `POST` | `/api/v1/cash/sessions/:id/close` | Bearer `{ countedCash, operatorName }` |
| `POST` | `/api/v1/cash/sessions/:id/reopen` | Bearer |
| `GET/POST` | `/api/v1/cash/credits` | Bearer |
| `POST` | `/api/v1/cash/credits/:id/use` | Bearer `{ amount }` |
| `GET/POST` | `/api/v1/cash/exchanges` | Bearer (`settleAs`: `cash` \| `credit`) |
| `GET/POST` | `/api/v1/fiscal-classifications` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/fiscal-classifications/:id` | Bearer |
| `GET/POST` | `/api/v1/cfops` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/cfops/:id` | Bearer |
| `GET/POST` | `/api/v1/fecps` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/fecps/:id` | Bearer |
| `GET/PUT` | `/api/v1/fiscal/issuer-settings` | Bearer |
| `GET/POST` | `/api/v1/fiscal/logs` | Bearer (cap 400) |
| `GET/PUT` | `/api/v1/fiscal/tax-tables` | Bearer |
| `POST` | `/api/v1/fiscal/tax-tables/sync` | Bearer (stub) |

`certificatePassword` e `cscToken` são aceitos no PUT e gravados com AES-256-GCM (`CREDENTIALS_SECRET` ou `JWT_SECRET`). O GET **não** devolve a senha nem o token (campos vazios + `hasCertificatePassword` / `hasCscToken`). Sync SVRS só tenta a API se `FISCAL_TAX_SYNC=true` (default off).

`POST /stock` e `PATCH /stock/:id` validam `fiscalClassificationId` se informado.

Seed P2: settings do emissor (homologação, defaults vazios) + CST/cClassTrib mínimos. Sem sessão de caixa.

## Fase 3 P3 — CRM + e-commerce (stubs, sem OAuth)

Sem seed `CRM-MOCK-*` e sem pedidos fake de marketplace.

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET/POST` | `/api/v1/crm/leads` | Bearer (`stage?`) |
| `GET/PATCH` | `/api/v1/crm/leads/:id` | Bearer |
| `POST` | `/api/v1/crm/leads/:id/claim` | Bearer `{ sellerId }` exclusivo |
| `POST` | `/api/v1/crm/leads/:id/move` | Bearer `{ stage, sellerId? }` |
| `GET/POST` | `/api/v1/crm/leads/:id/activities` | Bearer |
| `GET/POST` | `/api/v1/crm/leads/:id/messages` | Bearer |
| `GET/PUT` | `/api/v1/crm/profiles/:sellerId` | Bearer |
| `GET/POST` | `/api/v1/crm/messages/sellers` | Bearer (`sellerA` + `sellerB`) |
| `GET` | `/api/v1/ecommerce/channels` | Bearer |
| `GET/PUT` | `/api/v1/ecommerce/channels/:id` | Bearer |
| `POST` | `/api/v1/ecommerce/channels/:id/connect` · `/disconnect` · `/sync` | Bearer |
| `GET/POST` | `/api/v1/ecommerce/listings` | Bearer |
| `GET/PATCH/DELETE` | `/api/v1/ecommerce/listings/:id` | Bearer |
| `GET` | `/api/v1/ecommerce/orders` | Bearer |

Credenciais de canal são AES-256-GCM (`CREDENTIALS_SECRET` / `JWT_SECRET`). Connect/sync são stubs (sem OAuth real). `channelId`: `mercadolivre` \| `shopee` \| `ifood` \| `amazon` \| `tray`.

Seed P3: 5 canais desconectados. Sem leads mock.

## Fase 3 P4 — Auditoria + analytics totem

Sem interceptor de mutações (o painel envia `POST /audit`). Sem seed de eventos.

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET` | `/api/v1/audit` | Bearer (`kind?`, `from?`, `to?`, `q?`; cap 400) |
| `POST` | `/api/v1/audit` | Bearer `{ kind, action, actorName?, actorEmail?, detail?, path? }` |
| `POST` | `/api/v1/totem/analytics/clicks` | público `{ productId, productName }` → Cell Ponto |
| `GET` | `/api/v1/totem/analytics/summary` | Bearer (ranking dia+total, stats do dia) |

IDs `AUD-` e `CLK-`. Audit podado em 400 por loja; cliques em 2000. Dia civil em `America/Sao_Paulo`. Summary inclui `ranking`, `clicksToday`, `clicksTotal`, `proposalsToday`, `soldToday`, `openToday`, `uniqueBuyersToday`, `buyersToday`.

Fase 3 no backend está completa (P0–P4). Próximo passo: wire no Frontend (tirar `localStorage` dessas stores).

## Scripts

| Script | Uso |
| --- | --- |
| `npm run start:dev` | desenvolvimento com watch |
| `npm run build` | compilação |
| `npm run start:prod` | execução do build |
| `npm run prisma:migrate` | migration de desenvolvimento |
| `npm run prisma:deploy` | aplica migrations |
| `npm run prisma:seed` | loja Cell Ponto, catálogo e usuário de painel |
| `npm run prisma:studio` | interface do banco |
| `npm run docker:up` | sobe o PostgreSQL |
| `npm run docker:down` | derruba o PostgreSQL |

## Próximos passos

- Wire no Frontend das stores P0–P4 (registry, fila, livro, caixa, fiscal, CRM, e-com, audit, analytics).
- Fora desta fase: SEFAZ real, OAuth de marketplaces.
