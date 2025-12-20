import {
    predictOrbitalDecay,
    getAtmosphericDensity,
    parseBStar,
    getAltitudeColor,
    formatLifetime
} from '../OrbitalDecay';

describe('OrbitalDecay', () => {
    describe('getAtmosphericDensity', () => {
        it('should return higher density at lower altitudes', () => {
            const densityLow = getAtmosphericDensity(200);
            const densityHigh = getAtmosphericDensity(800);
            expect(densityLow).toBeGreaterThan(densityHigh);
        });

        it('should return positive density values', () => {
            expect(getAtmosphericDensity(400)).toBeGreaterThan(0);
            expect(getAtmosphericDensity(600)).toBeGreaterThan(0);
        });

        it('should handle edge cases', () => {
            expect(getAtmosphericDensity(100)).toBeGreaterThan(0);
            expect(getAtmosphericDensity(1500)).toBeGreaterThanOrEqual(0);
        });
    });

    describe('parseBStar', () => {
        it('should return 0 for short input', () => {
            const result = parseBStar('short');
            expect(result).toBe(0);
        });

        it('should parse valid B* format from TLE line', () => {
            const tleLine1 = '1 25544U 98067A   24353.54167824  .00016717  00000-0  30269-3 0  9992';
            const result = parseBStar(tleLine1);
            expect(typeof result).toBe('number');
        });
    });

    describe('predictOrbitalDecay', () => {
        it('should predict decay for low orbit satellite', () => {
            const prediction = predictOrbitalDecay(6621, 0.001, 0.001, new Date());
            expect(prediction).toBeDefined();
            expect(prediction.currentAltitudeKm).toBeCloseTo(250, 0);
            expect(prediction.estimatedLifetimeDays).toBeGreaterThan(0);
            expect(prediction.decayRateKmPerDay).toBeGreaterThanOrEqual(0);
        });

        it('should predict longer lifetime for higher orbits', () => {
            const lowOrbit = predictOrbitalDecay(6621, 0.001, 0.001, new Date());
            const highOrbit = predictOrbitalDecay(6721, 0.001, 0.001, new Date());
            expect(highOrbit.estimatedLifetimeDays).toBeGreaterThan(lowOrbit.estimatedLifetimeDays);
        });

        it('should assign appropriate risk levels', () => {
            const criticalOrbit = predictOrbitalDecay(6521, 0.001, 0.001, new Date());
            const safeOrbit = predictOrbitalDecay(6721, 0.001, 0.00001, new Date());
            expect(['low', 'medium', 'high', 'critical']).toContain(criticalOrbit.riskLevel);
            expect(['low', 'medium', 'high', 'critical']).toContain(safeOrbit.riskLevel);
        });

        it('should calculate reentry date', () => {
            const prediction = predictOrbitalDecay(6621, 0.001, 0.001, new Date());
            expect(prediction.estimatedReentryDate).toBeInstanceOf(Date);
            expect(prediction.estimatedReentryDate.getTime()).toBeGreaterThan(Date.now());
        });
    });

    describe('Helper functions', () => {
        describe('getAltitudeColor', () => {
            it('should return appropriate colors for altitudes', () => {
                expect(getAltitudeColor(150)).toBe('#ef4444');
                expect(getAltitudeColor(250)).toBe('#f97316');
                expect(getAltitudeColor(350)).toBe('#eab308');
                expect(getAltitudeColor(600)).toBe('#22c55e');
            });
        });

        describe('formatLifetime', () => {
            it('should format days appropriately', () => {
                expect(formatLifetime(0.5)).toBe('< 1 day');
                expect(formatLifetime(15)).toContain('days');
                expect(formatLifetime(180)).toContain('months');
                expect(formatLifetime(730)).toContain('years');
                expect(formatLifetime(4000)).toBe('> 10 years');
            });
        });
    });
});
