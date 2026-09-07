import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import type { HealthResponse } from "@hyd/contracts";
import { DatabaseService } from "./database.service";

@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  getHealth(): HealthResponse {
    return { status: "ok", service: "api" };
  }

  @Get("ready")
  async getReadiness() {
    try {
      await this.database.$queryRaw`SELECT 1`;
      return { status: "ready", service: "api", database: "connected" };
    } catch {
      throw new ServiceUnavailableException({ status: "unavailable", service: "api", database: "disconnected" });
    }
  }
}
