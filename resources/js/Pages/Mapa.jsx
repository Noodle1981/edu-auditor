import React, {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Head, usePage } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import Modal from '../Components/Modal';
import axios from 'axios';

import { getTheoreticalRadio } from './MapView';

// Lazy-load the heavy map component (Leaflet + react-leaflet) — split into its own chunk
const MapView = lazy(() => import('./MapView'));

export default function Mapa({ edificios = [] }) {
    const { auth } = usePage().props;
    const isAdmin = auth?.user?.role === 'admin';

    const [edificiosList, setEdificiosList] = useState(edificios);

    useEffect(() => {
        setEdificiosList(edificios);
    }, [edificios]);

    const edificiosArray = useMemo(() => {
        if (!edificiosList) return [];
        return Array.isArray(edificiosList) ? edificiosList : Object.values(edificiosList);
    }, [edificiosList]);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        publico: true,
        privado: false,
    });
    const [filterNivel, setFilterNivel] = useState('TODOS');
    const [filterDepto, setFilterDepto] = useState('TODOS');
    const [selectedEdificio, setSelectedEdificio] = useState(null);
    const [isPanelMinimized, setIsPanelMinimized] = useState(false);

    useEffect(() => {
        if (selectedEdificio) {
            setIsPanelMinimized(false);
        }
    }, [selectedEdificio]);
    const [hoveredEdificioId, setHoveredEdificioId] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [showDeptoBorders, setShowDeptoBorders] = useState(true);
    const [isSatellite, setIsSatellite] = useState(false);
    const [showPlazas, setShowPlazas] = useState(true);

    // Form states for the dummy report modal
    const [reportForm, setReportForm] = useState({
        tipo: 'ERROR_DATOS',
        descripcion: '',
        nombre_remitente: '',
        email_remitente: '',
    });
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const handleInlineRadioChange = async (modId, newRadioVal) => {
        try {
            const radioVal = newRadioVal === '' ? null : parseInt(newRadioVal);

            // Make the PATCH request to update the database
            await axios.patch(`/api/modalidades/${modId}/radio`, {
                radio: radioVal
            });

            // Update the local state reactively
            setEdificiosList((prevList) => {
                return prevList.map((edificio) => {
                    const updatedEstablecimientos = (edificio.establecimientos || []).map((est) => {
                        const updatedModalidades = (est.modalidades || []).map((mod) => {
                            if (mod.id === modId) {
                                return { ...mod, radio: radioVal };
                            }
                            return mod;
                        });
                        return { ...est, modalidades: updatedModalidades };
                    });
                    
                    return { ...edificio, establecimientos: updatedEstablecimientos };
                });
            });

            // Also update the selectedEdificio state if it contains this modality
            setSelectedEdificio((prevSelected) => {
                if (!prevSelected) return null;
                const nextEstablecimientos = (prevSelected.establecimientos || []).map((est) => {
                    const nextModalidades = (est.modalidades || []).map((mod) => {
                        if (mod.id === modId) {
                            return { ...mod, radio: radioVal };
                        }
                        return mod;
                    });
                    return { ...est, modalidades: nextModalidades };
                });
                return { ...prevSelected, establecimientos: nextEstablecimientos };
            });

        } catch (error) {
            console.error('Error al actualizar el radio:', error);
            alert('No se pudo guardar el cambio del radio. Por favor intente nuevamente.');
        }
    };

    const handleInlineObsChange = async (modId, newObsVal) => {
        try {
            // Make the PATCH request to update the database
            await axios.patch(`/api/modalidades/${modId}/observaciones`, {
                observaciones: newObsVal
            });

            // Update the local state reactively
            setEdificiosList((prevList) => {
                return prevList.map((edificio) => {
                    const updatedEstablecimientos = (edificio.establecimientos || []).map((est) => {
                        const updatedModalidades = (est.modalidades || []).map((mod) => {
                            if (mod.id === modId) {
                                return { ...mod, observaciones: newObsVal };
                            }
                            return mod;
                        });
                        return { ...est, modalidades: updatedModalidades };
                    });
                    
                    return { ...edificio, establecimientos: updatedEstablecimientos };
                });
            });

            // Also update the selectedEdificio state if it contains this modality
            setSelectedEdificio((prevSelected) => {
                if (!prevSelected) return null;
                const nextEstablecimientos = (prevSelected.establecimientos || []).map((est) => {
                    const nextModalidades = (est.modalidades || []).map((mod) => {
                        if (mod.id === modId) {
                            return { ...mod, observaciones: newObsVal };
                        }
                        return mod;
                    });
                    return { ...est, modalidades: nextModalidades };
                });
                return { ...prevSelected, establecimientos: nextEstablecimientos };
            });

            alert('Observación guardada correctamente.');

        } catch (error) {
            console.error('Error al actualizar la observación:', error);
            alert('No se pudo guardar la observación. Por favor intente nuevamente.');
        }
    };

    const handleInlineObservadoChange = async (modId, isChecked) => {
        try {
            await axios.patch(`/api/modalidades/${modId}/observado`, {
                radio_observado: isChecked
            });

            // Update the local state reactively
            setEdificiosList((prevList) => {
                return prevList.map((edificio) => {
                    const updatedEstablecimientos = (edificio.establecimientos || []).map((est) => {
                        const updatedModalidades = (est.modalidades || []).map((mod) => {
                            if (mod.id === modId) {
                                return { ...mod, radio_observado: isChecked };
                            }
                            return mod;
                        });
                        return { ...est, modalidades: updatedModalidades };
                    });
                    
                    return { ...edificio, establecimientos: updatedEstablecimientos };
                });
            });

            setSelectedEdificio((prevSelected) => {
                if (!prevSelected) return null;
                const nextEstablecimientos = (prevSelected.establecimientos || []).map((est) => {
                    const nextModalidades = (est.modalidades || []).map((mod) => {
                        if (mod.id === modId) {
                            return { ...mod, radio_observado: isChecked };
                        }
                        return mod;
                    });
                    return { ...est, modalidades: nextModalidades };
                });
                return { ...prevSelected, establecimientos: nextEstablecimientos };
            });

        } catch (error) {
            console.error('Error al actualizar el estado observado:', error);
            alert('No se pudo actualizar el estado de la observación. Por favor intente nuevamente.');
        }
    };

    // Get unique levels and departments dynamically based on other active filters (Faceted search)
    const deptosDisponibles = useMemo(() => {
        const set = new Set();
        edificiosArray.forEach((edificio) => {
            const hasMatchingModality = (edificio.establecimientos || []).some((est) =>
                (est.modalidades || []).some((m) => {
                    const matchesScope =
                        (m.ambito === 'PUBLICO' && activeFilters.publico) ||
                        (m.ambito === 'PRIVADO' && activeFilters.privado);
                    const matchesNivel =
                        filterNivel === 'TODOS' || m.nivel === filterNivel;
                    return matchesScope && matchesNivel;
                }),
            );

            if (hasMatchingModality && edificio.zona_departamento) {
                set.add(edificio.zona_departamento);
            }
        });
        return Array.from(set).sort();
    }, [edificiosArray, activeFilters, filterNivel]);

    const nivelesDisponibles = useMemo(() => {
        const set = new Set();
        edificiosArray.forEach((edificio) => {
            const matchesDepto =
                filterDepto === 'TODOS' ||
                edificio.zona_departamento === filterDepto;
            if (!matchesDepto) return;

            (edificio.establecimientos || []).forEach((est) => {
                (est.modalidades || []).forEach((m) => {
                    const matchesScope =
                        (m.ambito === 'PUBLICO' && activeFilters.publico) ||
                        (m.ambito === 'PRIVADO' && activeFilters.privado);
                    if (matchesScope && m.nivel) {
                        set.add(m.nivel);
                    }
                });
            });
        });
        return Array.from(set).sort();
    }, [edificiosArray, activeFilters, filterDepto]);

    // Auto-reset filters if selected option is no longer available
    useEffect(() => {
        if (
            filterDepto !== 'TODOS' &&
            !deptosDisponibles.includes(filterDepto)
        ) {
            setFilterDepto('TODOS');
        }
    }, [deptosDisponibles, filterDepto]);

    useEffect(() => {
        if (
            filterNivel !== 'TODOS' &&
            !nivelesDisponibles.includes(filterNivel)
        ) {
            setFilterNivel('TODOS');
        }
    }, [nivelesDisponibles, filterNivel]);

    // Filter Logic
    const filteredEdificios = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return edificiosArray
            .map((edificio) => {
                // 1. Filter establishments and their modalities by Scope and Nivel
                const filteredEsts = (edificio.establecimientos || [])
                    .map((est) => {
                        const filteredMods = (est.modalidades || []).filter((m) => {
                            const matchesScope =
                                (m.ambito === 'PUBLICO' &&
                                    activeFilters.publico) ||
                                (m.ambito === 'PRIVADO' &&
                                    activeFilters.privado);
                            const matchesNivel =
                                filterNivel === 'TODOS' ||
                                m.nivel === filterNivel;
                            return matchesScope && matchesNivel;
                        });

                        if (filteredMods.length === 0) return null;

                        return {
                            ...est,
                            modalidades: filteredMods,
                        };
                    })
                    .filter(Boolean);

                if (filteredEsts.length === 0) return null;

                // 2. Determine dynamic building scope (ambito) based on filtered establishments
                const hasPrivate = filteredEsts.some((est) =>
                    (est.modalidades || []).some((m) => m.ambito === 'PRIVADO'),
                );
                const dynamicAmbito = hasPrivate ? 'PRIVADO' : 'PUBLICO';

                // 3. Filter by search query if active (search query length >= 2)
                if (query.length >= 2) {
                    const matchesBuilding =
                        (edificio.cui?.toString().toLowerCase() || '').includes(
                            query,
                        ) ||
                        (
                            edificio.localidad?.toString().toLowerCase() || ''
                        ).includes(query) ||
                        (
                            edificio.calle?.toString().toLowerCase() || ''
                        ).includes(query);

                    const finalEsts = filteredEsts.filter((est) => {
                        if (matchesBuilding) return true;

                        const matchesEst =
                            (
                                est.nombre?.toString().toLowerCase() || ''
                            ).includes(query) ||
                            (est.cue?.toString().toLowerCase() || '').includes(
                                query,
                            );
                        return matchesEst;
                    });

                    if (finalEsts.length === 0) return null;

                    return {
                        ...edificio,
                        ambito: dynamicAmbito,
                        establecimientos: finalEsts,
                    };
                }

                // 4. Filter by department if not searching
                const matchesDepto =
                    filterDepto === 'TODOS' ||
                    edificio.zona_departamento === filterDepto;
                if (!matchesDepto) return null;

                return {
                    ...edificio,
                    ambito: dynamicAmbito,
                    establecimientos: filteredEsts,
                };
            })
            .filter(Boolean);
    }, [edificiosArray, searchQuery, activeFilters, filterNivel, filterDepto]);

    // Statistics for the sidebar
    const stats = useMemo(() => {
        const totalEdificios = filteredEdificios.length;

        let totalEstablecimientos = 0;
        let publicos = 0;
        let privados = 0;

        filteredEdificios.forEach((e) => {
            totalEstablecimientos += (e.establecimientos || []).length;
            (e.establecimientos || []).forEach((est) => {
                const isPrivate = (est.modalidades || []).some(
                    (m) => m.ambito === 'PRIVADO',
                );
                if (isPrivate) {
                    privados++;
                } else {
                    publicos++;
                }
            });
        });

        return { totalEdificios, totalEstablecimientos, publicos, privados };
    }, [filteredEdificios]);

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        setIsSearching(query.length > 0);
    }, []);

    const handleSelectSchool = useCallback(
        (edificio) => {
            const fullEdificio = edificiosArray.find((e) => e.id === edificio.id);
            setSelectedEdificio(fullEdificio || edificio);
            setIsSearching(false);
            setSearchQuery('');
        },
        [edificiosArray],
    );

    const searchResults = useMemo(() => {
        if (!searchQuery || searchQuery.length < 2) return [];
        const query = searchQuery.trim().toLowerCase();
        const results = [];

        filteredEdificios.forEach((edificio) => {
            (edificio.establecimientos || []).forEach((est) => {
                const matchesName = (
                    est.nombre?.toString().toLowerCase() || ''
                ).includes(query);
                const matchesCue = (
                    est.cue?.toString().toLowerCase() || ''
                ).includes(query);
                const matchesCui = (
                    edificio.cui?.toString().toLowerCase() || ''
                ).includes(query);

                if (matchesName || matchesCue || matchesCui) {
                    results.push({
                        ...est,
                        edificio: edificio,
                    });
                }
            });
        });
        return results.slice(0, 10);
    }, [filteredEdificios, searchQuery]);

    const toggleFilter = useCallback((type) => {
        setActiveFilters((prev) => {
            // Prevent disabling both filters
            if (
                prev[type] &&
                !prev[type === 'publico' ? 'privado' : 'publico']
            ) {
                return prev;
            }
            return { ...prev, [type]: !prev[type] };
        });
    }, []);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setActiveFilters({ publico: true, privado: false });
        setFilterNivel('TODOS');
        setFilterDepto('TODOS');
        setSelectedEdificio(null);
    }, []);

    const openReportModal = useCallback(() => {
        setReportForm({
            tipo: 'ERROR_DATOS',
            descripcion: selectedEdificio
                ? `Reporte sobre: ${selectedEdificio.establecimientos[0]?.nombre || 'Escuela sin nombre'}\n\n`
                : '',
            nombre_remitente: '',
            email_remitente: '',
        });
        setIsReportModalOpen(true);
    }, [selectedEdificio]);

    const submitReport = useCallback(
        (e) => {
            e.preventDefault();
            setIsSubmittingReport(true);
            
            // Dummy reporting action
            setTimeout(() => {
                setIsSubmittingReport(false);
                setIsReportModalOpen(false);
                alert('Reporte enviado correctamente (Simulación)');
            }, 1000);
        },
        [],
    );

    return (
        <SIAMELayout fullWidth={true} hideHeader={true}>
            <Head>
                <title>Mapa Escolar - SIAME</title>
                <meta
                    name="description"
                    content="Explora el Mapa Escolar. Encuentra establecimientos educativos públicos y privados, consulta niveles, modalidades y ubicaciones exactas."
                />
            </Head>

            <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-50">
                {/* 1. Custom Horizontal Filter Header Bar */}
                <header className="z-[1010] flex h-16 w-full items-center justify-between border-b border-gray-200/80 bg-white px-6 shadow-sm">
                    {/* Brand and Search */}
                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className="rounded-xl border border-[#FE8204]/10 bg-[#FE8204]/5 p-2 text-[#FE8204]">
                                <i className="fa-solid fa-map-location-dot text-lg"></i>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-sm font-black leading-tight text-gray-900">
                                    Mapa <span className="text-[#FE8204]">Escolar</span>
                                </h1>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">
                                    SIAME
                                </p>
                            </div>
                        </div>

                        {/* Search Input with Autocomplete */}
                        <div className="relative flex-1">
                            <input
                                id="search-input"
                                type="text"
                                placeholder="Buscar CUE, CUI o Nombre..."
                                aria-label="Buscar establecimientos por CUE, CUI o Nombre"
                                className="w-full rounded-xl border border-gray-200 bg-gray-55 py-2.5 pl-9 pr-4 text-xs font-semibold text-gray-950 transition-all focus:border-[#FE8204]/50 focus:ring-1 focus:ring-[#FE8204]/30 focus:bg-white"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                onFocus={() => setIsSearching(searchQuery.length > 0)}
                            />
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3.5 text-gray-400 text-xs"></i>

                            {/* Autocomplete Dropdown */}
                            {isSearching && searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[300px] overflow-y-auto rounded-xl border border-gray-150 bg-white shadow-2xl duration-200">
                                    {searchResults.map((result, idx) => (
                                        <div
                                            key={`${result.id}-${idx}`}
                                            onClick={() => handleSelectSchool(result.edificio)}
                                            className="group cursor-pointer border-b border-gray-50 p-3 last:border-0 hover:bg-[#FE8204]/5"
                                        >
                                            <p className="truncate text-[10px] font-black text-gray-900 transition-colors group-hover:text-[#FE8204]">
                                                {result.nombre}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[8px] font-bold text-gray-400">CUE: {result.cue}</span>
                                                <span className="text-[8px] font-black text-[#FE8204]/40">•</span>
                                                <span className="text-[8px] font-bold text-gray-400">{result.edificio.localidad}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle Filters (Ambito, Depto, Nivel) */}
                    <div className="flex items-center gap-3 px-4">
                        {/* Ambito Toggle */}
                        <div className="flex gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1 shrink-0">
                            <button
                                onClick={() => toggleFilter('publico')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    activeFilters.publico
                                        ? 'bg-orange-50 text-[#FE8204] border border-[#FE8204]/20 shadow-sm'
                                        : 'text-gray-400 bg-transparent border border-transparent grayscale'
                                }`}
                            >
                                <div className="h-1.5 w-1.5 rounded-full bg-[#FE8204]"></div>
                                Público
                            </button>
                            <button
                                onClick={() => toggleFilter('privado')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    activeFilters.privado
                                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                                        : 'text-gray-400 bg-transparent border border-transparent grayscale'
                                }`}
                            >
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                Privado
                            </button>
                        </div>

                        {/* Departamento select */}
                        <div className="relative shrink-0">
                            <select
                                id="depto-select"
                                value={filterDepto}
                                onChange={(e) => setFilterDepto(e.target.value)}
                                className="appearance-none rounded-xl border border-gray-150 bg-gray-55 py-2 pl-3 pr-8 text-xs font-bold text-gray-700 shadow-sm transition-all focus:border-[#FE8204] focus:bg-white"
                            >
                                <option value="TODOS">Todos los Deptos</option>
                                {deptosDisponibles.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <i className="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                        </div>

                        {/* Nivel select */}
                        <div className="relative shrink-0">
                            <select
                                id="nivel-select"
                                value={filterNivel}
                                onChange={(e) => setFilterNivel(e.target.value)}
                                className="appearance-none rounded-xl border border-gray-150 bg-gray-55 py-2 pl-3 pr-8 text-xs font-bold text-gray-700 shadow-sm transition-all focus:border-[#FE8204] focus:bg-white"
                            >
                                <option value="TODOS">Todos los Niveles</option>
                                {nivelesDisponibles.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            <i className="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                        </div>
                    </div>

                    {/* Right Options (Layers, Stats, Reset) */}
                    <div className="flex items-center gap-4 shrink-0">
                        {/* Layer Switches */}
                        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-1">
                            <button
                                onClick={() => setShowDeptoBorders(!showDeptoBorders)}
                                title="Límites de Departamentos"
                                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all ${
                                    showDeptoBorders
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-150'
                                        : 'text-gray-400 border border-transparent'
                                }`}
                            >
                                <i className="fa-solid fa-map-location text-[#FE8204]/60"></i>
                                <span className="hidden md:inline text-xs font-bold">Límites</span>
                            </button>
                            <button
                                onClick={() => setShowPlazas(!showPlazas)}
                                title="Plazas Origen Km 0"
                                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all ${
                                    showPlazas
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-150'
                                        : 'text-gray-400 border border-transparent'
                                }`}
                            >
                                <i className="fa-solid fa-star text-yellow-550"></i>
                                <span className="hidden md:inline text-xs font-bold">Plazas Km 0</span>
                            </button>
                        </div>

                        {/* Stats Badges */}
                        <div className="hidden lg:flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl p-1 shrink-0">
                            <div className="px-2 py-0.5">
                                <p className="text-[7px] font-black uppercase text-gray-400 tracking-wider">Edificios</p>
                                <p className="text-xs font-black text-gray-700 leading-tight">{stats.totalEdificios}</p>
                            </div>
                            <div className="w-px h-6 bg-gray-200"></div>
                            <div className="px-2 py-0.5">
                                <p className="text-[7px] font-black uppercase text-gray-400 tracking-wider">Escuelas</p>
                                <p className="text-xs font-black text-gray-700 leading-tight">{stats.totalEstablecimientos}</p>
                            </div>
                        </div>

                        {/* Clear Button */}
                        <button
                            onClick={clearFilters}
                            title="Limpiar Filtros"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-all hover:border-[#FE8204] hover:text-[#FE8204]"
                        >
                            <i className="fa-solid fa-arrows-rotate"></i>
                        </button>
                    </div>
                </header>

                {/* 2. Main Map + Sidebar Layout Container */}
                <div className="flex-1 flex min-h-0 relative">
                    {/* Map Area */}
                    <div className="flex-1 h-full relative">
                        <Suspense
                            fallback={
                                <div className="flex h-full w-full items-center justify-center bg-[#FE8204]/5">
                                    <div className="flex flex-col items-center gap-4 text-[#FE8204]">
                                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#FE8204]/20 border-t-[#FE8204]"></div>
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                                            Cargando Mapa...
                                        </p>
                                    </div>
                                </div>
                            }
                        >
                            <MapView
                                filteredEdificios={filteredEdificios}
                                edificios={edificiosArray}
                                selectedEdificio={selectedEdificio}
                                setSelectedEdificio={setSelectedEdificio}
                                hoveredEdificioId={hoveredEdificioId}
                                setHoveredEdificioId={setHoveredEdificioId}
                                sidebarOpen={selectedEdificio && !isPanelMinimized}
                                showDeptoBorders={showDeptoBorders}
                                filterDepto={filterDepto}
                                isSatellite={isSatellite}
                                showPlazas={showPlazas}
                            />
                        </Suspense>

                        {/* Map Buttons (Zoom reset and satellite toggle) */}
                        <div className="absolute right-6 top-6 z-[1001] flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setSelectedEdificio(null);
                                    setSelectedEdificio({
                                        latitud: -31.5375,
                                        longitud: -68.5364,
                                        zoom: 11,
                                        _isCenter: true,
                                    });
                                }}
                                aria-label="Recentrar mapa en San Juan"
                                className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-150 bg-white text-gray-500 shadow-xl transition-all hover:text-[#FE8204]"
                                title="Recentrar Mapa"
                            >
                                <i className="fa-solid fa-expand transition-transform group-hover:scale-110"></i>
                            </button>

                            <button
                                onClick={() => setIsSatellite((v) => !v)}
                                aria-label={
                                    isSatellite
                                        ? 'Cambiar a mapa normal'
                                        : 'Cambiar a vista satelital'
                                }
                                title={
                                    isSatellite ? 'Vista Normal' : 'Vista Satélite'
                                }
                                className={`group flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xl transition-all ${
                                    isSatellite
                                        ? 'border-[#FE8204]/30 bg-[#FE8204] text-white'
                                        : 'border-gray-150 bg-white text-gray-500 hover:text-[#FE8204]'
                                }`}
                            >
                                <i
                                    className={`fa-solid fa-satellite transition-transform group-hover:scale-110 ${isSatellite ? 'text-white' : ''}`}
                                ></i>
                            </button>
                        </div>
                    </div>

                    {/* Right Collapsible Info Panel */}
                    {selectedEdificio && selectedEdificio.establecimientos && (
                        <aside
                            className={`absolute right-0 top-0 h-full flex flex-col border-l border-gray-250 bg-white shadow-2xl transition-all duration-300 ease-in-out z-[1000] ${
                                isPanelMinimized ? 'w-0' : 'w-[380px] md:w-[420px]'
                            }`}
                        >
                            {/* Toggle tab button on the left edge */}
                            <button
                                onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                                className="absolute left-0 top-1/2 z-[1001] flex h-16 w-6 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-xl border-y border-l border-gray-200 bg-white text-gray-400 shadow-md transition-colors hover:text-[#FE8204]"
                                aria-label={isPanelMinimized ? 'Expandir panel informativo' : 'Minimizar panel informativo'}
                            >
                                <i className={`fa-solid fa-chevron-${isPanelMinimized ? 'left' : 'right'} text-[10px]`}></i>
                            </button>

                            {/* Inner content (hidden when width is 0 during collapse transition) */}
                            {!isPanelMinimized && (
                                <div className="flex h-full w-full flex-col bg-white overflow-hidden">
                                    {/* Header */}
                                    <div className="border-b border-[#FE8204]/5 bg-[#FE8204]/5 p-5 flex items-start justify-between gap-4 shrink-0">
                                        <div className="flex items-start gap-3">
                                            <div className={`rounded-xl p-2.5 text-white ${
                                                selectedEdificio.ambito === 'PUBLICO' ? 'bg-[#FE8204]' : 'bg-blue-500'
                                            }`}>
                                                <i className="fa-solid fa-school text-lg"></i>
                                            </div>
                                            <div>
                                                <h2 className="text-[10px] font-black uppercase tracking-wider text-[#FE8204] flex items-center gap-1.5 flex-wrap">
                                                    <span>{selectedEdificio.zona_departamento || 'Sin Departamento'}</span>
                                                    <span className="text-[#FE8204]/40">•</span>
                                                    <span>CUI: {selectedEdificio.cui}</span>
                                                </h2>
                                                <p className="text-sm font-black text-gray-900 leading-tight mt-0.5">
                                                    {selectedEdificio.localidad}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                    {selectedEdificio.calle} {selectedEdificio.numero_puerta || ''}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => setSelectedEdificio(null)}
                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-950 transition-colors"
                                            aria-label="Cerrar detalles"
                                        >
                                            <i className="fa-solid fa-xmark text-sm"></i>
                                        </button>
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                                        {/* Establishments */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                    Establecimientos en este Edificio
                                                </h3>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                                    CUI: {selectedEdificio.cui}
                                                </span>
                                            </div>
                                            {selectedEdificio.establecimientos.map((est, i) => (
                                                <div
                                                    key={i}
                                                    className={`rounded-xl border p-4 space-y-3 transition-all duration-300 ${
                                                        est.modalidades?.some(m => m.radio_observado)
                                                            ? 'border-red-200 bg-red-50/20 shadow-sm shadow-red-50'
                                                            : 'border-gray-150 bg-gray-50/50'
                                                    }`}
                                                >
                                                    <div>
                                                        <h4 className="text-xs font-black text-gray-950 leading-snug">
                                                            {est.nombre}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-bold text-gray-400">CUE: {est.cue}</span>
                                                            {isAdmin && (
                                                                <>
                                                                    <span className="text-gray-300 text-[8px]">•</span>
                                                                    <a
                                                                        href={`/admin/establecimientos?search=${est.cue}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-[9px] font-black uppercase text-[#FE8204] hover:text-[#e07203] hover:underline flex items-center gap-1 transition-all"
                                                                    >
                                                                        <i className="fa-solid fa-pen-to-square text-[9px]"></i>
                                                                        Editar
                                                                    </a>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2.5 border-t border-gray-200/60 pt-2.5">
                                                        {est.modalidades?.map((mod, j) => (
                                                            <div key={j} className="flex flex-col gap-1.5">
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    <span className="rounded-md border border-orange-100 bg-orange-50 px-2 py-0.5 text-[8px] font-black uppercase text-[#FE8204]">
                                                                        {mod.nivel}
                                                                    </span>
                                                                    <span className="rounded-md border border-gray-150 bg-gray-100/50 px-2 py-0.5 text-[8px] font-black text-gray-500">
                                                                        {mod.area}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                                                                    {isAdmin ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <span>Radio:</span>
                                                                            <select
                                                                                value={(mod.radio === 'N/A' || mod.radio === null || mod.radio === undefined) ? '' : mod.radio}
                                                                                onChange={(e) => handleInlineRadioChange(mod.id, e.target.value)}
                                                                                className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-black text-gray-950 focus:border-[#FE8204] focus:outline-none cursor-pointer"
                                                                            >
                                                                                <option value="">N/A</option>
                                                                                <option value="1">1</option>
                                                                                <option value="2">2</option>
                                                                                <option value="3">3</option>
                                                                                <option value="4">4</option>
                                                                                <option value="5">5</option>
                                                                                <option value="6">6</option>
                                                                                <option value="7">7</option>
                                                                            </select>
                                                                        </div>
                                                                    ) : (
                                                                        <span>Radio: <b className="text-gray-950">{mod.radio ?? 'N/A'}</b></span>
                                                                    )}
                                                                    {mod.radio_sige && (
                                                                        <>
                                                                            <span className="text-gray-300">•</span>
                                                                            <span>SiGE: <b className="text-gray-950">{mod.radio_sige}</b></span>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                {/* Spatial Audit */}
                                                                {(() => {
                                                                     const thRadio = getTheoreticalRadio(selectedEdificio.punto_partida, selectedEdificio.dist_circunf);
                                                                     if (!thRadio) return null;
                                                                     
                                                                     const sysRadioRaw = (mod.radio !== null && mod.radio !== undefined && mod.radio !== 'N/A' && mod.radio !== '') 
                                                                         ? mod.radio 
                                                                         : mod.radio_sige;
                                                                     let s = (sysRadioRaw && sysRadioRaw !== 'N/A' && sysRadioRaw !== '') ? parseInt(sysRadioRaw) : null;
                                                                     if (s === 7) s = 6;
                                                                     const circ = selectedEdificio.radio_circ ? parseInt(selectedEdificio.radio_circ) : null;
                                                                     const camino = selectedEdificio.radio_camino ? parseInt(selectedEdificio.radio_camino) : null;
                                                                     
                                                                     const hasCirc = circ !== null && !isNaN(circ);
                                                                     const hasCamino = camino !== null && !isNaN(camino);

                                                                     let modStatus = 'COINCIDE';
                                                                     if (mod.radio_justificado) {
                                                                          modStatus = 'JUSTIFICADO';
                                                                      } else if (s === null || isNaN(s)) {
                                                                          modStatus = 'COINCIDE';
                                                                      } else {
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
                                                                      }

                                                                    if (modStatus === 'JUSTIFICADO') {
                                                                        return (
                                                                            <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-[9px] text-cyan-800 font-bold">
                                                                                <i className="fa-solid fa-gavel text-cyan-600"></i>
                                                                                <span>Justificado Legalmente: {mod.inst_legal_radio || 'Decreto/Res'}</span>
                                                                            </div>
                                                                        );
                                                                    } else if (modStatus === 'COINCIDE') {
                                                                        return (
                                                                            <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[9px] text-emerald-800 font-bold">
                                                                                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                                                                <span>Coincide: Radio Geográfico {thRadio}</span>
                                                                            </div>
                                                                        );
                                                                    } else if (modStatus === 'INCONGRUENTE') {
                                                                        return (
                                                                            <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[9px] text-amber-800 font-bold animate-pulse">
                                                                                <i className="fa-solid fa-circle-exclamation text-amber-600"></i>
                                                                                <span>Incongruente: Radio Geográfico es {thRadio} ⚠️</span>
                                                                            </div>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[9px] text-red-750 font-bold">
                                                                                <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                                                                                <span>Distinto: Radio Geográfico es {thRadio} ⚠️</span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                })()}
                                                            </div>
                                                        ))}

                                                        {/* ── Observation per Establishment (outside modalities loop) ── */}
                                                        {(() => {
                                                            const refMod = est.modalidades?.[0];
                                                            if (!refMod) return null;
                                                            return (
                                                                <div className="mt-2.5 border-t border-gray-200/60 pt-2.5">
                                                                    {isAdmin ? (
                                                                        <div className="space-y-2">
                                                                            <div className="space-y-1">
                                                                                <label className="text-[8px] font-black uppercase text-gray-400">Justificación / Detalle</label>
                                                                                <textarea
                                                                                    defaultValue={refMod.observaciones || ''}
                                                                                    id={`obs-input-${est.cue}`}
                                                                                    placeholder="Ej. El establecimiento tiene otro radio porque está ubicado en otro edificio..."
                                                                                    className="w-full rounded-lg border border-gray-200 bg-white p-2 text-[10px] text-gray-800 focus:border-[#FE8204] focus:outline-none"
                                                                                    rows={2}
                                                                                />
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase cursor-pointer select-none bg-red-50/50 hover:bg-red-100/50 px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={!!refMod.radio_observado}
                                                                                        onChange={(e) => handleInlineObservadoChange(refMod.id, e.target.checked)}
                                                                                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-3.5 w-3.5 cursor-pointer"
                                                                                    />
                                                                                    <i className="fa-solid fa-flag text-red-500 text-[10px]"></i>
                                                                                    <span className="text-red-700">Observado</span>
                                                                                </label>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={async () => {
                                                                                        const el = document.getElementById(`obs-input-${est.cue}`);
                                                                                        if (el) await handleInlineObsChange(refMod.id, el.value);
                                                                                    }}
                                                                                    className="rounded bg-[#FE8204] hover:bg-[#e07203] px-2.5 py-1.5 text-[9px] font-black uppercase text-white transition-colors cursor-pointer"
                                                                                >
                                                                                    {refMod.observaciones ? 'Actualizar Justificación' : 'Guardar Justificación'}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        refMod.observaciones && (
                                                                            <div className="p-2 rounded-lg bg-red-100/50 border border-red-200 text-[10px] font-medium leading-snug flex items-start gap-1.5">
                                                                                <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 shrink-0"></i>
                                                                                <span className="text-red-800">{refMod.observaciones}</span>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Georeference and origin Plaza */}
                                        {selectedEdificio.punto_partida && (
                                            <div className="rounded-xl border border-[#FE8204]/10 bg-[#FE8204]/5 p-4 space-y-3">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-[#FE8204]">
                                                    Auditoría de Compensación Km 0
                                                </h3>
                                                <div className="space-y-2 text-[10px]">
                                                    <div className="flex justify-between items-center py-1 border-b border-[#FE8204]/10">
                                                        <span className="font-bold text-gray-500">Plaza de Origen</span>
                                                        <span className="font-black text-gray-900 uppercase truncate max-w-[180px]">{selectedEdificio.punto_partida}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-1 border-b border-[#FE8204]/10">
                                                        <span className="font-bold text-gray-500">Distancia en Carretera</span>
                                                        <span className="font-black text-gray-950">
                                                            {selectedEdificio.distancia_camino ? `${parseFloat(selectedEdificio.distancia_camino).toFixed(1)} km` : 'S/D'}
                                                            {selectedEdificio.tiempo_google_auto && ` (${selectedEdificio.tiempo_google_auto})`}
                                                        </span>
                                                    </div>
                                                    {selectedEdificio.radio_camino && (
                                                        <div className="flex justify-between items-center py-1 border-b border-[#FE8204]/10">
                                                            <span className="font-bold text-gray-500">Radio de Camino</span>
                                                            <span className="font-black text-gray-950">Radio {selectedEdificio.radio_camino}</span>
                                                        </div>
                                                    )}
                                                    {selectedEdificio.dist_circunf && (
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="font-bold text-gray-500">Distancia en Línea Recta</span>
                                                            <span className="font-black text-gray-950">
                                                                {parseFloat(selectedEdificio.dist_circunf).toFixed(1)} km (Radio {selectedEdificio.radio_circ || 'S/D'})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions footer */}
                                    <div className="border-t border-gray-100 bg-gray-55 p-4 flex gap-2 shrink-0">
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEdificio.latitud},${selectedEdificio.longitud}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-250 bg-emerald-50 py-3 text-[10px] font-black uppercase tracking-wider text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white"
                                        >
                                            <i className="fa-solid fa-diamond-turn-right"></i>
                                            Cómo llegar
                                        </a>
                                        <button
                                            onClick={openReportModal}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-[10px] font-black uppercase tracking-wider text-red-650 transition-all hover:bg-red-500 hover:text-white"
                                        >
                                            <i className="fa-solid fa-bug"></i>
                                            Reportar Error
                                        </button>
                                    </div>
                                </div>
                            )}
                        </aside>
                    )}
                </div>
            </div>

            {/* Report Modal */}
            <Modal
                show={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                maxWidth="lg"
            >
                <div className="bg-white p-8">
                    <div className="mb-8 flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-500 shadow-inner">
                            <i className="fa-solid fa-bullhorn"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black leading-tight text-gray-900">
                                Reportar un{' '}
                                <span className="text-red-500">
                                    Inconveniente
                                </span>
                            </h2>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                Ayúdanos a mejorar el mapa escolar
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submitReport} className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Tipo de Inconveniente
                            </label>
                            <select
                                value={reportForm.tipo}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        tipo: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border-gray-150 bg-gray-50 py-3 text-xs font-black uppercase text-gray-700 focus:outline-none focus:border-[#FE8204]"
                            >
                                <option value="ERROR_DATOS">
                                    Error de Datos (Ubicación/Nombre)
                                </option>
                                <option value="ERROR_SISTEMA">
                                    Fallo del Sistema
                                </option>
                                <option value="SUGERENCIA">Sugerencia</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Descripción Detallada
                            </label>
                            <textarea
                                value={reportForm.descripcion}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        descripcion: e.target.value,
                                    })
                                }
                                rows={4}
                                required
                                placeholder="Describe el problema o sugerencia..."
                                className="w-full rounded-xl border-gray-150 bg-gray-50 p-4 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#FE8204]"
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Tu Nombre
                                </label>
                                <input
                                    type="text"
                                    value={reportForm.nombre_remitente}
                                    onChange={(e) =>
                                        setReportForm({
                                            ...reportForm,
                                            nombre_remitente: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="Ej. Juan Pérez"
                                    className="w-full rounded-xl border-gray-150 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#FE8204]"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Tu Email
                                </label>
                                <input
                                    type="email"
                                    value={reportForm.email_remitente}
                                    onChange={(e) =>
                                        setReportForm({
                                            ...reportForm,
                                            email_remitente: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="juan@ejemplo.com"
                                    className="w-full rounded-xl border-gray-150 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#FE8204]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 border-t border-gray-100 pt-6">
                            <button
                                type="button"
                                onClick={() => setIsReportModalOpen(false)}
                                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-150 bg-white py-4 text-xs font-black uppercase tracking-widest text-gray-400 transition-all hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingReport}
                                className="flex flex-[2] items-center justify-center gap-3 rounded-2xl bg-red-500 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-600 disabled:opacity-50"
                            >
                                {isSubmittingReport ? (
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                ) : (
                                    <i className="fa-solid fa-paper-plane"></i>
                                )}
                                Enviar Reporte
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <style>{`
                /* ── Custom Orange Cursor for Leaflet Map ────────────── */
                .leaflet-container,
                .leaflet-grab,
                .leaflet-interactive {
                    cursor: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyNCcgaGVpZ2h0PScyNCcgdmlld0JveD0nMCAwIDI0IDI0Jz48cGF0aCBmaWxsPScjRkU4MjA0JyBzdHJva2U9JyNmZmZmZmYnIHN0cm9rZS13aWR0aD0nMS41JyBkPSdNNC41IDIuMjV2MTkuNWw1LjYyNS01LjYyNWg3Ljg3NUw0LjUgMi4yNXonLz48L3N2Zz4=") 4 2, auto !important;
                }
                .leaflet-dragging,
                .leaflet-dragging .leaflet-grab,
                .leaflet-dragging .leaflet-interactive {
                    cursor: grabbing !important;
                }

                /* ── Scrollbars ─────────────────────────────────────── */
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #FE820430; border-radius: 10px; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                /* ── Remove focus ring on SVG paths (department borders) */
                path.leaflet-interactive:focus {
                    outline: none !important;
                    box-shadow: none !important;
                }

                /* ── School Card Overlay ─────────────────────────────── */
                .school-card {
                    position: absolute;
                    bottom: 32px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 320px;
                    max-width: calc(100vw - 32px);
                    z-index: 1000;
                    background: rgba(255,255,255,0.98);
                    border-radius: 20px;
                    border: 1px solid rgba(254,130,4,0.12);
                    box-shadow: 0 12px 48px rgba(0,0,0,0.18);
                    overflow: hidden;
                    animation: card-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
                    pointer-events: all;
                }
                @keyframes card-in {
                    from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.96); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
                }

                .school-card__header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 14px 14px 10px;
                    border-bottom: 1px solid rgba(254,130,4,0.08);
                    background: rgba(254,130,4,0.02);
                }
                .school-card__header-left {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                }
                .school-card__icon {
                    flex-shrink: 0;
                    width: 34px; height: 34px;
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px;
                }
                .school-card__icon--orange { background: #FFF7ED; color: #FE8204; }
                .school-card__icon--blue   { background: #EFF6FF; color: #3B82F6; }

                .school-card__depto {
                    font-size: 10px; font-weight: 900;
                    color: #FE8204; text-transform: uppercase;
                    letter-spacing: 0.05em; line-height: 1.2;
                    margin: 0 0 2px;
                }
                .school-card__localidad {
                    font-size: 10px; font-weight: 900;
                    color: #111827; text-transform: uppercase;
                    line-height: 1.2; margin: 0 0 2px;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .school-card__address {
                    font-size: 9px; font-weight: 700;
                    color: #9CA3AF; margin: 0;
                }

                .school-card__actions {
                    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
                }
                .school-card__maps-btn {
                    display: flex; align-items: center; gap: 5px;
                    padding: 6px 10px; border-radius: 10px;
                    background: #F0FDF4; color: #16A34A;
                    border: 1px solid #DCFCE7;
                    font-size: 9px; font-weight: 900;
                    text-transform: uppercase; text-decoration: none;
                    transition: background 0.2s, color 0.2s;
                }
                .school-card__maps-btn:hover { background: #16A34A; color: white; }

                .school-card__close-btn {
                    width: 28px; height: 28px; border-radius: 8px;
                    border: 1px solid #F3F4F6; background: white;
                    color: #9CA3AF; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 11px;
                    transition: background 0.15s, color 0.15s;
                }
                .school-card__close-btn:hover { background: #FEE2E2; color: #EF4444; border-color: #FECACA; }

                .school-card__body {
                    padding: 10px 12px;
                    max-height: 220px;
                    overflow-y: auto;
                    display: flex; flex-direction: column; gap: 8px;
                }
                .school-card__est {
                    padding: 10px 12px;
                    background: #F9FAFB;
                    border-radius: 12px;
                    border: 1px solid #F3F4F6;
                }
                .school-card__est-name {
                    font-size: 11px; font-weight: 900;
                    color: #1F2937; margin: 0 0 6px;
                }
                .school-card__modalidades {
                    display: flex; flex-direction: column; gap: 4px;
                }
                .school-card__modalidad {
                    display: flex; gap: 4px; flex-wrap: wrap;
                }
                .school-card__tag {
                    font-size: 9px; font-weight: 700;
                    padding: 2px 6px; border-radius: 5px;
                }
                .school-card__tag--nivel {
                    background: #FFF7ED; color: #FE8204; border: 1px solid #FFEDD5;
                }
                .school-card__tag--area {
                    background: #F9FAFB; color: #6B7280; border: 1px solid #F3F4F6;
                    max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
            `}</style>
        </SIAMELayout>
    );
}

function FilterBtn({ active, onClick, label, color }) {
    const activeClass =
        color === 'orange'
            ? 'bg-orange-50 text-[#FE8204] border-[#FE8204]/30 shadow-sm font-bold'
            : 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm font-bold';
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-xs font-bold transition-all cursor-pointer ${
                active
                    ? activeClass
                    : 'border-gray-100 bg-gray-50 text-gray-400 grayscale'
            }`}
        >
            <div
                className={`h-2 w-2 rounded-full ${color === 'orange' ? 'bg-[#FE8204] shadow-orange-500/50' : 'bg-blue-500 shadow-blue-500/50'} shadow-sm`}
            ></div>
            <span>{label}</span>
        </button>
    );
}
