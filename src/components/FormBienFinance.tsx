import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ════════════════════════════════════════════════════════════════
// Formulaire LGD/encours — saisie manuelle par AGE (évaluation interne,
// pas de calcul automatique sectoriel, cf. confirmation PO 30/06/2026)
// 1 ligne biens_finances par actif (UNIQUE actif_id)
// ════════════════════════════════════════════════════════════════

interface ActifFinancable {
  id: string;
  nom: string;
  valeur_marche: number;
}

interface BienFinanceForm {
  id: string | null;
  actif_id: string;
  encours_credit: string; // string en saisie, normalisé au submit
  lgd_avant: string;
  notes: string;
}

function normaliserNombre(saisie: string): number {
  return parseFloat(saisie.replace(',', '.'));
}

export default function FormBienFinance({
  organisationId,
  actif,
  bienFinanceExistant,
  onSaved,
}: {
  organisationId: string;
  actif: ActifFinancable;
  bienFinanceExistant?: { id: string; encours_credit: number; lgd_avant: number; notes: string | null } | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BienFinanceForm>({
    id: bienFinanceExistant?.id ?? null,
    actif_id: actif.id,
    encours_credit: bienFinanceExistant ? String(bienFinanceExistant.encours_credit) : '',
    lgd_avant: bienFinanceExistant ? String(bienFinanceExistant.lgd_avant) : '',
    notes: bienFinanceExistant?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      id: bienFinanceExistant?.id ?? null,
      actif_id: actif.id,
      encours_credit: bienFinanceExistant ? String(bienFinanceExistant.encours_credit) : '',
      lgd_avant: bienFinanceExistant ? String(bienFinanceExistant.lgd_avant) : '',
      notes: bienFinanceExistant?.notes ?? '',
    });
  }, [actif.id, bienFinanceExistant]);

  const encoursNum = normaliserNombre(form.encours_credit || '0');
  const lgdNum = normaliserNombre(form.lgd_avant || '0');
  const formValide =
    encoursNum > 0 && lgdNum >= 0 && lgdNum <= 100 && !Number.isNaN(encoursNum) && !Number.isNaN(lgdNum);

  async function handleSubmit() {
    if (!formValide) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      actif_id: actif.id,
      client_id: organisationId, // = profils_client.organisation_id (tenant banque)
      encours_credit: encoursNum,
      lgd_avant: lgdNum,
      notes: form.notes || null,
      evalue_par: user?.id,
      date_evaluation: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    const finalPayload: Record<string, unknown> = form.id ? { id: form.id, ...payload } : payload;

    const { error: errUpsert } = await supabase
      .from('biens_finances')
      .upsert(finalPayload, { onConflict: 'actif_id' });

    setSaving(false);

    if (errUpsert) {
      setError(errUpsert.message);
      return;
    }

    onSaved();
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: 20,
        maxWidth: 420,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{actif.nom}</h3>
      <p style={{ fontSize: 12, color: '#78716C', marginBottom: 16 }}>
        Valeur de marché : {actif.valeur_marche.toLocaleString('fr-FR')} €
      </p>

      <label style={labelStyle}>Encours crédit (€)</label>
      <input
        type="text"
        inputMode="decimal"
        value={form.encours_credit}
        onChange={(e) => setForm({ ...form, encours_credit: e.target.value })}
        placeholder="ex. 250000"
        style={inputStyle}
      />

      <label style={labelStyle}>LGD avant adaptation (%)</label>
      <input
        type="text"
        inputMode="decimal"
        value={form.lgd_avant}
        onChange={(e) => setForm({ ...form, lgd_avant: e.target.value })}
        placeholder="ex. 35"
        style={inputStyle}
      />
      <p style={{ fontSize: 11, color: '#78716C', marginTop: -8, marginBottom: 12 }}>
        Évaluation interne AGE, hors barème automatique.
      </p>

      <label style={labelStyle}>Notes (optionnel)</label>
      <textarea
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        rows={2}
        style={{ ...inputStyle, resize: 'vertical' }}
      />

      {error && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#B91C1C', fontSize: 12, marginTop: 8 }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!formValide || saving}
        style={{
          marginTop: 16,
          width: '100%',
          background: formValide ? '#0369A1' : '#E5E1DA',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          padding: '12px 20px',
          fontWeight: 600,
          fontSize: 13,
          cursor: formValide ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Save size={15} />
        {saving ? 'Enregistrement…' : form.id ? 'Mettre à jour' : 'Enregistrer'}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#1F2937',
  marginBottom: 4,
  marginTop: 12,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #E5E1DA',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'JetBrains Mono, monospace',
  boxSizing: 'border-box',
};