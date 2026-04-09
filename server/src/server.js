require('dotenv').config();
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const prisma = require('./config/prisma');
const routes = require('./routes');
const { initSocketServer } = require('./socket/socket');
const { ensureStoreLocationsTable } = require('./services/store-location.service');

const app = express();
const port = process.env.PORT || 5000;

// -------------------- CORS --------------------
// Lấy từ env, có thể nhiều URL cách nhau bằng dấu ,
const allowedOrigins = new Set([
    'https://nhom14-chieu-thu6-bk52.vercel.app',
    'https://nhom14-chieu-thu6.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
]);
app.use(
    cors({
        origin: (origin, callback) => {
            // Cho phép Postman, SSR, hoặc không có origin
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            console.log(`CORS blocked: ${origin}`);
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true, // ← Phải có
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Set-Cookie'], // ← Thêm dòng này
    }),
);

// Quan trọng khi deploy trên Render
app.set('trust proxy', 1);

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

routes(app); // routes/index.js đăng ký /api/user/... đầy đủ

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
