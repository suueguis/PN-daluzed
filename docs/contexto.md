**CONTEXTO COMPLETO - PROYECTO DALUZED INVENTARIO**

**Documento de transferencia para IA colaboradora**

**Generado por Claude Sonnet 4.6 · Mayo 2026**

**⚠️ INSTRUCCIONES PARA LA IA QUE LEE ESTO**

Este documento contiene TODO el contexto necesario para continuar el desarrollo del sistema de gestión de inventario de Daluzed. Léelo completo antes de responder. La persona con quien trabajas es estudiante de 5to semestre trabajando prácticamente sola bajo presión de tiempo. Necesitas:

- **No validar decisiones incorrectas** - ser honesta cuando algo está mal
- **No repetir preguntas** ya resueltas en este documento
- **Seguir las decisiones técnicas ya tomadas** sin sugerirlas de nuevo
- **Respetar el estado actual del código** - no reescribir lo que ya funciona
- **Ser directa y concisa** - no hacer relleno, ir al grano

**1\. CONTEXTO PERSONAL DE LA ESTUDIANTE**

**Quién es:** Estudiante de Ingeniería de Software, 5to semestre, Corporación Universitaria Empresarial Alexander von Humboldt (CUE), Armenia, Colombia.

**Situación real:** Trabaja prácticamente sola en el proyecto. Su grupo existe en papel, pero los compañeros no contribuyen al mismo nivel que ella. Uno de sus compañeros sugirió usar Rust para el backend (decisión incorrecta que fue descartada).

**Materias integradas en el proyecto** (el proyecto es evaluado en TODAS a la vez):

- Arquitectura de Software I
- Programación con Tecnologías Web
- Pruebas de Software
- Tendencias de la Ingeniería de Software

**Situación competitiva:** HAY DOS GRUPOS compitiendo por desarrollar el mejor MVP para el mismo cliente. El grupo contrincante es más numeroso y colaborativo. Ella quiere ganar. El otro grupo ya entregó una primera versión del SRS basada en una grabación de audio de la reunión con los stakeholders, pero sin el levantamiento adicional de requisitos que ella hizo.

**Deadlines académicos:** 3 cortes (entregas parciales), del 21 de abril al 26 de junio 2026. El Corte 1 ya está activo.

**Estilo de trabajo preferido con la IA:**

- Quiere honestidad brutal, no validación fácil
- Le molesta que le digan que todo está bien cuando no lo está
- Responde bien a explicaciones directas y concretas
- Prefiere que le expliquen el porqué de las decisiones para poder defenderlas
- Cuando no sabe algo, lo dice directamente y pregunta sin vergüenza
- Se motiva con claridad y progreso visible

**2\. CONTEXTO DEL CLIENTE - EMPRESA DALUZED**

