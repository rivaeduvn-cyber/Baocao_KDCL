/**
 * One-shot data migration: assign default level to existing users.
 *
 * Run after schema migration `20260505023115_add_user_org_tree`.
 *
 * Strategy:
 *   - role=ADMIN → level=null (Admin chỉ kỹ thuật, không nằm trong cây)
 *   - role=EMPLOYEE → level=STAFF (mặc định nhân sự bộ phận)
 *
 * Sau khi chạy, admin phải vào /admin/users gán level + manager
 * cho VT, GĐ, TBP cho phù hợp tổ chức thực tế.
 *
 * Usage: npx tsx prisma/migrate-data-org-tree.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, role: true, level: true, name: true },
  });

  let updated = 0;
  for (const u of users) {
    if (u.level !== null) continue; // skip nếu đã có level
    const newLevel = u.role === "ADMIN" ? null : "STAFF";
    if (newLevel === u.level) continue;
    await prisma.user.update({
      where: { id: u.id },
      data: { level: newLevel },
    });
    updated++;
    console.log(`  ${u.name} (${u.role}) → level=${newLevel ?? "null"}`);
  }
  console.log(`\nDone. Updated ${updated}/${users.length} user(s).`);
  console.log("Next step: visit /admin/users to assign VT, GD, TBP and managerId.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
