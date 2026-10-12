/**
 * Ephemeris export.
 *
 * Writes a table of SGP4 positions for the selected object, starting at the
 * simulation time, plus the TLE and mean elements it came from. CSV for
 * spreadsheets, JSON for scripts.
 */

import type { SpaceObject } from './space-objects';
import { getSatrec, stateAt, elementsFromSatrec, type OrbitalElements } from './orbit';

export interface EphemerisRow {
    time: string;          // ISO 8601 UTC
    latitudeDeg: number;
    longitudeDeg: number;
    altitudeKm: number;
    xKm: number; yKm: number; zKm: number;          // TEME
    vxKmS: number; vyKmS: number; vzKmS: number;    // TEME
}

export function buildEphemeris(obj: SpaceObject, start: Date, minutes: number, stepSeconds: number): EphemerisRow[] {
    if (!obj.tle) return [];
    const rec = getSatrec(obj.tle.line1, obj.tle.line2);
    const rows: EphemerisRow[] = [];
    for (let s = 0; s <= minutes * 60; s += stepSeconds) {
        const t = new Date(start.getTime() + s * 1000);
        const st = stateAt(rec, t);
        if (!st) continue;
        rows.push({
            time: t.toISOString(),
            latitudeDeg: st.latitudeDeg,
            longitudeDeg: st.longitudeDeg,
            altitudeKm: st.altitudeKm,
            xKm: st.positionEci.x, yKm: st.positionEci.y, zKm: st.positionEci.z,
            vxKmS: st.velocityEci.x, vyKmS: st.velocityEci.y, vzKmS: st.velocityEci.z,
        });
    }
    return rows;
}

const f = (n: number, d: number) => n.toFixed(d);

export function ephemerisToCSV(obj: SpaceObject, rows: EphemerisRow[]): string {
    const lines = [
        `# OrbitView ephemeris — ${obj.name} (NORAD ${obj.id})`,
        `# Propagator: SGP4 (satellite.js). Position/velocity frame: TEME. Lat/lon: WGS-84.`,
        `# TLE line 1: ${obj.tle?.line1 ?? ''}`,
        `# TLE line 2: ${obj.tle?.line2 ?? ''}`,
        'time_utc,lat_deg,lon_deg,alt_km,x_km,y_km,z_km,vx_km_s,vy_km_s,vz_km_s',
    ];
    for (const r of rows) {
        lines.push([
            r.time, f(r.latitudeDeg, 5), f(r.longitudeDeg, 5), f(r.altitudeKm, 3),
            f(r.xKm, 3), f(r.yKm, 3), f(r.zKm, 3), f(r.vxKmS, 6), f(r.vyKmS, 6), f(r.vzKmS, 6),
        ].join(','));
    }
    return lines.join('\n') + '\n';
}

export function ephemerisToJSON(obj: SpaceObject, rows: EphemerisRow[]): string {
    let elements: OrbitalElements | null = null;
    if (obj.tle) elements = elementsFromSatrec(getSatrec(obj.tle.line1, obj.tle.line2));
    return JSON.stringify({
        object: { noradId: obj.id, name: obj.name },
        tle: obj.tle ?? null,
        elements,
        frame: { position: 'TEME', geodetic: 'WGS-84' },
        generator: 'OrbitView 4.0.0',
        rows,
    }, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(obj: SpaceObject, ext: string, start: Date): string {
    const name = obj.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const stamp = start.toISOString().slice(0, 16).replace(/[:T]/g, '');
    return `${name}_${obj.id}_${stamp}.${ext}`;
}
