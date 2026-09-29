import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

function createSupabaseStub({ error, throws } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push({ table });
      return {
        update(values) {
          calls[0].values = values;
          return {
            async eq(column, value) {
              calls[0].filter = { column, value };
              if (throws) throw throws;
              return { error };
            },
          };
        },
      };
    },
  };
}

async function requestKeepalive({ authorization, supabaseClient = createSupabaseStub() } = {}) {
  const app = createApp({ cronSecret: "test-cron-secret", supabaseClient });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/cron/supabase-keepalive`, {
      headers: authorization ? { authorization } : {},
    });
    return { response, body: await response.json(), calls: supabaseClient.calls };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("keepalive rechaza requests sin Authorization", async () => {
  const result = await requestKeepalive();
  assert.equal(result.response.status, 401);
  assert.deepEqual(result.body, { error: "No autorizado" });
  assert.equal(result.calls.length, 0);
});

test("keepalive rechaza Authorization incorrecta", async () => {
  const result = await requestKeepalive({ authorization: "Bearer secret-incorrecto" });
  assert.equal(result.response.status, 401);
  assert.equal(result.calls.length, 0);
});

test("keepalive autorizado actualiza el registro de Supabase", async () => {
  const result = await requestKeepalive({ authorization: "Bearer test-cron-secret" });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(result.calls[0].table, "keepalive");
  assert.deepEqual(result.calls[0].filter, { column: "id", value: 1 });
  assert.match(result.calls[0].values.touched_at, /^\d{4}-\d{2}-\d{2}T/);
});

test("keepalive devuelve un error controlado si Supabase falla", async () => {
  const result = await requestKeepalive({
    authorization: "Bearer test-cron-secret",
    supabaseClient: createSupabaseStub({ error: new Error("Supabase no disponible") }),
  });
  assert.equal(result.response.status, 500);
  assert.deepEqual(result.body, { error: "No se pudo ejecutar el keep-alive de Supabase" });
});
