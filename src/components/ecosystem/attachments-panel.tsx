import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/http";
import { apiEndpoint } from "@/lib/api";
import { readToken } from "@/auth/auth-client";
import { Panel, Field } from "./primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/auth-provider";
export function readFileData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(file);
  });
}

function ReferencePreview({ id, name }: { id: string; name: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let object = "";
    fetch(apiEndpoint("/media/" + id), {
      headers: { Authorization: "Bearer " + readToken() },
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.blob();
      })
      .then((blob) => {
        if (!controller.signal.aborted) {
          object = URL.createObjectURL(blob);
          setSrc(object);
        }
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (object) URL.revokeObjectURL(object);
    };
  }, [id]);
  return src ? (
    <img
      className="max-h-48 max-w-full rounded-lg object-contain"
      alt={name}
      src={src}
    />
  ) : null;
}

export function AttachmentsPanel({
  targetId,
  purpose,
  canUpload = true,
}: {
  targetId: string;
  purpose: "credential" | "portfolio" | "request" | "reference";
  canUpload?: boolean;
}) {
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setFiles(
        (
          await apiRequest("/api/files?target=" + encodeURIComponent(targetId))
        ).files.filter((file: any) => file.purpose === purpose),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [targetId, purpose]);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget),
      file = data.get("file") as File;
    if (!file?.size) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo supera 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const encoded = await readFileData(file);
      await apiRequest("/api/files", {
        name: String(data.get("name") || file.name),
        data: encoded,
        purpose,
        targetId,
        publicConsent: data.has("publicConsent"),
      });
      setMessage("Archivo guardado.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download(id: string) {
    try {
      const url = apiEndpoint("/media/" + id),
        response = await fetch(url, {
          headers: { Authorization: "Bearer " + readToken() },
        });
      if (!response.ok) throw Error("No puedes acceder a este archivo.");
      const object = URL.createObjectURL(await response.blob()),
        anchor = document.createElement("a");
      anchor.href = object;
      anchor.download = files.find((f) => f.id === id)?.name || "archivo";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(object), 30000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Panel
      title={
        purpose === "portfolio"
          ? "Imágenes del portafolio"
          : purpose === "credential"
            ? "Documentos privados"
            : purpose === "reference"
              ? "Imágenes de referencia"
              : "Archivos de la solicitud"
      }
    >
      <p className="eco-note">
        {purpose === "reference"
          ? "Hasta dos imágenes JPEG, PNG o WebP de 5 MB cada una."
          : "JPEG, PNG, WebP o PDF de hasta 5 MB."}{" "}
        {purpose === "portfolio"
          ? "Las imágenes se publican cuando tu ficha esté publicada."
          : purpose === "request" || purpose === "reference"
            ? "El cliente autoriza compartirlos con profesionales elegibles para esta solicitud."
            : "Solo tu cuenta y administración pueden descargarlos. Subir un documento no lo verifica automáticamente."}
      </p>
      {files.map((file) => (
        <div key={file.id} className="eco-record">
          <div>
            {purpose === "reference" && (
              <ReferencePreview id={file.id} name={file.name} />
            )}
            <strong>{file.name}</strong>
            <p>
              {Math.ceil(file.size / 1024)} KB · {file.id}
            </p>
          </div>
          <Button variant="outline" onClick={() => void download(file.id)}>
            Descargar archivo
          </Button>
        </div>
      ))}
      {canUpload && (purpose !== "reference" || files.length < 2) && (
        <form className="eco-form" onSubmit={(event) => void upload(event)}>
          <Field
            label={
              purpose === "portfolio"
                ? "Título del trabajo"
                : "Nombre del documento"
            }
          >
            <Input name="name" required maxLength={120} />
          </Field>
          <Field label="Selecciona un archivo">
            <input
              type="file"
              name="file"
              required
              accept={
                purpose === "portfolio" || purpose === "reference"
                  ? "image/jpeg,image/png,image/webp"
                  : "image/jpeg,image/png,image/webp,application/pdf"
              }
            />
          </Field>
          {purpose === "portfolio" && (
            <label>
              <input type="checkbox" name="publicConsent" required /> Autorizo
              publicar esta imagen como parte de mi portafolio.
            </label>
          )}
          <Button disabled={busy || !user?.emailVerified}>
            {busy ? "Cargando…" : "Subir archivo"}
          </Button>
          {!user?.emailVerified && <p>Confirma primero tu correo.</p>}
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </Panel>
  );
}
