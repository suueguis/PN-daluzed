# 3. Especificación de Requisitos

3. 1 Requisitos Funcionales (RF)

Convención: RF-XX-NN

Prioridades:

```
M = Must Have
S = Should Have
C = Could Have
W = Wonʼt Have
```
3. 1. 1 Módulo de Autenticación y Autorización (AUT)

```
RF-AUT-01 El sistema
debe permitir
autenticación
mediante
usuario y
contraseña.
```
```
M Guía § 9 Credenciales
válidas
permiten
acceso; tras
5 intentos
fallidos la
cuenta se
bloquea
temporalmen
te.
RF-AUT-02 El sistema
debe
administrar
mínimo
cuatro roles:
Administrado
r, Gerencia,
Jefe de
Producción y
Encargado
```
```
M Sesión 1 Cada rol
únicamente
visualiza
módulos
autorizados.
```
```
ID Requisito Prioridad Origen Criterio de
aceptación
```

3. 1. 2 Módulo de Catálogo Maestro (CAT)

```
de
Inventarios.
RF-AUT-03 El sistema
debe cerrar
automáticam
ente
sesiones
inactivas.
```
```
M Buenas
prácticas
```
```
La sesión
expira tras
30 minutos
configurable
s.
```
```
RF-AUT-04 El
Administrado
r debe poder
crear, editar
y desactivar
usuarios.
```
```
M Guía § 9 Usuarios
desactivados
no pueden
ingresar al
sistema.
```
```
RF-AUT-05 El sistema
debe
registrar en
bitácora
todas las
operaciones
críticas.
```
```
S Ley
1581/
```
```
Toda
operación
registra
usuario,
fecha, IP y
acción
realizada.
```
```
RF-CAT-01 El sistema
debe
registrar
materias
primas con
código,
nombre,
unidad de
```
```
M Sesión 1 El registro
queda
disponible
para
consultas y
operaciones
posteriores.
```
```
ID Requisito Prioridad Origen Criterio de
aceptación
```

```
medida,
presentación
, costo,
proveedor y
condición de
almacenamie
nto.
```
RF-CAT-02 El sistema
debe permitir
configurar
días mínimos
aceptables
de
vencimiento
por materia
prima.

```
M Pregunta C Cada materia
prima puede
definir un
umbral
diferente.
```
RF-CAT-03 El sistema
debe
registrar
productos
terminados
mediante
código
interno único
tipo
INPE###.

```
M Sesión 1 No pueden
existir
códigos
duplicados.
```
RF-CAT-04 El sistema
debe permitir
asociar
productos
terminados
con sus
materias
primas
relacionadas
sin

```
M Sesión 1 La relación
es
consultable
sin exponer
fórmulas.
```

```
almacenar
recetas
completas.
```
RF-CAT-05 El sistema
debe
soportar
múltiples
proveedores
por materia
prima.

```
M Pregunta
Proveedores
```
```
Una materia
prima puede
asociarse a
múltiples
proveedores
activos.
```
RF-CAT-06 El sistema
debe permitir
clasificar
materias
primas por
categorías
operativas.

```
S Sesión 1 Las
categorías
son filtrables.
```
RF-CAT-07 El sistema
debe
importar
catálogos
desde
archivos
Excel/CSV.

```
S Sesión 1 El sistema
reporta filas
válidas e
inválidas.
```
RF-CAT-08 El sistema
debe
manejar
inventario en
unidad base
y convertir
automáticam
ente desde
presentacion
es de
compra.

```
M Confirmación
stakeholders
```
```
Las
operaciones
permiten
ingreso por
presentación
o unidad
base.
```

3. 1. 3 Módulo de Inventario (INV)

