import assert from "node:assert/strict";
import test from "node:test";

import { getPersonalProfileStatus, personalProfileDto } from "../src/services/personal-profile.service.js";

const completeEmployee = profileUpdatedAt => ({
  address: "Calle 123",
  phone: "3515555555",
  maritalStatus: "SINGLE",
  dni: "30111222",
  cuit: "20301112223",
  profileUpdatedAt,
});

test("un empleado sin todos sus datos debe completar el perfil", () => {
  assert.deepEqual(getPersonalProfileStatus({ ...completeEmployee(new Date()), dni: null }), {
    profileComplete: false,
    profileNeedsReview: true,
    profileReviewDueAt: null,
  });
});

test("el perfil queda vigente durante tres meses calendario", () => {
  const status = getPersonalProfileStatus(completeEmployee(new Date("2026-01-15T12:00:00.000Z")), new Date("2026-04-14T12:00:00.000Z"));
  assert.equal(status.profileComplete, true);
  assert.equal(status.profileNeedsReview, false);
  assert.equal(status.profileReviewDueAt.toISOString(), "2026-04-15T12:00:00.000Z");
});

test("al cumplirse tres meses solicita revisar los datos", () => {
  const status = getPersonalProfileStatus(completeEmployee(new Date("2026-01-15T12:00:00.000Z")), new Date("2026-04-15T12:00:00.000Z"));
  assert.equal(status.profileComplete, true);
  assert.equal(status.profileNeedsReview, true);
});

test("el vencimiento trimestral respeta el último día del mes", () => {
  const status = getPersonalProfileStatus(completeEmployee(new Date("2026-01-31T12:00:00.000Z")), new Date("2026-04-29T12:00:00.000Z"));
  assert.equal(status.profileReviewDueAt.toISOString(), "2026-04-30T12:00:00.000Z");
  assert.equal(status.profileNeedsReview, false);
});

test("el perfil expone el email institucional sin duplicarlo en empleados", () => {
  const profile = personalProfileDto({
    firstName: "Ana", lastName: "Pérez", ...completeEmployee(new Date()),
  }, "ana.perez@instituto.edu.ar");

  assert.equal(profile.institutionalEmail, "ana.perez@instituto.edu.ar");
  assert.equal("personalEmail" in profile, false);
  assert.equal("employeeNumber" in profile, false);
});
