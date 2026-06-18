export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Chave — Supplier Service',
    version: '1.0.0',
    description: 'Cadastro e gestão de fornecedores, vínculo com produtos e histórico de reposições.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Address: {
        type: 'object',
        properties: {
          street: { type: 'string' }, number: { type: 'string' }, complement: { type: 'string' },
          district: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' },
          zipCode: { type: 'string' }, country: { type: 'string' },
        },
      },
      Supplier: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          legalName: { type: 'string' }, tradeName: { type: 'string', nullable: true },
          document: { type: 'string' }, documentType: { type: 'string', enum: ['cnpj', 'cpf'] },
          email: { type: 'string' }, phone: { type: 'string', nullable: true },
          contactPerson: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'inactive'] },
          address: { $ref: '#/components/schemas/Address' },
          createdAt: { type: 'string' }, updatedAt: { type: 'string' },
        },
      },
      Error: { type: 'object', properties: { error: { type: 'string' }, details: {} } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/suppliers': {
      post: {
        summary: 'Cria fornecedor', tags: ['Suppliers'],
        requestBody: {
          required: true,
          content: { 'application/json': { example: {
            legalName: 'Plus Fashion LTDA', tradeName: 'Plus Fashion', document: '11.222.333/0001-81',
            email: 'contato@plusfashion.com', phone: '+55 51 99999-0000', contactPerson: 'Maria Silva',
            address: { street: 'Av. Ipiranga', number: '6681', district: 'Partenon',
              city: 'Porto Alegre', state: 'RS', zipCode: '90619-900', country: 'Brasil' },
          } } },
        },
        responses: {
          '201': { description: 'Criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Supplier' } } } },
          '400': { description: 'Validação', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Não autenticado' },
          '403': { description: 'Sem permissão de escrita' },
          '409': { description: 'Documento duplicado' },
        },
      },
      get: {
        summary: 'Lista fornecedores (paginado)', tags: ['Suppliers'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'productId', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' }, '401': { description: 'Não autenticado' } },
      },
    },
    '/suppliers/{id}': {
      get: { summary: 'Busca por id', tags: ['Suppliers'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Não encontrado' } } },
      patch: { summary: 'Atualiza parcial', tags: ['Suppliers'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Não encontrado' } } },
      put: { summary: 'Atualiza', tags: ['Suppliers'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
      delete: { summary: 'Inativa (soft delete)', tags: ['Suppliers'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Inativado' }, '404': { description: 'Não encontrado' } } },
    },
    '/suppliers/{id}/products': {
      post: { summary: 'Vincula produto', tags: ['Products'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { example: { productId: 'prod-123', supplyPrice: 49.9, leadTimeDays: 7, supplierSku: 'SKU-001' } } } }, responses: { '201': { description: 'Vinculado' }, '404': { description: 'Fornecedor não encontrado' }, '409': { description: 'Já vinculado' } } },
      get: { summary: 'Lista produtos do fornecedor', tags: ['Products'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
    },
    '/suppliers/{id}/products/{productId}': {
      delete: { summary: 'Desvincula produto', tags: ['Products'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Removido' }, '404': { description: 'Vínculo não encontrado' } } },
    },
    '/products/{productId}/suppliers': {
      get: { summary: 'Fornecedores de um produto', tags: ['Products'], parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
    },
    '/suppliers/{id}/replenishments': {
      post: { summary: 'Registra reposição', tags: ['Replenishments'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { example: { status: 'requested', items: [{ productId: 'prod-123', quantity: 10, unitCost: 25.5 }] } } } }, responses: { '201': { description: 'Registrado' }, '404': { description: 'Fornecedor não encontrado' } } },
      get: { summary: 'Histórico de reposições', tags: ['Replenishments'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['requested', 'sent', 'received', 'cancelled'] } }, { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } }], responses: { '200': { description: 'OK' } } },
    },
  },
} as const;
