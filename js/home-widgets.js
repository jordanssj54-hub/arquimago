(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var LAYOUT_KEY = "arquimago_home_layout_v3";
    var REFERENCE_ORDER = ["rank", "xp", "finance", "missions", "ascension", "monthly"];
    var SIZE_LABELS = {
        small: "Pequeno",
        medium: "Médio",
        large: "Grande",
        wide: "Largo",
        full: "Completo"
    };

    var SIZE_ORDER = ["small", "medium", "large", "wide", "full"];

    var registry = [];
    var byId = {};
    var _editing = false;
    var layout = loadLayout();

    function loadLayout() {
        var base = { order: [], sizes: {}, visible: {} };
        try {
            var raw = localStorage.getItem(LAYOUT_KEY);
            if (raw) {
                var saved = JSON.parse(raw);
                if (saved && typeof saved === "object") {
                    base.order = Array.isArray(saved.order) ? saved.order : [];
                    base.sizes = saved.sizes && typeof saved.sizes === "object" ? saved.sizes : {};
                    base.visible = saved.visible && typeof saved.visible === "object" ? saved.visible : {};
                }
            }
        } catch (e) {}
        return base;
    }

    function saveLayout() {
        try {
            localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
        } catch (e) {}
    }

    function defaultLayout() {
        var order = [], sizes = {}, visible = {};
        var orderedRegistry = REFERENCE_ORDER.map(function (id) { return byId[id]; }).filter(Boolean);
        registry.forEach(function (w) {
            if (orderedRegistry.indexOf(w) === -1) orderedRegistry.push(w);
        });
        orderedRegistry.forEach(function (w) {
            order.push(w.id);
            sizes[w.id] = w.defaultSize;
            if (w.visibleByDefault === false) visible[w.id] = false;
        });
        return { order: order, sizes: sizes, visible: visible };
    }

    function computeOrder() {
        var seen = {}, ordered = [];
        var savedOrder = layout.order && layout.order.length ? layout.order : REFERENCE_ORDER;
        savedOrder.forEach(function (id) {
            if (byId[id] && !seen[id]) {
                seen[id] = true;
                ordered.push(id);
            }
        });
        registry.forEach(function (w) {
            if (!seen[w.id]) {
                seen[w.id] = true;
                ordered.push(w.id);
            }
        });
        return ordered;
    }

    function isVisible(id) {
        if (layout.visible[id] === true) return true;
        if (layout.visible[id] === false) return false;
        var w = byId[id];
        return !w || w.visibleByDefault !== false;
    }

    function getSize(id) {
        var w = byId[id];
        var size = layout.sizes[id];
        if (size && w && w.sizes.indexOf(size) !== -1) return size;
        return (w && w.defaultSize) || "wide";
    }

    function clampToAllowed(id, size) {
        var w = byId[id];
        if (!w) return size;
        if (w.sizes.indexOf(size) !== -1) return size;
        return w.sizes[w.sizes.length - 1] || w.defaultSize;
    }

    Arquimago.homeWidgets = {
        register: function (def) {
            if (!def || !def.id || byId[def.id]) return;
            if (!def.sizes || !def.sizes.length) def.sizes = ["wide"];
            if (def.sizes.indexOf(def.defaultSize) === -1) def.defaultSize = def.sizes[def.sizes.length - 1];
            registry.push(def);
            byId[def.id] = def;
        },

        getRegistered: function () {
            return registry.slice();
        },

        getSizeLabel: function (size) {
            return SIZE_LABELS[size] || size;
        },

        isEditing: function () {
            return _editing;
        },

        setSize: function (id, size) {
            var w = byId[id];
            if (!w || w.sizes.indexOf(size) === -1) return;
            layout.sizes[id] = size;
            saveLayout();
        },

        setVisible: function (id, visible) {
            if (!byId[id]) return;
            layout.visible[id] = !!visible;
            saveLayout();
        },

        resetLayout: function () {
            layout = defaultLayout();
            saveLayout();
        },

        renderHome: function (container, ctx) {
            if (!container) return;

            var order = computeOrder();
            var items = order.filter(isVisible);
            var html = '<div class="home-page home-page--focused' + (_editing ? " home-edit-mode" : "") + '">';

            html += editBarHtml();

            if (_editing) html += widgetsPanelHtml();

            html += '<div class="home-widget-grid' + (items.length ? "" : " is-empty") + '">';
            items.forEach(function (id) {
                var w = byId[id];
                var size = getSize(id);
                html += '<div class="home-widget home-widget--' + size + '" data-widget-id="' + id + '">';
                if (_editing) html += controlsHtml(w, size);
                html += '<div class="home-widget__body">';
                try {
                    html += w.render(ctx);
                } catch (e) {
                    html += '<section class="panel"><p class="home-empty">Widget indisponível.</p></section>';
                }
                html += '</div></div>';
            });
            html += '</div></div>';

            container.innerHTML = html;

            items.forEach(function (id) {
                var w = byId[id];
                var el = container.querySelector('.home-widget[data-widget-id="' + id + '"] .home-widget__body');
                if (w.afterRender && el) {
                    try {
                        w.afterRender(ctx, el);
                    } catch (e) {}
                }
            });

            wireEditing(container);
            return container.querySelector(".home-widget-grid");
        }
    };

    function editBarHtml() {
        if (!_editing) {
            return '<div class="home-edit-bar">' +
                '<button type="button" class="btn-secondary compact home-edit-trigger" data-home-edit="on">⚙ Editar Home</button>' +
                '</div>';
        }
        return '<div class="home-edit-bar">' +
            '<span class="home-edit-hint">Arraste para mover · ⤢ para redimensionar</span>' +
            '<button type="button" class="btn-secondary compact" data-home-widgets-toggle>Widgets</button>' +
            '<button type="button" class="btn-secondary compact" data-home-layout-restore>↺ Restaurar layout padrão</button>' +
            '<button type="button" class="btn-primary compact" data-home-edit="off">✓ Concluir</button>' +
            '</div>';
    }

    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function widgetsPanelHtml() {
        var html = '<div class="home-widgets-panel">';
        html += '<h4 class="home-widgets-panel__title">Widgets da Home</h4>';
        registry.forEach(function (w) {
            var visible = isVisible(w.id);
            html += '<label class="home-widget-vis"><input type="checkbox" data-widget-visibility="' + w.id + '"' + (visible ? " checked" : "") + '> <span>' + esc(w.title) + '</span></label>';
        });
        html += '</div>';
        return html;
    }

    function controlsHtml(w, size) {
        var menu = w.sizes.map(function (s) {
            return '<button type="button" class="home-widget__size-opt' + (s === size ? " is-active" : "") + '" data-resize-to="' + w.id + '" data-resize-size="' + s + '">' + esc(SIZE_LABELS[s]) + '</button>';
        }).join("");
        return '<div class="home-widget__controls">' +
            '<button type="button" class="home-widget__handle" data-widget-handle="' + w.id + '" title="Mover widget" aria-label="Mover ' + esc(w.title) + '">⠿</button>' +
            '<button type="button" class="home-widget__hide" data-widget-hide="' + w.id + '" title="Ocultar widget" aria-label="Ocultar ' + esc(w.title) + '">×</button>' +
            '<div class="home-widget__resize" data-resize-menu="' + w.id + '">' +
            '<button type="button" class="home-widget__resize-btn" data-resize-toggle="' + w.id + '" title="Tamanho do widget" aria-label="Tamanho de ' + esc(w.title) + '">⤢</button>' +
            '<div class="home-widget__size-menu"><span class="home-widget__size-menu__label">Tamanho</span>' + menu + '</div>' +
            '</div></div>';
    }

    function wireEditing(container) {
        container.querySelectorAll("[data-home-edit]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                _editing = btn.getAttribute("data-home-edit") === "on";
                if (Arquimago.renderHome) Arquimago.renderHome();
            });
        });

        container.querySelectorAll("[data-home-widgets-toggle]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                var panel = container.querySelector(".home-widgets-panel");
                if (panel) panel.classList.toggle("is-open");
            });
        });

        container.querySelectorAll("[data-home-layout-restore]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                if (confirm("Restaurar o layout padrão da Home?\n\nOs widgets voltarão para a posição, tamanho e visibilidade originais. Seus dados e progresso não serão alterados.")) {
                    Arquimago.homeWidgets.resetLayout();
                    if (Arquimago.renderHome) Arquimago.renderHome();
                }
            });
        });

        container.querySelectorAll("[data-widget-visibility]").forEach(function (chk) {
            chk.addEventListener("change", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                Arquimago.homeWidgets.setVisible(chk.getAttribute("data-widget-visibility"), chk.checked);
                if (Arquimago.renderHome) Arquimago.renderHome();
            });
        });

        container.querySelectorAll("[data-widget-hide]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                Arquimago.homeWidgets.setVisible(btn.getAttribute("data-widget-hide"), false);
                if (Arquimago.renderHome) Arquimago.renderHome();
            });
        });

        container.querySelectorAll("[data-resize-toggle]").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                var wrap = btn.closest(".home-widget__resize");
                container.querySelectorAll(".home-widget__resize.is-open").forEach(function (w) {
                    if (w !== wrap) w.classList.remove("is-open");
                });
                if (wrap) {
                    var willOpen = !wrap.classList.contains("is-open");
                    wrap.classList.toggle("is-open", willOpen);
                    if (Arquimago.playClick && willOpen) Arquimago.playClick();
                }
            });
        });

        container.querySelectorAll("[data-resize-to]").forEach(function (opt) {
            opt.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                Arquimago.homeWidgets.setSize(opt.getAttribute("data-resize-to"), opt.getAttribute("data-resize-size"));
                if (Arquimago.renderHome) Arquimago.renderHome();
            });
        });

        if (!_editing) return;

        var grid = container.querySelector(".home-widget-grid");
        if (!grid) return;

        container.querySelectorAll('.home-widget[data-widget-id]').forEach(function (wg) {
            wg.addEventListener("pointerdown", function (e) {
                if (e.target.closest("button, input, select, a, label")) return;
                startDrag(e, wg, grid, true);
            });
            var handle = wg.querySelector("[data-widget-handle]");
            if (handle) {
                handle.addEventListener("pointerdown", function (e) {
                    e.preventDefault();
                    startDrag(e, wg, grid, false);
                });
            }
        });
    }

    if (!document._arquimagoWidgetsMenuListener) {
        document._arquimagoWidgetsMenuListener = true;
        document.addEventListener("pointerdown", function (e) {
            if (e.target && e.target.closest && e.target.closest(".home-widget__resize")) return;
            document.querySelectorAll(".home-widget__resize.is-open").forEach(function (w) {
                w.classList.remove("is-open");
            });
        });
    }

    function startDrag(e, widget, grid, threshold) {
        if (widget.classList.contains("is-dragging")) return;
        var startX = e.clientX;
        var startY = e.clientY;
        var started = threshold === false;
        var lastOver = null;

        if (started) begin(e);

        function begin(ev) {
            started = true;
            widget.classList.add("is-dragging");
            grid.classList.add("is-reordering");
            if (widget.setPointerCapture) {
                try { widget.setPointerCapture(ev.pointerId); } catch (err) {}
            }
            document.body.style.touchAction = "none";
        }

        function onMove(ev) {
            if (!started) {
                var dx = ev.clientX - startX;
                var dy = ev.clientY - startY;
                if ((dx * dx + dy * dy) < 64) return;
                begin(ev);
            }
            ev.preventDefault();
            var target = widgetUnder(ev);
            if (target && target !== lastOver) {
                lastOver = target;
                reorder(widget, target, grid);
            }
        }

        function onUp(ev) {
            if (started) {
                widget.classList.remove("is-dragging");
                grid.classList.remove("is-reordering");
            }
            document.body.style.touchAction = "";
            try { if (widget.releasePointerCapture) widget.releasePointerCapture(ev.pointerId); } catch (err) {}
            widget.removeEventListener("pointermove", onMove);
            widget.removeEventListener("pointerup", onUp);
            widget.removeEventListener("pointercancel", onUp);
            persistOrder(grid);
            lastOver = null;
        }

        widget.addEventListener("pointermove", onMove);
        widget.addEventListener("pointerup", onUp);
        widget.addEventListener("pointercancel", onUp);
    }

    function widgetUnder(e) {
        var grid = document.querySelector(".home-widget-grid");
        if (!grid) return null;
        var px = e.clientX, py = e.clientY;
        var nodes = Array.prototype.slice.call(grid.querySelectorAll(".home-widget"));
        var found = null;
        nodes.forEach(function (n) {
            if (n.classList.contains("is-dragging")) return;
            var r = n.getBoundingClientRect();
            if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) found = n;
        });
        return found;
    }

    function reorder(widget, target, grid) {
        var nodes = Array.prototype.slice.call(grid.querySelectorAll(".home-widget"));
        var di = nodes.indexOf(widget);
        var ti = nodes.indexOf(target);
        if (di === -1 || ti === -1) return;
        if (di > ti) grid.insertBefore(widget, target);
        else grid.insertBefore(widget, target.nextSibling);
    }

    function persistOrder(grid) {
        var order = Array.prototype.slice.call(grid.querySelectorAll(".home-widget"))
            .map(function (n) { return n.getAttribute("data-widget-id"); });
        var seen = {};
        order.forEach(function (id) { seen[id] = true; });
        var rest = (layout.order || []).filter(function (id) { return !seen[id]; });
        layout.order = order.concat(rest);
        saveLayout();
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
