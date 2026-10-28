import assert from "node:assert/strict";
import test from "node:test";
import { argentinaDayBounds, PRESENCE_WINDOW_SECONDS, PRESENCE_WRITE_THROTTLE_SECONDS, presenceCutoff } from "../src/services/activity.service.js";

test("los límites diarios de Córdoba se normalizan a UTC sin desplazamiento manual", () => {
  const bounds = argentinaDayBounds("2026-10-27");
  assert.equal(bounds.start.toISOString(), "2026-10-27T03:00:00.000Z");
  assert.equal(bounds.end.toISOString(), "2026-10-28T02:59:59.999Z");
});

test("la ventana de presencia se compara como un instante UTC", () => {
  const now = new Date("2026-10-28T01:30:00.000Z");
  assert.equal(presenceCutoff(now).getTime(), now.getTime() - PRESENCE_WINDOW_SECONDS * 1000);
});

test("los umbrales de actividad se normalizan a segundos Unix para Turso", () => {
  const now = new Date("2026-10-28T01:30:45.000Z");
  assert.equal(Math.floor(presenceCutoff(now).getTime() / 1000), 1793150865);
  assert.equal(Math.floor((now.getTime() - PRESENCE_WRITE_THROTTLE_SECONDS * 1000) / 1000), 1793151000);
});
