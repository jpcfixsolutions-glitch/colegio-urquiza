import "./env.js";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl) {
    throw new Error("Falta la variable TURSO_DATABASE_URL");
}

if (!authToken) {
    throw new Error("Falta la variable TURSO_AUTH_TOKEN");
}

export const tursoClient = createClient({
    url: databaseUrl,
    authToken,
});

export const db = drizzle({
    client: tursoClient,
});
