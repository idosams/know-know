// Entry point file, no annotation
import { doSomething } from './utils.js';
import { helper } from './helper.js';
import { config } from './config.js';
import { service } from './service.js';
import { db } from './db.js';
import { auth } from './auth.js';

export function main(): void {
  doSomething();
  helper();
  config();
  service();
  db();
  auth();
}
