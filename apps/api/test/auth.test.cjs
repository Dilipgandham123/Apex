const assert = require("node:assert/strict");
const test = require("node:test");
const { RolesGuard, TenantGuard } = require("../dist/auth/auth.guards.js");
const { hashPassword, verifyPassword } = require("../dist/auth/password.js");

const context = auth => ({
  getHandler: () => function handler() {},
  getClass: () => class Controller {},
  switchToHttp: () => ({ getRequest: () => ({ auth, headers: {} }) }),
});

test("password hashes verify without storing the password", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.equal(hash.includes("correct horse battery staple"), false);
});

test("customer role cannot use an admin-only operation", () => {
  const reflector = { getAllAndOverride: () => ["SCHOOL_ADMIN"] };
  const guard = new RolesGuard(reflector);
  assert.throws(() => guard.canActivate(context({ role: "CUSTOMER" })), /role cannot perform/i);
});

test("tenant guard rejects a school mismatch", () => {
  const guard = new TenantGuard();
  const request = { auth: { role: "SCHOOL_ADMIN", schoolId: "school-a" }, headers: { "x-school-id": "school-b" } };
  const crossSchool = { switchToHttp: () => ({ getRequest: () => request }) };
  assert.throws(() => guard.canActivate(crossSchool), /Cross-school access/i);
  request.headers["x-school-id"] = "school-a";
  assert.equal(guard.canActivate(crossSchool), true);
});
