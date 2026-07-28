export function createDialogueSystem() {
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

    function start(dialogueLines, onComplete) {
        if (!dialogueLines || dialogueLines.length === 0) return;
        lines = dialogueLines;
        currentIndex = 0;
        callback = onComplete || null;
        active = true;
        showLine(0);
    }

    function showLine(idx) {
        if (idx >= lines.length) { active = false; return; }
        const line = lines[idx];
        speaker = line.speaker || "";
        fullText = line.text || "";
        charIndex = 0;
        charTimer = 0;
        displayedText = "";
        finished = false;
    }

    function advance() {
        if (!active) return false;
        if (!finished) {
            finished = true;
            displayedText = fullText;
            return true;
        }
        currentIndex++;
        if (currentIndex >= lines.length) {
            active = false;
            if (callback) callback();
            return false;
        }
        showLine(currentIndex);
        return true;
    }

    function update(dt) {
        if (!active || finished) return;
        charTimer += dt;
        if (charTimer > 0.03) {
            charTimer = 0;
            charIndex++;
            if (charIndex >= fullText.length) {
                displayedText = fullText;
                finished = true;
            } else {
                displayedText = fullText.substring(0, charIndex);
            }
        }
    }

    function draw(ctx, width, height) {
        if (!active) return;

        const boxH = 80;
        const boxY = height - boxH - 8;
        const pad = 12;

        ctx.fillStyle = "rgba(8, 6, 18, 0.92)";
        ctx.beginPath();
        ctx.roundRect(8, boxY, width - 16, boxH, 8);
        ctx.fill();

        ctx.strokeStyle = "rgba(201, 168, 76, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(8, boxY, width - 16, boxH, 8);
        ctx.stroke();

        if (speaker) {
            ctx.fillStyle = "#c9a84c";
            ctx.font = "bold 11px Inter, sans-serif";
            ctx.fillText(speaker, pad + 8, boxY + 18);
        }

        ctx.fillStyle = "#e8e6e0";
        ctx.font = "12px Inter, sans-serif";
        const lines_text = wrapText(displayedText, width - 32);
        lines_text.forEach((line, i) => {
            ctx.fillText(line, pad + 8, boxY + 34 + i * 16);
        });

        if (finished) {
            const blink = Math.sin(Date.now() * 0.005) > 0;
            if (blink) {
                ctx.fillStyle = "#c9a84c";
                ctx.font = "10px Inter, sans-serif";
                ctx.fillText("\u25BC", width - 24, boxY + boxH - 10);
            }
        }
    }

    function wrapText(text, maxWidth) {
        const words = text.split(" ");
        const result = [];
        let current = "";
        for (const word of words) {
            const test = current ? current + " " + word : word;
            if (test.length * 7 > maxWidth) {
                if (current) result.push(current);
                current = word;
            } else {
                current = test;
            }
        }
        if (current) result.push(current);
        return result;
    }

    function isActive() { return active; }

    return { start, advance, update, draw, isActive };
}
