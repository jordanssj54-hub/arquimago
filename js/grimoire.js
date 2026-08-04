(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var EDITOR_CATEGORIES = [
        "Comida", "Música", "Arte", "Leitura", "Lazer", "Surpresa", "Amor", "Outro"
    ];

    var filterTab = "all";
    var searchQuery = "";
    var categoryFilter = "all";

    var editorState = null;
    var editorCache = null;

    var editorIconPickerOpen = false;
    var editorImage = null;

    function escapeHtml(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    /* ============================================================
       Fonte de dados — recompensas nativas + criadas pelo usuário.
       Desbloqueio é sempre derivado do nível atual do mago.
       ============================================================ */
    Arquimago.getGrimoireRewards = function () {
        var state = Arquimago.state;
        var seeds = Arquimago.GRIMOIRE_REWARDS || [];
        var custom = (state && state.grimoireData) || [];
        return seeds.concat(custom);
    };

    Arquimago.isGrimoireUnlocked = function (reward) {
        return Arquimago.state && Arquimago.state.level >= reward.nivelNecessario;
    };

    Arquimago.isRewardFavorite = function (id) {
        var favs = (Arquimago.state && Arquimago.state.grimoireFavs) || {};
        return favs[id] === true;
    };

    Arquimago.toggleRewardFavorite = function (id) {
        var state = Arquimago.state;
        if (!state.grimoireFavs) state.grimoireFavs = {};
        if (state.grimoireFavs[id]) {
            delete state.grimoireFavs[id];
        } else {
            state.grimoireFavs[id] = true;
        }
        Arquimago.saveState(state);
    };

    Arquimago.getGrimoireTypeLabel = function (id) {
        return Arquimago.getGrimoireType(id).label;
    };

    Arquimago.getGrimoireIcon = function (reward) {
        return reward.icone || Arquimago.getGrimoireType(reward.tipo).icon || "🎁";
    };

    /* ============================================================
       CRUD de recompensas personalizadas.
       ============================================================ */
    Arquimago.createGrimoireReward = function (opts) {
        var state = Arquimago.state;
        var list = state.grimoireData || (state.grimoireData = []);
        var reward = {
            id: "grim_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            nome: String(opts.nome || "").trim(),
            descricao: String(opts.descricao || "").trim(),
            categoria: String(opts.categoria || "Outro"),
            tipo: String(opts.tipo || "premio"),
            nivelNecessario: Math.max(1, parseInt(opts.nivelNecessario, 10) || 1),
            icone: String(opts.icone || "🎁")
        };
        if (opts.imagem) reward.imagem = opts.imagem;
        if (!reward.nome) return null;
        list.unshift(reward);
        Arquimago.saveState(state);
        return reward;
    };

    Arquimago.updateGrimoireReward = function (id, opts) {
        var state = Arquimago.state;
        var list = state.grimoireData || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id !== id) continue;
            list[i].nome = String(opts.nome || "").trim();
            list[i].descricao = String(opts.descricao || "").trim();
            list[i].categoria = String(opts.categoria || "Outro");
            list[i].tipo = String(opts.tipo || "premio");
            list[i].nivelNecessario = Math.max(1, parseInt(opts.nivelNecessario, 10) || 1);
            list[i].icone = String(opts.icone || "🎁");
            if (opts.imagem) list[i].imagem = opts.imagem;
            else delete list[i].imagem;
            Arquimago.saveState(state);
            return list[i];
        }
        return null;
    };

    Arquimago.deleteGrimoireReward = function (id) {
        var state = Arquimago.state;
        var list = state.grimoireData || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id !== id) continue;
            list.splice(i, 1);
            if (state.grimoireFavs) delete state.grimoireFavs[id];
            Arquimago.saveState(state);
            return;
        }
    };

    /* ============================================================
       Filtros
       ============================================================ */
    function rewardMatches(reward) {
        var unlocked = Arquimago.isGrimoireUnlocked(reward);
        if (filterTab === "unlocked" && !unlocked) return false;
        if (filterTab === "locked" && unlocked) return false;
        if (filterTab === "favorites" && !Arquimago.isRewardFavorite(reward.id)) return false;
        if (categoryFilter !== "all" && reward.categoria !== categoryFilter) return false;

        var q = searchQuery.trim().toLowerCase();
        if (q) {
            var hay = (reward.nome + " " + (reward.categoria || "") + " " + (reward.descricao || "") + " " +
                Arquimago.getGrimoireTypeLabel(reward.tipo)).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }
        return true;
    }

    function visibleRewards() {
        var list = Arquimago.getGrimoireRewards().filter(rewardMatches);
        list.sort(function (a, b) {
            var au = Arquimago.isGrimoireUnlocked(a) ? 1 : 0;
            var bu = Arquimago.isGrimoireUnlocked(b) ? 1 : 0;
            if (au !== bu) return bu - au;
            return a.nivelNecessario - b.nivelNecessario;
        });
        return list;
    }

    function rewardCategories() {
        var seen = {};
        Arquimago.getGrimoireRewards().forEach(function (r) { seen[r.categoria] = true; });
        return Object.keys(seen).sort();
    }

    /* ============================================================
       Cards
       ============================================================ */
    function cardVisualHtml(reward) {
        var html = '<div class="grimoire-card__visual">';
        if (reward.imagem) {
            html += '<img src="' + reward.imagem + '" alt="' + escapeHtml(reward.nome) + '" loading="lazy">';
        } else {
            html += '<span class="grimoire-card__icon" aria-hidden="true">' + Arquimago.getGrimoireIcon(reward) + '</span>';
        }
        html += '</div>';
        return html;
    }

    function rewardCardHtml(reward) {
        var unlocked = Arquimago.isGrimoireUnlocked(reward);
        var fav = Arquimago.isRewardFavorite(reward.id);
        var type = Arquimago.getGrimoireType(reward.tipo);

        var html = '<div class="grimoire-card' + (unlocked ? " is-unlocked" : " is-locked") + '" data-id="' + reward.id + '" data-name="' + escapeHtml(reward.nome) + '">';

        html += '<button type="button" class="grimoire-card__fav' + (fav ? " is-fav" : "") + '" data-fav="' + reward.id + '" title="' + (fav ? "Remover dos favoritos" : "Favoritar") + '" aria-label="' + (fav ? "Remover dos favoritos" : "Favoritar") + '">' + (fav ? "★" : "☆") + '</button>';

        if (unlocked) {
            html += cardVisualHtml(reward);
            html += '<span class="grimoire-card__type" style="color:' + type.color + '">' + type.icon + " " + type.label + '</span>';
            html += '<h3 class="grimoire-card__name">' + escapeHtml(reward.nome) + '</h3>';
            html += '<p class="grimoire-card__desc">' + escapeHtml(reward.descricao) + '</p>';
            html += '<div class="grimoire-card__meta">';
            html += '<span class="grimoire-card__level">Nível ' + reward.nivelNecessario + '</span>';
            if (reward.categoria) {
                html += '<span class="grimoire-card__cat">' + escapeHtml(reward.categoria) + '</span>';
            }
            html += '</div>';
        } else {
            html += '<div class="grimoire-card__mystery">';
            html += '<span class="grimoire-card__mystery-icon">🔒</span>';
            html += '<span class="grimoire-card__mystery-q">?????</span>';
            html += '</div>';
            html += '<span class="grimoire-card__type grimoire-card__type--locked">🔒 Nível ' + reward.nivelNecessario + '</span>';
            html += '<h3 class="grimoire-card__name">?????</h3>';
            html += '<p class="grimoire-card__desc">Recompensa misteriosa. Continue ganhando XP para revelar.</p>';
            html += '<div class="grimoire-card__meta">';
            html += '<span class="grimoire-card__level">Faltam ' + Math.max(0, reward.nivelNecessario - Arquimago.state.level) + ' nível(is)</span>';
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    function grimoireGridHtml() {
        var list = visibleRewards();
        if (!list.length) {
            return '<div class="grimoire-empty">Nenhuma recompensa encontrada com esses filtros.</div>';
        }
        var html = '';
        list.forEach(function (r) {
            html += rewardCardHtml(r);
        });
        return html;
    }

    /* ============================================================
       Página
       ============================================================ */
    Arquimago.renderGrimoire = function () {
        var container = document.getElementById("grimoire");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var all = Arquimago.getGrimoireRewards();
        var unlockedCount = 0;
        all.forEach(function (r) { if (Arquimago.isGrimoireUnlocked(r)) unlockedCount++; });
        var pct = all.length ? Math.round((unlockedCount / all.length) * 100) : 0;

        var html = '<div class="grimoire-page">';

        html += '<header class="grimoire-header">';
        html += '<h2>Grimório de Recompensas</h2>';
        html += '<p>' + unlockedCount + ' de ' + all.length + ' recompensas desbloqueadas</p>';
        html += '<div class="grimoire-progress"><div style="width:' + pct + '%"></div></div>';
        html += '</header>';

        html += '<div class="grimoire-toolbar">';
        html += '<div class="grimoire-search">';
        html += '<span class="grimoire-search__icon" aria-hidden="true">🔍</span>';
        html += '<input type="text" id="grimoireSearch" placeholder="Buscar recompensa..." value="' + escapeHtml(searchQuery) + '" autocomplete="off" spellcheck="false">';
        html += '</div>';

        html += '<div class="grimoire-filters">';
        html += filterBtn("all", "Todas");
        html += filterBtn("unlocked", "Desbloqueadas");
        html += filterBtn("locked", "Bloqueadas");
        html += filterBtn("favorites", "Favoritas");
        html += '</div>';

        var cats = rewardCategories();
        html += '<div class="grimoire-cats">';
        html += catBtn("all", "Todas");
        cats.forEach(function (c) {
            html += catBtn(c, c);
        });
        html += '</div>';

        html += '<div class="grimoire-toolbar__actions">';
        html += '<button type="button" class="btn-primary compact" id="addRewardButton">＋ Nova Recompensa</button>';
        html += '</div>';
        html += '</div>';

        html += '<div class="grimoire-grid" id="grimoireGrid">' + grimoireGridHtml() + '</div>';

        html += '</div>';
        container.innerHTML = html;

        bindGrimoire(container);
    };

    function filterBtn(id, label) {
        return '<button type="button" class="grimoire-filter' + (filterTab === id ? " is-active" : "") + '" data-filter="' + id + '">' + label + '</button>';
    }

    function catBtn(id, label) {
        return '<button type="button" class="grimoire-cat' + (categoryFilter === id ? " is-active" : "") + '" data-cat="' + id + '">' + escapeHtml(label) + '</button>';
    }

    function refreshGrid() {
        var grid = document.getElementById("grimoireGrid");
        if (!grid) return;
        grid.innerHTML = grimoireGridHtml();
        bindGrid(grid);
    }

    function bindGrimoire(container) {
        var search = container.querySelector("#grimoireSearch");
        if (search) {
            search.addEventListener("input", function () {
                searchQuery = search.value;
                refreshGrid();
            });
        }

        container.querySelectorAll("[data-filter]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                filterTab = btn.getAttribute("data-filter");
                var actives = container.querySelectorAll(".grimoire-filter.is-active");
                actives.forEach(function (el) { el.classList.remove("is-active"); });
                btn.classList.add("is-active");
                refreshGrid();
            });
        });

        container.querySelectorAll("[data-cat]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                categoryFilter = btn.getAttribute("data-cat");
                var actives = container.querySelectorAll(".grimoire-cat.is-active");
                actives.forEach(function (el) { el.classList.remove("is-active"); });
                btn.classList.add("is-active");
                refreshGrid();
            });
        });

        var addBtn = container.querySelector("#addRewardButton");
        if (addBtn) {
            addBtn.addEventListener("click", function () {
                Arquimago.playClick();
                openEditorModal(null);
            });
        }

        var grid = container.querySelector(".grimoire-grid");
        if (grid) bindGrid(grid);
    }

    function bindGrid(grid) {
        grid.querySelectorAll("[data-fav]").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                Arquimago.playClick();
                Arquimago.toggleRewardFavorite(btn.getAttribute("data-fav"));
                btn.classList.toggle("is-fav");
                btn.textContent = btn.classList.contains("is-fav") ? "★" : "☆";
                btn.title = btn.classList.contains("is-fav") ? "Remover dos favoritos" : "Favoritar";
                if (filterTab === "favorites") {
                    refreshGrid();
                }
            });
        });

        grid.querySelectorAll(".grimoire-card").forEach(function (card) {
            card.addEventListener("click", function () {
                Arquimago.playClick();
                var id = card.getAttribute("data-id");
                var reward = findReward(id);
                if (reward) openDetailModal(reward);
            });
        });
    }

    function findReward(id) {
        var list = Arquimago.getGrimoireRewards();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    /* ============================================================
       Modais — detalhe, editor e recorte de imagem.
       ============================================================ */
    function modalShell() {
        var el = document.createElement("div");
        el.className = "modal";
        el.innerHTML = '<div class="modal-backdrop"></div>';
        document.body.appendChild(el);
        return el;
    }

    function closeModal(el) {
        if (el) el.remove();
    }

    function bindModalClose(el) {
        el.querySelectorAll(".modal-backdrop").forEach(function (back) {
            back.addEventListener("click", function () {
                closeModal(el);
            });
        });
        el.querySelectorAll("[data-close-modal]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                closeModal(el);
            });
        });
        el.querySelectorAll(".grimoire-close").forEach(function (btn) {
            btn.addEventListener("click", function () {
                closeModal(el);
            });
        });
    }

    function openDetailModal(reward) {
        var modal = modalShell();
        var unlocked = Arquimago.isGrimoireUnlocked(reward);
        var type = Arquimago.getGrimoireType(reward.tipo);
        var fav = Arquimago.isRewardFavorite(reward.id);
        var isCustom = reward.id.indexOf("grim_") === 0;

        var html = '<div class="modal-panel grimoire-detail">';
         html += '<button type="button" class="modal-close-button grimoire-close grimoire-detail__close" aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button>';

        if (unlocked) {
            html += '<div class="grimoire-detail__visual">';
            if (reward.imagem) {
                html += '<img src="' + reward.imagem + '" alt="' + escapeHtml(reward.nome) + '">';
            } else {
                html += '<span class="grimoire-detail__icon" style="color:' + type.color + '">' + Arquimago.getGrimoireIcon(reward) + '</span>';
            }
            html += '</div>';
            html += '<span class="grimoire-detail__type" style="color:' + type.color + '">' + type.icon + " " + type.label + '</span>';
            html += '<h3>' + escapeHtml(reward.nome) + '</h3>';
            html += '<div class="grimoire-detail__meta">';
            html += '<span>Nível ' + reward.nivelNecessario + '</span>';
            if (reward.categoria) html += '<span>' + escapeHtml(reward.categoria) + '</span>';
            html += '</div>';
            html += '<p class="grimoire-detail__desc">' + escapeHtml(reward.descricao) + '</p>';
            html += '<div class="grimoire-detail__actions">';
            html += '<button type="button" class="btn-secondary compact" data-toggle-fav>' + (fav ? "★ Favoritada" : "☆ Favoritar") + '</button>';
            if (isCustom) {
                html += '<button type="button" class="btn-secondary compact" data-edit-reward>✏️ Editar</button>';
                html += '<button type="button" class="btn-danger compact" data-delete-reward>🗑️ Excluir</button>';
            }
            html += '</div>';
        } else {
            html += '<div class="grimoire-detail__visual grimoire-detail__visual--locked">';
            html += '<span class="grimoire-detail__lock">🔒</span>';
            html += '</div>';
            html += '<h3>Recompensa misteriosa</h3>';
            html += '<p class="grimoire-detail__desc">Este prêmio é uma surpresa. Ele só será revelado quando você alcançar o nível certo.</p>';
            html += '<div class="grimoire-detail__locked-hint">';
            html += '<strong>Nível ' + reward.nivelNecessario + ' necessário</strong>';
            html += '<span>Faltam ' + Math.max(0, reward.nivelNecessario - Arquimago.state.level) + ' nível(is)</span>';
            html += '</div>';
            html += '<div class="grimoire-detail__actions">';
            html += '<button type="button" class="btn-secondary compact" data-toggle-fav>' + (fav ? "★ Favoritada" : "☆ Favoritar") + '</button>';
            html += '</div>';
        }

        html += '</div>';
        modal.innerHTML += html;

        bindModalClose(modal);

        modal.querySelectorAll("[data-toggle-fav]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                Arquimago.toggleRewardFavorite(reward.id);
                var nowFav = Arquimago.isRewardFavorite(reward.id);
                btn.textContent = nowFav ? "★ Favoritada" : "☆ Favoritar";
            });
        });

        modal.querySelectorAll("[data-edit-reward]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                closeModal(modal);
                openEditorModal(reward);
            });
        });

        modal.querySelectorAll("[data-delete-reward]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                if (!confirm('Excluir a recompensa "' + reward.nome + '"?')) return;
                Arquimago.deleteGrimoireReward(reward.id);
                closeModal(modal);
                Arquimago.renderGrimoire();
            });
        });
    }

    /* ── Editor ── */
    function defaultEditorCache() {
        return {
            nome: "",
            descricao: "",
            categoria: "Outro",
            tipo: "premio",
            nivelNecessario: "1",
            icone: "🎁"
        };
    }

    function openEditorModal(reward) {
        editorState = reward ? reward.id : null;
        editorCache = reward ? {
            nome: reward.nome,
            descricao: reward.descricao || "",
            categoria: reward.categoria || "Outro",
            tipo: reward.tipo || "premio",
            nivelNecessario: String(reward.nivelNecessario || 1),
            icone: reward.icone || Arquimago.getGrimoireType(reward.tipo).icon
        } : defaultEditorCache();
        editorIconPickerOpen = false;
        editorImage = reward && reward.imagem ? reward.imagem : null;

        var modal = modalShell();
        renderEditorModal(modal);
    }

    function renderEditorModal(modal) {
        var html = '<div class="modal-backdrop"></div>';
        html += '<div class="modal-panel grimoire-editor">';
         html += '<button type="button" class="modal-close-button grimoire-close grimoire-editor__close" aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button>';
        html += '<h3>' + (editorState ? "Editar Recompensa" : "Nova Recompensa") + '</h3>';
        html += '<form id="rewardForm" autocomplete="off">';

        html += editorFieldHtml("Nome", '<input type="text" id="rewardName" maxlength="80" value="' + escapeHtml(editorCache.nome) + '" placeholder="Ex.: Batata Sensações" required>');
        html += editorFieldHtml("Descrição", '<textarea id="rewardDesc" rows="3" maxlength="300" placeholder="O que torna esta recompensa especial?">' + escapeHtml(editorCache.descricao) + '</textarea>');

        html += '<div class="grimoire-editor__row">';
        html += editorFieldHtml("Categoria", '<select id="rewardCategory">' + EDITOR_CATEGORIES.map(function (c) {
            return '<option value="' + c + '"' + (editorCache.categoria === c ? " selected" : "") + '>' + c + '</option>';
        }).join("") + '</select>');
        html += editorFieldHtml("Tipo", '<select id="rewardType">' + Arquimago.GRIMOIRE_TYPES.map(function (t) {
            return '<option value="' + t.id + '"' + (editorCache.tipo === t.id ? " selected" : "") + '>' + t.icon + " " + t.label + '</option>';
        }).join("") + '</select>');
        html += '</div>';

        html += '<div class="grimoire-editor__row">';
        html += editorFieldHtml("Nível necessário", '<input type="number" id="rewardLevel" min="1" max="100" inputmode="numeric" value="' + escapeHtml(editorCache.nivelNecessario) + '" required>');
        html += editorFieldHtml("Ícone", '<div class="grimoire-icon-preview"><button type="button" class="grimoire-icon-preview__btn" id="rewardIconToggle" title="Escolher ícone">' + editorCache.icone + '</button></div>');
        html += '</div>';

        html += '<div class="grimoire-editor__field grimoire-editor__field--full">';
        html += '<label>Imagem (opcional)</label>';
        html += '<div class="grimoire-image-row">';
        html += '<button type="button" class="btn-secondary compact" id="rewardImageUpload">📷 Enviar imagem</button>';
        if (editorImage) {
            html += '<div class="grimoire-image-thumb"><img src="' + editorImage + '" alt="Prévia"><button type="button" class="grimoire-image-remove" id="rewardImageRemove" title="Remover imagem">&#10005;</button></div>';
        }
        html += '</div>';
        html += '</div>';

        if (editorIconPickerOpen) {
            html += '<div class="grimoire-icon-picker" id="rewardIconPicker">';
            html += '<div class="grimoire-icon-grid">';
            Arquimago.GRIMOIRE_ICONS.forEach(function (emoji) {
                html += '<button type="button" class="grimoire-icon-option' + (editorCache.icone === emoji ? " is-selected" : "") + '" data-icone="' + emoji + '">' + emoji + '</button>';
            });
            html += '</div>';
            html += '</div>';
        }

        html += '<div class="grimoire-editor__actions">';
        html += '<button type="submit" class="btn-primary compact">' + (editorState ? "Salvar" : "Criar Recompensa") + '</button>';
        html += '<button type="button" class="btn-secondary compact" data-close-modal>Cancelar</button>';
        html += '</div>';

        html += '</form>';
        html += '</div>';
        html += '<input type="file" id="rewardEditorImageInput" accept="image/*" hidden>';

        modal.innerHTML = html;
        bindModalClose(modal);
        bindEditor(modal);
    }

    function editorFieldHtml(label, control) {
        return '<div class="grimoire-editor__field grimoire-editor__field--full"><label>' + label + '</label>' + control + '</div>';
    }

    function bindEditor(modal) {
        var form = modal.querySelector("#rewardForm");

        function remember() {
            var n = modal.querySelector("#rewardName");
            var d = modal.querySelector("#rewardDesc");
            var c = modal.querySelector("#rewardCategory");
            var t = modal.querySelector("#rewardType");
            var l = modal.querySelector("#rewardLevel");
            if (n) editorCache.nome = n.value;
            if (d) editorCache.descricao = d.value;
            if (c) editorCache.categoria = c.value;
            if (t) editorCache.tipo = t.value;
            if (l) editorCache.nivelNecessario = l.value;
        }

        form.querySelectorAll("input, select, textarea").forEach(function (field) {
            field.addEventListener(field.tagName === "SELECT" ? "change" : "input", function () {
                remember();
            });
        });

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            remember();
            var nome = editorCache.nome.trim();
            if (!nome) {
                var nameInput = modal.querySelector("#rewardName");
                if (nameInput) nameInput.focus();
                return;
            }

            var opts = {
                nome: editorCache.nome,
                descricao: editorCache.descricao,
                categoria: editorCache.categoria,
                tipo: editorCache.tipo,
                nivelNecessario: editorCache.nivelNecessario,
                icone: editorCache.icone,
                imagem: editorImage || undefined
            };

            if (editorState) {
                Arquimago.updateGrimoireReward(editorState, opts);
                Arquimago.showNotification("Recompensa atualizada", "xp");
            } else {
                Arquimago.createGrimoireReward(opts);
                Arquimago.playMissionComplete();
                Arquimago.showNotification("Nova recompensa criada", "xp");
            }

            Arquimago.saveState(Arquimago.state);
            closeModal(modal);
            editorState = null;
            editorCache = null;
            editorImage = null;
            Arquimago.renderGrimoire();
        });

        var iconToggle = modal.querySelector("#rewardIconToggle");
        if (iconToggle) {
            iconToggle.addEventListener("click", function () {
                Arquimago.playClick();
                editorIconPickerOpen = !editorIconPickerOpen;
                remember();
                renderEditorModal(modal);
            });
        }

        modal.querySelectorAll(".grimoire-icon-option").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                editorCache.icone = btn.getAttribute("data-icone");
                editorIconPickerOpen = false;
                remember();
                renderEditorModal(modal);
            });
        });

        var uploadBtn = modal.querySelector("#rewardImageUpload");
        var fileInput = modal.querySelector("#rewardEditorImageInput");
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener("click", function () {
                fileInput.click();
            });
            fileInput.addEventListener("change", function () {
                var file = fileInput.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function (e) {
                    openCropModal(e.target.result, function (cropped) {
                        editorImage = cropped;
                        remember();
                        renderEditorModal(modal);
                    });
                };
                reader.readAsDataURL(file);
                fileInput.value = "";
            });
        }

        var removeBtn = modal.querySelector("#rewardImageRemove");
        if (removeBtn) {
            removeBtn.addEventListener("click", function () {
                editorImage = null;
                renderEditorModal(modal);
            });
        }
    }

    /* ── Recorte de imagem ── */
    function openCropModal(dataUrl, onConfirm) {
        var modal = modalShell();
        modal.innerHTML +=
             '<div class="modal-panel grimoire-crop">' +
             '<button type="button" class="modal-close-button grimoire-close" aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button>' +
             '<h3>Recortar imagem</h3>' +
            '<div class="crop-stage" id="cropStage">' +
            '<img class="crop-image" id="cropImage" alt="Imagem para recortar">' +
            '</div>' +
            '<div class="crop-controls">' +
            '<label class="crop-zoom-label"><span>Zoom</span><input type="range" id="cropZoom" min="1" max="4" step="0.05" value="1"></label>' +
            '</div>' +
            '<div class="crop-actions">' +
            '<button type="button" class="btn-primary compact" id="cropConfirm">Confirmar</button>' +
            '<button type="button" class="btn-secondary compact" id="cropCancel">Cancelar</button>' +
            '</div>' +
            '</div>';

        bindModalClose(modal);

        var stage = modal.querySelector("#cropStage");
        var imgEl = modal.querySelector("#cropImage");
        var zoomInput = modal.querySelector("#cropZoom");
        var confirmBtn = modal.querySelector("#cropConfirm");
        var cancelBtn = modal.querySelector("#cropCancel");

        var img = new Image();
        var scale = 1, ox = 0, oy = 0;
        var nw = 0, nh = 0;

        cancelBtn.addEventListener("click", function () {
            closeModal(modal);
        });

        img.onload = function () {
            nw = img.naturalWidth;
            nh = img.naturalHeight;
            var stageW = stage.clientWidth;
            var stageH = stage.clientHeight;
            scale = Math.max(stageW / nw, stageH / nh);
            ox = (stageW - nw * scale) / 2;
            oy = (stageH - nh * scale) / 2;
            applyCrop();

            function applyCrop() {
                imgEl.style.width = (nw * scale) + "px";
                imgEl.style.height = (nh * scale) + "px";
                imgEl.style.transform = "translate(" + ox + "px," + oy + "px)";
            }

            function clampCrop() {
                var stageW = stage.clientWidth;
                var stageH = stage.clientHeight;
                ox = Math.min(0, Math.max(stageW - nw * scale, ox));
                oy = Math.min(0, Math.max(stageH - nh * scale, oy));
            }

            zoomInput.addEventListener("input", function () {
                var z = parseFloat(zoomInput.value);
                var stageW = stage.clientWidth;
                var stageH = stage.clientHeight;
                var cx = stageW / 2;
                var cy = stageH / 2;
                var px = (cx - ox) / scale;
                var py = (cy - oy) / scale;
                scale = Math.max(stageW / nw, stageH / nh) * z;
                ox = cx - px * scale;
                oy = cy - py * scale;
                clampCrop();
                applyCrop();
            });

            var dragging = false;
            var sx = 0, sy = 0, sox = 0, soy = 0;

            stage.addEventListener("pointerdown", function (e) {
                dragging = true;
                sx = e.clientX;
                sy = e.clientY;
                sox = ox;
                soy = oy;
                try { stage.setPointerCapture(e.pointerId); } catch (err) {}
            });

            stage.addEventListener("pointermove", function (e) {
                if (!dragging) return;
                ox = sox + (e.clientX - sx);
                oy = soy + (e.clientY - sy);
                clampCrop();
                applyCrop();
            });

            function stopDrag() { dragging = false; }
            stage.addEventListener("pointerup", stopDrag);
            stage.addEventListener("pointercancel", stopDrag);
        };
        img.src = dataUrl;

        confirmBtn.addEventListener("click", function () {
            if (!nw) return;
            var size = 512;
            var canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            var ctx = canvas.getContext("2d");
            var stageW = stage.clientWidth;
            var stageH = stage.clientHeight;
            var srcX = -ox / scale;
            var srcY = -oy / scale;
            var srcW = stageW / scale;
            var srcH = stageH / scale;
            ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, size, size);
            onConfirm(canvas.toDataURL("image/jpeg", 0.85));
            closeModal(modal);
        });
    }

    /* ============================================================
       Celebração de desbloqueio — disparada após o level up.
       ============================================================ */
    Arquimago.showRewardUnlock = function (rewards, onDone) {
        if (!rewards || !rewards.length) {
            if (onDone) onDone();
            return;
        }

        var overlay = document.createElement("div");
        overlay.id = "reward-overlay";
        overlay.innerHTML = '<div class="reward-backdrop"></div>';

        var content = document.createElement("div");
        content.className = "reward-content";
        content.innerHTML = '<div class="reward-pre">NOVA RECOMPENSA</div>';

        var grid = document.createElement("div");
        grid.className = "reward-grid";
        rewards.forEach(function (r) {
            var type = Arquimago.getGrimoireType(r.tipo);
            var card = document.createElement("div");
            card.className = "reward-card";
            card.style.animationDelay = (rewards.indexOf(r) * 0.18) + "s";
            card.innerHTML =
                '<div class="reward-card__visual">' +
                (r.imagem ? '<img src="' + r.imagem + '" alt="' + escapeHtml(r.nome) + '">' : '<span class="reward-card__icon">' + Arquimago.getGrimoireIcon(r) + '</span>') +
                '</div>' +
                '<span class="reward-card__type" style="color:' + type.color + '">' + type.icon + " " + type.label + '</span>' +
                '<h3>' + escapeHtml(r.nome) + '</h3>' +
                '<p>' + escapeHtml(r.descricao) + '</p>';
            grid.appendChild(card);
        });
        content.appendChild(grid);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        Arquimago.playUnlock();

        requestAnimationFrame(function () {
            overlay.classList.add("active");
        });

        setTimeout(function () {
            overlay.classList.add("out");
            setTimeout(function () {
                overlay.remove();
                if (onDone) onDone();
            }, 500);
        }, 3200);
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
