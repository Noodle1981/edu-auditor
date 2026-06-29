/**
 * MapView.jsx
 * Heavy map component — loaded lazily via React.lazy to keep the main bundle lean.
 * All react-leaflet and leaflet imports live here so they are split into a separate chunk.
 */
import {
    createTileLayerComponent,
    updateGridLayer,
    withPane,
} from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { memo, useCallback, useEffect, useState } from 'react';
import {
    GeoJSON,
    MapContainer,
    useMap,
    useMapEvents,
    Marker,
    Polyline,
    Circle,
    Polygon,
    Popup,
} from 'react-leaflet';

// --- Plaza Constants & Theoretical Radio Helpers ---
export const PLAZAS_DATA = [
    {
        name: 'Plaza 25 de Mayo (Capital)',
        lat: -31.538739,
        lng: -68.525858,
        color: '#EAB308',
        radios: [
            { radio: 1, limit: 4000, color: '#fef08a' },
            { radio: 2, limit: 10000, color: '#fde047' },
            { radio: 3, limit: 20000, color: '#eab308' },
            { radio: 4, limit: 40000, color: '#ca8a04' },
            { radio: 5, limit: 80000, color: '#854d0e' },
            { radio: 6, limit: 150000, color: '#451a03' }
        ]
    },
    {
        name: 'Plaza de Jáchal',
        lat: -30.241946,
        lng: -68.747324,
        color: '#10B981',
        radios: [
            { radio: 3, limit: 2000, color: '#a7f3d0' },
            { radio: 5, limit: 10000, color: '#10b981' },
            { radio: 6, limit: 100000, color: '#047857' }
        ]
    },
    {
        name: 'Plaza de Caucete',
        lat: -31.652283,
        lng: -68.280878,
        color: '#3B82F6',
        radios: [
            { radio: 3, limit: 2000, color: '#bfdbfe' },
            { radio: 4, limit: 40000, color: '#3b82f6' },
            { radio: 5, limit: 80000, color: '#1d4ed8' },
            { radio: 6, limit: 150000, color: '#1e3a8a' }
        ]
    }
];

export const getTheoreticalRadio = (plazaName, distCirc) => {
    if (!plazaName || distCirc === null || distCirc === undefined) return null;
    const nameUpper = plazaName.toUpperCase();
    const d = parseFloat(distCirc);

    if (nameUpper.includes('25 DE MAYO')) {
        if (d <= 4.0) return 1;
        if (d <= 10.0) return 2;
        if (d <= 20.0) return 3;
        if (d <= 40.0) return 4;
        if (d <= 80.0) return 5;
        return 6;
    }
    if (nameUpper.includes('CAUCETE')) {
        if (d <= 2.0) return 3;
        if (d <= 40.0) return 4;
        if (d <= 80.0) return 5;
        return 6;
    }
    if (nameUpper.includes('JACHAL')) {
        if (d <= 2.0) return 3;
        if (d <= 10.0) return 5;
        return 6;
    }
    return null;
};

const getCirclePoints = (center, radiusMeters, numPoints = 64) => {
    const points = [];
    const offsetLatDegree = 111320;
    const offsetLngDegree = 111320 * Math.cos(center[0] * Math.PI / 180);
    for (let i = 0; i <= numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const latOffset = (radiusMeters * Math.sin(angle)) / offsetLatDegree;
        const lngOffset = (radiusMeters * Math.cos(angle)) / offsetLngDegree;
        points.push([center[0] + latOffset, center[1] + lngOffset]);
    }
    return points;
};

export const getActivePlaza = (puntoPartida) => {
    if (!puntoPartida) return null;
    const nameUpper = puntoPartida.toUpperCase();
    if (nameUpper.includes('25 DE MAYO')) return PLAZAS_DATA[0];
    if (nameUpper.includes('JACHAL')) return PLAZAS_DATA[1];
    if (nameUpper.includes('CAUCETE')) return PLAZAS_DATA[2];
    return null;
};

