import { useSectionFilter } from "@/components/ecosystem/section-filter";
import { useEffect, useState, type FormEvent } from "react";
import { Panel, Field } from "@/components/ecosystem/primitives";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStore } from "@/domain/store";
import { apiRequest } from "@/lib/http";
export function SeoPage() {
  const [config, setConfig] = useState<any>(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<any>();
  const { state } = useStore();
  const filter = useSectionFilter<any>(
    config?.pages ?? [],
    (p) => [p.title, p.city, p.categoryId, p.description],
    "Título, localidad o especialidad",
    "es",
    {
      label: "Publicación",
      value: (p) => (p.published ? "Publicada" : "Borrador"),
    },
  );
  async function load() {
    try {
      setConfig(await apiRequest("/api/seo/config"));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>, kind: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const body =
        kind === "page"
          ? {
              id: "",
              city: data.get("city"),
              categoryId: data.get("categoryId"),
              title: data.get("title"),
              description: data.get("description"),
              content: data.get("content"),
              published: data.has("published"),
              indexable: data.has("indexable"),
            }
          : {
              professionalId: data.get("professionalId"),
              telephone: data.get("telephone"),
              address: data.get("address"),
              publish: data.has("publish"),
            };
      await apiRequest("/api/seo/" + kind, body);
      setMessage("Configuración SEO guardada.");
      await load();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="SEO local · Georgia">
      {config ? (
        <>
          <div className="seed-overview">
            <div>
              <strong>
                {config.indexingEnabled
                  ? "Indexación habilitada"
                  : "Modo de preparación · noindex"}
              </strong>
              <p>Dominio: {config.origin}</p>
            </div>
            <a
              href={config.origin + "/georgia"}
              target="_blank"
              rel="noreferrer"
            >
              Ver directorio local ↗
            </a>
          </div>
          <p className="eco-note">
            Sin dominio HTTPS e indexación habilitada, las páginas permanecen
            fuera del índice. No se publican estrellas de muestra ni datos
            estructurados de negocios ficticios.
          </p>
          <h3>Páginas por localidad y servicio</h3>
          {filter.controls}
          <div className="eco-records">
            {filter.visible.map((page: any) => (
              <button
                className="eco-record"
                key={page.id}
                onClick={() => setEditing(page)}
              >
                <div>
                  <strong>{page.title}</strong>
                  <p>
                    /georgia/{page.city}/{page.categoryId} ·{" "}
                    {page.published ? "Publicada" : "Borrador"}
                  </p>
                </div>
                <span>Editar</span>
              </button>
            ))}
          </div>
          <form
            key={editing?.id || "new"}
            className="eco-form"
            onSubmit={(event) => void save(event, "page")}
          >
            <div className="eco-form-grid">
              <Field label="Localidad">
                <select name="city" defaultValue={editing?.city} required>
                  {config.cities.map((city: any) => (
                    <option key={city.slug} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Especialidad">
                <select
                  name="categoryId"
                  defaultValue={editing?.categoryId || ""}
                >
                  <option value="">Todas las especialidades</option>
                  {config.categories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Título SEO">
              <Input
                name="title"
                minLength={15}
                maxLength={120}
                defaultValue={editing?.title}
                required
              />
            </Field>
            <Field label="Descripción SEO">
              <Textarea
                name="description"
                minLength={40}
                maxLength={320}
                defaultValue={editing?.description}
                required
              />
            </Field>
            <Field label="Contenido local útil">
              <Textarea
                name="content"
                minLength={80}
                maxLength={6000}
                rows={5}
                defaultValue={editing?.content}
                required
              />
            </Field>
            <label>
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing?.published}
              />{" "}
              Publicar página
            </label>
            <label>
              <input
                type="checkbox"
                name="indexable"
                defaultChecked={editing?.indexable}
              />{" "}
              Autorizar indexación cuando exista oferta real
            </label>
            <div className="eco-actions">
              <Button disabled={busy}>Guardar página SEO</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(undefined)}
              >
                Nueva página
              </Button>
            </div>
          </form>
          <h3 style={{ marginTop: 32 }}>Datos públicos del negocio</h3>
          <p className="eco-note">
            Solo publica datos autorizados. Para negocios de área de servicio
            sin dirección pública, deja la dirección vacía; no se inventará una
            para generar LocalBusiness.
          </p>
          <form
            className="eco-form"
            onSubmit={(event) => void save(event, "contact")}
          >
            <Field label="Profesional">
              <select name="professionalId">
                {state.professionals
                  .filter((p) => p.publication === "published")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Teléfono público">
              <Input name="telephone" maxLength={50} />
            </Field>
            <Field label="Dirección pública autorizada">
              <Input name="address" maxLength={250} />
            </Field>
            <label>
              <input type="checkbox" name="publish" /> Confirmo que estos datos
              están autorizados para publicación
            </label>
            <Button disabled={busy}>Guardar datos públicos</Button>
          </form>
          <p className="eco-note">
            <a href={config.origin + "/sitemap.xml"}>Sitemap</a> ·{" "}
            <a href={config.origin + "/robots.txt"}>Robots</a>
          </p>
        </>
      ) : (
        <p role="status">Cargando SEO local…</p>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="eco-error">
          {error}
        </p>
      )}
    </Panel>
  );
}
