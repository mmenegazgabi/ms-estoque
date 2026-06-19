# Guia de Integração — Supplier Service

Este documento registra, de forma reproduzível, todas as edições aplicadas aos repositórios
existentes (`chave-infra` e `chave-shell`) para integrar o **Supplier Service**
(`chave-ms-supplier` + `chave-mfe-supplier`) ao ambiente da turma, além da sequência para
subir o stack completo.

## Pré-requisitos

Clonar os dois novos repositórios como **irmãos** dos boilerplates, sob o mesmo diretório:

```
T2-ESII/
├── chave-infra/          (existente, editado)
├── chave-shell/          (existente, editado)
├── chave-ms-auth/        (existente)
├── chave-mfe-auth-g7/    (existente)
├── chave-ms-supplier/    (novo)
└── chave-mfe-supplier/   (novo)
```

> **Atenção (boilerplate):** o `docker-compose.yml` referencia o contexto de build
> `../chave-mfe-auth`, mas o repositório do MFE de auth de referência se chama
> `chave-mfe-auth-g7`. Crie um symlink para o build encontrar o caminho:
>
> ```bash
> ln -sfn chave-mfe-auth-g7 chave-mfe-auth   # rodar na raiz T2-ESII/
> ```

---

## 1. `chave-infra/docker-compose.yml`

### 1.1 Ministack — habilitar SQS/SNS

```yaml
# em services.ministack.environment
- SERVICES=s3,rds,apigateway,sts,sqs,sns
```

### 1.2 Banco dedicado do supplier

```yaml
  chave-supplier-db:
    image: postgres:15-alpine
    container_name: chave-supplier-db
    environment:
      - POSTGRES_USER=${SUPPLIER_DB_USER:-chave}
      - POSTGRES_PASSWORD=${SUPPLIER_DB_PASSWORD:-chave_secret}
      - POSTGRES_DB=${SUPPLIER_DB_NAME:-chave_supplier}
    ports:
      - "${SUPPLIER_DB_PORT:-5433}:5432"
    volumes:
      - supplier_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${SUPPLIER_DB_USER:-chave}"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped
```

### 1.3 Microsserviço

```yaml
  chave-ms-supplier:
    build:
      context: ../chave-ms-supplier
      dockerfile: Dockerfile
    container_name: chave-ms-supplier
    ports:
      - "${MS_SUPPLIER_PORT:-3002}:3002"
    environment:
      - NODE_ENV=development
      - PORT=3002
      - JWT_SECRET=${JWT_SECRET}
      - RBAC_ENFORCE=${RBAC_ENFORCE:-false}
      - DB_HOST=chave-supplier-db
      - DB_PORT=5432
      - DB_USER=${SUPPLIER_DB_USER:-chave}
      - DB_PASSWORD=${SUPPLIER_DB_PASSWORD:-chave_secret}
      - DB_NAME=${SUPPLIER_DB_NAME:-chave_supplier}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}
      - AWS_ENDPOINT=http://ministack:4566
      - EVENTS_ENABLED=${SUPPLIER_EVENTS_ENABLED:-false}
      - SNS_TOPIC_ARN=${SUPPLIER_SNS_TOPIC_ARN:-}
    depends_on:
      infra-provisioner:
        condition: service_completed_successfully
      chave-supplier-db:
        condition: service_healthy
    restart: unless-stopped
```

> A imagem roda `npm run migrate:up` no boot (ver Dockerfile do MS) e então inicia o app.
>
> **Requisitos do Dockerfile para o boot funcionar** (validados na verificação E2E):
> - O estágio de runtime precisa do **`node_modules` completo** do estágio de build — as
>   migrations são `.ts` (`node-pg-migrate -j ts`), então `ts-node`/`typescript` e o binário
>   `node-pg-migrate` (com seu symlink em `.bin/`) têm que estar presentes. Copiar só o
>   pacote `node-pg-migrate` causa `sh: node-pg-migrate: not found` em loop de restart.
> - O `node-pg-migrate` conecta via **`DATABASE_URL`**, não pelas `DB_*` da app. O CMD monta
>   `DATABASE_URL` a partir das `DB_*` antes de migrar; sem isso a migração vai para
>   `127.0.0.1:5432` e falha com `ECONNREFUSED`.

