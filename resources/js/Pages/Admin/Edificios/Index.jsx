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
import { useEffect, useMemo, useRef, useState } from 'react';

export default function Index({ edificios, filters, options }) {
    const [search, setSearch] = useState(filters.search || '');
    const [searchCui, setSearchCui] = useState(filters.search_cui || '');
    const [selectedEdificio, setSelectedEdificio] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Refs to capture latest search values for the debounced callback
    const searchRef = useRef(search);
    const searchCuiRef = useRef(searchCui);
    searchRef.current = search;
    searchCuiRef.current = searchCui;

    // Filter handling
    const applyFilters = useMemo(
        () =>
            debounce(() => {
                router.get(
                    route('admin.edificios.index'),
                    {
                        ...filters,
                        search: searchRef.current,
                        search_cui: searchCuiRef.current,
                    },
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
        const val = e.target.value;
        setSearch(val);
        searchRef.current = val;
        applyFilters();
    };

    const handleSearchCui = (e) => {
        const val = e.target.value;
        setSearchCui(val);
        searchCuiRef.current = val;
        applyFilters();
    };

    const handleParamChange = (key, value) => {
        router.get(
            route('admin.edificios.index'),
            { ...filters, [key]: value },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleSort = (field) => {
        const direction =
            filters.sort_by === field && filters.sort_dir === 'asc'
                ? 'desc'
                : 'asc';
        router.get(
            route('admin.edificios.index'),
            {
                ...filters,
                sort_by: field,
                sort_dir: direction,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    // Modal Handlers
    const openEdit = (edificio) => {
        setSelectedEdificio(edificio);
        setShowEditModal(true);
    };

    const openView = (edificio) => {
        setSelectedEdificio(edificio);
        setShowViewModal(true);
    };

    const handleDelete = (id) => {
        if (
            confirm(
                '¿Está seguro de que desea eliminar este edificio? Se trasladará a la papelera de reciclaje.',
            )
        ) {
            router.delete(route('admin.edificios.destroy', id), {
                onError: (errors) => {
                    if (errors.error) {
                        alert(errors.error);
                    }
                },
            });
        }
    };

    return (
        <SIAMELayout header={null}>
            <Head title="Edificios" />

            <div className="space-y-6">
                {/* Filters & Actions Bar */}
                <div className="rounded-2x flex flex-col items-center gap-4 border border-gray-100 bg-white p-4 shadow-sm md:flex-row">
                    <div className="relative w-full md:w-52">
                        <input
                            type="text"
                            placeholder="Buscar por CUI..."
                            className="w-full rounded-xl border-gray-200 py-2 pl-10 pr-4 text-sm transition-all focus:border-brand-orange focus:ring-brand-orange"
                            value={searchCui}
                            onChange={handleSearchCui}
                        />
                        <i className="fas fa-search absolute left-3.5 top-3 text-gray-400"></i>
                    </div>

                    <div className="relative w-full flex-1">
                        <input
                            type="text"
                            placeholder="Buscar por CUE o Establecimiento..."
                            className="w-full rounded-xl border-gray-200 py-2 pl-10 pr-4 text-sm transition-all focus:border-brand-orange focus:ring-brand-orange"
                            value={search}
                            onChange={handleSearch}
                        />
                        <i className="fas fa-search absolute left-3.5 top-3 text-gray-400"></i>
                    </div>

                    <select
                        value={filters.zona_departamento || ''}
                        onChange={(e) =>
                            handleParamChange(
                                'zona_departamento',
                                e.target.value,
                            )
                        }
                        className="min-w-[200px] rounded-xl border-gray-200 text-sm focus:border-brand-orange focus:ring-brand-orange"
                    >
                        <option value="">Departamentos (Todos)</option>
                        {(options?.zonas || []).map((z) => (
                            <option key={z} value={z}>
                                {z}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.localidad || ''}
                        onChange={(e) =>
                            handleParamChange('localidad', e.target.value)
                        }
                        className="min-w-[150px] rounded-xl border-gray-200 text-sm focus:border-brand-orange focus:ring-brand-orange"
                    >
                        <option value="">Localidades (Todas)</option>
                        {(options?.localidades || []).map((l) => (
                            <option key={l} value={l}>
                                {l}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.ambito || ''}
                        onChange={(e) =>
                            handleParamChange('ambito', e.target.value)
                        }
                        className="min-w-[150px] rounded-xl border-gray-200 text-sm font-black uppercase focus:border-brand-orange focus:ring-brand-orange"
                    >
                        <option value="">Ámbito (Todos)</option>
                        {(options?.ambitos || []).map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>

                    <div className="flex h-[38px] min-w-[50px] items-center justify-center rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm font-black text-black shadow-sm">
                        {edificios.total}
                    </div>

                    <div className="ml-2 flex shrink-0 gap-2 border-l border-gray-100 pl-4">
                        <a
                            href={route('admin.edificios.export')}
                            className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-green-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm transition hover:bg-green-700"
                        >
                            <i className="fas fa-file-excel"></i> Exportar
                        </a>
                        <PrimaryButton
                            className="gap-2 !rounded-xl !px-4 !py-2 !text-[10px]"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <i className="fas fa-plus"></i> Nuevo
                        </PrimaryButton>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden border border-gray-100 bg-white shadow-sm sm:rounded-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-orange-600 bg-brand-orange text-[10px] font-black uppercase text-white">
                                    <th
                                        className="group cursor-pointer px-6 py-2 transition-colors hover:bg-orange-600"
                                        onClick={() => handleSort('cui')}
                                    >
                                        <div className="flex items-center gap-2">
                                            CUI / Ubicación
                                            <i
                                                className={`fas fa-sort${filters.sort_by === 'cui' ? (filters.sort_dir === 'asc' ? '-up' : '-down') : ''} opacity-50 group-hover:opacity-100`}
                                            ></i>
                                        </div>
                                    </th>
                                    <th className="px-6 py-2">
                                        Establecimiento Cabecera
                                    </th>
                                    <th
                                        className="group cursor-pointer px-6 py-2 transition-colors hover:bg-orange-600"
                                        onClick={() =>
                                            handleSort('zona_departamento')
                                        }
                                    >
                                        <div className="flex items-center gap-2">
                                            Depto / Localidad
                                            <i
                                                className={`fas fa-sort${filters.sort_by === 'zona_departamento' ? (filters.sort_dir === 'asc' ? '-up' : '-down') : ''} opacity-50 group-hover:opacity-100`}
                                            ></i>
                                        </div>
                                    </th>
                                    <th className="px-6 py-2 text-center">
                                        Ámbito
                                    </th>
                                    <th className="px-6 py-2 text-right">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {edificios.data.map((edificio) => (
                                    <tr
                                        key={edificio.id}
                                        className="group transition-colors hover:bg-orange-50/30"
                                    >
                                        <td className="px-6 py-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-black group-hover:text-brand-orange">
                                                    {edificio.cui}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-black/40">
                                                    {edificio.calle}{' '}
                                                    {edificio.numero_puerta ||
                                                        'S/N'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-2">
                                            <span className="line-clamp-2 text-xs font-black leading-tight text-black/80">
                                                {edificio.cabecera?.nombre ||
                                                    'Sin Cabecera'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-black/70">
                                                    {edificio.zona_departamento}
                                                </span>
                                                <span className="text-[10px] font-black text-black/40">
                                                    {edificio.localidad}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-2 text-center">
                                            <span
                                                className={`inline-flex items-center justify-center rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
                                                    getEdificioAmbito(
                                                        edificio,
                                                    ) === 'PUBLICO'
                                                        ? 'border border-orange-100 bg-orange-50 text-brand-orange'
                                                        : 'border border-blue-100 bg-blue-50 text-blue-600'
                                                }`}
                                            >
                                                {getEdificioAmbito(edificio)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        openView(edificio)
                                                    }
                                                    className="rounded-lg bg-gray-50 p-2 text-gray-400 shadow-sm transition hover:bg-brand-orange hover:text-white"
                                                    title="Ver detalles"
                                                >
                                                    <i className="fas fa-eye text-xs"></i>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        openEdit(edificio)
                                                    }
                                                    className="rounded-lg bg-orange-50 p-2 text-brand-orange shadow-sm transition hover:bg-brand-orange hover:text-white"
                                                    title="Editar edificio"
                                                >
                                                    <i className="fas fa-edit text-xs"></i>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(
                                                            edificio.id,
                                                        )
                                                    }
                                                    className="rounded-lg border border-brand-red/20 bg-red-50 p-2 text-brand-red shadow-sm transition hover:bg-brand-red hover:text-white"
                                                    title="Eliminar edificio"
                                                >
                                                    <i className="fas fa-trash text-xs"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="-mt-2 flex justify-center">
                    <Pagination links={edificios.links} />
                </div>
            </div>

            {/* Modals */}
            <ViewEdificioModal
                show={showViewModal}
                onClose={() => setShowViewModal(false)}
                edificio={selectedEdificio}
            />
            <EditEdificioModal
                show={showEditModal}
                onClose={() => setShowEditModal(false)}
                edificio={selectedEdificio}
                options={options}
            />
            <CreateEdificioModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                options={options}
            />
        </SIAMELayout>
    );
}

function CreateEdificioModal({ show, onClose, options = {} }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        cui: '',
        calle: '',
        numero_puerta: '',
        localidad: '',
        zona_departamento: '',
        codigo_postal: '',
        latitud: '',
        longitud: '',
        letra_zona: '',
        orientacion: '',
        te_voip: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.edificios.store'), {
            onSuccess: () => {
                onClose();
                reset();
            },
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <form onSubmit={submit} className="p-6">
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-xl text-brand-orange shadow-sm">
                        <i className="fas fa-plus-circle"></i>
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase text-black">
                            Nuevo Edificio
                        </h3>
                        <p className="text-[10px] font-black tracking-widest text-black/40">
                            ALTA DE REGISTRO
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="cui" value="CUI" />
                        <TextInput
                            id="cui"
                            className="mt-1 block w-full border-orange-100 bg-orange-50/50"
                            value={data.cui}
                            onChange={(e) => setData('cui', e.target.value)}
                            required
                        />
                        <InputError message={errors.cui} className="mt-2" />
                    </div>

                    <div className="col-span-2 border-t border-orange-100 pt-4 md:col-span-2">
                        <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-black/50">
                            Información de Ubicación
                        </h4>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="calle" value="Calle" />
                        <TextInput
                            id="calle"
                            className="mt-1 block w-full"
                            value={data.calle}
                            onChange={(e) => setData('calle', e.target.value)}
                            required
                        />
                        <InputError message={errors.calle} className="mt-2" />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="numero" value="Número" />
                        <TextInput
                            id="numero"
                            className="mt-1 block w-full"
                            value={data.numero_puerta}
                            onChange={(e) =>
                                setData('numero_puerta', e.target.value)
                            }
                        />
                        <InputError
                            message={errors.numero_puerta}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="localidad" value="Localidad" />
                        <TextInput
                            id="localidad"
                            className="mt-1 block w-full"
                            value={data.localidad}
                            onChange={(e) =>
                                setData('localidad', e.target.value)
                            }
                            required
                        />
                        <InputError
                            message={errors.localidad}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="depto" value="Departamento" />
                        <select
                            id="depto"
                            className="mt-1 block w-full rounded-xl border-gray-300 text-sm font-semibold shadow-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.zona_departamento}
                            onChange={(e) =>
                                setData('zona_departamento', e.target.value)
                            }
                            required
                        >
                            <option value="">Seleccione Departamento...</option>
                            {(options.zonas || []).map((z) => (
                                <option key={z} value={z}>
                                    {z}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.zona_departamento}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 border-t pt-4 md:col-span-2">
                        <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Geo-referenciación (Opcional)
                        </h4>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="lat" value="Latitud" />
                        <TextInput
                            id="lat"
                            className="mt-1 block w-full"
                            value={data.latitud}
                            onChange={(e) => setData('latitud', e.target.value)}
                        />
                        <InputError message={errors.latitud} className="mt-2" />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="lng" value="Longitud" />
                        <TextInput
                            id="lng"
                            className="mt-1 block w-full"
                            value={data.longitud}
                            onChange={(e) =>
                                setData('longitud', e.target.value)
                            }
                        />
                        <InputError
                            message={errors.longitud}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 border-t pt-4 md:col-span-2">
                        <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Otros Datos
                        </h4>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="cp" value="Código Postal" />
                        <select
                            id="cp"
                            className="mt-1 block w-full rounded-xl border-gray-300 text-sm font-semibold shadow-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.codigo_postal}
                            onChange={(e) =>
                                setData('codigo_postal', e.target.value)
                            }
                        >
                            <option value="">
                                Seleccione Código Postal...
                            </option>
                            {(options.codigos_postales || []).map((cp) => (
                                <option key={cp} value={cp}>
                                    {cp}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.codigo_postal}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="orientacion" value="Orientación" />
                        <select
                            id="orientacion"
                            className="mt-1 block w-full rounded-xl border-gray-300 text-sm font-semibold shadow-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.orientacion}
                            onChange={(e) =>
                                setData('orientacion', e.target.value)
                            }
                        >
                            <option value="">Seleccione Orientación...</option>
                            {(options.orientaciones || []).map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.orientacion}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="te_voip" value="Teléfono VoIP" />
                        <TextInput
                            id="te_voip"
                            className="mt-1 block w-full"
                            value={data.te_voip}
                            onChange={(e) => setData('te_voip', e.target.value)}
                        />
                        <InputError message={errors.te_voip} className="mt-2" />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="letra_zona" value="Letra Zona" />
                        <select
                            id="letra_zona"
                            className="mt-1 block w-full rounded-xl border-gray-300 text-sm font-semibold shadow-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.letra_zona}
                            onChange={(e) =>
                                setData('letra_zona', e.target.value)
                            }
                        >
                            <option value="">Seleccione Letra Zona...</option>
                            {(options.letras_zona || []).map((lz) => (
                                <option key={lz} value={lz}>
                                    {lz}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.letra_zona}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div className="mt-10 flex justify-end gap-3 border-t pt-6">
                    <SecondaryButton onClick={onClose} disabled={processing}>
                        Cancelar
                    </SecondaryButton>
                    <PrimaryButton disabled={processing}>
                        {processing ? 'Creando...' : 'Crear Edificio'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}

function ViewEdificioModal({ show, onClose, edificio }) {
    if (!edificio) return null;
    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-xl text-brand-orange shadow-sm">
                            <i className="fas fa-info-circle"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">
                                Detalles del Edificio
                            </h3>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                CUI: {edificio.cui}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <DetailItem
                        icon="fas fa-map-marker-alt"
                        label="Ubicación"
                        value={`${edificio.calle} ${edificio.numero_puerta || 'S/N'}`}
                    />
                    <DetailItem
                        icon="fas fa-city"
                        label="Localidad / Depto"
                        value={`${edificio.localidad} - ${edificio.zona_departamento}`}
                    />
                    <DetailItem
                        icon="fas fa-mail-bulk"
                        label="Código Postal"
                        value={edificio.codigo_postal || 'N/A'}
                    />
                    <DetailItem
                        icon="fas fa-compass"
                        label="Coordenadas"
                        value={`${edificio.latitud || '?'}, ${edificio.longitud || '?'}`}
                    />
                </div>

                <div className="border-t pt-6">
                    <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Establecimientos que comparten este edificio
                    </h4>
                    <div className="space-y-3">
                        {edificio.establecimientos.map((est) => (
                            <div
                                key={est.id}
                                className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-brand-orange"
                            >
                                <div>
                                    <p className="mb-1 text-xs font-black leading-none text-gray-800">
                                        {est.nombre}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase text-gray-400">
                                        CUE: {est.cue}
                                    </p>
                                </div>
                                <i className="fas fa-chevron-right text-gray-200 transition-colors group-hover:text-brand-orange"></i>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <SecondaryButton onClick={onClose}>Cerrar</SecondaryButton>
                </div>
            </div>
        </Modal>
    );
}

function EditEdificioModal({ show, onClose, edificio, options = {} }) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        cui: edificio?.cui || '',
        calle: edificio?.calle || '',
        numero_puerta: edificio?.numero_puerta || '',
        localidad: edificio?.localidad || '',
        zona_departamento: edificio?.zona_departamento || '',
        codigo_postal: edificio?.codigo_postal || '',
        latitud: edificio?.latitud || '',
        longitud: edificio?.longitud || '',
        letra_zona: edificio?.letra_zona || '',
        orientacion: edificio?.orientacion || '',
        te_voip: edificio?.te_voip || '',
        cue_cabecera: edificio?.cabecera_cue || '',
    });

    const [detectedNombre, setDetectedNombre] = useState('');
    const [detectedCui, setDetectedCui] = useState(null);
    const [cueStatus, setCueStatus] = useState('idle'); // 'idle' | 'loading' | 'found_local' | 'found_external' | 'not_found'

    useEffect(() => {
        if (show && edificio) {
            setData({
                cui: edificio.cui || '',
                calle: edificio.calle || '',
                numero_puerta: edificio.numero_puerta || '',
                localidad: edificio.localidad || '',
                zona_departamento: edificio.zona_departamento || '',
                codigo_postal: edificio.codigo_postal || '',
                latitud: edificio.latitud || '',
                longitud: edificio.longitud || '',
                letra_zona: edificio.letra_zona || '',
                orientacion: edificio.orientacion || '',
                te_voip: edificio.te_voip || '',
                cue_cabecera: edificio.cabecera_cue || '',
            });
        }
    }, [edificio, show, setData]);

    useEffect(() => {
        const cueStr = String(data.cue_cabecera).trim();
        if (!cueStr) {
            setDetectedNombre('');
            setDetectedCui(null);
            setCueStatus('idle');
            return;
        }

        // 1. Check if it's the current cabecera (eager-loaded)
        if (cueStr === String(edificio?.cabecera_cue)) {
            setDetectedNombre(edificio?.cabecera?.nombre || 'Sin Nombre');
            setDetectedCui(edificio?.cui);
            setCueStatus('found_local');
            return;
        }

        // 2. Check if it is in the current building's establishments
        const localEst = edificio?.establecimientos?.find(
            (e) => String(e.cue) === cueStr,
        );
        if (localEst) {
            setDetectedNombre(localEst.nombre);
            setDetectedCui(edificio?.cui);
            setCueStatus('found_local');
            return;
        }

        // 3. Otherwise, fetch from the database to see if it is a valid external CUE
        setCueStatus('loading');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            fetch(route('api.lookup-cue', cueStr), {
                signal: controller.signal,
            })
                .then((res) => {
                    if (!res.ok) throw new Error();
                    return res.json();
                })
                .then((res) => {
                    if (res && res.nombre) {
                        setDetectedNombre(res.nombre);
                        setDetectedCui(res.cui);
                        setCueStatus('found_external');
                    } else {
                        setDetectedNombre('');
                        setDetectedCui(null);
                        setCueStatus('not_found');
                    }
                })
                .catch(() => {
                    if (!controller.signal.aborted) {
                        setDetectedNombre('');
                        setDetectedCui(null);
                        setCueStatus('not_found');
                    }
                });
        }, 300); // 300ms debounce

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [data.cue_cabecera, edificio]);

    if (!edificio) return null;

    const submit = (e) => {
        e.preventDefault();
        patch(route('admin.edificios.update', edificio.id), {
            onSuccess: () => {
                onClose();
                reset();
            },
        });
    };

    const renderDetectedName = () => {
        if (!data.cue_cabecera) {
            return (
                <span className="font-medium normal-case text-gray-400">
                    Ingrese un CUE de cabecera
                </span>
            );
        }
        if (cueStatus === 'loading') {
            return (
                <span className="flex animate-pulse items-center gap-1.5 font-medium text-gray-400">
                    <i className="fas fa-spinner fa-spin"></i> Buscando CUE...
                </span>
            );
        }
        if (cueStatus === 'found_local') {
            return (
                <span className="flex items-center gap-1.5 font-extrabold text-green-600">
                    <i className="fas fa-check-circle"></i> {detectedNombre}
                </span>
            );
        }
        if (cueStatus === 'found_external') {
            return (
                <span className="flex flex-col gap-1 font-bold text-orange-600">
                    <span className="flex items-center gap-1.5 font-extrabold text-orange-600">
                        <i className="fas fa-exclamation-triangle"></i>{' '}
                        {detectedNombre}
                    </span>
                    <span className="text-[10px] font-medium normal-case leading-tight text-orange-500/80">
                        * CUE válido pero no pertenece a este edificio
                        actualmente (asociado a CUI {detectedCui}). Se
                        actualizará la cabecera del edificio.
                    </span>
                </span>
            );
        }
        if (cueStatus === 'not_found') {
            return (
                <span className="flex flex-col gap-1 font-bold text-red-600">
                    <span className="flex items-center gap-1.5 text-[11px] leading-tight">
                        <i className="fas fa-times-circle"></i> CUE no
                        registrado en el sistema
                    </span>
                    <span className="text-[9px] font-medium normal-case leading-tight text-red-500/80">
                        * Verifique el número ingresado.
                    </span>
                </span>
            );
        }
        return null;
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <form onSubmit={submit} className="p-6">
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-xl text-brand-orange shadow-sm">
                        <i className="fas fa-edit"></i>
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase text-gray-900">
                            Editar Edificio
                        </h3>
                        <p className="text-[10px] font-bold tracking-widest text-gray-400">
                            ACTUALIZACIÓN DE REGISTRO
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="cui" value="CUI" />
                        <TextInput
                            id="cui"
                            className="mt-1 block w-full border-orange-100 bg-orange-50/50"
                            value={data.cui}
                            onChange={(e) => setData('cui', e.target.value)}
                            required
                        />
                        <InputError message={errors.cui} className="mt-2" />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel
                            htmlFor="cue_cabecera"
                            value="CUE de la Cabecera"
                        />
                        <TextInput
                            id="cue_cabecera"
                            className="mt-1 block w-full border-orange-200 bg-orange-50 font-black text-brand-orange"
                            placeholder="Ingrese CUE para actualizar nombre"
                            value={data.cue_cabecera}
                            onChange={(e) =>
                                setData('cue_cabecera', e.target.value)
                            }
                        />
                        <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-2.5">
                            <p className="mb-1.5 text-[10px] font-black uppercase leading-none tracking-widest text-gray-400">
                                Nombre Detectado:
                            </p>
                            <p className="text-xs font-black uppercase leading-normal">
                                {renderDetectedName()}
                            </p>
                        </div>
                        <p className="mt-1 text-[9px] font-bold uppercase italic text-gray-400">
                            * Actualizará el establecimiento cabecera del
                            edificio (edificios.cabecera_cue).
                        </p>
                        <InputError
                            message={errors.cue_cabecera}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 border-t pt-4 md:col-span-2">
                        <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Información de Ubicación
                        </h4>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="calle" value="Calle" />
                        <TextInput
                            id="calle"
                            className="mt-1 block w-full"
                            value={data.calle}
                            onChange={(e) => setData('calle', e.target.value)}
                            required
                        />
                        <InputError message={errors.calle} className="mt-2" />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="numero" value="Número" />
                        <TextInput
                            id="numero"
                            className="mt-1 block w-full"
                            value={data.numero_puerta}
                            onChange={(e) =>
                                setData('numero_puerta', e.target.value)
                            }
                        />
                        <InputError
                            message={errors.numero_puerta}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="localidad" value="Localidad" />
                        <TextInput
                            id="localidad"
                            className="mt-1 block w-full"
                            value={data.localidad}
                            onChange={(e) =>
                                setData('localidad', e.target.value)
                            }
                            required
                        />
                        <InputError
                            message={errors.localidad}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="depto" value="Departamento" />
                        <select
                            id="depto"
                            className="mt-1 block w-full rounded-xl border-gray-300 text-sm font-semibold shadow-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.zona_departamento}
                            onChange={(e) =>
                                setData('zona_departamento', e.target.value)
                            }
                            required
                        >
                            <option value="">Seleccione Departamento...</option>
                            {(options.zonas || []).map((z) => (
                                <option key={z} value={z}>
                                    {z}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.zona_departamento}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 border-t pt-4 md:col-span-2">
                        <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Geo-referenciación
                        </h4>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="lat_edit" value="Latitud" />
                        <TextInput
                            id="lat_edit"
                            className="mt-1 block w-full"
                            value={data.latitud}
                            onChange={(e) => setData('latitud', e.target.value)}
                        />
                        <InputError message={errors.latitud} className="mt-2" />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="lng_edit" value="Longitud" />
                        <TextInput
                            id="lng_edit"
                            className="mt-1 block w-full"
                            value={data.longitud}
                            onChange={(e) =>
                                setData('longitud', e.target.value)
                            }
                        />
                        <InputError
                            message={errors.longitud}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 border-t pt-4 md:col-span-2">
                        <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Otros Datos
                        </h4>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel htmlFor="cp_edit" value="Código Postal" />
                        <select
                            id="cp_edit"
                            className="mt-1 block w-full rounded-xl border-gray-300 text-sm font-semibold shadow-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.codigo_postal}
                            onChange={(e) =>
                                setData('codigo_postal', e.target.value)
                            }
                        >
                            <option value="">
                                Seleccione Código Postal...
                            </option>
                            {(options.codigos_postales || []).map((cp) => (
                                <option key={cp} value={cp}>
                                    {cp}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.codigo_postal}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel
                            htmlFor="orientacion_edit"
                            value="Orientación"
                        />
                        <select
                            id="orientacion_edit"
                            className="mt-1 block w-full rounded-xl border-gray-300 text-sm font-semibold shadow-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.orientacion}
                            onChange={(e) =>
                                setData('orientacion', e.target.value)
                            }
                        >
                            <option value="">Seleccione Orientación...</option>
                            {(options.orientaciones || []).map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.orientacion}
                            className="mt-2"
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel
                            htmlFor="te_voip_edit"
                            value="Teléfono VoIP"
                        />
                        <TextInput
                            id="te_voip_edit"
                            className="mt-1 block w-full"
                            value={data.te_voip}
                            onChange={(e) => setData('te_voip', e.target.value)}
                        />
                        <InputError message={errors.te_voip} className="mt-2" />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <InputLabel
                            htmlFor="letra_zona_edit"
                            value="Letra Zona"
                        />
                        <select
                            id="letra_zona_edit"
                            className="mt-1 block w-full rounded-xl border-gray-300 text-sm font-semibold shadow-sm focus:border-brand-orange focus:ring-brand-orange"
                            value={data.letra_zona}
                            onChange={(e) =>
                                setData('letra_zona', e.target.value)
                            }
                        >
                            <option value="">Seleccione Letra Zona...</option>
                            {(options.letras_zona || []).map((lz) => (
                                <option key={lz} value={lz}>
                                    {lz}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.letra_zona}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div className="mt-10 flex justify-end gap-3 border-t pt-6">
                    <SecondaryButton onClick={onClose} disabled={processing}>
                        Cancelar
                    </SecondaryButton>
                    <PrimaryButton disabled={processing}>
                        {processing ? 'Guardando...' : 'Guardar Cambios'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}

function DetailItem({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-100 bg-orange-50 text-brand-orange">
                <i className={icon}></i>
            </div>
            <div>
                <p className="mb-1 text-[10px] font-black uppercase leading-none tracking-widest text-black/40">
                    {label}
                </p>
                <p className="text-sm font-black leading-tight text-black">
                    {value}
                </p>
            </div>
        </div>
    );
}

const getEdificioAmbito = (edificio) => {
    if (!edificio.establecimientos || edificio.establecimientos.length === 0)
        return 'S/D';

    // Buscar en todos los establecimientos del edificio
    for (const est of edificio.establecimientos) {
        if (est.modalidades && est.modalidades.length > 0) {
            // Retornar el primer ámbito encontrado
            return est.modalidades[0].ambito || 'S/D';
        }
    }
    return 'S/D';
};
