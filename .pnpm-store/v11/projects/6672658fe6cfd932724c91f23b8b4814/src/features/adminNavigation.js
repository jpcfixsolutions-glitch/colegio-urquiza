const hasPermission = (user, permission) => user?.permissions?.includes(permission);

export function buildAdminNavigation(user) {
  const hasEmployeeProfile = Boolean(user?.employeeId);
  return [
    ["dashboard", "Resumen", "dashboard", true],
    ["my-announcements", "Mis avisos", "announcements", hasEmployeeProfile && hasPermission(user, "ANNOUNCEMENT_VIEW")],
    ["my-receipts", "Mis recibos", "receipts", hasEmployeeProfile && hasPermission(user, "PAYSLIP_VIEW_OWN")],
    ["my-profile", "Mis datos", "profile", hasEmployeeProfile],
    ["activity", "Actividad", "clock", hasPermission(user, "AUDIT_VIEW")],
    ["announcements", "Gestionar avisos", "announcements", hasPermission(user, "ANNOUNCEMENT_MANAGE")],
    ["receipts", "Gestionar recibos", "receipts", hasPermission(user, "PAYSLIP_MANAGE")],
    ["areas", "Áreas", "areas", hasPermission(user, "EMPLOYEE_MANAGE")],
    ["employees", "Personal", "employees", hasPermission(user, "EMPLOYEE_MANAGE")],
    ["users", "Usuarios", "users", hasPermission(user, "USER_MANAGE")],
  ].filter((item) => item[3]);
}
