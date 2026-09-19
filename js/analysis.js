/* =========================================================
   GATE TEST SERIES
   FILE 24: js/analysis.js

   Purpose:
   - Result analysis
   - Question-wise analysis
   - Section-wise analysis
   - Accuracy
   - Attempt analysis
   - Time analysis
   - Weak/strong topic detection
   - Result/history storage compatibility
========================================================= */

(function () {
    "use strict";

    class AnalysisEngine {

        constructor(result = null, questions = []) {

            this.result = result || {};
            this.questions =
                Array.isArray(questions)
                    ? questions
                    : [];

            this.questionResults =
                Array.isArray(this.result.questionResults)
                    ? this.result.questionResults
                    : [];

            this.sectionStats =
                this.result.sectionStats || {};
        }

        /* =====================================================
           LOAD RESULT
        ===================================================== */

        loadResult(result, questions = []) {

            this.result = result || {};

            this.questions =
                Array.isArray(questions)
                    ? questions
                    : [];

            this.questionResults =
                Array.isArray(this.result.questionResults)
                    ? this.result.questionResults
                    : [];

            this.sectionStats =
                this.result.sectionStats || {};

            return this;
        }

        /* =====================================================
           COMPLETE ANALYSIS
        ===================================================== */

        getFullAnalysis() {

            return {

                summary:
                    this.getSummary(),

                questionAnalysis:
                    this.getQuestionAnalysis(),

                sectionAnalysis:
                    this.getSectionAnalysis(),

                typeAnalysis:
                    this.getTypeAnalysis(),

                topicAnalysis:
                    this.getTopicAnalysis(),

                performance:
                    this.getPerformance(),

                timeAnalysis:
                    this.getTimeAnalysis(),

                recommendations:
                    this.getRecommendations()
            };
        }

        /* =====================================================
           SUMMARY
        ===================================================== */

        getSummary() {

            const totalQuestions =
                this.getNumber(
                    this.result.totalQuestions
                );

            const attempted =
                this.getNumber(
                    this.result.attempted
                );

            const correct =
                this.getNumber(
                    this.result.correct
                );

            const wrong =
                this.getNumber(
                    this.result.wrong
                );

            const unattempted =
                this.getNumber(
                    this.result.unattempted
                );

            const totalMarks =
                this.getNumber(
                    this.result.totalMarks
                );

            const obtainedMarks =
                this.getNumber(
                    this.result.obtainedMarks ??
                    this.result.score
                );

            const accuracy =
                attempted > 0
                    ? (correct / attempted) * 100
                    : 0;

            const attemptRate =
                totalQuestions > 0
                    ? (attempted / totalQuestions) * 100
                    : 0;

            return {

                totalQuestions,

                attempted,

                correct,

                wrong,

                unattempted,

                totalMarks,

                obtainedMarks,

                score: obtainedMarks,

                accuracy:
                    this.round(accuracy),

                attemptRate:
                    this.round(attemptRate),

                percentage:
                    this.round(
                        totalMarks > 0
                            ? (
                                obtainedMarks /
                                totalMarks
                            ) * 100
                            : 0
                    )
            };
        }

        /* =====================================================
           QUESTION ANALYSIS
        ===================================================== */

        getQuestionAnalysis() {

            return this.questionResults.map(
                (result, index) => {

                    const question =
                        this.questions[index] ||
                        result.question ||
                        {};

                    return {

                        index,

                        questionNumber:
                            result.questionNumber ||
                            question.number ||
                            index + 1,

                        id:
                            result.id ||
                            question.id ||
                            null,

                        type:
                            result.type ||
                            question.type ||
                            "MCQ",

                        section:
                            result.section ||
                            question.section ||
                            question.subject ||
                            "General",

                        topic:
                            question.topic ||
                            question.chapter ||
                            question.subject ||
                            "General",

                        status:
                            result.status ||
                            (
                                result.isCorrect
                                    ? "correct"
                                    : result.attempted
                                        ? "wrong"
                                        : "unattempted"
                            ),

                        attempted:
                            Boolean(
                                result.attempted
                            ),

                        correct:
                            Boolean(
                                result.isCorrect
                            ),

                        userAnswer:
                            result.userAnswer ??
                            null,

                        correctAnswer:
                            result.correctAnswer ??
                            null,

                        marks:
                            this.getNumber(
                                result.maxMarks ??
                                question.marks ??
                                1
                            ),

                        awardedMarks:
                            this.getNumber(
                                result.awardedMarks
                            ),

                        negativeMarks:
                            this.getNumber(
                                result.negativeMarks
                            )
                    };
                }
            );
        }

        /* =====================================================
           SECTION ANALYSIS
        ===================================================== */

        getSectionAnalysis() {

            const output = [];

            Object.keys(this.sectionStats)
                .forEach(section => {

                    const data =
                        this.sectionStats[section];

                    const total =
                        this.getNumber(
                            data.totalQuestions
                        );

                    const attempted =
                        this.getNumber(
                            data.attempted
                        );

                    const correct =
                        this.getNumber(
                            data.correct
                        );

                    const wrong =
                        this.getNumber(
                            data.wrong
                        );

                    const unattempted =
                        this.getNumber(
                            data.unattempted
                        );

                    const totalMarks =
                        this.getNumber(
                            data.totalMarks
                        );

                    const obtainedMarks =
                        this.getNumber(
                            data.obtainedMarks
                        );

                    output.push({

                        section,

                        totalQuestions: total,

                        attempted,

                        correct,

                        wrong,

                        unattempted,

                        totalMarks,

                        obtainedMarks,

                        accuracy:
                            this.round(
                                attempted > 0
                                    ? (
                                        correct /
                                        attempted
                                    ) * 100
                                    : 0
                            ),

                        attemptRate:
                            this.round(
                                total > 0
                                    ? (
                                        attempted /
                                        total
                                    ) * 100
                                    : 0
                            ),

                        percentage:
                            this.round(
                                totalMarks > 0
                                    ? (
                                        obtainedMarks /
                                        totalMarks
                                    ) * 100
                                    : 0
                            )
                    });
                });

            return output;
        }

        /* =====================================================
           QUESTION TYPE ANALYSIS
        ===================================================== */

        getTypeAnalysis() {

            const types = {};

            this.getQuestionAnalysis()
                .forEach(item => {

                    const type =
                        String(
                            item.type || "MCQ"
                        ).toUpperCase();

                    if (!types[type]) {

                        types[type] = {

                            type,

                            totalQuestions: 0,

                            attempted: 0,

                            correct: 0,

                            wrong: 0,

                            unattempted: 0,

                            totalMarks: 0,

                            obtainedMarks: 0
                        };
                    }

                    const data =
                        types[type];

                    data.totalQuestions++;

                    data.totalMarks +=
                        item.marks;

                    data.obtainedMarks +=
                        item.awardedMarks;

                    if (item.attempted) {
                        data.attempted++;
                    }

                    if (item.correct) {
                        data.correct++;
                    }

                    if (
                        item.status === "wrong"
                    ) {
                        data.wrong++;
                    }

                    if (
                        item.status ===
                        "unattempted"
                    ) {
                        data.unattempted++;
                    }
                });

            return Object.values(types)
                .map(data => {

                    return {

                        ...data,

                        accuracy:
                            this.round(
                                data.attempted > 0
                                    ? (
                                        data.correct /
                                        data.attempted
                                    ) * 100
                                    : 0
                            ),

                        percentage:
                            this.round(
                                data.totalMarks > 0
                                    ? (
                                        data.obtainedMarks /
                                        data.totalMarks
                                    ) * 100
                                    : 0
                            )
                    };
                });
        }

        /* =====================================================
           TOPIC ANALYSIS
        ===================================================== */

        getTopicAnalysis() {

            const topics = {};

            this.getQuestionAnalysis()
                .forEach(item => {

                    const topic =
                        item.topic ||
                        item.section ||
                        "General";

                    if (!topics[topic]) {

                        topics[topic] = {

                            topic,

                            totalQuestions: 0,

                            attempted: 0,

                            correct: 0,

                            wrong: 0,

                            unattempted: 0,

                            totalMarks: 0,

                            obtainedMarks: 0
                        };
                    }

                    const data =
                        topics[topic];

                    data.totalQuestions++;

                    data.totalMarks +=
                        item.marks;

                    data.obtainedMarks +=
                        item.awardedMarks;

                    if (item.attempted) {
                        data.attempted++;
                    }

                    if (item.correct) {
                        data.correct++;
                    }

                    if (
                        item.status === "wrong"
                    ) {
                        data.wrong++;
                    }

                    if (
                        item.status ===
                        "unattempted"
                    ) {
                        data.unattempted++;
                    }
                });

            return Object.values(topics)
                .map(data => {

                    return {

                        ...data,

                        accuracy:
                            this.round(
                                data.attempted > 0
                                    ? (
                                        data.correct /
                                        data.attempted
                                    ) * 100
                                    : 0
                            ),

                        percentage:
                            this.round(
                                data.totalMarks > 0
                                    ? (
                                        data.obtainedMarks /
                                        data.totalMarks
                                    ) * 100
                                    : 0
                            )
                    };
                });
        }

        /* =====================================================
           PERFORMANCE
        ===================================================== */

        getPerformance() {

            const summary =
                this.getSummary();

            let level = "Needs Review";

            if (summary.accuracy >= 85) {
                level = "Very High Accuracy";
            } else if (summary.accuracy >= 70) {
                level = "High Accuracy";
            } else if (summary.accuracy >= 50) {
                level = "Moderate Accuracy";
            } else if (
                summary.accuracy >= 30
            ) {
                level = "Low Accuracy";
            }

            let attemptLevel =
                "Low Attempt Rate";

            if (summary.attemptRate >= 90) {
                attemptLevel =
                    "Very High Attempt Rate";
            } else if (
                summary.attemptRate >= 75
            ) {
                attemptLevel =
                    "High Attempt Rate";
            } else if (
                summary.attemptRate >= 50
            ) {
                attemptLevel =
                    "Moderate Attempt Rate";
            }

            return {

                accuracy:
                    summary.accuracy,

                attemptRate:
                    summary.attemptRate,

                score:
                    summary.obtainedMarks,

                level,

                attemptLevel
            };
        }

        /* =====================================================
           TIME ANALYSIS
        ===================================================== */

        getTimeAnalysis() {

            const totalTime =
                this.getNumber(
                    this.result.totalTime
                );

            const timeUsed =
                this.getNumber(
                    this.result.timeUsed
                );

            const timeRemaining =
                this.getNumber(
                    this.result.timeRemaining
                );

            const attempted =
                this.getNumber(
                    this.result.attempted
                );

            return {

                totalTime,

                timeUsed,

                timeRemaining,

                averageTimePerAttempt:
                    attempted > 0 &&
                    timeUsed > 0
                        ? this.round(
                            timeUsed /
                            attempted
                        )
                        : 0
            };
        }

        /* =====================================================
           RECOMMENDATIONS
        ===================================================== */

        getRecommendations() {

            const recommendations = [];

            const summary =
                this.getSummary();

            const topics =
                this.getTopicAnalysis();

            const sections =
                this.getSectionAnalysis();

            if (
                summary.unattempted >
                summary.totalQuestions * 0.25
            ) {

                recommendations.push(
                    "A significant number of questions were unattempted. Review time management and question selection."
                );
            }

            if (
                summary.attempted > 0 &&
                summary.accuracy < 50
            ) {

                recommendations.push(
                    "Review incorrect questions carefully and identify the concepts behind repeated mistakes."
                );
            }

            if (
                summary.attempted > 0 &&
                summary.accuracy >= 80
            ) {

                recommendations.push(
                    "Accuracy was relatively high. Continue practicing mixed and time-bound tests."
                );
            }

            const weakTopics =
                topics.filter(
                    topic =>
                        topic.attempted >= 2 &&
                        topic.accuracy < 50
                );

            if (weakTopics.length > 0) {

                recommendations.push(
                    "Review topics where the attempted-question accuracy was below 50%."
                );
            }

            const weakSections =
                sections.filter(
                    section =>
                        section.attempted >= 2 &&
                        section.accuracy < 50
                );

            if (weakSections.length > 0) {

                recommendations.push(
                    "Revisit concepts in sections with lower attempted-question accuracy."
                );
            }

            if (
                recommendations.length === 0
            ) {

                recommendations.push(
                    "Review the question-wise analysis and solutions to identify specific concepts that need further practice."
                );
            }

            return recommendations;
        }

        /* =====================================================
           WRONG QUESTIONS
        ===================================================== */

        getWrongQuestions() {

            return this.getQuestionAnalysis()
                .filter(
                    item =>
                        item.status === "wrong"
                );
        }

        /* =====================================================
           CORRECT QUESTIONS
        ===================================================== */

        getCorrectQuestions() {

            return this.getQuestionAnalysis()
                .filter(
                    item =>
                        item.status === "correct"
                );
        }

        /* =====================================================
           UNATTEMPTED QUESTIONS
        ===================================================== */

        getUnattemptedQuestions() {

            return this.getQuestionAnalysis()
                .filter(
                    item =>
                        item.status ===
                        "unattempted"
                );
        }

        /* =====================================================
           GET NUMBER
        ===================================================== */

        getNumber(value) {

            const number =
                Number(value);

            return Number.isFinite(number)
                ? number
                : 0;
        }

        /* =====================================================
           ROUND
        ===================================================== */

        round(value, decimals = 2) {

            const number =
                Number(value);

            if (!Number.isFinite(number)) {
                return 0;
            }

            const factor =
                Math.pow(
                    10,
                    decimals
                );

            return Math.round(
                (number + Number.EPSILON) *
                factor
            ) / factor;
        }

        /* =====================================================
           STATIC ANALYSIS
        ===================================================== */

        static analyze(
            result,
            questions = []
        ) {

            const engine =
                new AnalysisEngine(
                    result,
                    questions
                );

            return engine.getFullAnalysis();
        }
    }

    /* =========================================================
       GLOBAL EXPORT
    ========================================================= */

    window.AnalysisEngine =
        AnalysisEngine;

    /* =========================================================
       COMPATIBILITY FUNCTION
    ========================================================= */

    window.analyzeExam =
        function (
            result,
            questions = []
        ) {

            return AnalysisEngine.analyze(
                result,
                questions
            );
        };

})();
