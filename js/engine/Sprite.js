export function createSprite(image, frameW, frameH, cols) {
    const scale = 2;
    const drawW = frameW * scale;
    const drawH = frameH * scale;
    let currentImage = image;
    const numCols = cols || 1;

    function setImage(img) {
        currentImage = img;
    }

    function getFrame(frameIndex) {
        const col = frameIndex % numCols;
        const row = Math.floor(frameIndex / numCols);
        const sx = col * frameW;
        const sy = row * frameH;
        return { sx, sy, sw: frameW, sh: frameH };
    }

    function draw(ctx, screenX, screenY, frameIndex) {
        if (!currentImage) return;
        const src = getFrame(frameIndex);
        const pivotX = drawW / 2;
        const pivotY = drawH;
        const dx = Math.floor(screenX - pivotX);
        const dy = Math.floor(screenY - pivotY);
        ctx.drawImage(
            currentImage,
            src.sx, src.sy, src.sw, src.sh,
            dx, dy, drawW, drawH
        );
    }

    return {
        setImage,
        getFrame,
        draw,
        get drawW() { return drawW; },
        get drawH() { return drawH; },
        get frameW() { return frameW; },
        get frameH() { return frameH; },
        get cols() { return numCols; },
        get scale() { return scale; },
        get image() { return currentImage; },
    };
}