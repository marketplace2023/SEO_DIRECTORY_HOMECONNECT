import { useState, type FormEvent } from "react";
import { useAuth } from "./auth-provider";
import { Panel, copy } from "@/components/ecosystem/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Language } from "@/domain/types";

export function AccountClosure({ language }: { language: Language }) {
  const { user, closeAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = copy(language);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const password = String(
      new FormData(event.currentTarget).get("password") || "",
    );
    setBusy(true);
    setError("");
    try {
      await closeAccount(password);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Panel
      title={t("Baja definitiva de la cuenta", "Permanent account closure")}
    >
      <p className="eco-body">
        {t(
          "Al dar de baja tu cuenta, perderás el acceso y se cerrarán todas tus sesiones. Esta acción es definitiva.",
          "Closing your account permanently ends your access and signs you out of all sessions.",
        )}
      </p>
      {user?.role === "contractor" && (
        <p>
          {t(
            "Tu ficha dejará de aparecer en el directorio público.",
            "Your profile will be removed from the public directory.",
          )}
        </p>
      )}
      {confirming ? (
        <form onSubmit={submit} className="eco-form mt-4">
          <label>
            {t(
              "Confirma tu contraseña actual",
              "Confirm your current password",
            )}
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
              autoFocus
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="eco-actions">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setError("");
              }}
            >
              {t("Cancelar", "Cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {t("Confirmar baja definitiva", "Confirm permanent closure")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => setConfirming(true)}
        >
          {t("Dar de baja mi cuenta", "Close my account")}
        </Button>
      )}
    </Panel>
  );
}
