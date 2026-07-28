export function createCamera(viewW, viewH) {
    let x = 0, y = 0;
    let targetX = 0, targetY = 0;
    let shakeX = 0, shakeY = 0;
    let shakeDuration = 0;
    let shakeIntensity = 0;
    const lerp = 0.08;

    function follow(px, py, worldW, worldH) {
        targetX = px - viewW / 2;
        targetY = py - viewH / 2;
        targetX = Math.max(0, Math.min(targetX, worldW - viewW));
        targetY = Math.max(0, Math.min(targetY, worldH - viewH));
    }

    function snapTo(px, py, worldW, worldH) {
        x = targetX = Math.max(0, Math.min(px - viewW / 2, worldW - viewW));
        y = targetY = Math.max(0, Math.min(py - viewH / 2, worldH - viewH));
    }

    function shake(intensity, duration) {
        shakeIntensity = intensity;
        shakeDuration = duration;
    }

    function update(dt) {
        x += (targetX - x) * lerp;
        y += (targetY - y) * lerp;
        if (shakeDuration > 0) {
            shakeDuration -= dt;
            shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
            shakeY = (Math.random() - 0.5) * shakeIntensity * 2;
        } else {
            shakeX = 0;
            shakeY = 0;
        }
    }

    function getX() { return Math.round(x + shakeX); }
    function getY() { return Math.round(y + shakeY); }

    function isViewable(wx, wy, tw, th) {
        return wx + tw > x && wx < x + viewW && wy + th > y && wy < y + viewH;
    }

    return { follow, snapTo, shake, update, getX, getY, isViewable, viewW, viewH };
}
