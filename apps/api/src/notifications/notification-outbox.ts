import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NotificationChannel, NotificationEvent, Prisma } from "@hyd/database";

export type NotificationPayload = { subject: string; text: string; values: string[]; otp?: boolean };
type Client = Pick<Prisma.TransactionClient, "notification">;
type QueueInput = { schoolId?: string | null; userId?: string | null; eventType: NotificationEvent; eventId: string; phone?: string | null; email?: string | null; payload: NotificationPayload; channels?: NotificationChannel[] };

const secret = () => {
  const value = process.env.NOTIFICATION_ENCRYPTION_KEY;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") throw new Error("NOTIFICATION_ENCRYPTION_KEY must contain at least 32 characters");
  return "local-notification-encryption-key-change-me";
};

export function encryptPayload(payload: NotificationPayload) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret()).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptPayload(value: string): NotificationPayload {
  const [iv, tag, encrypted] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret()).digest(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8")) as NotificationPayload;
}

export async function queueNotifications(client: Client, input: QueueInput) {
  const channels = input.channels ?? ["WHATSAPP", "EMAIL"];
  const destinations: Array<{ channel: NotificationChannel; recipient: string }> = [];
  if (input.phone && channels.includes("WHATSAPP")) destinations.push({ channel: "WHATSAPP", recipient: input.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1") });
  if (input.email && channels.includes("EMAIL")) destinations.push({ channel: "EMAIL", recipient: input.email.trim().toLowerCase() });
  if (!destinations.length) return { count: 0 };
  return client.notification.createMany({ data: destinations.map(({ channel, recipient }) => ({ schoolId: input.schoolId ?? null, userId: input.userId ?? null, eventType: input.eventType, channel, recipient, payloadEncrypted: encryptPayload(input.payload), idempotencyKey: `${input.eventType}:${input.eventId}:${channel}` })), skipDuplicates: true });
}
