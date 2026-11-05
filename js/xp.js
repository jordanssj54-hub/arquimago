(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.getXpToNext = function (state) {
        state = state || Arquimago.state;
        if (Arquimago.getLevelXpRequirement) return Arquimago.getLevelXpRequirement(state, state.level);
        return Arquimago.xpRequiredForLevel(state.level);
    };

    Arquimago.getXpPercent = function (state) {
        state = state || Arquimago.state;
        var need = Arquimago.getXpToNext(state);
        return need <= 0 ? 100 : Math.max(0, Math.min(100, (state.xp / need) * 100));
    };

    Arquimago.applyPendingLevelUps = function (state) {
        state = state || Arquimago.state;
        if (!state) return { gained: 0, level: 1 };

        var config = Arquimago.LEVEL_PROGRESSION || {};
        var maxLevel = Math.max(1, Number(config.maxLevel) || 1000000000);
        var gained = 0;
        var guard = 0;
        while (state.level < maxLevel && guard < 100000) {
            var required = Arquimago.getLevelXpRequirement ?
                Arquimago.getLevelXpRequirement(state, state.level) : Arquimago.xpRequiredForLevel(state.level);
            if (!(required > 0) || Number(state.xp) < required) break;
            state.xp = Math.max(0, Number(state.xp) - required);
            state.level += 1;
            gained += 1;
            guard += 1;
            if (Arquimago.getTitleForLevel) state.title = Arquimago.getTitleForLevel(state.level);
        }

        if (state.level >= maxLevel) {
            state.level = maxLevel;
        }
        return { gained: gained, level: state.level };
    };

    function reverseLevelProgress(state, amount) {
        var remaining = Math.max(0, Number(amount) || 0);
        var guard = 0;
        while (remaining > 0 && guard < 100000) {
            var currentProgress = Math.max(0, Number(state.xp) || 0);
            if (remaining <= currentProgress) {
                state.xp = currentProgress - remaining;
                remaining = 0;
                break;
            }

            remaining -= currentProgress;
            state.xp = 0;
            if (state.level <= 1) break;

            state.level -= 1;
            state.xp = Arquimago.getLevelXpRequirement ?
                Arquimago.getLevelXpRequirement(state, state.level) : Arquimago.xpRequiredForLevel(state.level);
            guard += 1;
        }

        if (Arquimago.getTitleForLevel) state.title = Arquimago.getTitleForLevel(state.level);
    }

    function removeXPFromCycleHistory(state, amount, dateKey) {
        if (dateKey === state.dailyDate) {
            state.dailyXP = Math.max(0, (Number(state.dailyXP) || 0) - amount);
        } else {
            var dayRecord = (state.dailyHistory || []).find(function (entry) { return entry.date === dateKey; });
            if (dayRecord) {
                dayRecord.xp = Math.max(0, (Number(dayRecord.xp) || 0) - amount);
                if (dayRecord.totalAvailableXP > 0) {
                    dayRecord.percentage = Math.min(100, Math.round((dayRecord.xp / dayRecord.totalAvailableXP) * 100));
                }
            }
        }

        var month = String(dateKey || "").slice(0, 7);
        if (month === state.monthlyKey) {
            state.monthlyXP = Math.max(0, (Number(state.monthlyXP) || 0) - amount);
        } else {
            var monthRecord = (state.monthlyHistory || []).find(function (entry) { return entry.month === month; });
            if (monthRecord) {
                monthRecord.xp = Math.max(0, (Number(monthRecord.xp) || 0) - amount);
                monthRecord.percentage = monthRecord.totalAvailableXP > 0 ? Math.min(100, Math.round((monthRecord.xp / monthRecord.totalAvailableXP) * 100)) : 0;
                monthRecord.goalMet = monthRecord.xp >= monthRecord.goalXP;
            }
        }
    }

    Arquimago.revokeXP = function (amount, completionDate) {
        var state = Arquimago.state;
        if (!state) return 0;
        amount = Math.max(0, Number(amount) || 0);
        if (!amount) return 0;

        var dateKey = completionDate || Arquimago.getTodayKey();
        state.totalXP = Math.max(0, (Number(state.totalXP) || 0) - amount);
        reverseLevelProgress(state, amount);
        removeXPFromCycleHistory(state, amount, dateKey);
        Arquimago.saveState(state);
        return amount;
    };

    Arquimago.checkMissionLevelUp = function (anchorEl, options) {
        var state = Arquimago.state;
        if (!state) return false;
        options = options || {};
        var result = Arquimago.applyPendingLevelUps(state);
        if (!result.gained) return false;

        Arquimago.saveState(state);
        if (!options.silent) {
            var message = result.gained > 1 ?
                "+" + result.gained + " levels · você chegou ao Level " + result.level :
                "Level " + result.level + " alcançado!";
            Arquimago.showNotification(message, "xp");
            if (Arquimago.showLevelUp) {
                Arquimago.showLevelUp(result.level, result.gained, function () {
                    if (Arquimago.refreshAll) Arquimago.refreshAll(true);
                });
            } else if (Arquimago.refreshAll) {
                Arquimago.refreshAll(true);
            }
        }
        return true;
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
        if (Arquimago.checkPersonalRewards && !options.skipRewardCheck) Arquimago.checkPersonalRewards("xp");
        if (!options.deferRefresh) Arquimago.refreshAll(true);

        return total;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
