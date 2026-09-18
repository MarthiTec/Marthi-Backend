# Marthi Totem API

Backend da aplicação de totem para venda de produtos e operações de PDV. O projeto nasceu modular para crescer com catálogo, pedidos, pagamentos, dispositivos de totem e relatórios sem reescrever a base.

## Stack

- Node.js 20+
- NestJS 11
- TypeScript
- Prisma + PostgreSQL
- JWT (access + refresh)
- Swagger em `/api/v1/docs`

## Estrutura

```
src/
  main.ts                 bootstrap da API
  app.module.ts
  config/                 validação de variáveis de ambiente
  common/                 guards, filters, interceptors, decorators
  prisma/                 conexão com o banco
  modules/
    auth/                 autenticação
    users/                usuários
    health/               healthcheck
prisma/
  schema.prisma
  migrations/
  seed.ts
```

Papéis previstos: `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `KIOSK`.

Rotas privadas exigem Bearer token. Rotas públicas usam `@Public()`. Restrição por papel usa `@Roles()`.

## Pré-requisitos

- Node.js >= 20
- PostgreSQL 16 (local ou via Docker)

```bash
docker compose up -d
```

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

A API sobe em `http://localhost:3000/api/v1`.

O seed cria o admin padrão:

- e-mail: `admin@marthi.local`
- senha: `Admin@123`

Altere esses valores em produção. Os secrets JWT no `.env` também precisam ser trocados.

## Autenticação

| Método | Rota | Acesso |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | público |
| `POST` | `/api/v1/auth/login` | público |
| `POST` | `/api/v1/auth/refresh` | público |
| `POST` | `/api/v1/auth/logout` | público |
| `GET` | `/api/v1/auth/me` | Bearer token |
| `GET` | `/api/v1/health` | público |
| `GET` | `/api/v1/docs` | Swagger |

O primeiro usuário cadastrado vira `SUPER_ADMIN`. Os seguintes nascem como `OPERATOR`, enquanto `ENABLE_PUBLIC_REGISTER=true`.

Access token: 15 minutos. Refresh token: 7 dias, armazenado com hash e rotacionado a cada uso.

### Cadastro

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "operador@marthi.local",
  "name": "Operador Totem",
  "password": "SenhaForte@123"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@marthi.local",
  "password": "Admin@123"
}
```

Resposta no formato:

```json
{
  "success": true,
  "data": {
    "user": {},
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  },
  "timestamp": "..."
}
```

Rotas autenticadas enviam:

```http
Authorization: Bearer <accessToken>
```

## Scripts

| Script | Uso |
| --- | --- |
| `npm run start:dev` | desenvolvimento com watch |
| `npm run build` | compilação |
| `npm run start:prod` | execução do build |
| `npm run prisma:migrate` | migration de desenvolvimento |
| `npm run prisma:deploy` | aplica migrations |
| `npm run prisma:seed` | popula o admin inicial |
| `npm run prisma:studio` | interface do banco |

## Próximos módulos

- Catálogo (categorias, produtos, preços)
- Dispositivo do totem
- Pedidos e carrinho
- Pagamentos
- Estoque
- Relatórios
