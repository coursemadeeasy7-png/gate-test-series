/* =========================================================
   GATE TEST SERIES
   File: js/question-bank.js

   Purpose:
   - Store/manage parsed questions
   - Deduplicate questions
   - Validate question bank
   - Search/filter questions
   - Prepare questions for exam
   - Import/export question bank
   - Maintain compatibility with StorageManager
   ========================================================= */

(function () {
    "use strict";

    const QuestionBank = {

        /* -------------------------------------------------
           Configuration
        ------------------------------------------------- */

        VERSION: "1.0.0",

        STORAGE_KEY:
            (window.StorageManager && StorageManager.KEYS)
                ? StorageManager.KEYS.QUESTION_BANK
                : "gate_question_bank",

        allowedTypes: ["MCQ", "MSQ", "NAT"],

        allowedSections: ["GA", "ME", "UNKNOWN"],


        /* -------------------------------------------------
           Internal helpers
        ------------------------------------------------- */

        generateId: function (question, index) {

            const number =
                question && question.number != null
                    ? String(question.number)
                    : String(index || 0);

            const text =
                question && question.question
                    ? String(question.question)
                    : "";

            const source =
                question && question.source
                    ? String(question.source)
                    : "";

            const raw =
                number + "|" +
                source + "|" +
                text.substring(0, 250);

            let hash = 0;

            for (let i = 0; i < raw.length; i++) {
                hash =
                    ((hash << 5) - hash) +
                    raw.charCodeAt(i);

                hash |= 0;
            }

            return "q_" + Math.abs(hash);
        },


        cleanText: function (value) {

            if (value == null) {
                return "";
            }

            return String(value)
                .replace(/\u00A0/g, " ")
                .replace(/\r/g, "")
                .replace(/[ \t]+/g, " ")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
        },


        normalizeType: function (type) {

            if (!type) {
                return "MCQ";
            }

            const value =
                String(type)
                    .trim()
                    .toUpperCase();

            if (
                value === "MULTIPLE CHOICE" ||
                value === "MULTIPLE-CHOICE"
            ) {
                return "MCQ";
            }

            if (
                value === "MULTIPLE SELECT" ||
                value === "MULTIPLE-SELECT"
            ) {
                return "MSQ";
            }

            if (
                value === "NUMERICAL" ||
                value === "NUMERICAL ANSWER" ||
                value === "NUMERICAL ANSWER TYPE"
            ) {
                return "NAT";
            }

            return this.allowedTypes.includes(value)
                ? value
                : "MCQ";
        },


        normalizeSection: function (section) {

            if (!section) {
                return "UNKNOWN";
            }

            const value =
                String(section)
                    .trim()
                    .toUpperCase();

            if (
                value === "GENERAL APTITUDE" ||
                value === "APTITUDE" ||
                value === "GENERAL"
            ) {
                return "GA";
            }

            if (
                value === "MECHANICAL ENGINEERING" ||
                value === "MECHANICAL"
            ) {
                return "ME";
            }

            if (value === "GA" || value === "ME") {
                return value;
            }

            return "UNKNOWN";
        },


        normalizeOptions: function (options) {

            if (!Array.isArray(options)) {
                return [];
            }

            return options
                .map(function (option, index) {

                    if (
                        option &&
                        typeof option === "object"
                    ) {

                        return {
                            label:
                                option.label ||
                                String.fromCharCode(65 + index),

                            text:
                                this.cleanText(
                                    option.text ||
                                    option.value ||
                                    ""
                                ),

                            image:
                                option.image || null,

                            html:
                                option.html || null
                        };

                    }

                    return {
                        label:
                            String.fromCharCode(65 + index),

                        text:
                            this.cleanText(option),

                        image: null,
                        html: null
                    };

                }, this)
                .filter(function (option) {
                    return option.text || option.image || option.html;
                });
        },


        normalizeAnswer: function (answer, type) {

            if (answer == null) {
                return null;
            }

            if (type === "NAT") {

                if (
                    typeof answer === "object" &&
                    answer !== null
                ) {

                    const min =
                        answer.min != null
                            ? Number(answer.min)
                            : null;

                    const max =
                        answer.max != null
                            ? Number(answer.max)
                            : null;

                    const value =
                        answer.value != null
                            ? Number(answer.value)
                            : null;

                    return {
                        value:
                            Number.isFinite(value)
                                ? value
                                : null,

                        min:
                            Number.isFinite(min)
                                ? min
                                : null,

                        max:
                            Number.isFinite(max)
                                ? max
                                : null
                    };
                }

                const number = Number(answer);

                return Number.isFinite(number)
                    ? {
                        value: number,
                        min: null,
                        max: null
                    }
                    : null;
            }

            if (type === "MSQ") {

                if (Array.isArray(answer)) {

                    return answer
                        .map(function (item) {
                            return String(item)
                                .trim()
                                .toUpperCase();
                        })
                        .filter(Boolean)
                        .filter(function (value, index, array) {
                            return array.indexOf(value) === index;
                        })
                        .sort();
                }

                return String(answer)
                    .split(/[,;| ]+/)
                    .map(function (item) {
                        return item.trim().toUpperCase();
                    })
                    .filter(Boolean)
                    .filter(function (value, index, array) {
                        return array.indexOf(value) === index;
                    })
                    .sort();
            }

            return String(answer)
                .trim()
                .toUpperCase()
                .replace(/[^A-Z]/g, "")
                .charAt(0) || null;
        },


        /* -------------------------------------------------
           Normalize one question
           ------------------------------------------------- */

        normalizeQuestion: function (question, index) {

            if (!question || typeof question !== "object") {
                return null;
            }

            const type =
                this.normalizeType(question.type);

            const section =
                this.normalizeSection(question.section);

            const normalized = {

                id:
                    question.id ||
                    this.generateId(question, index),

                number:
                    question.number != null
                        ? Number(question.number)
                        : index + 1,

                type: type,

                section: section,

                question:
                    this.cleanText(
                        question.question ||
                        question.text ||
                        question.questionText ||
                        ""
                    ),

                options:
                    this.normalizeOptions(
                        question.options
                    ),

                answer:
                    this.normalizeAnswer(
                        question.answer != null
                            ? question.answer
                            : question.correctAnswer,
                        type
                    ),

                solution:
                    this.cleanText(
                        question.solution ||
                        question.explanation ||
                        ""
                    ),

                marks:
                    question.marks != null
                        ? Number(question.marks)
                        : null,

                negativeMarks:
                    question.negativeMarks != null
                        ? Number(question.negativeMarks)
                        : null,

                figure:
                    question.figure ||
                    question.image ||
                    null,

                figures:
                    Array.isArray(question.figures)
                        ? question.figures
                        : [],

                source:
                    question.source ||
                    question.sourceFile ||
                    "",

                page:
                    question.page != null
                        ? Number(question.page)
                        : null,

                sourceQuestion:
                    question.sourceQuestion != null
                        ? Number(question.sourceQuestion)
                        : null,

                needsReview:
                    Boolean(question.needsReview),

                reviewReasons:
                    Array.isArray(question.reviewReasons)
                        ? question.reviewReasons.slice()
                        : [],

                metadata:
                    question.metadata &&
                    typeof question.metadata === "object"
                        ? question.metadata
                        : {},

                createdAt:
                    question.createdAt ||
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()
            };


            /* Preserve additional useful PDF information */

            if (question.pageText) {
                normalized.pageText =
                    question.pageText;
            }

            if (question.rawText) {
                normalized.rawText =
                    question.rawText;
            }

            if (question.renderedPage) {
                normalized.renderedPage =
                    question.renderedPage;
            }

            if (question.imageData) {
                normalized.imageData =
                    question.imageData;
            }

            if (question.answerSource) {
                normalized.answerSource =
                    question.answerSource;
            }

            return normalized;
        },


        /* -------------------------------------------------
           Add questions
           ------------------------------------------------- */

        add: function (question) {

            const current =
                this.load();

            const normalized =
                this.normalizeQuestion(
                    question,
                    current.length
                );

            if (!normalized) {
                return null;
            }

            const duplicate =
                this.findDuplicate(
                    normalized,
                    current
                );

            if (duplicate) {
                return duplicate;
            }

            current.push(normalized);

            this.save(current);

            return normalized;
        },


        addMany: function (questions) {

            if (!Array.isArray(questions)) {
                return {
                    added: [],
                    duplicates: [],
                    invalid: []
                };
            }

            const current =
                this.load();

            const added = [];
            const duplicates = [];
            const invalid = [];

            questions.forEach(function (question, index) {

                const normalized =
                    this.normalizeQuestion(
                        question,
                        current.length + index
                    );

                if (!normalized) {
                    invalid.push(question);
                    return;
                }

                const duplicate =
                    this.findDuplicate(
                        normalized,
                        current.concat(added)
                    );

                if (duplicate) {
                    duplicates.push(duplicate);
                    return;
                }

                added.push(normalized);

            }, this);


            const merged =
                current.concat(added);

            this.save(merged);

            return {
                added: added,
                duplicates: duplicates,
                invalid: invalid
            };
        },


        /* -------------------------------------------------
           Load / Save
           ------------------------------------------------- */

        load: function () {

            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.getQuestionBank === "function"
                ) {

                    const data =
                        StorageManager.getQuestionBank();

                    return Array.isArray(data)
                        ? data
                        : [];
                }

            } catch (error) {
                console.warn(
                    "QuestionBank StorageManager load failed:",
                    error
                );
            }


            try {

                const raw =
                    localStorage.getItem(
                        this.STORAGE_KEY
                    );

                if (!raw) {
                    return [];
                }

                const parsed =
                    JSON.parse(raw);

                return Array.isArray(parsed)
                    ? parsed
                    : [];

            } catch (error) {

                console.warn(
                    "QuestionBank localStorage load failed:",
                    error
                );

                return [];
            }
        },


        save: function (questions) {

            if (!Array.isArray(questions)) {
                return false;
            }

            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.saveQuestionBank === "function"
                ) {

                    return StorageManager.saveQuestionBank(
                        questions
                    );
                }

            } catch (error) {

                console.warn(
                    "QuestionBank StorageManager save failed:",
                    error
                );
            }


            try {

                localStorage.setItem(
                    this.STORAGE_KEY,
                    JSON.stringify(questions)
                );

                return true;

            } catch (error) {

                console.error(
                    "Unable to save question bank:",
                    error
                );

                return false;
            }
        },


        clear: function () {

            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.saveQuestionBank === "function"
                ) {

                    StorageManager.saveQuestionBank([]);

                } else {

                    localStorage.removeItem(
                        this.STORAGE_KEY
                    );
                }

                return true;

            } catch (error) {

                console.error(
                    "Unable to clear question bank:",
                    error
                );

                return false;
            }
        },


        /* -------------------------------------------------
           Find / Get
           ------------------------------------------------- */

        getById: function (id) {

            if (!id) {
                return null;
            }

            const questions =
                this.load();

            return questions.find(function (question) {
                return String(question.id) === String(id);
            }) || null;
        },


        getByNumber: function (number) {

            const questions =
                this.load();

            return questions.find(function (question) {
                return Number(question.number) === Number(number);
            }) || null;
        },


        getAll: function () {
            return this.load();
        },


        count: function () {
            return this.load().length;
        },


        /* -------------------------------------------------
           Duplicate detection
           ------------------------------------------------- */

        normalizeForComparison: function (text) {

            return this.cleanText(text)
                .toLowerCase()
                .replace(/\s+/g, " ")
                .replace(/[“”"'`]/g, "")
                .trim();
        },


        findDuplicate: function (question, collection) {

            const questions =
                Array.isArray(collection)
                    ? collection
                    : this.load();

            const targetText =
                this.normalizeForComparison(
                    question.question
                );


            if (!targetText) {
                return null;
            }


            for (let i = 0; i < questions.length; i++) {

                const existing =
                    questions[i];

                if (!existing) {
                    continue;
                }


                /* Same generated ID */

                if (
                    question.id &&
                    existing.id &&
                    question.id === existing.id
                ) {
                    return existing;
                }


                /* Same source + question number */

                if (
                    question.source &&
                    existing.source &&
                    question.source === existing.source &&
                    Number(question.number) ===
                    Number(existing.number)
                ) {
                    return existing;
                }


                /* Same question text */

                const existingText =
                    this.normalizeForComparison(
                        existing.question
                    );

                if (
                    targetText === existingText
                ) {
                    return existing;
                }
            }

            return null;
        },


        removeDuplicates: function (questions) {

            const source =
                Array.isArray(questions)
                    ? questions
                    : this.load();

            const unique = [];
            const duplicates = [];

            source.forEach(function (question, index) {

                const normalized =
                    this.normalizeQuestion(
                        question,
                        index
                    );

                if (!normalized) {
                    return;
                }

                const duplicate =
                    this.findDuplicate(
                        normalized,
                        unique
                    );

                if (duplicate) {
                    duplicates.push(normalized);
                } else {
                    unique.push(normalized);
                }

            }, this);


            if (!Array.isArray(questions)) {
                this.save(unique);
            }

            return {
                unique: unique,
                duplicates: duplicates,
                removed: duplicates.length
            };
        },


        /* -------------------------------------------------
           Filtering
           ------------------------------------------------- */

        filter: function (criteria) {

            criteria =
                criteria || {};

            let questions =
                this.load();


            if (criteria.section) {

                const section =
                    this.normalizeSection(
                        criteria.section
                    );

                questions =
                    questions.filter(function (question) {
                        return question.section === section;
                    });
            }


            if (criteria.type) {

                const type =
                    this.normalizeType(
                        criteria.type
                    );

                questions =
                    questions.filter(function (question) {
                        return question.type === type;
                    });
            }


            if (
                criteria.source &&
                String(criteria.source).trim()
            ) {

                const source =
                    String(criteria.source)
                        .trim()
                        .toLowerCase();

                questions =
                    questions.filter(function (question) {
                        return String(
                            question.source || ""
                        )
                            .toLowerCase()
                            .includes(source);
                    });
            }


            if (criteria.needsReview != null) {

                const review =
                    Boolean(criteria.needsReview);

                questions =
                    questions.filter(function (question) {
                        return Boolean(
                            question.needsReview
                        ) === review;
                    });
            }


            if (
                criteria.search &&
                String(criteria.search).trim()
            ) {

                const search =
                    String(criteria.search)
                        .trim()
                        .toLowerCase();

                questions =
                    questions.filter(function (question) {

                        const text =
                            [
                                question.question,
                                question.solution,
                                question.source
                            ]
                                .join(" ")
                                .toLowerCase();

                        return text.includes(search);
                    });
            }


            return questions;
        },


        search: function (query) {

            return this.filter({
                search: query
            });
        },


        getBySection: function (section) {

            return this.filter({
                section: section
            });
        },


        getByType: function (type) {

            return this.filter({
                type: type
            });
        },


        /* -------------------------------------------------
           Sort
           ------------------------------------------------- */

        sort: function (
            questions,
            order
        ) {

            const result =
                Array.isArray(questions)
                    ? questions.slice()
                    : this.load();

            const mode =
                order || "number";


            if (mode === "number") {

                return result.sort(function (a, b) {
                    return Number(a.number || 0) -
                        Number(b.number || 0);
                });
            }


            if (mode === "section") {

                const rank = {
                    GA: 1,
                    ME: 2,
                    UNKNOWN: 3
                };

                return result.sort(function (a, b) {

                    const sectionDifference =
                        (rank[a.section] || 99) -
                        (rank[b.section] || 99);

                    if (sectionDifference !== 0) {
                        return sectionDifference;
                    }

                    return Number(a.number || 0) -
                        Number(b.number || 0);
                });
            }


            if (mode === "type") {

                return result.sort(function (a, b) {

                    if (a.type === b.type) {
                        return Number(a.number || 0) -
                            Number(b.number || 0);
                    }

                    return String(a.type)
                        .localeCompare(
                            String(b.type)
                        );
                });
            }


            if (mode === "random") {
                return this.shuffle(result);
            }


            return result;
        },


        shuffle: function (array) {

            const result =
                Array.isArray(array)
                    ? array.slice()
                    : [];

            for (
                let i = result.length - 1;
                i > 0;
                i--
            ) {

                const j =
                    Math.floor(
                        Math.random() * (i + 1)
                    );

                const temp =
                    result[i];

                result[i] =
                    result[j];

                result[j] =
                    temp;
            }

            return result;
        },


        /* -------------------------------------------------
           Prepare exam questions
           ------------------------------------------------- */

        prepareExam: function (
            questions,
            settings
        ) {

            settings =
                settings || {};

            let result =
                Array.isArray(questions)
                    ? questions.slice()
                    : this.load();


            /* Section */

            if (
                settings.section &&
                settings.section !== "full"
            ) {

                const wanted =
                    this.normalizeSection(
                        settings.section
                    );

                result =
                    result.filter(function (question) {
                        return question.section === wanted;
                    });
            }


            /* Remove invalid questions */

            result =
                result.filter(function (question) {

                    return (
                        question &&
                        question.question &&
                        question.question.trim().length > 0
                    );
                });


            /* Original / random order */

            if (
                settings.order === "shuffle" ||
                settings.shuffleQuestions === true
            ) {

                result =
                    this.shuffle(result);

            } else {

                result =
                    this.sort(
                        result,
                        "number"
                    );
            }


            /* Question count */

            const count =
                Number(settings.questionCount || 0);

            if (
                count > 0 &&
                result.length > count
            ) {

                result =
                    result.slice(0, count);
            }


            /* Option shuffle */

            if (
                settings.shuffleOptions === true
            ) {

                result =
                    result.map(function (question) {

                        if (
                            question.type === "NAT" ||
                            !Array.isArray(question.options)
                        ) {
                            return question;
                        }

                        const copy =
                            Object.assign(
                                {},
                                question
                            );

                        copy.options =
                            this.shuffle(
                                question.options
                            );

                        return copy;

                    }, this);
            }


            /* Renumber for current exam */

            result =
                result.map(function (question, index) {

                    const copy =
                        Object.assign(
                            {},
                            question
                        );

                    copy.examNumber =
                        index + 1;

                    return copy;
                });


            return result;
        },


        /* -------------------------------------------------
           Statistics
           ------------------------------------------------- */

        getStats: function (questions) {

            const source =
                Array.isArray(questions)
                    ? questions
                    : this.load();

            const stats = {

                total: source.length,

                mcq: 0,
                msq: 0,
                nat: 0,

                aptitude: 0,
                mechanical: 0,
                unknownSection: 0,

                withAnswers: 0,
                withoutAnswers: 0,

                withSolutions: 0,
                withoutSolutions: 0,

                needsReview: 0,

                positiveMarks: 0,
                negativeMarks: 0,

                sources: {}
            };


            source.forEach(function (question) {

                if (!question) {
                    return;
                }


                if (question.type === "MCQ") {
                    stats.mcq++;
                }

                if (question.type === "MSQ") {
                    stats.msq++;
                }

                if (question.type === "NAT") {
                    stats.nat++;
                }


                if (question.section === "GA") {
                    stats.aptitude++;
                } else if (question.section === "ME") {
                    stats.mechanical++;
                } else {
                    stats.unknownSection++;
                }


                if (
                    question.answer !== null &&
                    question.answer !== undefined &&
                    question.answer !== ""
                ) {

                    stats.withAnswers++;

                } else {

                    stats.withoutAnswers++;
                }


                if (
                    question.solution &&
                    String(question.solution).trim()
                ) {

                    stats.withSolutions++;

                } else {

                    stats.withoutSolutions++;
                }


                if (question.needsReview) {
                    stats.needsReview++;
                }


                if (
                    Number.isFinite(
                        Number(question.marks)
                    )
                ) {

                    stats.positiveMarks +=
                        Number(question.marks);
                }


                if (
                    Number.isFinite(
                        Number(question.negativeMarks)
                    )
                ) {

                    stats.negativeMarks +=
                        Number(question.negativeMarks);
                }


                const source =
                    question.source ||
                    "Unknown";

                if (!stats.sources[source]) {
                    stats.sources[source] = 0;
                }

                stats.sources[source]++;

            });


            return stats;
        },


        /* -------------------------------------------------
           Validate bank
           ------------------------------------------------- */

        validate: function (questions) {

            const source =
                Array.isArray(questions)
                    ? questions
                    : this.load();


            if (
                window.QuestionValidator &&
                typeof QuestionValidator.validateAll === "function"
            ) {

                return QuestionValidator.validateAll(
                    source
                );
            }


            return {
                valid: source.slice(),
                invalid: [],
                review: source.filter(function (question) {
                    return question.needsReview;
                })
            };
        },


        /* -------------------------------------------------
           Mark question for review
           ------------------------------------------------- */

        markForReview: function (
            id,
            reason
        ) {

            const questions =
                this.load();

            const question =
                questions.find(function (item) {
                    return String(item.id) ===
                        String(id);
                });


            if (!question) {
                return false;
            }


            question.needsReview = true;

            if (!Array.isArray(question.reviewReasons)) {
                question.reviewReasons = [];
            }


            if (
                reason &&
                !question.reviewReasons.includes(reason)
            ) {

                question.reviewReasons.push(reason);
            }


            question.updatedAt =
                new Date().toISOString();

            this.save(questions);

            return true;
        },


        /* -------------------------------------------------
           Update question
           ------------------------------------------------- */

        update: function (
            id,
            changes
        ) {

            if (!id || !changes) {
                return null;
            }

            const questions =
                this.load();

            const index =
                questions.findIndex(function (question) {
                    return String(question.id) ===
                        String(id);
                });


            if (index === -1) {
                return null;
            }


            const updated =
                Object.assign(
                    {},
                    questions[index],
                    changes
                );


            const normalized =
                this.normalizeQuestion(
                    updated,
                    index
                );

            normalized.id =
                questions[index].id;

            normalized.createdAt =
                questions[index].createdAt ||
                normalized.createdAt;

            normalized.updatedAt =
                new Date().toISOString();


            questions[index] =
                normalized;

            this.save(questions);

            return normalized;
        },


        remove: function (id) {

            const questions =
                this.load();

            const filtered =
                questions.filter(function (question) {
                    return String(question.id) !==
                        String(id);
                });


            if (
                filtered.length ===
                questions.length
            ) {
                return false;
            }


            this.save(filtered);

            return true;
        },


        /* -------------------------------------------------
           Replace complete bank
           ------------------------------------------------- */

        replace: function (questions) {

            if (!Array.isArray(questions)) {
                return false;
            }

            const normalized =
                questions
                    .map(function (question, index) {
                        return this.normalizeQuestion(
                            question,
                            index
                        );
                    }, this)
                    .filter(Boolean);


            const unique =
                this.removeDuplicates(
                    normalized
                ).unique;


            this.save(unique);

            return true;
        },


        /* -------------------------------------------------
           Export
           ------------------------------------------------- */

        exportJSON: function (questions) {

            const source =
                Array.isArray(questions)
                    ? questions
                    : this.load();


            return JSON.stringify(
                {
                    app: "GATE Test Series",
                    version: this.VERSION,
                    exportedAt:
                        new Date().toISOString(),

                    count:
                        source.length,

                    questions:
                        source
                },
                null,
                2
            );
        },


        downloadJSON: function (
            questions,
            filename
        ) {

            const json =
                this.exportJSON(
                    questions
                );

            const blob =
                new Blob(
                    [json],
                    {
                        type:
                            "application/json"
                    }
                );

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;

            link.download =
                filename ||
                "gate-question-bank.json";

            document.body.appendChild(link);

            link.click();

            link.remove();

            setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 1000);
        },


        /* -------------------------------------------------
           Import JSON
           ------------------------------------------------- */

        importJSON: function (
            json,
            options
        ) {

            options =
                options || {};

            let data = json;


            try {

                if (typeof json === "string") {
                    data = JSON.parse(json);
                }

            } catch (error) {

                return {
                    success: false,
                    error:
                        "Invalid JSON file."
                };
            }


            let questions;


            if (Array.isArray(data)) {

                questions = data;

            } else if (
                data &&
                Array.isArray(data.questions)
            ) {

                questions =
                    data.questions;

            } else {

                return {
                    success: false,
                    error:
                        "No questions found in JSON."
                };
            }


            const normalized =
                questions
                    .map(function (question, index) {
                        return this.normalizeQuestion(
                            question,
                            index
                        );
                    }, this)
                    .filter(Boolean);


            if (options.replace === true) {

                this.replace(normalized);

                return {
                    success: true,
                    imported: normalized.length,
                    duplicates: 0,
                    invalid: 0
                };
            }


            const result =
                this.addMany(normalized);


            return {
                success: true,

                imported:
                    result.added.length,

                duplicates:
                    result.duplicates.length,

                invalid:
                    result.invalid.length,

                questions:
                    result.added
            };
        },


        /* -------------------------------------------------
           Build exam-ready copy
           ------------------------------------------------- */

        createExamSet: function (
            settings
        ) {

            const questions =
                this.load();

            return this.prepareExam(
                questions,
                settings || {}
            );
        },


        /* -------------------------------------------------
           Get source names
           ------------------------------------------------- */

        getSources: function () {

            const questions =
                this.load();

            const sources = [];

            questions.forEach(function (question) {

                const source =
                    question.source ||
                    "Unknown";

                if (!sources.includes(source)) {
                    sources.push(source);
                }
            });


            return sources.sort(
                function (a, b) {
                    return a.localeCompare(b);
                }
            );
        },


        /* -------------------------------------------------
           Check whether bank is ready
           ------------------------------------------------- */

        isReady: function () {

            const questions =
                this.load();

            if (!questions.length) {
                return {
                    ready: false,
                    reason:
                        "No questions available."
                };
            }


            const valid =
                questions.filter(function (question) {

                    return (
                        question &&
                        question.question &&
                        question.question.trim()
                    );

                });


            if (!valid.length) {

                return {
                    ready: false,
                    reason:
                        "No valid questions found."
                };
            }


            return {
                ready: true,
                total: questions.length,
                valid: valid.length,
                review:
                    questions.filter(function (question) {
                        return question.needsReview;
                    }).length
            };
        },


        /* -------------------------------------------------
           Initialize
           ------------------------------------------------- */

        init: function () {

            const questions =
                this.load();

            if (!Array.isArray(questions)) {
                this.save([]);
            }

            return this;
        }
    };


    /* -----------------------------------------------------
       Global API
       ----------------------------------------------------- */

    window.QuestionBank =
        QuestionBank;


    /* -----------------------------------------------------
       Initialize safely
       ----------------------------------------------------- */

    try {
        QuestionBank.init();
    } catch (error) {
        console.warn(
            "QuestionBank initialization failed:",
            error
        );
    }

})();
