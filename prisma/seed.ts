import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminExists = await prisma.user.findUnique({
    where: { email: "admin@company.com" },
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: "admin@company.com",
        password: hashedPassword,
        name: "Admin",
        role: "ADMIN",
      },
    });
    console.log("Admin account created: admin@company.com / admin123");
  } else {
    console.log("Admin account already exists");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
