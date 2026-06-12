import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { useGlobal } from '../Context/GlobalContext';
import { GlassCard } from '../Components/GlassCard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const { stats, loadingStats } = useGlobal();
  const [activeTab, setActiveTab] = useState('principal');

  if (loadingStats || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-[#FE8204] mb-4"></i>
        <p className="text-xs font-black uppercase tracking-widest">Generando tableros analíticos...</p>
      </div>
    );
  }

  // ========================================================
  // A. ESTADÍSTICAS PRINCIPALES (TAB 1)
  // ========================================================

  const genderLabels = Object.keys(stats.genero || {}).map(k => k === 'F' ? 'Femenino' : 'Masculino');
  const genderValues = Object.values(stats.genero || {});
  const genderData = {
    labels: genderLabels,
    datasets: [{
      data: genderValues,
      backgroundColor: ['#ec4899', '#3b82f6'],
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 8
    }]
  };

  const genderOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#64748b',
          font: { family: 'Inter', size: 11, weight: 'bold' }
        }
      }
    },
    cutout: '70%'
  };

  const revistaLabels = Object.keys(stats.situacion_revista || {});
  const revistaValues = Object.values(stats.situacion_revista || {});
  
  const getRevistaColors = (labels) => {
    const backgroundColors = labels.map(l => {
      if (l === 'TITULAR') return 'rgba(124, 58, 237, 0.7)';
      if (l === 'INTERINO') return 'rgba(245, 158, 11, 0.7)';
      if (l === 'SUPLENTE') return 'rgba(59, 130, 246, 0.7)';
      if (l === 'REEMPLAZANTE') return 'rgba(6, 182, 212, 0.7)';
      return 'rgba(148, 163, 184, 0.7)';
    });
    
    const borderColors = labels.map(l => {
      if (l === 'TITULAR') return '#7c3aed';
      if (l === 'INTERINO') return '#f59e0b';
      if (l === 'SUPLENTE') return '#3b82f6';
      if (l === 'REEMPLAZANTE') return '#06b6d4';
      return '#94a3b8';
    });

    return { backgroundColors, borderColors };
  };

  const revistaColors = getRevistaColors(revistaLabels);

  const revistaData = {
    labels: revistaLabels,
    datasets: [{
      label: 'Cargos',
      data: revistaValues,
      backgroundColor: revistaColors.backgroundColors,
      borderColor: revistaColors.borderColors,
      borderWidth: 1.5,
      borderRadius: 6
    }]
  };

  const revistaOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 10, weight: 'bold' } }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'normal' } }
      }
    }
  };

  const licLabels = Object.keys(stats.top_licencias || {}).map(l => {
    if (l.length > 25) return l.substring(0, 25) + '...';
    return l;
  });
  const licValues = Object.values(stats.top_licencias || {});
  const licData = {
    labels: licLabels,
    datasets: [{
      data: licValues,
      backgroundColor: ['#a855f7', '#06b6d4', '#6366f1', '#10b981', '#f59e0b'],
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };

  const licOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#64748b',
          font: { family: 'Inter', size: 9, weight: 'bold' }
        }
      }
    },
    cutout: '65%'
  };

  const nivelesLabels = Object.keys(stats.top_niveles || {});
  const nivelesValues = Object.values(stats.top_niveles || {});
  const nivelesData = {
    labels: nivelesLabels,
    datasets: [{
      data: nivelesValues,
      backgroundColor: 'rgba(99, 102, 241, 0.7)',
      borderColor: '#6366f1',
      borderWidth: 1.5,
      borderRadius: 6
    }]
  };

  const nivelesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 10, weight: 'bold' } }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'normal' } }
      }
    }
  };

  const estLabels = (stats.top_establecimientos || []).map((s) => {
    let name = s.establecimiento;
    if (name.length > 30) name = name.substring(0, 30) + '...';
    return `${name} (CUE ${s.cue})`;
  });
  const estCargos = (stats.top_establecimientos || []).map((s) => s.roles_count);
  const estAgentes = (stats.top_establecimientos || []).map((s) => s.agentes_unicos);

  const estData = {
    labels: estLabels,
    datasets: [
      {
        label: 'Cargos Totales',
        data: estCargos,
        backgroundColor: 'rgba(6, 182, 212, 0.7)',
        borderColor: '#06b6d4',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Agentes Únicos (DNI)',
        data: estAgentes,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const estOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#64748b',
          font: { family: 'Inter', size: 10, weight: 'bold' }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'normal' } }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'bold' } }
      }
    }
  };

  // ========================================================
  // B. ANÁLISIS POR DEPARTAMENTO (TAB 2)
  // ========================================================
  
  const depts = (stats.departamentos_agentes || []).map((r) => r.departamento);
  
  const deptAgentes = (stats.departamentos_agentes || []).map((r) => r.count);
  const deptTraslados = depts.map((d) => {
    const found = (stats.departamentos_traslados || []).find((x) => x.departamento === d);
    return found ? found.count : 0;
  });

  const deptAgentesTrasladosData = {
    labels: depts,
    datasets: [
      {
        label: 'Agentes Únicos',
        data: deptAgentes,
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        borderRadius: 6
      },
      {
        label: 'Agentes en Traslado (2+ CUEs)',
        data: deptTraslados,
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        borderColor: '#ef4444',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const deptAgentesTrasladosOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#64748b',
          font: { family: 'Inter', size: 10, weight: 'bold' }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 10, weight: 'bold' } }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'normal' } }
      }
    }
  };

  const deptFemenino = depts.map((d) => {
    const found = (stats.departamentos_genero || []).find((x) => x.departamento === d && x.genero === 'F');
    return found ? found.count : 0;
  });
  const deptMasculino = depts.map((d) => {
    const found = (stats.departamentos_genero || []).find((x) => x.departamento === d && x.genero === 'M');
    return found ? found.count : 0;
  });

  const deptGeneroData = {
    labels: depts,
    datasets: [
      {
        label: 'Femenino',
        data: deptFemenino,
        backgroundColor: 'rgba(236, 72, 153, 0.75)',
        borderColor: '#ec4899',
        borderWidth: 1.5,
        borderRadius: 6
      },
      {
        label: 'Masculino',
        data: deptMasculino,
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const deptGeneroOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#64748b',
          font: { family: 'Inter', size: 10, weight: 'bold' }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 10, weight: 'bold' } }
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'normal' } }
      }
    }
  };

  const deptLicLabels = (stats.departamentos_licencias || []).map((r) => r.departamento);
  const deptLicValues = (stats.departamentos_licencias || []).map((r) => r.count);
  
  const deptLicData = {
    labels: deptLicLabels,
    datasets: [{
      data: deptLicValues,
      backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#a855f7'],
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };

  const deptLicOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#64748b',
          font: { family: 'Inter', size: 9, weight: 'bold' }
        }
      }
    },
    cutout: '65%'
  };

  // ========================================================
  // C. ANÁLISIS POR NIVEL EDUCATIVO (TAB 3)
  // ========================================================

  const uniqueNiveles = Array.from(new Set((stats.niveles_genero || []).map((x) => x.nivel_educativo)));

  const nivelFemenino = uniqueNiveles.map((n) => {
    const found = (stats.niveles_genero || []).find((x) => x.nivel_educativo === n && x.genero === 'F');
    return found ? found.count : 0;
  });
  const nivelMasculino = uniqueNiveles.map((n) => {
    const found = (stats.niveles_genero || []).find((x) => x.nivel_educativo === n && x.genero === 'M');
    return found ? found.count : 0;
  });

  const nivelGeneroData = {
    labels: uniqueNiveles,
    datasets: [
      {
        label: 'Femenino',
        data: nivelFemenino,
        backgroundColor: 'rgba(236, 72, 153, 0.75)',
        borderColor: '#ec4899',
        borderWidth: 1.5,
        borderRadius: 6
      },
      {
        label: 'Masculino',
        data: nivelMasculino,
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const nivelGeneroOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#64748b',
          font: { family: 'Inter', size: 10, weight: 'bold' }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'bold' } }
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'normal' } }
      }
    }
  };

  const nivelTrasladosLabels = (stats.niveles_traslados || []).map((r) => r.nivel_educativo);
  const nivelTrasladosValues = (stats.niveles_traslados || []).map((r) => r.count);

  const nivelTrasladosData = {
    labels: nivelTrasladosLabels,
    datasets: [{
      data: nivelTrasladosValues,
      backgroundColor: 'rgba(139, 92, 246, 0.75)',
      borderColor: '#8b5cf6',
      borderWidth: 1.5,
      borderRadius: 6
    }]
  };

  const nivelTrasladosOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 10, weight: 'bold' } }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 9, weight: 'normal' } }
      }
    }
  };

  const NoData = ({ msg }) => (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-gray-300">
      <i className="fa-solid fa-chart-bar text-5xl opacity-30"></i>
      <p className="text-xs font-black uppercase tracking-widest text-gray-400">{msg}</p>
      <p className="text-[10px] text-gray-300 font-semibold">Verifique que el servidor esté activo y que existan cruces de datos</p>
    </div>
  );

  return (
    <SIAMELayout>
      <Head title="Tablero General" />
      <div className="flex flex-col gap-8">
        {/* 4 Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: 'Agentes Únicos',
              value: stats.total_agentes,
              sub: 'DNI consolidados',
              icon: 'fa-solid fa-users',
              color: 'from-cyan-500/10 to-cyan-500/2 border-cyan-100/50 text-cyan-600',
              valColor: 'text-cyan-900',
              subIcon: 'fa-solid fa-id-card'
            },
            {
              label: 'Designaciones Oficiales',
              value: stats.total_designaciones,
              sub: 'cargos en designaciones.db',
              icon: 'fa-solid fa-briefcase',
              color: 'from-blue-500/10 to-blue-500/2 border-blue-100/50 text-blue-600',
              valColor: 'text-blue-900',
              subIcon: 'fa-solid fa-folder-open'
            },
            {
              label: 'Licencias Registradas',
              value: stats.total_licencias,
              sub: 'trámites en licencias.db',
              icon: 'fa-solid fa-file-medical',
              color: 'from-purple-500/10 to-purple-500/2 border-purple-100/50 text-purple-600',
              valColor: 'text-purple-900',
              subIcon: 'fa-solid fa-file-prescription'
            },
            {
              label: 'Escuelas Físicas',
              value: stats.total_escuelas_fisicas,
              sub: 'establecimientos.sqlite',
              icon: 'fa-solid fa-school-flag',
              color: 'from-rose-500/10 to-rose-500/2 border-rose-100/50 text-rose-600',
              valColor: 'text-rose-900',
              subIcon: 'fa-solid fa-location-arrow'
            }
          ].map((card) => (
            <GlassCard key={card.label} hoverEffect className="p-6 flex items-center gap-5 relative overflow-hidden bg-white">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color.split(' ')[0]} ${card.color.split(' ')[1]} border ${card.color.split(' ')[2]} flex items-center justify-center text-2xl shadow-sm`}>
                <i className={card.icon}></i>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{card.label}</span>
                <h3 className={`text-3xl font-black ${card.valColor} mt-1 tracking-tight leading-none`}>
                  {(card.value ?? 0).toLocaleString('es-AR')}
                </h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5 leading-none">
                  <i className={`${card.subIcon} opacity-70`}></i>
                  {card.sub}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* BI Navigation Tabs */}
        <div className="flex gap-2 flex-wrap bg-gray-50/20 border border-gray-100 rounded-2xl p-2.5 shadow-sm max-w-max">
          {[
            { id: 'principal', label: '📊 Estadísticas Principales' },
            { id: 'departamentos', label: '🌍 Análisis por Departamento' },
            { id: 'niveles', label: '🏫 Análisis por Nivel Educativo' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all border cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#FE8204] text-white border-[#FE8204] shadow-md shadow-[#FE8204]/20'
                  : 'bg-white text-gray-500 hover:text-gray-900 border-gray-100 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Data coverage banner */}
        {activeTab !== 'principal' && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
              <i className="fa-solid fa-circle-check text-blue-500"></i>
              {depts.length} departamentos indexados
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider">
              <i className="fa-solid fa-circle-check text-purple-500"></i>
              {uniqueNiveles.length} niveles educativos
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
              <i className="fa-solid fa-circle-check text-rose-500"></i>
              {(stats.departamentos_licencias || []).length} departamentos con licencias
            </div>
          </div>
        )}

        {/* Dynamic Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {activeTab === 'principal' && (
            <>
              {/* Gender Chart */}
              <GlassCard className="p-6 lg:col-span-4 bg-white flex flex-col h-96">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Distribución de Género</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Preponderancia para cálculo de asignaciones</p>
                </div>
                <div className="flex-1 min-h-0 relative flex items-center justify-center">
                  <Doughnut data={genderData} options={genderOptions} />
                </div>
              </GlassCard>

              {/* Revista Chart */}
              <GlassCard className="p-6 lg:col-span-4 bg-white flex flex-col h-96">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Situación de Revista</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Condición de estabilidad de los cargos</p>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <Bar data={revistaData} options={revistaOptions} />
                </div>
              </GlassCard>

              {/* Licencias Chart */}
              <GlassCard className="p-6 lg:col-span-4 bg-white flex flex-col h-96">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Tipos de Licencia</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Distribución de causas de licencias médicas</p>
                </div>
                <div className="flex-1 min-h-0 relative flex items-center justify-center">
                  <Doughnut data={licData} options={licOptions} />
                </div>
              </GlassCard>

              {/* Niveles Chart */}
              <GlassCard className="p-6 lg:col-span-4 bg-white flex flex-col h-96">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Niveles Educativos</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Distribución según nivel de las escuelas</p>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <Bar data={nivelesData} options={nivelesOptions} />
                </div>
              </GlassCard>

              {/* Top 10 Establishments Chart */}
              <GlassCard className="p-6 lg:col-span-8 bg-white flex flex-col h-96">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Establecimientos con Mayor Carga de Personal (Top 10 CUEs)</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Estadísticas de cargos frente a agentes únicos por edificio escolar</p>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <Bar data={estData} options={estOptions} />
                </div>
              </GlassCard>
            </>
          )}

          {activeTab === 'departamentos' && (
            <>
              <GlassCard className="p-6 lg:col-span-8 bg-white flex flex-col h-[26rem]">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Volumen de Agentes vs. Docentes con Traslados por Departamento</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Comparación de dotación docente única frente a agentes con trayectos geográficos críticos</p>
                </div>
                <div className="flex-1 min-h-0 relative">
                  {depts.length > 0
                    ? <Bar data={deptAgentesTrasladosData} options={deptAgentesTrasladosOptions} />
                    : <NoData msg="Sin datos de departamentos / agentes" />}
                </div>
              </GlassCard>

              <GlassCard className="p-6 lg:col-span-4 bg-white flex flex-col h-[26rem]">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Licencias por Departamento</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Distribución territorial del volumen total de inasistencias médicas</p>
                </div>
                <div className="flex-1 min-h-0 relative flex items-center justify-center">
                  {deptLicLabels.length > 0
                    ? <Doughnut data={deptLicData} options={deptLicOptions} />
                    : <NoData msg="Sin datos de licencias por departamento" />}
                </div>
              </GlassCard>

              <GlassCard className="p-6 lg:col-span-12 bg-white flex flex-col h-[28rem]">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Distribución Demográfica de Género por Departamento Regional</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Desglose territorial de agentes femeninos y masculinos en escuelas geolocalizadas</p>
                </div>
                <div className="flex-1 min-h-0 relative">
                  {depts.length > 0
                    ? <Bar data={deptGeneroData} options={deptGeneroOptions} />
                    : <NoData msg="Sin datos de género por departamento" />}
                </div>
              </GlassCard>
            </>
          )}

          {activeTab === 'niveles' && (
            <>
              <GlassCard className="p-6 lg:col-span-6 bg-white flex flex-col h-[26rem]">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Demografía de Género por Nivel Educativo</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Distribución acumulada de agentes femeninos y masculinos por nivel pedagógico</p>
                </div>
                <div className="flex-1 min-h-0 relative">
                  {uniqueNiveles.length > 0
                    ? <Bar data={nivelGeneroData} options={nivelGeneroOptions} />
                    : <NoData msg="Sin datos de género por nivel educativo" />}
                </div>
              </GlassCard>

              <GlassCard className="p-6 lg:col-span-6 bg-white flex flex-col h-[26rem]">
                <div className="flex flex-col mb-4">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Docentes en Traslado Crítico por Nivel Educativo</h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Concentración de docentes desempeñando cargos en múltiples escuelas según su nivel escolar</p>
                </div>
                <div className="flex-1 min-h-0 relative">
                  {nivelTrasladosLabels.length > 0
                    ? <Bar data={nivelTrasladosData} options={nivelTrasladosOptions} />
                    : <NoData msg="Sin datos de traslados por nivel educativo" />}
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </SIAMELayout>
  );
};

export default Dashboard;