```
RF-CAT-09 El sistema
debe
registrar la
vida útil
estándar (en
días) de cada
producto
terminado,
para calcular
automáticam
ente la fecha
de
vencimiento
al registrar
un lote de
producción.
```
```
M Sesión 2 Fecha de
vencimiento
del lote =
fecha de
producción +
vida útil
estándar del
producto.
Configurable
por Gerencia
o
Administrado
r.
```
```
RF-INV-01 El sistema
debe
gestionar
dos bodegas
independient
es: Bodega
Principal y
Bodega de
Planta de
Producción.
```
```
M Sesión 1 Todo
movimiento
se asocia
obligatoriam
ente a una
bodega.
```
```
RF-INV-02 El sistema
debe
controlar
stock por
```
```
M Sesión 1 Los lotes son
consultables
cronológica
mente.
```
```
ID Requisito Prioridad Origen Criterio de
aceptación
```

```
lote
incluyendo
fecha de
ingreso,
vencimiento
y proveedor.
```
RF-INV-03 El sistema
debe sugerir
consumo
bajo política
FEFO.

```
M Guía § 9 Se prioriza el
lote más
próximo a
vencer.
```
RF-INV-04 El sistema
debe impedir
consumo de
lotes
vencidos.

```
M Pregunta
vencimientos
```
```
Los lotes
vencidos
quedan
bloqueados
para
producción.
```
RF-INV-05 El sistema
debe permitir
registrar
devoluciones
de materia
prima
vencida a
proveedor.

```
S Pregunta
vencimientos
```
```
La
devolución
genera un
movimiento
auditable. La
decisión de
devolver o
descartar la
materia
prima
vencida la
toman
conjuntamen
te el
Encargado
de
Inventarios y
el Jefe de
Producción.
```

```
En la práctica
ocurre
raramente ya
que la
empresa
tiene
parámetros
de
vencimiento
mínimo
aceptable en
recepción
que
previenen
este
escenario.
```
RF-INV-06 El sistema
debe permitir
traslados
directos
entre
bodegas sin
flujo de
aprobación.

```
M Pregunta
traslados
```
```
El traslado
actualiza
inventario de
ambas
bodegas
atómicament
e.
```
RF-INV-07 El sistema
debe
manejar
zonas
textuales
configurable
s dentro de
cada
bodega.

```
M Sesión 1 No se exige
jerarquía
rack/pasillo/n
ivel.
```
RF-INV-08 El sistema
debe permitir
configurar

```
M Pregunta E La Bodega
Planta no
participa en
```

3. 1. 4 Módulo de Recepción (REC)

```
puntos de
reorden
únicamente
sobre la
Bodega
Principal.
```
```
alertas de
abastecimien
to.
```
```
RF-INV-09 El sistema
debe permitir
registrar
ajustes por
merma o
daño con
justificación
obligatoria.
```
```
S Buenas
prácticas
```
```
Ningún
ajuste puede
registrarse
sin motivo.
```
```
RF-INV-10 El sistema
debe ofrecer
consulta tipo
kardex para
cada materia
prima.
```
```
S Buenas
prácticas
```
```
Permite filtrar
por fechas,
movimiento y
bodega.
```
```
RF-REC-01 El sistema
debe
registrar
órdenes de
pedido a
proveedores.
```
```
M Sesión 1 La orden
inicia en
estado
“Abierta”.
```
```
RF-REC-02 El sistema
únicamente
debe permitir
```
```
M Sesión 1 Intentos sin
orden
generan
```
```
ID Requisito Prioridad Origen Criterio de
aceptación
```

```
recepciones
asociadas a
órdenes de
pedido
existentes.
```
```
error
bloqueante.
```
RF-REC-03 El sistema
debe
registrar
cantidad
recibida, lote,
fecha de
vencimiento
y costo
unitario en
cada
recepción.

```
M Sesión 1 El stock
aumenta
automáticam
ente en
Bodega
Principal.
```
RF-REC-04 El sistema
debe validar
días mínimos
aceptables
de
vencimiento
al recibir
mercancía.

```
M Pregunta C Productos
por debajo
del umbral
generan
bloqueo o
alerta.
```
RF-REC-05 El sistema
debe permitir
recepciones
parciales.

