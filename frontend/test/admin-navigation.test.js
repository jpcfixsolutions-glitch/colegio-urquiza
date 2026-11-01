import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminNavigation } from "../src/features/adminNavigation.js";

test("un liquidador vinculado a un empleado conserva sus vistas personales", () => {
  const items = buildAdminNavigation({
    employeeId: "employee-1",
    permissions: ["PAYSLIP_MANAGE", "PAYSLIP_VIEW_OWN", "ANNOUNCEMENT_VIEW"],
  });
  const ids = items.map(([id]) => id);
  assert.ok(ids.includes("my-announcements"));
  assert.ok(ids.includes("my-receipts"));
  assert.ok(ids.includes("my-profile"));
  assert.ok(ids.includes("receipts"));
});

test("una cuenta administrativa sin empleado no recibe secciones personales", () => {
  const items = buildAdminNavigation({
    employeeId: null,
    permissions: ["PAYSLIP_MANAGE", "USER_MANAGE"],
  });
  assert.deepEqual(items.map(([id]) => id), ["dashboard", "receipts", "users"]);
});
