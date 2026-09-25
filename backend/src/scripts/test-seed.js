import { db } from "../config/db.js";
import {
    roles,
    permissions,
    rolePermissions,
} from "../db/schema.js";

async function testSeed() {
    try {
        const allRoles = await db
            .select()
            .from(roles);

        const allPermissions = await db
            .select()
            .from(permissions);

        const allRolePermissions = await db
            .select()
            .from(rolePermissions);

        console.log("Roles:", allRoles.length);
        console.log("Permisos:", allPermissions.length);
        console.log(
            "Relaciones rol-permiso:",
            allRolePermissions.length
        );

        console.log("\nRoles encontrados:");
        for (const role of allRoles) {
            console.log("-", role.name);
        }

        console.log("\nPermisos encontrados:");
        for (const permission of allPermissions) {
            console.log("-", permission.code);
        }
    } catch (error) {
        console.error("❌ Error verificando seed:");
        console.error(error);
    }
}

testSeed();