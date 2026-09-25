import { supabase } from "../config/supabase.js";

async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.storage.getBucket("payslips");

        if (error) {
            console.error("❌ Error al acceder al bucket:");
            console.error(error);
            return;
        }

        console.log("✅ Conexión con Supabase correcta");
        console.log("✅ Bucket encontrado:", data.name);
        console.log("Bucket público:", data.public);
    } catch (error) {
        console.error("❌ Error inesperado:");
        console.error(error);
    }
}

testSupabaseConnection();