const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      {
        name: "Nguyen Gia Huy",
        email: "a@gmail.com",
      },
      {
        name: "Cao Chi Huy",
        email: "b@gmail.com",
      },
      {
        name: "Phan Huỳnh Nhất Tâm",
        email: "c@gmail.com",
      },
    ],
  });

  console.log("Seed data inserted");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
