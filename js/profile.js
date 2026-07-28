(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.formatTime = function (seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return h + "h " + m + "m";
        return m + "m";
    };

    Arquimago.renderProfile = function () {
        var container = document.getElementById("profile");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var chapter = Arquimago.getChapterForLevel(state.level);
        var progress = Math.min(100, Math.round((state.level / 20) * 100));

        var html = '<div class="profile-page">';
        html += '<div class="profile-banner">';
        html += '<div class="profile-avatar">' + Arquimago.getMageImage() + '</div>';
        html += '<div class="profile-banner-info">';
        html += '<h2>' + state.name + '</h2>';
        html += '<span class="profile-title">' + state.title + '</span>';
        html += '<p>"O homem que caiu não existe mais. O Arquimago nasceu do recomeço."</p>';
        html += '</div></div>';

        html += '<div class="profile-grid">';

        html += '<div class="panel"><div class="panel-header"><h3>Progressão</h3></div>';
        html += '<div class="profile-stats">';
        html += statRow("Nível", state.level);
        html += statRow("XP Atual", state.xp + " / " + Arquimago.getXpToNext(state));
        html += statRow("XP Total", Arquimago.formatNumber(state.totalXP));
        html += statRow("Capítulo", chapter.name);
        html += statRow("Dias Consecutivos", state.streak);
        html += statRow("Missões Concluídas", state.missionsCompleted);
        html += statRow("Tempo Jogado", Arquimago.formatTime(state.playTimeSeconds));
        html += '</div></div>';

        html += '<div class="panel"><div class="panel-header"><h3>Atributos</h3></div>';
        html += '<div class="attributes">';
        Object.keys(state.attributes).forEach(function (key) {
            var label = key.charAt(0).toUpperCase() + key.slice(1);
            if (key === "discipline") label = "Disciplina";
            if (key === "wisdom") label = "Sabedoria";
            if (key === "determination") label = "Determinação";
            if (key === "consistency") label = "Constância";
            html += '<div class="attribute"><label>' + label + '</label>';
            html += '<div class="attribute-bar"><div style="width:' + state.attributes[key] + '%"></div></div>';
            html += '<span class="attribute-value">' + state.attributes[key] + '%</span></div>';
        });
        html += '</div></div>';

        html += '<div class="panel"><div class="panel-header"><h3>Conquistas</h3></div>';
        html += '<div class="achievements">';
        Arquimago.ACHIEVEMENTS.forEach(function (a) {
            var unlocked = state.achievements.indexOf(a.id) !== -1;
            html += '<div class="achievement' + (unlocked ? " unlocked" : " locked") + '">';
            html += '<div class="achievement-icon">' + (unlocked ? "◆" : "◇") + '</div>';
            html += '<div><h4>' + a.name + '</h4><p>' + a.desc + '</p></div></div>';
        });
        html += '</div></div>';

        html += '<div class="panel"><div class="panel-header"><h3>Progresso Geral</h3></div>';
        html += '<div class="overall-progress">';
        html += '<div class="overall-progress__bar"><div style="width:' + progress + '%"></div></div>';
        html += '<span>' + progress + '% da jornada completa</span>';
        html += '</div>';
        html += '<div class="statistics-grid">';
        html += statCard(state.missionsCompleted, "Missões");
        html += statCard(state.unlockedSpells.length, "Magias");
        html += statCard(state.streak, "Sequência");
        html += statCard(state.level, "Nível");
        html += '</div></div>';

        html += '</div></div>';
        container.innerHTML = html;
    };

    function statRow(label, value) {
        return '<div class="profile-stat"><span>' + label + '</span><strong>' + value + '</strong></div>';
    }

    function statCard(value, label) {
        return '<div class="statistics-card"><h4>' + value + '</h4><span>' + label + '</span></div>';
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
