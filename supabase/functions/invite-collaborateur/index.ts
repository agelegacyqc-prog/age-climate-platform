import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email, prenom, nom, role_client } = await req.json()

    if (!email || !String(email).trim()) {
      return new Response(JSON.stringify({ error: "L'email est obligatoire." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── Client "appelant" — respecte RLS, sert uniquement à vérifier
    //    l'identité et le rôle de la personne qui invite ──────────────────
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Session invalide." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: monProfil, error: profilError } = await supabaseClient
      .from("profils_client")
      .select("organisation_id, role_client")
      .eq("id", user.id)
      .maybeSingle()

    if (profilError || !monProfil || monProfil.role_client !== "admin_client") {
      return new Response(JSON.stringify({ error: "Droits insuffisants — réservé aux administrateurs." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!monProfil.organisation_id) {
      return new Response(JSON.stringify({ error: "Aucune organisation rattachée à votre compte." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const roleFinal = role_client === "admin_client" ? "admin_client" : "utilisateur_client"

    // ── Client "admin" — service_role, bypass RLS, seul habilité à
    //    inviter et créer le profil correspondant ────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const appUrl = (Deno.env.get("APP_URL") || "").replace(/\/$/, "")

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        organisation_id: monProfil.organisation_id,
        role_client: roleFinal,
        prenom: prenom || null,
        nom: nom || null,
      },
      // Explicite plutôt que de dépendre du Site URL global (Dashboard →
      // Authentication → URL Configuration), qui peut être reconfiguré
      // pour d'autres besoins sans que ça casse ce flux d'invitation.
      redirectTo: appUrl ? `${appUrl}/client` : undefined,
    })

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { error: insertError } = await supabaseAdmin
      .from("profils_client")
      .insert({
        id: inviteData.user.id,
        organisation_id: monProfil.organisation_id,
        role_client: roleFinal,
        prenom: prenom || null,
        nom: nom || null,
        actif: true,
        onboarding_complete: false,
      })

    if (insertError) {
      // L'invitation email est déjà partie à ce stade — on le signale
      // explicitement plutôt que de laisser croire à un échec total.
      return new Response(JSON.stringify({
        error: "Invitation envoyée mais échec de création du profil : " + insertError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Erreur inconnue." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})