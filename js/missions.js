(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var ATTR_NAMES = {
        discipline: "Disciplina",
        wisdom: "Sabedoria",
        determination: "Determinação",
        consistency: "Constância"
    };

    var FREQ_MAP = {
        main: { label: "Principal", css: "special" },
        daily: { label: "Diária", css: "daily" },
        weekly: { label: "Semanal", css: "weekly" },
        habits: { label: "Hábito", css: "habit" },
        custom_daily: { label: "Diária", css: "daily" },
        custom_weekly: { label: "Semanal", css: "weekly" },
        custom_free: { label: "Livre", css: "free" }
    };

    var customFormOpen = false;
    var iconPickerOpen = false;

    var formCache = {
        name: "",
        xp: "25",
        freq: "daily",
        objective: "",
        icon: "🎯"
    };

    var FORM_FIELD_IDS = ["customName", "customXp", "customFreq", "customObjective"];

    function escapeHtml(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function rememberFormValues(form) {
        if (!form) return;
        var name = form.querySelector("#customName");
        var xp = form.querySelector("#customXp");
        var freq = form.querySelector("#customFreq");
        var objective = form.querySelector("#customObjective");
        if (name) formCache.name = name.value;
        if (xp) formCache.xp = xp.value;
        if (freq) formCache.freq = freq.value;
        if (objective) formCache.objective = objective.value;
    }

    function focusedFormFieldId() {
        var el = document.activeElement;
        if (el && el.id && FORM_FIELD_IDS.indexOf(el.id) !== -1) return el.id;
        return null;
    }

    /* ============================================================
       Seções recolhíveis — estado persistido fora do estado do jogo
       para não interferir no armazenamento principal.
       ============================================================ */
    var COLLAPSED_KEY = "arquimago_missions_collapsed_v1";
    var DEFAULT_COLLAPSED = {
        custom: true,
        completed: true
    };
    var collapsedSections = loadCollapsedSections();

    function loadCollapsedSections() {
        try {
            var raw = localStorage.getItem(COLLAPSED_KEY);
            var obj = raw ? JSON.parse(raw) : null;
            return (obj && typeof obj === "object") ? obj : {};
        } catch (e) {
            return {};
        }
    }

    function saveCollapsedSections() {
        try {
            localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedSections));
        } catch (e) {}
    }

    function isCollapsed(id) {
        return collapsedSections[id] !== undefined ? !!collapsedSections[id] : !!DEFAULT_COLLAPSED[id];
    }

    function setCollapsed(id, collapsed) {
        collapsedSections[id] = !!collapsed;
        saveCollapsedSections();
    }

    function markCompleted(state, mission, type) {
        var arr = getDoneArray(state, type);
        if (arr && arr.indexOf(mission.id) === -1) {
            arr.push(mission.id);
        }
    }

    function unmarkCompleted(state, mission, type) {
        var arr = getDoneArray(state, type);
        if (arr) {
            var idx = arr.indexOf(mission.id);
            if (idx !== -1) arr.splice(idx, 1);
        }
    }

    function getDoneArray(state, type) {
        if (type === "main") return state.completedIds;
        if (type === "daily") return state.dailyDone;
        if (type === "weekly") return state.weeklyDone;
        if (type === "habits") return state.habitsDone;
        if (type === "custom_daily") return state.dailyDone;
        if (type === "custom_weekly") return state.weeklyDone;
        if (type === "custom_free") return state.completedIds;
        return null;
    }

    function isDone(state, mission, type) {
        var arr = getDoneArray(state, type);
        return arr ? arr.indexOf(mission.id) !== -1 : false;
    }

    function findMission(type, id) {
        if (type.indexOf("custom_") === 0) {
            var customs = Arquimago.getCustomMissions();
            for (var i = 0; i < customs.length; i++) {
                if (customs[i].id === id) return customs[i];
            }
            return null;
        }
        var list = Arquimago.MISSIONS[type];
        if (!list) return null;
        for (var j = 0; j < list.length; j++) {
            if (list[j].id === id) return list[j];
        }
        return null;
    }

    function anchorItem(anchor) {
        if (!anchor || !anchor.closest) return null;
        return anchor.closest(".mission-item") || anchor.closest(".mission-card");
    }

    /* ============================================================
       Caminho único de conclusão — usado por missões nativas E
       personalizadas. Todo o fluxo de XP, nível, atributos, streak,
       conquistas e estatísticas passa por aqui.
       ============================================================ */
    Arquimago.setMissionComplete = function (mission, type, isComplete, anchor) {
        var state = Arquimago.state;
        var item = anchorItem(anchor);

        if (isComplete) {
            if (isDone(state, mission, type)) return;
            markCompleted(state, mission, type);
            state.missionsCompleted += 1;

            if (mission.attribute && state.attributes[mission.attribute] !== undefined) {
                state.attributes[mission.attribute] = Math.min(100, state.attributes[mission.attribute] + 3);
            }

            Arquimago.updateStreak(state);
            Arquimago.checkAchievements(state);
            Arquimago.playMissionComplete();

            if (item) {
                item.classList.add("completed");
                item.classList.add("completing");
            }

            Arquimago.saveState(state);

            setTimeout(function () {
                Arquimago.gainXP(mission.xp, anchor);
            }, 350);
        } else {
            if (!isDone(state, mission, type)) return;
            unmarkCompleted(state, mission, type);
            state.missionsCompleted = Math.max(0, state.missionsCompleted - 1);

            if (mission.attribute && state.attributes[mission.attribute] !== undefined) {
                state.attributes[mission.attribute] = Math.max(0, state.attributes[mission.attribute] - 3);
            }

            if (item) {
                item.classList.remove("completed", "completing");
            }

            Arquimago.saveState(state);
            Arquimago.renderMissions();
        }
    };

    Arquimago.completeMission = function (mission, type, btn) {
        Arquimago.setMissionComplete(mission, type, true, btn);
    };

    /* ============================================================
       Missões Personalizadas — cidadãs de primeira classe.
       Usam exatamente os mesmos arrays de progresso das nativas:
       dailyDone (diária), weeklyDone (semanal), completedIds (livre).
       ============================================================ */
    Arquimago.getCustomMissions = function () {
        return (Arquimago.state && Arquimago.state.customMissions) || [];
    };

    Arquimago.getCustomTypeForFrequency = function (freq) {
        if (freq === "daily") return "custom_daily";
        if (freq === "weekly") return "custom_weekly";
        return "custom_free";
    };

    Arquimago.getMissionIcon = function (mission) {
        if (mission && mission.icon) return mission.icon;
        if (mission && mission.id && Arquimago.NATIVE_MISSION_ICONS && Arquimago.NATIVE_MISSION_ICONS[mission.id]) {
            return Arquimago.NATIVE_MISSION_ICONS[mission.id];
        }
        return "🎯";
    };

    Arquimago.createCustomMission = function (opts) {
        var state = Arquimago.state;
        var customs = state.customMissions || (state.customMissions = []);

        var mission = {
            id: "custom_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            name: String(opts.name || "").trim(),
            xp: Math.max(1, Math.min(1000, parseInt(opts.xp, 10) || 0)),
            frequency: opts.frequency === "daily" || opts.frequency === "weekly" ? opts.frequency : "free",
            objective: String(opts.objective || "").trim(),
            icon: String(opts.icon || "🎯"),
            category: "Personalizada",
            createdAt: Date.now()
        };
        if (!mission.name) return null;

        mission.desc = mission.objective || mission.name;
        customs.unshift(mission);
        Arquimago.saveState(state);
        return mission;
    };

    Arquimago.deleteCustomMission = function (id) {
        var state = Arquimago.state;
        var customs = state.customMissions || [];
        var mission = null;
        var idx = -1;
        for (var i = 0; i < customs.length; i++) {
            if (customs[i].id === id) {
                mission = customs[i];
                idx = i;
                break;
            }
        }
        if (!mission) return;

        customs.splice(idx, 1);
        var type = Arquimago.getCustomTypeForFrequency(mission.frequency);
        if (isDone(state, mission, type)) {
            unmarkCompleted(state, mission, type);
            state.missionsCompleted = Math.max(0, state.missionsCompleted - 1);
        }

        Arquimago.saveState(state);
        Arquimago.renderMissions();
    };

    function missionItemHtml(state, mission, type, freq, descText) {
        var done = isDone(state, mission, type);
        var isCustom = mission.id.indexOf("custom_") === 0;
        var attrName = mission.attribute ? (ATTR_NAMES[mission.attribute] || mission.attribute) : "";

        var html = '<div class="mission-item' + (done ? " completed" : "") + '" data-id="' + mission.id + '" data-type="' + type + '">';

        html += '<label class="mission-check" title="Marcar missão">';
        html += '<input type="checkbox"' + (done ? " checked" : "") + '>';
        html += '<span class="mission-check__box"></span>';
        html += '</label>';

        html += '<div class="mission-item__body">';
        html += '<div class="mission-item__header">';
        html += '<span class="mission-icon" aria-hidden="true">' + Arquimago.getMissionIcon(mission) + '</span>';
        html += '<span class="mission-item__name">' + escapeHtml(mission.name) + '</span>';
        html += '<span class="mission-item__freq mission-item__freq--' + freq.css + '">' + freq.label + '</span>';
        html += '</div>';
        html += '<p class="mission-item__desc">' + escapeHtml(descText == null ? mission.desc : descText) + '</p>';
        html += '<div class="mission-item__meta">';
        if (mission.objective) {
            html += '<span class="mission-item__objective">&#127919; ' + escapeHtml(mission.objective) + '</span>';
        }
        if (attrName) {
            html += '<span class="mission-item__reward">&#127942; +3 ' + attrName + '</span>';
        }
        html += '</div>';
        html += '</div>';

        html += '<div class="mission-item__aside">';
        html += '<span class="mission-item__xp">+' + mission.xp + ' XP</span>';
        if (isCustom) {
            html += '<button type="button" class="mission-item__delete" data-delete-custom="' + mission.id + '" title="Excluir missão">&#10005;</button>';
        }
        html += '</div>';

        html += '</div>';
        return html;
    }

    function collapsibleSectionHtml(id, title, sub, bodyHtml, actionHtml) {
        var collapsed = isCollapsed(id);
        var html = '<div class="missions-collapse' + (collapsed ? " is-collapsed" : "") + '" data-section="' + id + '">';
        html += '<div class="missions-collapse__head">';
        html += '<button type="button" class="missions-collapse__toggle" data-toggle-section="' + id + '" aria-expanded="' + String(!collapsed) + '" aria-controls="missions-section-' + id + '">';
        html += '<span class="missions-collapse__arrow" aria-hidden="true">&#9662;</span>';
        html += '<span class="missions-collapse__titles">';
        html += '<span class="missions-collapse__title">' + title + '</span>';
        if (sub) html += '<span class="missions-collapse__sub">' + sub + '</span>';
        html += '</span>';
        html += '</button>';
        if (actionHtml) {
            html += '<div class="missions-collapse__action">' + actionHtml + '</div>';
        }
        html += '</div>';
        html += '<div class="missions-collapse__body' + (collapsed ? " is-collapsed" : "") + '" id="missions-section-' + id + '" data-section-body="' + id + '">';
        html += '<div class="missions-collapse__inner">';
        html += '<div class="missions-collapse__content">' + bodyHtml + '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function iconPickerHtml() {
        var selected = formCache.icon || "🎯";
        var html = '<div class="missions-form__field missions-form__field--full">';
        html += '<label for="customIconPreview">Ícone</label>';
        html += '<div class="missions-form__icon">';
        html += '<button type="button" class="missions-form__icon-preview" id="customIconPreview" title="Escolher ícone" aria-label="Ícone escolhido">' + selected + '</button>';
        html += '<button type="button" class="btn-secondary compact" id="customIconToggle">' + (iconPickerOpen ? "Fechar" : "Escolher ícone") + '</button>';
        html += '</div>';

        if (iconPickerOpen) {
            html += '<div class="missions-form__icon-picker" id="customIconPicker">';
            Arquimago.MISSION_ICON_CATEGORIES.forEach(function (cat) {
                html += '<div class="missions-form__icon-cat">' + cat.label + '</div>';
                html += '<div class="missions-form__icon-grid">';
                Arquimago.MISSION_ICONS.forEach(function (ic) {
                    if (ic.category !== cat.id) return;
                    html += '<button type="button" class="missions-form__icon-option' + (selected === ic.emoji ? " is-selected" : "") +
                        '" data-icon="' + ic.emoji + '" title="' + escapeHtml(ic.name) + '" aria-label="' + escapeHtml(ic.name) + '">' + ic.emoji + '</button>';
                });
                html += '</div>';
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    function customFormHtml() {
        return '<form class="missions-form" id="customMissionForm" autocomplete="off">' +
            '<div class="missions-form__field">' +
            '<label for="customName">Nome</label>' +
            '<input type="text" id="customName" maxlength="60" autocomplete="off" spellcheck="false" value="' + escapeHtml(formCache.name) + '" placeholder="Ex.: Beber 2L de água" required>' +
            '</div>' +
            '<div class="missions-form__field">' +
            '<label for="customXp">XP</label>' +
            '<input type="number" id="customXp" min="1" max="1000" inputmode="numeric" value="' + escapeHtml(formCache.xp) + '" required>' +
            '</div>' +
            '<div class="missions-form__field">' +
            '<label for="customFreq">Frequência</label>' +
            '<select id="customFreq">' +
            '<option value="daily"' + (formCache.freq === "daily" ? " selected" : "") + '>Diária</option>' +
            '<option value="weekly"' + (formCache.freq === "weekly" ? " selected" : "") + '>Semanal</option>' +
            '<option value="free"' + (formCache.freq === "free" ? " selected" : "") + '>Livre</option>' +
            '</select>' +
            '</div>' +
            '<div class="missions-form__field missions-form__field--full">' +
            '<label for="customObjective">Objetivo (opcional)</label>' +
            '<input type="text" id="customObjective" maxlength="120" autocomplete="off" spellcheck="false" value="' + escapeHtml(formCache.objective) + '" placeholder="Ex.: Registrar no diário ao concluir">' +
            '</div>' +
            iconPickerHtml() +
            '<div class="missions-form__actions">' +
            '<button type="submit" class="btn-primary compact">Criar Missão</button>' +
            '<button type="button" class="btn-secondary compact" id="cancelCustomMission">Cancelar</button>' +
            '</div>' +
            '</form>';
    }

    function activeMissionsHtml(state) {
        var html = '<div class="missions-section missions-active">';
        html += '<h2 class="missions-section__title">Missões Ativas</h2>';
        html += '<p class="missions-section__sub">Tudo o que você pode realizar agora. Marque para ganhar XP.</p>';
        html += '<div class="missions-list">';

        var count = 0;
        ["main", "daily", "weekly", "habits"].forEach(function (key) {
            var freq = FREQ_MAP[key];
            Arquimago.MISSIONS[key].forEach(function (m) {
                if (isDone(state, m, key)) return;
                html += missionItemHtml(state, m, key, freq, m.desc);
                count++;
            });
        });

        Arquimago.getCustomMissions().forEach(function (m) {
            var type = Arquimago.getCustomTypeForFrequency(m.frequency);
            var freq = FREQ_MAP[type];
            if (isDone(state, m, type)) return;
            html += missionItemHtml(state, m, type, freq, m.objective || m.desc);
            count++;
        });

        if (!count) {
            html += '<div class="missions-empty">Todas as missões foram concluídas. Volte mais tarde ou crie uma nova missão personalizada.</div>';
        }

        html += '</div></div>';
        return html;
    }

    function customSectionHtml(state) {
        var action = '<button type="button" class="btn-secondary compact" id="addCustomMissionButton">' + (customFormOpen ? "— Fechar" : "＋ Nova Missão") + '</button>';

        var body = '';
        if (customFormOpen) {
            body += customFormHtml();
        }

        var completed = 0;
        body += '<div class="missions-list">';
        Arquimago.getCustomMissions().forEach(function (m) {
            var type = Arquimago.getCustomTypeForFrequency(m.frequency);
            var freq = FREQ_MAP[type];
            if (!isDone(state, m, type)) return;
            body += missionItemHtml(state, m, type, freq, m.objective || m.desc);
            completed++;
        });
        if (!completed && !customFormOpen) {
            body += '<div class="missions-empty">Suas missões ativas aparecem no topo e as concluídas ficam arquivadas aqui. Crie a primeira com "＋ Nova Missão".</div>';
        }
        body += '</div>';

        return collapsibleSectionHtml("custom", "Missões Personalizadas", "Criadas por você — concedem XP, contam nas estatísticas e respeitam todas as regras do sistema.", body, action);
    }

    function completedMissionsHtml(state) {
        var html = '<div class="missions-list">';
        var count = 0;
        ["main", "daily", "weekly", "habits"].forEach(function (key) {
            var freq = FREQ_MAP[key];
            Arquimago.MISSIONS[key].forEach(function (m) {
                if (!isDone(state, m, key)) return;
                html += missionItemHtml(state, m, key, freq, m.desc);
                count++;
            });
        });
        if (!count) return "";
        html += '</div>';
        return html;
    }

    function completedMissionEntries(state) {
        var entries = [];
        ["main", "daily", "weekly", "habits"].forEach(function (key) {
            Arquimago.MISSIONS[key].forEach(function (mission) {
                if (isDone(state, mission, key)) entries.push({ mission: mission, type: key });
            });
        });
        Arquimago.getCustomMissions().forEach(function (mission) {
            var type = Arquimago.getCustomTypeForFrequency(mission.frequency);
            if (isDone(state, mission, type)) entries.push({ mission: mission, type: type });
        });
        return entries;
    }

    function clearCompletedMissions(state) {
        var entries = completedMissionEntries(state);
        if (!entries.length) return false;

        entries.forEach(function (entry) {
            unmarkCompleted(state, entry.mission, entry.type);
            if (entry.mission.attribute && state.attributes[entry.mission.attribute] !== undefined) {
                state.attributes[entry.mission.attribute] = Math.max(0, state.attributes[entry.mission.attribute] - 3);
            }
        });
        state.missionsCompleted = Math.max(0, state.missionsCompleted - entries.length);
        Arquimago.saveState(state);
        return true;
    }

    function resetProgress(state) {
        state.level = Arquimago.DEFAULT_STATE.level;
        state.xp = Arquimago.DEFAULT_STATE.xp;
        state.totalXP = Arquimago.DEFAULT_STATE.totalXP;
        state.chapter = Arquimago.DEFAULT_STATE.chapter;
        state.title = Arquimago.DEFAULT_STATE.title;
        Arquimago.saveState(state);
    }

    function openResetProgressConfirm() {
        var modal = document.createElement("div");
        modal.className = "modal missions-confirm-modal";
        modal.innerHTML = '<div class="modal-backdrop"></div>' +
            '<div class="modal-panel missions-confirm-panel">' +
            '<button type="button" class="modal-close-button" data-close-confirm aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button>' +
            '<h3>Restaurar progresso</h3>' +
            '<p>Restaurar XP, nível, capítulo e título para o início?</p>' +
            '<div class="missions-confirm-actions">' +
            '<button type="button" class="btn-primary compact" data-confirm-reset>Confirmar</button>' +
            '<button type="button" class="btn-secondary compact" data-close-confirm>Cancelar</button>' +
            '</div></div>';
        document.body.appendChild(modal);

        function close() { modal.remove(); }
        modal.querySelectorAll(".modal-backdrop, [data-close-confirm]").forEach(function (el) {
            el.addEventListener("click", close);
        });
        modal.querySelector("[data-confirm-reset]").addEventListener("click", function () {
            resetProgress(Arquimago.state);
            close();
            Arquimago.playClick();
            if (Arquimago.refreshAll) Arquimago.refreshAll(false);
            else Arquimago.renderMissions();
        });
    }

    Arquimago.getNextMainMission = function () {
        var state = Arquimago.state;
        var mains = Arquimago.MISSIONS.main;
        for (var i = 0; i < mains.length; i++) {
            if (state.completedIds.indexOf(mains[i].id) === -1) return mains[i];
        }
        return mains[mains.length - 1];
    };

    Arquimago.renderMissions = function () {
        var container = document.getElementById("missions");
        if (!container) return;
        var state = Arquimago.state;

        var focusedFieldId = focusedFormFieldId();
        rememberFormValues(container.querySelector("#customMissionForm"));

        var canClear = completedMissionEntries(state).length > 0;
        var html = '<div class="missions-page">';
        html += '<div class="missions-toolbar"><button type="button" class="btn-secondary compact" id="clearCompletedMissions"' +
            (canClear ? "" : " disabled") + '>Desmarcar todas as concluídas</button></div>';
        html += '<div class="missions-toolbar missions-toolbar--reset"><button type="button" class="btn-secondary compact missions-reset-button" id="resetProgressButton">Restaurar XP e nível inicial</button></div>';

        html += activeMissionsHtml(state);
        html += customSectionHtml(state);

        var completedHtml = completedMissionsHtml(state);
        if (completedHtml) {
            html += collapsibleSectionHtml("completed", "Missões Concluídas", "Missões que você já cumpriu. Desmarque para reativar.", completedHtml);
        }

        html += '</div>';
        container.innerHTML = html;
        bindMissionToggles(container);
        bindCustomControls(container);
        bindCollapsibleToggles(container);
        var clearButton = container.querySelector("#clearCompletedMissions");
        if (clearButton) {
            clearButton.addEventListener("click", function () {
                if (!clearCompletedMissions(Arquimago.state)) return;
                Arquimago.playClick();
                Arquimago.renderMissions();
            });
        }
        var resetButton = container.querySelector("#resetProgressButton");
        if (resetButton) {
            resetButton.addEventListener("click", function () {
                Arquimago.playClick();
                openResetProgressConfirm();
            });
        }

        if (customFormOpen && focusedFieldId && !isCollapsed("custom")) {
            var restored = container.querySelector("#customMissionForm");
            if (restored) {
                var field = restored.querySelector("#" + focusedFieldId);
                if (field) {
                    try {
                        var len = field.value.length;
                        field.focus();
                        field.setSelectionRange(len, len);
                    } catch (err) {}
                }
            }
        }
    };

    function bindMissionToggles(container) {
        container.querySelectorAll(".mission-check input").forEach(function (input) {
            input.addEventListener("change", function () {
                var itemEl = input.closest(".mission-item");
                var type = itemEl.dataset.type;
                var id = itemEl.dataset.id;
                var mission = findMission(type, id);
                if (!mission) return;

                Arquimago.playClick();
                Arquimago.setMissionComplete(mission, type, input.checked, input);
            });
        });
    }

    function bindCollapsibleToggles(container) {
        container.querySelectorAll("[data-toggle-section]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                var id = btn.getAttribute("data-toggle-section");
                var root = container.querySelector('[data-section="' + id + '"]');
                var body = container.querySelector('[data-section-body="' + id + '"]');
                if (!root || !body) return;
                var collapsed = !isCollapsed(id);
                setCollapsed(id, collapsed);
                root.classList.toggle("is-collapsed", collapsed);
                body.classList.toggle("is-collapsed", collapsed);
                btn.setAttribute("aria-expanded", String(!collapsed));
            });
        });
    }

    function bindCustomControls(container) {
        var addBtn = container.querySelector("#addCustomMissionButton");
        if (addBtn) {
            addBtn.addEventListener("click", function () {
                Arquimago.playClick();
                customFormOpen = !customFormOpen;
                setCollapsed("custom", false);
                Arquimago.renderMissions();
            });
        }

        var cancelBtn = container.querySelector("#cancelCustomMission");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", function () {
                Arquimago.playClick();
                customFormOpen = false;
                iconPickerOpen = false;
                formCache.name = "";
                formCache.objective = "";
                formCache.icon = "🎯";
                Arquimago.renderMissions();
            });
        }

        var form = container.querySelector("#customMissionForm");
        if (form) {
            form.querySelectorAll("input, select").forEach(function (field) {
                var evtName = field.tagName === "SELECT" ? "change" : "input";
                field.addEventListener(evtName, function () {
                    rememberFormValues(form);
                });
            });

            form.addEventListener("submit", function (e) {
                e.preventDefault();
                rememberFormValues(form);

                var mission = Arquimago.createCustomMission({
                    name: formCache.name,
                    xp: formCache.xp,
                    frequency: formCache.freq,
                    objective: formCache.objective,
                    icon: formCache.icon
                });

                if (!mission) {
                    var nameInput = form.querySelector("#customName");
                    if (nameInput) nameInput.focus();
                    return;
                }

                Arquimago.playMissionComplete();
                customFormOpen = false;
                iconPickerOpen = false;
                formCache.name = "";
                formCache.objective = "";
                formCache.icon = "🎯";
                Arquimago.renderMissions();
            });
        }

        var iconToggle = container.querySelector("#customIconToggle");
        var iconPreview = container.querySelector("#customIconPreview");
        if (iconToggle) {
            iconToggle.addEventListener("click", function () {
                Arquimago.playClick();
                iconPickerOpen = !iconPickerOpen;
                Arquimago.renderMissions();
            });
        }
        if (iconPreview) {
            iconPreview.addEventListener("click", function () {
                Arquimago.playClick();
                iconPickerOpen = !iconPickerOpen;
                Arquimago.renderMissions();
            });
        }

        container.querySelectorAll(".missions-form__icon-option").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                formCache.icon = btn.getAttribute("data-icon");
                iconPickerOpen = false;
                Arquimago.renderMissions();
            });
        });

        container.querySelectorAll("[data-delete-custom]").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                Arquimago.playClick();
                if (confirm("Excluir esta missão personalizada?")) {
                    Arquimago.deleteCustomMission(btn.getAttribute("data-delete-custom"));
                }
            });
        });
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
