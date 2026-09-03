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

    function formatHomeMoney(value) {
        var amount = Math.round((Number(value) || 0) * 100) / 100;
        try {
            return "R$ " + amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } catch (error) {
            return "R$ " + amount.toFixed(2).replace(".", ",");
        }
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

    function xpPanelHtml(ctx) {
        var monthly = ctx.monthly;
        var remaining = Math.max(0, monthly.goal - monthly.earned);
        var goalPercent = monthly.goal > 0 ? Math.min(100, Math.round((monthly.earned / monthly.goal) * 100)) : 0;
        return '<section class="home-xp-panel">' +
            '<div class="home-xp-panel__bar xp-bar"><div class="xp-fill" id="xpFill" style="width:' + (ctx.animateXp ? 0 : xpFillWidth(goalPercent)) + '"></div><img class="xp-frame" src="assets/frames/xp_frame.png" alt=""><div class="xp-text" id="xpText">' + Arquimago.formatNumber(monthly.earned) + ' / ' + Arquimago.formatNumber(monthly.goal) + ' XP</div></div>' +
            '<div class="home-xp-panel__meta"><span>' + (monthly.isMet ? "RANK C ALCANÇADO" : "FALTA " + Arquimago.formatNumber(remaining) + " XP PARA O RANK C") + '</span></div>' +
            '</section>';
    }

    function monthLabel(key) {
        var parts = String(key || "").split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        if (!isFinite(year) || !isFinite(month)) return "Mês atual";
        return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }

    function monthlyCardHtml(monthly, animate) {
        var remaining = Math.max(0, monthly.goal - monthly.earned);
        return '<button type="button" class="home-monthly-card' + (monthly.isMet ? " is-met" : "") + '" id="monthlyGoalCard"><img class="home-monthly-card__art" src="assets/ui/home-reference/monthly-art.png" alt="" aria-hidden="true">' +
            '<span class="home-monthly-card__head"><span><small>META ARCANA</small><strong>' + escapeHtml(monthLabel(monthly.month)) + '</strong></span></span>' +
            '<span class="home-monthly-card__body"><span class="home-monthly-card__seal" aria-hidden="true"><img src="assets/ui/home-reference/xp-icon.png" alt=""></span><span class="home-monthly-card__progress"><span class="home-monthly-card__values"><strong>' + Arquimago.formatNumber(monthly.earned) + ' / ' + Arquimago.formatNumber(monthly.goal) + ' XP</strong></span><span class="home-monthly-card__bar"><span class="xp-fill" style="width:' + (animate ? 0 : monthly.percent) + '%"></span><img class="xp-frame" src="assets/ui/home-reference/xp-track-frame.png" alt=""></span><span class="home-monthly-card__caption">' + monthly.percent + '% DO TOTAL DISPONÍVEL · META EM 60%</span></span><strong class="home-monthly-card__remaining">' + (monthly.isMet ? "META ATINGIDA" : "FALTAM " + Arquimago.formatNumber(remaining) + " XP") + '</strong></span>' +
            '</button>';
    }

    function missionPanelHtml(ctx) {
        var rank = ctx.rank;
        var missionRows = (ctx.dailyEntries || []).map(function (entry) { return homeMissionRow(ctx.state, entry); }).join("");
        return '<section class="home-journey-card panel"><div class="home-journey-card__content"><h2><img class="home-journey-title" src="assets/ui/home-reference/journey-title.png" alt="Jornada de hoje"></h2>' +
            '<strong class="home-journey-card__stats">' + rank.completed + ' / ' + rank.total + ' MISSÕES <i>•</i> ' + rank.percent + '%</strong>' +
            '<span class="home-journey-card__bar"><span class="home-journey-card__fill" style="width:' + rank.percent + '%"></span><img src="assets/ui/home-reference/journey-progress.png" alt=""></span>' +
            '<details class="home-missions-details"><summary class="home-all-missions">VER MISSÕES <b aria-hidden="true">›</b></summary><div class="home-mission-list">' + missionRows + '</div><button type="button" class="home-open-missions" id="openAllMissions">ABRIR PAINEL COMPLETO</button></details></div>' +
            '<img class="home-journey-card__art" src="projeto/guardiao-simbolcard%20(2).png" alt="" aria-hidden="true">' +
            '</section>';
    }

    function missionPanelBind(ctx, el) {
        el.querySelectorAll(".home-mission-check input").forEach(function (input) {
            input.addEventListener("change", function () {
                var row = input.closest(".home-mission-row");
                var type = row.getAttribute("data-home-mission-type");
                var id = row.getAttribute("data-home-mission-id");
                var mission = Arquimago.findMissionByType ? Arquimago.findMissionByType(type, id) : Arquimago.findMission(type, id);
                if (!mission) return;
                if (!input.checked) Arquimago.playClick();
                Arquimago.setMissionComplete(mission, type, input.checked, input);
            });
        });

        var toggleHomeMissions = el.querySelector("#toggleHomeMissionsButton");
        if (toggleHomeMissions) toggleHomeMissions.addEventListener("click", function () {
            Arquimago.playClick();
            homeMissionsHidden = !homeMissionsHidden;
            saveHomeMissionsHidden();
            Arquimago.renderHome(false);
        });

        el.querySelectorAll("[data-delete-home-custom]").forEach(function (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                Arquimago.playClick();
                if (confirm("Excluir esta missão personalizada?")) {
                    Arquimago.deleteCustomMission(button.getAttribute("data-delete-home-custom"));
                }
            });
        });

        var allMissionsButton = el.querySelector("#openAllMissions");
        if (allMissionsButton) allMissionsButton.addEventListener("click", function () {
            var tab = document.querySelector('.tab[data-screen="missions"]');
            if (tab) tab.click();
        });
    }

    function classWidgetHtml(ctx) {
        return '<section class="panel home-class-card">' +
            '<div class="home-class-card__art">' + Arquimago.getMageSVG() + '</div>' +
            '<div class="home-class-card__info"><span class="section-label">Classe</span><strong>' + escapeHtml(Arquimago.getCharacterClass()) + '</strong><span>' + escapeHtml(Arquimago.getDisplayName()) + '</span></div>' +
            '</section>';
    }

    function bossIconHtml(boss) {
        if (boss.image) {
            return '<span class="home-boss-card__icon" aria-hidden="true"><img class="home-boss-card__img" src="' + escapeHtml(boss.image) + '" alt="' + escapeHtml(boss.name || "") + '" loading="lazy"></span>';
        }
        return '<span class="home-boss-card__icon" aria-hidden="true">' + (boss.icon || "👹") + '</span>';
    }

    function bossCardHtml(boss) {
        var hp = Math.max(0, Number(boss.hp) || 0);
        var maxHp = Math.max(1, Number(boss.maxHp) || 1);
        var percent = Math.round((hp / maxHp) * 100);
        return '<button type="button" class="home-boss-card' + (boss.defeated ? " is-defeated" : "") + '" id="weeklyBossCard">' +
            '<span class="home-boss-card__top"><span><small>Boss da Semana</small><strong>' + escapeHtml(boss.name) + '</strong></span>' + bossIconHtml(boss) + '</span>' +
            '<span class="home-boss-card__bar"><span style="width:' + percent + '%"></span></span>' +
            '<span class="home-boss-card__bottom"><span>' + (boss.defeated ? "Derrotado" : "HP restante") + '</span><strong>' + hp + ' / ' + maxHp + '</strong></span>' +
            '<span class="home-card-link">' + (boss.defeated ? "Troféu conquistado · ver detalhes" : "Ver fraquezas e recompensa") + ' <b aria-hidden="true">›</b></span>' +
            '</button>';
    }

    function rankCardHtml(rank) {
        return '<button type="button" class="home-rank-card' + (rank.rank === "S" ? " is-rank-s" : "") + '" id="dailyRankCard">' +
            '<img class="home-rank-card__ornament home-rank-card__ornament--left" src="assets/ui/home-reference/rank-left-ornament.png" alt="" aria-hidden="true"><img class="home-rank-card__ornament home-rank-card__ornament--right" src="assets/ui/home-reference/rank-right-ornament.png" alt="" aria-hidden="true"><span class="home-rank-card__copy"><img class="home-rank-card__label" src="assets/ui/home-reference/rank-label.png" alt="Rank atual"><strong>' + rank.rank + '</strong></span>' +
            '</button>';
    }

    function financeCardHtml(ctx) {
        var fin = ctx.state.financas || {};
        return '<button type="button" class="home-finance-card" data-fin-open="financas">' +
            '<span class="home-finance-card__item"><img class="home-finance-card__icon" src="assets/ui/home-reference/finance-icon.png" alt="" aria-hidden="true"><span><small>FINANÇAS</small><strong>' + formatHomeMoney(fin.saldo) + '</strong></span></span>' +
            '<img class="home-finance-card__divider" src="assets/ui/home-reference/finance-divider.png" alt="" aria-hidden="true">' +
            '<span class="home-finance-card__item"><img class="home-finance-card__icon" src="assets/ui/home-reference/resource-icon.png" alt="" aria-hidden="true"><span><small>RECURSOS</small><strong>' + formatHomeMoney(fin.guardado) + '</strong></span></span>' +
            '</button>';
    }

    function ascensionCardHtml() {
        var ids = ["D", "C", "B", "A", "S"];
        var files = { D: "rank_D", C: "rank_C", B: "rank_B", A: "rank_A", S: "rank_S" };
        var current = Arquimago.getCharacterClass();
        var nodes = ids.map(function (id) {
            var active = id === current;
            var image = active && id === "D" ? "assets/ui/home-reference/rank-d-active.png" : "assets/ranks/" + files[id] + ".png";
            var label = active && id === "D" ? "" : '<strong>' + id + '</strong>';
            return '<span class="home-ascension-card__node' + (active ? " is-active" : "") + '"><span><img src="' + image + '" alt="Rank ' + id + '"></span>' + label + (active ? '<small>ATUAL</small>' : "") + '</span>';
        }).join("");
        return '<section class="home-ascension-card panel"><h2><img class="home-ascension-title" src="assets/ui/home-reference/ascension-title.png" alt="Sua ascensão"></h2><div class="home-ascension-card__track">' + nodes + '</div><p>DISCIPLINA <i>•</i> FOCO <i>•</i> EVOLUÇÃO</p><small>O poder já existe. Você só precisa despertá-lo.</small></section>';
    }

    Arquimago.renderHome = function (animateXp) {
        var container = document.getElementById("home");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var boss = Arquimago.getWeeklyBoss ? Arquimago.getWeeklyBoss(state) : { name: "Boss da Semana", hp: 0, maxHp: 1, icon: "👹", defeated: false };
        var rank = Arquimago.getDailyRankData ? Arquimago.getDailyRankData(state) : { rank: "D", completed: 0, total: 0, percent: 0, nextRank: "C", missionsToNext: 0 };
        var dailyEntries = Arquimago.getDailyMissionEntries ? Arquimago.getDailyMissionEntries(state) : [];
        var monthly = Arquimago.getMonthlyProgress ? Arquimago.getMonthlyProgress(state) : { month: "", earned: 0, available: 0, goal: 0, percent: 0, isMet: false };

        var ctx = {
            state: state,
            boss: boss,
            rank: rank,
            dailyEntries: dailyEntries,
            monthly: monthly,
            xpPct: monthly.goal > 0 ? Math.min(100, Math.round((monthly.earned / monthly.goal) * 100)) : 0,
            animateXp: !!animateXp,
            homeMissionsHidden: homeMissionsHidden
        };

        if (Arquimago.homeWidgets && Arquimago.homeWidgets.renderHome) {
            Arquimago.homeWidgets.renderHome(container, ctx);
        } else {
            container.innerHTML = '<div class="home-page home-page--focused">' +
                rankCardHtml(rank) +
                xpPanelHtml(ctx) +
                monthlyCardHtml(monthly, false) +
                bossCardHtml(boss) +
                (Arquimago.slideshowCardHtml ? Arquimago.slideshowCardHtml() : "") +
                missionPanelHtml(ctx) +
                '</div>';
        }

        var topRank = document.getElementById("topDailyRank");
        if (topRank) topRank.textContent = rank.rank;
        document.querySelectorAll(".xp-bar--top .xp-fill").forEach(function (fill) {
            if (animateXp) fill.classList.add("xp-animate");
            fill.style.width = xpFillWidth(monthly.percent);
            if (animateXp) setTimeout(function () { fill.classList.remove("xp-animate"); }, 900);
        });
        document.querySelectorAll(".xp-bar--top .xp-text").forEach(function (text) { text.innerText = Arquimago.formatNumber(monthly.earned) + " / " + Arquimago.formatNumber(monthly.goal) + " XP"; });
        if (Arquimago.initSlideshow) Arquimago.initSlideshow();
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

    Arquimago.openMonthlyDetails = function () {
        var state = Arquimago.state;
        var monthly = Arquimago.getMonthlyProgress(state);
        var history = (state.monthlyHistory || []).slice().reverse();
        var rows = history.length ? history.map(function (entry) {
            return '<div class="monthly-history-row' + (entry.goalMet ? " is-met" : "") + '"><div><strong>' + escapeHtml(monthLabel(entry.month)) + '</strong><small>' + escapeHtml(entry.class || "Aprendiz") + '</small></div><span>' + Arquimago.formatNumber(entry.xp) + ' / ' + Arquimago.formatNumber(entry.totalAvailableXP) + ' XP</span><b>' + entry.percentage + '%</b><em>' + (entry.goalMet ? "Meta atingida" : "Meta não atingida") + '</em></div>';
        }).join("") : '<p class="profile-empty">Nenhum ciclo mensal encerrado ainda.</p>';
        var content = '<div class="monthly-detail__hero"><div><small>' + escapeHtml(monthLabel(monthly.month)) + '</small><strong>' + Arquimago.formatNumber(monthly.earned) + ' / ' + Arquimago.formatNumber(monthly.available) + ' XP</strong><span>' + monthly.percent + '% do total disponível · meta em 60%</span></div><b class="monthly-detail__class">' + escapeHtml(Arquimago.getCharacterClass()) + '</b></div>' +
            '<div class="monthly-detail__bar"><span style="width:' + monthly.percent + '%"></span><i style="left:60%"></i></div>' +
            '<p class="progression-modal__hint">A Meta Arcana reinicia no primeiro dia de cada mês. O XP permanente, nível, magias e títulos continuam intactos.</p>' +
            '<div class="monthly-history"><h3>Histórico mensal</h3>' + rows + '</div>';
        openProgressionModal("Meta Arcana", content, "progression-modal--monthly");
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
        var content = '<div class="boss-detail__hero">' + (boss.image ?
            '<div class="boss-detail__art is-image"><img class="boss-detail__img" src="' + escapeHtml(boss.image) + '" alt="' + escapeHtml(boss.name) + '" loading="lazy"><span aria-hidden="true">✦</span></div>' :
            '<div class="boss-detail__art">' + (boss.icon || "👹") + '<span aria-hidden="true">✦</span></div>') +
            '<div class="boss-detail__summary"><span class="section-label">Inimigo semanal</span><h3>' + escapeHtml(boss.name) + '</h3><p>' + escapeHtml(boss.description) + '</p></div></div>' +
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
        Arquimago.renderMissions();
        if (Arquimago.renderBoss) Arquimago.renderBoss();
        if (Arquimago.renderFinancas) Arquimago.renderFinancas();
        Arquimago.renderGrimoire();
        Arquimago.renderProfile();
    };

    if (Arquimago.homeWidgets) {
        Arquimago.homeWidgets.register({
            id: "rank",
            title: "Rank de Hoje",
            defaultSize: "wide",
            sizes: ["medium", "wide", "full"],
            render: function (ctx) { return rankCardHtml(ctx.rank); },
            afterRender: function (ctx, el) {
                var b = el.querySelector("#dailyRankCard");
                if (b) b.addEventListener("click", function () {
                    Arquimago.playClick();
                    Arquimago.openDailyRankDetails();
                });
            }
        });

        Arquimago.homeWidgets.register({
            id: "finance",
            title: "Finanças e Recursos",
            defaultSize: "wide",
            sizes: ["wide", "full"],
            render: function (ctx) { return financeCardHtml(ctx); },
            afterRender: function (ctx, el) {
                var b = el.querySelector("[data-fin-open]");
                if (b) b.addEventListener("click", function () {
                    Arquimago.playClick();
                    var tab = document.querySelector('.tab[data-screen="financas"]');
                    if (tab) tab.click();
                });
            }
        });

        Arquimago.homeWidgets.register({
            id: "ascension",
            title: "Sua Ascensão",
            defaultSize: "wide",
            sizes: ["wide", "full"],
            render: function () { return ascensionCardHtml(); }
        });

        Arquimago.homeWidgets.register({
            id: "xp",
            title: "Progresso da Jornada",
            defaultSize: "wide",
            sizes: ["medium", "wide", "full"],
            render: function (ctx) { return xpPanelHtml(ctx); },
            afterRender: function (ctx, el) {
                if (!ctx.animateXp) return;
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        var fill = el.querySelector("#xpFill");
                        if (!fill) return;
                        fill.classList.add("xp-animate");
                        fill.style.width = xpFillWidth(ctx.xpPct);
                        setTimeout(function () { fill.classList.remove("xp-animate"); }, 900);
                    });
                });
            }
        });

        Arquimago.homeWidgets.register({
            id: "monthly",
            title: "Meta Arcana",
            defaultSize: "wide",
            sizes: ["medium", "wide", "full"],
            render: function (ctx) { return monthlyCardHtml(ctx.monthly, ctx.animateXp); },
            afterRender: function (ctx, el) {
                var b = el.querySelector("#monthlyGoalCard");
                if (b) b.addEventListener("click", function () {
                    Arquimago.playClick();
                    Arquimago.openMonthlyDetails();
                });
                if (ctx.animateXp) {
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            var fill = el.querySelector(".home-monthly-card__bar span");
                            if (fill) fill.style.width = ctx.monthly.percent + "%";
                        });
                    });
                }
            }
        });

        Arquimago.homeWidgets.register({
            id: "boss",
            title: "Boss da Semana",
            defaultSize: "wide",
            sizes: ["medium", "wide", "full"],
            render: function (ctx) { return bossCardHtml(ctx.boss); },
            afterRender: function (ctx, el) {
                var b = el.querySelector("#weeklyBossCard");
                if (b) b.addEventListener("click", function () {
                    Arquimago.playClick();
                    Arquimago.openWeeklyBossDetails();
                });
            },
            visibleByDefault: false
        });

        Arquimago.homeWidgets.register({
            id: "slides",
            title: "Slides / Ilustrações",
            defaultSize: "wide",
            sizes: ["medium", "large", "wide", "full"],
            render: function (ctx) { return Arquimago.slideshowCardHtml ? Arquimago.slideshowCardHtml() : ""; },
            visibleByDefault: false
        });

        Arquimago.homeWidgets.register({
            id: "missions",
            title: "Missões",
            defaultSize: "wide",
            sizes: ["medium", "large", "wide", "full"],
            render: function (ctx) { return missionPanelHtml(ctx); },
            afterRender: function (ctx, el) { missionPanelBind(ctx, el); }
        });

        Arquimago.homeWidgets.register({
            id: "class",
            title: "Classe",
            defaultSize: "medium",
            sizes: ["small", "medium", "wide"],
            render: function (ctx) { return classWidgetHtml(ctx); },
            visibleByDefault: false
        });
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