### 1.4 Microfrontend

```yaml
  chave-mfe-supplier:
    build:
      context: ../chave-mfe-supplier
      dockerfile: Dockerfile
    container_name: chave-mfe-supplier
    ports:
      - "${MFE_SUPPLIER_PORT:-4002}:4002"
    environment:
      - VITE_MS_SUPPLIER_URL=http://localhost:3002
      - AWS_ENDPOINT=http://ministack:4566
    depends_on:
      infra-provisioner:
        condition: service_completed_successfully
    restart: unless-stopped
```

### 1.5 Shell — build arg + dependência

```yaml
# em services.chave-shell.build.args
- MFE_SUPPLIER_URL=http://localhost:4002/assets/remoteEntry.js
# em services.chave-shell.depends_on
      chave-mfe-supplier:
        condition: service_started
```

### 1.6 Volume

```yaml
# em volumes:
  supplier_db_data:
```

---

## 2. `chave-infra/.env.example`

```env
# Ports
MS_SUPPLIER_PORT=3002
MFE_SUPPLIER_PORT=4002

# ─── Supplier Service ─────────────────────────────────────────────────────────
SUPPLIER_DB_PORT=5433
SUPPLIER_DB_USER=chave
SUPPLIER_DB_PASSWORD=chave_secret
SUPPLIER_DB_NAME=chave_supplier
RBAC_ENFORCE=false
SUPPLIER_EVENTS_ENABLED=false
SUPPLIER_SNS_TOPIC_ARN=
```

---

## 3. `chave-infra/terraform/`

### 3.1 `variables.tf`

```hcl
variable "ms_supplier_host" { default = "chave-ms-supplier" }
variable "ms_supplier_port" { default = "3002" }
variable "supplier_db_name" { default = "chave_supplier" }
```

### 3.2 `main.tf`

- Adicionar `sns` e `sqs` ao bloco `endpoints` do provider AWS (apontando para `var.endpoint`).
- `aws_db_instance "supplier"` (RDS de paridade), `aws_sns_topic "supplier_events"` e
  `aws_sqs_queue "supplier_events"`.
- Recursos do API Gateway: `aws_api_gateway_resource "suppliers"` + `"suppliers_proxy"`
  (`{proxy+}`), métodos `ANY` e integrações `HTTP_PROXY` para
  `http://${var.ms_supplier_host}:${var.ms_supplier_port}/suppliers` e `.../suppliers/{proxy}`.
- Acrescentar `aws_api_gateway_integration.suppliers_any` e
  `aws_api_gateway_integration.suppliers_proxy_any` ao `depends_on` de
  `aws_api_gateway_deployment.chave`.

---

## 4. `chave-shell/`

### 4.1 `vite.config.js`

```js
const MFE_SUPPLIER_URL =
  process.env.MFE_SUPPLIER_URL || "http://localhost:4002/assets/remoteEntry.js";
// em federation.remotes:
mfe_supplier: MFE_SUPPLIER_URL,
```

### 4.2 `src/App.jsx`

```jsx
const SupplierApp = lazy(() => import("mfe_supplier/SupplierApp"));
// dentro de <Routes>:
<Route path="/suppliers" element={<PrivateRoute><SupplierApp /></PrivateRoute>} />
// + link "Fornecedores" no Dashboard apontando para /suppliers
```

### 4.3 `Dockerfile`

```dockerfile
ARG MFE_SUPPLIER_URL=http://localhost:4002/assets/remoteEntry.js
ENV MFE_SUPPLIER_URL=$MFE_SUPPLIER_URL
```

### 4.4 Limitação conhecida — React duplicado no shell

