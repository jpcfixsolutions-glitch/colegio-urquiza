import assert from "node:assert/strict";
import test from "node:test";
import { MAX_BULK_UPLOAD_CONCURRENCY, runBulkUploadQueue } from "../src/features/bulkUploadQueue.js";

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

test("procesa 20 fixtures con un máximo de cuatro uploads y aísla los fallos", async () => {
  const selectedFiles = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, validPdf: true, unmatched: index === 2 || index === 17 }));
  const items = selectedFiles.filter(item => !item.unmatched);
  const statuses = new Map();
  let activeUploads = 0;
  let maxActiveUploads = 0;
  let processed = 0;

  const results = await runBulkUploadQueue({
    items,
    createIntent: async item => { assert.equal(item.unmatched, false); return { payslipId: item.id }; },
    upload: async item => {
      activeUploads += 1;
      maxActiveUploads = Math.max(maxActiveUploads, activeUploads);
      await delay(2);
      activeUploads -= 1;
      if (item.id === 7) throw new Error("Fallo de Storage controlado");
    },
    confirm: async item => { if (item.id === 12) throw new Error("Fallo de confirmación controlado"); },
    onStatusChange: (item, status) => statuses.set(item.id, status),
    onItemProcessed: () => { processed += 1; }
  });

  assert.equal(maxActiveUploads, MAX_BULK_UPLOAD_CONCURRENCY);
  assert.equal(selectedFiles.filter(item => item.validPdf).length, 20);
  assert.equal(selectedFiles.filter(item => item.unmatched).length, 2);
  assert.equal(processed, 18);
  assert.equal(results.length, 18);
  assert.equal(results.filter(result => result.status === "OK").length, 16);
  assert.equal(results.filter(result => result.status === "ERROR").length, 2);
  assert.equal(statuses.get(7), "ERROR");
  assert.equal(statuses.get(12), "ERROR");
  assert.equal(statuses.has(3), false);
  assert.equal(statuses.has(18), false);
  assert.equal(statuses.get(20), "OK");
});
