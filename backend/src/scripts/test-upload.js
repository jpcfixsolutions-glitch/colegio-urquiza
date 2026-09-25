import fs from "node:fs/promises";
import { supabase } from "../config/supabase.js";

async function testUpload() {
    try {
        const file = await fs.readFile(
            "test-files/recibo-prueba.pdf"
        );

        const storagePath =
            "test/recibo-prueba.pdf";

        const { data, error } = await supabase.storage
            .from("payslips")
            .upload(storagePath, file, {
                contentType: "application/pdf",
                upsert: false,
            });

        if (error) {
            console.error("❌ Error al subir el archivo:");
            console.error(error);
            return;
        }

        console.log("✅ PDF subido correctamente");
        console.log("Path:", data.path);
    } catch (error) {
        console.error("❌ Error inesperado:");
        console.error(error);
    }
}

testUpload();