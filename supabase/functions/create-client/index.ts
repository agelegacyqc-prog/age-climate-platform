import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller } } = await supabaseUser.auth.getUser()
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { data: profil } = await supabaseUser
      .from("profils")
      .select("role")
      .eq("id", caller.id)
      .single()

    if (!profil || !["admin", "admin_national"].includes(profil.role)) {
      return new Response(
        JSON.stringify({ error: "Droits insuffisants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { email, password, prenom, nom, type_client, raison_sociale } = await req.json()

    if (!email || !password || !type_client || !raison_sociale) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Créer le compte auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const userId = authData.user.id

    // 2. Créer l'organisation
    const { data: orgData, error: orgError } = await supabaseAdmin
  .from("organisations")
  .insert({ raison_sociale, type_client })
  .select("id")
  .single()

    if (orgError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: orgError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Créer le profil client
    const { error: profilError } = await supabaseAdmin
      .from("profils_client")
      .insert({
        id: userId,
        prenom: prenom || null,
        nom: nom || null,
        type_client,
        organisation_id: orgData.id,
        actif: true,
        onboarding_complete: false,
        role_client: "admin_client",
      })

    if (profilError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from("organisations").delete().eq("id", orgData.id)
      return new Response(
        JSON.stringify({ error: profilError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ user_id: userId, organisation_id: orgData.id }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})