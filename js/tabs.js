(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var STORAGE_KEY = "arquimago_tab_order_v1";

    Arquimago.TABS = [];

    function getNav() {
        return document.querySelector(".main-tabs");
    }

    function collectDefaultOrder() {
        var order = [];
        var nav = getNav();
        if (!nav) return order;
        var referenceOrder = ["home", "missions", "attributes", "profile", "history", "map", "grimoire"];
        var available = {};
        nav.querySelectorAll(".tab").forEach(function (tab) {
            if (tab.dataset.screen) available[tab.dataset.screen] = true;
        });
        referenceOrder.forEach(function (id) {
            if (available[id]) order.push(id);
        });
        return order;
    }

    function loadSavedOrder() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    function mergeOrder(defaultOrder, saved) {
        var order = [];
        if (Array.isArray(saved)) {
            saved.forEach(function (id) {
                if (defaultOrder.indexOf(id) !== -1 && order.indexOf(id) === -1) {
                    order.push(id);
                }
            });
        }
        defaultOrder.forEach(function (id) {
            if (order.indexOf(id) === -1) order.push(id);
        });
        return order;
    }

    function syncTabs() {
        var nav = getNav();
        if (!nav) return;
        Arquimago.TABS = Array.prototype.map.call(nav.querySelectorAll(".tab"), function (tab) {
            return {
                id: tab.dataset.screen,
                label: tab.textContent.trim(),
                element: tab
            };
        });
    }

    function applyOrder(order) {
        var nav = getNav();
        if (!nav) return;
        var tabsByScreen = {};
        var tabEls = [];
        nav.querySelectorAll(".tab").forEach(function (tab) {
            tabsByScreen[tab.dataset.screen] = tab;
            tabEls.push(tab);
        });
        order.forEach(function (id, i) {
            var tab = tabsByScreen[id];
            if (tab && tabEls[i] !== tab) {
                nav.insertBefore(tab, tabEls[i]);
            }
        });
        syncTabs();
    }

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Arquimago.TABS.map(function (t) { return t.id; })));
        } catch (e) {}
    }

    function enableDrag() {
        var nav = getNav();
        if (!nav) return;
        var dragged = null;
        var pointerDrag = null;
        var suppressClick = false;

        function movePointerDrag(clientX, clientY) {
            if (!pointerDrag) return;
            var target = document.elementFromPoint(clientX, clientY);
            var tab = target && target.closest ? target.closest(".tab") : null;
            if (!tab || tab.parentNode !== nav || tab === pointerDrag.tab) return;

            var rect = tab.getBoundingClientRect();
            var horizontal = nav.scrollWidth >= nav.scrollHeight;
            var after = horizontal ? clientX > rect.left + rect.width / 2 : clientY > rect.top + rect.height / 2;
            if (after) {
                if (tab.nextSibling !== pointerDrag.tab) nav.insertBefore(pointerDrag.tab, tab.nextSibling);
            } else if (tab !== pointerDrag.tab.nextSibling) {
                nav.insertBefore(pointerDrag.tab, tab);
            }
            syncTabs();
        }

        function finishPointerDrag() {
            if (!pointerDrag) return;
            clearTimeout(pointerDrag.activationTimer);
            pointerDrag.tab.classList.remove("dragging");
            if (pointerDrag.moved) {
                suppressClick = true;
                persist();
            }
            pointerDrag = null;
            syncTabs();
        }

        nav.querySelectorAll(".tab").forEach(function (tab) {
            tab.draggable = true;
            tab.addEventListener("dragstart", function (e) {
                dragged = tab;
                tab.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", tab.dataset.screen);
            });
            tab.addEventListener("dragover", function (e) {
                if (!dragged || dragged === tab) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                var rect = tab.getBoundingClientRect();
                if (e.clientX > rect.left + rect.width / 2) {
                    if (tab.nextSibling !== dragged) nav.insertBefore(dragged, tab.nextSibling);
                } else if (tab !== dragged.nextSibling) {
                    nav.insertBefore(dragged, tab);
                }
                syncTabs();
            });
            tab.addEventListener("dragend", function () {
                if (dragged) dragged.classList.remove("dragging");
                dragged = null;
                syncTabs();
                persist();
            });

            // Mobile browsers do not consistently start native HTML5 dragging.
            tab.addEventListener("pointerdown", function (e) {
                if (e.pointerType === "mouse") return;
                pointerDrag = {
                    tab: tab,
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startY: e.clientY,
                    lastX: e.clientX,
                    moved: false,
                    ready: false,
                    activationTimer: setTimeout(function () {
                        if (pointerDrag && pointerDrag.pointerId === e.pointerId) pointerDrag.ready = true;
                    }, 220)
                };
                if (tab.setPointerCapture) tab.setPointerCapture(e.pointerId);
            });
        });

        nav.addEventListener("dragover", function (e) { e.preventDefault(); });
        nav.addEventListener("drop", function (e) { e.preventDefault(); });
        nav.addEventListener("pointermove", function (e) {
            if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
            var distance = Math.hypot(e.clientX - pointerDrag.startX, e.clientY - pointerDrag.startY);
            if (!pointerDrag.ready) {
                if (distance < 6) return;
                clearTimeout(pointerDrag.activationTimer);
                if (Math.abs(e.clientX - pointerDrag.startX) >= Math.abs(e.clientY - pointerDrag.startY)) {
                    nav.scrollLeft += pointerDrag.lastX - e.clientX;
                    pointerDrag.lastX = e.clientX;
                }
                e.preventDefault();
                return;
            }
            pointerDrag.moved = true;
            e.preventDefault();
            pointerDrag.tab.classList.add("dragging");
            movePointerDrag(e.clientX, e.clientY);
        }, { passive: false });
        nav.addEventListener("pointerup", finishPointerDrag);
        nav.addEventListener("pointercancel", finishPointerDrag);
        nav.addEventListener("click", function (e) {
            if (!suppressClick) return;
            suppressClick = false;
            e.preventDefault();
            e.stopImmediatePropagation();
        }, true);
    }

    function wireRestoreButton() {
        var btn = document.getElementById("restoreTabOrderButton");
        if (!btn) return;
        btn.addEventListener("click", function () {
            if (Arquimago.playClick) Arquimago.playClick();
            Arquimago.restoreDefaultTabOrder();
        });
    }

    Arquimago.restoreDefaultTabOrder = function () {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        applyOrder(collectDefaultOrder());
    };

    function applyNavigationConfig() {
        var cfg = Arquimago.NAVIGATION || { position: "top", scale: 1.0 };
        var position = cfg.position;
        var scale = parseFloat(cfg.scale);
        if (Arquimago.state) {
            if (Arquimago.state.navPosition) position = Arquimago.state.navPosition;
            if (Arquimago.state.navScale) scale = parseFloat(Arquimago.state.navScale);
        }
        if (!isFinite(scale) || scale <= 0) scale = 1.0;
        document.documentElement.style.setProperty("--nav-scale", String(scale));
        var game = document.getElementById("game");
        if (game) {
            game.setAttribute("data-nav-position", position === "left" ? "left" : "top");
        }
    }

    Arquimago.selectNavPosition = function (position) {
        if (position !== "left") position = "top";
        if (Arquimago.state) {
            Arquimago.state.navPosition = position;
            Arquimago.saveState(Arquimago.state);
        }
        applyNavigationConfig();
    };

    Arquimago.selectNavScale = function (scale) {
        scale = parseFloat(scale);
        if (!isFinite(scale) || scale <= 0) scale = 1.0;
        if (Arquimago.state) {
            Arquimago.state.navScale = scale;
            Arquimago.saveState(Arquimago.state);
        }
        applyNavigationConfig();
    };

    Arquimago.applyNavigationConfig = function () {
        applyNavigationConfig();
    };

    Arquimago.initTabs = function () {
        applyNavigationConfig();
        applyOrder(mergeOrder(collectDefaultOrder(), loadSavedOrder()));
        enableDrag();
        wireRestoreButton();
    };

    global.Arquimago = Arquimago;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", Arquimago.initTabs);
    } else {
        Arquimago.initTabs();
    }
})(typeof window !== "undefined" ? window : this);
