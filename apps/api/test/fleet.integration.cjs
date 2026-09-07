const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@hyd/database");
const { hashPassword } = require("../dist/auth/password.js");

async function main() {
  const db = new PrismaClient();
  const base = process.env.API_INTEGRATION_URL ?? "http://localhost:4400/api/v1";
  const suffix = randomBytes(5).toString("hex");
  const adminPassword = `Stage4-admin-${suffix}!`;
  const staffPassword = `Stage4-driver-${suffix}!`;
  const call = (path, token, method = "GET", body, schoolId) => fetch(`${base}${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(schoolId ? { "x-school-id": schoolId } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

  try {
    const school = await db.drivingSchool.create({ data: { slug: `stage4-${suffix}`, name: "Stage 4 School" } });
    const otherSchool = await db.drivingSchool.create({ data: { slug: `stage4-other-${suffix}`, name: "Other Stage 4 School" } });
    const adminRole = await db.role.findUniqueOrThrow({ where: { key: "SCHOOL_ADMIN" } });
    const admin = await db.user.create({ data: { email: `stage4-admin-${suffix}@example.test`, displayName: "Stage 4 Admin", passwordHash: await hashPassword(adminPassword) } });
    await db.schoolMembership.create({ data: { userId: admin.id, schoolId: school.id, roleId: adminRole.id } });
    let response = await fetch(`${base}/auth/password/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: admin.email, password: adminPassword }) });
    assert.equal(response.status, 200);
    const adminToken = (await response.json()).accessToken;

    const createVehicle = async (registrationNumber, transmission) => {
      const result = await call("/vehicles", adminToken, "POST", { registrationNumber, make: "Maruti Suzuki", model: "Swift", transmission, odometerKm: 12000 });
      assert.equal(result.status, 201); return result.json();
    };
    const manual = await createVehicle(`TS09M${suffix.slice(0, 5)}`, "MANUAL");
    const secondManual = await createVehicle(`TS09N${suffix.slice(0, 5)}`, "MANUAL");
    const automatic = await createVehicle(`TS09A${suffix.slice(0, 5)}`, "AUTOMATIC");

    const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    response = await call("/staff", adminToken, "POST", { displayName: "Manual Driver", email: `stage4-driver-${suffix}@example.test`, password: staffPassword, licenceNumber: `DL-${suffix}`, licenceExpiresAt: future, canDriveManual: true, canDriveAutomatic: false });
    assert.equal(response.status, 201);
    const driver = await response.json();

    response = await call(`/staff/${driver.id}/vehicle-assignment`, adminToken, "POST", { vehicleId: automatic.id });
    assert.equal(response.status, 400);
    response = await call(`/staff/${driver.id}/vehicle-assignment`, adminToken, "POST", { vehicleId: manual.id });
    assert.equal(response.status, 201);
    response = await call(`/staff/${driver.id}/vehicle-assignment`, adminToken, "POST", { vehicleId: secondManual.id });
    assert.equal(response.status, 201);
    assert.equal(await db.driverVehicleAssignment.count({ where: { staffId: driver.id, endedAt: null } }), 1);

    response = await fetch(`${base}/auth/password/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: driver.user.email, password: staffPassword }) });
    assert.equal(response.status, 200);
    const staffToken = (await response.json()).accessToken;
    response = await call("/staff/me", staffToken);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).vehicleAssignments[0].vehicle.id, secondManual.id);
    response = await call(`/vehicles/${manual.id}/issues`, staffToken, "POST", { severity: "HIGH", description: "Brake pedal feels unusually soft" });
    assert.equal(response.status, 403);
    response = await call(`/vehicles/${secondManual.id}/issues`, staffToken, "POST", { severity: "HIGH", description: "Brake pedal feels unusually soft" });
    assert.equal(response.status, 201);

    response = await call(`/vehicles/${secondManual.id}/status`, adminToken, "PATCH", { status: "MAINTENANCE" });
    assert.equal(response.status, 200);
    assert.equal(await db.driverVehicleAssignment.count({ where: { staffId: driver.id, endedAt: null } }), 0);
    response = await call(`/staff/${driver.id}/vehicle-assignment`, adminToken, "POST", { vehicleId: secondManual.id });
    assert.equal(response.status, 400);

    response = await call(`/staff/${driver.id}/vehicle-assignment`, adminToken, "POST", { vehicleId: manual.id });
    assert.equal(response.status, 201);
    response = await call(`/staff/${driver.id}/status`, adminToken, "PATCH", { status: "INACTIVE" });
    assert.equal(response.status, 200);
    assert.equal(await db.driverVehicleAssignment.count({ where: { staffId: driver.id, endedAt: null } }), 0);
    response = await call("/staff/me", staffToken);
    assert.equal(response.status, 401);

    response = await call("/vehicles", adminToken, "GET", undefined, otherSchool.id);
    assert.equal(response.status, 403);
    console.log("integration: staff permissions, licence eligibility, exclusive assignment, vehicle maintenance, issue ownership, access deactivation, and tenant isolation passed");
  } finally { await db.$disconnect(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
