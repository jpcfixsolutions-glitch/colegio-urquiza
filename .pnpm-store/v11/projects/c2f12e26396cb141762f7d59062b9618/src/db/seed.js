import "dotenv/config";
import { randomUUID } from "node:crypto";

import { db } from "../config/db.js";

import {
    roles,
    permissions,
    rolePermissions,
} from "./schema.js";

const PERMISSIONS = [
    {
        code: "PAYSLIP_VIEW_OWN",
        description: "Permite consultar y descargar los recibos propios",
    },
    {
        code: "PAYSLIP_MANAGE",
        description: "Permite cargar, reemplazar y administrar recibos de empleados",
    },
    {
        code: "ANNOUNCEMENT_VIEW",
        description: "Permite consultar los avisos correspondientes al usuario",
    },
    {
        code: "ANNOUNCEMENT_PUBLISH",
        description: "Permite publicar avisos",
    },
    {
        code: "ANNOUNCEMENT_MANAGE",
        description: "Permite crear, editar y archivar avisos",
    },
    {
        code: "EMPLOYEE_MANAGE",
        description: "Permite administrar empleados y sus áreas",
    },
    {
        code: "USER_MANAGE",
        description: "Permite administrar cuentas de usuario, roles y accesos",
    },
    {
        code: "AUDIT_VIEW",
        description: "Permite consultar los registros de auditoría",
    },
];

const ROLES = [
    {
        name: "EMPLOYEE",
        description: "Rol base para empleados del colegio",
    },
    {
        name: "ADMIN",
        description: "Administrador general de la aplicación",
    },
    {
        name: "PAYROLL_MANAGER",
        description: "Responsable de gestionar recibos de sueldo",
    },
    {
        name: "COMMUNICATION_MANAGER",
        description: "Responsable de publicar y administrar avisos",
    },
];

const ROLE_PERMISSIONS = {
    EMPLOYEE: [
        "PAYSLIP_VIEW_OWN",
        "ANNOUNCEMENT_VIEW",
    ],

    PAYROLL_MANAGER: [
        "PAYSLIP_VIEW_OWN",
        "PAYSLIP_MANAGE",
        "ANNOUNCEMENT_VIEW",
    ],

    COMMUNICATION_MANAGER: [
        "PAYSLIP_VIEW_OWN",
        "ANNOUNCEMENT_VIEW",
        "ANNOUNCEMENT_PUBLISH",
        "ANNOUNCEMENT_MANAGE",
    ],

    ADMIN: [
        "PAYSLIP_VIEW_OWN",
        "PAYSLIP_MANAGE",
        "ANNOUNCEMENT_VIEW",
        "ANNOUNCEMENT_PUBLISH",
        "ANNOUNCEMENT_MANAGE",
        "EMPLOYEE_MANAGE",
        "USER_MANAGE",
        "AUDIT_VIEW",
    ],
};

async function seedPermissions() {
    for (const permission of PERMISSIONS) {
        await db
            .insert(permissions)
            .values({
                id: randomUUID(),
                code: permission.code,
                description: permission.description,
            })
            .onConflictDoNothing();
    }
}

async function seedRoles() {
    for (const role of ROLES) {
        await db
            .insert(roles)
            .values({
                id: randomUUID(),
                name: role.name,
                description: role.description,
                isSystem: true,
            })
            .onConflictDoNothing();
    }
}

async function seedRolePermissions() {
    const existingRoles = await db
        .select()
        .from(roles);

    const existingPermissions = await db
        .select()
        .from(permissions);

    const rolesByName = new Map(
        existingRoles.map((role) => [
            role.name,
            role,
        ])
    );

    const permissionsByCode = new Map(
        existingPermissions.map((permission) => [
            permission.code,
            permission,
        ])
    );

    for (const [roleName, permissionCodes] of Object.entries(
        ROLE_PERMISSIONS
    )) {
        const role = rolesByName.get(roleName);

        if (!role) {
            throw new Error(
                `No se encontró el rol ${roleName}`
            );
        }

        for (const permissionCode of permissionCodes) {
            const permission =
                permissionsByCode.get(permissionCode);

            if (!permission) {
                throw new Error(
                    `No se encontró el permiso ${permissionCode}`
                );
            }

            await db
                .insert(rolePermissions)
                .values({
                    roleId: role.id,
                    permissionId: permission.id,
                })
                .onConflictDoNothing();
        }
    }
}

async function seed() {
    try {
        console.log("🌱 Iniciando seed...");

        await seedPermissions();

        console.log("✅ Permisos creados");

        await seedRoles();

        console.log("✅ Roles creados");

        await seedRolePermissions();

        console.log("✅ Permisos asociados a roles");

        console.log("🌱 Seed finalizado correctamente");
    } catch (error) {
        console.error("❌ Error ejecutando seed:");
        console.error(error);

        process.exitCode = 1;
    }
}

seed();