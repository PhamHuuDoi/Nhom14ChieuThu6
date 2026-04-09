const cloudinary = require('../../config/cloudinary');
const { BadRequestError } = require('../../core/error.response');
const { Created } = require('../../core/success.response');

class UploadController {
    async uploadProductImage(req, res) {
        if (!req.file) {
            throw new BadRequestError('Vui lòng chọn ảnh để upload');
        }

        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        const uploadedImage = await cloudinary.uploader.upload(dataUri, {
            folder: 'thezoocoffee/products',
            resource_type: 'image',
        });

        new Created({
            message: 'Upload ảnh thành công',
            metadata: {
                url: uploadedImage.secure_url,
                publicId: uploadedImage.public_id,
                width: uploadedImage.width,
                height: uploadedImage.height,
            },
        }).send(res);
    }
}

module.exports = new UploadController();
