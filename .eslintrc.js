module.exports = {
    "env": {
        "node": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2020
    },
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-unused-vars": [
            "warn",
            { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }
        ],
        "no-var": "error",
        "prefer-const": "warn",
        "eqeqeq": "error",
        "curly": "error",
        "max-len": [
            "warn",
            { "code": 100 }
        ],
        "no-console": "off"
    }
};
