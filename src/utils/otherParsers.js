export function secondsToHHMM(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');

    return `${hh}:${mm}`;
}