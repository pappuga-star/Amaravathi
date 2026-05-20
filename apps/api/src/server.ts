import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { disconnectRedis } from './search/redis-client.js';
import { seedDatabase } from './utils/seed.js';

await connectDatabase();
if (env.seedOnStartup) {
  await seedDatabase();
}

const app = createApp();
const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(
    `Amaravathi Tea Pricing API running on http://0.0.0.0:${env.port}`,
  );
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await disconnectRedis();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
