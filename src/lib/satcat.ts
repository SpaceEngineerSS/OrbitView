/**
 * CelesTrak SATCAT: who owns an object, when and where it was launched, and
 * what kind of object it is. The server turns the 6–7 MB CSV into a compact
 * table of objects still in orbit; the client looks rows up by NORAD id.
 */

export type ObjectKindCode = 'PAY' | 'R/B' | 'DEB' | 'UNK';

export interface SatcatInfo {
    owner: string;        // SATCAT owner code, e.g. US, PRC, CIS, TURK
    launchDate: string;   // YYYY-MM-DD
    launchSite: string;   // site code, e.g. AFETR, TYMSC
    kind: ObjectKindCode;
    /** Operational status code (+ operational, - non-operational, P partial, …) */
    status: string;
    /** Radar cross section, m² (absent for many objects) */
    rcs: number | null;
    intlDesignator: string;
}

/** Compact row: [norad, owner, launchDate, site, kind, status, rcs, intlDesignator] */
export type SatcatRow = [string, string, string, string, ObjectKindCode, string, number | null, string];

export interface SatcatPayload {
    fetchedAt: number;
    rows: SatcatRow[];
}

/** Split one CSV line, honouring double-quoted fields. */
export function splitCsv(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quoted) {
            if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cur += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
    }
    out.push(cur);
    return out;
}

const KINDS = new Set(['PAY', 'R/B', 'DEB', 'UNK']);

/** Parse the SATCAT CSV, keeping only objects that have not decayed. */
export function parseSatcatCsv(csv: string): SatcatRow[] {
    const lines = csv.split(/\r?\n/);
    const header = splitCsv(lines[0] ?? '');
    const col = (name: string) => header.indexOf(name);
    const iId = col('NORAD_CAT_ID'), iIntl = col('OBJECT_ID'), iType = col('OBJECT_TYPE'), iOps = col('OPS_STATUS_CODE');
    const iOwner = col('OWNER'), iDate = col('LAUNCH_DATE'), iSite = col('LAUNCH_SITE'), iDecay = col('DECAY_DATE'), iRcs = col('RCS');
    if ([iId, iType, iOwner, iDate, iSite, iDecay].some((i) => i < 0)) throw new Error('Unexpected SATCAT header');

    const rows: SatcatRow[] = [];
    for (let k = 1; k < lines.length; k++) {
        const line = lines[k];
        if (!line) continue;
        const f = splitCsv(line);
        if (f[iDecay]) continue; // already re-entered
        const id = f[iId]?.trim();
        if (!id) continue;
        const kind = (KINDS.has(f[iType]) ? f[iType] : 'UNK') as ObjectKindCode;
        const rcs = iRcs >= 0 && f[iRcs] ? Number(f[iRcs]) : NaN;
        rows.push([id, f[iOwner] ?? '', f[iDate] ?? '', f[iSite] ?? '', kind, iOps >= 0 ? f[iOps] ?? '' : '', Number.isFinite(rcs) ? rcs : null, iIntl >= 0 ? f[iIntl] ?? '' : '']);
    }
    return rows;
}

export function rowToInfo(r: SatcatRow): SatcatInfo {
    return { owner: r[1], launchDate: r[2], launchSite: r[3], kind: r[4], status: r[5], rcs: r[6], intlDesignator: r[7] };
}

/** Owner codes shown in the country filter, in this order. */
export const COUNTRY_FILTERS = ['TURK', 'US', 'PRC', 'CIS', 'ESA', 'UK', 'FR', 'JPN', 'IND', 'GER', 'IT', 'SKOR', 'CA', 'ISR', 'UAE'] as const;

/** Launch sites with a readable name; others show their code. */
export const LAUNCH_SITES: Record<string, string> = {
    AFETR: 'Cape Canaveral',
    AFWTR: 'Vandenberg',
    KSC: 'Kennedy Space Center',
    WRAS: 'Wallops',
    TYMSC: 'Baikonur',
    PLMSC: 'Plesetsk',
    VOSTO: 'Vostochny',
    KYMSC: 'Kapustin Yar',
    JSC: 'Jiuquan',
    TSC: 'Taiyuan',
    XSC: 'Xichang',
    WSC: 'Wenchang',
    YSLA: 'Yellow Sea',
    FRGUI: 'Kourou',
    SRILR: 'Sriharikota',
    TNSTA: 'Tanegashima',
    KSCUT: 'Uchinoura',
    RLLB: 'Mahia (Rocket Lab)',
    NSC: 'Naro',
    SEAL: 'Sea Launch',
    SVOBO: 'Svobodny',
    YAVNE: 'Palmachim',
    SNMLP: 'San Marco',
    KWAJ: 'Kwajalein',
};
