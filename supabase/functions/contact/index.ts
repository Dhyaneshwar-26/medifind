// Supabase Edge Function: contact
//
// Receives Contact Us submissions from the MediFind web app and forwards them
// to the support inbox through Resend (https://resend.com).
//
// Deploy with:
//   supabase functions deploy contact --no-verify-jwt
//
// Required Supabase secret:
//   RESEND_API_KEY
//
// Optional secrets:
//   CONTACT_TO_EMAIL    (defaults to dhyaneshwarj26@gmail.com)
//   CONTACT_FROM_EMAIL  (defaults to "MediFind Support <onboarding@resend.dev>")
//   ALLOWED_ORIGIN      (comma-separated list, e.g. https://medifind.example)
//
// The Resend API key is read from the Edge Function environment only. It is
// never returned to the browser, logged, or included in any error response.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_TO_EMAIL = "dhyaneshwarj26@gmail.com";
const DEFAULT_FROM_EMAIL = "MediFind Support <onboarding@resend.dev>";

/** Hard cap on the request body so a malicious client cannot exhaust memory. */
const MAX_BODY_BYTES = 16 * 1024;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 140;
const MAX_MESSAGE_LENGTH = 4000;

/** Very small in-memory abuse guard. Per-isolate only; not a global quota. */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 5;
const RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>();

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  company?: unknown;
}

