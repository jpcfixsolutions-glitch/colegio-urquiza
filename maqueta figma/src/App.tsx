import { useState, useRef } from "react";
import schoolLogo from "@/imports/image.png";

// ─── Types ───────────────────────────────────────────────────────────────────
type View = "login" | "bulletin" | "receipts" | "admin";
type Role = "teacher" | "admin";

interface User {
  name: string;
  role: Role;
  dni: string;
  avatar: string;
}

interface Notice {
  id: number;
  title: string;
  body: string;
  author: string;
  authorRole: string;
  date: string;
  category: "comunicado" | "urgente" | "informativo";
}

interface Receipt {
  id: number;
  month: string;
  year: number;
  gross: string;
  net: string;
  status: "disponible" | "pendiente";
}

interface AdminUser {
  id: number;
  name: string;
  dni: string;
  role: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const NOTICES: Notice[] = [
  {
    id: 1,
    title: "Reunión de Padres — 2° Año",
    body: "Se informa a todos los docentes de segundo año que la reunión de padres se llevará a cabo el día viernes 29 de agosto a las 18:00 hs en el Aula Magna. Se solicita puntualidad y traer el registro de calificaciones actualizado.",
    author: "Prof. María Rodríguez",
    authorRole: "Dirección",
    date: "25 ago 2026",
    category: "comunicado",
  },
  {
    id: 2,
    title: "Paro Docente — Jueves 28 de Agosto",
    body: "La Asociación Gremial informa el cese de actividades para el día jueves 28 de agosto. Los docentes que adhieran deben notificar a preceptoría antes de las 07:30 hs del mismo día.",
    author: "Lic. Carlos Pérez",
    authorRole: "Preceptoría",
    date: "24 ago 2026",
    category: "urgente",
  },
  {
    id: 3,
    title: "Entrega de Libretas de Calificaciones",
    body: "Se recuerda que el plazo máximo para la carga de calificaciones en el sistema es el día lunes 1 de septiembre a las 12:00 hs. Pasado ese horario el sistema se bloqueará para docentes.",
    author: "Mgr. Ana Suárez",
    authorRole: "Secretaría Académica",
    date: "22 ago 2026",
    category: "informativo",
  },
  {
    id: 4,
    title: "Jornada Institucional — 5 de Septiembre",
    body: "Se convoca a todo el personal docente y no docente a la jornada institucional del 5 de septiembre. El eje de trabajo será 'Estrategias de inclusión en el aula'. Asistencia obligatoria. Más detalles próximamente.",
    author: "Prof. María Rodríguez",
    authorRole: "Dirección",
    date: "20 ago 2026",
    category: "comunicado",
  },
  {
    id: 5,
    title: "Haberes de Agosto disponibles",
    body: "Se informa que los recibos de sueldo correspondientes al mes de agosto 2026 ya se encuentran disponibles en el sistema. Ingresar a la sección 'Mis Recibos' para consultar y descargar.",
    author: "Cont. Laura Méndez",
    authorRole: "Contaduría",
    date: "18 ago 2026",
    category: "informativo",
  },
];

const RECEIPTS: Receipt[] = [
  { id: 1, month: "Agosto", year: 2026, gross: "$458.320", net: "$387.140", status: "disponible" },
  { id: 2, month: "Julio", year: 2026, gross: "$441.800", net: "$373.490", status: "disponible" },
  { id: 3, month: "Junio", year: 2026, gross: "$441.800", net: "$373.490", status: "disponible" },
  { id: 4, month: "Mayo", year: 2026, gross: "$410.600", net: "$347.950", status: "disponible" },
  { id: 5, month: "Abril", year: 2026, gross: "$410.600", net: "$347.950", status: "disponible" },
  { id: 6, month: "Marzo", year: 2026, gross: "$388.200", net: "$328.700", status: "disponible" },
  { id: 7, month: "Febrero", year: 2026, gross: "$388.200", net: "$328.700", status: "disponible" },
  { id: 8, month: "Enero", year: 2026, gross: "$354.100", net: "$300.000", status: "disponible" },
  { id: 9, month: "Diciembre", year: 2025, gross: "$354.100", net: "$300.000", status: "disponible" },
];

const ADMIN_USERS: AdminUser[] = [
  { id: 1, name: "García, Juan Pablo", dni: "28.445.112", role: "Docente" },
  { id: 2, name: "Martínez, Silvia Beatriz", dni: "22.113.447", role: "Docente" },
  { id: 3, name: "López, Roberto Héctor", dni: "30.882.003", role: "Preceptor" },
  { id: 4, name: "Fernández, Claudia Inés", dni: "25.667.891", role: "Docente" },
  { id: 5, name: "Díaz, Marcelo Ariel", dni: "33.120.445", role: "Docente" },
  { id: 6, name: "Torres, Graciela Noemí", dni: "19.004.778", role: "No Docente" },
];

// ─── School Logo ──────────────────────────────────────────────────────────────
function ShieldLogo({ size = 64 }: { size?: number }) {
  return (
    <img
      src={schoolLogo}
      alt="Logo Instituto Mixto Secundario Justo José de Urquiza"
      width={size * 2.8}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}

// ─── Category Badge ───────────────────────────────────────────────────────────
function CategoryBadge({ category }: { category: Notice["category"] }) {
  const styles = {
    comunicado: "bg-[#1B2A4A]/10 text-[#1B2A4A]",
    urgente: "bg-[#C0281C]/10 text-[#C0281C]",
    informativo: "bg-[#C9A227]/10 text-[#8B6E0B]",
  };
  const labels = {
    comunicado: "Comunicado",
    urgente: "Urgente",
    informativo: "Informativo",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm font-mono ${styles[category]}`}>
      {labels[category]}
    </span>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: Role) => void }) {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!dni || !password) { setError("Complete todos los campos."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (dni === "admin" || dni === "12345678") {
        onLogin(dni === "admin" ? "admin" : "teacher");
      } else {
        setError("Usuario o contraseña incorrectos.");
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Top accent strip */}
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #1B2A4A 0%, #C0281C 50%, #C9A227 100%)" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo block */}
          <div className="flex flex-col items-center mb-10">
            <ShieldLogo size={52} />
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#C0281C] font-mono mt-4">
              Provincia de Córdoba
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-sm shadow-sm border border-[#E2E6EC] p-8">
            <h3 className="text-[13px] font-semibold text-[#1B2A4A] tracking-wide uppercase mb-6 font-mono">
              Acceso al sistema
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 font-mono">
                  Usuario / DNI
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={e => setDni(e.target.value)}
                  placeholder="Ej: 28445112"
                  className="w-full border border-[#E2E6EC] rounded-sm px-3.5 py-2.5 text-[14px] text-[#1B2A4A] placeholder-[#C0C8D4] focus:outline-none focus:border-[#1B2A4A] transition-colors font-body bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5 font-mono">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#E2E6EC] rounded-sm px-3.5 py-2.5 text-[14px] text-[#1B2A4A] placeholder-[#C0C8D4] focus:outline-none focus:border-[#1B2A4A] transition-colors font-body bg-[#F8F9FA]"
                />
              </div>

              {error && (
                <p className="text-[12px] text-[#C0281C] font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B2A4A] text-white font-semibold py-2.5 rounded-sm text-[14px] hover:bg-[#243660] active:bg-[#111d33] transition-colors disabled:opacity-60 mt-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {loading ? "Verificando..." : "Ingresar"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#E2E6EC]">
              <p className="text-[11px] text-[#9CA3AF] text-center font-mono">
                Demo: <span className="text-[#1B2A4A] font-medium">12345678</span> o{" "}
                <span className="text-[#1B2A4A] font-medium">admin</span> — cualquier contraseña
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#9CA3AF] mt-6 font-mono">
            Sistema de Gestión Institucional · 2026
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MOBILE SHELL (shared nav for teacher views) ──────────────────────────────
function MobileShell({
  currentView,
  onNavigate,
  user,
  onLogout,
  children,
}: {
  currentView: View;
  onNavigate: (v: View) => void;
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] max-w-md mx-auto">
      {/* Top bar */}
      <header className="bg-[#1B2A4A] px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <ShieldLogo size={28} />
          <p className="text-white/50 text-[10px] font-mono">
            {currentView === "bulletin" ? "Muro de Avisos" : "Mis Recibos"}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="text-white/60 hover:text-white text-[11px] font-mono transition-colors"
        >
          Salir
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-[#E2E6EC] flex shrink-0">
        <button
          onClick={() => onNavigate("bulletin")}
          className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
            currentView === "bulletin" ? "text-[#1B2A4A]" : "text-[#9CA3AF]"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 12h18M3 6h18M3 18h12" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-semibold font-mono uppercase tracking-wide">Avisos</span>
          {currentView === "bulletin" && (
            <div className="absolute bottom-0 w-6 h-0.5 bg-[#C0281C]" />
          )}
        </button>
        <button
          onClick={() => onNavigate("receipts")}
          className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
            currentView === "receipts" ? "text-[#1B2A4A]" : "text-[#9CA3AF]"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-semibold font-mono uppercase tracking-wide">Recibos</span>
        </button>
        <button
          className="flex-1 py-3 flex flex-col items-center gap-1 text-[#9CA3AF]"
        >
          <div className="w-8 h-8 rounded-full bg-[#1B2A4A] flex items-center justify-center text-white text-[12px] font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {user.name.charAt(0)}
          </div>
        </button>
      </nav>
    </div>
  );
}

// ─── BULLETIN BOARD ───────────────────────────────────────────────────────────
function BulletinBoard({ user }: { user: User }) {
  const [expanded, setExpanded] = useState<number | null>(1);

  return (
    <div className="px-4 py-5 space-y-0">
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-wider">Bienvenido/a,</p>
        <h2 className="text-[20px] font-bold text-[#1B2A4A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {user.name}
        </h2>
      </div>

      {/* Gold divider */}
      <div className="h-px bg-[#C9A227]/30 mb-5" />

      <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-wider mb-3">
        {NOTICES.length} comunicaciones recientes
      </p>

      <div className="space-y-3">
        {NOTICES.map((notice) => (
          <div
            key={notice.id}
            className={`bg-white border rounded-sm overflow-hidden transition-shadow ${
              notice.category === "urgente"
                ? "border-l-4 border-l-[#C0281C] border-[#E2E6EC]"
                : notice.category === "informativo"
                ? "border-l-4 border-l-[#C9A227] border-[#E2E6EC]"
                : "border-l-4 border-l-[#1B2A4A] border-[#E2E6EC]"
            } ${expanded === notice.id ? "shadow-sm" : ""}`}
          >
            <button
              className="w-full text-left px-4 py-3.5"
              onClick={() => setExpanded(expanded === notice.id ? null : notice.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <CategoryBadge category={notice.category} />
                    <span className="text-[10px] font-mono text-[#9CA3AF]">{notice.date}</span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#1B2A4A] leading-snug" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {notice.title}
                  </h3>
                  <p className="text-[11px] text-[#6B7280] mt-0.5 font-mono">
                    {notice.author} · {notice.authorRole}
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  className={`shrink-0 mt-1 transition-transform ${expanded === notice.id ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {expanded === notice.id && (
              <div className="px-4 pb-4 border-t border-[#E2E6EC]">
                <p className="text-[13px] text-[#374151] leading-relaxed mt-3 font-body">
                  {notice.body}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pb-6" />
    </div>
  );
}

// ─── RECEIPTS ─────────────────────────────────────────────────────────────────
function ReceiptsView() {
  const years = [2026, 2025];
  const [selectedYear, setSelectedYear] = useState(2026);
  const filtered = RECEIPTS.filter(r => r.year === selectedYear);

  return (
    <div className="px-4 py-5">
      <div className="mb-5">
        <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-wider">Sección</p>
        <h2 className="text-[20px] font-bold text-[#1B2A4A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Mis Recibos
        </h2>
      </div>

      {/* Year filter */}
      <div className="flex gap-2 mb-5">
        {years.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-4 py-1.5 text-[12px] font-semibold font-mono rounded-sm border transition-colors ${
              selectedYear === y
                ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                : "bg-white text-[#6B7280] border-[#E2E6EC] hover:border-[#1B2A4A]"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Summary card */}
      <div className="bg-[#1B2A4A] rounded-sm px-4 py-4 mb-5">
        <p className="text-white/60 text-[11px] font-mono uppercase tracking-wider mb-0.5">Período seleccionado</p>
        <p className="text-white text-[22px] font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{selectedYear}</p>
        <p className="text-white/60 text-[11px] font-mono mt-1">{filtered.length} recibos disponibles</p>
      </div>

      {/* Receipt list */}
      <div className="space-y-2">
        {filtered.map((receipt) => (
          <div
            key={receipt.id}
            className="bg-white border border-[#E2E6EC] rounded-sm px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[14px] font-semibold text-[#1B2A4A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {receipt.month} {receipt.year}
                </p>
                <span className="text-[10px] font-mono bg-[#C9A227]/10 text-[#8B6E0B] px-1.5 py-0.5 rounded-sm">
                  Disponible
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#6B7280]">
                Bruto: <span className="text-[#1B2A4A] font-medium">{receipt.gross}</span>
                <span className="mx-2 text-[#E2E6EC]">|</span>
                Neto: <span className="text-[#1B2A4A] font-medium">{receipt.net}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#1B2A4A] border border-[#E2E6EC] rounded-sm hover:border-[#1B2A4A] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button className="w-8 h-8 flex items-center justify-center bg-[#C0281C] text-white rounded-sm hover:bg-[#d63d30] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pb-6" />
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [activeSection, setActiveSection] = useState<"dashboard" | "notices" | "receipts" | "users">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // New notice form
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    body: "",
    category: "comunicado" as Notice["category"],
    author: "Cont. Laura Méndez",
  });
  const [noticeSubmitted, setNoticeSubmitted] = useState(false);

  // Receipt upload
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Agosto");
  const [uploadDone, setUploadDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { id: "dashboard", label: "Resumen", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "notices", label: "Publicar Aviso", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { id: "receipts", label: "Cargar Recibos", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
    { id: "users", label: "Personal", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  ];

  const handleNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeSubmitted(true);
    setTimeout(() => setNoticeSubmitted(false), 3000);
    setNoticeForm({ title: "", body: "", category: "comunicado", author: "Cont. Laura Méndez" });
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadDone(true);
    setTimeout(() => setUploadDone(false), 3000);
    setSelectedUser("");
    setSelectedMonth("Agosto");
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#1B2A4A] flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <ShieldLogo size={36} />
          <p className="text-white/40 text-[10px] font-mono mt-2">Panel Administrativo · Córdoba</p>
        </div>

        {/* User chip */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C0281C] flex items-center justify-center text-white text-[12px] font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="text-white text-[12px] font-semibold leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {user.name}
              </p>
              <p className="text-white/40 text-[10px] font-mono">Contaduría</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id as typeof activeSection); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] font-medium transition-colors text-left ${
                activeSection === item.id
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
              {activeSection === item.id && (
                <div className="ml-auto w-1 h-4 bg-[#C9A227] rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-white/40 hover:text-white text-[12px] font-mono transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E2E6EC] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-[#1B2A4A]"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
            <div>
              <h1 className="text-[18px] font-bold text-[#1B2A4A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {navItems.find(n => n.id === activeSection)?.label}
              </h1>
              <p className="text-[11px] font-mono text-[#9CA3AF]">
                Instituto Mixto Secundario Justo José de Urquiza
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#9CA3AF] hidden sm:block">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <div className="w-2 h-2 rounded-full bg-[#22c55e]" title="Sistema en línea" />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* DASHBOARD */}
          {activeSection === "dashboard" && (
            <div>
              {/* Stats row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Personal Activo", value: "47", sub: "docentes y no docentes", color: "#1B2A4A" },
                  { label: "Avisos Publicados", value: "12", sub: "este mes", color: "#C0281C" },
                  { label: "Recibos Cargados", value: "94", sub: "agosto 2026", color: "#C9A227" },
                  { label: "Pendientes", value: "3", sub: "recibos sin cargar", color: "#6B7280" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white border border-[#E2E6EC] rounded-sm p-5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-2">{stat.label}</p>
                    <p className="text-[32px] font-bold leading-none mb-1" style={{ color: stat.color, fontFamily: "'DM Sans', sans-serif" }}>
                      {stat.value}
                    </p>
                    <p className="text-[11px] font-mono text-[#9CA3AF]">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* Recent notices summary */}
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="bg-white border border-[#E2E6EC] rounded-sm">
                  <div className="px-5 py-4 border-b border-[#E2E6EC] flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-[#1B2A4A] font-mono uppercase tracking-wide">Últimos Avisos</h3>
                    <button
                      onClick={() => setActiveSection("notices")}
                      className="text-[11px] font-mono text-[#C0281C] hover:underline"
                    >
                      + Publicar
                    </button>
                  </div>
                  <div className="divide-y divide-[#F3F4F6]">
                    {NOTICES.slice(0, 4).map(n => (
                      <div key={n.id} className="px-5 py-3 flex items-start gap-3">
                        <CategoryBadge category={n.category} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1B2A4A] truncate">{n.title}</p>
                          <p className="text-[11px] font-mono text-[#9CA3AF]">{n.date} · {n.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#E2E6EC] rounded-sm">
                  <div className="px-5 py-4 border-b border-[#E2E6EC] flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-[#1B2A4A] font-mono uppercase tracking-wide">Personal — Agosto 2026</h3>
                    <button
                      onClick={() => setActiveSection("receipts")}
                      className="text-[11px] font-mono text-[#C0281C] hover:underline"
                    >
                      + Cargar
                    </button>
                  </div>
                  <div className="divide-y divide-[#F3F4F6]">
                    {ADMIN_USERS.slice(0, 5).map(u => (
                      <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-[#1B2A4A]">{u.name}</p>
                          <p className="text-[11px] font-mono text-[#9CA3AF]">DNI {u.dni} · {u.role}</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#C9A227]/10 text-[#8B6E0B] rounded-sm">
                          Cargado
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NOTICES FORM */}
          {activeSection === "notices" && (
            <div className="max-w-2xl">
              {noticeSubmitted && (
                <div className="mb-5 px-4 py-3 bg-[#1B2A4A]/5 border border-[#1B2A4A]/20 rounded-sm flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium text-[#1B2A4A]">
                    Aviso publicado correctamente en el muro institucional.
                  </p>
                </div>
              )}

              <div className="bg-white border border-[#E2E6EC] rounded-sm">
                <div className="px-6 py-5 border-b border-[#E2E6EC]">
                  <h2 className="text-[15px] font-bold text-[#1B2A4A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Nuevo Aviso Institucional
                  </h2>
                  <p className="text-[12px] font-mono text-[#9CA3AF] mt-0.5">
                    El aviso se publicará de inmediato en el muro visible para todo el personal.
                  </p>
                </div>

                <form onSubmit={handleNoticeSubmit} className="p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Tipo de comunicación
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(["comunicado", "urgente", "informativo"] as const).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNoticeForm(f => ({ ...f, category: cat }))}
                          className={`px-3 py-1.5 text-[12px] font-mono capitalize border rounded-sm transition-colors ${
                            noticeForm.category === cat
                              ? cat === "urgente"
                                ? "bg-[#C0281C] text-white border-[#C0281C]"
                                : cat === "informativo"
                                ? "bg-[#C9A227] text-white border-[#C9A227]"
                                : "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                              : "bg-white text-[#6B7280] border-[#E2E6EC] hover:border-[#1B2A4A]"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Título
                    </label>
                    <input
                      type="text"
                      value={noticeForm.title}
                      onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Ej: Reunión de Padres — 2° Año"
                      className="w-full border border-[#E2E6EC] rounded-sm px-3.5 py-2.5 text-[14px] text-[#1B2A4A] focus:outline-none focus:border-[#1B2A4A] transition-colors bg-[#F8F9FA]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Autor / Firmante
                    </label>
                    <input
                      type="text"
                      value={noticeForm.author}
                      onChange={e => setNoticeForm(f => ({ ...f, author: e.target.value }))}
                      className="w-full border border-[#E2E6EC] rounded-sm px-3.5 py-2.5 text-[14px] text-[#1B2A4A] focus:outline-none focus:border-[#1B2A4A] transition-colors bg-[#F8F9FA]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Cuerpo del mensaje
                    </label>
                    <textarea
                      value={noticeForm.body}
                      onChange={e => setNoticeForm(f => ({ ...f, body: e.target.value }))}
                      placeholder="Escriba el contenido completo del comunicado aquí..."
                      rows={6}
                      className="w-full border border-[#E2E6EC] rounded-sm px-3.5 py-2.5 text-[14px] text-[#1B2A4A] focus:outline-none focus:border-[#1B2A4A] transition-colors bg-[#F8F9FA] resize-none leading-relaxed"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="bg-[#C0281C] text-white font-semibold px-6 py-2.5 rounded-sm text-[14px] hover:bg-[#d63d30] transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Publicar en el Muro
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoticeForm({ title: "", body: "", category: "comunicado", author: "Cont. Laura Méndez" })}
                      className="border border-[#E2E6EC] text-[#6B7280] font-medium px-4 py-2.5 rounded-sm text-[14px] hover:border-[#1B2A4A] hover:text-[#1B2A4A] transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* RECEIPTS UPLOAD */}
          {activeSection === "receipts" && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Upload form */}
              <div className="bg-white border border-[#E2E6EC] rounded-sm">
                <div className="px-6 py-5 border-b border-[#E2E6EC]">
                  <h2 className="text-[15px] font-bold text-[#1B2A4A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Cargar Recibo de Sueldo
                  </h2>
                  <p className="text-[12px] font-mono text-[#9CA3AF] mt-0.5">
                    Suba el PDF del recibo y asócielo al empleado y período correspondiente.
                  </p>
                </div>

                {uploadDone && (
                  <div className="mx-6 mt-5 px-4 py-3 bg-[#C9A227]/10 border border-[#C9A227]/30 rounded-sm flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-[13px] font-medium text-[#1B2A4A]">Recibo cargado correctamente.</p>
                  </div>
                )}

                <form onSubmit={handleUpload} className="p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Empleado
                    </label>
                    <select
                      value={selectedUser}
                      onChange={e => setSelectedUser(e.target.value)}
                      className="w-full border border-[#E2E6EC] rounded-sm px-3.5 py-2.5 text-[14px] text-[#1B2A4A] focus:outline-none focus:border-[#1B2A4A] transition-colors bg-[#F8F9FA] appearance-none"
                      required
                    >
                      <option value="">Seleccionar empleado...</option>
                      {ADMIN_USERS.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} — DNI {u.dni}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                        Mes
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="w-full border border-[#E2E6EC] rounded-sm px-3.5 py-2.5 text-[14px] text-[#1B2A4A] focus:outline-none focus:border-[#1B2A4A] bg-[#F8F9FA] appearance-none"
                      >
                        {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map(m => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                        Año
                      </label>
                      <select className="w-full border border-[#E2E6EC] rounded-sm px-3.5 py-2.5 text-[14px] text-[#1B2A4A] focus:outline-none focus:border-[#1B2A4A] bg-[#F8F9FA] appearance-none">
                        <option>2026</option>
                        <option>2025</option>
                      </select>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Archivo PDF
                    </label>
                    <div
                      className="border-2 border-dashed border-[#E2E6EC] rounded-sm p-8 text-center cursor-pointer hover:border-[#1B2A4A] transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="1.5" className="mx-auto mb-3">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-[13px] font-medium text-[#1B2A4A]">Clic para seleccionar o arrastrar PDF</p>
                      <p className="text-[11px] font-mono text-[#9CA3AF] mt-1">Solo archivos .PDF · Máx. 10 MB</p>
                    </div>
                    <input ref={fileRef} type="file" accept=".pdf" className="hidden" />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="bg-[#1B2A4A] text-white font-semibold px-6 py-2.5 rounded-sm text-[14px] hover:bg-[#243660] transition-colors"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Cargar Recibo
                    </button>
                  </div>
                </form>
              </div>

              {/* Bulk upload + user list */}
              <div className="space-y-5">
                {/* Bulk upload */}
                <div className="bg-[#1B2A4A] rounded-sm p-5">
                  <p className="text-white/60 text-[10px] font-mono uppercase tracking-wider mb-1">Carga Masiva</p>
                  <h3 className="text-white text-[15px] font-bold mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Subir todos los recibos a la vez
                  </h3>
                  <p className="text-white/60 text-[12px] font-mono mb-4 leading-relaxed">
                    Comprima todos los PDFs en un .ZIP nombrando cada archivo con el DNI del empleado.
                    El sistema los asociará automáticamente.
                  </p>
                  <button className="bg-[#C9A227] text-[#1B2A4A] font-semibold px-4 py-2 rounded-sm text-[13px] hover:bg-[#e6bb3f] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Cargar archivo .ZIP
                  </button>
                </div>

                {/* Status table */}
                <div className="bg-white border border-[#E2E6EC] rounded-sm">
                  <div className="px-5 py-4 border-b border-[#E2E6EC]">
                    <h3 className="text-[13px] font-mono font-semibold text-[#1B2A4A] uppercase tracking-wide">
                      Estado — Agosto 2026
                    </h3>
                  </div>
                  <div className="divide-y divide-[#F3F4F6]">
                    {ADMIN_USERS.map((u, i) => (
                      <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-[#1B2A4A]">{u.name}</p>
                          <p className="text-[11px] font-mono text-[#9CA3AF]">DNI {u.dni}</p>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm ${
                          i < 5
                            ? "bg-[#C9A227]/10 text-[#8B6E0B]"
                            : "bg-[#C0281C]/10 text-[#C0281C]"
                        }`}>
                          {i < 5 ? "Cargado" : "Pendiente"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeSection === "users" && (
            <div className="bg-white border border-[#E2E6EC] rounded-sm max-w-3xl">
              <div className="px-6 py-5 border-b border-[#E2E6EC] flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-[#1B2A4A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Personal Institucional
                  </h2>
                  <p className="text-[12px] font-mono text-[#9CA3AF]">{ADMIN_USERS.length} registros</p>
                </div>
                <button className="bg-[#C0281C] text-white font-semibold px-4 py-2 rounded-sm text-[13px] hover:bg-[#d63d30] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  + Agregar
                </button>
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                {ADMIN_USERS.map(u => (
                  <div key={u.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-[#1B2A4A]/10 flex items-center justify-center text-[#1B2A4A] text-[13px] font-bold shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-[#1B2A4A]">{u.name}</p>
                      <p className="text-[11px] font-mono text-[#9CA3AF]">DNI {u.dni} · {u.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-[11px] font-mono text-[#6B7280] hover:text-[#1B2A4A] border border-[#E2E6EC] px-3 py-1.5 rounded-sm hover:border-[#1B2A4A] transition-colors">
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const DEMO_USERS: Record<string, User> = {
  teacher: { name: "García, Juan Pablo", role: "teacher", dni: "28445112", avatar: "G" },
  admin: { name: "Méndez, Laura B.", role: "admin", dni: "admin", avatar: "M" },
};

export default function App() {
  const [view, setView] = useState<View>("login");
  const [user, setUser] = useState<User | null>(null);
  const [mobileView, setMobileView] = useState<View>("bulletin");

  const handleLogin = (role: Role) => {
    setUser(DEMO_USERS[role]);
    if (role === "admin") {
      setView("admin");
    } else {
      setView("bulletin");
      setMobileView("bulletin");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView("login");
  };

  if (view === "login") return <LoginScreen onLogin={handleLogin} />;
  if (!user) return null;

  if (user.role === "admin") {
    return <AdminPanel user={user} onLogout={handleLogout} />;
  }

  return (
    <MobileShell
      currentView={mobileView}
      onNavigate={(v) => setMobileView(v)}
      user={user}
      onLogout={handleLogout}
    >
      {mobileView === "bulletin" ? <BulletinBoard user={user} /> : <ReceiptsView />}
    </MobileShell>
  );
}
