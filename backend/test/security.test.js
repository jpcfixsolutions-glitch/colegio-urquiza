import test from "node:test";
import assert from "node:assert/strict";
import { createApp, isOriginAllowed } from "../src/app.js";

test("la aplicación aplica rutas de salud y no expone configuración", () => {
  const app=createApp();
  assert.equal(typeof app, "function");
  assert.equal(app.get("env"), process.env.NODE_ENV || "development");
});

test("CORS admite loopback en desarrollo y mantiene producción restringida", () => {
  const configuredOrigins = ["https://colegio.example.com"];

  assert.equal(isOriginAllowed("http://localhost:5174", configuredOrigins, "development"), true);
  assert.equal(isOriginAllowed("http://127.0.0.1:4173", configuredOrigins, "development"), true);
  assert.equal(isOriginAllowed("https://colegio.example.com", configuredOrigins, "production"), true);
  assert.equal(isOriginAllowed("http://localhost:5174", configuredOrigins, "production"), false);
  assert.equal(isOriginAllowed("https://sitio-no-permitido.example", configuredOrigins, "development"), false);
});
