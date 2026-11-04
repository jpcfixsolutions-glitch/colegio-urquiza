import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCuit, parsePayslipFileName } from "../src/utils/payslip-file-name.js";

test("interpreta la convención Liquidacion_mes-año_CUIT_nombre_comprobante", () => {
  assert.deepEqual(
    parsePayslipFileName("Liquidacion_9-2026_20-12345678-3_Juan_Perez_2.pdf"),
    {
      format: "LIQUIDATION",
      month: 9,
      year: 2026,
      cuit: "20123456783",
      employeeName: "Juan Perez",
      receiptNumber: "2",
    },
  );
});

test("acepta el sufijo Nro que indica la interfaz de carga", () => {
  assert.deepEqual(
    parsePayslipFileName("Liquidación_11-2026_20-43927085-4_Mateo Andres_Nro 1.pdf"),
    {
      format: "LIQUIDATION",
      month: 11,
      year: 2026,
      cuit: "20439270854",
      employeeName: "Mateo Andres",
      receiptNumber: "1",
    },
  );
});

test("acepta rutas internas del ZIP y conserva compatibilidad con el nombre anterior", () => {
  assert.equal(parsePayslipFileName("recibos/Liquidación_12-2026_20123456783_Ana Gomez_1.pdf").cuit, "20123456783");
  assert.deepEqual(parsePayslipFileName("1234_2026_09.pdf"), {
    format: "LEGACY",
    employeeNumber: "1234",
    year: 2026,
    month: 9,
  });
});

test("rechaza CUIT y nombres inválidos", () => {
  assert.equal(normalizeCuit("20-123"), null);
  assert.equal(parsePayslipFileName("recibo-sin-convencion.pdf"), null);
});
