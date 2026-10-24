// Cloudflare Pages Function: POST /api/contact
// Sends website contact-form messages to contact@yachtcrewcenter.com through SendGrid.
// Needs one secret set in Cloudflare Pages: SENDGRID_API_KEY (a SendGrid key with "Mail Send" permission only).
const TO = "contact@yachtcrewcenter.com";
const FROM = "noreply@yachtcrewcenter.com";
const clean = (v, max) => String(v || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: "bad_request" }, 400); }
  if (d.company_website) return json({ ok: true }); // honeypot: silently drop bots
  const name = clean(d.name, 120), email = clean(d.email, 200), role = clean(d.role, 60);
  const message = String(d.message || "").trim().slice(0, 5000);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "invalid" }, 400);
  if (!env.SENDGRID_API_KEY) return json({ ok: false, error: "not_configured" }, 500);

  const text = `New message from the YCC website contact form\n\nName: ${name}\nEmail: ${email}\nI am a: ${role}\n\nMessage:\n${message}\n`;
  const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { authorization: `Bearer ${env.SENDGRID_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: TO }] }],
      from: { email: FROM, name: "YCC Website" },
      reply_to: { email, name },
      subject: `Website contact: ${name} (${role || "unspecified"})`,
      content: [{ type: "text/plain", value: text }],
    }),
  });
  if (!r.ok) return json({ ok: false, error: "send_failed" }, 502);
  return json({ ok: true });
}
export const onRequest = () => json({ ok: false, error: "method_not_allowed" }, 405);
