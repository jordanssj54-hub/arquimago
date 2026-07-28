(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var playTimer = null;

    Arquimago.enterGame = function () {
        var game = document.getElementById("game");
        if (game) {
            game.hidden = false;
            game.classList.add("visible");
        }
        Arquimago.initParticles();
        Arquimago.initNavigation();
        Arquimago.applyTheme(Arquimago.state.theme || "current");
        Arquimago.refreshAll();
        Arquimago.startMusic();
        initSettings();
        startPlayTimer();
    };

    function initSettings() {
        var btn = document.getElementById("settingsButton");
        var modal = document.getElementById("settings-modal");
        var toggle = document.getElementById("soundToggle");
        var themeButtons = document.querySelectorAll("[data-theme-option]");
        var audioButton = document.getElementById("audioToggleButton");

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

        themeButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                var themeKey = button.getAttribute("data-theme-option");
                Arquimago.state.theme = themeKey;
                Arquimago.applyTheme(themeKey);
                Arquimago.saveState(Arquimago.state);
                themeButtons.forEach(function (other) { other.classList.toggle("active", other === button); });
            });
        });

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

        themeButtons.forEach(function (button) {
            if (button.getAttribute("data-theme-option") === (Arquimago.state.theme || "current")) {
                button.classList.add("active");
            }
        });
    }

    function startPlayTimer() {
        playTimer = setInterval(function () {
            Arquimago.state.playTimeSeconds += 30;
            Arquimago.saveState(Arquimago.state);
        }, 30000);
    }

    Arquimago.init = function () {
        Arquimago.state = Arquimago.loadState();
        Arquimago.state.title = Arquimago.getTitleForLevel(Arquimago.state.level);
        Arquimago.state.chapter = Arquimago.getChapterForLevel(Arquimago.state.level).id;

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
