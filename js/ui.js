(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var XP_TRACK_FRACTION = 0.645;

    function xpFillWidth(pct) {
        return (pct * XP_TRACK_FRACTION) + "%";
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

    Arquimago.renderHome = function (animateXp) {
        var container = document.getElementById("home");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var chapter = Arquimago.getChapterForLevel(state.level);
        var nextMission = Arquimago.getNextMainMission();
        var xpNeed = Arquimago.getXpToNext(state);
        var xpPct = Arquimago.getXpPercent(state);
        var mainDone = state.completedIds.indexOf(nextMission.id) !== -1;

        var loreText = getLoreForChapter(state.chapter);

        container.innerHTML =
            '<div class="home-page">' +
            '<div class="hero-panel">' +
            '<div class="hero-bg"></div><div class="hero-glow"></div><div class="hero-runes"></div>' +
             '<div class="hero-inner">' +
            '<div class="mage-card">' +
            '<div class="mage-card__avatar">' + Arquimago.getPlayerAvatar() + '</div>' +
            '<div class="mage-card__info">' +
            '<h2 data-player-name>' + Arquimago.getDisplayName() + '</h2>' +
            '<span class="mage-card__title">' + state.title + '</span>' +
            '<p class="mage-card__quote">A culpa destruiu quem você era. Agora ela alimenta quem você escolheu se tornar.</p>' +
            '<div class="xp-card">' +
            '<div class="level-row"><span>Nível</span><strong id="playerLevel">' + state.level + '</strong></div>' +
            '<div class="xp-bar">' +
            '<div class="xp-fill" id="xpFill" style="width:' + (animateXp ? 0 : xpFillWidth(xpPct)) + '"></div>' +
            '<img class="xp-frame" src="assets/frames/xp_frame.png" alt="XP Frame">' +
            '<div class="xp-text" id="xpText">' + state.xp + ' / ' + xpNeed + ' XP</div>' +
            '</div>' +
            '</div></div></div>' +
             '<div class="chapter-brief"><div class="chapter-brief__art"><img src="assets/illustrations/entrada-da-masmorra.png" alt=""></div>' +
            '<span class="hero-badge"><strong>RPG</strong> • O Recomeço</span>' +
            '<span class="section-label">Capítulo Atual</span>' +
            '<h3>' + chapter.name + '</h3>' +
            '<p>' + chapter.desc + '</p>' +
            '<div class="hero-meta"><span>Próximo avanço</span><strong>Nível ' + (state.level + 1) + '</strong></div>' +
            '</div></div>' +
             '<div class="character-panel">' +
             '<div class="character-portrait">' + Arquimago.getPlayerAvatar() + '</div>' +
             '<div class="character-sheet">' +
             '<div class="character-sheet__header">' +
             '<div><span class="character-chip">Classe</span><h3>' + Arquimago.getCharacterClass() + '</h3></div>' +
             '<div class="character-badge">' + state.level + ' • Nível</div>' +
             '</div>' +
             '<div class="character-signature"><p>Domina os elementos e molda a realidade.</p>' +
             '<div class="elemental-row" aria-label="Afinidades elementais">' +
             '<span class="elemental elemental-fire" title="Fogo"><i>✦</i></span>' +
             '<span class="elemental elemental-void" title="Éter"><i>◒</i></span>' +
             '<span class="elemental elemental-arcane" title="Arcano"><i>✧</i></span>' +
             '<span class="elemental elemental-nature" title="Natureza"><i>♧</i></span>' +
             '<span class="elemental elemental-flame" title="Chama"><i>⌁</i></span>' +
             '</div></div>' +
             '<div class="character-stats">' +
            '<div class="stat-pill"><span>XP</span><strong>' + state.xp + '/' + xpNeed + '</strong></div>' +
            '<div class="stat-pill"><span>Mana</span><strong>' + Math.max(45, 80 + state.level * 2) + '</strong></div>' +
            '<div class="stat-pill"><span>Energia</span><strong>' + Math.max(60, 70 + state.level) + '</strong></div>' +
            '<div class="stat-pill"><span>Ouro</span><strong>150</strong></div>' +
            '</div>' +
            '<div class="character-meta">' +
            '<div><span>Título</span><strong>' + state.title + '</strong></div>' +
            '<div><span>Sequência</span><strong>' + state.streak + ' dias</strong></div>' +
            '<div><span>Consecutivos</span><strong>' + state.streak + ' dias</strong></div>' +
            '</div>' +
            '</div></div>' +
            '<div class="status-row">' +
            statusCard("Sequência", state.streak + " dias", "streak") +
            statusCard("XP Total", Arquimago.formatNumber(state.totalXP), "xp") +
            statusCard("Missões", state.missionsCompleted, "missions") +
            '</div>' +
            loreSnippet(loreText) +
            '</div>' +
            '<div class="dashboard">' +
            '<div class="dashboard-col">' +
            '<div class="panel"><div class="panel-header"><h3>Mapa da Jornada</h3><span>Cap. ' + chapter.id + '</span></div>' +
            '<div id="miniMapContainer"></div></div>' +
            '<div class="panel mission-highlight-panel">' +
            '<div class="panel-header"><h3>Missão Principal</h3></div>' +
            '<div class="mission-highlight' + (mainDone ? " completed" : "") + '">' +
            '<span class="mission-type">MISSÃO PRINCIPAL</span>' +
            '<div class="mission-highlight__title">' +
            '<span class="mission-icon" aria-hidden="true">' + Arquimago.getMissionIcon(nextMission) + '</span>' +
            '<h2 id="nextMissionTitle">' + nextMission.name + '</h2>' +
            '</div>' +
            '<p id="nextMissionDescription">' + nextMission.desc + '</p>' +
            '<div class="mission-footer">' +
            '<span class="reward">+' + nextMission.xp + ' XP</span>' +
            '<button id="startMissionButton" class="btn-primary"' + (mainDone ? " disabled" : "") + '>' +
            (mainDone ? "Concluída" : "Concluir Missão") +
            '</button></div></div></div></div>' +
            '<div class="dashboard-col">' +
            '<div class="panel"><div class="panel-header"><h3>Próximo Objetivo</h3></div>' +
            '<div class="objective-card"><p>Alcançar <strong>Nível ' + (state.level + 1) + '</strong></p>' +
            '<div class="objective-bar"><div style="width:' + xpPct + '%"></div></div>' +
            '<span>Faltam ' + (xpNeed - state.xp) + ' XP</span></div></div>' +
            '<div class="panel"><div class="panel-header"><h3>Evento Atual</h3></div>' +
            '<div class="event-card"><span class="event-tag">EVENTO</span>' +
            '<h3>' + Arquimago.EVENT.name + '</h3>' +
            '<p>' + Arquimago.EVENT.desc + '</p>' +
            '<strong>+' + Math.round(Arquimago.EVENT.bonus * 100) + '% XP</strong></div></div>' +
            '<div class="panel"><div class="panel-header"><h3>Magias Ativas</h3></div>' +
            '<div class="active-spells" id="activeSpells"></div></div>' +
            '</div></div></div>';

        Arquimago.renderMiniMap();
        Arquimago.renderActiveSpells();

        if (animateXp) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    var fill = document.getElementById("xpFill");
                    if (fill) {
                        fill.classList.add("xp-animate");
                        fill.style.width = xpFillWidth(xpPct);
                        setTimeout(function () { fill.classList.remove("xp-animate"); }, 900);
                    }
                });
            });
        }

        document.querySelectorAll(".xp-bar--top .xp-fill").forEach(function (fill) {
            fill.style.width = xpFillWidth(xpPct);
        });
        document.querySelectorAll(".xp-bar--top .xp-text").forEach(function (text) {
            text.innerText = state.xp + " / " + xpNeed + " XP";
        });

        var btn = document.getElementById("startMissionButton");
        if (btn && !mainDone) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                btn.disabled = true;
                Arquimago.completeMission(nextMission, "main", btn);
            });
        }
    };

    function statusCard(label, value, type) {
        return '<div class="status-card status-card--' + type + '"><span>' + label + '</span><strong id="' + type + 'Value">' + value + '</strong></div>';
    }

    Arquimago.renderActiveSpells = function () {
        var el = document.getElementById("activeSpells");
        if (!el) return;
        var spells = Arquimago.state.unlockedSpells.slice(-4);
        var html = '<div class="active-spells-grid">';
        spells.forEach(function (id) {
            var spell = Arquimago.SPELLS.find(function (s) { return s.id === id; });
            if (spell) html += '<div class="active-spell"><span>' + spell.name + '</span></div>';
        });
        if (spells.length < 4) {
            for (var i = spells.length; i < 4; i++) {
                html += '<div class="active-spell empty">—</div>';
            }
        }
        html += '</div>';
        el.innerHTML = html;
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
    };

    function getLoreForChapter(chapterId) {
        var loreMap = {
            1: '"Das cinzas ao primeiro passo." — Mestra Liana saudou o Arquimago com um olhar que atravessava os anos.',
            2: '"A Floresta dos Ecos guarda mais do que sombras. Guarda as memórias que você tentou esquecer."',
            3: '"A Grande Biblioteca de Asterion não foi construída. Ela cresceu. Como a sabedoria." — Inscrição na entrada das Ruínas.',
            4: '"O fogo que não te consome te forja." — Provérbio dos ferreiros das Montanhas Cinzentas.',
            5: '"O verdadeiro inimigo nunca foi o mundo. Foi abandonar quem você poderia se tornar."'
        };
        return loreMap[chapterId] || '"Todo grande mago já conheceu o fracasso."';
    }

    function loreSnippet(text) {
        return '<div class="lore-snippet"><span class="lore-icon">&#9733;</span><p>' + text + '</p></div>';
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