```
S Buenas
prácticas
```
```
La orden
conserva
saldo
pendiente.
```
RF-REC-06 El sistema
debe generar
comprobante
s PDF de
recepción.

```
S Sesión 1 El
comprobante
incluye
usuario y
fecha.
```
RF-REC-07 El sistema
debe

```
M Stakeholders El flujo
reemplaza el
```

3. 1. 5 Módulo de Producción y Producto Terminado (PROD)

```
digitalizar
progresivam
ente los
formatos
manuales
actuales
comenzando
por el
ingreso de
materia
prima.
```
```
formato
físico
priorizado.
```
```
RF-PROD-01 El sistema
debe
registrar
producción
por batido
individual.
```
```
M Pregunta D Dos batidos
simultáneos
generan
registros
independient
es.
RF-PROD-02 El sistema
debe permitir
agrupar
múltiples
batidos
dentro de
una misma
jornada o
lote
operativo
diario.
```
```
M Pregunta D La vista
diaria
muestra
todos los
batidos
ejecutados
en la fecha.
```
```
RF-PROD-03 El sistema
debe
```
```
M Sesión 1 El inventario
de producto
```
```
ID Requisito Prioridad Origen Criterio de
aceptación
```

```
registrar
producto
terminado
generado por
producción.
```
```
terminado
aumenta
automáticam
ente.
```
RF-PROD-04 El sistema
debe
descontar
materia
prima
consumida
por lote de
producción.

```
M Sesión 1 El sistema
sugiere lotes
FEFO
automáticam
ente.
```
RF-PROD-05 El sistema
debe
rechazar
registros de
producción
cuando
exista stock
insuficiente.

```
M Sesión 1 El sistema
identifica
claramente la
materia
prima
faltante.
```
RF-PROD-06 El sistema
debe
manejar
estados
operativos
para
producto
terminado:
“En espera”
y “En punto
de venta”.

```
M Pregunta A El cambio de
estado
queda
auditado.
```
RF-PROD-07 El sistema no
debe
manejar

```
M Pregunta A El control se
realiza
únicamente
```

3. 1. 6 Módulo de Alertas y Notificaciones (ALR)

```
inventario
independient
e para punto
de venta.
```
```
mediante
estados.
```
```
RF-PROD-08 El sistema
debe permitir
registrar
despachos
de producto
terminado
hacia el
punto de
venta.
```
```
M Sesión 1 El despacho
actualiza el
estado
correspondie
nte.
```
```
RF-PROD-09 El sistema
debe
manejar
vencimiento
y rotación
FIFO para
producto
terminado.
```
```
S Pregunta
vencimiento
PT
```
```
Los
productos
terminados
muestran
fecha
estimada de
vencimiento.
```
```
RF-PROD-10 El sistema
debe permitir
anular
registros de
producción
incorrectos
dejando
trazabilidad
completa.
```
```
M Pregunta
correcciones
```
```
No se
permite
edición
destructiva
de
movimientos
históricos.
```
```
ID Requisito Prioridad Origen Criterio de
aceptación
```

RF-ALR-01 El sistema
debe generar
alertas de
stock bajo.

```
M Sesión 1 Las alertas
aparecen en
panel y
canales
configurados
.
```
RF-ALR-02 El sistema
debe generar
alertas de
vencimiento
próximo.

```
M Guía § 4 Los lotes
cercanos a
vencer
aparecen
automáticam
ente.
```
RF-ALR-03 El sistema
debe enviar
alertas
mediante
WhatsApp
Business.

```
M Stakeholders El mensaje
llega al
número
corporativo
configurado.
```
RF-ALR-04 El sistema
debe enviar
alertas por
correo
electrónico.

```
M Sesión 1 Los
destinatarios
reciben
información
operativa
relevante.
```
RF-ALR-05 El sistema
debe permitir
configurar
destinatarios
y canales sin
redespliegue.

```
S Sesión 1 Los cambios
aplican
inmediatame
nte.
```

3. 1. 7 Módulo de Indicadores y Reportes (IND)

