import { api } from "../api/httpClient.js";

const CLIENT_HEARTBEAT_MS = 60 * 1000;
const CLIENT_IDLE_MS = 2 * 60 * 1000;
const SHARED_KEY = "iu-presence-heartbeat";

export function startPresenceHeartbeat() {
  let lastInteraction = Date.now();
  let stopped = false;
  const noteInteraction = () => { lastInteraction = Date.now(); };
  const send = async () => {
    if (stopped || document.visibilityState !== "visible" || Date.now() - lastInteraction > CLIENT_IDLE_MS) return;
    const lastShared = Number(localStorage.getItem(SHARED_KEY) || 0);
    if (Date.now() - lastShared < CLIENT_HEARTBEAT_MS - 5000) return;
    localStorage.setItem(SHARED_KEY, String(Date.now()));
    try { await api("/activity/heartbeat", { method: "POST" }); } catch { /* un fallo transitorio no cierra la sesión */ }
  };
  const visibility = () => { if (document.visibilityState === "visible") { noteInteraction(); send(); } };
  ["pointerdown", "keydown", "touchstart", "scroll"].forEach(event => window.addEventListener(event, noteInteraction, { passive: true }));
  document.addEventListener("visibilitychange", visibility);
  send();
  const interval = setInterval(send, CLIENT_HEARTBEAT_MS);
  return () => { stopped = true; clearInterval(interval); document.removeEventListener("visibilitychange", visibility); ["pointerdown", "keydown", "touchstart", "scroll"].forEach(event => window.removeEventListener(event, noteInteraction)); };
}
