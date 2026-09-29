import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { installTechnicalLabelFormatter } from "./uiLabels.js";
const root = document.getElementById("root");
const observer = installTechnicalLabelFormatter(root);
observer.observe(root, { childList: true, subtree: true });
createRoot(root).render(<App/>);
