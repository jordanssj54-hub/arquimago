(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.getXpToNext = function (state) {
        return Arquimago.xpRequiredForLevel(state.level);
    };

    Arquimago.getXpPercent = function (state) {
        var need = Arquimago.getXpToNext(state);
        return need <= 0 ? 100 : Math.min(100, (state.xp / need) * 100);
    };

    Arquimago.checkMissionLevelUp = function () {
        return false;
    };

    function addXPToCycleHistory(state, total, dateKey) {
        if (dateKey === state.dailyDate) {
            state.dailyXP = Math.max(0, (Number(state.dailyXP) || 0) + total);
        } else {
            var dayRecord = (state.dailyHistory || []).find(function (entry) { return entry.date === dateKey; });
            if (dayRecord) {
                dayRecord.xp = Math.max(0, (Number(dayRecord.xp) || 0) + total);
                if (dayRecord.totalAvailableXP > 0) {
                    dayRecord.percentage = Math.min(100, Math.round((dayRecord.xp / dayRecord.totalAvailableXP) * 100));
                }
            }
        }

        var month = String(dateKey || "").slice(0, 7);
        if (month === state.monthlyKey) {
            state.monthlyXP = Math.max(0, (Number(state.monthlyXP) || 0) + total);
        } else {
            var monthRecord = (state.monthlyHistory || []).find(function (entry) { return entry.month === month; });
            if (monthRecord) {
                monthRecord.xp = Math.max(0, (Number(monthRecord.xp) || 0) + total);
                monthRecord.percentage = monthRecord.totalAvailableXP > 0 ? Math.min(100, Math.round((monthRecord.xp / monthRecord.totalAvailableXP) * 100)) : 0;
                monthRecord.goalMet = monthRecord.xp >= monthRecord.goalXP;
            }
        }
    }

    Arquimago.gainXP = function (amount, anchorEl, completionDate, options) {
        var state = Arquimago.state;
        if (Arquimago.syncDates) Arquimago.syncDates(state);
        options = options || {};
        amount = Math.max(0, Number(amount) || 0);
        var bonus = Math.round(amount * Arquimago.getEventBonus());
        var total = amount + bonus;
        var dateKey = completionDate || Arquimago.getTodayKey();

        state.totalXP += total;
        state.xp += total;
        addXPToCycleHistory(state, total, dateKey);

        Arquimago.showXpPopup(total, anchorEl);
        if (!options.skipSound) Arquimago.playXp();
        Arquimago.showNotification("+" + total + " XP" + (bonus ? " (evento ativo)" : ""), "xp");

        Arquimago.saveState(state);
        if (!options.deferRefresh) Arquimago.refreshAll(true);

        return total;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
