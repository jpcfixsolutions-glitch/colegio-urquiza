import assert from "node:assert/strict";
import test from "node:test";

import { isLegacyBootstrapAdminIdentifier, normalizeLoginCuit } from "../src/services/login-identity.service.js";

test("normaliza el CUIT de inicio de sesión con o sin separadores", () => {
  assert.equal(normalizeLoginCuit("20-43927085-4"), "20439270854");
  assert.equal(normalizeLoginCuit("20439270854"), "20439270854");
  assert.equal(normalizeLoginCuit("20-43997803-2"), "20439978032");
  assert.equal(normalizeLoginCuit(" 20 43997803 2 "), "20439978032");
});

test("rechaza valores que no contienen un CUIT completo", () => {
  assert.equal(normalizeLoginCuit("20439978"), null);
  assert.equal(normalizeLoginCuit("usuario@colegio.local"), null);
});

test("la compatibilidad de email identifica únicamente al admin bootstrap cuando está habilitada", () => {
  assert.equal(isLegacyBootstrapAdminIdentifier("admin@colegio.local", true), true);
  assert.equal(isLegacyBootstrapAdminIdentifier("empleado@colegio.local", true), false);
  assert.equal(isLegacyBootstrapAdminIdentifier("admin@colegio.local", false), false);
});
