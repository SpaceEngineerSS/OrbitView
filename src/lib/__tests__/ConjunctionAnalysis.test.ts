import { classifyObject, riskFromMissDistance, timeToTCA, getRiskColor } from '../ConjunctionAnalysis';

describe('ConjunctionAnalysis helpers', () => {
    it('classifies catalog names', () => {
        expect(classifyObject('COSMOS 1408 DEB')).toBe('debris');
        expect(classifyObject('FENGYUN 1C DEB')).toBe('debris');
        expect(classifyObject('CZ-4C R/B')).toBe('rocket_body');
        expect(classifyObject('ISS (ZARYA)')).toBe('payload');
        expect(classifyObject('  ')).toBe('unknown');
    });

    it('maps miss distance to risk', () => {
        expect(riskFromMissDistance(0.5)).toBe('critical');
        expect(riskFromMissDistance(3)).toBe('high');
        expect(riskFromMissDistance(7)).toBe('medium');
        expect(riskFromMissDistance(20)).toBe('low');
    });

    it('splits time to TCA relative to the given clock, not wall time', () => {
        const now = new Date('2026-01-01T00:00:00Z');
        expect(timeToTCA(new Date('2026-01-02T05:07:00Z'), now)).toEqual({ passed: false, days: 1, hours: 5, minutes: 7 });
        expect(timeToTCA(new Date('2025-12-31T23:00:00Z'), now).passed).toBe(true);
    });

    it('uses the console palette', () => {
        expect(getRiskColor('critical')).toBe('#d9534f');
        expect(getRiskColor('low')).toBe('#8d9097');
    });
});
