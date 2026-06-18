import dotenv from 'dotenv';
dotenv.config();

const bool = (v: string | undefined, def: boolean): boolean =>
  v === undefined ? def : v.toLowerCase() === 'true';

export const env = {
  port: Number(process.env.PORT) || 3002,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  rbac: {
    enforce: bool(process.env.RBAC_ENFORCE, false),
    rolesClaim: process.env.ROLES_CLAIM || 'roles',
    rolesHeader: process.env.ROLES_HEADER || 'x-user-roles',
    userIdHeader: process.env.USER_ID_HEADER || 'x-user-id',
    userEmailHeader: process.env.USER_EMAIL_HEADER || 'x-user-email',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'chave',
    password: process.env.DB_PASSWORD || 'chave_secret',
    database: process.env.DB_NAME || 'chave_supplier',
  },
  events: {
    enabled: bool(process.env.EVENTS_ENABLED, false),
    snsTopicArn: process.env.SNS_TOPIC_ARN || '',
    awsEndpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  },
} as const;

export const WRITE_ROLES = ['admin', 'gestor'];
