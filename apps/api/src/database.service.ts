import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@hyd/database";

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: ["platform.manage", "school.manage", "users.manage", "lessons.manage", "payments.manage", "complaints.manage", "reports.view"],
  SCHOOL_ADMIN: ["school.manage", "users.manage", "lessons.manage", "payments.manage", "complaints.manage", "reports.view"],
  STAFF: ["lesson.operate", "own.view"],
  CUSTOMER: ["own.view"],
};

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    for (const [roleKey, permissionKeys] of Object.entries(rolePermissions)) {
      const role = await this.role.upsert({
        where: { key: roleKey },
        update: {},
        create: { key: roleKey, name: roleKey.split("_").map(word => word[0] + word.slice(1).toLowerCase()).join(" ") },
      });
      for (const permissionKey of permissionKeys) {
        const permission = await this.permission.upsert({
          where: { key: permissionKey },
          update: {},
          create: { key: permissionKey, description: permissionKey.replaceAll(".", " ") },
        });
        await this.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
