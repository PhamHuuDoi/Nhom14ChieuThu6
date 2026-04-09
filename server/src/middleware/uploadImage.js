const multer = require('multer');
const { BadRequestError } = require('../core/error.response');

const storage = multer.memoryStorage();

const uploadImage = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new BadRequestError('Chỉ chấp nhận file ảnh'));
        }

        cb(null, true);
    },
});

module.exports = { uploadImage };
