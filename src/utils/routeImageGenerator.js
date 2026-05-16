import { secondsToHHMM, formatDate } from './otherParsers';

const W = 1080;
const H = 1080;
const HEADER_H = 110;
const FOOTER_H = 260;
const MAP_Y = HEADER_H;
const MAP_H = H - HEADER_H - FOOTER_H;
const MAP_PAD = 70;

const ACCENT = '#ff6b35';
const TEXT_PRIMARY = '#ffffff';
const TEXT_MUTED = '#8b949e';
const BG_DARK = '#0d1117';
const BG_LIGHT = '#161b22';
const DIVIDER = '#30363d';

function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
    }
    return truncated + '…';
}

export async function generateRouteImage(route) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, BG_DARK);
    bg.addColorStop(1, BG_LIGHT);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const { points, summary, routeName } = route;

    // Header: route name
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = 'bold 46px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const nameText = truncateText(ctx, routeName || 'Route', W - 120);
    ctx.fillText(nameText, W / 2, 60);

    // Header: date
    if (summary?.startTime) {
        ctx.fillStyle = TEXT_MUTED;
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        ctx.fillText(formatDate(new Date(summary.startTime.toString())), W / 2, 96);
    }

    // Map drawing
    if (points?.length > 1) {
        const lats = points.map(p => p.lat);
        const lngs = points.map(p => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const latRange = maxLat - minLat || 0.001;
        const lngRange = maxLng - minLng || 0.001;
        const avgLat = (minLat + maxLat) / 2;

        // Correct lng for latitude distortion
        const lngCorr = lngRange * Math.cos((avgLat * Math.PI) / 180);

        const drawW = W - MAP_PAD * 2;
        const drawH = MAP_H - MAP_PAD * 2;
        const scale = Math.min(drawH / latRange, drawW / lngCorr);

        const routeW = lngCorr * scale;
        const routeH = latRange * scale;
        const ox = (W - routeW) / 2;
        const oy = MAP_Y + MAP_PAD + (drawH - routeH) / 2;

        const toX = (lng) => ox + (lng - minLng) * Math.cos((avgLat * Math.PI) / 180) * scale;
        const toY = (lat) => oy + (maxLat - lat) * scale;

        // Glow pass
        ctx.save();
        ctx.shadowColor = ACCENT;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(toX(points[0].lng), toY(points[0].lat));
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(toX(points[i].lng), toY(points[i].lat));
        }
        ctx.strokeStyle = ACCENT + '50';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();

        // Main route line with gradient
        const p0x = toX(points[0].lng);
        const p0y = toY(points[0].lat);
        const pNx = toX(points[points.length - 1].lng);
        const pNy = toY(points[points.length - 1].lat);
        const lineGrad = ctx.createLinearGradient(p0x, p0y, pNx, pNy);
        lineGrad.addColorStop(0, '#4ade80');
        lineGrad.addColorStop(0.5, ACCENT);
        lineGrad.addColorStop(1, '#f87171');

        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(toX(points[i].lng), toY(points[i].lat));
        }
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Start marker
        ctx.beginPath();
        ctx.arc(p0x, p0y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#4ade80';
        ctx.fill();
        ctx.strokeStyle = TEXT_PRIMARY;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // End marker
        ctx.beginPath();
        ctx.arc(pNx, pNy, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#f87171';
        ctx.fill();
        ctx.strokeStyle = TEXT_PRIMARY;
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }

    // Divider
    const divY = H - FOOTER_H;
    ctx.strokeStyle = DIVIDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, divY);
    ctx.lineTo(W - 50, divY);
    ctx.stroke();

    // Stats
    const row1Stats = [
        { label: 'Distance', value: `${Math.round((summary?.totalDistance ?? 0) * 100) / 100} km` },
        { label: 'Moving Time', value: secondsToHHMM(summary?.totalMovingTime ?? 0) },
        { label: 'Avg Speed', value: `${Math.round((summary?.avgSpeed ?? 0) * 10) / 10} km/h` },
    ];

    const row2Candidates = [];
    if (summary?.totalCalories) row2Candidates.push({ label: 'Calories', value: `${Math.round(summary.totalCalories)} kcal` });
    if (summary?.totalAscent) row2Candidates.push({ label: 'Ascent', value: `${Math.round(summary.totalAscent)} m` });
    if (summary?.maxSpeed) row2Candidates.push({ label: 'Max Speed', value: `${Math.round(summary.maxSpeed * 10) / 10} km/h` });
    if (summary?.avgHeartRate) row2Candidates.push({ label: 'Avg HR', value: `${Math.round(summary.avgHeartRate)} bpm` });
    const row2Stats = row2Candidates.slice(0, 3);

    const drawStatRow = (stats, y, valueFont, labelFont, valueH) => {
        const colW = W / stats.length;
        stats.forEach((stat, i) => {
            const cx = colW * i + colW / 2;
            ctx.fillStyle = ACCENT;
            ctx.font = valueFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(stat.value, cx, y);
            ctx.fillStyle = TEXT_MUTED;
            ctx.font = labelFont;
            ctx.fillText(stat.label, cx, y + valueH);
        });
    };

    const row1Y = divY + 28;
    drawStatRow(row1Stats, row1Y, 'bold 54px system-ui, -apple-system, sans-serif', '24px system-ui, -apple-system, sans-serif', 60);

    if (row2Stats.length > 0) {
        const row2Y = row1Y + 118;
        drawStatRow(row2Stats, row2Y, 'bold 36px system-ui, -apple-system, sans-serif', '20px system-ui, -apple-system, sans-serif', 42);
    }

    // Branding
    ctx.fillStyle = DIVIDER;
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('fit parser', W - 30, H - 16);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
}

export async function shareRouteImage(route) {
    const blob = await generateRouteImage(route);
    const safeName = (route.routeName || 'route').replace(/[^a-z0-9_\-]/gi, '_');
    const file = new File([blob], `${safeName}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: route.routeName });
    } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
