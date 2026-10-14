# Sistema de control de riego

Aplicación web para visualizar y configurar el estado de una motobomba y 10 válvulas de riego, con programación local basada en horarios y persistencia en el navegador.

## Funcionalidades

- Control manual de la motobomba y cada válvula.
- Programación de tres franjas horarias independientes por válvula.
- Activación y desactivación global de los horarios.
- Cálculo automático de la motobomba a partir de las válvulas activas.
- Persistencia con `localStorage` para mantener los cambios en el mismo navegador.
- Vista previa del sistema con reloj local, conteo de equipos activos y alertas del estado operativo.

## Estructura del proyecto

- `src/app.js`: lógica de estado, validación de tiempos, eventos y renderizado.
- `src/styles.css`: diseño visual del panel de control, cards de equipos y horarios.
- `src/index.html`: estructura principal de la interfaz.
- `vite.config.js`: configuración del proyecto Vite.
- `package.json`: scripts de desarrollo y compilación.

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run dev
```

La aplicación queda disponible normalmente en http://localhost:5173.

## Compilación

```bash
npm run build
```

## Nota sobre hardware

Esta versión es una interfaz de control local y simulación de lógica de riego. No se conecta directamente a una ESP32 ni a actuadores reales; la idea es validar la lógica, la programación y la experiencia de uso antes de integrar la capa de control físico.

## Ajustes principales documentados

- Corrección de la lógica de activación global de horarios.
- Separación entre modo manual y modo programado.
- Soporte para tres horarios independientes por válvula.
- Motobomba derivada automáticamente de los horarios activos de válvulas.
- Ajustes visuales para mejorar legibilidad, distribución y consistencia del diseño.
- Migración de configuraciones antiguas para mantener compatibilidad con datos previos.
