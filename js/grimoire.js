(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var ICONS = {
        focus: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="#c9a84c" stroke-width="2"/><circle cx="32" cy="32" r="8" fill="#4a7fd4"/></svg>',
        shield: '<svg viewBox="0 0 64 64"><path d="M32 4 L56 16 V32 C56 48 32 60 32 60 C32 60 8 48 8 32 V16 Z" fill="none" stroke="#c9a84c" stroke-width="2"/><path d="M32 16 V44 M22 32 H42" stroke="#4a7fd4" stroke-width="2"/></svg>',
        eye: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="26" ry="16" fill="none" stroke="#c9a84c" stroke-width="2"/><circle cx="32" cy="32" r="8" fill="#4a7fd4"/></svg>',
        heart: '<svg viewBox="0 0 64 64"><path d="M32 54 C16 40 6 30 6 20 C6 12 12 6 20 6 C26 6 30 10 32 14 C34 10 38 6 44 6 C52 6 58 12 58 20 C58 30 48 40 32 54Z" fill="none" stroke="#c9a84c" stroke-width="2"/></svg>',
        time: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="#c9a84c" stroke-width="2"/><path d="M32 16 V32 L44 38" stroke="#4a7fd4" stroke-width="2"/></svg>',
        star: '<svg viewBox="0 0 64 64"><polygon points="32,4 40,24 62,24 44,38 50,58 32,46 14,58 20,38 2,24 24,24" fill="none" stroke="#c9a84c" stroke-width="2"/></svg>',
        crown: '<svg viewBox="0 0 64 64"><path d="M8 48 H56 V28 L44 36 L32 20 L20 36 L8 28 Z" fill="none" stroke="#c9a84c" stroke-width="2"/><rect x="8" y="48" width="48" height="8" fill="none" stroke="#c9a84c" stroke-width="2"/></svg>'
    };

    Arquimago.renderGrimoire = function () {
        var container = document.getElementById("grimoire");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var unlocked = state.unlockedSpells;

        var html = '<div class="grimoire-page">';
        html += '<div class="grimoire-header">';
        html += '<h2>Grimório Arcano</h2>';
        html += '<p>' + unlocked.length + ' de ' + Arquimago.SPELLS.length + ' magias desbloqueadas</p>';
        html += '</div>';
        html += '<div class="spells-grid">';

        Arquimago.SPELLS.forEach(function (spell) {
            var isUnlocked = unlocked.indexOf(spell.id) !== -1;
            html += '<div class="spell-card' + (isUnlocked ? " unlocked" : " locked") + '">';
            html += '<div class="spell-card__icon">' + (ICONS[spell.icon] || ICONS.focus) + '</div>';
            html += '<div class="spell-card__body">';
            html += '<span class="spell-card__level">Nível ' + spell.level + '</span>';
            html += '<h3>' + spell.name + '</h3>';
            html += '<p>' + spell.desc + '</p>';
            if (!isUnlocked) {
                html += '<span class="spell-card__lock">Bloqueada</span>';
            }
            html += '</div></div>';
        });

        html += '</div></div>';
        container.innerHTML = html;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
