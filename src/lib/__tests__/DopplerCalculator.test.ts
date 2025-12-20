import {
    calculateDopplerShift,
    geodeticToECF,
    ObserverPosition,
    SatelliteState,
    COMMON_FREQUENCIES
} from '../DopplerCalculator';

describe('DopplerCalculator', () => {
    describe('geodeticToECF', () => {
        it('should convert geodetic coordinates to ECF', () => {
            const result = geodeticToECF(0, 0, 0);
            expect(result.x).toBeCloseTo(6378137, 0);
            expect(result.y).toBeCloseTo(0, 0);
            expect(result.z).toBeCloseTo(0, 0);
        });

        it('should handle different latitudes', () => {
            const northPole = geodeticToECF(90, 0, 0);
            expect(northPole.x).toBeCloseTo(0, 0);
            expect(northPole.y).toBeCloseTo(0, 0);
            expect(northPole.z).toBeGreaterThan(6300000);
        });

        it('should handle altitude', () => {
            const groundLevel = geodeticToECF(0, 0, 0);
            const elevated = geodeticToECF(0, 0, 1000);
            expect(elevated.x).toBeGreaterThan(groundLevel.x);
        });
    });

    describe('calculateDopplerShift', () => {
        const observer: ObserverPosition = {
            latitude: 41.0082,
            longitude: 28.9784,
            altitude: 0
        };

        it('should calculate Doppler shift for approaching satellite', () => {
            const satellite: SatelliteState = {
                position: { x: 7000000, y: 0, z: 3000000 },
                velocity: { x: -7000, y: 0, z: -1000 }
            };
            const result = calculateDopplerShift(satellite, observer, COMMON_FREQUENCIES.ISS_VOICE);
            expect(result).toBeDefined();
            expect(result.dopplerShiftHz).toBeDefined();
            expect(typeof result.dopplerShiftHz).toBe('number');
            expect(result.rangeKm).toBeGreaterThan(0);
        });

        it('should calculate Doppler shift for receding satellite', () => {
            const satellite: SatelliteState = {
                position: { x: 7000000, y: 0, z: 3000000 },
                velocity: { x: 7000, y: 0, z: 1000 }
            };
            const result = calculateDopplerShift(satellite, observer, COMMON_FREQUENCIES.ISS_VOICE);
            expect(result).toBeDefined();
            expect(result.receivedFreqHz).toBeDefined();
        });

        it('should return near-zero shift for perpendicular motion', () => {
            const satellite: SatelliteState = {
                position: { x: 7000000, y: 0, z: 3000000 },
                velocity: { x: 0, y: 7000, z: 0 }
            };
            const result = calculateDopplerShift(satellite, observer, COMMON_FREQUENCIES.ISS_VOICE);
            expect(result).toBeDefined();
            expect(Math.abs(result.dopplerShiftHz)).toBeLessThan(10000);
        });

        it('should work with different frequencies', () => {
            const satellite: SatelliteState = {
                position: { x: 7000000, y: 0, z: 3000000 },
                velocity: { x: -7000, y: 0, z: 0 }
            };
            const resultLow = calculateDopplerShift(satellite, observer, COMMON_FREQUENCIES.ISS_VOICE);
            const resultHigh = calculateDopplerShift(satellite, observer, COMMON_FREQUENCIES.GPS_L1);
            expect(Math.abs(resultHigh.dopplerShiftHz)).toBeGreaterThan(Math.abs(resultLow.dopplerShiftHz));
        });
    });

    describe('COMMON_FREQUENCIES', () => {
        it('should have expected frequency values', () => {
            expect(COMMON_FREQUENCIES.ISS_VOICE).toBe(145800000);
            expect(COMMON_FREQUENCIES.GPS_L1).toBe(1575420000);
        });
    });
});
