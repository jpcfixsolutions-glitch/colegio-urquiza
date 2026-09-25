import { createPayslipViewUrl } from "../services/storage.service.js";

async function testStorageService() {
    try {
        const storagePath = "test/recibo-prueba.pdf";

        const url = await createPayslipViewUrl(storagePath);

        console.log("✅ StorageService funcionando");
        console.log("URL temporal:");
        console.log(url);
    } catch (error) {
        console.error("❌ Error:");
        console.error(error);
    }
}

testStorageService();