import test from "node:test";
import assert from "node:assert/strict";
import { accountAccessDto, roleNamesForAccountAccess, validateAccountAccess } from "../src/services/account-access.service.js";

test("traduce roles heredados a tipo de cuenta y privilegios administrativos", () => {
  assert.deepEqual(accountAccessDto(["PAYROLL_MANAGER"]), { accountType: "ADMINISTRATOR", administrativePrivileges: ["PAYSLIPS"] });
  assert.deepEqual(accountAccessDto(["COMMUNICATION_MANAGER"]), { accountType: "ADMINISTRATOR", administrativePrivileges: ["ANNOUNCEMENTS"] });
  assert.deepEqual(accountAccessDto(["ADMIN"]), { accountType: "ADMINISTRATOR", administrativePrivileges: ["PAYSLIPS", "ANNOUNCEMENTS", "EMPLOYEES", "USERS", "AUDIT"] });
  assert.deepEqual(accountAccessDto(["EMPLOYEE"]), { accountType: "EMPLOYEE", administrativePrivileges: [] });
});

test("rechaza privilegios administrativos para una cuenta de empleado", () => {
  assert.throws(() => validateAccountAccess({ accountType: "EMPLOYEE", administrativePrivileges: ["PAYSLIPS"] }), { status: 400 });
});

test("un administrador compuesto conserva el rol base de empleado", () => {
  assert.deepEqual(roleNamesForAccountAccess({ accountType: "ADMINISTRATOR", administrativePrivileges: ["PAYSLIPS"] }), ["EMPLOYEE", "ADMINISTRATOR", "PAYROLL_MANAGER"]);
  assert.deepEqual(roleNamesForAccountAccess({ accountType: "ADMINISTRATOR", administrativePrivileges: ["PAYSLIPS", "ANNOUNCEMENTS", "EMPLOYEES", "USERS", "AUDIT"] }), ["EMPLOYEE", "ADMIN"]);
});
