(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var REWARD_XP_MIN = 10;
    var REWARD_XP_MAX = 100000;
    var NUMERIC_CONDITION_TYPES = ["missionCount", "xpTotal", "streak", "dailyXp", "weeklyXp"];
    var unlockQueue = [];
    var unlockChecking = false;
    var unlockOverlayOpen = false;
    var editorCache = null;
    var editorRewardId = null;
    var editorImage = null;

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function positiveInt(value, fallback) {
        var n = Math.floor(Number(value));
        if (!isFinite(n) || n < 1) return Math.max(1, Math.floor(Number(fallback)) || 1);
        return n;
    }

    function clampBonusXp(value) {
        return Math.max(REWARD_XP_MIN, Math.min(REWARD_XP_MAX, Math.floor(Number(value)) || REWARD_XP_MIN));
    }

    function formatCount(value) {
        var n = Math.floor(Number(value) || 0);
        return Arquimago.formatNumber ? Arquimago.formatNumber(n) : String(n);
    }

    function displayDate(dayKey) {
        var parts = String(dayKey || "").split("-");
        if (parts.length === 3) return parts[2] + "/" + parts[1] + "/" + parts[0];
        return String(dayKey || "");
    }

    function stateList(state) {
        if (!state) return [];
        if (!Array.isArray(state.personalRewards)) state.personalRewards = [];
        return state.personalRewards;
    }

    Arquimago.PERSONAL_REWARD_CONDITIONS = {
        missions: { label: "Missões específicas", icon: "✔", hint: "Concluir as missões que você selecionar" },
        nativeMission: { label: "Missão nativa", icon: "⚑", hint: "Concluir uma missão nativa específica" },
        missionCount: { label: "Quantidade de missões", icon: "✚", hint: "Concluir um número mínimo de missões" },
        xpTotal: { label: "Meta de XP", icon: "✦", hint: "Acumular uma quantidade de XP" },
        streak: { label: "Sequência", icon: "🔥", hint: "Dias consecutivos completando missões" },
        dailyXp: { label: "Meta diária", icon: "☀️", hint: "Acumular XP no dia" },
        weeklyXp: { label: "Meta semanal", icon: "🗓️", hint: "Acumular XP durante a semana" }
    };

    /* ============================================================
       Normalização
       ============================================================ */
    function normalizeCondition(condition) {
        if (!condition || typeof condition !== "object") return null;
        var type = String(condition.type || "");
        if (type === "missions") {
            var ids = Array.isArray(condition.missionIds) ?
                condition.missionIds.filter(function (id) { return typeof id === "string" && id; }) : [];
            if (!ids.length) return null;
            return {
                type: type,
                missionIds: ids,
                titles: (condition.titles && typeof condition.titles === "object") ? condition.titles : {}
            };
        }
        if (type === "nativeMission") {
            if (typeof condition.missionId !== "string" || !condition.missionId) return null;
            var clean = { type: type, missionId: condition.missionId };
            if (typeof condition.title === "string") clean.title = condition.title;
            return clean;
        }
        if (NUMERIC_CONDITION_TYPES.indexOf(type) !== -1) {
            return { type: type, target: positiveInt(condition.target, 1) };
        }
        return null;
    }

    function normalizeRewardInPlace(reward) {
        if (!reward || typeof reward !== "object") return null;
        if (typeof reward.id !== "string" || !reward.id) return null;
        reward.name = typeof reward.name === "string" ? reward.name : "";
        reward.desc = typeof reward.desc === "string" ? reward.desc : "";
        reward.message = typeof reward.message === "string" ? reward.message : "";
        reward.image = typeof reward.image === "string" ? reward.image : "";
        reward.bonusXp = clampBonusXp(reward.bonusXp);
        reward.createdAt = Math.floor(Number(reward.createdAt)) || Date.now();
        reward.status = reward.status === "unlocked" ? "unlocked" : "pending";
        reward.conditions = (Array.isArray(reward.conditions) ? reward.conditions : [])
            .map(normalizeCondition)
            .filter(Boolean);
        if (reward.status === "unlocked") {
            if (!reward.unlock || typeof reward.unlock !== "object") {
                reward.unlock = { at: "", dayKey: "", conditions: [], bonusXp: reward.bonusXp };
            }
        } else {
            delete reward.unlock;
        }
        reward.archivedInGrimoire = reward.archivedInGrimoire === true;
        return reward;
    }

    Arquimago.normalizePersonalReward = normalizeRewardInPlace;

    /* ============================================================
       CRUD
       ============================================================ */
    function newRewardId() {
        return "pRew_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
    }

    Arquimago.getPersonalRewardById = function (id) {
        var list = stateList(Arquimago.state);
        for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i].id === id) return list[i];
        }
        return null;
    };

    Arquimago.getPersonalRewards = function () {
        return stateList(Arquimago.state);
    };

    Arquimago.createPersonalReward = function (opts) {
        var state = Arquimago.state;
        if (!state) return null;
        var name = String((opts && opts.name) || "").trim();
        var conditions = (Array.isArray(opts && opts.conditions) ? opts.conditions : [])
            .map(normalizeCondition)
            .filter(Boolean);
        if (!name || !conditions.length) return null;
        var reward = {
            id: newRewardId(),
            name: name,
            desc: String((opts && opts.desc) || "").trim(),
            message: String((opts && opts.message) || "").trim(),
            image: typeof (opts && opts.image) === "string" ? opts.image : "",
            bonusXp: clampBonusXp(opts && opts.bonusXp),
            conditions: conditions,
            createdAt: Date.now(),
            status: "pending",
            archivedInGrimoire: false
        };
        stateList(state).unshift(reward);
        if (Arquimago.saveState) Arquimago.saveState(state);
        return reward;
    };

    Arquimago.updatePersonalReward = function (id, opts) {
        var reward = Arquimago.getPersonalRewardById(id);
        if (!reward || reward.status === "unlocked") return null;
        var conditions = (Array.isArray(opts && opts.conditions) ? opts.conditions : [])
            .map(normalizeCondition)
            .filter(Boolean);
        if (!conditions.length) return null;
        if (opts && typeof opts.name === "string" && opts.name.trim()) reward.name = opts.name.trim();
        if (opts && opts.desc !== undefined) reward.desc = String(opts.desc).trim();
        if (opts && opts.message !== undefined) reward.message = String(opts.message).trim();
        if (opts && opts.image !== undefined) reward.image = typeof opts.image === "string" ? opts.image : "";
        if (opts && opts.bonusXp !== undefined) reward.bonusXp = clampBonusXp(opts.bonusXp);
        reward.conditions = conditions;
        if (Arquimago.saveState) Arquimago.saveState(Arquimago.state);
        return reward;
    };

    Arquimago.deletePersonalReward = function (id) {
        var state = Arquimago.state;
        var list = stateList(state);
        for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i].id === id) {
                if (list[i].status === "unlocked") return false;
                list.splice(i, 1);
                if (Arquimago.saveState) Arquimago.saveState(state);
                return true;
            }
        }
        return false;
    };

    /* ============================================================
       Avaliação das condições — usa os registros reais de
       conclusão de missões e XP do estado atual.
       ============================================================ */
    function missionMetaById(id) {
        if (!id) return null;
        if (Arquimago.getAllMissionEntries && Arquimago.state) {
            var entries = Arquimago.getAllMissionEntries(Arquimago.state, true);
            for (var i = 0; i < entries.length; i++) {
                if (entries[i] && entries[i].mission && entries[i].mission.id === id) return entries[i];
            }
        }
        if (Arquimago.findMissionById) {
            var mission = Arquimago.findMissionById(id);
            if (mission) return { mission: mission, type: "" };
        }
        return null;
    }

    function missionNameFor(condition, id) {
        var meta = missionMetaById(id);
        if (meta && meta.mission && meta.mission.name) return meta.mission.name;
        if (condition && condition.titles && condition.titles[id]) return condition.titles[id];
        if (condition && typeof condition.title === "string" && condition.title) return condition.title;
        return "Missão removida";
    }

    function weeklyXpTotal(state) {
        if (!state) return 0;
        var weekStart = Arquimago.getWeekKey ? Arquimago.getWeekKey() : "";
        var total = 0;
        (state.dailyHistory || []).forEach(function (entry) {
            if (entry && weekStart && String(entry.date || "") >= weekStart) total += Number(entry.xp) || 0;
        });
        if (weekStart && String(state.dailyDate || "") >= weekStart) total += Number(state.dailyXP) || 0;
        return total;
    }

    function conditionStatus(state, condition) {
        if (!condition) return { done: false, current: 0, target: 0, label: "Condição inválida" };
        switch (condition.type) {
            case "missions": {
                var done = 0;
                var ids = condition.missionIds || [];
                ids.forEach(function (id) {
                    if (Arquimago.isMissionCompleted && Arquimago.isMissionCompleted(state, id)) done++;
                });
                var names = ids.map(function (id) { return missionNameFor(condition, id); });
                return {
                    done: ids.length > 0 && done === ids.length,
                    current: done,
                    target: ids.length,
                    label: "Concluir " + (ids.length > 1 ? "as missões" : "a missão") + ": " + names.join(", ")
                };
            }
            case "nativeMission": {
                var completed = Arquimago.isMissionCompleted ? Arquimago.isMissionCompleted(state, condition.missionId) : false;
                return {
                    done: !!completed,
                    current: completed ? 1 : 0,
                    target: 1,
                    label: "Concluir a missão nativa: " + missionNameFor(condition, condition.missionId)
                };
            }
            case "missionCount":
                return {
                    done: Number(state.missionsCompleted || 0) >= condition.target,
                    current: Number(state.missionsCompleted || 0),
                    target: condition.target,
                    label: "Concluir " + formatCount(condition.target) + (condition.target > 1 ? " missões" : " missão")
                };
            case "xpTotal":
                return {
                    done: Number(state.totalXP || 0) >= condition.target,
                    current: Number(state.totalXP || 0),
                    target: condition.target,
                    label: "Acumular " + formatCount(condition.target) + " XP"
                };
            case "streak":
                return {
                    done: Number(state.streak || 0) >= condition.target,
                    current: Number(state.streak || 0),
                    target: condition.target,
                    label: "Completar missões por " + formatCount(condition.target) + (condition.target > 1 ? " dias seguidos" : " dia seguido")
                };
            case "dailyXp":
                return {
                    done: Number(state.dailyXP || 0) >= condition.target,
                    current: Number(state.dailyXP || 0),
                    target: condition.target,
                    label: "Acumular " + formatCount(condition.target) + " XP no dia"
                };
            case "weeklyXp": {
                var weekly = weeklyXpTotal(state);
                return {
                    done: weekly >= condition.target,
                    current: weekly,
                    target: condition.target,
                    label: "Acumular " + formatCount(condition.target) + " XP nesta semana"
                };
            }
            default:
                break;
        }
        var fallback = Arquimago.PERSONAL_REWARD_CONDITIONS[condition.type] || {};
        return { done: false, current: 0, target: 0, label: fallback.label || "Condição inválida" };
    }

    function conditionSummaries(state, reward) {
        return (reward.conditions || []).map(function (condition) {
            var status = conditionStatus(state, condition);
            return {
                type: condition.type,
                label: status.label,
                current: status.current,
                target: status.target,
                done: status.done === true
            };
        });
    }

    Arquimago.getPersonalRewardStatuses = function (reward) {
        return conditionSummaries(Arquimago.state, reward);
    };

    Arquimago.isPersonalRewardComplete = function (state, reward) {
        if (!reward || reward.status === "unlocked") return false;
        var summaries = conditionSummaries(state || Arquimago.state, reward);
        if (!summaries.length) return false;
        return summaries.every(function (summary) { return summary.done; });
    };

    /* ============================================================
       Desbloqueio automático
       ============================================================ */
    function grantUnlockBonus(reward) {
        return Number(Arquimago.gainXP(clampBonusXp(reward.bonusXp), null, null, {
            deferRefresh: true,
            skipSound: true,
            skipRewardCheck: true
        })) || clampBonusXp(reward.bonusXp);
    }

    function unlockReward(state, reward, trigger) {
        var todayKey = Arquimago.getTodayKey ? Arquimago.getTodayKey() : "";
        var summaries = conditionSummaries(state, reward);
        var bonus = grantUnlockBonus(reward);
        var celebration = Arquimago.applyPendingLevelUps ?
            Arquimago.applyPendingLevelUps(state) : { gained: 0, level: state.level };
        reward.status = "unlocked";
        reward.archivedInGrimoire = false;
        reward.unlock = {
            at: new Date().toISOString(),
            dayKey: todayKey,
            trigger: String(trigger || ""),
            bonusXp: bonus,
            conditions: summaries
        };
        if (celebration && celebration.gained > 0) {
            reward.unlock.levelUp = { level: celebration.level, gained: celebration.gained };
        }
        return bonus;
    }

    Arquimago.checkPersonalRewards = function (trigger) {
        if (unlockChecking) return [];
        unlockChecking = true;
        try {
            var state = Arquimago.state;
            if (!state) return [];
            var newlyUnlocked = [];
            stateList(state).forEach(function (reward) {
                if (!reward || reward.status === "unlocked") return;
                normalizeRewardInPlace(reward);
                if (reward.status !== "pending") return;
                if (!Arquimago.isPersonalRewardComplete(state, reward)) return;
                unlockReward(state, reward, trigger);
                newlyUnlocked.push(reward);
            });
            if (newlyUnlocked.length) {
                if (Arquimago.saveState) Arquimago.saveState(state);
                if (Arquimago.showNotification) {
                    var message = newlyUnlocked.length === 1 ?
                        "Recompensa desbloqueada: " + newlyUnlocked[0].name :
                        String(newlyUnlocked.length) + " recompensas desbloqueadas!";
                    Arquimago.showNotification(message, "xp");
                }
                newlyUnlocked.forEach(enqueueUnlockOverlay);
            }
            return newlyUnlocked;
        } finally {
            unlockChecking = false;
        }
    };

    Arquimago.initPersonalRewards = function () {
        var state = Arquimago.state;
        if (!state) return;
        stateList(state).forEach(function (reward) { normalizeRewardInPlace(reward); });
    };

    Arquimago.archivePersonalRewardInGrimoire = function (id) {
        var reward = Arquimago.getPersonalRewardById(id);
        if (!reward) return false;
        if (reward.archivedInGrimoire !== true) {
            reward.archivedInGrimoire = true;
            if (Arquimago.saveState) Arquimago.saveState(Arquimago.state);
        }
        return true;
    };

    /* ============================================================
       Diálogo de desbloqueio
       ============================================================ */
    function unlockCoverHtml(reward) {
        if (reward.image) {
            return '<img src="' + escapeHtml(reward.image) + '" alt="' + escapeHtml(reward.name) + '">';
        }
        return '<span class="prow-cover__icon" aria-hidden="true">✦</span>';
    }

    function buildUnlockOverlay(reward) {
        var overlay = document.createElement("div");
        overlay.id = "personal-reward-overlay";
        var unlock = reward.unlock || {};
        var bonus = clampBonusXp(unlock.bonusXp);
        var message = reward.message ||
            "Você cumpriu todas as condições e conquistou seu momento de recompensa!";
        var conditions = (unlock.conditions || []).map(function (item) {
            return '<li><span class="prow-check" aria-hidden="true">✓</span><span>' + escapeHtml(item.label) + '</span></li>';
        }).join("");

        var sparks = "";
        for (var i = 0; i < 10; i++) sparks += "<span></span>";

        overlay.innerHTML =
            '<div class="prow-backdrop"></div>' +
            '<div class="prow-sparks" aria-hidden="true">' + sparks + '</div>' +
            '<div class="prow-panel">' +
            '<div class="prow-ring" aria-hidden="true"></div>' +
            '<div class="prow-cover">' + unlockCoverHtml(reward) + '</div>' +
            '<div class="prow-title">RECOMPENSA DESBLOQUEADA!</div>' +
            '<h2 class="prow-name">' + escapeHtml(reward.name) + '</h2>' +
            '<p class="prow-message">' + escapeHtml(message) + '</p>' +
            (conditions ? '<ul class="prow-conditions">' + conditions + '</ul>' : "") +
            '<div class="prow-bonus"><span class="prow-bonus__value">+' + formatCount(bonus) + ' XP</span><span class="prow-bonus__label">DE BÔNUS</span></div>' +
            '<button type="button" class="btn-primary prow-keep" data-prow-keep>✦ Guardar no Grimório</button>' +
            '</div>';
        return overlay;
    }

    function enqueueUnlockOverlay(reward) {
        if (typeof document === "undefined" || !document.body) return;
        unlockQueue.push(reward);
        presentNextUnlock();
    }

    function presentNextUnlock() {
        if (unlockOverlayOpen || !unlockQueue.length) return;
        if (typeof document === "undefined" || !document.body) return;
        var reward = unlockQueue.shift();
        if (!reward) return;
        unlockOverlayOpen = true;

        var overlay = buildUnlockOverlay(reward);
        document.body.appendChild(overlay);
        if (Arquimago.playUnlock) Arquimago.playUnlock();

        global.requestAnimationFrame(function () {
            overlay.classList.add("active");
        });

        function onEscape(event) {
            if (event.key === "Escape") finish();
        }

        function finish() {
            document.removeEventListener("keydown", onEscape);
            Arquimago.archivePersonalRewardInGrimoire(reward.id);
            overlay.classList.add("out");
            global.setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                unlockOverlayOpen = false;
                var levelUp = reward.unlock && reward.unlock.levelUp;
                function after() {
                    if (Arquimago.refreshAll) Arquimago.refreshAll(true);
                    presentNextUnlock();
                }
                if (levelUp && levelUp.gained > 0) {
                    var message = levelUp.gained > 1 ?
                        "Bônus de recompensa: +" + levelUp.gained + " levels · Level " + levelUp.level :
                        "Bônus de recompensa: Level " + levelUp.level + " alcançado!";
                    if (Arquimago.showNotification) Arquimago.showNotification(message, "xp");
                    if (Arquimago.showLevelUp) {
                        Arquimago.showLevelUp(levelUp.level, levelUp.gained, after);
                    } else {
                        after();
                    }
                } else {
                    after();
                }
            }, 420);
        }

        overlay.querySelector("[data-prow-keep]").addEventListener("click", function () {
            if (Arquimago.playClick) Arquimago.playClick();
            finish();
        });
        document.addEventListener("keydown", onEscape);
    }

    /* ============================================================
       Seção de Recompensas Pessoais (dentro do Grimório)
       ============================================================ */
    function rewardCoverHtml(reward) {
        if (reward.image) {
            return '<div class="pr-card__cover"><img src="' + escapeHtml(reward.image) + '" alt="' + escapeHtml(reward.name) + '" loading="lazy"></div>';
        }
        return '<div class="pr-card__cover pr-card__cover--empty"><span aria-hidden="true">✦</span></div>';
    }

    function conditionRowHtml(status) {
        var percent = status.target > 0 ?
            Math.min(100, Math.round((status.width || (status.current / status.target) * 100))) : 0;
        percent = status.done ? 100 : Math.max(0, percent);
        var value;
        if (status.target === 1 && status.current === status.target) value = "1/1";
        else value = formatCount(status.done ? status.target : status.current) + " / " + formatCount(status.target);
        return '<li class="pr-conditions__item' + (status.done ? " is-done" : (percent > 0 ? " is-partial" : "")) + '">' +
            '<span class="pr-conditions__mark" aria-hidden="true">' + (status.done ? "✓" : "○") + '</span>' +
            '<span class="pr-conditions__text">' + escapeHtml(status.label) + '</span>' +
            '<span class="pr-conditions__value">' + escapeHtml(value) + '</span>' +
            '<span class="pr-conditions__bar"><i style="width:' + percent + '%"></i></span>' +
            '</li>';
    }

    function personalRewardCardHtml(reward) {
        var html = '<article class="grimoire-card pr-card pr-card--' + reward.status + '" data-personal-reward-id="' + escapeHtml(reward.id) + '" tabindex="0" role="button" aria-label="' + escapeHtml(reward.name) + '">';
        html += rewardCoverHtml(reward);
        if (reward.status === "unlocked") {
            html += '<span class="pr-card__seal" aria-hidden="true">✦</span>';
            html += '<h3 class="grimoire-card__name">' + escapeHtml(reward.name) + '</h3>';
            if (reward.desc) html += '<p class="grimoire-card__desc">' + escapeHtml(reward.desc) + '</p>';
            html += '<div class="pr-card__meta">';
            if (reward.unlock && reward.unlock.dayKey) {
                html += '<span class="pr-card__date">Conquistada em ' + escapeHtml(displayDate(reward.unlock.dayKey)) + '</span>';
            }
            html += '<span class="pr-card__xp">+' + formatCount(reward.bonusXp) + ' XP</span>';
            html += '</div>';
            if (reward.archivedInGrimoire) {
                html += '<span class="pr-card__archived">✓ Guardada no Grimório</span>';
            }
        } else {
            var statuses = conditionSummaries(Arquimago.state, reward);
            var doneCount = statuses.filter(function (s) { return s.done; }).length;
            var percent = statuses.length ? Math.round((doneCount / statuses.length) * 100) : 0;
            html += '<h3 class="grimoire-card__name">' + escapeHtml(reward.name) + '</h3>';
            if (reward.desc) html += '<p class="grimoire-card__desc">' + escapeHtml(reward.desc) + '</p>';
            html += '<div class="pr-card__progress"><span>' + doneCount + ' de ' + statuses.length + ' condições</span><b>' + percent + '%</b></div>';
            html += '<div class="pr-card__progress-bar"><i style="width:' + percent + '%"></i></div>';
            html += '<ul class="pr-conditions">' + statuses.map(conditionRowHtml).join("") + '</ul>';
            html += '<div class="pr-card__meta"><span class="pr-card__xp">+' + formatCount(reward.bonusXp) + ' XP de bônus</span></div>';
        }
        html += '</article>';
        return html;
    }

    Arquimago.personalRewardsHtml = function () {
        var state = Arquimago.state;
        if (!state) return "";
        var list = stateList(state).map(normalizeRewardInPlace).filter(function (r) {
            return r && r.name;
        });
        var pending = list.filter(function (r) { return r.status === "pending"; });
        var unlocked = list.filter(function (r) { return r.status === "unlocked"; });
        var html = '<div class="personal-rewards" id="personalRewardsPanel">';
        html += '<header class="personal-rewards__header">';
        html += '<div class="personal-rewards__copy">';
        html += '<span class="section-label">GRIMÓRIO</span>';
        html += '<h3>Recompensas Pessoais</h3>';
        html += '<p>Crie recompensas com suas próprias metas e ganhe XP de bônus ao desbloqueá-las.</p>';
        html += '</div>';
        html += '<button type="button" class="btn-primary compact" id="addPersonalRewardButton">＋ Nova Recompensa</button>';
        html += '</header>';
        if (!list.length) {
            html += '<div class="pr-empty">Nenhuma recompensa pessoal ainda. Defina as condições e o Arquimago vigia o progresso até o desbloqueio.</div>';
        } else {
            html += '<div class="pr-grid">' + pending.map(personalRewardCardHtml).join("") + '</div>';
            if (unlocked.length) {
                html += '<div class="pr-claimed"><h4>CONQUISTADAS</h4><span aria-hidden="true"></span></div>';
                html += '<div class="pr-grid pr-grid--claimed">' + unlocked.map(personalRewardCardHtml).join("") + '</div>';
            }
        }
        html += '</div>';
        return html;
    };

    Arquimago.bindPersonalRewards = function (container) {
        if (!container) return;
        var addBtn = container.querySelector("#addPersonalRewardButton");
        if (addBtn) {
            addBtn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                openPersonalRewardEditor(null);
            });
        }
        container.querySelectorAll(".pr-card").forEach(function (card) {
            card.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                openPersonalRewardDetail(card.getAttribute("data-personal-reward-id"));
            });
        });
    };

    /* ============================================================
       Modais
       ============================================================ */
    function modalShell() {
        var el = document.createElement("div");
        el.className = "modal pr-modal";
        el.innerHTML = '<div class="modal-backdrop"></div>';
        document.body.appendChild(el);
        return el;
    }

    function closeModal(el) {
        if (el) el.remove();
    }

    function bindModalClose(el) {
        el.querySelectorAll(".modal-backdrop").forEach(function (back) {
            back.addEventListener("click", function () { closeModal(el); });
        });
        el.querySelectorAll("[data-pr-close]").forEach(function (btn) {
            btn.addEventListener("click", function () { closeModal(el); });
        });
        document.addEventListener("keydown", function onEsc(event) {
            if (event.key === "Escape" && el.isConnected) {
                document.removeEventListener("keydown", onEsc);
                closeModal(el);
            }
        });
    }

    function openPersonalRewardDetail(rewardId) {
        var reward = Arquimago.getPersonalRewardById(rewardId);
        if (!reward) return;
        var modal = modalShell();
        var locked = reward.status !== "unlocked";
        var html = '<div class="modal-panel grimoire-editor pr-detail">';
        html += '<button type="button" class="modal-close-button" data-pr-close aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button>';
        html += '<div class="pr-detail__cover">' +
            (locked ? rewardCoverHtml(reward) : (reward.image ?
                '<img src="' + escapeHtml(reward.image) + '" alt="' + escapeHtml(reward.name) + '">' :
                '<span class="pr-detail__fallback" aria-hidden="true">✦</span>')) + '</div>';
        html += '<h3>' + escapeHtml(reward.name) + '</h3>';
        if (reward.desc) html += '<p class="pr-detail__desc">' + escapeHtml(reward.desc) + '</p>';
        if (locked) {
            html += '<div class="pr-detail__bonus">✦ +' + formatCount(reward.bonusXp) + ' XP de bônus ao desbloquear</div>';
            html += '<span class="section-label">CONDIÇÕES DE DESBLOQUEIO</span>';
            html += '<ul class="pr-conditions pr-conditions--modal">' + conditionSummaries(Arquimago.state, reward).map(conditionRowHtml).join("") + '</ul>';
            html += '<div class="grimoire-editor__actions">';
            html += '<button type="button" class="btn-secondary compact" data-pr-edit>✏️ Editar</button>';
            html += '<button type="button" class="btn-danger compact" data-pr-delete>🗑️ Excluir</button>';
            html += '</div>';
        } else {
            var unlock = reward.unlock || {};
            html += '<div class="pr-detail__summary">';
            if (unlock.dayKey) html += '<span>Conquistada em ' + escapeHtml(displayDate(unlock.dayKey)) + '</span>';
            html += '<span>+' + formatCount(reward.bonusXp) + ' XP de bônus</span>';
            html += '<span>' + (reward.archivedInGrimoire ? "Guardada no Grimório" : "Aguardando Grimório") + '</span>';
            html += '</div>';
            html += '<span class="section-label">CONDIÇÕES CUMPRIDAS</span>';
            html += '<ul class="pr-conditions pr-conditions--modal">' + (unlock.conditions || []).map(function (item) {
                return '<li class="pr-conditions__item is-done">' +
                    '<span class="pr-conditions__mark" aria-hidden="true">✓</span>' +
                    '<span class="pr-conditions__text">' + escapeHtml(item.label) + '</span>' +
                    (item.target > 0 ? '<span class="pr-conditions__value">' + escapeHtml(formatCount(item.target) + " / " + formatCount(item.target)) + '</span>' : "") +
                    '<span class="pr-conditions__bar"><i style="width:100%"></i></span></li>';
            }).join("") + '</ul>';
            html += '<p class="pr-detail__note">Recompensas conquistadas são registros permanentes do Grimório.</p>';
        }
        html += '</div>';

        modal.innerHTML += html;
        bindModalClose(modal);

        modal.querySelectorAll("[data-pr-edit]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                closeModal(modal);
                openPersonalRewardEditor(reward.id);
            });
        });
        modal.querySelectorAll("[data-pr-delete]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                if (!global.confirm('Excluir a recompensa "' + reward.name + '"?')) return;
                Arquimago.deletePersonalReward(reward.id);
                closeModal(modal);
                if (Arquimago.renderGrimoire) Arquimago.renderGrimoire();
            });
        });
    }

    /* ============================================================
       Modal — editor de recompensa pessoal
       ============================================================ */
    function missionPickerGroups() {
        var state = Arquimago.state;
        var groups = [
            { id: "daily", label: "Diárias", entries: [] },
            { id: "journey", label: "Jornada", entries: [] },
            { id: "custom", label: "Personalizadas", entries: [] },
            { id: "other", label: "Outras", entries: [] }
        ];
        var byId = {};
        groups.forEach(function (group) { byId[group.id] = group; });
        if (Arquimago.getAllMissionEntries && state) {
            Arquimago.getAllMissionEntries(state, true).forEach(function (entry) {
                if (!entry || !entry.mission) return;
                if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, entry.mission.id)) return;
                var groupId;
                if (entry.type === "journey") groupId = "journey";
                else if (String(entry.type).indexOf("custom") === 0) groupId = "custom";
                else if (entry.type === "main" || entry.type === "weekly" || entry.type === "habits") groupId = "other";
                else groupId = "daily";
                byId[groupId].entries.push({
                    id: entry.mission.id,
                    name: entry.mission.name || entry.mission.id,
                    icon: Arquimago.getMissionIcon ? Arquimago.getMissionIcon(entry.mission) : "🎯",
                    typeLabel: groupId === "daily" ? "Diária nativa" :
                        groupId === "journey" ? "Jornada" :
                        groupId === "custom" ? "Personalizada" : "Nativa"
                });
            });
        } else {
            (Arquimago.MISSIONS.daily || []).forEach(function (mission) {
                byId.daily.entries.push({ id: mission.id, name: mission.name, icon: mission.icon || "🎯", typeLabel: "Diária nativa" });
            });
        }
        return groups;
    }

    function nativeMissionOptions() {
        var state = Arquimago.state;
        var result = [];
        if (Arquimago.getAllMissionEntries && state) {
            Arquimago.getAllMissionEntries(state, true).forEach(function (entry) {
                if (!entry || !entry.mission) return;
                if (String(entry.mission.id || "").indexOf("custom_") === 0) return;
                if (Arquimago.isMissionSuppressed && Arquimago.isMissionSuppressed(state, entry.mission.id)) return;
                result.push({
                    id: entry.mission.id,
                    name: entry.mission.name,
                    icon: Arquimago.getMissionIcon ? Arquimago.getMissionIcon(entry.mission) : "🎯"
                });
            });
        }
        return result;
    }

    function defaultCondition(type) {
        switch (type) {
            case "missions": return { type: "missions", missionIds: [], titles: {} };
            case "nativeMission": return { type: "nativeMission", missionId: "", title: "" };
            case "missionCount": return { type: "missionCount", target: 20 };
            case "xpTotal": return { type: "xpTotal", target: 500 };
            case "streak": return { type: "streak", target: 7 };
            case "dailyXp": return { type: "dailyXp", target: 50 };
            case "weeklyXp": return { type: "weeklyXp", target: 300 };
            default: return null;
        }
    }

    function conditionRowEditorHtml(condition, key) {
        var meta = Arquimago.PERSONAL_REWARD_CONDITIONS[condition.type] || {};
        var control = "";
        if (condition.type === "missions") {
            var selected = {};
            (condition.missionIds || []).forEach(function (id) { selected[id] = true; });
            control = '<div class="pr-mission-picker">';
            missionPickerGroups().forEach(function (group) {
                if (!group.entries.length) return;
                control += '<div class="pr-mission-picker__group"><h5>' + escapeHtml(group.label) + '</h5>';
                group.entries.forEach(function (entry) {
                    control += '<label class="pr-mission-option' + (selected[entry.id] ? " is-selected" : "") + '">' +
                        '<input type="checkbox" data-pr-mission="' + escapeHtml(entry.id) + '"' + (selected[entry.id] ? " checked" : "") + '>' +
                        '<span class="pr-mission-option__icon" aria-hidden="true">' + entry.icon + '</span>' +
                        '<span class="pr-mission-option__name">' + escapeHtml(entry.name) + '</span>' +
                        '<span class="pr-mission-option__type">' + escapeHtml(entry.typeLabel) + '</span>' +
                        '</label>';
                });
                control += '</div>';
            });
            control += '</div>';
        } else if (condition.type === "nativeMission") {
            control = '<select data-pr-mission-single>';
            control += '<option value="">Selecionar missão nativa…</option>';
            var current = condition.missionId || "";
            nativeMissionOptions().forEach(function (option) {
                control += '<option value="' + escapeHtml(option.id) + '"' + (current === option.id ? " selected" : "") + '>' +
                    option.icon + " " + escapeHtml(option.name) + '</option>';
            });
            control += '</select>';
        } else {
            var numberLabel = {
                missionCount: "Missões concluídas",
                xpTotal: "XP acumulado",
                streak: "Dias seguidos",
                dailyXp: "XP no dia",
                weeklyXp: "XP na semana"
            }[condition.type] || "Meta";
            var placeholder = {
                missionCount: "Ex.: 20",
                xpTotal: "Ex.: 500",
                streak: "Ex.: 7",
                dailyXp: "Ex.: 50",
                weeklyXp: "Ex.: 300"
            }[condition.type] || "";
            control = '<label class="pr-condition-number"><span>' + escapeHtml(numberLabel) + '</span>' +
                '<input type="number" min="1" inputmode="numeric" data-pr-target value="' + escapeHtml(condition.target || "") + '" placeholder="' + escapeHtml(placeholder) + '"></label>';
        }
        return '<div class="pr-condition-editor" data-pr-condition-key="' + escapeHtml(key) + '">' +
            '<div class="pr-condition-editor__header">' +
            '<span class="pr-condition-editor__type" data-pr-type-label>' + meta.icon + ' ' + escapeHtml(meta.label) + '</span>' +
            '<button type="button" class="pr-condition-editor__remove" data-pr-remove-condition aria-label="Remover condição">&#10005;</button>' +
            '</div>' +
            '<p class="pr-condition-editor__hint">' + escapeHtml(meta.hint) + '</p>' +
            control +
            '</div>';
    }

    function findMissionTitle(id) {
        var meta = missionMetaById(id);
        return meta && meta.mission ? meta.mission.name : "";
    }

    function readEditorDraft(modal) {
        if (!editorCache) return;
        var name = modal.querySelector("#prName");
        var desc = modal.querySelector("#prDesc");
        var message = modal.querySelector("#prMessage");
        var bonus = modal.querySelector("#prBonusXp");
        if (name) editorCache.name = name.value;
        if (desc) editorCache.desc = desc.value;
        if (message) editorCache.message = message.value;
        if (bonus) editorCache.bonusXp = bonus.value;

        Object.keys(editorCache.conditions || {}).forEach(function (key) {
            var condition = editorCache.conditions[key];
            if (!condition) return;
            var row = modal.querySelector('.pr-condition-editor[data-pr-condition-key="' + key + '"]');
            if (!row) return;
            var targetInput = row.querySelector("[data-pr-target]");
            if (targetInput) condition.target = targetInput.value;
            if (condition.type === "missions") {
                condition.missionIds = [];
                row.querySelectorAll("input[data-pr-mission]").forEach(function (checkbox) {
                    if (!checkbox.checked) return;
                    var id = checkbox.getAttribute("data-pr-mission");
                    condition.missionIds.push(id);
                    if (!condition.titles) condition.titles = {};
                    condition.titles[id] = findMissionTitle(id);
                });
            }
            if (condition.type === "nativeMission") {
                var select = row.querySelector("select[data-pr-mission-single]");
                if (select) {
                    condition.missionId = select.value;
                    var option = select.options[select.selectedIndex];
                    condition.title = option ? option.textContent.replace(/^\S+\s/, "") : "";
                }
            }
        });
    }

    function updateMissionCountLabels(modal) {
        if (!editorCache) return;
        Object.keys(editorCache.conditions || {}).forEach(function (key) {
            var condition = editorCache.conditions[key];
            if (!condition || condition.type !== "missions") return;
            var row = modal.querySelector('.pr-condition-editor[data-pr-condition-key="' + key + '"]');
            if (!row) return;
            var label = row.querySelector("[data-pr-type-label]");
            if (!label) return;
            var count = (condition.missionIds || []).length;
            label.innerHTML = '✔ Missões específicas <b>(' + (count ? count : "0") + ')</b>';
        });
    }

    function renderEditorRows(modal) {
        var stack = modal.querySelector("#prConditionsStack");
        if (!stack || !editorCache) return;
        var html = "";
        Object.keys(editorCache.conditions).forEach(function (key) {
            var condition = editorCache.conditions[key];
            if (!condition) return;
            html += conditionRowEditorHtml(condition, key);
        });
        stack.innerHTML = html;
        modal.querySelectorAll("[data-pr-remove-condition]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                readEditorDraft(modal);
                var key = btn.closest("[data-pr-condition-key]").getAttribute("data-pr-condition-key");
                delete editorCache.conditions[key];
                renderEditorRows(modal);
            });
        });
        modal.querySelectorAll("input[data-pr-mission]").forEach(function (checkbox) {
            checkbox.addEventListener("change", function () {
                var label = checkbox.closest(".pr-mission-option");
                if (label) label.classList.toggle("is-selected", checkbox.checked);
                readEditorDraft(modal);
                updateMissionCountLabels(modal);
            });
        });
        modal.querySelectorAll("select[data-pr-mission-single]").forEach(function (select) {
            select.addEventListener("change", function () { readEditorDraft(modal); });
        });
        updateMissionCountLabels(modal);
    }

    function renderImagePreview(modal) {
        var preview = modal.querySelector("#prImagePreview");
        if (!preview) return;
        if (editorImage) {
            preview.innerHTML = '<span class="pr-image-thumb"><img src="' + editorImage + '" alt="Prévia da capa">' +
                '<button type="button" class="pr-image-remove" id="prImageRemove" title="Remover imagem">&#10005;</button></span>';
        } else {
            preview.innerHTML = '<span class="pr-image-empty">Nenhuma capa escolhida</span>';
        }
        var remove = modal.querySelector("#prImageRemove");
        if (remove) {
            remove.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                editorImage = null;
                renderImagePreview(modal);
            });
        }
    }

    function compressGalleryImage(dataUrl, onDone) {
        var image = new Image();
        image.onload = function () {
            var size = 640;
            var canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            var context = canvas.getContext("2d");
            var side = Math.min(image.naturalWidth, image.naturalHeight);
            var sourceX = (image.naturalWidth - side) / 2;
            var sourceY = (image.naturalHeight - side) / 2;
            context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size);
            onDone(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.onerror = function () {
            if (Arquimago.showNotification) Arquimago.showNotification("Não foi possível ler esta imagem.", "boss");
        };
        image.src = dataUrl;
    }

    function openPersonalRewardEditor(rewardId) {
        var reward = rewardId ? Arquimago.getPersonalRewardById(rewardId) : null;
        var editable = reward && reward.status !== "unlocked";
        editorRewardId = editable ? reward.id : null;
        editorImage = editable ? (reward.image || null) : null;
        editorCache = {
            name: reward ? reward.name : "",
            desc: reward ? reward.desc : "",
            message: reward ? reward.message : "",
            bonusXp: reward ? String(reward.bonusXp) : String(REWARD_XP_MIN),
            conditions: {},
            counter: 0
        };
        if (editable) {
            (reward.conditions || []).forEach(function (condition) {
                var key = "c" + (editorCache.counter++);
                editorCache.conditions[key] = JSON.parse(JSON.stringify(condition));
            });
        }

        var modal = modalShell();
        var html = '<div class="modal-panel grimoire-editor pr-editor">';
        html += '<button type="button" class="modal-close-button" data-pr-close aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button>';
        html += '<h3>' + (editable ? "Editar Recompensa Pessoal" : "Nova Recompensa Pessoal") + '</h3>';
        html += '<form id="prForm" autocomplete="off">';
        html += '<div class="grimoire-editor__field"><label>Nome da recompensa</label>' +
            '<input type="text" id="prName" maxlength="80" placeholder="Ex.: Noite de videogame" required></div>';
        html += '<div class="grimoire-editor__field"><label>Descrição (opcional)</label>' +
            '<textarea id="prDesc" rows="2" maxlength="280" placeholder="O que torna esta recompensa especial?"></textarea></div>';
        html += '<div class="grimoire-editor__field"><label>Mensagem de conquista (opcional)</label>' +
            '<input type="text" id="prMessage" maxlength="140" placeholder="Ex.: Você cumpriu suas metas e conquistou seu momento de diversão!"></div>';
        html += '<div class="grimoire-editor__field"><label>Bônus de XP (mínimo 10)</label>' +
            '<input type="number" id="prBonusXp" min="' + REWARD_XP_MIN + '" max="' + REWARD_XP_MAX + '" inputmode="numeric"></div>';
        html += '<div class="grimoire-editor__field"><label>Imagem de capa</label><div class="pr-image-row">' +
            '<button type="button" class="btn-secondary compact" id="prImageUpload">📷 Escolher da galeria</button>' +
            '<div id="prImagePreview" class="pr-image-preview"></div>' +
            '</div><input type="file" id="prImageInput" accept="image/*" hidden></div>';
        html += '<span class="section-label" style="margin-top:14px;">CONDIÇÕES PARA DESBLOQUEAR</span>';
        html += '<div id="prConditionsStack"></div>';
        html += '<div class="pr-condition-add"><select id="prAddConditionSelect">';
        html += '<option value="">＋ Adicionar condição…</option>';
        Object.keys(Arquimago.PERSONAL_REWARD_CONDITIONS).forEach(function (type) {
            var meta = Arquimago.PERSONAL_REWARD_CONDITIONS[type];
            html += '<option value="' + type + '">' + meta.icon + ' ' + escapeHtml(meta.label) + '</option>';
        });
        html += '</select></div>';
        html += '<div class="grimoire-editor__actions">';
        html += '<button type="submit" class="btn-primary compact">' + (editable ? "Salvar alterações" : "Criar Recompensa") + '</button>';
        html += '<button type="button" class="btn-secondary compact" data-pr-close>Cancelar</button>';
        html += '</div>';
        html += '</form></div>';

        modal.innerHTML += html;
        bindModalClose(modal);
        modal.querySelector("#prName").value = editorCache.name;
        modal.querySelector("#prDesc").value = editorCache.desc;
        modal.querySelector("#prMessage").value = editorCache.message;
        modal.querySelector("#prBonusXp").value = editorCache.bonusXp;
        renderImagePreview(modal);
        renderEditorRows(modal);

        var addSelect = modal.querySelector("#prAddConditionSelect");
        addSelect.addEventListener("change", function () {
            var type = addSelect.value;
            if (!type) return;
            if (Arquimago.playClick) Arquimago.playClick();
            var condition = defaultCondition(type);
            addSelect.value = "";
            if (!condition) return;
            readEditorDraft(modal);
            var key = "c" + (editorCache.counter++);
            editorCache.conditions[key] = condition;
            renderEditorRows(modal);
        });

        var uploadButton = modal.querySelector("#prImageUpload");
        var fileInput = modal.querySelector("#prImageInput");
        uploadButton.addEventListener("click", function () {
            if (Arquimago.playClick) Arquimago.playClick();
            fileInput.click();
        });
        fileInput.addEventListener("change", function () {
            var file = fileInput.files && fileInput.files[0];
            if (!file) return;
            if (!/^image\//.test(file.type)) {
                if (Arquimago.showNotification) Arquimago.showNotification("Escolha um arquivo de imagem.", "boss");
                fileInput.value = "";
                return;
            }
            var reader = new global.FileReader();
            reader.onload = function (event) {
                compressGalleryImage(String(event.target.result), function (dataUrl) {
                    editorImage = dataUrl;
                    renderImagePreview(modal);
                    if (Arquimago.showNotification) Arquimago.showNotification("Imagem de capa escolhida", "xp");
                });
            };
            reader.readAsDataURL(file);
            fileInput.value = "";
        });

        modal.querySelector("#prForm").addEventListener("submit", function (event) {
            event.preventDefault();
            readEditorDraft(modal);
            var name = String(editorCache.name || "").trim();
            if (!name) {
                modal.querySelector("#prName").focus();
                return;
            }
            var conditions = Object.keys(editorCache.conditions).map(function (key) {
                return editorCache.conditions[key];
            }).filter(Boolean);
            if (!conditions.length) {
                if (Arquimago.showNotification) Arquimago.showNotification("Adicione pelo menos uma condição.", "boss");
                return;
            }
            var validConditions = conditions.filter(function (condition) {
                if (condition.type === "missions") return (condition.missionIds || []).length > 0;
                if (condition.type === "nativeMission") return !!condition.missionId;
                return true;
            });
            if (validConditions.length !== conditions.length) {
                if (Arquimago.showNotification) Arquimago.showNotification("Complete as condições incompletas ou remova-as.", "boss");
                return;
            }
            var payload = {
                name: name,
                desc: editorCache.desc || "",
                message: editorCache.message || "",
                image: editorImage || "",
                bonusXp: clampBonusXp(editorCache.bonusXp),
                conditions: validConditions
            };
            if (editable) {
                Arquimago.updatePersonalReward(editorRewardId, payload);
                if (Arquimago.showNotification) Arquimago.showNotification("Recompensa atualizada", "xp");
            } else {
                Arquimago.createPersonalReward(payload);
                if (Arquimago.playMissionComplete) Arquimago.playMissionComplete();
                if (Arquimago.showNotification) Arquimago.showNotification("Nova recompensa criada", "xp");
            }
            closeModal(modal);
            editorCache = null;
            editorRewardId = null;
            editorImage = null;
            if (Arquimago.renderGrimoire) Arquimago.renderGrimoire();
        });
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
