import { randomBytes, createHash, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import type { Database, StoredAccount } from "../database/database";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class EmailService {
  constructor(private db: Database) {}
  get local() {
    return !process.env.SMTP_HOST && process.env.NODE_ENV !== "production";
  }
  async issue(
    account: StoredAccount,
    purpose: "verify" | "reset",
    application: string,
  ) {
    if (!process.env.SMTP_HOST && !this.local)
      throw Error("El envío de correo no está configurado.");
    const token = randomBytes(32).toString("hex"),
      id = randomUUID();
    await this.db.sql.query(
      "DELETE FROM auth_token WHERE namespace=$1 AND user_id=$2 AND purpose=$3",
      [account.namespace, account.id, purpose],
    );
    await this.db.sql.query(
      "INSERT INTO auth_token(id,namespace,user_id,purpose,expires_at) VALUES($1,$2,$3,$4,$5)",
      [
        digest(token),
        account.namespace,
        account.id,
        purpose,
        new Date(
          Date.now() + (purpose === "reset" ? 30 : 1440) * 60000,
        ).toISOString(),
      ],
    );
    const origin =
      application === "contractor"
        ? process.env.SERVINEXO_CONTRACTOR_ORIGIN || "http://127.0.0.1:5180"
        : application === "admin"
          ? process.env.SERVINEXO_ADMIN_ORIGIN || "http://127.0.0.1:5181"
          : process.env.PUBLIC_SITE_URL ||
            process.env.SERVINEXO_WEB_ORIGIN ||
            "http://127.0.0.1:5175";
    const link = `${origin}/#/${purpose === "verify" ? "verify-email" : "reset-password"}?token=${token}&session=${encodeURIComponent(account.namespace)}`;
    const subject =
      purpose === "verify"
        ? "Confirma tu correo en HOME CONNECT"
        : "Restablece tu contraseña de HOME CONNECT";
    const record = {
      to: account.email,
      subject,
      text: `${subject}\n\n${link}\n\nSi no solicitaste esta acción, ignora este mensaje.`,
      createdAt: new Date().toISOString(),
      status: this.local ? "local" : "pending",
      userId: account.id,
    };
    if (!this.local) {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
        connectionTimeout: 10000,
      });
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: record.to,
          subject: record.subject,
          text: record.text,
        });
        record.status = "sent";
      } catch {
        record.status = "failed";
      }
    }
    // Production records deliberately exclude the bearer link and message body.
    await this.db.sql.query(
      "INSERT INTO mail_mail(id,namespace,data) VALUES($1,$2,$3)",
      [
        id,
        account.namespace,
        JSON.stringify(this.local ? record : { ...record, text: undefined }),
      ],
    );
  }
  async consume(token: string, purpose: "verify" | "reset") {
    const result = await this.db.sql.query<{
      namespace: string;
      user_id: string;
    }>(
      "DELETE FROM auth_token WHERE id=$1 AND purpose=$2 AND expires_at>now() RETURNING namespace,user_id",
      [digest(token), purpose],
    );
    if (!result.rows[0])
      throw Error("El enlace no es válido, ya se utilizó o ha vencido.");
    return result.rows[0];
  }
  async localInbox(namespace: string, userId: string) {
    if (!this.local) return [];
    return (
      await this.db.sql.query<{ data: any }>(
        "SELECT data FROM mail_mail WHERE namespace=$1 AND data->>'userId'=$2 ORDER BY data->>'createdAt' DESC LIMIT 10",
        [namespace, userId],
      )
    ).rows.map((r) => r.data);
  }
}
