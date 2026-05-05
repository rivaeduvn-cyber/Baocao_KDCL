/**
 * Seed test data for multi-level org tree (LOCAL ONLY).
 * Creates: 1 VT, 1 GĐ under VT, 1 TBP under GĐ, 2 STAFF under TBP.
 * All passwords = "test123".
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function ensureUser(data: {
  email: string;
  name: string;
  role: string;
  level: string | null;
  managerId: string | null;
  position?: string;
}) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) {
    await prisma.user.update({
      where: { id: exists.id },
      data: {
        level: data.level,
        managerId: data.managerId,
        position: data.position ?? null,
      },
    });
    return exists;
  }
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      level: data.level,
      managerId: data.managerId,
      position: data.position ?? null,
      password: await bcrypt.hash("test123", 10),
    },
  });
}

async function main() {
  const vt = await ensureUser({
    email: "vt@test.local", name: "Nguyễn Văn VT", role: "EMPLOYEE",
    level: "VIEN_TRUONG", managerId: null, position: "Viện trưởng",
  });
  const gd = await ensureUser({
    email: "gd@test.local", name: "Trần Thị GĐ", role: "EMPLOYEE",
    level: "GIAM_DOC", managerId: vt.id, position: "Giám đốc Vận hành",
  });
  const tbp = await ensureUser({
    email: "tbp@test.local", name: "Lê Văn TBP", role: "EMPLOYEE",
    level: "TRUONG_BO_PHAN", managerId: gd.id, position: "Trưởng bộ phận Khảo thí",
  });
  const staff1 = await ensureUser({
    email: "staff1@test.local", name: "Phạm Thị Nhân Sự 1", role: "EMPLOYEE",
    level: "STAFF", managerId: tbp.id,
  });
  const staff2 = await ensureUser({
    email: "staff2@test.local", name: "Đỗ Văn Nhân Sự 2", role: "EMPLOYEE",
    level: "STAFF", managerId: tbp.id,
  });

  console.log("Seeded org tree:");
  console.log(`  VT:    ${vt.email} / test123`);
  console.log(`  GĐ:    ${gd.email} / test123`);
  console.log(`  TBP:   ${tbp.email} / test123`);
  console.log(`  STAFF: ${staff1.email}, ${staff2.email} / test123`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
