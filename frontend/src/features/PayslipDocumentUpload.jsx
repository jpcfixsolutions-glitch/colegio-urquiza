import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";

import { api } from "../api/httpClient.js";
import { runBulkUploadQueue } from "./bulkUploadQueue.js";
import "./payslipDocumentUpload.css";

const MAX_PDF_SIZE = 10 * 1024 * 1024;
const MAX_ZIP_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 100;

const DOCUMENT_TYPES = [
  ["SALARY", "Mensual"],
  ["EARNINGS", "Ganancias"],
  ["NOTIFICATION", "Notificación"],
  ["FINAL_SETTLEMENT", "Liquidación final"],
  ["SAC", "SAC"],
];

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const STATUS_LABELS = {
  READY: "Listo",
  UNMATCHED: "Sin asociar",
  INVALID_FILE: "PDF inválido",
  INVALID_NAME: "Nombre inválido",
  PERIOD_MISMATCH: "Período distinto",
  SUBIENDO: "Subiendo",
  CONFIRMANDO: "Confirmando",
  OK: "Cargado",
  ERROR: "Error",
};

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, "0")).join("");
}

async function extractPdfFiles(mode, selectedFiles) {
  if (mode === "separate") {
    const files = Array.from(selectedFiles);
    if (!files.length) throw new Error("Seleccioná al menos un PDF.");
    if (files.length > MAX_FILES) throw new Error(`Podés cargar hasta ${MAX_FILES} PDF por operación.`);
    return files;
  }

  const [zipFile] = Array.from(selectedFiles);
  if (!zipFile || !/\.zip$/i.test(zipFile.name)) throw new Error("Seleccioná un archivo .zip.");
  if (zipFile.size > MAX_ZIP_SIZE) throw new Error("El ZIP no puede superar los 100 MB.");

  const zip = await JSZip.loadAsync(zipFile);
  const entries = Object.values(zip.files).filter(entry => !entry.dir && !entry.name.startsWith("__MACOSX/") && /\.pdf$/i.test(entry.name));
  if (!entries.length) throw new Error("El ZIP no contiene archivos PDF.");
  if (entries.length > MAX_FILES) throw new Error(`El ZIP puede contener hasta ${MAX_FILES} PDF.`);

  const files = [];
  let totalSize = 0;
  for (const entry of entries) {
    const data = await entry.async("uint8array");
    totalSize += data.byteLength;
    if (data.byteLength > MAX_PDF_SIZE) throw new Error(`${entry.name} supera los 10 MB.`);
    if (totalSize > MAX_FILES * MAX_PDF_SIZE) throw new Error("El contenido descomprimido supera el máximo permitido.");
    files.push(new File([data], entry.name.split("/").pop(), { type: "application/pdf" }));
  }
  return files;
}

function initialConfiguration() {
  const today = new Date();
  return {
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
    documentType: "SALARY",
    mode: "zip",
    notifyUser: false,
  };
}

