import { useEffect, useState } from "react";

import { api } from "../api/httpClient.js";
import { MARITAL_STATUS_OPTIONS } from "./PersonalProfile.jsx";

const EMPTY_EMPLOYEE = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  personalEmail: "",
  address: "",
  phone: "",
  maritalStatus: "",
  dni: "",
  cuit: "",
  areaIds: [],
};

const maritalLabel = value => MARITAL_STATUS_OPTIONS.find(([key]) => key === value)?.[1] || "Pendiente";
const profileComplete = employee => ["personalEmail", "address", "phone", "maritalStatus", "dni", "cuit"].every(field => employee[field]) && employee.profileUpdatedAt;

export function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [details, setDetails] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [employeeResult, areaResult] = await Promise.all([api("/employees"), api("/areas")]);
      setEmployees(employeeResult.items);
      setAreas(areaResult.items);
    } catch (error) {
      setMessage({ kind: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async event => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const body = {
        employeeNumber: edit.employeeNumber,
        firstName: edit.firstName,
        lastName: edit.lastName,
        personalEmail: edit.personalEmail || null,
        address: edit.address || null,
        phone: edit.phone || null,
        maritalStatus: edit.maritalStatus || null,
        dni: edit.dni || null,
        cuit: edit.cuit || null,
        areaIds: edit.areaIds || [],
      };
      await api(edit.id ? `/employees/${edit.id}` : "/employees", { method: edit.id ? "PATCH" : "POST", body: JSON.stringify(body) });
      setEdit(null);
      await load();
      setMessage({ kind: "success", text: "Personal guardado correctamente." });
    } catch (error) {
      setMessage({ kind: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async employee => {
    setBusy(true);
    try {
      await api(`/employees/${employee.id}`, { method: "PATCH", body: JSON.stringify({ active: !employee.active }) });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="section-title"><h2>Personal institucional</h2><button className="btn red" onClick={() => setEdit({ ...EMPTY_EMPLOYEE })}>+ Agregar personal</button></div>
    {message && <p className={message.kind === "error" ? "error" : "success"} role="status">{message.text}</p>}
    {edit && <form className="card employee-form" onSubmit={save}>
      <div className="profile-heading"><p className="eyebrow">Administración</p><h3>{edit.id ? "Editar empleado" : "Nuevo empleado"}</h3></div>
      <div className="profile-grid">
        <div className="field"><label>Legajo</label><input value={edit.employeeNumber} onChange={event => setEdit({ ...edit, employeeNumber: event.target.value })} required /></div>
        <div className="field"><label>Nombre</label><input value={edit.firstName} onChange={event => setEdit({ ...edit, firstName: event.target.value })} required /></div>
        <div className="field"><label>Apellido</label><input value={edit.lastName} onChange={event => setEdit({ ...edit, lastName: event.target.value })} required /></div>
        <div className="field"><label>Email personal</label><input type="email" value={edit.personalEmail || ""} onChange={event => setEdit({ ...edit, personalEmail: event.target.value })} /></div>
        <div className="field profile-wide"><label>Domicilio</label><input value={edit.address || ""} onChange={event => setEdit({ ...edit, address: event.target.value })} /></div>
        <div className="field"><label>Teléfono</label><input value={edit.phone || ""} onChange={event => setEdit({ ...edit, phone: event.target.value })} /></div>
        <div className="field"><label>Estado civil</label><select value={edit.maritalStatus || ""} onChange={event => setEdit({ ...edit, maritalStatus: event.target.value })}><option value="">Pendiente</option>{MARITAL_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div className="field"><label>DNI</label><input inputMode="numeric" value={edit.dni || ""} onChange={event => setEdit({ ...edit, dni: event.target.value })} /></div>
        <div className="field"><label>CUIT</label><input inputMode="numeric" value={edit.cuit || ""} onChange={event => setEdit({ ...edit, cuit: event.target.value })} /></div>
      </div>
      <div className="field"><label>Áreas</label><div className="checks">{areas.filter(area => area.active).map(area => <label key={area.id}><input type="checkbox" checked={(edit.areaIds || []).includes(area.id)} onChange={event => setEdit({ ...edit, areaIds: event.target.checked ? [...(edit.areaIds || []), area.id] : (edit.areaIds || []).filter(id => id !== area.id) })} />{area.name}</label>)}</div></div>
      <div className="modal-actions"><button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button><button className="btn" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>}
    {loading ? <div className="state"><span className="spinner" />Cargando…</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Personal</th><th>Legajo</th><th>Datos personales</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{employees.map(employee => <tr key={employee.id}><td>{employee.lastName}, {employee.firstName}</td><td>{employee.employeeNumber}</td><td><span className={`password-state ${profileComplete(employee) ? "normal" : "pending"}`}>{profileComplete(employee) ? "Actualizados" : "Pendientes"}</span></td><td>{employee.active ? "Activo" : "Inactivo"}</td><td className="actions"><button onClick={() => setDetails(employee)}>Ver datos</button><button onClick={() => setEdit({ ...EMPTY_EMPLOYEE, ...employee, areaIds: employee.areaIds || [] })}>Editar</button><button disabled={busy} onClick={() => toggle(employee)}>{employee.active ? "Desactivar" : "Activar"}</button></td></tr>)}</tbody></table></div>}
    {details && <div className="modal-backdrop"><section className="modal employee-details" role="dialog" aria-modal="true" aria-labelledby="employee-details-title"><h2 id="employee-details-title">{details.lastName}, {details.firstName}</h2><dl><div><dt>Email</dt><dd>{details.personalEmail || "Pendiente"}</dd></div><div><dt>Domicilio</dt><dd>{details.address || "Pendiente"}</dd></div><div><dt>Teléfono</dt><dd>{details.phone || "Pendiente"}</dd></div><div><dt>Estado civil</dt><dd>{maritalLabel(details.maritalStatus)}</dd></div><div><dt>DNI</dt><dd>{details.dni || "Pendiente"}</dd></div><div><dt>CUIT</dt><dd>{details.cuit || "Pendiente"}</dd></div><div><dt>Última confirmación</dt><dd>{details.profileUpdatedAt ? new Date(details.profileUpdatedAt).toLocaleDateString("es-AR") : "Nunca"}</dd></div></dl><div className="modal-actions"><button className="btn" onClick={() => setDetails(null)}>Cerrar</button></div></section></div>}
  </>;
}
