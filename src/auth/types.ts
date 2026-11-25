export type AccountRole = "owner" | "contractor" | "admin" | "seo";
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  professionalId?: string;
  seoAccess?: {
    professionalIds: string[];
    manageDirectories: boolean;
    exportReports: boolean;
  };
  demo: boolean;
  emailVerified?: boolean;
};
export type AuthSession = { token: string; user: AuthUser };
export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: "owner" | "contractor";
  registrationCounty?: string;
  categoryId?: string;
  city?: string;
};
