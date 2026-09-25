import { tursoClient } from "../config/db.js";

async function testTables() {
    try {
        const result = await tursoClient.execute(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      ORDER BY name;
    `);

        console.log("✅ Tablas encontradas en Turso:");

        for (const row of result.rows) {
            console.log("-", row.name);
        }
    } catch (error) {
        console.error("❌ Error consultando las tablas:");
        console.error(error);
    }
}

testTables();