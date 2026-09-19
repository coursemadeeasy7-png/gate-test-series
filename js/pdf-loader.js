/* =========================================================
   GATE TEST SERIES
   FILE: js/pdf-loader.js

   Reliable PDF.js loader
   Supports:
   - File input PDF
   - Multiple PDFs
   - ArrayBuffer
   - Uint8Array
   - Blob
   - PDF URL
========================================================= */

(function () {
    "use strict";

    const PDFJS_VERSION = "4.10.38";

    const PDFJS_CDN =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" +
        PDFJS_VERSION +
        "/pdf.min.mjs";

    const PDFJS_WORKER =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" +
        PDFJS_VERSION +
        "/pdf.worker.min.mjs";

    class PDFLoader {

        constructor() {
            this.pdfjs = null;
            this.loadingPromise = null;
        }

        /* =====================================================
           LOAD PDF.JS
        ===================================================== */

        async loadPDFJS() {

            if (this.pdfjs) {
                return this.pdfjs;
            }

            if (window.pdfjsLib) {

                this.pdfjs = window.pdfjsLib;

                this.pdfjs.GlobalWorkerOptions.workerSrc =
                    PDFJS_WORKER;

                return this.pdfjs;
            }

            if (this.loadingPromise) {
                return this.loadingPromise;
            }

            this.loadingPromise =
                this.importPDFJS();

            try {

                this.pdfjs =
                    await this.loadingPromise;

                return this.pdfjs;

            } catch (error) {

                this.loadingPromise = null;

                console.error(
                    "PDF.js loading failed:",
                    error
                );

                throw new Error(
                    "PDF.js could not be loaded. " +
                    "Check your internet connection and GitHub Pages."
                );
            }
        }

        /* =====================================================
           IMPORT PDF.JS MODULE
        ===================================================== */

        async importPDFJS() {

            /*
             * PDF.js 4.x is an ES module.
             * Dynamic import works on modern browsers.
             */

            const module =
                await import(PDFJS_CDN);

            /*
             * Depending on PDF.js build, the exported
             * object may be the module itself.
             */

            const pdfjs =
                module.default || module;

            if (!pdfjs.getDocument) {

                throw new Error(
                    "PDF.js loaded but getDocument() was not found."
                );
            }

            if (
                pdfjs.GlobalWorkerOptions
            ) {

                pdfjs.GlobalWorkerOptions.workerSrc =
                    PDFJS_WORKER;
            }

            /*
             * Make available globally as well.
             */

            window.pdfjsLib =
                pdfjs;

            return pdfjs;
        }

        /* =====================================================
           READ FILE
        ===================================================== */

        async readFile(file) {

            if (!file) {

                throw new Error(
                    "No PDF file was provided."
                );
            }

            /*
             * Browser File / Blob
             */

            if (
                file instanceof Blob &&
                typeof file.arrayBuffer === "function"
            ) {

                return await file.arrayBuffer();
            }

            /*
             * ArrayBuffer
             */

            if (
                file instanceof ArrayBuffer
            ) {

                return file;
            }

            /*
             * Uint8Array / typed array
             */

            if (
                file instanceof Uint8Array
            ) {

                return file;
            }

            /*
             * URL string
             */

            if (
                typeof file === "string"
            ) {

                const response =
                    await fetch(file);

                if (!response.ok) {

                    throw new Error(
                        "Could not fetch PDF: HTTP " +
                        response.status
                    );
                }

                return await response.arrayBuffer();
            }

            throw new Error(
                "Unsupported PDF input type."
            );
        }

        /* =====================================================
           LOAD ONE PDF
        ===================================================== */

        async load(file) {

            try {

                console.log(
                    "PDFLoader: starting PDF load..."
                );

                const pdfjs =
                    await this.loadPDFJS();

                console.log(
                    "PDFLoader: PDF.js loaded."
                );

                const data =
                    await this.readFile(file);

                console.log(
                    "PDFLoader: PDF data loaded."
                );

                /*
                 * Copy typed arrays so the original File/
                 * ArrayBuffer is never modified.
                 */

                let source = data;

                if (
                    data instanceof Uint8Array
                ) {

                    source =
                        new Uint8Array(data);
                }

                const loadingTask =
                    pdfjs.getDocument({
                        data: source,
                        useWorkerFetch: true,
                        isEvalSupported: true
                    });

                const pdf =
                    await loadingTask.promise;

                console.log(
                    "PDFLoader: PDF opened successfully.",
                    "Pages:",
                    pdf.numPages
                );

                return pdf;

            } catch (error) {

                console.error(
                    "PDFLoader.load() failed:",
                    error
                );

                throw error;
            }
        }

        /* =====================================================
           LOAD MULTIPLE PDF FILES
        ===================================================== */

        async loadMultiple(files) {

            if (!files) {
                return [];
            }

            const fileArray =
                Array.from(files);

            const results = [];

            for (
                const file of fileArray
            ) {

                try {

                    const pdf =
                        await this.load(file);

                    results.push({
                        file: file,
                        pdf: pdf,
                        success: true,
                        pages: pdf.numPages,
                        name:
                            file.name ||
                            "PDF"
                    });

                } catch (error) {

                    console.error(
                        "Failed to load:",
                        file.name,
                        error
                    );

                    results.push({
                        file: file,
                        pdf: null,
                        success: false,
                        pages: 0,
                        name:
                            file.name ||
                            "PDF",
                        error:
                            error.message ||
                            String(error)
                    });
                }
            }

            return results;
        }

        /* =====================================================
           CHECK PDF
        ===================================================== */

        async validate(file) {

            try {

                const pdf =
                    await this.load(file);

                return {

                    valid: true,

                    pages:
                        pdf.numPages,

                    message:
                        "PDF loaded successfully."
                };

            } catch (error) {

                return {

                    valid: false,

                    pages: 0,

                    message:
                        error.message ||
                        "Unable to load PDF."
                };
            }
        }

        /* =====================================================
           GET PDF PAGE
        ===================================================== */

        async getPage(
            pdf,
            pageNumber
        ) {

            if (!pdf) {

                throw new Error(
                    "PDF document is not loaded."
                );
            }

            const page =
                Number(pageNumber);

            if (
                !Number.isInteger(page) ||
                page < 1 ||
                page > pdf.numPages
            ) {

                throw new Error(
                    "Invalid PDF page number: " +
                    pageNumber
                );
            }

            return await pdf.getPage(page);
        }
    }

    /* =========================================================
       GLOBAL INSTANCE
    ========================================================= */

    window.PDFLoader =
        new PDFLoader();

    /*
     * Also expose the class.
     */

    window.PDFLoaderClass =
        PDFLoader;

    console.log(
        "PDFLoader initialized successfully."
    );

})();
