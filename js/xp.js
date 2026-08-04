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

    Arquimago.gainXP = function (amount, anchorEl) {
        var state = Arquimago.state;
        var bonus = Math.round(amount * Arquimago.getEventBonus());
        var total = amount + bonus;
        var levelUps = [];
        var prevLevel = state.level;

        state.totalXP += total;
        state.xp += total;

        Arquimago.showXpPopup(total, anchorEl);
        Arquimago.playXp();
        Arquimago.showNotification("+" + total + " XP" + (bonus ? " (evento ativo)" : ""), "xp");

        while (state.xp >= Arquimago.getXpToNext(state)) {
            state.xp -= Arquimago.getXpToNext(state);
            state.level += 1;
            levelUps.push(state.level);
            state.title = Arquimago.getTitleForLevel(state.level);
            state.chapter = Arquimago.getChapterForLevel(state.level).id;

            Arquimago.SPELLS.forEach(function (spell) {
                if (state.level >= spell.level && state.unlockedSpells.indexOf(spell.id) === -1) {
                    state.unlockedSpells.push(spell.id);
                }
            });
        }

        var unlockedRewards = [];
        if (Arquimago.getGrimoireRewards) {
            Arquimago.getGrimoireRewards().forEach(function (reward) {
                if (state.level >= reward.nivelNecessario && prevLevel < reward.nivelNecessario) {
                    unlockedRewards.push(reward);
                }
            });
        }

        Arquimago.saveState(state);

        if (levelUps.length) {
            var idx = 0;
            function nextLevelUp() {
                if (idx >= levelUps.length) {
                    if (unlockedRewards.length && Arquimago.showRewardUnlock) {
                        Arquimago.showRewardUnlock(unlockedRewards, function () {
                            Arquimago.refreshAll();
                        });
                    } else {
                        Arquimago.refreshAll();
                    }
                    return;
                }
                Arquimago.showLevelUp(levelUps[idx], function () {
                    idx++;
                    nextLevelUp();
                });
            }
            nextLevelUp();
        } else if (unlockedRewards.length && Arquimago.showRewardUnlock) {
            Arquimago.showRewardUnlock(unlockedRewards, function () {
                Arquimago.refreshAll(true);
            });
        } else {
            Arquimago.refreshAll(true);
        }

        return total;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
