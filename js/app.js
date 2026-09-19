/* =========================================================
   GATE TEST SERIES
   Main Application Controller
   File: js/app.js
   ========================================================= */

(function () {
    "use strict";

    /* -------------------------------------------------------
       Global Application Object
       ------------------------------------------------------- */

    const GATEApp = {
        version: "1.0.0",

        state: {
            files: [],
            questions: [],
            isProcessing: false,
            isReady: false,
            settings: {
                duration: 180,
                questionCount: 0,
                section: "full",
                order: "original",
                shuffleOptions: false,
                negativeMarking: true,
                autoSubmit: true
            }
        },

        /* ---------------------------------------------------
           Initialize
           --------------------------------------------------- */

        init() {
            this.cacheElements();
            this.loadSavedSettings();
            this.bindEvents();
            this.updateUI();
        },

        /* ---------------------------------------------------
           Cache DOM Elements
           --------------------------------------------------- */

        cacheElements() {
            this.elements = {
                pdfInput: document.getElementById("pdfInput"),
                uploadArea: document.getElementById("uploadArea"),
                fileList: document.getElementById("fileList"),

                durationInput: document.getElementById("duration"),
                questionCountInput: document.getElementById("questionCount"),
                sectionSelect: document.getElementById("section"),
                orderSelect: document.getElementById("order"),
                shuffleOptions: document.getElementById("shuffleOptions"),
                negativeMarking: document.getElementById("negativeMarking"),
                autoSubmit: document.getElementById("autoSubmit"),

                processingCard: document.getElementById("processingCard"),
                processingText: document.getElementById("processingText"),
                processingProgress: document.getElementById("processingProgress"),

                messageCard: document.getElementById("messageCard"),
                messageText: document.getElementById("messageText"),

                startTestBtn: document.getElementById("startTestBtn")
            };
        },

        /* ---------------------------------------------------
           Bind Events
           --------------------------------------------------- */

        bindEvents() {

            if (this.elements.pdfInput) {
                this.elements.pdfInput.addEventListener(
                    "change",
                    (event) => {
                        this.handleFiles(event.target.files);
                    }
                );
            }

            if (this.elements.uploadArea) {

                this.elements.uploadArea.addEventListener(
                    "dragover",
                    (event) => {
                        event.preventDefault();
                        this.elements.uploadArea.classList.add("drag-over");
                    }
                );

                this.elements.uploadArea.addEventListener(
                    "dragleave",
                    () => {
                        this.elements.uploadArea.classList.remove("drag-over");
                    }
                );

                this.elements.uploadArea.addEventListener(
                    "drop",
                    (event) => {
                        event.preventDefault();

                        this.elements.uploadArea.classList.remove(
                            "drag-over"
                        );

                        if (event.dataTransfer.files) {
                            this.handleFiles(event.dataTransfer.files);
                        }
                    }
                );
            }

            const settingElements = [
                this.elements.durationInput,
                this.elements.questionCountInput,
                this.elements.sectionSelect,
                this.elements.orderSelect,
                this.elements.shuffleOptions,
                this.elements.negativeMarking,
                this.elements.autoSubmit
            ];

            settingElements.forEach((element) => {
                if (!element) return;

                element.addEventListener("change", () => {
                    this.readSettings();
                    this.saveSettings();
                    this.updateUI();
                });

                element.addEventListener("input", () => {
                    this.readSettings();
                    this.saveSettings();
                });
            });

            if (this.elements.startTestBtn) {
                this.elements.startTestBtn.addEventListener(
                    "click",
                    () => {
                        this.startTest();
                    }
                );
            }
        },

        /* ---------------------------------------------------
           Read Settings
           --------------------------------------------------- */

        readSettings() {

            const duration = parseInt(
                this.elements.durationInput?.value,
                10
            );

            const questionCount = parseInt(
                this.elements.questionCountInput?.value,
                10
            );

            this.state.settings.duration =
                Number.isFinite(duration) && duration > 0
                    ? duration
                    : 180;

            this.state.settings.questionCount =
                Number.isFinite(questionCount) && questionCount >= 0
                    ? questionCount
                    : 0;

            this.state.settings.section =
                this.elements.sectionSelect?.value || "full";

            this.state.settings.order =
                this.elements.orderSelect?.value || "original";

            this.state.settings.shuffleOptions =
                Boolean(this.elements.shuffleOptions?.checked);

            this.state.settings.negativeMarking =
                this.elements.negativeMarking
                    ? Boolean(this.elements.negativeMarking.checked)
                    : true;

            this.state.settings.autoSubmit =
                this.elements.autoSubmit
                    ? Boolean(this.elements.autoSubmit.checked)
                    : true;
        },

        /* ---------------------------------------------------
           Save Settings
           --------------------------------------------------- */

        saveSettings() {

            try {

                if (
                    typeof StorageManager !== "undefined" &&
                    typeof StorageManager.saveSettings === "function"
                ) {
                    StorageManager.saveSettings(
                        this.state.settings
                    );
                    return;
                }

                localStorage.setItem(
                    "gate_test_settings",
                    JSON.stringify(this.state.settings)
                );

            } catch (error) {
                console.warn(
                    "Unable to save settings:",
                    error
                );
            }
        },

        /* ---------------------------------------------------
           Load Saved Settings
           --------------------------------------------------- */

        loadSavedSettings() {

            try {

                let saved = null;

                if (
                    typeof StorageManager !== "undefined" &&
                    typeof StorageManager.getSettings === "function"
                ) {
                    saved = StorageManager.getSettings();
                } else {

                    const raw = localStorage.getItem(
                        "gate_test_settings"
                    );

                    if (raw) {
                        saved = JSON.parse(raw);
                    }
                }

                if (!saved) return;

                this.state.settings = {
                    ...this.state.settings,
                    ...saved
                };

                this.applySettingsToUI();

            } catch (error) {

                console.warn(
                    "Unable to load saved settings:",
                    error
                );
            }
        },

        /* ---------------------------------------------------
           Apply Settings To UI
           --------------------------------------------------- */

        applySettingsToUI() {

            const s = this.state.settings;

            if (this.elements.durationInput) {
                this.elements.durationInput.value =
                    s.duration;
            }

            if (this.elements.questionCountInput) {
                this.elements.questionCountInput.value =
                    s.questionCount;
            }

            if (this.elements.sectionSelect) {
                this.elements.sectionSelect.value =
                    s.section;
            }

            if (this.elements.orderSelect) {
                this.elements.orderSelect.value =
                    s.order;
            }

            if (this.elements.shuffleOptions) {
                this.elements.shuffleOptions.checked =
                    s.shuffleOptions;
            }

            if (this.elements.negativeMarking) {
                this.elements.negativeMarking.checked =
                    s.negativeMarking;
            }

            if (this.elements.autoSubmit) {
                this.elements.autoSubmit.checked =
                    s.autoSubmit;
            }
        },

        /* ---------------------------------------------------
           Handle Uploaded Files
           --------------------------------------------------- */

        async handleFiles(fileList) {

            if (!fileList || fileList.length === 0) {
                return;
            }

            const files = Array.from(fileList);

            const pdfFiles = files.filter((file) => {
                return (
                    file.type === "application/pdf" ||
                    file.name.toLowerCase().endsWith(".pdf")
                );
            });

            if (pdfFiles.length === 0) {
                this.showMessage(
                    "Please select a PDF file.",
                    "error"
                );
                return;
            }

            this.state.files = pdfFiles;

            this.renderFileList();

            await this.processPDFs();
        },

        /* ---------------------------------------------------
           Render File List
           --------------------------------------------------- */

        renderFileList() {

            const container = this.elements.fileList;

            if (!container) return;

            container.innerHTML = "";

            this.state.files.forEach((file, index) => {

                const item = document.createElement("div");

                item.className = "file-item";

                item.innerHTML = `
                    <div class="file-item-icon">PDF</div>

                    <div class="file-item-info">
                        <div class="file-item-name">
                            ${this.escapeHTML(file.name)}
                        </div>

                        <div class="file-item-size">
                            ${this.formatFileSize(file.size)}
                        </div>
                    </div>

                    <button
                        type="button"
                        class="file-remove"
                        data-index="${index}"
                        aria-label="Remove file"
                    >
                        ×
                    </button>
                `;

                const removeButton =
                    item.querySelector(".file-remove");

                if (removeButton) {
                    removeButton.addEventListener(
                        "click",
                        () => {
                            this.removeFile(index);
                        }
                    );
                }

                container.appendChild(item);
            });
        },

        /* ---------------------------------------------------
           Remove File
           --------------------------------------------------- */

        removeFile(index) {

            if (
                index < 0 ||
                index >= this.state.files.length
            ) {
                return;
            }

            this.state.files.splice(index, 1);

            this.renderFileList();

            this.state.questions = [];
            this.state.isReady = false;

            this.updateUI();

            if (this.state.files.length === 0) {
                this.hideProcessing();
            }
        },

        /* ---------------------------------------------------
           Process PDFs
           --------------------------------------------------- */

        async processPDFs() {

            if (this.state.files.length === 0) {
                return;
            }

            this.state.isProcessing = true;
            this.state.isReady = false;

            this.showProcessing(
                "Preparing PDF..."
            );

            try {

                let allQuestions = [];

                for (
                    let i = 0;
                    i < this.state.files.length;
                    i++
                ) {

                    const file = this.state.files[i];

                    this.updateProcessing(
                        `Reading ${file.name}...`,
                        Math.round(
                            (i /
                                this.state.files.length) *
                            100
                        )
                    );

                    const questions =
                        await this.parsePDF(file);

                    if (
                        Array.isArray(questions) &&
                        questions.length > 0
                    ) {
                        allQuestions =
                            allQuestions.concat(
                                questions
                            );
                    }
                }

                this.updateProcessing(
                    "Validating questions...",
                    90
                );

                allQuestions =
                    this.validateQuestions(
                        allQuestions
                    );

                this.state.questions =
                    allQuestions;

                this.state.isProcessing = false;
                this.state.isReady =
                    allQuestions.length > 0;

                this.updateProcessing(
                    this.state.isReady
                        ? `${allQuestions.length} questions ready`
                        : "No valid questions detected",
                    100
                );

                if (this.state.isReady) {

                    this.showMessage(
                        `${allQuestions.length} questions successfully loaded. You can start the test.`,
                        "success"
                    );

                } else {

                    this.showMessage(
                        "Questions could not be extracted reliably from this PDF. The parser will not guess missing question data.",
                        "warning"
                    );
                }

                this.updateUI();

            } catch (error) {

                console.error(
                    "PDF processing error:",
                    error
                );

                this.state.isProcessing = false;
                this.state.isReady = false;

                this.showMessage(
                    "PDF processing failed. Please check the PDF and try again.",
                    "error"
                );

                this.updateUI();
            }
        },

        /* ---------------------------------------------------
           PDF Parsing
           --------------------------------------------------- */

        async parsePDF(file) {

            /*
             * Preferred pipeline:
             *
             * PDF Loader
             *      ↓
             * PDF Parser
             *      ↓
             * Question Parser
             *
             * Different parser implementations may expose
             * different function names, so this controller
             * checks the available public methods.
             */

            let rawData = null;

            if (
                typeof PDFLoader !== "undefined"
            ) {

                if (
                    typeof PDFLoader.load === "function"
                ) {
                    rawData =
                        await PDFLoader.load(file);
                } else if (
                    typeof PDFLoader.loadPDF === "function"
                ) {
                    rawData =
                        await PDFLoader.loadPDF(file);
                }
            }

            if (!rawData) {

                rawData = {
                    file: file
                };
            }

            let parsedData = rawData;

            if (
                typeof PDFParser !== "undefined"
            ) {

                if (
                    typeof PDFParser.parse === "function"
                ) {
                    parsedData =
                        await PDFParser.parse(
                            rawData
                        );
                } else if (
                    typeof PDFParser.parsePDF === "function"
                ) {
                    parsedData =
                        await PDFParser.parsePDF(
                            rawData
                        );
                }
            }

            let questions = [];

            if (
                typeof QuestionParser !== "undefined"
            ) {

                if (
                    typeof QuestionParser.parse === "function"
                ) {
                    questions =
                        await QuestionParser.parse(
                            parsedData
                        );
                } else if (
                    typeof QuestionParser.parseQuestions ===
                    "function"
                ) {
                    questions =
                        await QuestionParser.parseQuestions(
                            parsedData
                        );
                }
            }

            if (!Array.isArray(questions)) {
                questions = [];
            }

            return questions;
        },

        /* ---------------------------------------------------
           Validate Questions
           --------------------------------------------------- */

        validateQuestions(questions) {

            if (!Array.isArray(questions)) {
                return [];
            }

            let result = questions;

            if (
                typeof QuestionValidator !==
                "undefined"
            ) {

                if (
                    typeof QuestionValidator.validateAll ===
                    "function"
                ) {
                    result =
                        QuestionValidator.validateAll(
                            questions
                        );
                } else if (
                    typeof QuestionValidator.validate ===
                    "function"
                ) {
                    result =
                        questions.filter((question) => {
                            return QuestionValidator.validate(
                                question
                            );
                        });
                }
            }

            if (!Array.isArray(result)) {
                result = [];
            }

            return result.map((question, index) => {

                return {
                    ...question,

                    id:
                        question.id ||
                        `pdf-q-${index + 1}`,

                    number:
                        question.number ||
                        index + 1,

                    type:
                        question.type ||
                        "MCQ",

                    section:
                        question.section ||
                        "ME",

                    marks:
                        Number(question.marks) ||
                        1,

                    negativeMarks:
                        Number.isFinite(
                            Number(
                                question.negativeMarks
                            )
                        )
                            ? Number(
                                question.negativeMarks
                            )
                            : 0,

                    options:
                        Array.isArray(question.options)
                            ? question.options
                            : [],

                    needsReview:
                        Boolean(
                            question.needsReview
                        )
                };
            });
        },

        /* ---------------------------------------------------
           Start Test
           --------------------------------------------------- */

        startTest() {

            if (this.state.isProcessing) {
                this.showMessage(
                    "Please wait until PDF processing is complete.",
                    "warning"
                );
                return;
            }

            if (!this.state.isReady) {
                this.showMessage(
                    "Please upload a valid PDF and wait for question processing.",
                    "warning"
                );
                return;
            }

            this.readSettings();
            this.saveSettings();

            let questions =
                this.prepareQuestions(
                    this.state.questions
                );

            if (questions.length === 0) {
                this.showMessage(
                    "No questions are available for the selected settings.",
                    "warning"
                );
                return;
            }

            if (
                this.state.settings.questionCount > 0 &&
                this.state.settings.questionCount <
                    questions.length
            ) {
                questions =
                    questions.slice(
                        0,
                        this.state.settings.questionCount
                    );
            }

            const examData = {
                questions: questions,

                settings: {
                    ...this.state.settings
                },

                createdAt:
                    new Date().toISOString(),

                status: "running"
            };

            try {

                if (
                    typeof StorageManager !==
                        "undefined" &&
                    typeof StorageManager.saveExam ===
                        "function"
                ) {

                    StorageManager.saveExam(
                        examData
                    );

                } else {

                    sessionStorage.setItem(
                        "gate_current_exam",
                        JSON.stringify(examData)
                    );
                }

            } catch (error) {

                console.error(
                    "Unable to save exam:",
                    error
                );

                this.showMessage(
                    "Unable to create the test session.",
                    "error"
                );

                return;
            }

            window.location.href =
                "test.html";
        },

        /* ---------------------------------------------------
           Prepare Questions
           --------------------------------------------------- */

        prepareQuestions(questions) {

            if (!Array.isArray(questions)) {
                return [];
            }

            let result =
                questions.map((question) => ({
                    ...question
                }));

            /* Section Filter */

            if (
                this.state.settings.section ===
                "aptitude"
            ) {

                result = result.filter(
                    (question) => {
                        const section =
                            String(
                                question.section ||
                                ""
                            ).toLowerCase();

                        return (
                            section === "ga" ||
                            section === "aptitude" ||
                            section ===
                                "general aptitude"
                        );
                    }
                );

            } else if (
                this.state.settings.section ===
                "mechanical"
            ) {

                result = result.filter(
                    (question) => {
                        const section =
                            String(
                                question.section ||
                                ""
                            ).toLowerCase();

                        return (
                            section === "me" ||
                            section ===
                                "mechanical" ||
                            section ===
                                "mechanical engineering"
                        );
                    }
                );
            }

            /* Question Order */

            if (
                this.state.settings.order ===
                "shuffle"
            ) {
                result =
                    this.shuffleArray(
                        result
                    );
            }

            /* Option Order */

            if (
                this.state.settings.shuffleOptions
            ) {

                result =
                    result.map((question) => {

                        if (
                            !Array.isArray(
                                question.options
                            ) ||
                            question.options.length <
                                2
                        ) {
                            return question;
                        }

                        return {
                            ...question,
                            options:
                                this.shuffleArray(
                                    question.options
                                )
                        };
                    });
            }

            return result;
        },

        /* ---------------------------------------------------
           Shuffle
           --------------------------------------------------- */

        shuffleArray(array) {

            const result =
                Array.isArray(array)
                    ? [...array]
                    : [];

            for (
                let i = result.length - 1;
                i > 0;
                i--
            ) {

                const j =
                    Math.floor(
                        Math.random() *
                            (i + 1)
                    );

                [
                    result[i],
                    result[j]
                ] = [
                    result[j],
                    result[i]
                ];
            }

            return result;
        },

        /* ---------------------------------------------------
           Update UI
           --------------------------------------------------- */

        updateUI() {

            if (!this.elements.startTestBtn) {
                return;
            }

            const disabled =
                this.state.isProcessing ||
                !this.state.isReady;

            this.elements.startTestBtn.disabled =
                disabled;

            if (disabled) {
                this.elements.startTestBtn.classList.add(
                    "disabled"
                );
            } else {
                this.elements.startTestBtn.classList.remove(
                    "disabled"
                );
            }
        },

        /* ---------------------------------------------------
           Processing UI
           --------------------------------------------------- */

        showProcessing(text) {

            if (this.elements.processingCard) {
                this.elements.processingCard.style.display =
                    "block";
            }

            this.updateProcessing(
                text,
                0
            );
        },

        updateProcessing(text, progress) {

            if (this.elements.processingText) {
                this.elements.processingText.textContent =
                    text;
            }

            if (this.elements.processingProgress) {

                const value =
                    Math.max(
                        0,
                        Math.min(
                            100,
                            Number(progress) || 0
                        )
                    );

                this.elements.processingProgress.style.width =
                    `${value}%`;
            }
        },

        hideProcessing() {

            if (this.elements.processingCard) {
                this.elements.processingCard.style.display =
                    "none";
            }
        },

        /* ---------------------------------------------------
           Message
           --------------------------------------------------- */

        showMessage(message, type = "info") {

            if (!this.elements.messageCard) {
                return;
            }

            this.elements.messageCard.style.display =
                "block";

            this.elements.messageCard.className =
                `message-card ${type}`;

            if (this.elements.messageText) {
                this.elements.messageText.textContent =
                    message;
            }
        },

        /* ---------------------------------------------------
           Utilities
           --------------------------------------------------- */

        formatFileSize(bytes) {

            if (!Number.isFinite(bytes)) {
                return "0 KB";
            }

            if (bytes < 1024) {
                return `${bytes} B`;
            }

            if (bytes < 1024 * 1024) {
                return `${(
                    bytes / 1024
                ).toFixed(1)} KB`;
            }

            return `${(
                bytes /
                (1024 * 1024)
            ).toFixed(2)} MB`;
        },

        escapeHTML(value) {

            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    };

    /* -------------------------------------------------------
       Expose Application
       ------------------------------------------------------- */

    window.GATEApp = GATEApp;

    /* -------------------------------------------------------
       Start Application
       ------------------------------------------------------- */

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            GATEApp.init();
        }
    );

})();
