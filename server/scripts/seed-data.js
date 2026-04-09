require('dotenv').config();

const path = require('path');
const bcrypt = require('bcrypt');

const prisma = require('../src/config/prisma');
const cloudinary = require('../src/config/cloudinary');

const CATEGORY_ITEMS = [
    { name: 'Cà phê', status: 'active' },
    { name: 'Trà', status: 'active' },
    { name: 'Đồ uống đá xay', status: 'active' },
    { name: 'Bánh ngọt', status: 'active' },
];

const USER_ITEMS = [
    {
        name: 'Quản trị chính',
        email: 'admin@thezoocoffee.vn',
        password: 'admin123',
        role: 'admin',
    },
    {
        name: 'Khách hàng mẫu',
        email: 'customer@thezoocoffee.vn',
        password: 'customer123',
        role: 'customer',
    },
];

const INVENTORY_ITEMS = [
    {
        name: 'Hạt cà phê Arabica',
        unit: 'kg',
        quantity: '50.00',
        min_quantity: '5.00',
        cost_price: '200000.00',
        supplier_name: 'Cafe House',
        status: 'available',
    },
    {
        name: 'Sữa tươi',
        unit: 'l',
        quantity: '100.00',
        min_quantity: '10.00',
        cost_price: '22000.00',
        supplier_name: 'Vinamilk',
        status: 'available',
    },
    {
        name: 'Đường',
        unit: 'kg',
        quantity: '80.00',
        min_quantity: '10.00',
        cost_price: '15000.00',
        supplier_name: 'Cuong Dat',
        status: 'available',
    },
    {
        name: 'Bột cacao',
        unit: 'kg',
        quantity: '40.00',
        min_quantity: '5.00',
        cost_price: '120000.00',
        supplier_name: 'Nestle',
        status: 'available',
    },
    {
        name: 'Bột matcha',
        unit: 'kg',
        quantity: '20.00',
        min_quantity: '3.00',
        cost_price: '180000.00',
        supplier_name: 'Uji',
        status: 'available',
    },
];

const PRODUCT_ITEMS = [
    {
        name: 'Espresso',
        price: '45000.00',
        description: 'Cà phê Espresso đậm đà, nồng nàn.',
        sku: 'ESP001',
        status: 'available',
        categoryName: 'Cà phê',
        imageSource: 'espresso.jpg',
    },
    {
        name: 'Cappuccino',
        price: '68000.00',
        description: 'Sữa bọt mịn kết hợp cà phê Espresso.',
        sku: 'CAP001',
        status: 'available',
        categoryName: 'Cà phê',
        imageSource: 'cappuccino.jpg',
    },
    {
        name: 'Mocha',
        price: '75000.00',
        description: 'Espresso pha với cacao và sữa tươi.',
        sku: 'MOC001',
        status: 'available',
        categoryName: 'Cà phê',
        imageSource: 'mocha.jpg',
    },
    {
        name: 'Matcha Latte',
        price: '78000.00',
        description: 'Matcha Nhật Bản hòa quyện cùng sữa tươi.',
        sku: 'MTL001',
        status: 'available',
        categoryName: 'Trà',
        imageSource: 'matcha-latte.jpg',
    },
];

const RECIPE_DEFINITIONS = [
    {
        productSku: 'ESP001',
        items: [
            { inventoryName: 'Hạt cà phê Arabica', quantity: '0.02' },
            { inventoryName: 'Đường', quantity: '0.01' },
        ],
    },
    {
        productSku: 'CAP001',
        items: [
            { inventoryName: 'Hạt cà phê Arabica', quantity: '0.02' },
            { inventoryName: 'Sữa tươi', quantity: '0.12' },
            { inventoryName: 'Đường', quantity: '0.01' },
        ],
    },
    {
        productSku: 'MOC001',
        items: [
            { inventoryName: 'Hạt cà phê Arabica', quantity: '0.02' },
            { inventoryName: 'Sữa tươi', quantity: '0.12' },
            { inventoryName: 'Bột cacao', quantity: '0.02' },
            { inventoryName: 'Đường', quantity: '0.01' },
        ],
    },
    {
        productSku: 'MTL001',
        items: [
            { inventoryName: 'Bột matcha', quantity: '0.01' },
            { inventoryName: 'Sữa tươi', quantity: '0.15' },
            { inventoryName: 'Đường', quantity: '0.01' },
        ],
    },
];

