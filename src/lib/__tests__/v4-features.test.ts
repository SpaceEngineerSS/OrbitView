import * as satellite from 'satellite.js';
import { staticTier, measuredTier, median } from '../deviceTier';
import { propagateInto, frameInterval } from '../frameMath';
import { getSatrec, stateAt } from '../orbit';
import { passToIcs, escapeText, fold } from '../ics';
import { parseSatcatCsv, splitCsv, rowToInfo } from '../satcat';
import { nightWindow, sunElevation, tonightPasses } from '../tonight';
import { ensurePasses, passSnapshot } from '@/hooks/useAnalysis';
import { matchesCountry } from '@/store/satcatStore';

const ISS1 = '1 25544U 98067A   23351.58334491  .00016717  00000-0  30142-3 0  9999';
const ISS2 = '2 25544  51.6416 250.7541 0004124 163.7645 282.8447 15.49520176430335';
const ISTANBUL = { latitude: 41.0082, longitude: 28.9784, altitude: 40 };

describe('device tier', () => {
    it('static signals', () => {
        expect(staticTier({ cores: 8, memoryGb: 8 })).toBe('high');
        expect(staticTier({ cores: 4 })).toBe('low');
        expect(staticTier({ memoryGb: 2 })).toBe('low');
        expect(staticTier({ saveData: true, cores: 16 })).toBe('low');
    });

    it('measured frame times', () => {
        expect(median([3, 1, 2])).toBe(2);
        expect(measuredTier([], [])).toBeNull();
        expect(measuredTier(Array(20).fill(10), [])).toBe('high');
        expect(measuredTier(Array(20).fill(40), [])).toBe('low');
        expect(measuredTier([], Array(10).fill(150))).toBe('high');
        expect(measuredTier([], Array(10).fill(400))).toBe('low');
    });
});

describe('frame worker maths', () => {
    it('inline TEME→ECF matches stateAt to under a metre', () => {
        const rec = getSatrec(ISS1, ISS2);
        const date = new Date('2023-12-17T14:00:00Z');
        const out = new Float32Array(3);
        expect(propagateInto(out, [0], [rec], date)).toBe(0);
        const s = stateAt(rec, date)!;
        // Float32 holds ~7 significant digits: < 1 m at 7000 km.
        expect(Math.abs(out[0] - s.positionEcf.x * 1000)).toBeLessThan(1);
        expect(Math.abs(out[1] - s.positionEcf.y * 1000)).toBeLessThan(1);
        expect(Math.abs(out[2] - s.positionEcf.z * 1000)).toBeLessThan(1);
    });

    it('only touches the listed indices and marks failures', () => {
        const good = getSatrec(ISS1, ISS2);
        const bad = satellite.twoline2satrec(ISS1, ISS2.replace('0004124', '9999999')); // e ≥ 1
        const out = new Float32Array(9).fill(7);
        const failed = propagateInto(out, [0, 2], [good, good, bad], new Date('2023-12-17T14:00:00Z'));
        expect(failed).toBe(1);
        expect(out[3]).toBe(7); // index 1 untouched
        expect(Number.isNaN(out[6])).toBe(true);
    });

    it('adapts the frame rate', () => {
        const base = { playing: true, multiplier: 1, cameraHeight: 20_000_000, lowPower: false };
        expect(frameInterval({ ...base, playing: false })).toBe(0);
        expect(frameInterval(base)).toBe(500);
        expect(frameInterval({ ...base, cameraHeight: 1_000_000 })).toBe(100);
        expect(frameInterval({ ...base, multiplier: 300 })).toBe(66);
        expect(frameInterval({ ...base, multiplier: 300, lowPower: true })).toBe(200);
    });
});

describe('calendar export', () => {
    const ics = passToIcs({
        uid: '25544-1',
        start: new Date('2026-10-14T03:38:12Z'),
        end: new Date('2026-10-14T03:44:44Z'),
        summary: 'ISS passes over',
        description: 'Up to 45°, SW → NE; visible',
        location: 'İstanbul',
        alarmMinutes: 10,
    }, new Date('2026-10-12T00:00:00Z'));

    it('is a valid VEVENT with UTC times, CRLF and an alarm', () => {
        expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
        expect(ics).toContain('DTSTART:20261014T033812Z');
        expect(ics).toContain('DTEND:20261014T034444Z');
        expect(ics).toContain('TRIGGER:-PT10M');
        expect(ics).toContain('DESCRIPTION:Up to 45°\\, SW → NE\\; visible');
        expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
    });

    it('escapes and folds', () => {
        expect(escapeText('a,b;c\nd\\')).toBe('a\\,b\\;c\\nd\\\\');
        expect(fold('x'.repeat(160)).split('\r\n').map((l) => l.length)).toEqual([75, 75, 12]);
    });
});

