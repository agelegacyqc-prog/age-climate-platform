import React, { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface Props {
  adresse: string
  ville: string
  codePostal: string
  lat?: number
  lng?: number
}

export default function CarteBienRisques({ adresse, ville, codePostal, lat, lng }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const defaultLat = lat || 46.5
    const defaultLng = lng || 2.5
    const zoom       = lat ? 16 : 5

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([defaultLat, defaultLng], zoom)
    mapInstance.current = map

    // Fond OSM
    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map)

// Couche RGA
const rgaLayer = L.tileLayer.wms("https://georisques.gouv.fr/services", {
  layers:      "ALEARG_REALISE",
  format:      "image/png",
  transparent: true,
  opacity:     0.6,
  version:     "1.3.0",
  attribution: "BRGM Georisques",
}).addTo(map)
// Couche PPRi
const ppriLayer = L.tileLayer.wms("https://georisques.gouv.fr/services", {
  layers:      "lt_pprn_commune",
  format:      "image/png",
  transparent: true,
  opacity:     0.5,
  version:     "1.3.0",
  attribution: "BRGM Georisques",
}).addTo(map)
    // Contrôle des couches
    L.control.layers(
      { "OpenStreetMap": osmLayer },
      { "RGA (Argiles)": rgaLayer, "PPRi (Inondation)": ppriLayer },
      { position: "topright", collapsed: false }
    ).addTo(map)

    // Légende
    const LegendControl = L.Control.extend({
      onAdd: () => {
        const div = L.DomUtil.create("div")
        div.style.cssText = "background:white;padding:8px 12px;border-radius:6px;border:1px solid #E2E8F0;font-size:11px;line-height:2"
        div.innerHTML = `
          <div style="font-weight:600;margin-bottom:2px;color:#0F172A">Légende</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#D97706;opacity:0.7;margin-right:6px;border-radius:2px;vertical-align:middle"></span>RGA</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#0369A1;opacity:0.6;margin-right:6px;border-radius:2px;vertical-align:middle"></span>PPRi</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#0F6E56;border-radius:50%;margin-right:6px;vertical-align:middle"></span>Bien</div>
        `
        return div
      }
    })
    new LegendControl({ position: "bottomright" }).addTo(map)

    // Fonction pour ajouter le marqueur
    function ajouterMarqueur(gLat: number, gLng: number) {
      const icon = L.divIcon({
        html: `<div style="background:#0F6E56;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: "",
        iconSize:   [14, 14],
        iconAnchor: [7, 7],
      })
      L.marker([gLat, gLng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${adresse}</strong><br>${ville} ${codePostal}`)
        .openPopup()
      map.setView([gLat, gLng], 16)
    }

    // Marqueur direct si coordonnées fournies
    if (lat && lng) {
      ajouterMarqueur(lat, lng)
    } else if (adresse && ville) {
      // Géocodage Nominatim — essai 1 : adresse complète
      const query1 = encodeURIComponent(`${adresse}, ${codePostal} ${ville}, France`)
      fetch(`https://nominatim.openstreetmap.org/search?q=${query1}&format=json&limit=1&countrycodes=fr`, {
        headers: { "Accept-Language": "fr" }
      })
        .then(r => r.json())
        .then(data => {
          if (data[0]) {
            ajouterMarqueur(parseFloat(data[0].lat), parseFloat(data[0].lon))
          } else {
            // Essai 2 : ville + code postal seulement
            const query2 = encodeURIComponent(`${codePostal} ${ville}, France`)
            return fetch(`https://nominatim.openstreetmap.org/search?q=${query2}&format=json&limit=1&countrycodes=fr`)
              .then(r => r.json())
              .then(data2 => {
                if (data2[0]) {
                  map.setView([parseFloat(data2[0].lat), parseFloat(data2[0].lon)], 14)
                }
              })
          }
        })
        .catch(() => {})
    }

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  return (
    <div style={{ width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
      <div ref={mapRef} style={{ width: "100%", height: "380px", zIndex: 0 }} />
    </div>
  )
}