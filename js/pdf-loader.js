/* =========================================================
   GATE TEST SERIES
   PDF Loader
   File: js/pdf-loader.js
   ========================================================= */

(function () {
    "use strict";

    const PDFLoader = {

        /* ---------------------------------------------------
           Configuration
           --------------------------------------------------- */

        config: {
            workerSource:
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs",

            librarySource:
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs",

            maxFileSize:
                100 * 1024 * 1024,

            supportedType:
                "application/pdf"
        },

        pdfjs: null,

        /* ---------------------------------------------------
           Initialize PDF.js
           --------------------------------------------------- */

        async init() {

            if (this.pdfjs) {
                return this.pdfjs;
            }

            /*
             * If pdfjsLib has already been loaded by another
             * script, use it directly.
             */

            if (
                typeof window !== "undefined" &&
                window.pdfjsLib
            ) {

                this.pdfjs =
                    window.pdfjsLib;

                this.configureWorker();

                return this.pdfjs;
            }

            /*
             * Dynamically load PDF.js.
             */

            try {

                const module =
                    await import(
                        this.config.librarySource
                    );

                this.pdfjs =
                    module;

                /*
                 * Some builds expose the library through
                 * default, while others expose it directly.
                 */

                if (
                    this.pdfjs &&
                    this.pdfjs.default
                ) {
                    this.pdfjs =
                        this.pdfjs.default;
                }

                this.configureWorker();

                return this.pdfjs;

            } catch (error) {

                console.error(
                    "PDF.js could not be loaded:",
                    error
                );

                throw new Error(
                    "PDF engine could not be loaded."
                );
            }
        },

        /* ---------------------------------------------------
           Configure PDF.js Worker
           --------------------------------------------------- */

        configureWorker() {

            if (
                !this.pdfjs ||
                !this.pdfjs.GlobalWorkerOptions
            ) {
                return;
            }

            this.pdfjs.GlobalWorkerOptions.workerSrc =
                this.config.workerSource;
        },

        /* ---------------------------------------------------
           Validate File
           --------------------------------------------------- */

        validateFile(file) {

            if (!file) {

                return {
                    valid: false,
                    message:
                        "No PDF file was selected."
                };
            }

            const name =
                String(file.name || "")
                    .toLowerCase();

            const isPDF =
                file.type ===
                    this.config.supportedType ||
                name.endsWith(".pdf");

            if (!isPDF) {

                return {
                    valid: false,
                    message:
                        "Only PDF files are supported."
                };
            }

            if (
                Number(file.size) >
                this.config.maxFileSize
            ) {

                return {
                    valid: false,
                    message:
                        "PDF file is larger than the allowed 100 MB limit."
                };
            }

            return {
                valid: true,
                message: "Valid PDF file."
            };
        },

        /* ---------------------------------------------------
           Read File
           --------------------------------------------------- */

        async readFile(file) {

            const validation =
                this.validateFile(file);

            if (!validation.valid) {
                throw new Error(
                    validation.message
                );
            }

            if (
                typeof file.arrayBuffer ===
                "function"
            ) {

                return await file.arrayBuffer();
            }

            /*
             * Older browsers fallback.
             */

            return await new Promise(
                (resolve, reject) => {

                    const reader =
                        new FileReader();

                    reader.onload =
                        () => resolve(
                            reader.result
                        );

                    reader.onerror =
                        () => reject(
                            new Error(
                                "Unable to read PDF file."
                            )
                        );

                    reader.readAsArrayBuffer(
                        file
                    );
                }
            );
        },

        /* ---------------------------------------------------
           Load PDF
           --------------------------------------------------- */

        async load(file) {

            const validation =
                this.validateFile(file);

            if (!validation.valid) {
                throw new Error(
                    validation.message
                );
            }

            const pdfjs =
                await this.init();

            const arrayBuffer =
                await this.readFile(file);

            /*
             * Keep a Uint8Array copy because PDF.js may
             * transfer the underlying ArrayBuffer.
             */

            const data =
                new Uint8Array(
                    arrayBuffer
                );

            let loadingTask = null;

            try {

                loadingTask =
                    pdfjs.getDocument({
                        data: data
                    });

                const pdf =
                    await loadingTask.promise;

                return {
                    pdf: pdf,

                    file: file,

                    fileName:
                        file.name,

                    fileSize:
                        file.size,

                    pageCount:
                        pdf.numPages,

                    loadedAt:
                        new Date().toISOString()
                };

            } catch (error) {

                console.error(
                    "PDF loading failed:",
                    error
                );

                throw new Error(
                    "The PDF could not be opened. It may be corrupted, password protected, or unsupported."
                );
            }
        },

        /* ---------------------------------------------------
           Load Multiple PDFs
           --------------------------------------------------- */

        async loadMultiple(files, progressCallback) {

            if (!files) {
                return [];
            }

            const fileArray =
                Array.from(files);

            const results = [];

            for (
                let i = 0;
                i < fileArray.length;
                i++
            ) {

                const file =
                    fileArray[i];

                if (
                    typeof progressCallback ===
                    "function"
                ) {

                    progressCallback({
                        current:
                            i + 1,

                        total:
                            fileArray.length,

                        percent:
                            Math.round(
                                (i /
                                    fileArray.length) *
                                100
                            ),

                        fileName:
                            file.name
                    });
                }

                try {

                    const result =
                        await this.load(file);

                    results.push(result);

                } catch (error) {

                    results.push({
                        file:
                            file,

                        fileName:
                            file.name,

                        error:
                            error.message,

                        failed:
                            true
                    });
                }
            }

            if (
                typeof progressCallback ===
                "function"
            ) {

                progressCallback({
                    current:
                        fileArray.length,

                    total:
                        fileArray.length,

                    percent:
                        100,

                    completed:
                        true
                });
            }

            return results;
        },

        /* ---------------------------------------------------
           Get Page
           --------------------------------------------------- */

        async getPage(pdf, pageNumber) {

            if (!pdf) {
                throw new Error(
                    "PDF document is missing."
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
                    `Invalid PDF page number: ${pageNumber}`
                );
            }

            return await pdf.getPage(
                page
            );
        },

        /* ---------------------------------------------------
           Get All Pages
           --------------------------------------------------- */

        async getAllPages(
            pdf,
            progressCallback
        ) {

            if (!pdf) {
                return [];
            }

            const pages = [];

            for (
                let pageNumber = 1;
                pageNumber <= pdf.numPages;
                pageNumber++
            ) {

                const page =
                    await this.getPage(
                        pdf,
                        pageNumber
                    );

                pages.push(page);

                if (
                    typeof progressCallback ===
                    "function"
                ) {

                    progressCallback({
                        current:
                            pageNumber,

                        total:
                            pdf.numPages,

                        percent:
                            Math.round(
                                (pageNumber /
                                    pdf.numPages) *
                                100
                            )
                    });
                }
            }

            return pages;
        },

        /* ---------------------------------------------------
           Extract Text From Page
           --------------------------------------------------- */

        async extractPageText(page) {

            if (!page) {
                return null;
            }

            try {

                const textContent =
                    await page.getTextContent();

                const items =
                    Array.isArray(
                        textContent.items
                    )
                        ? textContent.items
                        : [];

                const text =
                    items
                        .map((item) => {
                            return String(
                                item.str || ""
                            );
                        })
                        .join(" ");

                return {
                    pageNumber:
                        page.pageNumber,

                    text:
                        text.trim(),

                    items:
                        items
                };

            } catch (error) {

                console.warn(
                    "Page text extraction failed:",
                    error
                );

                return {
                    pageNumber:
                        page.pageNumber,

                    text: "",

                    items: [],

                    extractionError:
                        error.message
                };
            }
        },

        /* ---------------------------------------------------
           Extract Complete PDF Text
           --------------------------------------------------- */

        async extractText(
            pdf,
            progressCallback
        ) {

            if (!pdf) {
                throw new Error(
                    "PDF document is missing."
                );
            }

            const pages = [];

            for (
                let pageNumber = 1;
                pageNumber <= pdf.numPages;
                pageNumber++
            ) {

                const page =
                    await pdf.getPage(
                        pageNumber
                    );

                const data =
                    await this.extractPageText(
                        page
                    );

                pages.push(data);

                if (
                    typeof progressCallback ===
                    "function"
                ) {

                    progressCallback({
                        current:
                            pageNumber,

                        total:
                            pdf.numPages,

                        percent:
                            Math.round(
                                (pageNumber /
                                    pdf.numPages) *
                                100
                            )
                    });
                }
            }

            return {
                pages:
                    pages,

                pageCount:
                    pdf.numPages,

                text:
                    pages
                        .map(
                            (page) =>
                                page.text
                        )
                        .join("\n\n")
            };
        },

        /* ---------------------------------------------------
           Get Text Items With Coordinates
           --------------------------------------------------- */

        async extractPageItems(page) {

            if (!page) {
                return [];
            }

            try {

                const content =
                    await page.getTextContent();

                return (
                    content.items || []
                ).map((item) => {

                    const transform =
                        Array.isArray(
                            item.transform
                        )
                            ? item.transform
                            : [1, 0, 0, 1, 0, 0];

                    return {
                        text:
                            String(
                                item.str || ""
                            ),

                        x:
                            Number(
                                transform[4]
                            ) || 0,

                        y:
                            Number(
                                transform[5]
                            ) || 0,

                        width:
                            Number(
                                item.width
                            ) || 0,

                        height:
                            Number(
                                item.height
                            ) || 0,

                        fontSize:
                            Math.abs(
                                Number(
                                    transform[3]
                                ) || 0
                            ),

                        hasEOL:
                            Boolean(
                                item.hasEOL
                            )
                    };
                });

            } catch (error) {

                console.warn(
                    "Coordinate extraction failed:",
                    error
                );

                return [];
            }
        },

        /* ---------------------------------------------------
           Detect Page Images
           --------------------------------------------------- */

        async getPageOperatorList(page) {

            if (
                !page ||
                typeof page.getOperatorList !==
                    "function"
            ) {
                return null;
            }

            try {

                return await page.getOperatorList();

            } catch (error) {

                console.warn(
                    "Unable to inspect page graphics:",
                    error
                );

                return null;
            }
        },

        /* ---------------------------------------------------
           Check For Text
           --------------------------------------------------- */

        async pageHasText(page) {

            const data =
                await this.extractPageText(
                    page
                );

            return Boolean(
                data &&
                data.text &&
                data.text.trim().length > 0
            );
        },

        /* ---------------------------------------------------
           Detect Scanned PDF
           --------------------------------------------------- */

        async detectScannedPDF(pdf) {

            if (!pdf) {
                return false;
            }

            const samplePages =
                Math.min(
                    pdf.numPages,
                    5
                );

            let pagesWithText = 0;

            for (
                let i = 1;
                i <= samplePages;
                i++
            ) {

                const page =
                    await pdf.getPage(i);

                const hasText =
                    await this.pageHasText(
                        page
                    );

                if (hasText) {
                    pagesWithText++;
                }
            }

            /*
             * This is only a heuristic.
             * A PDF may contain both text and scanned pages.
             */

            return (
                samplePages > 0 &&
                pagesWithText === 0
            );
        },

        /* ---------------------------------------------------
           Metadata
           --------------------------------------------------- */

        async getMetadata(pdf) {

            if (
                !pdf ||
                typeof pdf.getMetadata !==
                    "function"
            ) {
                return null;
            }

            try {

                return await pdf.getMetadata();

            } catch (error) {

                console.warn(
                    "PDF metadata unavailable:",
                    error
                );

                return null;
            }
        },

        /* ---------------------------------------------------
           Destroy PDF
           --------------------------------------------------- */

        async destroy(documentData) {

            if (!documentData) {
                return;
            }

            const pdf =
                documentData.pdf ||
                documentData;

            if (
                pdf &&
                typeof pdf.destroy ===
                    "function"
            ) {

                try {
                    await pdf.destroy();
                } catch (error) {
                    console.warn(
                        "Unable to destroy PDF:",
                        error
                    );
                }
            }
        }
    };

    /* -------------------------------------------------------
       Expose Globally
       ------------------------------------------------------- */

    window.PDFLoader =
        PDFLoader;

})();
