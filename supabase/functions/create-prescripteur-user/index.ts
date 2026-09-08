// supabase/functions/create-prescripteur-user/index.ts
// Edge Function — création du compte Auth d'un prescripteur (invitation par email)
// Déploiement : supabase functions deploy create-prescripteur-user

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

    // Aligné sur la policy RLS "prescripteurs_backoffice_write"
    const { data: profil } = await supabaseUser
      .from("profils")
      .select("role")
      .eq("id", caller.id)
      .single()

    if (!profil || !["admin", "admin_national", "responsable_regional", "consultant"].includes(profil.role)) {
      return new Response(
        JSON.stringify({ error: "Droits insuffisants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { prescripteur_id, email } = await req.json()

    if (!prescripteur_id || !email) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Vérifie que le prescripteur existe et n'a pas déjà de compte
    const { data: prescripteur, error: prescripteurError } = await supabaseAdmin
      .from("prescripteurs")
      .select("id, user_id, email")
      .eq("id", prescripteur_id)
      .single()

    if (prescripteurError || !prescripteur) {
      return new Response(
        JSON.stringify({ error: "Prescripteur introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    if (prescripteur.user_id) {
      return new Response(
        JSON.stringify({ error: "Ce prescripteur a déjà un compte activé" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Invitation par email : le prescripteur définit lui-même son mot de passe
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const userId = authData.user.id

    // Rattache le compte au prescripteur et active
    const { error: updateError } = await supabaseAdmin
      .from("prescripteurs")
      .update({ user_id: userId, statut_compte: "actif" })
      .eq("id", prescripteur_id)

    if (updateError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ user_id: userId, email }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})