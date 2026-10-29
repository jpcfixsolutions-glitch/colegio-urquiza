import assert from "node:assert/strict";
import test from "node:test";

import { normalizeLoginCuit } from "../src/services/login-identity.service.js";

test("normaliza el CUIT de inicio de sesión con o sin separadores", () => {
  assert.equal(normalizeLoginCuit("20-43997803-2"), "20439978032");
  assert.equal(normalizeLoginCuit(" 20 43997803 2 "), "20439978032");
});

test("rechaza identificadores que no contienen un CUIT completo", () => {
  assert.equal(normalizeLoginCuit("20439978"), null);
  assert.equal(normalizeLoginCuit("usuario@colegio.local"), null);
});
