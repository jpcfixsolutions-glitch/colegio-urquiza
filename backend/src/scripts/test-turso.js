import { tursoClient } from "../config/db.js";

async function testTurso() {
    try {
        const result = await tursoClient.execute(
            "SELECT 1 AS connection_test"
        );

        console.log("✅ Conexión con Turso correcta");
        console.log(result.rows);
    } catch (error) {
        console.error("❌ Error al conectar con Turso:");
        console.error(error);
    }
}

testTurso();