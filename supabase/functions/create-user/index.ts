// supabase/functions/create-user/index.ts
// Edge Function — création d'un utilisateur AGE
// Déploiement : supabase functions deploy create-user
 
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
 
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
 
serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
 
  try {
    // ── Vérifier que l'appelant est admin_national ────────────────────────
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
 
    // Client avec le JWT de l'appelant (droits limités)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )
 
    // Vérifier le rôle de l'appelant
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
 
    // ── Lire le payload ───────────────────────────────────────────────────
    const { email, password, prenom, nom, role, region } = await req.json()
 
    if (!email || !password || !prenom || !nom || !role) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
 
    if (["responsable_regional", "consultant"].includes(role) && !region) {
      return new Response(
        JSON.stringify({ error: "La région est obligatoire pour ce rôle" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
 
    // ── Créer l'utilisateur auth (service_role) ───────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
 
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
 
    // ── Créer le profil ───────────────────────────────────────────────────
    const { error: profilError } = await supabaseAdmin
      .from("profils")
      .insert({
        id: userId,
        prenom,
        nom,
        role,
        region: region || null,
        profil: "age",
      })
 
    if (profilError) {
      // Rollback : supprimer l'utilisateur auth créé
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: profilError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
 
    // ── Succès ────────────────────────────────────────────────────────────
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
 