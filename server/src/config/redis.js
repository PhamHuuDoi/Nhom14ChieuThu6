const memoryStore = new Map();

let redisClient = null;
let redisReady = false;
let redisConnectPromise = null;

function clearExpiredMemoryKey(key) {
    const current = memoryStore.get(key);

    if (current?.timeout) {
        clearTimeout(current.timeout);
    }

    memoryStore.delete(key);
}

function setMemoryValue(key, value, ttlSeconds) {
    clearExpiredMemoryKey(key);

    const record = { value };

    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
        record.timeout = setTimeout(() => {
            memoryStore.delete(key);
        }, ttlSeconds * 1000);

        if (typeof record.timeout.unref === 'function') {
            record.timeout.unref();
        }
    }

    memoryStore.set(key, record);
    return 'OK';
}

function getMemoryValue(key) {
    return memoryStore.get(key)?.value ?? null;
}

function delMemoryValue(key) {
    const existed = memoryStore.has(key);
    clearExpiredMemoryKey(key);
    return existed ? 1 : 0;
}

async function ensureRedisConnection() {
    if (!redisClient) {
        return false;
    }

    if (redisReady) {
        return true;
    }

    if (!redisConnectPromise) {
        redisConnectPromise = redisClient
            .connect()
            .then(() => {
                redisReady = true;
                return true;
            })
            .catch((error) => {
                console.log(`Redis unavailable, using memory cache: ${error.message}`);
                redisReady = false;
                return false;
            })
            .finally(() => {
                redisConnectPromise = null;
            });
    }

    return redisConnectPromise;
}

function initRedis() {
    try {
        const { createClient } = require('redis');

        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: false,
                connectTimeout: 1000,
            },
        });

        redisClient.on('error', (err) => {
            redisReady = false;
            console.log(`Redis error, fallback to memory cache: ${err.message}`);
        });

        redisClient.on('ready', () => {
            redisReady = true;
            console.log('Redis connected');
        });

        redisClient.on('end', () => {
            redisReady = false;
        });

        void ensureRedisConnection();
    } catch (error) {
        console.log('Redis client not available, using memory cache');
    }
}

const cacheStore = {
    async set(key, value, options = {}) {
        const ttlSeconds = Number(options.EX);

        if (await ensureRedisConnection()) {
            try {
                if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
                    return await redisClient.set(key, value, { EX: ttlSeconds });
                }

                return await redisClient.set(key, value);
            } catch (error) {
                console.log(`Redis set failed, fallback to memory cache: ${error.message}`);
                redisReady = false;
            }
        }

        return setMemoryValue(key, value, ttlSeconds);
    },

    async get(key) {
        if (await ensureRedisConnection()) {
            try {
                return await redisClient.get(key);
            } catch (error) {
                console.log(`Redis get failed, fallback to memory cache: ${error.message}`);
                redisReady = false;
            }
        }

        return getMemoryValue(key);
    },

    async del(key) {
        if (await ensureRedisConnection()) {
            try {
                return await redisClient.del(key);
            } catch (error) {
                console.log(`Redis delete failed, fallback to memory cache: ${error.message}`);
                redisReady = false;
            }
        }

        return delMemoryValue(key);
    },
};

initRedis();

module.exports = cacheStore;
