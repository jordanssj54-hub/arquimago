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
        html += '<div class="profile-avatar-wrap">';
        html += '<div class="profile-avatar">' + Arquimago.getPlayerAvatar() + '</div>';
        html += '<button class="avatar-edit-btn" id="avatarUploadBtn">Alterar foto</button>';
        html += '<input type="file" id="avatarFileInput" accept="image/*" hidden>';
        html += '</div>';
        html += '<div class="profile-banner-info">';
        html += '<h2 data-player-name>' + Arquimago.getDisplayName() + '</h2>';
        html += '<span class="profile-title">' + state.title + '</span>';
        html += '<p>"O homem que caiu não existe mais. O Arquimago nasceu do recomeço."</p>';
        html += '</div></div>';

        html += '<div class="profile-grid">';

        html += '<div class="panel"><div class="panel-header"><h3>Personagem</h3></div>';
        html += '<div class="profile-edit">';
        html += '<div class="profile-edit__row">';
        html += '<label for="playerClassText">Classe</label>';
        html += '<strong class="profile-edit__class" id="playerClassText">' + Arquimago.getCharacterClass() + '</strong>';
        html += '</div>';
        html += '<div class="profile-edit__row">';
        html += '<label for="playerNameInput">Nome do Personagem</label>';
        html += '<input type="text" id="playerNameInput" maxlength="30" autocomplete="off" spellcheck="false" value="' + escapeHtmlName(Arquimago.getCharacterName()) + '" placeholder="' + Arquimago.getCharacterClass() + '">';
        html += '<p class="profile-edit__hint">Sem nome definido, apenas a classe é exibida.</p>';
        html += '</div>';
        html += '<button type="button" class="btn-primary compact" id="savePlayerName">Salvar</button>';
        html += '</div></div>';

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

        bindAvatarUpload();
        bindPlayerName();
    };

    function escapeHtmlName(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
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

        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                Arquimago.playClick();
                save();
            }
        });
    }

    function bindAvatarUpload() {
        var btn = document.getElementById("avatarUploadBtn");
        var input = document.getElementById("avatarFileInput");
        if (!btn || !input) return;

        btn.addEventListener("click", function () {
            input.click();
        });

        input.addEventListener("change", function () {
            var file = input.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (e) {
                Arquimago.state.customAvatar = e.target.result;
                try {
                    Arquimago.saveState(Arquimago.state);
                } catch (err) {
                    if (err.name === "QuotaExceededError") {
                        alert("Imagem muito grande. Tente uma com resolução menor.");
                    }
                }
                Arquimago.refreshPlayerPhotos();
            };
            reader.readAsDataURL(file);
            input.value = "";
        });
    }

    function statRow(label, value) {
        return '<div class="profile-stat"><span>' + label + '</span><strong>' + value + '</strong></div>';
    }

    function statCard(value, label) {
        return '<div class="statistics-card"><h4>' + value + '</h4><span>' + label + '</span></div>';
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
