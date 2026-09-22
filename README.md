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

Rotas privadas exigem Bearer token. Rotas públicas: auth providers/login/google, cadastro de parceiro, health, catálogo `/products` e `POST /api/v1/totem/leads` (fila PDV).

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

## Próximos módulos

- P1: livro financeiro, almoxarifado/lotes/kits, notas de estoque
- P2: caixa, cadastro fiscal
- P3: CRM / e-commerce stubs
- P4: auditoria / analytics totem
