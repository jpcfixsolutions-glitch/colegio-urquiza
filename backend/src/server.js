import "./config/env.js";

// El import dinámico garantiza que el entorno se inicialice antes de evaluar
// módulos que consumen process.env durante su carga.
const { createApp } = await import("./app.js");
const port = Number(process.env.PORT || 3000);
createApp().listen(port, () => console.log(`API escuchando en ${port}`));
