// Test-only process. Never imports .env or the production server bootstrap.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import readline from 'node:readline';
const backend = path.resolve('../match3-backend');
const require = createRequire(path.join(backend, 'package.json'));
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_NAME: 'match3_browser_auth_test',
  MONGO_URI: 'mongodb://127.0.0.1:27017',
  CLIENT_BASE_URL: 'http://127.0.0.1:4173,http://127.0.0.1:5173',
  ACCESS_JWT_SECRET: randomBytes(48).toString('hex'),
  ACCESS_TOKEN_TTL: '1s',
  REFRESH_TOKEN_TTL: '10m',
  SALT_ROUNDS: '4',
  COOKIE_SAME_SITE: 'lax',
  COOKIE_SECURE: 'false',
  TRUST_PROXY_HOPS: '0',
  MONGOMS_DOWNLOAD_DIR: path.join(backend, '.cache/mongodb'),
});
console.log('TEST_START');
const mongo = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  instanceOpts: [{ dbName: 'match3_browser_auth_test' }],
});
if (!mongo.getUri().startsWith('mongodb://127.0.0.1:')) throw Error('Non-local test DB refused');
console.log('TEST_MONGO_READY');
await mongoose.connect(mongo.getUri(), { dbName: 'match3_browser_auth_test', serverSelectionTimeoutMS: 3000 });
console.log('TEST_DB_CONNECTED');
const imp = (relative) => import(pathToFileURL(path.join(backend, relative)).href);
const { User } = await imp('src/models/User.model.ts');
const { hashPassword } = await imp('src/utils/hash.ts');
await User.create({ email: 'browser@example.test', username: 'BrowserAccount', password: await hashPassword('Test123!'), playerLevel: 4, playerExp: 2500 });
await User.create({ email: 'other@example.test', username: 'BrowserOther', password: await hashPassword('Test123!') });
const { app } = await imp('src/app.ts');
const { RefreshSession } = await imp('src/models/RefreshSession.model.ts');
const server = app.listen(3011, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});
console.log('TEST_BACKEND_READY');
const reader = readline.createInterface({ input: process.stdin });
reader.on('line', async (line) => {
  if (line === 'expire') {
    await RefreshSession.updateMany({}, { $set: { expiresAt: new Date(0) } });
    console.log('TEST_SESSIONS_EXPIRED');
  }
  if (line === 'stop') {
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  }
});
