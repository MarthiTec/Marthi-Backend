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

Rotas privadas exigem Bearer token. Rotas públicas: auth providers/login/google, cadastro de parceiro e health.

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
| `GET` | `/api/v1/products` | Bearer token |
| `GET` | `/health` | público |
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

- Fila PDV / totem leads
- Clientes, estoque, tabelas e pagamentos
- `POST /pos/sales` transacional
- Ordens de serviço + ledger
- Plano, totem settings e perfil do operador