const COUPON_ITEMS = [
    {
        code: 'WELCOME10',
        name: 'Chào khách mới',
        description: 'Giảm 10% cho đơn hàng từ 50.000đ.',
        discount_type: 'percentage',
        discount_value: '10.00',
        min_order_value: '50000.00',
        max_discount_amount: '30000.00',
        usage_limit: 100,
        used_count: 0,
        starts_at: new Date('2026-01-01T00:00:00.000Z'),
        expires_at: new Date('2026-12-31T23:59:59.000Z'),
        status: 'active',
    },
    {
        code: 'FREESHIP30K',
        name: 'Hỗ trợ phí giao hàng',
        description: 'Giảm trực tiếp 30.000đ cho đơn từ 99.000đ.',
        discount_type: 'fixed',
        discount_value: '30000.00',
        min_order_value: '99000.00',
        max_discount_amount: null,
        usage_limit: 200,
        used_count: 0,
        starts_at: new Date('2026-01-01T00:00:00.000Z'),
        expires_at: new Date('2026-12-31T23:59:59.000Z'),
        status: 'active',
    },
    {
        code: 'COMBO15',
        name: 'Ưu đãi giờ vàng',
        description: 'Giảm 15% cho đơn hàng từ 120.000đ.',
        discount_type: 'percentage',
        discount_value: '15.00',
        min_order_value: '120000.00',
        max_discount_amount: '50000.00',
        usage_limit: 80,
        used_count: 0,
        starts_at: new Date('2026-01-01T00:00:00.000Z'),
        expires_at: new Date('2026-12-31T23:59:59.000Z'),
        status: 'active',
    },
];

const PRODUCT_IMAGE_DIR = path.resolve(__dirname, '../../client/public/images');

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase(maxRetries = 10, delay = 3000) {
    for (let index = 0; index < maxRetries; index += 1) {
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log('Đã kết nối cơ sở dữ liệu');
            return;
        } catch (error) {
            console.log(`Đang chờ cơ sở dữ liệu... Lần ${index + 1}/${maxRetries}`);
            await sleep(delay);
        }
    }

    throw new Error('Không thể kết nối cơ sở dữ liệu sau số lần thử tối đa');
}

function hasCloudinaryConfig() {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET,
    );
}

async function uploadProductImageToCloudinary(product) {
    if (!hasCloudinaryConfig()) {
        console.log(`Bỏ qua upload Cloudinary cho ${product.name}: thiếu cấu hình Cloudinary`);
        return null;
    }

    if (!product.imageSource) {
        return null;
    }

    const localImagePath = path.join(PRODUCT_IMAGE_DIR, product.imageSource);
    const publicId = `thezoocoffee/products/${product.sku.toLowerCase()}`;

    const uploaded = await cloudinary.uploader.upload(localImagePath, {
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
    });

    return uploaded.secure_url;
}

async function upsertInventory(item) {
    const existing = await prisma.inventory.findFirst({
        where: { name: item.name },
    });

    if (existing) {
        return prisma.inventory.update({
            where: { id: existing.id },
            data: item,
        });
    }

    return prisma.inventory.create({ data: item });
}

async function upsertCategory(item) {
    const existing = await prisma.categories.findFirst({
        where: { name: item.name },
    });

    if (existing) {
        return prisma.categories.update({
            where: { id: existing.id },
            data: item,
        });
    }

    return prisma.categories.create({ data: item });
}

async function upsertUser(item) {
    const existing = await prisma.users.findFirst({
        where: { email: item.email },
    });

    const hashedPassword = await bcrypt.hash(item.password, 10);
    const userData = {
        name: item.name,
        email: item.email,
        password_hash: hashedPassword,
        role: item.role,
    };

    if (existing) {
        return prisma.users.update({
            where: { id: existing.id },
            data: userData,
        });
    }

    return prisma.users.create({ data: userData });
}

