"use client";

import React, { memo } from "react";
import { Entity, LabelGraphics, useCesium } from "resium";
import * as Cesium from "cesium";
import { SpaceObject } from "@/lib/space-objects";

const POINT_COLOR_NORMAL = Cesium.Color.CYAN.withAlpha(0.8);
const POINT_COLOR_SELECTED = Cesium.Color.ORANGE;
const SCALE_BY_DISTANCE_NORMAL = new Cesium.NearFarScalar(1.5e2, 1.5, 8.0e7, 0.4);
const SCALE_BY_DISTANCE_SELECTED = new Cesium.NearFarScalar(150, 1.5, 8e12, 1.0);

const planetColorMap: Record<string, Cesium.Color> = {
    "The Sun": Cesium.Color.YELLOW,
    "Mars": Cesium.Color.ORANGERED,
    "The Moon": Cesium.Color.LIGHTGRAY,
    "Jupiter": Cesium.Color.SANDYBROWN,
    "Saturn": Cesium.Color.GOLD,
    "Venus": Cesium.Color.LIGHTYELLOW,
    "Mercury": Cesium.Color.SLATEGRAY
};

interface EphemerisLayerProps {
    objects: SpaceObject[];
    selectedId?: string;
    searchQuery: string;
    onUpdateSelectedPos: (pos: Cesium.Cartesian3 | null) => void;
}

const EphemerisLayer: React.FC<EphemerisLayerProps> = ({
    objects,
    selectedId,
    searchQuery,
    onUpdateSelectedPos
}) => {
    const { viewer } = useCesium();

    // Use preRender to update selected position from ephemeris property
    React.useEffect(() => {
        if (!viewer || !selectedId) return;
        const removeListener = viewer.scene.preRender.addEventListener((_, time) => {
            const selObj = objects.find(o => o.id === selectedId);
            if (selObj?.ephemeris?.positionProperty) {
                const pos = selObj.ephemeris.positionProperty.getValue(time);
                if (pos) onUpdateSelectedPos(pos);
            }
        });
        return () => removeListener();
    }, [viewer, selectedId, objects, onUpdateSelectedPos]);

    return (
        <>
            {objects.filter(o => o.type === 'EPHEMERIS').map(obj => {
                const currentSearch = searchQuery.toUpperCase();
                if (searchQuery && !obj.name.toUpperCase().includes(currentSearch) && !obj.id.includes(searchQuery)) {
                    return null;
                }

                const isPlanet = obj.category === 'CELESTIAL';
                return (
                    <Entity
                        key={obj.id}
                        id={obj.id}
                        name={obj.name}
                        position={obj.ephemeris?.positionProperty}
                        point={{
                            pixelSize: isPlanet ? (selectedId === obj.id ? 24 : 16) : (selectedId === obj.id ? 12 : 8),
                            color: isPlanet ? (planetColorMap[obj.name] || Cesium.Color.WHITE) : (selectedId === obj.id ? POINT_COLOR_SELECTED : Cesium.Color.CYAN),
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: isPlanet ? 3 : 2,
                            scaleByDistance: isPlanet ? new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e12, 0.5) : (selectedId === obj.id ? SCALE_BY_DISTANCE_SELECTED : SCALE_BY_DISTANCE_NORMAL)
                        }}
                    >
                        {isPlanet && (
                            <LabelGraphics
                                text={obj.name}
                                font="bold 14px Inter"
                                fillColor={Cesium.Color.WHITE}
                                outlineColor={Cesium.Color.BLACK}
                                outlineWidth={2}
                                style={Cesium.LabelStyle.FILL_AND_OUTLINE}
                                pixelOffset={new Cesium.Cartesian2(0, -20)}
                                verticalOrigin={Cesium.VerticalOrigin.BOTTOM}
                                disableDepthTestDistance={Number.POSITIVE_INFINITY}
                            />
                        )}
                    </Entity>
                );
            })}
        </>
    );
};

export default memo(EphemerisLayer);
