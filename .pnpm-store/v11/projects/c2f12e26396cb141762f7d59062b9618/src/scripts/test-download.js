import { createPayslipDownloadUrl } from "../services/storage.service.js";

async function testDownload() {
    try {
        const storagePath = "test/recibo-prueba.pdf";

        const url = await createPayslipDownloadUrl(storagePath);

        console.log("✅ URL de descarga generada");
        console.log(url);
    } catch (error) {
        console.error("❌ Error:");
        console.error(error);
    }
}

testDownload();