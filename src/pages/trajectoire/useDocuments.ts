// src/pages/trajectoire/useDocuments.ts
//
// Documents déposés d'une organisation (GED `documents` + table `trajectoire_documents`).
// Dépôt en 3 temps : 1) ligne GED, 2) fichier dans le bucket privé, 3) ligne trajectoire_documents.
// En cas d'échec d'une étape, la ligne GED créée est supprimée (les écritures bloquées par la RLS
// échouent en silence : on contrôle toujours le nombre de lignes renvoyées).

import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import {
  BUCKET_TRAJECTOIRE, cheminStockage, erreurFichier, typeFichierGed, typeMimeAutorise,
  type StatutAnalyse, type TypeDocument,
} from "../../lib/trajectoireDocuments"

export interface DocumentGed {
  nom: string
  nom_fichier: string | null
  storage_path: string | null
  taille_octets: number | null
  type_fichier: string | null
}

export interface DocumentLigne {
  id: string
  organisation_id: string
  document_id: string
  actif_id: string | null
  type_document: TypeDocument
  date_document: string | null
  date_validite: string | null
  statut_analyse: StatutAnalyse
  erreur: string | null
  depose_par: string | null
  archivee: boolean
  created_at: string
  document: DocumentGed | null
}

export interface DepotDocument {
  fichier: File
  type_document: TypeDocument
  date_document: string | null
  date_validite: string | null
}

