const { BadRequestError, NotFoundError } = require('../../core/error.response');
const { OK } = require('../../core/success.response');
const { getDistanceShippingQuote } = require('../../services/distance-shipping.service');
const { getPrimaryStoreLocation, listPublicStoreLocations } = require('../../services/store-location.service');

class ShippingController {
    async getStoreLocation(req, res) {
        const primaryStoreLocation = await getPrimaryStoreLocation();

        if (!primaryStoreLocation?.address?.trim()) {
            throw new NotFoundError('Cửa hàng chưa được cấu hình địa chỉ');
        }

        new OK({
            message: 'Lấy địa chỉ cửa hàng thành công',
            metadata: {
                id: primaryStoreLocation.id,
                name: primaryStoreLocation.name || 'TheZooCoffee',
                phone: primaryStoreLocation.phone || null,
                address: primaryStoreLocation.address,
                latitude: primaryStoreLocation.latitude ?? null,
                longitude: primaryStoreLocation.longitude ?? null,
                updated_at: primaryStoreLocation.updated_at,
            },
        }).send(res);
    }

    async getStoreLocations(req, res) {
        const storeLocations = await listPublicStoreLocations();

        if (!storeLocations.length) {
            throw new NotFoundError('Cửa hàng chưa được cấu hình địa chỉ');
        }

        new OK({
            message: 'Lấy danh sách địa chỉ cửa hàng thành công',
            metadata: storeLocations.map((location) => ({
                id: location.id,
                name: location.name || 'TheZooCoffee',
                phone: location.phone || null,
                address: location.address,
                latitude: location.latitude ?? null,
                longitude: location.longitude ?? null,
                is_primary: Boolean(location.is_primary),
                updated_at: location.updated_at,
            })),
        }).send(res);
    }

    async quoteShippingFee(req, res) {
        const { customerLatitude, customerLongitude } = req.body || {};

        try {
            const quote = await getDistanceShippingQuote({
                customerLatitude: Number(customerLatitude),
                customerLongitude: Number(customerLongitude),
            });

            new OK({
                message: 'Tính phí giao hàng thành công',
                metadata: quote,
            }).send(res);
        } catch (error) {
            throw new BadRequestError(error instanceof Error ? error.message : 'Không thể tính phí giao hàng');
        }
    }
}

module.exports = new ShippingController();
