export async function loadValidatedPdf(url, fetchImpl = fetch) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error("El PDF no pudo cargarse desde el almacenamiento seguro.");
  const pdf = await response.blob();
  const signature = await pdf.slice(0, 5).text();
  if (!pdf.size || signature !== "%PDF-") throw new Error("El archivo recibido no es un PDF válido.");
  return pdf;
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

export function buildPdfOpeningPage(error = "") {
  const failed = Boolean(error);
  const title = failed ? "No se pudo abrir el recibo" : "Abriendo recibo…";
  const message = failed ? escapeHtml(error) : "Preparando el acceso seguro al PDF.";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>:root{color-scheme:light}*{box-sizing:border-box}body{min-height:100vh;min-height:100dvh;display:grid;place-items:center;margin:0;padding:max(24px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));background:#f3f5f8;color:#15233f;font:16px/1.5 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(100%,460px);padding:clamp(24px,7vw,36px);border:1px solid #e6ebf1;border-radius:18px;background:#fff;box-shadow:0 14px 38px rgba(11,23,48,.12);text-align:center}.spinner{width:28px;height:28px;margin:0 auto 18px;border:3px solid #d7dee8;border-top-color:#244574;border-radius:50%;animation:spin .7s linear infinite}strong{display:block;font-size:clamp(20px,6vw,26px);line-height:1.25}p{margin:10px 0 0;color:#617086}@keyframes spin{to{transform:rotate(360deg)}}.error{color:#a9272d}</style></head><body><main>${failed ? "" : '<div class="spinner" aria-hidden="true"></div>'}<strong>${title}</strong><p class="${failed ? "error" : ""}">${message}</p></main></body></html>`;
}

export function getPdfPageSize(pageWidth, pageHeight, availableWidth, zoom = 1) {
  const safeWidth = Math.max(1, Number(pageWidth) || 1);
  const safeHeight = Math.max(1, Number(pageHeight) || 1);
  const viewportWidth = Math.max(1, Number(availableWidth) || 1);
  const safeZoom = Math.max(0.1, Number(zoom) || 1);
  const fittedWidth = Math.min(safeWidth, Math.max(1, viewportWidth - 32));
  const scale = fittedWidth / safeWidth * safeZoom;
  return { width: safeWidth * scale, height: safeHeight * scale, scale };
}
