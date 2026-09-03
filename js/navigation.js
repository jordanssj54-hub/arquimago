(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var navigationInitialized = false;

    function isMobileViewport() {
        var game = document.getElementById("game");
        return global.innerWidth <= 768 || (game && game.getAttribute("data-screen") === "home" && global.innerWidth <= 1100);
    }

    Arquimago.closeMobileNavigation = function () {
        var game = document.getElementById("game");
        var scrim = document.getElementById("navScrim");
        var mobileToggle = document.getElementById("mobileNavToggle");
        if (game) game.classList.remove("nav-mobile-open");
        if (scrim) scrim.hidden = true;
        if (mobileToggle) mobileToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
    };

    Arquimago.initNavigation = function () {
        if (navigationInitialized) return;
        navigationInitialized = true;

        var game = document.getElementById("game");
        var screens = document.querySelectorAll(".screen");
        var tabs = document.querySelectorAll(".tab");
        var drawer = document.getElementById("mainNavigation");
        var drawerToggle = document.getElementById("navDrawerToggle");
        var mobileToggle = document.getElementById("mobileNavToggle");
        var scrim = document.getElementById("navScrim");

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
            Arquimago.playClick();
            if (game && game.classList.contains("nav-mobile-open")) setMobileOpen(false);
        }

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                openScreen(tab.dataset.screen);
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

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && game.classList.contains("nav-mobile-open")) {
                setMobileOpen(false);
            }
        });

        global.addEventListener("resize", function () {
            if (!isMobileViewport()) setMobileOpen(false);
        });

        setCollapsed(!!(Arquimago.state && Arquimago.state.navCollapsed), false);
        var activeTab = document.querySelector(".tab.active");
        if (activeTab) {
            if (game) game.setAttribute("data-screen", activeTab.dataset.screen);
            activeTab.setAttribute("aria-current", "page");
        }
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
