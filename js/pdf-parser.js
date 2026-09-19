/* =========================================================
   GATE TEST SERIES
   PDF Parser
   File: js/pdf-parser.js
   ========================================================= */

(function () {
    "use strict";

    const PDFParser = {

        config: {
            questionStart:
                /(?:^|\s)(?:Q\.?\s*)?(\d{1,3})\s*[\.\):\-]/i,

            questionOnly:
                /^\s*(?:Q\.?\s*)?(\d{1,3})\s*[\.\):\-]\s*/i,

            mcq:
                /\b(?:MCQ|Multiple\s+Choice\s+Question)\b/i,

            msq:
                /\b(?:MSQ|Multiple\s+Select\s+Question)\b/i,

            nat:
                /\b(?:NAT|Numerical\s+Answer\s+Type)\b/i,

            answer:
                /(?:correct\s+answer|answer|ans(?:wer)?\s*key)\s*[:\-]?\s*(.*)/i,

            solution:
                /(?:solution|explanation|soln\.?)\s*[:\-]?\s*/i
        },

        /* ---------------------------------------------------
           Main Parse Function
           --------------------------------------------------- */

        async parse(input) {

            /*
             * Input may be:
             *
             * 1. PDFLoader result
             * 2. PDF.js document
             * 3. Text object
             * 4. Raw string
             */

            const source =
                await this.normalizeInput(
                    input
                );

            if (!source) {
                return [];
            }

            const pages =
                source.pages || [];

            if (pages.length > 0) {

                return this.parsePages(
                    pages
                );
            }

            if (source.text) {

                return this.parseText(
                    source.text
                );
            }

            return [];
        },

        /* ---------------------------------------------------
           Normalize Input
           --------------------------------------------------- */

        async normalizeInput(input) {

            if (!input) {
                return null;
            }

            /*
             * Already extracted text.
             */

            if (
                typeof input === "object" &&
                typeof input.text === "string"
            ) {
                return {
                    text: input.text,
                    pages: input.pages || []
                };
            }

            /*
             * PDFLoader result.
             */

            if (
                input.pdf &&
                typeof PDFLoader !==
                    "undefined"
            ) {

                try {

                    return await PDFLoader.extractText(
                        input.pdf
                    );

                } catch (error) {

                    console.warn(
                        "Unable to extract PDF text:",
                        error
                    );

                    return null;
                }
            }

            /*
             * Direct PDF.js document.
             */

            if (
                input.numPages &&
                typeof input.getPage ===
                    "function" &&
                typeof PDFLoader !==
                    "undefined"
            ) {

                try {

                    return await PDFLoader.extractText(
                        input
                    );

                } catch (error) {

                    console.warn(
                        "Unable to extract PDF text:",
                        error
                    );

                    return null;
                }
            }

            /*
             * String.
             */

            if (
                typeof input === "string"
            ) {

                return {
                    text: input,
                    pages: []
                };
            }

            return null;
        },

        /* ---------------------------------------------------
           Parse Pages
           --------------------------------------------------- */

        parsePages(pages) {

            const questions = [];

            pages.forEach(
                (page, pageIndex) => {

                    if (!page) {
                        return;
                    }

                    const pageText =
                        typeof page === "string"
                            ? page
                            : page.text || "";

                    if (
                        !pageText.trim()
                    ) {
                        return;
                    }

                    const pageQuestions =
                        this.parseText(
                            pageText
                        );

                    pageQuestions.forEach(
                        (question) => {

                            if (
                                !question.pageStart
                            ) {
                                question.pageStart =
                                    page.pageNumber ||
                                    pageIndex + 1;
                            }

                            if (
                                !question.pageEnd
                            ) {
                                question.pageEnd =
                                    page.pageNumber ||
                                    pageIndex + 1;
                            }

                            questions.push(
                                question
                            );
                        }
                    );
                }
            );

            return this.mergeQuestions(
                questions
            );
        },

        /* ---------------------------------------------------
           Parse Complete Text
           --------------------------------------------------- */

        parseText(text) {

            if (
                typeof text !== "string" ||
                !text.trim()
            ) {
                return [];
            }

            const normalized =
                this.normalizeText(
                    text
                );

            const blocks =
                this.splitIntoQuestionBlocks(
                    normalized
                );

            const questions = [];

            blocks.forEach(
                (block) => {

                    const question =
                        this.parseQuestionBlock(
                            block.text,
                            block.number
                        );

                    if (question) {

                        question.pageStart =
                            block.pageStart;

                        question.pageEnd =
                            block.pageEnd;

                        questions.push(
                            question
                        );
                    }
                }
            );

            return this.mergeQuestions(
                questions
            );
        },

        /* ---------------------------------------------------
           Normalize Text
           --------------------------------------------------- */

        normalizeText(text) {

            return String(text)
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .replace(/\u00a0/g, " ")
                .replace(/[ \t]+/g, " ")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
        },

        /* ---------------------------------------------------
           Split Question Blocks
           --------------------------------------------------- */

        splitIntoQuestionBlocks(text) {

            const lines =
                text.split("\n");

            const blocks = [];

            let current = null;

            let pageNumber = 1;

            lines.forEach(
                (rawLine) => {

                    const line =
                        rawLine.trim();

                    /*
                     * Page marker heuristics.
                     */

                    if (
                        /^page\s+\d+/i.test(line)
                    ) {

                        const match =
                            line.match(
                                /(\d+)/
                            );

                        if (match) {
                            pageNumber =
                                Number(
                                    match[1]
                                );
                        }
                    }

                    if (!line) {

                        if (current) {
                            current.lines.push("");
                        }

                        return;
                    }

                    const match =
                        line.match(
                            this.config.questionOnly
                        );

                    if (match) {

                        const number =
                            Number(
                                match[1]
                            );

                        /*
                         * Question numbers in a normal
                         * GATE paper should progress reasonably.
                         *
                         * This deliberately avoids accepting
                         * every arbitrary number as a question.
                         */

                        if (
                            number >= 1 &&
                            number <= 999
                        ) {

                            if (current) {

                                current.pageEnd =
                                    pageNumber;

                                blocks.push(
                                    current
                                );
                            }

                            current = {
                                number:
                                    number,

                                pageStart:
                                    pageNumber,

                                pageEnd:
                                    pageNumber,

                                lines: [
                                    line
                                ]
                            };

                            return;
                        }
                    }

                    if (current) {
                        current.lines.push(
                            line
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

                    pageStart:
                        block.pageStart,

                    pageEnd:
                        block.pageEnd,

                    text:
                        block.lines.join("\n")
                })
            );
        },

        /* ---------------------------------------------------
           Parse Question Block
           --------------------------------------------------- */

        parseQuestionBlock(
            blockText,
            questionNumber
        ) {

            if (
                !blockText ||
                !Number.isFinite(
                    questionNumber
                )
            ) {
                return null;
            }

            const lines =
                blockText
                    .split("\n")
                    .map(
                        (line) =>
                            line.trim()
                    )
                    .filter(
                        (line) =>
                            line.length > 0
                    );

            if (lines.length === 0) {
                return null;
            }

            const type =
                this.detectQuestionType(
                    blockText
                );

            const section =
                this.detectSection(
                    blockText
                );

            const marks =
                this.detectMarks(
                    blockText
                );

            const negativeMarks =
                this.detectNegativeMarks(
                    blockText
                );

            const optionData =
                this.extractOptions(
                    lines
                );

            const answer =
                this.extractAnswer(
                    blockText
                );

            const solution =
                this.extractSolution(
                    blockText
                );

            const questionText =
                this.extractQuestionText(
                    lines,
                    optionData
                );

            /*
             * Do not create a question if the parser has
             * essentially found only an answer/solution block.
             */

            if (
                !questionText ||
                questionText.length < 3
            ) {
                return null;
            }

            const needsReview =
                this.needsReview({
                    questionText:
                        questionText,

                    options:
                        optionData.options,

                    type:
                        type,

                    answer:
                        answer
                });

            return {
                id:
                    `q-${questionNumber}-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 7)}`,

                number:
                    questionNumber,

                type:
                    type,

                section:
                    section,

                marks:
                    marks,

                negativeMarks:
                    negativeMarks,

                text:
                    questionText,

                question:
                    questionText,

                options:
                    optionData.options,

                optionLabels:
                    optionData.labels,

                answer:
                    answer,

                correctAnswer:
                    answer,

                solution:
                    solution,

                needsReview:
                    needsReview,

                parserStatus:
                    needsReview
                        ? "needs-review"
                        : "parsed"
            };
        },

        /* ---------------------------------------------------
           Detect Question Type
           --------------------------------------------------- */

        detectQuestionType(text) {

            const value =
                String(text || "");

            if (
                this.config.nat.test(
                    value
                )
            ) {
                return "NAT";
            }

            if (
                this.config.msq.test(
                    value
                )
            ) {
                return "MSQ";
            }

            if (
                this.config.mcq.test(
                    value
                )
            ) {
                return "MCQ";
            }

            /*
             * Look for NAT-specific wording.
             */

            if (
                /numerical answer/i.test(
                    value
                ) ||
                /enter.*answer/i.test(
                    value
                ) ||
                /answer.*(?:range|decimal)/i.test(
                    value
                )
            ) {
                return "NAT";
            }

            /*
             * Multiple-select wording.
             */

            if (
                /select all that apply/i.test(
                    value
                ) ||
                /one or more correct/i.test(
                    value
                )
            ) {
                return "MSQ";
            }

            return "MCQ";
        },

        /* ---------------------------------------------------
           Detect Section
           --------------------------------------------------- */

        detectSection(text) {

            const value =
                String(text || "")
                    .toLowerCase();

            if (
                /general aptitude|aptitude|verbal ability|numerical ability/.test(
                    value
                )
            ) {
                return "GA";
            }

            if (
                /mechanical engineering|engineering mathematics|thermodynamics|fluid mechanics|heat transfer|manufacturing|machine design|theory of machines|ic engine|power plant|production engineering/.test(
                    value
                )
            ) {
                return "ME";
            }

            /*
             * If section cannot be determined, default to ME
             * only when the document is clearly a Mechanical
             * test. Otherwise mark it as UNKNOWN.
             */

            if (
                /GATE.*ME|mechanical engineering/i.test(
                    value
                )
            ) {
                return "ME";
            }

            return "UNKNOWN";
        },

        /* ---------------------------------------------------
           Detect Marks
           --------------------------------------------------- */

        detectMarks(text) {

            const value =
                String(text || "");

            /*
             * Common formats:
             *
             * +2
             * 2 marks
             * Marks: 2
             */

            const patterns = [
                /(?:marks?|maximum\s+marks?)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
                /\+(\d+(?:\.\d+)?)\s*(?:marks?)?/i
            ];

            for (
                const pattern of patterns
            ) {

                const match =
                    value.match(
                        pattern
                    );

                if (match) {

                    const number =
                        Number(
                            match[1]
                        );

                    if (
                        Number.isFinite(
                            number
                        )
                    ) {
                        return number;
                    }
                }
            }

            return 1;
        },

        /* ---------------------------------------------------
           Detect Negative Marks
           --------------------------------------------------- */

        detectNegativeMarks(text) {

            const value =
                String(text || "");

            const patterns = [

                /[-−]\s*(\d+(?:\.\d+)?)\s*(?:marks?)?/i,

                /negative\s+mark(?:ing)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,

                /minus\s*(\d+(?:\.\d+)?)/i
            ];

            for (
                const pattern of patterns
            ) {

                const match =
                    value.match(
                        pattern
                    );

                if (match) {

                    const number =
                        Number(
                            match[1]
                        );

                    if (
                        Number.isFinite(
                            number
                        )
                    ) {
                        return number;
                    }
                }
            }

            /*
             * GATE-style fallback:
             *
             * 1-mark MCQ → 1/3
             * 2-mark MCQ → 2/3
             *
             * This is only used when the source does not
             * explicitly provide a negative-marking value.
             */

            const marks =
                this.detectMarks(
                    value
                );

            if (
                this.detectQuestionType(
                    value
                ) === "MCQ"
            ) {

                if (
                    Math.abs(marks - 1) <
                    0.001
                ) {
                    return 1 / 3;
                }

                if (
                    Math.abs(marks - 2) <
                    0.001
                ) {
                    return 2 / 3;
                }
            }

            return 0;
        },

        /* ---------------------------------------------------
           Extract Options
           --------------------------------------------------- */

        extractOptions(lines) {

            const options = [];
            const labels = [];

            let current = null;

            const optionPattern =
                /^\s*(?:\(([A-D])\)|([A-D])[\.\):\-])\s*(.*)$/i;

            lines.forEach(
                (line) => {

                    const match =
                        line.match(
                            optionPattern
                        );

                    if (match) {

                        const label =
                            (
                                match[1] ||
                                match[2] ||
                                ""
                            ).toUpperCase();

                        const text =
                            String(
                                match[3] || ""
                            ).trim();

                        current = {
                            label:
                                label,

                            text:
                                text
                        };

                        labels.push(
                            label
                        );

                        options.push(
                            text
                        );

                        return;
                    }

                    /*
                     * If an option spans multiple lines,
                     * append continuation text.
                     */

                    if (
                        current &&
                        line &&
                        !this.isMetadataLine(
                            line
                        )
                    ) {

                        const index =
                            options.length - 1;

                        options[index] =
                            `${options[index]} ${line}`.trim();
                    }
                }
            );

            return {
                options:
                    options,

                labels:
                    labels
            };
        },

        /* ---------------------------------------------------
           Extract Question Text
           --------------------------------------------------- */

        extractQuestionText(
            lines,
            optionData
        ) {

            if (
                !Array.isArray(lines) ||
                lines.length === 0
            ) {
                return "";
            }

            const optionStart =
                lines.findIndex(
                    (line) => {
                        return /^\s*(?:\([A-D]\)|[A-D][\.\):\-])\s*/i.test(
                            line
                        );
                    }
                );

            let end =
                optionStart >= 0
                    ? optionStart
                    : lines.length;

            const questionLines =
                lines.slice(
                    0,
                    end
                );

            const filtered =
                questionLines.filter(
                    (line) => {

                        if (
                            this.isMetadataLine(
                                line
                            )
                        ) {
                            return false;
                        }

                        if (
                            this.config.solution.test(
                                line
                            )
                        ) {
                            return false;
                        }

                        if (
                            this.config.answer.test(
                                line
                            )
                        ) {
                            return false;
                        }

                        return true;
                    }
                );

            let result =
                filtered.join(" ");

            /*
             * Remove question number from beginning.
             */

            result =
                result.replace(
                    this.config.questionOnly,
                    ""
                );

            return result
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

            /*
             * First check explicit "Correct answer".
             */

            const explicit =
                value.match(
                    /correct\s+answer\s*[:\-]?\s*([^\n]+)/i
                );

            if (explicit) {

                return this.normalizeAnswer(
                    explicit[1]
                );
            }

            /*
             * Other answer-key forms.
             */

            const answer =
                value.match(
                    /(?:answer|ans(?:wer)?\s*key)\s*[:\-]\s*([^\n]+)/i
                );

            if (answer) {

                return this.normalizeAnswer(
                    answer[1]
                );
            }

            return null;
        },

        /* ---------------------------------------------------
           Normalize Answer
           --------------------------------------------------- */

        normalizeAnswer(value) {

            if (
                value === null ||
                value === undefined
            ) {
                return null;
            }

            let answer =
                String(value)
                    .trim();

            /*
             * Stop at solution/explanation.
             */

            answer =
                answer.split(
                    /(?:solution|explanation)\s*:/i
                )[0]
                .trim();

            /*
             * Remove common labels.
             */

            answer =
                answer.replace(
                    /^(?:option|answer)\s*/i,
                    ""
                );

            /*
             * Multiple choice answer:
             * (A), A, A/B, A,B, (a,b)
             */

            const letters =
                answer.match(
                    /[A-D]/gi
                );

            if (
                letters &&
                letters.length > 0 &&
                letters.length <= 4
            ) {

                const unique =
                    [
                        ...new Set(
                            letters.map(
                                (letter) =>
                                    letter.toUpperCase()
                            )
                        )
                    ];

                /*
                 * If the answer is clearly composed
                 * only of option letters, return array
                 * for MSQ and string for MCQ.
                 */

                const cleaned =
                    answer
                        .replace(
                            /[\(\)\[\]\{\}\s,\/&]+/g,
                            ""
                        );

                if (
                    /^[A-D]+$/i.test(
                        cleaned
                    )
                ) {

                    if (
                        unique.length > 1
                    ) {
                        return unique;
                    }

                    return unique[0];
                }
            }

            /*
             * Numerical answer.
             */

            const number =
                answer.match(
                    /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/
                );

            if (number) {

                return Number(
                    number[0]
                );
            }

            return answer;
        },

        /* ---------------------------------------------------
           Extract Solution
           --------------------------------------------------- */

        extractSolution(text) {

            const value =
                String(text || "");

            const match =
                value.match(
                    /(?:solution|explanation|soln\.?)\s*[:\-]?\s*([\s\S]*)/i
                );

            if (!match) {
                return "";
            }

            let solution =
                match[1].trim();

            /*
             * Remove trailing answer-key text if present.
             */

            solution =
                solution.replace(
                    /(?:correct\s+answer|answer)\s*[:\-].*$/i,
                    ""
                );

            return solution.trim();
        },

        /* ---------------------------------------------------
           Metadata Line Detection
           --------------------------------------------------- */

        isMetadataLine(line) {

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

                /^question\s*(?:type|number)?\s*[:\-]/i.test(
                    value
                )
            );
        },

        /* ---------------------------------------------------
           Question Validation Heuristics
           --------------------------------------------------- */

        needsReview(data) {

            const text =
                String(
                    data.questionText || ""
                ).trim();

            const options =
                Array.isArray(
                    data.options
                )
                    ? data.options
                    : [];

            const type =
                data.type;

            const answer =
                data.answer;

            /*
             * Missing text.
             */

            if (text.length < 5) {
                return true;
            }

            /*
             * MCQ should normally have 4 options.
             */

            if (
                type === "MCQ" &&
                options.length < 4
            ) {
                return true;
            }

            /*
             * MSQ should normally have options.
             */

            if (
                type === "MSQ" &&
                options.length < 2
            ) {
                return true;
            }

            /*
             * NAT doesn't require options.
             */

            if (
                type === "NAT" &&
                options.length > 0
            ) {
                /*
                 * Not necessarily an error.
                 */
            }

            /*
             * Missing answer is review-worthy because
             * the source may place answer information
             * elsewhere in the PDF.
             */

            if (
                answer === null ||
                answer === undefined ||
                answer === ""
            ) {
                return true;
            }

            return false;
        },

        /* ---------------------------------------------------
           Merge Duplicate Questions
           --------------------------------------------------- */

        mergeQuestions(questions) {

            if (!Array.isArray(questions)) {
                return [];
            }

            const map =
                new Map();

            questions.forEach(
                (question) => {

                    if (!question) {
                        return;
                    }

                    const number =
                        Number(
                            question.number
                        );

                    if (
                        !Number.isFinite(
                            number
                        )
                    ) {
                        return;
                    }

                    /*
                     * If the same question number appears
                     * more than once because the question
                     * continues onto another page, merge
                     * only when the content is compatible.
                     */

                    if (
                        !map.has(number)
                    ) {

                        map.set(
                            number,
                            question
                        );

                        return;
                    }

                    const existing =
                        map.get(number);

                    const merged =
                        this.mergeQuestionData(
                            existing,
                            question
                        );

                    map.set(
                        number,
                        merged
                    );
                }
            );

            return Array.from(
                map.values()
            ).sort(
                (a, b) =>
                    Number(a.number) -
                    Number(b.number)
            );
        },

        /* ---------------------------------------------------
           Merge Question Data
           --------------------------------------------------- */

        mergeQuestionData(
            first,
            second
        ) {

            const merged = {
                ...first
            };

            if (
                (!merged.text ||
                    merged.text.length < 10) &&
                second.text
            ) {
                merged.text =
                    second.text;
            }

            if (
                (!merged.question ||
                    merged.question.length < 10) &&
                second.question
            ) {
                merged.question =
                    second.question;
            }

            if (
                (!Array.isArray(
                    merged.options
                ) ||
                    merged.options.length <
                        second.options.length) &&
                Array.isArray(
                    second.options
                )
            ) {
                merged.options =
                    second.options;
            }

            if (
                !merged.answer &&
                second.answer
            ) {
                merged.answer =
                    second.answer;

                merged.correctAnswer =
                    second.answer;
            }

            if (
                (!merged.solution ||
                    merged.solution.length < 5) &&
                second.solution
            ) {
                merged.solution =
                    second.solution;
            }

            if (
                merged.section ===
                    "UNKNOWN" &&
                second.section !==
                    "UNKNOWN"
            ) {
                merged.section =
                    second.section;
            }

            merged.pageEnd =
                Math.max(
                    Number(
                        merged.pageEnd || 0
                    ),
                    Number(
                        second.pageEnd || 0
                    )
                );

            merged.needsReview =
                Boolean(
                    merged.needsReview ||
                    second.needsReview
                );

            merged.parserStatus =
                merged.needsReview
                    ? "needs-review"
                    : "parsed";

            return merged;
        },

        /* ---------------------------------------------------
           Parse Answer Key Text
           --------------------------------------------------- */

        parseAnswerKey(text) {

            if (
                typeof text !== "string"
            ) {
                return {};
            }

            const result = {};

            const lines =
                text.split("\n");

            lines.forEach(
                (line) => {

                    const match =
                        line.match(
                            /^\s*(\d{1,3})\s*[\.\):\-]\s*([A-D](?:\s*[,\/]\s*[A-D])?|[-+]?\d*\.?\d+)\s*$/i
                        );

                    if (!match) {
                        return;
                    }

                    const number =
                        Number(
                            match[1]
                        );

                    const answer =
                        this.normalizeAnswer(
                            match[2]
                        );

                    result[number] =
                        answer;
                }
            );

            return result;
        },

        /* ---------------------------------------------------
           Apply External Answer Key
           --------------------------------------------------- */

        applyAnswerKey(
            questions,
            answerKey
        ) {

            if (
                !Array.isArray(
                    questions
                )
            ) {
                return [];
            }

            if (
                !answerKey ||
                typeof answerKey !==
                    "object"
            ) {
                return questions;
            }

            return questions.map(
                (question) => {

                    const number =
                        Number(
                            question.number
                        );

                    if (
                        Object.prototype.hasOwnProperty.call(
                            answerKey,
                            number
                        )
                    ) {

                        const answer =
                            answerKey[number];

                        return {
                            ...question,

                            answer:
                                answer,

                            correctAnswer:
                                answer,

                            needsReview:
                                false
                        };
                    }

                    return question;
                }
            );
        }
    };

    /* -------------------------------------------------------
       Expose Globally
       ------------------------------------------------------- */

    window.PDFParser =
        PDFParser;

})();
