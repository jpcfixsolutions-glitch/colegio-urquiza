import test from "node:test";
import assert from "node:assert/strict";
import { buildPayslipPath } from "../src/services/storage.service.js";

test("el path de recibo usa UUID de empleado y no datos personales", () => {
  const path = buildPayslipPath({ employeeId:"8e6ef9ad-759f-4f1e-9df9-3fcc0f759ed3", year:2026, month:9, payslipId:"af966a83-a6d3-40e2-9fba-2a3f34d2dacf" });
  assert.equal(path,"employees/8e6ef9ad-759f-4f1e-9df9-3fcc0f759ed3/2026/09/af966a83-a6d3-40e2-9fba-2a3f34d2dacf.pdf");
  assert.throws(()=>buildPayslipPath({employeeId:"x",year:2026,month:13}));
});
