import { predictPasses, getLookAngles } from '../PassPrediction';
import { calculateSunPosition, isSatelliteSunlit } from '../CoordinateConverter';
import { SatelliteData } from '../tle';

describe('PassPrediction', () => {
    const mockSatellite: SatelliteData = {
        id: '25544',
        name: 'ISS (ZARYA)',
        line1: '1 25544U 98067A   23351.58334491  .00016717  00000-0  30142-3 0  9999',
        line2: '2 25544  51.6416 250.7541 0004124 163.7645 282.8447 15.49520176430335'
    };

    const mockObserver = {
        latitude: 41.0082,
        longitude: 28.9784,
        altitude: 0
    };

    test('getLookAngles should return valid coordinates when satellite is above horizon', () => {
        const date = new Date('2025-12-20T12:00:00Z');
        const result = getLookAngles(mockSatellite, mockObserver, date);
        expect(result).toBeDefined();
        if (result) {
            expect(result.azimuth).toBeGreaterThanOrEqual(0);
            expect(result.azimuth).toBeLessThan(360);
            expect(result.elevation).toBeGreaterThanOrEqual(-90);
            expect(result.elevation).toBeLessThanOrEqual(90);
        }
    });

    test('predictPasses should return an array of passes', () => {
        const start = new Date('2025-12-20T00:00:00Z');
        const end = new Date('2025-12-21T00:00:00Z');
        const passes = predictPasses(mockSatellite, mockObserver, start, end, 10);
        expect(Array.isArray(passes)).toBe(true);
        if (passes.length > 0) {
            expect(passes[0]).toHaveProperty('aosTime');
            expect(passes[0]).toHaveProperty('losTime');
            expect(passes[0]).toHaveProperty('maxElevation');
            expect(passes[0]).toHaveProperty('visible');
        }
    });
});

describe('CoordinateConverter - Visibility', () => {
    test('calculateSunPosition should return valid ECF coordinates', () => {
        const date = new Date('2025-12-20T12:00:00Z');
        const sunPos = calculateSunPosition(date);
        expect(sunPos).toHaveProperty('x');
        expect(sunPos).toHaveProperty('y');
        expect(sunPos).toHaveProperty('z');
        const dist = Math.sqrt(sunPos.x ** 2 + sunPos.y ** 2 + sunPos.z ** 2);
        // Sun distance is approx 149 million km
        expect(dist).toBeGreaterThan(140000000);
        expect(dist).toBeLessThan(160000000);
    });

    test('isSatelliteSunlit should return true for a high altitude satellite in daylight', () => {
        // Position on the sunlit side of Earth
        const sunEcf = { x: 149000000, y: 0, z: 0 };
        const satEcf = { x: 7000, y: 0, z: 0 };
        expect(isSatelliteSunlit(satEcf, sunEcf)).toBe(true);
    });

    test('isSatelliteSunlit should return false for a low altitude satellite in Earth shadow', () => {
        // Position on the dark side of Earth, inside the shadow cylinder
        const sunEcf = { x: 149000000, y: 0, z: 0 };
        const satEcf = { x: -6500, y: 100, z: 100 }; // Very close to Earth on opposite side
        expect(isSatelliteSunlit(satEcf, sunEcf)).toBe(false);
    });
});
