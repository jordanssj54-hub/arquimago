(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var XP_TRACK_FRACTION = 0.645;
    var homeMissionsExpanded = false;

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
        var progress = ctx.levelProgress;
        var label = progress.maxed ? "LEVEL MÁXIMO ALCANÇADO" : "LEVEL " + Arquimago.formatNumber(progress.level) + " · FALTAM " + Arquimago.formatNumber(progress.remaining) + " XP PARA O LEVEL " + Arquimago.formatNumber(progress.nextLevel);
        return '<section class="home-xp-panel">' +
            '<div class="home-xp-panel__bar xp-bar"><div class="xp-fill" id="xpFill" style="width:' + (ctx.animateXp ? 0 : xpFillWidth(progress.percent)) + '"></div><img class="xp-frame" src="assets/frames/xp_frame.png" alt=""><div class="xp-text" id="xpText">' + (progress.maxed ? "XP no máximo" : Arquimago.formatNumber(progress.earned) + ' / ' + Arquimago.formatNumber(progress.required) + ' XP') + '</div></div>' +
            '<div class="home-xp-panel__meta"><span>' + label + '</span></div>' +
            '</section>';
    }

    function missionPanelHtml(ctx) {
        var dayProgress = ctx.dayProgress;
        return '<section class="home-journey-card">' +
            '<span class="home-journey-card__icon" aria-hidden="true"><img src="assets/ui/home-reference/extracted/journey-calendar.png" alt=""></span>' +
            '<div class="home-journey-card__copy"><h2>Jornada de Hoje</h2><p><strong>' + dayProgress.completed + '</strong> de ' + dayProgress.total + ' missões</p><span class="home-journey-card__track" role="progressbar" aria-label="Progresso das missões de hoje" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + dayProgress.percent + '"><i style="width:' + dayProgress.percent + '%"></i><img src="assets/ui/home-reference/extracted/journey-track-frame.png" alt="" aria-hidden="true"></span></div>' +
            '<button type="button" class="home-journey-card__button" data-home-missions-open aria-label="Ver Missões"><img src="assets/ui/home-reference/extracted/journey-button.png" alt=""></button>' +
            '</section>';
    }

    function homeProfileHtml(ctx) {
        var state = ctx.state;
        var progress = ctx.levelProgress;
        var avatar = state.customAvatar ?
            '<img src="' + escapeHtml(state.customAvatar) + '" alt="Foto de ' + escapeHtml(Arquimago.getDisplayName()) + '">' :
            '<img src="projeto/cardperfil.png" alt="Retrato do Arquimago">';
        return '<section class="home-profile-banner" aria-label="Resumo do perfil">' +
            '<img class="home-profile-banner__landscape" src="projeto/refs%20novas/home-header-castle.png" alt="" aria-hidden="true">' +
            '<div class="home-profile-banner__shade" aria-hidden="true"></div>' +
            '<span class="home-profile-banner__avatar">' + avatar + '<img class="home-profile-banner__avatar-frame" src="assets/ui/home-reference/extracted/profile-avatar-frame.png" alt="" aria-hidden="true"></span>' +
            '<div class="home-profile-banner__identity"><h2>' + escapeHtml(Arquimago.getDisplayName()) + '</h2><p>' + escapeHtml(state.title || "Aprendiz do Recomeço") + '</p><strong class="home-profile-banner__level">LEVEL ' + Arquimago.formatNumber(progress.level) + '</strong></div>' +
            '<div class="home-profile-banner__xp"><span class="home-profile-banner__track" role="progressbar" aria-label="XP para o próximo nível" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(progress.percent) + '"><i style="width:' + progress.percent + '%"></i></span><strong>' + (progress.maxed ? 'LEVEL MÁXIMO' : Arquimago.formatNumber(progress.earned) + ' / ' + Arquimago.formatNumber(progress.required) + ' XP') + '</strong></div>' +
            '</section>';
    }

    function shortcutIcon(id) {
        var icons = {
            training: '<img src="assets/ui/home-reference/extracted/shortcut-training.png" alt="" aria-hidden="true">',
            diet: '<img src="assets/ui/home-reference/extracted/shortcut-diet.png" alt="" aria-hidden="true">',
            finance: '<img src="assets/ui/home-reference/extracted/shortcut-finances.png" alt="" aria-hidden="true">',
            goals: '<img src="assets/ui/home-reference/extracted/shortcut-goals.png" alt="" aria-hidden="true">'
        };
        return icons[id] || "";
    }

    function shortcutsHtml() {
        var shortcuts = [
            { id: "training", label: "Treinos" },
            { id: "diet", label: "Dieta" },
            { id: "finance", label: "Finanças" },
            { id: "goals", label: "Metas" }
        ];
        return '<nav class="home-shortcuts" aria-label="Atalhos da Home">' + shortcuts.map(function (item) {
            return '<button type="button" class="home-shortcut" data-home-shortcut="' + item.id + '">' + shortcutIcon(item.id) + '<span>' + item.label + '</span></button>';
        }).join("") + '</nav>';
    }

    function attributeIcon(key) {
        var icons = {
            physical: "progress-physical.png",
            mental: "progress-mental.png",
            habits: "progress-habits.png"
        };
        return '<img src="assets/ui/home-reference/extracted/' + icons[key] + '" alt="" aria-hidden="true">';
    }

    function personalProgressHtml(state, options) {
        options = options || {};
        var keys = ["physical", "mental", "habits"];
        var rows = keys.map(function (key) {
            var definition = Arquimago.ATTRIBUTE_DEFINITIONS[key];
            var progress = Arquimago.getAttributeProgress(state, key);
            var tag = options.interactive ? "button" : "div";
            return '<' + tag + ' class="home-progress-row home-progress-row--' + key + (options.interactive ? ' home-progress-row--interactive' : '') + '"' + (options.interactive ? ' type="button" data-attribute-key="' + key + '"' : '') + ' style="--attribute-color:' + definition.color + '">' +
                '<span class="home-progress-row__icon">' + attributeIcon(key) + '</span>' +
                '<span class="home-progress-row__copy"><strong>' + escapeHtml(definition.name) + '</strong><span class="home-progress-row__track" role="progressbar" aria-label="Progresso de ' + escapeHtml(definition.name) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + progress.percent + '"><i style="width:' + progress.percent + '%"></i></span></span>' +
                '<b>' + progress.percent + '%</b></' + tag + '>';
        }).join("");
        var profileClass = options.profile ? ' profile-reference-card profile-reference-attributes' : '';
        var title = options.title || "Progresso Pessoal";
        return '<section class="home-progress-card' + profileClass + '"><h2><img src="assets/ui/home-reference/extracted/progress-heading.png" alt="" aria-hidden="true"> ' + escapeHtml(title) + '</h2><div class="home-progress-card__rows">' + rows + '</div>' + (options.detail ? '<div id="profileAttributeDetail"></div>' : '') + '</section>';
    }

    Arquimago.attributeProgressCardHtml = personalProgressHtml;

    function bossCardHtml(boss) {
        var hp = Math.max(0, Number(boss.hp) || 0);
        var maxHp = Math.max(1, Number(boss.maxHp) || 1);
        var percent = Math.round((hp / maxHp) * 100);
        var image = boss.image || "projeto/refs%20novas/1.%20boss-procrastinacao.png";
        var actionButton = boss.defeated ?
            '<button type="button" class="home-challenge-card__button" data-home-open-boss>Ver Boss <span aria-hidden="true">&#8594;</span></button>' :
            '<button type="button" class="home-challenge-card__button home-challenge-card__button--reference" data-home-open-boss aria-label="Enfrentar"><img src="assets/ui/home-reference/extracted/challenge-button.png" alt=""></button>';
        return '<section class="home-challenge-card' + (boss.defeated ? ' is-defeated' : '') + '">' +
            '<img class="home-challenge-card__art" src="' + escapeHtml(image) + '" alt="" aria-hidden="true">' +
            '<div class="home-challenge-card__content"><span class="home-challenge-card__eyebrow"><b aria-hidden="true"><img src="assets/ui/home-reference/extracted/challenge-swords.png" alt="" aria-hidden="true"></b> Desafio Atual</span><h2>' + escapeHtml(boss.name) + '</h2><p>' + hp + ' HP</p><span class="home-challenge-card__track" role="progressbar" aria-label="Vida restante de ' + escapeHtml(boss.name) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent + '"><i style="width:' + percent + '%"></i></span>' + actionButton + '</div>' +
            '</section>';
    }

    function financeCardHtml(ctx) {
        var fin = ctx.state.financas || {};
        return '<button type="button" class="home-finance-card" data-fin-open="financas">' +
            '<span class="home-finance-card__item"><img class="home-finance-card__icon" src="assets/ui/home-reference/finance-icon.png" alt="" aria-hidden="true"><span><small>FINANÇAS</small><strong>' + formatHomeMoney(fin.saldo) + '</strong></span></span>' +
            '<img class="home-finance-card__divider" src="assets/ui/home-reference/finance-divider.png" alt="" aria-hidden="true">' +
            '<span class="home-finance-card__item"><img class="home-finance-card__icon" src="assets/ui/home-reference/resource-icon.png" alt="" aria-hidden="true"><span><small>RECURSOS</small><strong>' + formatHomeMoney(fin.guardado) + '</strong></span></span>' +
            '</button>';
    }

    function levelCardHtml(ctx) {
        var progress = ctx.levelProgress;
        var text = progress.maxed ? "Level máximo" : Arquimago.formatNumber(progress.remaining) + " XP para Level " + Arquimago.formatNumber(progress.nextLevel);
        return '<section class="home-level-card panel"><span class="home-level-card__label">LEVEL ATUAL</span><strong>' + Arquimago.formatNumber(progress.level) + '</strong><span class="home-level-card__next">' + text + '</span></section>';
    }

    Arquimago.renderHome = function (animateXp) {
        var container = document.getElementById("home");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var boss = Arquimago.getWeeklyBoss ? Arquimago.getWeeklyBoss(state) : { name: "Boss da Semana", hp: 0, maxHp: 1, icon: "👹", defeated: false };
        var dayProgress = Arquimago.getDailyMissionProgress ? Arquimago.getDailyMissionProgress(state) : { completed: 0, total: 0, percent: 0 };
        var levelProgress = Arquimago.getLevelProgress ? Arquimago.getLevelProgress(state) : { level: state.level || 1, earned: state.xp || 0, required: 0, percent: 0, remaining: 0, nextLevel: (state.level || 1) + 1, maxed: false };
        var dailyEntries = Arquimago.getDailyMissionEntries ? Arquimago.getDailyMissionEntries(state) : [];

        var ctx = {
            state: state,
            boss: boss,
            dayProgress: dayProgress,
            levelProgress: levelProgress,
            dailyEntries: dailyEntries,
            attributes: Arquimago.ATTRIBUTE_DEFINITIONS,
            xpPct: levelProgress.percent,
            animateXp: !!animateXp
        };

        if (homeMissionsExpanded) {
            container.innerHTML = '<div class="home-page home-page--focused home-page--missions-open"><button type="button" class="home-missions-back" data-home-missions-close><span aria-hidden="true">&#8592;</span> Voltar à Home</button><div class="home-missions-expanded__content"></div></div>';
            var closeMissions = container.querySelector("[data-home-missions-close]");
            if (closeMissions) closeMissions.addEventListener("click", function () {
                Arquimago.playClick();
                homeMissionsExpanded = false;
                Arquimago.renderHome(false);
            });
            var missionsContent = container.querySelector(".home-missions-expanded__content");
            if (missionsContent && Arquimago.renderMissions) Arquimago.renderMissions(missionsContent);
        } else if (Arquimago.homeWidgets && Arquimago.homeWidgets.renderHome) {
            Arquimago.homeWidgets.renderHome(container, ctx);
        } else {
            container.innerHTML = '<div class="home-page home-page--focused">' + homeProfileHtml(ctx) + missionPanelHtml(ctx) + shortcutsHtml() + personalProgressHtml(state) + bossCardHtml(boss) + '</div>';
            bindHomeWidgets(container);
        }

        var topLevel = document.getElementById("topLevel");
        if (topLevel) topLevel.textContent = Arquimago.formatNumber(state.level);
        document.querySelectorAll(".xp-bar--top .xp-fill").forEach(function (fill) {
            if (animateXp) fill.classList.add("xp-animate");
            fill.style.width = xpFillWidth(levelProgress.percent);
            if (animateXp) setTimeout(function () { fill.classList.remove("xp-animate"); }, 900);
        });
        document.querySelectorAll(".xp-bar--top .xp-text").forEach(function (text) {
            text.innerText = levelProgress.maxed ? "LEVEL MÁXIMO" : Arquimago.formatNumber(levelProgress.earned) + " / " + Arquimago.formatNumber(levelProgress.required) + " XP";
        });
        if (Arquimago.initSlideshow) Arquimago.initSlideshow();
    };

    function openHomeMissions() {
        homeMissionsExpanded = true;
        Arquimago.playClick();
        Arquimago.renderHome(false);
        var mainContent = document.querySelector("#game .main-content");
        if (mainContent) mainContent.scrollTo({ top: 0, behavior: "smooth" });
    }

    function selectHomeTab(id) {
        var tab = document.querySelector('.tab[data-screen="' + id + '"]');
        if (tab) tab.click();
    }

    function bindHomeWidgets(container) {
        container.querySelectorAll("[data-home-missions-open]").forEach(function (button) {
            button.addEventListener("click", openHomeMissions);
        });
        container.querySelectorAll("[data-home-open-boss]").forEach(function (button) {
            button.addEventListener("click", function () { selectHomeTab("boss"); });
        });
        container.querySelectorAll("[data-home-shortcut]").forEach(function (button) {
            button.addEventListener("click", function () {
                var shortcut = button.getAttribute("data-home-shortcut");
                if (shortcut === "finance") {
                    selectHomeTab("financas");
                } else if (shortcut === "goals") {
                    selectHomeTab("profile");
                    global.setTimeout(function () {
                        var attributes = document.querySelector(".profile-reference-attributes");
                        if (attributes) attributes.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 0);
                } else {
                    openHomeMissions();
                }
            });
        });
    }

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
        if (Arquimago.refreshDrawerProfile) Arquimago.refreshDrawerProfile();
    };

    Arquimago.refreshAll = function (animateXp) {
        if (Arquimago.syncDates && Arquimago.state) Arquimago.syncDates(Arquimago.state);
        Arquimago.renderHome(animateXp);
        Arquimago.renderMissions();
        if (Arquimago.renderBoss) Arquimago.renderBoss();
        if (Arquimago.renderFinancas) Arquimago.renderFinancas();
        Arquimago.renderGrimoire();
        Arquimago.renderProfile();
        if (Arquimago.refreshDrawerProfile) Arquimago.refreshDrawerProfile();
    };

    if (Arquimago.homeWidgets) {
        Arquimago.homeWidgets.register({
            id: "hero",
            title: "Perfil e experiência",
            defaultSize: "wide",
            sizes: ["wide", "full"],
            render: function (ctx) { return homeProfileHtml(ctx); }
        });

        Arquimago.homeWidgets.register({
            id: "journey",
            title: "Jornada de Hoje",
            defaultSize: "wide",
            sizes: ["wide", "full"],
            render: function (ctx) { return missionPanelHtml(ctx); },
            afterRender: function (ctx, el) { bindHomeWidgets(el); }
        });

        Arquimago.homeWidgets.register({
            id: "shortcuts",
            title: "Atalhos",
            defaultSize: "wide",
            sizes: ["wide", "full"],
            render: function () { return shortcutsHtml(); },
            afterRender: function (ctx, el) { bindHomeWidgets(el); }
        });

        Arquimago.homeWidgets.register({
            id: "attributes",
            title: "Progresso pessoal",
            defaultSize: "medium",
            sizes: ["medium", "wide"],
            render: function (ctx) { return personalProgressHtml(ctx.state); }
        });

        Arquimago.homeWidgets.register({
            id: "challenge",
            title: "Desafio atual",
            defaultSize: "wide",
            sizes: ["medium", "wide"],
            render: function (ctx) { return bossCardHtml(ctx.boss); },
            afterRender: function (ctx, el) { bindHomeWidgets(el); }
        });

    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
