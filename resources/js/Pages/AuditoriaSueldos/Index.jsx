import { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import SIAMELayout from '../../Layouts/SIAMELayout';
import { GlassCard } from '../../Components/GlassCard';
import { Pagination } from '../../Components/Pagination';
import Modal from '../../Components/Modal';
import axios from 'axios';

const ADMIN_NIVELES = ['ADMINIS', 'SUPERVIS', 'JUNTA', 'MINISTERIO', 'OFICINA', 'DIRECCION', 'DIRECCIÓN', 'AREA CENTRAL', 'ÁREA CENTRAL'];

const isAdministrativeLevel = (nivel) => {
  if (!nivel) return false;
  const n = nivel.toString().toUpperCase();
  return ADMIN_NIVELES.some((keyword) => n.includes(keyword));
};

const cleanObservaciones = (obs) => {
  if (!obs) return '';
  let text = obs;
  if (text.includes('Notas:')) {
    const parts = text.split('Notas:');
    text = parts[parts.length - 1].trim();
  } else if (text.includes('Saneado y vinculado a CUE')) {
    const pos = text.indexOf('.');
    if (pos !== -1) {
      text = text.substring(pos + 1).trim();
    }
  }
  return text || obs;
};

export default function AuditoriaSueldosIndex({
  nominaSeleccionada = null,
  resultados = [],
  viejos = [],
  conflictosSige = [],
  establecimientosList = [],
  cruceEscuelas = [],
  kpis = {},
  centrosBreakdown = [],
  depuracionCentros = []
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
  const [pageCruce, setPageCruce] = useState(1);
  const [pageTracking, setPageTracking] = useState(1);
  const [pageEscala, setPageEscala] = useState(1);
  const PAGE_SIZE = 50;
  const PAGE_SIZE_ESCALA = 10;

  // Local state for Depuración
  const [depuracionList, setDepuracionList] = useState(depuracionCentros);
  useEffect(() => { setDepuracionList(depuracionCentros); }, [depuracionCentros]);

  const [depuracionFiltroEstado, setDepuracionFiltroEstado] = useState('TODOS');
  const [depuracionBusqueda, setDepuracionBusqueda] = useState('');
  const [subTabOtrosSectores, setSubTabOtrosSectores] = useState('depuracion');

  const [sanearDepuracionModalItem, setSanearDepuracionModalItem] = useState(null);
  const [sanearDepEstId, setSanearDepEstId] = useState('');
  const [sanearDepModalidadId, setSanearDepModalidadId] = useState('');
  const [sanearDepModalidades, setSanearDepModalidades] = useState([]);
  const [sanearDepLoadingModalidades, setSanearDepLoadingModalidades] = useState(false);
  const [sanearDepSearchTerm, setSanearDepSearchTerm] = useState('');
  const [sanearDepObs, setSanearDepObs] = useState('');
  const [sanearDepEstado, setSanearDepEstado] = useState('');
  const [sanearDepSubmitting, setSanearDepSubmitting] = useState(false);

  useEffect(() => {
    if (!sanearDepEstId) {
      setSanearDepModalidades([]);
      setSanearDepModalidadId('');
      return;
    }
    setSanearDepLoadingModalidades(true);
    fetch(`/api/auditoria-sueldos/modalidades-por-establecimiento/${sanearDepEstId}`)
      .then(res => res.json())
      .then(data => {
        setSanearDepModalidades(data || []);
        if (data && data.length === 1) {
          setSanearDepModalidadId(data[0].id.toString());
        } else {
          setSanearDepModalidadId('');
        }
      })
      .catch(err => console.error(err))
      .finally(() => setSanearDepLoadingModalidades(false));
  }, [sanearDepEstId]);

  // States y Callback para la Auditoría Individual de Docentes
  const [modalDocentesSector, setModalDocentesSector] = useState(null);
  const [modalDocentesData, setModalDocentesData] = useState([]);
  const [modalDocentesLoading, setModalDocentesLoading] = useState(false);
  const [modalDocentesSearch, setModalDocentesSearch] = useState('');
  const [showDistribucionModal, setShowDistribucionModal] = useState(false);
  const [showMatrizEscalasModal, setShowMatrizEscalasModal] = useState(false);

  const abrirModalDocentes = (centro, sector, radioSige) => {
    setModalDocentesSector({ centro, sector, radioSige });
    setModalDocentesLoading(true);
    setModalDocentesData([]);
    setModalDocentesSearch('');
    axios.get('/api/auditoria-sueldos/sector-docentes', {
      params: { centro, sector, radio_sige: radioSige }
    }).then(res => {
      setModalDocentesData(res.data.docentes || []);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setModalDocentesLoading(false);
    });
  };

  // State y Efecto para controlar el Spinner de Carga de la Página
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    const startHandler = () => setPageLoading(true);
    const finishHandler = () => setPageLoading(false);

    document.addEventListener('inertia:start', startHandler);
    document.addEventListener('inertia:finish', finishHandler);

    return () => {
      document.removeEventListener('inertia:start', startHandler);
      document.removeEventListener('inertia:finish', finishHandler);
    };
  }, []);

  const depuracionStats = useMemo(() => {
    const total = depuracionList.length;
    const centroSinUso = depuracionList.filter(d => d.estado_depuracion === 'CENTRO_SIN_USO').length;
    const sectorSinUso = depuracionList.filter(d => d.estado_depuracion === 'SECTOR_SIN_USO').length;
    const noCatalogado = depuracionList.filter(d => d.estado_depuracion === 'SUELDO_NO_CATALOGADO').length;
    const activos = depuracionList.filter(d => d.estado_depuracion === 'ACTIVO' || d.estado_depuracion === 'BAJA_VOLUMETRÍA').length;

    return { total, centroSinUso, sectorSinUso, noCatalogado, activos };
  }, [depuracionList]);

  const statusDistribution = useMemo(() => {
    // Coincide Total
    const coincideTotalSectores = resultados.filter(r => r.estado_auditoria === 'COINCIDE_TOTAL').length;
    const coincideTotalDocentes = resultados.filter(r => r.estado_auditoria === 'COINCIDE_TOTAL').reduce((acc, curr) => acc + (curr.total_filas_docentes || 0), 0);
    
    // Coincide SIGE y Camino/Circunferencia
    const coincideSigeSectores = resultados.filter(r => ['COINCIDE_SIGE', 'COINCIDE_SIGE_Y_CAMINO', 'COINCIDE_SIGE_Y_CIRC'].includes(r.estado_auditoria)).length;
    const coincideSigeDocentes = resultados.filter(r => ['COINCIDE_SIGE', 'COINCIDE_SIGE_Y_CAMINO', 'COINCIDE_SIGE_Y_CIRC'].includes(r.estado_auditoria)).reduce((acc, curr) => acc + (curr.total_filas_docentes || 0), 0);
    
    // Paga Mas
    const pagaMasSectores = resultados.filter(r => r.estado_auditoria === 'PAGA_MAS_QUE_SIGE').length;
    const pagaMasDocentes = resultados.filter(r => r.estado_auditoria === 'PAGA_MAS_QUE_SIGE').reduce((acc, curr) => acc + (curr.total_filas_docentes || 0), 0);
    
    // Paga Menos
    const pagaMenosSectores = resultados.filter(r => r.estado_auditoria === 'PAGA_MENOS_QUE_SIGE').length;
    const pagaMenosDocentes = resultados.filter(r => r.estado_auditoria === 'PAGA_MENOS_QUE_SIGE').reduce((acc, curr) => acc + (curr.total_filas_docentes || 0), 0);
    
    // Sin SIGE
    const sinSigeSectores = resultados.filter(r => r.estado_auditoria === 'SIN_SIGE').length;
    const sinSigeDocentes = resultados.filter(r => r.estado_auditoria === 'SIN_SIGE').reduce((acc, curr) => acc + (curr.total_filas_docentes || 0), 0);
    
    return {
      coincideTotalSectores,
      coincideTotalDocentes,
      coincideSigeSectores,
      coincideSigeDocentes,
      pagaMasSectores,
      pagaMasDocentes,
      pagaMenosSectores,
      pagaMenosDocentes,
      sinSigeSectores,
      sinSigeDocentes,
    };
  }, [resultados]);

  const [depuracionSortField, setDepuracionSortField] = useState('nom_sector');
  const [depuracionSortOrder, setDepuracionSortOrder] = useState('asc');
  const [depuracionSoloNoVinculados, setDepuracionSoloNoVinculados] = useState(false);

  const handleDepuracionSort = (field) => {
    if (depuracionSortField === field) {
      setDepuracionSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setDepuracionSortField(field);
      setDepuracionSortOrder('asc');
    }
  };

  const renderDepuracionSortIcon = (field) => {
    if (depuracionSortField !== field) return <i className="fa-solid fa-sort opacity-40 ml-1 text-[10px]"></i>;
    return depuracionSortOrder === 'asc' 
      ? <i className="fa-solid fa-sort-up text-white ml-1 text-xs"></i> 
      : <i className="fa-solid fa-sort-down text-white ml-1 text-xs"></i>;
  };

  const filteredDepuracion = useMemo(() => {
    let list = depuracionList.filter(d => {
      const matchesEstado = depuracionFiltroEstado === 'TODOS' || d.estado_depuracion === depuracionFiltroEstado;
      const matchesVinculado = !depuracionSoloNoVinculados || (!d.establecimiento_id && !d.cue_vinculado);
      const term = depuracionBusqueda.toLowerCase();
      const matchesSearch = !depuracionBusqueda ||
        (d.centro && d.centro.toString().includes(term)) ||
        (d.sector && d.sector.toString().includes(term)) ||
        (d.nom_centro && d.nom_centro.toLowerCase().includes(term)) ||
        (d.nom_sector && d.nom_sector.toLowerCase().includes(term)) ||
        (d.cue_vinculado && d.cue_vinculado.toString().includes(term)) ||
        (d.nom_establecimiento_vinculado && d.nom_establecimiento_vinculado.toLowerCase().includes(term)) ||
        (d.observaciones && d.observaciones.toLowerCase().includes(term));

      return matchesEstado && matchesVinculado && matchesSearch;
    });

    if (depuracionSortField) {
      list = [...list].sort((a, b) => {
        let valA = a[depuracionSortField] ?? '';
        let valB = b[depuracionSortField] ?? '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return depuracionSortOrder === 'asc' ? valA - valB : valB - valA;
        }

        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();

        if (valA < valB) return depuracionSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return depuracionSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [depuracionList, depuracionFiltroEstado, depuracionBusqueda, depuracionSortField, depuracionSortOrder, depuracionSoloNoVinculados]);

  const PAGE_SIZE_DEPURACION = 17;
  const [pageDepuracion, setPageDepuracion] = useState(1);

  useEffect(() => {
    setPageDepuracion(1);
  }, [depuracionFiltroEstado, depuracionBusqueda, depuracionSortField, depuracionSortOrder, depuracionSoloNoVinculados]);

  const totalPagesDepuracion = Math.ceil(filteredDepuracion.length / PAGE_SIZE_DEPURACION) || 1;
  const paginatedDepuracion = useMemo(() => {
    const start = (pageDepuracion - 1) * PAGE_SIZE_DEPURACION;
    return filteredDepuracion.slice(start, start + PAGE_SIZE_DEPURACION);
  }, [filteredDepuracion, pageDepuracion]);

  const handleSanearDepuracionSubmit = async () => {
    if (!sanearDepuracionModalItem) return;
    setSanearDepSubmitting(true);
    try {
      let finalObs = sanearDepObs;
      if (saneamientoAnexos.length > 0) {
        const anexosInfo = saneamientoAnexos.map(a => {
          const radioAnxDifiere = a.radio !== null && sanearDepuracionModalItem && Number(a.radio) !== Number(sanearDepuracionModalItem.radio_sueldo || 1);
          return `Anexo CUE ${a.cue} (${a.nombre}) [Radio SIGE: R${a.radio ?? 'S/D'}${radioAnxDifiere ? ' - ⚠️ Discrepancia Radio' : ''}]`;
        }).join('; ');
        finalObs = `[Anexos Vinculados: ${anexosInfo}] ${sanearDepObs ? `Notas: ${sanearDepObs}` : ''}`;
      }

      const token = getCsrfToken();
      const res = await fetch('/api/auditoria-sueldos/sanear-depuracion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token
        },
        body: JSON.stringify({
          id: sanearDepuracionModalItem.id,
          establecimiento_id: sanearDepEstId || null,
          modalidad_id: sanearDepModalidadId || null,
          estado_depuracion: sanearDepEstado || null,
          observaciones: finalObs
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDepuracionList(prev => prev.map(item => item.id === sanearDepuracionModalItem.id ? data.item : item));
        setSanearDepuracionModalItem(null);
        setSaneamientoAnexos([]);
        setShowAddAnexoSearch(false);
      } else {
        alert('Ocurrió un error al actualizar la depuración.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setSanearDepSubmitting(false);
    }
  };

  // Local state for management updates
  const [auditList, setAuditList] = useState(resultados);
  const [viejosList, setViejosList] = useState(viejos);
  const [editingItem, setEditingItem] = useState(null);
  const [notaInput, setNotaInput] = useState('');
  const [estadoGestionInput, setEstadoGestionInput] = useState('PENDIENTE');
  const [updating, setUpdating] = useState(false);

  const [saneamientoModalSector, setSaneamientoModalSector] = useState(null);
  const [saneamientoEstId, setSaneamientoEstId] = useState('');
  const [saneamientoSearchTerm, setSaneamientoSearchTerm] = useState('');
  const [saneamientoObs, setSaneamientoObs] = useState('');
  const [saneamientoEstadoGestion, setSaneamientoEstadoGestion] = useState('EN_INVESTIGACION');
  const [sanearSubmitting, setSanearSubmitting] = useState(false);
  const [conflictosModalData, setConflictosModalData] = useState(null);

  // Anexos adicionales en saneamiento
  const [saneamientoAnexos, setSaneamientoAnexos] = useState([]);
  const [showAddAnexoSearch, setShowAddAnexoSearch] = useState(false);
  const [anexoSearchTerm, setAnexoSearchTerm] = useState('');

  const linkedViejos = useMemo(() => viejosList.filter(v => v.nombre_establecimiento !== 'Sin Establecimiento Registrado' && v.cue), [viejosList]);
  const unlinkedViejos = useMemo(() => viejosList.filter(v => v.nombre_establecimiento === 'Sin Establecimiento Registrado' || !v.cue), [viejosList]);

  const deptosDisponibles = useMemo(() => {
    const list = new Set();
    auditList.forEach(i => {
      if (i.departamento && (!filtroNivel || i.nivel_educativo === filtroNivel)) {
        list.add(i.departamento);
      }
    });
    cruceEscuelas.forEach(i => {
      if (i.departamento && (!filtroNivel || i.nivel_educativo === filtroNivel)) {
        list.add(i.departamento);
      }
    });
    viejosList.forEach(v => {
      if (v.departamento && (!filtroNivel || v.nivel_educativo === filtroNivel)) {
        list.add(v.departamento);
      }
    });
    return Array.from(list).sort();
  }, [auditList, cruceEscuelas, viejosList, filtroNivel]);

  useEffect(() => {
    if (filtroDepto && !deptosDisponibles.includes(filtroDepto)) {
      setFiltroDepto('');
    }
  }, [filtroNivel, deptosDisponibles, filtroDepto]);

  const radiosDisponibles = useMemo(() => {
    const list = new Set();
    auditList.forEach(i => {
      if ((!filtroNivel || i.nivel_educativo === filtroNivel) && (!filtroDepto || i.departamento === filtroDepto)) {
        if (i.radio_sige !== null) list.add(Number(i.radio_sige));
        if (i.radio_sueldo !== null) list.add(Number(i.radio_sueldo));
      }
    });
    cruceEscuelas.forEach(i => {
      if ((!filtroNivel || i.nivel_educativo === filtroNivel) && (!filtroDepto || i.departamento === filtroDepto)) {
        if (i.radio_sige !== null) list.add(Number(i.radio_sige));
        if (i.radio_sueldo !== null) list.add(Number(i.radio_sueldo));
      }
    });
    viejosList.forEach(v => {
      if ((!filtroNivel || v.nivel_educativo === filtroNivel) && (!filtroDepto || v.departamento === filtroDepto)) {
        if (v.radio_sige !== null) list.add(Number(v.radio_sige));
        if (v.radio_sueldo !== null) list.add(Number(v.radio_sueldo));
      }
    });
    return Array.from(list).sort((a, b) => a - b);
  }, [auditList, cruceEscuelas, viejosList, filtroNivel, filtroDepto]);

  useEffect(() => {
    if (filtroRadio && !radiosDisponibles.includes(Number(filtroRadio))) {
      setFiltroRadio('');
    }
  }, [filtroNivel, filtroDepto, radiosDisponibles, filtroRadio]);

  const auditStatusLabels = {
    COINCIDE_TOTAL: '🟢 COINCIDE TOTAL',
    COINCIDE_SIGE: '🟢 COINCIDE SIGE',
    COINCIDE_SIGE_Y_CAMINO: '🟢 COINCIDE SIGE Y CAMINO',
    COINCIDE_SIGE_Y_CIRC: '🟢 COINCIDE SIGE Y CIRC',
    PAGA_MAS_QUE_SIGE: '🔴 PAGA MÁS QUE SIGE',
    PAGA_MENOS_QUE_SIGE: '🔵 PAGA MENOS QUE SIGE',
    SIN_SIGE: '🟡 SIN REGISTRO SIGE'
  };

  const auditoriasDisponibles = useMemo(() => {
    const list = new Set();
    auditList.forEach(i => {
      if (
        (!filtroNivel || i.nivel_educativo === filtroNivel) &&
        (!filtroDepto || i.departamento === filtroDepto) &&
        (!filtroRadio || Number(i.radio_sige) === Number(filtroRadio) || Number(i.radio_sueldo) === Number(filtroRadio))
      ) {
        if (i.estado_auditoria) list.add(i.estado_auditoria);
      }
    });
    return Array.from(list).sort();
  }, [auditList, filtroNivel, filtroDepto, filtroRadio]);

  useEffect(() => {
    if (filtroAuditoria && !auditoriasDisponibles.includes(filtroAuditoria)) {
      setFiltroAuditoria('');
    }
  }, [filtroNivel, filtroDepto, filtroRadio, auditoriasDisponibles, filtroAuditoria]);

  const renderCoincideSigeSueldoBadge = (rSige, rSueldo, cue) => {
    if (!cue || rSige === null || rSige === undefined || rSige === '') {
      return <span className="text-[11px] font-bold text-slate-400 shrink-0">No Aplica</span>;
    }
    const sige = Number(rSige);
    const sueldo = Number(rSueldo);
    if (sige === sueldo) {
      return <span className="text-[11px] font-black text-emerald-700 shrink-0">🟢 SI</span>;
    }
    if (sueldo > sige) {
      const diff = sueldo - sige;
      return <span className="text-[11px] font-black text-red-700 shrink-0">🔴 +{diff}</span>;
    }
    const diff = sige - sueldo;
    return <span className="text-[11px] font-black text-amber-600 shrink-0">🟡 -{diff}</span>;
  };

  const renderRadioTeoricoBadge = (rSueldo, rTeorico, cue) => {
    if (!cue || rTeorico === null || rTeorico === undefined || rTeorico === '') {
      return <span className="text-[10px] font-bold text-slate-400">No Aplica</span>;
    }
    if (Number(rSueldo) === Number(rTeorico)) {
      return <span className="text-[10px] font-bold text-emerald-700">🟢 SI</span>;
    }
    return <span className="text-[10px] font-bold text-red-700">🔴 NO (R{rTeorico})</span>;
  };

  const renderDistanciaCamino = (distCamino, cue) => {
    if (!cue || distCamino === null || distCamino === undefined || distCamino === '') {
      return <span className="text-slate-400 font-medium text-[11px]">No Aplica</span>;
    }
    const val = Number(distCamino);
    const formatted = val % 1 === 0 ? val.toString() : val.toFixed(1).replace('.', ',');
    return <span className="font-extrabold text-gray-900 text-xs">{formatted} km</span>;
  };

  const renderEscalaLeyBadge = (porcPagado) => {
    if (!porcPagado) return <span className="text-gray-400">-</span>;
    const p = Number(porcPagado);
    if ([20, 30, 80, 100, 120, 140].includes(p)) {
      return <span className="font-bold text-gray-700 text-[11px]">Ley Histórica</span>;
    }
    if ([40, 50, 60, 95, 115, 135, 155].includes(p)) {
      return <span className="font-bold text-gray-900 text-[11px]">Ley Paritaria</span>;
    }
    return <span className="font-bold text-purple-900 text-[11px]">Adicional Jerárquico</span>;
  };

  // Filtering
  const filteredResultados = auditList.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      (item.centro && item.centro.toString().includes(term)) ||
      (item.sector && item.sector.toString().includes(term)) ||
      (item.nombre_establecimiento && item.nombre_establecimiento.toLowerCase().includes(term)) ||
      (item.localidad && item.localidad.toLowerCase().includes(term)) ||
      (item.cue && item.cue.toString().includes(term)) ||
      (item.notas_auditor && item.notas_auditor.toLowerCase().includes(term));

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
        (v.centro && v.centro.toString().includes(term)) ||
        (v.sector && v.sector.toString().includes(term)) ||
        (v.nombre_establecimiento && v.nombre_establecimiento.toLowerCase().includes(term)) ||
        (v.cue && v.cue.toString().includes(term));

      const matchesDepto = !filtroDepto || v.departamento === filtroDepto;
      const matchesAmbito = !filtroAmbito || v.ambito === filtroAmbito;
      const matchesRadio = !filtroRadio || Number(v.radio_sige) === Number(filtroRadio) || Number(v.radio_sueldo) === Number(filtroRadio);

      return matchesSearch && matchesDepto && matchesAmbito && matchesRadio;
    });
  }, [linkedViejos, search, filtroDepto, filtroAmbito, filtroRadio]);

  const totalPagesEscala = Math.ceil(filteredLinkedViejos.length / PAGE_SIZE_ESCALA);
  const paginatedViejos = useMemo(() => {
    const start = (pageEscala - 1) * PAGE_SIZE_ESCALA;
    return filteredLinkedViejos.slice(start, start + PAGE_SIZE_ESCALA);
  }, [filteredLinkedViejos, pageEscala]);

  const filteredUnlinkedViejos = useMemo(() => {
    const term = search.toLowerCase();
    return unlinkedViejos.filter((v) => {
      const matchesSearch = !search ||
        (v.centro && v.centro.toString().includes(term)) ||
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
        (item.centro && item.centro.toString().includes(term)) ||
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

  const totalPagesCruce = Math.ceil(filteredCruce.length / PAGE_SIZE);
  const paginatedCruce = useMemo(() => {
    const start = (pageCruce - 1) * PAGE_SIZE;
    return filteredCruce.slice(start, start + PAGE_SIZE);
  }, [filteredCruce, pageCruce]);

  const totalPagesTracking = Math.ceil(linkedResultados.length / PAGE_SIZE);
  const paginatedTracking = useMemo(() => {
    const start = (pageTracking - 1) * PAGE_SIZE;
    return linkedResultados.slice(start, start + PAGE_SIZE);
  }, [linkedResultados, pageTracking]);

  useEffect(() => {
    setPageCruce(1);
  }, [search, filtroNivel, filtroDepto, filtroAmbito, filtroRadio, filtroCruce]);

  useEffect(() => {
    setPageTracking(1);
  }, [search, filtroNivel, filtroDepto, filtroAmbito, filtroRadio, filtroAuditoria]);

  useEffect(() => {
    setPageEscala(1);
  }, [search, filtroDepto, filtroAmbito, filtroRadio]);

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


  // Niveles educativos provenientes únicamente de los establecimientos (cruceEscuelas)
  const nivelesDisponibles = useMemo(() => {
    const list = new Set();
    cruceEscuelas.forEach((i) => {
      if (i.nivel_educativo && (!filtroDepto || i.departamento === filtroDepto)) {
        if (!isAdministrativeLevel(i.nivel_educativo)) {
          list.add(i.nivel_educativo);
        }
      }
    });
    return Array.from(list).sort();
  }, [cruceEscuelas, filtroDepto]);

  useEffect(() => {
    if (filtroNivel && !nivelesDisponibles.includes(filtroNivel)) {
      setFiltroNivel('');
    }
  }, [filtroDepto, nivelesDisponibles, filtroNivel]);

  const filteredConflictosSige = useMemo(() => {
    return conflictosSige.filter((c) => {
      const matchesDepto = !filtroDepto || (c.departamentos && c.departamentos.includes(filtroDepto));
      const matchesRadio = !filtroRadio || (c.radios_distintos && c.radios_distintos.split(',').map(Number).includes(Number(filtroRadio)));
      const matchesAmbito = !filtroAmbito || (c.establecimientos_detallados && c.establecimientos_detallados.includes(`||${filtroAmbito}`));

      const term = search.toLowerCase();
      const matchesSearch = !search ||
        (c.centro && c.centro.toString().includes(term)) ||
        (c.sector && c.sector.toString().includes(term)) ||
        (c.establecimientos && c.establecimientos.toLowerCase().includes(term));

      return matchesDepto && matchesRadio && matchesAmbito && matchesSearch;
    });
  }, [conflictosSige, filtroDepto, filtroRadio, filtroAmbito, search]);



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

  const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (meta) return meta;
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const handleSanearSectorSubmit = async (sectorVal) => {
    if (!saneamientoEstId && saneamientoEstadoGestion !== 'DADO_DE_BAJA') {
      alert('Por favor seleccione una escuela / CUE a vincular o marque el estado como DADO DE BAJA');
      return;
    }
    setSanearSubmitting(true);
    try {
      let finalObs = saneamientoObs;
      if (saneamientoAnexos.length > 0) {
        const anexosInfo = saneamientoAnexos.map(a => {
          const radioAnxDifiere = a.radio !== null && saneamientoModalSector && Number(a.radio) !== Number(saneamientoModalSector.radio_sueldo || 1);
          return `Anexo CUE ${a.cue} (${a.nombre}) [Radio SIGE: R${a.radio ?? 'S/D'}${radioAnxDifiere ? ' - ⚠️ Discrepancia Radio' : ''}]`;
        }).join('; ');
        finalObs = `[Anexos Vinculados: ${anexosInfo}] ${saneamientoObs ? `Notas: ${saneamientoObs}` : ''}`;
      }

      const token = getCsrfToken();
      const res = await fetch('/api/auditoria-sueldos/sanear-sector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': token,
          'X-XSRF-TOKEN': token
        },
        body: JSON.stringify({
          id: saneamientoModalSector?.id,
          sector: sectorVal,
          centro: saneamientoModalSector?.centro,
          establecimiento_id: saneamientoEstId || null,
          observacion: finalObs,
          estado_gestion: saneamientoEstadoGestion
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSaneamientoModalSector(null);
        setSaneamientoEstId('');
        setSaneamientoSearchTerm('');
        setSaneamientoObs('');
        setSaneamientoAnexos([]);
        setShowAddAnexoSearch(false);
        setSaneamientoEstadoGestion('EN_INVESTIGACION');
        const targetTab = (saneamientoEstadoGestion === 'DADO_DE_BAJA' || !saneamientoEstId) ? 'sin_escuela' : 'tracking';
        setActiveTab(targetTab);
        router.reload({
          onSuccess: () => setActiveTab(targetTab)
        });
      } else {
        alert(data.message || 'Error al actualizar sector');
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


      {/* Navigation Tabs (Icon-Only Default, Expand Active with Title + Badge) */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-3 mb-6 custom-scrollbar">
        {/* TAB: KPI */}
        <button
          onClick={() => setActiveTab('kpi')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'kpi'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Resumen & KPIs"
        >
          <i className={`fa-solid fa-chart-pie text-sm ${activeTab === 'kpi' ? 'text-white' : 'text-[#FE8204]'}`}></i>
          {activeTab === 'kpi' && <span>Resumen & KPIs</span>}
        </button>

        {/* TAB: CRUCE */}
        <button
          onClick={() => setActiveTab('cruce')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'cruce'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Cruce Escuelas & Sectores"
        >
          <i className={`fa-solid fa-school text-sm ${activeTab === 'cruce' ? 'text-white' : 'text-[#FE8204]'}`}></i>
          {activeTab === 'cruce' && (
            <>
              <span>Cruce Escuelas & Sectores</span>
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-white/20 text-white">
                {cruceStats.total}
              </span>
            </>
          )}
        </button>

        {/* TAB: ESCALAS */}
        <button
          onClick={() => setActiveTab('escala')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'escala'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Escalas & Residuales"
        >
          <i className={`fa-solid fa-scale-balanced text-sm ${activeTab === 'escala' ? 'text-white' : 'text-[#FE8204]'}`}></i>
          {activeTab === 'escala' && (
            <>
              <span>Escalas & Residuales</span>
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-white/20 text-white">
                {linkedViejos.length}
              </span>
            </>
          )}
        </button>

        {/* TAB: PAGAN MAS */}
        <button
          onClick={() => setActiveTab('paga_mas')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'paga_mas'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Pagan MÁS"
        >
          <i className={`fa-solid fa-arrow-trend-up text-sm ${activeTab === 'paga_mas' ? 'text-white' : 'text-red-600'}`}></i>
          {activeTab === 'paga_mas' && (
            <>
              <span>Pagan MÁS</span>
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-white/20 text-white">
                {pagaMasList.length}
              </span>
            </>
          )}
        </button>

        {/* TAB: PAGAN MENOS */}
        <button
          onClick={() => setActiveTab('paga_menos')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'paga_menos'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Pagan MENOS"
        >
          <i className={`fa-solid fa-arrow-trend-down text-sm ${activeTab === 'paga_menos' ? 'text-white' : 'text-blue-600'}`}></i>
          {activeTab === 'paga_menos' && (
            <>
              <span>Pagan MENOS</span>
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-white/20 text-white">
                {pagaMenosList.length}
              </span>
            </>
          )}
        </button>

        {/* TAB: CONFLICTOS SIGE */}
        <button
          onClick={() => setActiveTab('conflictos')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'conflictos'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Conflictos SIGE"
        >
          <i className={`fa-solid fa-triangle-exclamation text-sm ${activeTab === 'conflictos' ? 'text-white' : 'text-amber-600'}`}></i>
          {activeTab === 'conflictos' && (
            <>
              <span>Conflictos SIGE</span>
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-white/20 text-white">
                {filteredConflictosSige.length}
              </span>
            </>
          )}
        </button>

        {/* TAB: INCONSISTENCIA ZONA */}
        <button
          onClick={() => setActiveTab('zonas')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'zonas'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Inconsistencia Zona"
        >
          <i className={`fa-solid fa-location-dot text-sm ${activeTab === 'zonas' ? 'text-white' : 'text-purple-600'}`}></i>
          {activeTab === 'zonas' && (
            <>
              <span>Inconsistencia Zona</span>
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-white/20 text-white">
                {zonasInconsistentesList.length}
              </span>
            </>
          )}
        </button>

        {/* TAB: SEGUIMIENTO & GESTION */}
        <button
          onClick={() => setActiveTab('tracking')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'tracking'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Seguimiento & Gestión"
        >
          <i className={`fa-solid fa-list-check text-sm ${activeTab === 'tracking' ? 'text-white' : 'text-emerald-600'}`}></i>
          {activeTab === 'tracking' && (
            <>
              <span>Seguimiento & Gestión</span>
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-white/20 text-white">
                {linkedResultados.length}
              </span>
            </>
          )}
        </button>

        {/* TAB: OTROS SECTORES */}
        <button
          onClick={() => setActiveTab('sin_escuela')}
          className={`py-2 transition-all duration-300 shrink-0 flex items-center justify-center cursor-pointer rounded-xl ${
            activeTab === 'sin_escuela'
              ? 'px-4 bg-[#FE8204] text-white border border-[#FE8204] shadow-md shadow-[#FE8204]/20 font-black text-xs gap-2'
              : 'w-9 h-9 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
          }`}
          title="Otros Sectores"
        >
          <i className={`fa-solid fa-circle-question text-sm ${activeTab === 'sin_escuela' ? 'text-white' : 'text-[#FE8204]'}`}></i>
          {activeTab === 'sin_escuela' && (
            <>
              <span>Otros Sectores</span>
              <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-white/20 text-white">
                {unlinkedResultados.length + unlinkedViejos.length}
              </span>
            </>
          )}
        </button>

        {/* Sub-pestañas inline para Otros Sectores */}
        {activeTab === 'sin_escuela' && (
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-300 shrink-0">
            <button
              onClick={() => setSubTabOtrosSectores('depuracion')}
              className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                subTabOtrosSectores === 'depuracion'
                  ? 'bg-[#FE8204] text-white shadow-md shadow-[#FE8204]/20 border border-[#FE8204]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
              }`}
            >
              <i className={`fa-solid fa-filter-circle-dollar text-sm ${subTabOtrosSectores === 'depuracion' ? 'text-white' : 'text-[#FE8204]'}`}></i>
              <span>Depuración de Catálogo</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                subTabOtrosSectores === 'depuracion' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {depuracionStats.total}
              </span>
            </button>

            <button
              onClick={() => setSubTabOtrosSectores('saneamiento')}
              className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                subTabOtrosSectores === 'saneamiento'
                  ? 'bg-[#FE8204] text-white shadow-md shadow-[#FE8204]/20 border border-[#FE8204]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
              }`}
            >
              <i className={`fa-solid fa-link text-sm ${subTabOtrosSectores === 'saneamiento' ? 'text-white' : 'text-[#FE8204]'}`}></i>
              <span>Saneamiento & Vinculación CUE</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                subTabOtrosSectores === 'saneamiento' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {unlinkedResultados.length}
              </span>
            </button>

            <button
              onClick={() => setSubTabOtrosSectores('residuales')}
              className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                subTabOtrosSectores === 'residuales'
                  ? 'bg-[#FE8204] text-white shadow-md shadow-[#FE8204]/20 border border-[#FE8204]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
              }`}
            >
              <i className={`fa-solid fa-triangle-exclamation text-sm ${subTabOtrosSectores === 'residuales' ? 'text-white' : 'text-amber-500'}`}></i>
              <span>Residuales Huérfanos</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                subTabOtrosSectores === 'residuales' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {unlinkedViejos.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Global Filter Bar for Tables (Single Line) */}
      {activeTab !== 'kpi' && activeTab !== 'sin_escuela' && (
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center gap-2.5 overflow-x-auto custom-scrollbar whitespace-nowrap">
          <div className="relative shrink-0 w-64 sm:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-[#FE8204] text-xs"></i>
            <input
              type="text"
              placeholder="Buscar por CUE, centro, sector, escuela..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-[#FE8204] focus:border-[#FE8204] text-[#1A1A1C]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'cruce' && (
              <select
                value={filtroCruce}
                onChange={(e) => setFiltroCruce(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-2.5 py-1.5 focus:ring-[#FE8204] cursor-pointer shrink-0"
              >
                <option value="">Cruces</option>
                <option value="COINCIDE">🟢 Coinciden Radios</option>
                <option value="NO_COINCIDE">🔴 No Coinciden Radios</option>
                <option value="SECTOR_0">🟡 Sector 0 en SIGE</option>
                <option value="SIN_LIQUIDACION">⚪ Sin Liquidación Docente</option>
              </select>
            )}

            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-2.5 py-1.5 focus:ring-[#FE8204] cursor-pointer shrink-0"
            >
              <option value="">Niveles</option>
              {nivelesDisponibles.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <select
              value={filtroDepto}
              onChange={(e) => setFiltroDepto(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-2.5 py-1.5 focus:ring-[#FE8204] cursor-pointer shrink-0"
            >
              <option value="">Departamentos</option>
              {deptosDisponibles.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filtroAmbito}
              onChange={(e) => setFiltroAmbito(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-2.5 py-1.5 focus:ring-[#FE8204] cursor-pointer shrink-0"
            >
              <option value="">Ámbitos</option>
              <option value="PUBLICO">PÚBLICO</option>
              <option value="PRIVADO">PRIVADO</option>
            </select>

            <select
              value={filtroRadio}
              onChange={(e) => setFiltroRadio(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-2.5 py-1.5 focus:ring-[#FE8204] cursor-pointer shrink-0"
            >
              <option value="">Radios</option>
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
                className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-2.5 py-1.5 focus:ring-[#FE8204] cursor-pointer shrink-0"
              >
                <option value="">Estados Gestión</option>
                <option value="CONFORME">CONFORME / VALIDADO</option>
                <option value="DADO_DE_BAJA">DADO DE BAJA / ESCUELA CERRADA</option>
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
                className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-2.5 py-1.5 focus:ring-[#FE8204] cursor-pointer shrink-0"
              >
                <option value="">Estados Auditoría</option>
                {auditoriasDisponibles.map((status) => (
                  <option key={status} value={status}>
                    {auditStatusLabels[status] || status}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: KPI & EXECUTIVE RESUMEN */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          {/* Top KPI Grid (Compact Version) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <GlassCard className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Centros & Sectores
                  </span>
                  <div className="text-lg font-black text-[#1A1A1C] mt-0.5 leading-tight">
                    {kpis.total_centros || 0} / {kpis.total_sectores || 0}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    {(kpis.total_filas_docentes || 0).toLocaleString()} liquidaciones
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#FE8204]/10 text-[#FE8204] flex items-center justify-center text-sm shrink-0">
                  <i className="fa-solid fa-building-columns"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Tasa de Coincidencia
                  </span>
                  <div className="text-lg font-black text-emerald-600 mt-0.5 leading-tight">
                    {kpis.porcentaje_coincidencia || 0}%
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    Sueldo = SIGE
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm shrink-0">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Pagan MÁS que SIGE
                  </span>
                  <div className="text-lg font-black text-red-600 mt-0.5 leading-tight">
                    {kpis.paga_mas_sectores || 0} sectores
                  </div>
                  <span className="text-[11px] text-red-600 font-semibold block mt-0.5">
                    {(kpis.paga_mas_docentes || 0).toLocaleString()} personal afectado
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm shrink-0">
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Pagan MENOS que SIGE
                  </span>
                  <div className="text-lg font-black text-amber-600 mt-0.5 leading-tight">
                    {kpis.paga_menos_sectores || 0} sectores
                  </div>
                  <span className="text-[11px] text-amber-600 font-semibold block mt-0.5">
                    {(kpis.paga_menos_docentes || 0).toLocaleString()} personal afectado
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm shrink-0">
                  <i className="fa-solid fa-arrow-trend-down"></i>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Table Breakdown by Centro Salarial */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-building-circle-check text-[#FE8204]"></i>
                  Desglose de Auditoría por Centro Salarial
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setShowDistribucionModal(true)}
                  className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Ver Distribución del Estado de Auditoría"
                >
                  <i className="fa-solid fa-list-ol text-[#FE8204] text-sm"></i>
                  <span>Distribución del Estado de Auditoría</span>
                </button>
                <a
                  href={`/api/auditoria-sueldos/exportar-excel?tab=kpi&periodo=${nominaSeleccionada?.periodo || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="Descargar tabla de Centros en Excel"
                >
                  <i className="fa-solid fa-file-excel text-sm"></i>
                </a>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-xs text-left text-gray-700">
                <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 sticky top-0 shadow-xs">
                  <tr>
                    <th className="px-4 py-3 font-black text-white">Centro Salarial</th>
                    <th className="px-4 py-3 text-center font-black text-white">Sectores</th>
                    <th className="px-4 py-3 text-center font-black text-white">Coinciden</th>
                    <th className="px-4 py-3 text-center font-black text-white">Pagan Más</th>
                    <th className="px-4 py-3 text-center font-black text-white">Pagan Menos</th>
                    <th className="px-4 py-3 text-center font-black text-white">Sin SIGE</th>
                    <th className="px-4 py-3 text-right font-black text-white">Liquidaciones</th>
                    <th className="px-4 py-3 text-center font-black text-white">Coincidencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {centrosBreakdown.map((cb, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-[#FE8204] text-white shrink-0 shadow-xs">
                            {cb.centro}
                          </span>
                          <span className="font-bold text-gray-900 text-xs">
                            {cb.nombre_centro}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{cb.sectores}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#FE8204]">{cb.coinciden}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">
                        {cb.paga_mas > 0 ? cb.paga_mas : '0'}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600">
                        {cb.paga_menos > 0 ? cb.paga_menos : '0'}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-600">{cb.sin_sige}</td>
                      <td className="px-4 py-3 text-right font-black text-gray-900">
                        {cb.personal.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-xs">
                        <span className={
                          cb.tasa_coincidencia >= 80 
                            ? 'text-emerald-700 font-black' 
                            : cb.tasa_coincidencia >= 50 
                            ? 'text-amber-600 font-black' 
                            : 'text-red-600 font-black'
                        }>
                          {cb.tasa_coincidencia}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: ESCALAS Y REGISTROS VIEJOS */}
      {activeTab === 'escala' && (
        <div className="space-y-6">
          {/* Sub-panel de Registros Escala Vieja */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                  Registros Residuales con Escala Vieja / Desconocida ({linkedViejos.length})
                </h3>
                <p className="text-xs text-gray-600">
                  Docentes liquidados con porcentaje antiguo (80%, 120%, 140%). Requiere clasificación manual.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setShowMatrizEscalasModal(true)}
                  className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Ver Matriz Comparativa de Escalas de Radio"
                >
                  <i className="fa-solid fa-scale-balanced text-[#FE8204] text-sm"></i>
                  <span>Matriz Comparativa de Escalas</span>
                </button>
                <a
                  href={`/api/auditoria-sueldos/exportar-excel?tab=escala&periodo=${nominaSeleccionada?.periodo || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="Descargar Registros en Excel"
                >
                  <i className="fa-solid fa-file-excel text-sm"></i>
                </a>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-xs text-left text-gray-700">
                <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 sticky top-0 shadow-xs">
                  <tr>
                    <th className="px-3 py-3 text-center font-black text-white">Centro</th>
                    <th className="px-3 py-3 text-center font-black text-white">Sector</th>
                    <th className="px-3 py-3 font-black text-white">Establecimiento / Escuela</th>
                    <th className="px-3 py-3 text-center font-black text-white">Radio SIGE</th>
                    <th className="px-3 py-3 text-center font-black text-white">Radio Sueldo (A04)</th>
                    <th className="px-3 py-3 text-right font-black text-white">A01 Básico</th>
                    <th className="px-3 py-3 text-right font-black text-white">A04 Monto ($)</th>
                    <th className="px-3 py-3 font-black text-white">Escala</th>
                    <th className="px-3 py-3 text-center font-black text-white">Dictamen / Clasificación</th>
                    <th className="px-3 py-3 font-black text-white">Decreto / Resolución Aval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedViejos.map((v) => (
                    <tr key={v.id} className="hover:bg-amber-50/50">
                      <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 rounded-lg bg-[#FE8204] text-white font-black text-xs inline-block">{v.centro ?? 'S/D'}</span></td>
                      <td className="px-3 py-2 text-center font-black text-gray-900">{v.sector}</td>
                      <td className="px-3 py-2">
                        <div className="font-extrabold text-gray-950 leading-tight">
                          {v.nombre_establecimiento || 'Sin Establecimiento Registrado'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-semibold">
                          {v.cue && <span>CUE: {v.cue}</span>}
                          {v.nivel_educativo && v.nivel_educativo !== 'S/N' && (
                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded border font-semibold">
                              {v.nivel_educativo}
                            </span>
                          )}
                          {v.departamento && <span>• {v.departamento}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-black">
                        {v.radio_sige ? `R${v.radio_sige}` : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-center font-black text-amber-800 text-xs">
                        R{v.radio_sueldo} ({v.porcentaje_pagado}%)
                      </td>
                      <td className="px-3 py-2 text-right font-mono">${v.a01_basico.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">
                        ${v.a04_radio.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`font-bold text-[11px] ${
                            v.escala_detectada === 'LEY HISTORICA' || v.escala_detectada === 'VIEJA'
                              ? 'text-gray-700'
                              : v.escala_detectada === 'DESCONOCIDA'
                              ? 'text-amber-800 font-extrabold'
                              : 'text-gray-900'
                          }`}
                        >
                          {v.escala_detectada === 'LEY HISTORICA' || v.escala_detectada === 'VIEJA'
                            ? 'Ley Histórica'
                            : v.escala_detectada === 'DESCONOCIDA'
                            ? 'Porcentaje Irregular'
                            : 'Ley Paritaria'}
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

            <Pagination
              currentPage={pageEscala}
              totalPages={totalPagesEscala}
              onPageChange={setPageEscala}
              totalItems={filteredLinkedViejos.length}
              itemsName="registros"
            />
          </GlassCard>
        </div>
      )}

      {/* TAB 3: CONFLICTOS INTERNOS SIGE */}
      {activeTab === 'conflictos' && (
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                Sectores SIGE con Conflicto Interno ({filteredConflictosSige.length} Sectores)
              </h2>
              <p className="text-xs text-gray-600">
                Sectores que poseen múltiples radios oficiales en la base de datos `modalidades`. Haga clic en la cantidad de escuelas para ver el detalle de edificios y departamentos.
              </p>
            </div>
            <a
              href={`/api/auditoria-sueldos/exportar-excel?tab=conflictos&periodo=${nominaSeleccionada?.periodo || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Descargar conflictos de SIGE en Excel"
            >
              <i className="fa-solid fa-file-excel text-sm"></i>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700 border-collapse">
              <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 shadow-xs">
                <tr>
                  <th className="px-4 py-3 font-black text-white">Sector</th>
                  <th className="px-4 py-3 font-black text-white">Radios en SIGE</th>
                  <th className="px-4 py-3 font-black text-white">Niveles Afectados</th>
                  <th className="px-4 py-3 font-black text-white">Establecimientos Relacionados</th>
                  <th className="px-4 py-3 text-right font-black text-white">Modalidades</th>
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
                      ambito: parts[5] || '',
                      centro: parts[6] || '',
                      sector_sueldos: parts[7] || '',
                      radio_sueldo: parts[8] || ''
                    };
                  }) : [];
                  const parsedEsts = Array.from(new Map(parsedRaw.map(est => [`${est.cue}-${est.radio}-${est.ambito}-${est.centro}`, est])).values());

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-black text-red-900 flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-up text-red-600"></i>
                Establecimientos que PAGAN MÁS que su Radio SIGE ({pagaMasList.length})
              </h2>
              <p className="text-xs text-gray-600">
                Sectores donde la liquidación de haberes abona un porcentaje superior al fijado administrativamente.
              </p>
            </div>
            <a
              href={`/api/auditoria-sueldos/exportar-excel?tab=paga_mas&periodo=${nominaSeleccionada?.periodo || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Descargar establecimientos que pagan más en Excel"
            >
              <i className="fa-solid fa-file-excel text-sm"></i>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 shadow-xs">
                <tr>
                  <th className="px-3 py-3 text-center font-black text-white">Centro</th>
                  <th className="px-3 py-3 text-center font-black text-white">Sector</th>
                  <th className="px-3 py-3 font-black text-white">Establecimiento / Escuela</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center font-black text-white">Coincide SIGE vs Sueldo</th>
                  <th className="px-3 py-3 text-center font-black text-white">% Pagado</th>
                  <th className="px-3 py-3 text-center font-black text-white">Ley / Escala</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Circunferencia</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Camino</th>
                  <th className="px-3 py-3 text-center font-black text-white">Distancia Camino</th>
                  <th className="px-3 py-3 text-center font-black text-white">Docentes Desviados</th>
                  <th className="px-3 py-3 text-right font-black text-white">Liquidaciones</th>
                  <th className="px-3 py-3 text-center font-black text-white">Gestión</th>
                  <th className="px-3 py-3 text-center font-black text-white">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagaMasList.map((item) => (
                  <tr key={item.id} className={`hover:bg-red-50/50 ${!item.es_sector_nativo ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      {item.es_sector_nativo === 1 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[#FE8204] text-white font-black text-xs inline-block">
                          {item.centro ?? 'S/D'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-white text-[#FE8204] border border-[#FE8204]/40 font-black text-xs inline-block" title="Establecimiento con vinculación de sector manual">
                          {item.centro ?? 'S/D'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3">
                      <div className="font-extrabold text-gray-950 max-w-xs truncate">
                        {item.nombre_establecimiento || 'No Registrado'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                        {item.cue && <span>CUE: {item.cue}</span>}
                        {item.nivel_educativo && item.nivel_educativo !== 'GENERAL' && (
                          <span className="px-1 py-0.1 bg-gray-100 text-gray-700 rounded border font-semibold">
                            {item.nivel_educativo}
                          </span>
                        )}
                        {item.departamento && <span>• {item.departamento}</span>}
                        {item.es_sector_nativo === 1 ? (
                          <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-extrabold text-[9px] uppercase tracking-wide">
                            SIGE Oficial
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200 font-extrabold text-[9px] uppercase tracking-wide" title="Sector asociado manualmente al CUE en la auditoría">
                            Asociación Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-700">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-center font-black text-red-700">
                      R{item.radio_sueldo}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderCoincideSigeSueldoBadge(item.radio_sige, item.radio_sueldo, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-900">
                      {item.porc_pagado_mediana ? `${item.porc_pagado_mediana}%` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderEscalaLeyBadge(item.porc_pagado_mediana)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderRadioTeoricoBadge(item.radio_sueldo, item.radio_circ, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderRadioTeoricoBadge(item.radio_sueldo, item.radio_camino, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderDistanciaCamino(item.dist_camino, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {item.total_docentes_individuales !== null && item.total_docentes_individuales > 0 ? (
                        <button
                          onClick={() => abrirModalDocentes(item.centro, item.sector, item.radio_sige)}
                          className="px-2 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-sm font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                          title="Ver desglose individual de legajos"
                        >
                          <span className={item.docentes_desviados > 0 ? "text-amber-600 font-extrabold" : "text-gray-500 font-semibold"}>
                            {item.docentes_desviados} / {item.total_docentes_individuales}
                          </span>
                          {item.docentes_desviados > 0 ? (
                            <i className="fa-solid fa-circle-exclamation text-amber-500 text-xs animate-pulse"></i>
                          ) : (
                            <i className="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-black text-blue-900 flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-down text-blue-600"></i>
                Establecimientos que PAGAN MENOS que su Radio SIGE ({pagaMenosList.length})
              </h2>
              <p className="text-xs text-gray-600">
                Sectores donde los docentes perciben una bonificación inferior al radio oficial asignado a la escuela.
              </p>
            </div>
            <a
              href={`/api/auditoria-sueldos/exportar-excel?tab=paga_menos&periodo=${nominaSeleccionada?.periodo || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Descargar establecimientos que pagan menos en Excel"
            >
              <i className="fa-solid fa-file-excel text-sm"></i>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 shadow-xs">
                <tr>
                  <th className="px-3 py-3 text-center font-black text-white">Centro</th>
                  <th className="px-3 py-3 text-center font-black text-white">Sector</th>
                  <th className="px-3 py-3 font-black text-white">Establecimiento / Escuela</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center font-black text-white">Coincide SIGE vs Sueldo</th>
                  <th className="px-3 py-3 text-center font-black text-white">% Pagado</th>
                  <th className="px-3 py-3 text-center font-black text-white">Ley / Escala</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Circunferencia</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Camino</th>
                  <th className="px-3 py-3 text-center font-black text-white">Distancia Camino</th>
                  <th className="px-3 py-3 text-center font-black text-white">Docentes Desviados</th>
                  <th className="px-3 py-3 text-right font-black text-white">Liquidaciones</th>
                  <th className="px-3 py-3 text-center font-black text-white">Gestión</th>
                  <th className="px-3 py-3 text-center font-black text-white">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagaMenosList.map((item) => (
                  <tr key={item.id} className={`hover:bg-blue-50/50 ${!item.es_sector_nativo ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      {item.es_sector_nativo === 1 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[#FE8204] text-white font-black text-xs inline-block">
                          {item.centro ?? 'S/D'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-white text-[#FE8204] border border-[#FE8204]/40 font-black text-xs inline-block" title="Establecimiento con vinculación de sector manual">
                          {item.centro ?? 'S/D'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3">
                      <div className="font-extrabold text-gray-950 max-w-xs truncate">
                        {item.nombre_establecimiento || 'No Registrado'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                        {item.cue && <span>CUE: {item.cue}</span>}
                        {item.nivel_educativo && item.nivel_educativo !== 'GENERAL' && (
                          <span className="px-1 py-0.1 bg-gray-100 text-gray-700 rounded border font-semibold">
                            {item.nivel_educativo}
                          </span>
                        )}
                        {item.departamento && <span>• {item.departamento}</span>}
                        {item.es_sector_nativo === 1 ? (
                          <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-extrabold text-[9px] uppercase tracking-wide">
                            SIGE Oficial
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200 font-extrabold text-[9px] uppercase tracking-wide" title="Sector asociado manualmente al CUE en la auditoría">
                            Asociación Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-700">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-center font-black text-amber-600">
                      R{item.radio_sueldo}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderCoincideSigeSueldoBadge(item.radio_sige, item.radio_sueldo, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-900">
                      {item.porc_pagado_mediana ? `${item.porc_pagado_mediana}%` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderEscalaLeyBadge(item.porc_pagado_mediana)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderRadioTeoricoBadge(item.radio_sueldo, item.radio_circ, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderRadioTeoricoBadge(item.radio_sueldo, item.radio_camino, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderDistanciaCamino(item.dist_camino, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {item.total_docentes_individuales !== null && item.total_docentes_individuales > 0 ? (
                        <button
                          onClick={() => abrirModalDocentes(item.centro, item.sector, item.radio_sige)}
                          className="px-2 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-sm font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                          title="Ver desglose individual de legajos"
                        >
                          <span className={item.docentes_desviados > 0 ? "text-amber-600 font-extrabold" : "text-gray-500 font-semibold"}>
                            {item.docentes_desviados} / {item.total_docentes_individuales}
                          </span>
                          {item.docentes_desviados > 0 ? (
                            <i className="fa-solid fa-circle-exclamation text-amber-500 text-xs animate-pulse"></i>
                          ) : (
                            <i className="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-black text-purple-900 flex items-center gap-2">
                <i className="fa-solid fa-location-dot text-purple-600"></i>
                Inconsistencias de Letra de Zona ({zonasInconsistentesList.length} Sectores)
              </h2>
              <p className="text-xs text-gray-600">
                Sectores donde la letra de zona del recibo (ZONA sueldos) difiere de la letra registrada en el edificio (SIGE).
              </p>
            </div>
            <a
              href={`/api/auditoria-sueldos/exportar-excel?tab=zonas&periodo=${nominaSeleccionada?.periodo || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Descargar inconsistencias de letra de zona en Excel"
            >
              <i className="fa-solid fa-file-excel text-sm"></i>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 shadow-xs">
                <tr>
                  <th className="px-3 py-3 text-center font-black text-white">Centro</th>
                  <th className="px-3 py-3 text-center font-black text-white">Sector</th>
                  <th className="px-3 py-3 font-black text-white">Establecimiento / Escuela</th>
                  <th className="px-3 py-3 text-center font-black text-white">Zona Sueldos</th>
                  <th className="px-3 py-3 text-center font-black text-white">Zona SIGE</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center font-black text-white">Coincide SIGE vs Sueldo</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Circunferencia</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Camino</th>
                  <th className="px-3 py-3 text-center font-black text-white">Distancia Camino</th>
                  <th className="px-3 py-3 text-right font-black text-white">Liquidaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {zonasInconsistentesList.map((item) => (
                  <tr key={item.id} className={`hover:bg-purple-50/50 ${!item.es_sector_nativo ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      {item.es_sector_nativo === 1 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[#FE8204] text-white font-black text-xs inline-block">
                          {item.centro ?? 'S/D'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-white text-[#FE8204] border border-[#FE8204]/40 font-black text-xs inline-block" title="Establecimiento con vinculación de sector manual">
                          {item.centro ?? 'S/D'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3">
                      <div className="font-extrabold text-gray-950 max-w-xs truncate">{item.nombre_establecimiento || 'No Registrado'}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                        {item.cue && <span>CUE: {item.cue}</span>}
                        {item.departamento && <span>• {item.departamento}</span>}
                        {item.es_sector_nativo === 1 ? (
                          <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-extrabold text-[9px] uppercase tracking-wide">
                            SIGE Oficial
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200 font-extrabold text-[9px] uppercase tracking-wide" title="Sector asociado manualmente al CUE en la auditoría">
                            Asociación Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-red-600">{item.zona_sueldo}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-600">{item.zona_sige || '-'}</td>
                    <td className="px-3 py-3 text-center font-black text-gray-700">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-center font-black text-purple-800">R{item.radio_sueldo}</td>
                    <td className="px-3 py-3 text-center">
                      {renderCoincideSigeSueldoBadge(item.radio_sige, item.radio_sueldo, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderRadioTeoricoBadge(item.radio_sueldo, item.radio_circ, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderRadioTeoricoBadge(item.radio_sueldo, item.radio_camino, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderDistanciaCamino(item.dist_camino, item.cue)}
                    </td>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-black text-emerald-900 mb-2 flex items-center gap-2">
                <i className="fa-solid fa-list-check text-emerald-600"></i>
                Panel de Seguimiento y Gestión de Auditoría
              </h2>
              <p className="text-xs text-gray-600">
                Gestión del ciclo de vida de los sectores observados. Marque progresivamente los sectores como investigados o corregidos.
              </p>
            </div>
            <a
              href={`/api/auditoria-sueldos/exportar-excel?tab=tracking&periodo=${nominaSeleccionada?.periodo || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Descargar panel de seguimiento y gestión en Excel"
            >
              <i className="fa-solid fa-file-excel text-sm"></i>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 shadow-xs">
                <tr>
                  <th className="px-3 py-3 text-center font-black text-white">Centro</th>
                  <th className="px-3 py-3 text-center font-black text-white">Sector</th>
                  <th className="px-3 py-3 font-black text-white">Establecimiento / Escuela</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center font-black text-white">Coincide SIGE vs Sueldo</th>
                  <th className="px-3 py-3 text-center font-black text-white">% Pagado</th>
                  <th className="px-3 py-3 text-center font-black text-white">Ley / Escala</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Circunferencia</th>
                  <th className="px-3 py-3 text-center font-black text-white">Radio Camino</th>
                  <th className="px-3 py-3 text-center font-black text-white">Distancia Camino</th>
                  <th className="px-3 py-3 text-right font-black text-white">Liquidaciones</th>
                  <th className="px-3 py-3 text-center font-black text-white">Estado Gestión</th>
                  <th className="px-3 py-3 text-center font-black text-white">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedTracking.map((item) => (
                  <tr key={item.id} className={`hover:bg-emerald-50/50 ${!item.es_sector_nativo ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      {item.es_sector_nativo === 1 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[#FE8204] text-white font-black text-xs inline-block">
                          {item.centro ?? 'S/D'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-white text-[#FE8204] border border-[#FE8204]/40 font-black text-xs inline-block" title="Establecimiento con vinculación de sector manual">
                          {item.centro ?? 'S/D'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3">
                      <div className="font-extrabold text-gray-950 max-w-xs truncate">
                        {item.nombre_establecimiento || 'No Registrado'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                        {item.cue && <span>CUE: {item.cue}</span>}
                        {item.nivel_educativo && item.nivel_educativo !== 'GENERAL' && (
                          <span className="px-1 py-0.1 bg-gray-100 text-gray-700 rounded border font-semibold">
                            {item.nivel_educativo}
                          </span>
                        )}
                        {item.departamento && <span>• {item.departamento}</span>}
                        {item.es_sector_nativo === 1 ? (
                          <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-extrabold text-[9px] uppercase tracking-wide">
                            SIGE Oficial
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200 font-extrabold text-[9px] uppercase tracking-wide" title="Sector asociado manualmente al CUE en la auditoría">
                            Asociación Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-700">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-center font-black text-emerald-800">R{item.radio_sueldo || '-'}</td>
                    <td className="px-3 py-3 text-center">
                      {renderCoincideSigeSueldoBadge(item.radio_sige, item.radio_sueldo, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-gray-900">
                      {item.porc_pagado_mediana ? `${item.porc_pagado_mediana}%` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderEscalaLeyBadge(item.porc_pagado_mediana)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderRadioTeoricoBadge(item.radio_sueldo, item.radio_circ, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderRadioTeoricoBadge(item.radio_sueldo, item.radio_camino, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {renderDistanciaCamino(item.dist_camino, item.cue)}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-emerald-700">{item.total_filas_docentes}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          item.estado_gestion === 'DADO_DE_BAJA'
                            ? 'bg-red-100 text-red-800 border border-red-300 font-extrabold'
                            : item.estado_gestion === 'CONFORME'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : item.estado_gestion === 'CORREGIDO'
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
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pageTracking}
            totalPages={totalPagesTracking}
            onPageChange={setPageTracking}
            totalItems={linkedResultados.length}
            itemsName="sectores"
          />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-school text-[#FE8204]"></i>
                  Matriz de Relación de Escuelas y Sectores Presupuestarios
                </h2>
              </div>
              <a
                href={`/api/auditoria-sueldos/exportar-excel?tab=cruce&periodo=${nominaSeleccionada?.periodo || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Descargar matriz completa de Escuelas y Sectores en Excel"
              >
                <i className="fa-solid fa-file-excel text-sm"></i>
              </a>
            </div>

            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-xs text-left text-gray-700 border-collapse">
                <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 sticky top-0 shadow-xs">
                  <tr>
                    <th className="px-3 py-3 font-black text-white">Establecimiento / Escuela</th>
                    <th className="px-3 py-3 text-center font-black text-white">Sector SIGE</th>
                    <th className="px-3 py-3 text-center font-black text-white">Sector Sueldos</th>
                    <th className="px-3 py-3 text-center font-black text-white">Radio SIGE</th>
                    <th className="px-3 py-3 text-center font-black text-white">Radio Sueldo</th>
                    <th className="px-3 py-3 text-center font-black text-white">Coincide SIGE vs Sueldo</th>
                    <th className="px-3 py-3 text-center font-black text-white">% Pagado</th>
                    <th className="px-3 py-3 text-center font-black text-white">Ley / Escala</th>
                    <th className="px-3 py-3 text-center font-black text-white">Radio Circunferencia</th>
                    <th className="px-3 py-3 text-center font-black text-white">Radio Camino</th>
                    <th className="px-3 py-3 text-center font-black text-white">Distancia Camino</th>
                    <th className="px-3 py-3 text-center font-black text-white">Docentes Desviados</th>
                    <th className="px-3 py-3 text-right font-black text-white">Liquidaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedCruce.map((c, idx) => {
                    const isSector0 = c.sector_sige === '0' || c.sector_sige === 0 || !c.sector_sige;
                    const hasCue = !isSector0 && c.cue;

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-3">
                          <div className="font-extrabold text-gray-950 leading-tight">{c.nombre_establecimiento}</div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold mt-0.5">
                            {c.cue && <span>CUE: {c.cue}</span>}
                            {c.nivel_educativo && <span className="px-1 py-0.1 bg-gray-100 text-gray-700 rounded border">{c.nivel_educativo}</span>}
                            {c.departamento && <span>• {c.departamento}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-black text-sm">
                          {isSector0 ? (
                            <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">0</span>
                          ) : (
                            <span className="text-gray-950 font-bold">{c.sector_sige}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-black text-sm">
                          {c.sector_sueldos !== null && c.sector_sueldos !== undefined ? (
                            <span className="text-purple-950 font-bold bg-purple-100/60 px-2 py-0.5 rounded-lg border border-purple-200">{c.sector_sueldos}</span>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-emerald-700">R{c.radio_sige || '-'}</td>
                        <td className="px-3 py-3 text-center font-black text-purple-700">
                          {c.radio_sueldo !== null ? `R${c.radio_sueldo}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-center bg-amber-50/40 border-x border-amber-100">
                          {renderCoincideSigeSueldoBadge(c.radio_sige, c.radio_sueldo, hasCue)}
                        </td>
                        <td className="px-3 py-3 text-center font-black text-gray-900">
                          {c.porc_pagado_mediana ? `${c.porc_pagado_mediana}%` : '-'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {renderEscalaLeyBadge(c.porc_pagado_mediana)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {renderRadioTeoricoBadge(c.radio_sueldo, c.radio_circ, hasCue)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {renderRadioTeoricoBadge(c.radio_sueldo, c.radio_camino, hasCue)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {renderDistanciaCamino(c.dist_camino, hasCue)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {c.total_docentes_individuales !== null && c.total_docentes_individuales > 0 ? (
                            <button
                              onClick={() => abrirModalDocentes(c.centro, c.sector_sige || c.sector_sueldos, c.radio_sige)}
                              className="px-2 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-sm font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                              title="Ver desglose individual de legajos"
                            >
                              <span className={c.docentes_desviados > 0 ? "text-amber-600 font-extrabold" : "text-gray-500 font-semibold"}>
                                {c.docentes_desviados} / {c.total_docentes_individuales}
                              </span>
                              {c.docentes_desviados > 0 ? (
                                <i className="fa-solid fa-circle-exclamation text-amber-500 text-xs animate-pulse"></i>
                              ) : (
                                <i className="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-gray-700">
                          {c.total_filas_docentes !== null ? c.total_filas_docentes : 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={pageCruce}
              totalPages={totalPagesCruce}
              onPageChange={setPageCruce}
              totalItems={filteredCruce.length}
              itemsName="establecimientos"
            />
          </GlassCard>
        </div>
      )}

      {/* TAB: SECTORES SIN IDENTIFICARSE (INVESTIGACIÓN & DEPURACIÓN DE CENTROS/SECTORES) */}
      {activeTab === 'sin_escuela' && (
        <div className="space-y-6">
          {/* SUB-TAB 1: DEPURACIÓN DE CENTROS Y SECTORES (MAESTRO VS SUELDOS) */}
          {subTabOtrosSectores === 'depuracion' && (
            <GlassCard className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-filter-circle-dollar text-[#FE8204]"></i>
                    <span>Depuración & Diagnóstico de Centros y Sectores Sin Uso ({depuracionStats.total})</span>
                  </h2>

                  {/* Filtros métricos inline (icono + valor) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setDepuracionFiltroEstado(depuracionFiltroEstado === 'CENTRO_SIN_USO' ? 'TODOS' : 'CENTRO_SIN_USO')}
                      className={`py-1 px-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        depuracionFiltroEstado === 'CENTRO_SIN_USO'
                          ? 'bg-red-600 text-white shadow-xs border border-red-600'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      }`}
                      title="Centros Sin Uso"
                    >
                      <i className={`fa-solid fa-circle text-[10px] ${depuracionFiltroEstado === 'CENTRO_SIN_USO' ? 'text-white' : 'text-red-500'}`}></i>
                      <span>Centros Sin Uso</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                        depuracionFiltroEstado === 'CENTRO_SIN_USO' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800'
                      }`}>
                        {depuracionStats.centroSinUso}
                      </span>
                    </button>

                    <button
                      onClick={() => setDepuracionFiltroEstado(depuracionFiltroEstado === 'SUELDO_NO_CATALOGADO' ? 'TODOS' : 'SUELDO_NO_CATALOGADO')}
                      className={`py-1 px-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        depuracionFiltroEstado === 'SUELDO_NO_CATALOGADO'
                          ? 'bg-amber-600 text-white shadow-xs border border-amber-600'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      }`}
                      title="No Catalogados"
                    >
                      <i className={`fa-solid fa-triangle-exclamation text-xs ${depuracionFiltroEstado === 'SUELDO_NO_CATALOGADO' ? 'text-white' : 'text-amber-500'}`}></i>
                      <span>No Catalogados</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                        depuracionFiltroEstado === 'SUELDO_NO_CATALOGADO' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {depuracionStats.noCatalogado}
                      </span>
                    </button>

                    <button
                      onClick={() => setDepuracionFiltroEstado(depuracionFiltroEstado === 'SECTOR_SIN_USO' ? 'TODOS' : 'SECTOR_SIN_USO')}
                      className={`py-1 px-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        depuracionFiltroEstado === 'SECTOR_SIN_USO'
                          ? 'bg-yellow-600 text-white shadow-xs border border-yellow-600'
                          : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
                      }`}
                      title="Sectores Sin Uso"
                    >
                      <i className={`fa-solid fa-circle text-[10px] ${depuracionFiltroEstado === 'SECTOR_SIN_USO' ? 'text-white' : 'text-yellow-400'}`}></i>
                      <span>Sectores Sin Uso</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                        depuracionFiltroEstado === 'SECTOR_SIN_USO' ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-900'
                      }`}>
                        {depuracionStats.sectorSinUso}
                      </span>
                    </button>

                    <button
                      onClick={() => setDepuracionFiltroEstado(depuracionFiltroEstado === 'ACTIVO' ? 'TODOS' : 'ACTIVO')}
                      className={`py-1 px-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        depuracionFiltroEstado === 'ACTIVO'
                          ? 'bg-emerald-600 text-white shadow-xs border border-emerald-600'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                      title="Activos"
                    >
                      <i className={`fa-solid fa-circle text-[10px] ${depuracionFiltroEstado === 'ACTIVO' ? 'text-white' : 'text-emerald-500'}`}></i>
                      <span>Activos</span>
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                        depuracionFiltroEstado === 'ACTIVO' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {depuracionStats.activos}
                      </span>
                    </button>
                  </div>
                </div>

                <a
                  href="/api/auditoria-sueldos/exportar-depuracion-excel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="Descargar Reporte Depuración Excel"
                >
                  <i className="fa-solid fa-file-excel text-sm"></i>
                </a>
              </div>

              {/* Búsqueda, Filtro de Vinculados y Ordenamiento rápida de Depuración */}
              <div className="mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex-1 flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="text"
                    value={depuracionBusqueda}
                    onChange={(e) => setDepuracionBusqueda(e.target.value)}
                    placeholder="Buscar en depuración por centro, sector, nombre de sector, o diagnóstico..."
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2 text-xs font-semibold text-gray-900 focus:ring-[#FE8204] focus:border-[#FE8204]"
                  />
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 shrink-0 select-none shadow-2xs">
                    <input
                      type="checkbox"
                      checked={depuracionSoloNoVinculados}
                      onChange={(e) => setDepuracionSoloNoVinculados(e.target.checked)}
                      className="w-4 h-4 text-[#FE8204] rounded border-gray-300 focus:ring-[#FE8204]"
                    />
                    <span className="whitespace-nowrap flex items-center gap-1.5">
                      <i className="fa-solid fa-link-slash text-amber-600 text-xs"></i>
                      Solo pendientes (sin vincular)
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <i className="fa-solid fa-arrow-down-a-z text-[#FE8204]"></i> Ordenar:
                  </label>
                  <select
                    value={depuracionSortField}
                    onChange={(e) => {
                      setDepuracionSortField(e.target.value);
                      setDepuracionSortOrder('asc');
                    }}
                    className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 focus:ring-[#FE8204]"
                  >
                    <option value="nom_sector">Nombre del Sector (Alfabético)</option>
                    <option value="nom_centro">Nombre del Centro</option>
                    <option value="sector">Número de Sector</option>
                    <option value="centro">Número de Centro</option>
                    <option value="cantidad_liquidaciones">Cantidad de Liquidaciones</option>
                    <option value="estado_depuracion">Estado Depuración</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Depuración */}
              <div className="overflow-x-auto max-h-[650px] custom-scrollbar border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left text-gray-700">
                  <thead className="text-[10px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 sticky top-0 shadow-xs select-none whitespace-nowrap">
                    <tr>
                      <th onClick={() => handleDepuracionSort('centro')} className="px-2.5 py-2.5 text-center font-black text-white cursor-pointer hover:bg-[#e07203] whitespace-nowrap">
                        Centro {renderDepuracionSortIcon('centro')}
                      </th>
                      <th onClick={() => handleDepuracionSort('nom_centro')} className="px-2.5 py-2.5 font-black text-white cursor-pointer hover:bg-[#e07203] whitespace-nowrap">
                        Nombre Centro {renderDepuracionSortIcon('nom_centro')}
                      </th>
                      <th onClick={() => handleDepuracionSort('sector')} className="px-2.5 py-2.5 text-center font-black text-white cursor-pointer hover:bg-[#e07203] whitespace-nowrap">
                        Sector {renderDepuracionSortIcon('sector')}
                      </th>
                      <th onClick={() => handleDepuracionSort('nom_sector')} className="px-2.5 py-2.5 font-black text-white cursor-pointer hover:bg-[#e07203] whitespace-nowrap">
                        Nombre Sector {renderDepuracionSortIcon('nom_sector')}
                      </th>
                      <th className="px-2.5 py-2.5 font-black text-white whitespace-nowrap">Nivel / Gestión</th>
                      <th className="px-2.5 py-2.5 font-black text-white whitespace-nowrap">Establecimiento Vinculado</th>
                      <th onClick={() => handleDepuracionSort('cantidad_liquidaciones')} className="px-2.5 py-2.5 text-center font-black text-white cursor-pointer hover:bg-[#e07203] whitespace-nowrap">
                        Liquidaciones {renderDepuracionSortIcon('cantidad_liquidaciones')}
                      </th>
                      <th onClick={() => handleDepuracionSort('estado_depuracion')} className="px-2.5 py-2.5 text-center font-black text-white cursor-pointer hover:bg-[#e07203] whitespace-nowrap">
                        Estado Depuración {renderDepuracionSortIcon('estado_depuracion')}
                      </th>
                      <th className="px-2.5 py-2.5 font-black text-white whitespace-nowrap">Diagnóstico / Observaciones</th>
                      <th className="px-2.5 py-2.5 text-center font-black text-white whitespace-nowrap">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[11px]">
                    {paginatedDepuracion.map((d) => (
                      <tr key={`dep-${d.centro}-${d.sector}-${d.id}`} className="hover:bg-slate-50">
                        <td className="px-2.5 py-2 text-center font-black text-slate-900 bg-slate-100/80 rounded-lg whitespace-nowrap">{d.centro}</td>
                        <td className="px-2.5 py-2 font-bold text-gray-900 whitespace-nowrap">{d.nom_centro || 'S/D'}</td>
                        <td className="px-2.5 py-2 text-center font-black text-gray-900 whitespace-nowrap">{d.sector}</td>
                        <td className="px-2.5 py-2 font-semibold text-gray-800 whitespace-nowrap">{d.nom_sector || 'S/D'}</td>
                        <td className="px-2.5 py-2 text-gray-600 font-medium whitespace-nowrap">
                          {d.nivel || 'S/N'} {d.gestion ? `(${d.gestion})` : ''}
                        </td>
                        <td className="px-2.5 py-2">
                          {d.cue_vinculado ? (
                            <div>
                              <div className="font-extrabold text-slate-950 leading-tight">{d.nom_establecimiento_vinculado}</div>
                              <div className="text-[10px] text-gray-500 font-semibold mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                                <span>CUE: {d.cue_vinculado}</span>
                                {d.nivel_educativo_vinculado && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-black bg-purple-100 text-purple-800 rounded border border-purple-200 uppercase">
                                    {d.nivel_educativo_vinculado}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic whitespace-nowrap">No Vinculado</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-center font-black text-xs whitespace-nowrap">
                          {d.cantidad_liquidaciones}
                        </td>
                        <td className="px-2.5 py-2 text-center whitespace-nowrap">
                          {d.estado_depuracion === 'CENTRO_SIN_USO' && (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-red-100 text-red-800 border border-red-300 inline-flex items-center gap-1 whitespace-nowrap">🔴 CENTRO SIN USO</span>
                          )}
                          {d.estado_depuracion === 'SUELDO_NO_CATALOGADO' && (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 whitespace-nowrap">⚠️ NO CATALOGADO</span>
                          )}
                          {d.estado_depuracion === 'SECTOR_SIN_USO' && (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-yellow-100 text-yellow-900 border border-yellow-300 inline-flex items-center gap-1 whitespace-nowrap">🟡 SECTOR SIN USO</span>
                          )}
                          {(d.estado_depuracion === 'ACTIVO' || d.estado_depuracion === 'BAJA_VOLUMETRÍA') && (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 whitespace-nowrap">🟢 ACTIVO</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 font-medium text-gray-600 text-[11px] max-w-[280px] xl:max-w-[400px] whitespace-normal leading-snug break-words">
                          {cleanObservaciones(d.observaciones)}
                        </td>
                        <td className="px-2.5 py-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSanearDepuracionModalItem(d);
                              setSanearDepEstId(d.establecimiento_id ? d.establecimiento_id.toString() : '');
                              setSanearDepModalidadId(d.modalidad_id ? d.modalidad_id.toString() : '');
                              setSanearDepSearchTerm('');
                              setSanearDepObs(cleanObservaciones(d.observaciones));
                              setSanearDepEstado(d.estado_depuracion || 'ACTIVO');
                            }}
                            className={`px-2.5 py-1 text-[10px] font-black text-white rounded-lg shadow-sm transition-all inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                              d.estado_depuracion === 'SUELDO_NO_CATALOGADO'
                                ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-400/50'
                                : d.estado_depuracion === 'CENTRO_SIN_USO'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-[#FE8204] hover:bg-[#e07203]'
                            }`}
                          >
                            <i className="fa-solid fa-pen-to-square text-[9px]"></i>
                            <span>Sanear / Vincular</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredDepuracion.length === 0 && (
                      <tr>
                        <td colSpan="10" className="px-3 py-8 text-center text-gray-400 font-medium italic">
                          No se encontraron registros de depuración para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={pageDepuracion}
                totalPages={totalPagesDepuracion}
                onPageChange={setPageDepuracion}
                totalItems={filteredDepuracion.length}
                itemsName="centros y sectores"
              />
            </GlassCard>
          )}

          {/* SUB-TAB 2: SECTORES SIN ESCUELA (SANEAMIENTO & VINCULACIÓN CUE) */}
          {subTabOtrosSectores === 'saneamiento' && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-link text-[#FE8204]"></i>
                  <span>Saneamiento & Vinculación CUE ({unlinkedResultados.length})</span>
                </h2>
                <a
                  href={`/api/auditoria-sueldos/exportar-excel?tab=sin_escuela&periodo=${nominaSeleccionada?.periodo || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="Descargar Otros Sectores en Excel"
                >
                  <i className="fa-solid fa-file-excel text-sm"></i>
                </a>
              </div>

              <div className="overflow-x-auto max-h-96 custom-scrollbar">
                <table className="w-full text-xs text-left text-gray-700">
                  <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 shadow-xs">
                    <tr>
                      <th className="px-3 py-3 text-center font-black text-white">Centro</th>
                      <th className="px-3 py-3 font-black text-white">Nivel</th>
                      <th className="px-3 py-3 font-black text-white">Nombre Sector</th>
                      <th className="px-3 py-3 text-center font-black text-white">Sector</th>
                      <th className="px-3 py-3 font-black text-white">Identificación / Gestión</th>
                      <th className="px-3 py-3 text-center font-black text-white">Radio Sueldo</th>
                      <th className="px-3 py-3 text-right font-black text-white">Liquidaciones</th>
                      <th className="px-3 py-3 text-center font-black text-white">Acción Saneamiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {unlinkedResultados.map((s) => {
                      const isDadoDeBaja = s.estado_gestion === 'DADO_DE_BAJA';
                      return (
                        <tr key={s.id} className={isDadoDeBaja ? 'bg-red-50/90 text-red-950 font-semibold border-l-4 border-l-red-500' : 'hover:bg-slate-50/50'}>
                          <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-lg bg-[#FE8204] text-white font-black text-xs inline-block">{s.centro ?? 'S/D'}</span></td>
                          <td className={`px-3 py-3 font-extrabold ${isDadoDeBaja ? 'text-red-900' : 'text-slate-800'}`}>{s.nivel_educativo || 'S/N'}</td>
                          <td className="px-3 py-3 font-bold">
                            {isDadoDeBaja ? (
                              <div className="flex items-center gap-1.5 text-red-900 font-extrabold">
                                <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-800 border border-red-300 rounded-md uppercase font-black shrink-0">
                                  DADO DE BAJA
                                </span>
                                <span>{s.nombre_establecimiento || 'Sector Desvinculado'}</span>
                              </div>
                            ) : (
                              <span className="text-gray-900">{s.nombre_establecimiento || 'Sector Desvinculado'}</span>
                            )}
                          </td>
                          <td className={`px-3 py-3 text-center font-black text-sm ${isDadoDeBaja ? 'text-red-950' : 'text-gray-900'}`}>{s.sector}</td>
                          <td className={`px-3 py-3 font-medium max-w-xs truncate ${isDadoDeBaja ? 'text-red-700 font-bold' : 'text-gray-600'}`}>
                            {s.notas_auditor || <span className="italic text-gray-400">Sin notas de investigación</span>}
                          </td>
                          <td className="px-3 py-3 text-center font-black">
                            {s.radio_sueldo ? (
                              <span className={isDadoDeBaja ? 'text-red-900' : 'text-purple-700'}>R{s.radio_sueldo} ({s.porc_pagado_mediana ?? 0}%)</span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]" title="No registra bonificación por zona (Radio Urbano)">R1 (0%)</span>
                            )}
                          </td>
                          <td className={`px-3 py-3 text-right font-bold ${isDadoDeBaja ? 'text-red-950' : 'text-gray-900'}`}>
                            {s.total_filas_docentes} docentes
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => {
                                setSaneamientoModalSector(s);
                                setSaneamientoEstId('');
                                setSaneamientoSearchTerm('');
                                setSaneamientoObs(s.notas_auditor || '');
                                setSaneamientoEstadoGestion(s.estado_gestion || 'EN_INVESTIGACION');
                              }}
                              className={`px-3 py-1.5 text-[11px] font-bold text-white rounded-xl shadow transition flex items-center gap-1.5 mx-auto cursor-pointer ${
                                isDadoDeBaja ? 'bg-red-600 hover:bg-red-700' : 'bg-[#FE8204] hover:bg-[#e07203]'
                              }`}
                            >
                              <i className={`fa-solid ${isDadoDeBaja ? 'fa-pen-to-square' : 'fa-link'} text-[10px]`}></i>
                              {isDadoDeBaja ? 'Editar Baja' : 'Vincular a CUE'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {unlinkedResultados.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-3 py-8 text-center text-gray-400 font-medium italic">
                          No hay sectores desvinculados en esta nómina.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* SUB-TAB 3: REGISTROS RESIDUALES SIN ESCUELA */}
          {subTabOtrosSectores === 'residuales' && (
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
                  <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 shadow-xs">
                    <tr>
                      <th className="px-3 py-3 text-center font-black text-white">Centro</th>
                      <th className="px-3 py-3 text-center font-black text-white">Sector</th>
                      <th className="px-3 py-3 text-center font-black text-white">Radio Sueldo</th>
                      <th className="px-3 py-3 text-right font-black text-white">Básico A01</th>
                      <th className="px-3 py-3 text-right font-black text-white">Monto A04</th>
                      <th className="px-3 py-3 font-black text-white">Dictamen</th>
                      <th className="px-3 py-3 font-black text-white">Decreto Aval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUnlinkedViejos.map((v) => (
                      <tr key={v.id} className="hover:bg-amber-50/50">
                        <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 rounded-lg bg-[#FE8204] text-white font-black text-xs inline-block">{v.centro ?? 'S/D'}</span></td>
                        <td className="px-3 py-2 text-center font-black text-gray-900">{v.sector}</td>
                        <td className="px-3 py-2 text-center font-black text-amber-800 text-xs">
                          R{v.radio_sueldo} ({v.porcentaje_pagado}%)
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
          )}
        </div>
      )}

      {/* SANEAMIENTO MODAL */}
      {saneamientoModalSector && (() => {
        const estSeleccionado = establecimientosList.find(e => Number(e.id) === Number(saneamientoEstId));
        const radioDifiere = estSeleccionado && estSeleccionado.radio !== null && Number(estSeleccionado.radio) !== Number(saneamientoModalSector.radio_sueldo);

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-wand-magic-sparkles text-[#FE8204]"></i>
                  Asociar Sector {saneamientoModalSector.sector} en Auditoría
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
                  <div><b className="text-orange-950">Centro:</b> {saneamientoModalSector.centro ?? 'S/D'} | <b className="text-orange-950">Sector:</b> {saneamientoModalSector.sector}</div>
                  {saneamientoModalSector.nivel_educativo && <div><b className="text-orange-950">Nivel Refactorizado:</b> {saneamientoModalSector.nivel_educativo}</div>}
                  {saneamientoModalSector.nombre_establecimiento && <div><b className="text-orange-950">Nombre Sector:</b> {saneamientoModalSector.nombre_establecimiento}</div>}
                  <div><b className="text-orange-950">Radio Liquidado:</b> {saneamientoModalSector.radio_sueldo ? `Radio ${saneamientoModalSector.radio_sueldo} (${saneamientoModalSector.porc_pagado_mediana ?? 0}%)` : 'Radio 1 (0% - Sin Bonificación)'}</div>
                  <div><b className="text-orange-950">Docentes liquidados:</b> {saneamientoModalSector.total_filas_docentes}</div>
                </div>

                {saneamientoEstadoGestion === 'DADO_DE_BAJA' && !saneamientoEstId && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                    <i className="fa-solid fa-circle-info text-red-600 text-sm shrink-0"></i>
                    <span><b>Modo Baja Activado:</b> No requiere seleccionar una escuela. Al hacer clic en <b>&quot;Confirmar Baja de Sector&quot;</b> se guardará el estado de baja en Otros Sectores con letras rojas.</span>
                  </div>
                )}

                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Buscar Escuela / CUE Destino a Vincular:
                  </label>
                  
                  {saneamientoEstId && estSeleccionado ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                          <i className="fa-solid fa-building-columns text-emerald-600"></i>
                          <span>{estSeleccionado.nombre}</span>
                        </div>
                        <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
                          CUE: <span className="font-mono font-bold text-emerald-950">{estSeleccionado.cue}</span> • {estSeleccionado.departamento} (Radio SIGE: {estSeleccionado.radio ?? 'S/D'})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSaneamientoEstId('');
                          setSaneamientoSearchTerm('');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg transition cursor-pointer shrink-0"
                      >
                        <i className="fa-solid fa-arrows-rotate mr-1"></i> Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        value={saneamientoSearchTerm}
                        onChange={(e) => setSaneamientoSearchTerm(e.target.value)}
                        placeholder="Escriba CUE (ej. 700069900) o nombre de la escuela..."
                        className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-8 py-2.5 focus:ring-[#FE8204] focus:border-[#FE8204]"
                      />
                      {saneamientoSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setSaneamientoSearchTerm('')}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}

                      {/* Dropdown list of filtered results */}
                      {saneamientoSearchTerm.trim().length >= 2 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100">
                          {(() => {
                            const term = saneamientoSearchTerm.toLowerCase().trim();
                            const matches = establecimientosList
                              .filter(est =>
                                (est.cue && est.cue.toString().includes(term)) ||
                                (est.nombre && est.nombre.toLowerCase().includes(term)) ||
                                (est.departamento && est.departamento.toLowerCase().includes(term))
                              )
                              .slice(0, 15);

                            if (matches.length === 0) {
                              return (
                                <div className="p-4 text-center text-xs text-gray-500 italic">
                                  {`No se encontraron escuelas que coincidan con "${saneamientoSearchTerm}"`}
                                </div>
                              );
                            }

                            return matches.map((est) => (
                              <button
                                key={est.id}
                                type="button"
                                onClick={() => {
                                  setSaneamientoEstId(est.id);
                                  setSaneamientoSearchTerm(`${est.nombre} (CUE: ${est.cue})`);
                                }}
                                className="w-full text-left p-3 hover:bg-orange-50/80 transition flex items-start justify-between gap-2 cursor-pointer"
                              >
                                <div>
                                  <div className="font-bold text-xs text-gray-900">{est.nombre}</div>
                                  <div className="text-[11px] text-gray-500 font-medium">
                                    CUE: <span className="font-mono font-bold text-gray-800">{est.cue}</span> • {est.departamento}
                                  </div>
                                </div>
                                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  Radio SIGE {est.radio ?? 'S/D'}
                                </span>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {!saneamientoEstId && saneamientoSearchTerm.trim().length < 2 && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      💡 Escriba al menos 2 números o letras para buscar entre todas las escuelas.
                    </p>
                  )}
                </div>

                {estSeleccionado && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                    radioDifiere ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5">
                      <i className={`fa-solid ${radioDifiere ? 'fa-triangle-exclamation text-amber-600' : 'fa-circle-check text-emerald-600'}`}></i>
                      <span>Comparación de Radios:</span>
                    </div>
                    <div>
                      • Radio Liquidado en Sector: <b>{saneamientoModalSector.radio_sueldo ? `Radio ${saneamientoModalSector.radio_sueldo}` : 'Radio 1 (0% Zona)'}</b>
                    </div>
                    <div>
                      • Radio Oficial CUE ({estSeleccionado.cue}): <b>Radio {estSeleccionado.radio ?? 'S/D'}</b>
                    </div>
                    {radioDifiere && (
                      <p className="mt-1 text-[11px] font-semibold text-amber-800 italic">
                        ⚠️ Este sector liquida un radio distinto al CUE oficial. El sistema registrará la discrepancia para investigación de auditoría.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Estado de Gestión / Auditoría:
                  </label>
                  <select
                    value={saneamientoEstadoGestion}
                    onChange={(e) => setSaneamientoEstadoGestion(e.target.value)}
                    className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 focus:ring-[#FE8204] focus:border-[#FE8204] cursor-pointer"
                  >
                    <option value="CONFORME">CONFORME / VALIDADO (SIN INCONSISTENCIAS)</option>
                    <option value="DADO_DE_BAJA">DADO DE BAJA / ESCUELA CERRADA O CAMBIADA</option>
                    <option value="EN_INVESTIGACION">EN INVESTIGACIÓN</option>
                    <option value="JUSTIFICADO">JUSTIFICADO (CON NORMA LEGAL / RESOLUCIÓN)</option>
                    <option value="CORREGIDO">CORREGIDO EN NÓMINA</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                  </select>
                </div>

                {/* Anexos / CUEs Adicionales que usan este Sector */}
                <div className="space-y-2 border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                      <i className="fa-solid fa-code-branch text-[#FE8204]"></i>
                      Anexos / CUEs Adicionales que usan este Sector:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddAnexoSearch(!showAddAnexoSearch)}
                      className="px-2.5 py-1 text-[10px] font-black text-white bg-[#FE8204] hover:bg-[#e07203] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus"></i> Agregar Anexo
                    </button>
                  </div>

                  {showAddAnexoSearch && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-slate-800">Buscar CUE o Nombre de Anexo:</div>
                      <div className="relative">
                        <input
                          type="text"
                          value={anexoSearchTerm}
                          onChange={(e) => setAnexoSearchTerm(e.target.value)}
                          placeholder="Escriba CUE o nombre..."
                          className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-[#FE8204]"
                        />
                      </div>
                      {anexoSearchTerm.trim().length >= 2 && (
                        <div className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-lg">
                          {establecimientosList
                            .filter(est =>
                              (est.cue && est.cue.toString().includes(anexoSearchTerm.toLowerCase().trim())) ||
                              (est.nombre && est.nombre.toLowerCase().includes(anexoSearchTerm.toLowerCase().trim())) ||
                              (est.departamento && est.departamento.toLowerCase().includes(anexoSearchTerm.toLowerCase().trim()))
                            )
                            .slice(0, 10)
                            .map(anx => {
                              const radioAnxDifiere = anx.radio !== null && saneamientoModalSector && Number(anx.radio) !== Number(saneamientoModalSector.radio_sueldo);
                              return (
                                <button
                                  key={anx.id}
                                  type="button"
                                  onClick={() => {
                                    if (!saneamientoAnexos.some(a => a.id === anx.id)) {
                                      setSaneamientoAnexos([...saneamientoAnexos, anx]);
                                    }
                                    setAnexoSearchTerm('');
                                    setShowAddAnexoSearch(false);
                                  }}
                                  className="w-full text-left p-2.5 hover:bg-orange-50 transition flex items-center justify-between gap-2 cursor-pointer"
                                >
                                  <div>
                                    <div className="font-bold text-xs text-gray-900">{anx.nombre}</div>
                                    <div className="text-[11px] text-gray-500 font-medium">CUE: <b className="font-mono">{anx.cue}</b> • {anx.departamento}</div>
                                  </div>
                                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    radioAnxDifiere ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    Radio SIGE {anx.radio ?? 'S/D'}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {saneamientoAnexos.length > 0 ? (
                    <div className="space-y-1.5">
                      {saneamientoAnexos.map((anx) => {
                        const radioAnxDifiere = anx.radio !== null && saneamientoModalSector && Number(anx.radio) !== Number(saneamientoModalSector.radio_sueldo);
                        return (
                          <div key={anx.id} className="p-2.5 bg-orange-50/60 border border-orange-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                            <div>
                              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-code-branch text-[#FE8204]"></i>
                                <span>Anexo: {anx.nombre}</span>
                              </div>
                              <div className="text-[11px] text-slate-700 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                                <span>CUE: <b className="font-mono text-slate-900">{anx.cue}</b></span>
                                <span>• Radio SIGE: <b>Radio {anx.radio ?? 'S/D'}</b></span>
                                {radioAnxDifiere && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-black bg-amber-200 text-amber-950 border border-amber-400 rounded uppercase">
                                    ⚠️ Radio Incompatible
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSaneamientoAnexos(saneamientoAnexos.filter(a => a.id !== anx.id))}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold p-1 cursor-pointer"
                              title="Quitar Anexo"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">
                      Sin anexos adicionales vinculados. Haz clic en &quot;+ Agregar Anexo&quot; si este sector también es usado por otros anexos/edificios.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Observaciones / Expediente / Justificación:
                  </label>
                  <textarea
                    rows={3}
                    value={saneamientoObs}
                    onChange={(e) => setSaneamientoObs(e.target.value)}
                    placeholder="Ej. Sector 203 pertenece a la E.E.E. Nicomedes Pinto. Registrado en expediente de investigación..."
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-[#FE8204]"
                  ></textarea>
                </div>

                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-800 leading-tight">
                  <i className="fa-solid fa-circle-info text-sky-600 mr-1"></i>
                  <b>Protección de Datos:</b> La vinculación se guardará exclusivamente en el historial de auditoría de sueldos. El padrón oficial de establecimientos (SIGE) no sufrirá ningún cambio.
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
                  disabled={sanearSubmitting || (!saneamientoEstId && saneamientoEstadoGestion !== 'DADO_DE_BAJA')}
                  onClick={() => handleSanearSectorSubmit(saneamientoModalSector.sector)}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer ${
                    saneamientoEstadoGestion === 'DADO_DE_BAJA'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#FE8204] hover:bg-[#FE8204]/90'
                  }`}
                >
                  {sanearSubmitting
                    ? 'Guardando...'
                    : saneamientoEstadoGestion === 'DADO_DE_BAJA'
                    ? 'Confirmar Baja de Sector'
                    : 'Registrar en Auditoría'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                  <option value="CONFORME">CONFORME / VALIDADO (SIN INCONSISTENCIAS)</option>
                  <option value="DADO_DE_BAJA">DADO DE BAJA / ESCUELA CERRADA O CAMBIADA</option>
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
          <div className="bg-white rounded-3xl p-6 max-w-6xl w-full shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 mb-4 shrink-0">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                Establecimientos en Conflicto Interno — Sector SIGE {conflictosModalData.sector}
              </h3>
              <button
                onClick={() => setConflictosModalData(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-hidden flex flex-col flex-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 shrink-0">
                <div><b className="text-amber-950">Radios detectados en SIGE:</b> [{conflictosModalData.radios}]</div>
                <div><b className="text-amber-950">Niveles educativos afectados:</b> {conflictosModalData.niveles}</div>
              </div>

              <div className="overflow-y-auto border border-gray-200 rounded-2xl custom-scrollbar flex-1">
                <table className="w-full text-xs text-left text-gray-700">
                  <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 sticky top-0 shadow-xs">
                    <tr>
                      <th className="px-3 py-2.5 font-black text-white">CUE</th>
                      <th className="px-3 py-2.5 font-black text-white">Establecimiento / Escuela</th>
                      <th className="px-3 py-2.5 font-black text-white">Ámbito</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Centro</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Sector SIGE</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Sector Sueldos</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Radio SIGE</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Radio Sueldo</th>
                      <th className="px-3 py-2.5 font-black text-white">CUI Edificio</th>
                      <th className="px-3 py-2.5 font-black text-white">Departamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {conflictosModalData.escuelas.map((e, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/70">
                        <td className="px-3 py-2.5 font-mono text-gray-500">
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
                        <td className="px-3 py-2.5 font-bold text-gray-900">{e.nombre}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            e.ambito === 'PRIVADO' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {e.ambito === 'PRIVADO' ? 'PRIVADO' : 'PÚBLICO'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-black">
                          <span className="text-amber-950 font-bold bg-amber-100/60 px-2 py-0.5 rounded-lg border border-amber-200">
                            {e.centro ? e.centro : 'S/D'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-black text-gray-900">
                          {conflictosModalData.sector}
                        </td>
                        <td className="px-3 py-2.5 text-center font-black">
                          {e.sector_sueldos ? (
                            <span className="text-purple-950 font-bold bg-purple-100/60 px-2 py-0.5 rounded-lg border border-purple-200">{e.sector_sueldos}</span>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-700">R{e.radio}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-purple-700">
                          {e.radio_sueldo ? `R${e.radio_sueldo}` : '-'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-gray-500">
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
                        <td className="px-3 py-2.5 text-gray-700 font-semibold">{e.departamento}</td>
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

      {/* MODAL SANEAR / VINCULAR DEPURACIÓN */}
      {sanearDepuracionModalItem && (
        <Modal show={Boolean(sanearDepuracionModalItem)} onClose={() => setSanearDepuracionModalItem(null)}>
          <div className="p-6">
            <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
              <i className="fa-solid fa-file-pen text-[#FE8204]"></i>
              Sanear Depuración: Centro {sanearDepuracionModalItem.centro} / Sector {sanearDepuracionModalItem.sector}
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Vinculá esta combinación a una Escuela/CUE oficial o actualizá su estado de depuración u observaciones.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Buscar y Seleccionar Escuela (CUE):</label>
                <input
                  type="text"
                  placeholder="Buscar CUE o Nombre de Escuela..."
                  value={sanearDepSearchTerm}
                  onChange={(e) => setSanearDepSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:ring-[#FE8204]"
                />
                <select
                  value={sanearDepEstId}
                  onChange={(e) => setSanearDepEstId(e.target.value)}
                  className="w-full mt-2 bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:ring-[#FE8204]"
                  size="5"
                >
                  <option value="">-- No vincular a CUE (Mantener desvinculado) --</option>
                  {establecimientosList
                    .filter((e) => {
                      if (!sanearDepSearchTerm) return true;
                      const term = sanearDepSearchTerm.toLowerCase();
                      return (
                        (e.cue && e.cue.toString().includes(term)) ||
                        (e.nombre && e.nombre.toLowerCase().includes(term)) ||
                        (e.localidad && e.localidad.toLowerCase().includes(term))
                      );
                    })
                    .slice(0, 50)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        CUE: {e.cue} - {e.nombre} ({e.localidad || 'S/L'})
                      </option>
                    ))}
                </select>
              </div>

              {sanearDepEstId && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Nivel / Modalidad Educativa:</span>
                    {sanearDepLoadingModalidades && (
                      <span className="text-[10px] text-[#FE8204] font-medium animate-pulse flex items-center gap-1">
                        <i className="fa-solid fa-spinner animate-spin"></i> Cargando niveles...
                      </span>
                    )}
                  </label>
                  {sanearDepModalidades.length > 0 ? (
                    <select
                      value={sanearDepModalidadId}
                      onChange={(e) => setSanearDepModalidadId(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-[#FE8204]"
                    >
                      <option value="">-- Seleccionar Nivel / Modalidad --</option>
                      {sanearDepModalidades.map((m) => (
                        <option key={m.id} value={m.id}>
                          Nivel: {m.nivel_educativo || 'GENERAL'} {m.direccion_area ? `(${m.direccion_area})` : ''} | Sector SIGE: {m.sector} | Radio: R{m.radio_sige ?? m.radio ?? 'S/D'}
                        </option>
                      ))}
                    </select>
                  ) : !sanearDepLoadingModalidades ? (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 font-medium">
                      ⚠️ Esta escuela no posee niveles cargados previamente en el catálogo de modalidades. Se creará un vínculo general.
                    </p>
                  ) : null}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Estado Depuración:</label>
                <select
                  value={sanearDepEstado}
                  onChange={(e) => setSanearDepEstado(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-[#FE8204]"
                >
                  <option value="ACTIVO">🟢 ACTIVO (Saneado)</option>
                  <option value="SUELDO_NO_CATALOGADO">⚠️ SUELDO NO CATALOGADO</option>
                  <option value="SECTOR_SIN_USO">🟡 SECTOR SIN USO</option>
                  <option value="CENTRO_SIN_USO">🔴 CENTRO SIN USO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observaciones / Dictamen de Auditoría:</label>
                <textarea
                  value={sanearDepObs}
                  onChange={(e) => setSanearDepObs(e.target.value)}
                  rows="3"
                  placeholder="Escriba las observaciones o dictamen de saneamiento..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-[#FE8204]"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setSanearDepuracionModalItem(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sanearDepSubmitting}
                onClick={handleSanearDepuracionSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-[#FE8204] hover:bg-[#e07203] rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {sanearDepSubmitting ? 'Guardando...' : 'Guardar Saneamiento'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DESGLOSE INDIVIDUAL DE DOCENTES */}
      {modalDocentesSector && (
        <Modal show={Boolean(modalDocentesSector)} onClose={() => setModalDocentesSector(null)} maxWidth="4xl">
          <div className="p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-users text-[#0284c7]"></i>
                Desglose de Docentes: Sector {modalDocentesSector.sector} 
                {modalDocentesSector.centro && ` (Centro ${modalDocentesSector.centro})`}
              </h3>
              <button 
                onClick={() => setModalDocentesSector(null)} 
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div className="text-xs font-semibold text-gray-600">
                Radio Oficial SIGE: <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">R{modalDocentesSector.radioSige || '-'}</span>
              </div>
              <input
                type="text"
                placeholder="Buscar docente por nombre o CUIL..."
                value={modalDocentesSearch}
                onChange={(e) => setModalDocentesSearch(e.target.value)}
                className="w-full sm:w-72 bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:ring-[#0284c7] outline-none"
              />
            </div>

            {modalDocentesLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <i className="fa-solid fa-spinner text-2xl text-[#0284c7] animate-spin"></i>
                <span className="text-xs text-gray-500 font-semibold">Cargando legajos docentes...</span>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] border border-gray-200 rounded-xl custom-scrollbar">
                <table className="w-full text-xs text-left text-gray-700 border-collapse">
                  <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 sticky top-0 shadow-xs">
                    <tr>
                      <th className="px-3 py-2.5 font-black text-white">CUIL</th>
                      <th className="px-3 py-2.5 font-black text-white">Apellido y Nombre</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Clase</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Zona</th>
                      <th className="px-3 py-2.5 text-right font-black text-white">Asig. Básico (A01)</th>
                      <th className="px-3 py-2.5 text-right font-black text-white">Asig. Radio (A04)</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">% Calculado</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Radio Cobrado</th>
                      <th className="px-3 py-2.5 text-center font-black text-white">Estado Desvío</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {modalDocentesData.filter(d => {
                      if (!modalDocentesSearch) return true;
                      const term = modalDocentesSearch.toLowerCase();
                      return (
                        (d.cuil && d.cuil.toString().includes(term)) ||
                        (d.apellido_nombre && d.apellido_nombre.toLowerCase().includes(term))
                      );
                    }).map((d, idx) => {
                      const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
                      const basico = d.a01_basico ? formatter.format(d.a01_basico) : '-';
                      const radio = d.a04_radio ? formatter.format(d.a04_radio) : '-';

                      let badgeClass = 'bg-gray-50 text-gray-700 border-gray-200';
                      let badgeText = 'COINCIDE';

                      if (d.estado_desvio === 'PAGA_MAS') {
                        badgeClass = 'bg-red-50 text-red-700 border-red-200';
                        badgeText = '🔴 PAGA MÁS';
                      } else if (d.estado_desvio === 'PAGA_MENOS') {
                        badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                        badgeText = '🔵 PAGA MENOS';
                      } else if (d.estado_desvio === 'NO_COBRA') {
                        badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                        badgeText = '🟡 SIN ADICIONAL';
                      } else if (d.estado_desvio === 'COINCIDE') {
                        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        badgeText = '🟢 COINCIDE';
                      }

                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 font-mono text-gray-500 font-semibold">{d.cuil || '-'}</td>
                          <td className="px-3 py-2.5 font-bold text-gray-950">{d.apellido_nombre || '-'}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-gray-500">{d.clase || '-'}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-gray-500">{d.zona || '-'}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{basico}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{radio}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-gray-900">{d.porcentaje_calculado ? `${d.porcentaje_calculado}%` : '-'}</td>
                          <td className="px-3 py-2.5 text-center font-black text-purple-700">
                            {d.radio_deducido ? `R${d.radio_deducido}` : <span className="text-gray-400 italic">No cobra</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                              {badgeText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {modalDocentesData.length === 0 && (
                      <tr>
                        <td colSpan="9" className="px-3 py-8 text-center text-gray-400 italic">
                          No se encontraron registros de liquidaciones individuales en este sector.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={() => setModalDocentesSector(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cerrar Desglose
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* MODAL DISTRIBUCIÓN DEL ESTADO DE AUDITORÍA */}
      {showDistribucionModal && (
        <Modal show={showDistribucionModal} onClose={() => setShowDistribucionModal(false)} maxWidth="2xl">
          <div className="p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-list-ol text-[#FE8204]"></i>
                Distribución del Estado de Auditoría
              </h3>
              <button 
                onClick={() => setShowDistribucionModal(false)} 
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <p className="text-xs text-gray-600 mb-4 font-semibold">
              Distribución cuantitativa de sectores y agentes según el diagnóstico de radios y haberes docentes para el período seleccionado.
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-sm font-bold text-emerald-900">Coincidencia Total (Sueldo = SIGE = Geo)</span>
                </div>
                <span className="text-sm font-black text-emerald-700">
                  {statusDistribution.coincideTotalSectores} sectores ({statusDistribution.coincideTotalDocentes.toLocaleString()})
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-teal-50 rounded-xl border border-teal-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                  <span className="text-sm font-bold text-teal-900">Coincide SIGE y Camino/Circunferencia</span>
                </div>
                <span className="text-sm font-black text-teal-700">
                  {statusDistribution.coincideSigeSectores} sectores ({statusDistribution.coincideSigeDocentes.toLocaleString()})
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-sm font-bold text-red-900">Paga MÁS que SIGE (Exceso de liquidación)</span>
                </div>
                <span className="text-sm font-black text-red-700">
                  {statusDistribution.pagaMasSectores} sectores ({statusDistribution.pagaMasDocentes.toLocaleString()})
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-sm font-bold text-blue-900">Paga MENOS que SIGE (Perjuicio al docente)</span>
                </div>
                <span className="text-sm font-black text-blue-700">
                  {statusDistribution.pagaMenosSectores} sectores ({statusDistribution.pagaMenosDocentes.toLocaleString()})
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                  <span className="text-sm font-bold text-slate-800">Sectores Sin Registro en SIGE PÚBLICO</span>
                </div>
                <span className="text-sm font-black text-slate-700">
                  {statusDistribution.sinSigeSectores} sectores ({statusDistribution.sinSigeDocentes.toLocaleString()})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowDistribucionModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* MODAL MATRIZ COMPARATIVA DE ESCALAS DE RADIO */}
      {showMatrizEscalasModal && (
        <Modal show={showMatrizEscalasModal} onClose={() => setShowMatrizEscalasModal(false)} maxWidth="2xl">
          <div className="p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-scale-balanced text-[#FE8204]"></i>
                Matriz Comparativa de Escalas de Radio Docente
              </h3>
              <button 
                onClick={() => setShowMatrizEscalasModal(false)} 
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <p className="text-xs text-gray-600 mb-4 font-semibold">
              Comparativa entre la escala original de la Ley de Radios y las alícuotas vigentes actualizadas por acuerdos paritarios.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-700 border-collapse">
                <thead className="text-[11px] uppercase tracking-wider bg-[#FE8204] text-white font-black border-b border-[#E07000]/40 shadow-xs">
                  <tr>
                    <th className="px-4 py-3 font-black text-white">Radio</th>
                    <th className="px-4 py-3 font-black text-white">% Ley Original (Histórica)</th>
                    <th className="px-4 py-3 font-black text-white">% Paritaria Vigente</th>
                    <th className="px-4 py-3 text-right font-black text-white">Estado de Liquidación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 1</td>
                    <td className="px-4 py-3">20%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">40%</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500">Ley Paritaria Vigente</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 2</td>
                    <td className="px-4 py-3">30%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">50%</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500">Ley Paritaria Vigente</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 3</td>
                    <td className="px-4 py-3">40%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">60%</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500">Ley Paritaria Vigente</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 4</td>
                    <td className="px-4 py-3">80%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">95%</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500">Ley Paritaria Vigente</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 5</td>
                    <td className="px-4 py-3">100%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">115%</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500">Ley Paritaria Vigente</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 6</td>
                    <td className="px-4 py-3">120%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">135%</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500">Ley Paritaria Vigente</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 7</td>
                    <td className="px-4 py-3">140%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">155%</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500">Ley Paritaria Vigente</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowMatrizEscalasModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* SPINNER GLOBAL DE CARGA DE PÁGINA */}
      {pageLoading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4 transition-all duration-300">
          <div className="bg-white/90 backdrop-blur border border-slate-100 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 w-80 text-center animate-bounce-short">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-[#FE8204] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <i className="fa-solid fa-calculator text-2xl text-[#FE8204] animate-pulse"></i>
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm">Procesando Auditoría Salarial</h3>
              <p className="text-[10px] text-gray-500 font-semibold mt-1">Cargando base de datos y legajos individuales...</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </SIAMELayout>
  );
}
