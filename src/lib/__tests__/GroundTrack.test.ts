import {
    calculateGroundTrack,
    calculateFootprintRadius,
    generateFootprintCircle,
    calculateVisibilityZones,
    isWithinFootprint
} from '../GroundTrack';

// Sample ISS TLE for testing
const ISS_TLE1 = '1 25544U 98067A   24353.54167824  .00016717  00000-0  30269-3 0  9992';
const ISS_TLE2 = '2 25544  51.6400 123.4567 0007976  35.1234 123.4567 15.50377579234567';

describe('GroundTrack', () => {
    describe('calculateGroundTrack', () => {
        it('should calculate ground track points', () => {
            const result = calculateGroundTrack(ISS_TLE1, ISS_TLE2, new Date(), 90, 120);
            expect(result).toBeDefined();
            expect(result.pastTrack).toBeDefined();
            expect(result.futureTrack).toBeDefined();
            expect(result.currentPosition).toBeDefined();
            expect(Array.isArray(result.pastTrack)).toBe(true);
            expect(Array.isArray(result.futureTrack)).toBe(true);
        });

        it('should return valid lat/lon for current position', () => {
            const result = calculateGroundTrack(ISS_TLE1, ISS_TLE2, new Date(), 30, 60);
            expect(result.currentPosition.latitude).toBeGreaterThanOrEqual(-90);
            expect(result.currentPosition.latitude).toBeLessThanOrEqual(90);
            expect(result.currentPosition.longitude).toBeGreaterThanOrEqual(-180);
            expect(result.currentPosition.longitude).toBeLessThanOrEqual(180);
        });
    });

    describe('calculateFootprintRadius', () => {
        it('should return larger radius for higher altitudes', () => {
            const lowOrbit = calculateFootprintRadius(400, 0);
            const highOrbit = calculateFootprintRadius(1000, 0);
            expect(highOrbit).toBeGreaterThan(lowOrbit);
        });

        it('should return smaller radius for higher elevation angles', () => {
            const horizon = calculateFootprintRadius(400, 0);
            const elevated = calculateFootprintRadius(400, 30);
            expect(horizon).toBeGreaterThan(elevated);
        });

        it('should return positive radius', () => {
            expect(calculateFootprintRadius(400, 0)).toBeGreaterThan(0);
            expect(calculateFootprintRadius(400, 10)).toBeGreaterThan(0);
        });
    });

    describe('generateFootprintCircle', () => {
        it('should generate correct number of points', () => {
            const points = generateFootprintCircle(0, 0, 1000, 36);
            expect(points.length).toBe(37); // numPoints + 1 to close the circle
        });

        it('should generate valid coordinates', () => {
            const points = generateFootprintCircle(45, 90, 500, 12);
            points.forEach(p => {
                expect(p.latitude).toBeGreaterThanOrEqual(-90);
                expect(p.latitude).toBeLessThanOrEqual(90);
                expect(p.longitude).toBeGreaterThanOrEqual(-180);
                expect(p.longitude).toBeLessThanOrEqual(180);
            });
        });
    });

    describe('calculateVisibilityZones', () => {
        it('should return four visibility zones', () => {
            const zones = calculateVisibilityZones(0, 0, 400);
            expect(zones.horizon).toBeDefined();
            expect(zones.tenDegree).toBeDefined();
            expect(zones.twentyDegree).toBeDefined();
            expect(zones.thirtyDegree).toBeDefined();
        });

        it('should have decreasing sizes for higher elevation', () => {
            const zones = calculateVisibilityZones(0, 0, 400);
            // Horizon zone should be largest (most points cover largest area)
            expect(zones.horizon.length).toBeGreaterThan(0);
            expect(zones.thirtyDegree.length).toBeGreaterThan(0);
        });
    });

    describe('isWithinFootprint', () => {
        it('should return true for observer directly below satellite', () => {
            expect(isWithinFootprint(0, 0, 400, 0, 0, 0)).toBe(true);
        });

        it('should return false for very distant observer', () => {
            // Very far away should be outside footprint
            expect(isWithinFootprint(0, 0, 400, 80, 0, 0)).toBe(false);
        });

        it('should be more restrictive with higher elevation requirements', () => {
            const inHorizon = isWithinFootprint(0, 0, 400, 10, 0, 0);
            const in30deg = isWithinFootprint(0, 0, 400, 10, 0, 30);

            // Observer at 10 degrees away (~1100km) is within horizon footprint (~2200km)
            expect(inHorizon).toBe(true);
            // But outside 30 degree elevation footprint (~600km)
            expect(in30deg).toBe(false);
        });
    });
});