**Nombre:** Daluzed ("El sabor de los sentimientos") **Tipo:** Empresa familiar de producción de repostería **Logo:** Torta rosada con cerezas rojas. Fondo removido (PNG transparente). **Colores de marca:** Rosa/rose (#D4737A principal), crema (#F9F3EC fondo) **Tipografía título:** Playfair Display (serif display)

**Productos:** Tortas, postres, galletería. Más de 60 productos totales. El MVP trabaja con 3-4 (lista exacta PENDIENTE de confirmación por el cliente).

**Secciones de producción:** Galletería, Torta, Bizcocho

**Volumen:**

- Semana normal: 900-1.600 unidades
- Temporada alta (diciembre): hasta 2.400 unidades

**Frecuencia de producción por producto:**

| **Producto**       | **Frecuencia**                                                  |
| ------------------ | --------------------------------------------------------------- |
| Bizcocho           | Todos los días (5-10 batidos normales, 10-15 en temporada alta) |
| Torta de vainilla  | Casi todos los días (1 batido)                                  |
| Torta de chía      | Casi todos los días (1 batido)                                  |
| Torta de chocolate | Cada 2 días (1 batido)                                          |
| Torta de naranja   | Cada 2 días (1 batido)                                          |
| Red velvet         | 2 veces por semana (1 batido)                                   |
| Torta envinada     | 1 vez por semana (1 batido)                                     |

**Restricción de hardware:** 2 batidoras en el área de Genovesas → máximo 2 batidos simultáneos. En temporada alta se priorizan los bizcochos.

**Ciclo de producción estándar:**

Día N: Batido (1h) → Horno (2h) → Enfriamiento (3h)

Día N+1: Desmolde → Decoración → Envío al PDV

La producción de hoy = lo que va al PDV mañana. La producción es demanda-dependiente (se produce según lo que haya en el PDV).

**3\. DISTRIBUCIÓN FÍSICA DE LAS INSTALACIONES**

\[BODEGA PRINCIPAL\] \[EDIFICIO DE PLANTA\]

~1.5 cuadras de distancia ┌─────────────────────┐

│ PISO 2: │

Almacena TODA la materia │ Bodega PDP + │

prima recibida de proveedores. │ Planta de │

│ Producción │

ES LA ÚNICA BODEGA QUE │ (mismo espacio) │

ACTIVA ALERTAS DE REORDEN. │ ↕ malacate │

│ PISO 1: │

Encargado camina 1.5 │ Punto de Venta │

cuadras para trasladar. │ (PDV) │

└─────────────────────┘

**Malacate:** Elevador de carga que conecta Piso 2 (producción) con Piso 1 (PDV). El despacho de producto terminado al PDV se hace físicamente por el malacate y el encargado lo registra en el sistema como cambio de estado.

**Conectividad:** Internet estable en AMBAS ubicaciones. Sistema 100% online. No se necesita modo offline.

**4\. ACTORES DEL SISTEMA (RBAC)**

| **Actor**                     | **Rol**                        | **Descripción**                                                                                                                             |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Encargado de inventarios**  | ACTOR PRINCIPAL                | Acceso completo operativo. Registra recepciones, traslados, producción, despachos al PDV, ajustes. Recibe alertas por WhatsApp corporativo. |
| **Gerencia** (padre y madre)  | Solo visualización + políticas | Ven todo. Modifican datos maestros. Prefieren WhatsApp. Acceden desde escritorio principalmente.                                            |
| **Jefe de producción**        | Visualización + autorización   | Consulta stock. Ve costos. Consulta para decisiones de producción.                                                                          |
| **Administrador del sistema** | Gestión técnica                | Crea/edita/desactiva usuarios. Accede a bitácora completa.                                                                                  |

**Nota de implementación:** Los 4 roles son grupos en Django (Administrador, Gerencia, JefeInventario, JefeProduccion). El modelo User también tiene un campo role CharField como campo propio. El endpoint de login devuelve el rol tomado del **primer grupo Django** del usuario (con fallback al campo role del modelo).

**Visibilidad de costos:** TODOS los roles pueden ver información de costos. No hay datos privados entre roles (sueldos/nómina están completamente fuera del sistema).

**5\. REGLAS DE NEGOCIO CRÍTICAS**

**5.1 Inventario de Materias Primas**

**Dos ubicaciones:**

- **Bodega Principal:** recibe de proveedores, stock inicial. Única que activa alertas de reorden.
- **Bodega PDP (Bodega Planta de Producción):** almacenamiento temporal en Piso 2. Lo que llega aquí está comprometido para producción. NO activa alertas de reorden.

**Unidades de medida:**

- Inventario en **unidad base** (gramos, mililitros, unidades)
- Recepciones/traslados se pueden registrar en presentación de compra (ej: bolsa de 50kg)
- El sistema convierte automáticamente con el factor de conversión del catálogo
- Sobrante de presentación parcialmente usada permanece en Bodega PDP hasta agotarse antes de abrir una nueva

**Política de consumo:** FEFO - First Expired, First Out. Al registrar producción, el sistema sugiere el lote con vencimiento más próximo disponible en Bodega PDP.

**Proveedores:** 21 proveedores activos. Relación **muchos-a-muchos** entre materias primas y proveedores (una materia prima puede comprarse a distintos proveedores según precio/disponibilidad).

**Punto de reorden:** Calculado SOLO sobre stock de Bodega Principal. Bodega PDP excluida del cálculo.

**Vencimiento mínimo en recepción:** Cada materia prima perecedera tiene configurado un número mínimo de días de vida útil aceptable al recibirla. Si el lote recibido no cumple ese mínimo → alerta bloqueante + justificación obligatoria para poder continuar. El cliente aún no ha entregado los valores específicos por materia prima (PENDIENTE).

**Lotes vencidos en bodega:** Rarísimo (el parámetro de vencimiento mínimo en recepción lo previene). Si ocurre: encargado + jefe de producción deciden juntos si devolver al proveedor o descartar. El sistema debe registrar la devolución como movimiento auditable (RF-INV-05, prioridad S).

**5.2 Traslados entre Bodegas**

**Flujo:**

- Encargado decide autónomamente qué y cuánto trasladar (sin aprobación previa)
- Consulta con los trabajadores de producción qué hace falta
- Traslada físicamente (camina 1.5 cuadras)
- **Luego** registra el traslado en el sistema
- El sistema descuenta de Bodega Principal e incrementa en Bodega PDP **atómicamente**
- El registro es **inmutable**

**5.3 Producción**

**Estructura de lotes:**

- Cada **batido** es un **lote de producción individual** con su propio registro
- Varios lotes del mismo día forman una **jornada de producción** (agrupados en vista de calendario)
- El sistema soporta máximo 2 batidos simultáneos

**Al registrar un batido:**

- Se descuenta materia prima de Bodega PDP (sugerencia FEFO, usuario confirma cantidades en unidad base)
- Se crea un lote de producto terminado en estado **EN_ESPERA**
- La fecha de vencimiento del lote = fecha de producción + vida útil estándar del producto (configurable en catálogo, ~2 semanas para tortas según estándares IDIME)

**Rechazo:** Si alguna materia prima tiene stock insuficiente en Bodega PDP → error con nombre de la materia prima faltante y cantidad exacta que falta.

**Corrección de registros:** Inmutable. No se puede editar ni borrar. La corrección se hace mediante **movimiento compensatorio** que:

- Es visible para TODOS los roles (no solo admin)
- Muestra dato original, dato corregido, usuario y fecha-hora
- Ajusta el inventario atómicamente

**5.4 Despacho al PDV (Producto Terminado)**

**Estados del producto terminado:**

EN_ESPERA → EN_PUNTO_DE_VENTA

(Un solo sentido, irreversible)

**Flujo:**

- Producto termina producción → estado EN_ESPERA en Piso 2
- Al día siguiente: encargado lo manda por el malacate
- Encargado registra en el sistema el cambio de estado → EN_PUNTO_DE_VENTA
- El PDV no tiene inventario propio en el sistema

**Política de despacho:** FIFO - First In, First Out. El sistema sugiere el lote producido primero.

**IMPORTANTE:** El PDV maneja la interacción con clientes finales de forma presencial y separada. El sistema NO rastrea tiempos de entrega al cliente, ni ventanas prometidas. Esto está fuera del alcance. (El indicador de nivel de servicio fue marcado como Won't Have - ver sección 6.)

**5.5 Alertas y Notificaciones**

**Canal principal:** WhatsApp - número corporativo de la empresa (no personal). Se implementa con Twilio (sandbox en desarrollo, evaluar API Cloud de Meta para producción). **Canal secundario:** Email (SMTP) para Gerencia y Jefe de Producción.

**Alertas en tiempo real** vía WebSockets:

- Stock bajo en Bodega Principal (al caer al punto de reorden o por debajo)
- Vencimiento próximo de lotes (N días configurable)
- Lotes EN_ESPERA pendientes de despacho al PDV

**Deduplicación:** Una alerta resuelta no se reenvía hasta que la condición vuelva a dispararse.

**5.6 Formatos Manuales**

El cliente tiene 13+ formatos manuales físicos. El sistema los reemplaza progresivamente. El **primero en reemplazar:** ingreso de materia prima a bodega (recepción). Las copias físicas están pendientes de recepción (PENDIENTE).

**6\. ALCANCE DEL MVP - LO QUE SÍ Y LO QUE NO**

**✅ DENTRO del alcance**

- Autenticación y autorización por roles (RBAC) con JWT
- Catálogo de materias primas y productos terminados con unidades base, presentaciones y factor de conversión
- Gestión de 21 proveedores (muchos-a-muchos con materias primas)
- Validación de días mínimos de vencimiento en recepción
- Recepción SOLO contra orden de pedido previa
- Traslado entre Bodega Principal y Bodega PDP (sin aprobación, registro posterior)
- Registro de producción por batido individual, agrupados en jornada
- Descuento FEFO de Bodega PDP
- Inventario de producto terminado con estados EN_ESPERA / EN_PUNTO_DE_VENTA (FIFO para despacho)
- Corrección de registros con movimiento compensatorio visible a todos
- Trazabilidad completa por lote (recepción → consumo/despacho)
- Punto de reorden SOLO sobre Bodega Principal
- Alertas en tiempo real (WebSockets) + notificaciones WhatsApp + email
- Dashboard KPI + exportación PDF/Excel
- Actualizaciones en tiempo real (WebSockets) para todos los usuarios concurrentes

**❌ FUERA del alcance**

- Módulo de ventas / facturación / PDV
- Almacenamiento o ejecución de recetas (secreto industrial)
- Gestión de proveedores con flujo de cotización
- Integración contabilidad / nómina
- Rastreo de entrega al cliente final o tiempos de despacho externo
- **Indicador de nivel de servicio basado en ventanas de entrega:** MARCADO COMO WON'T HAVE. El PDV maneja esos tiempos presencialmente y el dato nunca llega al sistema.
- App móvil nativa (responsive web es suficiente)

**7\. MÓDULOS DEL SISTEMA (SRS)**

| **Módulo**                   | **Código** | **Corte** | **Estado**       |
| ---------------------------- | ---------- | --------- | ---------------- |
| Autenticación y Autorización | AUT        | 1         | 🔄 En desarrollo |
| Catálogo Maestro             | CAT        | 1         | ⏳ Pendiente     |
| Inventario                   | INV        | 2         | ⏳ Pendiente     |
| Recepción                    | REC        | 2         | ⏳ Pendiente     |
| Producción y Despacho        | PROD       | 2         | ⏳ Pendiente     |
| Alertas y Notificaciones     | ALR        | 3         | ⏳ Pendiente     |
| Indicadores y Reportes       | IND        | 3         | ⏳ Pendiente     |
| Auditoría y Trazabilidad     | AUD        | 3         | ⏳ Pendiente     |

**Trazabilidad por corte:**

- **Corte 1:** AUT, CAT (alta nivel), arquitectura base, modelo de datos, plan de pruebas, prototipos UI
- **Corte 2:** INV, REC, PROD
- **Corte 3:** ALR, IND, AUD, despliegue cloud, pruebas de aceptación en planta real

**8\. STACK TECNOLÓGICO - DECISIONES CERRADAS (NO REABRIR)**

**Backend**

| **Componente**          | **Tecnología**       | **Razón**                                               |
| ----------------------- | -------------------- | ------------------------------------------------------- |
| Framework               | **Django 5.x + DRF** | Maduro, ORM excelente, integración nativa con Channels  |
| Autenticación           | **SimpleJWT**        | Estándar JWT para DRF                                   |
| Protección fuerza bruta | **Django-Axes**      | RF-AUT-01: bloqueo tras 5 intentos                      |
| WebSockets              | **Django Channels**  | Tiempo real para alertas e inventario                   |
| Tareas async            | **Celery**           | Notificaciones WhatsApp/email sin bloquear requests     |
| Message broker          | **Redis**            | Broker para Celery + channel layer para Django Channels |
| Base de datos           | **PostgreSQL**       | ACID, transacciones atómicas (requisito explícito SRS)  |
| Docs API                | **drf-spectacular**  | Swagger/OpenAPI automático                              |

**Frontend**

| **Componente** | **Tecnología**                    |
| -------------- | --------------------------------- |
| Framework      | **React + Vite**                  |
| Estilos        | **Tailwind CSS**                  |
| Estado global  | **Zustand**                       |
| HTTP client    | **Axios** (con interceptores JWT) |

**Infraestructura**

| **Componente**    | **Tecnología**                                                    |
| ----------------- | ----------------------------------------------------------------- |
| Backend hosting   | **Railway**                                                       |
| Frontend hosting  | **Vercel**                                                        |
| Contenedorización | **Docker**                                                        |
| WhatsApp          | **Twilio** (sandbox dev) / evaluar Meta Cloud API para producción |

**Arquitectura**

- **Decoupled (Desacoplada):** API REST + SPA React independiente
- **Layered dentro del backend:** Capa API → Capa de Servicios → Capa de Dominio
- **Clean Architecture + SOLID + KISS**
- **RBAC** mediante grupos Django
- **API Versioning:** URL-based /api/v1/ (única forma correcta para este proyecto)

**❌ Tecnologías DESCARTADAS y por qué**

- **Rust:** Lenguaje de sistemas, no web. Curva brutal, inapropiado para MVP académico.
- **NoSQL/Graph DB para traslados:** Los traslados son transacciones relacionales clásicas. PostgreSQL con ACID es la decisión correcta.
- **Microservicios:** 10 usuarios concurrentes máximo. Overkill total.
- **Modo offline:** El cliente confirmó internet estable en ambas ubicaciones.

**9\. ESTRUCTURA DEL PROYECTO**

daluzed_inventory/

├── manage.py

├── requirements.txt

├── .env

├── core/

│ ├── settings.py

│ ├── urls.py

│ └── wsgi.py

└── apps/

└── authentication/

├── apps.py

├── models.py

└── api/

└── v1/

├── serializers.py

├── views.py

└── urls.py

└── services.py

**Convención de módulos:** apps.authentication.api.v1 **Todos los endpoints:** /api/v1/{modulo}/{accion}/

**Diseño de Login (Figma):**

- Fondo: crema #F9F3EC
- Card: blanco, rounded-3xl, shadow-\[0_4px_32px_rgba(0,0,0,0.08)\]
- Logo Daluzed en la parte superior (PNG con fondo transparente)
- Título: "Bienvenido de Vuelta" - Playfair Display, 28px, bold
- Subtítulo: "Accede a tu cuenta" - gris claro
- Campos: email (ícono @) + contraseña (ícono candado + ojo show/hide)
- Botón "Iniciar Sesión": bg-\[#D4737A\] hover:bg-\[#C06068\]
- Mensajes de error con intentos restantes visibles

**Font Google Fonts a incluir en index.html:**

&lt;link href="<https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap>" rel="stylesheet"&gt;

**Proxy en vite.config.js necesario:**

server: { proxy: { '/api': { target: '<http://localhost:8000>', changeOrigin: true } } }

**11\. PENDIENTES ABIERTOS (confirmación con cliente)**

| **ID** | **Pendiente**                                                      | **Impacto**                       |
| ------ | ------------------------------------------------------------------ | --------------------------------- |
| P01    | Lista exacta de los 3-4 productos del MVP y sus materias primas    | Catálogo inicial, datos de prueba |
| P02    | Días mínimos de vencimiento aceptable por materia prima perecedera | RF-REC-06, RF-CAT-07              |
| P03    | Copias de los 13+ formatos manuales (especialmente ingreso de MP)  | Diseño UI módulo recepción        |
| P04    | Aprobación indicador nivel de servicio (marcado Won't)             | RF-IND-03                         |
| P05    | Capacidad de almacenamiento por bodega (para utilización)          | RF-IND-04                         |
| P06    | Confirmación proveedor WhatsApp (Twilio vs Meta API) + presupuesto | RNF-INT-01                        |
| P07    | Política de redondeo y unidad mínima de descuento en producción    | RF-PROD-02                        |
| P08    | Volumen real de transacciones diarias                              | Datos de carga para RNF-PER-04    |

**12\. REQUISITOS NO FUNCIONALES CLAVE**

| **ID**     | **Requisito**                    | **Métrica**                                  |
| ---------- | -------------------------------- | -------------------------------------------- |
| RNF-PER-01 | Consultas de inventario          | ≤ 2 segundos, 95% de casos                   |
| RNF-PER-04 | Usuarios concurrentes            | 10 sin degradación                           |
| RNF-PER-05 | WebSockets tiempo real           | Cambios visibles en < 2 segundos             |
| RNF-AVA-01 | Disponibilidad horario operativo | ≥ 99% mensual                                |
| RNF-SEC-01 | Contraseñas                      | bcrypt o argon2 (PBKDF2 nativo de Django ✅) |
| RNF-SEC-04 | RBAC en todos los endpoints      | Verificado con pruebas básicas               |
| RNF-MAN-02 | Cobertura pruebas unitarias      | ≥ 70% en lógica de negocio                   |
| RNF-MAN-03 | Documentación API                | OpenAPI/Swagger vía drf-spectacular          |
| RNF-ESC-01 | Multi-tenant futuro              | Modelo incluye centro_distribucion_id        |
| RNF-INT-04 | WebSockets                       | Django Channels + Redis                      |

**13\. CONVENCIONES DE CÓDIGO**

**Backend (Python/Django)**

- **SOLID estricto:** cada clase tiene una sola responsabilidad
- **Capa API** (views.py): solo maneja HTTP request/response, delega a services
- **Capa de servicios** (services.py): lógica de negocio pura
- **Capa de dominio** (models.py): modelos, reglas, estados
- **Nombres en español** para campos del dominio del negocio
- **Type hints** donde sea posible
- **Docstrings** en clases y métodos públicos
- **No hay lógica de negocio en views ni en serializers** (solo validación de datos)

**Frontend (React/JS)**

- Componentes funcionales con hooks
- Zustand para estado global (no Context API)
- Axios con interceptores para JWT (ya configurado)
- Tailwind para estilos (sin CSS modules)
- Paths relativos con un solo ../ desde src/pages/ (no dos ../../)
- El logo va en public/logo.png y se referencia como /logo.png

**Nomenclatura de endpoints**

/api/v1/{modulo}/{accion}/

\# Ejemplos:

/api/v1/auth/login/

/api/v1/auth/logout/

/api/v1/inventario/materias-primas/

/api/v1/produccion/lotes/

**14\. COSAS QUE NUNCA DEBES HACER EN ESTE PROYECTO**

- **No sugerir Rust, Node.js, FastAPI ni Flask** - el stack está definido y cerrado
- **No sugerir MongoDB ni bases de datos de grafos** - PostgreSQL es la decisión correcta
- **No sugerir microservicios** - es un MVP para 10 usuarios concurrentes
- **No reabrir la discusión sobre el indicador de nivel de servicio** - está cerrada como Won't Have
- **No agregar modo offline** - el cliente confirmó internet estable
- **No almacenar ni procesar recetas** - secreto industrial de la familia
- **No integrar el PDV** - está explícitamente fuera del alcance
- **No usar ../../ en imports desde src/pages/** - es un nivel (../)
- **No usar attempts.failures** - el campo correcto es attempts.failures_since_start
- **No sugerir Context API como alternativa a Zustand** - Zustand ya está instalado y configurado

**15\. FORMATO DE RESPUESTA ESPERADO DE LA IA**

- **Honesta:** si algo está mal, dilo directamente
- **Concisa:** no hacer introducciones largas ni conclusiones redundantes
- **Con código cuando se necesita:** no describir código, mostrarlo
- **Por partes:** si hay mucho que hacer, organizar en pasos claros
- **Sin validación falsa:** no decir "¡Excelente pregunta!" ni "¡Perfecto!"
- **Con el porqué:** explicar decisiones técnicas para que pueda defenderlas en sustentación
- **Emojis:** los usa ocasionalmente, de forma natural, sin exagerar

_Documento generado a partir de una sesión extendida de desarrollo colaborativo. Última actualización: Mayo 2026. El sistema está en Corte 1 activo._