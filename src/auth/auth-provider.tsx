import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  authKey,
  authRequest,
  loadAccount,
  loginAccount,
  readToken,
  registerAccount,
  saveToken,
} from "./auth-client";
import type { AuthUser, RegisterInput } from "./types";
type Auth = {
  user: AuthUser | null;
  checking: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: Omit<RegisterInput, "role">) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({
  application,
  children,
}: {
  application: "web" | "contractor" | "admin";
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    async function restore() {
      setChecking(true);
      try {
        const { user } = await loadAccount();
        if (user.role !== (application === "web" ? "owner" : application))
          throw Error("Wrong application");
        if (active) setUser(user);
      } catch {
        if (active) {
          saveToken("");
          setUser(null);
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    if (readToken()) void restore();
    else setChecking(false);
    const onStorage = (event: StorageEvent) => {
      if (event.key === authKey()) void restore();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return (
    <Context.Provider
      value={{
        user,
        checking,
        refresh: async () => {
          const { user } = await loadAccount();
          setUser(user);
        },
        login: async (email, password) => {
          const session = await loginAccount(email, password, application);
          saveToken(session.token);
          setUser(session.user);
        },
        register: async (input) => {
          if (application === "admin")
            throw Error(
              "Las cuentas administrativas requieren una invitación.",
            );
          const session = await registerAccount({
            ...input,
            role: application === "contractor" ? "contractor" : "owner",
          });
          saveToken(session.token);
          setUser(session.user);
        },
        logout: async () => {
          try {
            await authRequest("logout", {});
          } catch {
            // Always close the local session if the demo service is offline.
          } finally {
            saveToken("");
            setUser(null);
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw Error("AuthProvider is required");
  return value;
}
