/**
 * mapHelpers.js
 * Map constants and spatial calculations used across map views.
 */

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

export const getCirclePoints = (center, radiusMeters, numPoints = 64) => {
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
