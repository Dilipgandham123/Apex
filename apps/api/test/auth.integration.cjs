const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@hyd/database");
const { hashPassword } = require("../dist/auth/password.js");

async function main() {
  const db = new PrismaClient();
  const base = `${process.env.API_INTEGRATION_URL ?? "http://localhost:4400/api/v1"}/auth`;
  const suffix = randomBytes(5).toString("hex");
  const password = `Stage2-${suffix}-Password!`;
  const post = (path, body, cookie) => fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });

  try {
    const school = await db.drivingSchool.create({ data: { slug: `stage2-${suffix}`, name: "Stage 2 Test School" } });
    const adminRole = await db.role.upsert({ where: { key: "SCHOOL_ADMIN" }, update: {}, create: { key: "SCHOOL_ADMIN", name: "School Admin" } });
    const customerRole = await db.role.upsert({ where: { key: "CUSTOMER" }, update: {}, create: { key: "CUSTOMER", name: "Customer" } });
    const admin = await db.user.create({ data: { email: `admin-${suffix}@example.test`, displayName: "Stage 2 Admin", passwordHash: await hashPassword(password) } });
    await db.schoolMembership.create({ data: { userId: admin.id, schoolId: school.id, roleId: adminRole.id } });
    const phone = `9${suffix.replace(/[^0-9]/g, "").padEnd(9, "7").slice(0, 9)}`;
    const customer = await db.user.create({ data: { phone, displayName: "Stage 2 Customer" } });
    await db.schoolMembership.create({ data: { userId: customer.id, schoolId: school.id, roleId: customerRole.id } });

    let response = await post("/password/login", { identifier: admin.email, password });
    assert.equal(response.status, 200);
    let body = await response.json();
    const firstAccess = body.accessToken;
    const firstCookie = response.headers.get("set-cookie").split(";")[0];

    response = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${firstAccess}` } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).role, "SCHOOL_ADMIN");
    response = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${firstAccess}`, "x-school-id": "another-school" } });
    assert.equal(response.status, 403);

    response = await post("/refresh", {}, firstCookie);
    assert.equal(response.status, 200);
    body = await response.json();
    const rotatedAccess = body.accessToken;
    response = await post("/refresh", {}, firstCookie);
    assert.equal(response.status, 401);
    response = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${rotatedAccess}` } });
    assert.equal(response.status, 401);

    response = await post("/customer/request-otp", { phone });
    assert.equal(response.status, 200);
    body = await response.json();
    assert.match(body.developmentCode, /^\d{6}$/);
    response = await post("/customer/verify-otp", { challengeId: body.challengeId, code: body.developmentCode });
    assert.equal(response.status, 200);
    body = await response.json();
    assert.equal(body.user.role, "CUSTOMER");
    response = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${body.accessToken}`, "x-school-id": school.id } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, customer.id);

    response = await post("/password/login", { identifier: admin.email, password: "incorrect-password" });
    assert.equal(response.status, 401);
    const unknownPhone = `8${phone.slice(1)}`;
    for (let index = 0; index < 5; index++) {
      response = await post("/customer/request-otp", { phone: unknownPhone });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).developmentCode, undefined);
    }
    response = await post("/customer/request-otp", { phone: unknownPhone });
    assert.equal(response.status, 429);
    console.log("integration: password, tenant, refresh reuse, OTP, ownership, and rate-limit checks passed");
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
