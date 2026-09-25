import { sql } from "drizzle-orm";

import {
    sqliteTable,
    text,
    integer,
    primaryKey,
    index,
    uniqueIndex,
    check,
} from "drizzle-orm/sqlite-core";


// ======================================================
// HELPERS
// ======================================================

const createdAt = () =>
    integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`);

const updatedAt = () =>
    integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`);


// ======================================================
// USERS
// ======================================================

export const users = sqliteTable(
    "users",
    {
        id: text("id").primaryKey(),

        email: text("email").notNull(),

        username: text("username"),

        passwordHash: text("password_hash").notNull(),

        active: integer("active", {
            mode: "boolean",
        })
            .notNull()
            .default(true),

        mustChangePassword: integer("must_change_password", {
            mode: "boolean",
        })
            .notNull()
            .default(true),

        lastLoginAt: integer("last_login_at", {
            mode: "timestamp",
        }),

        passwordChangedAt: integer("password_changed_at", {
            mode: "timestamp",
        }),

        createdAt: createdAt(),

        updatedAt: updatedAt(),
    },
    (table) => [
        uniqueIndex("users_email_unique")
            .on(sql`lower(${table.email})`),

        uniqueIndex("users_username_unique")
            .on(sql`lower(${table.username})`),

        index("users_active_idx")
            .on(table.active),
    ]
);


// ======================================================
// AUTH SESSIONS
// ======================================================

