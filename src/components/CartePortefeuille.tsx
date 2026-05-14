/**
 * CartePortefeuille.tsx
 * Carte Leaflet + OpenStreetMap des biens du portefeuille
 * Géocodage automatique via api-adresse.data.gouv.fr
 * Marqueurs colorés par niveau de risque climatique
 */

import React, { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

// Couleurs par niveau de risque
const COULEURS_RISQUE: Record<string, string> = {
  eleve:  "#B91C1C",
  moyen:  "#D97706",
  faible: "#2F7D5C",
}

const LABELS_RISQUE: Record<string, string> = {
  eleve:  "Risque élevé",
  moyen:  "Risque modéré",
  faible: "Risque faible",
}

interface Bien {
  id: string
  adresse: string
  ville: string
  code_postal: string
  niveau_risque: string
  score_risque: number
  latitude: number | null
  longitude: number | null
  geocode_status: string
}

// Géocodage d'un bien via api-adresse.data.gouv.fr
async function geocoderBien(bien: Bien): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${bien.adresse} ${bien.code_postal} ${bien.ville}`)
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1`)
    const data = await res.json()
    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates
      return { lat, lng }
    }
    return null
  } catch {
    return null
  }
}

export default function CartePortefeuille() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [biens, setBiens] = useState<Bien[]>([])
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState(false)
  const [stats, setStats] = useState({ total: 0, geocodes: 0 })

  // Chargement des biens
  useEffect(() => {
    async function charger() {
      const { data } = await supabase
        .from("biens")
        .select("id, adresse, ville, code_postal, niveau_risque, score_risque, latitude, longitude, geocode_status")
        .order("created_at", { ascending: false })

      if (data) {
        setBiens(data)
        setStats({
          total: data.length,
          geocodes: data.filter(b => b.latitude !== null).length,
        })

        // Géocoder les biens sans coordonnées
        const aGeocoer = data.filter(b => b.geocode_status === "pending" && b.adresse)
        if (aGeocoer.length > 0) {
          setGeocoding(true)
          for (const bien of aGeocoer) {
            const coords = await geocoderBien(bien)
            if (coords) {
              await supabase.from("biens").update({
                latitude: coords.lat,
                longitude: coords.lng,
                geocode_status: "done",
              }).eq("id", bien.id)
              bien.latitude = coords.lat
              bien.longitude = coords.lng
              bien.geocode_status = "done"
            } else {
              await supabase.from("biens").update({ geocode_status: "error" }).eq("id", bien.id)
            }
          }
          setGeocoding(false)
          setBiens([...data])
          setStats({
            total: data.length,
            geocodes: data.filter(b => b.latitude !== null).length,
          })
        }
      }
      setLoading(false)
    }
    charger()
  }, [])

  // Initialisation Leaflet
  useEffect(() => {
    if (loading || !mapRef.current) return

    async function initMap() {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      // Évite double init
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const map = L.map(mapRef.current!, {
        center: [46.8, 2.3],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: false,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Ajout des marqueurs
      const biensCoordonnes = biens.filter(b => b.latitude && b.longitude)
      const bounds: [number, number][] = []

      biensCoordonnes.forEach(bien => {
        const couleur = COULEURS_RISQUE[bien.niveau_risque] || "#78716C"
        const lat = bien.latitude as number
        const lng = bien.longitude as number

        // Icône SVG personnalisée
        const svgIcon = L.divIcon({
          className: "",
          html: `
            <div style="
              width: 28px; height: 28px;
              background: ${couleur};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              display: flex; align-items: center; justify-content: center;
              font-size: 10px; font-weight: 700; color: white;
              font-family: Inter, sans-serif;
            ">${bien.score_risque || "?"}</div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const marker = L.marker([lat, lng], { icon: svgIcon })

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 180px;">
            <div style="font-weight: 600; font-size: 13px; color: #1F2937; margin-bottom: 4px;">
              ${bien.adresse}
            </div>
            <div style="font-size: 12px; color: #78716C; margin-bottom: 8px;">
              ${bien.code_postal} ${bien.ville}
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: ${couleur};"></div>
              <span style="font-size: 11px; font-weight: 600; color: ${couleur};">
                ${LABELS_RISQUE[bien.niveau_risque] || bien.niveau_risque}
              </span>
              <span style="margin-left: auto; font-size: 11px; color: #78716C;">
                Score ${bien.score_risque}/100
              </span>
            </div>
          </div>
        `, { maxWidth: 240 })

        marker.addTo(map)
        bounds.push([lat, lng])
      })

      // Zoom automatique sur les biens
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
      }

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [loading, biens])

  return (
    <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden", border: "1px solid #E5E1DA" }}>

      {/* En-tête */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E1DA", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1F2937" }}>
            Cartographie du portefeuille
          </div>
          <div style={{ fontSize: "12px", color: "#78716C", marginTop: 2 }}>
            {loading ? "Chargement…" : geocoding ? `Géocodage en cours…` : `${stats.geocodes} bien${stats.geocodes > 1 ? "s" : ""} localisé${stats.geocodes > 1 ? "s" : ""} sur ${stats.total}`}
          </div>
        </div>

        {/* Légende */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {Object.entries(COULEURS_RISQUE).map(([niveau, couleur]) => (
            <div key={niveau} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: couleur, flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "#78716C" }}>{LABELS_RISQUE[niveau]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Carte */}
      {loading ? (
        <div style={{ height: "380px", display: "flex", alignItems: "center", justifyContent: "center", color: "#78716C", fontSize: "14px" }}>
          Chargement de la carte…
        </div>
      ) : stats.total === 0 ? (
        <div style={{ height: "380px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#78716C" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🗺️</div>
          <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>Aucun bien dans le portefeuille</div>
          <div style={{ fontSize: "12px" }}>Ajoutez des biens via une campagne pour les voir apparaître ici</div>
        </div>
      ) : (
        <div ref={mapRef} style={{ height: "380px", width: "100%" }} />
      )}

      {/* Indicateur géocodage */}
      {geocoding && (
        <div style={{ padding: "10px 20px", background: "#e0f2fe", borderTop: "1px solid #bae6fd", fontSize: "12px", color: "#0369a1", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0369a1", animation: "pulse 1s infinite" }} />
          Géocodage des adresses en cours via api-adresse.data.gouv.fr…
        </div>
      )}
    </div>
  )
}