export interface UseDocuments {
  documents: DocumentLigne[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
  /** Renvoie null si OK, sinon le message d'erreur à afficher. */
  deposer: (depot: DepotDocument) => Promise<string | null>
  /** Ouvre le fichier dans un nouvel onglet (lien signé de 60 secondes). Renvoie null si OK. */
  ouvrir: (ligne: DocumentLigne) => Promise<string | null>
  archiver: (id: string) => Promise<string | null>
  /** Relance de l'analyse IA d'un document (personnel AGE). Renvoie null si OK. */
  relancer: (id: string) => Promise<string | null>
  /** Rafraîchit la liste toutes les 4 s pendant `ms` millisecondes (après un dépôt, un consentement ou une relance). */
  surveiller: (ms: number) => void
}

export function useDocuments(
  organisationId: string | null,
  userId: string | null,
  mode: "client" | "personnel" | null,
): UseDocuments {
  const [documents, setDocuments] = useState<DocumentLigne[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [surveillerJusqua, setSurveillerJusqua] = useState(0)

  const recharger = useCallback(async () => {
    if (!organisationId) { setDocuments([]); return }
    setChargement(true)
    setErreur(null)
    const { data, error } = await supabase
      .from("trajectoire_documents")
      .select("*, document:documents(nom, nom_fichier, storage_path, taille_octets, type_fichier)")
      .eq("organisation_id", organisationId)
      .eq("archivee", false)
      .order("created_at", { ascending: false })
    if (error) {
      setErreur(error.message)
      setDocuments([])
    } else {
      setDocuments((data ?? []) as unknown as DocumentLigne[])
    }
    setChargement(false)
  }, [organisationId])

  useEffect(() => { void recharger() }, [recharger])

  const surveiller = useCallback((ms: number) => setSurveillerJusqua(Date.now() + ms), [])

  // Rafraîchissement automatique tant qu'un document est en analyse ou pendant la fenêtre de surveillance.
  const enAnalyse = documents.some(d => d.statut_analyse === "en_analyse")
  useEffect(() => {
    if (!organisationId) return
    const actif = () => enAnalyse || Date.now() < surveillerJusqua
    if (!actif()) return
    const minuteur = setInterval(() => { if (actif()) void recharger() }, 4000)
    return () => clearInterval(minuteur)
  }, [organisationId, enAnalyse, surveillerJusqua, recharger])

  const deposer = useCallback(async (depot: DepotDocument): Promise<string | null> => {
    if (!organisationId || !userId || !mode) return "Aucune organisation sélectionnée."
    const { fichier } = depot
    const refus = erreurFichier(fichier)
    if (refus) return refus
    const mime = typeMimeAutorise(fichier)
    if (!mime) return "Format non accepté."
    if (depot.date_document && depot.date_validite && depot.date_validite < depot.date_document) {
      return "La date de validité doit être postérieure à la date du document."
    }

    const chemin = cheminStockage(organisationId, crypto.randomUUID(), fichier.name)

    // 1) Ligne GED. La RLS de `documents` autorise l'insertion pour client_id = utilisateur ou consultant_id = utilisateur.
    const { data: ged, error: gedErr } = await supabase
      .from("documents")
      .insert({
        nom: fichier.name,
        nom_fichier: fichier.name,
        type_fichier: typeFichierGed(fichier.name),
        taille_octets: fichier.size,
        storage_path: chemin,
        client_id: mode === "client" ? userId : null,
        consultant_id: mode === "personnel" ? userId : null,
      })
      .select("id")
    if (gedErr) return gedErr.message
    if (!ged || ged.length === 0) return "Dépôt refusé : droits insuffisants."
    const documentId = ged[0].id as string

    async function annuler() {
      await supabase.from("documents").delete().eq("id", documentId)
    }

    // 2) Fichier dans le bucket privé.
    const { error: upErr } = await supabase.storage
      .from(BUCKET_TRAJECTOIRE)
      .upload(chemin, fichier, { contentType: mime, upsert: false })
    if (upErr) { await annuler(); return upErr.message }

    // 3) Ligne trajectoire_documents.
    const { data: tj, error: tjErr } = await supabase
      .from("trajectoire_documents")
      .insert({
        organisation_id: organisationId,
        document_id: documentId,
        type_document: depot.type_document,
        date_document: depot.date_document,
        date_validite: depot.date_validite,
        depose_par: userId,
      })
      .select("id")
    if (tjErr) { await annuler(); return tjErr.message }
    if (!tj || tj.length === 0) { await annuler(); return "Dépôt refusé : droits insuffisants." }

    surveiller(60_000)
    await recharger()
    return null
  }, [organisationId, userId, mode, recharger, surveiller])

  const ouvrir = useCallback(async (ligne: DocumentLigne): Promise<string | null> => {
    const chemin = ligne.document?.storage_path
    if (!chemin) return "Fichier introuvable."
    // Fenêtre ouverte tout de suite (avant l'appel réseau) pour ne pas être bloquée par le navigateur.
    const fenetre = window.open("about:blank", "_blank")
    const { data, error } = await supabase.storage.from(BUCKET_TRAJECTOIRE).createSignedUrl(chemin, 60)
    if (error || !data?.signedUrl) {
      fenetre?.close()
      return error?.message ?? "Lien d'accès impossible à créer."
    }
    if (fenetre) fenetre.location.href = data.signedUrl
    else window.location.href = data.signedUrl
    return null
  }, [])

  const archiver = useCallback(async (id: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("trajectoire_documents")
      .update({ archivee: true, archivee_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
    if (error) return error.message
    if (!data || data.length === 0) return "Archivage refusé : droits insuffisants ou document introuvable."
    await recharger()
    return null
  }, [recharger])

  const relancer = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase.functions.invoke("trajectoire-analyse", { body: { trajectoire_document_id: id } })
    if (error) {
      let detail = error.message
      const contexte: unknown = (error as { context?: unknown }).context
      if (contexte instanceof Response) {
        try {
          const corps: unknown = await contexte.json()
          if (typeof corps === "object" && corps !== null && typeof (corps as { error?: unknown }).error === "string") {
            detail = (corps as { error: string }).error
          }
        } catch { /* corps illisible : on garde le message générique */ }
      }
      return `Relance impossible : ${detail}`
    }
    surveiller(60_000)
    await recharger()
    return null
  }, [recharger, surveiller])

  return { documents, chargement, erreur, recharger, deposer, ouvrir, archiver, relancer, surveiller }
}