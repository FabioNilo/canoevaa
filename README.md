# ILHÉUS CANOE VA'A

MVP essencial em Next.js para catálogo de experiências, reserva, pagamento mock e admin mínimo de reservas + agenda.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma 7
- PostgreSQL
- Auth.js com credenciais
- Vitest
- Playwright

## Rodar local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Sem `DATABASE_URL`, as APIs usam mocks internos para manter o front navegável. Com banco configurado, os repositories passam a usar Prisma/PostgreSQL.

## Banco local

O projeto inclui `compose.yml` para subir PostgreSQL local com Docker:

```bash
docker compose up -d postgres
```

Depois:

1. Copie `.env.example` para `.env`, se ainda não existir.
2. Ajuste `DATABASE_URL`, se necessário.
3. Rode:

```bash
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

Para conferir se o banco está atualizado:

```bash
npx prisma migrate status
```

Admin de desenvolvimento:

```txt
admin@ilheus.local
admin123
```

## Fluxos principais

- `/` catálogo público
- `/experiencias/[slug]` detalhe com galeria
- `/reserva` fluxo de reserva
- `/reserva/confirmada` confirmação
- `/associado/login` login administrativo
- `/admin` reservas, agenda e permissões

## Checklist de qualidade

Após cada etapa:

```bash
npm run lint
npm run test
npm run build
```

Para E2E:

```bash
npm run test:e2e
```

## Ordem de implementação

1. Corrigir base técnica e encoding.
2. Adicionar Prisma/PostgreSQL.
3. Modelar schema e seeds.
4. Migrar experiências e galeria para banco.
5. Migrar agenda/disponibilidade.
6. Implementar reserva transacional.
7. Implementar Auth.js e proteger admin/API.
8. Implementar payment adapter mock.
9. Implementar cancelamento configurável.
10. Implementar admin reservas + agenda.
11. Adicionar Vitest e testes de domínio/API.
12. Adicionar Playwright e testes E2E.
13. Preparar deploy e documentação.
