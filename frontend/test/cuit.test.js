import assert from "node:assert/strict";
import test from "node:test";

import { formatCuit, formatLoginIdentifier } from "../src/utils/cuit.js";

test("inserta los guiones del CUIT durante la escritura", () => {
  assert.equal(formatCuit("20"), "20");
  assert.equal(formatCuit("204"), "20-4");
  assert.equal(formatCuit("2043997803"), "20-43997803");
  assert.equal(formatCuit("20439978032"), "20-43997803-2");
});

test("acepta pegado con separadores, elimina caracteres extra y limita a once dígitos", () => {
  assert.equal(formatCuit("20.439.978/03-2"), "20-43997803-2");
  assert.equal(formatCuit("204399780329999"), "20-43997803-2");
});

test("conserva el email para el acceso administrativo transitorio", () => {
  assert.equal(formatLoginIdentifier("admin@colegio.local"), "admin@colegio.local");
});
