<?php

/**
 * ============================================================
 * CONFIGURACIÓN DE AUDITORÍA — SIAME
 * ============================================================
 *
 * Modificá este archivo para ajustar los parámetros de auditoría
 * sin necesidad de tocar el código del sistema.
 *
 * Reglas clave del sistema educativo de San Juan:
 *  - Un docente puede tener CARGOS (sin horas en sistema) + HORAS CÁTEDRA (con horas)
 *  - Los CARGOS (director, maestro de grado, preceptor) aparecen con horas_catedra = 0
 *  - Las HORAS CÁTEDRA (profesor secundario/terciario) tienen su valor real en horas_catedra
 *  - El límite semanal es sobre la SUMA TOTAL (equivalencia de cargos + horas reales)
 * ============================================================
 */

return [

    // ─────────────────────────────────────────────────────────
    // LÍMITE MÁXIMO DE HORAS SEMANALES
    // Artículo normativo de referencia: Estatuto Docente San Juan
    // ─────────────────────────────────────────────────────────
    'max_horas_semanales' => 50,

    // ─────────────────────────────────────────────────────────
    // EQUIVALENCIAS HORARIAS PARA CARGOS (horas_catedra = 0)
    //
    // Cuando un cargo aparece con 0 horas en el sistema,
    // se aplica una equivalencia basada en la descripción del cargo.
    // Ajustá estos valores según la normativa vigente.
    //
    // Se evalúan en orden: el PRIMER match que coincida se usa.
    // ─────────────────────────────────────────────────────────
    'equivalencias_cargo' => [

        // -- Por tipo de jornada --
        [
            'palabras_clave' => ['jornada extendida', 'j. extendida'],
            'horas_equivalentes' => 35,
            'etiqueta' => 'Jornada Extendida',
        ],
        [
            'palabras_clave' => ['jornada completa', 'j. completa', 'tiempo completo'],
            'horas_equivalentes' => 40,
            'etiqueta' => 'Jornada Completa',
        ],
        [
            'palabras_clave' => ['jornada simple', 'j. simple'],
            'horas_equivalentes' => 25,
            'etiqueta' => 'Jornada Simple',
        ],

        // -- Por rol/función específica --
        [
            'palabras_clave' => ['director', 'directora'],
            'horas_equivalentes' => 40,
            'etiqueta' => 'Cargo Directivo',
        ],
        [
            'palabras_clave' => ['vice', 'vicedirector', 'subdirector'],
            'horas_equivalentes' => 40,
            'etiqueta' => 'Cargo Directivo (Vice)',
        ],
        [
            'palabras_clave' => ['secretario', 'secretaria'],
            'horas_equivalentes' => 35,
            'etiqueta' => 'Cargo Secretaría',
        ],
        [
            'palabras_clave' => ['preceptor', 'preceptora'],
            'horas_equivalentes' => 20,
            'etiqueta' => 'Cargo Preceptor',
        ],
        [
            'palabras_clave' => ['maestro de grado', 'maestra de grado', 'maestro grado'],
            'horas_equivalentes' => 25,
            'etiqueta' => 'Maestro de Grado (Simple)',
        ],
        [
            'palabras_clave' => ['maestro de especialidad', 'maestra de especialidad', 'especialidades'],
            'horas_equivalentes' => 20,
            'etiqueta' => 'Maestro de Especialidad',
        ],
        [
            'palabras_clave' => ['inicial', 'jardín', 'jardin', 'nivel inicial'],
            'horas_equivalentes' => 25,
            'etiqueta' => 'Nivel Inicial',
        ],
        [
            'palabras_clave' => ['otras funciones', 'función docente', 'funcion docente'],
            'horas_equivalentes' => 20,
            'etiqueta' => 'Otras Funciones',
        ],
    ],

    // ─────────────────────────────────────────────────────────
    // EQUIVALENCIA POR DEFECTO
    // Se aplica cuando ninguna palabra clave coincide.
    // ─────────────────────────────────────────────────────────
    'equivalencia_cargo_defecto' => [
        'horas_equivalentes' => 25,
        'etiqueta' => 'Cargo sin clasificar (estimado)',
    ],

    // ─────────────────────────────────────────────────────────
    // COMBINACIONES VÁLIDAS
    // ─────────────────────────────────────────────────────────
    'max_cargos_sin_horas' => 2,      // máximo de cargos (horas=0) permitidos solos
    'max_cargos_con_horas' => 1,      // máximo de cargos (horas=0) si TAMBIÉN tiene horas cátedra

    // ─────────────────────────────────────────────────────────
    // UMBRALES PARA CLASIFICACIÓN DE LICENCIAS
    // ─────────────────────────────────────────────────────────
    'licencia_larga_dias' => 30,      // > 30 días → Nivel A (prolongada, con suplente formal)
    'licencia_media_dias' => 5,       // 6–30 días → Nivel B (rotativo, sin designación formal)
                                      // ≤ 5 días → Nivel C (ausencia breve, sin reemplazo)
];