export const getEdificioStatus = (edificio) => {
    if (edificio.ambito === 'PRIVADO' || !edificio.punto_partida) {
        return 'COINCIDE';
    }

    let status = 'COINCIDE';

    (edificio.establecimientos || []).forEach((est) => {
        (est.modalidades || []).forEach((mod) => {
            const sysRadioRaw = (mod.radio !== null && mod.radio !== undefined && mod.radio !== 'N/A' && mod.radio !== '') 
                ? mod.radio 
                : mod.radio_sige;
            if (sysRadioRaw === null || sysRadioRaw === undefined || sysRadioRaw === 'N/A' || sysRadioRaw === '') return;
            
            let s = parseInt(sysRadioRaw);
            if (isNaN(s)) return;
            if (s === 7) s = 6;

            const circ = edificio.radio_circ ? parseInt(edificio.radio_circ) : null;
            const camino = edificio.radio_camino ? parseInt(edificio.radio_camino) : null;
            
            const hasCirc = circ !== null && !isNaN(circ);
            const hasCamino = camino !== null && !isNaN(camino);

            let modStatus = 'COINCIDE';

            if (hasCirc && hasCamino) {
                const matchesCirc = s === circ;
                const matchesCamino = s === camino;

                if (matchesCirc && matchesCamino) {
                    modStatus = 'COINCIDE';
                } else if (matchesCirc || matchesCamino) {
                    modStatus = 'INCONGRUENTE';
                } else {
                    modStatus = 'DISTINTO';
                }
            } else if (hasCirc) {
                if (s === circ) {
                    modStatus = 'COINCIDE';
                } else {
                    modStatus = 'DISTINTO';
                }
            } else if (hasCamino) {
                if (s === camino) {
                    modStatus = 'COINCIDE';
                } else {
                    modStatus = 'DISTINTO';
                }
            }

            if (modStatus === 'DISTINTO') {
                status = 'DISTINTO';
            } else if (modStatus === 'INCONGRUENTE' && status !== 'DISTINTO') {
                status = 'INCONGRUENTE';
            }
        });
    });

    return status;
};

export const getEdificioRadioString = (edificio) => {
    const radios = new Set();
    (edificio.establecimientos || []).forEach((est) => {
        (est.modalidades || []).forEach((mod) => {
            const r = mod.radio;
            if (r !== null && r !== undefined && r !== 'N/A' && r !== '') {
                radios.add(String(r).trim());
            }
        });
    });
    const sorted = Array.from(radios).sort((a, b) => 
        String(a).localeCompare(String(b), undefined, { numeric: true })
    );
    return sorted.join('/');
};

// --- Internal sub-components ---

/**
 * Clears selectedEdificio when user clicks on the bare map background
 * (not on a marker or polygon).
 */
const ClearSelection = ({ onClear }) => {
    useMapEvents({
        click: (e) => {
            const target = e.originalEvent?.target;
            if (target && target.classList?.contains('leaflet-interactive'))
                return;
            onClear();
        },
    });
    return null;
};

function MapController({ selected, sidebarOpen, filterDepto, geojsonData }) {
    const map = useMap();

    // Fix map size when sidebar toggles
    useEffect(() => {
        const id = setTimeout(() => map.invalidateSize({ animate: true }), 500);
        return () => clearTimeout(id);
    }, [sidebarOpen, map]);

    // Fly to selected marker / fit bounds showing the school and its origin plaza
    useEffect(() => {
        if (selected && selected.latitud) {
            if (selected._isCenter) {
                map.flyTo([selected.latitud, selected.longitud], selected.zoom || 11, {
                    animate: true,
                    duration: 1.5,
                });
                return;
            }

            const activePlaza = getActivePlaza(selected.punto_partida);
            if (activePlaza) {
                const bounds = L.latLngBounds(
                    [selected.latitud, selected.longitud],
                    [activePlaza.lat, activePlaza.lng]
                );
                map.fitBounds(bounds, {
                    padding: [80, 80],
                    animate: true,
                    duration: 1.5,
                });
            } else {
                map.flyTo([selected.latitud, selected.longitud], 13, {
                    animate: true,
                    duration: 1.5,
                });
            }
        }
    }, [selected, map]);

    // Fit bounds of selected department
    useEffect(() => {
        if (filterDepto && filterDepto !== 'TODOS' && geojsonData) {
            const feature = geojsonData.features.find(
                (f) =>
                    f.properties?.departamento?.toUpperCase() ===
                    filterDepto.toUpperCase(),
            );
            if (feature) {
                try {
                    const bounds = L.geoJSON(feature).getBounds();
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, {
                            padding: [50, 50],
                            animate: true,
                            duration: 1.5,
                        });
                    }
                } catch (err) {
                    console.error('Error zooming to department bounds:', err);
                }
            }
        }
    }, [filterDepto, geojsonData, map]);

    return null;
}

