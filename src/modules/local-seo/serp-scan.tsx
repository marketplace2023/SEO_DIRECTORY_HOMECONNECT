import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "@/components/ecosystem/primitives";
import type { SeoCampaign } from "@/domain/local-seo";
import { apiRequest } from "@/lib/http";
import type { SeoAction } from "./forms";

type Listing = {
  title: string;
  address?: string;
  placeId?: string;
  cid?: string;
  position?: number;
  rating?: number;
  reviews?: number;
};

export function SerpScan({
  campaign,
  targetId,
  professionalId,
  act,
  busy,
  onSaved,
}: {
  campaign: SeoCampaign;
  targetId: string;
  professionalId: string;
  act: SeoAction;
  busy: boolean;
  onSaved: () => void;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selection, setSelection] = useState("");
  const [looking, setLooking] = useState(false);
  const [looked, setLooked] = useState(false);
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<"business" | "service">("business");
  const maps = campaign.engine === "google_maps";
  const depth = maps ? 20 : 3;
  const request = { campaignId: campaign.id, targetId };
  const listing = listings.find(
    (item) => (item.placeId ?? item.cid) === selection,
  );

  async function lookup(mode: "business" | "service") {
    setIntent(mode);
    setLooking(true);
    setError("");
    setSelection("");
    setListings([]);
    setLooked(false);
    try {
      const data = await apiRequest<{ listings: Listing[] }>(
        `/api/local-seo/serp-lookup?professional=${encodeURIComponent(professionalId)}`,
        { ...request, intent: mode },
      );
      const choices = new Map<string, Listing>();
      for (const item of data.listings) {
        const key = item.placeId ?? item.cid;
        if (key && (maps || item.cid)) choices.set(key, item);
      }
      setListings([...choices.values()]);
      setLooked(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className="my-5 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="font-semibold">Medir con SerpApi</h3>
      {campaign.depth > depth && (
        <p className="text-sm text-neutral-700">
          Crea una campaña con profundidad{" "}
          {maps ? `de hasta ${depth}` : `de ${depth}`} para medir en{" "}
          {maps ? "Google Maps" : "Google Local Pack"}.
        </p>
      )}
      <p className="text-sm text-neutral-700">
        Busca la ficha externa y confirma cuál quieres localizar. La búsqueda de
        ficha usa una consulta y la medición usa hasta {campaign.size ** 2}{" "}
        consultas.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || looking}
          onClick={() => void lookup("business")}
        >
          Buscar por nombre del negocio
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || looking}
          onClick={() => void lookup("service")}
        >
          Buscar negocios por servicio
        </Button>
      </div>
      {looking && (
        <p role="status" className="text-sm">
          Consultando Google Maps…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {looked && !listings.length && (
        <p role="status" className="text-sm">
          No encontramos fichas compatibles cerca del centro de esta campaña.
        </p>
      )}
      {listings.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-700">
            {intent === "service"
              ? `Resultados para «${campaign.keyword}» en el centro de la campaña.`
              : "Coincidencias para identificar la ficha del negocio."}
          </p>
          <Field label="Ficha de Google Maps que se medirá">
            <NativeSelect
              disabled={busy}
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="">Selecciona una ficha</option>
              {listings.map((item) => (
                <option
                  key={item.placeId ?? item.cid}
                  value={item.placeId ?? item.cid}
                >
                  {item.title}
                  {intent === "service" &&
                    item.position &&
                    ` · Posición ${item.position}`}
                  {item.address && ` · ${item.address}`}
                  {intent === "service" &&
                    item.rating !== undefined &&
                    ` · ${item.rating}/5`}
                  {intent === "service" &&
                    item.reviews !== undefined &&
                    ` (${item.reviews} reseñas)`}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button
            type="button"
            disabled={busy || !listing || campaign.depth > depth}
            onClick={() => {
              if (listing)
                void act("serp-scan", { ...request, listing })
                  .then(onSaved)
                  .catch(() => {});
            }}
          >
            {busy
              ? "Midiendo…"
              : `Medir cuadrícula de ${campaign.size ** 2} puntos`}
          </Button>
        </div>
      )}
    </div>
  );
}
