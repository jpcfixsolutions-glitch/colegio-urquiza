import { useCallback, useEffect, useState } from "react";
import { api } from "../api/httpClient.js";
import { EmptyState, Icon, PageHeader, ResponsiveTable, SearchField, SkeletonRows, StatusBadge } from "../components/Ui.jsx";
import { formatTechnicalLabel } from "../uiLabels.js";

const zone = "America/Argentina/Cordoba";
const formatDate = value => value ? new Intl.DateTimeFormat("es-AR", { timeZone: zone, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "—";
const formatTime = value => value ? new Intl.DateTimeFormat("es-AR", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "—";
const name = item => item.firstName ? `${item.firstName} ${item.lastName || ""}`.trim() : item.username || item.email || "Usuario no identificado";
const eventLabel = { LOGIN_SUCCESS: "Inició sesión", LOGIN_FAILED: "Intento rechazado", LOGOUT: "Cerró sesión", SESSION_REVOKED: "Sesión revocada" };

function Online({ refreshToken }) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const load = useCallback(async () => { try { const result = await api("/admin/activity/online"); setState({ loading: false, items: result.items, error: "" }); } catch (error) { setState({ loading: false, items: [], error: error.message }); } }, []);
  useEffect(() => { load(); const interval = setInterval(load, 45000); return () => clearInterval(interval); }, [load, refreshToken]);
  if (state.loading) return <SkeletonRows />;
  if (state.error) return <EmptyState icon="warning" title="No se pudo consultar la presencia" description={state.error} action={<button className="btn secondary" onClick={load}>Reintentar</button>} />;
  if (!state.items.length) return <EmptyState icon="users" title="No hay usuarios en línea" description="Las personas aparecerán acá cuando tengan actividad reciente." />;
  return <><div className="activity-summary"><StatusBadge tone="success">{state.items.length} en línea</StatusBadge><span>Se actualiza automáticamente.</span></div><ResponsiveTable headers={["Usuario", "Empleado", "Roles", "Estado", "Última actividad"]}>{state.items.map(item => <tr key={item.id}><td><strong>{name(item)}</strong><small className="block-muted">{item.email}</small></td><td>{item.employeeNumber ? <>Legajo {item.employeeNumber}</> : <span className="muted">Sin vincular</span>}</td><td><div className="role-list">{item.roles.map(role => <span className="role-chip" key={role}>{formatTechnicalLabel(role)}</span>)}</div></td><td><StatusBadge tone="success">En línea</StatusBadge></td><td>{formatTime(item.lastActivityAt)} hs</td></tr>)}</ResponsiveTable></>;
}

function History() {
  const [filters, setFilters] = useState({ q: "", from: "", to: "", event: "", page: 1 }), [state, setState] = useState({ loading: true, items: [], total: 0, error: "" });
  const load = useCallback(async () => { const query = new URLSearchParams({ page: String(filters.page), pageSize: "25" }); Object.entries(filters).forEach(([key, value]) => { if (value && key !== "page") query.set(key, value); }); try { const result = await api(`/admin/activity/history?${query}`); setState({ loading: false, items: result.items, total: result.total, error: "" }); } catch (error) { setState({ loading: false, items: [], total: 0, error: error.message }); } }, [filters]);
  useEffect(() => { load(); }, [load]);
  const update = (key, value) => setFilters(current => ({ ...current, [key]: value, page: 1 }));
  const pages = Math.max(1, Math.ceil(state.total / 25));
  return <><div className="history-filter-grid activity-filters"><SearchField value={filters.q} onChange={value => update("q", value)} placeholder="Buscar usuario o empleado" /><label className="compact-field"><span>Desde</span><input type="date" value={filters.from} onChange={event => update("from", event.target.value)} /></label><label className="compact-field"><span>Hasta</span><input type="date" value={filters.to} onChange={event => update("to", event.target.value)} /></label><label className="compact-field"><span>Evento</span><select value={filters.event} onChange={event => update("event", event.target.value)}><option value="">Todos</option>{Object.entries(eventLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{(filters.q || filters.from || filters.to || filters.event) && <button className="btn text" onClick={() => setFilters({ q: "", from: "", to: "", event: "", page: 1 })}>Limpiar</button>}</div>{state.loading ? <SkeletonRows /> : state.error ? <EmptyState icon="warning" title="No se pudo cargar el historial" description={state.error} action={<button className="btn secondary" onClick={load}>Reintentar</button>} /> : !state.items.length ? <EmptyState icon="clock" title="No hay accesos para estos filtros" description="Los eventos de acceso nuevos aparecerán aquí." /> : <><ResponsiveTable headers={["Usuario", "Rol", "Fecha", "Hora", "Evento"]}>{state.items.map(item => <tr key={item.id}><td><strong>{name(item)}</strong><small className="block-muted">{item.email || "Sin cuenta identificable"}</small></td><td>{item.roles.length ? item.roles.map(role => formatTechnicalLabel(role)).join(", ") : "—"}</td><td>{formatDate(item.createdAt)}</td><td>{formatTime(item.createdAt)} hs</td><td><StatusBadge tone={item.action === "LOGIN_SUCCESS" ? "success" : item.action === "LOGIN_FAILED" ? "danger" : "neutral"}>{eventLabel[item.action] || item.action}</StatusBadge></td></tr>)}</ResponsiveTable><div className="pagination"><button disabled={filters.page <= 1} onClick={() => update("page", filters.page - 1)}>Anterior</button><span>Página {filters.page} de {pages} · {state.total} registros</span><button disabled={filters.page >= pages} onClick={() => update("page", filters.page + 1)}>Siguiente</button></div></>}</>;
}

export function UserActivity() {
  const [tab, setTab] = useState("online"), [refreshToken, setRefreshToken] = useState(0);
  return <div className="module-page"><PageHeader eyebrow="Administración" title="Actividad de usuarios" description="Presencia reciente e historial de accesos. Los horarios se muestran en Córdoba, Argentina." /><nav className="section-tabs" aria-label="Vistas de actividad"><button className={tab === "online" ? "active" : ""} onClick={() => { setTab("online"); setRefreshToken(value => value + 1); }}><Icon name="users" size={18} /> En línea</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><Icon name="clock" size={18} /> Historial de accesos</button></nav>{tab === "online" ? <Online refreshToken={refreshToken} /> : <History />}</div>;
}
