export function createDialogueSystem(containerEl) {
    let active = false;
    let lines = [];
    let currentIndex = 0;
    let speaker = "";
    let callback = null;
    let charIndex = 0;
    let charTimer = 0;
    let fullText = "";
    let displayedText = "";
    let finished = false;

    const el = containerEl || document.getElementById("history-dialogue");
    if (!el) return { start() {}, advance() {}, update() {}, draw() {}, isActive() { return false; } };

    const speakerPortraits = {
        "Espírito da Floresta": { color: "#88ccff", icon: "✦" },
        "Viajante Perdido": { color: "#aa8844", icon: "◈" },
        "Guardião das Ruínas": { color: "#c9a84c", icon: "⚜" },
        "Eco do Passado": { color: "#886644", icon: "◇" },
        "Guardião do Portal": { color: "#aa44ff", icon: "◆" },
        "Espírito Ancião": { color: "#8844aa", icon: "★" },
        "Monumento": { color: "#c9a84c", icon: "▲" },
        "Portal": { color: "#4a7fd4", icon: "●" },
    };

    function getSpeakerStyle(name) {
        return speakerPortraits[name] || { color: "#88aaff", icon: "●" };
    }

    function buildHTML() {
        return `
            <div class="dlg-backdrop"></div>
            <div class="dlg-box">
                <div class="dlg-content">
                    <div class="dlg-portrait" id="dlgPortrait"></div>
                    <div class="dlg-text-area">
                        <div class="dlg-speaker" id="dlgSpeaker"></div>
                        <div class="dlg-text" id="dlgText"></div>
                    </div>
                    <div class="dlg-indicator" id="dlgIndicator">▸</div>
                </div>
                <div class="dlg-buttons">
                    <button class="dlg-btn dlg-skip" id="dlgSkip">Pular</button>
                    <button class="dlg-btn dlg-next" id="dlgNext">Próximo</button>
                </div>
            </div>
        `;
    }

    function render() {
        el.innerHTML = buildHTML();
        el.classList.add("dlg-active");

        const skipBtn = document.getElementById("dlgSkip");
        const nextBtn = document.getElementById("dlgNext");

        if (skipBtn) {
            skipBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                skip();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                advance();
            });
        }
    }

    function start(dialogueLines, onComplete) {
        if (!dialogueLines || dialogueLines.length === 0) return;
        lines = dialogueLines;
        currentIndex = 0;
        callback = onComplete || null;
        active = true;
        render();
        showLine(0);
    }

    function showLine(idx) {
        if (idx >= lines.length) { close(); return; }
        const line = lines[idx];
        speaker = line.speaker || "";
        fullText = line.text || "";
        charIndex = 0;
        charTimer = 0;
        displayedText = "";
        finished = false;

        const speakerEl = document.getElementById("dlgSpeaker");
        const textEl = document.getElementById("dlgText");
        const portraitEl = document.getElementById("dlgPortrait");
        const indicatorEl = document.getElementById("dlgIndicator");
        const nextBtn = document.getElementById("dlgNext");

        if (speakerEl) {
            const style = getSpeakerStyle(speaker);
            speakerEl.textContent = speaker;
            speakerEl.style.color = style.color;
        }

        if (portraitEl) {
            const style = getSpeakerStyle(speaker);
            portraitEl.innerHTML = `<span class="dlg-portrait-icon" style="color:${style.color}">${style.icon}</span>`;
        }

        if (textEl) textEl.textContent = "";
        if (indicatorEl) indicatorEl.classList.remove("visible");
        if (nextBtn) {
            const isLast = currentIndex >= lines.length - 1;
            nextBtn.textContent = isLast ? "Fechar" : "Próximo";
        }
    }

    function advance() {
        if (!active) return;
        if (!finished) {
            finished = true;
            displayedText = fullText;
            updateTextDisplay();
            return;
        }
        currentIndex++;
        if (currentIndex >= lines.length) {
            close();
            return;
        }
        showLine(currentIndex);
    }

    function skip() {
        if (!active) return;
        close();
    }

    function close() {
        active = false;
        el.classList.remove("dlg-active");
        el.innerHTML = "";
        if (callback) {
            const cb = callback;
            callback = null;
            cb();
        }
    }

    function updateTextDisplay() {
        const textEl = document.getElementById("dlgText");
        const indicatorEl = document.getElementById("dlgIndicator");
        if (textEl) textEl.textContent = displayedText;
        if (indicatorEl && finished) {
            indicatorEl.classList.add("visible");
        }
    }

    function update(dt) {
        if (!active || finished) return;
        charTimer += dt;
        if (charTimer > 0.025) {
            charTimer = 0;
            charIndex++;
            if (charIndex >= fullText.length) {
                displayedText = fullText;
                finished = true;
            } else {
                displayedText = fullText.substring(0, charIndex);
            }
            updateTextDisplay();
        }
    }

    function draw() {
    }

    function isActive() { return active; }

    return { start, advance, update, draw, isActive, skip };
}
