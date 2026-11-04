export function formatCuit(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

// El backend acepta el email legacy del administrador bootstrap de forma
// explícita. Se conserva el texto mientras se escribe para no impedirlo; los
// demás emails siguen siendo rechazados por el backend.
export function formatLoginCuit(value) {
  const text = String(value || "");
  return /[a-z@]/i.test(text) ? text.slice(0, 254) : formatCuit(text);
}
