import { createApp } from './app';
import { pool } from './db/pool';
import { buildPublisher } from './messaging/snsPublisher';
import { env } from './config/env';

const app = createApp(pool, buildPublisher());
app.listen(env.port, () => console.log(`chave-ms-supplier rodando na porta ${env.port}`));
