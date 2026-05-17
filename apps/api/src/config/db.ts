import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  const uri = env.mongodbUri;

  if (!uri) {
    console.error('❌  MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  // Extract readable cluster/db info from the URI for logging
  const isAtlas = uri.includes('mongodb+srv');
  const dbName = uri.split('/').pop()?.split('?')[0] ?? 'unknown';
  const clusterHint = isAtlas
    ? uri.match(/@([^/]+)/)?.[1] ?? 'Atlas'
    : '127.0.0.1 (local)';

  try {
    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => {
      console.log('✅  Connected to MongoDB');
      console.log(`    Database : ${dbName}`);
      console.log(`    Cluster  : ${clusterHint}`);
      console.log(`    Mode     : ${isAtlas ? 'Atlas (cloud)' : 'Local'}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('⚠️  MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚡  MongoDB disconnected');
    });

    await mongoose.connect(uri);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌  Failed to connect to MongoDB:', message);
    process.exit(1);
  }
}
