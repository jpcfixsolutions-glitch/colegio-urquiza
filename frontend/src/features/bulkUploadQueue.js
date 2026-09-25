// Esta es la única configuración de concurrencia para la carga masiva.
export const MAX_BULK_UPLOAD_CONCURRENCY = 4;

/** Ejecuta flujos independientes intent -> upload directo -> confirm. */
export async function runBulkUploadQueue({ items, createIntent, upload, confirm, onStatusChange, onItemProcessed }) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      try {
        const intent = await createIntent(item);
        onStatusChange(item, "SUBIENDO");
        await upload(item, intent);
        onStatusChange(item, "CONFIRMANDO");
        await confirm(item, intent);
        results.push({ item, status: "OK" });
        onStatusChange(item, "OK");
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo procesar el archivo";
        results.push({ item, status: "ERROR", error: message });
        onStatusChange(item, "ERROR", message);
      } finally {
        onItemProcessed?.(item);
      }
    }
  }

  // Sólo se esperan workers (como máximo cuatro), nunca todos los archivos.
  const workerCount = Math.min(MAX_BULK_UPLOAD_CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
