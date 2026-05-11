import React from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { useMeteo } from "../hooks/useMeteo"

const dataCO2 = [
  {annee:"2015",valeur:400},
  {annee:"2016",valeur:403},
  {annee:"2017",valeur:406},
  {annee:"2018",valeur:408},
  {annee:"2019",valeur:411},
  {annee:"2020",valeur:413},
  {annee:"2021",valeur:416},
  {annee:"2022",valeur:418},
  {annee:"2023",valeur:420},
  {annee:"2024",valeur:421}
]

const dataTemp = [
  {annee:"2015",valeur:0.9},
  {annee:"2016",valeur:1.1},
  {annee:"2017",valeur:1.0},
  {annee:"2018",valeur:1.0},
  {annee:"2019",valeur:1.1},
  {annee:"2020",valeur:1.2},
  {annee:"2021",valeur:1.2},
  {annee:"2022",valeur:1.3},
  {annee:"2023",valeur:1.4},
  {annee:"2024",valeur:1.4}
]

export default function Dashboard() {
  const { data, loading, error } = useMeteo()
  return (
    <div>
      <h2 style={{color:"#1a3a2a",marginBottom:"1.5rem"}}>📊 Dashboard Climatique</h2>
      <div style={{background:"#1a3a2a",borderRadius:"12px",padding:"1.25rem 1.5rem",marginBottom:"1.5rem",display:"flex",alignItems:"center",gap:"1rem",color:"white"}}>
        <span style={{fontSize:"1.5rem"}}>📍</span>
        <div>
          <div style={{fontSize:"0.8rem",opacity:"0.7"}}>Meteo en direct - Dax</div>
          {loading && <div>Chargement...</div>}
          {error && <div style={{color:"#ff6b6b"}}>{error}</div>}
          {data && <div style={{fontSize:"1.2rem",fontWeight:"700"}}>{data.temperature}°C - Vent: {data.windspeed} km/h</div>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.5rem",marginBottom:"2rem"}}>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🌡️</div>
          <div style={{fontSize:"0.85rem",color:"#666"}}>Témperature moyenne</div>
          <div style={{fontSize:"2rem",fontWeight:"700",color:"#e63946"}}>+1.4°C</div>
        </div>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>💨</div>
          <div style={{fontSize:"0.85rem",color:"#666"}}>CO2 atmosphérique</div>
          <div style={{fontSize:"2rem",fontWeight:"700",color:"#e63946"}}>421 ppm</div>
        </div>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🌊</div>
          <div style={{fontSize:"0.85rem",color:"#666"}}>Montée des eaux</div>
          <div style={{fontSize:"2rem",fontWeight:"700",color:"#e63946"}}>+3.6 mm/an</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"1.5rem"}}>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Evolution CO2 (ppm)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dataCO2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="annee" tick={{fontSize:12}} />
              <YAxis domain={[395,425]} tick={{fontSize:12}} />
              <Tooltip />
              <Area type="monotone" dataKey="valeur" stroke="#e63946" fill="#fde8ea" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Témperature moyenne (°C)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dataTemp}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="annee" tick={{fontSize:12}} />
              <YAxis domain={[0.8,1.5]} tick={{fontSize:12}} />
              <Tooltip />
              <Line type="monotone" dataKey="valeur" stroke="#2d6a4f" strokeWidth={2} dot={{fill:"#2d6a4f"}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