O shell consome o `SupplierApp` como remote e o renderiza **dentro da própria árvore React**.
Como o `@originjs/vite-plugin-federation` (com `shared: ["react", "react-dom"]`) **não
deduplica o React de forma confiável**, os componentes do MFE (ex.: MUI DataGrid) acabam
chamando hooks de **outra** instância de React, e a rota `/suppliers` no **shell (`:3000`)**
quebra com `Cannot read properties of null (reading 'useSyncExternalStore')`.

> Tentou-se declarar `react`/`react-dom` como `singleton` no `shared` dos três `vite.config`,
> mas **não resolveu** (limitação do plugin) — por isso a alteração foi revertida.
>
> **O MFE standalone em `http://localhost:4002` funciona 100%** (uma única instância de React).
> Para testar/demonstrar a UI dos fornecedores, usar o standalone. Resolver no shell exigiria
> um import map de React único (externalizar `react`/`react-dom` e servi-los uma vez só) ou
> trocar o plugin de Module Federation.

---

## 5. CORS no microsserviço

O MFE roda em outra origem (browser) e chama a API em `:3002`, então o navegador aplica CORS.
Sem os headers a UI falha com **"Failed to fetch"** (visível só no browser; `curl` não aplica
CORS). Em `chave-ms-supplier/src/app.ts` há um middleware que responde:

```
Access-Control-Allow-Origin: *            (override por CORS_ORIGIN)
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Wildcard é seguro aqui porque a autenticação vai no header `Authorization` (sem cookies).

---

## 6. Subindo o stack completo

```bash
cd chave-infra
cp -n .env.example .env
make setup            # Ministack healthy → terraform apply → containers up
```

> **Notas de bring-up (verificação E2E):**
> - Se um container `ministack` ou `infra-provisioner` de uma execução anterior tiver subido
>   sozinho (política `restart`), remova-o antes (`docker rm -f ministack infra-provisioner`)
>   para evitar conflito de nome.
> - O `make setup` provisiona o Terraform **duas vezes** (host + container `infra-provisioner`)
>   contra o mesmo Ministack; em um ambiente já provisionado isso colide (recursos já existem).
>   Para um start limpo: `docker compose down -v && docker compose up -d` (deixa só o
>   `infra-provisioner` provisionar contra um Ministack zerado).

URLs após o setup:

| Serviço | URL |
|---|---|
| Supplier API (Swagger) | http://localhost:3002/docs |
| Supplier API (health) | http://localhost:3002/health |
| **MFE Supplier (standalone)** | **http://localhost:4002** ← UI funcional |
| Shell (rota de fornecedores) | http://localhost:3000/suppliers ⚠️ ver limitação 4.4 |
| Gateway URL | impresso como output `gateway_url` do terraform |

Smoke test rápido:

```bash
curl -s localhost:3002/health
# o token: o login do chave-ms-auth de referência não funciona neste ambiente
# (chama /api/auth/login, sem tabela users/seed). Para testar, gere um JWT assinado
# com o JWT_SECRET compartilhado (default: change-me-in-production):
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({sub:'00000000-0000-0000-0000-000000000000',email:'admin@dev',roles:['admin']},'change-me-in-production',{expiresIn:'8h'}))")
curl -s localhost:3002/suppliers -H "Authorization: Bearer $TOKEN"
```

> Para usar pela **UI**, abra o standalone `http://localhost:4002`, cole o token no
> `localStorage` (`localStorage.setItem('token','<JWT>')`) e recarregue. Há ainda um script
> `chave-ms-supplier/testar-tudo.sh` que exercita os 11 fluxos da API de ponta a ponta.

---

## 7. Segredos de CI/CD (placeholders)

- **`chave-ms-supplier`** (`.github/workflows/ci.yml`): em tag `v*`, faz `docker build` e
  push para o Docker Hub usando `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`.
- **`chave-mfe-supplier`** (`.github/workflows/ci.yml`): em tag `v*`, faz `npm publish`
  usando `NPM_TOKEN`.

Configure esses secrets nos repositórios GitHub antes de criar tags de release.
