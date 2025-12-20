/**
 * Conjunction Analysis & Collision Risk Assessment
 * 
 * Analyzes close approach events (conjunctions) between space objects.
 * Uses SOCRATES (Satellite Orbital Conjunction Reports Assessing 
 * Threatening Encounters in Space) data from CelesTrak.
 * 
 * @module ConjunctionAnalysis
 * @see {@link https://celestrak.org/SOCRATES/} SOCRATES Data
 * 
 * Mathematical Foundation:
 * ========================
 * Time of Closest Approach (TCA):
 * The instant when the distance between two objects is minimized.
 * 
 * Collision Probability (Pc):
 * Calculated using position uncertainty (covariance) and hard body radius:
 * 
 *   Pc = ∫∫ f(x,y) dx dy over collision area
 * 
 * Where f(x,y) is the 2D probability density in the conjunction plane.
 * 
 * Risk Classification (by miss distance):
 * - Critical: < 100m (immediate concern)
 * - High: < 500m (maneuver consideration)
 * - Medium: < 1 km (monitoring required)
 * - Low: > 1 km (standard tracking)
 * 
 * Collision Energy:
 *   E = (1/2) × m × v²_rel
 * 
 * Relative velocities in LEO typically 10-15 km/s; hypervelocity impacts.
 * 
 * References:
 * -----------
 * [1] Kelso, T.S. & Alfano, S. (2007). "Satellite Orbital Conjunction Reports"
 *     AAS Paper 07-127. {@link https://celestrak.org/publications/AAS/07-127/}
 * 
 * [2] Alfano, S. (2005). "Relating Position Uncertainty to Maximum Conjunction Probability"
 *     The Journal of the Astronautical Sciences, 53(2), 193-205.
 * 
 * [3] Kessler, D.J. & Cour-Palais, B.G. (1978). "Collision Frequency of Artificial Satellites"
 *     Journal of Geophysical Research, 83(A6), 2637-2646. (Kessler Syndrome origin)
 * 
 * [4] Inter-Agency Space Debris Coordination Committee (IADC)
 *     {@link https://www.iadc-home.org/}
 * 
 * Data Source Notes:
 * - SOCRATES provides conjunction data for tracked objects (>10cm in LEO)
 * - Full data requires Space-Track authentication
 * - Sample data used for demonstration purposes
 */

export interface ConjunctionEvent {
    id: string;
    primaryObject: {
        name: string;
        noradId: string;
        type: 'payload' | 'debris' | 'rocket_body' | 'unknown';
    };
    secondaryObject: {
        name: string;
        noradId: string;
        type: 'payload' | 'debris' | 'rocket_body' | 'unknown';
    };
    tca: Date;                    // Time of Closest Approach
    minRangeKm: number;           // Minimum distance in km
    relativeVelocityKmS: number;  // Relative velocity in km/s
    probabilityOfCollision?: number; // Pc if available
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Parse SOCRATES CSV data from CelesTrak
 * Note: SOCRATES data requires authentication or may be rate-limited
 * This parser handles the public summary format
 */
export function parseSOCRATES(csvData: string): ConjunctionEvent[] {
    const lines = csvData.split('\n').filter(l => l.trim());
    const events: ConjunctionEvent[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));

        if (parts.length < 10) continue;

        try {
            const minRange = parseFloat(parts[7]) / 1000; // Convert m to km
            const relVel = parseFloat(parts[8]);

            const event: ConjunctionEvent = {
                id: `conj-${i}`,
                primaryObject: {
                    name: parts[0] || 'Unknown',
                    noradId: parts[1] || '',
                    type: categorizeObject(parts[0])
                },
                secondaryObject: {
                    name: parts[2] || 'Unknown',
                    noradId: parts[3] || '',
                    type: categorizeObject(parts[2])
                },
                tca: new Date(parts[6]),
                minRangeKm: minRange,
                relativeVelocityKmS: relVel,
                probabilityOfCollision: parts[9] ? parseFloat(parts[9]) : undefined,
                riskLevel: calculateRiskLevel(minRange, relVel)
            };

            events.push(event);
        } catch (e) {
            console.warn('Failed to parse conjunction event:', line);
        }
    }

    return events.sort((a, b) => a.tca.getTime() - b.tca.getTime());
}

