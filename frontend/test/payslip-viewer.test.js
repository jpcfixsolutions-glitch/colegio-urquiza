import assert from "node:assert/strict";
import test from "node:test";

import { loadValidatedPdf } from "../src/features/payslipViewer.js";

test("confirma una carga sólo después de recibir un PDF válido completo", async () => {
  const contents = "%PDF-1.4\ncontenido de prueba";
  const pdf = await loadValidatedPdf("https://storage.test/receipt", async () => new Response(contents, { status: 200, headers: { "content-type": "application/pdf" } }));
  assert.equal(await pdf.text(), contents);
});

test("rechaza respuestas de Storage fallidas o que no contienen un PDF", async () => {
  await assert.rejects(() => loadValidatedPdf("https://storage.test/missing", async () => new Response("", { status: 404 })), /no pudo cargarse/);
  await assert.rejects(() => loadValidatedPdf("https://storage.test/not-pdf", async () => new Response("<html>error</html>", { status: 200 })), /no es un PDF válido/);
});
