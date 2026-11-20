import { useState, type FormEvent, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ecosystem/primitives";
import type { SeoProject } from "@/domain/local-seo";

export type SeoAction = (path: string, body: unknown) => Promise<void>;
export const value = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();
export function localDateTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export const observationTime = (data: FormData) =>
  new Date(value(data, "observedAt")).toISOString();
export function SeoForm({
  children,
  onSubmit,
  submit,
  busy,
  reset = true,
  actions,
  footerClassName,
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  submit: string;
  busy: boolean;
  reset?: boolean;
  actions?: ReactNode;
  footerClassName?: string;
}) {
  const [error, setError] = useState("");
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    try {
      await onSubmit(new FormData(form));
      if (reset) form.reset();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  return (
    <form onSubmit={send} className="grid gap-4">
      {children}
      <div
        className={`flex flex-wrap items-center gap-3 ${footerClassName || ""}`}
      >
        {error && (
          <p role="alert" className="w-full text-sm text-red-700">
            {error}
          </p>
        )}
        <Button className="w-fit" disabled={busy}>
          {busy ? "Guardando…" : submit}
        </Button>
        {actions}
      </div>
    </form>
  );
}

function NapFields({ nap }: { nap?: SeoProject["nap"] }) {
  return (
    <>
      <Field label="Nombre comercial">
        <Input name="name" defaultValue={nap?.name} required maxLength={300} />
      </Field>
      <Field label="Teléfono comercial">
        <Input
          name="phone"
          type="tel"
          defaultValue={nap?.phone}
          maxLength={300}
        />
      </Field>
      <Field label="Dirección comercial">
        <Input name="address" defaultValue={nap?.address} maxLength={600} />
      </Field>
      <Field label="Sitio web oficial">
        <Input
          name="website"
          type="url"
          defaultValue={nap?.website}
          placeholder="https://"
          maxLength={2000}
        />
      </Field>
    </>
  );
}
const readNap = (data: FormData) => ({
  name: value(data, "name"),
  phone: value(data, "phone"),
  address: value(data, "address"),
  website: value(data, "website"),
});

export function NapForm({
  project,
  act,
  busy,
}: {
  project: SeoProject;
  act: SeoAction;
  busy: boolean;
}) {
  return (
    <SeoForm
      reset={false}
      busy={busy}
      submit="Guardar datos de referencia"
      onSubmit={(data) =>
        act("profile", {
          nap: readNap(data),
          serviceAreaBusiness: data.has("serviceAreaBusiness"),
          reviewUrl: value(data, "reviewUrl"),
        })
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <NapFields nap={project.nap} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="serviceAreaBusiness"
          defaultChecked={project.serviceAreaBusiness}
        />
        Atiendo por área de servicio; no necesito publicar una dirección de
        atención
      </label>
      <p className="text-xs leading-6 text-neutral-500">
        Estos datos se usan como referencia privada de auditoría. Guardarlos no
        cambia automáticamente tu ficha pública ni los directorios externos.
      </p>
      <Field label="Enlace para solicitar reseñas (opcional)">
        <Input
          type="url"
          name="reviewUrl"
          defaultValue={project.reviewUrl}
          placeholder="URL oficial proporcionada por tu plataforma de reseñas"
        />
      </Field>
    </SeoForm>
  );
}

export function CitationForm({ act, busy }: { act: SeoAction; busy: boolean }) {
  return (
    <SeoForm
      busy={busy}
      submit="Registrar citación observada"
      onSubmit={(data) =>
        act("citation", {
          directory: value(data, "directory"),
          url: value(data, "url"),
          nap: readNap(data),
          status: value(data, "status"),
          observedAt: observationTime(data),
        })
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Directorio o plataforma">
          <Input name="directory" required maxLength={300} />
        </Field>
        <Field label="URL de la ficha observada">
          <Input name="url" type="url" required />
        </Field>
        <NapFields />
        <Field label="Estado observado">
          <NativeSelect name="status">
            <option value="published">Publicada</option>
            <option value="submitted">Enviada, pendiente de publicación</option>
            <option value="missing">No encontrada</option>
          </NativeSelect>
        </Field>
        <Field label="Fecha de comprobación">
          <Input
            name="observedAt"
            type="datetime-local"
            defaultValue={localDateTime()}
            required
          />
        </Field>
      </div>
      <p className="text-xs leading-6 text-neutral-500">
        Registra los valores que ves en la ficha externa. La comparación NAP
        detecta diferencias de texto y teléfono; no es una verificación postal
        ni un rastreo del directorio.
      </p>
    </SeoForm>
  );
}

export function CompetitorForm({
  act,
  busy,
}: {
  act: SeoAction;
  busy: boolean;
}) {
  return (
    <SeoForm
      busy={busy}
      submit="Añadir competidor documentado"
      onSubmit={(data) =>
        act("competitor", {
          name: value(data, "name"),
          website: value(data, "website"),
          notes: value(data, "notes"),
          observedAt: observationTime(data),
        })
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre del competidor">
          <Input name="name" required />
        </Field>
        <Field label="Sitio web">
          <Input name="website" type="url" />
        </Field>
      </div>
      <Field label="Observaciones y referencia consultada">
        <Textarea
          name="notes"
          maxLength={3000}
          placeholder="Qué observaste, dónde y qué conviene comparar"
        />
      </Field>
      <Field label="Fecha de observación">
        <Input
          name="observedAt"
          type="datetime-local"
          defaultValue={localDateTime()}
          required
        />
      </Field>
    </SeoForm>
  );
}

export function PlanForm({ act, busy }: { act: SeoAction; busy: boolean }) {
  return (
    <SeoForm
      busy={busy}
      submit="Guardar contenido planificado"
      onSubmit={(data) =>
        act("plan", {
          title: value(data, "title"),
          content: value(data, "content"),
          scheduledAt: new Date(value(data, "scheduledAt")).toISOString(),
          status: value(data, "status"),
        })
      }
    >
      <Field label="Título del contenido">
        <Input name="title" required maxLength={300} />
      </Field>
      <Field label="Texto del borrador">
        <Textarea name="content" required maxLength={5000} rows={5} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Fecha prevista">
          <Input
            name="scheduledAt"
            type="datetime-local"
            defaultValue={localDateTime()}
            required
          />
        </Field>
        <Field label="Estado editorial">
          <NativeSelect name="status">
            <option value="draft">Borrador</option>
            <option value="planned">Planificado</option>
          </NativeSelect>
        </Field>
      </div>
      <p className="text-xs leading-6 text-neutral-500">
        Calendario interno. La fecha no activa un envío automático a Google ni a
        otra red; la publicación externa sigue siendo manual.
      </p>
    </SeoForm>
  );
}
