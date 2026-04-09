const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');
const { URL } = require('node:url');

const databaseUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.replace(/^\//, ''),
});

const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
});

const databaseMeta = {
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    database: databaseUrl.pathname.replace(/^\//, ''),
    user: decodeURIComponent(databaseUrl.username),
};

prisma.databaseMeta = databaseMeta;

module.exports = prisma;
