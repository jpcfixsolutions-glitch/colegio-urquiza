import { supabase } from "../config/supabase.js";

async function testView() {
    try {
        const storagePath = "test/recibo-prueba.pdf";

        const { data, error } = await supabase.storage
            .from("payslips")
            .createSignedUrl(storagePath, 60);

        if (error) {
            console.error("❌ Error al generar la URL:");
            console.error(error);
            return;
        }

        console.log("✅ URL temporal generada");
        console.log("Válida durante 60 segundos:");
        console.log(data.signedUrl);

    } catch (error) {
        console.error("❌ Error inesperado:");
        console.error(error);
    }
}

testView();