import { ApiError } from "../utils/api-error.js";

export function notFound(req, res) {
  res.status(404).json({ error: "Recurso no encontrado" });
}

export function errorHandler(error, req, res, next) {
  if (!(error instanceof ApiError)) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo procesar la solicitud. Intentá nuevamente." });
  }
  res.status(error.status).json({ error: error.message, details: error.details });
}
