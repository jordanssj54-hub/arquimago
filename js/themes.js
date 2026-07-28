(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.applyTheme = function (themeKey) {
        var root = document.documentElement;
        var theme = Arquimago.THEMES[themeKey] || Arquimago.THEMES.current;
        var palette = {
            current: {
                "--bg-deep": "#050508",
                "--bg-app": "#0a0a0f",
                "--bg-card": "#111118",
                "--bg-elevated": "#16161f",
                "--gold": "#c9a84c",
                "--gold-light": "#e8cc7a",
                "--gold-dark": "#8a6d2b",
                "--magic": "#4a7fd4",
                "--magic-glow": "rgba(74, 127, 212, 0.35)"
            },
            light: {
                "--bg-deep": "#f6f2e8",
                "--bg-app": "#fffaf0",
                "--bg-card": "#fefcf7",
                "--bg-elevated": "#f5efe3",
                "--gold": "#a56e1d",
                "--gold-light": "#c38d34",
                "--gold-dark": "#7c4e13",
                "--magic": "#4a7fd4",
                "--magic-glow": "rgba(74, 127, 212, 0.22)"
            },
            dark: {
                "--bg-deep": "#030306",
                "--bg-app": "#08080c",
                "--bg-card": "#0d0d13",
                "--bg-elevated": "#12121a",
                "--gold": "#d9bf70",
                "--gold-light": "#f1df9b",
                "--gold-dark": "#9d7e32",
                "--magic": "#6fa0f7",
                "--magic-glow": "rgba(111, 160, 247, 0.3)"
            },
            fantasy: {
                "--bg-deep": "#06070e",
                "--bg-app": "#0f1424",
                "--bg-card": "#111b2e",
                "--bg-elevated": "#172338",
                "--gold": "#8be0d0",
                "--gold-light": "#b8f7ec",
                "--gold-dark": "#3f7e6e",
                "--magic": "#9f7dff",
                "--magic-glow": "rgba(159, 125, 255, 0.3)"
            }
        };

        var values = palette[themeKey] || palette.current;
        Object.keys(values).forEach(function (key) {
            root.style.setProperty(key, values[key]);
        });
        root.style.setProperty("--theme-accent", theme.accent || "#c9a84c");
        document.body.setAttribute("data-theme", themeKey);
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
