import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { seedDatabase } from './utils/seed.js';

await connectDatabase();
await seedDatabase();

const app = createApp();
app.listen(env.port, () => {
  console.log(
    `Amaravathi Tea Pricing API running on http://localhost:${env.port}`,
  );
});
