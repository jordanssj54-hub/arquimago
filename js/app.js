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
        var modal = document.getElementById("settings-modal");
        var toggle = document.getElementById("soundToggle");
        var audioButton = document.getElementById("audioToggleButton");
        var templateHint = document.getElementById("templateSelectHint");
        var navPositionControl = document.getElementById("navPositionControl");
        var navScaleControl = document.getElementById("navScaleControl");
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
                refreshAudioButton();
            });
        }

        if (btn && modal) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                modal.hidden = false;
            });
            modal.querySelectorAll("[data-close-modal]").forEach(function (el) {
                el.addEventListener("click", function () {
                    modal.hidden = true;
                });
            });
        }

        function refreshNavControls() {
            var position = Arquimago.state.navPosition === "left" ? "left" : "top";
            var scale = parseFloat(Arquimago.state.navScale) || 1;
            if (navPositionControl) {
                navPositionControl.querySelectorAll(".segmented__btn").forEach(function (b) {
                    b.classList.toggle("active", b.dataset.navPos === position);
                });
            }
            if (navScaleControl) {
                navScaleControl.querySelectorAll(".segmented__btn").forEach(function (b) {
                    b.classList.toggle("active", Math.abs(parseFloat(b.dataset.navScale) - scale) < 0.001);
                });
            }
        }

        function wireNavControls() {
            if (!navPositionControl && !navScaleControl) return;
            refreshNavControls();
            if (navPositionControl) {
                navPositionControl.querySelectorAll(".segmented__btn").forEach(function (b) {
                    b.addEventListener("click", function () {
                        Arquimago.playClick();
                        Arquimago.selectNavPosition(b.dataset.navPos);
                        refreshNavControls();
                    });
                });
            }
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
