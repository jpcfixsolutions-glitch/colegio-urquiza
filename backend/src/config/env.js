import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const configDirectory = dirname(fileURLToPath(import.meta.url));
const defaultEnvFile = resolve(configDirectory, "../../.env");
const envFile = process.env.DOTENV_CONFIG_PATH || defaultEnvFile;

// En desarrollo y test, el .env propio de backend es la fuente local de verdad,
// aun si el proceso padre tenía una variable homónima. En producción, las
// variables inyectadas por el proveedor conservan prioridad.
dotenv.config({
  path: envFile,
  override: process.env.NODE_ENV !== "production",
  quiet: true,
});

export { envFile };