async function upsertProduct(item) {
    return prisma.products.upsert({
        where: { sku: item.sku },
        update: item,
        create: item,
    });
}

async function upsertCoupon(item) {
    return prisma.coupons.upsert({
        where: { code: item.code },
        update: item,
        create: item,
    });
}

async function clearSeedOrders() {
    const deleted = await prisma.orders.deleteMany({
        where: {
            order_code: {
                startsWith: 'SEED-ORDER-',
            },
        },
    });

    console.log(`  - Da don ${deleted.count} don hang seed cu`);
}

async function main() {
    console.log('Đang kết nối cơ sở dữ liệu...');
    await waitForDatabase();

    console.log('Đang seed danh mục...');
    const categoryMap = {};
    for (const item of CATEGORY_ITEMS) {
        const record = await upsertCategory(item);
        categoryMap[record.name] = record;
        console.log(`  - Đã seed danh mục: ${record.name}`);
        await sleep(100);
    }

    console.log('Đang seed người dùng...');
    for (const item of USER_ITEMS) {
        const record = await upsertUser(item);
        console.log(`  - Đã seed người dùng: ${record.name} (${record.email})`);
        await sleep(100);
    }

    console.log('Đang seed kho nguyên liệu...');
    const inventoryMap = {};
    for (const item of INVENTORY_ITEMS) {
        const record = await upsertInventory(item);
        inventoryMap[record.name] = record;
        console.log(`  - Đã seed nguyên liệu: ${record.name}`);
        await sleep(100);
    }

    console.log('Đang tải ảnh sản phẩm lên Cloudinary...');
    const productImageMap = {};
    for (const item of PRODUCT_ITEMS) {
        const uploadedUrl = await uploadProductImageToCloudinary(item);
        productImageMap[item.sku] = uploadedUrl;
        if (uploadedUrl) {
            console.log(`  - Đã tải ảnh cho ${item.name}`);
        }
    }

    console.log('Đang seed sản phẩm...');
    const productMap = {};
    for (const item of PRODUCT_ITEMS) {
        const category = categoryMap[item.categoryName];

        if (!category) {
            throw new Error(`Không tìm thấy danh mục có tên ${item.categoryName}`);
        }

        const productData = {
            name: item.name,
            price: item.price,
            description: item.description,
            sku: item.sku,
            status: item.status,
            image: productImageMap[item.sku],
            category_id: category.id,
        };

        const record = await upsertProduct(productData);
        productMap[record.sku] = record;
        console.log(`  - Đã seed sản phẩm: ${record.name}`);
        await sleep(100);
    }

    const recipeProductIds = Object.values(productMap).map((product) => product.id);
    await prisma.recipes.deleteMany({
        where: {
            product_id: { in: recipeProductIds },
        },
    });
    await sleep(200);

    console.log('Đang seed công thức...');
    for (const recipeDefinition of RECIPE_DEFINITIONS) {
        const product = productMap[recipeDefinition.productSku];

        if (!product) {
            throw new Error(`Không tìm thấy sản phẩm có SKU ${recipeDefinition.productSku}`);
        }

        for (const item of recipeDefinition.items) {
            const inventory = inventoryMap[item.inventoryName];

            if (!inventory) {
                throw new Error(`Không tìm thấy nguyên liệu có tên ${item.inventoryName}`);
            }

            await prisma.recipes.create({
                data: {
                    product_id: product.id,
                    inventory_id: inventory.id,
                    quantity_used: item.quantity,
                },
            });

            console.log(`  - Đã thêm công thức: ${product.name} -> ${inventory.name} ${item.quantity}`);
            await sleep(100);
        }
    }

    console.log('Đang seed mã giảm giá...');
    for (const item of COUPON_ITEMS) {
        const record = await upsertCoupon(item);
        console.log(`  - Đã seed coupon: ${record.code}`);
        await sleep(100);
    }
    console.log('Dang don don hang seed cu...');
    await clearSeedOrders();

    console.log('Seed hoàn tất thành công.');
}

main()
    .catch((error) => {
        console.error('Lỗi seed:', error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
