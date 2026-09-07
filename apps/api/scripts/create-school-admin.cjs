const { PrismaClient } = require("@hyd/database");
const { randomBytes, scrypt } = require("node:crypto");
const { promisify } = require("node:util");

const derive = promisify(scrypt);

async function main() {
  const [email, password, displayName = "School Administrator", schoolSlug = "sri-sai-anu"] = process.argv.slice(2);
  if (!email || !password || password.length < 12) {
    throw new Error("Usage: npm run create:admin --workspace=@hyd/api -- <email> <password-12+-chars> [display-name] [school-slug]");
  }
  const db = new PrismaClient();
  try {
    const salt = randomBytes(16);
    const hash = await derive(password, salt, 64);
    const passwordHash = `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
    const school = await db.drivingSchool.upsert({
      where: { slug: schoolSlug },
      update: {},
      create: { slug: schoolSlug, name: "Sri Sai Anu Motor Driving School" },
    });
    const role = await db.role.upsert({
      where: { key: "SCHOOL_ADMIN" },
      update: {},
      create: { key: "SCHOOL_ADMIN", name: "School Admin" },
    });
    const user = await db.user.upsert({
      where: { email: email.toLowerCase() },
      update: { displayName, passwordHash, active: true },
      create: { email: email.toLowerCase(), displayName, passwordHash },
    });
    await db.schoolMembership.upsert({
      where: { userId_schoolId_roleId: { userId: user.id, schoolId: school.id, roleId: role.id } },
      update: { active: true },
      create: { userId: user.id, schoolId: school.id, roleId: role.id },
    });
    console.log(`School admin ready: ${email.toLowerCase()} (${school.slug})`);
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
