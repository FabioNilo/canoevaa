# Deploy no EasyPanel (VPS)

App Next.js + Postgres rodando como serviços no EasyPanel, build a partir do
`Dockerfile` na raiz, deploy disparado por `git push`.

## 1. Limpar o repositório antes do primeiro push

`node_modules.zip` (265 MB) está versionado e o `git push` vai falhar (limite de
100 MB por arquivo no GitHub). As 2 últimas commits locais ainda não foram
enviadas, então dá pra achatar sem reescrever histórico remoto:

```bash
git reset --soft origin/main
git rm --cached node_modules.zip
echo "node_modules.zip" >> .gitignore
rm node_modules.zip
git add -A
git commit -m "feat: modulo de associados + setup de deploy"
git push
```

## 2. Criar o projeto e o Postgres

1. EasyPanel → **Create Project** (ex.: `pontal-vaa`).
2. Dentro do projeto → **+ Service → Postgres** (template oficial).
3. Depois de criado, abrir o serviço → aba **Credentials** → copiar a
   **Internal Connection URL**. Fica no formato:
   `postgres://usuario:senha@projeto_postgres:5432/banco`
   Essa URL usa a rede interna do Docker — **não** precisa expor a porta 5432
   para a internet.

## 3. Criar o serviço da aplicação

1. No projeto → **+ Service → App**.
2. **Source**: GitHub → repositório `FabioNilo/canoevaa`, branch `main`
   (autorize o GitHub no EasyPanel se ainda não fez).
3. **Build**: `Dockerfile` (EasyPanel detecta o arquivo na raiz).
4. **Deploy → Port**: `3000`.

## 4. Variáveis de ambiente (aba Environment do serviço App)

```
DATABASE_URL=postgres://usuario:senha@projeto_postgres:5432/banco?schema=public&sslmode=disable
AUTH_SECRET=<gere com: openssl rand -base64 32>
NEXTAUTH_URL=https://SEU-DOMINIO
ADMIN_EMAIL=voce@seudominio.com
ADMIN_PASSWORD=<senha forte>
PAYMENT_PROVIDER=mock
PAYMENT_WEBHOOK_SECRET=<qualquer string longa>
NODE_ENV=production
```

- `DATABASE_URL`: a Internal Connection URL do passo 2 + `?schema=public&sslmode=disable`
  (a rede interna do EasyPanel não usa TLS no Postgres).
- `NEXTAUTH_URL`: precisa ser o domínio **real** com `https://`, senão o login quebra.

## 5. Domínio e SSL

1. Aba **Domains** do serviço App → adicionar o domínio (ou usar o subdomínio
   grátis do EasyPanel).
2. Apontar o DNS: registro **A** do domínio → IP da VPS.
3. SSL Let's Encrypt é emitido automaticamente pelo Traefik do EasyPanel.

## 6. Primeiro deploy

Clicar em **Deploy**. No primeiro boot o container roda
`npm run start:migrate` → `prisma migrate deploy` cria todas as tabelas e sobe o Next.

## 7. Seed (uma vez, obrigatório)

Sem o seed não existe login de admin nem catálogo. No EasyPanel, abrir o
**Console** do serviço App e rodar:

```bash
npm run db:seed
```

Cria: usuário admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), experiências, canoas,
agenda inicial e os planos de associação (Aloha, Kai). É idempotente (upserts),
pode rodar de novo sem problema.

## 8. Verificar

- `https://SEU-DOMINIO` — site público
- `https://SEU-DOMINIO/admin` — login com `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `https://SEU-DOMINIO/admin/associados` — módulo de associados

## Redeploys

`git push` na `main` → EasyPanel rebuilda (se **Auto Deploy** estiver ligado) ou
clique em **Deploy**. As migrations pendentes rodam sozinhas a cada boot; o seed
**não** roda de novo automaticamente.

## Observações

- Build pesado (React Compiler + Next 16). Se a VPS tiver pouca RAM e o build for
  morto (`OOM`), adicione swap na VPS (`fallocate -l 2G /swapfile ...`).
- Nunca commite `.env` — as credenciais vivem só no painel do EasyPanel.
- Backups: configure o snapshot/volume do Postgres pelo próprio EasyPanel.
- Provedor de pagamento está em `mock`. Trocar para real é outro passo (webhook
  público em `/api/payments/webhook/...`).
