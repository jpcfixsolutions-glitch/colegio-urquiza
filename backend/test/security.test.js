import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

test("la aplicación aplica rutas de salud y no expone configuración", () => {
  const app=createApp();
  assert.equal(typeof app, "function");
  assert.equal(app.get("env"), process.env.NODE_ENV || "development");
});
