import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type Save = (body: Record<string, unknown>) => Promise<string>;

export const read = (data: FormData, name: string) =>
  String(data.get(name) ?? "").trim();

export function EntryForm({
  children,
  label,
  save,
  reset = true,
  outline = false,
}: {
  children?: ReactNode;
  label: string;
  save: (data: FormData) => Promise<void | false>;
  reset?: boolean;
  outline?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const result = await save(data);
      if (reset && result !== false) form.reset();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={children ? "space-y-4" : undefined} onSubmit={submit}>
      {children && (
        <fieldset className="grid gap-4 md:grid-cols-2" disabled={busy}>
          {children}
        </fieldset>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant={outline ? "outline" : "default"}
        disabled={busy}
        aria-busy={busy}
      >
        {label}
      </Button>
    </form>
  );
}
