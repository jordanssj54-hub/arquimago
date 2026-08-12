(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.renderMap = function (targetId) {
        var container = document.getElementById(targetId || "map");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var chapters = Arquimago.CHAPTERS;

        var html = '<div class="map-page">';
        html += '<div class="map-header">';
        html += '<h2>Mapa da Jornada</h2>';
        html += '<p>Capítulo ' + state.chapter + ' • ' + Arquimago.getChapterForLevel(state.level).name + '</p>';
        html += '</div>';
        var regionData = [
            { name: 'Vale do Recomeço', icon: '🌄' },
            { name: 'Floresta dos Ecos', icon: '🌲' },
            { name: 'Ruínas de Asterion', icon: '🏛' },
            { name: 'Montanhas Cinzentas', icon: '⛰' },
            { name: 'Castelo do Eclipse', icon: '🏰' }
        ];
        html += '<div class="map-visual">';
        html += '<div class="map-visual__card">';
        html += '<div class="map-regions-row">';
        for (var r = 0; r < regionData.length; r++) {
            var rActive = r < state.chapter;
            html += '<div class="map-region' + (rActive ? '' : ' locked') + '">' + regionData[r].icon + ' ' + regionData[r].name + '</div>';
            if (r < regionData.length - 1) {
                html += '<div class="map-path"></div>';
            }
        }
        html += '</div>';
        html += '<div class="map-node">Capítulo ' + state.chapter + '</div>';
        html += '</div>';
        html += '<div class="chapter-map">';

        chapters.forEach(function (ch, i) {
            var unlocked = state.level >= ch.minLevel;
            var current = Arquimago.getChapterForLevel(state.level).id === ch.id;
            var completed = state.level > ch.minLevel || (state.level >= ch.minLevel && i < chapters.length - 1 && state.level >= chapters[i + 1].minLevel);

            var cls = "chapter-node";
            if (!unlocked) cls += " locked";
            else if (current) cls += " current";
            else if (completed || state.level > ch.minLevel) cls += " completed";

            html += '<div class="' + cls + '">';
            html += '<div class="chapter-node__core' + (current ? " pulse" : "") + '">';
            html += '<span class="chapter-node__num">' + ch.id + '</span>';
            html += '</div>';
            html += '<div class="chapter-node__info">';
            html += '<h4>' + ch.name + '</h4>';
            html += '<p>' + (unlocked ? ch.desc : "Nível " + ch.minLevel + " necessário") + '</p>';
            html += '</div></div>';

            if (i < chapters.length - 1) {
                var lineActive = state.level >= chapters[i + 1].minLevel;
                html += '<div class="chapter-line' + (lineActive ? " active" : "") + '"></div>';
            }
        });

        html += '</div></div>';
        container.innerHTML = html;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
