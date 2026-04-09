const { BadRequestError, NotFoundError } = require('../../core/error.response');
const { OK, Created } = require('../../core/success.response');
const {
    listStoreLocations,
    createStoreLocation,
    setPrimaryStoreLocation,
} = require('../../services/store-location.service');

class StoreLocationAdminController {
    async getStoreLocations(req, res) {
        const adminUserId = req.user?.id;

        if (!adminUserId) {
            throw new BadRequestError('Không xác định được admin');
        }

        const locations = await listStoreLocations(adminUserId);

        new OK({
            message: 'Lấy danh sách địa chỉ cửa hàng thành công',
            metadata: locations,
        }).send(res);
    }

    async createStoreLocation(req, res) {
        const adminUserId = req.user?.id;

        if (!adminUserId) {
            throw new BadRequestError('Không xác định được admin');
        }

        const { name, phone, address, latitude, longitude } = req.body;

        if (!String(name || '').trim() || !String(address || '').trim()) {
            throw new BadRequestError('Tên cửa hàng và địa chỉ là bắt buộc');
        }

        const location = await createStoreLocation({
            adminUserId,
            name: String(name).trim(),
            phone: String(phone || '').trim() || null,
            address: String(address).trim(),
            latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
            longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
        });

        new Created({
            message: 'Thêm địa chỉ cửa hàng thành công',
            metadata: location,
        }).send(res);
    }

    async setPrimaryStoreLocation(req, res) {
        const adminUserId = req.user?.id;
        const locationId = Number(req.params.id);

        if (!adminUserId) {
            throw new BadRequestError('Không xác định được admin');
        }

        if (Number.isNaN(locationId) || locationId <= 0) {
            throw new BadRequestError('ID địa chỉ không hợp lệ');
        }

        const location = await setPrimaryStoreLocation(adminUserId, locationId);

        if (!location) {
            throw new NotFoundError('Không tìm thấy địa chỉ cửa hàng');
        }

        new OK({
            message: 'Cập nhật địa chỉ cửa hàng đang dùng thành công',
            metadata: location,
        }).send(res);
    }
}

module.exports = new StoreLocationAdminController();
