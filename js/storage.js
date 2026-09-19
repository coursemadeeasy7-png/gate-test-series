/* =========================================================
   GATE TEST SERIES
   Storage Manager
   File: js/storage.js
   ========================================================= */

(function () {
    "use strict";

    const STORAGE_KEYS = {
        SETTINGS: "gate_test_settings",
        CURRENT_EXAM: "gate_current_exam",
        RESULT: "gate_last_result",
        HISTORY: "gate_test_history",
        QUESTION_BANK: "gate_question_bank",
        APP_STATE: "gate_app_state"
    };

    const StorageManager = {

        /* ---------------------------------------------------
           Safe JSON Parse
           --------------------------------------------------- */

        parseJSON(value, fallback = null) {
            if (!value) {
                return fallback;
            }

            try {
                return JSON.parse(value);
            } catch (error) {
                console.warn(
                    "Storage JSON parse error:",
                    error
                );
                return fallback;
            }
        },

        /* ---------------------------------------------------
           Save JSON
           --------------------------------------------------- */

        setJSON(key, value) {
            try {
                localStorage.setItem(
                    key,
                    JSON.stringify(value)
                );

                return true;

            } catch (error) {

                console.error(
                    "Unable to save localStorage data:",
                    error
                );

                return false;
            }
        },

        /* ---------------------------------------------------
           Get JSON
           --------------------------------------------------- */

        getJSON(key, fallback = null) {
            try {

                const value =
                    localStorage.getItem(key);

                return this.parseJSON(
                    value,
                    fallback
                );

            } catch (error) {

                console.error(
                    "Unable to read localStorage data:",
                    error
                );

                return fallback;
            }
        },

        /* ---------------------------------------------------
           Remove Key
           --------------------------------------------------- */

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn(
                    "Unable to remove storage key:",
                    error
                );
                return false;
            }
        },

        /* ---------------------------------------------------
           Settings
           --------------------------------------------------- */

        saveSettings(settings) {

            if (
                !settings ||
                typeof settings !== "object"
            ) {
                return false;
            }

            const safeSettings = {
                duration:
                    Number(settings.duration) || 180,

                questionCount:
                    Number(settings.questionCount) || 0,

                section:
                    settings.section || "full",

                order:
                    settings.order || "original",

                shuffleOptions:
                    Boolean(
                        settings.shuffleOptions
                    ),

                negativeMarking:
                    settings.negativeMarking !== false,

                autoSubmit:
                    settings.autoSubmit !== false
            };

            return this.setJSON(
                STORAGE_KEYS.SETTINGS,
                safeSettings
            );
        },

        getSettings() {

            const defaults = {
                duration: 180,
                questionCount: 0,
                section: "full",
                order: "original",
                shuffleOptions: false,
                negativeMarking: true,
                autoSubmit: true
            };

            const saved =
                this.getJSON(
                    STORAGE_KEYS.SETTINGS,
                    {}
                );

            return {
                ...defaults,
                ...(saved || {})
            };
        },

        clearSettings() {
            return this.remove(
                STORAGE_KEYS.SETTINGS
            );
        },

        /* ---------------------------------------------------
           Current Exam
           --------------------------------------------------- */

        saveExam(exam) {

            if (
                !exam ||
                typeof exam !== "object"
            ) {
                return false;
            }

            const examData = {
                ...exam,
                savedAt:
                    new Date().toISOString()
            };

            /*
             * Current exam can contain the complete question
             * bank and therefore should stay in sessionStorage
             * where possible.
             */

            try {

                sessionStorage.setItem(
                    STORAGE_KEYS.CURRENT_EXAM,
                    JSON.stringify(examData)
                );

                return true;

            } catch (sessionError) {

                console.warn(
                    "sessionStorage unavailable:",
                    sessionError
                );

                /*
                 * Fallback to localStorage.
                 */

                return this.setJSON(
                    STORAGE_KEYS.CURRENT_EXAM,
                    examData
                );
            }
        },

        getExam() {

            try {

                const sessionData =
                    sessionStorage.getItem(
                        STORAGE_KEYS.CURRENT_EXAM
                    );

                if (sessionData) {
                    return this.parseJSON(
                        sessionData,
                        null
                    );
                }

            } catch (error) {

                console.warn(
                    "Unable to read sessionStorage:",
                    error
                );
            }

            return this.getJSON(
                STORAGE_KEYS.CURRENT_EXAM,
                null
            );
        },

        clearExam() {

            try {
                sessionStorage.removeItem(
                    STORAGE_KEYS.CURRENT_EXAM
                );
            } catch (error) {
                console.warn(error);
            }

            this.remove(
                STORAGE_KEYS.CURRENT_EXAM
            );
        },

        /* ---------------------------------------------------
           Update Current Exam
           --------------------------------------------------- */

        updateExam(updates) {

            const exam =
                this.getExam();

            if (!exam) {
                return false;
            }

            const updatedExam = {
                ...exam,
                ...(updates || {}),
                updatedAt:
                    new Date().toISOString()
            };

            return this.saveExam(
                updatedExam
            );
        },

        /* ---------------------------------------------------
           Exam Progress
           --------------------------------------------------- */

        saveExamProgress(progress) {

            const exam =
                this.getExam();

            if (!exam) {
                return false;
            }

            exam.progress =
                progress || {};

            exam.updatedAt =
                new Date().toISOString();

            return this.saveExam(
                exam
            );
        },

        getExamProgress() {

            const exam =
                this.getExam();

            if (!exam) {
                return null;
            }

            return exam.progress || null;
        },

        /* ---------------------------------------------------
           Result
           --------------------------------------------------- */

        saveResult(result) {

            if (
                !result ||
                typeof result !== "object"
            ) {
                return false;
            }

            const resultData = {
                ...result,
                savedAt:
                    new Date().toISOString()
            };

            const saved =
                this.setJSON(
                    STORAGE_KEYS.RESULT,
                    resultData
                );

            if (saved) {
                this.addToHistory(
                    resultData
                );
            }

            return saved;
        },

        getResult() {

            return this.getJSON(
                STORAGE_KEYS.RESULT,
                null
            );
        },

        clearResult() {

            return this.remove(
                STORAGE_KEYS.RESULT
            );
        },

        /* ---------------------------------------------------
           Test History
           --------------------------------------------------- */

        getHistory() {

            const history =
                this.getJSON(
                    STORAGE_KEYS.HISTORY,
                    []
                );

            return Array.isArray(history)
                ? history
                : [];
        },

        addToHistory(result) {

            if (
                !result ||
                typeof result !== "object"
            ) {
                return false;
            }

            let history =
                this.getHistory();

            const historyItem = {
                id:
                    result.id ||
                    `test-${Date.now()}`,

                testName:
                    result.testName ||
                    result.title ||
                    "GATE Test",

                score:
                    Number(result.score) || 0,

                totalMarks:
                    Number(result.totalMarks) || 0,

                attempted:
                    Number(result.attempted) || 0,

                correct:
                    Number(result.correct) || 0,

                wrong:
                    Number(result.wrong) || 0,

                unattempted:
                    Number(result.unattempted) || 0,

                percentage:
                    Number(result.percentage) || 0,

                date:
                    result.date ||
                    new Date().toISOString()
            };

            /*
             * Avoid adding the same result repeatedly.
             */

            const duplicate =
                history.some(
                    (item) =>
                        item.id ===
                        historyItem.id
                );

            if (!duplicate) {
                history.unshift(
                    historyItem
                );
            }

            /*
             * Keep recent history manageable.
             */

            history =
                history.slice(0, 100);

            return this.setJSON(
                STORAGE_KEYS.HISTORY,
                history
            );
        },

        clearHistory() {

            return this.remove(
                STORAGE_KEYS.HISTORY
            );
        },

        /* ---------------------------------------------------
           Delete One History Entry
           --------------------------------------------------- */

        deleteHistoryItem(id) {

            const history =
                this.getHistory();

            const filtered =
                history.filter(
                    (item) =>
                        item.id !== id
                );

            return this.setJSON(
                STORAGE_KEYS.HISTORY,
                filtered
            );
        },

        /* ---------------------------------------------------
           Question Bank
           --------------------------------------------------- */

        saveQuestionBank(questions) {

            if (
                !Array.isArray(questions)
            ) {
                return false;
            }

            return this.setJSON(
                STORAGE_KEYS.QUESTION_BANK,
                questions
            );
        },

        getQuestionBank() {

            const questions =
                this.getJSON(
                    STORAGE_KEYS.QUESTION_BANK,
                    []
                );

            return Array.isArray(questions)
                ? questions
                : [];
        },

        clearQuestionBank() {

            return this.remove(
                STORAGE_KEYS.QUESTION_BANK
            );
        },

        /* ---------------------------------------------------
           Application State
           --------------------------------------------------- */

        saveAppState(state) {

            if (
                !state ||
                typeof state !== "object"
            ) {
                return false;
            }

            return this.setJSON(
                STORAGE_KEYS.APP_STATE,
                state
            );
        },

        getAppState() {

            return this.getJSON(
                STORAGE_KEYS.APP_STATE,
                {}
            );
        },

        clearAppState() {

            return this.remove(
                STORAGE_KEYS.APP_STATE
            );
        },

        /* ---------------------------------------------------
           Storage Availability
           --------------------------------------------------- */

        isAvailable() {

            try {

                const testKey =
                    "__gate_storage_test__";

                localStorage.setItem(
                    testKey,
                    "1"
                );

                localStorage.removeItem(
                    testKey
                );

                return true;

            } catch (error) {
                return false;
            }
        },

        /* ---------------------------------------------------
           Clear All App Data
           --------------------------------------------------- */

        clearAll() {

            const keys =
                Object.values(
                    STORAGE_KEYS
                );

            keys.forEach((key) => {
                this.remove(key);
            });

            try {
                sessionStorage.removeItem(
                    STORAGE_KEYS.CURRENT_EXAM
                );
            } catch (error) {
                console.warn(error);
            }

            return true;
        },

        /* ---------------------------------------------------
           Export Data
           --------------------------------------------------- */

        exportData() {

            return {
                settings:
                    this.getSettings(),

                result:
                    this.getResult(),

                history:
                    this.getHistory(),

                questionBank:
                    this.getQuestionBank(),

                appState:
                    this.getAppState(),

                exportedAt:
                    new Date().toISOString()
            };
        },

        /* ---------------------------------------------------
           Import Data
           --------------------------------------------------- */

        importData(data) {

            if (
                !data ||
                typeof data !== "object"
            ) {
                return false;
            }

            try {

                if (data.settings) {
                    this.saveSettings(
                        data.settings
                    );
                }

                if (data.result) {
                    this.setJSON(
                        STORAGE_KEYS.RESULT,
                        data.result
                    );
                }

                if (
                    Array.isArray(
                        data.history
                    )
                ) {
                    this.setJSON(
                        STORAGE_KEYS.HISTORY,
                        data.history
                    );
                }

                if (
                    Array.isArray(
                        data.questionBank
                    )
                ) {
                    this.saveQuestionBank(
                        data.questionBank
                    );
                }

                if (data.appState) {
                    this.saveAppState(
                        data.appState
                    );
                }

                return true;

            } catch (error) {

                console.error(
                    "Unable to import data:",
                    error
                );

                return false;
            }
        }
    };

    /* -------------------------------------------------------
       Expose Globally
       ------------------------------------------------------- */

    window.StorageManager =
        StorageManager;

})();
