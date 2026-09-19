/* =========================================================
   GATE TEST SERIES
   File: js/timer.js

   Purpose:
   - Exam countdown timer
   - Persistent timer state
   - Warning / danger states
   - Auto submit when time reaches zero
   - Pause-safe page reload handling
   - Mobile friendly
   ========================================================= */

(function () {
    "use strict";

    const Timer = {

        VERSION: "1.0.0",

        totalSeconds: 0,

        remainingSeconds: 0,

        interval: null,

        running: false,

        startedAt: null,

        endTime: null,

        initialized: false,

        timeUpHandled: false,

        warningSeconds: 10 * 60,

        dangerSeconds: 5 * 60,

        storageKey: "gate_exam_timer",

        elements: {},


        /* -------------------------------------------------
           Initialize
           ------------------------------------------------- */

        init: function (durationMinutes) {

            this.cacheElements();


            let duration =
                Number(durationMinutes);


            if (
                !Number.isFinite(duration) ||
                duration <= 0
            ) {

                duration = 180;
            }


            this.totalSeconds =
                Math.round(
                    duration * 60
                );


            this.restoreTimer();


            if (
                !this.remainingSeconds ||
                this.remainingSeconds <= 0 ||
                this.remainingSeconds >
                this.totalSeconds
            ) {

                this.remainingSeconds =
                    this.totalSeconds;
            }


            this.initialized = true;


            this.render();


            return this;
        },


        /* -------------------------------------------------
           DOM elements
           ------------------------------------------------- */

        cacheElements: function () {

            this.elements.display =
                document.getElementById(
                    "timer"
                ) ||
                document.getElementById(
                    "timerDisplay"
                ) ||
                document.querySelector(
                    ".timer-display"
                );


            this.elements.container =
                document.querySelector(
                    ".exam-timer"
                ) ||
                document.querySelector(
                    ".timer-container"
                );


            this.elements.hours =
                document.getElementById(
                    "timerHours"
                );


            this.elements.minutes =
                document.getElementById(
                    "timerMinutes"
                );


            this.elements.seconds =
                document.getElementById(
                    "timerSeconds"
                );
        },


        /* -------------------------------------------------
           Start
           ------------------------------------------------- */

        start: function () {

            if (this.running) {
                return;
            }


            if (!this.initialized) {

                this.init(
                    180
                );
            }


            this.timeUpHandled =
                false;


            /*
             * Use absolute end time instead of simply
             * decrementing once per second.
             *
             * This prevents timer drift when browser
             * throttles background tabs.
             */

            const now =
                Date.now();


            this.endTime =
                now +
                (
                    this.remainingSeconds *
                    1000
                );


            this.startedAt =
                this.startedAt ||
                now;


            this.running =
                true;


            this.saveTimer();


            this.clearInterval();


            this.interval =
                setInterval(
                    function () {

                        this.tick();

                    }.bind(this),

                    250
                );


            this.tick();
        },


        /* -------------------------------------------------
           Tick
           ------------------------------------------------- */

        tick: function () {

            if (!this.running) {
                return;
            }


            const now =
                Date.now();


            let remaining =
                Math.ceil(
                    (
                        this.endTime -
                        now
                    ) / 1000
                );


            if (
                !Number.isFinite(
                    remaining
                )
            ) {

                remaining =
                    0;
            }


            remaining =
                Math.max(
                    0,
                    Math.min(
                        this.totalSeconds,
                        remaining
                    )
                );


            this.remainingSeconds =
                remaining;


            this.render();


            /*
             * Save periodically rather than on every
             * 250 ms tick.
             */

            if (
                remaining % 5 === 0
            ) {

                this.saveTimer();
            }


            if (
                remaining <= 0
            ) {

                this.handleTimeUp();
            }
        },


        /* -------------------------------------------------
           Pause
           ------------------------------------------------- */

        pause: function () {

            if (!this.running) {
                return;
            }


            this.tick();


            this.running =
                false;


            this.clearInterval();


            this.saveTimer();
        },


        /* -------------------------------------------------
           Resume
           ------------------------------------------------- */

        resume: function () {

            if (
                this.remainingSeconds <= 0
            ) {

                this.handleTimeUp();

                return;
            }


            this.start();
        },


        /* -------------------------------------------------
           Stop
           ------------------------------------------------- */

        stop: function () {

            this.running =
                false;


            this.clearInterval();


            this.saveTimer();
        },


        /* -------------------------------------------------
           Reset
           ------------------------------------------------- */

        reset: function (
            durationMinutes
        ) {

            this.stop();


            let duration =
                Number(durationMinutes);


            if (
                !Number.isFinite(duration) ||
                duration <= 0
            ) {

                duration = 180;
            }


            this.totalSeconds =
                Math.round(
                    duration * 60
                );


            this.remainingSeconds =
                this.totalSeconds;


            this.startedAt =
                null;


            this.endTime =
                null;


            this.timeUpHandled =
                false;


            this.clearSavedTimer();


            this.render();
        },


        /* -------------------------------------------------
           Add time
           ------------------------------------------------- */

        addTime: function (
            seconds
        ) {

            const extra =
                Number(seconds);


            if (
                !Number.isFinite(extra) ||
                extra <= 0
            ) {
                return;
            }


            this.remainingSeconds +=
                Math.round(extra);


            this.totalSeconds +=
                Math.round(extra);


            if (this.running) {

                this.endTime =
                    Date.now() +
                    (
                        this.remainingSeconds *
                        1000
                    );
            }


            this.render();

            this.saveTimer();
        },


        /* -------------------------------------------------
           Handle time up
           ------------------------------------------------- */

        handleTimeUp: function () {

            if (
                this.timeUpHandled
            ) {
                return;
            }


            this.timeUpHandled =
                true;


            this.remainingSeconds =
                0;


            this.running =
                false;


            this.clearInterval();


            this.render();


            this.saveTimer();


            /*
             * First notify ExamEngine.
             */

            try {

                if (
                    window.ExamEngine &&
                    typeof ExamEngine.handleTimeUp ===
                    "function"
                ) {

                    ExamEngine.handleTimeUp();

                    return;
                }

            } catch (error) {

                console.error(
                    "ExamEngine time-up handler failed:",
                    error
                );
            }


            /*
             * Fallback if ExamEngine is unavailable.
             */

            this.showTimeUpFallback();
        },


        /* -------------------------------------------------
           Time-up fallback
           ------------------------------------------------- */

        showTimeUpFallback: function () {

            const modal =
                document.getElementById(
                    "timeUpModal"
                );


            if (modal) {

                modal.classList.add(
                    "active"
                );

                modal.classList.add(
                    "show"
                );

                modal.style.display =
                    "flex";


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

                            window.location.href =
                                "result.html";
                        };
                }


                return;
            }


            if (
                window.confirm(
                    "Time is over. Submit the test?"
                )
            ) {

                window.location.href =
                    "result.html";
            }
        },


        /* -------------------------------------------------
           Render timer
           ------------------------------------------------- */

        render: function () {

            const seconds =
                Math.max(
                    0,
                    Math.floor(
                        this.remainingSeconds
                    )
                );


            const hours =
                Math.floor(
                    seconds / 3600
                );


            const minutes =
                Math.floor(
                    (
                        seconds % 3600
                    ) / 60
                );


            const secs =
                seconds % 60;


            const formatted =
                this.formatTime(
                    seconds
                );


            if (
                this.elements.display
            ) {

                this.elements.display.textContent =
                    formatted;

                this.elements.display.setAttribute(
                    "aria-label",
                    "Time remaining " +
                    formatted
                );
            }


            if (
                this.elements.hours
            ) {

                this.elements.hours.textContent =
                    this.pad(hours);
            }


            if (
                this.elements.minutes
            ) {

                this.elements.minutes.textContent =
                    this.pad(minutes);
            }


            if (
                this.elements.seconds
            ) {

                this.elements.seconds.textContent =
                    this.pad(secs);
            }


            this.updateTimerState(
                seconds
            );
        },


        /* -------------------------------------------------
           Timer visual state
           ------------------------------------------------- */

        updateTimerState: function (
            seconds
        ) {

            const targets = [];


            if (this.elements.display) {
                targets.push(
                    this.elements.display
                );
            }


            if (this.elements.container) {
                targets.push(
                    this.elements.container
                );
            }


            targets.forEach(
                function (element) {

                    element.classList.remove(
                        "timer-normal",
                        "timer-warning",
                        "timer-danger",
                        "warning",
                        "danger",
                        "critical",
                        "pulse"
                    );


                    if (
                        seconds <=
                        this.dangerSeconds
                    ) {

                        element.classList.add(
                            "timer-danger"
                        );

                        element.classList.add(
                            "danger"
                        );

                        element.classList.add(
                            "critical"
                        );


                        /*
                         * Pulse only near the end.
                         * Avoid excessive animation on
                         * longer warning periods.
                         */

                        if (
                            seconds <= 60
                        ) {

                            element.classList.add(
                                "pulse"
                            );
                        }


                    } else if (
                        seconds <=
                        this.warningSeconds
                    ) {

                        element.classList.add(
                            "timer-warning"
                        );

                        element.classList.add(
                            "warning"
                        );

                    } else {

                        element.classList.add(
                            "timer-normal"
                        );
                    }

                }.bind(this)
            );
        },


        /* -------------------------------------------------
           Format HH:MM:SS
           ------------------------------------------------- */

        formatTime: function (
            totalSeconds
        ) {

            let seconds =
                Math.max(
                    0,
                    Math.floor(
                        Number(
                            totalSeconds
                        )
                    )
                );


            const hours =
                Math.floor(
                    seconds / 3600
                );


            seconds %=
                3600;


            const minutes =
                Math.floor(
                    seconds / 60
                );


            seconds %=
                60;


            /*
             * GATE-style:
             *
             * 03:00:00
             * 02:15:30
             * 00:05:12
             */

            return (
                this.pad(hours) +
                ":" +
                this.pad(minutes) +
                ":" +
                this.pad(seconds)
            );
        },


        pad: function (
            value
        ) {

            return String(
                Math.max(
                    0,
                    Number(value) || 0
                )
            ).padStart(
                2,
                "0"
            );
        },


        /* -------------------------------------------------
           Get remaining time
           ------------------------------------------------- */

        getRemainingSeconds: function () {

            if (this.running) {
                this.tick();
            }

            return this.remainingSeconds;
        },


        getRemainingMinutes: function () {

            return (
                this.getRemainingSeconds() /
                60
            );
        },


        /* -------------------------------------------------
           Get elapsed time
           ------------------------------------------------- */

        getElapsedSeconds: function () {

            return Math.max(
                0,
                this.totalSeconds -
                this.getRemainingSeconds()
            );
        },


        /* -------------------------------------------------
           Get percentage remaining
           ------------------------------------------------- */

        getRemainingPercentage: function () {

            if (
                this.totalSeconds <= 0
            ) {
                return 0;
            }


            return (
                this.remainingSeconds /
                this.totalSeconds
            ) * 100;
        },


        /* -------------------------------------------------
           Save timer state
           ------------------------------------------------- */

        saveTimer: function () {

            const data = {

                totalSeconds:
                    this.totalSeconds,

                remainingSeconds:
                    this.remainingSeconds,

                startedAt:
                    this.startedAt,

                endTime:
                    this.endTime,

                running:
                    this.running,

                savedAt:
                    Date.now()
            };


            try {

                /*
                 * Prefer exam storage if available.
                 */

                if (
                    window.StorageManager &&
                    typeof StorageManager.getExam ===
                    "function" &&
                    typeof StorageManager.saveExam ===
                    "function"
                ) {

                    const exam =
                        StorageManager.getExam();


                    if (exam) {

                        exam.timer =
                            data;

                        exam.remainingSeconds =
                            this.remainingSeconds;


                        StorageManager.saveExam(
                            exam
                        );
                    }
                }

            } catch (error) {

                console.warn(
                    "Timer exam storage failed:",
                    error
                );
            }


            try {

                sessionStorage.setItem(
                    this.storageKey,
                    JSON.stringify(
                        data
                    )
                );

            } catch (error) {

                console.warn(
                    "Unable to save timer:",
                    error
                );
            }
        },


        /* -------------------------------------------------
           Restore timer
           ------------------------------------------------- */

        restoreTimer: function () {

            let data = null;


            /*
             * First check active exam.
             */

            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.getExam ===
                    "function"
                ) {

                    const exam =
                        StorageManager.getExam();


                    if (
                        exam &&
                        exam.timer
                    ) {

                        data =
                            exam.timer;
                    }
                }

            } catch (error) {

                console.warn(
                    "Unable to restore timer from exam:",
                    error
                );
            }


            /*
             * Session fallback.
             */

            if (!data) {

                try {

                    const raw =
                        sessionStorage.getItem(
                            this.storageKey
                        );


                    if (raw) {
                        data =
                            JSON.parse(
                                raw
                            );
                    }

                } catch (error) {

                    console.warn(
                        "Unable to restore timer:",
                        error
                    );
                }
            }


            if (!data) {
                return false;
            }


            if (
                Number.isFinite(
                    Number(
                        data.totalSeconds
                    )
                ) &&
                Number(data.totalSeconds) > 0
            ) {

                this.totalSeconds =
                    Number(
                        data.totalSeconds
                    );
            }


            if (
                Number.isFinite(
                    Number(
                        data.remainingSeconds
                    )
                )
            ) {

                this.remainingSeconds =
                    Math.max(
                        0,
                        Number(
                            data.remainingSeconds
                        )
                    );
            }


            this.startedAt =
                data.startedAt ||
                null;


            this.endTime =
                data.endTime ||
                null;


            /*
             * If the previous page was refreshed while
             * timer was running, calculate actual remaining
             * time from endTime.
             */

            if (
                data.running &&
                data.endTime
            ) {

                const remaining =
                    Math.ceil(
                        (
                            Number(
                                data.endTime
                            ) -
                            Date.now()
                        ) / 1000
                    );


                if (
                    Number.isFinite(
                        remaining
                    )
                ) {

                    this.remainingSeconds =
                        Math.max(
                            0,
                            remaining
                        );
                }
            }


            /*
             * Never automatically continue interval here.
             * ExamEngine decides when the exam is active.
             */

            this.running =
                false;


            return true;
        },


        /* -------------------------------------------------
           Clear saved timer
           ------------------------------------------------- */

        clearSavedTimer: function () {

            try {

                sessionStorage.removeItem(
                    this.storageKey
                );

            } catch (error) {
                /* Ignore */
            }


            try {

                if (
                    window.StorageManager &&
                    typeof StorageManager.getExam ===
                    "function" &&
                    typeof StorageManager.saveExam ===
                    "function"
                ) {

                    const exam =
                        StorageManager.getExam();


                    if (exam) {

                        delete exam.timer;

                        delete exam.remainingSeconds;


                        StorageManager.saveExam(
                            exam
                        );
                    }
                }

            } catch (error) {
                /* Ignore */
            }
        },


        /* -------------------------------------------------
           Clear interval
           ------------------------------------------------- */

        clearInterval: function () {

            if (this.interval) {

                window.clearInterval(
                    this.interval
                );

                this.interval =
                    null;
            }
        },


        /* -------------------------------------------------
           Visibility handling
           ------------------------------------------------- */

        handleVisibilityChange: function () {

            /*
             * Because the timer uses absolute endTime,
             * switching apps / locking phone does not
             * artificially stop the countdown.
             */

            if (
                document.visibilityState ===
                "visible"
            ) {

                if (this.running) {
                    this.tick();
                }
            }
        }
    };


    /* -----------------------------------------------------
       Global API
       ----------------------------------------------------- */

    window.Timer =
        Timer;


    /* -----------------------------------------------------
       Page visibility
       ----------------------------------------------------- */

    document.addEventListener(
        "visibilitychange",
        function () {

            try {
                Timer.handleVisibilityChange();
            } catch (error) {
                console.warn(
                    "Timer visibility handler failed:",
                    error
                );
            }
        }
    );


    /* -----------------------------------------------------
       Auto initialization on exam page
       ----------------------------------------------------- */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            const path =
                window.location.pathname
                    .toLowerCase();


            const isExamPage =
                document.body &&
                (
                    document.body.classList.contains(
                        "exam-page"
                    ) ||
                    path.endsWith(
                        "test.html"
                    )
                );


            if (!isExamPage) {
                return;
            }


            /*
             * ExamEngine normally owns the exam object.
             * Wait briefly so it can restore settings first.
             */

            setTimeout(
                function () {

                    try {

                        let duration = 180;


                        if (
                            window.ExamEngine &&
                            ExamEngine.exam
                        ) {

                            duration =
                                Number(
                                    ExamEngine.exam.duration ||
                                    (
                                        ExamEngine.exam.settings &&
                                        ExamEngine.exam.settings.duration
                                    ) ||
                                    180
                                );

                        }


                        Timer.init(
                            duration
                        );


                        /*
                         * Start automatically only if an
                         * active exam exists.
                         */

                        if (
                            window.ExamEngine &&
                            ExamEngine.questions &&
                            ExamEngine.questions.length
                        ) {

                            Timer.start();
                        }

                    } catch (error) {

                        console.error(
                            "Timer initialization failed:",
                            error
                        );
                    }

                },
                100
            );
        }
    );

})();
