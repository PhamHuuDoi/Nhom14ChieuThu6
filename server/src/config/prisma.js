// src/config/prisma.js
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb'); // adapter cho MariaDB/MySQL
const { URL } = require('node:url');

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in .env');
}

const databaseUrl = new URL(process.env.DATABASE_URL);

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.replace(/^\//, ''),
  }),
  log: ['error', 'warn', 'info'],
});

module.exports = prisma;