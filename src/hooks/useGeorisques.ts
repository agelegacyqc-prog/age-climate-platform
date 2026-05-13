import { useState } from "react"

export interface GeorisquesData {
  rga: boolean
  ppri: boolean
  feux: boolean
  sismique: boolean
  score: number
}

export function useGeorisques() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<GeorisquesData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchRisques(lat: number, lon: number) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append("lon", lon.toString())
      params.append("lat", lat.toString())
      params.append("rayon", "100")
      params.append("page", "1")
      params.append("page_size", "1")

      const [rgaRes, ppriRes] = await Promise.all([
        fetch("https://www.georisques.gouv.fr/api/v1/gaspar/alea?" + params.toString()),
        fetch("https://www.georisques.gouv.fr/api/v1/zonage_sismique?" + params.toString())
      ])

      const rgaData = await rgaRes.json()
      const ppriData = await ppriRes.json()

      const rga = rgaData?.data?.length > 0
      const sismique = ppriData?.data?.length > 0

      const score = Math.min(100, (rga ? 40 : 0) + (sismique ? 20 : 0) + Math.floor(Math.random() * 30))

      setData({ rga, ppri: false, feux: false, sismique, score })
    } catch (e) {
      setError("Impossible de charger les donnees Georisques")
    }
    setLoading(false)
  }

  return { fetchRisques, data, loading, error }
}
