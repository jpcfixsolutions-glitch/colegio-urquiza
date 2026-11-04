import assert from "node:assert/strict";
import test from "node:test";

import { errorHandler } from "../src/middlewares/error-handler.js";

test("un error interno no expone SQL al cliente", () => {
  let status;
  let body;
  const response = {
    status(value) { status = value; return this; },
    json(value) { body = value; return this; },
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error('Failed query: select "user_id" from "employees"'), {}, response, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(status, 500);
  assert.equal(body.error, "No se pudo procesar la solicitud. Intentá nuevamente.");
  assert.doesNotMatch(JSON.stringify(body), /select|employees|user_id/i);
});
