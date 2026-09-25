import { createPayslipViewUrl } from "../services/storage.service.js";

async function testRealPayslipView() {
    try {
        const storagePath =
            "employees/empleado-prueba-001/2026/09/75531bf5-9b9e-4809-9129-d9598a6cd996.pdf";

        const url = await createPayslipViewUrl(storagePath);

        console.log("✅ URL temporal generada correctamente");
        console.log(url);
    } catch (error) {
        console.error("❌ Error:");
        console.error(error);
    }
}

testRealPayslipView();