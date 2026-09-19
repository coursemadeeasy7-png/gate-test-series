/* =========================================================
   GATE TEST SERIES
   File: js/calculator.js

   Purpose:
   - GATE-style virtual scientific calculator
   - Basic arithmetic
   - Trigonometric functions
   - Log / ln / exponential
   - Square root / power
   - Memory functions
   - DEG / RAD mode
   - Keyboard support
   - Mobile friendly
   ========================================================= */

(function () {
    "use strict";

    const Calculator = {

        VERSION: "1.0.0",

        expression: "",

        memory: 0,

        angleMode: "DEG",

        justCalculated: false,

        elements: {},


        /* -------------------------------------------------
           Initialize
           ------------------------------------------------- */

        init: function () {

            this.cacheElements();
            this.bindEvents();
            this.render();

            return this;
        },


        /* -------------------------------------------------
           DOM cache
           ------------------------------------------------- */

        cacheElements: function () {

            this.modal =
                document.getElementById(
                    "calculatorModal"
                ) ||
                document.querySelector(
                    ".calculator-modal"
                );


            this.elements.display =
                document.getElementById(
                    "calculatorDisplay"
                ) ||
                document.getElementById(
                    "calcDisplay"
                ) ||
                document.querySelector(
                    ".calculator-display"
                );


            this.elements.expression =
                document.getElementById(
                    "calculatorExpression"
                ) ||
                document.querySelector(
                    ".calculator-expression"
                );


            this.elements.result =
                document.getElementById(
                    "calculatorResult"
                ) ||
                document.querySelector(
                    ".calculator-result"
                );


            this.elements.mode =
                document.getElementById(
                    "calculatorMode"
                ) ||
                document.querySelector(
                    ".calculator-mode"
                );


            this.elements.error =
                document.getElementById(
                    "calculatorError"
                ) ||
                document.querySelector(
                    ".calculator-error"
                );


            this.openButton =
                document.getElementById(
                    "calculatorBtn"
                ) ||
                document.querySelector(
                    "[data-open-calculator]"
                );


            this.closeButton =
                document.getElementById(
                    "closeCalculator"
                ) ||
                document.querySelector(
                    "[data-close-calculator]"
                );


            this.elements.keys =
                document.querySelector(
                    ".calculator-keys"
                ) ||
                document.querySelector(
                    "[data-calculator-keys]"
                );
        },


        /* -------------------------------------------------
           Bind buttons
           ------------------------------------------------- */

        bindEvents: function () {

            const self = this;


            if (this.openButton) {

                this.openButton.addEventListener(
                    "click",
                    function () {
                        self.open();
                    }
                );
            }


            if (this.closeButton) {

                this.closeButton.addEventListener(
                    "click",
                    function () {
                        self.close();
                    }
                );
            }


            /*
             * Event delegation for calculator buttons.
             */

            if (this.elements.keys) {

                this.elements.keys.addEventListener(
                    "click",
                    function (event) {

                        const button =
                            event.target.closest(
                                "button"
                            );


                        if (!button) {
                            return;
                        }


                        const action =
                            button.dataset.action;


                        const value =
                            button.dataset.value;


                        if (action) {

                            self.handleAction(
                                action,
                                value
                            );

                        } else if (
                            value != null
                        ) {

                            self.input(
                                value
                            );
                        }
                    }
                );
            }


            /*
             * Keyboard support.
             */

            document.addEventListener(
                "keydown",
                function (event) {

                    /*
                     * Don't capture normal typing in
                     * exam answer fields.
                     */

                    const target =
                        event.target;


                    if (
                        target &&
                        (
                            target.tagName ===
                            "INPUT" ||
                            target.tagName ===
                            "TEXTAREA"
                        ) &&
                        !(
                            self.modal &&
                            self.modal.contains(
                                target
                            )
                        )
                    ) {
                        return;
                    }


                    if (
                        !self.modal ||
                        !self.isOpen()
                    ) {
                        return;
                    }


                    self.handleKeyboard(
                        event
                    );
                }
            );


            /*
             * Close when clicking outside calculator box.
             */

            if (this.modal) {

                this.modal.addEventListener(
                    "click",
                    function (event) {

                        if (
                            event.target ===
                            self.modal
                        ) {
                            self.close();
                        }
                    }
                );
            }
        },


        /* -------------------------------------------------
           Open
           ------------------------------------------------- */

        open: function () {

            if (!this.modal) {
                return;
            }


            this.modal.classList.add(
                "active"
            );

            this.modal.classList.add(
                "show"
            );


            this.modal.style.display =
                "flex";


            document.body.classList.add(
                "calculator-open"
            );


            this.render();
        },


        /* -------------------------------------------------
           Close
           ------------------------------------------------- */

        close: function () {

            if (!this.modal) {
                return;
            }


            this.modal.classList.remove(
                "active"
            );

            this.modal.classList.remove(
                "show"
            );


            this.modal.style.display =
                "none";


            document.body.classList.remove(
                "calculator-open"
            );
        },


        isOpen: function () {

            if (!this.modal) {
                return false;
            }


            return (
                this.modal.classList.contains(
                    "active"
                ) ||
                this.modal.classList.contains(
                    "show"
                ) ||
                this.modal.style.display ===
                    "flex"
            );
        },


        /* -------------------------------------------------
           Input
           ------------------------------------------------- */

        input: function (value) {

            if (
                value === null ||
                value === undefined
            ) {
                return;
            }


            value =
                String(value);


            /*
             * After "=" a number/operator starts a new
             * expression.
             */

            if (this.justCalculated) {

                if (
                    this.isDigit(
                        value
                    ) ||
                    value === "."
                ) {

                    this.expression =
                        "";

                }

                this.justCalculated =
                    false;
            }


            /*
             * Calculator button values may use friendly
             * symbols.
             */

            const normalized =
                this.normalizeInput(
                    value
                );


            this.expression +=
                normalized;


            this.clearError();
            this.render();
        },


        /* -------------------------------------------------
           Action handler
           ------------------------------------------------- */

        handleAction: function (
            action,
            value
        ) {

            switch (action) {

                case "clear":
                case "ac":
                    this.clear();
                    break;


                case "delete":
                case "backspace":
                    this.backspace();
                    break;


                case "equals":
                case "calculate":
                    this.calculate();
                    break;


                case "sin":
                case "cos":
                case "tan":
                case "asin":
                case "acos":
                case "atan":
                    this.functionInput(
                        action
                    );
                    break;


                case "log":
                    this.functionInput(
                        "log"
                    );
                    break;


                case "ln":
                    this.functionInput(
                        "ln"
                    );
                    break;


                case "sqrt":
                    this.functionInput(
                        "sqrt"
                    );
                    break;


                case "square":
                    this.functionInput(
                        "square"
                    );
                    break;


                case "inverse":
                    this.functionInput(
                        "inverse"
                    );
                    break;


                case "exp":
                    this.functionInput(
                        "exp"
                    );
                    break;


                case "pi":
                    this.insertConstant(
                        "π"
                    );
                    break;


                case "e":
                    this.insertConstant(
                        "e"
                    );
                    break;


                case "open":
                    this.input("(");
                    break;


                case "close":
                    this.input(")");
                    break;


                case "percent":
                    this.percent();
                    break;


                case "toggle-sign":
                    this.toggleSign();
                    break;


                case "memory-clear":
                case "mc":
                    this.memoryClear();
                    break;


                case "memory-recall":
                case "mr":
                    this.memoryRecall();
                    break;


                case "memory-add":
                case "m-plus":
                    this.memoryAdd();
                    break;


                case "memory-subtract":
                case "m-minus":
                    this.memorySubtract();
                    break;


                case "angle":
                case "deg-rad":
                    this.toggleAngleMode();
                    break;


                default:

                    if (
                        value !==
                        undefined
                    ) {

                        this.input(
                            value
                        );
                    }

                    break;
            }
        },


        /* -------------------------------------------------
           Keyboard
           ------------------------------------------------- */

        handleKeyboard: function (
            event
        ) {

            const key =
                event.key;


            if (
                /^[0-9.]$/.test(
                    key
                )
            ) {

                this.input(
                    key
                );

                event.preventDefault();

                return;
            }


            if (
                [
                    "+",
                    "-",
                    "*",
                    "/",
                    "%",
                    "(",
                    ")",
                    "^"
                ].includes(
                    key
                )
            ) {

                this.input(
                    key
                );

                event.preventDefault();

                return;
            }


            if (
                key === "Enter" ||
                key === "="
            ) {

                this.calculate();

                event.preventDefault();

                return;
            }


            if (
                key === "Backspace"
            ) {

                this.backspace();

                event.preventDefault();

                return;
            }


            if (
                key === "Escape"
            ) {

                this.close();

                event.preventDefault();

                return;
            }


            if (
                key.toLowerCase() ===
                "c"
            ) {

                this.clear();

                event.preventDefault();
            }
        },


        /* -------------------------------------------------
           Normalize calculator input
           ------------------------------------------------- */

        normalizeInput: function (
            value
        ) {

            return String(value)
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/−/g, "-")
                .replace(/π/g, "π")
                .replace(/√/g, "sqrt")
                .replace(/\^/g, "^");
        },


        /* -------------------------------------------------
           Clear
           ------------------------------------------------- */

        clear: function () {

            this.expression =
                "";

            this.justCalculated =
                false;

            this.clearError();

            this.render();
        },


        /* -------------------------------------------------
           Backspace
           ------------------------------------------------- */

        backspace: function () {

            if (
                this.justCalculated
            ) {

                this.clear();

                return;
            }


            this.expression =
                this.expression.slice(
                    0,
                    -1
                );


            this.clearError();

            this.render();
        },


        /* -------------------------------------------------
           Function input
           ------------------------------------------------- */

        functionInput: function (
            fn
        ) {

            if (
                this.justCalculated
            ) {

                this.expression =
                    "";
                
                this.justCalculated =
                    false;
            }


            const map = {

                sin: "sin(",
                cos: "cos(",
                tan: "tan(",

                asin: "asin(",
                acos: "acos(",
                atan: "atan(",

                log: "log(",
                ln: "ln(",

                sqrt: "sqrt(",
                exp: "exp(",

                square: "square(",
                inverse: "inv("
            };


            this.expression +=
                map[fn] ||
                String(fn) + "(";


            this.clearError();

            this.render();
        },


        /* -------------------------------------------------
           Constants
           ------------------------------------------------- */

        insertConstant: function (
            value
        ) {

            if (
                this.justCalculated
            ) {

                this.expression =
                    "";

                this.justCalculated =
                    false;
            }


            this.expression +=
                value;

            this.clearError();

            this.render();
        },


        /* -------------------------------------------------
           Percent
           ------------------------------------------------- */

        percent: function () {

            if (!this.expression) {
                return;
            }


            /*
             * Convert the last numeric value to /100.
             */

            const match =
                this.expression.match(
                    /(\d+(?:\.\d+)?)$/
                );


            if (!match) {
                return;
            }


            const number =
                Number(
                    match[1]
                );


            if (
                !Number.isFinite(
                    number
                )
            ) {
                return;
            }


            const replacement =
                String(
                    number / 100
                );


            this.expression =
                this.expression.slice(
                    0,
                    -match[1].length
                ) +
                replacement;


            this.render();
        },


        /* -------------------------------------------------
           Toggle sign
           ------------------------------------------------- */

        toggleSign: function () {

            if (!this.expression) {
                this.expression =
                    "-";

                this.render();

                return;
            }


            const match =
                this.expression.match(
                    /(-?\d+(?:\.\d+)?)$/
                );


            if (!match) {
                return;
            }


            const value =
                match[1];


            const replacement =
                value.startsWith("-")
                    ? value.substring(1)
                    : "-" + value;


            this.expression =
                this.expression.slice(
                    0,
                    -value.length
                ) +
                replacement;


            this.render();
        },


        /* -------------------------------------------------
           Memory
           ------------------------------------------------- */

        memoryClear: function () {

            this.memory =
                0;

            this.renderMemory();
        },


        memoryRecall: function () {

            this.expression +=
                String(
                    this.memory
                );


            this.justCalculated =
                false;

            this.render();
        },


        memoryAdd: function () {

            const value =
                this.evaluateExpression(
                    this.expression
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                this.memory +=
                    value;
            }


            this.renderMemory();
        },


        memorySubtract: function () {

            const value =
                this.evaluateExpression(
                    this.expression
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                this.memory -=
                    value;
            }


            this.renderMemory();
        },


        renderMemory: function () {

            const indicator =
                document.querySelector(
                    "[data-memory-indicator]"
                );


            if (indicator) {

                indicator.textContent =
                    this.memory !== 0
                        ? "M"
                        : "";
            }
        },


        /* -------------------------------------------------
           DEG / RAD
           ------------------------------------------------- */

        toggleAngleMode: function () {

            this.angleMode =
                this.angleMode === "DEG"
                    ? "RAD"
                    : "DEG";


            this.render();
        },


        /* -------------------------------------------------
           Calculate
           ------------------------------------------------- */

        calculate: function () {

            if (
                !this.expression
            ) {
                return null;
            }


            try {

                const value =
                    this.evaluateExpression(
                        this.expression
                    );


                if (
                    !Number.isFinite(
                        value
                    )
                ) {

                    throw new Error(
                        "Invalid result"
                    );
                }


                const formatted =
                    this.formatResult(
                        value
                    );


                this.expression =
                    formatted;


                this.justCalculated =
                    true;


                this.clearError();

                this.render();


                return value;

            } catch (error) {

                this.showError(
                    error.message ||
                    "Invalid expression"
                );


                return null;
            }
        },


        /* -------------------------------------------------
           Evaluate expression

           Important:
           - Does NOT use eval()
           - Only supports calculator grammar
           - No arbitrary JavaScript execution
           ------------------------------------------------- */

        evaluateExpression: function (
            expression
        ) {

            let input =
                String(
                    expression || ""
                ).trim();


            if (!input) {
                return 0;
            }


            input =
                input
                    .replace(/×/g, "*")
                    .replace(/÷/g, "/")
                    .replace(/−/g, "-")
                    .replace(/π/g, "PI")
                    .replace(/\s+/g, "");


            /*
             * Replace power operator.
             */

            input =
                input.replace(
                    /\^/g,
                    "**"
                );


            /*
             * Tokenize first.
             */

            const tokens =
                this.tokenize(
                    input
                );


            const parser =
                this.createParser(
                    tokens
                );


            const value =
                parser.parseExpression();


            if (
                parser.position <
                tokens.length
            ) {

                throw new Error(
                    "Invalid expression"
                );
            }


            if (
                !Number.isFinite(
                    value
                )
            ) {

                throw new Error(
                    "Math error"
                );
            }


            return value;
        },


        /* -------------------------------------------------
           Tokenizer
           ------------------------------------------------- */

        tokenize: function (
            input
        ) {

            const tokens = [];

            let i = 0;


            const isDigit =
                function (char) {

                    return (
                        char >= "0" &&
                        char <= "9"
                    );
                };


            const isLetter =
                function (char) {

                    return (
                        /[A-Za-z]/.test(
                            char
                        )
                    );
                };


            while (
                i < input.length
            ) {

                const char =
                    input[i];


                /* Number */

                if (
                    isDigit(char) ||
                    char === "."
                ) {

                    let number =
                        char;

                    i++;


                    while (
                        i < input.length &&
                        (
                            isDigit(
                                input[i]
                            ) ||
                            input[i] === "."
                        )
                    ) {

                        number +=
                            input[i];

                        i++;
                    }


                    /*
                     * Scientific notation:
                     * 1.2e-5
                     */

                    if (
                        input[i] === "e" ||
                        input[i] === "E"
                    ) {

                        number +=
                            input[i];

                        i++;


                        if (
                            input[i] === "+" ||
                            input[i] === "-"
                        ) {

                            number +=
                                input[i];

                            i++;
                        }


                        while (
                            i < input.length &&
                            isDigit(
                                input[i]
                            )
                        ) {

                            number +=
                                input[i];

                            i++;
                        }
                    }


                    const numeric =
                        Number(
                            number
                        );


                    if (
                        !Number.isFinite(
                            numeric
                        )
                    ) {

                        throw new Error(
                            "Invalid number"
                        );
                    }


                    tokens.push({
                        type: "number",
                        value: numeric
                    });


                    continue;
                }


                /* Operators */

                if (
                    "+-*/%".includes(
                        char
                    )
                ) {

                    tokens.push({
                        type: "operator",
                        value: char
                    });

                    i++;

                    continue;
                }


                /*
                 * Power operator.
                 */

                if (
                    char === "*" &&
                    input[i + 1] === "*"
                ) {

                    tokens.push({
                        type: "operator",
                        value: "^"
                    });

                    i += 2;

                    continue;
                }


                /* Parentheses */

                if (
                    char === "(" ||
                    char === ")"
                ) {

                    tokens.push({
                        type: char === "("
                            ? "leftParen"
                            : "rightParen",

                        value: char
                    });

                    i++;

                    continue;
                }


                /* Function / constants */

                if (
                    isLetter(char)
                ) {

                    let word =
                        char;

                    i++;


                    while (
                        i < input.length &&
                        isLetter(
                            input[i]
                        )
                    ) {

                        word +=
                            input[i];

                        i++;
                    }


                    word =
                        word.toLowerCase();


                    tokens.push({
                        type:
                            "identifier",

                        value:
                            word
                    });


                    continue;
                }


                throw new Error(
                    "Unknown symbol: " +
                    char
                );
            }


            return tokens;
        },


        /* -------------------------------------------------
           Recursive descent parser
           ------------------------------------------------- */

        createParser: function (
            tokens
        ) {

            const self =
                this;


            const parser = {

                position: 0,


                current: function () {

                    return tokens[
                        this.position
                    ];
                },


                consume: function () {

                    return tokens[
                        this.position++
                    ];
                },


                matchOperator: function (
                    operator
                ) {

                    const token =
                        this.current();


                    if (
                        token &&
                        token.type ===
                            "operator" &&
                        token.value ===
                            operator
                    ) {

                        this.position++;

                        return true;
                    }


                    return false;
                },


                matchParen: function (
                    type
                ) {

                    const token =
                        this.current();


                    if (
                        token &&
                        token.type ===
                            type
                    ) {

                        this.position++;

                        return true;
                    }


                    return false;
                },


                parseExpression:
                    function () {

                        let value =
                            this.parseTerm();


                        while (true) {

                            if (
                                this.matchOperator(
                                    "+"
                                )
                            ) {

                                value +=
                                    this.parseTerm();

                                continue;
                            }


                            if (
                                this.matchOperator(
                                    "-"
                                )
                            ) {

                                value -=
                                    this.parseTerm();

                                continue;
                            }


                            break;
                        }


                        return value;
                    },


                parseTerm:
                    function () {

                        let value =
                            this.parsePower();


                        while (true) {

                            if (
                                this.matchOperator(
                                    "*"
                                )
                            ) {

                                value *=
                                    this.parsePower();

                                continue;
                            }


                            if (
                                this.matchOperator(
                                    "/"
                                )
                            ) {

                                const divisor =
                                    this.parsePower();


                                if (
                                    divisor ===
                                    0
                                ) {

                                    throw new Error(
                                        "Cannot divide by zero"
                                    );
                                }


                                value /=
                                    divisor;

                                continue;
                            }


                            if (
                                this.matchOperator(
                                    "%"
                                )
                            ) {

                                const divisor =
                                    this.parsePower();


                                if (
                                    divisor ===
                                    0
                                ) {

                                    throw new Error(
                                        "Cannot divide by zero"
                                    );
                                }


                                value %=
                                    divisor;

                                continue;
                            }


                            break;
                        }


                        return value;
                    },


                parsePower:
                    function () {

                        let value =
                            this.parseUnary();


                        if (
                            this.matchOperator(
                                "^"
                            )
                        ) {

                            const exponent =
                                this.parsePower();


                            value =
                                Math.pow(
                                    value,
                                    exponent
                                );
                        }


                        return value;
                    },


                parseUnary:
                    function () {

                        if (
                            this.matchOperator(
                                "+"
                            )
                        ) {

                            return this.parseUnary();
                        }


                        if (
                            this.matchOperator(
                                "-"
                            )
                        ) {

                            return -
                                this.parseUnary();
                        }


                        return this.parsePrimary();
                    },


                parsePrimary:
                    function () {

                        const token =
                            this.current();


                        if (!token) {

                            throw new Error(
                                "Incomplete expression"
                            );
                        }


                        if (
                            token.type ===
                            "number"
                        ) {

                            this.consume();

                            return token.value;
                        }


                        if (
                            token.type ===
                            "leftParen"
                        ) {

                            this.consume();


                            const value =
                                this.parseExpression();


                            if (
                                !this.matchParen(
                                    "rightParen"
                                )
                            ) {

                                throw new Error(
                                    "Missing )"
                                );
                            }


                            return value;
                        }


                        if (
                            token.type ===
                            "identifier"
                        ) {

                            return this.parseFunction();
                        }


                        throw new Error(
                            "Invalid expression"
                        );
                    },


                parseFunction:
                    function () {

                        const token =
                            this.consume();


                        const name =
                            token.value;


                        /*
                         * Constants.
                         */

                        if (
                            name === "pi"
                        ) {

                            return Math.PI;
                        }


                        if (
                            name === "e"
                        ) {

                            return Math.E;
                        }


                        /*
                         * Every supported function
                         * requires parentheses.
                         */

                        if (
                            !this.matchParen(
                                "leftParen"
                            )
                        ) {

                            throw new Error(
                                "Missing ( after " +
                                name
                            );
                        }


                        const argument =
                            this.parseExpression();


                        if (
                            !this.matchParen(
                                "rightParen"
                            )
                        ) {

                            throw new Error(
                                "Missing )"
                            );
                        }


                        return self.applyFunction(
                            name,
                            argument
                        );
                    }
            };


            return parser;
        },


        /* -------------------------------------------------
           Apply mathematical function
           ------------------------------------------------- */

        applyFunction: function (
            name,
            value
        ) {

            switch (name) {

                case "sin":
                    return Math.sin(
                        this.toRadiansIfNeeded(
                            value
                        )
                    );


                case "cos":
                    return Math.cos(
                        this.toRadiansIfNeeded(
                            value
                        )
                    );


                case "tan":
                    return Math.tan(
                        this.toRadiansIfNeeded(
                            value
                        )
                    );


                case "asin":
                    return this.fromRadiansIfNeeded(
                        Math.asin(
                            value
                        )
                    );


                case "acos":
                    return this.fromRadiansIfNeeded(
                        Math.acos(
                            value
                        )
                    );


                case "atan":
                    return this.fromRadiansIfNeeded(
                        Math.atan(
                            value
                        )
                    );


                case "log":

                    if (
                        value <= 0
                    ) {

                        throw new Error(
                            "log domain error"
                        );
                    }

                    return Math.log10(
                        value
                    );


                case "ln":

                    if (
                        value <= 0
                    ) {

                        throw new Error(
                            "ln domain error"
                        );
                    }

                    return Math.log(
                        value
                    );


                case "sqrt":

                    if (
                        value < 0
                    ) {

                        throw new Error(
                            "sqrt domain error"
                        );
                    }

                    return Math.sqrt(
                        value
                    );


                case "square":
                    return Math.pow(
                        value,
                        2
                    );


                case "inv":

                    if (
                        value === 0
                    ) {

                        throw new Error(
                            "Cannot divide by zero"
                        );
                    }

                    return 1 / value;


                case "exp":
                    return Math.exp(
                        value
                    );


                case "abs":
                    return Math.abs(
                        value
                    );


                case "floor":
                    return Math.floor(
                        value
                    );


                case "ceil":
                    return Math.ceil(
                        value
                    );


                default:

                    throw new Error(
                        "Unsupported function: " +
                        name
                    );
            }
        },


        /* -------------------------------------------------
           Angle conversion
           ------------------------------------------------- */

        toRadiansIfNeeded: function (
            value
        ) {

            if (
                this.angleMode ===
                "DEG"
            ) {

                return (
                    value *
                    Math.PI /
                    180
                );
            }


            return value;
        },


        fromRadiansIfNeeded: function (
            value
        ) {

            if (
                this.angleMode ===
                "DEG"
            ) {

                return (
                    value *
                    180 /
                    Math.PI
                );
            }


            return value;
        },


        /* -------------------------------------------------
           Result formatting
           ------------------------------------------------- */

        formatResult: function (
            value
        ) {

            if (
                Object.is(
                    value,
                    -0
                )
            ) {
                value = 0;
            }


            /*
             * Avoid ugly floating point results:
             * 0.30000000000000004 -> 0.3
             */

            const rounded =
                Number(
                    value.toPrecision(
                        12
                    )
                );


            return String(
                rounded
            );
        },


        /* -------------------------------------------------
           Render display
           ------------------------------------------------- */

        render: function () {

            if (
                this.elements.expression
            ) {

                this.elements.expression.textContent =
                    this.expression ||
                    "0";
            }


            if (
                this.elements.display
            ) {

                this.elements.display.textContent =
                    this.expression ||
                    "0";
            }


            if (
                this.elements.result
            ) {

                this.elements.result.textContent =
                    this.expression ||
                    "0";
            }


            if (
                this.elements.mode
            ) {

                this.elements.mode.textContent =
                    this.angleMode;
            }


            const modeButtons =
                document.querySelectorAll(
                    "[data-angle-mode]"
                );


            modeButtons.forEach(
                function (button) {

                    button.textContent =
                        this.angleMode;

                    button.classList.toggle(
                        "active",
                        true
                    );

                }.bind(this)
            );


            this.renderMemory();
        },


        /* -------------------------------------------------
           Error
           ------------------------------------------------- */

        showError: function (
            message
        ) {

            if (
                this.elements.error
            ) {

                this.elements.error.textContent =
                    message ||
                    "Invalid expression";

                this.elements.error.style.display =
                    "";
            }


            if (
                this.elements.display
            ) {

                this.elements.display.classList.add(
                    "calculator-error"
                );
            }
        },


        clearError: function () {

            if (
                this.elements.error
            ) {

                this.elements.error.textContent =
                    "";

                this.elements.error.style.display =
                    "none";
            }


            if (
                this.elements.display
            ) {

                this.elements.display.classList.remove(
                    "calculator-error"
                );
            }
        },


        /* -------------------------------------------------
           Utility
           ------------------------------------------------- */

        isDigit: function (
            value
        ) {

            return /^[0-9]$/.test(
                String(value)
            );
        }
    };


    /* -----------------------------------------------------
       Global
       ----------------------------------------------------- */

    window.Calculator =
        Calculator;


    /* -----------------------------------------------------
       Auto initialize
       ----------------------------------------------------- */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            try {
                Calculator.init();
            } catch (error) {

                console.error(
                    "Calculator initialization failed:",
                    error
                );
            }
        }
    );

})();
