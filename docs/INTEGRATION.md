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

---

## 5. Subindo o stack completo

```bash
cd chave-infra
cp -n .env.example .env
make setup            # Ministack healthy → terraform apply → containers up
```

URLs após o setup:

| Serviço | URL |
|---|---|
| Supplier API (Swagger) | http://localhost:3002/docs |
| Supplier API (health) | http://localhost:3002/health |
| MFE Supplier (standalone) | http://localhost:4002 |
| Shell (rota de fornecedores) | http://localhost:3000/suppliers |
| Gateway URL | impresso como output `gateway_url` do terraform |

Smoke test rápido:

```bash
curl -s localhost:3002/health
# obtenha um token via MS Auth (porta 3001) e:
curl -s localhost:3002/suppliers -H "Authorization: Bearer $TOKEN"
```

---

## 6. Segredos de CI/CD (placeholders)

- **`chave-ms-supplier`** (`.github/workflows/ci.yml`): em tag `v*`, faz `docker build` e
  push para o Docker Hub usando `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`.
- **`chave-mfe-supplier`** (`.github/workflows/ci.yml`): em tag `v*`, faz `npm publish`
  usando `NPM_TOKEN`.

Configure esses secrets nos repositórios GitHub antes de criar tags de release.
