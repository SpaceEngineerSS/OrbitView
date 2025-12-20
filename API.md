# OrbitView API Documentation

Complete API reference for OrbitView's scientific calculation libraries.

---

## Table of Contents

- [DopplerCalculator](#dopplercalculator)
- [OrbitalDecay](#orbitaldecay)
- [PassPrediction](#passprediction)
- [GroundTrack](#groundtrack)
- [ConjunctionAnalysis](#conjunctionanalysis)
- [TLE Parser](#tle-parser)
- [NASA Horizons API](#nasa-horizons-api)

---

## DopplerCalculator

**File:** `src/lib/DopplerCalculator.ts`

Calculates Doppler frequency shifts for satellite-ground communication.

### Types

```typescript
interface ObserverPosition {
  latitude: number;   // degrees
  longitude: number;  // degrees
  altitude: number;   // meters above sea level
}

interface SatelliteState {
  position: { x: number; y: number; z: number };  // ECF in meters
  velocity: { x: number; y: number; z: number };  // ECF in m/s
}

interface DopplerResult {
  rangeKm: number;           // Distance to satellite
  rangeRateMps: number;      // Range rate (+ = receding)
  dopplerShiftHz: number;    // Frequency shift
  receivedFreqHz: number;    // Received frequency
  shiftPpm: number;          // Parts per million
  isApproaching: boolean;    // True if approaching
}
```

### Functions

#### `geodeticToECF(lat, lon, alt)`

Converts geodetic coordinates to Earth-Centered Fixed (ECF).

```typescript
function geodeticToECF(
  lat: number,   // Latitude in degrees
  lon: number,   // Longitude in degrees
  alt: number    // Altitude in meters
): { x: number; y: number; z: number }
```

**Example:**
```typescript
const ecf = geodeticToECF(41.0082, 28.9784, 0);
// { x: 4208832.5, y: 2334850.2, z: 4171288.8 }
```

#### `calculateDopplerShift(satellite, observer, baseFrequencyHz)`

Calculates Doppler shift for a satellite pass.

```typescript
function calculateDopplerShift(
  satellite: SatelliteState,
  observer: ObserverPosition,
  baseFrequencyHz: number
): DopplerResult
```

### Constants

```typescript
const COMMON_FREQUENCIES = {
  ISS_VOICE: 145_800_000,      // 145.800 MHz
  ISS_PACKET: 145_825_000,     // 145.825 MHz
  NOAA_APT: 137_100_000,       // 137.1 MHz
  GPS_L1: 1_575_420_000,       // 1575.42 MHz
  STARLINK_KU: 12_000_000_000  // ~12 GHz
};
```

---

## OrbitalDecay

**File:** `src/lib/OrbitalDecay.ts`

Estimates satellite orbital lifetime based on atmospheric drag.

### Types

```typescript
interface DecayPrediction {
  currentAltitudeKm: number;
  currentDensity: number;
  decayRateKmPerDay: number;
  estimatedLifetimeDays: number;
  estimatedReentryDate: Date;
  altitudeHistory: { days: number; altitude: number }[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
```

### Functions

#### `getAtmosphericDensity(altitudeKm)`

Returns atmospheric density using exponential model.

```typescript
function getAtmosphericDensity(altitudeKm: number): number  // kg/m³
```

#### `parseBStar(tleLine1)`

Extracts B* drag coefficient from TLE Line 1.

```typescript
function parseBStar(tleLine1: string): number
```

#### `predictOrbitalDecay(semiMajorAxisKm, eccentricity, bstar, currentDate?)`

Predicts orbital decay timeline.

```typescript
function predictOrbitalDecay(
  semiMajorAxisKm: number,
  eccentricity: number,
  bstar: number,
  currentDate?: Date
): DecayPrediction
```

---

## PassPrediction

**File:** `src/lib/PassPrediction.ts`

Predicts satellite passes for ground observers.

### Types

```typescript
interface SatellitePass {
  aosTime: Date;           // Acquisition of Signal
  losTime: Date;           // Loss of Signal
  maxElevationTime: Date;  // Time of maximum elevation
  maxElevation: number;    // Max elevation in degrees
  duration: number;        // Duration in seconds
  azimuthAOS: number;      // Azimuth at rise
  azimuthLOS: number;      // Azimuth at set
  visible: boolean;        // Sunlit satellite, dark sky
}

interface ObserverLocation {
  latitude: number;   // degrees
  longitude: number;  // degrees
  altitude: number;   // meters
}
```

### Functions

#### `predictPasses(satData, observer, startTime, endTime, minElevation?)`

Finds all satellite passes in a time range.

```typescript
function predictPasses(
  satData: SatelliteData,
  observer: ObserverLocation,
  startTime: Date,
  endTime: Date,
  minElevation: number = 10  // minimum elevation in degrees
): SatellitePass[]
```

**Example:**
```typescript
const passes = predictPasses(
  issData,
  { latitude: 40.7128, longitude: -74.0060, altitude: 10 },
  new Date(),
  new Date(Date.now() + 86400000),  // 24 hours
  10  // minimum 10° elevation
);
```

#### `getLookAngles(satData, observer, time)`

Calculates current azimuth/elevation/range.

```typescript
function getLookAngles(
  satData: SatelliteData,
  observer: ObserverLocation,
  time: Date
): { azimuth: number; elevation: number; range: number } | null
```

---

## GroundTrack

**File:** `src/lib/GroundTrack.ts`

Calculates satellite ground tracks and coverage footprints.

### Types

```typescript
interface GroundTrackPoint {
  latitude: number;   // degrees
  longitude: number;  // degrees
  altitude: number;   // km
  time: Date;
}

interface GroundTrackResult {
  pastTrack: GroundTrackPoint[];
  futureTrack: GroundTrackPoint[];
  currentPosition: GroundTrackPoint;
}
```

### Functions

#### `calculateGroundTrack(tle1, tle2, startTime?, durationMinutes?, stepSeconds?)`

Generates ground track points.

```typescript
function calculateGroundTrack(
  tle1: string,
  tle2: string,
  startTime: Date = new Date(),
  durationMinutes: number = 90,
  stepSeconds: number = 60
): GroundTrackResult
```

#### `calculateFootprintRadius(altitude, minElevation?)`

Returns satellite visibility radius on Earth's surface.

```typescript
function calculateFootprintRadius(
  altitude: number,      // km
  minElevation: number = 0  // degrees
): number  // km
```

#### `generateFootprintCircle(centerLat, centerLon, radiusKm, numPoints?)`

Generates polygon points for footprint visualization.

```typescript
function generateFootprintCircle(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  numPoints: number = 72
): Array<{ latitude: number; longitude: number }>
```

#### `isWithinFootprint(satLat, satLon, satAltitude, groundLat, groundLon, minElevation?)`

Checks if ground location can see the satellite.

```typescript
function isWithinFootprint(
  satLat: number,
  satLon: number,
  satAltitude: number,
  groundLat: number,
  groundLon: number,
  minElevation: number = 0
): boolean
```

---

## ConjunctionAnalysis

**File:** `src/lib/ConjunctionAnalysis.ts`

Analyzes close approach events between space objects.

### Types

```typescript
interface ConjunctionEvent {
  id: string;
  primaryObject: {
    name: string;
    noradId: string;
    type: 'payload' | 'debris' | 'rocket_body' | 'unknown';
  };
  secondaryObject: { /* same structure */ };
  tca: Date;                    // Time of Closest Approach
  minRangeKm: number;           // Minimum distance
  relativeVelocityKmS: number;  // Relative velocity
  probabilityOfCollision?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
```

### Functions

#### `parseSOCRATES(csvData)`

Parses SOCRATES conjunction data.

```typescript
function parseSOCRATES(csvData: string): ConjunctionEvent[]
```

#### `calculateRiskLevel(minRangeKm, relVelKmS)`

Determines collision risk category.

```typescript
function calculateRiskLevel(
  minRangeKm: number,
  relVelKmS: number
): 'low' | 'medium' | 'high' | 'critical'
```

| Risk Level | Miss Distance |
|------------|---------------|
| Critical | < 100m |
| High | < 500m |
| Medium | < 1 km |
| Low | > 1 km |

---

## TLE Parser

**File:** `src/lib/tle.ts`

Fetches and parses Two-Line Element data.

### Types

```typescript
interface SatelliteData {
  id: string;      // NORAD ID
  name: string;    // Satellite name
  line1: string;   // TLE Line 1
  line2: string;   // TLE Line 2
}
```

### Functions

#### `fetchActiveSatellites()`

Fetches all active satellites from CelesTrak.

```typescript
async function fetchActiveSatellites(): Promise<SatelliteData[]>
```

#### `parseTLE(text)`

Parses raw TLE text into structured data.

```typescript
function parseTLE(text: string): SatelliteData[]
```

---

## NASA Horizons API

**File:** `src/lib/HorizonsAPI.ts`

Fetches ephemeris data for deep-space objects.

### Functions

#### `fetchJWSTEphemeris(startDate, endDate, stepSize?)`

Retrieves JWST position data from JPL Horizons.

```typescript
async function fetchJWSTEphemeris(
  startDate: Date,
  endDate: Date,
  stepSize: string = '1h'
): Promise<EphemerisData[]>
```

---

## Error Handling

All functions that can fail provide graceful error handling:

```typescript
try {
  const result = calculateDopplerShift(sat, observer, freq);
} catch (error) {
  console.error('[DopplerCalculator] Error:', error);
  // Return null or default values
}
```

---

## Performance Considerations

- **SGP4 Propagation**: ~0.1ms per propagation
- **Pass Prediction**: ~50-100ms for 24-hour prediction
- **Ground Track**: ~10ms for 90-minute track
- **Atmospheric Density**: Cached lookup tables

---

*This API documentation is part of OrbitView open-source project.*
*For mathematical foundations, see [THEORY.md](./THEORY.md).*
