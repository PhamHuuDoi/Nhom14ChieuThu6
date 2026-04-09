'use strict';

function normalizeAddressQuery(parts = []) {
    return parts
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');
}

function stripAccents(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

function buildCandidateQueries(parts = []) {
    const cleanParts = parts.map((part) => String(part || '').trim()).filter(Boolean);
    const queryGroups = [
        cleanParts,
        [cleanParts[0], cleanParts[2], cleanParts[3], 'Vietnam'],
        [cleanParts[0], cleanParts[3], 'Vietnam'],
        [cleanParts[0], 'Ho Chi Minh City', 'Vietnam'],
        [cleanParts[0], 'Vietnam'],
    ];
    const queries = queryGroups
        .map((group) => normalizeAddressQuery(group))
        .filter(Boolean);
    const asciiQueries = queries.map((query) => stripAccents(query));

    return [...new Set([...queries, ...asciiQueries])];
}

async function geocodeAddress(parts = []) {
    const candidateQueries = buildCandidateQueries(parts);

    if (!candidateQueries.length) {
        return null;
    }

    for (const query of candidateQueries) {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', query);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('limit', '1');
        url.searchParams.set('addressdetails', '1');

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TheZooCoffee/1.0 (distance-shipping)',
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Không thể kết nối OpenStreetMap');
        }

        const results = await response.json();
        const firstResult = Array.isArray(results) ? results[0] : null;

        if (!firstResult) {
            continue;
        }

        return {
            latitude: firstResult.lat !== undefined ? Number(firstResult.lat) : null,
            longitude: firstResult.lon !== undefined ? Number(firstResult.lon) : null,
            formattedAddress: firstResult.display_name || query,
        };
    }

    return null;
}

module.exports = {
    geocodeAddress,
};