```
RF-ALR-06 El sistema
debe evitar
reenvíos
repetidos
innecesarios
de la misma
alerta.
```
```
S Buenas
prácticas
```
```
La
deduplicació
n utiliza
ventana
configurable.
```
```
RF-ALR-07 Las alertas
críticas
deben
actualizarse
en tiempo
real para
todos los
usuarios
conectados.
```
```
M Confirmación
stakeholders
```
```
Los cambios
aparecen sin
recargar la
página.
```
```
RF-IND-01 El sistema
debe
presentar
dashboard
gerencial con
indicadores
clave.
```
```
M Guía § 4 Dashboard
visible para
Gerencia.
```
```
RF-IND-02 El sistema
debe calcular
rotación de
inventario.
```
```
M Guía § 4 Fórmulas y
períodos
documentad
os.
RF-IND-03 El sistema
NO
```
```
W Sesión 2 El indicador
queda fuera
```
```
ID Requisito Prioridad Origen Criterio de
aceptación
```

implementar
á en este
MVP el
indicador de
nivel de
servicio
basado en
ventana de
entrega
prometida al
cliente.
Aunque la
definición de
negocio
existe
(pedido a
tiempo =
entregado
dentro de la
ventana
acordada
con el
cliente), el
PDV gestiona
esa
trazabilidad
de forma
presencial y
separada del
sistema, y el
dato de la
hora
prometida
nunca llega
al encargado
de
inventarios

```
del alcance.
Podría
incorporarse
en una
versión
futura si se
integra el
flujo del PDV
con el
sistema.
```

3. 1. 8 Módulo de Auditoría y Trazabilidad (AUD)

```
que registra
el despacho.
RF-IND-04 El sistema
debe calcular
utilización de
bodega por
zona.
```
```
S Guía § 4 El porcentaje
usa
capacidad
configurada.
```
```
RF-IND-05 El sistema
debe
exportar
reportes PDF
y Excel.
```
```
M Guía § 4 La
exportación
se genera en
menos de 10
segundos.
RF-IND-06 El sistema
debe generar
reportes
históricos
semanales
de
producción y
despachos.
```
```
S Stakeholders Reportes
exportables
a Excel.
```
```
RF-IND-07 El sistema
debe mostrar
panel
operativo en
tiempo real.
```
```
M Guía § 4 Las alertas
se actualizan
automáticam
ente.
```
```
RF-AUD-01 Ningún
movimiento
de inventario
debe
```
```
M Buenas
prácticas
```
```
Las
anulaciones
generan
movimientos
```
```
ID Requisito Prioridad Origen Criterio de
aceptación
```

3. 2 Requisitos No Funcionales (RNF)

3. 2. 1 Rendimiento (RNF-PER)

```
eliminarse
físicamente.
```
```
compensator
ios.
RF-AUD-02 El sistema
debe ofrecer
trazabilidad
completa de
cada lote.
```
```
M Guía § 5 La consulta
muestra
recepción,
traslados,
consumo y
despacho.
RF-AUD-03 El sistema
debe
registrar
usuario,
fecha, hora e
IP en
operaciones
críticas.
```
```
S Ley
1581/
```
```
Bitácora
accesible al
Administrado
r.
```
```
RF-AUD-04 El sistema
debe
mantener
trazabilidad
de
anulaciones
y
correcciones
de
producción.
```
```
M Pregunta
correcciones
```
```
El historial
nunca se
pierde.
```

3. 2. 2 Disponibilidad (RNF-AVA)

3. 2. 3 Seguridad (RNF-SEC)

