import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createApp, isOriginAllowed } from "../src/app.js";
import { refreshCookieOptions } from "../src/routes/api.routes.js";

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

test("la cookie refresh permite credenciales entre proyectos sólo en producción", async () => {
  const production = refreshCookieOptions("production");
  assert.equal(production.httpOnly, true);
  assert.equal(production.secure, true);
  assert.equal(production.sameSite, "none");
  assert.equal(production.partitioned, true);
  assert.equal(production.path, "/api/auth");

  const development = refreshCookieOptions("development");
  assert.equal(development.httpOnly, true);
  assert.equal(development.secure, false);
  assert.equal(development.sameSite, "lax");
  assert.equal(development.partitioned, false);

  const cookieApp = express();
  cookieApp.get("/", (req, res) => res.cookie("refresh_token", "test-token", production).status(204).end());
  const server = cookieApp.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    const setCookie = response.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Secure/);
    assert.match(setCookie, /Partitioned/);
    assert.match(setCookie, /SameSite=None/);
    assert.match(setCookie, /Path=\/api\/auth/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
