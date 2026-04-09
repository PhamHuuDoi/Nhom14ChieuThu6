const prisma = require('../config/prisma');

let ensureStoreLocationsTablePromise = null;

function normalizeStoreLocation(row) {
    if (!row) {
        return null;
    }

    return {
        id: Number(row.id),
        admin_user_id: Number(row.admin_user_id),
        name: row.name || 'TheZooCoffee',
        phone: row.phone || null,
        address: row.address || null,
        latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
        longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
        is_primary: Boolean(row.is_primary),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

async function ensureStoreLocationsTable() {
    if (!ensureStoreLocationsTablePromise) {
        ensureStoreLocationsTablePromise = prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS store_locations (
                id INT NOT NULL AUTO_INCREMENT,
                admin_user_id INT NOT NULL,
                name VARCHAR(150) NOT NULL,
                phone VARCHAR(20) NULL,
                address TEXT NOT NULL,
                latitude DECIMAL(10,7) NULL,
                longitude DECIMAL(10,7) NULL,
                is_primary TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_store_locations_admin_user_id (admin_user_id),
                KEY idx_store_locations_primary (is_primary),
                CONSTRAINT fk_store_locations_admin_user
                    FOREIGN KEY (admin_user_id) REFERENCES users(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    }

    await ensureStoreLocationsTablePromise;
}

async function seedPrimaryStoreLocationFromAdminProfile() {
    await ensureStoreLocationsTable();

    const existingRows = await prisma.$queryRawUnsafe(`
        SELECT id
        FROM store_locations
        LIMIT 1
    `);

    if (existingRows.length > 0) {
        return;
    }

    const configuredAdmin = await prisma.users.findFirst({
        where: {
            role: 'admin',
            address: {
                not: null,
            },
        },
        orderBy: {
            updated_at: 'desc',
        },
        select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
        },
    });

    if (!configuredAdmin?.address?.trim()) {
        return;
    }

    await prisma.$executeRawUnsafe(
        `
            INSERT INTO store_locations (
                admin_user_id,
                name,
                phone,
                address,
                latitude,
                longitude,
                is_primary
            )
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        configuredAdmin.id,
        configuredAdmin.name || 'TheZooCoffee',
        configuredAdmin.phone || null,
        configuredAdmin.address.trim(),
        configuredAdmin.latitude !== null && configuredAdmin.latitude !== undefined ? Number(configuredAdmin.latitude) : null,
        configuredAdmin.longitude !== null && configuredAdmin.longitude !== undefined ? Number(configuredAdmin.longitude) : null,
    );
}

async function listStoreLocations(adminUserId) {
    await ensureStoreLocationsTable();
    await seedPrimaryStoreLocationFromAdminProfile();

    const rows = await prisma.$queryRawUnsafe(
        `
            SELECT
                id,
                admin_user_id,
                name,
                phone,
                address,
                latitude,
                longitude,
                is_primary,
                created_at,
                updated_at
            FROM store_locations
            WHERE admin_user_id = ?
            ORDER BY is_primary DESC, updated_at DESC, id DESC
        `,
        Number(adminUserId),
    );

    return rows.map(normalizeStoreLocation);
}

async function getPrimaryStoreLocation() {
    await ensureStoreLocationsTable();
    await seedPrimaryStoreLocationFromAdminProfile();

    const rows = await prisma.$queryRawUnsafe(`
        SELECT
            id,
            admin_user_id,
            name,
            phone,
            address,
            latitude,
            longitude,
            is_primary,
            created_at,
            updated_at
        FROM store_locations
        WHERE is_primary = 1
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
    `);

    return normalizeStoreLocation(rows[0]);
}

async function listPublicStoreLocations() {
    await ensureStoreLocationsTable();
    await seedPrimaryStoreLocationFromAdminProfile();

    const rows = await prisma.$queryRawUnsafe(`
        SELECT
            id,
            admin_user_id,
            name,
            phone,
            address,
            latitude,
            longitude,
            is_primary,
            created_at,
            updated_at
        FROM store_locations
        ORDER BY is_primary DESC, updated_at DESC, id DESC
    `);

    return rows.map(normalizeStoreLocation);
}

async function upsertPrimaryStoreLocation(payload) {
    await ensureStoreLocationsTable();
    await seedPrimaryStoreLocationFromAdminProfile();

    const adminUserId = Number(payload.adminUserId);
    const currentPrimaryRows = await prisma.$queryRawUnsafe(
        `
            SELECT id
            FROM store_locations
            WHERE admin_user_id = ? AND is_primary = 1
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
        `,
        adminUserId,
    );

    if (currentPrimaryRows[0]) {
        await prisma.$executeRawUnsafe(
            `
                UPDATE store_locations
                SET
                    name = ?,
                    phone = ?,
                    address = ?,
                    latitude = ?,
                    longitude = ?,
                    is_primary = 1
                WHERE id = ?
            `,
            payload.name,
            payload.phone || null,
            payload.address,
            payload.latitude !== undefined && payload.latitude !== null ? Number(payload.latitude) : null,
            payload.longitude !== undefined && payload.longitude !== null ? Number(payload.longitude) : null,
            Number(currentPrimaryRows[0].id),
        );
    } else {
        await prisma.$executeRawUnsafe(
            `
                INSERT INTO store_locations (
                    admin_user_id,
                    name,
                    phone,
                    address,
                    latitude,
                    longitude,
                    is_primary
                )
                VALUES (?, ?, ?, ?, ?, ?, 1)
            `,
            adminUserId,
            payload.name,
            payload.phone || null,
            payload.address,
            payload.latitude !== undefined && payload.latitude !== null ? Number(payload.latitude) : null,
            payload.longitude !== undefined && payload.longitude !== null ? Number(payload.longitude) : null,
        );
    }

    return getPrimaryStoreLocation();
}

async function createStoreLocation(payload) {
    await ensureStoreLocationsTable();
    await seedPrimaryStoreLocationFromAdminProfile();

    const adminUserId = Number(payload.adminUserId);
    const existingRows = await prisma.$queryRawUnsafe(
        `
            SELECT id
            FROM store_locations
            WHERE admin_user_id = ?
            LIMIT 1
        `,
        adminUserId,
    );

    await prisma.$executeRawUnsafe(
        `
            INSERT INTO store_locations (
                admin_user_id,
                name,
                phone,
                address,
                latitude,
                longitude,
                is_primary
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        adminUserId,
        payload.name,
        payload.phone || null,
        payload.address,
        payload.latitude !== undefined && payload.latitude !== null ? Number(payload.latitude) : null,
        payload.longitude !== undefined && payload.longitude !== null ? Number(payload.longitude) : null,
        existingRows.length === 0 ? 1 : 0,
    );

    const createdRows = await prisma.$queryRawUnsafe(
        `
            SELECT
                id,
                admin_user_id,
                name,
                phone,
                address,
                latitude,
                longitude,
                is_primary,
                created_at,
                updated_at
            FROM store_locations
            WHERE admin_user_id = ?
            ORDER BY id DESC
            LIMIT 1
        `,
        adminUserId,
    );

    return normalizeStoreLocation(createdRows[0]);
}

async function setPrimaryStoreLocation(adminUserId, locationId) {
    await ensureStoreLocationsTable();
    await seedPrimaryStoreLocationFromAdminProfile();

    const ownerRows = await prisma.$queryRawUnsafe(
        `
            SELECT
                id,
                admin_user_id,
                name,
                phone,
                address,
                latitude,
                longitude,
                is_primary,
                created_at,
                updated_at
            FROM store_locations
            WHERE id = ? AND admin_user_id = ?
            LIMIT 1
        `,
        Number(locationId),
        Number(adminUserId),
    );

    const selectedLocation = ownerRows[0];

    if (!selectedLocation) {
        return null;
    }

    await prisma.$transaction([
        prisma.$executeRawUnsafe(
            `
                UPDATE store_locations
                SET is_primary = 0
                WHERE admin_user_id = ?
            `,
            Number(adminUserId),
        ),
        prisma.$executeRawUnsafe(
            `
                UPDATE store_locations
                SET is_primary = 1
                WHERE id = ?
            `,
            Number(locationId),
        ),
        prisma.users.update({
            where: { id: Number(adminUserId) },
            data: {
                name: selectedLocation.name,
                phone: selectedLocation.phone || null,
                address: selectedLocation.address,
                latitude:
                    selectedLocation.latitude !== null && selectedLocation.latitude !== undefined
                        ? Number(selectedLocation.latitude)
                        : null,
                longitude:
                    selectedLocation.longitude !== null && selectedLocation.longitude !== undefined
                        ? Number(selectedLocation.longitude)
                        : null,
            },
        }),
    ]);

    return getPrimaryStoreLocation();
}

module.exports = {
    ensureStoreLocationsTable,
    listStoreLocations,
    listPublicStoreLocations,
    getPrimaryStoreLocation,
    upsertPrimaryStoreLocation,
    createStoreLocation,
    setPrimaryStoreLocation,
};
