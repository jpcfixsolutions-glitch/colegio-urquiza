import { createPayslipUploadUrl } from "../services/storage.service.js";

async function testUploadUrl() {
    try {
        const storagePath =
            "test/subida-firmada-prueba.pdf";

        const result =
            await createPayslipUploadUrl(storagePath);

        console.log("✅ Permiso de subida generado");
        console.log("Path:", result.path);
        console.log("Token generado:", Boolean(result.token));
        console.log("Signed URL generada:", Boolean(result.signedUrl));
    } catch (error) {
        console.error("❌ Error:");
        console.error(error);
    }
}

testUploadUrl();