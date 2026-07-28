export function createAudioManager() {
    let ctx = null;

    function getCtx() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { return null; }
        }
        if (ctx && ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function playTone(freq, duration, type, gainVal) {
        const c = getCtx();
        if (!c) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type || "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(gainVal || 0.12, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + duration);
    }

    function playStep() { playTone(180 + Math.random() * 40, 0.06, "square", 0.04); }
    function playAttack() { playTone(520, 0.12, "sawtooth", 0.1); }
    function playMagic() { playTone(880, 0.25, "sine", 0.08); setTimeout(() => playTone(1100, 0.2, "sine", 0.06), 100); }
    function playHit() { playTone(200, 0.15, "square", 0.1); }
    function playPickup() { playTone(660, 0.1, "sine", 0.08); setTimeout(() => playTone(880, 0.15, "sine", 0.08), 80); }
    function playChest() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, "sine", 0.08), i * 120)); }
    function playDoor() { playTone(150, 0.3, "square", 0.06); setTimeout(() => playTone(200, 0.2, "square", 0.06), 150); }
    function playEnemyDefeat() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => playTone(f, 0.15, "triangle", 0.08), i * 80)); }
    function playDialogue() { playTone(440 + Math.random() * 200, 0.05, "sine", 0.04); }
    function playLevelUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "sine", 0.1), i * 100)); }
    function playVictory() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, "sine", 0.1), i * 150)); }

    return { playStep, playAttack, playMagic, playHit, playPickup, playChest, playDoor, playEnemyDefeat, playDialogue, playLevelUp, playVictory, getCtx };
}
