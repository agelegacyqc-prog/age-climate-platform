// supabase/functions/notify-contact-request/index.ts
//
// Déclenchée par un Database Webhook Supabase sur INSERT dans demandes_contact_site.
// Envoie un email à contact@age-qc.com via l'API Resend (HTTPS).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = "AGE-QC <contact@age-qc.com>";
const TO_ADDRESS = "contact@age-qc.com";

Deno.serve(async (req: Request) => {
  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configuré" }),
        { status: 500 },
      );
    }

    const payload = await req.json();
    const record = payload.record ?? payload;

    const nom = record.nom ?? "Non renseigné";
    const email = record.email ?? "";
    const telephone = record.telephone ?? "Non renseigné";
    const organisation = record.organisation ?? "Non renseignée";
    const profil = record.profil ?? "Non renseigné";
    const message = record.message ?? "";
    const createdAt = record.created_at ?? new Date().toISOString();

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const html = `
      <h2>Nouvelle demande via age-qc.com</h2>
      <p><strong>Nom :</strong> ${nom}</p>
      <p><strong>Email :</strong> ${email || "Non renseigné"}</p>
      <p><strong>Téléphone :</strong> ${telephone}</p>
      <p><strong>Organisation :</strong> ${organisation}</p>
      <p><strong>Profil :</strong> ${profil}</p>
      <p><strong>Message :</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
      <hr>
      <p style="color:#666;font-size:12px;">Reçu le ${createdAt}</p>
    `;

    const emailPayload: Record<string, unknown> = {
      from: FROM_ADDRESS,
      to: [TO_ADDRESS],
      subject: `Nouvelle demande de contact — ${nom}`,
      html,
    };

    if (isValidEmail) {
      emailPayload.reply_to = email;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error("Erreur Resend:", resendResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: `Resend a répondu ${resendResponse.status}`, details: errorBody }),
        { status: 500 },
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500 },
    );
  }
});