# Guía de Estilos Visuales (Design System)

Esta guía contiene la paleta de colores, tipografías, sombras y utilidades CSS utilizadas en el proyecto. Puedes copiar estos valores e importaciones para replicar el diseño en otro proyecto.

## 1. Tipografía e Iconos

**Tipografía Principal:** `Inter` (Google Fonts)
**Iconos:** `Font Awesome 6.4.0`

**Importaciones necesarias (HTML / CSS):**
```css
/* Importar Inter en CSS */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```
```html
<!-- Importar Font Awesome en el <head> -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
```

## 2. Paleta de Colores

### Colores de Marca (Brand)
- **Naranja Institucional (Primary):** `#FE8204`
- **Amarillo:** `#FADC3C`
- **Rojo:** `#E43C2F`
- **Negro Puro (Accent):** `#1a1a1c`

### Colores de Interfaz (UI)
- **Fondo (Background):** `#fcfcfc`
- **Superficie / Tarjetas (Surface):** `#ffffff`
- **Texto Principal:** `#1a1a1c`
- **Texto Secundario (Muted):** `#64748b`
- **Texto Claro:** `#ffffff`
- **Bordes:** `rgba(0, 0, 0, 0.05)`

### Colores Efecto Glassmorphism
- **Fondo Glass:** `rgba(255, 255, 255, 0.85)`
- **Borde Glass:** `rgba(254, 130, 4, 0.1)`
- **Brillo Primario (Glow):** `rgba(254, 130, 4, 0.15)`

## 3. Sombras (Shadows)

- **Shadow Premium:** `0 4px 20px rgba(0, 0, 0, 0.04)`
- **Shadow Premium Hover:** `0 8px 30px rgba(255, 130, 0, 0.08)`

## 4. Archivo CSS Principal (`globals.css`)

Aquí tienes el código CSS base listo para ser integrado, incluyendo las variables en `:root`, utilidades personalizadas (en formato CSS estándar o para Tailwind v4 como `@utility`), el fondo dinámico y la barra de desplazamiento.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
/* @import "tailwindcss"; (Si usas Tailwind v4) */

:root {
  /* Colors */
  --bg-color: #fcfcfc;
  --surface-color: #ffffff;
  --primary-color: #FE8204;
  --primary-glow: rgba(254, 130, 4, 0.15);
  --accent-color: #1a1a1c;
  --text-main: #1a1a1c;
  --text-muted: #64748b;
  --text-light: #ffffff;
  --border-color: rgba(0, 0, 0, 0.05);
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(254, 130, 4, 0.1);

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Other */
  --transition-speed: 0.3s;
}

/* Configuraciones Globales y Fondo Dinámico */
body {
  font-family: var(--font-family);
  background-color: var(--bg-color);
  color: var(--text-main);
  overflow-x: hidden;
  background-image: 
    radial-gradient(at 0% 0%, rgba(254, 130, 4, 0.03) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(26, 26, 28, 0.02) 0px, transparent 50%);
  background-attachment: fixed;
  min-height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
}

/* Utilidades de Diseño Premium (Glassmorphism & Gradients) */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  transition: all var(--transition-speed) ease;
}

.glass-hover:hover {
  background: #ffffff;
  border-color: rgba(255, 130, 0, 0.2);
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(255, 130, 0, 0.08);
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary-color) 0%, #ff5e00 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Scrollbar Personalizada (Premium) */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-color);
}

