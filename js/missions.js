(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var ATTR_NAMES = {
        discipline: "Disciplina",
        wisdom: "Sabedoria",
        determination: "Determinação",
        consistency: "Constância"
    };

    var FREQ_MAP = {
        main: { label: "Principal", css: "special" },
        daily: { label: "Diária", css: "daily" },
        weekly: { label: "Semanal", css: "weekly" },
        habits: { label: "Hábito", css: "habit" }
    };

    function markCompleted(state, mission, type) {
        var arr = getDoneArray(state, type);
        if (arr && arr.indexOf(mission.id) === -1) {
            arr.push(mission.id);
        }
    }

    function unmarkCompleted(state, mission, type) {
        var arr = getDoneArray(state, type);
        if (arr) {
            var idx = arr.indexOf(mission.id);
            if (idx !== -1) arr.splice(idx, 1);
        }
    }

    function getDoneArray(state, type) {
        if (type === "main") return state.completedIds;
        if (type === "daily") return state.dailyDone;
        if (type === "weekly") return state.weeklyDone;
        if (type === "habits") return state.habitsDone;
        return null;
    }

    function isDone(state, mission, type) {
        var arr = getDoneArray(state, type);
        return arr ? arr.indexOf(mission.id) !== -1 : false;
    }

    Arquimago.completeMission = function (mission, type, btn) {
        var state = Arquimago.state;
        if (isDone(state, mission, type)) return;

        markCompleted(state, mission, type);
        state.missionsCompleted += 1;

        if (mission.attribute && state.attributes[mission.attribute] !== undefined) {
            state.attributes[mission.attribute] = Math.min(100, state.attributes[mission.attribute] + 3);
        }

        Arquimago.updateStreak(state);
        Arquimago.checkAchievements(state);
        Arquimago.playMissionComplete();

        if (btn) {
            var el = btn.closest(".mission-item") || btn.closest(".mission-card");
            if (el) el.classList.add("completing");
        }

        setTimeout(function () {
            Arquimago.gainXP(mission.xp, btn);
            Arquimago.saveState(state);
        }, 300);
    };

    Arquimago.getNextMainMission = function () {
        var state = Arquimago.state;
        var mains = Arquimago.MISSIONS.main;
        for (var i = 0; i < mains.length; i++) {
            if (state.completedIds.indexOf(mains[i].id) === -1) return mains[i];
        }
        return mains[mains.length - 1];
    };

    Arquimago.renderMissions = function () {
        var container = document.getElementById("missions");
        if (!container) return;
        var state = Arquimago.state;

        var sections = [
            { key: "main", label: "Missão Principal", sub: "Avance na história do recomeço." },
            { key: "daily", label: "Missões Diárias", sub: "Renovadas a cada amanhecer." },
            { key: "weekly", label: "Missões Semanais", sub: "Desafios de maior escopo." },
            { key: "habits", label: "Hábitos", sub: "Rituais que forjam o Arquimago." }
        ];

        var html = '<div class="missions-page">';

        sections.forEach(function (sec) {
            var list = Arquimago.MISSIONS[sec.key];
            var freq = FREQ_MAP[sec.key];

            html += '<div class="missions-section">';
            html += '<h2 class="missions-section__title">' + sec.label + '</h2>';
            html += '<p class="missions-section__sub">' + sec.sub + '</p>';
            html += '<div class="missions-list">';

            list.forEach(function (m) {
                var done = isDone(state, m, sec.key);
                var attrName = m.attribute ? (ATTR_NAMES[m.attribute] || m.attribute) : "";

                html += '<div class="mission-item' + (done ? " completed" : "") + '" data-id="' + m.id + '" data-type="' + sec.key + '">';

                html += '<label class="mission-check" title="Marcar missão">';
                html += '<input type="checkbox"' + (done ? " checked" : "") + '>';
                html += '<span class="mission-check__box"></span>';
                html += '</label>';

                html += '<div class="mission-item__body">';
                html += '<div class="mission-item__header">';
                html += '<span class="mission-item__name">' + m.name + '</span>';
                html += '<span class="mission-item__freq mission-item__freq--' + freq.css + '">' + freq.label + '</span>';
                html += '</div>';
                html += '<p class="mission-item__desc">' + m.desc + '</p>';
                html += '<div class="mission-item__meta">';
                if (m.objective) {
                    html += '<span class="mission-item__objective">&#127919; ' + m.objective + '</span>';
                }
                if (attrName) {
                    html += '<span class="mission-item__reward">&#127942; +' + '3 ' + attrName + '</span>';
                }
                html += '</div>';
                html += '</div>';

                html += '<div class="mission-item__aside">';
                html += '<span class="mission-item__xp">+' + m.xp + ' XP</span>';
                html += '</div>';

                html += '</div>';
            });

            html += '</div></div>';
        });

        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll(".mission-check input").forEach(function (input) {
            input.addEventListener("change", function () {
                var itemEl = input.closest(".mission-item");
                var type = itemEl.dataset.type;
                var id = itemEl.dataset.id;
                var mission = Arquimago.MISSIONS[type].find(function (m) { return m.id === id; });
                if (!mission) return;

                var state = Arquimago.state;

                if (input.checked) {
                    if (isDone(state, mission, type)) return;
                    Arquimago.playClick();
                    markCompleted(state, mission, type);
                    state.missionsCompleted += 1;
                    if (mission.attribute && state.attributes[mission.attribute] !== undefined) {
                        state.attributes[mission.attribute] = Math.min(100, state.attributes[mission.attribute] + 3);
                    }
                    Arquimago.updateStreak(state);
                    Arquimago.checkAchievements(state);
                    itemEl.classList.add("completed");
                    setTimeout(function () {
                        itemEl.classList.add("completing");
                    }, 10);
                    Arquimago.playMissionComplete();
                    setTimeout(function () {
                        Arquimago.gainXP(mission.xp, input);
                    }, 350);
                } else {
                    if (!isDone(state, mission, type)) return;
                    Arquimago.playClick();
                    unmarkCompleted(state, mission, type);
                    state.missionsCompleted = Math.max(0, state.missionsCompleted - 1);
                    if (mission.attribute && state.attributes[mission.attribute] !== undefined) {
                        state.attributes[mission.attribute] = Math.max(0, state.attributes[mission.attribute] - 3);
                    }
                    itemEl.classList.remove("completed", "completing");
                }

                Arquimago.saveState(state);
            });
        });
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
