require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const prisma = require('./config/prisma');
const routes = require('./routes');
const { initSocketServer } = require('./socket/socket');
const { ensureStoreLocationsTable } = require('./services/store-location.service');
const cors = require('cors');

// -------------------- PORT --------------------
const port = process.env.PORT || 5000;

// -------------------- CORS --------------------
const allowedOrigins = new Set([process.env.CLIENT_URL].filter(Boolean));

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(origin)) {
                return callback(null, true);
            }
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
    res.status(200).json({
        success: true,
        message: 'TheZooCoffee API is running',
        version: '1.0.0',
        docs: '/api',
    });
});

routes(app);

// -------------------- ERROR HANDLER --------------------
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: err.message || 'Lỗi Server',
    });
});

// -------------------- START SERVER --------------------
// async function startServer() {
//     try {
//         await prisma.$connect();
//         await ensureStoreLocationsTable();
//         console.log(
//             `Prisma connected to ${prisma.databaseMeta.host}:${prisma.databaseMeta.port}/${prisma.databaseMeta.database} as ${prisma.databaseMeta.user}`,
//         );

//         const httpServer = http.createServer(app);
//         initSocketServer(httpServer, allowedOrigins);

//         httpServer.listen(port, () => {
//             console.log(`Server listening on port ${port}`);
//         });
//     } catch (error) {
//         console.error('Failed to connect to database before starting server.');
//         console.error(
//             `Configured database: ${prisma.databaseMeta.host}:${prisma.databaseMeta.port}/${prisma.databaseMeta.database} as ${prisma.databaseMeta.user}`,
//         );
//         console.error(error instanceof Error ? error.message : error);
//         process.exit(1);
//     }
// }
async function startServer() {
    try {
        await prisma.$connect();
        await ensureStoreLocationsTable();

        // Lấy info database trực tiếp từ DATABASE_URL
        let dbInfo = 'Not set';
        if (process.env.DATABASE_URL) {
            const databaseUrl = new URL(process.env.DATABASE_URL);
            dbInfo = `${databaseUrl.hostname}:${databaseUrl.port || 3306}${databaseUrl.pathname} as ${databaseUrl.username}`;
        }

        console.log(`Prisma connected to ${dbInfo}`);

        const httpServer = http.createServer(app);
        initSocketServer(httpServer, allowedOrigins);

        httpServer.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to database before starting server.');

        // Không dùng prisma.databaseMeta nữa
        let dbInfo = 'Not set';
        if (process.env.DATABASE_URL) {
            const databaseUrl = new URL(process.env.DATABASE_URL);
            dbInfo = `${databaseUrl.hostname}:${databaseUrl.port || 3306}${databaseUrl.pathname} as ${databaseUrl.username}`;
        }
        console.error(`Configured database: ${dbInfo}`);
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
void startServer();

// -------------------- GRACEFUL SHUTDOWN --------------------
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
