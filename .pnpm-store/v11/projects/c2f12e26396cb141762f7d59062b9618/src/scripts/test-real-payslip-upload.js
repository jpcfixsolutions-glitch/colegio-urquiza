import "dotenv/config";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

import {
    buildPayslipPath,
    createPayslipUploadUrl,
} from "../services/storage.service.js";

const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
);

async function testRealPayslipUpload() {
    try {
        const storagePath = buildPayslipPath({
            employeeId: "empleado-prueba-001",
            year: 2026,
            month: 9,
        });

        console.log("Path generado:");
        console.log(storagePath);

        const { path, token } =
            await createPayslipUploadUrl(storagePath);

        const fileBuffer = await fs.readFile(
            "test-files/recibo-prueba.pdf"
        );

        const file = new Blob(
            [fileBuffer],
            {
                type: "application/pdf",
            }
        );

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

        console.log("✅ Recibo subido correctamente");
        console.log("Path final:");
        console.log(data.path);
    } catch (error) {
        console.error("❌ Error inesperado:");
        console.error(error);
    }
}

testRealPayslipUpload();