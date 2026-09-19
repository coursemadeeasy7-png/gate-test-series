/* =========================================================
   GATE TEST SERIES
   FILE 23: js/scoring.js

   Purpose:
   - MCQ scoring
   - MSQ scoring
   - NAT scoring
   - Negative marking
   - NAT tolerance/range
   - Question-wise result
   - Section-wise statistics
   - Final score calculation
   - Accuracy calculation
   - Result data compatible with result.html
========================================================= */

(function () {
    "use strict";

    class ScoringEngine {

        constructor() {
            this.totalMarks = 0;
            this.obtainedMarks = 0;
            this.correctCount = 0;
            this.wrongCount = 0;
            this.unattemptedCount = 0;
            this.attemptedCount = 0;

            this.results = [];
            this.sectionStats = {};
        }

        /* =====================================================
           PUBLIC: SCORE COMPLETE EXAM
        ===================================================== */

        scoreExam(questions, answers) {

            questions = Array.isArray(questions) ? questions : [];
            answers = answers || {};

            this.reset();

            questions.forEach((question, index) => {

                const userAnswer =
                    answers[question.id] !== undefined
                        ? answers[question.id]
                        : answers[index];

                const result = this.scoreQuestion(
                    question,
                    userAnswer,
                    index
                );

                this.results.push(result);

                this.updateSectionStats(
                    question,
                    result
                );
            });

            this.calculateTotals();

            return this.getFinalResult();
        }

        /* =====================================================
           RESET
        ===================================================== */

        reset() {

            this.totalMarks = 0;
            this.obtainedMarks = 0;
            this.correctCount = 0;
            this.wrongCount = 0;
            this.unattemptedCount = 0;
            this.attemptedCount = 0;

            this.results = [];
            this.sectionStats = {};
        }

        /* =====================================================
           SCORE ONE QUESTION
        ===================================================== */

        scoreQuestion(question, userAnswer, index = 0) {

            const type = this.getQuestionType(question);

            const marks = this.getMarks(question);

            const negativeMarks =
                this.getNegativeMarks(question);

            const correctAnswer =
                this.getCorrectAnswer(question);

            const normalizedUser =
                this.normalizeAnswer(userAnswer, type);

            const normalizedCorrect =
                this.normalizeAnswer(correctAnswer, type);

            const attempted =
                this.isAttempted(normalizedUser, type);

            let status = "unattempted";
            let awardedMarks = 0;
            let isCorrect = false;

            if (!attempted) {

                this.unattemptedCount++;

                status = "unattempted";
                awardedMarks = 0;

            } else {

                this.attemptedCount++;

                isCorrect =
                    this.compareAnswers(
                        normalizedUser,
                        normalizedCorrect,
                        question,
                        type
                    );

                if (isCorrect) {

                    this.correctCount++;

                    status = "correct";
                    awardedMarks = marks;

                } else {

                    this.wrongCount++;

                    status = "wrong";

                    /*
                     * NAT normally has no negative marking.
                     * If the source explicitly provides a
                     * negative mark, that value is respected.
                     */
                    awardedMarks = -negativeMarks;
                }
            }

            const maxMarks = marks;

            this.totalMarks += maxMarks;
            this.obtainedMarks += awardedMarks;

            return {
                index: index,

                id: question.id,

                questionNumber:
                    question.number ||
                    question.questionNumber ||
                    index + 1,

                type: type,

                section:
                    question.section ||
                    question.subject ||
                    "General",

                marks: marks,

                negativeMarks: negativeMarks,

                userAnswer:
                    this.cloneAnswer(normalizedUser),

                correctAnswer:
                    this.cloneAnswer(normalizedCorrect),

                attempted: attempted,

                isCorrect: isCorrect,

                status: status,

                awardedMarks: this.roundNumber(
                    awardedMarks,
                    4
                ),

                maxMarks: maxMarks,

                question: question
            };
        }

        /* =====================================================
           QUESTION TYPE
        ===================================================== */

        getQuestionType(question) {

            const raw =
                question.type ||
                question.questionType ||
                question.kind ||
                "MCQ";

            const type =
                String(raw)
                    .trim()
                    .toUpperCase();

            if (
                type === "NAT" ||
                type === "NUMERICAL" ||
                type === "NUMERIC"
            ) {
                return "NAT";
            }

            if (
                type === "MSQ" ||
                type === "MULTIPLE_SELECT" ||
                type === "MULTIPLE_SELECTION"
            ) {
                return "MSQ";
            }

            return "MCQ";
        }

        /* =====================================================
           MARKS
        ===================================================== */

        getMarks(question) {

            let marks =
                question.marks ??
                question.mark ??
                question.maxMarks ??
                1;

            marks = Number(marks);

            if (!Number.isFinite(marks) || marks < 0) {
                marks = 1;
            }

            return marks;
        }

        /* =====================================================
           NEGATIVE MARKS
        ===================================================== */

        getNegativeMarks(question) {

            const type =
                this.getQuestionType(question);

            /*
             * NAT generally has no negative marking.
             */
            if (type === "NAT") {

                if (
                    question.negativeMarks === undefined &&
                    question.negative === undefined
                ) {
                    return 0;
                }
            }

            let negative =
                question.negativeMarks ??
                question.negativeMark ??
                question.negative ??
                question.negMarks;

            if (
                negative === undefined ||
                negative === null ||
                negative === ""
            ) {

                /*
                 * Standard fallback based on marks.
                 *
                 * +1 -> -0.33
                 * +2 -> -0.66
                 *
                 * If source explicitly says another
                 * negative value, that value wins.
                 */
                const marks =
                    this.getMarks(question);

                if (marks === 2) {
                    return 0.66;
                }

                if (marks === 1) {
                    return 0.33;
                }

                return 0;
            }

            negative = Number(negative);

            if (!Number.isFinite(negative)) {
                return 0;
            }

            /*
             * Negative values are converted to positive
             * penalty magnitude.
             */
            return Math.abs(negative);
        }

        /* =====================================================
           CORRECT ANSWER
        ===================================================== */

        getCorrectAnswer(question) {

            let answer =
                question.correctAnswer ??
                question.answer ??
                question.correct ??
                question.correctOption ??
                question.correctOptions;

            /*
             * Some parsed questions may store answer
             * inside answerKey.
             */
            if (
                answer === undefined &&
                question.answerKey !== undefined
            ) {
                answer = question.answerKey;
            }

            return answer;
        }

        /* =====================================================
           NORMALIZE ANSWER
        ===================================================== */

        normalizeAnswer(answer, type) {

            if (
                answer === undefined ||
                answer === null
            ) {
                return null;
            }

            /*
             * MCQ
             */
            if (type === "MCQ") {

                if (typeof answer === "object") {

                    if (answer.label !== undefined) {
                        return String(answer.label)
                            .trim()
                            .toUpperCase();
                    }

                    if (answer.value !== undefined) {
                        return String(answer.value)
                            .trim()
                            .toUpperCase();
                    }

                    if (answer.text !== undefined) {
                        return String(answer.text)
                            .trim();
                    }
                }

                return String(answer)
                    .trim()
                    .toUpperCase();
            }

            /*
             * MSQ
             */
            if (type === "MSQ") {

                let values = [];

                if (Array.isArray(answer)) {
                    values = answer;
                } else if (typeof answer === "string") {

                    /*
                     * Supports:
                     * "A,B"
                     * "A B"
                     * "A,C,D"
                     * "[A,C]"
                     */
                    let text =
                        answer
                            .trim()
                            .replace(/^\[/, "")
                            .replace(/\]$/, "");

                    if (text.includes(",")) {

                        values =
                            text
                                .split(",")
                                .map(v => v.trim());

                    } else {

                        values =
                            text
                                .split(/\s+/)
                                .filter(Boolean);
                    }

                } else if (
                    typeof answer === "object"
                ) {

                    if (Array.isArray(answer.options)) {
                        values = answer.options;
                    } else if (Array.isArray(answer.value)) {
                        values = answer.value;
                    } else if (Array.isArray(answer.selected)) {
                        values = answer.selected;
                    }
                }

                return this.uniqueSorted(
                    values.map(value =>
                        this.normalizeOptionValue(value)
                    )
                );
            }

            /*
             * NAT
             */
            if (type === "NAT") {

                if (
                    typeof answer === "object" &&
                    answer.value !== undefined
                ) {
                    answer = answer.value;
                }

                if (typeof answer === "string") {

                    const cleaned =
                        answer
                            .trim()
                            .replace(/,/g, "");

                    if (cleaned === "") {
                        return null;
                    }

                    const number =
                        Number(cleaned);

                    if (Number.isFinite(number)) {
                        return number;
                    }

                    return cleaned;
                }

                const number = Number(answer);

                return Number.isFinite(number)
                    ? number
                    : null;
            }

            return answer;
        }

        /* =====================================================
           NORMALIZE OPTION
        ===================================================== */

        normalizeOptionValue(value) {

            if (
                value === undefined ||
                value === null
            ) {
                return "";
            }

            if (typeof value === "object") {

                if (value.label !== undefined) {
                    value = value.label;
                } else if (value.value !== undefined) {
                    value = value.value;
                } else if (value.text !== undefined) {
                    value = value.text;
                }
            }

            return String(value)
                .trim()
                .toUpperCase()
                .replace(/[.)]$/, "");
        }

        /* =====================================================
           ATTEMPTED
        ===================================================== */

        isAttempted(answer, type) {

            if (
                answer === null ||
                answer === undefined
            ) {
                return false;
            }

            if (type === "MSQ") {

                return (
                    Array.isArray(answer) &&
                    answer.length > 0
                );
            }

            if (type === "NAT") {

                if (typeof answer === "number") {
                    return Number.isFinite(answer);
                }

                return (
                    typeof answer === "string" &&
                    answer.trim() !== ""
                );
            }

            return String(answer).trim() !== "";
        }

        /* =====================================================
           COMPARE ANSWERS
        ===================================================== */

        compareAnswers(
            userAnswer,
            correctAnswer,
            question,
            type
        ) {

            if (
                userAnswer === null ||
                correctAnswer === null
            ) {
                return false;
            }

            /*
             * MCQ
             */
            if (type === "MCQ") {

                return (
                    String(userAnswer)
                        .trim()
                        .toUpperCase() ===
                    String(correctAnswer)
                        .trim()
                        .toUpperCase()
                );
            }

            /*
             * MSQ
             */
            if (type === "MSQ") {

                return this.compareMSQ(
                    userAnswer,
                    correctAnswer
                );
            }

            /*
             * NAT
             */
            if (type === "NAT") {

                return this.compareNAT(
                    userAnswer,
                    correctAnswer,
                    question
                );
            }

            return false;
        }

        /* =====================================================
           MSQ COMPARISON
        ===================================================== */

        compareMSQ(userAnswer, correctAnswer) {

            const user =
                Array.isArray(userAnswer)
                    ? userAnswer
                    : [userAnswer];

            const correct =
                Array.isArray(correctAnswer)
                    ? correctAnswer
                    : [correctAnswer];

            const a =
                this.uniqueSorted(
                    user.map(v =>
                        this.normalizeOptionValue(v)
                    )
                );

            const b =
                this.uniqueSorted(
                    correct.map(v =>
                        this.normalizeOptionValue(v)
                    )
                );

            if (a.length !== b.length) {
                return false;
            }

            for (let i = 0; i < a.length; i++) {

                if (a[i] !== b[i]) {
                    return false;
                }
            }

            return true;
        }

        /* =====================================================
           NAT COMPARISON
        ===================================================== */

        compareNAT(
            userAnswer,
            correctAnswer,
            question
        ) {

            const user =
                Number(userAnswer);

            const correct =
                Number(correctAnswer);

            if (
                !Number.isFinite(user) ||
                !Number.isFinite(correct)
            ) {
                return false;
            }

            /*
             * Source may contain explicit range:
             *
             * natRange: {
             *   min: 3.90,
             *   max: 4.10
             * }
             */

            const range =
                question.natRange ||
                question.answerRange ||
                question.range;

            if (
                range &&
                range.min !== undefined &&
                range.max !== undefined
            ) {

                const min =
                    Number(range.min);

                const max =
                    Number(range.max);

                if (
                    Number.isFinite(min) &&
                    Number.isFinite(max)
                ) {

                    return (
                        user >= min &&
                        user <= max
                    );
                }
            }

            /*
             * Alternate direct fields.
             */

            const min =
                question.minAnswer ??
                question.answerMin ??
                question.rangeMin;

            const max =
                question.maxAnswer ??
                question.answerMax ??
                question.rangeMax;

            if (
                min !== undefined &&
                max !== undefined
            ) {

                const minValue =
                    Number(min);

                const maxValue =
                    Number(max);

                if (
                    Number.isFinite(minValue) &&
                    Number.isFinite(maxValue)
                ) {

                    return (
                        user >= minValue &&
                        user <= maxValue
                    );
                }
            }

            /*
             * Explicit tolerance.
             */

            let tolerance =
                question.tolerance ??
                question.natTolerance ??
                question.answerTolerance;

            if (tolerance !== undefined) {

                tolerance =
                    Number(tolerance);

                if (
                    Number.isFinite(tolerance)
                ) {

                    return (
                        Math.abs(user - correct) <=
                        tolerance
                    );
                }
            }

            /*
             * GATE-style NAT answers may be stored as
             * accepted ranges. If no range exists,
             * use a small floating-point comparison.
             */

            const difference =
                Math.abs(user - correct);

            const scale =
                Math.max(
                    1,
                    Math.abs(correct)
                );

            return (
                difference <=
                Math.max(
                    0.000001,
                    scale * 0.000001
                )
            );
        }

        /* =====================================================
           SECTION STATISTICS
        ===================================================== */

        updateSectionStats(
            question,
            result
        ) {

            const section =
                question.section ||
                question.subject ||
                "General";

            if (!this.sectionStats[section]) {

                this.sectionStats[section] = {
                    section: section,

                    totalQuestions: 0,
                    attempted: 0,
                    correct: 0,
                    wrong: 0,
                    unattempted: 0,

                    totalMarks: 0,
                    obtainedMarks: 0,

                    accuracy: 0
                };
            }

            const stats =
                this.sectionStats[section];

            stats.totalQuestions++;

            stats.totalMarks +=
                result.maxMarks;

            stats.obtainedMarks +=
                result.awardedMarks;

            if (result.attempted) {
                stats.attempted++;
            }

            if (result.status === "correct") {
                stats.correct++;
            }

            if (result.status === "wrong") {
                stats.wrong++;
            }

            if (result.status === "unattempted") {
                stats.unattempted++;
            }

            stats.accuracy =
                stats.attempted > 0
                    ? (
                        stats.correct /
                        stats.attempted
                    ) * 100
                    : 0;

            stats.accuracy =
                this.roundNumber(
                    stats.accuracy,
                    2
                );
        }

        /* =====================================================
           CALCULATE TOTALS
        ===================================================== */

        calculateTotals() {

            this.obtainedMarks =
                this.roundNumber(
                    this.obtainedMarks,
                    4
                );

            this.totalMarks =
                this.roundNumber(
                    this.totalMarks,
                    4
                );
        }

        /* =====================================================
           FINAL RESULT
        ===================================================== */

        getFinalResult() {

            const attempted =
                this.attemptedCount;

            const accuracy =
                attempted > 0
                    ? (
                        this.correctCount /
                        attempted
                    ) * 100
                    : 0;

            const percentage =
                this.totalMarks > 0
                    ? (
                        this.obtainedMarks /
                        this.totalMarks
                    ) * 100
                    : 0;

            return {

                totalQuestions:
                    this.results.length,

                attempted:
                    this.attemptedCount,

                correct:
                    this.correctCount,

                wrong:
                    this.wrongCount,

                unattempted:
                    this.unattemptedCount,

                totalMarks:
                    this.roundNumber(
                        this.totalMarks,
                        2
                    ),

                obtainedMarks:
                    this.roundNumber(
                        this.obtainedMarks,
                        2
                    ),

                score:
                    this.roundNumber(
                        this.obtainedMarks,
                        2
                    ),

                percentage:
                    this.roundNumber(
                        percentage,
                        2
                    ),

                accuracy:
                    this.roundNumber(
                        accuracy,
                        2
                    ),

                questionResults:
                    this.results,

                sectionStats:
                    this.sectionStats,

                timestamp:
                    new Date().toISOString()
            };
        }

        /* =====================================================
           UTILITY: UNIQUE SORTED
        ===================================================== */

        uniqueSorted(array) {

            return [
                ...new Set(
                    array
                        .filter(
                            value =>
                                value !== ""
                        )
                )
            ].sort();
        }

        /* =====================================================
           UTILITY: CLONE ANSWER
        ===================================================== */

        cloneAnswer(answer) {

            if (Array.isArray(answer)) {
                return [...answer];
            }

            if (
                answer &&
                typeof answer === "object"
            ) {
                return {
                    ...answer
                };
            }

            return answer;
        }

        /* =====================================================
           UTILITY: ROUND
        ===================================================== */

        roundNumber(number, decimals = 2) {

            const factor =
                Math.pow(
                    10,
                    decimals
                );

            return Math.round(
                (Number(number) + Number.EPSILON) *
                factor
            ) / factor;
        }

        /* =====================================================
           STATIC HELPERS
        ===================================================== */

        static score(
            questions,
            answers
        ) {

            const engine =
                new ScoringEngine();

            return engine.scoreExam(
                questions,
                answers
            );
        }

        static scoreQuestion(
            question,
            userAnswer
        ) {

            const engine =
                new ScoringEngine();

            return engine.scoreQuestion(
                question,
                userAnswer,
                0
            );
        }
    }

    /* =========================================================
       GLOBAL EXPORTS
    ========================================================= */

    window.ScoringEngine =
        ScoringEngine;

    /*
     * Existing exam-engine.js may look for either name.
     */
    window.Scoring =
        ScoringEngine;

    /* =========================================================
       COMPATIBILITY FUNCTIONS
    ========================================================= */

    window.calculateExamScore = function (
        questions,
        answers
    ) {

        return ScoringEngine.score(
            questions,
            answers
        );
    };

    window.calculateQuestionScore = function (
        question,
        answer
    ) {

        return ScoringEngine.scoreQuestion(
            question,
            answer
        );
    };

})();
