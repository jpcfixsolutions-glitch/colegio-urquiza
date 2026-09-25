import { buildPayslipPath } from "../services/storage.service.js";

function testPayslipPaths() {
    const path1 = buildPayslipPath({
        employeeId: "empleado-a",
        year: 2026,
        month: 9,
    });

    const path2 = buildPayslipPath({
        employeeId: "empleado-b",
        year: 2026,
        month: 9,
    });

    const path3 = buildPayslipPath({
        employeeId: "empleado-a",
        year: 2026,
        month: 10,
    });

    console.log("Path 1:", path1);
    console.log("Path 2:", path2);
    console.log("Path 3:", path3);

    console.log(
        "¿Todos distintos?",
        path1 !== path2 &&
        path1 !== path3 &&
        path2 !== path3
    );
}

testPayslipPaths();