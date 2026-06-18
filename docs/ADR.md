# ADR — Documento de Decisão de Arquitetura
### Supplier Service (Cadastro e Gestão de Fornecedores)

| Campo | Valor |
|---|---|
| **Projeto** | Sistema de gestão de estoque — loja de roupas plus size |
| **Domínio** | Cadastro e Gestão de Fornecedores (Supplier Service) |
| **Disciplina** | Engenharia de Software II — PUCRS / 2026-1 |
| **Turma** | 30 |
| **Grupo** | It Girls |
| **Versão / Data** | v1.0 — 2026-06-17 |
| **Status** | ✔ Aceita |

> Escopo: este ADR reaproveita a estrutura oficial da turma (`docs/about/adr.md`) e a
> particulariza para o **Supplier Service** (microsserviço `chave-ms-supplier` +
> microfrontend `chave-mfe-supplier`), integrado ao MS Auth de referência e ao Shell.

---

## 1. Contexto e Problema

A loja de roupas plus size precisa gerenciar seus **fornecedores**: cadastro com dados
fiscais (CNPJ/CPF) e de contato, vínculo de fornecedores a produtos do catálogo, e o
registro do histórico de **pedidos de reposição** de estoque. O domínio deve ser exposto
como um microsserviço independente, com microfrontend próprio, integrando-se à
infraestrutura existente (MS Auth, Shell, API Gateway, Ministack) sem alterar contratos dos
outros times.

Este ADR documenta as decisões de arquitetura, modelo de dados, integração e os trade-offs
assumidos, para registro na disciplina e nos logs de uso de IA.

---

## 2. Decisão Arquitetural

Adotar um **microsserviço Express em camadas** (routes → controllers → services →
repositories) sobre **PostgreSQL** via `pg`, com guard de identidade/RBAC configurável,
abstração de mensageria (`MessagePublisher`) sobre SNS e documentação OpenAPI 3.0 em
`/docs`. O frontend é um **microfrontend React + TypeScript + MUI**, exposto como remote de
Module Federation (`mfe_supplier`) e consumido pelo Shell.

> **Decisão Central:** microsserviço TypeScript em camadas + microfrontend React/MUI,
> containerizados (multi-stage `node:20-alpine`) e orquestrados por Docker Compose +
> Ministack + Terraform, mantendo paridade com os boilerplates oficiais da turma.

---

## 3. Modelo de Dados (PostgreSQL — `chave_supplier`)

| Tabela | Responsabilidade | Pontos-chave |
|---|---|---|
| `suppliers` | Fornecedor (razão social, fantasia, documento, contato, endereço, status) | `document` único; `document_type` (`cnpj`/`cpf`); `status` (`active`/`inactive`) p/ soft delete; índices em `status`, `address_city`, `address_state` |
| `supplier_products` | Vínculo N:N fornecedor ↔ produto externo | `product_id` é referência opaca (sem FK cross-service); `UNIQUE(supplier_id, product_id)`; índice em `product_id`; `ON DELETE CASCADE` |
| `replenishment_orders` | Pedido de reposição | `status` (`requested`/`sent`/`received`/`cancelled`); `total_cost` calculado; índices em `supplier_id`, `status`, `ordered_at` |
| `replenishment_items` | Itens de um pedido | `quantity > 0` (CHECK); `unit_cost` opcional; `ON DELETE CASCADE` |

Migrations versionadas (up/down) via **node-pg-migrate**; seed de fornecedores de exemplo.

---

## 4. Integração

### 4.1 Autenticação / Autorização (MS Auth)

O Auth de referência emite JWT apenas com `{ sub, email }` (sem roles). O guard extrai a
identidade de `Authorization: Bearer <jwt>` (verificado com `JWT_SECRET`) **ou** de headers
repassados pelo API Gateway (`x-user-id`, `x-user-email`, `x-user-roles`). RBAC com
**degrade gracioso** via `RBAC_ENFORCE` (default `false`): sem roles, a escrita é permitida
(funciona com o Auth atual); com `RBAC_ENFORCE=true`, escrita exige `admin`/`gestor`.
Leitura exige apenas identidade válida.

### 4.2 API Gateway

Rota greedy `suppliers/{proxy+}` com método `ANY` e integração `HTTP_PROXY` para
`http://chave-ms-supplier:3002/suppliers/{proxy}` (menos verboso que enumerar cada rota).

### 4.3 Product Service

Inexistente no momento. `productId` é tratado como **referência externa opaca** (string),
sem FK nem validação síncrona. Hook futuro documentado para integração quando o serviço
existir.

### 4.4 Event Bus

Eventos de domínio (`supplier.created`, `supplier.updated`, `supplier.inactivated`,
`replenishment.created`) são publicados atrás da interface `MessagePublisher`. Em produção,
`SnsPublisher` envia para um tópico **SNS** (com fila **SQS** associada); em dev/teste,
`NoopPublisher` registra eventos em memória. Publicação ligada por `EVENTS_ENABLED`.

---

## 5. Tecnologias e Justificativas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Linguagem do MS | TypeScript (Node 20 + Express) | Tipagem rigorosa coerente com o MFE; build `tsc` → `dist/` |
| Schema/migrations | node-pg-migrate + seed | Migrations auditáveis (up/down) |
| Validação | zod + validadores CPF/CNPJ/e-mail | Schemas tipados reaproveitáveis por DTO |
| Mensageria | AWS SDK v3 (SNS) atrás de `MessagePublisher` | Mockável em teste, configurável por env |
| Docs API | swagger-ui-express + OpenAPI 3.0 | Exigido pelo T2; contrato navegável em `/docs` |
| Testes | Jest + supertest | Unidade (validadores, services, guard) + integração de rotas |
| MFE | React 18 + TS + MUI v9 + `@mui/x-data-grid` | Obrigatório pelo T2; DataGrid para lista paginada |

---

## 6. Alternativas Consideradas

1. **JavaScript puro no MS** — descartado: perderia a paridade de tipos com o MFE e a
   segurança de refatoração.
2. **Criar schema via SQL no boot do app** — descartado em favor de migrations versionadas
   (rastreáveis, reversíveis).
3. **Enumerar cada rota no API Gateway** — descartado em favor do proxy `suppliers/{proxy+}`
   (menos verboso; trade-off de granularidade de autorização no gateway).
4. **Integração síncrona REST com um Product Service** — adiada: o serviço não existe;
   `productId` opaco evita acoplamento prematuro.
5. **Usar o RDS do Ministack como banco conectável** — inviável (LocalStack Community mocka
   o RDS); optou-se por um container Postgres dedicado em dev.

---

## 7. Consequências / Trade-offs

| Trade-off | Decisão | Consequência |
|---|---|---|
| RDS do Ministack não conecta | Postgres container dedicado em dev | Mapeia para RDS no AWS real; documentado |
| Auth sem roles | RBAC tolerante + `RBAC_ENFORCE` | Funciona hoje; endurece quando o Auth evoluir |
| Product Service inexistente | `productId` como referência opaca | Sem integridade referencial cross-service |
| Muitas rotas no gateway | `suppliers/{proxy+}` ANY | Menos verboso; menos granularidade de autorização no gateway |
| TypeScript adiciona etapa de build | Dockerfile multi-stage com `tsc` | Imagem final só com `dist/` + deps de produção |

---

## 8. Histórico de Revisões

| Versão | Data | Descrição |
|---|---|---|
| v1.0 | 2026-06-17 | Versão inicial — decisões do Supplier Service aprovadas para implementação |