describe('SATCAT parsing', () => {
    const csv = [
        'OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,APOGEE,PERIGEE,RCS,DATA_STATUS_CODE,ORBIT_CENTER,ORBIT_TYPE',
        'SPUTNIK 1,1957-001B,2,PAY,D,CIS,1957-10-04,TYMSC,1958-01-03,96.10,65.00,1080,64,,,EA,IMP',
        'ISS (ZARYA),1998-067A,25544,PAY,+,ISS,1998-11-20,TYMSC,,92.9,51.6,422,416,399.0524,,EA,ORB',
        '"TURKSAT 4A, TEST",2014-007A,39522,PAY,+,TURK,2014-02-14,TYMSC,,1436.1,0.0,35797,35776,,,EA,ORB',
    ].join('\n');

    it('keeps only objects in orbit and handles quoted names', () => {
        const rows = parseSatcatCsv(csv);
        expect(rows.map((r) => r[0])).toEqual(['25544', '39522']);
        const info = rowToInfo(rows[1]);
        expect(info.owner).toBe('TURK');
        expect(info.launchDate).toBe('2014-02-14');
        expect(info.rcs).toBeNull();
        expect(rowToInfo(rows[0]).rcs).toBeCloseTo(399.0524);
    });

    it('splits CSV with escaped quotes', () => {
        expect(splitCsv('a,"b, ""c""",d')).toEqual(['a', 'b, "c"', 'd']);
    });
});

describe('tonight', () => {
    it('finds the next dark window with the Sun below −6° inside it', () => {
        const from = Date.parse('2026-10-14T12:00:00Z'); // daytime in Istanbul
        const w = nightWindow(ISTANBUL, from)!;
        expect(w.start).toBeGreaterThan(from);
        expect(w.end).toBeGreaterThan(w.start);
        expect(sunElevation(ISTANBUL, w.start + 60_000)).toBeLessThan(-6);
        expect(sunElevation(ISTANBUL, w.end - 60_000)).toBeLessThan(-6);
        expect(sunElevation(ISTANBUL, w.start - 120_000)).toBeGreaterThan(-6);
        expect((w.end - w.start) / 3600_000).toBeGreaterThan(8);
        expect((w.end - w.start) / 3600_000).toBeLessThan(14);
    });

    it('starts now when it is already dark', () => {
        const from = Date.parse('2026-10-14T22:00:00Z');
        expect(nightWindow(ISTANBUL, from)!.start).toBe(from);
    });

    it('returns only visible passes, in time order', () => {
        const rec = getSatrec(ISS1, ISS2);
        const w = { start: Date.parse('2023-12-17T14:00:00Z'), end: Date.parse('2023-12-18T14:00:00Z') };
        const list = tonightPasses([{ id: '25544', name: 'ISS', rec }], ISTANBUL, w);
        for (let i = 1; i < list.length; i++) expect(list[i].aosTime.getTime()).toBeGreaterThanOrEqual(list[i - 1].aosTime.getTime());
        expect(list.every((p) => p.visible)).toBe(true);
    });
});

describe('shared pass cache', () => {
    it('runs one calculation per key and keeps the last result while a new window loads', async () => {
        const run = jest.fn().mockResolvedValue([]);
        ensurePasses('k|1', 'k', run);
        ensurePasses('k|1', 'k', run);
        expect(run).toHaveBeenCalledTimes(1);
        await Promise.resolve(); await Promise.resolve();
        expect(passSnapshot('k|1', 'k').status).toBe('ready');
        ensurePasses('k|2', 'k', () => new Promise(() => {}));
        expect(passSnapshot('k|2', 'k').status).toBe('ready'); // previous window still shown
    });
});

describe('country filter', () => {
    const owners = new Map([['39522', 'TURK'], ['25544', 'ISS']]);
    it('filters by owner once the satellite catalog is loaded', () => {
        expect(matchesCountry('39522', 'TURK', owners)).toBe(true);
        expect(matchesCountry('25544', 'TURK', owners)).toBe(false);
    });
    it('hides nothing while the catalog is missing (v4.0 drew an empty globe)', () => {
        expect(matchesCountry('25544', 'TURK', null)).toBe(true);
        expect(matchesCountry('25544', null, null)).toBe(true);
    });
});
