import { ApiError } from "../utils/api-error.js";

export function notFound(req, res) {
  res.status(404).json({ error: "Recurso no encontrado" });
}

export function errorHandler(error, req, res, next) {
  const status = error instanceof ApiError ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: error.message || "Error interno", details: error.details });
}
