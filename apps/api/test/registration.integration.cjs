const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@hyd/database");
const { hashPassword } = require("../dist/auth/password.js");

async function main() {
  const db = new PrismaClient();
  const base = process.env.API_INTEGRATION_URL ?? "http://localhost:4400/api/v1";
  const suffix = randomBytes(5).toString("hex");
  const password = `Stage3-${suffix}-Password!`;
  const request = (path, token, method = "GET", body, schoolId) => fetch(`${base}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(schoolId ? { "x-school-id": schoolId } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    const school = await db.drivingSchool.create({ data: { slug: `stage3-${suffix}`, name: "Stage 3 Test School" } });
    const otherSchool = await db.drivingSchool.create({ data: { slug: `stage3-other-${suffix}`, name: "Other School" } });
    const adminRole = await db.role.findUniqueOrThrow({ where: { key: "SCHOOL_ADMIN" } });
    const customerRole = await db.role.findUniqueOrThrow({ where: { key: "CUSTOMER" } });
    const admin = await db.user.create({ data: { email: `stage3-${suffix}@example.test`, displayName: "Stage 3 Admin", passwordHash: await hashPassword(password) } });
    await db.schoolMembership.create({ data: { userId: admin.id, schoolId: school.id, roleId: adminRole.id } });

    let response = await fetch(`${base}/auth/password/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: admin.email, password }) });
    assert.equal(response.status, 200);
    const adminToken = (await response.json()).accessToken;

    response = await request("/courses", adminToken, "POST", { code: "MAN-28", name: "Manual Driving", transmission: "MANUAL", price: 12000, classCount: 28, targetKmPerClass: 6, durationDays: 60 });
    assert.equal(response.status, 201);
    const course = await response.json();
    assert.equal(course.classCount, 28);

    response = await request("/courses", adminToken, "GET", undefined, otherSchool.id);
    assert.equal(response.status, 403);

    const digits = suffix.replace(/\D/g, "").padEnd(9, "7").slice(0, 9);
    const phone = `9${digits}`;
    response = await request("/customers", adminToken, "POST", { displayName: "Stage 3 Customer", phone, courseId: course.id, discountAmount: 1000, initialPaid: 4000 });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.customer.customerCode, /^SSA-[A-F0-9]{6}$/);
    assert.equal(result.enrollment.status, "NOT_STARTED");
    assert.equal(result.enrollment.firstLessonAt, null);
    assert.equal(result.enrollment.deadlineAt, null);
    assert.equal(Number(result.enrollment.priceSnapshot), 12000);
    assert.equal(result.enrollment.classCountSnapshot, 28);
    assert.equal(Number(result.enrollment.targetKmPerClassSnapshot), 6);
    assert.equal(result.enrollment.durationDaysSnapshot, 60);
    assert.equal(Number(result.enrollment.totalPayable), 11000);
    assert.equal(result.pendingAmount, 7000);

    await db.course.update({ where: { id: course.id }, data: { price: 15000, classCount: 30 } });
    const persisted = await db.courseEnrollment.findUniqueOrThrow({ where: { id: result.enrollment.id } });
    assert.equal(Number(persisted.priceSnapshot), 12000);
    assert.equal(persisted.classCountSnapshot, 28);

    response = await request("/customers", adminToken, "POST", { displayName: "Invalid Payment", phone: `8${digits}`, courseId: course.id, discountAmount: 0, initialPaid: 99999 });
    assert.equal(response.status, 400);

    const customer = await db.user.findUniqueOrThrow({ where: { phone } });
    const customerMembership = await db.schoolMembership.findFirstOrThrow({ where: { userId: customer.id, roleId: customerRole.id } });
    const customerSession = await db.refreshToken.create({ data: { userId: customer.id, membershipId: customerMembership.id, familyId: suffix, tokenHash: `${suffix}token`, expiresAt: new Date(Date.now() + 60000) } });
    const jwt = require("@nestjs/jwt");
    const token = await new jwt.JwtService({ secret: process.env.JWT_SECRET }).signAsync({ sub: customer.id, sid: customerSession.id, membershipId: customerMembership.id, schoolId: school.id, role: "CUSTOMER", type: "access" }, { expiresIn: 60 });
    response = await request("/courses", token);
    assert.equal(response.status, 403);

    console.log("integration: course rules, enrollment snapshots, payment opening balance, tenant isolation, role access, and inactive training timer passed");
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
