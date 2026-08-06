(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var selectedAttribute = "strength";

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

    function attributeCard(state, key) {
        var definition = Arquimago.ATTRIBUTE_DEFINITIONS[key];
        var data = Arquimago.getAttributeProgress(state, key);
        var selected = selectedAttribute === key;
        return '<button type="button" class="attribute-card' + (selected ? " is-selected" : "") + '" data-attribute-key="' + key + '" style="--attribute-color:' + definition.color + '">' +
            '<span class="attribute-card__icon" aria-hidden="true">' + definition.icon + '</span>' +
            '<span class="attribute-card__body">' +
            '<span class="attribute-card__heading"><strong>' + definition.name + '</strong><em>Nível ' + data.level + '</em></span>' +
            '<span class="attribute-card__bar"><span style="width:' + data.percent + '%"></span></span>' +
            '<span class="attribute-card__progress">' + data.progress + ' / ' + data.required + ' ações</span>' +
            '</span>' +
            '<span class="attribute-card__chevron" aria-hidden="true">›</span>' +
            '</button>';
    }

    function attributeDetail(state, key) {
        var definition = Arquimago.ATTRIBUTE_DEFINITIONS[key];
        var data = Arquimago.getAttributeProgress(state, key);
        var entries = Arquimago.getMissionsForAttribute(key);
        var html = '<div class="panel attribute-detail" style="--attribute-color:' + definition.color + '">';
        html += '<div class="attribute-detail__header">';
        html += '<div class="attribute-detail__title"><span class="attribute-detail__icon">' + definition.icon + '</span><div><span class="section-label">Atributo</span><h2>' + definition.name + '</h2></div></div>';
        html += '<div class="attribute-detail__level">Nível <strong>' + data.level + '</strong></div>';
        html += '</div>';
        html += '<p class="attribute-detail__description">' + definition.description + '</p>';
        html += '<div class="attribute-detail__progress"><div class="attribute-detail__progress-head"><span>Próximo nível</span><strong>' + data.progress + ' / ' + data.required + '</strong></div><div class="attribute-detail__bar"><span style="width:' + data.percent + '%"></span></div><small>' + data.total + ' conclusões relacionadas no total</small></div>';
        html += '<div class="attribute-detail__missions"><div class="panel-header"><h3>Missões que contribuem</h3><span>+1 ação por conclusão</span></div>';
        if (!entries.length) {
            html += '<p class="attributes-empty">Nenhuma missão vinculada ainda.</p>';
        } else {
            entries.forEach(function (entry) {
                var mission = entry.mission;
                var count = Arquimago.getMissionCompletionCount(state, mission.id);
                html += '<div class="attribute-mission' + (isDone(state, entry) ? " is-done" : "") + '">';
                html += '<span class="mission-icon" aria-hidden="true">' + Arquimago.getMissionIcon(mission) + '</span>';
                html += '<div class="attribute-mission__body"><strong>' + escapeHtml(mission.name) + '</strong><span>' + escapeHtml(mission.desc || mission.name) + '</span></div>';
                html += '<div class="attribute-mission__count"><strong>' + count + 'x</strong><span>concluída</span></div>';
                html += '</div>';
            });
        }
        html += '</div></div>';
        return html;
    }

    Arquimago.renderAttributes = function () {
        var container = document.getElementById("attributes");
        if (!container || !Arquimago.state) return;
        if (!Arquimago.ATTRIBUTE_DEFINITIONS[selectedAttribute]) selectedAttribute = "strength";

        var state = Arquimago.state;
        var html = '<div class="attributes-page">';
        html += '<div class="attributes-page__intro"><span class="section-label">Crescimento real</span><h1>Atributos</h1><p>Cada hábito concluído fortalece uma parte diferente do seu personagem. Este progresso é independente do XP e do nível geral.</p></div>';
        html += '<div class="attributes-grid">';
        Object.keys(Arquimago.ATTRIBUTE_DEFINITIONS).forEach(function (key) {
            html += attributeCard(state, key);
        });
        html += '</div>';
        html += attributeDetail(state, selectedAttribute);
        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll("[data-attribute-key]").forEach(function (card) {
            card.addEventListener("click", function () {
                Arquimago.playClick();
                selectedAttribute = card.getAttribute("data-attribute-key");
                Arquimago.renderAttributes();
            });
        });
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
