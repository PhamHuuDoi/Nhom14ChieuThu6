const prisma = require('../config/prisma');
const { getPrimaryStoreLocation } = require('./store-location.service');
const { geocodeAddress } = require('./openstreetmap.service');

const BASE_FEE = Number(process.env.SHIPPING_BASE_FEE || 15000);
const FEE_PER_KM = Number(process.env.SHIPPING_FEE_PER_KM || 5000);
const MIN_FEE = Number(process.env.SHIPPING_MIN_FEE || BASE_FEE);

function toRadians(value) {
    return (Number(value) * Math.PI) / 180;
}

function calculateDistanceInKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
    const earthRadiusKm = 6371;
    const dLat = toRadians(Number(toLatitude) - Number(fromLatitude));
    const dLon = toRadians(Number(toLongitude) - Number(fromLongitude));
    const lat1 = toRadians(fromLatitude);
    const lat2 = toRadians(toLatitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
}

function hasCoordinates(location) {
    return (
        location &&
        location.latitude !== null &&
        location.latitude !== undefined &&
        location.longitude !== null &&
        location.longitude !== undefined
    );
}

async function getFallbackAdminLocation() {
    const admin = await prisma.users.findFirst({
        where: {
            role: 'admin',
            latitude: {
                not: null,
            },
            longitude: {
                not: null,
            },
        },
        orderBy: {
            updated_at: 'desc',
        },
        select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
        },
    });

    if (!admin) {
        return null;
    }

    return {
        id: admin.id,
        name: admin.name || 'TheZooCoffee',
        address: admin.address || '',
        latitude: Number(admin.latitude),
        longitude: Number(admin.longitude),
    };
}

async function getStoreLocationForShipping() {
    const primaryStoreLocation = await getPrimaryStoreLocation();

    if (hasCoordinates(primaryStoreLocation)) {
        return primaryStoreLocation;
    }

    const fallbackAdminLocation = await getFallbackAdminLocation();

    if (hasCoordinates(fallbackAdminLocation)) {
        return fallbackAdminLocation;
    }

    const geocodedLocation = await geocodeAddress([
        primaryStoreLocation?.address,
        fallbackAdminLocation?.address,
    ]);

    if (!hasCoordinates(geocodedLocation)) {
        return fallbackAdminLocation;
    }

    return {
        ...primaryStoreLocation,
        latitude: geocodedLocation.latitude,
        longitude: geocodedLocation.longitude,
    };
}

async function getDistanceShippingQuote({ customerLatitude, customerLongitude }) {
    const storeLocation = await getStoreLocationForShipping();

    if (!hasCoordinates(storeLocation)) {
        throw new Error('Cửa hàng chưa cấu hình tọa độ giao hàng');
    }

    if (
        customerLatitude === null ||
        customerLatitude === undefined ||
        customerLongitude === null ||
        customerLongitude === undefined ||
        Number.isNaN(Number(customerLatitude)) ||
        Number.isNaN(Number(customerLongitude))
    ) {
        throw new Error('Địa chỉ khách hàng chưa có tọa độ hợp lệ');
    }

    const distanceKm = calculateDistanceInKm(
        Number(storeLocation.latitude),
        Number(storeLocation.longitude),
        Number(customerLatitude),
        Number(customerLongitude),
    );

    const roundedDistanceKm = Number(distanceKm.toFixed(2));
    const shippingFee = Math.max(MIN_FEE, Math.round(BASE_FEE + roundedDistanceKm * FEE_PER_KM));

    return {
        shippingFee,
        distanceKm: roundedDistanceKm,
        serviceName: 'Tính theo khoảng cách',
    };
}

module.exports = {
    getDistanceShippingQuote,
};
