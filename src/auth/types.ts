export type AccountRole = "owner" | "contractor" | "admin";
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  professionalId?: string;
  demo: boolean;
  emailVerified?: boolean;
};
export type AuthSession = { token: string; user: AuthUser };
export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: "owner" | "contractor";
  categoryId?: string;
  city?: string;
};
