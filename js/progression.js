(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    function todayKey() {
        if (Arquimago.getTodayKey) return Arquimago.getTodayKey();
        var d = new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function weekKey() {
        if (Arquimago.getWeekKey) return Arquimago.getWeekKey();
        var d = new Date();
        var day = d.getDay();
        var diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function validAttribute(key) {
        return !!(Arquimago.ATTRIBUTE_DEFINITIONS && Arquimago.ATTRIBUTE_DEFINITIONS[key]);
    }

    function doneArray(state, type) {
        if (type === "main" || type === "custom_free") return state.completedIds;
        if (type === "daily" || type === "custom_daily") return state.dailyDone;
        if (type === "habits") return state.habitsDone;
        if (type === "weekly" || type === "custom_weekly") return state.weeklyDone;
        if (type === "journey") return state.journeyDone || [];
        return [];
    }

    function isJourneyEntry(entry) {
        return !!(entry && (entry.type === "journey" || entry.mission && entry.mission.frequency === "journey"));
    }

    function isDoneInType(state, mission, type) {
        var list = doneArray(state, type);
        return list.indexOf(mission.id) !== -1;
    }

    function allNativeMissions(state) {
        var result = [];
        ["main", "daily", "weekly", "habits", "journey"].forEach(function (type) {
            (Arquimago.MISSIONS[type] || []).forEach(function (mission) {
                result.push({
                    mission: Arquimago.applyMissionOverrides ? Arquimago.applyMissionOverrides(mission, state) : mission,
                    type: type
                });
            });
        });
        return result;
    }

    Arquimago.isMissionHidden = function (state, missionId) {
        state = state || Arquimago.state;
        return !!(state && Array.isArray(state.hiddenMissionIds) && state.hiddenMissionIds.indexOf(missionId) !== -1);
    };

    Arquimago.isMissionDeleted = function (state, missionId) {
        state = state || Arquimago.state;
        return !!(state && Array.isArray(state.deletedMissionIds) && state.deletedMissionIds.indexOf(missionId) !== -1);
    };

    Arquimago.isMissionSuppressed = function (state, missionId) {
        return Arquimago.isMissionHidden(state, missionId) || Arquimago.isMissionDeleted(state, missionId);
    };

    Arquimago.hideMission = function (state, missionId) {
        state = state || Arquimago.state;
        if (!state || Arquimago.isMissionDeleted(state, missionId)) return;
        if (!Array.isArray(state.hiddenMissionIds)) state.hiddenMissionIds = [];
        if (state.hiddenMissionIds.indexOf(missionId) === -1) state.hiddenMissionIds.push(missionId);
        if (Arquimago.refreshMissionAvailability) Arquimago.refreshMissionAvailability(state);
        Arquimago.saveState(state);
    };

    Arquimago.restoreMission = function (state, missionId) {
        state = state || Arquimago.state;
        if (!state || !Array.isArray(state.hiddenMissionIds)) return;
        state.hiddenMissionIds = state.hiddenMissionIds.filter(function (id) { return id !== missionId; });
        if (Arquimago.refreshMissionAvailability) Arquimago.refreshMissionAvailability(state);
        Arquimago.saveState(state);
    };

    Arquimago.deleteNativeMission = function (state, missionId) {
        state = state || Arquimago.state;
        if (!state) return;
        if (!Array.isArray(state.deletedMissionIds)) state.deletedMissionIds = [];
        state.hiddenMissionIds = Array.isArray(state.hiddenMissionIds) ? state.hiddenMissionIds.filter(function (id) { return id !== missionId; }) : [];
        if (state.deletedMissionIds.indexOf(missionId) === -1) state.deletedMissionIds.push(missionId);
        if (Arquimago.refreshMissionAvailability) Arquimago.refreshMissionAvailability(state);
        Arquimago.saveState(state);
    };

    Arquimago.getMissionOverrides = function (state) {
        state = state || Arquimago.state;
        return (state && state.missionOverrides && typeof state.missionOverrides === "object") ? state.missionOverrides : {};
    };

    Arquimago.clampMissionXp = function (xp) {
        var config = Arquimago.LEVEL_PROGRESSION || {};
        var minimum = Math.max(1, Number(config.customMissionXPMin) || 10);
        var maximum = Math.max(minimum, Number(config.customMissionXPMax) || 100);
        var value = parseInt(xp, 10);
        if (!isFinite(value)) value = 25;
        return Math.max(minimum, Math.min(maximum, value));
    };

    Arquimago.applyMissionOverrides = function (mission, state) {
        if (!mission) return mission;
        var overrides = Arquimago.getMissionOverrides(state);
        var ov = overrides[mission.id];
        if (!ov) return mission;
        var merged = {};
        var key;
        for (key in mission) {
            if (Object.prototype.hasOwnProperty.call(mission, key)) merged[key] = mission[key];
        }
        if (ov.xp !== undefined && ov.xp !== null && isFinite(ov.xp)) {
            merged.xp = Arquimago.clampMissionXp(ov.xp);
        }
        if (ov.icon) merged.icon = String(ov.icon);
        return merged;
    };

    Arquimago.saveMissionOverride = function (missionId, patch) {
        var state = Arquimago.state;
        if (!state || !missionId) return;
        if (!state.missionOverrides || typeof state.missionOverrides !== "object") state.missionOverrides = {};
        var ov = state.missionOverrides[missionId] || {};
        if (patch && patch.xp !== undefined && patch.xp !== null) {
            ov.xp = Arquimago.clampMissionXp(patch.xp);
        }
        if (patch && patch.icon) ov.icon = String(patch.icon);
        state.missionOverrides[missionId] = ov;
        if (Arquimago.refreshMissionAvailability) Arquimago.refreshMissionAvailability(state);
        Arquimago.saveState(state);
    };

    Arquimago.clearMissionOverride = function (missionId) {
        var state = Arquimago.state;
        if (!state || !missionId) return;
        if (state.missionOverrides && typeof state.missionOverrides === "object") {
            delete state.missionOverrides[missionId];
        }
        if (Arquimago.refreshMissionAvailability) Arquimago.refreshMissionAvailability(state);
        Arquimago.saveState(state);
    };

    Arquimago.getAllMissionEntries = function (state, includeSuppressed) {
        state = state || Arquimago.state;
        var entries = allNativeMissions(state);
        (state && state.customMissions || []).forEach(function (mission) {
            entries.push({
                mission: mission,
                type: Arquimago.getCustomTypeForFrequency ? Arquimago.getCustomTypeForFrequency(mission.frequency) : "custom_daily"
            });
        });
        if (includeSuppressed) return entries;
        return entries.filter(function (entry) {
            return !Arquimago.isMissionSuppressed(state, entry.mission.id);
        });
    };

    Arquimago.findMissionByType = function (type, id) {
        var entries = Arquimago.getAllMissionEntries(Arquimago.state, true);
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].type === type && entries[i].mission.id === id) return entries[i].mission;
        }
        return null;
    };

    Arquimago.getDailyMissionEntries = function (state) {
        state = state || Arquimago.state;
        if (!state) return [];
        return Arquimago.getAllMissionEntries(state).filter(function (entry) { return !isJourneyEntry(entry); });
    };

    Arquimago.getDailyMissionProgress = function (state) {
        state = state || Arquimago.state;
        var entries = Arquimago.getDailyMissionEntries(state);
        var completed = entries.filter(function (entry) {
            return isDoneInType(state, entry.mission, entry.type);
        }).length;
        var total = entries.length;
        var percent = total ? Math.round((completed / total) * 100) : 0;
        return {
            completed: completed,
            total: total,
            remaining: Math.max(0, total - completed),
            percent: percent,
            isComplete: total > 0 && completed === total
        };
    };

    Arquimago.getAttributeRequirement = function (level) {
        return 50 + (Math.max(1, level) - 1) * 25;
    };

    function calculateAttribute(total) {
        var remaining = Math.max(0, Math.floor(Number(total) || 0));
        var level = 1;
        var requirement = Arquimago.getAttributeRequirement(level);
        var guard = 0;
        while (remaining >= requirement && guard < 1000) {
            remaining -= requirement;
            level += 1;
            requirement = Arquimago.getAttributeRequirement(level);
            guard += 1;
        }
        return {
            level: level,
            progress: remaining,
            required: requirement,
            total: Math.max(0, Math.floor(Number(total) || 0)),
            percent: Math.min(100, Math.round((remaining / requirement) * 100))
        };
    }

    Arquimago.getAttributeProgress = function (state, key) {
        state = state || Arquimago.state;
        if (!state || !validAttribute(key)) return calculateAttribute(0);
        if (!state.attributes) state.attributes = {};
        if (!state.attributes[key]) state.attributes[key] = { total: 0 };
        var data = calculateAttribute(state.attributes[key].total);
        state.attributes[key].level = data.level;
        state.attributes[key].progress = data.progress;
        state.attributes[key].required = data.required;
        state.attributes[key].total = data.total;
        return data;
    };

    Arquimago.getMissionsForAttribute = function (key, state) {
        return Arquimago.getAllMissionEntries(state).filter(function (entry) {
            return entry.mission.attribute === key;
        });
    };

    Arquimago.getMissionCompletionCount = function (state, missionId) {
        return Number(state && state.missionCompletionCounts && state.missionCompletionCounts[missionId]) || 0;
    };

    /* ============================================================
       Progressão de nível adaptada ao conjunto ativo de cada usuário.
       ============================================================ */
    Arquimago.getAvailableMissionCount = function (state) {
        return Arquimago.getAllMissionEntries(state).length;
    };

    Arquimago.getTotalAvailableMissionXP = function (state) {
        var entries = Arquimago.getAllMissionEntries(state).filter(function (entry) { return !isJourneyEntry(entry); });
        var total = 0;
        entries.forEach(function (entry) {
            total += Number(entry.mission.xp) || 0;
        });
        return total;
    };

    function isDailyBonusEligible(entry) {
        return entry && !isJourneyEntry(entry) && entry.type !== "weekly" && entry.type !== "custom_weekly" && entry.mission.frequency !== "weekly";
    }

    Arquimago.getDailyBonusMission = function (state) {
        state = state || Arquimago.state;
        if (!state) return null;
        var today = todayKey();
        var entries = Arquimago.getAllMissionEntries(state, true).filter(isDailyBonusEligible);

        if (state.dailyBonusDate === today && state.dailyBonusMissionId) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].mission.id === state.dailyBonusMissionId) return entries[i];
            }
        }

        var candidates = entries.filter(function (entry) {
            return !Arquimago.isMissionSuppressed(state, entry.mission.id) && !isDoneInType(state, entry.mission, entry.type);
        });
        if (!candidates.length) {
            candidates = entries.filter(function (entry) {
                return !Arquimago.isMissionSuppressed(state, entry.mission.id);
            });
        }
        if (!candidates.length) return null;

        var selected = candidates[Math.floor(Math.random() * candidates.length)];
        state.dailyBonusDate = today;
        state.dailyBonusMissionId = selected.mission.id;
        if (state === Arquimago.state && Arquimago.saveState) Arquimago.saveState(state);
        return selected;
    };

    Arquimago.getDailyMissionBonusXp = function (mission, state) {
        if (!mission) return 0;
        var selected = Arquimago.getDailyBonusMission(state);
        if (!selected || selected.mission.id !== mission.id) return 0;
        var config = Arquimago.LEVEL_PROGRESSION || {};
        var multiplier = Math.max(0, Number(config.dailyBonusMultiplier) || 0.5);
        var minimum = Math.max(0, Number(config.dailyBonusMinXP) || 10);
        return Math.max(minimum, Math.round((Number(mission.xp) || 0) * multiplier));
    };

    Arquimago.getDailyMissionXpPotential = function (state) {
        var entries = Arquimago.getAllMissionEntries(state).filter(function (entry) { return !isJourneyEntry(entry); });
        var total = entries.reduce(function (sum, entry) {
            var xp = Math.max(0, Number(entry.mission && entry.mission.xp) || 0);
            var isWeekly = entry.type === "weekly" || entry.type === "custom_weekly" || entry.mission.frequency === "weekly";
            return sum + (isWeekly ? xp / 7 : xp);
        }, 0);
        var bonus = Arquimago.getDailyBonusMission(state);
        if (bonus) total += Arquimago.getDailyMissionBonusXp(bonus.mission, state);
        return total;
    };

    Arquimago.getAverageMissionXp = function (state) {
        var entries = Arquimago.getAllMissionEntries(state).filter(function (entry) { return !isJourneyEntry(entry); });
        var weightedXP = 0;
        var totalWeight = 0;
        entries.forEach(function (entry) {
            var xp = Math.max(0, Number(entry.mission && entry.mission.xp) || 0);
            var isWeekly = entry.type === "weekly" || entry.type === "custom_weekly" || entry.mission.frequency === "weekly";
            var weight = isWeekly ? 1 / 7 : 1;
            weightedXP += xp * weight;
            totalWeight += weight;
        });
        var reference = Math.max(1, Number((Arquimago.LEVEL_PROGRESSION || {}).referenceMissionXP) || 30);
        return totalWeight > 0 ? weightedXP / totalWeight : reference;
    };

    function getJourneyDifficultyMultiplier(daysUsingApp) {
        var config = Arquimago.LEVEL_PROGRESSION || {};
        var days = Math.max(1, Number(daysUsingApp) || 1);
        var weekMultiplier = Math.max(1, Number(config.firstWeekMultiplier) || 1.2);
        var monthMultiplier = Math.max(weekMultiplier, Number(config.firstMonthMultiplier) || 1.6);
        if (days <= 3) return 1;
        if (days <= 7) return 1 + ((weekMultiplier - 1) * (days - 3) / 4);
        if (days <= 30) return weekMultiplier + ((monthMultiplier - weekMultiplier) * (days - 7) / 23);
        var growth = 0.35 * Math.log10(1 + ((days - 30) / 30));
        return Math.min(Number(config.longTermMultiplierCap) || 2.2, monthMultiplier + growth);
    }

    function legacyXpRequiredForLevel(level) {
        var config = Arquimago.LEVEL_PROGRESSION || {};
        var currentLevel = Math.max(1, Math.floor(Number(level) || 1));
        var index = currentLevel - 1;
        var early = config.legacyEarlyLevelRequirements || [30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
        if (index < early.length) return early[index];
        var excessLevels = Math.max(1, index - early.length + 2);
        return early[early.length - 1] + Math.floor((config.legacyLongTermLogGrowth || 30) * Math.log10(excessLevels));
    };

    Arquimago.getLevelXpRequirement = function (state, level, missionXpBasis) {
        state = state || Arquimago.state;
        var config = Arquimago.LEVEL_PROGRESSION || {};
        var maxLevel = Math.max(1, Number(config.maxLevel) || 1000000000);
        level = Math.max(1, Math.floor(Number(level) || Number(state && state.level) || 1));
        if (level >= maxLevel) return 0;

        var baseRequirement = Math.max(1, Number(Arquimago.xpRequiredForLevel(level)) || 1);
        var reference = Math.max(1, Number(config.referenceMissionXP) || 30);
        var basis = Number(missionXpBasis);
        if (!(basis > 0)) basis = Number(state && state.levelMissionXpBasis);
        if (!(basis > 0)) basis = Arquimago.getAverageMissionXp(state);
        if (!(basis > 0)) basis = reference;

        var ageMultiplier = getJourneyDifficultyMultiplier(state && state.daysUsingApp);
        return Math.max(1, Math.ceil(baseRequirement * (basis / reference) * ageMultiplier));
    };

    Arquimago.getCompletedAvailableMissions = function (state) {
        var entries = Arquimago.getAllMissionEntries(state);
        var completed = 0;
        entries.forEach(function (entry) {
            if (isDoneInType(state, entry.mission, entry.type)) completed++;
        });
        return completed;
    };

    Arquimago.getLevelProgress = function (state) {
        state = state || Arquimago.state;
        var config = Arquimago.LEVEL_PROGRESSION || {};
        var maxLevel = Math.max(1, Number(config.maxLevel) || 1000000000);
        var level = Math.max(1, Math.min(maxLevel, Math.floor(Number(state && state.level) || 1)));
        var requiredXP = Arquimago.getLevelXpRequirement(state, level);
        var earnedXP = Math.max(0, Number(state && state.xp) || 0);
        var percent = requiredXP > 0 ? Math.min(100, (earnedXP / requiredXP) * 100) : 100;
        return {
            earned: earnedXP,
            required: requiredXP,
            percent: percent,
            remaining: Math.max(0, requiredXP - earnedXP),
            level: level,
            nextLevel: level < maxLevel ? level + 1 : maxLevel,
            maxed: level >= maxLevel,
            dailyMissionXp: Arquimago.getDailyMissionXpPotential(state)
        };
    };

    Arquimago.syncLevelMissionXpBasis = function (state) {
        state = state || Arquimago.state;
        if (!state) return;
        var currentBasis = Arquimago.getAverageMissionXp(state);
        if (!(currentBasis > 0)) return;

        var previousBasis = Number(state.levelMissionXpBasis);
        if (previousBasis > 0 && Math.abs(previousBasis - currentBasis) > 0.000001) {
            if (Arquimago.applyPendingLevelUps) Arquimago.applyPendingLevelUps(state);
            var oldRequirement = Arquimago.getLevelXpRequirement(state, state.level, previousBasis);
            var newRequirement = Arquimago.getLevelXpRequirement(state, state.level, currentBasis);
            var progressRatio = oldRequirement > 0 ? Math.max(0, Math.min(1, (Number(state.xp) || 0) / oldRequirement)) : 0;
            state.xp = Math.min(Math.max(0, newRequirement - 1), Math.floor(progressRatio * newRequirement));
        }

        state.levelMissionXpBasis = currentBasis;
        return currentBasis;
    };

    function monthKeyFromValue(value) {
        if (value && /^\d{4}-\d{2}$/.test(String(value))) return String(value);
        if (Arquimago.getMonthKey) return Arquimago.getMonthKey();
        var now = new Date();
        return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    }

    function nextMonthKey(key) {
        var parts = String(key).split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        if (!isFinite(year) || !isFinite(month)) return null;
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
        return year + "-" + String(month).padStart(2, "0");
    }

    function monthSerial(key) {
        var parts = String(key).split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        return isFinite(year) && isFinite(month) ? year * 12 + month : NaN;
    }

    Arquimago.getMonthlyAvailableMissionXP = function (state, month) {
        state = state || Arquimago.state;
        month = monthKeyFromValue(month);
        var missionXP = Arquimago.getTotalAvailableMissionXP(state);
        var config = Arquimago.LEVEL_PROGRESSION || {};
        var hasDailyBonusCandidate = Arquimago.getAllMissionEntries(state).some(isDailyBonusEligible);
        var dailyBonusXP = hasDailyBonusCandidate ? Math.max(
            Math.max(0, Number(config.dailyBonusMinXP) || 10),
            Math.round(Arquimago.getAverageMissionXp(state) * Math.max(0, Number(config.dailyBonusMultiplier) || 0.5))
        ) : 0;
        var workdays = Arquimago.getBusinessDaysInMonth ? Arquimago.getBusinessDaysInMonth(month) : 0;
        return (missionXP + dailyBonusXP) * workdays;
    };

    Arquimago.getMonthlyGoalXP = function (availableXP) {
        return Math.ceil(Math.max(0, Number(availableXP) || 0) * (Arquimago.MONTHLY_GOAL_FRACTION || 0.6));
    };

    Arquimago.refreshMissionAvailability = function (state) {
        state = state || Arquimago.state;
        if (!state) return;

        var availableXP = Arquimago.getDailyMissionXpPotential(state);
        var monthlyAvailableXP = Arquimago.getMonthlyAvailableMissionXP(state, state.monthlyKey);
        state.dailyAvailableXP = availableXP;
        state.monthlyAvailableXP = monthlyAvailableXP;
        state.monthlyGoalXP = Arquimago.getMonthlyGoalXP(monthlyAvailableXP);
        Arquimago.syncLevelMissionXpBasis(state);
        return state;
    };

    Arquimago.getMonthlyProgress = function (state) {
        state = state || Arquimago.state;
        var currentAvailable = Arquimago.getMonthlyAvailableMissionXP(state, state && state.monthlyKey);
        var available = Math.max(0, Number(currentAvailable) || 0);
        var goal = Arquimago.getMonthlyGoalXP(available);
        if (state) Arquimago.refreshMissionAvailability(state);
        var earned = Math.max(0, Number(state && state.monthlyXP) || 0);
        var percent = available > 0 ? Math.min(100, Math.round((earned / available) * 100)) : 0;
        return {
            month: monthKeyFromValue(state && state.monthlyKey),
            earned: earned,
            available: available,
            goal: goal,
            percent: percent,
            goalPercent: goal > 0 ? Math.min(100, Math.round((earned / goal) * 100)) : 0,
            isMet: goal > 0 && earned >= goal
        };
    };

    Arquimago.finalizeMonthlyCycle = function (state, month) {
        state = state || Arquimago.state;
        month = monthKeyFromValue(month);
        if (!state || !month) return null;
        if ((state.monthlyHistory || []).some(function (entry) { return entry.month === month; })) return null;

        var available = Math.max(0, Number(state.monthlyAvailableXP) || 0);
        if (!available) available = Arquimago.getMonthlyAvailableMissionXP(state, month);
        var earned = Math.max(0, Number(state.monthlyXP) || 0);
        var goal = Arquimago.getMonthlyGoalXP(available);
        var percent = available > 0 ? Math.min(100, Math.round((earned / available) * 100)) : 0;
        var met = goal > 0 && earned >= goal;

        state.monthlyHistory.push({
            month: month,
            xp: earned,
            totalAvailableXP: available,
            goalXP: goal,
            percentage: percent,
            goalMet: met,
            closedAt: todayKey()
        });
        return state.monthlyHistory[state.monthlyHistory.length - 1];
    };

    Arquimago.startMonthlyCycle = function (state, month) {
        state = state || Arquimago.state;
        month = monthKeyFromValue(month);
        state.monthlyKey = month;
        state.monthlyXP = 0;
        state.monthlyAvailableXP = Arquimago.getMonthlyAvailableMissionXP(state, month);
        state.monthlyGoalXP = Arquimago.getMonthlyGoalXP(state.monthlyAvailableXP);
        return Arquimago.getMonthlyProgress(state);
    };

    Arquimago.syncMonthlyCycle = function (state, month) {
        state = state || Arquimago.state;
        month = monthKeyFromValue(month);
        if (!state.monthlyKey || !/^\d{4}-\d{2}$/.test(state.monthlyKey)) {
            Arquimago.startMonthlyCycle(state, month);
            return { changed: true };
        }
        if (state.monthlyKey === month) {
            var available = Arquimago.getMonthlyAvailableMissionXP(state, month);
            var goal = Arquimago.getMonthlyGoalXP(available);
            var changed = state.monthlyAvailableXP !== available || state.monthlyGoalXP !== goal;
            state.monthlyAvailableXP = available;
            state.monthlyGoalXP = goal;
            return { changed: changed };
        }
        if (monthSerial(state.monthlyKey) > monthSerial(month)) {
            Arquimago.startMonthlyCycle(state, month);
            return { changed: true };
        }

        var cursor = state.monthlyKey;
        var guard = 0;
        while (cursor && cursor !== month && guard < 240) {
            Arquimago.finalizeMonthlyCycle(state, cursor);
            cursor = nextMonthKey(cursor);
            Arquimago.startMonthlyCycle(state, cursor);
            guard++;
        }
        return { changed: true };
    };

    Arquimago.changeAttributeProgress = function (state, mission, delta) {
        if (!state || !mission || !validAttribute(mission.attribute)) return { levelUp: false, data: null };
        if (!state.attributes) state.attributes = {};
        if (!state.attributes[mission.attribute]) state.attributes[mission.attribute] = { total: 0 };
        var before = Arquimago.getAttributeProgress(state, mission.attribute);
        var entry = state.attributes[mission.attribute];
        entry.total = Math.max(0, (Number(entry.total) || 0) + delta);

        if (!state.missionCompletionCounts) state.missionCompletionCounts = {};
        var count = Number(state.missionCompletionCounts[mission.id]) || 0;
        state.missionCompletionCounts[mission.id] = Math.max(0, count + delta);

        var after = Arquimago.getAttributeProgress(state, mission.attribute);
        return { levelUp: after.level > before.level, data: after };
    };

    function bossDefinitionForWeek(week) {
        var definitions = Arquimago.BOSSES || [];
        if (!definitions.length) return null;
        var hash = 0;
        String(week || "").split("").forEach(function (char) {
            hash = (hash + char.charCodeAt(0)) % 2147483647;
        });
        return definitions[hash % definitions.length];
    }

    Arquimago.createWeeklyBoss = function (week) {
        var definition = bossDefinitionForWeek(week);
        if (!definition) return null;
        return {
            id: definition.id,
            week: week,
            name: definition.name,
            icon: definition.icon,
            image: definition.image || "",
            maxHp: definition.maxHp,
            hp: definition.maxHp,
            description: definition.description,
            weaknesses: definition.weaknesses.slice(),
            reward: definition.reward,
            defeated: false
        };
    };

    Arquimago.ensureWeeklyBoss = function (state, week) {
        state = state || Arquimago.state;
        week = week || weekKey();
        if (!state.weeklyBoss || state.weeklyBoss.week !== week || !Number(state.weeklyBoss.maxHp) || !Array.isArray(state.weeklyBoss.weaknesses)) {
            state.weeklyBoss = Arquimago.createWeeklyBoss(week);
            state.bossDamageEvents = [];
        }
        if (!Array.isArray(state.bossDamageEvents)) state.bossDamageEvents = [];
        return state.weeklyBoss;
    };

    Arquimago.getWeeklyBoss = function (state) {
        return Arquimago.ensureWeeklyBoss(state || Arquimago.state, weekKey());
    };

    Arquimago.getBossDamageForMission = function (mission, boss) {
        if (!mission) return 0;
        var base = Math.max(1, Number(mission.bossDamage) || 10);
        var weak = boss && boss.weaknesses && boss.weaknesses.indexOf(mission.id) !== -1;
        return Math.round(base * (weak ? 1.5 : 1));
    };

    Arquimago.damageWeeklyBoss = function (state, mission) {
        if (mission && mission.frequency === "journey") {
            return { damage: 0, boss: state.weeklyBoss || null, defeated: false, weakness: false };
        }
        var boss = Arquimago.ensureWeeklyBoss(state, weekKey());
        if (!boss || boss.defeated || !mission) return { damage: 0, boss: boss, defeated: false, weakness: false };

        var key = todayKey() + "|" + mission.id;
        var existing = state.bossDamageEvents.some(function (event) { return event.key === key; });
        if (existing) return { damage: 0, boss: boss, defeated: false, weakness: false };

        var weakness = boss.weaknesses.indexOf(mission.id) !== -1;
        var damage = Arquimago.getBossDamageForMission(mission, boss);
        state.bossDamageEvents.push({ key: key, missionId: mission.id, damage: damage, date: todayKey() });
        boss.hp = Math.max(0, boss.hp - damage);
        var defeated = false;

        if (boss.hp === 0) {
            boss.defeated = true;
            defeated = true;
            if (!Array.isArray(state.bossTrophies)) state.bossTrophies = [];
            var trophyId = boss.id + "_" + boss.week;
            if (!state.bossTrophies.some(function (trophy) { return trophy.id === trophyId; })) {
                state.bossTrophies.push({
                    id: trophyId,
                    bossId: boss.id,
                    name: boss.reward,
                    bossName: boss.name,
                    week: boss.week,
                    earnedAt: todayKey()
                });
            }
        }

        return { damage: damage, boss: boss, defeated: defeated, weakness: weakness };
    };

    Arquimago.applyMissionProgress = function (state, mission) {
        var attribute = Arquimago.changeAttributeProgress(state, mission, 1);
        var boss = Arquimago.damageWeeklyBoss(state, mission);
        return { attribute: attribute, boss: boss };
    };

    Arquimago.revertMissionProgress = function (state, mission) {
        return Arquimago.changeAttributeProgress(state, mission, -1);
    };

    function storedAttributeTotal(value) {
        if (value && typeof value === "object") value = value.total;
        return Math.max(0, Math.floor(Number(value) || 0));
    }

    function migratedAttributeTotal(previous, currentKey, legacyKeys) {
        if (Object.prototype.hasOwnProperty.call(previous, currentKey)) {
            return storedAttributeTotal(previous[currentKey]);
        }
        return legacyKeys.reduce(function (total, key) {
            if (!Object.prototype.hasOwnProperty.call(previous, key)) return total;
            return total + storedAttributeTotal(previous[key]);
        }, 0);
    }

    function migrateMissionAttribute(key) {
        if (key === "physical" || key === "mental" || key === "habits") return key;
        if (key === "strength" || key === "vitality" || key === "discipline" || key === "consistency") return "physical";
        if (key === "intelligence" || key === "wisdom") return "mental";
        if (key === "spirit") return "habits";
        return "habits";
    }

    Arquimago.normalizeState = function (state) {
        if (typeof state.navCollapsed !== "boolean") state.navCollapsed = false;
        state.completedIds = Array.isArray(state.completedIds) ? state.completedIds : [];
        state.dailyDone = Array.isArray(state.dailyDone) ? state.dailyDone : [];
        state.weeklyDone = Array.isArray(state.weeklyDone) ? state.weeklyDone : [];
        state.habitsDone = Array.isArray(state.habitsDone) ? state.habitsDone : [];
        state.journeyDone = Array.isArray(state.journeyDone) ? state.journeyDone : [];
        state.dailyCompletedMissionIds = Array.isArray(state.dailyCompletedMissionIds) ? state.dailyCompletedMissionIds : [];
        state.dailyHistory = Array.isArray(state.dailyHistory) ? state.dailyHistory : [];
        state.monthlyHistory = Array.isArray(state.monthlyHistory) ? state.monthlyHistory : [];
        state.customMissions = Array.isArray(state.customMissions) ? state.customMissions : [];
        state.missionXpAwards = state.missionXpAwards && typeof state.missionXpAwards === "object" ? state.missionXpAwards : {};
        state.hiddenMissionIds = Array.isArray(state.hiddenMissionIds) ? state.hiddenMissionIds : [];
        state.deletedMissionIds = Array.isArray(state.deletedMissionIds) ? state.deletedMissionIds : [];
        state.missionOverrides = state.missionOverrides && typeof state.missionOverrides === "object" ? state.missionOverrides : {};
        state.achievements = Array.isArray(state.achievements) ? state.achievements : ["recomeco"];
        state.unlockedSpells = Array.isArray(state.unlockedSpells) ? state.unlockedSpells : ["focus"];
        state.bossTrophies = Array.isArray(state.bossTrophies) ? state.bossTrophies : [];
        state.bossDamageEvents = Array.isArray(state.bossDamageEvents) ? state.bossDamageEvents : [];
        state.missionCompletionCounts = state.missionCompletionCounts && typeof state.missionCompletionCounts === "object" ? state.missionCompletionCounts : {};

        var previous = state.attributes && typeof state.attributes === "object" ? state.attributes : {};
        var attributes = {};
        attributes.physical = {
            total: migratedAttributeTotal(previous, "physical", ["strength", "discipline"]) +
                migratedAttributeTotal(previous, "vitality", ["vitality", "consistency"])
        };
        attributes.mental = {
            total: migratedAttributeTotal(previous, "mental", ["intelligence", "wisdom"])
        };
        attributes.habits = {
            total: migratedAttributeTotal(previous, "habits", ["spirit"])
        };
        state.attributes = attributes;
        Object.keys(attributes).forEach(function (key) { Arquimago.getAttributeProgress(state, key); });

        state.customMissions.forEach(function (mission) {
            mission.xp = Arquimago.clampMissionXp(mission.xp);
            mission.bossDamage = Math.max(5, Math.min(35, parseInt(mission.bossDamage, 10) || 10));
            mission.attribute = migrateMissionAttribute(mission.attribute);
            if (!validAttribute(mission.attribute)) mission.attribute = "habits";
        });

        delete state.bestDailyRank;
        delete state.bestDailyRankPercent;
        delete state.classIndex;
        delete state.pendingClassChanges;
        delete state.missionsCompletedForLevel;
        delete state.xpCompletedForLevel;
        state.daysUsingApp = Math.max(0, Number(state.daysUsingApp) || 0);
        if (typeof state.lastUsageDate !== "string") state.lastUsageDate = "";
        if (typeof state.dailyDate !== "string") state.dailyDate = "";
        state.dailyBonusMissionId = typeof state.dailyBonusMissionId === "string" ? state.dailyBonusMissionId : "";
        state.dailyBonusDate = typeof state.dailyBonusDate === "string" ? state.dailyBonusDate : "";
        state.dailyXP = Math.max(0, Number(state.dailyXP) || 0);
        state.dailyAvailableXP = Math.max(0, Number(state.dailyAvailableXP) || 0);
        if (typeof state.monthlyKey !== "string") state.monthlyKey = "";
        state.monthlyXP = Math.max(0, Number(state.monthlyXP) || 0);
        state.monthlyAvailableXP = Math.max(0, Number(state.monthlyAvailableXP) || 0);
        state.monthlyGoalXP = Math.max(0, Number(state.monthlyGoalXP) || 0);
        var maxLevel = Math.max(1, Number((Arquimago.LEVEL_PROGRESSION || {}).maxLevel) || 1000000000);
        state.level = Math.max(1, Math.min(maxLevel, Math.floor(Number(state.level) || 1)));
        if (typeof state.xp !== "number" || state.xp < 0) state.xp = 0;
        if (typeof state.totalXP !== "number" || state.totalXP < 0) state.totalXP = 0;
        state.levelMissionXpBasis = Math.max(0, Number(state.levelMissionXpBasis) || 0);
        if (typeof state.missionsCompleted !== "number" || state.missionsCompleted < 0) state.missionsCompleted = 0;
        var progressionConfig = Arquimago.LEVEL_PROGRESSION || {};
        var progressionVersion = Number(progressionConfig.version) || 2;
        var missionXpBasis = Arquimago.getAverageMissionXp(state) || Number(progressionConfig.referenceMissionXP) || 30;
        if (Number(state.levelProgressionVersion) !== progressionVersion) {
            var previousBasis = Number(state.levelMissionXpBasis) || Number(progressionConfig.referenceDailyXP) || 85;
            var legacyRequirement = legacyXpRequiredForLevel(state.level) * (previousBasis / (Number(progressionConfig.referenceDailyXP) || 85));
            var updatedRequirement = Arquimago.getLevelXpRequirement(state, state.level, missionXpBasis);
            var previousProgress = legacyRequirement > 0 ? Math.max(0, Math.min(1, state.xp / legacyRequirement)) : 0;
            state.xp = updatedRequirement > 0 ? Math.min(updatedRequirement - 1, Math.floor(previousProgress * updatedRequirement)) : 0;
            state.levelMissionXpBasis = missionXpBasis;
            state.levelProgressionVersion = progressionVersion;
        } else if (!(state.levelMissionXpBasis > 0)) {
            state.levelMissionXpBasis = missionXpBasis;
        } else {
            Arquimago.syncLevelMissionXpBasis(state);
        }
        if (Arquimago.applyPendingLevelUps) Arquimago.applyPendingLevelUps(state, { silent: true });
        if (Arquimago.normalizeFinancas) Arquimago.normalizeFinancas(state);
        return state;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
