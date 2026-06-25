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
    CircleMarker,
    GeoJSON,
    MapContainer,
    useMap,
    useMapEvents,
    Marker,
    Polyline,
    Circle,
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
            const sysRadioRaw = mod.radio_sige || mod.radio;
            if (sysRadioRaw === null || sysRadioRaw === undefined || sysRadioRaw === 'N/A') return;
            
            const s = parseInt(sysRadioRaw);
            const circ = edificio.radio_circ ? parseInt(edificio.radio_circ) : null;
            const camino = edificio.radio_camino ? parseInt(edificio.radio_camino) : null;
            
            if (circ === null && camino === null) return;
            
            const matchesCirc = circ !== null && s === circ;
            const matchesCamino = camino !== null && s === camino;
            
            if (matchesCirc || matchesCamino) {
                return;
            }
            
            const greaterThanCirc = circ === null || s > circ;
            const greaterThanCamino = camino === null || s > camino;
            
            let modStatus = 'DISTINTO';
            if (greaterThanCirc && greaterThanCamino) {
                modStatus = 'INCONGRUENTE';
            }
            
            if (modStatus === 'INCONGRUENTE') {
                status = 'INCONGRUENTE';
            } else if (modStatus === 'DISTINTO' && status !== 'INCONGRUENTE') {
                status = 'DISTINTO';
            }
        });
    });

    return status;
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
                    return activePlaza.radios.map((r, i) => (
                        <Circle
                            key={`circle-${activePlaza.name}-${r.radio}-${i}`}
                            center={[activePlaza.lat, activePlaza.lng]}
                            radius={r.limit}
                            pathOptions={{
                                color: activePlaza.color,
                                weight: 1.2,
                                dashArray: '4, 8',
                                fillColor: r.color,
                                fillOpacity: 0.015,
                                interactive: false
                            }}
                        />
                    ));
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
                    const markerColor = status === 'INCONGRUENTE'
                        ? '#F59E0B' // Yellow for incongruent
                        : status === 'DISTINTO'
                            ? '#EF4444' // Red for different
                            : edificio.ambito === 'PUBLICO'
                                ? '#10B981' // Green for matching public
                                : '#3B82F6'; // Blue for private
                    
                    return (
                        <CircleMarker
                            key={edificio.id}
                            pane="markerPane"
                            center={[edificio.latitud, edificio.longitud]}
                            radius={
                                hoveredEdificioId === edificio.id ||
                                selectedEdificio?.id === edificio.id
                                    ? 14
                                    : 9
                            }
                            pathOptions={{
                                fillColor: markerColor,
                                color: 'white',
                                weight:
                                    hoveredEdificioId === edificio.id ||
                                    selectedEdificio?.id === edificio.id
                                        ? 4
                                        : 2,
                                fillOpacity:
                                    hoveredEdificioId === edificio.id ||
                                    selectedEdificio?.id === edificio.id
                                        ? 1
                                        : 0.8,
                            }}
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