export function PayslipDocumentUpload({ onComplete }) {
  const [open, setOpen] = useState(false);
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [step, setStep] = useState("configure");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!open) return;
    api("/payslip-employees").then(result => setEmployees(result.items.filter(employee => employee.active))).catch(error => setMessage(error.message));
  }, [open]);

  const readyRows = useMemo(() => rows.filter(row => row.valid && row.employeeId && !["OK", "ERROR"].includes(row.status)), [rows]);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setConfiguration(initialConfiguration());
    setSelectedFiles([]);
    setRows([]);
    setStep("configure");
    setMessage("");
    setProgress(null);
  };

  const review = async event => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const files = await extractPdfFiles(configuration.mode, selectedFiles);
      const invalid = files.find(file => !/\.pdf$/i.test(file.name) || file.size <= 0 || file.size > MAX_PDF_SIZE);
      if (invalid) throw new Error(`${invalid.name} no es un PDF válido o supera los 10 MB.`);
      const result = await api("/admin/payslips/bulk-review", {
        method: "POST",
        body: JSON.stringify({
          month: Number(configuration.month),
          year: Number(configuration.year),
          files: files.map(file => ({ name: file.name, mimeType: "application/pdf", sizeBytes: file.size })),
        }),
      });
      setRows(result.items.map((item, index) => ({ ...item, file: files[index], clientId: crypto.randomUUID(), reviewStatus: item.status })));
      setStep("review");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const selectEmployee = (clientId, employeeId) => {
    setRows(current => current.map(row => row.clientId === clientId ? {
      ...row,
      employeeId,
      status: employeeId && row.valid ? "READY" : row.reviewStatus,
    } : row));
  };

  const upload = async () => {
    const items = rows.filter(row => row.valid && row.employeeId && row.status !== "OK");
    if (!items.length) {
      setMessage("No hay documentos válidos y asociados para cargar.");
      return;
    }
    setBusy(true);
    setMessage("");
    setProgress({ processed: rows.filter(row => row.status === "OK").length, total: items.length });
    const results = await runBulkUploadQueue({
      items,
      createIntent: async row => api("/payslips/upload-intents", {
        method: "POST",
        body: JSON.stringify({
          employeeId: row.employeeId,
          month: Number(configuration.month),
          year: Number(configuration.year),
          documentType: configuration.documentType,
          notifyUser: configuration.notifyUser,
          title: `${DOCUMENT_TYPES.find(([value]) => value === configuration.documentType)?.[1]} ${MONTHS[Number(configuration.month) - 1]} ${configuration.year}`,
          originalFileName: row.file.name,
          mimeType: "application/pdf",
          sizeBytes: row.file.size,
          sha256: await hashFile(row.file),
        }),
      }),
      upload: async (row, intent) => {
        const response = await fetch(intent.upload.signedUrl, {
          method: "PUT",
          headers: { "content-type": "application/pdf", "x-upsert": "false" },
          body: row.file,
        });
        if (!response.ok) throw new Error("Falló la subida directa a Storage");
      },
      confirm: (_, intent) => api(`/payslips/${intent.payslipId}/confirm`, { method: "POST" }),
      onStatusChange: (row, status, error) => setRows(current => current.map(item => item.clientId === row.clientId ? { ...item, status, error } : item)),
      onItemProcessed: () => setProgress(current => ({ ...current, processed: current.processed + 1 })),
    });
    const successCount = results.filter(result => result.status === "OK").length;
    const errorCount = results.length - successCount;
    setMessage(`Carga finalizada: ${successCount} documento${successCount === 1 ? "" : "s"} cargado${successCount === 1 ? "" : "s"}${errorCount ? ` y ${errorCount} con error` : ""}.`);
    setStep("done");
    setBusy(false);
    if (successCount) onComplete?.();
  };

  return <>
    <section className="card upload-entry-card">
      <div>
        <p className="eyebrow">Carga segura</p>
        <h2>Carga de documentos</h2>
        <p>Prepará el período y el tipo una sola vez. Podés cargar un ZIP completo o varios PDF por separado.</p>
      </div>
      <button className="btn red" onClick={() => setOpen(true)}>Nueva carga</button>
    </section>

    {open && <div className="modal-backdrop upload-modal-backdrop">
      <section className="modal upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <header className="upload-modal-header">
          <div><p className="eyebrow">Recibos</p><h2 id="upload-title">Cargar documentos</h2></div>
          <button className="modal-close" type="button" aria-label="Cerrar" disabled={busy} onClick={close}>×</button>
        </header>

        {step === "configure" && <form onSubmit={review}>
          <div className="upload-form-grid">
            <div className="field"><label>Mes correspondiente</label><select value={configuration.month} onChange={event => setConfiguration({ ...configuration, month: event.target.value })}>{MONTHS.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}</select></div>
            <div className="field"><label>Año</label><input type="number" min="2000" max="2100" value={configuration.year} onChange={event => setConfiguration({ ...configuration, year: event.target.value })} required /></div>
          </div>
          <div className="field"><label>Tipo de documento</label><select value={configuration.documentType} onChange={event => setConfiguration({ ...configuration, documentType: event.target.value })}>{DOCUMENT_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>

          <fieldset className="upload-mode">
            <legend>Forma de carga</legend>
            <label className={configuration.mode === "zip" ? "selected" : ""}><input type="radio" name="upload-mode" value="zip" checked={configuration.mode === "zip"} onChange={() => { setConfiguration({ ...configuration, mode: "zip" }); setSelectedFiles([]); }} /><span><strong>Todos juntos</strong><small>Un archivo ZIP con todos los PDF</small></span></label>
            <label className={configuration.mode === "separate" ? "selected" : ""}><input type="radio" name="upload-mode" value="separate" checked={configuration.mode === "separate"} onChange={() => { setConfiguration({ ...configuration, mode: "separate" }); setSelectedFiles([]); }} /><span><strong>Por separado</strong><small>Seleccionar uno o varios PDF</small></span></label>
          </fieldset>

          <label className="notification-option"><input type="checkbox" checked={configuration.notifyUser} onChange={event => setConfiguration({ ...configuration, notifyUser: event.target.checked })} /><span><strong>Notificar a cada usuario</strong><small>El recibo aparecerá marcado como nuevo hasta que el empleado lo abra.</small></span></label>

          <div className="file-drop">
            <strong>{configuration.mode === "zip" ? "Archivo ZIP" : "Archivos PDF"}</strong>
            <p>{configuration.mode === "zip" ? "El ZIP se abre en este navegador; los PDF se suben directamente al almacenamiento privado." : "Podés seleccionar hasta 100 documentos."}</p>
            <input type="file" accept={configuration.mode === "zip" ? ".zip,application/zip" : ".pdf,application/pdf"} multiple={configuration.mode === "separate"} onChange={event => setSelectedFiles(event.target.files)} required />
          </div>
          <p className="file-convention"><strong>Nombre esperado:</strong> Liquidacion_MM-AAAA_CUIT_Nombre y Apellido_Nro.pdf</p>
          {message && <p className="error" role="alert">{message}</p>}
          <div className="modal-actions"><button className="btn ghost" type="button" onClick={close}>Cancelar</button><button className="btn red" disabled={busy}>{busy ? "Revisando…" : "Revisar documentos"}</button></div>
        </form>}

        {step !== "configure" && <>
          <div className="upload-summary">
            <span><strong>{MONTHS[Number(configuration.month) - 1]} {configuration.year}</strong>Período</span>
            <span><strong>{DOCUMENT_TYPES.find(([value]) => value === configuration.documentType)?.[1]}</strong>Tipo</span>
            <span><strong>{rows.length}</strong>Archivos</span>
          </div>
          <p className="review-help">Verificá las asociaciones. Los nombres que no coincidan con la convención pueden asignarse manualmente.</p>
          <div className="table-wrap upload-review-table"><table className="table"><thead><tr><th>Archivo</th><th>CUIT / comprobante</th><th>Empleado</th><th>Estado</th></tr></thead><tbody>{rows.map(row => <tr key={row.clientId}><td>{row.fileName}{row.error && <small className="row-error">{row.error}</small>}</td><td>{row.cuit || "—"}<small>{row.receiptNumber ? `Comp. ${row.receiptNumber}` : ""}</small></td><td><select value={row.employeeId || ""} disabled={busy || !row.valid || row.status === "OK"} onChange={event => selectEmployee(row.clientId, event.target.value)}><option value="">Sin asociar</option>{employees.map(employee => <option value={employee.id} key={employee.id}>{employee.lastName}, {employee.firstName} · {employee.cuit || employee.employeeNumber}</option>)}</select></td><td><span className={`bulk-status ${row.status.toLowerCase()}`}>{STATUS_LABELS[row.status] || row.status}</span>{row.reviewStatus === "PERIOD_MISMATCH" && <small>El nombre indica otro período</small>}</td></tr>)}</tbody></table></div>
          {progress && <p className="bulk-progress">Progreso: {progress.processed} / {progress.total}</p>}
          {message && <p className={step === "done" ? "success" : "error"} role="status">{message}</p>}
          <div className="modal-actions">{step === "review" && <button className="btn ghost" type="button" disabled={busy} onClick={() => setStep("configure")}>Volver</button>}<button className="btn red" type="button" disabled={busy || (step === "review" && !readyRows.length)} onClick={step === "done" ? close : upload}>{step === "done" ? "Cerrar" : busy ? "Cargando…" : `Cargar ${readyRows.length} documento${readyRows.length === 1 ? "" : "s"}`}</button></div>
        </>}
      </section>
    </div>}
  </>;
}
