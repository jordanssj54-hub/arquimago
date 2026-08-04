(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var PALETTES = {
        current: {
            "--bg-deep": "#050508",
            "--bg-app": "#0a0a0f",
            "--bg-card": "#111118",
            "--bg-elevated": "#16161f",
            "--gold": "#c9a84c",
            "--gold-light": "#e8cc7a",
            "--gold-dark": "#8a6d2b",
            "--gold-glow": "rgba(201, 168, 76, 0.3)",
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
            "--gold-glow": "rgba(165, 110, 29, 0.25)",
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
            "--gold-glow": "rgba(217, 191, 112, 0.3)",
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
            "--gold-glow": "rgba(139, 224, 208, 0.3)",
            "--magic": "#9f7dff",
            "--magic-glow": "rgba(159, 125, 255, 0.3)"
        },
        rosa: {
            "--bg-deep": "#17090f",
            "--bg-app": "#211019",
            "--bg-card": "#291420",
            "--bg-elevated": "#331a29",
            "--gold": "#f19cc0",
            "--gold-light": "#ffc3da",
            "--gold-dark": "#a85680",
            "--gold-glow": "rgba(241, 156, 192, 0.32)",
            "--magic": "#b18cf0",
            "--magic-glow": "rgba(177, 140, 240, 0.32)"
        },
        cyberpunk: {
            "--bg-deep": "#030307",
            "--bg-app": "#07070f",
            "--bg-card": "#0c0c18",
            "--bg-elevated": "#111122",
            "--gold": "#22d3ee",
            "--gold-light": "#67e8f9",
            "--gold-dark": "#0e7490",
            "--gold-glow": "rgba(34, 211, 238, 0.32)",
            "--magic": "#a78bfa",
            "--magic-glow": "rgba(167, 139, 250, 0.35)"
        },
        arcane: {
            "--bg-deep": "#04070a",
            "--bg-app": "#081017",
            "--bg-card": "#0c161f",
            "--bg-elevated": "#101e2a",
            "--gold": "#d8c07a",
            "--gold-light": "#ecd9a0",
            "--gold-dark": "#8f7a3d",
            "--gold-glow": "rgba(216, 192, 122, 0.3)",
            "--magic": "#34d399",
            "--magic-glow": "rgba(52, 211, 153, 0.32)"
        },
        shadow: {
            "--bg-deep": "#020308",
            "--bg-app": "#050714",
            "--bg-card": "#0a0e20",
            "--bg-elevated": "#101430",
            "--gold": "#3b82f6",
            "--gold-light": "#60a5fa",
            "--gold-dark": "#1d4ed8",
            "--gold-glow": "rgba(96, 165, 250, 0.32)",
            "--magic": "#7dd3fc",
            "--magic-glow": "rgba(125, 211, 252, 0.3)"
        },
        crimson: {
            "--bg-deep": "#000000",
            "--bg-app": "#000000",
            "--bg-card": "#0a0000",
            "--bg-elevated": "#120101",
            "--gold": "#e50914",
            "--gold-light": "#ff2430",
            "--gold-dark": "#9c050d",
            "--gold-glow": "rgba(229, 9, 20, 0.3)",
            "--magic": "#ff5a5a",
            "--magic-glow": "rgba(255, 90, 90, 0.28)"
        },
        emerald: {
            "--bg-deep": "#04120a",
            "--bg-app": "#071a10",
            "--bg-card": "#0b2416",
            "--bg-elevated": "#103020",
            "--gold": "#d8c07a",
            "--gold-light": "#ecd9a0",
            "--gold-dark": "#8f7a3d",
            "--gold-glow": "rgba(216, 192, 122, 0.3)",
            "--magic": "#2dd47f",
            "--magic-glow": "rgba(45, 212, 127, 0.32)"
        },
        mystic: {
            "--bg-deep": "#0a0512",
            "--bg-app": "#120920",
            "--bg-card": "#190e2c",
            "--bg-elevated": "#201238",
            "--gold": "#a78bfa",
            "--gold-light": "#c4b5fd",
            "--gold-dark": "#7c3aed",
            "--gold-glow": "rgba(167, 139, 250, 0.32)",
            "--magic": "#34d399",
            "--magic-glow": "rgba(52, 211, 153, 0.3)"
        },
        abyss: {
            "--bg-deep": "#030405",
            "--bg-app": "#06090c",
            "--bg-card": "#0a0f14",
            "--bg-elevated": "#0e151c",
            "--gold": "#5b7c99",
            "--gold-light": "#8fb0c9",
            "--gold-dark": "#33475a",
            "--gold-glow": "rgba(91, 124, 153, 0.26)",
            "--magic": "#3b6f8a",
            "--magic-glow": "rgba(59, 111, 138, 0.28)"
        },
        "arcane-ancient": {
            "--bg-deep": "#0a0703",
            "--bg-app": "#120c06",
            "--bg-card": "#191006",
            "--bg-elevated": "#211509",
            "--gold": "#d97706",
            "--gold-light": "#f59e0b",
            "--gold-dark": "#92400e",
            "--gold-glow": "rgba(217, 119, 6, 0.3)",
            "--magic": "#ea580c",
            "--magic-glow": "rgba(234, 88, 12, 0.28)"
        },
        "arcane-forest": {
            "--bg-deep": "#021009",
            "--bg-app": "#051a10",
            "--bg-card": "#082416",
            "--bg-elevated": "#0b2e1c",
            "--gold": "#4ade80",
            "--gold-light": "#86efac",
            "--gold-dark": "#15803d",
            "--gold-glow": "rgba(74, 222, 128, 0.3)",
            "--magic": "#a3e635",
            "--magic-glow": "rgba(163, 230, 53, 0.28)"
        },
        "arcane-royal": {
            "--bg-deep": "#0a0513",
            "--bg-app": "#120a22",
            "--bg-card": "#191030",
            "--bg-elevated": "#201640",
            "--gold": "#f5c65c",
            "--gold-light": "#ffe08a",
            "--gold-dark": "#a16207",
            "--gold-glow": "rgba(245, 198, 92, 0.3)",
            "--magic": "#a78bfa",
            "--magic-glow": "rgba(167, 139, 250, 0.3)"
        },
        "arcane-alchemist": {
            "--bg-deep": "#080504",
            "--bg-app": "#100b08",
            "--bg-card": "#171009",
            "--bg-elevated": "#1e150e",
            "--gold": "#c07a4a",
            "--gold-light": "#e0a06a",
            "--gold-dark": "#7c4a1e",
            "--gold-glow": "rgba(192, 122, 74, 0.3)",
            "--magic": "#2dd4bf",
            "--magic-glow": "rgba(45, 212, 191, 0.28)"
        },
        "arcane-celestial": {
            "--bg-deep": "#02030a",
            "--bg-app": "#060a1a",
            "--bg-card": "#0a1026",
            "--bg-elevated": "#0f1730",
            "--gold": "#a5b4fc",
            "--gold-light": "#c7d2fe",
            "--gold-dark": "#6366f1",
            "--gold-glow": "rgba(165, 180, 252, 0.3)",
            "--magic": "#67e8f9",
            "--magic-glow": "rgba(103, 232, 249, 0.3)"
        },
        "arcane-crystal": {
            "--bg-deep": "#020807",
            "--bg-app": "#051210",
            "--bg-card": "#081d1a",
            "--bg-elevated": "#0d2724",
            "--gold": "#2dd4bf",
            "--gold-light": "#5eead4",
            "--gold-dark": "#0f766e",
            "--gold-glow": "rgba(45, 212, 191, 0.3)",
            "--magic": "#a7f3d0",
            "--magic-glow": "rgba(167, 243, 208, 0.28)"
        },
        "arcane-druid": {
            "--bg-deep": "#060703",
            "--bg-app": "#0b0d05",
            "--bg-card": "#121409",
            "--bg-elevated": "#181b0e",
            "--gold": "#84cc16",
            "--gold-light": "#bef264",
            "--gold-dark": "#3f6212",
            "--gold-glow": "rgba(132, 204, 22, 0.28)",
            "--magic": "#d6c194",
            "--magic-glow": "rgba(214, 193, 148, 0.26)"
        },
        "arcane-library": {
            "--bg-deep": "#090603",
            "--bg-app": "#110c07",
            "--bg-card": "#181209",
            "--bg-elevated": "#20190e",
            "--gold": "#e2c184",
            "--gold-light": "#f3d9a0",
            "--gold-dark": "#8a6216",
            "--gold-glow": "rgba(226, 193, 132, 0.3)",
            "--magic": "#d6a95c",
            "--magic-glow": "rgba(214, 169, 92, 0.28)"
        },
        "arcane-sanctuary": {
            "--bg-deep": "#040506",
            "--bg-app": "#0a0d0e",
            "--bg-card": "#101617",
            "--bg-elevated": "#161f21",
            "--gold": "#e0e7ff",
            "--gold-light": "#f4f6ff",
            "--gold-dark": "#94a3b8",
            "--gold-glow": "rgba(224, 231, 255, 0.26)",
            "--magic": "#67e8f9",
            "--magic-glow": "rgba(103, 232, 249, 0.28)"
        }
    };

    Arquimago.applyTheme = function (themeKey) {
        var root = document.documentElement;
        var theme = Arquimago.THEMES[themeKey] || Arquimago.THEMES.current;
        var values = PALETTES[themeKey] || PALETTES.current;
        Object.keys(values).forEach(function (key) {
            root.style.setProperty(key, values[key]);
        });
        root.style.setProperty("--theme-accent", theme.accent || "#c9a84c");
        document.body.setAttribute("data-theme", themeKey);
    };

    Arquimago.applyTemplate = function (templateKey) {
        var template = Arquimago.TEMPLATES[templateKey] || Arquimago.TEMPLATES.default;
        document.body.setAttribute("data-template", template.id || "default");
    };

    Arquimago.selectTemplate = function (templateKey) {
        var template = Arquimago.TEMPLATES[templateKey] || Arquimago.TEMPLATES.default;
        Arquimago.state.template = template.id;
        Arquimago.state.theme = template.officialTheme;
        Arquimago.saveState(Arquimago.state);
        Arquimago.applyAppearance();
        if (Arquimago.refreshPlayerFrames) Arquimago.refreshPlayerFrames();
    };

    Arquimago.selectTheme = function (themeKey) {
        Arquimago.state.theme = themeKey;
        Arquimago.saveState(Arquimago.state);
        Arquimago.applyTheme(themeKey);
    };

    Arquimago.applyTypography = function (fontKey) {
        var font = Arquimago.TYPOGRAPHY[fontKey] || Arquimago.TYPOGRAPHY.classica;
        document.body.style.setProperty("--font-display", font.display);
        document.body.style.setProperty("--font-body", font.body);
        document.body.setAttribute("data-font", font.id);
    };

    Arquimago.selectTypography = function (fontKey) {
        Arquimago.state.font = fontKey;
        Arquimago.saveState(Arquimago.state);
        Arquimago.applyTypography(fontKey);
    };

    Arquimago.applyWallpaper = function (wallpaperKey) {
        var root = document.documentElement;
        var wallpaper = Arquimago.WALLPAPERS[wallpaperKey] || Arquimago.WALLPAPERS.auto;
        root.style.setProperty("--wallpaper-image", wallpaper.src ? 'url("' + wallpaper.src + '")' : "none");
        document.body.setAttribute("data-wallpaper", wallpaper.id);
    };

    Arquimago.selectWallpaper = function (wallpaperKey) {
        Arquimago.state.wallpaper = wallpaperKey;
        Arquimago.saveState(Arquimago.state);
        Arquimago.applyWallpaper(wallpaperKey);
    };

    Arquimago.applyAppearance = function () {
        Arquimago.applyTemplate(Arquimago.state.template || "default");
        Arquimago.applyTheme(Arquimago.state.theme || "current");
        Arquimago.applyTypography(Arquimago.state.font || "classica");
        Arquimago.applyWallpaper(Arquimago.state.wallpaper || "auto");
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
