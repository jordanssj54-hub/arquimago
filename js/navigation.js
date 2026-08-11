(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.initNavigation = function () {
        var screens = document.querySelectorAll(".screen");
        var tabs = document.querySelectorAll(".tab");

        function openScreen(id) {
            screens.forEach(function (s) {
                s.classList.remove("active", "entering");
                if (s.id === id) {
                    s.classList.add("active", "entering");
                }
            });
            tabs.forEach(function (t) {
                t.classList.toggle("active", t.dataset.screen === id);
            });
            if (id === "home") Arquimago.renderHome();
            if (id === "history") Arquimago.renderHistory && Arquimago.renderHistory();
            if (id === "map") Arquimago.renderMap();
            if (id === "missions") Arquimago.renderMissions();
            if (id === "financas") Arquimago.renderFinancas();
            if (id === "attributes") Arquimago.renderAttributes();
            if (id === "grimoire") Arquimago.renderGrimoire();
            if (id === "profile") Arquimago.renderProfile();
            Arquimago.playClick();
        }

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                openScreen(tab.dataset.screen);
            });
        });
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
