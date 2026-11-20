import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { Database, type StoredAccount } from "../database/database";
import type {
  AuthUser,
  AuthSession,
  RegisterInput,
  AccountRole,
} from "../../src/auth/types";
import { demoAccounts } from "../../src/data/demo-accounts";
import { EmailService } from "./email";
type Account = StoredAccount;
type LoginSession = { accountId: string; namespace: string; expires: number };
export class Accounts {
  private accounts: Account[] = [];
  private sessions = new Map<string, LoginSession>();
  readonly email: EmailService;
  constructor(
    private database: Database,
    accounts: StoredAccount[],
  ) {
    this.accounts = accounts;
    this.email = new EmailService(database);
  }
  private async persist(accounts = this.accounts) {
    await this.database.saveAccounts(accounts);
  }
  private safe(account: Account): AuthUser {
    const { id, name, email, role, professionalId, demo, seoAccess } = account;
    return {
      id,
      name,
      email,
      role,
      professionalId,
      seoAccess,
      demo,
      emailVerified: account.demo || account.emailVerified === true,
    };
  }
  private issue(account: Account): AuthSession {
    const token = randomBytes(32).toString("hex");
    this.sessions.set(token, {
      accountId: account.id,
      namespace: account.namespace,
      expires: Date.now() + 86400000,
    });
    return { token, user: this.safe(account) };
  }
  async seed(namespace: string) {
    if (process.env.NODE_ENV === "production") return;
    const start = this.accounts.length;
    for (const sample of demoAccounts) {
      if (
        this.accounts.some(
          (a) => a.namespace === namespace && a.email === sample.email,
        )
      )
        continue;
      const salt = randomBytes(16).toString("hex");
      this.accounts.push({
        ...sample,
        role: sample.role as AccountRole,
        namespace,
        salt,
        hash: scryptSync("Servinexo2026!", salt, 64).toString("hex"),
        demo: true,
        ...(sample.role === "contractor" ? { professionalId: "ruiz" } : {}),
      });
    }
    await this.persist(this.accounts.slice(start));
  }
  async register(
    namespace: string,
    input: RegisterInput,
    professionalId?: string,
  ) {
    await this.seed(namespace);
    if (
      this.accounts.some(
        (a) =>
          a.namespace === namespace && a.email === input.email.toLowerCase(),
      )
    )
      throw Error("Este correo ya tiene una cuenta. Inicia sesión.");
    const salt = randomBytes(16).toString("hex");
    const account: Account = {
      id: randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      professionalId,
      demo: false,
      emailVerified: false,
      namespace,
      salt,
      hash: scryptSync(input.password, salt, 64).toString("hex"),
    };
    this.accounts.push(account);
    await this.persist([account]);
    await this.email.issue(
      account,
      "verify",
      input.role === "owner" ? "web" : "contractor",
    );
    return this.issue(account);
  }
  async login(
    namespace: string,
    email: string,
    password: string,
    application: string,
  ) {
    await this.seed(namespace);
    const account = this.accounts.find(
      (a) => a.namespace === namespace && a.email === email.toLowerCase(),
    );
    if (process.env.NODE_ENV === "production" && account?.demo)
      throw Error("Las cuentas de muestra no están habilitadas en producción.");
    if (
      !account ||
      !timingSafeEqual(
        Buffer.from(account.hash, "hex"),
        scryptSync(password, account.salt, 64),
      )
    )
      throw Error("Correo o contraseña incorrectos.");
    const expected = application === "web" ? "owner" : application;
    if (
      account.role !== expected &&
      !(application === "admin" && account.role === "seo")
    )
      throw Error(
        "Esta cuenta pertenece a otro portal. Usa el acceso correspondiente.",
      );
    return this.issue(account);
  }
  user(namespace: string, token: string): AuthUser | null {
    const session = this.sessions.get(token);
    if (
      !session ||
      session.namespace !== namespace ||
      session.expires < Date.now()
    )
      return null;
    const account = this.accounts.find(
      (a) => a.namespace === namespace && a.id === session.accountId,
    );
    return account ? this.safe(account) : null;
  }
  logout(token: string) {
    this.sessions.delete(token);
  }
  async resend(user: AuthUser, application: string) {
    const account = this.accounts.find((a) => a.id === user.id);
    if (account && !account.emailVerified && !account.demo)
      await this.email.issue(account, "verify", application);
  }
  async forgot(namespace: string, email: string, application: string) {
    await this.seed(namespace);
    const account = this.accounts.find(
      (a) =>
        a.namespace === namespace &&
        a.email === email.trim().toLowerCase() &&
        (a.role === (application === "web" ? "owner" : application) ||
          (application === "admin" && a.role === "seo")),
    );
    if (account) await this.email.issue(account, "reset", application);
  }
  async verify(token: string) {
    const target = await this.email.consume(token, "verify");
    const account = this.accounts.find(
      (a) => a.namespace === target.namespace && a.id === target.user_id,
    );
    if (!account) throw Error("La cuenta no existe.");
    account.emailVerified = true;
    await this.persist([account]);
  }
  seoUsers(namespace: string) {
    return this.accounts
      .filter((a) => a.namespace === namespace && a.role === "seo")
      .map((a) => this.safe(a));
  }
  async saveSeoUser(
    namespace: string,
    input: {
      id?: string;
      name: string;
      email: string;
      seoAccess: NonNullable<AuthUser["seoAccess"]>;
    },
    actorId: string,
  ) {
    let account = input.id
      ? this.accounts.find(
          (a) =>
            a.namespace === namespace && a.id === input.id && a.role === "seo",
        )
      : undefined;
    if (input.id && !account) throw Error("Usuario SEO no disponible.");
    if (account && account.email !== input.email.toLowerCase())
      throw Error(
        "El correo de una cuenta SEO existente se conserva. Crea otra invitación para un nuevo titular.",
      );
    const before = account ? this.safe(account) : null;
    if (account) account = structuredClone(account);
    if (
      this.accounts.some(
        (a) =>
          a.namespace === namespace &&
          a.email === input.email.toLowerCase() &&
          a.id !== account?.id,
      )
    )
      throw Error("El correo ya está registrado.");
    const created = !account;
    if (!account) {
      const salt = randomBytes(16).toString("hex");
      account = {
        id: randomUUID(),
        namespace,
        name: input.name,
        email: input.email.toLowerCase(),
        role: "seo",
        demo: false,
        emailVerified: false,
        salt,
        hash: scryptSync(randomBytes(32).toString("hex"), salt, 64).toString(
          "hex",
        ),
      };
    }
    Object.assign(account, {
      name: input.name,
      email: input.email.toLowerCase(),
      seoAccess: input.seoAccess,
    });
    const saved = account;
    await this.database.sql.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO prototype_dataset(namespace,data) VALUES($1,'{}') ON CONFLICT DO NOTHING",
        [namespace],
      );
      await tx.query(
        "INSERT INTO res_users(namespace,id,position,data) VALUES($1,$2,0,$3) ON CONFLICT(namespace,kind,id) DO UPDATE SET data=excluded.data",
        [namespace, saved.id, JSON.stringify(saved)],
      );
      await tx.query(
        "INSERT INTO local_seo_activity(namespace,id,professional_id,data) VALUES($1,$2,$3,$4)",
        [
          namespace,
          randomUUID(),
          "__accounts__",
          JSON.stringify({
            id: randomUUID(),
            at: new Date().toISOString(),
            actorId,
            action: "seo-access",
            detail: created
              ? "Usuario SEO invitado"
              : "Asignaciones SEO actualizadas",
            before,
            after: this.safe(saved),
          }),
        ],
      );
    });
    if (created) this.accounts.push(account);
    else
      this.accounts = this.accounts.map((a) =>
        a.id === saved.id && a.namespace === namespace ? saved : a,
      );
    if (created) await this.email.issue(account, "reset", "admin");
    return this.safe(account);
  }
  async reset(token: string, password: string) {
    const target = await this.email.consume(token, "reset");
    const account = this.accounts.find(
      (a) => a.namespace === target.namespace && a.id === target.user_id,
    );
    if (!account) throw Error("La cuenta no existe.");
    if (account.role === "seo") account.emailVerified = true;
    account.salt = randomBytes(16).toString("hex");
    account.hash = scryptSync(password, account.salt, 64).toString("hex");
    await this.persist([account]);
    for (const [token, session] of this.sessions)
      if (
        session.accountId === account.id &&
        session.namespace === account.namespace
      )
        this.sessions.delete(token);
  }
}
