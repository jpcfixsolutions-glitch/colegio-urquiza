import { useEffect, useState } from "react";

import { api } from "../api/httpClient.js";
import { ActionMenu, Icon, Modal, PageHeader, ResponsiveTable, SearchField, StatusBadge } from "../components/Ui.jsx";
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState(null);

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
      setConfirm(null);
      setMessage({ kind: "success", text: `Empleado ${employee.active ? "desactivado" : "activado"} correctamente.` });
    } catch (error) {
      setMessage({ kind: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = `${employee.firstName} ${employee.lastName} ${employee.employeeNumber} ${employee.cuit || ""} ${employee.dni || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!status || String(employee.active) === status);
  });

  return <div className="module-page employee-management">
    <PageHeader eyebrow="Gestión institucional" title="Personal" description="Consultá y administrá la información laboral y personal de cada empleado." actions={<button className="btn primary" onClick={() => setEdit({ ...EMPTY_EMPLOYEE })}><Icon name="plus" size={18} /> Agregar personal</button>} />
    {message && <div className={`feedback ${message.kind}`} role="status"><Icon name={message.kind === "error" ? "warning" : "check"} size={18} />{message.text}</div>}
    <div className="toolbar filters-toolbar"><SearchField value={search} onChange={setSearch} placeholder="Buscar por nombre, legajo, DNI o CUIT" /><label className="compact-field"><span>Estado</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>{(search || status) && <button className="btn text" onClick={() => { setSearch(""); setStatus(""); }}>Limpiar</button>}<span className="result-count">{filteredEmployees.length} resultados</span></div>
    {loading ? <div className="state"><span className="spinner" />Cargando personal…</div> : <ResponsiveTable headers={["Personal", "Legajo", "Datos personales", "Estado", "Acciones"]}>{filteredEmployees.map(employee => <tr key={employee.id}><td><div className="identity-cell"><span className="avatar small">{`${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`}</span><span><strong>{employee.lastName}, {employee.firstName}</strong><small>{employee.personalEmail || "Sin email personal"}</small></span></div></td><td><span className="code-chip">{employee.employeeNumber}</span></td><td><StatusBadge tone={profileComplete(employee) ? "success" : "warning"}>{profileComplete(employee) ? "Actualizados" : "Pendientes"}</StatusBadge></td><td><StatusBadge tone={employee.active ? "success" : "danger"}>{employee.active ? "Activo" : "Inactivo"}</StatusBadge></td><td className="row-actions"><button className="table-action" onClick={() => setDetails(employee)}>Ver datos</button><ActionMenu><button onClick={() => setEdit({ ...EMPTY_EMPLOYEE, ...employee, areaIds: employee.areaIds || [] })}>Editar</button><button className={employee.active ? "danger-text" : ""} onClick={() => setConfirm(employee)}>{employee.active ? "Desactivar" : "Activar"}</button></ActionMenu></td></tr>)}</ResponsiveTable>}

    <Modal open={Boolean(edit)} title={edit?.id ? "Editar empleado" : "Nuevo empleado"} eyebrow="Personal" onClose={() => !busy && setEdit(null)} busy={busy} className="wide-modal">
      {edit && <form className="employee-form" onSubmit={save}>
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
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setEdit(null)}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? "Guardando…" : "Guardar empleado"}</button></div>
    </form>}
    </Modal>

    <Modal open={Boolean(details)} title={details ? `${details.lastName}, ${details.firstName}` : "Datos personales"} eyebrow="Ficha del empleado" onClose={() => setDetails(null)} className="employee-details">
      {details && <><dl><div><dt>Email</dt><dd>{details.personalEmail || "Pendiente"}</dd></div><div><dt>Domicilio</dt><dd>{details.address || "Pendiente"}</dd></div><div><dt>Teléfono</dt><dd>{details.phone || "Pendiente"}</dd></div><div><dt>Estado civil</dt><dd>{maritalLabel(details.maritalStatus)}</dd></div><div><dt>DNI</dt><dd>{details.dni || "Pendiente"}</dd></div><div><dt>CUIT</dt><dd>{details.cuit || "Pendiente"}</dd></div><div><dt>Última confirmación</dt><dd>{details.profileUpdatedAt ? new Date(details.profileUpdatedAt).toLocaleDateString("es-AR") : "Nunca"}</dd></div></dl><div className="modal-actions"><button className="btn primary" onClick={() => setDetails(null)}>Cerrar</button></div></>}
    </Modal>

    <Modal open={Boolean(confirm)} title={confirm?.active ? "Desactivar empleado" : "Activar empleado"} eyebrow="Confirmación" onClose={() => !busy && setConfirm(null)} busy={busy}><p>Vas a {confirm?.active ? "desactivar" : "activar"} a <strong>{confirm?.lastName}, {confirm?.firstName}</strong>.</p><div className="modal-context"><Icon name="warning" size={18} /><span>{confirm?.active ? "No estará disponible para nuevas cargas de recibos." : "Volverá a estar disponible para la gestión institucional."}</span></div><div className="modal-actions"><button className="btn secondary" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button><button className={confirm?.active ? "btn danger" : "btn primary"} disabled={busy} onClick={() => toggle(confirm)}>{busy ? "Procesando…" : confirm?.active ? "Desactivar" : "Activar"}</button></div></Modal>
  </div>;
}
