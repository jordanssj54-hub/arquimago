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

    function dateLabel(key) {
        var parts = String(key || "").split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        var day = parseInt(parts[2], 10);
        if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return key || "Dia";
        return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    }

    Arquimago.renderProfile = function () {
        var container = document.getElementById("profile");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var bestRank = state.bestDailyRankPercent > 0 ? "Rank " + state.bestDailyRank : "—";
        var trophies = state.bossTrophies || [];
        var monthly = Arquimago.getMonthlyProgress ? Arquimago.getMonthlyProgress(state) : { month: "", earned: 0, available: 0, goal: 0, percent: 0, isMet: false };
        var monthlyHistory = (state.monthlyHistory || []).slice().reverse();
        var dailyHistory = (state.dailyHistory || []).slice().reverse().slice(0, 30);

        var html = '<div class="profile-page">';
        html += '<div class="profile-banner">';
        html += '<div class="profile-avatar-wrap"><div class="profile-avatar">' + Arquimago.getPlayerAvatar() + '</div><button class="avatar-edit-btn" id="avatarUploadBtn">Alterar foto</button><input type="file" id="avatarFileInput" accept="image/*" hidden></div>';
        html += '<div class="profile-banner-info"><span class="section-label">Perfil do Arquimago</span><h2 data-player-name>' + escapeHtml(Arquimago.getDisplayName()) + '</h2><span class="profile-title">Classe ' + escapeHtml(Arquimago.getCharacterClass()) + '</span><p>As estatísticas registram a jornada. Os troféus lembram o que você foi capaz de enfrentar.</p></div>';
        html += '</div>';

        html += '<div class="panel profile-summary-panel"><div class="panel-header"><h3>Estatísticas da Jornada</h3><span>Classe ' + escapeHtml(Arquimago.getCharacterClass()) + '</span></div><div class="statistics-grid">';
        html += statCard(state.streak + " dias", "Sequência");
        html += statCard(trophies.length, "Chefes derrotados");
        html += statCard(Arquimago.formatNumber(state.missionsCompleted), "Missões concluídas");
        html += statCard(bestRank, "Melhor Rank");
        html += statCard(state.daysUsingApp, "Dias utilizando");
        html += statCard(Arquimago.getCharacterClass(), "Classe atual");
        html += '</div></div>';

        html += '<div class="profile-grid">';
        html += '<div class="panel"><div class="panel-header"><h3>Personagem</h3></div><div class="profile-edit">';
        html += '<div class="profile-edit__row"><label for="playerClassText">Classe</label><strong class="profile-edit__class" id="playerClassText">' + escapeHtml(Arquimago.getCharacterClass()) + '</strong></div>';
        html += '<div class="profile-edit__row"><label for="playerNameInput">Nome do Personagem</label><input type="text" id="playerNameInput" maxlength="30" autocomplete="off" spellcheck="false" value="' + escapeHtml(Arquimago.getCharacterName()) + '" placeholder="' + escapeHtml(Arquimago.getCharacterClass()) + '"><p class="profile-edit__hint">Sem nome definido, apenas a classe é exibida.</p></div>';
        html += '<button type="button" class="btn-primary compact" id="savePlayerName">Salvar</button></div></div>';

        html += '<div class="panel"><div class="panel-header"><h3>Progressão</h3><span>Meta Arcana</span></div><div class="profile-stats">';
        html += '<div class="profile-stat"><span>XP mensal</span><strong>' + Arquimago.formatNumber(monthly.earned) + ' / ' + Arquimago.formatNumber(monthly.goal) + '</strong></div>';
        html += '<div class="profile-stat"><span>XP total</span><strong>' + Arquimago.formatNumber(state.totalXP) + '</strong></div>';
        html += '<div class="profile-stat"><span>Classe</span><strong>' + escapeHtml(Arquimago.getCharacterClass()) + '</strong></div>';
        html += '<div class="profile-stat"><span>Tempo jogado</span><strong>' + Arquimago.formatTime(state.playTimeSeconds) + '</strong></div>';
        html += '</div></div>';

        html += '<div class="panel profile-trophies"><div class="panel-header"><h3>Troféus dos Bosses</h3><span>' + trophies.length + ' conquistados</span></div>';
        if (!trophies.length) {
            html += '<p class="profile-empty">Nenhum Boss foi derrotado ainda. Cada semana traz uma nova oportunidade.</p>';
        } else {
            html += '<div class="trophy-list">';
            trophies.slice().reverse().forEach(function (trophy) {
                html += '<div class="trophy-item"><span class="trophy-item__icon">🏆</span><div><strong>' + escapeHtml(trophy.name) + '</strong><small>' + escapeHtml(trophy.bossName) + ' · semana de ' + escapeHtml(trophy.week) + '</small></div></div>';
            });
            html += '</div>';
        }
        html += '</div>';

        html += '<div class="panel"><div class="panel-header"><h3>Conquistas</h3><span>' + state.achievements.length + ' desbloqueadas</span></div><div class="achievements">';
        Arquimago.ACHIEVEMENTS.forEach(function (achievement) {
            var unlocked = state.achievements.indexOf(achievement.id) !== -1;
            html += '<div class="achievement ' + (unlocked ? "unlocked" : "locked") + '"><div class="achievement-icon">' + (unlocked ? "◆" : "◇") + '</div><div><h4>' + escapeHtml(achievement.name) + '</h4><p>' + escapeHtml(achievement.desc) + '</p></div></div>';
        });
        html += '</div></div></div></div>';

        html += '<div class="panel profile-monthly-panel"><div class="panel-header"><div><h3>Meta Arcana</h3><span>' + escapeHtml(monthLabel(monthly.month)) + '</span></div><strong class="profile-monthly-class">Classe: ' + escapeHtml(Arquimago.getCharacterClass()) + '</strong></div>';
        html += '<div class="profile-monthly-summary"><strong>' + Arquimago.formatNumber(monthly.earned) + ' / ' + Arquimago.formatNumber(monthly.available) + ' XP</strong><span>' + monthly.percent + '% do total disponível · meta em 60%</span><div class="profile-monthly-bar"><span style="width:' + monthly.percent + '%"></span><i style="left:60%"></i></div><small>' + (monthly.isMet ? 'Meta atingida. A classe sobe no fechamento do ciclo.' : 'Faltam ' + Arquimago.formatNumber(Math.max(0, monthly.goal - monthly.earned)) + ' XP para atingir a meta.') + '</small></div>';
        html += '<div class="profile-monthly-history"><h4>Histórico mensal</h4>';
        if (!monthlyHistory.length) {
            html += '<p class="profile-empty">O primeiro ciclo será arquivado quando o mês terminar.</p>';
        } else {
            monthlyHistory.forEach(function (entry) {
                html += '<div class="profile-monthly-row' + (entry.goalMet ? ' is-met' : '') + '"><span><strong>' + escapeHtml(monthLabel(entry.month)) + '</strong><small>Classe: ' + escapeHtml(entry.class || 'D') + '</small></span><b>' + Arquimago.formatNumber(entry.xp) + ' / ' + Arquimago.formatNumber(entry.totalAvailableXP) + ' XP</b><em>' + entry.percentage + '% · ' + (entry.goalMet ? 'Meta atingida' : 'Meta não atingida') + '</em></div>';
            });
        }
        html += '</div></div>';

        html += '<div class="panel profile-daily-panel"><div class="panel-header"><div><h3>Registro diário</h3><span>Os últimos 30 dias</span></div><strong class="profile-monthly-class">XP permanente preservado</strong></div>';
        if (!dailyHistory.length) {
            html += '<p class="profile-empty">O primeiro dia será arquivado quando o calendário virar.</p>';
        } else {
            html += '<div class="profile-daily-history">';
            dailyHistory.forEach(function (entry) {
                html += '<div class="profile-daily-row"><span><strong>' + escapeHtml(dateLabel(entry.date)) + '</strong><small>' + (entry.completed || 0) + ' missões concluídas</small></span><b>+' + Arquimago.formatNumber(entry.xp || 0) + ' XP</b><em>' + (entry.percentage || 0) + '% do dia</em></div>';
            });
            html += '</div>';
        }
        html += '</div>';

        container.innerHTML = html;
        bindAvatarUpload();
        bindPlayerName();
    };

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
            if (event.key !== "Enter") return;
            event.preventDefault();
            Arquimago.playClick();
            save();
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
