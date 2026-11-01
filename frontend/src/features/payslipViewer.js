export async function loadValidatedPdf(url, fetchImpl = fetch) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error("El PDF no pudo cargarse desde el almacenamiento seguro.");
  const pdf = await response.blob();
  const signature = await pdf.slice(0, 5).text();
  if (!pdf.size || signature !== "%PDF-") throw new Error("El archivo recibido no es un PDF válido.");
  return pdf;
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
