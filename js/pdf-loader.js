/* =========================================================
   GATE TEST SERIES
   FILE: js/pdf-loader.js

   Stable PDF.js loader
========================================================= */

(function () {
    "use strict";

    const PDFJS_VERSION = "3.11.174";

    const PDFJS_URL =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" +
        PDFJS_VERSION +
        "/pdf.min.js";

    const WORKER_URL =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" +
        PDFJS_VERSION +
        "/pdf.worker.min.js";


    class PDFLoaderClass {

        constructor() {
            this.readyPromise = null;
        }


        /* =====================================================
           LOAD PDF.JS
        ===================================================== */

        async loadPDFJS() {

            /* Already loaded */
            if (
                window.pdfjsLib &&
                typeof window.pdfjsLib.getDocument === "function"
            ) {

                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    WORKER_URL;

                return window.pdfjsLib;
            }


            /* Already loading */
            if (this.readyPromise) {
                return this.readyPromise;
            }


            this.readyPromise = new Promise(
                (resolve, reject) => {

                    const script =
                        document.createElement("script");

                    script.src = PDFJS_URL;

                    script.async = true;

                    script.crossOrigin = "anonymous";


                    script.onload = () => {

                        if (
                            !window.pdfjsLib ||
                            typeof window.pdfjsLib.getDocument !==
                            "function"
                        ) {

                            reject(
                                new Error(
                                    "PDF.js loaded but pdfjsLib is unavailable."
                                )
                            );

                            return;
                        }


                        window.pdfjsLib
                            .GlobalWorkerOptions
                            .workerSrc =
                            WORKER_URL;


                        console.log(
                            "PDF.js loaded successfully."
                        );


                        resolve(
                            window.pdfjsLib
                        );
                    };


                    script.onerror = () => {

                        reject(
                            new Error(
                                "Could not load PDF.js from CDN."
                            )
                        );
                    };


                    document.head.appendChild(script);
                }
            );


            return this.readyPromise;
        }


        /* =====================================================
           READ FILE
        ===================================================== */

        async readFile(file) {

            if (!file) {

                throw new Error(
                    "No PDF file selected."
                );
            }


            /* Browser File / Blob */

            if (
                typeof file.arrayBuffer === "function"
            ) {

                return await file.arrayBuffer();
            }


            /* ArrayBuffer */

            if (
                file instanceof ArrayBuffer
            ) {

                return file;
            }


            /* Uint8Array */

            if (
                file instanceof Uint8Array
            ) {

                return file;
            }


            throw new Error(
                "Invalid PDF file."
            );
        }


        /* =====================================================
           LOAD ONE PDF
        ===================================================== */

        async load(file) {

            console.log(
                "PDFLoader: loading:",
                file && file.name
                    ? file.name
                    : "PDF"
            );


            try {

                const pdfjs =
                    await this.loadPDFJS();


                const data =
                    await this.readFile(file);


                console.log(
                    "PDFLoader: file read successfully."
                );


                const loadingTask =
                    pdfjs.getDocument({
                        data: data
                    });


                const pdf =
                    await loadingTask.promise;


                console.log(
                    "PDFLoader: PDF loaded successfully."
                );


                console.log(
                    "PDF pages:",
                    pdf.numPages
                );


                return pdf;

            } catch (error) {

                console.error(
                    "PDFLoader ERROR:",
                    error
                );

                throw error;
            }
        }


        /* =====================================================
           LOAD MULTIPLE PDFs
        ===================================================== */

        async loadMultiple(files) {

            const list =
                Array.from(files || []);


            const output = [];


            for (
                const file of list
            ) {

                try {

                    const pdf =
                        await this.load(file);


                    output.push({

                        file: file,

                        pdf: pdf,

                        success: true,

                        pages:
                            pdf.numPages,

                        name:
                            file.name

                    });

                } catch (error) {

                    console.error(
                        "Failed:",
                        file.name,
                        error
                    );


                    output.push({

                        file: file,

                        pdf: null,

                        success: false,

                        pages: 0,

                        name:
                            file.name,

                        error:
                            error.message ||
                            String(error)

                    });
                }
            }


            return output;
        }


        /* =====================================================
           VALIDATE PDF
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
                        "PDF could not be loaded."

                };
            }
        }


        /* =====================================================
           GET PAGE
        ===================================================== */

        async getPage(
            pdf,
            pageNumber
        ) {

            if (!pdf) {

                throw new Error(
                    "PDF is not loaded."
                );
            }


            const number =
                Number(pageNumber);


            if (
                !Number.isInteger(number) ||
                number < 1 ||
                number > pdf.numPages
            ) {

                throw new Error(
                    "Invalid PDF page number."
                );
            }


            return await pdf.getPage(number);
        }
    }


    /* =========================================================
       GLOBAL INSTANCE
    ========================================================= */

    window.PDFLoader =
        new PDFLoaderClass();


    /* Expose class */
    window.PDFLoaderClass =
        PDFLoaderClass;


    console.log(
        "PDFLoader ready."
    );

})();
