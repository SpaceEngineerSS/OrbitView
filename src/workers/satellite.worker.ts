import * as satellite from "satellite.js";

let satrecs: any[] = [];

self.onmessage = (e: MessageEvent) => {
    const { type, data } = e.data;

    if (type === "init") {
        // Initialize satellite records
        // data is array of { id, line1, line2 }
        satrecs = data.map((sat: any) => ({
            id: sat.id,
            rec: satellite.twoline2satrec(sat.line1, sat.line2)
        })).filter((s: any) => s.rec);

        self.postMessage({ type: "init_complete", count: satrecs.length });
    }
    else if (type === "update") {
        const { time, selectedId } = data;
        const date = new Date(time);
        const gmst = satellite.gstime(date);

        // Float32Array for positions: [x, y, z, x, y, z, ...]
        const positions = new Float32Array(satrecs.length * 3);

        let selectedSatPos: { x: number, y: number, z: number } | null = null;
        let selectedSatIndex = -1;

        // 1. Calculate all positions
        for (let i = 0; i < satrecs.length; i++) {
            const item = satrecs[i];
            try {
                const posVel = satellite.propagate(item.rec, date);
                if (posVel && posVel.position && typeof posVel.position !== 'boolean') {
                    const posEci = posVel.position as satellite.EciVec3<number>;
                    const posEcf = satellite.eciToEcf(posEci, gmst);

                    // Store in array (x, y, z)
                    // Multiply by 1000 to convert km to meters for Cesium
                    const x = posEcf.x * 1000;
                    const y = posEcf.y * 1000;
                    const z = posEcf.z * 1000;

                    positions[i * 3] = x;
                    positions[i * 3 + 1] = y;
                    positions[i * 3 + 2] = z;

                    if (item.id === selectedId) {
                        selectedSatPos = { x, y, z };
                        selectedSatIndex = i;
                    }
                } else {
                    positions[i * 3] = NaN;
                    positions[i * 3 + 1] = NaN;
                    positions[i * 3 + 2] = NaN;
                }
            } catch (e) {
                positions[i * 3] = NaN;
                positions[i * 3 + 1] = NaN;
                positions[i * 3 + 2] = NaN;
            }
        }

        // 2. Calculate Links (if selected)
        const links: number[] = []; // Indices of connected satellites
        if (selectedSatPos) {
            const rangeSq = 2500000 * 2500000; // 2500 km squared

            for (let i = 0; i < satrecs.length; i++) {
                if (i === selectedSatIndex) continue;

                const x = positions[i * 3];
                if (isNaN(x)) continue;

                const dx = x - selectedSatPos.x;
                const dy = positions[i * 3 + 1] - selectedSatPos.y;
                const dz = positions[i * 3 + 2] - selectedSatPos.z;

                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < rangeSq) {
                    links.push(i);
                }
            }
        }

        // Transfer the buffer to main thread
        // @ts-ignore - Worker postMessage signature
        self.postMessage({ type: "update_complete", positions, links }, [positions.buffer]);
    }
};
