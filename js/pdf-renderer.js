/* =========================================================
   GATE TEST SERIES
   File: js/pdf-renderer.js

   Purpose:
   - Render PDF pages to images/canvas
   - Preserve diagrams and figures
   - Create cropped question figures
   - Support mobile browsers
   - Work with PDFLoader / PDFParser
   ========================================================= */

(function () {
    "use strict";

    const PDFRenderer = {

        VERSION: "1.0.0",

        defaultScale: 1.6,

        maxCanvasWidth: 1800,

        imageType: "image/png",


        /* -------------------------------------------------
           Get PDF.js document
           ------------------------------------------------- */

        getDocument: async function (pdfSource) {

            if (!pdfSource) {
                throw new Error("PDF source is missing.");
            }

            if (
                window.PDFLoader &&
                typeof PDFLoader.load === "function"
            ) {
                return await PDFLoader.load(pdfSource);
            }

            if (
                window.pdfjsLib &&
                typeof pdfjsLib.getDocument === "function"
            ) {

                const loadingTask =
                    pdfjsLib.getDocument(pdfSource);

                return await loadingTask.promise;
            }

            throw new Error(
                "PDF.js is not loaded."
            );
        },


        /* -------------------------------------------------
           Render complete PDF page
           ------------------------------------------------- */

        renderPage: async function (
            pdf,
            pageNumber,
            options
        ) {

            options =
                options || {};

            if (!pdf) {
                throw new Error(
                    "PDF document is missing."
                );
            }

            const page =
                await pdf.getPage(
                    Number(pageNumber)
                );


            let scale =
                Number(
                    options.scale ||
                    this.defaultScale
                );


            const viewport =
                page.getViewport({
                    scale: scale
                });


            /* Prevent extremely large mobile canvas */

            let finalViewport =
                viewport;

            if (
                viewport.width >
                this.maxCanvasWidth
            ) {

                const ratio =
                    this.maxCanvasWidth /
                    viewport.width;

                scale *= ratio;

                finalViewport =
                    page.getViewport({
                        scale: scale
                    });
            }


            const canvas =
                options.canvas ||
                document.createElement("canvas");

            const context =
                canvas.getContext(
                    "2d",
                    {
                        alpha: false
                    }
                );


            canvas.width =
                Math.ceil(
                    finalViewport.width
                );

            canvas.height =
                Math.ceil(
                    finalViewport.height
                );


            canvas.style.maxWidth =
                "100%";

            canvas.style.height =
                "auto";


            const renderContext = {

                canvasContext:
                    context,

                viewport:
                    finalViewport,

                background:
                    options.background ||
                    "#ffffff"
            };


            await page.render(
                renderContext
            ).promise;


            return {
                canvas: canvas,
                page: page,
                pageNumber:
                    Number(pageNumber),

                width:
                    canvas.width,

                height:
                    canvas.height,

                scale: scale,

                viewport:
                    finalViewport
            };
        },


        /* -------------------------------------------------
           Render page to Data URL
           ------------------------------------------------- */

        renderPageToDataURL: async function (
            pdf,
            pageNumber,
            options
        ) {

            const result =
                await this.renderPage(
                    pdf,
                    pageNumber,
                    options
                );


            return {
                dataURL:
                    result.canvas.toDataURL(
                        options &&
                        options.imageType
                            ? options.imageType
                            : this.imageType
                    ),

                width:
                    result.width,

                height:
                    result.height,

                pageNumber:
                    result.pageNumber,

                scale:
                    result.scale
            };
        },


        /* -------------------------------------------------
           Render page to Blob
           ------------------------------------------------- */

        renderPageToBlob: async function (
            pdf,
            pageNumber,
            options
        ) {

            options =
                options || {};

            const result =
                await this.renderPage(
                    pdf,
                    pageNumber,
                    options
                );


            return new Promise(function (
                resolve,
                reject
            ) {

                result.canvas.toBlob(
                    function (blob) {

                        if (!blob) {

                            reject(
                                new Error(
                                    "Unable to create image blob."
                                )
                            );

                            return;
                        }

                        resolve({
                            blob: blob,

                            width:
                                result.width,

                            height:
                                result.height,

                            pageNumber:
                                result.pageNumber,

                            scale:
                                result.scale
                        });

                    },

                    options.imageType ||
                    this.imageType,

                    options.quality || 0.92
                );

            }.bind(this));
        },


        /* -------------------------------------------------
           Render multiple pages
           ------------------------------------------------- */

        renderPages: async function (
            pdf,
            pageNumbers,
            options
        ) {

            options =
                options || {};

            let pages =
                Array.isArray(pageNumbers)
                    ? pageNumbers.slice()
                    : [];


            if (!pages.length) {

                const total =
                    Number(pdf.numPages || 0);

                pages =
                    Array.from(
                        {
                            length: total
                        },
                        function (_, index) {
                            return index + 1;
                        }
                    );
            }


            const results = [];


            for (
                let i = 0;
                i < pages.length;
                i++
            ) {

                try {

                    const rendered =
                        await this.renderPage(
                            pdf,
                            pages[i],
                            options
                        );

                    results.push(
                        rendered
                    );

                } catch (error) {

                    console.warn(
                        "Unable to render PDF page:",
                        pages[i],
                        error
                    );

                    if (
                        options.stopOnError
                    ) {
                        throw error;
                    }

                    results.push({
                        pageNumber:
                            pages[i],

                        error:
                            error.message ||
                            String(error)
                    });
                }
            }


            return results;
        },


        /* -------------------------------------------------
           Render all pages
           ------------------------------------------------- */

        renderAllPages: async function (
            pdf,
            options
        ) {

            if (!pdf) {
                throw new Error(
                    "PDF document is missing."
                );
            }

            const pages =
                Array.from(
                    {
                        length:
                            Number(pdf.numPages || 0)
                    },
                    function (_, index) {
                        return index + 1;
                    }
                );


            return await this.renderPages(
                pdf,
                pages,
                options
            );
        },


        /* -------------------------------------------------
           Create image element
           ------------------------------------------------- */

        createImage: function (
            dataURL,
            options
        ) {

            options =
                options || {};

            const image =
                document.createElement(
                    "img"
                );

            image.src =
                dataURL;

            image.alt =
                options.alt ||
                "Question figure";

            image.loading =
                options.loading ||
                "lazy";

            image.decoding =
                "async";

            image.style.maxWidth =
                "100%";

            image.style.height =
                "auto";

            image.style.display =
                "block";


            if (options.className) {
                image.className =
                    options.className;
            }


            return image;
        },


        /* -------------------------------------------------
           Render page and return image element
           ------------------------------------------------- */

        renderPageToImage: async function (
            pdf,
            pageNumber,
            options
        ) {

            const result =
                await this.renderPageToDataURL(
                    pdf,
                    pageNumber,
                    options
                );


            const image =
                this.createImage(
                    result.dataURL,
                    {
                        alt:
                            options &&
                            options.alt
                                ? options.alt
                                : "PDF page"
                    }
                );


            return {
                image: image,

                dataURL:
                    result.dataURL,

                width:
                    result.width,

                height:
                    result.height,

                pageNumber:
                    result.pageNumber
            };
        },


        /* -------------------------------------------------
           Crop canvas
           ------------------------------------------------- */

        cropCanvas: function (
            canvas,
            crop
        ) {

            if (!canvas) {
                throw new Error(
                    "Canvas is missing."
                );
            }

            if (!crop) {
                return canvas;
            }


            const x =
                Math.max(
                    0,
                    Number(crop.x || 0)
                );

            const y =
                Math.max(
                    0,
                    Number(crop.y || 0)
                );


            const width =
                Math.min(
                    Number(
                        crop.width ||
                        canvas.width
                    ),
                    canvas.width - x
                );


            const height =
                Math.min(
                    Number(
                        crop.height ||
                        canvas.height
                    ),
                    canvas.height - y
                );


            if (
                width <= 0 ||
                height <= 0
            ) {
                return canvas;
            }


            const output =
                document.createElement(
                    "canvas"
                );

            output.width =
                Math.ceil(width);

            output.height =
                Math.ceil(height);


            const context =
                output.getContext("2d");


            context.drawImage(
                canvas,

                x,
                y,
                width,
                height,

                0,
                0,
                width,
                height
            );


            return output;
        },


        /* -------------------------------------------------
           Crop rendered page
           ------------------------------------------------- */

        renderCrop: async function (
            pdf,
            pageNumber,
            crop,
            options
        ) {

            const rendered =
                await this.renderPage(
                    pdf,
                    pageNumber,
                    options
                );


            const cropped =
                this.cropCanvas(
                    rendered.canvas,
                    crop
                );


            return {
                canvas:
                    cropped,

                dataURL:
                    cropped.toDataURL(
                        options &&
                        options.imageType
                            ? options.imageType
                            : this.imageType
                    ),

                pageNumber:
                    pageNumber,

                x:
                    crop &&
                    crop.x
                        ? crop.x
                        : 0,

                y:
                    crop &&
                    crop.y
                        ? crop.y
                        : 0,

                width:
                    cropped.width,

                height:
                    cropped.height
            };
        },


        /* -------------------------------------------------
           Convert PDF coordinates to canvas coordinates

           PDF coordinates:
           - origin generally bottom-left

           Canvas:
           - origin top-left
           ------------------------------------------------- */

        pdfToCanvasCoordinates: function (
            rect,
            viewport
        ) {

            if (!rect) {
                return null;
            }

            const x1 =
                Number(rect.x1 || rect.x || 0);

            const y1 =
                Number(rect.y1 || rect.y || 0);

            const x2 =
                Number(
                    rect.x2 != null
                        ? rect.x2
                        : x1 + Number(
                            rect.width || 0
                        )
                );

            const y2 =
                Number(
                    rect.y2 != null
                        ? rect.y2
                        : y1 + Number(
                            rect.height || 0
                        )
                );


            if (!viewport) {

                return {
                    x: x1,
                    y: y1,

                    width:
                        Math.max(
                            0,
                            x2 - x1
                        ),

                    height:
                        Math.max(
                            0,
                            y2 - y1
                        )
                };
            }


            /* PDF.js helper */

            try {

                const points =
                    viewport.convertToViewportRectangle(
                        [
                            x1,
                            y1,
                            x2,
                            y2
                        ]
                    );


                const left =
                    Math.min(
                        points[0],
                        points[2]
                    );

                const top =
                    Math.min(
                        points[1],
                        points[3]
                    );

                const right =
                    Math.max(
                        points[0],
                        points[2]
                    );

                const bottom =
                    Math.max(
                        points[1],
                        points[3]
                    );


                return {
                    x: left,
                    y: top,

                    width:
                        right - left,

                    height:
                        bottom - top
                };

            } catch (error) {

                return {
                    x: x1,
                    y: y1,

                    width:
                        Math.max(
                            0,
                            x2 - x1
                        ),

                    height:
                        Math.max(
                            0,
                            y2 - y1
                        )
                };
            }
        },


        /* -------------------------------------------------
           Extract image-like objects from PDF page

           This is intentionally best-effort.
           It does NOT assume that every PDF image is a
           question figure.
           ------------------------------------------------- */

        getPageImages: async function (
            page
        ) {

            if (!page) {
                return [];
            }


            const images = [];


            try {

                const operatorList =
                    await page.getOperatorList();


                if (
                    !operatorList ||
                    !Array.isArray(
                        operatorList.fnArray
                    )
                ) {
                    return images;
                }


                const OPS =
                    window.pdfjsLib &&
                    pdfjsLib.OPS
                        ? pdfjsLib.OPS
                        : {};


                for (
                    let i = 0;
                    i <
                    operatorList.fnArray.length;
                    i++
                ) {

                    const fn =
                        operatorList.fnArray[i];


                    if (
                        fn !== OPS.paintImageXObject &&
                        fn !== OPS.paintImageMaskXObject &&
                        fn !== OPS.paintJpegXObject
                    ) {
                        continue;
                    }


                    const args =
                        operatorList.argsArray[i];


                    images.push({
                        index: i,
                        operator: fn,
                        args: args || null
                    });
                }

            } catch (error) {

                console.warn(
                    "Unable to inspect PDF images:",
                    error
                );
            }


            return images;
        },


        /* -------------------------------------------------
           Detect possible figure region from text layout

           Useful when question parser knows text bounding
           boxes but not exact image coordinates.
           ------------------------------------------------- */

        detectFigureRegion: function (
            textItems,
            pageWidth,
            pageHeight,
            options
        ) {

            options =
                options || {};


            if (
                !Array.isArray(textItems) ||
                !textItems.length
            ) {
                return null;
            }


            const items =
                textItems.filter(function (item) {

                    return (
                        item &&
                        item.transform &&
                        item.width != null &&
                        item.height != null
                    );

                });


            if (!items.length) {
                return null;
            }


            const boxes =
                items.map(function (item) {

                    const transform =
                        item.transform || [];

                    const x =
                        Number(
                            transform[4] || 0
                        );

                    const y =
                        Number(
                            transform[5] || 0
                        );


                    return {
                        x: x,

                        y:
                            pageHeight -
                            y -

                            Number(
                                item.height || 0
                            ),

                        width:
                            Number(
                                item.width || 0
                            ),

                        height:
                            Number(
                                item.height || 0
                            )
                    };
                });


            const occupied = {

                minX:
                    Math.min.apply(
                        null,
                        boxes.map(function (b) {
                            return b.x;
                        })
                    ),

                maxX:
                    Math.max.apply(
                        null,
                        boxes.map(function (b) {
                            return b.x + b.width;
                        })
                    ),

                minY:
                    Math.min.apply(
                        null,
                        boxes.map(function (b) {
                            return b.y;
                        })
                    ),

                maxY:
                    Math.max.apply(
                        null,
                        boxes.map(function (b) {
                            return b.y + b.height;
                        })
                    )
            };


            /* Do not blindly crop the entire page */

            const margin =
                Number(
                    options.margin || 10
                );


            return {

                x:
                    Math.max(
                        0,
                        occupied.minX - margin
                    ),

                y:
                    Math.max(
                        0,
                        occupied.minY - margin
                    ),

                width:
                    Math.min(
                        pageWidth,
                        occupied.maxX -
                        occupied.minX +
                        margin * 2
                    ),

                height:
                    Math.min(
                        pageHeight,
                        occupied.maxY -
                        occupied.minY +
                        margin * 2
                    )
            };
        },


        /* -------------------------------------------------
           Make a figure container
           ------------------------------------------------- */

        createFigureElement: function (
            dataURL,
            options
        ) {

            options =
                options || {};

            const wrapper =
                document.createElement(
                    "div"
                );

            wrapper.className =
                options.className ||
                "pdf-figure";


            const image =
                this.createImage(
                    dataURL,
                    {
                        alt:
                            options.alt ||
                            "Question figure",

                        loading:
                            options.loading ||
                            "lazy"
                    }
                );


            wrapper.appendChild(
                image
            );


            return wrapper;
        },


        /* -------------------------------------------------
           Attach figure to question object

           The image is only generated when explicitly
           requested. This keeps localStorage smaller.
           ------------------------------------------------- */

        attachPageImage: async function (
            question,
            pdf,
            options
        ) {

            if (
                !question ||
                !pdf
            ) {
                return question;
            }


            options =
                options || {};


            const pageNumber =
                Number(
                    question.page ||
                    question.pageNumber ||
                    0
                );


            if (
                !pageNumber ||
                pageNumber < 1 ||
                pageNumber > pdf.numPages
            ) {
                return question;
            }


            try {

                const rendered =
                    await this.renderPageToDataURL(
                        pdf,
                        pageNumber,
                        {
                            scale:
                                options.scale ||
                                1.5
                        }
                    );


                question.pageImage =
                    rendered.dataURL;

                question.pageImageWidth =
                    rendered.width;

                question.pageImageHeight =
                    rendered.height;


                return question;

            } catch (error) {

                console.warn(
                    "Unable to attach PDF page image:",
                    error
                );

                return question;
            }
        },


        /* -------------------------------------------------
           Render only when needed by exam UI
           ------------------------------------------------- */

        renderQuestionPage: async function (
            question,
            pdf,
            container,
            options
        ) {

            options =
                options || {};


            if (
                !question ||
                !pdf ||
                !container
            ) {
                return null;
            }


            const pageNumber =
                Number(
                    question.page ||
                    question.pageNumber ||
                    0
                );


            if (!pageNumber) {
                return null;
            }


            try {

                const result =
                    await this.renderPageToImage(
                        pdf,
                        pageNumber,
                        {
                            scale:
                                options.scale ||
                                1.4,

                            alt:
                                "Page " +
                                pageNumber
                        }
                    );


                container.innerHTML = "";

                container.appendChild(
                    result.image
                );


                return result;

            } catch (error) {

                console.error(
                    "Question page rendering failed:",
                    error
                );

                return null;
            }
        },


        /* -------------------------------------------------
           Safe image URL check
           ------------------------------------------------- */

        isValidImageSource: function (
            source
        ) {

            if (!source) {
                return false;
            }

            const value =
                String(source)
                    .trim()
                    .toLowerCase();


            return (
                value.startsWith("data:image/") ||
                value.startsWith("blob:") ||
                value.startsWith("https://") ||
                value.startsWith("http://")
            );
        },


        /* -------------------------------------------------
           Cleanup
           ------------------------------------------------- */

        revokeBlobURL: function (url) {

            if (
                typeof url === "string" &&
                url.startsWith("blob:")
            ) {

                try {
                    URL.revokeObjectURL(
                        url
                    );
                } catch (error) {
                    /* Ignore */
                }
            }
        },


        /* -------------------------------------------------
           Utility: render a PDF file directly
           ------------------------------------------------- */

        renderFile: async function (
            file,
            pageNumber,
            options
        ) {

            const pdf =
                await this.getDocument(
                    file
                );


            const result =
                await this.renderPageToImage(
                    pdf,
                    pageNumber || 1,
                    options || {}
                );


            return {
                pdf: pdf,
                result: result
            };
        }
    };


    /* -----------------------------------------------------
       Global
       ----------------------------------------------------- */

    window.PDFRenderer =
        PDFRenderer;

})();