interface ValidationResult {
  ok: boolean;
  error?: string;
  values?: {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
}

function corsHeaders(request: Request): Record<string, string> {
  const configured = (Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.get("origin") ?? "";

  let allowOrigin = "*";
  if (configured.length > 0) {
    allowOrigin = configured.includes(requestOrigin) ? requestOrigin : configured[0];
  } else if (requestOrigin) {
    // No explicit allow-list configured (local development): reflect the caller.
    allowOrigin = requestOrigin;
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(
  request: Request,
  status: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

/** Remove control characters (including CR/LF) that enable header injection. */
function sanitizeSingleLine(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeMultiline(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(value: string): boolean {
  if (value.length > MAX_EMAIL_LENGTH) return false;
  // Deliberately conservative: one @, no whitespace, a dotted domain.
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value);
}

function validatePayload(payload: ContactPayload): ValidationResult {
  const rawName = typeof payload.name === "string" ? payload.name : "";
  const rawEmail = typeof payload.email === "string" ? payload.email : "";
  const rawSubject = typeof payload.subject === "string" ? payload.subject : "";
  const rawMessage = typeof payload.message === "string" ? payload.message : "";

  const name = sanitizeSingleLine(rawName);
  const email = sanitizeSingleLine(rawEmail).toLowerCase();
  const subject = sanitizeSingleLine(rawSubject);
  const message = sanitizeMultiline(rawMessage);

  if (name.length < 2) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: "Your name is too long." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return { ok: false, error: "The subject is too long." };
  }
  if (message.length < 10) {
    return { ok: false, error: "Please enter a message of at least 10 characters." };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: "Your message is too long. Please shorten it and try again." };
  }

  return { ok: true, values: { name, email, subject, message } };
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  // Keep the map bounded on long-lived isolates.
  if (RATE_BUCKETS.size > 5000) {
    for (const [bucketKey, bucket] of RATE_BUCKETS) {
      if (bucket.resetAt <= now) RATE_BUCKETS.delete(bucketKey);
    }
  }

  const bucket = RATE_BUCKETS.get(key);
  if (!bucket || bucket.resetAt <= now) {
    RATE_BUCKETS.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= RATE_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function buildEmailHtml(values: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const safeName = escapeHtml(values.name);
  const safeEmail = escapeHtml(values.email);
  const safeSubject = escapeHtml(values.subject || "(no subject)");
  const safeMessage = escapeHtml(values.message).replace(/\n/g, "<br />");

  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#20332D;line-height:1.6">',
    '<h2 style="color:#087F5B;margin:0 0 16px">New MediFind contact message</h2>',
    '<p style="margin:0 0 8px"><strong>Name:</strong> ' + safeName + "</p>",
    '<p style="margin:0 0 8px"><strong>Email:</strong> ' + safeEmail + "</p>",
    '<p style="margin:0 0 8px"><strong>Subject:</strong> ' + safeSubject + "</p>",
    '<hr style="border:none;border-top:1px solid #D1FAE5;margin:16px 0" />',
    '<p style="margin:0 0 8px"><strong>Message:</strong></p>',
    '<p style="margin:0;white-space:pre-wrap">' + safeMessage + "</p>",
    '<hr style="border:none;border-top:1px solid #D1FAE5;margin:16px 0" />',
    '<p style="margin:0;font-size:12px;color:#64748B">Reply directly to this email to answer ' +
      safeName +
      ".</p>",
    "</div>",
  ].join("");
}

function buildEmailText(values: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  return [
    "New MediFind contact message",
    "",
    "Name: " + values.name,
    "Email: " + values.email,
    "Subject: " + (values.subject || "(no subject)"),
    "",
    "Message:",
    values.message,
    "",
    "Reply directly to this email to answer " + values.name + ".",
  ].join("\n");
}

/**
 * Read the request body while enforcing a hard byte limit, so an oversized
 * body is rejected before it is fully buffered. Returns null when too large.
 */
async function readBodyWithLimit(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

Deno.serve(async (request: Request): Promise<Response> => {
  const headers = corsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, 405, { error: "Method not allowed." }, { Allow: "POST, OPTIONS" });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse(request, 415, { error: "Expected an application/json body." });
  }

  // ---- Read and size-check the body -------------------------------------
  let rawBody: string | null = null;
  try {
    rawBody = await readBodyWithLimit(request, MAX_BODY_BYTES);
  } catch {
    return jsonResponse(request, 400, { error: "The request body could not be read." });
  }
  if (rawBody === null) {
    return jsonResponse(request, 413, { error: "The request body is too large." });
  }
  if (!rawBody.trim()) {
    return jsonResponse(request, 400, { error: "The request body is empty." });
  }

  let payload: ContactPayload;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse(request, 400, { error: "The request body must be a JSON object." });
    }
    payload = parsed as ContactPayload;
  } catch {
    return jsonResponse(request, 400, { error: "The request body is not valid JSON." });
  }

  // ---- Honeypot ----------------------------------------------------------
  // A real browser never fills this visually hidden field. Report success so
  // automated bots do not learn that the submission was discarded.
  if (typeof payload.company === "string" && payload.company.trim() !== "") {
    return jsonResponse(request, 200, { ok: true, id: "ignored" });
  }

  // ---- Server-side validation -------------------------------------------
  const validation = validatePayload(payload);
  if (!validation.ok || !validation.values) {
    return jsonResponse(request, 422, { error: validation.error ?? "Invalid submission." });
  }
  const values = validation.values;

  // ---- Abuse protection --------------------------------------------------
  const ipLimit = checkRateLimit("ip:" + clientIp(request));
  if (!ipLimit.allowed) {
    return jsonResponse(
      request,
      429,
      { error: "Too many messages were sent from this connection. Please try again later." },
      { "Retry-After": String(ipLimit.retryAfterSeconds) },
    );
  }
  const emailLimit = checkRateLimit("email:" + values.email);
  if (!emailLimit.allowed) {
    return jsonResponse(
      request,
      429,
      { error: "Too many messages were sent from this email address. Please try again later." },
      { "Retry-After": String(emailLimit.retryAfterSeconds) },
    );
  }

  // ---- Configuration -----------------------------------------------------
  const apiKey = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
  if (!apiKey) {
    console.error("contact: RESEND_API_KEY is not configured");
    return jsonResponse(request, 503, {
      error: "Email delivery is not configured yet. Please try again later.",
    });
  }

  const toEmail = (Deno.env.get("CONTACT_TO_EMAIL") ?? "").trim() || DEFAULT_TO_EMAIL;
  const fromEmail = (Deno.env.get("CONTACT_FROM_EMAIL") ?? "").trim() || DEFAULT_FROM_EMAIL;

  // ---- Send through Resend ----------------------------------------------
  const emailSubject = "[MediFind Contact] " + (values.subject || "New message from " + values.name);

  let resendResponse: Response;
  try {
    resendResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: values.email,
        subject: emailSubject,
        html: buildEmailHtml(values),
        text: buildEmailText(values),
      }),
    });
  } catch (err) {
    console.error("contact: Resend request failed", err instanceof Error ? err.message : err);
    return jsonResponse(request, 502, {
      error: "The email service could not be reached. Please try again in a few minutes.",
    });
  }

  if (resendResponse.status === 429) {
    return jsonResponse(request, 429, {
      error: "The email service is rate-limiting messages. Please try again in a few minutes.",
    });
  }

  if (!resendResponse.ok) {
    const detail = await resendResponse.text().catch(() => "");
    console.error(
      "contact: Resend rejected the message",
      resendResponse.status,
      detail.slice(0, 500),
    );
    return jsonResponse(request, 502, {
      error: "The email service rejected the message. Please try again later.",
    });
  }

  let resendId = "";
  try {
    const result = (await resendResponse.json()) as { id?: unknown };
    if (typeof result.id === "string") resendId = result.id;
  } catch {
    // A successful status is enough; the id is only informational.
  }

  return jsonResponse(request, 200, { ok: true, id: resendId });
});
