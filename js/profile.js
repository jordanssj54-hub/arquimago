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

    var PROFILE_ATTRIBUTE_ICONS = {
        strength: "discipline.svg",
        spirit: "focus.svg",
        vitality: "vitality.svg",
        intelligence: "intelligence.svg"
    };

    function profileDateLabel(state) {
        var key = state && (state.lastUsageDate || state.lastActiveDate);
        var parts = String(key || "").split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        if (!isFinite(year) || !isFinite(month)) {
            var now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1;
        }
        return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }

    function formatProfileMoney(value) {
        var amount = Math.round((Number(value) || 0) * 100) / 100;
        return "R$ " + amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function resourcesObtained(state) {
        var total = 0;
        var transactions = state && state.financas && Array.isArray(state.financas.transacoes) ? state.financas.transacoes : [];
        transactions.forEach(function (transaction) {
            if (transaction.tipo === "entrada" || transaction.tipo === "guardado_entrada") {
                total += Math.max(0, Number(transaction.valor) || 0);
            }
        });
        return formatProfileMoney(total);
    }

    function profileAttributeIcon(key) {
        var file = PROFILE_ATTRIBUTE_ICONS[key];
        return file ? '<img src="assets/ui/profile-reference/' + file + '" alt="" aria-hidden="true">' : '';
    }

    function profileAvatarHtml(state) {
        if (state.customAvatar) {
            return '<div class="profile-reference-avatar profile-reference-avatar--custom">' + Arquimago.getPlayerAvatar() + '</div>';
        }
        return '<div class="profile-reference-avatar profile-reference-avatar--art"><img src="projeto/cardperfil.png" alt="Retrato do personagem" class="profile-reference-avatar-art"></div>';
    }

    function attributeCardReference(state, key) {
        var definition = Arquimago.ATTRIBUTE_DEFINITIONS[key];
        var data = Arquimago.getAttributeProgress(state, key);
        return '<button type="button" class="profile-reference-attribute" data-attribute-key="' + key + '" style="--attribute-color:' + definition.color + '">' +
            '<span class="profile-reference-attribute__icon">' + profileAttributeIcon(key) + '</span>' +
            '<strong>' + escapeHtml(definition.name) + '</strong>' +
            '<b>' + data.level + '</b>' +
            '<span class="profile-reference-attribute__bar"><i style="width:' + data.percent + '%"></i></span>' +
            '<small>' + data.progress + ' / ' + data.required + '</small>' +
            '</button>';
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

    function rankTrackHtml(current) {
        var ranks = ["D", "C", "B", "A", "S"];
        var files = { D: "rank_D", C: "rank_C", B: "rank_B", A: "rank_A", S: "rank_S" };
        return ranks.map(function (rank) {
            var active = rank === current;
            return '<div class="profile-reference-rank' + (active ? ' is-active' : '') + '">' +
                '<span><img src="assets/ranks/' + files[rank] + '.png" alt="Rank ' + rank + '"></span>' +
                '<strong>' + rank + '</strong>' + (active ? '<small>ATUAL</small>' : '') +
                '</div>';
        }).join('');
    }

    function achievementsHtml(state, trophies) {
        var definitions = Arquimago.ACHIEVEMENTS || [];
        var unlockedIds = state.achievements || [];
        var unlockedCount = definitions.filter(function (achievement) {
            return unlockedIds.indexOf(achievement.id) !== -1;
        }).length;
        var cards = definitions.slice(0, 4).map(function (achievement) {
            var unlocked = unlockedIds.indexOf(achievement.id) !== -1;
            return '<article class="profile-reference-achievement ' + (unlocked ? 'is-unlocked' : 'is-locked') + '">' +
                '<span class="profile-reference-achievement__icon" aria-hidden="true">' + (unlocked ? '✦' : '🔒') + '</span>' +
                '<strong>' + escapeHtml(achievement.name) + '</strong>' +
                '<small>' + escapeHtml(achievement.desc) + '</small>' +
                '</article>';
        }).join('');
        var trophyHtml = trophies.length ? '<div class="profile-reference-trophies"><strong>TROFÉUS</strong>' + trophies.slice().reverse().map(function (trophy) {
            return '<span><b aria-hidden="true">✦</b>' + escapeHtml(trophy.name) + '</span>';
        }).join('') + '</div>' : '';
        return '<section class="profile-reference-card profile-reference-achievements"><header class="profile-reference-card__header"><h2><span aria-hidden="true">✥</span> CONQUISTAS</h2><b>' + unlockedCount + ' / ' + definitions.length + '</b></header>' +
            '<div class="profile-reference-achievement-grid">' + (cards || '<p class="profile-reference-empty">Nenhuma conquista cadastrada.</p>') + '</div>' +
            '<div class="profile-reference-card__action">VER TODAS CONQUISTAS <span aria-hidden="true">›</span></div>' + trophyHtml + '</section>';
    }

    Arquimago.renderProfile = function () {
        var container = document.getElementById("profile");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        var trophies = state.bossTrophies || [];
        var monthly = Arquimago.getMonthlyProgress ? Arquimago.getMonthlyProgress(state) : { month: "", earned: 0, available: 0, goal: 0, percent: 0, isMet: false };
        var aboutMe = state.aboutMe || "";

        var currentClass = Arquimago.getCharacterClass();
        var nextRank = Arquimago.getNextRank ? Arquimago.getNextRank(currentClass) : null;
        var monthlyRemaining = Math.max(0, Number(monthly.goal) - Number(monthly.earned));
        var html = '<div class="profile-page profile-page--reference">';

        html += '<section class="profile-reference-hero">';
        html += '<img class="profile-reference-hero__symbol" src="projeto/simbol-perfil.png" alt="" aria-hidden="true"><div class="profile-avatar-wrap ' + (state.customAvatar ? 'profile-avatar-wrap--custom' : 'profile-avatar-wrap--art') + '">' + profileAvatarHtml(state) + '<button class="avatar-edit-btn" id="avatarUploadBtn" aria-label="Alterar foto">Alterar foto</button><input type="file" id="avatarFileInput" accept="image/*" hidden></div>';
        html += '<div class="profile-reference-hero__content"><div class="profile-reference-name"><h1 data-player-name>' + escapeHtml(Arquimago.getDisplayName()) + '</h1><button type="button" id="profileNameEditButton" aria-label="Editar nome">✎</button></div><span class="profile-reference-title">✧ ' + escapeHtml(state.title || "Arquimago iniciante") + '</span><div class="profile-name-editor" id="profileNameEditor" hidden><input id="playerNameInput" type="text" maxlength="40" value="' + escapeHtml(Arquimago.getCharacterName()) + '" aria-label="Nome do personagem"><button type="button" id="savePlayerName">Salvar</button></div><p>"A verdadeira magia não está em controlar os elementos, mas em dominar a si mesmo."</p><div class="profile-reference-hero__stats"><span><b aria-hidden="true">♙</b><small>JORNADA INICIADA EM</small><strong>' + escapeHtml(profileDateLabel(state)) + '</strong></span><i aria-hidden="true"></i><span><b aria-hidden="true">♙</b><small>MISSÕES CONCLUÍDAS</small><strong>' + Arquimago.formatNumber(state.missionsCompleted) + ' / ' + Arquimago.formatNumber(Arquimago.getAvailableMissionCount ? Arquimago.getAvailableMissionCount(state) : 0) + '</strong></span></div></div>';
        html += '</section>';

        html += '<section class="profile-reference-card profile-reference-about"><header class="profile-reference-card__header"><h2><span aria-hidden="true">♟</span> SOBRE VOCÊ</h2></header><div class="profile-reference-about__display' + (aboutMe ? '' : ' is-placeholder') + '" id="aboutMeDisplay">' + (aboutMe ? escapeHtml(aboutMe) : 'Escreva um pouco sobre você (opcional). Conte sua história, sua motivação e o que te trouxe até aqui.') + '</div><button type="button" class="profile-reference-card__edit" id="editAboutMe"><span aria-hidden="true">✎</span> EDITAR</button><div class="profile-about-editor" id="aboutMeEditor" hidden><textarea id="aboutMeInput" class="profile-about__input" placeholder="Quem é você? O que te motiva? Escreva sobre si, seus objetivos ou sua jornada..." rows="3" maxlength="300">' + escapeHtml(aboutMe) + '</textarea><div class="profile-about__footer"><span id="aboutMeCount">' + aboutMe.length + '/300</span><button type="button" class="btn-primary compact" id="saveAboutMe">Salvar</button></div></div></section>';

        html += '<section class="profile-reference-progression"><section class="profile-reference-ascension"><header class="profile-reference-section-heading"><h2><span aria-hidden="true">✧</span> SUA ASCENSÃO</h2></header><div class="profile-reference-rank-track">' + rankTrackHtml(currentClass) + '</div></section>';
        html += '<section class="profile-reference-card profile-reference-next-rank"><header><span>PRÓXIMO RANK</span><img src="assets/ranks/' + (nextRank ? nextRank.id : currentClass) + '.png" alt="" aria-hidden="true"></header><strong>RANK ' + escapeHtml(nextRank ? nextRank.id : currentClass) + '</strong><b>' + Arquimago.formatNumber(monthly.earned) + ' / ' + Arquimago.formatNumber(monthly.goal) + ' XP</b><div class="profile-reference-next-rank__bar"><i style="width:' + (monthly.goal ? Math.min(100, Math.round((monthly.earned / monthly.goal) * 100)) : 0) + '%"></i></div><p>' + (nextRank ? 'Faltam ' + Arquimago.formatNumber(monthlyRemaining) + ' XP para o Rank ' + nextRank.id : 'Rank máximo alcançado') + '</p></section></section>';

        html += '<section class="profile-reference-card profile-reference-attributes"><header class="profile-reference-card__header"><h2><span aria-hidden="true">✥</span> ATRIBUTOS</h2><p>Atributos evoluem a cada missão concluída. <b aria-label="Informações">i</b></p></header><div class="profile-reference-attribute-grid">';
        Object.keys(Arquimago.ATTRIBUTE_DEFINITIONS).forEach(function (key) {
            html += attributeCardReference(state, key);
        });
        html += '</div><div class="profile-reference-card__action profile-reference-attributes__history">VER HISTÓRICO DE ATRIBUTOS <span aria-hidden="true">›</span></div>';
        html += '<div id="profileAttributeDetail"></div>';
        html += '</section>';

        html += '<section class="profile-reference-lower"><section class="profile-reference-card profile-reference-statistics"><header class="profile-reference-card__header"><h2><span aria-hidden="true">♙</span> ESTATÍSTICAS</h2></header><div class="profile-reference-stat-list"><span><b aria-hidden="true">✥</b><label>Missões Concluídas</label><strong>' + Arquimago.formatNumber(state.missionsCompleted) + '</strong></span><span><b aria-hidden="true">✧</b><label>XP Total</label><strong>' + Arquimago.formatNumber(state.totalXP) + '</strong></span><span><b aria-hidden="true">◷</b><label>Sequência Atual</label><strong>' + state.streak + ' dias</strong></span><span><b aria-hidden="true">♞</b><label>Bosses Derrotados</label><strong>' + trophies.length + '</strong></span><span><b aria-hidden="true">◉</b><label>Recursos Obtidos</label><strong>' + resourcesObtained(state) + '</strong></span></div><div class="profile-reference-card__action">VER MAIS ESTATÍSTICAS <span aria-hidden="true">›</span></div></section>' + achievementsHtml(state, trophies) + '</section>';

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
        var editor = document.getElementById("aboutMeEditor");
        var editButton = document.getElementById("editAboutMe");
        if (!input) return;

        if (editButton && editor) editButton.addEventListener("click", function () {
            Arquimago.playClick();
            editor.hidden = false;
            editButton.hidden = true;
            input.focus();
        });

        input.addEventListener("input", function () {
            if (count) count.textContent = input.value.length + "/300";
        });

        if (btn) btn.addEventListener("click", function () {
            Arquimago.playClick();
            var text = String(input.value || "").trim();
            Arquimago.state.aboutMe = text;
            Arquimago.saveState(Arquimago.state);
            var display = document.getElementById("aboutMeDisplay");
            if (display) {
                display.textContent = text || "Escreva um pouco sobre você (opcional). Conte sua história, sua motivação e o que te trouxe até aqui.";
                display.classList.toggle("is-placeholder", !text);
            }
            if (editor) editor.hidden = true;
            if (editButton) editButton.hidden = false;
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
        var trigger = document.getElementById("profileNameEditButton");
        var editor = document.getElementById("profileNameEditor");
        if (!input || !btn) return;

        if (trigger && editor) trigger.addEventListener("click", function () {
            Arquimago.playClick();
            input.value = Arquimago.getCharacterName ? Arquimago.getCharacterName() : input.value;
            editor.hidden = false;
            input.focus();
            input.select();
        });

        function save() {
            var name = String(input.value || "").trim();
            Arquimago.state.name = name;
            Arquimago.saveState(Arquimago.state);
            Arquimago.updatePlayerName();
            if (editor) editor.hidden = true;
            if (trigger) trigger.focus();
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
                if (Arquimago.renderProfile) Arquimago.renderProfile();
            };
            reader.readAsDataURL(file);
            input.value = "";
        });
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
