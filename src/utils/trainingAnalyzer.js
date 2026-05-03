import { subWeeks, startOfWeek, endOfWeek, format } from 'date-fns';

export function buildTrainingPrompt(routes) {
    if (!routes || routes.length === 0) return null;

    const sorted = [...routes].sort(
        (a, b) => new Date(b.summary.startTime) - new Date(a.summary.startTime)
    );

    const now = new Date();

    // Aggregate last 8 weeks
    const weeklyData = [];
    for (let i = 0; i < 8; i++) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

        const weekRoutes = sorted.filter(r => {
            const d = new Date(r.summary.startTime);
            return d >= weekStart && d <= weekEnd;
        });

        if (weekRoutes.length > 0 || i < 2) {
            const hrRoutes = weekRoutes.filter(r => r.summary.avgHeartRate > 0);
            weeklyData.push({
                label: i === 0 ? `Week of ${format(weekStart, 'MMM dd')} (current)` : `Week of ${format(weekStart, 'MMM dd')}`,
                activities: weekRoutes.length,
                distance: Math.round(weekRoutes.reduce((s, r) => s + (r.summary.totalDistance || 0), 0) * 10) / 10,
                minutes: Math.round(weekRoutes.reduce((s, r) => s + (r.summary.totalMovingTime || 0), 0) / 60),
                elevation: Math.round(weekRoutes.reduce((s, r) => s + (r.summary.totalAscent || 0), 0)),
                avgHR: hrRoutes.length > 0
                    ? Math.round(hrRoutes.reduce((s, r) => s + r.summary.avgHeartRate, 0) / hrRoutes.length)
                    : null,
            });
        }
    }

    // Last 5 activities
    const recent = sorted.slice(0, 5).map(r => {
        const s = r.summary;
        const parts = [
            `${format(new Date(s.startTime), 'MMM dd')} [${s.sport || 'unknown'}]`,
            `${Math.round((s.totalDistance || 0) * 10) / 10} km`,
            `${Math.round((s.totalMovingTime || 0) / 60)} min`,
        ];
        if (s.avgHeartRate) parts.push(`avg HR ${s.avgHeartRate}/${s.maxHeartRate || '?'} bpm`);
        if (s.avgPower) parts.push(`avg power ${Math.round(s.avgPower)} W`);
        if (s.totalAscent) parts.push(`${Math.round(s.totalAscent)} m gain`);
        if (s.avgSpeed) parts.push(`${Math.round(s.avgSpeed * 10) / 10} km/h`);
        return parts.join(', ');
    });

    const daysSinceLast = Math.floor((now - new Date(sorted[0].summary.startTime)) / 86400000);

    let prompt = `You are a coach. Analyze this training data. Be direct, use numbers, no filler.

WEEKS (newest first):
`;
    weeklyData.forEach(w => {
        let line = `${w.label}: ${w.activities}x, ${w.distance}km, ${w.minutes}min`;
        if (w.elevation > 0) line += `, ${w.elevation}m↑`;
        if (w.avgHR) line += `, HR${w.avgHR}`;
        prompt += line + '\n';
    });

    prompt += `
        LAST ${recent.length} SESSIONS:
        ${recent.map(r => r).join('\n')}
        Rest days since last: ${daysSinceLast}

        Reply with exactly these 5 lines (one sentence each):
        **Load**: <current load vs trend>

        **Recovery**: <train or rest today, and why>

        **Trend**: <volume direction>

        **Next 2 weeks**: <2-3 actions>
        
        **Focus**: <single most impactful change>`;

    return prompt;
}
