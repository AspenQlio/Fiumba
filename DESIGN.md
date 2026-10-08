# Fiumba Design System

## 1. Atmosphere & Identity

Fiumba es una consola local, íntima y sobria. La firma visual es su logotipo modular claro sobre un fondo índigo profundo, con superficies técnicas de borde izquierdo iluminado.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Surface/primary | `surfacePrimary` | `#282B4A` | Fondo principal |
| Surface/secondary | `surfaceSecondary` | `#20223B` | Inputs, mensajes y configuración |
| Text/primary | `textPrimary` | `#EEEBDA` | Texto y acciones principales |
| Text/secondary | `textSecondary` | `rgba(238,235,218,0.6)` | Metadatos y estados secundarios |
| Border/subtle | `borderSubtle` | `rgba(238,235,218,0.3)` | Estados inactivos y separadores |
| Status/success | `statusSuccess` | `#A8C6A0` | Integración configurada |
| Status/error | `statusError` | `#E8A39A` | Error de configuración |

No se agregan colores fuera de esta tabla sin actualizar primero este contrato.

## 3. Typography

- Familia primaria: fuente del sistema para texto largo.
- Familia técnica: `monospace` en Android y web; `Courier` en iOS.
- Cuerpo: 14 px, interlínea 22 px.
- Control: 14 px, peso 700.
- Metadato: 11–12 px.

## 4. Spacing & Layout

- Unidad base: 4 px.
- Espacios vigentes: 4, 8, 12, 16, 20, 24 y 40 px.
- Ancho máximo del contenido conversacional: 840 px.
- Ancho máximo de tarjetas: 600 px.
- En móvil, todos los controles mantienen al menos 44 px de alto táctil.

## 5. Components

### Configuration Bar

- **Structure**: dos acciones compactas para Vault y SSH, más una línea de estado.
- **Variants**: bienvenida y modal de configuración; no ocupa espacio permanente dentro del chat.
- **States**: no configurado, configurado, ocupado y error.
- **Accessibility**: botón con etiqueta explícita, estado deshabilitado y área táctil mínima de 44 px.
- **Motion**: solo opacidad nativa al presionar; sin movimiento decorativo.
- **Layout**: fila flexible que pasa a dos columnas iguales.

### Primary Action

- **Structure**: botón claro con etiqueta oscura.
- **States**: default, pressed y loading.
- **Accessibility**: etiqueta de acción completa; no depende solo del color.

### Chat Input

- **Structure**: cursor, campo de una línea, botón enviar y metadatos.
- **States**: idle, focus y thinking.
- **Accessibility**: botón enviar con etiqueta y campo con placeholder comprensible.

### Compact App Header

- **Structure**: marca compacta `FIUMBA`, selector segmentado `Chat`/`Grafo` y acción secundaria `Config`.
- **Behavior**: solo aparece dentro de una conversación o del grafo; la portada inicial queda libre de navegación técnica.
- **Accessibility**: cada acción mantiene un área táctil mínima de 44 px y una etiqueta completa.

### Fiumba Home

- **Structure**: logotipo modular estilo OpenCode centrado, subtítulo del motor, bloque principal para escribir el primer mensaje y botón secundario pequeño `Sesiones` debajo.
- **Behavior**: es la primera pantalla después de cargar Gemini. Enviar el primer mensaje abre el chat; `Sesiones` abre el historial.
- **Hierarchy**: el compositor domina la portada. Configuración y grafo solo aparecen después de entrar al espacio de trabajo.

### Obsidian Graph

- **Structure**: lienzo índigo con aristas sutiles, nodos claros y etiquetas técnicas; cabecera con cantidad de notas/enlaces y acción de recarga.
- **Data**: deriva exclusivamente de notas Markdown y enlaces `[[wikilink]]` del vault Android configurado. Los enlaces no resueltos se muestran atenuados.
- **Limits**: máximo 80 notas leídas, 40 nodos y 80 aristas dibujadas para proteger memoria y fluidez móvil.
- **Interaction**: tocar un nodo lo selecciona y muestra su ruta; la visualización no modifica notas.
- **Navigation**: pellizcar acerca o aleja; arrastrar desplaza el lienzo; controles `−`, `Restablecer`, `+` ofrecen alternativa accesible.
- **Scale**: rango de 0,6× a 3×, con indicador numérico persistente.
- **Accessibility**: nodos con etiqueta textual, resumen numérico y estado de carga/error explícito.

## 6. Motion & Interaction

- Microinteracción: 120 ms, `ease-out`.
- Pensamiento/carga: pulso de opacidad existente de 600 ms.
- No animar geometría; solo `opacity` y `transform`.

## 7. Depth & Material

La profundidad se obtiene con desplazamiento tonal y una sombra única en tarjetas elevadas. Los bordes izquierdos claros funcionan como indicador técnico, no como decoración general.

## 8. Accessibility & Accepted Debt

- Contraste principal alto sobre ambas superficies.
- Ninguna credencial se muestra en pantalla.
- Los estados incluyen texto, no solo color.
- Deuda aceptada: `App.js` conserva primitivas del logotipo y estilos inline heredados. Se refactorizarán durante el rediseño estético solicitado, no durante esta corrección funcional.
- La validación visual principal se hace en el S25+ real; el proyecto no tiene todavía harness de componentes separado.
