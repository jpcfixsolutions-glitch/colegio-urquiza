import "dotenv/config";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { createPayslipUploadUrl } from "../services/storage.service.js";

const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
);

async function testSignedUpload() {
    try {
        const storagePath =
            "test/subida-firmada-prueba.pdf";

        // 1. El backend genera el permiso temporal
        const { path, token } =
            await createPayslipUploadUrl(storagePath);

        console.log("✅ Permiso temporal generado");

        // 2. Simulamos el PDF seleccionado desde el frontend
        const fileBuffer = await fs.readFile(
            "test-files/recibo-prueba.pdf"
        );

        const file = new Blob(
            [fileBuffer],
            { type: "application/pdf" }
        );

        // 3. El "frontend" sube directamente a Supabase
        const { data, error } = await supabaseClient.storage
            .from("payslips")
            .uploadToSignedUrl(
                path,
                token,
                file,
                {
                    contentType: "application/pdf",
                }
            );

        if (error) {
            console.error("❌ Error al subir:");
            console.error(error);
            return;
        }

        console.log("✅ PDF subido mediante URL firmada");
        console.log("Path:", data.path);

    } catch (error) {
        console.error("❌ Error inesperado:");
        console.error(error);
    }
}

testSignedUpload();