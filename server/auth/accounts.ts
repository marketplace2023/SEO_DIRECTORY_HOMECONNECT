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
    const { id, name, email, role, professionalId, demo } = account;
    return {
      id,
      name,
      email,
      role,
      professionalId,
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
    if (account.role !== expected)
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
        a.role === (application === "web" ? "owner" : application),
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
  async reset(token: string, password: string) {
    const target = await this.email.consume(token, "reset");
    const account = this.accounts.find(
      (a) => a.namespace === target.namespace && a.id === target.user_id,
    );
    if (!account) throw Error("La cuenta no existe.");
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