export const authSessions = sqliteTable(
    "auth_sessions",
    {
        id: text("id").primaryKey(),

        userId: text("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        refreshTokenHash: text("refresh_token_hash")
            .notNull(),

        expiresAt: integer("expires_at", {
            mode: "timestamp",
        }).notNull(),

        revokedAt: integer("revoked_at", {
            mode: "timestamp",
        }),

        ipAddress: text("ip_address"),

        userAgent: text("user_agent"),

        createdAt: createdAt(),
    },
    (table) => [
        uniqueIndex("auth_sessions_refresh_token_unique")
            .on(table.refreshTokenHash),

        index("auth_sessions_user_idx")
            .on(table.userId),

        index("auth_sessions_expires_idx")
            .on(table.expiresAt),
    ]
);


// ======================================================
// ROLES
// ======================================================

export const roles = sqliteTable(
    "roles",
    {
        id: text("id").primaryKey(),

        name: text("name").notNull(),

        description: text("description"),

        isSystem: integer("is_system", {
            mode: "boolean",
        })
            .notNull()
            .default(false),

        createdAt: createdAt(),
    },
    (table) => [
        uniqueIndex("roles_name_unique")
            .on(table.name),
    ]
);


// ======================================================
// PERMISSIONS
// ======================================================

export const permissions = sqliteTable(
    "permissions",
    {
        id: text("id").primaryKey(),

        code: text("code").notNull(),

        description: text("description"),

        createdAt: createdAt(),
    },
    (table) => [
        uniqueIndex("permissions_code_unique")
            .on(table.code),
    ]
);


// ======================================================
// USER ROLES
// ======================================================

export const userRoles = sqliteTable(
    "user_roles",
    {
        userId: text("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        roleId: text("role_id")
            .notNull()
            .references(() => roles.id, {
                onDelete: "cascade",
            }),

        assignedAt: integer("assigned_at", {
            mode: "timestamp",
        })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => [
        primaryKey({
            columns: [
                table.userId,
                table.roleId,
            ],
        }),

        index("user_roles_user_idx")
            .on(table.userId),

        index("user_roles_role_idx")
            .on(table.roleId),
    ]
);


// ======================================================
// ROLE PERMISSIONS
// ======================================================

export const rolePermissions = sqliteTable(
    "role_permissions",
    {
        roleId: text("role_id")
            .notNull()
            .references(() => roles.id, {
                onDelete: "cascade",
            }),

        permissionId: text("permission_id")
            .notNull()
            .references(() => permissions.id, {
                onDelete: "cascade",
            }),
    },
    (table) => [
        primaryKey({
            columns: [
                table.roleId,
                table.permissionId,
            ],
        }),

        index("role_permissions_role_idx")
            .on(table.roleId),

        index("role_permissions_permission_idx")
            .on(table.permissionId),
    ]
);


// ======================================================
// EMPLOYEES
// ======================================================

export const employees = sqliteTable(
    "employees",
    {
        id: text("id").primaryKey(),

        userId: text("user_id")
            .references(() => users.id, {
                onDelete: "set null",
            }),

        employeeNumber: text("employee_number")
            .notNull(),

        firstName: text("first_name")
            .notNull(),

        lastName: text("last_name")
            .notNull(),

        active: integer("active", {
            mode: "boolean",
        })
            .notNull()
            .default(true),

        createdAt: createdAt(),

        updatedAt: updatedAt(),
    },
    (table) => [
        uniqueIndex("employees_user_unique")
            .on(table.userId),

        uniqueIndex("employees_number_unique")
            .on(table.employeeNumber),

        index("employees_active_idx")
            .on(table.active),

        index("employees_name_idx")
            .on(table.lastName, table.firstName),
    ]
);


// ======================================================
// AREAS
// ======================================================

export const areas = sqliteTable(
    "areas",
    {
        id: text("id").primaryKey(),

        code: text("code")
            .notNull(),

        name: text("name")
            .notNull(),

        description: text("description"),

        active: integer("active", {
            mode: "boolean",
        })
            .notNull()
            .default(true),

        createdAt: createdAt(),

        updatedAt: updatedAt(),
    },
    (table) => [
        uniqueIndex("areas_code_unique")
            .on(table.code),

        uniqueIndex("areas_name_unique")
            .on(table.name),

        index("areas_active_idx")
            .on(table.active),
    ]
);


// ======================================================
// EMPLOYEE AREAS
// ======================================================

export const employeeAreas = sqliteTable(
    "employee_areas",
    {
        employeeId: text("employee_id")
            .notNull()
            .references(() => employees.id, {
                onDelete: "cascade",
            }),

        areaId: text("area_id")
            .notNull()
            .references(() => areas.id, {
                onDelete: "cascade",
            }),

        assignedAt: integer("assigned_at", {
            mode: "timestamp",
        })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => [
        primaryKey({
            columns: [
                table.employeeId,
                table.areaId,
            ],
        }),

        index("employee_areas_employee_idx")
            .on(table.employeeId),

        index("employee_areas_area_idx")
            .on(table.areaId),
    ]
);


// ======================================================
// PAYSLIPS
// Documento lógico.
// NO contiene directamente el PDF.
// ======================================================

export const payslips = sqliteTable(
    "payslips",
    {
        id: text("id").primaryKey(),

        employeeId: text("employee_id")
            .notNull()
            .references(() => employees.id, {
                onDelete: "restrict",
            }),

        year: integer("year")
            .notNull(),

        month: integer("month")
            .notNull(),

        documentType: text("document_type", {
            enum: [
                "SALARY",
                "SAC",
                "VACATION",
                "FINAL_SETTLEMENT",
                "ADJUSTMENT",
                "OTHER",
            ],
        })
            .notNull()
            .default("SALARY"),

        title: text("title"),

        status: text("status", {
            enum: [
                "PENDING",
                "ACTIVE",
                "ARCHIVED",
            ],
        })
            .notNull()
            .default("PENDING"),

        createdBy: text("created_by")
            .references(() => users.id, {
                onDelete: "set null",
            }),

        createdAt: createdAt(),

        updatedAt: updatedAt(),
    },
    (table) => [
        check(
            "payslips_month_check",
            sql`${table.month} >= 1 AND ${table.month} <= 12`
        ),

        check(
            "payslips_year_check",
            sql`${table.year} >= 2000 AND ${table.year} <= 2100`
        ),

        check(
            "payslips_document_type_check",
            sql`${table.documentType} IN (
        'SALARY',
        'SAC',
        'VACATION',
        'FINAL_SETTLEMENT',
        'ADJUSTMENT',
        'OTHER'
      )`
        ),

        check(
            "payslips_status_check",
            sql`${table.status} IN (
        'PENDING',
        'ACTIVE',
        'ARCHIVED'
      )`
        ),

        index("payslips_employee_period_idx")
            .on(
                table.employeeId,
                table.year,
                table.month
            ),

        index("payslips_status_idx")
            .on(table.status),

        index("payslips_created_by_idx")
            .on(table.createdBy),
    ]
);


// ======================================================
// PAYSLIP VERSIONS
// Representa los archivos físicos de Supabase.
// ======================================================

export const payslipVersions = sqliteTable(
    "payslip_versions",
    {
        id: text("id").primaryKey(),

        payslipId: text("payslip_id")
            .notNull()
            .references(() => payslips.id, {
                onDelete: "restrict",
            }),

        versionNumber: integer("version_number")
            .notNull(),

        storageBucket: text("storage_bucket")
            .notNull()
            .default("payslips"),

        storagePath: text("storage_path")
            .notNull(),

        originalFileName: text("original_file_name")
            .notNull(),

        mimeType: text("mime_type")
            .notNull(),

        sizeBytes: integer("size_bytes")
            .notNull(),

        sha256: text("sha256"),

        status: text("status", {
            enum: [
                "PENDING",
                "ACTIVE",
                "REPLACED",
                "FAILED",
            ],
        })
            .notNull()
            .default("PENDING"),

        uploadedBy: text("uploaded_by")
            .references(() => users.id, {
                onDelete: "set null",
            }),

        uploadedAt: integer("uploaded_at", {
            mode: "timestamp",
        })
            .notNull()
            .default(sql`(unixepoch())`),

        replacedAt: integer("replaced_at", {
            mode: "timestamp",
        }),
    },
    (table) => [
        uniqueIndex("payslip_versions_path_unique")
            .on(table.storagePath),

        uniqueIndex("payslip_versions_number_unique")
            .on(
                table.payslipId,
                table.versionNumber
            ),

        uniqueIndex("payslip_versions_one_active_unique")
            .on(table.payslipId)
            .where(sql`${table.status} = 'ACTIVE'`),

        check(
            "payslip_versions_number_check",
            sql`${table.versionNumber} >= 1`
        ),

        check(
            "payslip_versions_size_check",
            sql`${table.sizeBytes} >= 0`
        ),

        check(
            "payslip_versions_status_check",
            sql`${table.status} IN (
        'PENDING',
        'ACTIVE',
        'REPLACED',
        'FAILED'
      )`
        ),

        index("payslip_versions_payslip_idx")
            .on(table.payslipId),

        index("payslip_versions_status_idx")
            .on(table.status),

        index("payslip_versions_uploaded_by_idx")
            .on(table.uploadedBy),
    ]
);


// ======================================================
// ANNOUNCEMENTS
// ======================================================

export const announcements = sqliteTable(
    "announcements",
    {
        id: text("id").primaryKey(),

        title: text("title")
            .notNull(),

        body: text("body")
            .notNull(),

        priority: text("priority", {
            enum: [
                "NORMAL",
                "IMPORTANT",
                "URGENT",
            ],
        })
            .notNull()
            .default("NORMAL"),

        status: text("status", {
            enum: [
                "DRAFT",
                "PUBLISHED",
                "ARCHIVED",
            ],
        })
            .notNull()
            .default("DRAFT"),

        audienceType: text("audience_type", {
            enum: [
                "ALL",
                "AREAS",
            ],
        })
            .notNull()
            .default("ALL"),

        publishedBy: text("published_by")
            .references(() => users.id, {
                onDelete: "set null",
            }),

        publishedAt: integer("published_at", {
            mode: "timestamp",
        }),

        expiresAt: integer("expires_at", {
            mode: "timestamp",
        }),

        createdAt: createdAt(),

        updatedAt: updatedAt(),
    },
    (table) => [
        check(
            "announcements_priority_check",
            sql`${table.priority} IN (
        'NORMAL',
        'IMPORTANT',
        'URGENT'
      )`
        ),

        check(
            "announcements_status_check",
            sql`${table.status} IN (
        'DRAFT',
        'PUBLISHED',
        'ARCHIVED'
      )`
        ),

        check(
            "announcements_audience_check",
            sql`${table.audienceType} IN (
        'ALL',
        'AREAS'
      )`
        ),

        index("announcements_status_published_idx")
            .on(
                table.status,
                table.publishedAt
            ),

        index("announcements_expires_idx")
            .on(table.expiresAt),

        index("announcements_publisher_idx")
            .on(table.publishedBy),
    ]
);


// ======================================================
// ANNOUNCEMENT AREAS
// ======================================================

export const announcementAreas = sqliteTable(
    "announcement_areas",
    {
        announcementId: text("announcement_id")
            .notNull()
            .references(() => announcements.id, {
                onDelete: "cascade",
            }),

        areaId: text("area_id")
            .notNull()
            .references(() => areas.id, {
                onDelete: "cascade",
            }),
    },
    (table) => [
        primaryKey({
            columns: [
                table.announcementId,
                table.areaId,
            ],
        }),

        index("announcement_areas_announcement_idx")
            .on(table.announcementId),

        index("announcement_areas_area_idx")
            .on(table.areaId),
    ]
);


// ======================================================
// ANNOUNCEMENT READS
// ======================================================

export const announcementReads = sqliteTable(
    "announcement_reads",
    {
        announcementId: text("announcement_id")
            .notNull()
            .references(() => announcements.id, {
                onDelete: "cascade",
            }),

        userId: text("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        readAt: integer("read_at", {
            mode: "timestamp",
        })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => [
        primaryKey({
            columns: [
                table.announcementId,
                table.userId,
            ],
        }),

        index("announcement_reads_announcement_idx")
            .on(table.announcementId),

        index("announcement_reads_user_idx")
            .on(table.userId),
    ]
);


// ======================================================
// AUDIT LOGS
// ======================================================

export const auditLogs = sqliteTable(
    "audit_logs",
    {
        id: text("id").primaryKey(),

        actorUserId: text("actor_user_id")
            .references(() => users.id, {
                onDelete: "set null",
            }),

        action: text("action")
            .notNull(),

        entityType: text("entity_type"),

        entityId: text("entity_id"),

        metadata: text("metadata", {
            mode: "json",
        }),

        ipAddress: text("ip_address"),

        userAgent: text("user_agent"),

        createdAt: createdAt(),
    },
    (table) => [
        index("audit_logs_actor_idx")
            .on(table.actorUserId),

        index("audit_logs_entity_idx")
            .on(
                table.entityType,
                table.entityId
            ),

        index("audit_logs_created_idx")
            .on(table.createdAt),

        index("audit_logs_action_idx")
            .on(table.action),
    ]
);