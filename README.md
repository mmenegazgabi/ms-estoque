# chave-ms-supplier

Microsserviço de **Cadastro e Gestão de Fornecedores** do sistema Chave (loja de roupas
plus size) — Engenharia de Software II, PUCRS 2026-1, Turma 30, Grupo It Girls.

## Stack

- **Node 20 + TypeScript + Express** — API REST em camadas (routes → controllers → services → repositories)
- **PostgreSQL** via `pg` + **node-pg-migrate** (migrations versionadas up/down)
- **zod** para validação de requests + validadores CPF/CNPJ/e-mail
- **AWS SDK v3 (SNS)** atrás da interface `MessagePublisher` (mockável; `NoopPublisher` em dev/teste)
- **swagger-ui-express** + OpenAPI 3.0 em `/docs`
- **Jest + supertest** — testes unitários e de integração

## Endpoints

Todas as rotas (exceto `/health` e `/docs`) exigem identidade via guard. Escrita exige
perfil de escrita quando RBAC está em modo enforce.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/health` | público | liveness (`{ status: 'ok' }`) |
| GET | `/docs` | público | Swagger UI (OpenAPI 3.0) |
| POST | `/suppliers` | escrita | cria fornecedor (valida doc/e-mail, documento único) |
| GET | `/suppliers` | leitura | lista paginada `?page&pageSize&status&city&state&productId&q` |
| GET | `/suppliers/:id` | leitura | busca por id |
| PATCH | `/suppliers/:id` | escrita | atualização parcial |
| PUT | `/suppliers/:id` | escrita | atualização completa |
| DELETE | `/suppliers/:id` | escrita | **soft delete** (`status=inactive`) |
| POST | `/suppliers/:id/products` | escrita | vincula produto (+ metadados) |
| GET | `/suppliers/:id/products` | leitura | produtos de um fornecedor |
| DELETE | `/suppliers/:id/products/:productId` | escrita | desvincula produto |
| GET | `/products/:productId/suppliers` | leitura | busca reversa (fornecedores de um produto) |
| POST | `/suppliers/:id/replenishments` | escrita | registra pedido de reposição (calcula total) |
| GET | `/suppliers/:id/replenishments` | leitura | histórico `?status&from&to` |

Envelope de erro: `{ error, details? }` — `400` validação, `401` sem identidade,
`403` RBAC, `404` não encontrado, `409` documento duplicado.

### Eventos publicados (quando `EVENTS_ENABLED=true`)

`supplier.created`, `supplier.updated`, `supplier.inactivated`, `replenishment.created`
→ tópico SNS (Ministack em dev / AWS em produção).

## Variáveis de ambiente

Veja `.env.example`. Principais:

| Var | Default | Descrição |
|---|---|---|
| `PORT` | `3002` | porta HTTP |
| `JWT_SECRET` | `dev-secret` | segredo de verificação do JWT |
| `RBAC_ENFORCE` | `false` | quando `true`, escrita exige `admin`/`gestor` |
| `ROLES_CLAIM` | `roles` | claim do JWT com as roles |
| `ROLES_HEADER` / `USER_ID_HEADER` / `USER_EMAIL_HEADER` | `x-user-roles` / `x-user-id` / `x-user-email` | headers injetados pelo gateway |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | `localhost`/`5432`/`chave`/`chave_secret`/`chave_supplier` | PostgreSQL |
| `EVENTS_ENABLED` | `false` | habilita publicação SNS |
| `SNS_TOPIC_ARN` | — | tópico de destino |
| `AWS_ENDPOINT` / `AWS_DEFAULT_REGION` | `http://localhost:4566` / `us-east-1` | Ministack/AWS |

### RBAC com degrade gracioso

O Auth de referência emite JWT só com `{ sub, email }` (sem roles). O guard lê roles de
um claim configurável **ou** de header do gateway. Com `RBAC_ENFORCE=false` (default), na
ausência de roles a **escrita é permitida** — funciona com o Auth atual. Com
`RBAC_ENFORCE=true`, escrita passa a exigir `admin`/`gestor`. Leitura sempre exige apenas
identidade válida.

## Rodar local

```bash
npm install
cp .env.example .env          # ajuste DB_* se necessário
npm run migrate:up            # aplica as migrations
npm run seed                  # popula fornecedores de exemplo
npm run dev                   # sobe em http://localhost:3002 (ts-node-dev)
```

Swagger interativo em `http://localhost:3002/docs`.

## Rodar via chave-infra

Pelo orquestrador `chave-infra` (Docker Compose + Ministack + Terraform):

```bash
cd ../chave-infra
cp -n .env.example .env
make setup
```

Sobe o Postgres do supplier, o microsserviço (que roda `migrate:up` no boot) e o
microfrontend, registrando a rota `suppliers/{proxy+}` no API Gateway. Detalhes em
`docs/INTEGRATION.md`.

## Testes

```bash
npm test               # unit + integração
npm run test:coverage  # com cobertura (thresholds em jest.config.cjs)
npm run lint           # eslint
npm run build          # tsc → dist/
```
