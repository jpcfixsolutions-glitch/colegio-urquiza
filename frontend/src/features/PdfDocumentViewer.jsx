import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

import { getPdfPageSize } from "./payslipViewer.js";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

function PdfPage({ document, pageNumber, availableWidth, zoom }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!document || !availableWidth) return undefined;
    let active = true;
    let renderTask;
    setStatus("loading");

    const render = async () => {
      const page = await document.getPage(pageNumber);
      const original = page.getViewport({ scale: 1 });
      const size = getPdfPageSize(original.width, original.height, availableWidth, zoom);
      const viewport = page.getViewport({ scale: size.scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { alpha: false });
      if (!active || !canvas || !context) return;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
      });
      await renderTask.promise;
      if (active) setStatus("ready");
    };

    render().catch((error) => {
      if (active && error?.name !== "RenderingCancelledException") setStatus("error");
    });
    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, pageNumber, availableWidth, zoom]);

  return <article className="pdf-page" aria-label={`Página ${pageNumber}`}>
    {status === "loading" && <span className="pdf-page-loading"><span className="spinner" /> Preparando página {pageNumber}…</span>}
    {status === "error" && <span className="pdf-page-error">No se pudo mostrar esta página.</span>}
    <canvas ref={canvasRef} className={status === "ready" ? "ready" : ""} />
  </article>;
}

export function PdfDocumentViewer({ pdf, title }) {
  const viewportRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pdf) return undefined;
    let active = true;
    let loadingTask;
    setDocument(null);
    setError("");

    pdf.arrayBuffer()
      .then((buffer) => {
        if (!active) return null;
        loadingTask = getDocument({ data: new Uint8Array(buffer) });
        return loadingTask.promise;
      })
      .then((loadedDocument) => {
        if (active && loadedDocument) setDocument(loadedDocument);
      })
      .catch(() => {
        if (active) setError("No se pudo mostrar el recibo. Podés descargarlo para abrirlo fuera del sistema.");
      });

    return () => {
      active = false;
      loadingTask?.destroy();
    };
  }, [pdf]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const updateWidth = () => setAvailableWidth(Math.floor(viewport.clientWidth));
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const changeZoom = (direction) => setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + direction * ZOOM_STEP)));
  const pages = document ? Array.from({ length: document.numPages }, (_, index) => index + 1) : [];

  return <div className="pdf-document-viewer" aria-label={`Visor de ${title}`}>
    <div className="pdf-viewer-toolbar">
      <span>{document ? `${document.numPages} ${document.numPages === 1 ? "página" : "páginas"}` : "Cargando documento…"}</span>
      <div className="pdf-zoom-controls" aria-label="Controles de zoom">
        <button type="button" onClick={() => changeZoom(-1)} disabled={zoom <= MIN_ZOOM} aria-label="Alejar">−</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button type="button" onClick={() => changeZoom(1)} disabled={zoom >= MAX_ZOOM} aria-label="Acercar">+</button>
      </div>
    </div>
    <div className="pdf-document-scroll" ref={viewportRef}>
      {!document && !error && <div className="viewer-loading"><span className="spinner" /> Preparando el visor…</div>}
      {error && <div className="pdf-document-error">{error}</div>}
      {document && <div className="pdf-document-pages">{pages.map((pageNumber) => <PdfPage key={pageNumber} document={document} pageNumber={pageNumber} availableWidth={availableWidth} zoom={zoom} />)}</div>}
    </div>
  </div>;
}
