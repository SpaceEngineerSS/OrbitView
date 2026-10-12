/**
 * iCalendar (RFC 5545) export for a satellite pass, so it can go into any
 * calendar app with a reminder. Times are written in UTC.
 */

export interface IcsPass {
    uid: string;
    start: Date;
    end: Date;
    summary: string;
    description: string;
    location?: string;
    /** Minutes before the start for the reminder; 0 = none */
    alarmMinutes?: number;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Escape text values (backslash, semicolon, comma, newline). */
export function escapeText(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 characters with CRLF + space. */
export function fold(line: string): string {
    if (line.length <= 75) return line;
    const parts = [line.slice(0, 75)];
    for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74));
    return parts.join('\r\n');
}

export function passToIcs(p: IcsPass, now: Date = new Date()): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//OrbitView//4.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${p.uid}@orbitview`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART:${stamp(p.start)}`,
        `DTEND:${stamp(p.end)}`,
        `SUMMARY:${escapeText(p.summary)}`,
        `DESCRIPTION:${escapeText(p.description)}`,
        ...(p.location ? [`LOCATION:${escapeText(p.location)}`] : []),
        ...(p.alarmMinutes
            ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(p.summary)}`, `TRIGGER:-PT${Math.round(p.alarmMinutes)}M`, 'END:VALARM']
            : []),
        'END:VEVENT',
        'END:VCALENDAR',
    ];
    return lines.map(fold).join('\r\n') + '\r\n';
}
