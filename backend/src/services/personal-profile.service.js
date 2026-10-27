export const MARITAL_STATUSES = ["SINGLE", "MARRIED", "PARTNERED", "DIVORCED", "WIDOWED", "OTHER"];

const REQUIRED_PROFILE_FIELDS = ["personalEmail", "address", "phone", "maritalStatus", "dni", "cuit"];

function addCalendarMonths(date, months) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

export function getPersonalProfileStatus(employee, now = new Date()) {
  if (!employee) {
    return { profileComplete: true, profileNeedsReview: false, profileReviewDueAt: null };
  }

  const hasRequiredData = REQUIRED_PROFILE_FIELDS.every(field => String(employee[field] || "").trim());
  const profileComplete = hasRequiredData && !!employee.profileUpdatedAt;

  if (!profileComplete) {
    return { profileComplete: false, profileNeedsReview: true, profileReviewDueAt: null };
  }

  const profileReviewDueAt = addCalendarMonths(employee.profileUpdatedAt, 3);

  return {
    profileComplete: true,
    profileNeedsReview: now >= profileReviewDueAt,
    profileReviewDueAt,
  };
}

export function personalProfileDto(employee) {
  const status = getPersonalProfileStatus(employee);
  return {
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    personalEmail: employee.personalEmail || "",
    address: employee.address || "",
    phone: employee.phone || "",
    maritalStatus: employee.maritalStatus || "",
    dni: employee.dni || "",
    cuit: employee.cuit || "",
    profileUpdatedAt: employee.profileUpdatedAt,
    ...status,
  };
}
