const assert = require("node:assert/strict");
const test = require("node:test");
const { HealthController } = require("../dist/health.controller.js");

test("health endpoint reports the API is live", () => {
  assert.deepEqual(new HealthController({}).getHealth(), { status: "ok", service: "api" });
});

test("readiness checks the database", async () => {
  const controller=new HealthController({$queryRaw:async()=>[1]});
  assert.deepEqual(await controller.getReadiness(),{status:"ready",service:"api",database:"connected"});
});
