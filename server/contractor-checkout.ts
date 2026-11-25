import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  invoiceBalance,
  type Invoice,
} from "../src/domain/contractor-estimates";
import type { Estimate } from "../src/domain/contractor-estimates";
import type { Database } from "./database/database";

function configuration(professionalId: string) {
  try {
    const accounts = JSON.parse(process.env.STRIPE_CONTRACTOR_ACCOUNTS || "{}");
    const account = accounts[professionalId];
    const secret = process.env.STRIPE_SECRET_KEY;
    const origin = new URL(process.env.PUBLIC_SITE_URL || "");
    if (
      typeof account !== "string" ||
      !/^acct_[a-zA-Z0-9]+$/.test(account) ||
      !secret ||
      !/^(sk|rk)_(test|live)_/.test(secret) ||
      !["https:", "http:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      (origin.protocol === "http:" && process.env.NODE_ENV === "production")
    )
      return;
    return { account, secret, origin: origin.origin };
  } catch {
    return undefined;
  }
}

export const checkoutEnabled = (professionalId: string) =>
  !!configuration(professionalId);
export const checkoutRange = (cents: number) =>
  cents >= 50 && cents <= 99_999_999;

const sessionSchema = z.object({
  id: z.string().regex(/^cs_[a-zA-Z0-9_]+$/),
  currency: z.literal("usd"),
  metadata: z.object({ invoice_id: z.uuid() }),
  payment_status: z.string(),
  amount_total: z.number().int().positive(),
  status: z.string(),
});
type CheckoutSession = z.infer<typeof sessionSchema>;

function recordCheckout(invoice: Invoice, session: CheckoutSession) {
  if (
    invoice.checkout?.id !== session.id ||
    session.metadata.invoice_id !== invoice.id ||
    session.payment_status !== "paid"
  )
    return false;
  if (
    invoice.payments.some(
      (payment) =>
        payment.source === "stripe" && payment.reference === session.id,
    )
  )
    return false;
  if (session.amount_total !== invoiceBalance(invoice))
    throw new Error("El importe recibido no coincide con el saldo.");
  invoice.payments.push({
    reference: session.id,
    amountCents: session.amount_total,
    receivedAt: new Date().toISOString(),
    source: "stripe",
  });
  return true;
}

async function stripe(
  professionalId: string,
  path: string,
  body?: URLSearchParams,
  key?: string,
) {
  const config = configuration(professionalId);
  if (!config)
    throw new Error(
      "El cobro en línea no está habilitado para este contratista.",
    );
  const response = await fetch(
    "https://api.stripe.com/v1/checkout/sessions" + path,
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${config.secret}`,
        "Stripe-Account": config.account,
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok)
    throw new Error(
      "Stripe no pudo procesar la operación. Intenta nuevamente.",
    );
  return response.json();
}

export async function startCheckout(
  professionalId: string,
  invoice: Invoice,
  projectId: string,
) {
  const config = configuration(professionalId);
  if (!config)
    throw new Error("Configura Stripe Connect para este contratista.");
  const back = `${config.origin}/#/workspace/owner/projects/${encodeURIComponent(projectId)}`;
  const session = await stripe(
    professionalId,
    "",
    new URLSearchParams({
      mode: "payment",
      success_url: back,
      cancel_url: back,
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(invoiceBalance(invoice)),
      "line_items[0][price_data][product_data][name]": invoice.number,
      "metadata[invoice_id]": invoice.id,
    }),
    `hc-${invoice.id}-${invoice.checkout?.id || "first"}`,
  );
  const paymentUrl = new URL(session.url);
  if (
    paymentUrl.origin !== "https://checkout.stripe.com" ||
    !/^cs_[a-zA-Z0-9_]+$/.test(session.id)
  )
    throw new Error("Stripe devolvió una sesión inválida.");
  invoice.checkout = {
    id: session.id,
    url: session.url,
    expiresAt: session.expires_at * 1000,
  };
  return invoice.checkout.url;
}

export async function checkCheckout(professionalId: string, invoice: Invoice) {
  if (!invoice.checkout) return "missing";
  const result = sessionSchema.safeParse(
    await stripe(professionalId, "/" + encodeURIComponent(invoice.checkout.id)),
  );
  if (
    !result.success ||
    result.data.metadata.invoice_id !== invoice.id ||
    result.data.id !== invoice.checkout.id
  )
    throw new Error("La sesión no coincide con la factura.");
  const session = result.data;
  if (session.payment_status === "paid") {
    recordCheckout(invoice, session);
    return "paid";
  }
  return session.status === "expired" ? "expired" : "open";
}

export async function stripeWebhook(
  db: Database,
  raw: Buffer,
  signature: string | string[] | undefined,
) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return 404;
  if (typeof signature !== "string") return 400;
  const parts = signature.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) ?? "";
  if (
    !/^\d+$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
  )
    return 400;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(raw)
    .digest();
  if (
    !parts.some(
      (part) =>
        /^v1=[0-9a-f]{64}$/i.test(part) &&
        timingSafeEqual(expected, Buffer.from(part.slice(3), "hex")),
    )
  )
    return 400;
  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return 400;
  }
  const event = z
    .object({
      type: z.string(),
      account: z.string().optional(),
      livemode: z.boolean(),
      data: z.object({ object: z.unknown() }),
    })
    .safeParse(payload);
  if (!event.success) return 400;
  if (!event.data.account || event.data.type !== "checkout.session.completed")
    return 200;
  const parsed = sessionSchema.safeParse(event.data.data.object);
  if (!parsed.success || parsed.data.payment_status !== "paid") return 200;
  const session = parsed.data;
  const { rows } = await db.sql.query<{
    namespace: string;
    professional_id: string;
    id: string;
    data: Estimate;
  }>(
    "SELECT namespace, professional_id, id, data FROM contractor_estimate WHERE (data->'invoices') @> $1::jsonb",
    [
      JSON.stringify([
        { id: session.metadata.invoice_id, checkout: { id: session.id } },
      ]),
    ],
  );
  for (const row of rows) {
    const config = configuration(row.professional_id);
    if (
      !config ||
      config.account !== event.data.account ||
      config.secret.includes("_live_") !== event.data.livemode
    )
      continue;
    const invoice = row.data.invoices?.find(
      (item) => item.id === session.metadata.invoice_id,
    );
    if (!invoice || !recordCheckout(invoice, session)) continue;
    await db.sql.query(
      "UPDATE contractor_estimate SET data=$4 WHERE namespace=$1 AND professional_id=$2 AND id=$3",
      [row.namespace, row.professional_id, row.id, JSON.stringify(row.data)],
    );
  }
  return 200;
}
