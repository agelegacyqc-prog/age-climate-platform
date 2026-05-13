import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function DashboardClient() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [actifs, setActifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    const { data } = await supabase.from("actifs").select("*").eq("user_id", user?.id)
    setActifs(data || [])
    setLoading(false)
  }

  const alertes = [
    {icone:"⚠️",texte:"Décret Tertiaire — Rapport 2025 à déposer",echeance:"30/09/2025",color:"#d97706"},
    {icone:"🔴",texte:"Décret BACS — Mise en conformité requise",echeance:"01/01/2025",color:"#b91c1c"},
    {icone:"📋",texte:"Audit énergétique — Renouvellement dans 6 mois",echeance:"01/11/2025",color:"#0369a1"}
  ]

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>👤 Mon compte</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>{user?.email}</p>
        </div>
        <button onClick={() => navigate("/client/actifs/nouveau")} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 1.75rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700",fontSize:"1rem"}}>
          + Créer un actif
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
        <div style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:"4px solid #1a3a2a"}}>
          <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.25rem"}}>Actifs enregistrés</div>
          <div style={{fontSize:"2rem",fontWeight:"800",color:"#1a3a2a"}}>{actifs.length}</div>
        </div>
        <div style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:"4px solid #d97706"}}>
          <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.25rem"}}>Alertes réglementaires</div>
          <div style={{fontSize:"2rem",fontWeight:"800",color:"#d97706"}}>{alertes.length}</div>
        </div>
        <div style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:"4px solid #2d6a4f"}}>
          <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.25rem"}}>Analyses complétées</div>
          <div style={{fontSize:"2rem",fontWeight:"800",color:"#2d6a4f"}}>{actifs.filter(a => a.statut_analyse==="complete").length}</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"1.5rem"}}>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <h3 style={{color:"#1a3a2a"}}>Mes actifs</h3>
            <button onClick={() => navigate("/client/actifs")} style={{background:"#f0f4f0",border:"none",padding:"0.4rem 0.875rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.85rem",color:"#1a3a2a",fontWeight:"600"}}>Voir tout</button>
          </div>
          {actifs.length === 0 ? (
            <div style={{textAlign:"center",padding:"2rem",color:"#666"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}>🏢</div>
              <p style={{marginBottom:"1rem"}}>Aucun actif enregistré</p>
              <button onClick={() => navigate("/client/actifs/nouveau")} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>+ Créer mon premier actif</button>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {actifs.slice(0,3).map((a,i) => (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.875rem",background:"#f8f7f4",borderRadius:"8px"}}>
                  <div>
                    <div style={{fontWeight:"600",color:"#1a3a2a"}}>{a.nom}</div>
                    <div style={{fontSize:"0.8rem",color:"#666"}}>{a.ville} • {a.surface} m²</div>
                  </div>
                  <span style={{background:a.statut_analyse==="complete"?"#dcfce7":"#fef3c7",color:a.statut_analyse==="complete"?"#2d6a4f":"#d97706",padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"600"}}>
                    {a.statut_analyse==="complete"?"Analysé":"En attente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>⚠️ Alertes réglementaires</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            {alertes.map((a,i) => (
              <div key={i} style={{padding:"0.875rem",borderRadius:"8px",background:"#fff8f0",borderLeft:`3px solid ${a.color}`}}>
                <div style={{fontSize:"0.85rem",fontWeight:"600",color:"#1a3a2a",marginBottom:"0.25rem"}}>{a.icone} {a.texte}</div>
                <div style={{fontSize:"0.75rem",color:"#666"}}>Échéance : {a.echeance}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}