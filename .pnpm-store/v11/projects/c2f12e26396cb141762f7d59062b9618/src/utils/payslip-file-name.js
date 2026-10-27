const LIQUIDATION_FILE_PATTERN = /^Liquidaci[oó]n_(0?[1-9]|1[0-2])-(20\d{2})_(\d{2}-?\d{8}-?\d)_(.+)_(\d+)\.pdf$/i;
const LEGACY_FILE_PATTERN = /^(\d+)[_-](20\d{2})[_-](0[1-9]|1[0-2])(?:[_-].*)?\.pdf$/i;

export function normalizeCuit(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

export function parsePayslipFileName(fileName) {
  const baseName = String(fileName || "").split(/[\\/]/).pop();
  const liquidationMatch = LIQUIDATION_FILE_PATTERN.exec(baseName);

  if (liquidationMatch) {
    return {
      format: "LIQUIDATION",
      month: Number(liquidationMatch[1]),
      year: Number(liquidationMatch[2]),
      cuit: normalizeCuit(liquidationMatch[3]),
      employeeName: liquidationMatch[4].replace(/_/g, " ").trim(),
      receiptNumber: liquidationMatch[5],
    };
  }

  const legacyMatch = LEGACY_FILE_PATTERN.exec(baseName);
  if (legacyMatch) {
    return {
      format: "LEGACY",
      employeeNumber: legacyMatch[1],
      year: Number(legacyMatch[2]),
      month: Number(legacyMatch[3]),
    };
  }

  return null;
}
