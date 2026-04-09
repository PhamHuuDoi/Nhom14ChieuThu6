// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const prisma = require('./config/prisma');
const routes = require('./routes'); // routes/index.js
const { initSocketServer } = require('./socket/socket');
const { ensureStoreLocationsTable } = require('./services/store-location.service');

const app = express();
const port = process.env.PORT || 5000;

// -------------------- CORS --------------------
// Lấy từ env, nếu ko set thì fallback dev localhost
const allowedOrigins = new Set((process.env.CLIENT_URLS || 'http://localhost:3000').split(',').map((s) => s.trim()));

app.use(
    cors({
        origin: (origin, callback) => {
            // origin null là Postman / SSR
            if (!origin || allowedOrigins.has(origin)) return callback(null, true);
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
    }),
);

// -------------------- MIDDLEWARE --------------------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'TheZooCoffee API is running',
        version: '1.0.0',
        docs: '/api',
    });
});

// Register all routes
routes(app); // routes/index.js phải export router đầy đủ /api/user/...

// -------------------- ERROR HANDLER --------------------
app.use((err, req, res, next) => {
    console.error(err.stack || err.message || err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Server Error',
    });
});

// -------------------- START SERVER --------------------
async function startServer() {
    try {
        await prisma.$connect();
        await ensureStoreLocationsTable();

        const dbInfo = process.env.DATABASE_URL
            ? (() => {
                  const url = new URL(process.env.DATABASE_URL);
                  return `${url.hostname}:${url.port || 3306}${url.pathname} as ${url.username}`;
              })()
            : 'Not set';

        console.log(`Prisma connected to ${dbInfo}`);

        const httpServer = http.createServer(app);
        initSocketServer(httpServer); // nếu có socket

        httpServer.listen(port, () => console.log(`Server listening on port ${port}`));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();

// -------------------- GRACEFUL SHUTDOWN --------------------
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
