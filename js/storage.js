(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    function todayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    function weekKey() {
        var d = new Date();
        var day = d.getDay();
        var diff = d.getDate() - day + (day === 0 ? -6 : 1);
        var monday = new Date(d.setDate(diff));
        return monday.toISOString().slice(0, 10);
    }

    Arquimago.loadState = function () {
        var base = JSON.parse(JSON.stringify(Arquimago.DEFAULT_STATE));
        try {
            var raw = localStorage.getItem(Arquimago.STORAGE_KEY);
            if (raw) {
                Object.assign(base, JSON.parse(raw));
            }
        } catch (e) {}
        return Arquimago.syncDates(base);
    };

    Arquimago.saveState = function (state) {
        try {
            localStorage.setItem(Arquimago.STORAGE_KEY, JSON.stringify(state));
        } catch (e) {}
    };

    Arquimago.syncDates = function (state) {
        var today = todayKey();
        var week = weekKey();

        if (state.dailyDate !== today) {
            state.dailyDate = today;
            state.dailyDone = [];
            state.habitsDone = [];
        }

        if (state.weeklyDate !== week) {
            state.weeklyDate = week;
            state.weeklyDone = [];
        }

        return state;
    };

    Arquimago.updateStreak = function (state) {
        var today = todayKey();
        if (state.lastActiveDate === today) return state;

        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yKey = yesterday.toISOString().slice(0, 10);

        if (state.lastActiveDate === yKey) {
            state.streak += 1;
        } else if (state.lastActiveDate !== today) {
            state.streak = 1;
        }

        state.lastActiveDate = today;
        return state;
    };

    Arquimago.checkAchievements = function (state) {
        Arquimago.ACHIEVEMENTS.forEach(function (a) {
            if (state.achievements.indexOf(a.id) === -1 && a.condition(state)) {
                state.achievements.push(a.id);
            }
        });
        return state;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
