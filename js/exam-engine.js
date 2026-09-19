/* =========================================================
   GATE TEST SERIES
   File: js/exam-engine.js

   Purpose:
   - Control complete exam flow
   - Load current exam
   - Display questions
   - Handle MCQ / MSQ / NAT
   - Save answers
   - Mark for review
   - Clear response
   - Previous / Next navigation
   - Auto-save progress
   - Auto-submit on timer expiry
   - Connect Timer / Palette / Calculator / Scoring
   ========================================================= */

(function () {
    "use strict";

    const ExamEngine = {

        VERSION: "1.0.0",

        exam: null,

        questions: [],

        currentIndex: 0,

        answers: {},

        visited: {},

        markedForReview: {},

        cleared: {},

        startTime: null,

        lastSaveTime: 0,

        initialized: false,

        submitted: false,

        autoSaveInterval: null,


        /* -------------------------------------------------
           DOM cache
           ------------------------------------------------- */

        elements: {},


        cacheElements: function () {

            const ids = [
                "questionNumber",
                "questionType",
                "questionSection",
                "questionMarks",
                "questionText",
                "questionFigure",
                "optionsContainer",
                "natContainer",
                "natAnswer",
                "currentQuestion",
                "totalQuestions",
                "progressFill",
                "prevBtn",
                "saveNextBtn",
                "clearBtn",
                "reviewBtn",
                "questionPalette",
                "answeredCount",
                "reviewCount",
                "unansweredCount",
                "examSubmitBtn",
                "topSubmitBtn",
                "confirmSubmitModal",
                "timeUpModal"
            ];


            ids.forEach(function (id) {

                const element =
                    document.getElementById(id);

                if (element) {
                    this.elements[id] =
                        element;
                }

            }, this);


            this.elements.questionText =
                this.elements.questionText ||
                document.querySelector(
                    "[data-question-text]"
                );

            this.elements.optionsContainer =
                this.elements.optionsContainer ||
                document.querySelector(
                    "#options"
                ) ||
                document.querySelector(
                    ".options-container"
                );

            this.elements.questionFigure =
                this.elements.questionFigure ||
                document.querySelector(
                    "#figure"
                ) ||
                document.querySelector(
                    ".question-figure"
                );

            this.elements.questionPalette =
                this.elements.questionPalette ||
                document.querySelector(
                    ".question-palette"
                );
        },


        /* -------------------------------------------------
           Read exam from storage
           ------------------------------------------------- */

        loadExam: function () {

            let exam = null;


            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.getExam === "function"
                ) {

                    exam =
                        StorageManager.getExam();
                }

            } catch (error) {

                console.warn(
                    "Unable to load exam from StorageManager:",
                    error
                );
            }


            /* sessionStorage fallback */

            if (!exam) {

                try {

                    const raw =
                        sessionStorage.getItem(
                            "gate_current_exam"
                        );

                    if (raw) {
                        exam =
                            JSON.parse(raw);
                    }

                } catch (error) {

                    console.warn(
                        "Unable to read current exam:",
                        error
                    );
                }
            }


            return exam;
        },


        /* -------------------------------------------------
           Normalize exam object
           ------------------------------------------------- */

        normalizeExam: function (exam) {

            if (!exam) {
                return null;
            }


            let questions =
                Array.isArray(exam.questions)
                    ? exam.questions
                    : [];


            /* Some versions may store questions as data */

            if (
                !questions.length &&
                Array.isArray(exam.questionBank)
            ) {

                questions =
                    exam.questionBank;
            }


            questions =
                questions.filter(function (question) {

                    return (
                        question &&
                        (
                            question.question ||
                            question.text
                        )
                    );

                });


            return {

                id:
                    exam.id ||
                    "exam_" +
                    Date.now(),

                title:
                    exam.title ||
                    exam.name ||
                    "GATE Mechanical Test",

                questions:
                    questions,

                settings:
                    exam.settings ||
                    {},

                startedAt:
                    exam.startedAt ||
                    new Date().toISOString(),

                duration:
                    Number(
                        exam.duration ||
                        (
                            exam.settings &&
                            exam.settings.duration
                        ) ||
                        180
                    ),

                candidate:
                    exam.candidate ||
                    {},

                currentIndex:
                    Number(
                        exam.currentIndex || 0
                    ),

                answers:
                    exam.answers || {},

                visited:
                    exam.visited || {},

                markedForReview:
                    exam.markedForReview || {},

                cleared:
                    exam.cleared || {},

                submitted:
                    Boolean(exam.submitted)
            };
        },


        /* -------------------------------------------------
           Initialize
           ------------------------------------------------- */

        init: function () {

            if (this.initialized) {
                return this;
            }


            this.cacheElements();


            const exam =
                this.loadExam();


            if (!exam) {

                console.warn(
                    "No active exam found."
                );

                this.showNoExamMessage();

                return this;
            }


            this.exam =
                this.normalizeExam(
                    exam
                );


            this.questions =
                this.exam.questions || [];


            if (!this.questions.length) {

                console.warn(
                    "Current exam contains no questions."
                );

                this.showNoExamMessage();

                return this;
            }


            this.restoreProgress();


            this.bindEvents();


            this.startAutoSave();


            this.initialized = true;


            this.renderCurrentQuestion();


            return this;
        },


        /* -------------------------------------------------
           Restore saved progress
           ------------------------------------------------- */

        restoreProgress: function () {

            const exam =
                this.exam;


            this.currentIndex =
                Math.max(
                    0,
                    Math.min(
                        Number(
                            exam.currentIndex || 0
                        ),
                        this.questions.length - 1
                    )
                );


            this.answers =
                exam.answers &&
                typeof exam.answers === "object"
                    ? exam.answers
                    : {};


            this.visited =
                exam.visited &&
                typeof exam.visited === "object"
                    ? exam.visited
                    : {};


            this.markedForReview =
                exam.markedForReview &&
                typeof exam.markedForReview === "object"
                    ? exam.markedForReview
                    : {};


            this.cleared =
                exam.cleared &&
                typeof exam.cleared === "object"
                    ? exam.cleared
                    : {};


            this.submitted =
                Boolean(exam.submitted);


            this.startTime =
                exam.startedAt
                    ? new Date(exam.startedAt)
                    : new Date();


            this.saveProgress();
        },


        /* -------------------------------------------------
           Event bindings
           ------------------------------------------------- */

        bindEvents: function () {

            const self = this;


            /* Previous */

            if (this.elements.prevBtn) {

                this.elements.prevBtn.addEventListener(
                    "click",
                    function () {
                        self.previousQuestion();
                    }
                );
            }


            /* Save and next */

            if (this.elements.saveNextBtn) {

                this.elements.saveNextBtn.addEventListener(
                    "click",
                    function () {
                        self.saveAndNext();
                    }
                );
            }


            /* Clear */

            if (this.elements.clearBtn) {

                this.elements.clearBtn.addEventListener(
                    "click",
                    function () {
                        self.clearResponse();
                    }
                );
            }


            /* Review */

            if (this.elements.reviewBtn) {

                this.elements.reviewBtn.addEventListener(
                    "click",
                    function () {
                        self.toggleReview();
                    }
                );
            }


            /* Submit */

            if (this.elements.examSubmitBtn) {

                this.elements.examSubmitBtn.addEventListener(
                    "click",
                    function () {
                        self.requestSubmit();
                    }
                );
            }


            if (this.elements.topSubmitBtn) {

                this.elements.topSubmitBtn.addEventListener(
                    "click",
                    function () {
                        self.requestSubmit();
                    }
                );
            }


            /* NAT input */

            if (this.elements.natAnswer) {

                this.elements.natAnswer.addEventListener(
                    "input",
                    function () {
                        self.handleNATInput(
                            this.value
                        );
                    }
                );
            }


            /* Browser protection against accidental leave */

            window.addEventListener(
                "beforeunload",
                function (event) {

                    if (
                        !self.submitted &&
                        self.questions.length
                    ) {

                        self.saveProgress();

                        event.preventDefault();

                        event.returnValue = "";
                    }
                }
            );


            /* Keyboard navigation */

            document.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.target &&
                        (
                            event.target.tagName ===
                            "INPUT" ||
                            event.target.tagName ===
                            "TEXTAREA"
                        )
                    ) {
                        return;
                    }


                    if (event.key === "ArrowLeft") {

                        self.previousQuestion();

                    } else if (
                        event.key === "ArrowRight"
                    ) {

                        self.saveAndNext();
                    }
                }
            );
        },


        /* -------------------------------------------------
           Current question
           ------------------------------------------------- */

        getCurrentQuestion: function () {

            return this.questions[
                this.currentIndex
            ] || null;
        },


        /* -------------------------------------------------
           Render question
           ------------------------------------------------- */

        renderCurrentQuestion: function () {

            const question =
                this.getCurrentQuestion();


            if (!question) {
                return;
            }


            this.visited[
                this.getQuestionId(
                    question,
                    this.currentIndex
                )
            ] = true;


            this.renderQuestionHeader(
                question
            );


            this.renderQuestionText(
                question
            );


            this.renderFigure(
                question
            );


            this.renderOptions(
                question
            );


            this.renderNAT(
                question
            );


            this.updateNavigation();


            this.updateSummary();


            this.updatePalette();


            this.saveProgress();
        },


        /* -------------------------------------------------
           Question ID
           ------------------------------------------------- */

        getQuestionId: function (
            question,
            index
        ) {

            return String(
                question.id ||
                question.examNumber ||
                question.number ||
                index + 1
            );
        },


        /* -------------------------------------------------
           Header
           ------------------------------------------------- */

        renderQuestionHeader: function (
            question
        ) {

            const number =
                question.examNumber ||
                this.currentIndex + 1;


            this.setText(
                this.elements.questionNumber,
                "Question " + number
            );


            this.setText(
                this.elements.currentQuestion,
                number
            );


            this.setText(
                this.elements.totalQuestions,
                this.questions.length
            );


            this.setText(
                this.elements.questionType,
                question.type || "MCQ"
            );


            this.setText(
                this.elements.questionSection,
                this.getSectionName(
                    question.section
                )
            );


            const marks =
                Number(question.marks);


            const negative =
                Number(
                    question.negativeMarks
                );


            let marksText = "";


            if (Number.isFinite(marks)) {

                marksText =
                    "+" +
                    this.formatNumber(
                        marks
                    );
            }


            if (
                Number.isFinite(negative) &&
                negative > 0
            ) {

                marksText +=
                    " / -" +
                    this.formatNumber(
                        negative
                    );
            }


            this.setText(
                this.elements.questionMarks,
                marksText
            );
        },


        getSectionName: function (
            section
        ) {

            if (section === "GA") {
                return "General Aptitude";
            }

            if (section === "ME") {
                return "Mechanical Engineering";
            }

            return section ||
                "General";
        },


        /* -------------------------------------------------
           Question text
           ------------------------------------------------- */

        renderQuestionText: function (
            question
        ) {

            const element =
                this.elements.questionText;


            if (!element) {
                return;
            }


            const text =
                question.question ||
                question.text ||
                "";


            element.innerHTML =
                this.safeHTML(
                    text
                );
        },


        /* -------------------------------------------------
           Figure
           ------------------------------------------------- */

        renderFigure: function (
            question
        ) {

            const container =
                this.elements.questionFigure;


            if (!container) {
                return;
            }


            container.innerHTML = "";


            let source =
                question.figure ||
                question.image ||
                question.imageData ||
                null;


            if (!source) {

                if (
                    Array.isArray(
                        question.figures
                    ) &&
                    question.figures.length
                ) {

                    source =
                        question.figures[0];
                }
            }


            if (
                source &&
                typeof source === "object"
            ) {

                source =
                    source.src ||
                    source.url ||
                    source.data ||
                    source.image ||
                    null;
            }


            if (!source) {
                container.style.display =
                    "none";

                return;
            }


            const image =
                document.createElement("img");


            image.src =
                source;


            image.alt =
                "Question figure";


            image.className =
                "question-figure-image";


            image.loading =
                "lazy";


            image.decoding =
                "async";


            image.onerror =
                function () {

                    container.style.display =
                        "none";
                };


            container.appendChild(
                image
            );


            container.style.display =
                "";
        },


        /* -------------------------------------------------
           Render MCQ / MSQ
           ------------------------------------------------- */

        renderOptions: function (
            question
        ) {

            const container =
                this.elements.optionsContainer;


            if (!container) {
                return;
            }


            container.innerHTML = "";


            if (
                question.type === "NAT"
            ) {

                container.style.display =
                    "none";

                return;
            }


            container.style.display =
                "";


            const options =
                Array.isArray(
                    question.options
                )
                    ? question.options
                    : [];


            if (!options.length) {

                const message =
                    document.createElement(
                        "div"
                    );

                message.className =
                    "alert alert-warning";

                message.textContent =
                    "Options are not available for this question.";

                container.appendChild(
                    message
                );

                return;
            }


            const currentAnswer =
                this.getAnswer(
                    question
                );


            const isMSQ =
                question.type === "MSQ";


            options.forEach(
                function (
                    option,
                    index
                ) {

                    const label =
                        option.label ||
                        String.fromCharCode(
                            65 + index
                        );


                    const wrapper =
                        document.createElement(
                            "label"
                        );


                    wrapper.className =
                        "option-item";


                    const input =
                        document.createElement(
                            "input"
                        );


                    input.type =
                        isMSQ
                            ? "checkbox"
                            : "radio";


                    input.name =
                        "question_" +
                        this.getQuestionId(
                            question,
                            this.currentIndex
                        );


                    input.value =
                        label;


                    input.dataset.option =
                        label;


                    input.checked =
                        this.isOptionSelected(
                            currentAnswer,
                            label
                        );


                    const optionLabel =
                        document.createElement(
                            "span"
                        );


                    optionLabel.className =
                        "option-label";


                    optionLabel.textContent =
                        label;


                    const optionText =
                        document.createElement(
                            "span"
                        );


                    optionText.className =
                        "option-text";


                    if (
                        option &&
                        option.html
                    ) {

                        optionText.innerHTML =
                            option.html;

                    } else {

                        optionText.innerHTML =
                            this.safeHTML(
                                option &&
                                option.text
                                    ? option.text
                                    : ""
                            );
                    }


                    wrapper.appendChild(
                        input
                    );

                    wrapper.appendChild(
                        optionLabel
                    );

                    wrapper.appendChild(
                        optionText
                    );


                    input.addEventListener(
                        "change",
                        function () {

                            this.handleOptionChange(
                                question,
                                label,
                                isMSQ,
                                input.checked
                            );

                        }.bind(this)
                    );


                    container.appendChild(
                        wrapper
                    );

                }.bind(this)
            );
        },


        /* -------------------------------------------------
           Option selected check
           ------------------------------------------------- */

        isOptionSelected: function (
            answer,
            label
        ) {

            if (!answer) {
                return false;
            }


            if (Array.isArray(answer)) {

                return answer.includes(
                    String(label)
                        .toUpperCase()
                );
            }


            return String(answer)
                .toUpperCase() ===
                String(label)
                    .toUpperCase();
        },


        /* -------------------------------------------------
           Handle MCQ / MSQ answer
           ------------------------------------------------- */

        handleOptionChange: function (
            question,
            label,
            isMSQ,
            checked
        ) {

            const id =
                this.getQuestionId(
                    question,
                    this.currentIndex
                );


            if (isMSQ) {

                let current =
                    this.answers[id];


                if (!Array.isArray(current)) {
                    current = [];
                }


                current =
                    current
                        .map(function (value) {
                            return String(value)
                                .toUpperCase();
                        });


                if (checked) {

                    if (
                        !current.includes(
                            String(label)
                                .toUpperCase()
                        )
                    ) {

                        current.push(
                            String(label)
                                .toUpperCase()
                        );
                    }

                } else {

                    current =
                        current.filter(
                            function (value) {

                                return value !==
                                    String(label)
                                        .toUpperCase();

                            }
                        );
                }


                current.sort();


                if (current.length) {

                    this.answers[id] =
                        current;

                    delete this.cleared[id];

                } else {

                    delete this.answers[id];

                    this.cleared[id] = true;
                }

            } else {

                if (checked) {

                    this.answers[id] =
                        String(label)
                            .toUpperCase();

                    delete this.cleared[id];

                } else {

                    delete this.answers[id];
                    this.cleared[id] = true;
                }
            }


            this.saveProgress();
            this.updateSummary();
            this.updatePalette();
        },


        /* -------------------------------------------------
           NAT
           ------------------------------------------------- */

        renderNAT: function (
            question
        ) {

            const container =
                this.elements.natContainer;


            const input =
                this.elements.natAnswer;


            const isNAT =
                question.type === "NAT";


            if (container) {

                container.style.display =
                    isNAT
                        ? ""
                        : "none";
            }


            if (!input) {
                return;
            }


            if (!isNAT) {

                input.value = "";

                return;
            }


            const id =
                this.getQuestionId(
                    question,
                    this.currentIndex
                );


            const answer =
                this.answers[id];


            input.value =
                answer != null
                    ? String(answer)
                    : "";


            input.placeholder =
                "Enter numerical answer";


            input.autocomplete =
                "off";


            input.inputMode =
                "decimal";
        },


        handleNATInput: function (
            value
        ) {

            const question =
                this.getCurrentQuestion();


            if (!question) {
                return;
            }


            const id =
                this.getQuestionId(
                    question,
                    this.currentIndex
                );


            const cleaned =
                String(value)
                    .trim();


            if (!cleaned) {

                delete this.answers[id];

                this.cleared[id] = true;

            } else {

                this.answers[id] =
                    cleaned;

                delete this.cleared[id];
            }


            this.saveProgress();
            this.updateSummary();
            this.updatePalette();
        },


        /* -------------------------------------------------
           Get answer
           ------------------------------------------------- */

        getAnswer: function (
            question
        ) {

            const id =
                this.getQuestionId(
                    question,
                    this.currentIndex
                );


            return this.answers[id];
        },


        /* -------------------------------------------------
           Check answered
           ------------------------------------------------- */

        isAnswered: function (
            question
        ) {

            if (!question) {
                return false;
            }


            const id =
                this.getQuestionId(
                    question,
                    this.currentIndex
                );


            const answer =
                this.answers[id];


            if (
                answer === null ||
                answer === undefined
            ) {
                return false;
            }


            if (
                Array.isArray(answer)
            ) {
                return answer.length > 0;
            }


            return String(answer)
                .trim()
                .length > 0;
        },


        /* -------------------------------------------------
           Clear current response
           ------------------------------------------------- */

        clearResponse: function () {

            const question =
                this.getCurrentQuestion();


            if (!question) {
                return;
            }


            const id =
                this.getQuestionId(
                    question,
                    this.currentIndex
                );


            delete this.answers[id];

            this.cleared[id] = true;


            this.renderCurrentQuestion();
        },


        /* -------------------------------------------------
           Toggle review
           ------------------------------------------------- */

        toggleReview: function () {

            const question =
                this.getCurrentQuestion();


            if (!question) {
                return;
            }


            const id =
                this.getQuestionId(
                    question,
                    this.currentIndex
                );


            if (
                this.markedForReview[id]
            ) {

                delete this.markedForReview[id];

            } else {

                this.markedForReview[id] =
                    true;
            }


            this.updateReviewButton();

            this.updatePalette();

            this.updateSummary();

            this.saveProgress();
        },


        updateReviewButton: function () {

            const button =
                this.elements.reviewBtn;


            if (!button) {
                return;
            }


            const question =
                this.getCurrentQuestion();


            if (!question) {
                return;
            }


            const id =
                this.getQuestionId(
                    question,
                    this.currentIndex
                );


            const active =
                Boolean(
                    this.markedForReview[id]
                );


            button.classList.toggle(
                "active",
                active
            );


            button.classList.toggle(
                "review-active",
                active
            );


            const text =
                button.querySelector(
                    ".review-text"
                );


            if (text) {

                text.textContent =
                    active
                        ? "Unmark Review"
                        : "Mark for Review";
            }
        },


        /* -------------------------------------------------
           Previous
           ------------------------------------------------- */

        previousQuestion: function () {

            if (
                this.currentIndex <= 0
            ) {

                return;
            }


            this.saveCurrentResponse();

            this.currentIndex--;

            this.renderCurrentQuestion();
        },


        /* -------------------------------------------------
           Next
           ------------------------------------------------- */

        nextQuestion: function () {

            if (
                this.currentIndex >=
                this.questions.length - 1
            ) {

                this.updateSummary();

                return;
            }


            this.saveCurrentResponse();

            this.currentIndex++;

            this.renderCurrentQuestion();
        },


        /* -------------------------------------------------
           Save and next
           ------------------------------------------------- */

        saveAndNext: function () {

            this.saveCurrentResponse();


            if (
                this.currentIndex <
                this.questions.length - 1
            ) {

                this.currentIndex++;

                this.renderCurrentQuestion();

            } else {

                this.updateSummary();

                this.requestSubmit();
            }
        },


        /* -------------------------------------------------
           Save current response
           ------------------------------------------------- */

        saveCurrentResponse: function () {

            const question =
                this.getCurrentQuestion();


            if (!question) {
                return;
            }


            if (
                question.type === "NAT" &&
                this.elements.natAnswer
            ) {

                const value =
                    this.elements.natAnswer.value
                        .trim();


                const id =
                    this.getQuestionId(
                        question,
                        this.currentIndex
                    );


                if (value) {

                    this.answers[id] =
                        value;

                    delete this.cleared[id];

                } else {

                    delete this.answers[id];
                }
            }


            this.saveProgress();
        },


        /* -------------------------------------------------
           Navigation UI
           ------------------------------------------------- */

        updateNavigation: function () {

            if (this.elements.prevBtn) {

                this.elements.prevBtn.disabled =
                    this.currentIndex <= 0;
            }


            if (this.elements.saveNextBtn) {

                this.elements.saveNextBtn.textContent =
                    this.currentIndex >=
                    this.questions.length - 1
                        ? "Finish"
                        : "Save & Next";
            }


            const progress =
                (
                    (
                        this.currentIndex + 1
                    ) /
                    this.questions.length
                ) * 100;


            if (this.elements.progressFill) {

                this.elements.progressFill.style.width =
                    Math.min(
                        100,
                        Math.max(
                            0,
                            progress
                        )
                    ) + "%";
            }


            this.updateReviewButton();
        },


        /* -------------------------------------------------
           Palette
           ------------------------------------------------- */

        updatePalette: function () {

            if (
                window.Palette &&
                typeof Palette.render === "function"
            ) {

                try {

                    Palette.render(
                        this.questions,
                        {
                            currentIndex:
                                this.currentIndex,

                            answers:
                                this.answers,

                            visited:
                                this.visited,

                            markedForReview:
                                this.markedForReview,

                            onSelect:
                                function (index) {
                                    this.goToQuestion(
                                        index
                                    );
                                }.bind(this)
                        }
                    );

                    return;

                } catch (error) {

                    console.warn(
                        "Palette rendering failed:",
                        error
                    );
                }
            }


            this.renderBasicPalette();
        },


        renderBasicPalette: function () {

            const container =
                this.elements.questionPalette;


            if (!container) {
                return;
            }


            container.innerHTML = "";


            this.questions.forEach(
                function (
                    question,
                    index
                ) {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.className =
                        "palette-btn";


                    const id =
                        this.getQuestionId(
                            question,
                            index
                        );


                    if (
                        this.isAnswered(
                            question
                        )
                    ) {

                        button.classList.add(
                            "answered"
                        );
                    }


                    if (
                        this.markedForReview[id]
                    ) {

                        button.classList.add(
                            "review"
                        );
                    }


                    if (
                        index ===
                        this.currentIndex
                    ) {

                        button.classList.add(
                            "current"
                        );
                    }


                    button.textContent =
                        index + 1;


                    button.addEventListener(
                        "click",
                        function () {

                            this.goToQuestion(
                                index
                            );

                        }.bind(this)
                    );


                    container.appendChild(
                        button
                    );

                }.bind(this)
            );
        },


        goToQuestion: function (
            index
        ) {

            const target =
                Number(index);


            if (
                !Number.isInteger(target) ||
                target < 0 ||
                target >= this.questions.length
            ) {
                return;
            }


            this.saveCurrentResponse();

            this.currentIndex =
                target;

            this.renderCurrentQuestion();
        },


        /* -------------------------------------------------
           Summary
           ------------------------------------------------- */

        getSummary: function () {

            let answered = 0;
            let review = 0;
            let unanswered = 0;


            this.questions.forEach(
                function (question) {

                    const id =
                        this.getQuestionId(
                            question,
                            this.questions.indexOf(
                                question
                            )
                        );


                    if (
                        this.isQuestionAnsweredById(
                            id
                        )
                    ) {

                        answered++;

                    } else {

                        unanswered++;
                    }


                    if (
                        this.markedForReview[id]
                    ) {
                        review++;
                    }
                }.bind(this)
            );


            return {
                total:
                    this.questions.length,

                answered:
                    answered,

                unanswered:
                    unanswered,

                review:
                    review
            };
        },


        isQuestionAnsweredById: function (
            id
        ) {

            const answer =
                this.answers[id];


            if (
                answer === undefined ||
                answer === null
            ) {
                return false;
            }


            if (Array.isArray(answer)) {
                return answer.length > 0;
            }


            return String(answer)
                .trim()
                .length > 0;
        },


        updateSummary: function () {

            const summary =
                this.getSummary();


            this.setText(
                this.elements.answeredCount,
                summary.answered
            );


            this.setText(
                this.elements.reviewCount,
                summary.review
            );


            this.setText(
                this.elements.unansweredCount,
                summary.unanswered
            );
        },


        /* -------------------------------------------------
           Save progress
           ------------------------------------------------- */

        saveProgress: function () {

            if (!this.exam) {
                return false;
            }


            this.exam.currentIndex =
                this.currentIndex;


            this.exam.answers =
                this.answers;


            this.exam.visited =
                this.visited;


            this.exam.markedForReview =
                this.markedForReview;


            this.exam.cleared =
                this.cleared;


            this.exam.updatedAt =
                new Date().toISOString();


            this.lastSaveTime =
                Date.now();


            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.saveExam === "function"
                ) {

                    StorageManager.saveExam(
                        this.exam
                    );

                    return true;
                }

            } catch (error) {

                console.warn(
                    "StorageManager save failed:",
                    error
                );
            }


            try {

                sessionStorage.setItem(
                    "gate_current_exam",
                    JSON.stringify(
                        this.exam
                    )
                );

                return true;

            } catch (error) {

                console.error(
                    "Unable to save exam progress:",
                    error
                );

                return false;
            }
        },


        /* -------------------------------------------------
           Auto-save
           ------------------------------------------------- */

        startAutoSave: function () {

            this.stopAutoSave();


            this.autoSaveInterval =
                setInterval(
                    function () {

                        if (
                            !this.submitted
                        ) {

                            this.saveProgress();
                        }

                    }.bind(this),

                    5000
                );
        },


        stopAutoSave: function () {

            if (
                this.autoSaveInterval
            ) {

                clearInterval(
                    this.autoSaveInterval
                );

                this.autoSaveInterval =
                    null;
            }
        },


        /* -------------------------------------------------
           Submit confirmation
           ------------------------------------------------- */

        requestSubmit: function () {

            if (this.submitted) {
                return;
            }


            this.saveCurrentResponse();


            const summary =
                this.getSummary();


            const unanswered =
                summary.unanswered;


            const modal =
                this.elements.confirmSubmitModal;


            if (!modal) {

                const confirmed =
                    window.confirm(
                        unanswered > 0
                            ? "You have " +
                              unanswered +
                              " unanswered question(s). Submit test?"
                            : "Submit test?"
                    );


                if (confirmed) {
                    this.submitExam(
                        false
                    );
                }

                return;
            }


            const message =
                modal.querySelector(
                    "[data-submit-message]"
                ) ||
                modal.querySelector(
                    ".submit-message"
                );


            if (message) {

                message.textContent =
                    unanswered > 0
                        ? "You have " +
                          unanswered +
                          " unanswered question(s). Are you sure you want to submit?"
                        : "Are you sure you want to submit the test?";
            }


            const confirmButton =
                modal.querySelector(
                    "[data-confirm-submit]"
                ) ||
                modal.querySelector(
                    ".confirm-submit"
                );


            const cancelButton =
                modal.querySelector(
                    "[data-cancel-submit]"
                ) ||
                modal.querySelector(
                    ".cancel-submit"
                );


            if (confirmButton) {

                confirmButton.onclick =
                    function () {

                        this.closeModal(
                            modal
                        );

                        this.submitExam(
                            false
                        );

                    }.bind(this);
            }


            if (cancelButton) {

                cancelButton.onclick =
                    function () {

                        this.closeModal(
                            modal
                        );

                    }.bind(this);
            }


            this.openModal(
                modal
            );
        },


        /* -------------------------------------------------
           Time up
           ------------------------------------------------- */

        handleTimeUp: function () {

            if (this.submitted) {
                return;
            }


            this.saveCurrentResponse();


            const modal =
                this.elements.timeUpModal;


            if (!modal) {

                this.submitExam(
                    true
                );

                return;
            }


            const button =
                modal.querySelector(
                    "[data-timeup-submit]"
                ) ||
                modal.querySelector(
                    ".timeup-submit"
                );


            if (button) {

                button.onclick =
                    function () {

                        this.closeModal(
                            modal
                        );

                        this.submitExam(
                            true
                        );

                    }.bind(this);
            }


            this.openModal(
                modal
            );
        },


        /* -------------------------------------------------
           Submit exam
           ------------------------------------------------- */

        submitExam: function (
            timeUp
        ) {

            if (this.submitted) {
                return;
            }


            this.saveCurrentResponse();


            this.submitted = true;


            this.stopAutoSave();


            this.exam.submitted =
                true;


            this.exam.timeUp =
                Boolean(timeUp);


            this.exam.submittedAt =
                new Date().toISOString();


            this.exam.finalAnswers =
                Object.assign(
                    {},
                    this.answers
                );


            this.exam.finalVisited =
                Object.assign(
                    {},
                    this.visited
                );


            this.exam.finalMarkedForReview =
                Object.assign(
                    {},
                    this.markedForReview
                );


            let result = null;


            /* Use scoring engine */

            try {

                if (
                    window.Scoring &&
                    typeof Scoring.calculate === "function"
                ) {

                    result =
                        Scoring.calculate(
                            this.questions,
                            this.answers,
                            this.exam.settings
                        );

                } else if (
                    window.ScoringEngine &&
                    typeof ScoringEngine.calculate === "function"
                ) {

                    result =
                        ScoringEngine.calculate(
                            this.questions,
                            this.answers,
                            this.exam.settings
                        );
                }

            } catch (error) {

                console.error(
                    "Scoring failed:",
                    error
                );
            }


            if (!result) {

                result =
                    this.basicScore();
            }


            result.examId =
                this.exam.id;


            result.title =
                this.exam.title;


            result.answers =
                this.answers;


            result.questions =
                this.questions;


            result.submittedAt =
                this.exam.submittedAt;


            result.timeUp =
                Boolean(timeUp);


            result.exam =
                this.exam;


            this.exam.result =
                result;


            /* Save exam */

            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.saveExam === "function"
                ) {

                    StorageManager.saveExam(
                        this.exam
                    );
                }

            } catch (error) {

                console.warn(
                    "Unable to save final exam:",
                    error
                );
            }


            /* Save result */

            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.saveResult === "function"
                ) {

                    StorageManager.saveResult(
                        result
                    );
                }

            } catch (error) {

                console.warn(
                    "Unable to save result:",
                    error
                );
            }


            /* Save history */

            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.saveHistory === "function"
                ) {

                    StorageManager.saveHistory(
                        result
                    );
                }

            } catch (error) {

                console.warn(
                    "Unable to save history:",
                    error
                );
            }


            /* Session fallback */

            try {

                sessionStorage.setItem(
                    "gate_last_result",
                    JSON.stringify(
                        result
                    )
                );

                sessionStorage.setItem(
                    "gate_current_exam",
                    JSON.stringify(
                        this.exam
                    )
                );

            } catch (error) {
                console.warn(
                    "Session result save failed:",
                    error
                );
            }


            /* Redirect */

            setTimeout(
                function () {

                    window.location.href =
                        "result.html";

                },
                250
            );
        },


        /* -------------------------------------------------
           Basic scoring fallback
           ------------------------------------------------- */

        basicScore: function () {

            let score = 0;
            let correct = 0;
            let incorrect = 0;
            let unanswered = 0;


            const details = [];


            this.questions.forEach(
                function (
                    question,
                    index
                ) {

                    const id =
                        this.getQuestionId(
                            question,
                            index
                        );


                    const userAnswer =
                        this.answers[id];


                    const answered =
                        this.isQuestionAnsweredById(
                            id
                        );


                    let status =
                        "unanswered";

                    let marks =
                        0;


                    if (!answered) {

                        unanswered++;

                    } else {

                        const correctAnswer =
                            question.answer;


                        let isCorrect =
                            false;


                        if (
                            question.type === "MSQ"
                        ) {

                            const user =
                                Array.isArray(
                                    userAnswer
                                )
                                    ? userAnswer
                                        .map(function (x) {
                                            return String(x)
                                                .toUpperCase();
                                        })
                                        .sort()
                                    : [];


                            const correct =
                                Array.isArray(
                                    correctAnswer
                                )
                                    ? correctAnswer
                                        .map(function (x) {
                                            return String(x)
                                                .toUpperCase();
                                        })
                                        .sort()
                                    : [];


                            isCorrect =
                                JSON.stringify(
                                    user
                                ) ===
                                JSON.stringify(
                                    correct
                                );

                        } else if (
                            question.type === "NAT"
                        ) {

                            const value =
                                Number(
                                    userAnswer
                                );


                            if (
                                correctAnswer &&
                                typeof correctAnswer ===
                                "object"
                            ) {

                                const min =
                                    Number(
                                        correctAnswer.min
                                    );

                                const max =
                                    Number(
                                        correctAnswer.max
                                    );

                                if (
                                    Number.isFinite(min) &&
                                    Number.isFinite(max)
                                ) {

                                    isCorrect =
                                        value >= min &&
                                        value <= max;

                                } else {

                                    isCorrect =
                                        value ===
                                        Number(
                                            correctAnswer.value
                                        );
                                }

                            } else {

                                isCorrect =
                                    value ===
                                    Number(
                                        correctAnswer
                                    );
                            }

                        } else {

                            isCorrect =
                                String(
                                    userAnswer
                                ).toUpperCase() ===
                                String(
                                    correctAnswer
                                ).toUpperCase();
                        }


                        if (isCorrect) {

                            correct++;

                            status =
                                "correct";

                            marks =
                                Number(
                                    question.marks || 0
                                );

                            score += marks;

                        } else {

                            incorrect++;

                            status =
                                "incorrect";

                            marks =
                                -Number(
                                    question.negativeMarks || 0
                                );

                            score += marks;
                        }
                    }


                    details.push({

                        questionId:
                            id,

                        questionNumber:
                            question.examNumber ||
                            index + 1,

                        type:
                            question.type,

                        section:
                            question.section,

                        userAnswer:
                            userAnswer,

                        correctAnswer:
                            question.answer,

                        status:
                            status,

                        marks:
                            marks
                    });

                }.bind(this)
            );


            return {

                score:
                    Number(
                        score.toFixed(2)
                    ),

                totalQuestions:
                    this.questions.length,

                correct:
                    correct,

                incorrect:
                    incorrect,

                unanswered:
                    unanswered,

                attempted:
                    correct + incorrect,

                details:
                    details
            };
        },


        /* -------------------------------------------------
           Modal helpers
           ------------------------------------------------- */

        openModal: function (
            modal
        ) {

            if (!modal) {
                return;
            }


            modal.classList.add(
                "active"
            );


            modal.classList.add(
                "show"
            );


            modal.style.display =
                "flex";


            document.body.classList.add(
                "modal-open"
            );
        },


        closeModal: function (
            modal
        ) {

            if (!modal) {
                return;
            }


            modal.classList.remove(
                "active"
            );


            modal.classList.remove(
                "show"
            );


            modal.style.display =
                "none";


            document.body.classList.remove(
                "modal-open"
            );
        },


        /* -------------------------------------------------
           No exam message
           ------------------------------------------------- */

        showNoExamMessage: function () {

            const main =
                document.querySelector(
                    "main"
                ) ||
                document.body;


            const message =
                document.createElement(
                    "div"
                );


            message.className =
                "alert alert-warning";


            message.style.margin =
                "30px";


            message.innerHTML =
                "<strong>No active test found.</strong>" +
                "<br>Please return to the home page and start a test.";


            main.prepend(
                message
            );
        },


        /* -------------------------------------------------
           Utility
           ------------------------------------------------- */

        setText: function (
            element,
            value
        ) {

            if (!element) {
                return;
            }

            element.textContent =
                value == null
                    ? ""
                    : String(value);
        },


        formatNumber: function (
            value
        ) {

            const number =
                Number(value);


            if (!Number.isFinite(number)) {
                return "0";
            }


            return Number.isInteger(number)
                ? String(number)
                : String(
                    Number(
                        number.toFixed(2)
                    )
                );
        },


        safeHTML: function (
            text
        ) {

            if (text == null) {
                return "";
            }


            /*
             * PDF text may contain simple mathematical
             * formatting / line breaks.
             *
             * Do not execute arbitrary scripts.
             */

            const div =
                document.createElement(
                    "div"
                );


            div.textContent =
                String(text);


            let output =
                div.innerHTML;


            output =
                output.replace(
                    /\n/g,
                    "<br>"
                );


            return output;
        }
    };


    /* -----------------------------------------------------
       Expose globally
       ----------------------------------------------------- */

    window.ExamEngine =
        ExamEngine;


    /* -----------------------------------------------------
       Auto initialize only on test.html
       ----------------------------------------------------- */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            const isExamPage =
                document.body &&
                (
                    document.body.classList.contains(
                        "exam-page"
                    ) ||
                    window.location.pathname
                        .toLowerCase()
                        .endsWith(
                            "/test.html"
                        ) ||
                    window.location.pathname
                        .toLowerCase()
                        .endsWith(
                            "test.html"
                        )
                );


            if (isExamPage) {

                try {

                    ExamEngine.init();

                } catch (error) {

                    console.error(
                        "ExamEngine initialization error:",
                        error
                    );
                }
            }
        }
    );

})();
