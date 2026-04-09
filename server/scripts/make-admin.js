require('dotenv').config();

const prisma = require('../src/config/prisma');

async function main() {
    const email = process.argv[2]?.trim().toLowerCase();

    if (!email) {
        throw new Error('Vui lòng truyền email. Ví dụ: node scripts/make-admin.js admin@example.com');
    }

    const existingUser = await prisma.users.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });

    if (!existingUser) {
        throw new Error(`Không tìm thấy user với email: ${email}`);
    }

    const updatedUser = await prisma.users.update({
        where: { email },
        data: { role: 'admin' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
        },
    });

    console.log('Updated user:', JSON.stringify(updatedUser, null, 2));
}

main()
    .catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
