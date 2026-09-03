(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function bossCard(boss, state) {
        var trophies = state.bossTrophies || [];
        var defeated = trophies.some(function (t) { return t.bossId === boss.id; });
        var hp = boss.maxHp;
        var percent = defeated ? 0 : 100;
        return '<button type="button" class="boss-card' + (defeated ? " is-defeated" : "") + '" data-boss-id="' + boss.id + '">' +
            '<span class="boss-card__image"><img src="' + escapeHtml(boss.image) + '" alt="' + escapeHtml(boss.name) + '" loading="lazy"></span>' +
            '<span class="boss-card__info">' +
            '<strong>' + escapeHtml(boss.name) + '</strong>' +
            '<span>' + (defeated ? "Derrotado" : hp + " HP") + '</span>' +
            '</span>' +
            '<span class="boss-card__chevron" aria-hidden="true">›</span>' +
            '</button>';
    }

    function bossDetail(boss, state) {
        var trophies = state.bossTrophies || [];
        var bossTrophies = trophies.filter(function (t) { return t.bossId === boss.id; });
        var defeated = bossTrophies.length > 0;
        var weaknesses = (boss.weaknesses || []).map(function (id) {
            var mission = Arquimago.findMissionById ? Arquimago.findMissionById(id) : null;
            return mission ? mission.name : id;
        });

        var html = '<div class="boss-detail">';
        html += '<button type="button" class="boss-detail__back" id="bossBack" aria-label="Voltar">‹ Missões</button>';
        html += '<div class="boss-detail__hero">';
        html += '<img class="boss-detail__image" src="' + escapeHtml(boss.image) + '" alt="' + escapeHtml(boss.name) + '">';
        html += '<div class="boss-detail__overlay"></div>';
        html += '<div class="boss-detail__info">';
        html += '<span class="boss-detail__icon">' + boss.icon + '</span>';
        html += '<h2>' + escapeHtml(boss.name) + '</h2>';
        html += '<p>' + escapeHtml(boss.description) + '</p>';
        html += '</div>';
        html += '</div>';

        html += '<div class="boss-detail__stats">';
        html += '<div class="boss-detail__stat"><span>HP</span><strong>' + boss.maxHp + '</strong></div>';
        html += '<div class="boss-detail__stat"><span>Status</span><strong>' + (defeated ? "Derrotado" : "Ativo") + '</strong></div>';
        html += '<div class="boss-detail__stat"><span>Troféus</span><strong>' + bossTrophies.length + '</strong></div>';
        html += '</div>';

        if (weaknesses.length) {
            html += '<div class="boss-detail__section">';
            html += '<h3>Fraquezas</h3>';
            html += '<div class="boss-detail__weaknesses">';
            weaknesses.forEach(function (name) {
                html += '<span class="boss-detail__weakness">' + escapeHtml(name) + '</span>';
            });
            html += '</div>';
            html += '</div>';
        }

        html += '<div class="boss-detail__section">';
        html += '<h3>Recompensa</h3>';
        html += '<p>' + escapeHtml(boss.reward) + '</p>';
        html += '</div>';

        if (bossTrophies.length) {
            html += '<div class="boss-detail__section">';
            html += '<h3>Troféus Conquistados</h3>';
            html += '<div class="boss-detail__trophies">';
            bossTrophies.forEach(function (trophy) {
                html += '<div class="boss-detail__trophy"><span>🏆</span><div><strong>' + escapeHtml(trophy.name) + '</strong><small>Semana de ' + escapeHtml(trophy.week) + '</small></div></div>';
            });
            html += '</div>';
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    Arquimago.renderBoss = function () {
        var container = document.getElementById("boss");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var bosses = Arquimago.BOSSES || [];
        var html = '<div class="boss-page">';
        html += '<div class="boss-page__header"><span class="section-label">Desafios</span><h1>Bosses</h1><p>Enfrente seus demônios internos. CadaBoss derrotado registra sua evolução.</p></div>';
        html += '<div class="boss-list">';
        bosses.forEach(function (boss) {
            html += bossCard(boss, state);
        });
        html += '</div></div>';

        container.innerHTML = html;

        container.querySelectorAll("[data-boss-id]").forEach(function (card) {
            card.addEventListener("click", function () {
                Arquimago.playClick();
                var bossId = card.getAttribute("data-boss-id");
                var boss = bosses.find(function (b) { return b.id === bossId; });
                if (!boss) return;
                container.innerHTML = bossDetail(boss, state);
                var backBtn = container.querySelector("#bossBack");
                if (backBtn) backBtn.addEventListener("click", function () {
                    Arquimago.playClick();
                    Arquimago.renderBoss();
                });
            });
        });
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