// --- Custom High Priority TileLayer ---
const HighPriorityTileLayer = createTileLayerComponent((props, context) => {
    const layer = new L.TileLayer(props.url, withPane(props, context));
    const originalCreateTile = layer.createTile;
    layer.createTile = function (coords, done) {
        const tile = originalCreateTile.call(layer, coords, done);
        tile.setAttribute('fetchpriority', 'high');
        tile.setAttribute('loading', 'eager');
        return tile;
    };
    return { instance: layer, context };
}, updateGridLayer);

// --- Main Export ---
export default function MapView({
    filteredEdificios,
    edificios = [],
    selectedEdificio,
    setSelectedEdificio,
    hoveredEdificioId,
    setHoveredEdificioId,
    sidebarOpen,
    showDeptoBorders = true,
    filterDepto = 'TODOS',
    isSatellite = false,
    showPlazas = true,
}) {
    const [geojsonData, setGeojsonData] = useState(null);

    // Tile layer URLs
    const TILE_STREET =
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const TILE_SAT =
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    useEffect(() => {
        fetch('/geojson/departamentos-san_juan.json')
            .then((res) => res.json())
            .then((data) => setGeojsonData(data))
            .catch((err) => console.error('Error loading GeoJSON:', err));
    }, []);

    const handleClearSelection = useCallback(() => {
        setSelectedEdificio(null);
    }, [setSelectedEdificio]);

    // GeoJSON style: borders always visible for all depts, orange fill only for filtered dept
    const deptStyle = useCallback(
        (feature) => {
            const isHighlighted =
                filterDepto &&
                filterDepto !== 'TODOS' &&
                feature.properties?.departamento?.toUpperCase() ===
                    filterDepto.toUpperCase();

            return {
                color: isHighlighted ? '#FE8204' : '#94a3b8',
                weight: isHighlighted ? 2.5 : 1,
                fillColor: isHighlighted ? '#FE8204' : 'transparent',
                fillOpacity: isHighlighted ? 0.07 : 0,
                interactive: false, // No hover, no click events on polygons
            };
        },
        [filterDepto],
    );

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <MapContainer
                center={[-31.5375, -68.5364]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <HighPriorityTileLayer
                    key={isSatellite ? 'sat' : 'street'}
                    url={isSatellite ? TILE_SAT : TILE_STREET}
                    attribution={
                        isSatellite
                            ? '&copy; <a href="https://www.esri.com">Esri</a> World Imagery'
                            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    }
                    subdomains={isSatellite ? '' : 'abcd'}
                    keepBuffer={2}
                    updateWhenIdle={true}
                    updateWhenZooming={false}
                />

                <MapController
                    selected={selectedEdificio}
                    sidebarOpen={sidebarOpen}
                    filterDepto={filterDepto}
                    geojsonData={geojsonData}
                />

                <ClearSelection onClear={handleClearSelection} />

                {/* Concentric circular zones around active plaza */}
                {(() => {
                    const activePlaza = getActivePlaza(selectedEdificio?.punto_partida);
                    if (!activePlaza) return null;

                    // Extract assigned radios for the selected school
                    const selectedRadios = new Set();
                    if (selectedEdificio && selectedEdificio.establecimientos) {
                        selectedEdificio.establecimientos.forEach((est) => {
                            (est.modalidades || []).forEach((mod) => {
                                const r = mod.radio;
                                if (r !== null && r !== undefined && r !== 'N/A' && r !== '') {
                                    const parsed = parseInt(r);
                                    if (!isNaN(parsed)) {
                                        selectedRadios.add(parsed);
                                    }
                                }
                            });
                        });
                    }

                    const offsetLatDegree = 111320;
                    const offsetLngDegree = 111320 * Math.cos(activePlaza.lat * Math.PI / 180);
                    const circles = [];
                    const rings = [];
                    const labels = [];

                    // 1. Draw outline borders for all concentric circles (no fill)
                    activePlaza.radios.forEach((r, idx) => {
                        const isSelectedRadio = selectedRadios.has(r.radio);
                        circles.push(
                            <Circle
                                key={`circle-${activePlaza.name}-${r.radio}-${idx}`}
                                center={[activePlaza.lat, activePlaza.lng]}
                                radius={r.limit}
                                pathOptions={{
                                    color: isSelectedRadio ? '#FE8204' : activePlaza.color,
                                    weight: isSelectedRadio ? 3.0 : 1.2,
                                    dashArray: isSelectedRadio ? null : '4, 8',
                                    fill: false,
                                    interactive: false
                                }}
                            />
                        );
                    });

                    // 2. Draw shaded donut rings only for the assigned/selected radios
                    selectedRadios.forEach((selectedRadioNum) => {
                        const radioIndex = activePlaza.radios.findIndex(pr => pr.radio === selectedRadioNum);
                        if (radioIndex !== -1) {
                            const r = activePlaza.radios[radioIndex];
                            const outerLimit = r.limit;
                            const innerLimit = radioIndex > 0 ? activePlaza.radios[radioIndex - 1].limit : 0;

                            if (innerLimit > 0) {
                                const outerPoints = getCirclePoints([activePlaza.lat, activePlaza.lng], outerLimit);
                                const innerPoints = getCirclePoints([activePlaza.lat, activePlaza.lng], innerLimit);
                                rings.push(
                                    <Polygon
                                        key={`ring-${activePlaza.name}-${r.radio}`}
                                        positions={[outerPoints, innerPoints]}
                                        pathOptions={{
                                            fillColor: '#FE8204',
                                            fillOpacity: 0.13,
                                            stroke: false,
                                            interactive: false
                                        }}
                                    />
                                );
                            } else {
                                rings.push(
                                    <Circle
                                        key={`ring-${activePlaza.name}-${r.radio}`}
                                        center={[activePlaza.lat, activePlaza.lng]}
                                        radius={outerLimit}
                                        pathOptions={{
                                            fillColor: '#FE8204',
                                            fillOpacity: 0.13,
                                            stroke: false,
                                            interactive: false
                                        }}
                                    />
                                );
                            }
                        }
                    });

                    // 3. Render reference labels
                    activePlaza.radios.forEach((r, idx) => {
                        const isSelectedRadio = selectedRadios.has(r.radio);
                        const offsetLat = r.limit / offsetLatDegree;
                        const offsetLng = r.limit / offsetLngDegree;
                        const labelText = `R${r.radio}`;

                        const points = [
                            { lat: activePlaza.lat + offsetLat, lng: activePlaza.lng, dir: 'N' },
                            { lat: activePlaza.lat - offsetLat, lng: activePlaza.lng, dir: 'S' },
                            { lat: activePlaza.lat, lng: activePlaza.lng + offsetLng, dir: 'E' },
                            { lat: activePlaza.lat, lng: activePlaza.lng - offsetLng, dir: 'W' }
                        ];

                        points.forEach((p, pIdx) => {
                            const bg = isSelectedRadio ? '#FE8204' : 'rgba(255, 255, 255, 0.9)';
                            const textColor = isSelectedRadio ? '#ffffff' : activePlaza.color;
                            const border = isSelectedRadio ? '1px solid #FE8204' : `1px solid ${activePlaza.color}66`;
                            const shadow = isSelectedRadio ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)';
                            const fontWeight = isSelectedRadio ? '900' : '800';

                            const customLabelIcon = L.divIcon({
                                html: `<div style="
                                    font-size: 11px;
                                    font-weight: ${fontWeight};
                                    color: ${textColor};
                                    background-color: ${bg};
                                    border: ${border};
                                    box-shadow: ${shadow};
                                    width: 30px;
                                    height: 18px;
                                    border-radius: 5px;
                                    white-space: nowrap;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    line-height: 1;
                                    box-sizing: border-box;
                                ">${labelText}</div>`,
                                className: 'custom-radius-label',
                                iconSize: [30, 18],
                                iconAnchor: [15, 9],
                            });

                            labels.push(
                                <Marker
                                    key={`label-${activePlaza.name}-${r.radio}-${p.dir}-${pIdx}`}
                                    position={[p.lat, p.lng]}
                                    icon={customLabelIcon}
                                    interactive={false}
                                />
                            );
                        });
                    });

                    return [...circles, ...rings, ...labels];
                })()}

                {/* Line connecting school to its Plaza */}
                {(() => {
                    const activePlaza = getActivePlaza(selectedEdificio?.punto_partida);
                    if (!activePlaza || !selectedEdificio.latitud || !selectedEdificio.longitud) return null;
                    return (
                        <Polyline
                            positions={[
                                [selectedEdificio.latitud, selectedEdificio.longitud],
                                [activePlaza.lat, activePlaza.lng]
                            ]}
                            pathOptions={{
                                color: '#FE8204',
                                weight: 2,
                                dashArray: '6, 6',
                                interactive: false
                            }}
                        />
                    );
                })()}

                {/* Plazas de Origen Markers */}
                {showPlazas && PLAZAS_DATA.map((plaza, idx) => {
                    const customIcon = L.divIcon({
                        html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background-color:${plaza.color};border:2px solid #fff;border-radius:50%;box-shadow:0 3px 5px rgba(0,0,0,0.2);color:#fff;font-size:9px;"><i class="fa-solid fa-star"></i></div>`,
                        className: 'custom-plaza-icon',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                    });
                    return (
                        <Marker
                            key={`plaza-${idx}`}
                            position={[plaza.lat, plaza.lng]}
                            icon={customIcon}
                        >
                            <Popup>
                                <div className="p-1 font-bold text-xs text-gray-800">
                                    {plaza.name} <span className="text-[9px] text-gray-400 font-medium block mt-0.5">Km 0 de Compensación</span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Department borders layer — always shown when geojsonData is ready */}
                {geojsonData && showDeptoBorders && (
                    <GeoJSON
                        key={`geojson-${geojsonData.features.length}-${filterDepto}`}
                        data={geojsonData}
                        style={deptStyle}
                    />
                )}

                {/* School markers */}
                {filteredEdificios.map((edificio) => {
                    const status = getEdificioStatus(edificio);
                    // Check if radio is justified
                    const radioJustificado = edificio.establecimientos?.some(
                        est => est.modalidades?.some(m => m.radio_justificado)
                    );

                    const markerColor = radioJustificado
                        ? '#06B6D4' // Cyan for Validated by Decree
                        : status === 'INCONGRUENTE'
                            ? '#F59E0B' // Yellow for incongruent
                            : status === 'DISTINTO'
                                ? '#EF4444' // Red for different
                                : edificio.ambito === 'PUBLICO'
                                    ? '#10B981' // Green for matching public
                                    : '#3B82F6'; // Blue for private
                    
                    const isHoveredOrSelected = hoveredEdificioId === edificio.id || selectedEdificio?.id === edificio.id;
                    const radioStr = getEdificioRadioString(edificio);
                    const size = isHoveredOrSelected ? 30 : 20;
                    const width = radioStr.length > 2 ? (isHoveredOrSelected ? 42 : 28) : size;
                    const fontSize = isHoveredOrSelected 
                        ? (radioStr.length > 2 ? '10px' : '13px')
                        : (radioStr.length > 2 ? '8px' : '10px');

                    const customIcon = L.divIcon({
                        html: `
                            <div class="flex items-center justify-center rounded-full font-black text-white border-2 border-white shadow-md transition-all duration-200 cursor-pointer"
                                 style="
                                    background-color: ${markerColor};
                                    width: 100%;
                                    height: 100%;
                                    font-size: ${fontSize};
                                    line-height: 1;
                                    box-sizing: border-box;
                                 "
                            >
                                ${radioStr}
                            </div>
                        `,
                        className: 'custom-school-icon',
                        iconSize: [width, size],
                        iconAnchor: [width / 2, size / 2],
                    });
                    
                    return (
                        <Marker
                            key={`${edificio.id}-${isHoveredOrSelected ? 'active' : 'inactive'}`}
                            position={[edificio.latitud, edificio.longitud]}
                            icon={customIcon}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    const fullEdificio = edificios.find(
                                        (e) => e.id === edificio.id,
                                    );
                                    setSelectedEdificio(fullEdificio || edificio);
                                },
                                mouseover: () => setHoveredEdificioId(edificio.id),
                                mouseout: () => setHoveredEdificioId(null),
                            }}
                        />
                    );
                })}
            </MapContainer>
        </div>
    );
}
