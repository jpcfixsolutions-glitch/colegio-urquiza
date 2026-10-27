import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";

const ICON_PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  announcements: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21h4"/></>,
  receipts: <><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  areas: <><path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6M9 10h.01M15 10h.01"/></>,
  employees: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 5a4 4 0 0 1 0 7M17 15a6 6 0 0 1 5 6"/></>,
  users: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M18 3v4M16 5h4"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  collapse: <path d="m15 18-6-6 6-6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12"/><circle cx="12" cy="12" r="2.5"/></>,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 19v2h16v-2"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  shield: <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  warning: <><path d="M12 3 2 21h20L12 3z"/><path d="M12 9v5M12 18h.01"/></>,
  upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 15v6h16v-6"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  arrow: <path d="m9 18 6-6-6-6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z"/>,
  document: <><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/></>,
};

export function Icon({ name, size = 20, className = "" }) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_PATHS[name] || ICON_PATHS.document}</svg>;
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return <header className="page-heading">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="page-description">{description}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>;
}

export function StatusBadge({ tone = "neutral", children, dot = true }) {
  return <span className={`status-badge ${tone}`}>{dot && <span className="status-dot" />}{children}</span>;
}

function labelRows(children, headers) {
  return Children.map(children, row => {
    if (!isValidElement(row)) return row;
    return cloneElement(row, {}, Children.map(row.props.children, (cell, index) => {
      if (!isValidElement(cell)) return cell;
      return cloneElement(cell, { "data-label": headers[index] || "" });
    }));
  });
}

export function ResponsiveTable({ headers, children, className = "" }) {
  return <div className={`table-wrap ${className}`}>
    <table className="table responsive-table">
      <thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{labelRows(children, headers)}</tbody>
    </table>
  </div>;
}

export function SearchField({ value, onChange, placeholder = "Buscar…", label = "Buscar" }) {
  return <label className="search-field">
    <span className="sr-only">{label}</span>
    <Icon name="search" size={18} />
    <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
  </label>;
}

export function ActionMenu({ label = "Más acciones", children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="action-menu" ref={ref}>
    <button type="button" className="icon-button" aria-label={label} aria-expanded={open} onClick={() => setOpen(value => !value)}><Icon name="more" /></button>
    {open && <div className="action-menu-panel" onClick={() => setOpen(false)}>{children}</div>}
  </div>;
}

export function EmptyState({ icon = "document", title, description, action }) {
  return <div className="empty-state">
    <span className="empty-icon"><Icon name={icon} size={26} /></span>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>;
}

export function SkeletonRows({ count = 4 }) {
  return <div className="skeleton-list" aria-label="Cargando contenido">{Array.from({ length: count }, (_, index) => <div className="skeleton-row" key={index}><span /><span /><span /></div>)}</div>;
}

export function Modal({ open, title, eyebrow, onClose, children, className = "", busy = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (event.key === "Escape" && !busy) onClose?.(); };
    document.addEventListener("keydown", close);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previous; };
  }, [open, busy, onClose]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose?.(); }}>
    <section className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header className="modal-header">
        <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 id="modal-title">{title}</h2></div>
        {onClose && <button type="button" className="icon-button modal-close" aria-label="Cerrar" disabled={busy} onClick={onClose}><Icon name="close" /></button>}
      </header>
      {children}
    </section>
  </div>;
}
