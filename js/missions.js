(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var ATTR_NAMES = {
        strength: "Força",
        intelligence: "Inteligência",
        vitality: "Vitalidade",
        spirit: "Espírito"
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
    var missionSettingsOpen = false;
    var missionManagementMode = null;
    var selectedMissionIds = {};
    var editingMissionId = null;
    var ACTIVE_MISSIONS_HIDDEN_KEY = "arquimago_active_missions_hidden_v1";
    var activeMissionsHidden = loadActiveMissionsHidden();

    function loadActiveMissionsHidden() {
        try {
            return localStorage.getItem(ACTIVE_MISSIONS_HIDDEN_KEY) === "true";
        } catch (error) {
            return false;
        }
    }

    function saveActiveMissionsHidden() {
        try {
            localStorage.setItem(ACTIVE_MISSIONS_HIDDEN_KEY, String(activeMissionsHidden));
        } catch (error) {}
    }

    var formCache = {
        name: "",
        xp: "4",
        freq: "daily",
        objective: "",
        icon: "🎯",
        attribute: "vitality"
    };

    var FORM_FIELD_IDS = ["customName", "customXp", "customFreq", "customObjective", "customAttribute"];

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
        var attribute = form.querySelector("#customAttribute");
        if (name) formCache.name = name.value;
        if (xp) formCache.xp = xp.value;
        if (freq) formCache.freq = freq.value;
        if (objective) formCache.objective = objective.value;
        if (attribute) formCache.attribute = attribute.value;
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

    var MISSION_DETAILS_KEY = "arquimago_mission_details_expanded_v1";
    var expandedMissionDetails = loadExpandedMissionDetails();

    function loadExpandedMissionDetails() {
        try {
            var raw = localStorage.getItem(MISSION_DETAILS_KEY);
            var obj = raw ? JSON.parse(raw) : null;
            return (obj && typeof obj === "object") ? obj : {};
        } catch (e) {
            return {};
        }
    }

    function saveExpandedMissionDetails() {
        try {
            localStorage.setItem(MISSION_DETAILS_KEY, JSON.stringify(expandedMissionDetails));
        } catch (e) {}
    }

    function isMissionDetailsExpanded(id) {
        return !!expandedMissionDetails[id];
    }

    function setMissionDetailsExpanded(id, expanded) {
        if (expanded) expandedMissionDetails[id] = true;
        else delete expandedMissionDetails[id];
        saveExpandedMissionDetails();
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
            if (list[j].id === id) return Arquimago.applyMissionOverrides ? Arquimago.applyMissionOverrides(list[j]) : list[j];
        }
        return null;
    }

    Arquimago.findMission = findMission;

    function anchorItem(anchor) {
        if (!anchor || !anchor.closest) return null;
        return anchor.closest(".mission-item") || anchor.closest(".mission-card") || anchor.closest(".home-mission-row");
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
            state.missionsCompletedForLevel = Math.max(0, (state.missionsCompletedForLevel || 0) + 1);
            state.xpCompletedForLevel = Math.max(0, (state.xpCompletedForLevel || 0) + (Number(mission.xp) || 0));

            var progression = Arquimago.applyMissionProgress ? Arquimago.applyMissionProgress(state, mission) : null;

            Arquimago.updateStreak(state);
            Arquimago.checkAchievements(state);
            Arquimago.playMissionComplete();

            if (progression && progression.attribute && progression.attribute.levelUp) {
                var attr = Arquimago.ATTRIBUTE_DEFINITIONS[mission.attribute];
                if (attr) Arquimago.showNotification(attr.name + " alcançou o nível " + progression.attribute.data.level, "xp");
            }
            if (progression && progression.boss && progression.boss.damage) {
                Arquimago.showNotification("-" + progression.boss.damage + " HP no Boss" + (progression.boss.weakness ? " · fraqueza explorada" : ""), "boss");
            }
            if (progression && progression.boss && progression.boss.defeated) {
                Arquimago.showNotification("Boss derrotado · troféu registrado", "boss");
            }

            if (item) {
                item.classList.add("completed");
                item.classList.add("completing");
            }

            Arquimago.saveState(state);

            setTimeout(function () {
                Arquimago.gainXP(mission.xp, anchor);

                if (Arquimago.checkMissionLevelUp) {
                    Arquimago.checkMissionLevelUp(anchor);
                }
            }, 350);
        } else {
            if (!isDone(state, mission, type)) return;
            unmarkCompleted(state, mission, type);
            state.missionsCompleted = Math.max(0, state.missionsCompleted - 1);
            state.missionsCompletedForLevel = Math.max(0, (state.missionsCompletedForLevel || 0) - 1);
            state.xpCompletedForLevel = Math.max(0, (state.xpCompletedForLevel || 0) - (Number(mission.xp) || 0));

            if (Arquimago.revertMissionProgress) Arquimago.revertMissionProgress(state, mission);

            if (item) {
                item.classList.remove("completed", "completing");
            }

            Arquimago.saveState(state);
            if (Arquimago.refreshAll) Arquimago.refreshAll(false);
            else Arquimago.renderMissions();
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
            xp: Math.max(2, Math.min(8, parseInt(opts.xp, 10) || 4)),
            frequency: opts.frequency === "daily" || opts.frequency === "weekly" ? opts.frequency : "free",
            objective: String(opts.objective || "").trim(),
            icon: String(opts.icon || "🎯"),
            attribute: Arquimago.ATTRIBUTE_DEFINITIONS[opts.attribute] ? opts.attribute : "vitality",
            bossDamage: Math.max(5, Math.min(35, parseInt(opts.bossDamage, 10) || 10)),
            category: "Personalizada",
            createdAt: Date.now()
        };
        if (!mission.name) return null;

        mission.desc = mission.objective || mission.name;
        customs.unshift(mission);
        Arquimago.saveState(state);
        return mission;
    };

    Arquimago.deleteCustomMission = function (id, options) {
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
        state.hiddenMissionIds = (state.hiddenMissionIds || []).filter(function (missionId) { return missionId !== id; });
        state.deletedMissionIds = (state.deletedMissionIds || []).filter(function (missionId) { return missionId !== id; });
        var type = Arquimago.getCustomTypeForFrequency(mission.frequency);
        if (isDone(state, mission, type)) {
            unmarkCompleted(state, mission, type);
            state.missionsCompleted = Math.max(0, state.missionsCompleted - 1);
            if (Arquimago.revertMissionProgress) Arquimago.revertMissionProgress(state, mission);
        }

        Arquimago.saveState(state);
        if (!options || options.skipRefresh !== true) {
            if (Arquimago.refreshAll) Arquimago.refreshAll(false);
            else Arquimago.renderMissions();
        }
    };

    function missionItemHtml(state, mission, type, freq, descText) {
        var done = isDone(state, mission, type);
        var attrName = mission.attribute ? (ATTR_NAMES[mission.attribute] || mission.attribute) : "";
        var detailsExpanded = isMissionDetailsExpanded(mission.id);
        var detailsId = "mission-details-" + mission.id;

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
        html += '<span class="mission-item__xp">' + mission.xp + ' XP</span>';
        html += '<div class="mission-item__actions">';
        html += '<button type="button" class="mission-item__details-toggle" data-toggle-mission-details="' + escapeHtml(mission.id) + '" aria-expanded="' + String(detailsExpanded) + '" aria-controls="' + escapeHtml(detailsId) + '" aria-label="' + (detailsExpanded ? "Ocultar informações de " : "Mostrar informações de ") + escapeHtml(mission.name) + '" title="' + (detailsExpanded ? "Ocultar informações" : "Mostrar informações") + '"><span class="mission-item__details-arrow" aria-hidden="true">&#9662;</span></button>';
        html += '</div>';
        html += '</div>';
        html += '<div class="mission-item__details' + (detailsExpanded ? "" : " is-collapsed") + '" id="' + escapeHtml(detailsId) + '"><div class="mission-item__details-inner">';
        html += '<p class="mission-item__desc">' + escapeHtml(descText == null ? mission.desc : descText) + '</p>';
        html += '<div class="mission-item__meta">';
        if (mission.objective) {
            html += '<span class="mission-item__objective">&#127919; ' + escapeHtml(mission.objective) + '</span>';
        }
        if (attrName) {
            html += '<span class="mission-item__reward">&#127942; +1 ' + attrName + '</span>';
        }
        if (mission.bossDamage) {
            html += '<span class="mission-item__damage">&#9876; -' + mission.bossDamage + ' Boss</span>';
        }
        html += '</div>';
        html += '</div></div>';

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
             '<input type="number" id="customXp" min="2" max="8" inputmode="numeric" value="' + escapeHtml(formCache.xp) + '" required>' +
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
             '<div class="missions-form__field">' +
             '<label for="customAttribute">Atributo</label>' +
             '<select id="customAttribute">' +
             Object.keys(Arquimago.ATTRIBUTE_DEFINITIONS).map(function (key) {
                 var definition = Arquimago.ATTRIBUTE_DEFINITIONS[key];
                 return '<option value="' + key + '"' + (formCache.attribute === key ? ' selected' : '') + '>' + definition.name + '</option>';
             }).join("") +
             '</select>' +
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
        html += '<div class="missions-section__head"><div><h2 class="missions-section__title">Missões Ativas</h2>';
        html += '<p class="missions-section__sub">Tudo o que você pode realizar agora. Cada conclusão gera XP, dano e progresso de atributo.</p></div>';
        html += '<button type="button" class="btn-secondary compact missions-active-toggle" id="toggleActiveMissions">' + (activeMissionsHidden ? "Mostrar" : "Ocultar") + '</button></div>';
        html += '<div class="missions-list' + (activeMissionsHidden ? " is-hidden" : "") + '">';

        var count = 0;
        ["main", "daily", "weekly", "habits"].forEach(function (key) {
            var freq = FREQ_MAP[key];
            Arquimago.MISSIONS[key].forEach(function (m) {
                m = Arquimago.applyMissionOverrides ? Arquimago.applyMissionOverrides(m) : m;
                if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, m.id)) return;
                if (isDone(state, m, key)) return;
                html += missionItemHtml(state, m, key, freq, m.desc);
                count++;
            });
        });

        Arquimago.getCustomMissions().forEach(function (m) {
            var type = Arquimago.getCustomTypeForFrequency(m.frequency);
            var freq = FREQ_MAP[type];
            if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, m.id)) return;
            if (isDone(state, m, type)) return;
            html += missionItemHtml(state, m, type, freq, m.objective || m.desc);
            count++;
        });

        if (!count && !activeMissionsHidden) {
            html += '<div class="missions-empty">Todas as missões foram concluídas. Volte mais tarde ou crie uma nova missão personalizada.</div>';
        }

        html += '</div>';
        if (activeMissionsHidden) html += '<p class="missions-hidden-note">As missões ativas estão ocultas.</p>';
        html += '</div>';
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
            if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, m.id)) return;
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
                m = Arquimago.applyMissionOverrides ? Arquimago.applyMissionOverrides(m) : m;
                if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, m.id)) return;
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
                mission = Arquimago.applyMissionOverrides ? Arquimago.applyMissionOverrides(mission) : mission;
                if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, mission.id)) return;
                if (isDone(state, mission, key)) entries.push({ mission: mission, type: key });
            });
        });
        Arquimago.getCustomMissions().forEach(function (mission) {
            var type = Arquimago.getCustomTypeForFrequency(mission.frequency);
            if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, mission.id)) return;
            if (isDone(state, mission, type)) entries.push({ mission: mission, type: type });
        });
        return entries;
    }

    function hiddenMissionsHtml(state) {
        var entries = Arquimago.getAllMissionEntries(Arquimago.state, true).filter(function (entry) {
            return Arquimago.isMissionHidden && Arquimago.isMissionHidden(state, entry.mission.id) &&
                !(Arquimago.isMissionDeleted && Arquimago.isMissionDeleted(state, entry.mission.id));
        });
        if (!entries.length) return "";

        var body = '<div class="missions-hidden-list">';
        entries.forEach(function (entry) {
            var mission = entry.mission;
            body += '<div class="mission-hidden-item"><span class="mission-icon" aria-hidden="true">' + Arquimago.getMissionIcon(mission) + '</span><div class="mission-hidden-item__copy"><strong>' + escapeHtml(mission.name) + '</strong><small>' + escapeHtml(mission.desc || mission.name) + '</small></div>';
            body += '<button type="button" class="btn-secondary compact" data-restore-mission="' + escapeHtml(mission.id) + '">Mostrar</button>';
            body += '</div>';
        });
        body += '</div>';
        return collapsibleSectionHtml("hidden", "Missões Ocultas", "Ficam fora da Home e do Rank Diário até você escolher mostrar novamente.", body);
    }

    function missionManagementEntries(state) {
        return Arquimago.getAllMissionEntries(state, true).filter(function (entry) {
            if (Arquimago.isMissionDeleted && Arquimago.isMissionDeleted(state, entry.mission.id)) return false;
            if (missionManagementMode === "hide" && Arquimago.isMissionHidden && Arquimago.isMissionHidden(state, entry.mission.id)) return false;
            return true;
        });
    }

    function missionManagementHtml(state) {
        if (!missionManagementMode) return "";

        if (missionManagementMode === "edit") {
            return missionEditHtml(state);
        }

        var deleting = missionManagementMode === "delete";
        var entries = missionManagementEntries(state);
        var selectedCount = Object.keys(selectedMissionIds).filter(function (id) { return selectedMissionIds[id]; }).length;
        var html = '<section class="missions-management" aria-labelledby="missions-management-title">';
        html += '<div class="missions-management__head"><div><span class="section-label">Checklist de gerenciamento</span><h2 id="missions-management-title">' + (deleting ? "Excluir missões" : "Ocultar missões") + '</h2>';
        html += '<p>' + (deleting ? "Selecione as missões que deseja retirar permanentemente. O histórico de progresso será preservado." : "Selecione as missões que deseja retirar da Home e do rank diário.") + '</p></div>';
        html += '<button type="button" class="btn-secondary compact" data-cancel-mission-management>Cancelar</button></div>';
        html += '<div class="missions-management__list">';

        entries.forEach(function (entry) {
            var mission = entry.mission;
            var freq = FREQ_MAP[entry.type] || { label: "Missão" };
            var isHidden = Arquimago.isMissionHidden && Arquimago.isMissionHidden(state, mission.id);
            html += '<label class="missions-management__item' + (isHidden ? " is-hidden" : "") + '">';
            html += '<input type="checkbox" data-manage-mission="' + escapeHtml(mission.id) + '"' + (selectedMissionIds[mission.id] ? " checked" : "") + '>';
            html += '<span class="missions-management__check" aria-hidden="true"></span>';
            html += '<span class="mission-icon" aria-hidden="true">' + Arquimago.getMissionIcon(mission) + '</span>';
            html += '<span class="missions-management__copy"><strong>' + escapeHtml(mission.name) + '</strong><small>' + escapeHtml(freq.label + (isHidden ? " · Oculta" : "")) + '</small></span>';
            html += '</label>';
        });

        if (!entries.length) {
            html += '<p class="missions-management__empty">Não há missões disponíveis para esta ação.</p>';
        }
        html += '</div>';
        html += '<div class="missions-management__actions">';
        html += '<span>' + selectedCount + ' selecionada' + (selectedCount === 1 ? "" : "s") + '</span>';
        html += '<button type="button" class="btn-primary compact' + (deleting ? " missions-management__delete" : "") + '" data-submit-mission-management' + (selectedCount ? "" : " disabled") + '>' + (deleting ? "Excluir selecionadas" : "Ocultar selecionadas") + '</button>';
        html += '</div></section>';
        return html;
    }

    function missionEditHtml(state) {
        var entries = missionManagementEntries(state).filter(function (entry) {
            return entry.mission.id.indexOf("custom_") !== 0;
        });
        var html = '<section class="missions-management" aria-labelledby="missions-management-title">';
        html += '<div class="missions-management__head"><div><span class="section-label">Checklist de edição</span><h2 id="missions-management-title">Editar missões nativas</h2>';
        html += '<p>Altere o XP ou o ícone de uma missão nativa. A edição vale para a exibição e para novas conclusões.</p></div>';
        html += '<button type="button" class="btn-secondary compact" data-cancel-mission-management>Cancelar</button></div>';
        html += '<div class="missions-management__list">';

        entries.forEach(function (entry) {
            var mission = entry.mission;
            var freq = FREQ_MAP[entry.type] || { label: "Missão" };
            var edited = Arquimago.getMissionOverrides ? !!Arquimago.getMissionOverrides(state)[mission.id] : false;
            html += '<label class="missions-management__item' + (edited ? " is-edited" : "") + '">';
            html += '<input type="radio" name="mission-edit" data-manage-mission="' + escapeHtml(mission.id) + '"' + (editingMissionId === mission.id ? " checked" : "") + '>';
            html += '<span class="missions-management__check" aria-hidden="true"></span>';
            html += '<span class="mission-icon" aria-hidden="true">' + Arquimago.getMissionIcon(mission) + '</span>';
            html += '<span class="missions-management__copy"><strong>' + escapeHtml(mission.name) + '</strong><small>' + escapeHtml(freq.label + (edited ? " · Editada" : " · Padrão")) + ' · ' + mission.xp + ' XP</small></span>';
            html += '</label>';
        });

        if (!entries.length) {
            html += '<p class="missions-management__empty">Não há missões nativas disponíveis para edição.</p>';
        }
        html += '</div>';
        html += '<div class="missions-management__actions">';
        html += '<span>' + (editingMissionId ? "1 selecionada" : "Selecione uma missão para editar") + '</span>';
        html += '<button type="button" class="btn-primary compact" data-submit-mission-management' + (editingMissionId ? "" : " disabled") + '>Editar missão</button>';
        html += '</div></section>';
        return html;
    }

    function missionsToolbarHtml(canClear) {
        var html = '<div class="missions-toolbar"><div class="missions-settings">';
        html += '<button type="button" class="missions-settings__button" id="missionsSettingsButton" aria-expanded="' + String(missionSettingsOpen) + '" aria-controls="missions-settings-menu" aria-label="Opções das missões" title="Opções das missões"><img src="assets/ui/icons/icon_settings.png?v=2" alt=""></button>';
        if (missionSettingsOpen) {
            html += '<div class="missions-settings__menu" id="missions-settings-menu" role="menu">';
            html += '<button type="button" role="menuitem" id="clearCompletedMissions"' + (canClear ? "" : " disabled") + '>Desmarcar todas as concluídas</button>';
            html += '<button type="button" role="menuitem" id="resetProgressButton">Restaurar XP e nível inicial</button>';
            html += '<span class="missions-settings__separator" aria-hidden="true"></span>';
            html += '<button type="button" role="menuitem" data-start-mission-management="hide">Ocultar missões</button>';
            html += '<button type="button" role="menuitem" data-start-mission-management="edit">Editar missões</button>';
            html += '<button type="button" role="menuitem" class="is-danger" data-start-mission-management="delete">Excluir missões</button>';
            html += '</div>';
        }
        html += '</div></div>';
        return html;
    }

    function deleteMissionForManagement(id) {
        if (id.indexOf("custom_") === 0) {
            Arquimago.deleteCustomMission(id, { skipRefresh: true });
        } else {
            Arquimago.deleteNativeMission(Arquimago.state, id);
        }
    }

    function clearCompletedMissions(state) {
        var entries = completedMissionEntries(state);
        if (!entries.length) return false;

        entries.forEach(function (entry) {
            unmarkCompleted(state, entry.mission, entry.type);
            if (Arquimago.revertMissionProgress) Arquimago.revertMissionProgress(state, entry.mission);
        });
        state.missionsCompleted = Math.max(0, state.missionsCompleted - entries.length);
        state.missionsCompletedForLevel = Math.max(0, (state.missionsCompletedForLevel || 0) - entries.length);
        state.xpCompletedForLevel = 0;
        Arquimago.saveState(state);
        return true;
    }

    function resetProgress(state) {
        state.level = Arquimago.DEFAULT_STATE.level;
        state.xp = Arquimago.DEFAULT_STATE.xp;
        state.totalXP = Arquimago.DEFAULT_STATE.totalXP;
        state.chapter = Arquimago.DEFAULT_STATE.chapter;
        state.title = Arquimago.DEFAULT_STATE.title;
        state.missionsCompletedForLevel = 0;
        state.xpCompletedForLevel = 0;
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

    function editIconOptionsHtml(selected) {
        var html = '';
        Arquimago.MISSION_ICON_CATEGORIES.forEach(function (cat) {
            html += '<div class="missions-form__icon-cat">' + cat.label + '</div>';
            html += '<div class="missions-form__icon-grid">';
            Arquimago.MISSION_ICONS.forEach(function (ic) {
                if (ic.category !== cat.id) return;
                html += '<button type="button" class="missions-form__icon-option' + (selected === ic.emoji ? " is-selected" : "") + '" data-edit-icon="' + ic.emoji + '" title="' + escapeHtml(ic.name) + '" aria-label="' + escapeHtml(ic.name) + '">' + ic.emoji + '</button>';
            });
            html += '</div>';
        });
        return html;
    }

    function openEditMissionModal(missionId) {
        var state = Arquimago.state;
        var mission = null;
        var entries = Arquimago.getAllMissionEntries ? Arquimago.getAllMissionEntries(state, true) : [];
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].mission.id === missionId) {
                mission = entries[i].mission;
                break;
            }
        }
        if (!mission) return;

        var overrides = Arquimago.getMissionOverrides ? Arquimago.getMissionOverrides(state) : {};
        var ov = overrides[missionId];
        var currentXp = ov && ov.xp !== undefined ? ov.xp : mission.xp;
        var selectedIcon = Arquimago.getMissionIcon ? Arquimago.getMissionIcon(mission) : (mission.icon || "🎯");
        var hasOverride = !!ov;

        var modal = document.createElement("div");
        modal.className = "modal missions-confirm-modal missions-edit-modal";
        modal.innerHTML = '<div class="modal-backdrop"></div>' +
            '<div class="modal-panel missions-confirm-panel missions-edit-panel">' +
            '<button type="button" class="modal-close-button" data-close-edit-mission aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button>' +
            '<h3>Editar · ' + escapeHtml(mission.name) + '</h3>' +
            '<form id="editMissionForm" autocomplete="off">' +
            '<div class="missions-form__field">' +
            '<label for="editMissionXp">XP</label>' +
            '<input type="number" id="editMissionXp" min="1" max="10" inputmode="numeric" value="' + currentXp + '" required>' +
            '<small class="missions-edit__hint">Entre 1 e 10 XP por conclusão.</small>' +
            '</div>' +
            '<div class="missions-form__field missions-form__field--full">' +
            '<label for="editMissionIconPreview">Ícone</label>' +
            '<div class="missions-form__icon">' +
            '<button type="button" class="missions-form__icon-preview" id="editMissionIconPreview" title="Escolher ícone" aria-label="Ícone escolhido">' + selectedIcon + '</button>' +
            '<button type="button" class="btn-secondary compact" id="editMissionIconToggle">Escolher ícone</button>' +
            '</div>' +
            '<div class="missions-form__icon-picker" id="editMissionIconPicker" hidden>' + editIconOptionsHtml(selectedIcon) + '</div>' +
            '</div>' +
            '<div class="missions-form__actions missions-edit__actions">' +
            '<button type="submit" class="btn-primary compact">Salvar edição</button>' +
            '<button type="button" class="btn-secondary compact" data-close-edit-mission>Cancelar</button>' +
            (hasOverride ? '<button type="button" class="btn-secondary compact missions-edit__reset" data-reset-mission-edit="' + escapeHtml(missionId) + '">Voltar ao padrão</button>' : '') +
            '</div>' +
            '</form>' +
            '</div>';
        document.body.appendChild(modal);

        function close() {
            modal.remove();
        }

        modal.querySelectorAll(".modal-backdrop, [data-close-edit-mission]").forEach(function (el) {
            el.addEventListener("click", close);
        });

        var picker = modal.querySelector("#editMissionIconPicker");
        var pickerButton = modal.querySelector("#editMissionIconToggle");
        function setPickerOpen(open) {
            if (!picker || !pickerButton) return;
            picker.hidden = !open;
            pickerButton.textContent = open ? "Fechar" : "Escolher ícone";
        }
        var pickerToggles = [modal.querySelector("#editMissionIconToggle"), modal.querySelector("#editMissionIconPreview")];
        pickerToggles.forEach(function (btn) {
            if (!btn) return;
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                setPickerOpen(picker.hidden);
            });
        });

        modal.querySelectorAll("[data-edit-icon]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                selectedIcon = btn.getAttribute("data-edit-icon");
                var preview = modal.querySelector("#editMissionIconPreview");
                if (preview) preview.textContent = selectedIcon;
                modal.querySelectorAll(".missions-form__icon-option").forEach(function (option) {
                    option.classList.toggle("is-selected", option.getAttribute("data-edit-icon") === selectedIcon);
                });
            });
        });

        var resetButton = modal.querySelector("[data-reset-mission-edit]");
        if (resetButton) {
            resetButton.addEventListener("click", function () {
                Arquimago.playClick();
                Arquimago.clearMissionOverride(missionId);
                close();
                missionManagementMode = null;
                editingMissionId = null;
                if (Arquimago.refreshAll) Arquimago.refreshAll(false);
                else Arquimago.renderMissions();
            });
        }

        var form = modal.querySelector("#editMissionForm");
        if (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                var xpField = form.querySelector("#editMissionXp");
                var xp = xpField ? xpField.value : 4;
                Arquimago.saveMissionOverride(missionId, { xp: xp, icon: selectedIcon });
                Arquimago.playMissionComplete();
                close();
                missionManagementMode = null;
                editingMissionId = null;
                if (Arquimago.refreshAll) Arquimago.refreshAll(false);
                else Arquimago.renderMissions();
            });
        }
    }

    Arquimago.getNextMainMission = function () {
        var state = Arquimago.state;
        var mains = Arquimago.MISSIONS.main;
        for (var i = 0; i < mains.length; i++) {
            if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, mains[i].id)) continue;
            if (state.completedIds.indexOf(mains[i].id) === -1) return Arquimago.applyMissionOverrides ? Arquimago.applyMissionOverrides(mains[i]) : mains[i];
        }
        return Arquimago.applyMissionOverrides ? Arquimago.applyMissionOverrides(mains[mains.length - 1]) : mains[mains.length - 1];
    };

    Arquimago.renderMissions = function () {
        var container = document.getElementById("missions");
        if (!container) return;
        var state = Arquimago.state;

        var focusedFieldId = focusedFormFieldId();
        rememberFormValues(container.querySelector("#customMissionForm"));

        var canClear = completedMissionEntries(state).length > 0;
        var html = '<div class="missions-page">';
        html += missionsToolbarHtml(canClear);
        html += missionManagementHtml(state);

        html += activeMissionsHtml(state);
        html += customSectionHtml(state);

        var completedHtml = completedMissionsHtml(state);
        if (completedHtml) {
            html += collapsibleSectionHtml("completed", "Missões Concluídas", "Missões que você já cumpriu. Desmarque para reativar.", completedHtml);
        }

        html += hiddenMissionsHtml(state);

        html += '</div>';
        container.innerHTML = html;
        bindMissionToggles(container);
        bindMissionDetailsToggles(container);
        bindMissionSettings(container);
        bindMissionSelection(container);
        bindCustomControls(container);
        bindMissionManagement(container);
        bindCollapsibleToggles(container);
        var activeToggle = container.querySelector("#toggleActiveMissions");
        if (activeToggle) {
            activeToggle.addEventListener("click", function () {
                Arquimago.playClick();
                activeMissionsHidden = !activeMissionsHidden;
                saveActiveMissionsHidden();
                Arquimago.renderMissions();
            });
        }
        var clearButton = container.querySelector("#clearCompletedMissions");
        if (clearButton) {
            clearButton.addEventListener("click", function () {
                if (!clearCompletedMissions(Arquimago.state)) return;
                missionSettingsOpen = false;
                Arquimago.playClick();
                Arquimago.renderMissions();
            });
        }
        var resetButton = container.querySelector("#resetProgressButton");
        if (resetButton) {
            resetButton.addEventListener("click", function () {
                missionSettingsOpen = false;
                Arquimago.playClick();
                Arquimago.renderMissions();
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

    function bindMissionDetailsToggles(container) {
        container.querySelectorAll("[data-toggle-mission-details]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();

                var missionId = button.getAttribute("data-toggle-mission-details");
                var expanded = !isMissionDetailsExpanded(missionId);
                setMissionDetailsExpanded(missionId, expanded);

                var details = document.getElementById(button.getAttribute("aria-controls"));
                if (details) details.classList.toggle("is-collapsed", !expanded);
                button.setAttribute("aria-expanded", String(expanded));
                button.setAttribute("aria-label", (expanded ? "Ocultar informações de " : "Mostrar informações de ") + (button.closest(".mission-item").querySelector(".mission-item__name").textContent || "missão"));
                button.setAttribute("title", expanded ? "Ocultar informações" : "Mostrar informações");
                Arquimago.playClick();
            });
        });
    }

    function bindMissionSettings(container) {
        var settingsButton = container.querySelector("#missionsSettingsButton");
        if (settingsButton) {
            settingsButton.addEventListener("click", function () {
                Arquimago.playClick();
                missionSettingsOpen = !missionSettingsOpen;
                Arquimago.renderMissions();
            });
        }

        container.querySelectorAll("[data-start-mission-management]").forEach(function (button) {
            button.addEventListener("click", function () {
                Arquimago.playClick();
                missionSettingsOpen = false;
                missionManagementMode = button.getAttribute("data-start-mission-management");
                selectedMissionIds = {};
                editingMissionId = null;
                Arquimago.renderMissions();
            });
        });
    }

    function bindMissionSelection(container) {
        var selectionInputs = container.querySelectorAll("[data-manage-mission]");
        if (!selectionInputs.length) return;

        var submitButton = container.querySelector("[data-submit-mission-management]");
        var refreshSubmitState = function () {
            if (missionManagementMode === "edit") {
                if (submitButton) submitButton.disabled = !editingMissionId;
                var editLabel = container.querySelector(".missions-management__actions > span");
                if (editLabel) editLabel.textContent = editingMissionId ? "1 selecionada" : "Selecione uma missão para editar";
                return;
            }
            var selectedCount = Object.keys(selectedMissionIds).filter(function (id) { return selectedMissionIds[id]; }).length;
            if (submitButton) submitButton.disabled = selectedCount === 0;
            var countLabel = container.querySelector(".missions-management__actions > span");
            if (countLabel) countLabel.textContent = selectedCount + " selecionada" + (selectedCount === 1 ? "" : "s");
        };

        selectionInputs.forEach(function (input) {
            input.addEventListener("change", function () {
                var id = input.getAttribute("data-manage-mission");
                if (missionManagementMode === "edit") {
                    if (input.checked) editingMissionId = id;
                    else if (editingMissionId === id) editingMissionId = null;
                    refreshSubmitState();
                    return;
                }
                if (input.checked) selectedMissionIds[id] = true;
                else delete selectedMissionIds[id];
                refreshSubmitState();
            });
        });

        var cancelButton = container.querySelector("[data-cancel-mission-management]");
        if (cancelButton) {
            cancelButton.addEventListener("click", function () {
                Arquimago.playClick();
                missionManagementMode = null;
                selectedMissionIds = {};
                editingMissionId = null;
                Arquimago.renderMissions();
            });
        }

        if (submitButton) {
            submitButton.addEventListener("click", function () {
                if (missionManagementMode === "edit") {
                    if (!editingMissionId) return;
                    Arquimago.playClick();
                    openEditMissionModal(editingMissionId);
                    return;
                }
                var ids = Object.keys(selectedMissionIds).filter(function (id) { return selectedMissionIds[id]; });
                if (!ids.length) return;
                if (missionManagementMode === "delete" && !confirm("Excluir as " + ids.length + " missões selecionadas permanentemente? O histórico de progresso será preservado.")) return;

                ids.forEach(function (id) {
                    if (missionManagementMode === "delete") deleteMissionForManagement(id);
                    else Arquimago.hideMission(Arquimago.state, id);
                });

                Arquimago.saveState(Arquimago.state);
                missionManagementMode = null;
                selectedMissionIds = {};
                Arquimago.playClick();
                if (Arquimago.refreshAll) Arquimago.refreshAll(false);
                else Arquimago.renderMissions();
            });
        }
    }

    function bindMissionManagement(container) {
        container.querySelectorAll("[data-restore-mission]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                Arquimago.playClick();
                Arquimago.restoreMission(Arquimago.state, button.getAttribute("data-restore-mission"));
                if (Arquimago.refreshAll) Arquimago.refreshAll(false);
                else Arquimago.renderMissions();
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
                formCache.attribute = "vitality";
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
                    icon: formCache.icon,
                    attribute: formCache.attribute
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
                formCache.attribute = "vitality";
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

    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
