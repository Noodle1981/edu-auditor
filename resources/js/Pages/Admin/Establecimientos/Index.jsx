import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import { Pagination } from "@/Components/Pagination";
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import SIAMELayout from '@/Layouts/SIAMELayout';
import { Head, router, useForm } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import { useEffect, useMemo, useState } from 'react';

// Mapeo estático de Dirección de Área a Niveles Educativos
const MAPA_AREA_NIVEL = {
    ADULTOS: ['CENS', 'PROPAA', 'UEPA'],
    'ED. ESPECIAL': ['EDUCACIÓN ESPECIAL', 'EDUCACIÓN HOSPITALARIA'],
    INICIAL: ['INICIAL'],
    PRIMARIO: ['ALBERGUE', 'PRIMARIO'],
    PRIVADA: [
        'ADULTOS',
        'AGROTECNICA',
        'CENS',
        'EDUCACIÓN ESPECIAL',
        'INICIAL',
        'NO FORMAL',
        'PRIMARIO',
        'SECUNDARIO',
        'SUPERIOR',
        'TEC. CAP. LABORAL',
        'TÉCNICO',
        'UEPA',
    ],
    SECUNDARIO: ['NO FORMAL', 'SECUNDARIO'],
    SUPERIOR: ['SUPERIOR'],
    TÉCNICA: [
        'AGROTECNICA',
        'FOR. PROF. EDUC. NO FORMAL',
        'MONOTÉCNICA',
        'TEC. CAP. LABORAL',
        'TÉCNICO',
    ],
};

// Función para obtener el nombre descriptivo del edificio
const getNombreEdificio = (item, mapa = {}) => {
    try {
        const edificioId = item.establecimiento?.edificio_id;
        if (edificioId && mapa[edificioId]) {
            return mapa[edificioId];
        }
        // Fallback: nombre del establecimiento si no hay mapa
        return (
            item.establecimiento?.edificio?.cabecera?.nombre ??
            item.establecimiento?.nombre ??
            null
        );
    } catch (e) {
        console.error('Error en getNombreEdificio:', e);
        return null;
    }
};

