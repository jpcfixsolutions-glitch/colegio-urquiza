import { randomUUID } from "node:crypto";
import { supabase } from "../config/supabase.js";

const PAYSLIPS_BUCKET =
    process.env.SUPABASE_PAYSLIPS_BUCKET || "payslips";

export async function createPayslipViewUrl(storagePath) {
    const { data, error } = await supabase.storage
        .from(PAYSLIPS_BUCKET)
        .createSignedUrl(storagePath, 60);

    if (error) {
        throw new Error(
            `No se pudo generar la URL del recibo: ${error.message}`
        );
    }

    return data.signedUrl;
}

export async function createPayslipDownloadUrl(storagePath) {
    const { data, error } = await supabase.storage
        .from(PAYSLIPS_BUCKET)
        .createSignedUrl(storagePath, 60, {
            download: true,
        });

    if (error) {
        throw new Error(
            `No se pudo generar la URL de descarga: ${error.message}`
        );
    }

    return data.signedUrl;
}

export async function createPayslipUploadUrl(storagePath) {
    const { data, error } = await supabase.storage
        .from(PAYSLIPS_BUCKET)
        .createSignedUploadUrl(storagePath);

    if (error) {
        throw new Error(
            `No se pudo generar la URL de subida: ${error.message}`
        );
    }

    return {
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
    };
}

export function buildPayslipPath({
    employeeId,
    year,
    month,
    payslipId = randomUUID(),
}) {
    if (!employeeId) {
        throw new Error("employeeId es obligatorio");
    }

    if (!year) {
        throw new Error("year es obligatorio");
    }

    if (!month || month < 1 || month > 12) {
        throw new Error("month debe estar entre 1 y 12");
    }

    const formattedMonth = String(month).padStart(2, "0");

    return `employees/${employeeId}/${year}/${formattedMonth}/${payslipId}.pdf`;
}

export async function verifyPayslipObject(storagePath) {
    const slash = storagePath.lastIndexOf("/");
    const folder = storagePath.slice(0, slash);
    const fileName = storagePath.slice(slash + 1);
    const { data, error } = await supabase.storage.from(PAYSLIPS_BUCKET).list(folder, { search: fileName });
    if (error) throw new Error(`No se pudo verificar el recibo: ${error.message}`);
    const object = data.find((item) => item.name === fileName);
    if (!object) return null;
    return { sizeBytes: Number(object.metadata?.size || 0), mimeType: object.metadata?.mimetype || object.metadata?.contentType || null };
}