```
RNF-PER-01 Tiempo de respuesta
de consultas de
inventario.
```
```
≤ 2 segundos para el
95 % de consultas.
```
```
RNF-PER-02 Tiempo de carga del
dashboard.
```
```
≤ 5 segundos para
datos del último mes.
RNF-PER-03 Generación de reportes
PDF/Excel.
```
```
≤ 10 segundos para
rangos de hasta un
año.
RNF-PER-04 Capacidad concurrente
mínima.
```
```
10 usuarios
concurrentes sin
degradación
perceptible.
RNF-PER-05 Actualizaciones en
tiempo real mediante
WebSockets.
```
```
Reflejo de cambios
operativos en menos
de 2 segundos.
```
```
ID Requisito Métrica
```
```
RNF-AVA-01 Disponibilidad durante
horario operativo.
```
```
≥ 99 % mensual.
```
```
RNF-AVA-02 Respaldo automático
de base de datos.
```
```
Backup diario con
retención mínima de 7
días.
```
```
ID Requisito Métrica
```
```
RNF-SEC-01 Contraseñas
almacenadas mediante
```
```
bcrypt, Argon2 o
equivalente.
```
```
ID Requisito Métrica
```

3. 2. 4 Usabilidad (RNF-USA)

```
hash adaptativo.
RNF-SEC-02 Comunicación
protegida mediante
HTTPS/TLS.
```
```
Certificado válido en
producción.
```
```
RNF-SEC-03 Cumplimiento Ley 1581
de 2012.
```
```
Evidencia
documentada de
tratamiento de datos.
RNF-SEC-04 RBAC obligatorio en
todos los endpoints.
```
```
Roles no autorizados
no acceden a recursos
restringidos.
RNF-SEC-05 Protección de
información sensible
en reposo.
```
```
Cifrado documentado
en arquitectura.
```
```
RNF-SEC-06 Las recetas nunca
deben almacenarse.
```
```
Verificación mediante
revisión de modelo y
código.
```
```
RNF-USA-01 Interfaz responsive. Compatible con 360px,
768px y 1280px.
RNF-USA-02 Curva de aprendizaje
reducida.
```
```
Un usuario puede
registrar una recepción
tras capacitación de 30
minutos.
RNF-USA-03 Mensajes claros y
comprensibles.
```
```
Validación cualitativa
en pruebas
funcionales.
RNF-USA-04 Optimización para
escritorio.
```
```
El flujo principal debe
priorizar uso en
computador.
```
```
ID Requisito Métrica
```

3. 2. 5 Accesibilidad (RNF-ACC)

3. 2. 6 Mantenibilidad (RNF-MAN)

3. 2. 7 Escalabilidad (RNF-ESC)

```
RNF-ACC-01 Cumplimiento WCAG
2. 1 AA en módulos
críticos.
```
```
Score ≥ 90 en
Lighthouse o axe-core.
```
```
ID Requisito Métrica
```
```
RNF-MAN-01 Aplicación de SOLID y
separación de capas.
```
```
Verificación
arquitectónica en Corte
3.
RNF-MAN-02 Cobertura mínima de
pruebas unitarias.
```
```
≥ 70 % en lógica crítica.
```
```
RNF-MAN-03 Documentación
OpenAPI/Swagger.
```
```
Endpoint accesible
públicamente.
```
```
RNF-MAN-04 Flujo Git con PRs y CI. Pipeline ejecuta
pruebas
automáticamente.
```
```
ID Requisito Métrica
```
```
RNF-ESC-01 Soporte para múltiples
centros de distribución
futuros.
```
```
Modelo preparado
desde el MVP.
```
```
RNF-ESC-02 Escalabilidad del
catálogo a más de 60
productos.
```
```
Validación con dataset
sintético de 1. 000
ítems.
```
```
ID Requisito Métrica
```

3. 2. 8 Integraciones (RNF-INT)

3. 2. 9 Portabilidad y Despliegue (RNF-POR)

3. 3 Decisiones cerradas durante levantamiento

