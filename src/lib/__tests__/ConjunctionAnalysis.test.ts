import {
    parseSOCRATES,
    generateSampleConjunctions,
    formatTimeToTCA,
    getRiskColor,
    getObjectTypeIcon
} from '../ConjunctionAnalysis';

describe('ConjunctionAnalysis', () => {
    describe('generateSampleConjunctions', () => {
        it('should return an array of sample events', () => {
            const result = generateSampleConjunctions();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return valid conjunction data', () => {
            const result = generateSampleConjunctions();
            const first = result[0];
            expect(first.primaryObject).toBeDefined();
            expect(first.secondaryObject).toBeDefined();
            expect(first.tca).toBeInstanceOf(Date);
            expect(typeof first.minRangeKm).toBe('number');
            expect(typeof first.relativeVelocityKmS).toBe('number');
            expect(['low', 'medium', 'high', 'critical']).toContain(first.riskLevel);
        });
    });

    describe('parseSOCRATES', () => {
        it('should return empty array for empty input', () => {
            const result = parseSOCRATES('');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        it('should return empty array for header only', () => {
            const result = parseSOCRATES('Header,Line,Only');
            expect(result.length).toBe(0);
        });
    });

    describe('formatTimeToTCA', () => {
        it('should return PASSED for past dates', () => {
            const pastDate = new Date(Date.now() - 1000);
            expect(formatTimeToTCA(pastDate)).toBe('PASSED');
        });

        it('should format hours and minutes for near future', () => {
            const futureDate = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours
            const result = formatTimeToTCA(futureDate);
            expect(result).toContain('h');
            expect(result).toContain('m');
        });

        it('should format days for distant future', () => {
            const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days
            const result = formatTimeToTCA(futureDate);
            expect(result).toContain('d');
        });
    });

    describe('getRiskColor', () => {
        it('should return correct colors for risk levels', () => {
            expect(getRiskColor('critical')).toBe('#ef4444');
            expect(getRiskColor('high')).toBe('#f97316');
            expect(getRiskColor('medium')).toBe('#eab308');
            expect(getRiskColor('low')).toBe('#22c55e');
        });

        it('should return default color for unknown level', () => {
            expect(getRiskColor('unknown')).toBe('#64748b');
        });
    });

    describe('getObjectTypeIcon', () => {
        it('should return correct icons for object types', () => {
            expect(getObjectTypeIcon('payload')).toBe('satellite');
            expect(getObjectTypeIcon('debris')).toBe('circle-x');
            expect(getObjectTypeIcon('rocket_body')).toBe('rocket');
        });

        it('should return help-circle for unknown types', () => {
            expect(getObjectTypeIcon('unknown')).toBe('help-circle');
        });
    });
});
