export function formatCuit(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function formatLoginIdentifier(value) {
  const text = String(value || "");
  // Conserva el acceso transitorio de administradores históricos por email.
  return /[a-z@]/i.test(text) ? text.slice(0, 254) : formatCuit(text);
}
