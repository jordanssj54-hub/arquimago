(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var ctx = null;
    var bgSource = null;
    var bgGain = null;
    var musicPlaying = false;
    var currentVolume = 0.1;

    function getCtx() {
        if (!ctx) {
            var C = window.AudioContext || window.webkitAudioContext;
            if (C) ctx = new C();
        }
        return ctx;
    }

    function canPlay() {
        return Arquimago.state && Arquimago.state.soundEnabled !== false;
    }

    function out(vol) {
        var ac = getCtx();
        if (!ac) return null;
        var g = ac.createGain();
        g.gain.value = vol;
        g.connect(ac.destination);
        return g;
    }

    function audioUnlock() {
        var ac = getCtx();
        if (ac && ac.state === "suspended") ac.resume();
    }

    Arquimago.audioUnlock = audioUnlock;

    function startBG() {
        if (!canPlay()) return;
        if (musicPlaying) return;
        var ac = getCtx();
        if (!ac) return;
        audioUnlock();

        var request = new XMLHttpRequest();
        request.open("GET", "assets/audio/intro.mp3", true);
        request.responseType = "arraybuffer";
        request.onload = function () {
            ac.decodeAudioData(request.response, function (buffer) {
                bgGain = ac.createGain();
                bgGain.gain.value = currentVolume;
                bgSource = ac.createBufferSource();
                bgSource.buffer = buffer;
                bgSource.loop = true;
                bgSource.connect(bgGain);
                bgGain.connect(ac.destination);
                bgSource.start();
                musicPlaying = true;
            }, function (e) {
                console.error("Audio decode error:", e);
            });
        };
        request.onerror = function () {
            console.error("Failed to load background audio");
        };
        request.send();
    }

    function stopBG() {
        if (bgSource) {
            try { bgSource.stop(); } catch (e) {}
            bgSource = null;
        }
        if (bgGain) {
            bgGain.disconnect();
            bgGain = null;
        }
        musicPlaying = false;
    }

    Arquimago.startMusic = function () {
        startBG();
    };

    Arquimago.stopMusic = function () {
        stopBG();
    };

    Arquimago.playIntroMusic = function () {
        startBG();
    };

    Arquimago.stopIntroMusic = function () {
        // no-op: music persists across screens
    };

    Arquimago.setIntroVolume = function (vol) {
        currentVolume = Math.max(0, Math.min(1, vol));
        if (bgGain) {
            var ac = getCtx();
            if (ac) {
                bgGain.gain.cancelScheduledValues(ac.currentTime);
                bgGain.gain.setValueAtTime(bgGain.gain.value, ac.currentTime);
                bgGain.gain.linearRampToValueAtTime(currentVolume, ac.currentTime + 0.5);
            }
        }
    };

    Arquimago.resume = function () {
        if (!canPlay()) return;
        getCtx();
        audioUnlock();
    };

    Arquimago.playClick = function () {
        if (!canPlay()) return;
        var ac = getCtx();
        if (!ac) return;
        audioUnlock();
        var t = ac.currentTime;
        var g = out(0.08);
        if (!g) return;
        var osc = ac.createOscillator();
        var gn = ac.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gn.gain.setValueAtTime(0.001, t);
        gn.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gn);
        gn.connect(g);
        osc.start(t);
        osc.stop(t + 0.1);
    };

    Arquimago.playXp = function () {
        if (!canPlay()) return;
        var ac = getCtx();
        if (!ac) return;
        audioUnlock();
        var t = ac.currentTime;
        var g = out(0.1);
        if (!g) return;
        [523.25, 659.25].forEach(function (f, i) {
            var osc = ac.createOscillator();
            var gn = ac.createGain();
            osc.type = "triangle";
            osc.frequency.value = f;
            gn.gain.setValueAtTime(0.001, t + i * 0.05);
            gn.gain.exponentialRampToValueAtTime(0.25, t + i * 0.05 + 0.02);
            gn.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.2);
            osc.connect(gn);
            gn.connect(g);
            osc.start(t + i * 0.05);
            osc.stop(t + i * 0.05 + 0.25);
        });
    };

    Arquimago.playMissionComplete = function () {
        if (!canPlay()) return;
        var ac = getCtx();
        if (!ac) return;
        audioUnlock();
        var t = ac.currentTime;
        var g = out(0.12);
        if (!g) return;
        [392, 494, 587, 784].forEach(function (f, i) {
            var osc = ac.createOscillator();
            var gn = ac.createGain();
            osc.type = "triangle";
            osc.frequency.value = f;
            gn.gain.setValueAtTime(0.001, t + i * 0.07);
            gn.gain.exponentialRampToValueAtTime(0.3, t + i * 0.07 + 0.02);
            gn.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.25);
            osc.connect(gn);
            gn.connect(g);
            osc.start(t + i * 0.07);
            osc.stop(t + i * 0.07 + 0.3);
        });
    };

    Arquimago.playLevelUp = function () {
        if (!canPlay()) return;
        var ac = getCtx();
        if (!ac) return;
        audioUnlock();
        var t = ac.currentTime;
        var g = out(0.14);
        if (!g) return;
        [392, 494, 587, 784, 988].forEach(function (f, i) {
            var osc = ac.createOscillator();
            var gn = ac.createGain();
            osc.type = i === 4 ? "sine" : "square";
            osc.frequency.value = f;
            gn.gain.setValueAtTime(0.001, t + i * 0.1);
            gn.gain.exponentialRampToValueAtTime(0.28, t + i * 0.1 + 0.03);
            gn.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.35);
            osc.connect(gn);
            gn.connect(g);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.4);
        });
    };

    Arquimago.playUnlock = function () {
        if (!canPlay()) return;
        var ac = getCtx();
        if (!ac) return;
        audioUnlock();
        var t = ac.currentTime;
        var g = out(0.13);
        if (!g) return;
        var notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        notes.forEach(function (f, i) {
            var osc = ac.createOscillator();
            var gn = ac.createGain();
            osc.type = i === notes.length - 1 ? "sine" : "triangle";
            osc.frequency.value = f;
            gn.gain.setValueAtTime(0.001, t + i * 0.07);
            gn.gain.exponentialRampToValueAtTime(0.26, t + i * 0.07 + 0.02);
            gn.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.3);
            osc.connect(gn);
            gn.connect(g);
            osc.start(t + i * 0.07);
            osc.stop(t + i * 0.07 + 0.35);
        });
    };

    Arquimago.playClassChange = function (rising) {
        if (!canPlay()) return;
        var ac = getCtx();
        if (!ac) return;
        audioUnlock();
        var t = ac.currentTime;
        var g = out(rising ? 0.13 : 0.09);
        if (!g) return;
        var notes = rising ? [523.25, 659.25, 783.99, 1046.5] : [493.88, 392];
        notes.forEach(function (f, i) {
            var osc = ac.createOscillator();
            var gn = ac.createGain();
            var start = t + i * (rising ? 0.08 : 0.12);
            osc.type = rising ? "triangle" : "sine";
            osc.frequency.value = f;
            gn.gain.setValueAtTime(0.001, start);
            gn.gain.exponentialRampToValueAtTime(rising ? 0.25 : 0.18, start + 0.02);
            gn.gain.exponentialRampToValueAtTime(0.001, start + (rising ? 0.28 : 0.24));
            osc.connect(gn);
            gn.connect(g);
            osc.start(start);
            osc.stop(start + (rising ? 0.32 : 0.28));
        });
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
