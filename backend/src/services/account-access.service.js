import { inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { roles } from "../db/schema.js";
import { ApiError } from "../utils/api-error.js";

export const ACCOUNT_TYPES = { EMPLOYEE: "EMPLOYEE", ADMINISTRATOR: "ADMINISTRATOR" };

// These are implementation roles, never account types exposed by the UI.
export const ADMINISTRATIVE_PRIVILEGES = [
  { code: "PAYSLIPS", roleName: "PAYROLL_MANAGER", permissions: ["PAYSLIP_MANAGE"] },
  { code: "ANNOUNCEMENTS", roleName: "COMMUNICATION_MANAGER", permissions: ["ANNOUNCEMENT_PUBLISH", "ANNOUNCEMENT_MANAGE"] },
  { code: "EMPLOYEES", roleName: "EMPLOYEE_MANAGER", permissions: ["EMPLOYEE_MANAGE"] },
  { code: "USERS", roleName: "USER_MANAGER", permissions: ["USER_MANAGE"] },
  { code: "AUDIT", roleName: "AUDIT_READER", permissions: ["AUDIT_VIEW"] },
];

const privilegeByCode = new Map(ADMINISTRATIVE_PRIVILEGES.map(item => [item.code, item]));
const administrativeRoleNames = new Set(["ADMIN", "ADMINISTRATOR", ...ADMINISTRATIVE_PRIVILEGES.map(item => item.roleName)]);

export const accountTypeFromRoles = (roleNames = []) => roleNames.some(name => administrativeRoleNames.has(name))
  ? ACCOUNT_TYPES.ADMINISTRATOR
  : ACCOUNT_TYPES.EMPLOYEE;

export const privilegesFromRoles = (roleNames = []) => {
  if (roleNames.includes("ADMIN")) return ADMINISTRATIVE_PRIVILEGES.map(item => item.code);
  return ADMINISTRATIVE_PRIVILEGES.filter(item => roleNames.includes(item.roleName)).map(item => item.code);
};

export function validateAccountAccess({ accountType, administrativePrivileges = [] }) {
  if (!Object.values(ACCOUNT_TYPES).includes(accountType)) throw new ApiError(400, "El tipo de cuenta no es válido");
  if (!Array.isArray(administrativePrivileges)) throw new ApiError(400, "Los privilegios administrativos no son válidos");
  const uniquePrivileges = [...new Set(administrativePrivileges)];
  if (uniquePrivileges.some(code => !privilegeByCode.has(code))) throw new ApiError(400, "Se recibió un privilegio administrativo no permitido");
  if (accountType === ACCOUNT_TYPES.EMPLOYEE && uniquePrivileges.length) {
    throw new ApiError(400, "Una cuenta de empleado no puede tener privilegios administrativos");
  }
  return uniquePrivileges;
}

export function roleNamesForAccountAccess({ accountType, administrativePrivileges }) {
  const selected = validateAccountAccess({ accountType, administrativePrivileges });
  return accountType === ACCOUNT_TYPES.EMPLOYEE
    ? ["EMPLOYEE"]
    : selected.length === ADMINISTRATIVE_PRIVILEGES.length
      ? ["EMPLOYEE", "ADMIN"]
      : ["EMPLOYEE", "ADMINISTRATOR", ...selected.map(code => privilegeByCode.get(code).roleName)];
}

export async function roleIdsForAccountAccess({ accountType, administrativePrivileges }) {
  const roleNames = roleNamesForAccountAccess({ accountType, administrativePrivileges });
  const rows = await db.select({ id: roles.id, name: roles.name }).from(roles).where(inArray(roles.name, roleNames));
  if (rows.length !== roleNames.length) throw new ApiError(409, "Faltan roles del sistema. Ejecute la inicialización de permisos.");
  return rows.map(row => row.id);
}

export const accountAccessDto = (roleNames = []) => ({
  accountType: accountTypeFromRoles(roleNames),
  administrativePrivileges: privilegesFromRoles(roleNames),
});