export default function Index({
    modalidades,
    filters,
    options,
    nombresEdificios = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedModalidad, setSelectedModalidad] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Filter handling
    const applyFilters = useMemo(
        () =>
            debounce((query) => {
                const newFilters = { ...filters, search: query };
                delete newFilters.page;
                router.get(
                    route('admin.establecimientos.index'),
                    newFilters,
                    {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                    },
                );
            }, 300),
        [filters],
    );

    const handleSearch = (e) => {
        setSearch(e.target.value);
        applyFilters(e.target.value);
    };

    const filteredRadios = useMemo(() => {
        if (!filters.zona_departamento) {
            return options.radios || [];
        }
        return options.departamento_radios?.[filters.zona_departamento] || [];
    }, [filters.zona_departamento, options.radios, options.departamento_radios]);

    const filteredCategorias = useMemo(() => {
        if (!filters.zona_departamento) {
            return options.categorias || [];
        }
        return options.departamento_categorias?.[filters.zona_departamento] || [];
    }, [filters.zona_departamento, options.categorias, options.departamento_categorias]);

    const handleZonaDepartamentoChange = (newDepto) => {
        const newFilters = { ...filters, zona_departamento: newDepto };
        delete newFilters.page;

        if (newDepto && filters.radio) {
            const validRadios = options.departamento_radios?.[newDepto] || [];
            if (!validRadios.includes(filters.radio)) {
                delete newFilters.radio;
            }
        }

        if (newDepto && filters.categoria) {
            const validCategorias = options.departamento_categorias?.[newDepto] || [];
            if (!validCategorias.includes(filters.categoria)) {
                delete newFilters.categoria;
            }
        }

        router.get(
            route('admin.establecimientos.index'),
            newFilters,
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleParamChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        delete newFilters.page;
        router.get(
            route('admin.establecimientos.index'),
            newFilters,
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const resetFilters = () => {
        router.get(route('admin.establecimientos.index'), {});
    };

    const handleDelete = (item) => {
        const hasOnlyOneModalidad =
            item.establecimiento?.modalidades_count === 1;

        let confirmMessage =
            '¿Está seguro de que desea dar de baja esta modalidad escolar? Se trasladará a la papelera de reciclaje.';
        if (hasOnlyOneModalidad) {
            confirmMessage =
                '⚠️ ¡ATENCIÓN! Esta es la ÚLTIMA modalidad activa de este establecimiento. Si la elimina, el ESTABLECIMIENTO COMPLETO (CUE: ' +
                item.establecimiento.cue +
                ') se dará de baja automáticamente. ¿Desea continuar?';
        }

        if (confirm(confirmMessage)) {
            router.delete(
                route('admin.establecimientos.destroy', item.id),
            );
        }
    };

    return (
        <SIAMELayout header={null}>
            <Head title="Establecimientos" />

            <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-4">
                {/* Actions & Filters Sidebar - Sticky */}
                <div className="sticky top-6 space-y-4 self-start lg:col-span-1">
                    {/* Primary Actions Area */}
                    <div className="mb-6 flex flex-col gap-2">
                        <PrimaryButton
                            className="w-full gap-3 !rounded-2xl !py-4"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <i className="fas fa-plus"></i>
                            <span className="text-sm">Nueva Modalidad</span>
                        </PrimaryButton>
                        <a
                            href={route(
                                'admin.establecimientos.export',
                            )}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-green-100 bg-green-50 py-3 text-[10px] font-black uppercase tracking-widest text-green-700 shadow-sm transition-all hover:bg-green-600 hover:text-white"
                        >
                            <i className="fas fa-file-excel"></i> Exportar Datos
                        </a>
                    </div>

                    <div className="space-y-6 overflow-hidden rounded-2xl border border-orange-100 bg-white p-0 shadow-sm">
                        <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50/50 px-5 py-3">
                            <div className="flex items-center gap-3">
                                <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-orange">
                                    <i className="fas fa-filter"></i>
                                    Filtros
                                </h3>
                                <span className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-1.5 text-xl font-black text-black shadow-sm">
                                    {modalidades.total}
                                </span>
                            </div>
                            <button
                                onClick={resetFilters}
                                className="text-[10px] font-black uppercase tracking-widest text-brand-orange hover:underline"
                            >
                                Limpiar
                            </button>
                        </div>
                        <div className="space-y-6 px-5 pb-6">
                            {/* Search Input in Sidebar for mobile/desktop harmony */}
                            <div className="space-y-1">
                                <InputLabel value="Búsqueda" />
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Nombre, CUE, CUI..."
                                        className="w-full rounded-xl border-gray-200 py-2 pl-9 pr-4 text-xs font-bold transition-all focus:border-brand-orange focus:ring-brand-orange"
                                        value={search}
                                        onChange={handleSearch}
                                    />
                                    <i className="fas fa-search absolute left-3 top-2.5 text-gray-300"></i>
                                </div>
                            </div>

                            <FilterSelect
                                label="Dirección de Área"
                                value={filters.direccion_area}
                                options={options.areas}
                                onChange={(v) =>
                                    handleParamChange('direccion_area', v)
                                }
                            />
                            <FilterSelect
                                label="Nivel Educativo"
                                value={filters.nivel_educativo}
                                options={options.niveles}
                                onChange={(v) =>
                                    handleParamChange('nivel_educativo', v)
                                }
                            />
                            <FilterSelect
                                label="Ámbito"
                                value={filters.ambito}
                                options={options.ambitos}
                                onChange={(v) => handleParamChange('ambito', v)}
                            />

                            <div className="space-y-1">
                                <InputLabel value="Estado" />
                                <select
                                    value={filters.estado || ''}
                                    onChange={(e) =>
                                        handleParamChange(
                                            'estado',
                                            e.target.value,
                                        )
                                    }
                                    className="w-full rounded-xl border-gray-200 text-xs font-bold focus:border-brand-orange focus:ring-brand-orange"
                                >
                                    <option value="">Cualquiera</option>
                                    <option value="VALIDADO">Validado</option>
                                    <option value="PENDIENTE">Pendiente</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <FilterSelect
                                    label="Radio"
                                    value={filters.radio}
                                    options={filteredRadios}
                                    onChange={(v) => handleParamChange('radio', v)}
                                />
                                <div className="space-y-1">
                                    <InputLabel value="Sector" />
                                    <input
                                        type="text"
                                        placeholder="Sector..."
                                        className="w-full rounded-xl border-gray-200 text-xs font-bold focus:border-brand-orange focus:ring-brand-orange"
                                        defaultValue={filters.sector || ''}
                                        onBlur={(e) =>
                                            handleParamChange(
                                                'sector',
                                                e.target.value,
                                            )
                                        }
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' &&
                                            handleParamChange(
                                                'sector',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <FilterSelect
                                label="Zona / Departamento"
                                value={filters.zona_departamento}
                                options={options.zonas}
                                onChange={handleZonaDepartamentoChange}
                            />
                            <FilterSelect
                                label="Categoría"
                                value={filters.categoria}
                                options={filteredCategorias}
                                onChange={(v) =>
                                    handleParamChange('categoria', v)
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="space-y-6 lg:col-span-3">
                    <div className="overflow-hidden border border-l-4 border-gray-100 border-l-brand-orange bg-white shadow-sm sm:rounded-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-orange-600 bg-brand-orange text-[10px] font-black uppercase text-white">
                                        <th className="px-6 py-2">
                                            Establecimiento / CUE
                                        </th>
                                        <th className="px-6 py-2">Edificio</th>
                                        <th className="px-6 py-2">
                                            Nivel / Área
                                        </th>
                                        <th className="px-6 py-2 text-center">
                                            Radio / SiGE
                                        </th>
                                        <th className="px-6 py-2">Estado</th>
                                        <th className="px-6 py-2 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {modalidades.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="group transition-colors hover:bg-orange-50/30"
                                        >
                                            <td className="px-6 py-2">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black leading-tight text-black group-hover:text-brand-orange">
                                                        {
                                                            item.establecimiento
                                                                .nombre
                                                        }
                                                    </span>
                                                    <span className="mt-1 text-[9px] font-black uppercase text-black/40">
                                                        CUE:{' '}
                                                        {
                                                            item.establecimiento
                                                                .cue
                                                        }
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2">
                                                <div className="flex max-w-[200px] flex-col">
                                                    {getNombreEdificio(
                                                        item,
                                                        nombresEdificios,
                                                    ) ? (
                                                        <>
                                                            <span
                                                                className="text-[10px] font-black leading-tight text-gray-900"
                                                                title={getNombreEdificio(
                                                                    item,
                                                                    nombresEdificios,
                                                                )}
                                                            >
                                                                {getNombreEdificio(
                                                                    item,
                                                                    nombresEdificios,
                                                                )}
                                                            </span>
                                                            <span className="text-[9px] font-black uppercase tracking-tighter text-brand-orange">
                                                                CUI:{' '}
                                                                {
                                                                    item
                                                                        .establecimiento
                                                                        .edificio
                                                                        ?.cui
                                                                }
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] font-black leading-tight text-brand-orange">
                                                            CUI:{' '}
                                                            {item
                                                                .establecimiento
                                                                .edificio
                                                                ?.cui || 'S/D'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-black/70">
                                                        {item.nivel_educativo}
                                                    </span>
                                                    <span className="max-w-[150px] truncate text-[9px] font-black uppercase text-black/40">
                                                        {item.direccion_area}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-gray-950">
                                                        {item.radio ?? 'N/A'}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-gray-400">
                                                        SiGE: {item.radio_sige ?? 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2">
                                                <span
                                                    className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                                                        item.validado
                                                            ? 'border-brand-orange/20 bg-orange-50 text-brand-orange'
                                                            : 'border-brand-red/20 bg-red-50 text-brand-red'
                                                    }`}
                                                >
                                                    <i
                                                        className={`fas ${item.validado ? 'fa-check-circle' : 'fa-clock'} mr-1`}
                                                    ></i>
                                                    {item.validado
                                                        ? 'Validado'
                                                        : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedModalidad(
                                                                item,
                                                            );
                                                            setShowViewModal(
                                                                true,
                                                            );
                                                        }}
                                                        className="rounded-lg bg-gray-50 p-2 text-gray-400 shadow-sm transition hover:bg-brand-orange hover:text-white"
                                                    >
                                                        <i className="fas fa-eye text-xs"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedModalidad(
                                                                item,
                                                            );
                                                            setShowEditModal(
                                                                true,
                                                            );
                                                        }}
                                                        className="rounded-lg bg-orange-50 p-2 text-brand-orange shadow-sm transition hover:bg-brand-orange hover:text-white"
                                                    >
                                                        <i className="fas fa-edit text-xs"></i>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(item)
                                                        }
                                                        className="rounded-lg border border-brand-red/20 bg-red-50 p-2 text-brand-red shadow-sm transition hover:bg-brand-red hover:text-white"
                                                        title="Dar de baja modalidad"
                                                    >
                                                        <i className="fas fa-trash text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {modalidades.data.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan="5"
                                                className="px-6 py-20 text-center"
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                                                        <i className="fas fa-search text-2xl"></i>
                                                    </div>
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-gray-900">
                                                        No se encontraron
                                                        resultados
                                                    </h4>
                                                    <p className="mx-auto max-w-[250px] text-xs font-medium text-gray-400">
                                                        Intenta ajustar los
                                                        filtros o la búsqueda
                                                        para encontrar lo que
                                                        necesitas.
                                                    </p>
                                                    <button
                                                        onClick={resetFilters}
                                                        className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-orange shadow-sm transition-all hover:bg-brand-orange hover:text-white"
                                                    >
                                                        Limpiar todos los
                                                        filtros
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="-mt-2 flex justify-center">
                        <Pagination links={modalidades.links} />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ViewModalidadModal
                show={showViewModal}
                onClose={() => setShowViewModal(false)}
                modalidad={selectedModalidad}
                nombresEdificios={nombresEdificios}
            />
            <EditModalidadModal
                show={showEditModal}
                onClose={() => setShowEditModal(false)}
                modalidad={selectedModalidad}
                options={options}
                nombresEdificios={nombresEdificios}
            />
            <CreateModalidadModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                options={options}
            />
        </SIAMELayout>
    );
}

function FilterSelect({ label, value, options, onChange }) {
    return (
        <div className="space-y-1">
            <InputLabel value={label} />
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border-gray-200 text-xs font-bold focus:border-brand-orange focus:ring-brand-orange"
            >
                <option value="">Cualquiera</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </div>
    );
}

function ViewModalidadModal({ show, onClose, modalidad, nombresEdificios }) {
    if (!modalidad) return null;
    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xl shadow-sm ${
                                modalidad.validado
                                    ? 'border-green-100 bg-green-50 text-green-600'
                                    : 'border-red-100 bg-red-50 text-red-500'
                            }`}
                        >
                            <i
                                className={`fas ${modalidad.validado ? 'fa-school' : 'fa-clock'}`}
                            ></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-black leading-tight text-gray-900">
                                {modalidad.establecimiento.nombre}
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                CUE: {modalidad.establecimiento.cue}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-xl text-gray-400 hover:text-gray-600"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <DetailItem
                        icon="fas fa-building"
                        label="Edificio"
                        value={
                            getNombreEdificio(modalidad, nombresEdificios) ||
                            'Sin Nombre'
                        }
                    />
                    <DetailItem
                        icon="fas fa-id-card"
                        label="CUI Edificio"
                        value={modalidad.establecimiento.edificio.cui}
                    />
                    <DetailItem
                        icon="fas fa-map-marker-alt"
                        label="Dirección"
                        value={`${modalidad.establecimiento.edificio.calle} ${modalidad.establecimiento.edificio.numero_puerta || 'S/N'}`}
                    />
                    <DetailItem
                        icon="fas fa-city"
                        label="Departamento"
                        value={
                            modalidad.establecimiento.edificio.zona_departamento
                        }
                    />
                    <DetailItem
                        icon="fas fa-graduation-cap"
                        label="Nivel Educativo"
                        value={modalidad.nivel_educativo}
                    />
                    <DetailItem
                        icon="fas fa-university"
                        label="Dirección de Área"
                        value={modalidad.direccion_area}
                    />
                    <DetailItem
                        icon="fas fa-landmark"
                        label="Ámbito"
                        value={modalidad.ambito}
                    />
                    <DetailItem
                        icon="fas fa-users"
                        label="Sector"
                        value={
                            (modalidad.sector ?? '') !== ''
                                ? modalidad.sector
                                : 'S/D'
                        }
                    />
                    <DetailItem
                        icon="fas fa-broadcast-tower"
                        label="Radio / Zona"
                        value={`${(modalidad.radio ?? '') !== '' ? modalidad.radio : '?'}, ${(modalidad.establecimiento.edificio?.letra_zona ?? '') !== '' ? modalidad.establecimiento.edificio.letra_zona : '?'}`}
                    />
                    <DetailItem
                        icon="fas fa-award"
                        label="Categoría"
                        value={
                            (modalidad.categoria ?? '') !== ''
                                ? modalidad.categoria
                                : 'S/D'
                        }
                    />
                    <DetailItem
                        icon="fas fa-check-circle"
                        label="Estado Validación"
                        value={
                            modalidad.validado
                                ? 'CONSOLIDADO'
                                : 'PENDIENTE DE REVISIÓN'
                        }
                    />
                </div>

                <div className="mt-6 border-t pt-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <i className="fas fa-comment-alt text-brand-orange"></i>{' '}
                        Observaciones del Establecimiento (CUE)
                    </h4>
                    {modalidad.establecimiento.observaciones ? (
                        <div className="rounded-2xl border border-orange-100/50 bg-orange-50/30 p-4">
                            <p className="whitespace-pre-wrap text-xs font-semibold leading-relaxed text-gray-700">
                                {modalidad.establecimiento.observaciones}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs font-medium italic text-gray-400">
                            Sin observaciones registradas para este CUE.
                        </p>
                    )}
                </div>

                <div className="mt-8 flex justify-end">
                    <SecondaryButton onClick={onClose}>
                        Cerrar Panel
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}

function EditModalidadModal({
    show,
    onClose,
    modalidad,
    options,
    nombresEdificios = {},
}) {
    const { data, setData, patch, processing, errors } = useForm({
        cui: '',
        cue: '',
        nombre_establecimiento: '',
        nivel_educativo: '',
        direccion_area: '',
        ambito: '',
        radio: '',
        sector: '',
        letra_zona: '',
        categoria: '',
        validado: false,
        observaciones: '',
    });

    const [edificioInfo, setEdificioInfo] = useState({
        departamento: '',
        cabecera: '',
    });

    useEffect(() => {
        if (show && modalidad) {
            setData({
                cui: modalidad.establecimiento.edificio?.cui || '',
                cue: modalidad.establecimiento.cue || '',
                nombre_establecimiento: modalidad.establecimiento.nombre || '',
                nivel_educativo: modalidad.nivel_educativo || '',
                direccion_area: modalidad.direccion_area || '',
                ambito: modalidad.ambito || '',
                radio: modalidad.radio ?? '',
                sector: modalidad.sector ?? '',
                letra_zona:
                    modalidad.establecimiento.edificio?.letra_zona ?? '',
                categoria: modalidad.categoria ?? '',
                validado: !!modalidad.validado,
                observaciones: modalidad.establecimiento.observaciones || '',
            });

            setEdificioInfo({
                departamento:
                    modalidad.establecimiento.edificio?.zona_departamento || '',
                cabecera:
                    nombresEdificios[modalidad.establecimiento.edificio_id] ||
                    'Sin Nombre',
            });
        }
    }, [modalidad, show, nombresEdificios, setData]);

    useEffect(() => {
        const cuiStr = String(data.cui).trim();
        if (!cuiStr) {
            setEdificioInfo({ departamento: '', cabecera: '' });
            return;
        }

        // If it matches the original CUI of this building
        if (
            modalidad?.establecimiento?.edificio?.cui &&
            cuiStr === String(modalidad.establecimiento.edificio.cui)
        ) {
            setEdificioInfo({
                departamento:
                    modalidad.establecimiento.edificio?.zona_departamento || '',
                cabecera:
                    nombresEdificios[modalidad.establecimiento.edificio_id] ||
                    'Sin Nombre',
            });
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            fetch(route('api.lookup-edificio', cuiStr), {
                signal: controller.signal,
            })
                .then((res) => {
                    if (!res.ok) throw new Error();
                    return res.json();
                })
                .then((res) => {
                    if (res) {
                        setEdificioInfo({
                            departamento:
                                res.zona_departamento || 'Sin Departamento',
                            cabecera:
                                res.cabecera_nombre ||
                                'Edificio sin cabecera asignada',
                        });
                    } else {
                        setEdificioInfo({
                            departamento: 'Nuevo CUI (No registrado)',
                            cabecera: 'Se creará un nuevo edificio al guardar',
                        });
                    }
                })
                .catch(() => {
                    // Ignore abort
                });
        }, 300);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [data.cui, modalidad, nombresEdificios]);

    if (!modalidad) return null;

    const submit = (e) => {
        e.preventDefault();
        patch(route('admin.establecimientos.update', modalidad.id), {
            onSuccess: () => {
                onClose();
            },
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <form onSubmit={submit} className="p-6">
                <h3 className="mb-6 border-b pb-4 text-xl font-black text-gray-900">
                    Actualizar Establecimiento
                </h3>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                    <div>
                        <ModalInput
                            label="CUI Edificio"
                            value={data.cui}
                            onChange={(v) => setData('cui', v)}
                            error={errors.cui}
                        />
                        {data.cui && (
                            <div className="mt-1.5 space-y-1 rounded-xl border border-orange-100/50 bg-orange-50/50 px-3 py-1.5 text-[10px] font-bold text-gray-600">
                                <div>
                                    <span className="mb-0.5 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                                        Establecimiento Cabecera
                                    </span>
                                    <span
                                        className="block truncate text-xs font-black leading-none text-brand-orange"
                                        title={edificioInfo.cabecera}
                                    >
                                        {edificioInfo.cabecera || 'Sin Nombre'}
                                    </span>
                                </div>
                                {edificioInfo.departamento && (
                                    <div className="border-t border-orange-100/40 pt-1">
                                        <span className="mb-0.5 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                                            Ubicación del CUI
                                        </span>
                                        <span className="block text-[11px] font-extrabold uppercase leading-none text-gray-700">
                                            <i className="fas fa-map-marker-alt mr-1 text-brand-orange"></i>{' '}
                                            {edificioInfo.departamento}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <ModalInput
                        label="CUE Establecimiento"
                        value={data.cue}
                        onChange={(v) => setData('cue', v)}
                        error={errors.cue}
                    />
                    <div className="col-span-2">
                        <ModalInput
                            label="Nombre del Establecimiento"
                            value={data.nombre_establecimiento}
                            onChange={(v) =>
                                setData('nombre_establecimiento', v)
                            }
                            error={errors.nombre_establecimiento}
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel value="Ámbito" />
                        <select
                            className="mt-1 w-full rounded-xl border-gray-300"
                            value={data.ambito}
                            onChange={(e) => setData('ambito', e.target.value)}
                        >
                            {(options?.ambitos || []).map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                        {errors.ambito && (
                            <InputError message={errors.ambito} />
                        )}
                    </div>

                    <div className="col-span-2 flex items-center gap-3 pt-6 md:col-span-1">
                        <input
                            type="checkbox"
                            id="validado"
                            checked={data.validado}
                            onChange={(e) =>
                                setData('validado', e.target.checked)
                            }
                            className="h-6 w-6 rounded-lg border-gray-300 text-brand-orange focus:ring-brand-orange"
                        />
                        <label
                            htmlFor="validado"
                            className="text-sm font-black text-gray-700"
                        >
                            MARCAR COMO VALIDADO
                        </label>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel value="Dirección de Área" />
                        <select
                            className="mt-1 w-full rounded-xl border-gray-300 text-sm"
                            value={data.direccion_area}
                            onChange={(e) => {
                                const newArea = e.target.value;
                                setData((prev) => ({
                                    ...prev,
                                    direccion_area: newArea,
                                    nivel_educativo: '', // Reset Nivel Educativo when area changes
                                }));
                            }}
                        >
                            <option value="">Seleccione...</option>
                            {(options?.areas || []).map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                        {errors.direccion_area && (
                            <InputError message={errors.direccion_area} />
                        )}
                    </div>

                    <div className="col-span-1">
                        <InputLabel value="Nivel Educativo" />
                        <select
                            className="mt-1 w-full rounded-xl border-gray-300 text-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.nivel_educativo}
                            onChange={(e) =>
                                setData('nivel_educativo', e.target.value)
                            }
                            disabled={!data.direccion_area}
                        >
                            <option value="">Seleccione Nivel...</option>
                            {(data.direccion_area
                                ? MAPA_AREA_NIVEL[data.direccion_area] || []
                                : []
                            ).map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                        {errors.nivel_educativo && (
                            <InputError message={errors.nivel_educativo} />
                        )}
                    </div>

                    <div className="col-span-2 mt-2 grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
                        <ModalInput
                            label="Radio"
                            value={data.radio}
                            onChange={(v) => setData('radio', v)}
                            error={errors.radio}
                        />
                        <ModalInput
                            label="Sector"
                            value={data.sector}
                            onChange={(v) => setData('sector', v)}
                            error={errors.sector}
                        />
                        <ModalInput
                            label="Zona"
                            value={data.letra_zona}
                            onChange={(v) => setData('letra_zona', v)}
                            error={errors.letra_zona}
                        />
                        <div className="space-y-1">
                            <InputLabel value="Categoría" />
                            <select
                                className="mt-1 w-full rounded-xl border-gray-300 text-xs font-bold focus:border-brand-orange focus:ring-brand-orange"
                                value={data.categoria}
                                onChange={(e) =>
                                    setData('categoria', e.target.value)
                                }
                            >
                                <option value="">Seleccione...</option>
                                <option value="PRIMERA">PRIMERA</option>
                                <option value="SEGUNDA">SEGUNDA</option>
                                <option value="TERCERA">TERCERA</option>
                                <option value="CUARTA">CUARTA</option>
                            </select>
                            {errors.categoria && (
                                <InputError message={errors.categoria} />
                            )}
                        </div>
                    </div>

                    <div className="col-span-2 mt-2 border-t pt-4">
                        <InputLabel
                            value="Comentarios / Observaciones del Establecimiento (CUE)"
                            className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
                        />
                        <textarea
                            placeholder="Escriba aquí las observaciones específicas de esta escuela (CUE)..."
                            value={data.observaciones}
                            onChange={(e) =>
                                setData('observaciones', e.target.value)
                            }
                            className="min-h-[100px] w-full rounded-xl border-gray-300 text-sm focus:border-brand-orange focus:ring-brand-orange"
                        />
                        {errors.observaciones && (
                            <InputError message={errors.observaciones} />
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                    <SecondaryButton onClick={onClose}>
                        Descartar
                    </SecondaryButton>
                    <PrimaryButton disabled={processing}>
                        {processing ? 'Guardando...' : 'Guardar Cambios'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}

function CreateModalidadModal({ show, onClose, options }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        nombre_establecimiento: '',
        cue: '',
        cui: '',
        establecimiento_cabecera: '',
        nivel_educativo: '',
        direccion_area: '',
        ambito: 'PUBLICO',
        sector: '',
        radio: '',
        zona: '',
        calle: '',
        localidad: '',
        zona_departamento: '',
    });

    const [cabeceraNombre, setCabeceraNombre] = useState('');

    useEffect(() => {
        if (!show) {
            setCabeceraNombre('');
        }
    }, [show]);

    const lookupCUI = (cuiStr) => {
        const cui = String(cuiStr).trim();
        if (cui.length < 3) return;
        fetch(route('api.lookup-edificio', cui))
            .then((res) => res.json())
            .then((res) => {
                if (res) {
                    setData((prev) => ({
                        ...prev,
                        cui,
                        calle: res.calle,
                        localidad: res.localidad,
                        zona_departamento: res.zona_departamento,
                        establecimiento_cabecera: res.cabecera_cue || prev.cue || '',
                    }));
                    if (res.cabecera_nombre) {
                        setCabeceraNombre(res.cabecera_nombre);
                    } else {
                        setCabeceraNombre('Edificio sin cabecera asignada (este nuevo establecimiento será cabecera)');
                    }
                } else {
                    setData((prev) => ({
                        ...prev,
                        cui,
                        establecimiento_cabecera: prev.cue || '',
                    }));
                    setCabeceraNombre('Edificio nuevo (este nuevo establecimiento será cabecera)');
                }
            })
            .catch(() => {
                setCabeceraNombre('');
            });
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.establecimientos.store'), {
            onSuccess: () => {
                onClose();
                reset();
            },
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <form onSubmit={submit} className="p-8">
                <h3 className="mb-8 flex items-center gap-3 text-2xl font-black text-gray-900">
                    <div className="rounded-xl bg-orange-50 p-2 text-brand-orange">
                        <i className="fas fa-plus"></i>
                    </div>
                    Nueva Modalidad Escolar
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-4 border-r pr-6 lg:col-span-1">
                        <h4 className="border-b pb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Datos de Ubicación
                        </h4>
                        <div>
                            <InputLabel value="CUI del Edificio" />
                            <TextInput
                                className="mt-1 w-full"
                                value={data.cui}
                                onChange={(e) => {
                                    setData('cui', e.target.value);
                                    lookupCUI(e.target.value);
                                }}
                            />
                            <InputError message={errors.cui} />
                        </div>
                        <ModalInput
                            label="Calle"
                            value={data.calle}
                            onChange={(v) => setData('calle', v)}
                        />
                        <ModalInput
                            label="Localidad"
                            value={data.localidad}
                            onChange={(v) => setData('localidad', v)}
                        />
                        <ModalInput
                            label="Departamento"
                            value={data.zona_departamento}
                            onChange={(v) => setData('zona_departamento', v)}
                        />
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                        <h4 className="border-b pb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Datos Académicos / Institucionales
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 lg:col-span-1">
                                <InputLabel value="CUE de la Modalidad" />
                                <TextInput
                                    className="mt-1 w-full"
                                    value={data.cue}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setData((prev) => ({
                                            ...prev,
                                            cue: val,
                                            // Si no hay cabecera asignada en el edificio, se asume que este CUE es cabecera de sí mismo
                                            establecimiento_cabecera: !cabeceraNombre || 
                                                cabeceraNombre.includes('nueva') || 
                                                cabeceraNombre.includes('nuevo') || 
                                                cabeceraNombre.includes('sin cabecera')
                                                ? val
                                                : prev.establecimiento_cabecera,
                                        }));
                                    }}
                                />
                                <InputError message={errors.cue} />
                            </div>
                            <div className="col-span-2 lg:col-span-1">
                                <InputLabel value="CUE Establecimiento Cabecera" />
                                <TextInput
                                    className="mt-1 w-full bg-gray-50 font-mono text-gray-700"
                                    value={data.establecimiento_cabecera}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setData('establecimiento_cabecera', val);
                                        setCabeceraNombre('');
                                    }}
                                    placeholder="Ej: 700053600"
                                />
                                {cabeceraNombre && (
                                    <p className="mt-1 text-xs font-semibold text-brand-orange">
                                        <i className="fas fa-school mr-1"></i> {cabeceraNombre}
                                    </p>
                                )}
                                <InputError
                                    message={errors.establecimiento_cabecera}
                                />
                            </div>
                            <div className="col-span-2">
                                <InputLabel value="Nombre Completo" />
                                <TextInput
                                    className="mt-1 w-full"
                                    value={data.nombre_establecimiento}
                                    onChange={(e) =>
                                        setData(
                                            'nombre_establecimiento',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={errors.nombre_establecimiento}
                                />
                            </div>

                            <div className="col-span-1">
                                <InputLabel value="Dirección de Área" />
                                <select
                                    className="mt-1 w-full rounded-xl border-gray-300 text-sm"
                                    value={data.direccion_area}
                                    onChange={(e) => {
                                        const newArea = e.target.value;
                                        setData((prev) => ({
                                            ...prev,
                                            direccion_area: newArea,
                                            nivel_educativo: '', // Reset Nivel Educativo when area changes
                                        }));
                                    }}
                                >
                                    <option value="">Seleccione...</option>
                                    {(options?.areas || []).map((o) => (
                                        <option key={o} value={o}>
                                            {o}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <InputLabel value="Nivel Educativo" />
                                <select
                                    className="mt-1 w-full rounded-xl border-gray-300 text-sm focus:border-brand-orange focus:ring-brand-orange"
                                    value={data.nivel_educativo}
                                    onChange={(e) =>
                                        setData(
                                            'nivel_educativo',
                                            e.target.value,
                                        )
                                    }
                                    disabled={!data.direccion_area}
                                >
                                    <option value="">
                                        Seleccione Nivel...
                                    </option>
                                    {(data.direccion_area
                                        ? MAPA_AREA_NIVEL[
                                              data.direccion_area
                                          ] || []
                                        : []
                                    ).map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex justify-end gap-4 border-t pt-8">
                    <SecondaryButton onClick={onClose}>
                        Cancelar
                    </SecondaryButton>
                    <PrimaryButton
                        className="px-8 py-3 text-sm"
                        disabled={processing}
                    >
                        Confirmar Alta
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}

function ModalInput({ label, value, onChange, error, type = 'text' }) {
    return (
        <div className="space-y-1">
            <InputLabel value={label} />
            <TextInput
                type={type}
                className="mt-1 w-full"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {error && <InputError message={error} />}
        </div>
    );
}

function DetailItem({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4 rounded-xl border border-gray-50 bg-gray-50/50 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 shadow-sm">
                <i className={icon}></i>
            </div>
            <div>
                <p className="mb-1 text-[9px] font-black uppercase leading-none tracking-widest text-gray-400">
                    {label}
                </p>
                <p className="text-xs font-bold leading-tight text-gray-800">
                    {value}
                </p>
            </div>
        </div>
    );
}
