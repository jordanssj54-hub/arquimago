(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var navigationInitialized = false;

    function isMobileViewport() {
        var game = document.getElementById("game");
        return global.innerWidth <= 1100;
    }

    Arquimago.refreshDrawerProfile = function () {
        var state = Arquimago.state;
        if (!state) return;

        var name = Arquimago.getDisplayName ? Arquimago.getDisplayName() : "Arquimago";
        var levelProgress = Arquimago.getLevelProgress ? Arquimago.getLevelProgress(state) : { level: state.level || 1, earned: state.xp || 0, required: 0, percent: 0, maxed: false };
        var formatNumber = Arquimago.formatNumber || function (value) { return String(value || 0); };

        document.querySelectorAll("[data-drawer-player-name]").forEach(function (el) {
            el.textContent = name;
        });
        document.querySelectorAll("[data-drawer-level]").forEach(function (el) {
            el.textContent = formatNumber(levelProgress.level);
        });
        document.querySelectorAll("[data-drawer-xp]").forEach(function (el) {
            el.textContent = levelProgress.maxed ? "LEVEL MÁXIMO" : formatNumber(levelProgress.earned) + " / " + formatNumber(levelProgress.required) + " XP";
        });
        document.querySelectorAll("[data-drawer-xp-fill]").forEach(function (el) {
            el.style.width = Math.min(100, Math.max(0, Number(levelProgress.percent) || 0)) + "%";
        });
        document.querySelectorAll("[data-drawer-avatar]").forEach(function (el) {
            el.src = state.customAvatar || "projeto/cardperfil.png";
        });
    };

    Arquimago.closeMobileNavigation = function () {
        var game = document.getElementById("game");
        var drawer = document.getElementById("mainNavigation");
        var scrim = document.getElementById("navScrim");
        var mobileToggle = document.getElementById("mobileNavToggle");
        if (game) game.classList.remove("nav-mobile-open");
        if (drawer) drawer.scrollTop = 0;
        if (scrim) scrim.hidden = true;
        if (mobileToggle) mobileToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
    };

    Arquimago.initNavigation = function () {
        if (navigationInitialized) {
            Arquimago.closeMobileNavigation();
            return;
        }
        navigationInitialized = true;

        var game = document.getElementById("game");
        var screens = document.querySelectorAll(".screen");
        var tabs = document.querySelectorAll(".tab");
        var drawer = document.getElementById("mainNavigation");
        var drawerToggle = document.getElementById("navDrawerToggle");
        var mobileToggle = document.getElementById("mobileNavToggle");
        var scrim = document.getElementById("navScrim");
        var mainContent = game ? game.querySelector(".main-content") : null;
        var topbar = game ? game.querySelector(".topbar") : null;

        function syncTopbarScrollState() {
            if (!topbar) return;
            var pageScroll = Math.max(
                global.pageYOffset || 0,
                document.documentElement.scrollTop || 0,
                document.body.scrollTop || 0
            );
            var contentScroll = mainContent ? mainContent.scrollTop : 0;
            topbar.classList.toggle("is-scrolled", pageScroll > 2 || contentScroll > 2);
        }

        if (mainContent) mainContent.addEventListener("scroll", syncTopbarScrollState, { passive: true });
        global.addEventListener("scroll", syncTopbarScrollState, { passive: true });

        function setCollapsed(collapsed, persist) {
            if (!game || !drawer) return;
            game.classList.toggle("nav-collapsed", collapsed);
            if (drawerToggle) drawerToggle.setAttribute("aria-expanded", String(!collapsed));
            if (drawerToggle) drawerToggle.setAttribute("aria-label", collapsed ? "Expandir navegação" : "Recolher navegação");
            if (mobileToggle && !isMobileViewport()) {
                mobileToggle.setAttribute("aria-expanded", String(!collapsed));
                mobileToggle.setAttribute("aria-label", collapsed ? "Expandir navegação" : "Recolher navegação");
            }
            if (persist && Arquimago.state) {
                Arquimago.state.navCollapsed = collapsed;
                Arquimago.saveState(Arquimago.state);
            }
        }

        function setMobileOpen(open) {
            if (!game) return;
            game.classList.toggle("nav-mobile-open", open);
            if (scrim) scrim.hidden = !open;
            if (mobileToggle) mobileToggle.setAttribute("aria-expanded", String(open));
            if (mobileToggle) mobileToggle.setAttribute("aria-label", open ? "Fechar navegação" : "Abrir navegação");
            document.body.classList.toggle("nav-open", open);
        }

        function openScreen(id) {
            if (game) game.setAttribute("data-screen", id);
            syncTopbarScrollState();
            screens.forEach(function (s) {
                s.classList.remove("active", "entering");
                if (s.id === id) {
                    s.classList.add("active", "entering");
                }
            });
            tabs.forEach(function (t) {
                t.classList.toggle("active", t.dataset.screen === id);
                if (t.dataset.screen === id) t.setAttribute("aria-current", "page");
                else t.removeAttribute("aria-current");
            });
            if (id === "home") Arquimago.renderHome();
            if (id === "missions") Arquimago.renderMissions();
            if (id === "boss") Arquimago.renderBoss && Arquimago.renderBoss();
            if (id === "financas") Arquimago.renderFinancas();
            if (id === "profile") Arquimago.renderProfile();
            if (id === "grimoire") Arquimago.renderGrimoire && Arquimago.renderGrimoire();
            Arquimago.playClick();
            if (game && game.classList.contains("nav-mobile-open")) setMobileOpen(false);
        }

        function selectScreen(id) {
            var tab = document.querySelector('.tab[data-screen="' + id + '"]');
            if (tab) tab.click();
        }

        function handleReferenceAction(action) {
            if (action === "achievements") {
                selectScreen("profile");
                global.setTimeout(function () {
                    var section = document.querySelector(".profile-reference-achievements");
                    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 0);
                return;
            }

            if (action === "attributes") {
                selectScreen("profile");
                global.setTimeout(function () {
                    var target = document.querySelector(".profile-reference-attributes");
                    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 0);
                return;
            }

            if (action === "grimoire") {
                openScreen("grimoire");
                global.setTimeout(function () {
                    var panel = document.getElementById("personalRewardsPanel");
                    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 0);
                return;
            }

            if (Arquimago.showNotification) {
                Arquimago.showNotification("A História será aberta em breve.", "xp");
            }
        }

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                openScreen(tab.dataset.screen);
            });
        });

        document.querySelectorAll("[data-nav-action]").forEach(function (button) {
            button.addEventListener("click", function () {
                Arquimago.playClick();
                handleReferenceAction(button.getAttribute("data-nav-action"));
            });
        });

        if (drawerToggle) {
            drawerToggle.addEventListener("click", function () {
                Arquimago.playClick();
                if (isMobileViewport()) {
                    setMobileOpen(false);
                    return;
                }
                setCollapsed(!game.classList.contains("nav-collapsed"), true);
            });
        }

        if (mobileToggle) {
            mobileToggle.addEventListener("click", function () {
                Arquimago.playClick();
                if (isMobileViewport()) {
                    setMobileOpen(!game.classList.contains("nav-mobile-open"));
                    return;
                }
                setCollapsed(!game.classList.contains("nav-collapsed"), true);
            });
        }

        if (scrim) scrim.addEventListener("click", function () { setMobileOpen(false); });

        global.addEventListener("pageshow", function () {
            setMobileOpen(false);
            if (drawer) drawer.scrollTop = 0;
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && game.classList.contains("nav-mobile-open")) {
                setMobileOpen(false);
            }
        });

        global.addEventListener("resize", function () {
            if (!isMobileViewport()) setMobileOpen(false);
        });

        setCollapsed(!!(Arquimago.state && Arquimago.state.navCollapsed), false);
        syncTopbarScrollState();
        var activeTab = document.querySelector(".tab.active");
        if (activeTab) {
            if (game) game.setAttribute("data-screen", activeTab.dataset.screen);
            activeTab.setAttribute("aria-current", "page");
        }
        setMobileOpen(false);
        Arquimago.refreshDrawerProfile();
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
