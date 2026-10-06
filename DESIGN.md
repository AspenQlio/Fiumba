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
- **Variants**: bienvenida y chat; comparten estructura.
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
