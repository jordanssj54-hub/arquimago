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

    Arquimago.checkMissionLevelUp = function (anchorEl) {
        var state = Arquimago.state;
        var prevLevel = state.level;
        var progress = Arquimago.getMissionXPProgress ? Arquimago.getMissionXPProgress(state) : null;

        if (!progress || !progress.isMet) return false;

        state.level += 1;
        state.title = Arquimago.getTitleForLevel(state.level);
        state.chapter = Arquimago.getChapterForLevel(state.level).id;
        state.missionsCompletedForLevel = 0;
        state.xpCompletedForLevel = 0;

        Arquimago.SPELLS.forEach(function (spell) {
            if (state.level >= spell.level && state.unlockedSpells.indexOf(spell.id) === -1) {
                state.unlockedSpells.push(spell.id);
            }
        });

        var unlockedRewards = [];
        if (Arquimago.getGrimoireRewards) {
            Arquimago.getGrimoireRewards().forEach(function (reward) {
                if (state.level >= reward.nivelNecessario && prevLevel < reward.nivelNecessario) {
                    unlockedRewards.push(reward);
                }
            });
        }

        Arquimago.saveState(state);

        Arquimago.showLevelUp(state.level, function () {
            if (unlockedRewards.length && Arquimago.showRewardUnlock) {
                Arquimago.showRewardUnlock(unlockedRewards, function () {
                    Arquimago.refreshAll();
                });
            } else {
                Arquimago.refreshAll();
            }
        });

        return true;
    };

    Arquimago.gainXP = function (amount, anchorEl) {
        var state = Arquimago.state;
        var bonus = Math.round(amount * Arquimago.getEventBonus());
        var total = amount + bonus;

        state.totalXP += total;
        state.xp += total;

        Arquimago.showXpPopup(total, anchorEl);
        Arquimago.playXp();
        Arquimago.showNotification("+" + total + " XP" + (bonus ? " (evento ativo)" : ""), "xp");

        Arquimago.saveState(state);
        Arquimago.refreshAll(true);

        return total;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
