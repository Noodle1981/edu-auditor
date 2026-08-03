import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import SIAMELayout from '../../Layouts/SIAMELayout';
import { GlassCard } from '../../Components/GlassCard';

export default function AuditoriaSueldosIndex({
  nominas = [],
  nominaSeleccionada = null,
  resultados = [],
  viejos = [],
  conflictosSige = [],
  sectoresSinSige = [],
  establecimientosList = [],
  cruceEscuelas = [],
  kpis = {}
}) {
  const [activeTab, setActiveTab] = useState('kpi');
  const [search, setSearch] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroGestion, setFiltroGestion] = useState('');
  const [filtroAuditoria, setFiltroAuditoria] = useState('');
  const [filtroCruce, setFiltroCruce] = useState('');
  const [filtroDepto, setFiltroDepto] = useState('');
  const [filtroAmbito, setFiltroAmbito] = useState('');
  const [filtroRadio, setFiltroRadio] = useState('');

  // Local state for management updates
  const [auditList, setAuditList] = useState(resultados);
  const [viejosList, setViejosList] = useState(viejos);
  const [editingItem, setEditingItem] = useState(null);
  const [notaInput, setNotaInput] = useState('');
  const [estadoGestionInput, setEstadoGestionInput] = useState('PENDIENTE');
  const [updating, setUpdating] = useState(false);

  // State for sector saneamiento
  const [saneamientoModalSector, setSaneamientoModalSector] = useState(null);
  const [saneamientoEstId, setSaneamientoEstId] = useState('');
  const [saneamientoObs, setSaneamientoObs] = useState('');
  const [sanearSubmitting, setSanearSubmitting] = useState(false);
  const [conflictosModalData, setConflictosModalData] = useState(null);

  const linkedViejos = useMemo(() => viejosList.filter(v => v.nombre_establecimiento !== 'Sin Establecimiento Registrado' && v.cue), [viejosList]);
  const unlinkedViejos = useMemo(() => viejosList.filter(v => v.nombre_establecimiento === 'Sin Establecimiento Registrado' || !v.cue), [viejosList]);
  
  const linkedAuditList = useMemo(() => auditList.filter(item => item.cue !== null), [auditList]);
  const unlinkedAuditList = useMemo(() => auditList.filter(item => item.cue === null), [auditList]);

  // Dynamic filter options lookup
  const deptosDisponibles = useMemo(() => {
    const list = new Set();
    auditList.forEach(i => { if (i.departamento) list.add(i.departamento); });
    cruceEscuelas.forEach(i => { if (i.departamento) list.add(i.departamento); });
    viejosList.forEach(v => { if (v.departamento) list.add(v.departamento); });
    return Array.from(list).sort();
  }, [auditList, cruceEscuelas, viejosList]);

  const radiosDisponibles = useMemo(() => {
    const list = new Set();
    auditList.forEach(i => {
      if (i.radio_sige !== null) list.add(Number(i.radio_sige));
      if (i.radio_sueldo !== null) list.add(Number(i.radio_sueldo));
    });
    cruceEscuelas.forEach(i => {
      if (i.radio_sige !== null) list.add(Number(i.radio_sige));
      if (i.radio_sueldo !== null) list.add(Number(i.radio_sueldo));
    });
    viejosList.forEach(v => {
      if (v.radio_sige !== null) list.add(Number(v.radio_sige));
      if (v.radio_sueldo !== null) list.add(Number(v.radio_sueldo));
    });
    return Array.from(list).sort((a, b) => a - b);
  }, [auditList, cruceEscuelas, viejosList]);

  // Filtering
  const filteredResultados = auditList.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      (item.sector && item.sector.toString().includes(term)) ||
      (item.nombre_establecimiento && item.nombre_establecimiento.toLowerCase().includes(term)) ||
      (item.localidad && item.localidad.toLowerCase().includes(term)) ||
      (item.cue && item.cue.toString().includes(term));

    const matchesNivel = !filtroNivel || item.nivel_educativo === filtroNivel;
    const matchesGestion = !filtroGestion || item.estado_gestion === filtroGestion;
    const matchesAuditoria = !filtroAuditoria || item.estado_auditoria === filtroAuditoria;
    const matchesDepto = !filtroDepto || item.departamento === filtroDepto;
    const matchesAmbito = !filtroAmbito || item.ambito === filtroAmbito;
    const matchesRadio = !filtroRadio || Number(item.radio_sige) === Number(filtroRadio) || Number(item.radio_sueldo) === Number(filtroRadio);

    return matchesSearch && matchesNivel && matchesGestion && matchesAuditoria && matchesDepto && matchesAmbito && matchesRadio;
  });

  const linkedResultados = useMemo(() => filteredResultados.filter(item => item.cue !== null), [filteredResultados]);
  const unlinkedResultados = useMemo(() => filteredResultados.filter(item => item.cue === null), [filteredResultados]);

  const pagaMasList = useMemo(() => linkedResultados.filter(
    (item) => item.estado_auditoria === 'PAGA_MAS_QUE_SIGE'
  ), [linkedResultados]);

  const pagaMenosList = useMemo(() => linkedResultados.filter(
    (item) => item.estado_auditoria === 'PAGA_MENOS_QUE_SIGE'
  ), [linkedResultados]);

  const zonasInconsistentesList = useMemo(() => linkedResultados.filter(
    (item) => !item.coincide_zona && item.zona_sige
  ), [linkedResultados]);

  const filteredLinkedViejos = useMemo(() => {
    const term = search.toLowerCase();
    return linkedViejos.filter((v) => {
      const matchesSearch = !search ||
        (v.sector && v.sector.toString().includes(term)) ||
        (v.nombre_establecimiento && v.nombre_establecimiento.toLowerCase().includes(term)) ||
        (v.cue && v.cue.toString().includes(term));

      const matchesDepto = !filtroDepto || v.departamento === filtroDepto;
      const matchesAmbito = !filtroAmbito || v.ambito === filtroAmbito;
      const matchesRadio = !filtroRadio || Number(v.radio_sige) === Number(filtroRadio) || Number(v.radio_sueldo) === Number(filtroRadio);

      return matchesSearch && matchesDepto && matchesAmbito && matchesRadio;
    });
  }, [linkedViejos, search, filtroDepto, filtroAmbito, filtroRadio]);

  const filteredUnlinkedViejos = useMemo(() => {
    const term = search.toLowerCase();
    return unlinkedViejos.filter((v) => {
      const matchesSearch = !search ||
        (v.sector && v.sector.toString().includes(term)) ||
        (v.nombre_establecimiento && v.nombre_establecimiento.toLowerCase().includes(term)) ||
        (v.cue && v.cue.toString().includes(term));

      const matchesDepto = !filtroDepto || v.departamento === filtroDepto;
      const matchesAmbito = !filtroAmbito || v.ambito === filtroAmbito;
      const matchesRadio = !filtroRadio || Number(v.radio_sige) === Number(filtroRadio) || Number(v.radio_sueldo) === Number(filtroRadio);

      return matchesSearch && matchesDepto && matchesAmbito && matchesRadio;
    });
  }, [unlinkedViejos, search, filtroDepto, filtroAmbito, filtroRadio]);

  const cruceBaseFiltered = useMemo(() => {
    return cruceEscuelas.filter((item) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !search ||
        (item.cue && item.cue.toString().includes(term)) ||
        (item.nombre_establecimiento && item.nombre_establecimiento.toLowerCase().includes(term)) ||
        (item.sector_sige && item.sector_sige.toString().includes(term)) ||
        (item.departamento && item.departamento.toLowerCase().includes(term));

      const matchesNivel = !filtroNivel || item.nivel_educativo === filtroNivel;
      const matchesDepto = !filtroDepto || item.departamento === filtroDepto;
      const matchesAmbito = !filtroAmbito || item.ambito === filtroAmbito;
      const matchesRadio = !filtroRadio || Number(item.radio_sige) === Number(filtroRadio) || Number(item.radio_sueldo) === Number(filtroRadio);

      return matchesSearch && matchesNivel && matchesDepto && matchesAmbito && matchesRadio;
    });
  }, [cruceEscuelas, search, filtroNivel, filtroDepto, filtroAmbito, filtroRadio]);

  const filteredCruce = useMemo(() => {
    return cruceBaseFiltered.filter((item) => {
      let matchesCruce = true;
      if (filtroCruce === 'COINCIDE') {
        matchesCruce = item.sector_sige !== '0' && item.sector_sige !== 0 && item.radio_sueldo !== null && Number(item.radio_sige) === Number(item.radio_sueldo);
      } else if (filtroCruce === 'NO_COINCIDE') {
        matchesCruce = item.sector_sige !== '0' && item.sector_sige !== 0 && item.radio_sueldo !== null && Number(item.radio_sige) !== Number(item.radio_sueldo);
      } else if (filtroCruce === 'SECTOR_0') {
        matchesCruce = item.sector_sige === '0' || item.sector_sige === 0 || !item.sector_sige;
      } else if (filtroCruce === 'SIN_LIQUIDACION') {
        matchesCruce = item.sector_sige !== '0' && item.sector_sige !== 0 && item.sector_sige && item.radio_sueldo === null;
      }
      return matchesCruce;
    });
  }, [cruceBaseFiltered, filtroCruce]);

  const cruceStats = useMemo(() => {
    let coincide = 0;
    let noCoincide = 0;
    let sector0 = 0;
    let sinLiq = 0;

    cruceBaseFiltered.forEach((item) => {
      if (item.sector_sige === '0' || item.sector_sige === 0 || !item.sector_sige) {
        sector0++;
      } else if (item.radio_sueldo === null) {
        sinLiq++;
      } else if (Number(item.radio_sige) === Number(item.radio_sueldo)) {
        coincide++;
      } else {
        noCoincide++;
      }
    });

    return { total: cruceBaseFiltered.length, coincide, noCoincide, sector0, sinLiq };
  }, [cruceBaseFiltered]);

  const nivelesDisponibles = Array.from(
    new Set(auditList.map((i) => i.nivel_educativo).filter(Boolean))
  ).sort();

  const filteredConflictosSige = useMemo(() => {
    return conflictosSige.filter((c) => {
      const matchesDepto = !filtroDepto || (c.departamentos && c.departamentos.includes(filtroDepto));
      const matchesRadio = !filtroRadio || (c.radios_distintos && c.radios_distintos.split(',').map(Number).includes(Number(filtroRadio)));
      const matchesAmbito = !filtroAmbito || (c.establecimientos_detallados && c.establecimientos_detallados.includes(`||${filtroAmbito}`));

      const term = search.toLowerCase();
      const matchesSearch = !search ||
        (c.sector && c.sector.toString().includes(term)) ||
        (c.establecimientos && c.establecimientos.toLowerCase().includes(term));

      return matchesDepto && matchesRadio && matchesAmbito && matchesSearch;
    });
  }, [conflictosSige, filtroDepto, filtroRadio, filtroAmbito, search]);

  const handlePeriodoChange = (e) => {
    const periodo = e.target.value;
    router.get('/auditoria-sueldos', { periodo }, { preserveState: false });
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEstadoGestionInput(item.estado_gestion || 'PENDIENTE');
    setNotaInput(item.notas_auditor || '');
  };

  const saveGestion = async () => {
    if (!editingItem) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/auditoria-sueldos/${editingItem.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          estado_gestion: estadoGestionInput,
          notas_auditor: notaInput
        })
      });
      if (res.ok) {
        setAuditList((prev) =>
          prev.map((i) =>
            i.id === editingItem.id
              ? { ...i, estado_gestion: estadoGestionInput, notas_auditor: notaInput }
              : i
          )
        );
        setEditingItem(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const saveClasificacionViejo = async (id, clasificacion, resolucion = null, notas = null) => {
    try {
      const payload = { clasificacion_auditor: clasificacion };
      if (resolucion !== null) payload.resolucion_aval = resolucion;
      if (notas !== null) payload.notas_auditor = notas;

      const res = await fetch(`/api/auditoria-sueldos/viejo/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setViejosList((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  clasificacion_auditor: clasificacion,
                  resolucion_aval: resolucion !== null ? resolucion : i.resolucion_aval,
                  notas_auditor: notas !== null ? notas : i.notas_auditor,
                }
              : i
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSanearSectorSubmit = async (sectorVal) => {
    if (!saneamientoEstId) {
      alert('Por favor seleccione una escuela / CUE a vincular');
      return;
    }
    setSanearSubmitting(true);
    try {
      const res = await fetch('/api/auditoria-sueldos/sanear-sector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          sector: sectorVal,
          establecimiento_id: saneamientoEstId,
          observacion: saneamientoObs
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Sector saneado con éxito');
        setSaneamientoModalSector(null);
        setSaneamientoEstId('');
        setSaneamientoObs('');
        router.reload();
      } else {
        alert(data.message || 'Error al sanear sector');
      }
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error en el servidor');
    } finally {
      setSanearSubmitting(false);
    }
  };

  return (
    <SIAMELayout fullWidth>
      <Head title="Auditoría de Sueldos y Radios — EDU-Auditor" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1920px] mx-auto space-y-6">
        {/* Header Section */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#FE8204]/10 text-[#FE8204] border border-[#FE8204]/20">
              AUDITORÍA DE RADIOS
            </span>
            <span className="text-xs font-medium text-gray-500">
              Cruce: Sueldos (A04) × SIGE
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Auditoría de Radios de Sueldos por Establecimiento
          </h1>
          <p className="text-sm text-gray-600">
            Control y comparación de las bonificaciones por zona (Radio) liquidadas frente a los registros oficiales del SIGE.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
          <i className="fa-solid fa-calendar-days text-[#FE8204] text-lg pl-2"></i>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Período:</span>
          <select
            value={nominaSeleccionada?.periodo || ''}
            onChange={handlePeriodoChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm font-semibold rounded-xl focus:ring-[#FE8204] focus:border-[#FE8204] block px-3 py-1.5 cursor-pointer"
          >
            {nominas.map((n) => (
              <option key={n.id} value={n.periodo}>
                Mayo {n.periodo.split('-')[0]} ({n.archivo_nombre})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-3 mb-6 custom-scrollbar">
        <button
          onClick={() => setActiveTab('kpi')}
          style={activeTab === 'kpi' ? { backgroundColor: '#FE8204', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'kpi'
              ? 'shadow-md border-transparent'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200'
          }`}
        >
          <i className="fa-solid fa-chart-pie"></i>
          Resumen & KPIs
        </button>

        <button
          onClick={() => setActiveTab('cruce')}
          style={activeTab === 'cruce' ? { backgroundColor: '#0284c7', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'cruce'
              ? 'shadow-md border-transparent'
              : 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200'
          }`}
        >
          <i className="fa-solid fa-building-columns"></i>
          Cruce Escuelas & Sectores ({cruceStats.total})
        </button>

        <button
          onClick={() => setActiveTab('escala')}
          style={activeTab === 'escala' ? { backgroundColor: '#FE8204', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'escala'
              ? 'shadow-md border-transparent'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200'
          }`}
        >
          <i className="fa-solid fa-scale-balanced"></i>
          Escalas & Residuales ({linkedViejos.length})
        </button>

        <button
          onClick={() => setActiveTab('paga_mas')}
          style={activeTab === 'paga_mas' ? { backgroundColor: '#dc2626', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'paga_mas'
              ? 'shadow-md border-transparent'
              : 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
          }`}
        >
          <i className="fa-solid fa-arrow-trend-up"></i>
          Pagan MÁS ({pagaMasList.length})
        </button>

        <button
          onClick={() => setActiveTab('paga_menos')}
          style={activeTab === 'paga_menos' ? { backgroundColor: '#2563eb', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'paga_menos'
              ? 'shadow-md border-transparent'
              : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
          }`}
        >
          <i className="fa-solid fa-arrow-trend-down"></i>
          Pagan MENOS ({pagaMenosList.length})
        </button>

        <button
          onClick={() => setActiveTab('conflictos')}
          style={activeTab === 'conflictos' ? { backgroundColor: '#d97706', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'conflictos'
              ? 'shadow-md border-transparent'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
          }`}
        >
          <i className="fa-solid fa-triangle-exclamation"></i>
          Conflictos SIGE ({filteredConflictosSige.length})
        </button>

        <button
          onClick={() => setActiveTab('zonas')}
          style={activeTab === 'zonas' ? { backgroundColor: '#9333ea', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'zonas'
              ? 'shadow-md border-transparent'
              : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
          }`}
        >
          <i className="fa-solid fa-location-dot"></i>
          Inconsistencia Zona ({zonasInconsistentesList.length})
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          style={activeTab === 'tracking' ? { backgroundColor: '#059669', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'tracking'
              ? 'shadow-md border-transparent'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
          }`}
        >
          <i className="fa-solid fa-list-check"></i>
          Seguimiento & Gestión
        </button>

        <button
          onClick={() => setActiveTab('sin_escuela')}
          style={activeTab === 'sin_escuela' ? { backgroundColor: '#475569', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'sin_escuela'
              ? 'shadow-md border-transparent'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
          }`}
        >
          <i className="fa-solid fa-circle-question"></i>
          Sectores sin Escuela ({unlinkedResultados.length + unlinkedViejos.length})
        </button>
      </div>

      {/* Global Filter Bar for Tables */}
      {activeTab !== 'kpi' && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-sm"></i>
            <input
              type="text"
              placeholder={activeTab === 'cruce' ? "Buscar CUE, escuela, depto..." : "Buscar sector, CUE o escuela..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-[#FE8204] focus:border-[#FE8204]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {activeTab === 'cruce' && (
              <select
                value={filtroCruce}
                onChange={(e) => setFiltroCruce(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204] cursor-pointer"
              >
                <option value="">Todos los Cruces</option>
                <option value="COINCIDE">🟢 Coinciden Radios</option>
                <option value="NO_COINCIDE">🔴 No Coinciden Radios</option>
                <option value="SECTOR_0">🟡 Sector 0 en SIGE</option>
                <option value="SIN_LIQUIDACION">⚪ Sin Liquidación Docente</option>
              </select>
            )}

            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204]"
            >
              <option value="">Todos los Niveles</option>
              {nivelesDisponibles.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <select
              value={filtroDepto}
              onChange={(e) => setFiltroDepto(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204] cursor-pointer"
            >
              <option value="">Todos los Departamentos</option>
              {deptosDisponibles.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filtroAmbito}
              onChange={(e) => setFiltroAmbito(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204] cursor-pointer"
            >
              <option value="">Todos los Ámbitos</option>
              <option value="PUBLICO">PÚBLICO</option>
              <option value="PRIVADO">PRIVADO</option>
            </select>

            <select
              value={filtroRadio}
              onChange={(e) => setFiltroRadio(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204] cursor-pointer"
            >
              <option value="">Todos los Radios</option>
              {radiosDisponibles.map((r) => (
                <option key={r} value={r}>
                  Radio {r}
                </option>
              ))}
            </select>

            {activeTab !== 'cruce' && activeTab !== 'escala' && activeTab !== 'sin_escuela' && (
              <select
                value={filtroGestion}
                onChange={(e) => setFiltroGestion(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204] cursor-pointer"
              >
                <option value="">Todos los Estados Gestión</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EN_INVESTIGACION">EN INVESTIGACIÓN</option>
                <option value="JUSTIFICADO">JUSTIFICADO</option>
                <option value="CORREGIDO">CORREGIDO</option>
              </select>
            )}

            {activeTab !== 'cruce' && activeTab !== 'escala' && activeTab !== 'sin_escuela' && (
              <select
                value={filtroAuditoria}
                onChange={(e) => setFiltroAuditoria(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204] cursor-pointer"
              >
                <option value="">Todos los Estados Auditoría</option>
                <option value="COINCIDE_TOTAL">🟢 COINCIDE TOTAL</option>
                <option value="COINCIDE_SIGE">🟢 COINCIDE SIGE</option>
                <option value="COINCIDE_SIGE_Y_CAMINO">🟢 COINCIDE SIGE Y CAMINO</option>
                <option value="COINCIDE_SIGE_Y_CIRC">🟢 COINCIDE SIGE Y CIRC</option>
                <option value="PAGA_MAS_QUE_SIGE">🔴 PAGA MÁS QUE SIGE</option>
                <option value="PAGA_MENOS_QUE_SIGE">🔵 PAGA MENOS QUE SIGE</option>
                <option value="SIN_SIGE">🟡 SIN REGISTRO SIGE</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: KPI & EXECUTIVE RESUMEN */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          {/* Top KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-5 border-l-4 border-l-[#FE8204]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Sectores Auditados
                  </span>
                  <div className="text-2xl font-black text-gray-900 mt-1">
                    {kpis.total_sectores || 0}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {(kpis.total_filas_docentes || 0).toLocaleString()} liquidaciones A04
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#FE8204]/10 text-[#FE8204] flex items-center justify-center text-xl">
                  <i className="fa-solid fa-building-columns"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Tasa de Coincidencia
                  </span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {kpis.porcentaje_coincidencia || 0}%
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    Sueldo = SIGE (88,9% ajustado)
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Pagan MÁS que SIGE
                  </span>
                  <div className="text-2xl font-black text-red-600 mt-1">
                    {kpis.paga_mas_sectores || 0} sectores
                  </div>
                  <span className="text-xs text-red-600 font-semibold">
                    {(kpis.paga_mas_docentes || 0).toLocaleString()} docentes afectados
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Pagan MENOS que SIGE
                  </span>
                  <div className="text-2xl font-black text-blue-600 mt-1">
                    {kpis.paga_menos_sectores || 0} sectores
                  </div>
                  <span className="text-xs text-blue-600 font-semibold">
                    {(kpis.paga_menos_docentes || 0).toLocaleString()} docentes afectados
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-arrow-trend-down"></i>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Detailed Status Breakdown */}
          <div className="grid grid-cols-1 gap-6">
            <GlassCard className="p-6">
              <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-list-ol text-[#FE8204]"></i>
                Distribución del Estado de Auditoría
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-bold text-emerald-900">Coincidencia Total (Sueldo = SIGE = Geo)</span>
                  </div>
                  <span className="text-sm font-black text-emerald-700">458 sectores</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-teal-50 rounded-xl border border-teal-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                    <span className="text-sm font-bold text-teal-900">Coincide SIGE y Camino/Circunferencia</span>
                  </div>
                  <span className="text-sm font-black text-teal-700">327 sectores</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-sm font-bold text-red-900">Paga MÁS que SIGE (Exceso de liquidación)</span>
                  </div>
                  <span className="text-sm font-black text-red-700">30 sectores (1.694 filas)</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-sm font-bold text-blue-900">Paga MENOS que SIGE (Perjuicio al docente)</span>
                  </div>
                  <span className="text-sm font-black text-blue-700">25 sectores (1.674 filas)</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-bold text-slate-800">Sectores Sin Registro en SIGE PÚBLICO</span>
                  </div>
                  <span className="text-sm font-black text-slate-700">184 sectores (6.173 filas)</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* TAB 2: ESCALAS Y REGISTROS VIEJOS */}
      {activeTab === 'escala' && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
              <i className="fa-solid fa-scale-balanced text-[#FE8204]"></i>
              Matriz Comparativa de Escalas de Radio Docente
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              Comparativa entre la escala original de la Ley de Radios y las alícuotas vigentes actualizadas por acuerdos paritarios.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-700 border-collapse">
                <thead className="text-xs uppercase bg-gray-100 text-gray-700 border-b">
                  <tr>
                    <th className="px-4 py-3 font-bold">Radio</th>
                    <th className="px-4 py-3 font-bold">% Ley Original</th>
                    <th className="px-4 py-3 font-bold">% Paritaria Vigente</th>
                    <th className="px-4 py-3 text-right font-bold">Liquidaciones Auditadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 1</td>
                    <td className="px-4 py-3">20%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">40%</td>
                    <td className="px-4 py-3 text-right font-black">16.142</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 2</td>
                    <td className="px-4 py-3">30%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">50%</td>
                    <td className="px-4 py-3 text-right font-black">13.572</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 3</td>
                    <td className="px-4 py-3">40%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">60%</td>
                    <td className="px-4 py-3 text-right font-black">10.291</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 4</td>
                    <td className="px-4 py-3">80%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">95%</td>
                    <td className="px-4 py-3 text-right font-black">7.385 (+27 escala vieja)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 5</td>
                    <td className="px-4 py-3">100%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">115%</td>
                    <td className="px-4 py-3 text-right font-black">4.261</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 6</td>
                    <td className="px-4 py-3">120%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">135%</td>
                    <td className="px-4 py-3 text-right font-black">4.683 (+6 escala vieja)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 7</td>
                    <td className="px-4 py-3">140%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">155%</td>
                    <td className="px-4 py-3 text-right font-black">327 (+4 escala vieja)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Sub-panel de Registros Escala Vieja */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                  Registros Residuales con Escala Vieja / Desconocida ({linkedViejos.length})
                </h3>
                <p className="text-xs text-gray-600">
                  Docentes liquidados con porcentaje antiguo (80%, 120%, 140%). Requiere clasificación manual.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-xs text-left text-gray-700">
                <thead className="text-xs uppercase bg-amber-50 text-amber-900 border-b sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Sector</th>
                    <th className="px-3 py-2">Establecimiento / Escuela</th>
                    <th className="px-3 py-2">Departamento</th>
                    <th className="px-3 py-2 text-center">Radio SIGE</th>
                    <th className="px-3 py-2 text-center">Radio Sueldo (A04)</th>
                    <th className="px-3 py-2 text-right">A01 Básico</th>
                    <th className="px-3 py-2 text-right">A04 Monto ($)</th>
                    <th className="px-3 py-2">Escala</th>
                    <th className="px-3 py-2 text-center">Dictamen / Clasificación</th>
                    <th className="px-3 py-2">Decreto / Resolución Aval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLinkedViejos.map((v) => (
                    <tr key={v.id} className="hover:bg-amber-50/50">
                      <td className="px-3 py-2 font-bold text-gray-900">{v.sector}</td>
                      <td className="px-3 py-2">
                        <div className="font-extrabold text-gray-950 leading-tight">
                          {v.nombre_establecimiento || 'Sin Establecimiento Registrado'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          {v.cue && <span className="text-gray-500 font-medium">CUE: {v.cue}</span>}
                          {v.nivel_educativo && v.nivel_educativo !== 'S/N' && (
                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded border font-semibold">
                              {v.nivel_educativo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-700">{v.departamento || 'S/D'}</td>
                      <td className="px-3 py-2 text-center font-black">
                        {v.radio_sige ? `Radio ${v.radio_sige}` : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-center font-black text-amber-800">
                        <span className="px-2 py-0.5 text-[10px] font-black rounded bg-amber-100 border border-amber-300">
                          Radio {v.radio_sueldo} ({v.porcentaje_pagado}%)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">${v.a01_basico.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">
                        ${v.a04_radio.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black rounded border ${
                            v.escala_detectada === 'LEY HISTORICA' || v.escala_detectada === 'VIEJA'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-purple-100 text-purple-900 border-purple-300'
                          }`}
                        >
                          {v.escala_detectada === 'LEY HISTORICA' || v.escala_detectada === 'VIEJA'
                            ? '📜 Ley Histórica'
                            : '⚖️ Nueva Paritaria'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={v.clasificacion_auditor || 'PENDIENTE'}
                          onChange={(e) =>
                            saveClasificacionViejo(v.id, e.target.value, v.resolucion_aval, v.notas_auditor)
                          }
                          className={`text-[11px] font-black rounded px-2 py-1 border focus:ring-[#FE8204] ${
                            v.clasificacion_auditor === 'JUSTIFICADO_LEGAL'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : v.clasificacion_auditor === 'ERROR_LIQUIDACION'
                              ? 'bg-red-50 text-red-900 border-red-300'
                              : v.clasificacion_auditor === 'CASO_ESPECIAL'
                              ? 'bg-purple-50 text-purple-900 border-purple-300'
                              : 'bg-white text-gray-800 border-amber-300'
                          }`}
                        >
                          <option value="PENDIENTE">PENDIENTE</option>
                          <option value="JUSTIFICADO_LEGAL">🟢 JUSTIFICADO LEGAL (DECRETO)</option>
                          <option value="ERROR_LIQUIDACION">🔴 ERROR LIQUIDACIÓN</option>
                          <option value="CASO_ESPECIAL">🟣 CASO ESPECIAL</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          defaultValue={v.resolucion_aval || ''}
                          placeholder="Ej. Dec. 1420/89, Res. 405"
                          onBlur={(e) =>
                            saveClasificacionViejo(
                              v.id,
                              v.clasificacion_auditor || 'PENDIENTE',
                              e.target.value,
                              v.notas_auditor
                            )
                          }
                          className="w-full text-[11px] font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:ring-[#FE8204] focus:border-[#FE8204]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 3: CONFLICTOS INTERNOS SIGE */}
      {activeTab === 'conflictos' && (
        <GlassCard className="p-6">
          <h2 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
            Sectores SIGE con Conflicto Interno ({filteredConflictosSige.length} Sectores)
          </h2>
          <p className="text-xs text-gray-600 mb-4">
            Sectores que poseen múltiples radios oficiales en la base de datos `modalidades`. Haga clic en la cantidad de escuelas para ver el detalle de edificios y departamentos.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700 border-collapse">
              <thead className="text-xs uppercase bg-amber-50 text-amber-900 border-b">
                <tr>
                  <th className="px-4 py-3 font-bold">Sector</th>
                  <th className="px-4 py-3 font-bold">Radios en SIGE</th>
                  <th className="px-4 py-3 font-bold">Niveles Afectados</th>
                  <th className="px-4 py-3 font-bold">Establecimientos Relacionados</th>
                  <th className="px-4 py-3 text-right font-bold">Modalidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredConflictosSige.map((c) => {
                  const parsedRaw = c.establecimientos_detallados ? c.establecimientos_detallados.split('###').map((item) => {
                    const parts = item.split('||');
                    return {
                      nombre: parts[0] || '',
                      cue: parts[1] || '',
                      cui: parts[2] || '',
                      departamento: parts[3] || 'S/D',
                      radio: parts[4] || '',
                      ambito: parts[5] || ''
                    };
                  }) : [];
                  const parsedEsts = Array.from(new Map(parsedRaw.map(est => [`${est.cue}-${est.radio}-${est.ambito}`, est])).values());

                  return (
                    <tr key={c.sector} className="hover:bg-amber-50/50">
                      <td className="px-4 py-3 font-black text-gray-900 text-sm">{c.sector}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                          [{c.radios_distintos}]
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{c.niveles}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setConflictosModalData({ sector: c.sector, escuelas: parsedEsts, radios: c.radios_distintos, niveles: c.niveles })}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 transition border border-amber-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <i className="fa-solid fa-school text-[10px]"></i>
                          {parsedEsts.length} {parsedEsts.length === 1 ? 'establecimiento' : 'establecimientos'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-600">{c.cant_modalidades}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 4: PAGAN MÁS QUE SIGE */}
      {activeTab === 'paga_mas' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-red-900 flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-up text-red-600"></i>
                Establecimientos que PAGAN MÁS que su Radio SIGE ({pagaMasList.length})
              </h2>
              <p className="text-xs text-gray-600">
                Sectores donde la liquidación de haberes ($A04) abona un porcentaje superior al fijado administrativamente.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-red-50 text-red-900 border-b">
                <tr>
                  <th className="px-3 py-3 font-bold">Sector</th>
                  <th className="px-3 py-3 font-bold">Nivel</th>
                  <th className="px-3 py-3 font-bold">Zona</th>
                  <th className="px-3 py-3 font-bold">Establecimiento</th>
                  <th className="px-3 py-3 font-bold">CUE</th>
                  <th className="px-3 py-3 text-center font-bold">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center font-bold">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-bold">R. Circ</th>
                  <th className="px-3 py-3 text-center font-bold">R. Cam</th>
                  <th className="px-3 py-3 text-right font-bold">Docentes</th>
                  <th className="px-3 py-3 text-center font-bold">Gestión</th>
                  <th className="px-3 py-3 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagaMasList.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/50">
                    <td className="px-3 py-3 font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3 font-semibold text-gray-700">{item.nivel_educativo || 'GENERAL'}</td>
                    <td className="px-3 py-3 font-bold">{item.zona_sueldo}</td>
                    <td className="px-3 py-3 font-bold text-gray-900 max-w-xs truncate">
                      {item.nombre_establecimiento || 'No Registrado'}
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span>{item.cue || '-'}</span>
                        {item.cue && (
                          <a
                            href={`/admin/establecimientos?search=${item.cue}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Editar Establecimiento en SIGE"
                            className="text-gray-400 hover:text-[#FE8204] transition"
                          >
                            <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-red-100 text-red-800">
                        R{item.radio_sueldo}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-gray-700">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.radio_circ || '-'}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.radio_camino || '-'}</td>
                    <td className="px-3 py-3 text-right font-black text-red-700">{item.total_filas_docentes}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          item.estado_gestion === 'CORREGIDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado_gestion === 'JUSTIFICADO'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.estado_gestion}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 5: PAGAN MENOS QUE SIGE */}
      {activeTab === 'paga_menos' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-blue-900 flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-down text-blue-600"></i>
                Establecimientos que PAGAN MENOS que su Radio SIGE ({pagaMenosList.length})
              </h2>
              <p className="text-xs text-gray-600">
                Sectores donde los docentes perciben una bonificación inferior al radio oficial asignado a la escuela.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-blue-50 text-blue-900 border-b">
                <tr>
                  <th className="px-3 py-3 font-bold">Sector</th>
                  <th className="px-3 py-3 font-bold">Nivel</th>
                  <th className="px-3 py-3 font-bold">Zona</th>
                  <th className="px-3 py-3 font-bold">Establecimiento</th>
                  <th className="px-3 py-3 font-bold">CUE</th>
                  <th className="px-3 py-3 text-center font-bold">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center font-bold">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-bold">R. Circ</th>
                  <th className="px-3 py-3 text-center font-bold">R. Cam</th>
                  <th className="px-3 py-3 text-right font-bold">Docentes</th>
                  <th className="px-3 py-3 text-center font-bold">Gestión</th>
                  <th className="px-3 py-3 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagaMenosList.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/50">
                    <td className="px-3 py-3 font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3 font-semibold text-gray-700">{item.nivel_educativo || 'GENERAL'}</td>
                    <td className="px-3 py-3 font-bold">{item.zona_sueldo}</td>
                    <td className="px-3 py-3 font-bold text-gray-900 max-w-xs truncate">
                      {item.nombre_establecimiento || 'No Registrado'}
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span>{item.cue || '-'}</span>
                        {item.cue && (
                          <a
                            href={`/admin/establecimientos?search=${item.cue}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Editar Establecimiento en SIGE"
                            className="text-gray-400 hover:text-[#FE8204] transition"
                          >
                            <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-100 text-blue-800">
                        R{item.radio_sueldo}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-gray-700">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.radio_circ || '-'}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.radio_camino || '-'}</td>
                    <td className="px-3 py-3 text-right font-black text-blue-700">{item.total_filas_docentes}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          item.estado_gestion === 'CORREGIDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado_gestion === 'JUSTIFICADO'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.estado_gestion}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 6: ZONAS INCONSISTENTES */}
      {activeTab === 'zonas' && (
        <GlassCard className="p-6">
          <h2 className="text-base font-black text-purple-900 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-location-dot text-purple-600"></i>
            Inconsistencias de Letra de Zona ({zonasInconsistentesList.length} Sectores)
          </h2>
          <p className="text-xs text-gray-600 mb-4">
            Sectores donde la letra de zona del recibo (ZONA sueldos) difiere de la letra registrada en el edificio (SIGE).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-purple-50 text-purple-900 border-b">
                <tr>
                  <th className="px-3 py-3">Sector</th>
                  <th className="px-3 py-3">Establecimiento</th>
                  <th className="px-3 py-3 text-center">Zona Sueldos</th>
                  <th className="px-3 py-3 text-center">Zona SIGE Edificio</th>
                  <th className="px-3 py-3 text-center">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center">Radio SIGE</th>
                  <th className="px-3 py-3 text-right">Docentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {zonasInconsistentesList.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/50">
                    <td className="px-3 py-3 font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3 font-bold text-gray-900">{item.nombre_establecimiento || 'No Registrado'}</td>
                    <td className="px-3 py-3 text-center font-bold text-red-600">{item.zona_sueldo}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-600">{item.zona_sige}</td>
                    <td className="px-3 py-3 text-center font-bold">R{item.radio_sueldo}</td>
                    <td className="px-3 py-3 text-center font-bold">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-right font-black text-gray-700">{item.total_filas_docentes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 7: SEGUIMIENTO & GESTION */}
      {activeTab === 'tracking' && (
        <GlassCard className="p-6">
          <h2 className="text-base font-black text-emerald-900 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-list-check text-emerald-600"></i>
            Panel de Seguimiento y Gestión de Auditoría
          </h2>
          <p className="text-xs text-gray-600 mb-4">
            Gestión del ciclo de vida de los sectores observados. Marque progresivamente los sectores como investigados o corregidos.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-emerald-50 text-emerald-900 border-b">
                <tr>
                  <th className="px-3 py-3 font-bold">Sector</th>
                  <th className="px-3 py-3 font-bold">Establecimiento</th>
                  <th className="px-3 py-3 font-bold">Nivel</th>
                  <th className="px-3 py-3 text-center font-bold">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-bold">Radio Sueldo (A04)</th>
                  <th className="px-3 py-3 font-bold">Estado Auditoría</th>
                  <th className="px-3 py-3 text-center font-bold">Estado Gestión</th>
                  <th className="px-3 py-3 font-bold">Notas del Auditor</th>
                  <th className="px-3 py-3 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {linkedResultados.map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/50">
                    <td className="px-3 py-3 font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-gray-900 max-w-xs truncate">
                        {item.nombre_establecimiento || 'No Registrado'}
                      </div>
                      {item.cue && (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold mt-0.5">
                          <span>CUE: {item.cue}</span>
                          <a
                            href={`/admin/establecimientos?search=${item.cue}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Editar Establecimiento en SIGE"
                            className="text-gray-400 hover:text-[#FE8204] transition"
                          >
                            <i className="fa-solid fa-pen-to-square text-[9px]"></i>
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-gray-700">
                      {item.nivel_educativo || 'GENERAL'}
                    </td>
                    <td className="px-3 py-3 text-center font-extrabold text-emerald-700">
                      {item.radio_sige ? `Radio ${item.radio_sige}` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-extrabold text-purple-700">
                      {item.radio_sueldo ? `Radio ${item.radio_sueldo}` : '-'}
                    </td>
                    <td className="px-3 py-3 font-bold">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          item.estado_auditoria === 'PAGA_MAS_QUE_SIGE'
                            ? 'bg-red-100 text-red-800'
                            : item.estado_auditoria === 'PAGA_MENOS_QUE_SIGE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.estado_auditoria}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full ${
                          item.estado_gestion === 'CORREGIDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado_gestion === 'JUSTIFICADO'
                            ? 'bg-purple-100 text-purple-800'
                            : item.estado_gestion === 'EN_INVESTIGACION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.estado_gestion}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 max-w-xs truncate">
                      {item.notas_auditor || <span className="italic text-gray-400">Sin notas</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        Editar Nota
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB: CRUCE ESCUELAS & SECTORES */}
      {activeTab === 'cruce' && (
        <div className="space-y-6">
          {/* Cruce Sub-KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => setFiltroCruce('')}
              className={`p-4 rounded-2xl border text-left transition ${
                filtroCruce === '' 
                  ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-200' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Cruces</div>
              <div className="text-xl font-black text-gray-900 mt-0.5">{cruceStats.total}</div>
            </button>
            <button
              onClick={() => setFiltroCruce('COINCIDE')}
              className={`p-4 rounded-2xl border text-left transition ${
                filtroCruce === 'COINCIDE' 
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">🟢 Coinciden</div>
              <div className="text-xl font-black text-emerald-700 mt-0.5">{cruceStats.coincide}</div>
            </button>
            <button
              onClick={() => setFiltroCruce('NO_COINCIDE')}
              className={`p-4 rounded-2xl border text-left transition ${
                filtroCruce === 'NO_COINCIDE' 
                  ? 'bg-red-50 border-red-300 ring-2 ring-red-200' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-[10px] font-bold text-red-800 uppercase tracking-wider">🔴 No Coinciden</div>
              <div className="text-xl font-black text-red-700 mt-0.5">{cruceStats.noCoincide}</div>
            </button>
            <button
              onClick={() => setFiltroCruce('SECTOR_0')}
              className={`p-4 rounded-2xl border text-left transition ${
                filtroCruce === 'SECTOR_0' 
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">🟡 Sector 0</div>
              <div className="text-xl font-black text-amber-700 mt-0.5">{cruceStats.sector0}</div>
            </button>
            <button
              onClick={() => setFiltroCruce('SIN_LIQUIDACION')}
              className={`p-4 rounded-2xl border text-left transition ${
                filtroCruce === 'SIN_LIQUIDACION' 
                  ? 'bg-slate-50 border-slate-300 ring-2 ring-slate-200' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">⚪ Sin Liquidación</div>
              <div className="text-xl font-black text-slate-700 mt-0.5">{cruceStats.sinLiq}</div>
            </button>
          </div>

          <GlassCard className="p-6">
            <h2 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
              <i className="fa-solid fa-building-columns text-[#0284c7]"></i>
              Matriz de Relación de Escuelas y Sectores Presupuestarios ({filteredCruce.length} registros)
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              Cruce detallado de establecimientos cargados en el SIGE con las liquidaciones correspondientes.
            </p>

            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-xs text-left text-gray-700 border-collapse">
                <thead className="text-xs uppercase bg-gray-100 text-gray-700 border-b sticky top-0">
                  <tr>
                    <th className="px-3 py-3 font-bold">CUE</th>
                    <th className="px-3 py-3 font-bold">Escuela / Establecimiento</th>
                    <th className="px-3 py-3 font-bold">Nivel / Dirección</th>
                    <th className="px-3 py-3 text-center font-bold">Sector SIGE</th>
                    <th className="px-3 py-3 text-center font-bold">Radio SIGE</th>
                    <th className="px-3 py-3 text-center font-bold">Radio Sueldo (A04)</th>
                    <th className="px-3 py-3 text-center font-bold">Estado</th>
                    <th className="px-3 py-3 text-right font-bold">Docentes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCruce.map((c, idx) => {
                    const isSector0 = c.sector_sige === '0' || c.sector_sige === 0 || !c.sector_sige;
                    const isSinLiq = c.radio_sueldo === null && !isSector0;
                    const matches = !isSector0 && !isSinLiq && Number(c.radio_sige) === Number(c.radio_sueldo);

                    let badge = null;
                    if (isSector0) {
                      badge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">SECTOR 0</span>;
                    } else if (isSinLiq) {
                      badge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">SIN LIQUIDACIÓN</span>;
                    } else if (matches) {
                      badge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">COINCIDE</span>;
                    } else {
                      badge = <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">DIFERENCIA</span>;
                    }

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-3 font-mono font-bold text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <span>{c.cue}</span>
                            <a
                              href={`/admin/establecimientos?search=${c.cue}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Editar Establecimiento en SIGE"
                              className="text-gray-400 hover:text-[#FE8204] transition"
                            >
                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                            </a>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-extrabold text-gray-900 leading-tight">{c.nombre_establecimiento}</div>
                          <div className="text-[10px] text-gray-400 font-semibold">{c.departamento}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-gray-700">{c.nivel_educativo}</div>
                          <div className="text-[10px] text-gray-400 font-semibold">{c.direccion_area}</div>
                        </td>
                        <td className="px-3 py-3 text-center font-black text-sm">
                          {isSector0 ? (
                            <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">0</span>
                          ) : (
                            <span className="text-gray-950 font-bold">{c.sector_sige}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-emerald-700">Radio {c.radio_sige}</td>
                        <td className="px-3 py-3 text-center font-black text-purple-700">
                          {c.radio_sueldo !== null ? `Radio ${c.radio_sueldo}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-center">{badge}</td>
                        <td className="px-3 py-3 text-right font-bold text-gray-600">
                          {c.total_filas_docentes !== null ? `${c.total_filas_docentes} docentes` : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB: SECTORES SIN ESCUELA (INVESTIGACIÓN) */}
      {activeTab === 'sin_escuela' && (
        <div className="space-y-6">
          <GlassCard className="p-6 border-l-4 border-l-slate-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-circle-question text-slate-600"></i>
                  Sectores de Nómina Desvinculados de Establecimientos ({unlinkedResultados.length})
                </h2>
                <p className="text-xs text-gray-600">
                  Sectores salariales (A04) que registran liquidaciones docentes pero que no se corresponden con ningún CUE en la base de datos de escuelas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-xs text-left text-gray-700">
                <thead className="text-xs uppercase bg-slate-100 text-slate-900 border-b">
                  <tr>
                    <th className="px-3 py-3 font-bold">Sector</th>
                    <th className="px-3 py-3 font-bold">Estado Auditoría</th>
                    <th className="px-3 py-3 text-center font-bold">Radio Sueldo (A04)</th>
                    <th className="px-3 py-3 text-right font-bold">Docentes Afectados</th>
                    <th className="px-3 py-3 font-bold">Detalle / Notas</th>
                    <th className="px-3 py-3 text-center font-bold">Acción Saneamiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {unlinkedResultados.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3 font-black text-gray-900 text-sm">{s.sector}</td>
                      <td className="px-3 py-3">
                        <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-orange-100 text-orange-900 border border-orange-200">
                          {s.estado_auditoria}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-black text-purple-700">
                        Radio {s.radio_sueldo} ({s.porc_pagado_mediana}%)
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-gray-900">
                        {s.total_filas_docentes} docentes
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-600 max-w-xs truncate">
                        {s.notas_auditor || <span className="italic text-gray-400">Sin notas de investigación</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => {
                            setSaneamientoModalSector(s);
                            setSaneamientoEstId('');
                            setSaneamientoObs('');
                          }}
                          className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#FE8204] hover:bg-[#e07203] rounded-xl shadow transition flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <i className="fa-solid fa-link text-[10px]"></i>
                          Vincular a CUE
                        </button>
                      </td>
                    </tr>
                  ))}
                  {unlinkedResultados.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-3 py-8 text-center text-gray-400 font-medium italic">
                        No hay sectores desvinculados en esta nómina.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Registros Residuales sin Escuela */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-black text-amber-900 flex items-center gap-2 mb-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
              Registros Residuales de Escala Vieja / Desconocida sin Escuela ({unlinkedViejos.length})
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Liquidaciones residuales con alícuotas históricas que no tienen vinculación con ningún establecimiento escolar.
            </p>

            <div className="overflow-x-auto max-h-80 custom-scrollbar">
              <table className="w-full text-xs text-left text-gray-700">
                <thead className="text-xs uppercase bg-amber-50 text-amber-900 border-b">
                  <tr>
                    <th className="px-3 py-2 font-bold">Sector</th>
                    <th className="px-3 py-2 text-center font-bold">Radio Sueldo</th>
                    <th className="px-3 py-2 text-right font-bold">Básico A01</th>
                    <th className="px-3 py-2 text-right font-bold">Monto A04</th>
                    <th className="px-3 py-2 font-bold">Dictamen</th>
                    <th className="px-3 py-2 font-bold">Decreto Aval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUnlinkedViejos.map((v) => (
                    <tr key={v.id} className="hover:bg-amber-50/50">
                      <td className="px-3 py-2 font-bold text-gray-900">{v.sector}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-black rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Radio {v.radio_sueldo} ({v.porcentaje_pagado}%)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">${v.a01_basico.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">${v.a04_radio.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <select
                          value={v.clasificacion_auditor || 'PENDIENTE'}
                          onChange={(e) =>
                            saveClasificacionViejo(v.id, e.target.value, v.resolucion_aval, v.notas_auditor)
                          }
                          className={`text-[11px] font-black rounded px-2 py-1 border focus:ring-[#FE8204] ${
                            v.clasificacion_auditor === 'JUSTIFICADO_LEGAL'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : v.clasificacion_auditor === 'ERROR_LIQUIDACION'
                              ? 'bg-red-50 text-red-900 border-red-300'
                              : v.clasificacion_auditor === 'CASO_ESPECIAL'
                              ? 'bg-purple-50 text-purple-900 border-purple-300'
                              : 'bg-white text-gray-800 border-amber-300'
                          }`}
                        >
                          <option value="PENDIENTE">PENDIENTE</option>
                          <option value="JUSTIFICADO_LEGAL">🟢 JUSTIFICADO LEGAL</option>
                          <option value="ERROR_LIQUIDACION">🔴 ERROR LIQUIDACIÓN</option>
                          <option value="CASO_ESPECIAL">🟣 CASO ESPECIAL</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          defaultValue={v.resolucion_aval || ''}
                          placeholder="Dec. o Res."
                          onBlur={(e) =>
                            saveClasificacionViejo(v.id, v.clasificacion_auditor || 'PENDIENTE', e.target.value, v.notas_auditor)
                          }
                          className="w-full text-[11px] font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:ring-[#FE8204]"
                        />
                      </td>
                    </tr>
                  ))}
                  {unlinkedViejos.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-3 py-8 text-center text-gray-400 font-medium italic">
                        No hay registros residuales desvinculados en esta nómina.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* SANEAMIENTO MODAL */}
      {saneamientoModalSector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-[#FE8204]"></i>
                Vincular Sector {saneamientoModalSector.sector}
              </h3>
              <button
                onClick={() => setSaneamientoModalSector(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl text-xs space-y-1">
                <div><b className="text-orange-950">Sector a Sanear:</b> Sector {saneamientoModalSector.sector}</div>
                <div><b className="text-orange-950">Radio Liquidado (A04):</b> Radio {saneamientoModalSector.radio_sueldo} ({saneamientoModalSector.porc_pagado_mediana}%)</div>
                <div><b className="text-orange-950">Docentes liquidados:</b> {saneamientoModalSector.total_filas_docentes}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Seleccionar Escuela / CUE Destino a Vincular:
                </label>
                <select
                  value={saneamientoEstId}
                  onChange={(e) => setSaneamientoEstId(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-[#FE8204] focus:border-[#FE8204] cursor-pointer"
                >
                  <option value="">-- Buscar / Seleccionar Escuela --</option>
                  {establecimientosList.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.nombre} (CUE: {est.cue} - {est.departamento})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Observaciones / Justificación de Saneamiento:
                </label>
                <textarea
                  rows={3}
                  value={saneamientoObs}
                  onChange={(e) => setSaneamientoObs(e.target.value)}
                  placeholder="Ej. El sector 211 pertenece al Anexo Aberastain o es una función volante de la Dirección de Primaria..."
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-[#FE8204]"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setSaneamientoModalSector(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={sanearSubmitting || !saneamientoEstId}
                onClick={() => handleSanearSectorSubmit(saneamientoModalSector.sector)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#FE8204] hover:bg-[#FE8204]/90 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {sanearSubmitting ? 'Guardando Vinculación...' : 'Vincular y Sanear Sector'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <h3 className="text-base font-black text-gray-900 mb-2">
              Gestión de Auditoría — Sector {editingItem.sector}
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              {editingItem.nombre_establecimiento || 'Establecimiento No Registrado'} (Nivel: {editingItem.nivel_educativo})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Estado de Gestión:
                </label>
                <select
                  value={estadoGestionInput}
                  onChange={(e) => setEstadoGestionInput(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 focus:ring-[#FE8204]"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_INVESTIGACION">EN INVESTIGACIÓN</option>
                  <option value="JUSTIFICADO">JUSTIFICADO (CON NORMA LEGAL)</option>
                  <option value="CORREGIDO">CORREGIDO EN LIQUIDACIÓN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Notas / Expediente / Resolución:
                </label>
                <textarea
                  rows={3}
                  value={notaInput}
                  onChange={(e) => setNotaInput(e.target.value)}
                  placeholder="Ingrese el número de expediente, decreto o detalle de la investigación..."
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-[#FE8204]"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                disabled={updating}
                onClick={saveGestion}
                className="px-4 py-2 text-xs font-bold text-white bg-[#FE8204] hover:bg-[#FE8204]/90 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {updating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFLICTOS SIGE DETAIL MODAL */}
      {conflictosModalData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                Establecimientos en Conflicto Interno - Sector {conflictosModalData.sector}
              </h3>
              <button
                onClick={() => setConflictosModalData(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                <div><b className="text-amber-950">Radios detectados en SIGE:</b> [{conflictosModalData.radios}]</div>
                <div><b className="text-amber-950">Niveles educativos afectados:</b> {conflictosModalData.niveles}</div>
              </div>

              <div className="overflow-y-auto max-h-64 border border-gray-200 rounded-2xl custom-scrollbar">
                <table className="w-full text-xs text-left text-gray-700">
                  <thead className="text-[10px] uppercase bg-gray-50 text-gray-500 border-b sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-bold">CUE</th>
                      <th className="px-3 py-2 font-bold">Establecimiento / Escuela</th>
                      <th className="px-3 py-2 font-bold">Ámbito</th>
                      <th className="px-3 py-2 font-bold">Radio SIGE</th>
                      <th className="px-3 py-2 font-bold">CUI Edificio</th>
                      <th className="px-3 py-2 font-bold">Departamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {conflictosModalData.escuelas.map((e, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <span>{e.cue}</span>
                            <a
                              href={`/admin/establecimientos?search=${e.cue}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Editar Establecimiento en SIGE"
                              className="text-gray-400 hover:text-[#FE8204] transition"
                            >
                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                            </a>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-bold text-gray-900">{e.nombre}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            e.ambito === 'PRIVADO' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {e.ambito === 'PRIVADO' ? 'PRIVADO' : 'PÚBLICO'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold text-gray-700">Radio {e.radio}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <span>{e.cui}</span>
                            <a
                              href={`/admin/edificios?search_cui=${e.cui}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Editar Edificio en SIGE"
                              className="text-gray-400 hover:text-[#FE8204] transition"
                            >
                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                            </a>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700 font-semibold">{e.departamento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end mt-6">
              <button
                onClick={() => setConflictosModalData(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </SIAMELayout>
  );
}
