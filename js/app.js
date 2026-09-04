(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var playTimer = null;
    var dateSyncTimer = null;
    var dateSyncEventsBound = false;

    Arquimago.enterGame = function () {
        var game = document.getElementById("game");
        if (game) {
            game.hidden = false;
            game.classList.add("visible");
        }
        Arquimago.initParticles();
        Arquimago.initNavigation();
        Arquimago.applyAppearance();
        if (Arquimago.applyNavigationConfig) Arquimago.applyNavigationConfig();
        Arquimago.refreshAll();
        processPendingClassChanges();
        Arquimago.startMusic();
        initSettings();
        startPlayTimer();
        startDateSyncTimer();
    };

    function initSettings() {
        var btn = document.getElementById("settingsButton");
        var drawerSettingsButton = document.getElementById("drawerSettingsButton");
        var modal = document.getElementById("settings-modal");
        var toggle = document.getElementById("soundToggle");
        var audioButton = document.getElementById("audioToggleButton");
        var templateHint = document.getElementById("templateSelectHint");
        var navScaleControl = document.getElementById("navScaleControl");
        var settingsRank = document.getElementById("settingsReferenceRank");
        var settingsThemeName = document.getElementById("settingsReferenceThemeName");
        var settingsPlayerName = modal ? modal.querySelector("[data-settings-player-name]") : null;
        var wallpaperSelectWrapper = document.getElementById("wallpaperSelect");
        var uploadWallpaperButton = document.getElementById("uploadWallpaperButton");
        var clearWallpaperButton = document.getElementById("clearWallpaperButton");
        var wallpaperFileInput = document.getElementById("wallpaperFileInput");

        var openMenu = null;

        function closeAllMenus() {
            if (openMenu) {
                openMenu.close();
                openMenu = null;
            }
        }

        function buildFieldSelect(wrapper, registry, getCurrent, applyFn, makeValue, makeOption) {
            var trigger = document.createElement("button");
            trigger.type = "button";
            trigger.className = "field-select__trigger";
            trigger.setAttribute("aria-haspopup", "listbox");

            var value = document.createElement("span");
            value.className = "field-select__value";

            var menu = document.createElement("div");
            menu.className = "field-select__menu";

            trigger.appendChild(value);
            wrapper.appendChild(trigger);
            wrapper.appendChild(menu);

            var optionEls = {};

            Object.keys(registry).forEach(function (key) {
                var el = document.createElement("div");
                el.className = "field-select__option";
                el.setAttribute("data-value", key);
                el.setAttribute("role", "option");
                el.innerHTML = makeOption(registry[key]);
                el.addEventListener("click", function () {
                    applyFn(key);
                    refresh();
                    closeAllMenus();
                    if (wrapper === templateWrapper && templateHint) {
                        templateHint.textContent = (registry[key].desc || "");
                    }
                    if (wrapper === templateWrapper && themeSelectUI) {
                        themeSelectUI.refresh();
                    }
                    if (wrapper === templateWrapper || wrapper === themeWrapper) {
                        refreshReferenceVisuals();
                    }
                });
                menu.appendChild(el);
                optionEls[key] = el;
            });

            function currentKey() {
                return getCurrent() || Object.keys(registry)[0];
            }

            function refresh() {
                var key = currentKey();
                var opt = registry[key] || registry[Object.keys(registry)[0]];
                value.innerHTML = makeValue(opt);
                Object.keys(optionEls).forEach(function (k) {
                    optionEls[k].classList.toggle("active", k === key);
                });
            }

            function close() {
                trigger.classList.remove("open");
                menu.classList.remove("open");
                trigger.setAttribute("aria-expanded", "false");
            }

            function open() {
                refresh();
                closeAllMenus();
                trigger.classList.add("open");
                menu.classList.add("open");
                trigger.setAttribute("aria-expanded", "true");
                openMenu = {
                    close: function () {
                        close();
                    }
                };
            }

            trigger.addEventListener("click", function (e) {
                e.stopPropagation();
                if (menu.classList.contains("open")) closeAllMenus();
                else open();
            });

            refresh();

            return { refresh: refresh, close: close };
        }

        var templateWrapper = document.getElementById("templateSelect");
        var themeWrapper = document.getElementById("themeSelect");
        var fontWrapper = document.getElementById("fontSelect");

        function templateValue(t) {
            return '<span class="field-select__option-name">' + t.name + '</span>';
        }

        function templateOption(t) {
            return '<span class="field-select__option-name">' + t.name + '</span>' +
                (t.desc ? '<span class="field-select__option-desc">' + t.desc + '</span>' : "");
        }

        function themeValue(t) {
            return '<span class="field-select__swatch" style="background:' + t.accent + ';color:' + t.accent + ';"></span>' +
                '<span class="field-select__option-name">' + t.name + '</span>';
        }

        function fontValue(f) {
            return '<span class="font-preview" style="font-family:' + f.display + ';">' + f.name + '</span>';
        }

        buildFieldSelect(templateWrapper, Arquimago.TEMPLATES, function () { return Arquimago.state.template; }, Arquimago.selectTemplate, templateValue, templateOption);
        var themeSelectUI = buildFieldSelect(themeWrapper, Arquimago.THEMES, function () { return Arquimago.state.theme; }, Arquimago.selectTheme, themeValue, themeValue);
        buildFieldSelect(fontWrapper, Arquimago.TYPOGRAPHY, function () { return Arquimago.state.font; }, Arquimago.selectTypography, fontValue, fontValue);
        var wallpaperSelectUI = buildFieldSelect(wallpaperSelectWrapper, Arquimago.WALLPAPERS, function () { return Arquimago.state.wallpaper; }, Arquimago.selectWallpaper, templateValue, templateOption);

        function refreshReferenceVisuals() {
            if (!modal || !Arquimago.state) return;
            var themeKey = Arquimago.state.theme || "current";
            var visualThemeKey = themeKey === "dark" ? "current" : themeKey;
            var themeNames = {
                current: "Escuro",
                dark: "Escuro",
                arcane: "Arcano",
                light: "Clássico"
            };
            modal.querySelectorAll("[data-settings-theme]").forEach(function (button) {
                var active = button.getAttribute("data-settings-theme") === visualThemeKey;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", String(active));
            });
            if (settingsThemeName) settingsThemeName.textContent = themeNames[themeKey] || ((Arquimago.THEMES[themeKey] || {}).name || "Personalizado");
            if (settingsPlayerName) settingsPlayerName.textContent = Arquimago.getDisplayName ? Arquimago.getDisplayName() : "Arquimago";
            if (themeSelectUI) themeSelectUI.refresh();
            if (settingsRank) {
                var rank = Arquimago.getDailyRankData ? Arquimago.getDailyRankData(Arquimago.state) : null;
                settingsRank.textContent = rank && rank.rank ? rank.rank : "D";
            }
        }

        modal.querySelectorAll("[data-settings-theme]").forEach(function (button) {
            button.addEventListener("click", function () {
                var themeKey = button.getAttribute("data-settings-theme");
                if (!themeKey || !Arquimago.selectTheme) return;
                Arquimago.playClick();
                Arquimago.selectTheme(themeKey);
                refreshReferenceVisuals();
            });
        });

        modal.querySelectorAll("[data-settings-target]").forEach(function (button) {
            button.addEventListener("click", function () {
                var target = document.getElementById(button.getAttribute("data-settings-target"));
                if (!target) return;
                Arquimago.playClick();
                modal.querySelectorAll("[data-settings-target]").forEach(function (item) {
                    item.classList.toggle("is-active", item === button);
                });
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });

        document.addEventListener("click", function () {
            closeAllMenus();
        });

        if (templateHint && Arquimago.TEMPLATES[Arquimago.state.template]) {
            templateHint.textContent = Arquimago.TEMPLATES[Arquimago.state.template].desc || "";
        }

        function refreshWallpaperButtons() {
            var isCustom = Arquimago.state.wallpaper === "custom";
            if (clearWallpaperButton) clearWallpaperButton.hidden = !isCustom;
        }

        if (uploadWallpaperButton && wallpaperFileInput) {
            uploadWallpaperButton.addEventListener("click", function () {
                Arquimago.playClick();
                wallpaperFileInput.click();
            });
            wallpaperFileInput.addEventListener("change", function () {
                var file = wallpaperFileInput.files && wallpaperFileInput.files[0];
                if (!file) return;
                if (!/^image\//.test(file.type)) {
                    if (Arquimago.showNotification) Arquimago.showNotification("Escolha um arquivo de imagem.", "boss");
                    return;
                }
                var reader = new FileReader();
                reader.onload = function () {
                    if (Arquimago.setCustomWallpaper) Arquimago.setCustomWallpaper(reader.result);
                    refreshWallpaperButtons();
                    if (wallpaperSelectUI && wallpaperSelectUI.refresh) wallpaperSelectUI.refresh();
                };
                reader.readAsDataURL(file);
                wallpaperFileInput.value = "";
            });
            refreshWallpaperButtons();
        }

        if (clearWallpaperButton && Arquimago.selectWallpaper) {
            clearWallpaperButton.addEventListener("click", function () {
                Arquimago.playClick();
                Arquimago.selectWallpaper("auto");
                refreshWallpaperButtons();
            });
        }

        if (toggle) {
            toggle.checked = Arquimago.state.soundEnabled !== false;
            toggle.addEventListener("change", function () {
                Arquimago.state.soundEnabled = toggle.checked;
                Arquimago.saveState(Arquimago.state);
                if (!toggle.checked) Arquimago.stopMusic();
                else Arquimago.startMusic();
                if (audioButton) {
                    audioButton.classList.toggle("is-muted", !toggle.checked);
                    audioButton.setAttribute("aria-pressed", String(toggle.checked));
                    audioButton.innerHTML = toggle.checked ? "🔊 Som" : "🔈 Som";
                }
            });
        }

        if (audioButton) {
            var refreshAudioButton = function () {
                var enabled = Arquimago.state.soundEnabled !== false;
                audioButton.classList.toggle("is-muted", !enabled);
                audioButton.setAttribute("aria-pressed", String(enabled));
                audioButton.innerHTML = enabled ? "🔊 Som" : "🔈 Som";
            };
            refreshAudioButton();
            audioButton.addEventListener("click", function () {
                Arquimago.playClick();
                Arquimago.state.soundEnabled = Arquimago.state.soundEnabled === false;
                Arquimago.saveState(Arquimago.state);
                if (Arquimago.state.soundEnabled) Arquimago.startMusic();
                else Arquimago.stopMusic();
                if (toggle) toggle.checked = Arquimago.state.soundEnabled;
                refreshAudioButton();
            });
        }

        if (modal) {
            function closeSettings() {
                modal.hidden = true;
                document.body.classList.remove("settings-reference-open");
            }

            function openSettings() {
                Arquimago.playClick();
                modal.hidden = false;
                document.body.classList.add("settings-reference-open");
                refreshReferenceVisuals();
                refreshWallpaperButtons();
                refreshNavControls();
                var sidebar = modal.querySelector(".settings-reference-sidebar");
                var content = modal.querySelector(".settings-reference-content");
                if (sidebar) sidebar.scrollTop = 0;
                if (content) content.scrollTop = 0;
                modal.querySelectorAll("[data-settings-target]").forEach(function (item) {
                    item.classList.toggle("is-active", item.getAttribute("data-settings-target") === "settingsThemeSection");
                });
                if (Arquimago.closeMobileNavigation) Arquimago.closeMobileNavigation();
            }
            if (btn) btn.addEventListener("click", openSettings);
            if (drawerSettingsButton) drawerSettingsButton.addEventListener("click", openSettings);
            modal.querySelectorAll("[data-close-modal]").forEach(function (el) {
                el.addEventListener("click", function () {
                    closeSettings();
                });
            });
            modal.querySelectorAll("[data-open-profile]").forEach(function (el) {
                el.addEventListener("click", function () {
                    closeSettings();
                    var profileTab = document.querySelector('.tab[data-screen="profile"]');
                    if (profileTab) profileTab.click();
                });
            });
            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && !modal.hidden) closeSettings();
            });
        }

        function refreshNavControls() {
            var scale = parseFloat(Arquimago.state.navScale) || 1;
            if (navScaleControl) {
                navScaleControl.querySelectorAll(".segmented__btn").forEach(function (b) {
                    b.classList.toggle("active", Math.abs(parseFloat(b.dataset.navScale) - scale) < 0.001);
                });
            }
        }

        function wireNavControls() {
            if (!navScaleControl) return;
            refreshNavControls();
            if (navScaleControl) {
                navScaleControl.querySelectorAll(".segmented__btn").forEach(function (b) {
                    b.addEventListener("click", function () {
                        Arquimago.playClick();
                        Arquimago.selectNavScale(b.dataset.navScale);
                        refreshNavControls();
                    });
                });
            }
        }

        wireNavControls();
    }

    function startPlayTimer() {
        if (playTimer) clearInterval(playTimer);
        playTimer = setInterval(function () {
            Arquimago.state.playTimeSeconds += 30;
            Arquimago.saveState(Arquimago.state);
        }, 30000);
    }

    function processPendingClassChanges() {
        var changes = Arquimago.state && Arquimago.state.pendingClassChanges;
        if (!changes || !changes.length) return;
        var change = changes[changes.length - 1];
        Arquimago.state.pendingClassChanges = [];
        Arquimago.saveState(Arquimago.state);
        if (Arquimago.showClassChange) Arquimago.showClassChange(change);
        if (Arquimago.showNotification) {
            Arquimago.showNotification((change.direction > 0 ? "Classe elevada: " : "Classe reduzida: ") + change.currentClass, "xp");
        }
    }
    Arquimago.processPendingClassChanges = processPendingClassChanges;

    function startDateSyncTimer() {
        if (dateSyncTimer) clearInterval(dateSyncTimer);
        function syncCurrentDates() {
            var state = Arquimago.state;
            if (!state || !Arquimago.syncDates) return;
            var oldDay = state.dailyDate;
            var oldMonth = state.monthlyKey;
            Arquimago.syncDates(state);
            if (oldDay !== state.dailyDate || oldMonth !== state.monthlyKey) {
                Arquimago.saveState(state);
                Arquimago.refreshAll(false);
                processPendingClassChanges();
            }
        }
        dateSyncTimer = setInterval(syncCurrentDates, 60000);
        if (!dateSyncEventsBound) {
            dateSyncEventsBound = true;
            document.addEventListener("visibilitychange", function () {
                if (!document.hidden) syncCurrentDates();
            });
            window.addEventListener("focus", syncCurrentDates);
        }
    }

    Arquimago.init = function () {
        Arquimago.state = Arquimago.loadState();
        Arquimago.saveState(Arquimago.state);

        Arquimago.runIntro(function () {
            Arquimago.enterGame();
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", Arquimago.init);
    } else {
        Arquimago.init();
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