/**
 * Categorize object type based on name
 */
function categorizeObject(name: string): 'payload' | 'debris' | 'rocket_body' | 'unknown' {
    const upperName = name.toUpperCase();
    if (upperName.includes('DEB') || upperName.includes('DEBRIS')) return 'debris';
    if (upperName.includes('R/B') || upperName.includes('ROCKET')) return 'rocket_body';
    if (upperName.includes('STARLINK') || upperName.includes('ONEWEB') ||
        upperName.includes('GPS') || upperName.includes('ISS')) return 'payload';
    return 'unknown';
}

/**
 * Calculate risk level based on miss distance and relative velocity
 */
function calculateRiskLevel(minRangeKm: number, relVelKmS: number): 'low' | 'medium' | 'high' | 'critical' {
    // Combined risk metric: smaller distance and higher velocity = higher risk
    const collisionEnergy = relVelKmS * relVelKmS; // Proportional to kinetic energy

    if (minRangeKm < 0.1) return 'critical';     // < 100m
    if (minRangeKm < 0.5) return 'high';          // < 500m
    if (minRangeKm < 1.0) return 'medium';        // < 1km
    return 'low';
}

/**
 * Generate sample conjunction events for demo purposes
 * (Since SOCRATES requires authentication)
 */
export function generateSampleConjunctions(): ConjunctionEvent[] {
    const now = new Date();

    const samples: ConjunctionEvent[] = [
        {
            id: 'conj-1',
            primaryObject: {
                name: 'STARLINK-2305',
                noradId: '48125',
                type: 'payload'
            },
            secondaryObject: {
                name: 'COSMOS 2251 DEB',
                noradId: '34725',
                type: 'debris'
            },
            tca: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hours from now
            minRangeKm: 0.35,
            relativeVelocityKmS: 14.2,
            probabilityOfCollision: 0.00012,
            riskLevel: 'high'
        },
        {
            id: 'conj-2',
            primaryObject: {
                name: 'ISS (ZARYA)',
                noradId: '25544',
                type: 'payload'
            },
            secondaryObject: {
                name: 'SL-8 R/B',
                noradId: '12345',
                type: 'rocket_body'
            },
            tca: new Date(now.getTime() + 18 * 60 * 60 * 1000), // 18 hours
            minRangeKm: 2.1,
            relativeVelocityKmS: 8.5,
            probabilityOfCollision: 0.000001,
            riskLevel: 'low'
        },
        {
            id: 'conj-3',
            primaryObject: {
                name: 'ONEWEB-0156',
                noradId: '47452',
                type: 'payload'
            },
            secondaryObject: {
                name: 'FENGYUN 1C DEB',
                noradId: '29532',
                type: 'debris'
            },
            tca: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 3 days
            minRangeKm: 0.08,
            relativeVelocityKmS: 15.8,
            probabilityOfCollision: 0.0045,
            riskLevel: 'critical'
        },
        {
            id: 'conj-4',
            primaryObject: {
                name: 'SENTINEL-2A',
                noradId: '40697',
                type: 'payload'
            },
            secondaryObject: {
                name: 'DELTA 1 DEB',
                noradId: '00890',
                type: 'debris'
            },
            tca: new Date(now.getTime() + 120 * 60 * 60 * 1000), // 5 days
            minRangeKm: 0.75,
            relativeVelocityKmS: 11.2,
            riskLevel: 'medium'
        }
    ];

    return samples;
}

/**
 * Format time until TCA
 */
export function formatTimeToTCA(tca: Date): string {
    const now = new Date();
    const diffMs = tca.getTime() - now.getTime();

    if (diffMs < 0) return 'PASSED';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
}

/**
 * Get risk color
 */
export function getRiskColor(level: string): string {
    switch (level) {
        case 'critical': return '#ef4444';
        case 'high': return '#f97316';
        case 'medium': return '#eab308';
        case 'low': return '#22c55e';
        default: return '#64748b';
    }
}

/**
 * Get object type icon name
 */
export function getObjectTypeIcon(type: string): string {
    switch (type) {
        case 'payload': return 'satellite';
        case 'debris': return 'circle-x';
        case 'rocket_body': return 'rocket';
        default: return 'help-circle';
    }
}
