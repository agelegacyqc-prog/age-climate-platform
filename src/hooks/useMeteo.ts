import { useState, useEffect } from "react"
import axios from "axios"

export interface MeteoData {
  temperature: number
  windspeed: number
  weathercode: number
}

export function useMeteo() {
  const [data, setData] = useState<MeteoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    params.append("latitude","43.71")
    params.append("longitude","-1.05")
    params.append("current_weather","true")
    const url = "https://api.open-meteo.com/v1/forecast?"+params.toString()
    axios.get(url)
      .then(res => {
        setData(res.data.current_weather)
        setLoading(false)
      })
      .catch(() => {
        setError("Impossible de charger")
        setLoading(false)
      })
  }, [])

  return { data, loading, error }
}
