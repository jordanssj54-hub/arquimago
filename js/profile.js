(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.formatTime = function (seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return h + "h " + m + "m";
        return m + "m";
    };

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function statCard(value, label) {
        return '<div class="statistics-card"><h4>' + escapeHtml(value) + '</h4><span>' + label + '</span></div>';
    }

    function monthLabel(key) {
        var parts = String(key || "").split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        if (!isFinite(year) || !isFinite(month)) return "Mês atual";
        return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }

    function attributeCardCompact(state, key) {
        var definition = Arquimago.ATTRIBUTE_DEFINITIONS[key];
        var data = Arquimago.getAttributeProgress(state, key);
        return '<div class="profile-attribute-card" data-attribute-key="' + key + '" style="--attribute-color:' + definition.color + '">' +
            '<span class="profile-attribute-card__icon">' + definition.icon + '</span>' +
            '<span class="profile-attribute-card__info">' +
            '<strong>' + definition.name + '</strong>' +
            '<span>Nv. ' + data.level + ' · ' + data.progress + '/' + data.required + '</span>' +
            '</span>' +
            '<span class="profile-attribute-card__bar"><span style="width:' + data.percent + '%"></span></span>' +
            '</div>';
    }

    function attributeDetailPanel(state, key) {
        var definition = Arquimago.ATTRIBUTE_DEFINITIONS[key];
        var data = Arquimago.getAttributeProgress(state, key);
        var entries = Arquimago.getMissionsForAttribute ? Arquimago.getMissionsForAttribute(key) : [];
        var html = '<div class="profile-attribute-detail" style="--attribute-color:' + definition.color + '">';
        html += '<div class="profile-attribute-detail__header">';
        html += '<span class="profile-attribute-detail__icon">' + definition.icon + '</span>';
        html += '<div><strong>' + definition.name + '</strong><span>Nível ' + data.level + '</span></div>';
        html += '</div>';
        html += '<p class="profile-attribute-detail__desc">' + definition.description + '</p>';
        html += '<div class="profile-attribute-detail__progress">';
        html += '<div class="profile-attribute-detail__bar"><span style="width:' + data.percent + '%"></span></div>';
        html += '<span>' + data.progress + ' / ' + data.required + ' · ' + data.total + ' total</span>';
        html += '</div>';
        if (entries.length) {
            html += '<div class="profile-attribute-detail__missions">';
            entries.forEach(function (entry) {
                var mission = entry.mission;
                var count = Arquimago.getMissionCompletionCount ? Arquimago.getMissionCompletionCount(state, mission.id) : 0;
                html += '<div class="profile-attribute-mission">';
                html += '<span>' + Arquimago.getMissionIcon(mission) + '</span>';
                html += '<strong>' + escapeHtml(mission.name) + '</strong>';
                html += '<em>' + count + 'x</em>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    Arquimago.renderProfile = function () {
        var container = document.getElementById("profile");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var trophies = state.bossTrophies || [];
        var monthly = Arquimago.getMonthlyProgress ? Arquimago.getMonthlyProgress(state) : { month: "", earned: 0, available: 0, goal: 0, percent: 0, isMet: false };
        var aboutMe = state.aboutMe || "";

        var html = '<div class="profile-page">';

        html += '<div class="profile-banner">';
        html += '<div class="profile-avatar-wrap"><div class="profile-avatar">' + Arquimago.getPlayerAvatar() + '</div><button class="avatar-edit-btn" id="avatarUploadBtn">Alterar foto</button><input type="file" id="avatarFileInput" accept="image/*" hidden></div>';
        html += '<div class="profile-banner-info"><span class="section-label">Perfil</span><h2 data-player-name>' + escapeHtml(Arquimago.getDisplayName()) + '</h2><span class="profile-title">Classe ' + escapeHtml(Arquimago.getCharacterClass()) + '</span></div>';
        html += '</div>';

        html += '<div class="panel profile-summary-panel"><div class="panel-header"><h3>Estatísticas</h3></div><div class="statistics-grid">';
        html += statCard(state.streak + " dias", "Sequência");
        html += statCard(Arquimago.formatNumber(state.missionsCompleted), "Missões");
        html += statCard(Arquimago.getCharacterClass(), "Classe");
        html += statCard(state.daysUsingApp + " dias", "Utilizando");
        html += '</div></div>';

        html += '<div class="panel"><div class="panel-header"><h3>Meus Atributos</h3></div><div class="profile-attributes">';
        Object.keys(Arquimago.ATTRIBUTE_DEFINITIONS).forEach(function (key) {
            html += attributeCardCompact(state, key);
        });
        html += '</div>';
        html += '<div id="profileAttributeDetail"></div>';
        html += '</div>';

        html += '<div class="panel"><div class="panel-header"><h3>Progressão</h3></div><div class="profile-stats">';
        html += '<div class="profile-stat"><span>XP mensal</span><strong>' + Arquimago.formatNumber(monthly.earned) + ' / ' + Arquimago.formatNumber(monthly.goal) + '</strong></div>';
        html += '<div class="profile-stat"><span>XP total</span><strong>' + Arquimago.formatNumber(state.totalXP) + '</strong></div>';
        html += '<div class="profile-stat"><span>Tempo jogado</span><strong>' + Arquimago.formatTime(state.playTimeSeconds) + '</strong></div>';
        html += '</div></div>';

        html += '<div class="panel profile-about-panel"><div class="panel-header"><h3>Sobre mim</h3></div>';
        html += '<div class="profile-about">';
        html += '<textarea id="aboutMeInput" class="profile-about__input" placeholder="Quem é você? O que te motiva? Escreva sobre si, seus objetivos ou sua jornada..." rows="3" maxlength="300">' + escapeHtml(aboutMe) + '</textarea>';
        html += '<div class="profile-about__footer"><span id="aboutMeCount">' + aboutMe.length + '/300</span><button type="button" class="btn-primary compact" id="saveAboutMe">Salvar</button></div>';
        html += '</div></div>';

        html += '<div class="panel profile-monthly-panel"><div class="panel-header"><div><h3>Meta Arcana</h3><span>' + escapeHtml(monthLabel(monthly.month)) + '</span></div></div>';
        html += '<div class="profile-monthly-summary"><strong>' + Arquimago.formatNumber(monthly.earned) + ' / ' + Arquimago.formatNumber(monthly.available) + ' XP</strong><span>' + monthly.percent + '% do total disponível · meta em 60%</span><div class="profile-monthly-bar"><span style="width:' + monthly.percent + '%"></span><i style="left:60%"></i></div></div>';
        html += '</div>';

        if (trophies.length) {
            html += '<div class="panel profile-trophies"><div class="panel-header"><h3>Troféus</h3><span>' + trophies.length + '</span></div>';
            html += '<div class="trophy-list">';
            trophies.slice().reverse().forEach(function (trophy) {
                html += '<div class="trophy-item"><span class="trophy-item__icon">🏆</span><div><strong>' + escapeHtml(trophy.name) + '</strong><small>' + escapeHtml(trophy.bossName) + '</small></div></div>';
            });
            html += '</div></div>';
        }

        html += '</div>';

        container.innerHTML = html;
        bindAvatarUpload();
        bindPlayerName();
        bindAboutMe();
        bindAttributeCards();
    };

    function bindAboutMe() {
        var input = document.getElementById("aboutMeInput");
        var btn = document.getElementById("saveAboutMe");
        var count = document.getElementById("aboutMeCount");
        if (!input) return;

        input.addEventListener("input", function () {
            if (count) count.textContent = input.value.length + "/300";
        });

        if (btn) btn.addEventListener("click", function () {
            Arquimago.playClick();
            var text = String(input.value || "").trim();
            Arquimago.state.aboutMe = text;
            Arquimago.saveState(Arquimago.state);
            Arquimago.showNotification(text ? "Salvo!" : "Texto removido", "xp");
        });
    }

    function bindAttributeCards() {
        var detail = document.getElementById("profileAttributeDetail");
        if (!detail) return;

        document.querySelectorAll("[data-attribute-key]").forEach(function (card) {
            card.addEventListener("click", function () {
                Arquimago.playClick();
                var key = card.getAttribute("data-attribute-key");
                detail.innerHTML = attributeDetailPanel(Arquimago.state, key);
                detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
            });
        });
    }

    function bindPlayerName() {
        var input = document.getElementById("playerNameInput");
        var btn = document.getElementById("savePlayerName");
        if (!input || !btn) return;

        function save() {
            var name = String(input.value || "").trim();
            Arquimago.state.name = name;
            Arquimago.saveState(Arquimago.state);
            Arquimago.updatePlayerName();
            Arquimago.showNotification(name ? "Nome atualizado: " + name : "Nome removido", "xp");
        }

        btn.addEventListener("click", function () {
            Arquimago.playClick();
            save();
        });
        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                Arquimago.playClick();
                save();
            }
        });
    }

    function bindAvatarUpload() {
        var btn = document.getElementById("avatarUploadBtn");
        var input = document.getElementById("avatarFileInput");
        if (!btn || !input) return;

        btn.addEventListener("click", function () { input.click(); });
        input.addEventListener("change", function () {
            var file = input.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (event) {
                Arquimago.state.customAvatar = event.target.result;
                try {
                    Arquimago.saveState(Arquimago.state);
                } catch (error) {
                    if (error.name === "QuotaExceededError") alert("Imagem muito grande. Tente uma com resolução menor.");
                }
                Arquimago.refreshPlayerPhotos();
            };
            reader.readAsDataURL(file);
            input.value = "";
        });
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
