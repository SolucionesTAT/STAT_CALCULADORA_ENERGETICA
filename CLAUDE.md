# STAT Calculadora Energética

## Qué es este proyecto

Aplicación web progresiva (PWA) de herramientas de cálculo eléctrico de campo, desarrollada por **STAT** (https://stat.com.ec), una empresa de servicios técnicos eléctricos en Ecuador.

El primer módulo es una **calculadora de desbalance de voltaje y corriente** en sistemas trifásicos. Está pensada para crecer con más calculadoras eléctricas (factor de potencia, caída de tensión, dimensionamiento de cables, etc.), por lo que la arquitectura debe ser modular desde el inicio, no un archivo monolítico.

## Audiencia

- Técnicos internos de STAT en trabajos de campo.
- Supervisores técnicos de empresas clientes de STAT (uso ocasional).
- Clientes evaluando el trabajo de otros proveedores.

La app es también una pieza de imagen de marca frente a clientes — debe verse profesional y confiable, no como una herramienta interna improvisada.

## Plataforma objetivo (importante, no asumir lo contrario)

**El objetivo actual y único es Android.** No hay plan activo de soportar iOS/App Store — no diseñar, documentar ni justificar decisiones en función de una futura versión iOS.

## Decisiones de arquitectura (no cambiar sin discutirlo)

- **PWA, no app nativa ni Flutter — y esto aplica aunque el objetivo sea solo Android.** La razón NO es multiplataforma: es que con una app nativa (WebView empaquetado), cada cambio de contenido/función obliga a recompilar, firmar y volver a subir a Play Store con revisión de por medio. Con PWA + Trusted Web Activity (TWA), el paquete publicado en Play Store es una envoltura delgada que carga el sitio; los cambios de contenido se despliegan actualizando el sitio web, sin pasar por Play Console ni por revisión de Google. Esta decisión se tomó sabiendo que el entorno de trabajo tiende a pedir cambios con frecuencia.
- **100% cliente, sin backend.** Ningún dato sale del dispositivo del usuario. No hay cuentas, no hay sincronización en la nube, no hay analítica ni tracking. Esto está reflejado en la política de privacidad ya publicada — cualquier cambio que implique enviar datos a un servidor requiere actualizar esa política primero, no lo agregues sin consultarlo.
  - **Excepción explícita:** enlaces salientes normales (`<a href="...">`) hacia el sitio web de la empresa o sus redes sociales en la pantalla "Acerca de" SÍ están permitidos. Son una acción manual del usuario (abrir otra app/sitio), no una llamada de red que la app haga por su cuenta — no viola la regla de "sin backend / sin llamadas automáticas".
- **Offline-first.** Debe funcionar sin conexión a internet una vez instalada (manifest.json + service worker con cache completo de assets).
- **Distribución en Android:** instalable directo desde el navegador ("Agregar a inicio", con un botón de instalación explícito en la UI usando el evento `beforeinstallprompt`), y empaquetada como Trusted Web Activity para publicarse en Play Store — esta es la ruta de distribución principal.
- **Hosting:** GitHub Pages, desde el mismo repositorio (repo público, ya confirmado como aceptable dado que no se manejan datos sensibles). Dominio final planeado: un subdominio de stat.com.ec.
- **Cuenta de Play Store:** cuenta de organización (no personal) a nombre de STAT — esto exime del requisito de pruebas cerradas con testers que aplica a cuentas personales nuevas.
- **El proyecto de Android Studio (WebView nativo) que existe en el historial del repo fue solo una prueba de concepto inicial.** No es la dirección del proyecto; se mantiene como referencia histórica únicamente.

## Identidad de marca

- Nombre de paquete/dominio reservado: `ec.com.stat.balanceelectrico` (para el empaquetado TWA de Play Store).
- Logo e identidad visual: ver el proyecto de diseño importado (`STAT Calculadora Energetica.dc.html`) para colores exactos, tipografía y componentes — es la fuente de verdad del sistema visual, no inventar estilos nuevos fuera de ahí.
- Idioma de toda la interfaz: español.
- El código y los activos de marca (logo, nombre) son propiedad de STAT — ver `LICENSE` en la raíz del repositorio. No agregar una licencia de código abierto real (MIT, Apache, etc.) sin autorización explícita.

## Lógica de negocio: cálculo de desbalance eléctrico

**Metodología usada: NEMA MG-1** (basada solo en magnitudes de tensión/corriente, sin ángulo de fase). Se eligió deliberadamente sobre la metodología IEC 60034-26 (Factor de Desbalance de Tensión / VUF por componentes simétricas) porque esta última requiere datos de ángulo de fase que un técnico de campo con multímetro estándar no puede medir. Ambas metodologías dan resultados numéricos distintos entre sí — no son intercambiables. No mezclar ni "corregir" la fórmula NEMA para intentar aproximar IEC sin que se pida explícitamente como una función nueva.

Fórmula NEMA (ya validada, no modificar sin razón técnica):

```
Promedio = (FaseA + FaseB + FaseC) / 3
DesviaciónMáxima = max(|FaseA - Promedio|, |FaseB - Promedio|, |FaseC - Promedio|)
%Desbalance = (DesviaciónMáxima / Promedio) × 100
```

Umbrales de estado — **Modo Tensión (V)**:
| Rango | Estado | Referencia |
|---|---|---|
| ≤ 1% | Excelente | Coincide con el límite de IEC 60034-1 (cláusula 7.2.1): un motor debe poder operar a carga nominal con hasta 1% de desbalance sin derateo |
| 1–2% | Aceptable | |
| 2–3% | Precaución | |
| > 3% | Crítico | |

Umbrales de estado — **Modo Corriente (A)**:
| Rango | Estado |
|---|---|
| ≤ 10% | Aceptable |
| 10–20% | Precaución |
| > 20% | Crítico |

Estos umbrales son referencias generales de la industria (NEMA MG-1 / IEC 60034-1), no una norma legal ecuatoriana específica — si el negocio pide cambiarlos, deben quedar configurables, no hardcodeados en múltiples lugares.

**Nota para el reporte/UI:** mostrar la referencia normativa (NEMA MG-1, y la mención de IEC 60034-1 en el umbral de 1%) le da credibilidad técnica al resultado frente a un cliente que audita — inclúyelo de forma visible pero breve, no como texto legal denso.

**Idea de módulo futuro (no implementar ahora):** un "modo avanzado" con el cálculo real de VUF por componentes simétricas (IEC 60034-26), para cuando/si se cuente con equipo de medición que capture ángulo de fase.

## Pantallas requeridas

1. Inicio / panel principal: lista de calculadoras disponibles.
2. Calculadora de desbalance: 3 fases, resultado con estado, detalle (promedio, desviación, máx, mín).
3. Resultado/reporte: exportable/compartible, con logo de STAT visible.
4. Historial de mediciones guardadas (persistente en el dispositivo).
5. Acerca de / configuración: información de la empresa, **enlace al sitio web (stat.com.ec) y a las redes sociales de la empresa**, y enlace a la política de privacidad.

## Funciones ya construidas en el prototipo (preservar/mejorar, no perder)

- Cálculo en tiempo real al ingresar valores.
- Copiar resultado al portapapeles.
- Historial de mediciones (actualmente solo en memoria de sesión — mejorar a persistencia local con localStorage/IndexedDB).

## Convenciones de código

- Estructura modular: cada calculadora futura en su propio módulo/archivo, con componentes de UI compartidos (encabezado con logo, tarjeta de resultado, badge de estado, navegación) reutilizables entre módulos.
- Sin dependencias de servidor ni llamadas de red salvo que se indique explícitamente lo contrario.
- Comentarios de código en español, consistente con el resto del proyecto.
- **Commits sin atribución de IA:** no incluir líneas "Co-Authored-By: Claude" ni ningún pie de atribución de IA en los mensajes de commit o en descripciones de pull requests. La configuración del proyecto (`.claude/settings.json`) ya desactiva esto por defecto para cualquier colaborador que use Claude Code en este repositorio.

## Qué NO hacer sin consultarlo primero

- No agregar backend, cuentas de usuario, ni sincronización en la nube.
- No agregar analítica, tracking, ni SDKs de terceros que envíen datos.
- No cambiar la fórmula de cálculo NEMA ni mezclarla con la metodología IEC sin indicación explícita.
- No introducir Flutter, React Native, ni frameworks nativos.
- No diseñar ni documentar pensando en soporte iOS — no es un objetivo activo del proyecto.
- No agregar una licencia de código abierto real al repositorio.
