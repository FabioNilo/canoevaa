# Pontal Va'a

Aplicação web para apresentação, reserva e gestão de experiências de canoa em Ilhéus, Bahia.

## Visão geral

Este projeto foi desenvolvido para:

- exibir experiências de passeios em mar e manguezal
- divulgar os passeios com fotos, descrições e regras
- permitir o fluxo de reserva do cliente
- controlar agenda e disponibilidade
- gerenciar canoas e experiências no painel administrativo
- autenticar usuários do painel admin

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Auth.js
- Vitest
- Playwright

## Requisitos

- Node.js 20+
- npm
- Docker (opcional, para rodar o banco localmente)
- Git

## Instalação

```bash
git clone <url-do-repositorio>
cd na-kai-canoa
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` com base no `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ilheus_canoe?schema=public"
AUTH_SECRET="troque-por-um-segredo-grande-em-producao"
NEXTAUTH_URL="http://localhost:3000"

ADMIN_EMAIL="admin@ilheus.local"
ADMIN_PASSWORD="admin123"

PAYMENT_PROVIDER="mock"
PAYMENT_WEBHOOK_SECRET="mock-webhook-secret"
```

## Banco local

### Com Docker

```bash
docker compose up -d
```

### Prisma

```bash
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

Para verificar o estado do banco:

```bash
npx prisma migrate status
```

## Rodar localmente

```bash
npm run dev
```

Acesse:

- http://localhost:3000

## Scripts principais

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:e2e
```

## Funcionalidades

- catálogo público de experiências
- detalhes por passeio
- fluxo de reserva do cliente
- página de confirmação de reserva
- painel administrativo
- criação e edição de passeios
- cadastro e gestão de canoas
- visualização da agenda
- autenticação para admin

## Estrutura principal

```bash
src/
  app/
  components/
  domain/
  lib/
  server/
  services/
prisma/
  schema.prisma
  seed.ts
```

## Credenciais de testes

```txt
admin@ilheus.local
admin123
```

## Deploy na Vercel

1. Envie o projeto para o GitHub.
2. Conecte o repositório na Vercel.
3. Configure as variáveis de ambiente:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `PAYMENT_PROVIDER`
4. Escolha o framework `Next.js`.
5. Faça o deploy.

> Em produção, o banco deve estar em um provedor externo como Neon, Supabase, Railway, Render ou outro PostgreSQL gerenciado.

## Status

Projeto em desenvolvimento com base funcional de MVP para gestão de experiências e reservas.

## Licença

Este projeto é privado e destinado ao uso da marca e operação do negócio.
