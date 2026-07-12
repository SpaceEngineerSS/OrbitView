"use client";

import React, { useEffect, useRef, memo } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import { SpaceObject } from "@/lib/space-objects";

const POINT_COLOR_NORMAL = Cesium.Color.ORANGE; // Changed to Orange for visibility
const POINT_COLOR_SELECTED = Cesium.Color.CYAN; // Changed to Cyan for contrast
const SCALE_BY_DISTANCE_NORMAL = new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.5);
const SCALE_BY_DISTANCE_SELECTED = new Cesium.NearFarScalar(150, 1.5, 8e12, 1.0);
const TRANSLUCENCY_BY_DISTANCE = new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.8);

import { AppSettings } from "@/components/hud/SettingsPanel";

interface TLELayerProps {
    objects: SpaceObject[];
    selectedId?: string;
    filter: string;
    searchQuery: string;
    settings: AppSettings;
    onUpdateSelectedPos: (pos: Cesium.Cartesian3 | null, vel?: Cesium.Cartesian3) => void;
    onHover: (obj: SpaceObject | null) => void;
    onSelect: (obj: SpaceObject | null) => void;
}

const TLELayer: React.FC<TLELayerProps> = ({
    objects,
    selectedId,
    filter,
    searchQuery,
    settings,
    onUpdateSelectedPos,
    onHover,
    onSelect
}) => {
    const { viewer } = useCesium();
    const workerRef = useRef<Worker | null>(null);
    const pointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
    const satrecsRef = useRef<any[]>([]);
    const isCalculatingRef = useRef(false);

    const filterRef = useRef(filter);
    const searchRef = useRef(searchQuery);
    const selectedIdRef = useRef(selectedId);
    const settingsRef = useRef(settings);

    const [isWorkerReady, setIsWorkerReady] = React.useState(false);

    // Pre-computed visibility cache for high performance
    const basicVisibilityRef = useRef<boolean[]>([]);
    const isImportantRef = useRef<boolean[]>([]);

    useEffect(() => { filterRef.current = filter; }, [filter]);
    useEffect(() => { searchRef.current = searchQuery; }, [searchQuery]);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    // Re-calculate visibility cache when filter, search or objects change
    useEffect(() => {
        const currentFilter = filter;
        const currentSearch = searchQuery.toUpperCase();
        const visResults = new Array(objects.length).fill(true);
        const impResults = new Array(objects.length).fill(false);

        for (let i = 0; i < objects.length; i++) {
            const sat = objects[i];
            const name = sat.name.toUpperCase();
            const id = sat.id.toUpperCase();
            let isVisible = true;

            if (currentFilter !== "ALL") {
                if (currentFilter.startsWith("COUNTRY_")) {
                    const country = currentFilter.replace("COUNTRY_", "");
                    if (country === "USA" && !name.includes("USA") && !name.includes("US") && !name.includes("NAVSTAR") && !name.includes("GOES") && !name.includes("NOAA")) isVisible = false;
                    else if (country === "RUSSIA" && !name.includes("COSMOS") && !name.includes("GLONASS") && !name.includes("SOYUZ") && !name.includes("PROGRESS") && !name.includes("ZARYA")) isVisible = false;
                    else if (country === "CHINA" && !name.includes("BEIDOU") && !name.includes("CZ") && !name.includes("SHIYAN") && !name.includes("YAOGAN") && !name.includes("TIANHE")) isVisible = false;
                    else if (country === "EU" && !name.includes("GALILEO") && !name.includes("SENTINEL") && !name.includes("ENVISAT")) isVisible = false;
                    else if (country === "TURKEY" && !name.includes("TURKSAT") && !name.includes("GOKTURK") && !name.includes("RASAT") && !name.includes("IMECE")) isVisible = false;
                    else if (country === "INDIA" && !name.includes("INSAT") && !name.includes("GSAT") && !name.includes("IRS") && !name.includes("CARTOSAT")) isVisible = false;
                } else {
                    if (currentFilter === "LEO" && sat.category !== "LEO") isVisible = false;
                    if (currentFilter === "STARLINK" && !name.includes("STARLINK")) isVisible = false;
                    if (currentFilter === "GPS" && !name.includes("GPS") && !name.includes("NAVSTAR") && !name.includes("GLONASS") && !name.includes("GALILEO") && !name.includes("BEIDOU")) isVisible = false;
                    if (currentFilter === "GEO" && sat.category !== "GEO") isVisible = false;
                    if (currentFilter === "MEO" && sat.category !== "MEO") isVisible = false;
                    if (currentFilter === "HEO" && sat.category !== "HEO") isVisible = false;
                    if (currentFilter === "ISS" && !name.includes("ISS") && !name.includes("ZARYA")) isVisible = false;
                    if (currentFilter === "DEBRIS" && sat.category !== "DEBRIS") isVisible = false;
                    if (currentFilter === "DEEP_SPACE") isVisible = false;
                }
            }

            if (isVisible && currentSearch && !name.includes(currentSearch) && !id.includes(currentSearch)) {
                isVisible = false;
            }

            const isImportant = name.includes("ISS") || name.includes("ZARYA") ||
                name.includes("TIANGONG") || name.includes("TIANHE") ||
                name.includes("HUBBLE") || name.includes("JAMES WEBB");

            visResults[i] = isVisible;
            impResults[i] = isImportant;
        }

        basicVisibilityRef.current = visResults;
        isImportantRef.current = impResults;
    }, [objects, filter, searchQuery]);

    // Handle Updates from Worker
    useEffect(() => {
        if (!viewer) return;

        workerRef.current = new Worker(new URL('../../workers/satellite.worker.ts', import.meta.url));
        const points = new Cesium.PointPrimitiveCollection();
        viewer.scene.primitives.add(points);
        pointsRef.current = points;
        setIsWorkerReady(true);

        workerRef.current.onmessage = (e) => {
            if (e.data.type === "update_complete" && pointsRef.current) {
                const positions = e.data.positions as Float32Array;
                const selectedVelocity = e.data.selectedVelocity as { x: number; y: number; z: number } | null;
                const scratchCartesian = new Cesium.Cartesian3();

                const currentSelectedId = selectedIdRef.current;
                const cameraHeight = settingsRef.current?.enableLOD ? (viewer?.camera?.positionCartographic?.height || 0) : 0;
                const enableLOD = settingsRef.current?.enableLOD;

                for (let i = 0; i < satrecsRef.current.length; i++) {
                    const point = pointsRef.current.get(i);
                    if (!point) continue;

                    const sat = satrecsRef.current[i];
                    const x = positions[i * 3];

                    let isVisible = basicVisibilityRef.current[i] ?? true;

                    // LOD Filter - Apply camera distance based filtering
                    if (isVisible && enableLOD && sat.id !== currentSelectedId) {
                        const isImportant = isImportantRef.current[i] ?? false;
                        const cat = sat.data.category;
                        const isHighOrbit = cat === 'GEO' || cat === 'MEO' || cat === 'HEO';

                        if (!isImportant) {
                            if (cameraHeight > 50000000) {
                                isVisible = isHighOrbit ? (i % 2 === 0) : (i % 20 === 0);
                            } else if (cameraHeight > 20000000) {
                                isVisible = isHighOrbit ? true : (i % 10 === 0);
                            } else if (cameraHeight > 8000000) {
                                isVisible = isHighOrbit ? true : (i % 3 === 0);
                            }
                        }
                    }

                    if (isVisible && !isNaN(x)) {
                        scratchCartesian.x = x;
                        scratchCartesian.y = positions[i * 3 + 1];
                        scratchCartesian.z = positions[i * 3 + 2];
                        point.position = scratchCartesian;

                        if (point.show !== true) point.show = true;

                        if (sat.id === currentSelectedId) {
                            if (point.pixelSize !== 14) point.pixelSize = 14;
                            if (point.color !== POINT_COLOR_SELECTED) point.color = POINT_COLOR_SELECTED;
                            if (point.scaleByDistance !== SCALE_BY_DISTANCE_SELECTED) point.scaleByDistance = SCALE_BY_DISTANCE_SELECTED;
                            // Make selected satellite always opaque (1.0 alpha at all distances)
                            point.translucencyByDistance = new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e8, 1.0);
                            
                            const velocity = selectedVelocity
                                ? new Cesium.Cartesian3(selectedVelocity.x, selectedVelocity.y, selectedVelocity.z)
                                : undefined;

                            onUpdateSelectedPos(Cesium.Cartesian3.clone(scratchCartesian), velocity);
                        } else {
                            if (point.pixelSize !== 8) point.pixelSize = 8;
                            if (point.color !== POINT_COLOR_NORMAL) point.color = POINT_COLOR_NORMAL;
                            if (point.scaleByDistance !== SCALE_BY_DISTANCE_NORMAL) point.scaleByDistance = SCALE_BY_DISTANCE_NORMAL;
                            if (point.translucencyByDistance !== TRANSLUCENCY_BY_DISTANCE) point.translucencyByDistance = TRANSLUCENCY_BY_DISTANCE;
                        }
                    } else {
                        if (point.show !== false) point.show = false;
                    }
                }
                isCalculatingRef.current = false;
            }
        };

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
            const picked = viewer.scene.pick(movement.position);
            if (Cesium.defined(picked) && (picked.collection === pointsRef.current)) {
                const satId = picked.id;
                const sat = satrecsRef.current.find(s => s.id === satId);
                if (sat) onSelect(sat.data);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((movement: any) => {
            const picked = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(picked) && (picked.collection === pointsRef.current)) {
                const satId = picked.id;
                const sat = satrecsRef.current.find(s => s.id === satId);
                onHover(sat?.data || null);
                viewer.canvas.style.cursor = 'pointer';
            } else {
                onHover(null);
                viewer.canvas.style.cursor = 'default';
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        let lastUpdateTime = 0;
        const THROTTLE_MS = 50; // Throttle to 20fps for performance optimization ( O(N) points render )

        const updateLoop = (_: any, time: Cesium.JulianDate) => {
            const now = performance.now();
            if (now - lastUpdateTime < THROTTLE_MS) return;

            if (!isCalculatingRef.current && workerRef.current) {
                isCalculatingRef.current = true;
                lastUpdateTime = now;
                workerRef.current.postMessage({
                    type: 'update',
                    data: { time: Cesium.JulianDate.toDate(time), selectedId: selectedIdRef.current }
                });
            }
        };
        const removeLoop = viewer.scene.preRender.addEventListener(updateLoop);

        return () => {
            workerRef.current?.terminate();
            viewer.scene.primitives.remove(points);
            handler.destroy();
            removeLoop();
        };
    }, [viewer]);

    // Sync TLE Data to Worker
    useEffect(() => {
        if (!workerRef.current || !isWorkerReady) return;
        const tleObjects = objects.filter(o => o.type === 'TLE' && o.tle);
        satrecsRef.current = tleObjects.map(o => ({ id: o.id, data: o }));

        if (pointsRef.current) {
            pointsRef.current.removeAll();
            for (const sat of satrecsRef.current) {
                pointsRef.current.add({ id: sat.id, show: false });
            }
        }

        workerRef.current.postMessage({
            type: 'init',
            data: tleObjects.map(o => ({ id: o.id, line1: o.tle!.line1, line2: o.tle!.line2 }))
        });
    }, [objects, isWorkerReady]);

    return null;
};

export default memo(TLELayer);
