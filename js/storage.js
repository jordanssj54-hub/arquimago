(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    function pad(value) {
        return String(value).padStart(2, "0");
    }

    function localDateKey(date) {
        date = date || new Date();
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    }

    function todayKey() {
        return localDateKey(new Date());
    }

    function monthKey(date) {
        date = date || new Date();
        return date.getFullYear() + "-" + pad(date.getMonth() + 1);
    }

    function businessDaysInMonth(key) {
        var parts = String(key || monthKey()).split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        if (!isFinite(year) || !isFinite(month) || month < 1 || month > 12) {
            return businessDaysInMonth(monthKey());
        }
        var total = 0;
        var days = new Date(year, month, 0).getDate();
        for (var day = 1; day <= days; day++) {
            var weekday = new Date(year, month - 1, day).getDay();
            if (weekday > 0 && weekday < 6) total++;
        }
        return total;
    }

    function weekKey() {
        var d = new Date();
        var day = d.getDay();
        var diff = d.getDate() - day + (day === 0 ? -6 : 1);
        var monday = new Date(d.setDate(diff));
        return localDateKey(monday);
    }

    Arquimago.getTodayKey = todayKey;
    Arquimago.getWeekKey = weekKey;
    Arquimago.getMonthKey = function () { return monthKey(new Date()); };
    Arquimago.getBusinessDaysInMonth = businessDaysInMonth;

    Arquimago.loadState = function () {
        var base = JSON.parse(JSON.stringify(Arquimago.DEFAULT_STATE));
        try {
            var raw = localStorage.getItem(Arquimago.STORAGE_KEY);
            if (raw) {
                Object.assign(base, JSON.parse(raw));
            }
        } catch (e) {}
        if (Arquimago.normalizeState) Arquimago.normalizeState(base);
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
        var month = monthKey(new Date());
        var previousDay = state.dailyDate;
        var previousMonth = state.monthlyKey;
        var dayChanged = !!previousDay && previousDay !== today;

        if (Arquimago.normalizeState) Arquimago.normalizeState(state);

        var monthlySync = Arquimago.syncMonthlyCycle ? Arquimago.syncMonthlyCycle(state, month) : { changed: false, changes: [] };

        if (dayChanged) archiveDailyCycle(state, previousDay);

        if (state.dailyDate !== today) {
            state.dailyDate = today;
            state.dailyXP = 0;
            state.dailyCompletedMissionIds = [];
            state.dailyDone = [];
            state.habitsDone = [];
            state.weeklyDone = [];
            state.completedIds = [];
            if (Arquimago.getTotalAvailableMissionXP) {
                state.dailyAvailableXP = Arquimago.getTotalAvailableMissionXP(state);
            }
        } else if (!state.dailyAvailableXP && Arquimago.getTotalAvailableMissionXP) {
            state.dailyAvailableXP = Arquimago.getTotalAvailableMissionXP(state);
        }

        if (state.weeklyDate !== week) {
            state.weeklyDate = week;
            state.weeklyDone = [];
            state.bossDamageEvents = [];
            if (Arquimago.createWeeklyBoss) state.weeklyBoss = Arquimago.createWeeklyBoss(week);
        } else if (Arquimago.ensureWeeklyBoss) {
            Arquimago.ensureWeeklyBoss(state, week);
        }

        if (state.lastUsageDate !== today) {
            state.lastUsageDate = today;
            state.daysUsingApp = Math.max(0, Number(state.daysUsingApp) || 0) + 1;
        }

        if (Arquimago.updateDailyRank) Arquimago.updateDailyRank(state);

        Arquimago.lastDateSync = {
            dayChanged: dayChanged,
            monthChanged: !!previousMonth && previousMonth !== month,
            monthlyInitialized: !previousMonth,
            monthlyChanges: monthlySync.changes || []
        };

        return state;
    };

    function currentDoneIds(state) {
        var ids = [];
        [state.completedIds, state.dailyDone, state.weeklyDone, state.habitsDone].forEach(function (list) {
            (list || []).forEach(function (id) {
                if (ids.indexOf(id) === -1) ids.push(id);
            });
        });
        return ids;
    }

    function archiveDailyCycle(state, date) {
        if (!date || !Array.isArray(state.dailyHistory)) return;
        if (state.dailyHistory.some(function (entry) { return entry.date === date; })) return;
        var ids = Array.isArray(state.dailyCompletedMissionIds) && state.dailyCompletedMissionIds.length ?
            state.dailyCompletedMissionIds.slice() : currentDoneIds(state);
        var available = Math.max(0, Number(state.dailyAvailableXP) || 0);
        var earned = Math.max(0, Number(state.dailyXP) || 0);
        state.dailyHistory.push({
            date: date,
            xp: earned,
            totalAvailableXP: available,
            completed: ids.length,
            completedMissionIds: ids,
            percentage: available > 0 ? Math.min(100, Math.round((earned / available) * 100)) : 0
        });
    }

    Arquimago.archiveDailyCycle = archiveDailyCycle;

    Arquimago.updateStreak = function (state) {
        var today = todayKey();
        if (state.lastActiveDate === today) return state;

        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yKey = localDateKey(yesterday);

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