```
RNF-INT-01 Integración con
WhatsApp Business
API o equivalente.
```
```
Mensajes entregados
exitosamente.
```
```
RNF-INT-02 Integración SMTP para
correo electrónico.
```
```
Correos enviados
correctamente.
RNF-INT-03 Importación masiva
desde Excel/CSV.
```
```
Validación con archivos
reales del cliente.
RNF-INT-04 Soporte para
WebSockets.
```
```
Actualización en
tiempo real funcional.
```
```
ID Requisito Métrica
```
```
RNF-POR-01 Despliegue cloud
accesible desde
Colombia.
```
```
Producción funcional
antes de Corte 3.
```
```
RNF-POR-02 Backend
contenedorizado con
Docker.
```
```
Ejecución reproducible
mediante comando
único.
```
```
ID Requisito Métrica
```
```
Traslados internos Se realizan sin aprobación formal.
Lotes vencidos Se bloquean y se gestionan devoluciones a
proveedor.
Punto de reorden Solo aplica sobre Bodega Principal.
```
```
Tema Decisión
```

3. 4 Trazabilidad RF → Resultados de Aprendizaje y Cortes

3. 5 Glosario

```
Producción simultánea Se registra por batido individual.
Producto terminado Se controla mediante estados y no mediante
inventario independiente de PDV.
Corrección de producción Se anula y registra nuevamente con
trazabilidad.
Nivel de servicio Pendiente de aprobación de stakeholders.
Propuesta: medir como % de jornadas de
producción completadas sin faltantes de
materia prima en Bodega PDP. El PDV gestiona
los tiempos de entrega al cliente de forma
presencial y separada del sistema.
Visibilidad de costos Gerencia, jefe de producción y encargado
pueden visualizarla.
Canal principal de alertas WhatsApp corporativo.
Tiempo real Requisito obligatorio mediante WebSockets.
```
```
Corte 1 AUT, CAT, arquitectura base,
pruebas iniciales y prototipos
```
```
Arquitectura RDA1-2 ·
Programación RDA1-2 ·
Pruebas RDA1
Corte 2 INV, REC, PROD Arquitectura RDA3 ·
Programación RDA3 · Pruebas
RDA2
Corte 3 ALR, IND, AUD, despliegue y
aceptación
```
```
Arquitectura RDA4 ·
Programación RDA4 · Pruebas
RDA3
```
```
Corte Módulos cubiertos Resultados de aprendizaje
```

FEFO First Expired, First Out. Política que prioriza
consumir primero el lote con vencimiento más
cercano.

FIFO First In, First Out. Política que prioriza consumir
el lote más antiguo.

Lote Conjunto de unidades recibidas o producidas
en una misma operación.

Punto de reorden Nivel mínimo de stock que dispara alerta de
abastecimiento.

Kardex Historial cronológico de movimientos de
inventario.

MVP Minimum Viable Product.

RBAC Role-Based Access Control.

KPI Key Performance Indicator.

WebSocket Tecnología de comunicación bidireccional en
tiempo real entre cliente y servidor.

Término Definición

EN_ESPERA Estado de un lote de producto terminado que
fue producido y se encuentra en la Planta de
Producción listo para ser despachado al PDV.

EN_PUNTO_DE_VENTA Estado de un lote de producto terminado que
fue enviado al PDV mediante el malacate y
registrado como despachado por el encargado
de inventarios.

Malacate Elevador de carga que conecta el Piso 2
(Planta de Producción) con el Piso 1 (Punto de
Venta). El despacho de producto terminado al
PDV se realiza físicamente a través del
malacate.


Movimiento compensatorio Registro generado para corregir un error en un
movimiento de inventario previo. El movimiento
original permanece inmutable. El
compensatorio es visible para todos los roles
con el dato original, el corregido, el usuario y la
fecha-hora.

Unidad base Unidad mínima de medida en que se lleva el
inventario internamente (gramos, mililitros o
unidades). Las presentaciones de compra se
convierten automáticamente usando el factor
de conversión del catálogo.

Jornada de producción Agrupación de todos los batidos realizados en
un mismo día. Se visualiza en el calendario con
cada batido como registro individual dentro de
la jornada.

Bodega PDP Bodega de Planta de Producción. Ubicada en
el Piso 2 del edificio de planta, en el mismo
espacio físico que la planta. Su stock está
comprometido para producción y no activa
alertas de punto de reorden.