::-webkit-scrollbar-thumb {
  background: rgba(72, 74, 78, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

## 5. Configuración Tailwind CSS v4

Si el otro proyecto utiliza **Tailwind CSS v4** (como este), además del `:root` puedes inyectar directamente las variables en tu CSS usando `@theme` y crear las utilidades con `@utility` (tal como estaba estructurado originalmente):

```css
@theme {
  --color-brand-orange: #FE8204;
  --color-brand-yellow: #FADC3C;
  --color-brand-red: #E43C2F;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  --shadow-premium: 0 4px 20px rgba(0, 0, 0, 0.04);
  --shadow-premium-hover: 0 8px 30px rgba(255, 130, 0, 0.08);
}

@utility glass {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

@utility glass-hover {
  &:hover {
    background: #ffffff;
    border-color: rgba(255, 130, 0, 0.2);
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(255, 130, 0, 0.08);
  }
}

@utility gradient-text {
  background: linear-gradient(135deg, var(--primary-color) 0%, #ff5e00 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## 6. Componentes UI (Estructura y Clases Tailwind)

Para mantener la coherencia visual con este proyecto, aquí tienes las clases base (Tailwind CSS) utilizadas para construir los elementos principales de la interfaz.

### 6.1. Tablas Premium
El contenedor de la tabla usa bordes redondeados amplios y una sombra pronunciada. La tabla en sí utiliza un diseño limpio con cabeceras espaciadas.

```html
<!-- Contenedor de la Tabla -->
<div class="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
  <table class="w-full text-left border-collapse">
    
    <!-- Cabecera -->
    <thead>
      <tr class="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
        <th class="px-8 py-5">Columna 1</th>
        <th class="px-8 py-5">Columna 2</th>
      </tr>
    </thead>
    
    <!-- Cuerpo -->
    <tbody class="divide-y divide-gray-50">
      
      <!-- Fila (Hover effect) -->
      <tr class="cursor-pointer transition-colors hover:bg-gray-50/50">
        <td class="px-8 py-5">
          <div class="text-sm font-bold text-gray-900">Texto Principal</div>
          <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Subtexto / ID</div>
        </td>
        <td class="px-8 py-5">
          <span class="text-sm font-medium text-gray-600">Dato Secundario</span>
        </td>
      </tr>
      
      <!-- Fila Activa/Seleccionada -->
      <tr class="cursor-pointer transition-colors bg-brand-orange/5">
        <!-- ... -->
      </tr>
      
    </tbody>
  </table>
</div>
```

### 6.2. Botones de Acción
Los botones tienen bordes muy redondeados (`rounded-2xl`), tipografía gruesa (`font-black`) y sombras coloreadas que les dan un aspecto de aplicación moderna.

```html
<!-- Botón Primario (Azul) -->
<button class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3">
  <i class="fas fa-check-circle"></i> Aceptar
</button>

<!-- Botón Naranja (Brand) -->
<button class="w-full bg-brand-orange text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand-orange/30 hover:bg-brand-orange/90 active:scale-95 transition-all flex items-center justify-center gap-3">
  <i class="fas fa-bolt"></i> Procesar
</button>

<!-- Botón Peligro (Rojo) -->
<button class="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-600/30 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-3">
  <i class="fas fa-trash"></i> Eliminar
</button>
```

### 6.3. Badges / Etiquetas de Estado
Las etiquetas (badges) usan colores suaves de fondo y el color fuerte en el texto, con tipografía pequeña y espaciada.

```html
<!-- Badge Neutro / Informativo (Índigo) -->
<span class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center w-fit gap-1">
  <i class="fas fa-paper-plane text-[8px]"></i> Pendiente
</span>

<!-- Badge Éxito (Morado / Verde) -->
<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center w-fit gap-1">
  <i class="fas fa-check-double text-[8px]"></i> Completado
</span>

<!-- Badge Error / Baja (Rojo) -->
<span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center w-fit gap-1">
  <i class="fas fa-times text-[8px]"></i> Rechazado
</span>
```

### 6.4. Contenedores de Detalles (Cards)
El diseño del layout usa contenedores amplios y flotantes.

```html
<div class="w-full bg-white rounded-[40px] border border-gray-100 shadow-2xl p-8 flex flex-col overflow-y-auto custom-scrollbar">
  <!-- Contenido del card -->
</div>
```
