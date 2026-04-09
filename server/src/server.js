require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const bodyParser = require('body-parser');
const port = process.env.PORT;
const routes = require('./routes');
const cookieParser = require('cookie-parser');
const prisma = require('./config/prisma');
const { initSocketServer } = require('./socket/socket');
const { ensureStoreLocationsTable } = require('./services/store-location.service');

const cor = require('cors');
const allowedOrigins = new Set([
    process.env.CLIENT_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
].filter(Boolean));

app.use(cor({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'TheZooCoffee API is running',
        version: '1.0.0',
        docs: '/api',
    });
});
routes(app);
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
        success: false,
        message: err.message || 'Lỗi Server',
    });
});

async function startServer() {
    try {
        await prisma.$connect();
        await ensureStoreLocationsTable();
        console.log(
            `Prisma connected to ${prisma.databaseMeta.host}:${prisma.databaseMeta.port}/${prisma.databaseMeta.database} as ${prisma.databaseMeta.user}`,
        );

        const httpServer = http.createServer(app);
        initSocketServer(httpServer, allowedOrigins);

        httpServer.listen(port, () => {
            console.log(`Example app listening on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to database before starting server.');
        console.error(
            `Configured database: ${prisma.databaseMeta.host}:${prisma.databaseMeta.port}/${prisma.databaseMeta.database} as ${prisma.databaseMeta.user}`,
        );
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

void startServer();

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
