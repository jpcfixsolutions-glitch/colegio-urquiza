export const UI_LABELS = {
  ACTIVE: "Activo",
  ARCHIVED: "Archivado",
  PENDING: "Pendiente",
  UNMATCHED: "Sin asociar",
  PUBLISHED: "Publicado",
  DRAFT: "Borrador",
  REPLACED: "Reemplazado",
  FAILED: "Error",
  ERROR: "Error",
  READY: "Listo para cargar",
  SALARY: "Recibo de sueldo",
  SAC: "SAC / Aguinaldo",
  VACATION: "Vacaciones",
  FINAL_SETTLEMENT: "Liquidación final",
  ADJUSTMENT: "Ajuste",
  OTHER: "Otro",
  NORMAL: "Normal",
  IMPORTANT: "Importante",
  URGENT: "Urgente",
  ALL: "Todo el personal",
  AREAS: "Áreas seleccionadas",
  EMPLOYEE: "Empleado",
  ADMIN: "Administrador",
  PAYROLL_MANAGER: "Responsable de liquidaciones",
  COMMUNICATION_MANAGER: "Responsable de comunicaciones",
};

export const formatTechnicalLabel = value => UI_LABELS[value] || value;

// Los valores de option y los datos de API siguen siendo los enums originales.
// Este normalizador sólo presenta su etiqueta amistosa en los nodos visibles.
export function installTechnicalLabelFormatter(root) {
  const translate = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue.trim();
      if (UI_LABELS[value]) node.nodeValue = node.nodeValue.replace(value, formatTechnicalLabel(value));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
    node.childNodes.forEach(translate);
  };
  translate(root);
  return new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(translate)));
}
