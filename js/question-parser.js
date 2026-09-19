/* =========================================================
   GATE TEST SERIES
   Question Parser
   File: js/question-parser.js
   ========================================================= */

(function () {
    "use strict";

    const QuestionParser = {

        /* ---------------------------------------------------
           Configuration
           --------------------------------------------------- */

        config: {
            optionLabels: ["A", "B", "C", "D"],

            questionPattern:
                /^\s*(?:Q\.?\s*)?(\d{1,3})\s*[\.\):\-]\s*/i,

            optionPattern:
                /^\s*(?:\(([A-D])\)|([A-D])[\.\):\-])\s*(.*)$/i,

            typePatterns: {
                MCQ:
                    /\bMCQ\b|multiple\s+choice/i,

                MSQ:
                    /\bMSQ\b|multiple\s+select|select\s+all/i,

                NAT:
                    /\bNAT\b|numerical\s+answer/i
            }
        },

        /* ---------------------------------------------------
           Main Parse
           --------------------------------------------------- */

        async parse(input) {

            if (!input) {
                return [];
            }

            /*
             * PDFParser has already separated questions.
             * This parser converts those blocks into a
             * consistent question-bank structure.
             */

            if (
                Array.isArray(input)
            ) {
                return this.parseBlocks(
                    input
                );
            }

            if (
                input.questions &&
                Array.isArray(
                    input.questions
                )
            ) {
                return this.parseBlocks(
                    input.questions
                );
            }

            if (
                typeof input.text ===
                "string"
            ) {
                return this.parseRawText(
                    input.text
                );
            }

            if (
                typeof input ===
                "string"
            ) {
                return this.parseRawText(
                    input
                );
            }

            return [];
        },

        /* ---------------------------------------------------
           Parse Blocks
           --------------------------------------------------- */

        parseBlocks(blocks) {

            const questions = [];

            blocks.forEach(
                (block, index) => {

                    if (!block) {
                        return;
                    }

                    /*
                     * Already structured question.
                     */

                    if (
                        block.text &&
                        (
                            block.options ||
                            block.question ||
                            block.number
                        )
                    ) {

                        const question =
                            this.normalizeQuestion(
                                block,
                                index
                            );

                        if (question) {
                            questions.push(
                                question
                            );
                        }

                        return;
                    }

                    /*
                     * Raw text block.
                     */

                    if (
                        typeof block ===
                        "string"
                    ) {

                        const question =
                            this.parseBlockText(
                                block,
                                index
                            );

                        if (question) {
                            questions.push(
                                question
                            );
                        }
                    }
                }
            );

            return this.removeInvalidQuestions(
                questions
            );
        },

        /* ---------------------------------------------------
           Parse Raw Text
           --------------------------------------------------- */

        parseRawText(text) {

            if (
                typeof text !== "string" ||
                !text.trim()
            ) {
                return [];
            }

            const blocks =
                this.splitQuestions(
                    text
                );

            return this.parseBlocks(
                blocks
            );
        },

        /* ---------------------------------------------------
           Split Questions
           --------------------------------------------------- */

        splitQuestions(text) {

            const lines =
                text
                    .replace(/\r\n/g, "\n")
                    .replace(/\r/g, "\n")
                    .split("\n");

            const blocks = [];

            let current = null;

            lines.forEach(
                (line) => {

                    const clean =
                        line.trim();

                    const match =
                        clean.match(
                            this.config.questionPattern
                        );

                    if (match) {

                        if (current) {
                            blocks.push(
                                current
                            );
                        }

                        current = {
                            number:
                                Number(
                                    match[1]
                                ),

                            lines: [
                                clean
                            ]
                        };

                        return;
                    }

                    if (current) {
                        current.lines.push(
                            clean
                        );
                    }
                }
            );

            if (current) {
                blocks.push(
                    current
                );
            }

            return blocks.map(
                (block) => ({
                    number:
                        block.number,

                    text:
                        block.lines.join("\n")
                })
            );
        },

        /* ---------------------------------------------------
           Parse Block Text
           --------------------------------------------------- */

        parseBlockText(
            block,
            index
        ) {

            const lines =
                String(block)
                    .split("\n")
                    .map(
                        (line) =>
                            line.trim()
                    )
                    .filter(
                        Boolean
                    );

            if (!lines.length) {
                return null;
            }

            const first =
                lines[0].match(
                    this.config.questionPattern
                );

            const number =
                first
                    ? Number(first[1])
                    : index + 1;

            const type =
                this.detectType(
                    block
                );

            const options =
                this.extractOptions(
                    lines
                );

            const questionText =
                this.extractQuestion(
                    lines
                );

            const answer =
                this.extractAnswer(
                    block
                );

            const solution =
                this.extractSolution(
                    block
                );

            return this.createQuestion({
                number:
                    number,

                type:
                    type,

                text:
                    questionText,

                options:
                    options,

                answer:
                    answer,

                solution:
                    solution
            });
        },

        /* ---------------------------------------------------
           Normalize Existing Question
           --------------------------------------------------- */

        normalizeQuestion(
            question,
            index
        ) {

            const number =
                Number(
                    question.number
                ) ||
                index + 1;

            const text =
                question.question ||
                question.text ||
                "";

            const type =
                this.detectType(
                    question.type ||
                    text
                );

            const options =
                this.normalizeOptions(
                    question.options
                );

            const answer =
                this.normalizeAnswer(
                    question.answer ||
                    question.correctAnswer
                );

            const normalized =
                this.createQuestion({
                    ...question,

                    number:
                        number,

                    type:
                        type,

                    text:
                        text,

                    options:
                        options,

                    answer:
                        answer,

                    solution:
                        question.solution ||
                        ""
                });

            /*
             * Preserve parser metadata.
             */

            if (
                question.pageStart !==
                undefined
            ) {
                normalized.pageStart =
                    question.pageStart;
            }

            if (
                question.pageEnd !==
                undefined
            ) {
                normalized.pageEnd =
                    question.pageEnd;
            }

            if (
                question.needsReview !==
                undefined
            ) {
                normalized.needsReview =
                    Boolean(
                        question.needsReview
                    );
            }

            return normalized;
        },

        /* ---------------------------------------------------
           Create Standard Question
           --------------------------------------------------- */

        createQuestion(data) {

            const type =
                this.normalizeType(
                    data.type
                );

            const options =
                this.normalizeOptions(
                    data.options
                );

            const answer =
                this.normalizeAnswer(
                    data.answer
                );

            const marks =
                this.normalizeMarks(
                    data.marks,
                    type
                );

            const negativeMarks =
                this.normalizeNegativeMarks(
                    data.negativeMarks,
                    marks,
                    type
                );

            const question = {

                id:
                    data.id ||
                    `question-${data.number}`,

                number:
                    Number(
                        data.number
                    ) || 0,

                section:
                    this.normalizeSection(
                        data.section
                    ),

                type:
                    type,

                text:
                    this.cleanQuestionText(
                        data.text ||
                        data.question ||
                        ""
                    ),

                question:
                    this.cleanQuestionText(
                        data.text ||
                        data.question ||
                        ""
                    ),

                options:
                    options,

                answer:
                    answer,

                correctAnswer:
                    answer,

                marks:
                    marks,

                negativeMarks:
                    negativeMarks,

                solution:
                    this.cleanSolution(
                        data.solution ||
                        ""
                    ),

                explanation:
                    this.cleanSolution(
                        data.explanation ||
                        data.solution ||
                        ""
                    ),

                image:
                    data.image ||
                    null,

                figure:
                    data.figure ||
                    null,

                pageStart:
                    data.pageStart ||
                    null,

                pageEnd:
                    data.pageEnd ||
                    null,

                needsReview:
                    Boolean(
                        data.needsReview
                    ),

                parserStatus:
                    data.parserStatus ||
                    "parsed"
            };

            /*
             * Additional source information is retained
             * without altering the extracted question.
             */

            if (data.source) {
                question.source =
                    data.source;
            }

            if (data.sourceFile) {
                question.sourceFile =
                    data.sourceFile;
            }

            return question;
        },

        /* ---------------------------------------------------
           Detect Type
           --------------------------------------------------- */

        detectType(value) {

            const text =
                String(value || "");

            if (
                this.config.typePatterns.NAT
                    .test(text)
            ) {
                return "NAT";
            }

            if (
                this.config.typePatterns.MSQ
                    .test(text)
            ) {
                return "MSQ";
            }

            if (
                this.config.typePatterns.MCQ
                    .test(text)
            ) {
                return "MCQ";
            }

            /*
             * Additional wording.
             */

            if (
                /numerical\s+answer/i.test(
                    text
                )
            ) {
                return "NAT";
            }

            if (
                /one\s+or\s+more\s+options/i.test(
                    text
                ) ||
                /select\s+one\s+or\s+more/i.test(
                    text
                )
            ) {
                return "MSQ";
            }

            /*
             * If four options are present, MCQ is
             * the safest structural interpretation.
             */

            return "MCQ";
        },

        /* ---------------------------------------------------
           Normalize Type
           --------------------------------------------------- */

        normalizeType(type) {

            const value =
                String(
                    type || "MCQ"
                )
                    .trim()
                    .toUpperCase();

            if (
                value === "NAT" ||
                value.includes(
                    "NUMERICAL"
                )
            ) {
                return "NAT";
            }

            if (
                value === "MSQ" ||
                value.includes(
                    "MULTIPLE SELECT"
                )
            ) {
                return "MSQ";
            }

            return "MCQ";
        },

        /* ---------------------------------------------------
           Detect Section
           --------------------------------------------------- */

        normalizeSection(section) {

            const value =
                String(
                    section || ""
                )
                    .trim()
                    .toUpperCase();

            if (
                value === "GA" ||
                value === "G.A." ||
                value.includes(
                    "APTITUDE"
                ) ||
                value.includes(
                    "GENERAL"
                )
            ) {
                return "GA";
            }

            if (
                value === "ME" ||
                value.includes(
                    "MECHANICAL"
                )
            ) {
                return "ME";
            }

            return "UNKNOWN";
        },

        /* ---------------------------------------------------
           Extract Options
           --------------------------------------------------- */

        extractOptions(lines) {

            const options = [];

            let current = null;

            lines.forEach(
                (line) => {

                    const match =
                        line.match(
                            this.config.optionPattern
                        );

                    if (match) {

                        const label =
                            (
                                match[1] ||
                                match[2]
                            ).toUpperCase();

                        const text =
                            String(
                                match[3] ||
                                ""
                            ).trim();

                        current = {
                            label:
                                label,

                            text:
                                text
                        };

                        options.push(
                            current
                        );

                        return;
                    }

                    /*
                     * Multi-line option.
                     */

                    if (
                        current &&
                        line &&
                        !this.isControlLine(
                            line
                        )
                    ) {

                        current.text =
                            `${current.text} ${line}`
                                .trim();
                    }
                }
            );

            return options;
        },

        /* ---------------------------------------------------
           Normalize Options
           --------------------------------------------------- */

        normalizeOptions(options) {

            if (
                !Array.isArray(options)
            ) {
                return [];
            }

            return options
                .map(
                    (option, index) => {

                        /*
                         * Object format.
                         */

                        if (
                            option &&
                            typeof option ===
                                "object"
                        ) {

                            const label =
                                option.label ||
                                this.config
                                    .optionLabels[
                                        index
                                    ] ||
                                String(
                                    index + 1
                                );

                            return {
                                label:
                                    String(
                                        label
                                    ).toUpperCase(),

                                text:
                                    this.cleanOptionText(
                                        option.text ||
                                        option.value ||
                                        ""
                                    )
                            };
                        }

                        /*
                         * String format.
                         */

                        return {
                            label:
                                this.config
                                    .optionLabels[
                                        index
                                    ] ||
                                String(
                                    index + 1
                                ),

                            text:
                                this.cleanOptionText(
                                    option
                                )
                        };
                    }
                )
                .filter(
                    (option) =>
                        option.text.length > 0
                );
        },

        /* ---------------------------------------------------
           Extract Question Text
           --------------------------------------------------- */

        extractQuestion(lines) {

            const result = [];

            let optionStarted =
                false;

            lines.forEach(
                (line, index) => {

                    if (
                        index === 0
                    ) {

                        result.push(
                            line.replace(
                                this.config
                                    .questionPattern,
                                ""
                            )
                        );

                        return;
                    }

                    if (
                        this.config.optionPattern
                            .test(line)
                    ) {
                        optionStarted =
                            true;
                        return;
                    }

                    if (
                        optionStarted
                    ) {
                        return;
                    }

                    if (
                        this.isControlLine(
                            line
                        )
                    ) {
                        return;
                    }

                    result.push(
                        line
                    );
                }
            );

            return result
                .join(" ")
                .replace(
                    /\s{2,}/g,
                    " "
                )
                .trim();
        },

        /* ---------------------------------------------------
           Extract Answer
           --------------------------------------------------- */

        extractAnswer(text) {

            const value =
                String(text || "");

            const patterns = [

                /correct\s+answer\s*[:\-]\s*([^\n]+)/i,

                /answer\s*[:\-]\s*([^\n]+)/i,

                /ans(?:wer)?\s*key\s*[:\-]\s*([^\n]+)/i
            ];

            for (
                const pattern of patterns
            ) {

                const match =
                    value.match(
                        pattern
                    );

                if (!match) {
                    continue;
                }

                return this.normalizeAnswer(
                    match[1]
                );
            }

            return null;
        },

        /* ---------------------------------------------------
           Normalize Answer
           --------------------------------------------------- */

        normalizeAnswer(answer) {

            if (
                answer === null ||
                answer === undefined
            ) {
                return null;
            }

            if (
                Array.isArray(answer)
            ) {

                return [
                    ...new Set(
                        answer
                            .map(
                                (value) =>
                                    this.normalizeAnswer(
                                        value
                                    )
                            )
                            .flat()
                    )
                ];
            }

            if (
                typeof answer ===
                "number"
            ) {
                return answer;
            }

            let value =
                String(answer)
                    .trim();

            value =
                value.replace(
                    /^(?:correct\s+)?answer\s*[:\-]?\s*/i,
                    ""
                );

            /*
             * Remove solution/explanation text.
             */

            value =
                value.split(
                    /(?:solution|explanation)\s*:/i
                )[0]
                .trim();

            /*
             * MSQ: A,B,C or (A,B)
             */

            const compact =
                value
                    .replace(
                        /[\(\)\[\]\{\}\s]/g,
                        ""
                    );

            if (
                /^[A-D](?:[,\/&][A-D])+$/i.test(
                    compact
                )
            ) {

                return [
                    ...new Set(
                        compact
                            .split(
                                /[,\/&]/
                            )
                            .map(
                                (x) =>
                                    x.toUpperCase()
                            )
                    )
                ];
            }

            /*
             * Single option.
             */

            const letter =
                compact.match(
                    /^[A-D]$/i
                );

            if (letter) {
                return letter[0]
                    .toUpperCase();
            }

            /*
             * Numeric answer.
             */

            const numeric =
                value.match(
                    /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/
                );

            if (numeric) {
                return Number(
                    numeric[0]
                );
            }

            return value;
        },

        /* ---------------------------------------------------
           Extract Solution
           --------------------------------------------------- */

        extractSolution(text) {

            const value =
                String(text || "");

            const match =
                value.match(
                    /(?:solution|explanation|soln\.?)\s*[:\-]\s*([\s\S]*)/i
                );

            if (!match) {
                return "";
            }

            return this.cleanSolution(
                match[1]
            );
        },

        /* ---------------------------------------------------
           Clean Question Text
           --------------------------------------------------- */

        cleanQuestionText(text) {

            return String(text || "")
                .replace(
                    /^\s*(?:Q\.?\s*)?\d{1,3}\s*[\.\):\-]\s*/i,
                    ""
                )
                .replace(
                    /\s{2,}/g,
                    " "
                )
                .trim();
        },

        /* ---------------------------------------------------
           Clean Option Text
           --------------------------------------------------- */

        cleanOptionText(text) {

            return String(text || "")
                .replace(
                    /^\s*(?:\([A-D]\)|[A-D][\.\):\-])\s*/i,
                    ""
                )
                .replace(
                    /\s{2,}/g,
                    " "
                )
                .trim();
        },

        /* ---------------------------------------------------
           Clean Solution
           --------------------------------------------------- */

        cleanSolution(text) {

            return String(text || "")
                .replace(
                    /\s{2,}/g,
                    " "
                )
                .trim();
        },

        /* ---------------------------------------------------
           Normalize Marks
           --------------------------------------------------- */

        normalizeMarks(
            marks,
            type
        ) {

            const value =
                Number(marks);

            if (
                Number.isFinite(value) &&
                value > 0
            ) {
                return value;
            }

            /*
             * GATE-style default only when the source does
             * not explicitly provide marks.
             */

            if (type === "MCQ") {
                return 1;
            }

            if (type === "MSQ") {
                return 1;
            }

            if (type === "NAT") {
                return 1;
            }

            return 1;
        },

        /* ---------------------------------------------------
           Normalize Negative Marks
           --------------------------------------------------- */

        normalizeNegativeMarks(
            negativeMarks,
            marks,
            type
        ) {

            const value =
                Number(
                    negativeMarks
                );

            if (
                Number.isFinite(value) &&
                value >= 0
            ) {
                return value;
            }

            /*
             * Default GATE-style negative marking for MCQ.
             * MSQ and NAT have no negative marking by default.
             */

            if (type === "MCQ") {

                if (
                    Math.abs(
                        marks - 1
                    ) < 0.001
                ) {
                    return 1 / 3;
                }

                if (
                    Math.abs(
                        marks - 2
                    ) < 0.001
                ) {
                    return 2 / 3;
                }
            }

            return 0;
        },

        /* ---------------------------------------------------
           Control Line
           --------------------------------------------------- */

        isControlLine(line) {

            const value =
                String(line || "")
                    .trim();

            if (!value) {
                return true;
            }

            return (
                /^(?:MCQ|MSQ|NAT)$/i.test(
                    value
                ) ||

                /^(?:marks?|negative\s+marking)\s*[:\-]/i.test(
                    value
                ) ||

                /^section\s*[:\-]/i.test(
                    value
                ) ||

                /^(?:solution|explanation)\s*[:\-]/i.test(
                    value
                ) ||

                /^(?:correct\s+)?answer\s*[:\-]/i.test(
                    value
                )
            );
        },

        /* ---------------------------------------------------
           Question Completeness
           --------------------------------------------------- */

        isComplete(question) {

            if (!question) {
                return false;
            }

            if (
                !question.text ||
                question.text.length < 3
            ) {
                return false;
            }

            if (
                question.type === "NAT"
            ) {
                return true;
            }

            return (
                Array.isArray(
                    question.options
                ) &&
                question.options.length >= 2
            );
        },

        /* ---------------------------------------------------
           Review Detection
           --------------------------------------------------- */

        needsReview(question) {

            if (
                !this.isComplete(
                    question
                )
            ) {
                return true;
            }

            /*
             * Do not silently guess answers.
             */

            if (
                question.answer ===
                    null ||
                question.answer ===
                    undefined
            ) {
                return true;
            }

            if (
                question.type ===
                    "MCQ" &&
                question.options.length <
                    4
            ) {
                return true;
            }

            if (
                question.type ===
                    "MSQ" &&
                question.options.length <
                    2
            ) {
                return true;
            }

            return false;
        },

        /* ---------------------------------------------------
           Remove Invalid Questions
           --------------------------------------------------- */

        removeInvalidQuestions(
            questions
        ) {

            if (
                !Array.isArray(
                    questions
                )
            ) {
                return [];
            }

            return questions
                .filter(
                    (question) =>
                        question &&
                        Number.isFinite(
                            Number(
                                question.number
                            )
                        )
                )
                .map(
                    (question) => {

                        question.needsReview =
                            this.needsReview(
                                question
                            );

                        if (
                            question.needsReview
                        ) {
                            question.parserStatus =
                                "needs-review";
                        }

                        return question;
                    }
                );
        },

        /* ---------------------------------------------------
           Sort Questions
           --------------------------------------------------- */

        sortQuestions(
            questions
        ) {

            if (
                !Array.isArray(
                    questions
                )
            ) {
                return [];
            }

            return [
                ...questions
            ].sort(
                (a, b) =>
                    Number(
                        a.number
                    ) -
                    Number(
                        b.number
                    )
            );
        }
    };

    /* -------------------------------------------------------
       Expose Globally
       ------------------------------------------------------- */

    window.QuestionParser =
        QuestionParser;

})();
