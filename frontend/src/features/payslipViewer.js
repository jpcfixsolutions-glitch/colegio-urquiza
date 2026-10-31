export async function loadValidatedPdf(url, fetchImpl = fetch) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error("El PDF no pudo cargarse desde el almacenamiento seguro.");
  const pdf = await response.blob();
  const signature = await pdf.slice(0, 5).text();
  if (!pdf.size || signature !== "%PDF-") throw new Error("El archivo recibido no es un PDF válido.");
  return pdf;
}
