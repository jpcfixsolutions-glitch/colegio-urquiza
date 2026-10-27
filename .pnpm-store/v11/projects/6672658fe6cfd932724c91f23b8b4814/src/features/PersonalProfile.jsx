import { useEffect, useState } from "react";

import { api } from "../api/httpClient.js";
import "./personalProfile.css";

export const MARITAL_STATUS_OPTIONS = [
  ["SINGLE", "Soltero/a"],
  ["MARRIED", "Casado/a"],
  ["PARTNERED", "Unión convivencial"],
  ["DIVORCED", "Divorciado/a"],
  ["WIDOWED", "Viudo/a"],
  ["OTHER", "Otro"],
];

const EMPTY_PROFILE = {
  personalEmail: "",
  address: "",
  phone: "",
  maritalStatus: "",
  dni: "",
  cuit: "",
};

export function PersonalProfile({ required = false, reviewDue = false, onSaved }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api("/me/profile")
      .then(({ item }) => setProfile({ ...EMPTY_PROFILE, ...item }))
      .catch(error => setMessage({ kind: "error", text: error.message }))
      .finally(() => setLoading(false));
  }, []);

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { item } = await api("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          personalEmail: profile.personalEmail,
          address: profile.address,
          phone: profile.phone,
          maritalStatus: profile.maritalStatus,
          dni: profile.dni,
          cuit: profile.cuit,
        }),
      });
      setProfile(item);
      setMessage({ kind: "success", text: "Datos personales actualizados correctamente." });
      onSaved?.(item);
    } catch (error) {
      setMessage({ kind: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const content = <section className={`card personal-profile-card ${required ? "required" : ""}`}>
    <div className="profile-heading">
      <p className="eyebrow">Perfil del empleado</p>
      <h2>{required ? "Completá tus datos personales" : "Datos personales"}</h2>
      <p>{required ? "Antes de continuar necesitamos que completes y confirmes esta información." : "Revisá estos datos y mantenelos actualizados."}</p>
    </div>
    {reviewDue && !required && <div className="profile-reminder"><strong>Es momento de revisar tus datos.</strong><span>Pasaron tres meses desde la última actualización. Confirmalos aunque no hayan cambiado.</span></div>}
    {loading ? <div className="state"><span className="spinner" />Cargando…</div> : <form onSubmit={save}>
      <div className="profile-grid">
        <div className="field"><label>Email personal</label><input type="email" autoComplete="email" value={profile.personalEmail} onChange={event => setProfile({ ...profile, personalEmail: event.target.value })} required /></div>
        <div className="field"><label>Teléfono</label><input type="tel" autoComplete="tel" minLength="6" maxLength="30" value={profile.phone} onChange={event => setProfile({ ...profile, phone: event.target.value })} required /></div>
        <div className="field profile-wide"><label>Domicilio</label><input autoComplete="street-address" minLength="5" maxLength="200" value={profile.address} onChange={event => setProfile({ ...profile, address: event.target.value })} required /></div>
        <div className="field"><label>Estado civil</label><select value={profile.maritalStatus} onChange={event => setProfile({ ...profile, maritalStatus: event.target.value })} required><option value="">Seleccionar…</option>{MARITAL_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div className="field"><label>DNI</label><input inputMode="numeric" pattern="[0-9.]{7,10}" value={profile.dni} onChange={event => setProfile({ ...profile, dni: event.target.value })} required /></div>
        <div className="field"><label>CUIT</label><input inputMode="numeric" pattern="[0-9-]{11,13}" value={profile.cuit} onChange={event => setProfile({ ...profile, cuit: event.target.value })} required /></div>
      </div>
      {message && <p className={message.kind === "error" ? "error" : "success"} role="status">{message.text}</p>}
      <button className="btn red" disabled={saving}>{saving ? "Guardando…" : required ? "Guardar y continuar" : "Guardar datos"}</button>
    </form>}
  </section>;

  return required ? <main className="profile-onboarding">{content}</main> : content;
}
