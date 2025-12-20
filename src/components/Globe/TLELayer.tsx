"use client";

import React, { useEffect, useRef, memo } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import { SpaceObject } from "@/lib/space-objects";

const POINT_COLOR_NORMAL = Cesium.Color.CYAN.withAlpha(0.8);
const POINT_COLOR_SELECTED = Cesium.Color.ORANGE;
const SCALE_BY_DISTANCE_NORMAL = new Cesium.NearFarScalar(1.5e2, 1.5, 8.0e7, 0.4);
const SCALE_BY_DISTANCE_SELECTED = new Cesium.NearFarScalar(150, 1.5, 8e12, 1.0);

import { AppSettings } from "../HUD/SettingsPanel";

interface TLELayerProps {
    objects: SpaceObject[];
    selectedId?: string;
    filter: string;
    searchQuery: string;
    settings: AppSettings;
    onUpdateSelectedPos: (pos: Cesium.Cartesian3 | null) => void;
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

    useEffect(() => { filterRef.current = filter; }, [filter]);
    useEffect(() => { searchRef.current = searchQuery; }, [searchQuery]);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    // Handle Updates from Worker
    useEffect(() => {
        if (!viewer) return;

        workerRef.current = new Worker(new URL('../../workers/satellite.worker.ts', import.meta.url));
        const points = new Cesium.PointPrimitiveCollection();
        viewer.scene.primitives.add(points);
        pointsRef.current = points;

        workerRef.current.onmessage = (e) => {
            if (e.data.type === "update_complete" && pointsRef.current) {
                const positions = e.data.positions as Float32Array;
                const scratchCartesian = new Cesium.Cartesian3();

                for (let i = 0; i < satrecsRef.current.length; i++) {
                    const point = pointsRef.current.get(i);
                    const sat = satrecsRef.current[i];
                    const x = positions[i * 3];

                    let isVisible = true;
                    // [Logic integrated from original SatelliteLayer here]
                    const name = sat.data.name.toUpperCase();
                    const currentFilter = filterRef.current;
                    const currentSearch = searchRef.current;
                    const currentSelectedId = selectedIdRef.current;

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
                            if (currentFilter === "LEO" && sat.data.category !== "LEO") isVisible = false;
                            if (currentFilter === "STARLINK" && !name.includes("STARLINK")) isVisible = false;
                            if (currentFilter === "GPS" && !name.includes("GPS") && !name.includes("NAVSTAR") && !name.includes("GLONASS") && !name.includes("GALILEO") && !name.includes("BEIDOU")) isVisible = false;
                            if (currentFilter === "GEO" && sat.data.category !== "GEO") isVisible = false;
                            if (currentFilter === "MEO" && sat.data.category !== "MEO") isVisible = false;
                            if (currentFilter === "HEO" && sat.data.category !== "HEO") isVisible = false;
                            if (currentFilter === "ISS" && !name.includes("ISS") && !name.includes("ZARYA")) isVisible = false;
                            if (currentFilter === "DEBRIS" && sat.data.category !== "DEBRIS") isVisible = false;
                            if (currentFilter === "DEEP_SPACE") isVisible = false;
                        }
                    }

                    if (isVisible && currentSearch && !name.includes(currentSearch) && !sat.id.includes(currentSearch)) isVisible = false;

                    // LOD Filter - Apply camera distance based filtering
                    if (isVisible && settingsRef.current?.enableLOD && sat.id !== currentSelectedId) {
                        const cameraHeight = viewer?.camera?.positionCartographic?.height || 0;
                        const isImportant = name.includes("ISS") || name.includes("ZARYA") ||
                            name.includes("TIANGONG") || name.includes("TIANHE") ||
                            name.includes("HUBBLE") || name.includes("JAMES WEBB");

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
                        point.show = true;

                        if (sat.id === currentSelectedId) {
                            point.pixelSize = 12;
                            point.color = POINT_COLOR_SELECTED;
                            point.scaleByDistance = SCALE_BY_DISTANCE_SELECTED;
                            onUpdateSelectedPos(Cesium.Cartesian3.clone(scratchCartesian));
                        } else {
                            point.pixelSize = 5;
                            point.color = POINT_COLOR_NORMAL;
                            point.scaleByDistance = SCALE_BY_DISTANCE_NORMAL;
                        }
                    } else {
                        point.show = false;
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

        const updateLoop = (_: any, time: Cesium.JulianDate) => {
            if (!isCalculatingRef.current && workerRef.current) {
                isCalculatingRef.current = true;
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
        if (!workerRef.current) return;
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
    }, [objects]);

    return null;
};

export default memo(TLELayer);
