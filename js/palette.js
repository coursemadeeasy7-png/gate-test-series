/* =========================================================
   GATE TEST SERIES
   File: js/palette.js

   Purpose:
   - GATE-style question palette
   - Answered / unanswered status
   - Marked for review
   - Current question
   - Navigation
   - Section filtering
   - Mobile-friendly palette
   ========================================================= */

(function () {
    "use strict";

    const Palette = {

        VERSION: "1.0.0",

        questions: [],

        currentIndex: 0,

        answers: {},

        visited: {},

        markedForReview: {},

        container: null,

        onSelectCallback: null,

        initialized: false,


        /* -------------------------------------------------
           Initialize
           ------------------------------------------------- */

        init: function () {

            this.container =
                document.getElementById(
                    "questionPalette"
                ) ||
                document.querySelector(
                    ".question-palette"
                ) ||
                document.querySelector(
                    "[data-question-palette]"
                );


            this.initialized = true;

            return this;
        },


        /* -------------------------------------------------
           Render palette
           ------------------------------------------------- */

        render: function (
            questions,
            state
        ) {

            if (!this.initialized) {
                this.init();
            }


            this.questions =
                Array.isArray(questions)
                    ? questions
                    : [];


            state =
                state || {};


            this.currentIndex =
                Number(
                    state.currentIndex || 0
                );


            this.answers =
                state.answers || {};


            this.visited =
                state.visited || {};


            this.markedForReview =
                state.markedForReview || {};


            this.onSelectCallback =
                typeof state.onSelect ===
                "function"
                    ? state.onSelect
                    : null;


            if (!this.container) {
                return;
            }


            this.container.innerHTML =
                "";


            /*
             * Create palette buttons.
             */

            this.questions.forEach(
                function (
                    question,
                    index
                ) {

                    const button =
                        this.createButton(
                            question,
                            index
                        );


                    this.container.appendChild(
                        button
                    );

                }.bind(this)
            );


            this.updateSummary();

            this.scrollCurrentIntoView();
        },


        /* -------------------------------------------------
           Create button
           ------------------------------------------------- */

        createButton: function (
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


            button.dataset.index =
                String(index);


            const id =
                this.getQuestionId(
                    question,
                    index
                );


            /*
             * Current
             */

            if (
                index ===
                this.currentIndex
            ) {

                button.classList.add(
                    "current"
                );
            }


            /*
             * Answered
             */

            const answered =
                this.isAnswered(
                    question,
                    index
                );


            if (answered) {

                button.classList.add(
                    "answered"
                );
            }


            /*
             * Visited
             */

            if (
                this.visited[id]
            ) {

                button.classList.add(
                    "visited"
                );
            }


            /*
             * Marked for review
             */

            if (
                this.markedForReview[id]
            ) {

                button.classList.add(
                    "review"
                );
            }


            /*
             * Answered + review is a special
             * GATE-like state.
             */

            if (
                answered &&
                this.markedForReview[id]
            ) {

                button.classList.add(
                    "answered-review"
                );
            }


            /*
             * Section color/class.
             */

            if (
                question.section
            ) {

                button.classList.add(
                    "section-" +
                    String(
                        question.section
                    ).toLowerCase()
                );
            }


            /*
             * Number.
             */

            button.textContent =
                question.examNumber ||
                index + 1;


            /*
             * Accessibility.
             */

            button.setAttribute(
                "aria-label",
                this.getAriaLabel(
                    question,
                    index
                )
            );


            button.setAttribute(
                "title",
                this.getAriaLabel(
                    question,
                    index
                )
            );


            button.addEventListener(
                "click",
                function () {

                    this.select(
                        index
                    );

                }.bind(this)
            );


            return button;
        },


        /* -------------------------------------------------
           Select question
           ------------------------------------------------- */

        select: function (
            index
        ) {

            const target =
                Number(index);


            if (
                !Number.isInteger(
                    target
                )
            ) {
                return;
            }


            if (
                target < 0 ||
                target >= this.questions.length
            ) {
                return;
            }


            this.currentIndex =
                target;


            if (
                this.onSelectCallback
            ) {

                this.onSelectCallback(
                    target
                );

            } else if (
                window.ExamEngine &&
                typeof ExamEngine.goToQuestion ===
                "function"
            ) {

                ExamEngine.goToQuestion(
                    target
                );
            }


            this.refresh();
        },


        /* -------------------------------------------------
           Refresh current state
           ------------------------------------------------- */

        refresh: function () {

            if (!this.container) {
                return;
            }


            const buttons =
                this.container.querySelectorAll(
                    ".palette-btn"
                );


            buttons.forEach(
                function (
                    button,
                    index
                ) {

                    const question =
                        this.questions[index];


                    const id =
                        this.getQuestionId(
                            question,
                            index
                        );


                    const answered =
                        this.isAnswered(
                            question,
                            index
                        );


                    button.classList.toggle(
                        "current",
                        index ===
                        this.currentIndex
                    );


                    button.classList.toggle(
                        "answered",
                        answered
                    );


                    button.classList.toggle(
                        "visited",
                        Boolean(
                            this.visited[id]
                        )
                    );


                    button.classList.toggle(
                        "review",
                        Boolean(
                            this.markedForReview[id]
                        )
                    );


                    button.classList.toggle(
                        "answered-review",
                        answered &&
                        Boolean(
                            this.markedForReview[id]
                        )
                    );


                    button.setAttribute(
                        "aria-label",
                        this.getAriaLabel(
                            question,
                            index
                        )
                    );

                }.bind(this)
            );


            this.updateSummary();

            this.scrollCurrentIntoView();
        },


        /* -------------------------------------------------
           Update external palette state
           ------------------------------------------------- */

        updateState: function (
            state
        ) {

            state =
                state || {};


            if (
                state.currentIndex != null
            ) {

                this.currentIndex =
                    Number(
                        state.currentIndex
                    );
            }


            if (state.answers) {
                this.answers =
                    state.answers;
            }


            if (state.visited) {
                this.visited =
                    state.visited;
            }


            if (
                state.markedForReview
            ) {

                this.markedForReview =
                    state.markedForReview;
            }


            this.refresh();
        },


        /* -------------------------------------------------
           Check answered
           ------------------------------------------------- */

        isAnswered: function (
            question,
            index
        ) {

            const id =
                this.getQuestionId(
                    question,
                    index
                );


            const answer =
                this.answers[id];


            if (
                answer === undefined ||
                answer === null
            ) {

                return false;
            }


            if (
                Array.isArray(answer)
            ) {

                return (
                    answer.length >
                    0
                );
            }


            return String(
                answer
            ).trim().length > 0;
        },


        /* -------------------------------------------------
           Question ID
           ------------------------------------------------- */

        getQuestionId: function (
            question,
            index
        ) {

            if (
                question &&
                question.id != null
            ) {

                return String(
                    question.id
                );
            }


            if (
                question &&
                question.examNumber != null
            ) {

                return String(
                    question.examNumber
                );
            }


            if (
                question &&
                question.number != null
            ) {

                return String(
                    question.number
                );
            }


            return String(
                Number(index) + 1
            );
        },


        /* -------------------------------------------------
           Accessibility label
           ------------------------------------------------- */

        getAriaLabel: function (
            question,
            index
        ) {

            const number =
                question &&
                (
                    question.examNumber ||
                    question.number
                )
                    ? (
                        question.examNumber ||
                        question.number
                    )
                    : index + 1;


            const answered =
                this.isAnswered(
                    question,
                    index
                );


            const id =
                this.getQuestionId(
                    question,
                    index
                );


            let label =
                "Question " +
                number;


            if (answered) {
                label +=
                    ", answered";
            } else {
                label +=
                    ", not answered";
            }


            if (
                this.markedForReview[id]
            ) {

                label +=
                    ", marked for review";
            }


            if (
                index ===
                this.currentIndex
            ) {

                label +=
                    ", current question";
            }


            return label;
        },


        /* -------------------------------------------------
           Summary
           ------------------------------------------------- */

        getSummary: function () {

            let answered = 0;
            let unanswered = 0;
            let review = 0;
            let answeredReview = 0;
            let visited = 0;


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


                    const isAnswered =
                        this.isAnswered(
                            question,
                            index
                        );


                    const isReview =
                        Boolean(
                            this.markedForReview[id]
                        );


                    const isVisited =
                        Boolean(
                            this.visited[id]
                        );


                    if (isAnswered) {
                        answered++;
                    } else {
                        unanswered++;
                    }


                    if (isReview) {
                        review++;
                    }


                    if (
                        isAnswered &&
                        isReview
                    ) {

                        answeredReview++;
                    }


                    if (isVisited) {
                        visited++;
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
                    review,

                answeredReview:
                    answeredReview,

                visited:
                    visited
            };
        },


        updateSummary: function () {

            const summary =
                this.getSummary();


            this.setTextById(
                "answeredCount",
                summary.answered
            );


            this.setTextById(
                "unansweredCount",
                summary.unanswered
            );


            this.setTextById(
                "reviewCount",
                summary.review
            );


            this.setTextById(
                "visitedCount",
                summary.visited
            );


            this.setTextBySelector(
                "[data-answered-count]",
                summary.answered
            );


            this.setTextBySelector(
                "[data-unanswered-count]",
                summary.unanswered
            );


            this.setTextBySelector(
                "[data-review-count]",
                summary.review
            );
        },


        /* -------------------------------------------------
           Section filtering
           ------------------------------------------------- */

        filterSection: function (
            section
        ) {

            if (!this.container) {
                return;
            }


            const buttons =
                this.container.querySelectorAll(
                    ".palette-btn"
                );


            const wanted =
                String(
                    section || "ALL"
                ).toUpperCase();


            buttons.forEach(
                function (
                    button,
                    index
                ) {

                    const question =
                        this.questions[index];


                    if (
                        wanted ===
                        "ALL"
                    ) {

                        button.style.display =
                            "";

                        return;
                    }


                    const questionSection =
                        String(
                            question &&
                            question.section
                                ? question.section
                                : "UNKNOWN"
                        ).toUpperCase();


                    button.style.display =
                        questionSection ===
                        wanted
                            ? ""
                            : "none";
                }
            );
        },


        showAll: function () {
            this.filterSection(
                "ALL"
            );
        },


        /* -------------------------------------------------
           Scroll current button into view
           ------------------------------------------------- */

        scrollCurrentIntoView: function () {

            if (!this.container) {
                return;
            }


            const current =
                this.container.querySelector(
                    ".palette-btn.current"
                );


            if (!current) {
                return;
            }


            try {

                current.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "nearest"
                });

            } catch (error) {

                current.scrollIntoView();
            }
        },


        /* -------------------------------------------------
           Navigation helpers
           ------------------------------------------------- */

        next: function () {

            if (
                this.currentIndex <
                this.questions.length - 1
            ) {

                this.select(
                    this.currentIndex + 1
                );
            }
        },


        previous: function () {

            if (
                this.currentIndex > 0
            ) {

                this.select(
                    this.currentIndex - 1
                );
            }
        },


        first: function () {

            if (
                this.questions.length
            ) {

                this.select(
                    0
                );
            }
        },


        last: function () {

            if (
                this.questions.length
            ) {

                this.select(
                    this.questions.length - 1
                );
            }
        },


        /* -------------------------------------------------
           Find first unanswered
           ------------------------------------------------- */

        findFirstUnanswered: function () {

            for (
                let i = 0;
                i < this.questions.length;
                i++
            ) {

                if (
                    !this.isAnswered(
                        this.questions[i],
                        i
                    )
                ) {

                    return i;
                }
            }


            return -1;
        },


        goToFirstUnanswered: function () {

            const index =
                this.findFirstUnanswered();


            if (index >= 0) {

                this.select(
                    index
                );

                return true;
            }


            return false;
        },


        /* -------------------------------------------------
           Find first review
           ------------------------------------------------- */

        findFirstReview: function () {

            for (
                let i = 0;
                i < this.questions.length;
                i++
            ) {

                const id =
                    this.getQuestionId(
                        this.questions[i],
                        i
                    );


                if (
                    this.markedForReview[id]
                ) {

                    return i;
                }
            }


            return -1;
        },


        goToFirstReview: function () {

            const index =
                this.findFirstReview();


            if (index >= 0) {

                this.select(
                    index
                );

                return true;
            }


            return false;
        },


        /* -------------------------------------------------
           Generate palette from current ExamEngine
           ------------------------------------------------- */

        syncFromExamEngine: function () {

            if (
                !window.ExamEngine
            ) {
                return;
            }


            this.questions =
                ExamEngine.questions ||
                [];


            this.currentIndex =
                Number(
                    ExamEngine.currentIndex ||
                    0
                );


            this.answers =
                ExamEngine.answers ||
                {};


            this.visited =
                ExamEngine.visited ||
                {};


            this.markedForReview =
                ExamEngine.markedForReview ||
                {};


            this.refresh();
        },


        /* -------------------------------------------------
           Render legend counts
           ------------------------------------------------- */

        renderLegend: function (
            container
        ) {

            const target =
                container ||
                document.querySelector(
                    "[data-palette-legend]"
                );


            if (!target) {
                return;
            }


            const summary =
                this.getSummary();


            target.innerHTML = "";


            const items = [

                {
                    className:
                        "answered",
                    label:
                        "Answered",
                    count:
                        summary.answered
                },

                {
                    className:
                        "unanswered",
                    label:
                        "Not Answered",
                    count:
                        summary.unanswered
                },

                {
                    className:
                        "review",
                    label:
                        "Marked for Review",
                    count:
                        summary.review
                },

                {
                    className:
                        "current",
                    label:
                        "Current",
                    count:
                        1
                }
            ];


            items.forEach(
                function (item) {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "palette-legend-item";


                    const indicator =
                        document.createElement(
                            "span"
                        );


                    indicator.className =
                        "palette-legend-indicator " +
                        item.className;


                    const text =
                        document.createElement(
                            "span"
                        );


                    text.textContent =
                        item.label +
                        " (" +
                        item.count +
                        ")";


                    row.appendChild(
                        indicator
                    );


                    row.appendChild(
                        text
                    );


                    target.appendChild(
                        row
                    );
                }
            );
        },


        /* -------------------------------------------------
           Text helpers
           ------------------------------------------------- */

        setTextById: function (
            id,
            value
        ) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    String(
                        value
                    );
            }
        },


        setTextBySelector: function (
            selector,
            value
        ) {

            document.querySelectorAll(
                selector
            ).forEach(
                function (element) {

                    element.textContent =
                        String(
                            value
                        );
                }
            );
        }
    };


    /* -----------------------------------------------------
       Global
       ----------------------------------------------------- */

    window.Palette =
        Palette;


    /* -----------------------------------------------------
       Initialize
       ----------------------------------------------------- */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            try {

                Palette.init();

            } catch (error) {

                console.error(
                    "Palette initialization failed:",
                    error
                );
            }
        }
    );

})();
