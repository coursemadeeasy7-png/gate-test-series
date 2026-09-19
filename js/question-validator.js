/* =========================================================
   GATE TEST SERIES
   Question Validator
   File: js/question-validator.js
   ========================================================= */

(function () {
    "use strict";

    const QuestionValidator = {

        /* ---------------------------------------------------
           Configuration
           --------------------------------------------------- */

        config: {
            allowedTypes: [
                "MCQ",
                "MSQ",
                "NAT"
            ],

            allowedSections: [
                "GA",
                "ME",
                "UNKNOWN"
            ],

            minimumQuestionLength: 3,

            minimumOptionsMCQ: 4,

            minimumOptionsMSQ: 2
        },

        /* ---------------------------------------------------
           Validate One Question
           --------------------------------------------------- */

        validate(question) {

            if (
                !question ||
                typeof question !== "object"
            ) {
                return false;
            }

            const basic =
                this.validateBasicStructure(
                    question
                );

            if (!basic.valid) {
                return false;
            }

            const type =
                this.validateType(
                    question.type
                );

            if (!type.valid) {
                return false;
            }

            const text =
                this.validateQuestionText(
                    question.text ||
                    question.question
                );

            if (!text.valid) {
                return false;
            }

            const options =
                this.validateOptions(
                    question.options,
                    question.type
                );

            if (!options.valid) {
                return false;
            }

            const answer =
                this.validateAnswer(
                    question.answer ||
                    question.correctAnswer,
                    question.type,
                    question.options
                );

            if (!answer.valid) {
                return false;
            }

            const marks =
                this.validateMarks(
                    question.marks
                );

            if (!marks.valid) {
                return false;
            }

            return true;
        },

        /* ---------------------------------------------------
           Detailed Validation
           --------------------------------------------------- */

        validateDetailed(question) {

            const result = {
                valid: true,

                needsReview: false,

                errors: [],

                warnings: [],

                checks: {
                    basic: false,
                    type: false,
                    text: false,
                    options: false,
                    answer: false,
                    marks: false
                }
            };

            if (
                !question ||
                typeof question !==
                    "object"
            ) {

                result.valid = false;

                result.errors.push(
                    "Question data is missing."
                );

                return result;
            }

            /* Basic */

            const basic =
                this.validateBasicStructure(
                    question
                );

            result.checks.basic =
                basic.valid;

            if (!basic.valid) {

                result.valid = false;

                result.errors.push(
                    ...basic.errors
                );
            }

            /* Type */

            const type =
                this.validateType(
                    question.type
                );

            result.checks.type =
                type.valid;

            if (!type.valid) {

                result.valid = false;

                result.errors.push(
                    ...type.errors
                );
            }

            /* Text */

            const text =
                this.validateQuestionText(
                    question.text ||
                    question.question
                );

            result.checks.text =
                text.valid;

            if (!text.valid) {

                result.valid = false;

                result.errors.push(
                    ...text.errors
                );
            }

            /* Options */

            const options =
                this.validateOptions(
                    question.options,
                    question.type
                );

            result.checks.options =
                options.valid;

            if (!options.valid) {

                result.valid = false;

                result.errors.push(
                    ...options.errors
                );
            }

            if (options.warnings) {

                result.warnings.push(
                    ...options.warnings
                );
            }

            /* Answer */

            const answer =
                this.validateAnswer(
                    question.answer ||
                    question.correctAnswer,
                    question.type,
                    question.options
                );

            result.checks.answer =
                answer.valid;

            if (!answer.valid) {

                result.needsReview = true;

                result.warnings.push(
                    ...answer.errors
                );
            }

            /* Marks */

            const marks =
                this.validateMarks(
                    question.marks
                );

            result.checks.marks =
                marks.valid;

            if (!marks.valid) {

                result.needsReview = true;

                result.warnings.push(
                    ...marks.errors
                );
            }

            /*
             * A question with structural errors should not
             * silently enter the test.
             */

            if (!result.valid) {
                result.needsReview = true;
            }

            return result;
        },

        /* ---------------------------------------------------
           Basic Structure
           --------------------------------------------------- */

        validateBasicStructure(
            question
        ) {

            const result = {
                valid: true,
                errors: []
            };

            if (
                question.number ===
                    undefined ||
                question.number ===
                    null
            ) {

                result.valid = false;

                result.errors.push(
                    "Question number is missing."
                );

            } else if (
                !Number.isFinite(
                    Number(
                        question.number
                    )
                )
            ) {

                result.valid = false;

                result.errors.push(
                    "Question number is invalid."
                );
            }

            return result;
        },

        /* ---------------------------------------------------
           Type Validation
           --------------------------------------------------- */

        validateType(type) {

            const result = {
                valid: true,
                errors: []
            };

            const value =
                String(
                    type || ""
                )
                    .trim()
                    .toUpperCase();

            if (!value) {

                result.valid = false;

                result.errors.push(
                    "Question type is missing."
                );

                return result;
            }

            if (
                !this.config.allowedTypes
                    .includes(value)
            ) {

                result.valid = false;

                result.errors.push(
                    `Unsupported question type: ${value}`
                );
            }

            return result;
        },

        /* ---------------------------------------------------
           Question Text
           --------------------------------------------------- */

        validateQuestionText(
            text
        ) {

            const result = {
                valid: true,
                errors: []
            };

            const value =
                String(
                    text || ""
                ).trim();

            if (!value) {

                result.valid = false;

                result.errors.push(
                    "Question text is missing."
                );

                return result;
            }

            if (
                value.length <
                this.config.minimumQuestionLength
            ) {

                result.valid = false;

                result.errors.push(
                    "Question text is too short."
                );
            }

            return result;
        },

        /* ---------------------------------------------------
           Options
           --------------------------------------------------- */

        validateOptions(
            options,
            type
        ) {

            const result = {
                valid: true,
                errors: [],
                warnings: []
            };

            if (
                type === "NAT"
            ) {

                /*
                 * NAT does not require options.
                 */

                return result;
            }

            if (
                !Array.isArray(
                    options
                )
            ) {

                result.valid = false;

                result.errors.push(
                    "Options are missing."
                );

                return result;
            }

            const minimum =
                type === "MCQ"
                    ? this.config
                        .minimumOptionsMCQ
                    : this.config
                        .minimumOptionsMSQ;

            if (
                options.length <
                minimum
            ) {

                result.valid = false;

                result.errors.push(
                    `${type} requires at least ${minimum} options.`
                );
            }

            const labels =
                new Set();

            options.forEach(
                (option, index) => {

                    let text = "";
                    let label = "";

                    if (
                        typeof option ===
                        "object"
                    ) {

                        text =
                            String(
                                option.text ||
                                option.value ||
                                ""
                            ).trim();

                        label =
                            String(
                                option.label ||
                                ""
                            )
                                .trim()
                                .toUpperCase();

                    } else {

                        text =
                            String(
                                option || ""
                            ).trim();

                        label =
                            String(
                                String.fromCharCode(
                                    65 + index
                                )
                            );
                    }

                    if (!text) {

                        result.valid =
                            false;

                        result.errors.push(
                            `Option ${index + 1} is empty.`
                        );
                    }

                    if (
                        label &&
                        labels.has(label)
                    ) {

                        result.valid =
                            false;

                        result.errors.push(
                            `Duplicate option label: ${label}`
                        );
                    }

                    if (label) {
                        labels.add(
                            label
                        );
                    }
                }
            );

            if (
                type === "MCQ" &&
                options.length > 4
            ) {

                result.warnings.push(
                    "More than four options were detected; verify the source PDF."
                );
            }

            return result;
        },

        /* ---------------------------------------------------
           Answer Validation
           --------------------------------------------------- */

        validateAnswer(
            answer,
            type,
            options
        ) {

            const result = {
                valid: true,
                errors: []
            };

            /*
             * Missing answer is not treated as a hard
             * structural failure because the source PDF may
             * store the answer key separately.
             */

            if (
                answer === null ||
                answer === undefined ||
                answer === ""
            ) {

                result.valid = false;

                result.errors.push(
                    "Correct answer is not available; question requires review."
                );

                return result;
            }

            if (
                type === "NAT"
            ) {

                /*
                 * NAT may be:
                 * number, numeric string, or range object.
                 */

                if (
                    typeof answer ===
                    "number"
                ) {
                    if (
                        Number.isFinite(
                            answer
                        )
                    ) {
                        return result;
                    }
                }

                if (
                    typeof answer ===
                    "string"
                ) {

                    const value =
                        answer.trim();

                    if (
                        /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/
                            .test(value)
                    ) {
                        return result;
                    }

                    /*
                     * Supported answer range:
                     * 3.08-3.09
                     */

                    if (
                        /^[-+]?\d*\.?\d+\s*[-–]\s*[-+]?\d*\.?\d+$/
                            .test(value)
                    ) {
                        return result;
                    }
                }

                if (
                    typeof answer ===
                    "object"
                ) {

                    if (
                        Number.isFinite(
                            Number(
                                answer.value
                            )
                        )
                    ) {
                        return result;
                    }

                    if (
                        Number.isFinite(
                            Number(
                                answer.min
                            )
                        ) &&
                        Number.isFinite(
                            Number(
                                answer.max
                            )
                        )
                    ) {
                        return result;
                    }
                }

                result.valid = false;

                result.errors.push(
                    "NAT answer is not a valid numerical value or range."
                );

                return result;
            }

            const optionCount =
                Array.isArray(options)
                    ? options.length
                    : 0;

            const validLabels =
                [];

            for (
                let i = 0;
                i < optionCount;
                i++
            ) {

                validLabels.push(
                    String.fromCharCode(
                        65 + i
                    )
                );
            }

            if (
                type === "MSQ"
            ) {

                const answers =
                    Array.isArray(answer)
                        ? answer
                        : [
                            answer
                        ];

                if (
                    answers.length ===
                    0
                ) {

                    result.valid = false;

                    result.errors.push(
                        "MSQ answer is empty."
                    );

                    return result;
                }

                answers.forEach(
                    (item) => {

                        const label =
                            String(
                                item
                            )
                                .trim()
                                .toUpperCase();

                        if (
                            !validLabels.includes(
                                label
                            )
                        ) {

                            result.valid =
                                false;

                            result.errors.push(
                                `Invalid MSQ answer option: ${label}`
                            );
                        }
                    }
                );

                return result;
            }

            /*
             * MCQ
             */

            const value =
                String(
                    answer
                )
                    .trim()
                    .toUpperCase();

            if (
                !validLabels.includes(
                    value
                )
            ) {

                result.valid = false;

                result.errors.push(
                    `Invalid MCQ answer option: ${value}`
                );
            }

            return result;
        },

        /* ---------------------------------------------------
           Marks Validation
           --------------------------------------------------- */

        validateMarks(
            marks
        ) {

            const result = {
                valid: true,
                errors: []
            };

            const value =
                Number(marks);

            if (
                !Number.isFinite(
                    value
                )
            ) {

                result.valid = false;

                result.errors.push(
                    "Marks value is invalid."
                );

                return result;
            }

            if (
                value <= 0
            ) {

                result.valid = false;

                result.errors.push(
                    "Marks must be greater than zero."
                );
            }

            return result;
        },

        /* ---------------------------------------------------
           Negative Marks Validation
           --------------------------------------------------- */

        validateNegativeMarks(
            negativeMarks
        ) {

            const value =
                Number(
                    negativeMarks
                );

            if (
                !Number.isFinite(
                    value
                )
            ) {
                return false;
            }

            return value >= 0;
        },

        /* ---------------------------------------------------
           Validate All
           --------------------------------------------------- */

        validateAll(
            questions
        ) {

            if (
                !Array.isArray(
                    questions
                )
            ) {
                return [];
            }

            const validQuestions =
                [];

            questions.forEach(
                (question) => {

                    const result =
                        this.validateDetailed(
                            question
                        );

                    /*
                     * Keep structurally valid questions even if
                     * answer/solution information is missing.
                     *
                     * They are explicitly marked needsReview
                     * rather than silently discarded.
                     */

                    if (
                        result.checks.basic &&
                        result.checks.type &&
                        result.checks.text &&
                        result.checks.options
                    ) {

                        const normalized =
                            {
                                ...question,

                                needsReview:
                                    Boolean(
                                        result.needsReview ||
                                        question.needsReview
                                    ),

                                validation:
                                    result,

                                parserStatus:
                                    result.needsReview
                                        ? "needs-review"
                                        : "validated"
                            };

                        validQuestions.push(
                            normalized
                        );
                    }
                }
            );

            return validQuestions;
        },

        /* ---------------------------------------------------
           Get Invalid Questions
           --------------------------------------------------- */

        getInvalidQuestions(
            questions
        ) {

            if (
                !Array.isArray(
                    questions
                )
            ) {
                return [];
            }

            return questions.filter(
                (question) =>
                    !this.validate(
                        question
                    )
            );
        },

        /* ---------------------------------------------------
           Get Review Questions
           --------------------------------------------------- */

        getReviewQuestions(
            questions
        ) {

            if (
                !Array.isArray(
                    questions
                )
            ) {
                return [];
            }

            return questions.filter(
                (question) => {

                    const result =
                        this.validateDetailed(
                            question
                        );

                    return (
                        result.needsReview ||
                        question.needsReview
                    );
                }
            );
        },

        /* ---------------------------------------------------
           Validate Question Bank
           --------------------------------------------------- */

        validateBank(
            questions
        ) {

            const list =
                Array.isArray(
                    questions
                )
                    ? questions
                    : [];

            const report = {
                total:
                    list.length,

                valid:
                    0,

                invalid:
                    0,

                needsReview:
                    0,

                mcq:
                    0,

                msq:
                    0,

                nat:
                    0,

                ga:
                    0,

                me:
                    0,

                unknown:
                    0,

                errors:
                    []
            };

            list.forEach(
                (question) => {

                    const result =
                        this.validateDetailed(
                            question
                        );

                    if (
                        result.valid
                    ) {
                        report.valid++;
                    } else {
                        report.invalid++;
                    }

                    if (
                        result.needsReview
                    ) {
                        report.needsReview++;
                    }

                    const type =
                        String(
                            question.type ||
                            ""
                        ).toUpperCase();

                    if (
                        type === "MCQ"
                    ) {
                        report.mcq++;
                    } else if (
                        type === "MSQ"
                    ) {
                        report.msq++;
                    } else
