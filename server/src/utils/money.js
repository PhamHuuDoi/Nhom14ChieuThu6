const MONEY_SUFFIX_PATTERN = /\s*(vnđ|vnd|đ)$/i;

function parseMoneyInput(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const rawValue = String(value).trim().replace(MONEY_SUFFIX_PATTERN, '').replace(/\s+/g, '');

    if (!rawValue) {
        return null;
    }

    let normalizedValue = rawValue;

    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(rawValue)) {
        normalizedValue = rawValue.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(rawValue)) {
        normalizedValue = rawValue.replace(/,/g, '');
    } else if (rawValue.includes(',') && !rawValue.includes('.')) {
        normalizedValue = rawValue.replace(',', '.');
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeVndAmount(value) {
    const parsedValue = parseMoneyInput(value);

    if (parsedValue === null) {
        return null;
    }

    if (parsedValue > 0 && parsedValue < 1000) {
        return Math.round(parsedValue * 1000);
    }

    return Math.round(parsedValue);
}

module.exports = {
    normalizeVndAmount,
    parseMoneyInput,
};
