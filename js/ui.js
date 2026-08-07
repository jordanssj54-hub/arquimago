(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var XP_TRACK_FRACTION = 0.645;
    var HOME_MISSIONS_HIDDEN_KEY = "arquimago_home_missions_hidden_v1";
    var homeMissionsHidden = loadHomeMissionsHidden();

    function loadHomeMissionsHidden() {
        try {
            return localStorage.getItem(HOME_MISSIONS_HIDDEN_KEY) === "true";
        } catch (error) {
            return false;
        }
    }

    function saveHomeMissionsHidden() {
        try {
            localStorage.setItem(HOME_MISSIONS_HIDDEN_KEY, String(homeMissionsHidden));
        } catch (error) {}
    }

    function xpFillWidth(pct) {
        return (pct * XP_TRACK_FRACTION) + "%";
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function isDone(state, entry) {
        var type = entry.type;
        var list = type === "main" || type === "custom_free" ? state.completedIds :
            (type === "weekly" || type === "custom_weekly" ? state.weeklyDone :
                (type === "habits" ? state.habitsDone : state.dailyDone));
        return list.indexOf(entry.mission.id) !== -1;
    }

    Arquimago.updateXP = function (current, max) {
        if (!max) return;
        var pct = Math.max(0, Math.min(100, (current / max) * 100));
        var w = xpFillWidth(pct);
        document.querySelectorAll(".xp-bar .xp-fill").forEach(function (fill) {
            fill.style.width = w;
        });
        document.querySelectorAll(".xp-bar .xp-text").forEach(function (text) {
            text.innerText = current + " / " + max + " XP";
        });
    };

    Arquimago.getMageSVG = function () {
        return '<svg viewBox="0 0 200 200" class="mage-svg"><defs><radialGradient id="mg" cx="50%" cy="40%"><stop offset="0%" stop-color="#2a3550"/><stop offset="100%" stop-color="#0a0c14"/></radialGradient></defs><rect width="200" height="200" fill="url(#mg)"/><circle cx="100" cy="70" r="30" fill="#1a1a2e" stroke="#c9a84c" stroke-width="1.5"/><path d="M55 180 Q100 120 145 180" fill="#12121f" stroke="#c9a84c" stroke-width="1"/><path d="M70 100 L50 60 L80 90 Z" fill="#1e2a45" stroke="#4a7fd4" stroke-width="0.8"/><path d="M130 100 L150 60 L120 90 Z" fill="#1e2a45" stroke="#4a7fd4" stroke-width="0.8"/><circle cx="92" cy="68" r="3" fill="#4a7fd4"/><circle cx="108" cy="68" r="3" fill="#4a7fd4"/><path d="M85 80 Q100 88 115 80" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.6"/></svg>';
    };

    function homeMissionRow(state, entry) {
        var mission = entry.mission;
        var done = isDone(state, entry);
        var attribute = Arquimago.ATTRIBUTE_DEFINITIONS[mission.attribute];
        var deleteButton = mission.id.indexOf("custom_") === 0 ? '<button type="button" class="home-mission-delete" data-delete-home-custom="' + escapeHtml(mission.id) + '" title="Excluir missão" aria-label="Excluir ' + escapeHtml(mission.name) + '">×</button>' : "";
        return '<div class="home-mission-row' + (done ? " is-done" : "") + '" data-home-mission-id="' + escapeHtml(mission.id) + '" data-home-mission-type="' + entry.type + '">' +
            '<label class="home-mission-check" title="Marcar missão">' +
            '<input type="checkbox"' + (done ? " checked" : "") + '>' +
            '<span class="home-mission-check__box"></span>' +
            '</label>' +
            '<span class="mission-icon" aria-hidden="true">' + Arquimago.getMissionIcon(mission) + '</span>' +
            '<span class="home-mission-copy"><strong>' + escapeHtml(mission.name) + '</strong><small>' +
            (attribute ? attribute.name : "Missão") + ' · -' + (mission.bossDamage || 10) + ' HP no Boss' +
            '</small></span>' +
            '<span class="home-mission-xp">+' + mission.xp + ' XP</span>' +
            deleteButton +
            '</div>';
    }

    function bossCardHtml(boss) {
        var hp = Math.max(0, Number(boss.hp) || 0);
        var maxHp = Math.max(1, Number(boss.maxHp) || 1);
        var percent = Math.round((hp / maxHp) * 100);
        return '<button type="button" class="home-boss-card' + (boss.defeated ? " is-defeated" : "") + '" id="weeklyBossCard">' +
            '<span class="home-boss-card__top"><span><small>Boss da Semana</small><strong>' + escapeHtml(boss.name) + '</strong></span><span class="home-boss-card__icon" aria-hidden="true">' + boss.icon + '</span></span>' +
            '<span class="home-boss-card__bar"><span style="width:' + percent + '%"></span></span>' +
            '<span class="home-boss-card__bottom"><span>' + (boss.defeated ? "Derrotado" : "HP restante") + '</span><strong>' + hp + ' / ' + maxHp + '</strong></span>' +
            '<span class="home-card-link">' + (boss.defeated ? "Troféu conquistado · ver detalhes" : "Ver fraquezas e recompensa") + ' <b aria-hidden="true">›</b></span>' +
            '</button>';
    }

    function rankCardHtml(rank) {
        var nextText = rank.nextRank ? "Faltam " + rank.missionsToNext + " missões para Rank " + rank.nextRank : "Rank máximo alcançado";
        var isS = rank.rank === "S";
        return '<button type="button" class="home-rank-card' + (isS ? " is-rank-s" : "") + '" id="dailyRankCard">' +
            '<span class="home-rank-card__medal" aria-hidden="true">' + escapeHtml(rank.rank) + '</span>' +
            '<span class="home-rank-card__copy"><small>Rank de Hoje</small><strong>Rank ' + rank.rank + '</strong><span>' + rank.completed + ' / ' + rank.total + ' Missões · ' + rank.percent + '%</span></span>' +
            '<span class="home-rank-card__next">' + nextText + ' <b aria-hidden="true">›</b></span>' +
            '</button>';
    }

    Arquimago.renderHome = function (animateXp) {
        var container = document.getElementById("home");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var xpNeed = Arquimago.getXpToNext(state);
        var xpPct = Arquimago.getXpPercent(state);
        var boss = Arquimago.getWeeklyBoss ? Arquimago.getWeeklyBoss(state) : { name: "Boss da Semana", hp: 0, maxHp: 1, icon: "👹", defeated: false };
        var rank = Arquimago.getDailyRankData ? Arquimago.getDailyRankData(state) : { rank: "D", completed: 0, total: 0, percent: 0, nextRank: "C", missionsToNext: 0 };
        var dailyEntries = Arquimago.getDailyMissionEntries ? Arquimago.getDailyMissionEntries(state) : [];

        container.innerHTML = '<div class="home-page home-page--focused">' +
            rankCardHtml(rank) +
            '<section class="panel home-xp-panel">' +
            '<div class="home-xp-panel__heading"><div><span class="section-label">Progresso da jornada</span><h1>Nível ' + state.level + '</h1></div><span class="home-xp-panel__pace">Evolução constante</span></div>' +
            '<div class="home-xp-panel__bar xp-bar"><div class="xp-fill" id="xpFill" style="width:' + (animateXp ? 0 : xpFillWidth(xpPct)) + '"></div><img class="xp-frame" src="assets/frames/xp_frame.png" alt=""><div class="xp-text" id="xpText">' + state.xp + ' / ' + xpNeed + ' XP</div></div>' +
            '<div class="home-xp-panel__meta"><span>' + state.xp + ' XP acumulados neste nível</span><strong>Faltam ' + Math.max(0, xpNeed - state.xp) + ' XP</strong></div>' +
            '</section>' +
            bossCardHtml(boss) +
            '<section class="panel home-missions-panel"><div class="home-panel-heading"><div><span class="section-label">Hoje</span><h2>Missões</h2></div><div class="home-panel-heading__actions"><span>' + rank.completed + ' / ' + rank.total + ' concluídas</span><button type="button" class="btn-secondary compact home-missions-toggle" id="toggleHomeMissionsButton">' + (homeMissionsHidden ? "Mostrar" : "Ocultar") + '</button></div></div>' +
            '<div class="home-mission-list' + (homeMissionsHidden ? " is-hidden" : "") + '">' + (dailyEntries.length ? dailyEntries.map(function (entry) { return homeMissionRow(state, entry); }).join("") : '<p class="home-empty">Nenhuma missão diária disponível.</p>') + '</div>' +
            (homeMissionsHidden ? '<p class="home-missions-hidden-note">As missões de hoje estão ocultas.</p>' : "") +
            '<button type="button" class="btn-secondary compact home-all-missions" id="openAllMissions">Ver todas as missões</button>' +
            '</section>' +
            '</div>';

        var topLevel = document.getElementById("topPlayerLevel");
        if (topLevel) topLevel.textContent = state.level;
        var topRank = document.getElementById("topDailyRank");
        if (topRank) topRank.textContent = rank.rank;
        document.querySelectorAll(".xp-bar--top .xp-fill").forEach(function (fill) { fill.style.width = xpFillWidth(xpPct); });
        document.querySelectorAll(".xp-bar--top .xp-text").forEach(function (text) { text.innerText = state.xp + " / " + xpNeed + " XP"; });

        if (animateXp) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    var fill = document.getElementById("xpFill");
                    if (!fill) return;
                    fill.classList.add("xp-animate");
                    fill.style.width = xpFillWidth(xpPct);
                    setTimeout(function () { fill.classList.remove("xp-animate"); }, 900);
                });
            });
        }

        container.querySelectorAll(".home-mission-check input").forEach(function (input) {
            input.addEventListener("change", function () {
                var row = input.closest(".home-mission-row");
                var type = row.getAttribute("data-home-mission-type");
                var id = row.getAttribute("data-home-mission-id");
                var mission = Arquimago.findMissionByType ? Arquimago.findMissionByType(type, id) : Arquimago.findMission(type, id);
                if (!mission) return;
                Arquimago.playClick();
                Arquimago.setMissionComplete(mission, type, input.checked, input);
            });
        });

        var toggleHomeMissions = document.getElementById("toggleHomeMissionsButton");
        if (toggleHomeMissions) toggleHomeMissions.addEventListener("click", function () {
            Arquimago.playClick();
            homeMissionsHidden = !homeMissionsHidden;
            saveHomeMissionsHidden();
            Arquimago.renderHome(false);
        });

        container.querySelectorAll("[data-delete-home-custom]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                Arquimago.playClick();
                if (confirm("Excluir esta missão personalizada?")) {
                    Arquimago.deleteCustomMission(button.getAttribute("data-delete-home-custom"));
                }
            });
        });

        var bossButton = document.getElementById("weeklyBossCard");
        if (bossButton) bossButton.addEventListener("click", function () {
            Arquimago.playClick();
            Arquimago.openWeeklyBossDetails();
        });

        var rankButton = document.getElementById("dailyRankCard");
        if (rankButton) rankButton.addEventListener("click", function () {
            Arquimago.playClick();
            Arquimago.openDailyRankDetails();
        });

        var allMissionsButton = document.getElementById("openAllMissions");
        if (allMissionsButton) allMissionsButton.addEventListener("click", function () {
            var tab = document.querySelector('.tab[data-screen="missions"]');
            if (tab) tab.click();
        });
    };

    function openProgressionModal(title, content, modifier) {
        var modal = document.createElement("div");
        modal.className = "progression-modal" + (modifier ? " " + modifier : "");
        modal.innerHTML = '<div class="progression-modal__backdrop" data-close-progression></div><div class="progression-modal__panel" role="dialog" aria-modal="true" aria-label="' + escapeHtml(title) + '"><button type="button" class="modal-close-button" data-close-progression aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button><div class="progression-modal__content"><span class="section-label">Arquimago</span><h2>' + escapeHtml(title) + '</h2>' + content + '</div></div>';
        document.body.appendChild(modal);

        function close() {
            document.removeEventListener("keydown", onKeydown);
            modal.remove();
        }
        function onKeydown(event) {
            if (event.key === "Escape") close();
        }
        modal.querySelectorAll("[data-close-progression]").forEach(function (el) { el.addEventListener("click", close); });
        document.addEventListener("keydown", onKeydown);
        return modal;
    }

    Arquimago.openDailyRankDetails = function () {
        var rank = Arquimago.getDailyRankData(Arquimago.state);
        var next = rank.nextRank ? '<div class="detail-stat"><span>Próximo Rank</span><strong>Rank ' + rank.nextRank + '</strong><small>Faltam ' + rank.missionsToNext + ' missões (' + Math.max(0, rank.nextMinimum - rank.percent) + ' pontos percentuais)</small></div>' : '<div class="detail-stat"><span>Próximo Rank</span><strong>Rank máximo</strong><small>Você concluiu todas as missões de hoje.</small></div>';
        var content = '<div class="rank-detail__hero"><span class="rank-detail__badge">' + rank.rank + '</span><div><small>Resultado de hoje</small><strong>Rank ' + rank.rank + '</strong><span>' + rank.percent + '% das missões concluídas</span></div></div>' +
            '<div class="detail-stats"><div class="detail-stat"><span>Concluídas</span><strong>' + rank.completed + ' / ' + rank.total + '</strong><small>missões realizadas hoje</small></div><div class="detail-stat"><span>Restantes</span><strong>' + rank.remaining + '</strong><small>missões para encerrar o dia</small></div>' + next + '</div>' +
            '<p class="progression-modal__hint">O Rank Diário é independente do XP. Ele existe para mostrar a qualidade do seu dia, sem alterar a velocidade da sua evolução.</p>';
        openProgressionModal("Rank de Hoje", content, "progression-modal--rank");
    };

    Arquimago.openWeeklyBossDetails = function () {
        var boss = Arquimago.getWeeklyBoss(Arquimago.state);
        var hp = Math.max(0, Number(boss.hp) || 0);
        var maxHp = Math.max(1, Number(boss.maxHp) || 1);
        var percent = Math.round((hp / maxHp) * 100);
        var entries = Arquimago.getAllMissionEntries ? Arquimago.getAllMissionEntries() : [];
        var weaknesses = (boss.weaknesses || []).map(function (id) {
            var entry = entries.find(function (item) { return item.mission.id === id; });
            if (!entry) return "Missão especial";
            return '<li><span>' + Arquimago.getMissionIcon(entry.mission) + '</span><strong>' + escapeHtml(entry.mission.name) + '</strong><small>causa +' + Math.round((entry.mission.bossDamage || 10) * 0.5) + ' dano extra</small></li>';
        }).join("");
        var content = '<div class="boss-detail__hero"><div class="boss-detail__art">' + boss.icon + '<span aria-hidden="true">✦</span></div><div class="boss-detail__summary"><span class="section-label">Inimigo semanal</span><h3>' + escapeHtml(boss.name) + '</h3><p>' + escapeHtml(boss.description) + '</p></div></div>' +
            '<div class="boss-detail__hp"><div><span>HP atual</span><strong>' + hp + ' / ' + maxHp + '</strong></div><div class="boss-detail__bar"><span style="width:' + percent + '%"></span></div></div>' +
            '<div class="boss-detail__columns"><div><h3>Fraquezas</h3><ul class="boss-weaknesses">' + (weaknesses || '<li>Você já conhece todas as fraquezas.</li>') + '</ul></div><div class="boss-reward"><h3>Recompensa</h3><strong>🏆 ' + escapeHtml(boss.reward) + '</strong><p>Derrote o Boss para registrar este troféu. Nenhum XP adicional é concedido.</p></div></div>';
        openProgressionModal("Boss da Semana", content, "progression-modal--boss");
    };

    Arquimago.renderActiveSpells = function () {
        var el = document.getElementById("activeSpells");
        if (!el || !Arquimago.state) return;
        var spells = (Arquimago.state.unlockedSpells || []).slice(-4);
        var html = '<div class="active-spells-grid">';
        spells.forEach(function (id) {
            var spell = Arquimago.SPELLS.find(function (item) { return item.id === id; });
            if (spell) html += '<div class="active-spell"><span>' + escapeHtml(spell.name) + '</span></div>';
        });
        for (var i = spells.length; i < 4; i++) html += '<div class="active-spell empty">—</div>';
        el.innerHTML = html + '</div>';
    };

    Arquimago.updatePlayerName = function () {
        var name = Arquimago.getDisplayName();
        document.querySelectorAll("[data-player-name]").forEach(function (el) {
            el.textContent = name;
        });
    };

    Arquimago.refreshAll = function (animateXp) {
        Arquimago.renderHome(animateXp);
        if (Arquimago.renderHistory) Arquimago.renderHistory();
        Arquimago.renderMap();
        Arquimago.renderMissions();
        Arquimago.renderGrimoire();
        Arquimago.renderProfile();
        if (Arquimago.renderAttributes) Arquimago.renderAttributes();
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
