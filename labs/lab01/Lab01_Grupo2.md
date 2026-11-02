<div align="center">

# Laboratorio Grupal SQE III

<br><br>

![Jala University](https://cdn.prod.website-files.com/6399339694e376ce4ffcc44d/69bb424dd5c0cc3a928d3032_69b2d910d8dd2d14e27711e9_jala%20university%20logo.webp)

<br><br>

Valentina Molina Bustillos  
Gabriel Marcos Guaman Ortuño  
Karen Ivonne Cruz Alvarez  
Sebastián Pereyra  
Kevin Uruchi

<br><br>

Jala University  
Ingeniería en Software Comercial  
Mgr. Orlando Alarcon

<br><br>

Bolivia  
Octubre 30, 2026

<br>

</div>

<div style="page-break-after: always;"></div>

## Tabla de contenido

1. [Actividad #1](#actividad-1)
2. [Actividad #2](#actividad-2)
3. [Actividad #3](#actividad-3)
4. [Actividad #4](#actividad-4)
5. [Actividad #5](#actividad-5)

<div style="page-break-after: always;"></div>

## Actividad #1

1. Solucionar una prueba de programación en una plataforma, evaluando tiempo y calidad de solución.
2. Establecer equipos de trabajo fijos durante todo el curso, con un máximo de 5 integrantes por equipo y al menos dos equipos.

### Desarrollo

*Plataforma utilizada, resultados y tiempo empleado.*

### Equipo conformado

| Integrante | Rol |
|------------|-----|
| Valentina Molina Bustillos | |
| Gabriel Marcos Guaman Ortuño | |
| Karen Ivonne Cruz Alvarez | |
| Sebastián Pereyra | |
| Kevin Uruchi | |

---

## Actividad #2

1. Investigar o asignar una aplicación con el potencial para realizar pruebas de API automatizadas.
2. Cada equipo debe comenzar con pruebas de exploración sobre la aplicación para entender su lógica.
3. Se recomienda usar la documentación de la aplicación y las interacciones visibles en las herramientas del explorador.

### Aplicación seleccionada

El equipo seleccionó **Notion** —específicamente su interfaz programática pública **Notion REST API v1** (`https://api.notion.com/v1/`) bajo la especificación **`2025-09-03`**— como el Sistema Bajo Prueba (**SUT**, *System Under Test*) para el diseño e implementación de pruebas de API automatizadas. Como base contractual de referencia y ejecución, el equipo adoptó la colección oficial pública del *Workspace* de Notion en Postman: [**Notion API (2025-09-03)**](https://www.postman.com/notionhq/notion-s-api-workspace/folder/52041987-9646fde8-b199-4699-b876-84c4cfe43129). Notion es una plataforma colaborativa de gestión de conocimiento, documentación y flujos de trabajo basada en bloques y bases de datos multi-fuente, cuya arquitectura orientada a servicios expone contratos maduros y altamente verificables.

| Atributo Técnico | Especificación del SUT |
|------------------|------------------------|
| **Aplicación / SUT** | Notion — Notion Public REST API v1 |
| **URL Base (`BASE_URL`)** | `https://api.notion.com/v1/` |
| **Protocolo y Formato** | HTTPS (TLS 1.2+) con *payloads* en JSON (`UTF-8`) y `multipart/form-data` para binarios |
| **Esquema de Autenticación** | `Authorization: Bearer <Internal Integration Secret>` (y soporte `OAuth` 2.0) |
| **Control de Versiones** | Encabezado obligatorio `Notion-Version: 2025-09-03` |
| **Colección Oficial Postman** | [Notion API (2025-09-03)](https://www.postman.com/notionhq/notion-s-api-workspace/folder/52041987-9646fde8-b199-4699-b876-84c4cfe43129) (`Users`, `Pages`, `Blocks`, `Data sources`, `Databases`, `Search`, `Comments`, `File uploads`, `OAuth`) |
| **Documentación Oficial** | [Notion Developers — API Reference](https://developers.notion.com/reference/intro) |

La elección de **Notion REST API v1 (`2025-09-03`)** responde a cuatro criterios técnicos que garantizan un alto potencial para la automatización de pruebas en distintos niveles de profundidad:

- **Arquitectura y Protocolo:** Implementa una arquitectura RESTful sobre HTTPS con intercambio estandarizado de *payloads* en formato JSON (`Content-Type: application/json`, complementado con `multipart/form-data` en el envío de archivos) y una semántica clara de verbos HTTP: `GET` para recuperación de recursos e inspección de metadatos, `POST` para instanciación de entidades, carga de archivos y ejecución de consultas complejas mediante cuerpos estructurados, `PATCH` para mutaciones parciales de propiedades y anexado de bloques, y `DELETE` para el archivado de bloques. Además, todas las respuestas mantienen un diseño polimórfico predecible mediante el atributo discriminador `"object"` (`"user"`, `"page"`, `"block"`, `"data_source"`, `"database"`, `"list"`, `"comment"`, `"file_upload"`).
- **Seguridad y Contratos de Cabecera:** Utiliza autenticación basada en *Bearer Token* (`Internal Integration Secret`, además de flujos de intercambio de tokens en el módulo `OAuth`) vinculada a capacidades granulares de la integración (*Read content*, *Update content*, *Insert content*, *Comment capabilities* y acceso a datos de usuario), combinada con la obligatoriedad del encabezado `Notion-Version: 2025-09-03`. Esta exigencia contractual resulta idónea para automatizar pruebas de contrato (*Header & Schema Contract Testing*), pruebas de autenticación (credenciales ausentes, malformadas o revocadas) y pruebas de autorización por alcance.
- **Complejidad del Modelo de Dominio:** El dominio se organiza en los **9 módulos funcionales** que estructuran la colección oficial importada en Postman —**`Users`**, **`Pages`**, **`Blocks`**, **`Data sources`**, **`Databases`**, **`Search`**, **`Comments`**, **`File uploads`** y **`OAuth`**—, conformando un grafo jerárquico de entidades interconectadas con esquemas de propiedades fuertemente tipados (`title`, `rich_text`, `number`, `select`, `multi_select`, `status`, `date`, `files`, `checkbox`, `relation`, entre otros). Esta riqueza estructural permite diseñar una cobertura integral de pruebas:
  - *Pruebas funcionales:* Operaciones CRUD sobre contenedores `Databases`, tablas `Data sources`, `Pages`, árboles de `Blocks`, hilos de `Comments` y gestión transaccional de binarios mediante `File uploads`.
  - *Pruebas negativas:* Inyección de tipos de datos incompatibles con el esquema de un `data_source`, omisión de propiedades obligatorias, violación de estados en cargas de archivos o envío de identificadores `UUID` inválidos.
  - *Pruebas de valores límite (Boundary Value Analysis):* Paginación basada en cursores mediante `page_size` (con cotas estrictas entre `1` y `100` registros por respuesta) y `start_cursor` (`has_more`, `next_cursor`), así como límites de tamaño en nodos `rich_text` (`2000` caracteres por fragmento) y arreglos de hasta `100` bloques hijos por transacción.
  - *Filtros compuestos y ordenamiento:* Consultas declarativas sobre `Data sources` y `Search` que anidan operadores booleanos (`and`, `or`) junto con reglas de ordenamiento múltiple (`sorts`).
  - *Flujos End-to-End (E2E):* Orquestación completa del ciclo de vida de negocio (aprovisionar `Database` y `Data source` → ejecutar flujo multipaso en `File uploads` → crear `Page` adjuntando el archivo → anexar `Blocks` → registrar `Comments` → consultar vía `Data sources` / `Search` → archivar recursos).
- **Manejo de Estados y Errores:** La API responde de manera determinista utilizando códigos de estado HTTP estándar (`200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict` ante colisiones de guardado concurrente y `429 Too Many Requests` por *Rate Limiting*) acompañados de un contrato JSON de error uniforme y fuertemente tipado (`object`, `status`, `code`, `message`, `request_id`), facilitando aserciones precisas y libres de ambigüedad:

```json
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "body failed validation: body.parent should be defined, instead was `undefined`."
}
```

### Pruebas de exploración

Para comprender la lógica de negocio, las reglas implícitas de validación y las restricciones arquitectónicas del SUT antes de codificar *scripts* de prueba, el equipo ejecutó sesiones estructuradas de *Exploratory Testing* divididas en dos frentes complementarios (*Grey-Box* desde el navegador y *Black-Box* contra el contrato HTTP):

#### A. Exploración mediante Herramientas del Explorador (Chrome DevTools - Pestaña Network) e Interfaz Web (UI)

1. **Inspección de tráfico en operaciones del cliente web:** Utilizando **Chrome DevTools** (pestaña *Network* filtrada por `Fetch/XHR` y *Preserve log* activo) sobre `https://www.notion.so`, se monitorearon en tiempo real las solicitudes disparadas al crear páginas nuevas, redactar e indentar bloques de contenido (`paragraph`, `to_do`, `heading`), adjuntar archivos y agregar registros con múltiples columnas dentro de tablas. Se examinaron los encabezados HTTP, las cookies de sesión, la estructura transaccional de los *payloads* enviados por la interfaz y los tiempos de respuesta.
2. **Análisis y resolución de identificadores únicos (`UUIDv4`):** Mediante la barra de direcciones del navegador y el inspector de elementos (**DOM**), se estudió cómo Notion identifica unívocamente cada recurso. Se verificó que en las URLs de navegación el identificador se adjunta al final del título como una cadena hexadecimal continua de 32 caracteres sin guiones (p. ej., `.../Sprint-Backlog-3f2504e04f8941d39a0c0305e82c3301`), mientras que en los atributos del DOM (`data-block-id`) y en los *payloads* internos se formatea como `UUIDv4` canónico separado por guiones (`8-4-4-4-12`, p. ej., `3f2504e0-4f89-41d3-9a0c-0305e82c3301`). Asimismo, al abrir vistas de bases de datos se identificó la distinción en la URL entre el `database_id` principal y el parámetro `?v=<view_id>`, evitando confundir el identificador de una vista con el de la entidad de datos o su `data_source_id`.
3. **Verificación del flujo de permisos y conexiones en la UI:** Se aprovisionó una integración interna en el portal *Notion Developers* y se validó desde la interfaz web la ruta de vinculación explícita de recursos (*Settings / Menú `•••` de página → Connections → Connect to → Integración del Equipo*). Se comprobó empíricamente cómo los permisos concedidos sobre una página raíz se propagan por herencia hacia sus subpáginas, bases de datos y fuentes de datos embebidas, y qué sucede al revocar dicha conexión desde la UI.

#### B. Exploración mediante Documentación Oficial de Notion Developers y Cliente HTTP (Postman)

1. **Configuración del entorno de pruebas y colección oficial:** Se importó en **Postman** la colección oficial **Notion API (2025-09-03)** con sus 9 carpetas (`Users`, `Pages`, `Blocks`, `Data sources`, `Databases`, `Search`, `Comments`, `File uploads` y `OAuth`) y se parametrizó un *Environment* dedicado con las variables requeridas por el contrato:
   - `BASE_URL`: `https://api.notion.com`
   - `NOTION_TOKEN`: Secreto de la integración interna (`Internal Integration Secret`) inyectado como *Bearer Token*.
   - `Notion-Version`: `2025-09-03` configurado como cabecera transversal a nivel de colección, acompañado de variables dinámicas de encadenamiento (`ROOT_PAGE_ID`, `DATABASE_ID`, `DATA_SOURCE_ID`, `PAGE_ID`, `BLOCK_ID`, `FILE_UPLOAD_ID`).

```http
POST {{BASE_URL}}/v1/data_sources/{{DATA_SOURCE_ID}}/query HTTP/1.1
Authorization: Bearer {{NOTION_TOKEN}}
Notion-Version: 2025-09-03
Content-Type: application/json
```

2. **Ejecución exploratoria sobre los módulos de la colección `2025-09-03`:** Contrastando la documentación oficial de *Notion Developers* con peticiones controladas (casos válidos, omisión de cabeceras, mutación de tipos y pruebas de frontera), se exploraron los siguientes módulos:
   - **`Users` y `Search` (`GET /v1/users/me`, `GET /v1/users`, `POST /v1/search`):** Verificación de identidad del *bot* asociado al token, listado de usuarios del *workspace* y búsqueda transversal con filtrado por tipo de objeto (`"page"` o `"data_source"`) y cursores de paginación.
   - **`Databases` y `Data sources` (`POST /v1/databases`, `POST /v1/data_sources`, `PATCH /v1/data_sources/{id}`, `POST /v1/data_sources/{id}/query`):** Exploración del modelo introducido en `2025-09-03` que desacopla el contenedor `database` de sus fuentes tabulares `data_sources`, validando creación de esquemas tipados (`title`, `status`, `select`, `number`, `date`, `files`), consultas con filtros compuestos (`and`/`or`) y criterios de ordenamiento (`sorts`).
   - **`Pages`, `Blocks` y `Comments` (`POST /v1/pages`, `PATCH /v1/pages/{id}`, `PATCH /v1/blocks/{id}/children`, `POST /v1/comments`, `GET /v1/comments`):** Creación de registros asociados a un `data_source_id` o `page_id`, mutación parcial y archivado de páginas, anexado jerárquico de bloques de contenido enriquecido (`heading_2`, `paragraph`, `to_do`, `file`) y registro/consulta de comentarios sobre páginas y bloques.
   - **`File uploads` (`/v1/file_uploads`):** Exploración exhaustiva del flujo multipaso de gestión de archivos propios en Notion a través de sus **5 operaciones** en la colección:
     - `POST Create a file upload` (`POST /v1/file_uploads`): Reserva inicial del registro de carga definiendo metadatos (`filename`, `content_type`, `mode`), obteniendo un `FILE_UPLOAD_ID` en estado `"pending"`.
     - `POST Send file upload` (`POST /v1/file_uploads/{id}/send`): Transmisión efectiva del contenido binario mediante `multipart/form-data` (incluyendo soporte de `part_number` para cargas multiparte).
     - `POST Complete file upload` (`POST /v1/file_uploads/{id}/complete`): Cierre y consolidación de sesiones de carga multiparte para transicionar el recurso al estado `"uploaded"` y habilitar su vinculación en bloques o propiedades de página.
     - `GET Retrieve a file upload` (`GET /v1/file_uploads/{id}`): Inspección puntual de metadatos, tamaño en bytes, tipo MIME y estado actual (`pending`, `uploaded`, `expired` o `failed`).
     - `GET List file uploads` (`GET /v1/file_uploads`): Consulta paginada (`page_size`, `start_cursor`) y filtrable por `status` de las cargas generadas por la integración.

#### Resumen de sesiones de exploración ejecutadas

| Flujo explorado | Herramienta utilizada | Endpoint / Interacción | Comportamiento observado |
|-----------------|-----------------------|------------------------|--------------------------|
| **Inspección de operaciones en cliente web** | Chrome DevTools (*Network* / *DOM*) | `POST /api/v3/saveTransactions`, `POST /api/v3/loadPageChunk`, `POST /api/v3/queryCollection` | La UI web no consume `/v1/`; agrupa mutaciones locales en lotes transaccionales autenticados por cookie (`token_v2`) y expone los `UUIDv4` en el atributo `data-block-id` del DOM y al final del *slug* en la URL. |
| **Vinculación de permisos por recurso** | Notion Web UI (*Connections*) + Postman | *Menú `•••` → Connections* y `GET /v1/pages/{id}` | Antes de vincular la página a la integración, la API responde `404 Not Found` (`object_not_found`); tras conectarla en la UI, retorna `200 OK` de forma inmediata y hereda acceso a sus nodos hijos. |
| **Validación de identidad y cabeceras (`Users`)** | Postman (`2025-09-03`) + Docs Oficiales | `GET /v1/users/me` y `GET /v1/users` | Con `Notion-Version: 2025-09-03` y token válido devuelve `200 OK` con el perfil `"type": "bot"`. Omitir `Notion-Version` dispara `400 Bad Request` (`missing_version`); un token inválido produce `401 Unauthorized` (`unauthorized`). |
| **Búsqueda y paginación por cursores (`Search`)** | Postman (`2025-09-03`) + Docs Oficiales | `POST /v1/search` | Indexa únicamente páginas y `data_sources` compartidos con la integración. Con `page_size: 2` devuelve `"has_more": true` y `"next_cursor"`; enviar `page_size: 101` o `0` arroja `400 validation_error`. |
| **Contenedores y fuentes de datos (`Databases` / `Data sources`)** | Postman (`2025-09-03`) + Chrome UI | `POST /v1/databases`, `GET /v1/data_sources/{id}` y `POST /v1/data_sources/{id}/query` | En `2025-09-03`, `Databases` actúa como contenedor y las consultas con filtros `and`/`or` y `sorts` se ejecutan sobre `Data sources` (`200 OK`), reflejándose al instante en la UI. Filtrar por propiedades inexistentes retorna `400 validation_error`. |
| **Ciclo de páginas, bloques y comentarios (`Pages` / `Blocks` / `Comments`)** | Postman (`2025-09-03`) + Chrome DevTools | `POST /v1/pages`, `PATCH /v1/pages/{id}`, `PATCH /v1/blocks/{id}/children` y `POST /v1/comments` | Exige `parent` (`data_source_id` o `page_id`). Las páginas se archivan con `PATCH` (`{"archived": true}` / `{"in_trash": true}`); `Blocks` anexa hasta `100` hijos por llamada y `Comments` asocia discusiones a páginas o bloques con `200 OK`. |
| **Flujo multipaso de carga de archivos (`File uploads`)** | Postman (`2025-09-03`) + Docs Oficiales | `POST Create a file upload`, `POST Send file upload`, `POST Complete file upload`, `GET Retrieve a file upload` y `GET List file uploads` | `Create` reserva el `file_upload_id` (`status: "pending"`); `Send` transfiere el binario vía `multipart/form-data`; `Complete` consolida cargas multiparte pasando a `"uploaded"`; `Retrieve` y `List` auditan estado y paginación antes de referenciar el archivo en `Pages` o `Blocks`. |
| **Pruebas de ráfaga y *Rate Limiting*** | Postman (*Collection Runner*) | Ejecución en ráfaga sobre `GET /v1/users/me`, `GET /v1/file_uploads` y `POST /v1/search` | Al superar el umbral sostenido de ~3 peticiones/segundo con ráfagas concurrentes, el servidor responde `429 Too Many Requests` (`"code": "rate_limited"`) e incluye la cabecera `Retry-After`. |

### Hallazgos

El contraste sistemático entre el tráfico capturado en **Chrome DevTools** y el comportamiento de la colección oficial **Notion API (2025-09-03)** en **Postman** permitió consolidar cinco hallazgos técnicos críticos que condicionan directamente la arquitectura de la futura suite de automatización:

1. **Hallazgo 1 — Discrepancia entre la API Interna del Cliente Web y la API Pública REST:**
   Al auditar la pestaña *Network* en Chrome DevTools se constató que la aplicación web de Notion (`notion.so`) opera exclusivamente sobre una API privada no documentada orientada a sincronización de estado y transacciones por lotes (`/api/v3/saveTransactions`, `/api/v3/loadPageChunk`, `/api/v3/queryCollection`), autenticada mediante cookies de sesión (`token_v2`). Por el contrario, la automatización de pruebas de API debe apuntar estrictamente a la **API pública REST (`/v1/`)**, cuyos contratos son versionados, estables y orientados a recursos. No obstante, las DevTools y la UI demostraron ser indispensables como herramientas de soporte en QA para extraer identificadores `UUIDv4` limpios (distinguiendo `database_id` de `view_id` en la URL), inspeccionar atributos `data-block-id` en el DOM y validar visualmente la persistencia de los datos y archivos inyectados por API.

2. **Hallazgo 2 — Modelo de Seguridad por Recurso y Respuesta `404 Not Found` en lugar de `403 Forbidden`:**
   Contar con un `NOTION_TOKEN` válido no otorga visibilidad global sobre el *workspace*. Notion aplica un modelo de aislamiento por recurso (*Opt-in Resource Sharing*): si una página o base de datos existente no ha sido conectada explícitamente a la integración desde la UI (*Settings / Menú de página → Connections*), cualquier intento de lectura o escritura sobre su UUID devuelve **`404 Not Found` (`"code": "object_not_found"`)** en lugar de `403 Forbidden`. Este comportamiento responde a una decisión deliberada de seguridad y privacidad para prevenir ataques de enumeración de identificadores, impidiendo confirmar la existencia de recursos ajenos. El código `403 Forbidden` (`"code": "restricted_resource"`) se reserva únicamente para escenarios donde el recurso sí está compartido, pero el token carece de una capacidad específica (por ejemplo, intentar insertar bloques o comentarios con una integración configurada en modo solo lectura).

3. **Hallazgo 3 — Jerarquía Estricta Padre-Hijo (`parent` obligatorio):**
   A diferencia de un usuario humano que puede crear páginas raíz directamente en la barra lateral del *workspace*, una integración interna no puede crear recursos huérfanos o de primer nivel vía API. Ninguna entidad `page` (`POST /v1/pages`) o `database` (`POST /v1/databases`) puede instanciarse sin declarar explícitamente un objeto `parent` válido y previamente compartido (`page_id`, `data_source_id` o `database_id`); su omisión rechaza la solicitud de inmediato con **`400 Bad Request` (`"code": "validation_error"`)**. Para la estrategia de automatización, esto implica que el entorno de pruebas debe contar con una página raíz semilla (*Root Test Container*) preconfigurada y compartida con la integración, bajo la cual los *hooks* de *setup* construirán dinámicamente los contenedores, fuentes de datos y páginas de cada suite.

4. **Hallazgo 4 — Paradigma *"Todo es un Bloque"* y Eliminación Lógica (*Soft Delete*):**
   El cuerpo documental de una página no se almacena como un campo de texto plano o HTML dentro del objeto `page` (el cual solo aloja metadatos y valores de `properties`), sino como un árbol jerárquico de entidades `block` independientes. En consecuencia, una página actúa a su vez como un bloque contenedor cuyo `page_id` se utiliza directamente en `/v1/blocks/{id}/children` para leer o anexar párrafos, encabezados, listas y referencias a `file_upload`. Adicionalmente, la API no expone el verbo `DELETE` para páginas, bases de datos ni fuentes de datos: su eliminación es estrictamente lógica (*Soft Delete*) y se ejecuta mediante `PATCH` enviando en el cuerpo `{"archived": true}` (o su equivalente actual `{"in_trash": true}`). De igual modo, invocar `DELETE /v1/blocks/{id}` no purga físicamente el nodo de forma inmediata, sino que lo transiciona al estado `"archived": true`, permitiendo diseñar rutinas de limpieza (*teardown*) seguras e idempotentes.

5. **Hallazgo 5 — Rigidez del Contrato `Notion-Version: 2025-09-03` y *Rate Limiting*:**
   El motor de validación de contratos de Notion exige de forma obligatoria el encabezado **`Notion-Version: 2025-09-03`**, no solo para evitar el bloqueo inmediato de cualquier petición con **`400 Bad Request` (`"code": "missing_version"`)**, sino también para habilitar el soporte contractual de los módulos recientes de la colección oficial: la arquitectura desacoplada de **`Data sources`** (`/v1/data_sources`) y el flujo transaccional multipaso de **`File uploads`** (reserva de sesión con `Create`, envío binario con `Send`, cierre con `Complete` y auditoría mediante `Retrieve`/`List`). Asimismo, la plataforma aplica una política de control de tráfico (*Rate Limiting*) con un límite promedio de **3 peticiones por segundo (`3 req/s`) por integración**, respondiendo con **`429 Too Many Requests` (`"code": "rate_limited"`)** y el encabezado `Retry-After` cuando se satura la cuota. Este hallazgo representa un requisito no funcional crítico para el *framework* de pruebas automatizadas: al ejecutar suites en paralelo (*workers* concurrentes en CI/CD), será indispensable controlar la concurrencia, implementar mecanismos de reintento con *exponential backoff* basados en `Retry-After` o distribuir la carga entre múltiples integraciones para evitar falsos fallos (*flaky tests*).

---

## Actividad #3

1. Cada equipo debe presentar las características de la aplicación elegida o asignada.
2. Cada miembro debe explicar un caso de uso o una característica de la aplicación para desarrollar sus pruebas de API.

### Características de la aplicación

La plataforma **Notion**, a través de su especificación **Notion REST API (`Notion-Version: 2025-09-03`)**, presenta cuatro características arquitectónicas y funcionales principales sobre las cuales se fundamenta la estrategia de pruebas automatizadas del equipo:

- **Gestión unificada de espacios de trabajo y contenido modular:** Estructura la información mediante una jerarquía desacoplada compuesta por páginas (`Pages`), árboles recursivos de bloques de contenido enriquecido (`Blocks`), contenedores de bases de datos (`Databases`) y fuentes de datos tabulares consultables (`Data sources`) con esquemas de propiedades fuertemente tipados.
- **Control de identidad, directorio de usuarios y seguridad OAuth 2.0:** Administra las identidades de usuarios humanos (`person`) y cuentas automatizadas de integración (`bot`) mediante el módulo `Users`, articulándose con el estándar OAuth 2.0 (`OAuth`) para gestionar el ciclo completo de emisión, rotación, introspección y revocación segura de tokens de acceso en integraciones públicas.
- **Capacidades transversales de colaboración y archivos:** Provee endpoints nativos para búsqueda global indexada con filtros por entidad (`Search`), gestión de hilos de discusión contextualizados en páginas o bloques (`Comments`) y carga transaccional multipaso de archivos binarios (`File uploads`).
- **Contratos estandarizados de paginación, versionado y errores:** Implementa paginación determinista basada en cursores (`start_cursor`, `page_size` acotado entre `1` y `100`, `has_more`, `next_cursor`), versionado contractual obligatorio por cabecera (`Notion-Version: 2025-09-03`) y respuestas JSON tipadas tanto para entidades de dominio (`object`) como para el manejo estructurado de errores (`code`, `status`, `message`).

### Casos de uso por integrante

| Integrante | Caso de uso o característica |
|------------|------------------------------|
| Valentina Molina Bustillos | Gestión de Fuentes de Datos Tabulares (`Data sources`), Esquemas de Propiedades Dinámicas y Consultas Compuestas (`Query`) |
| Gabriel Marcos Guaman Ortuño | Gestión de Identidad y Directorio de Usuarios (`Users`) y Ciclo de Vida de Autenticación/Autorización (`OAuth` 2.0) |
| Karen Ivonne Cruz Alvarez | |
| Sebastián Pereyra | Contenedores de Bases de Datos (`Databases`) y Búsqueda Indexada Global (`Search`) |
| Kevin Uruchi | Gestión del Ciclo de Vida de Páginas (`Pages`) |

#### Detalle de Caso de Uso — Gabriel Marcos Guaman Ortuño (Módulos: Users & OAuth)

El alcance asignado comprende dos módulos transversales de identidad y seguridad pertenecientes a la colección oficial de Postman **Notion API (`2025-09-03`)**:

- **Módulo `Users` (Identidad del Bot y Directorio del Workspace):**
  - `GET /v1/users/me` (*Retrieve your token's bot user*): Recupera el perfil `user` (`type: "bot"`) vinculado al token autenticado actual, exponiendo metadatos del propietario (`owner`), información del espacio de trabajo (`workspace_name`) y límites operativos del entorno (`workspace_limits`, como el tamaño máximo permitido para carga de archivos).
  - `GET /v1/users/{user_id}` (*Retrieve a user*): Consulta el perfil detallado de un usuario específico del *workspace* —ya sea miembro humano (`type: "person"`) o integración (`type: "bot"`)— resolviendo su identificador único `UUIDv4` (con o sin guiones) conforme a las capacidades de visibilidad otorgadas al token.
  - `GET /v1/users` (*List all users*): Retorna de forma paginada (`object: "list"`, con `page_size` máximo de `100`, `start_cursor`, `has_more` y `next_cursor`) el directorio completo de miembros y bots con acceso al *workspace* (excluyendo invitados externos o *guests*).

- **Módulo `OAuth` (Ciclo de Vida de Tokens e Integraciones Públicas):**
  - `POST /v1/oauth/token` (*Token*): Intercambia un código de autorización temporal de un solo uso (`grant_type: "authorization_code"`) o renueva una sesión mediante rotación de `refresh_token` (`grant_type: "refresh_token"`) para emitir un `access_token` activo y metadatos de vinculación (`bot_id`, `workspace_id`), exigiendo autenticación HTTP `Basic` (`base64(client_id:client_secret)`).
  - `POST /v1/oauth/introspect` (*Introspect*): Inspecciona el estado operativo de una credencial (`active: true` o `active: false` bajo el estándar RFC 7662), permitiendo auditar su vigencia, marcas temporales (`iat`) y metadatos sin ejecutar mutaciones de negocio.
  - `POST /v1/oauth/revoke` (*Revoke*): Revoca e invalida de forma inmediata e idempotente (RFC 7009) un `access_token` activo, cerrando el ciclo de sesión de la integración y bloqueando cualquier petición posterior hacia recursos protegidos.

- **Valor para las pruebas de API:** La articulación conjunta de `OAuth` y `Users` permite diseñar una suite de pruebas altamente representativa que cubre validación estricta de contratos (`Notion-Version: 2025-09-03` y esquemas tipados), seguridad bajo **esquemas duales de autenticación** (`HTTP Basic Auth` con credenciales de cliente en `/v1/oauth/*` frente a `Bearer Token` en `/v1/users/*` y restricciones `403 restricted_resource` por capacidades), análisis de valores límite (*Boundary*) sobre cursores de paginación (`page_size` en `0`, `1`, `100` y `101`) y formatos `UUIDv4`, así como flujos **End-to-End (E2E)** completos de extremo a extremo (emisión de token en `/v1/oauth/token` → validación de `active: true` en `/v1/oauth/introspect` → verificación de identidad del bot en `/v1/users/me` → revocación en `/v1/oauth/revoke` → comprobación de `active: false` y rechazo determinista `401 Unauthorized` al reintentar el consumo de `/v1/users/me`).

#### Detalle de Caso de Uso — Valentina Molina Bustillos (Módulo: Data Sources)

El alcance asignado comprende el módulo de fuentes tabulares de la colección oficial de Postman **Notion API (`2025-09-03`)**:

- **Módulo `Data sources` (Entidades Tabulares Consultables y Esquemas de Propiedades Dinámicas):**
  - `POST /v1/data_sources` (*Create a data source*): En el modelo arquitectónico introducido en `2025-09-03`, las fuentes de datos tabulares (`data sources`) se alojan dentro de contenedores de base de datos (`database_id`), definiendo su propio esquema de propiedades tipadas (`properties`) y metadatos tabulares.
  - `GET /v1/data_sources/{data_source_id}` (*Retrieve a data source*): Consulta la definición y el estado completo del esquema de una fuente de datos específica mediante su UUID, recuperando la relación de columnas tipadas y opciones de selección.
  - `PATCH /v1/data_sources/{data_source_id}` (*Update a data source*): Modifica incrementalmente la definición de propiedades, permitiendo añadir nuevas columnas tipadas, renombrar atributos existentes o archivar columnas en el esquema activo sin alterar los registros existentes.
  - `POST /v1/data_sources/{data_source_id}/query` (*Query a data source*): Ejecuta consultas tabulares y filtrado avanzado sobre los registros contenidos en la fuente de datos, admitiendo filtros compuestos lógicos (`and`/`or`), ordenamiento multidireccional (`sorts`) y paginación determinista por cursores (`page_size` de 1 a 100, `start_cursor`, `has_more`, `next_cursor`).

- **Valor para las pruebas de API:** Permite validar el núcleo del procesamiento de datos en Notion bajo la versión `2025-09-03`, asegurando el desacoplamiento efectivo entre el contenedor y su fuente tabular. Facilita la verificación de esquemas dinámicos, consistencia de tipos de datos, análisis de valores límite en paginación (`page_size=0, 1, 100, 101`) y flujos E2E de consulta relacional compleja con operadores anidados.

#### Detalle de Caso de Uso — Sebastián Pereyra (Módulos: Databases & Search)

El alcance asignado comprende los módulos estructurales de contenedores y descubrimiento global de la colección oficial de Postman **Notion API (`2025-09-03`)**:

- **Módulo `Databases` (Contenedores de Estructuras y Esquemas):**
  - `POST /v1/databases` (*Create a database*): Crea un contenedor de base de datos bajo una página padre (`parent.page_id`), definiendo el título enriquecido y la configuración visual (`icon`, `cover`, `is_inline`), inicializando la estructura organizativa.
  - `GET /v1/databases/{database_id}` (*Retrieve a database*): Recupera los metadatos completos del contenedor de base de datos por su identificador UUID, incluyendo título, descripción, icono, portada, relación de fuentes de datos asociadas (`data_sources`), estado de archivado y marcas temporales.
  - `PATCH /v1/databases/{database_id}` (*Update a database*): Actualiza los metadatos del contenedor (título, descripción, icono, portada) o modifica su ciclo de vida enviándolo o restaurándolo de la papelera (`in_trash: true/false`).

- **Módulo `Search` (Búsqueda Indexada Global en el Workspace):**
  - `POST /v1/search` (*Search by title*): Realiza búsquedas globales indexadas por texto o título sobre todas las páginas y bases de datos compartidas con la integración, soportando filtros estrictos por tipo de entidad (`filter.value: "page" | "database"`), ordenamiento por fecha de edición (`sort.direction: "ascending" | "descending"`) y paginación basada en cursores.

- **Valor para las pruebas de API:** Permite verificar la gobernanza de contenedores de datos y la capacidad de descubrimiento en el workspace. Facilita el diseño de pruebas de integridad referencial de padres, pruebas de mutación de metadatos vía `PATCH`, valores límite en paginación y ordenamiento de búsqueda, y flujos integrales **End-to-End (E2E)** (creación de contenedor → actualización de título e icono → indexación inmediata en búsqueda global → archivado y verificación de aislamiento).

#### Detalle de Caso de Uso — Kevin Uruchi (Módulo Pages)

El alcance asignado comprende el módulo de gestión de contenido `Pages` de la colección oficial de Postman **Notion API (`2025-09-03`)**, que cubre el ciclo completo de creación, lectura, actualización y reubicación de páginas dentro de un *workspace*.

- **Módulo `Pages` (Ciclo de Vida de Páginas):**
   - `POST /v1/pages` (*Create a page*) crea una página bajo una página padre (`parent.page_id`) o como fila de un *data source* (`parent.data_source_id`), con propiedades tipadas, bloques de contenido (`children`, hasta 100 por petición), `icon` y `cover`. Devuelve `object: "page"`, el nuevo `id`, `parent`, marcas temporales y `url`.
   - `GET /v1/pages/{page_id}` (*Retrieve a page*) recupera las propiedades y los metadatos de una página (`created_by`, `last_edited_time`, `in_trash`, `icon`, `cover`, `properties`). Admite `filter_properties` para reducir la respuesta y no devuelve bloques de contenido. Las propiedades con muchas referencias (`relation`, `rollup`, `people`) se devuelven truncadas.
   - `GET /v1/pages/{page_id}/properties/{property_id}` (*Retrieve a page property item*) obtiene el valor completo de una sola propiedad. Las propiedades simples devuelven `object: "property_item"` y las paginadas (`title`, `rich_text`, `relation`, `rollup`, `people`) devuelven `object: "list"` con `results[]`, `has_more` y `next_cursor`. Acepta `page_size` entre `1` y `100` y `start_cursor`.
   - `POST /v1/pages/{page_id}/move` (*Move a page*) reubica una página existente bajo otra página (`type: "page_id"`) o dentro de un *data source* (`type: "data_source_id"`). Conserva el `id`, la `url` y el contenido, y mueve también las subpáginas. Rechaza `database_id`, ciclos jerárquicos y destinos en la papelera.
   - `PATCH /v1/pages/{page_id}` (*Update page properties*) actualiza propiedades, `icon`, `cover`, el estado de papelera (`in_trash`) y el bloqueo (`is_locked`) de forma atómica y parcial. Rechaza propiedades de solo lectura (`formula`, `rollup`, `created_time`, entre otras) y los campos `parent` y `children`.

- **Valor para las pruebas de API.** El módulo `Pages` permite diseñar una suite que cubre validación estricta de contratos (`Notion-Version: 2025-09-03`, esquemas tipados y el modelo de *data sources*), seguridad con `Bearer Token` y restricciones por capacidades (`403 restricted_resource`), respuestas idénticas `404 object_not_found` para páginas inexistentes o no compartidas, análisis de valores límite (100 y 101 bloques, 2,000 y 2,001 caracteres, `page_size` en `0`, `1`, `100` y `101`, y `UUIDv4` con y sin guiones), control de límite de peticiones (`429 rate_limited`) y flujos **End-to-End (E2E)** completos. El flujo principal crea una fila con `POST /v1/pages`, la lee con `GET /v1/pages/{page_id}` y con el endpoint de propiedades, la actualiza con `PATCH`, la mueve entre padres y *data sources* con `POST /move`, la envía a la papelera con `in_trash: true` y comprueba que desaparece de las consultas. Después la restaura y verifica que conserva todos sus datos.

---

## Actividad #4

1. Cada miembro debe definir el criterio de aceptación para su característica o funcionalidad.
2. Cada miembro debe comenzar escribiendo sus pruebas de API, idealmente solo títulos y descripción opcional. Se puede usar GenAI para generar una lista base de escenarios (positivos, negativos, boundary y E2E), y el estudiante filtra, corrige y valida cuáles son aplicables. Se debe incluir el prompt y el procedimiento utilizado.

### Criterios de aceptación

#### Gabriel Marcos Guaman Ortuño — Módulos Users & OAuth

La especificación completa en inglés de las Historias de Usuario (*User Stories*), Criterios de Aceptación detallados y tablas de Casos de Prueba para los 6 endpoints asignados se encuentra documentada en el archivo [`pruebas/GabrielGuamanTests.md`](./pruebas/GabrielGuamanTests.md). A continuación, se sintetizan los criterios de aceptación establecidos bajo el contrato `Notion-Version: 2025-09-03`:

- **Módulo `Users` (`GET /v1/users/me`, `GET /v1/users/{user_id}`, `GET /v1/users`):**
  - *Happy Path:* Autenticado con `Authorization: Bearer <token>` válido y `Notion-Version: 2025-09-03`, `/v1/users/me` retorna `200 OK` con el perfil `object: "user"`, `type: "bot"`, `owner` y `workspace_limits`; `/v1/users/{user_id}` resuelve perfiles `person` o `bot` existentes (`200 OK`); y `/v1/users` entrega una lista paginada (`object: "list"`, `results[]`, `has_more`, `next_cursor`) excluyendo usuarios invitados (*guests*).
  - *Negative Scenarios:* Tokens ausentes, inválidos o revocados responden `401 Unauthorized` (`code: "unauthorized"`); la omisión del header `Notion-Version` retorna `400 Bad Request` (`code: "missing_version"`); tokens sin capacidad *Read user information* reciben `403 Forbidden` (`code: "restricted_resource"`); parámetros `UUID`, `page_size` o `start_cursor` malformados producen `400 Bad Request` (`code: "validation_error"`); y un `user_id` válido inexistente devuelve `404 Not Found` (`code: "object_not_found"`).
  - *Boundary Cases:* En `/v1/users`, `page_size=1` (mínimo) y `page_size=100` (máximo) responden `200 OK`, mientras que `page_size=0` y `page_size=101` se rechazan con `400 validation_error`. En `/v1/users/{user_id}`, tanto el `UUIDv4` canónico de 36 caracteres con guiones como la cadena hexadecimal compacta de 32 caracteres sin guiones son aceptados y normalizados a formato con guiones (`200 OK`), mientras que longitudes de 31/33 caracteres fallan con `400 validation_error` y el UUID nulo (`00000000-0000-0000-0000-000000000000`) retorna `404 object_not_found`.

- **Módulo `OAuth` (`POST /v1/oauth/token`, `POST /v1/oauth/revoke`, `POST /v1/oauth/introspect`):**
  - *Happy Path:* Autenticado mediante `Authorization: Basic base64(client_id:client_secret)` y `Notion-Version: 2025-09-03`, `/v1/oauth/token` intercambia un `authorization_code` válido o rota un `refresh_token` activo devolviendo `200 OK` con `access_token`, `refresh_token`, `token_type: "bearer"`, `bot_id` y `workspace_id`; `/v1/oauth/introspect` retorna `200 OK` con `active: true` para tokens vigentes y `active: false` para tokens revocados o desconocidos (RFC 7662); y `/v1/oauth/revoke` invalida de inmediato el token activo con `200 OK`.
  - *Negative Scenarios:* Credenciales `Basic Auth` ausentes o incorrectas retornan `401 Unauthorized` (`error: "invalid_client"` / `code: "unauthorized"`); omitir `Notion-Version` dispara `400 missing_version`; códigos expirados/forjados o `redirect_uri` no coincidente en `/token` devuelven `400 Bad Request` (`error: "invalid_grant"`); un `grant_type` no soportado retorna `400` (`error: "unsupported_grant_type"`); y la ausencia del campo `token`, tipos no *string* o JSON malformado en `/revoke` e `/introspect` responden `400` (`validation_error` / `invalid_json`).
  - *Boundary Cases:* Cadenas vacías (`""`), solo espacios o cuerpos `{}` son rechazados con `400 Bad Request`; el reintento inmediato de un `authorization_code` de un solo uso ya consumido (`N = 2`) es bloqueado con `400 invalid_grant`; la doble revocación de un mismo token mantiene idempotencia (`200 OK` conforme a RFC 7009); y cadenas sobredimensionadas (`2048` caracteres) en `/introspect` se procesan de forma segura sin provocar errores `500`.

- **Flujos End-to-End (`E2E`):**
  - *Ciclo completo de credencial OAuth e identidad del Bot:* Emisión en `/v1/oauth/token` → verificación `active: true` en `/v1/oauth/introspect` → validación de correspondencia `id == bot_id` en `/v1/users/me` → invalidación en `/v1/oauth/revoke` → confirmación `active: false` y bloqueo inmediato `401 Unauthorized` en `/v1/users/me`, complementado con el flujo de rotación continua por `refresh_token` y descubrimiento paginado de usuarios (`/v1/users` → `/v1/users/{user_id}`).

#### Valentina Molina Bustillos — Módulo Data Sources

La especificación completa en inglés de las Historias de Usuario (*User Stories*), Criterios de Aceptación detallados y tablas de Casos de Prueba para los 4 endpoints asignados se encuentra documentada en el archivo [`pruebas/ValentinaMolinaTests.md`](./pruebas/ValentinaMolinaTests.md). A continuación, se sintetizan los criterios de aceptación establecidos bajo el contrato `Notion-Version: 2025-09-03`:

- **Módulo `Data sources` (`POST /v1/data_sources`, `GET /v1/data_sources/{id}`, `PATCH /v1/data_sources/{id}`, `POST /v1/data_sources/{id}/query`):**
  - *Happy Path:* `/v1/data_sources` registra una nueva fuente de datos asociada a un `database_id` devolviendo `200 OK` con `object: "data_source"`; `GET /{id}` recupera el esquema tipado completo (`properties`) y metadatos; `PATCH /{id}` permite añadir, renombrar y archivar columnas retornando el esquema actualizado; y `/query` ejecuta filtros lógicos simples y compuestos (`and`/`or`) junto con ordenamientos (`sorts`), retornando una lista paginada (`object: "list"`, `results[]`, `has_more`, `next_cursor`).
  - *Negative Scenarios:* Consultar, actualizar o consultar una fuente de datos inexistente o no compartida retorna `404 object_not_found`; omitir el token o header de versión devuelve `401 Unauthorized` o `400 missing_version`; filtros con nombres de columna inexistentes o tipos incompatibles en `/query` responden `400 validation_error`; exceder la cuota de peticiones retorna `429 rate_limited`.
  - *Boundary Cases:* En `/query`, `page_size=1` y `page_size=100` responden `200 OK`, mientras que `page_size=0` y `page_size=101` son rechazados con `400 validation_error`; fuentes de datos sin filas retornan `results: []` con `has_more: false`; y filtros anidados complejos se ejecutan correctamente sin provocar excepciones en el servidor.
  - *Flujos End-to-End (`E2E`):* Creación de fuente de datos en base de datos → inserción de filas tipadas → ejecución de consultas con filtros compuestos → actualización dinámica de esquema vía `PATCH` → verificación de exclusión de registros archivados.

#### Sebastián Pereyra — Módulos Databases & Search

La especificación completa en inglés de las Historias de Usuario (*User Stories*), Criterios de Aceptación detallados y tablas de Casos de Prueba para los 4 endpoints asignados se encuentra documentada en el archivo [`pruebas/SebastianPereyraTests.md`](./pruebas/SebastianPereyraTests.md). A continuación, se sintetizan los criterios de aceptación establecidos bajo el contrato `Notion-Version: 2025-09-03`:

- **Módulo `Databases` (`POST /v1/databases`, `GET /v1/databases/{id}`, `PATCH /v1/databases/{id}`):**
  - *Happy Path:* Autenticado con `Authorization: Bearer <token>` válido y `Notion-Version: 2025-09-03`, al enviar `POST /v1/databases` con un `parent.page_id` válido y título, la API retorna `200 OK` con `object: "database"`, un nuevo identificador UUID y su fuente de datos por defecto; `GET /{id}` resuelve metadatos completos, icono, portada, relación de fuentes de datos y descripción; `PATCH /{id}` actualiza el título, descripción, icono y portada, o mueve la base a la papelera (`in_trash: true`) y la restaura (`in_trash: false`).
  - *Negative Scenarios:* Omitir o enviar credenciales Bearer inválidas retorna `401 Unauthorized` (`code: "unauthorized"`); omitir el header de versión produce `400 Bad Request` (`code: "missing_version"`); un `parent.page_id` o `database_id` inexistente o no compartido devuelve `404 Not Found` (`code: "object_not_found"`); un esquema de propiedades con tipos inválidos responde `400 validation_error`.
  - *Boundary Cases:* El identificador del contenedor se acepta tanto en formato UUID canónico de 36 caracteres con guiones como compacto de 32 caracteres; el título admite cadenas de hasta 2,000 caracteres Unicode y opciones múltiples; y `GET` sobre bases de datos en papelera responde `200 OK` con `in_trash: true`.

- **Módulo `Search` (`POST /v1/search`):**
  - *Happy Path:* Búsqueda con cuerpo vacío `{}` o consulta de texto `query` retorna `200 OK` con resultados paginados ordenados por relevancia o fecha de edición; el filtrado estricto por tipo de objeto (`filter: {"value": "database", "property": "object"}`) restringe exclusivamente los resultados a contenedores de bases de datos.
  - *Negative Scenarios:* Token no autorizado retorna `401 Unauthorized`; valores no admitidos en el filtro de entidad responden `400 validation_error`.
  - *Boundary Cases:* `page_size=1` y `page_size=100` son aceptados; `page_size=0` y `page_size=101` devuelven `400 validation_error`; consultas con cadenas de 2,000 caracteres o caracteres especiales no provocan errores `500` y retornan una lista vacía o coincidentes de forma segura.

- **Flujos End-to-End (`E2E`):**
  - *Ciclo integral de contenedor de datos, actualización y búsqueda global:* Creación de contenedor de base de datos (`POST /v1/databases`) → verificación de metadatos (`GET /v1/databases/{id}`) → actualización de título e icono (`PATCH /v1/databases/{id}`) → descubrimiento e indexación mediante búsqueda global (`POST /v1/search`) → archivado y verificación de aislamiento en búsqueda.

#### Kevin Uruchi — Módulo Pages

La especificación completa en inglés de las Historias de Usuario (*User Stories*), Criterios de Aceptación detallados y tablas de Casos de Prueba para los 5 endpoints asignados se encuentra documentada en el archivo [`pruebas/KevinUruchiTests.md`](./pruebas/KevinUruchiTests.md). A continuación, se sintetizan los criterios de aceptación establecidos bajo el contrato `Notion-Version: 2025-09-03`.

- **Módulo `Pages` (`POST /v1/pages`, `GET /v1/pages/{page_id}`, `GET /v1/pages/{page_id}/properties/{property_id}`, `POST /v1/pages/{page_id}/move`, `PATCH /v1/pages/{page_id}`)**
  - *Happy Path.* Autenticado con `Authorization: Bearer <token>` válido y `Notion-Version: 2025-09-03`, `POST /v1/pages` crea una página bajo una página padre o como fila de un *data source* (`parent.data_source_id`) y retorna `200 OK` con `object: "page"`, `id`, `parent` y `url`, respetando el orden de los bloques de `children`. `GET /v1/pages/{page_id}` retorna `200 OK` con las propiedades y los metadatos de la página, y admite `filter_properties`. `GET /v1/pages/{page_id}/properties/{property_id}` retorna `object: "property_item"` para propiedades simples y `object: "list"` con `results[]`, `has_more` y `next_cursor` para las paginadas. `POST /v1/pages/{page_id}/move` reubica la página bajo otra página o *data source* conservando `id`, `url` y contenido. `PATCH /v1/pages/{page_id}` actualiza propiedades, `icon`, `cover`, `in_trash` e `is_locked` de forma parcial y atómica.
  - *Negative Scenarios.* Tokens ausentes, inválidos, revocados o con esquema distinto de `Bearer` responden `401 Unauthorized` (`code: "unauthorized"`). La omisión del header `Notion-Version` retorna `400 Bad Request` (`code: "missing_version"`). Tokens sin la capacidad requerida (lectura, inserción o actualización de contenido) reciben `403 Forbidden` (`code: "restricted_resource"`). Un `UUID`, un cuerpo, una propiedad de solo lectura o un tipo de propiedad inválidos producen `400 Bad Request` (`code: "validation_error"` o `"invalid_json"`). Una página inexistente o no compartida con la integración devuelve la misma respuesta `404 Not Found` (`code: "object_not_found"`). El endpoint de `move` rechaza `database_id`, ciclos jerárquicos y destinos en la papelera con `400`. Una petición rechazada no crea, modifica ni mueve nada, y el exceso de peticiones retorna `429 Too Many Requests` (`code: "rate_limited"`) con `Retry-After`.
  - *Boundary Cases.* En `POST /v1/pages`, 100 bloques en `children` responden `200 OK` y 101 se rechazan con `400 validation_error`; la misma frontera aplica a 2,000 y 2,001 caracteres de texto enriquecido, y a 100 y 101 elementos en `multi_select`, `people` y `relation`. En el endpoint de propiedades, `page_size=1` (mínimo) y `page_size=100` (máximo) responden `200 OK`, mientras que `page_size=0` y `page_size=101` se rechazan con `400 validation_error`. En todos los endpoints, tanto el `UUIDv4` con guiones como la cadena hexadecimal de 32 caracteres sin guiones son aceptados, mientras que longitudes de 31 y 33 caracteres y las cadenas vacías fallan con `400 validation_error`.

- **Flujos End-to-End (`E2E`)**
  - *Ciclo de vida completo de una página.* Creación en `POST /v1/pages` → lectura y verificación de valores en `GET /v1/pages/{page_id}` → actualización en `PATCH` y confirmación del nuevo valor mediante `GET /v1/pages/{page_id}/properties/{property_id}` → reubicación entre páginas y *data sources* en `POST /move` con `id`, `url` y contenido intactos → envío a la papelera con `in_trash: true` y ausencia en las consultas del *data source* → restauración con `in_trash: false` sin pérdida de datos. Se complementa con flujos de relaciones duales con paginación por `next_cursor`, propiedades calculadas (`rollup` y `formula`), control de permisos entre integraciones, recuperación ante errores sin efectos secundarios y operaciones masivas de 50 páginas.

### Escenarios de prueba

*Escenarios correspondientes a **Gabriel Marcos Guaman Ortuño** — Módulos `Users` y `OAuth` (detalle completo de precondiciones, pasos, resultados esperados y prioridades en [`pruebas/GabrielGuamanTests.md`](./pruebas/GabrielGuamanTests.md)):*

*Escenarios correspondientes a **Valentina Molina Bustillos** — Módulo `Data sources` (detalle completo de precondiciones, pasos, resultados esperados y prioridades en [`pruebas/ValentinaMolinaTests.md`](./pruebas/ValentinaMolinaTests.md)).*

*Escenarios correspondientes a **Sebastián Pereyra** — Módulos `Databases` y `Search` (detalle completo de precondiciones, pasos, resultados esperados y prioridades en [`pruebas/SebastianPereyraTests.md`](./pruebas/SebastianPereyraTests.md)).*

*Escenarios correspondientes a **Kevin Uruchi** — Módulo `Pages` (detalle completo de precondiciones, pasos, resultados esperados y prioridades en [`pruebas/KevinUruchiTests.md`](./pruebas/KevinUruchiTests.md)).*

### Uso de IA generativa

#### Gabriel Marcos Guaman Ortuño — Módulos Users & OAuth

**Prompt utilizado**

```text
Act as a Senior QA Automation Engineer (SQE). Generate a comprehensive base list of API User Stories, Acceptance Criteria, and API Test Scenarios (covering Happy Path, Negative, Boundary, and End-to-End flows) in English for the Notion Public REST API (header Notion-Version: 2025-09-03), specifically targeting the official Postman collection modules "Users" and "OAuth":
1. Users Module:
   - GET /v1/users/me (Retrieve your token's bot user)
   - GET /v1/users/{user_id} (Retrieve a user)
   - GET /v1/users (List all users)
2. OAuth Module:
   - POST /v1/oauth/token (Token exchange and refresh rotation)
   - POST /v1/oauth/revoke (Revoke an active access token)
   - POST /v1/oauth/introspect (Inspect token active state and metadata)

For each endpoint, include preconditions, authentication requirements, boundary values (pagination limits, UUID formats, empty/oversized strings), expected HTTP status codes, and exact JSON response attributes.
```

**Procedimiento de filtrado y validación**

La salida base generada por la IA fue auditada, depurada y contrastada manualmente contra la documentación oficial de *Notion Developers* y las respuestas empíricas observadas en la colección **Notion API (`2025-09-03`)** en Postman, aplicando cuatro criterios técnicos de validación:

1. **Filtrado de métodos no soportados en `Users`:** Se descartaron escenarios genéricos `POST`, `PUT` y `DELETE` sugeridos sobre `/v1/users`, dado que en la API pública de Notion el directorio de usuarios es estrictamente de solo lectura (`GET`), concentrando las pruebas de mutación de estado transaccional en los endpoints `POST` del módulo `OAuth` (`/v1/oauth/token`, `/v1/oauth/introspect` y `/v1/oauth/revoke`).
2. **Validación de esquemas de autenticación dual:** Se corrigieron y segmentaron las precondiciones de seguridad para distinguir con exactitud entre los endpoints del módulo `Users` —que exigen autenticación `Authorization: Bearer <token>` y capacidades explícitas de lectura de usuario (*Read user information*)— y los endpoints del módulo `OAuth`, que exigen autenticación de cliente mediante `Authorization: Basic` codificado en Base64 con `client_id:client_secret`.
3. **Ajuste de valores límite (`Boundary`) reales:** Se verificó en la especificación oficial de Notion (`2025-09-03`) que `GET /v1/users` admite el parámetro `page_size` únicamente entre `1` (mínimo) y `100` (máximo), ajustando los casos fuera de rango (`page_size=0` y `page_size=101`) para esperar `400 Bad Request` (`code: "validation_error"`), además de validar la aceptación dual de identificadores `UUIDv4` con guiones (36 caracteres) y sin guiones (32 caracteres).
4. **Estandarización de códigos de error propios de Notion:** Se validó que todos los resultados esperados contemplen la estructura real de error de Notion (`object: "error"`, `code: "unauthorized" | "validation_error" | "object_not_found" | "missing_version" | "restricted_resource" | "rate_limited"`), así como las respuestas específicas del estándar OAuth 2.0 (`error: "invalid_client" | "invalid_grant" | "unsupported_grant_type"` y `active: true/false`).

#### Valentina Molina Bustillos — Módulo Data Sources

**Prompt utilizado**

```text
Act as a Senior QA Automation Engineer (SQE). Generate a comprehensive base list of API User Stories, Acceptance Criteria, and API Test Scenarios (covering Happy Path, Negative, Boundary, and End-to-End flows) in English for the Notion Public REST API (header Notion-Version: 2025-09-03), specifically targeting the official Postman collection module "Data sources":
- POST /v1/data_sources (Create a data source in a database)
- GET /v1/data_sources/{data_source_id} (Retrieve a data source schema and metadata)
- PATCH /v1/data_sources/{data_source_id} (Update data source properties schema)
- POST /v1/data_sources/{data_source_id}/query (Query a data source with compound filters, sorts, and cursor pagination)

For each endpoint, include preconditions, Bearer token authentication requirements, boundary values (pagination page_size 0, 1, 100, 101, UUID canonical/compact formats, character limits), expected HTTP status codes, and exact Notion JSON response attributes.
```

**Procedimiento de filtrado y validación**

1. **Desacoplamiento arquitectónico de consultas:** Se descartaron las propuestas iniciales de la IA que intentaban consultar bases de datos en `/v1/databases/{id}/query`, verificando que en `2025-09-03` las consultas pertenecen exclusivamente a `POST /v1/data_sources/{data_source_id}/query`.
2. **Validación de tipos y operadores de filtro:** Se depuraron los filtros para que los operadores booleanos (`equals`, `contains`, `greater_than`, `is_empty`, etc.) coincidan con el tipo de columna estipulado (`checkbox`, `rich_text`, `number`, `date`, `status`), esperando `400 validation_error` en combinaciones incompatibles.
3. **Control de límites en paginación tabular:** Se fijó el rango determinista de `page_size` entre `1` y `100`, asegurando que `0` y `101` disparen `400 validation_error` y que el cursor de paginación (`start_cursor`) mantenga coherencia sin registros duplicados ni omitidos.

#### Sebastián Pereyra — Módulos Databases & Search

**Prompt utilizado**

```text
Act as a Senior QA Automation Engineer (SQE). Generate a comprehensive base list of API User Stories, Acceptance Criteria, and API Test Scenarios (covering Happy Path, Negative, Boundary, and End-to-End flows) in English for the Notion Public REST API (header Notion-Version: 2025-09-03), specifically targeting the official Postman collection modules "Databases" and "Search":
1. Databases Module:
   - POST /v1/databases (Create a database container under a parent page)
   - GET /v1/databases/{database_id} (Retrieve database metadata and data sources references)
   - PATCH /v1/databases/{database_id} (Update database title, description, icon, cover, or in_trash)
2. Search Module:
   - POST /v1/search (Search workspace pages and databases by query string, entity filter, and sort direction)

For each endpoint, include preconditions, Bearer token authentication requirements, boundary values (pagination page_size 0, 1, 100, 101, UUID canonical/compact formats, character limits, empty queries), expected HTTP status codes, and exact Notion JSON response attributes.
```

**Procedimiento de filtrado y validación**

1. **Separación de responsabilidades de esquema:** Se ajustaron los escenarios de `PATCH /v1/databases/{id}` para clarificar que en `2025-09-03` las mutaciones de columnas y esquemas se delegan a las fuentes de datos, concentrando las pruebas del contenedor en metadatos visuales (`title`, `description`, `icon`, `cover`) y estado de ciclo de vida (`in_trash`).
2. **Aislamiento en búsqueda global:** Se validaron los filtros restrictivos en `POST /v1/search` (`filter.value: "database"` frente a `"page"`), verificando que la API no mezcle entidades y que los recursos no compartidos queden estrictamente ocultos.
3. **Manejo uniforme de identificadores UUID:** Se verificó que tanto el formato canónico con guiones (36 caracteres) como el compacto (32 caracteres) sean procesados transparentemente en todas las operaciones sobre bases de datos.

#### Kevin Uruchi — Módulo Pages

**Prompt utilizado**

```text
Act as a Senior QA Automation Engineer (SQE). Populate the file KevinUruchiTests.md entirely in English, designing the User Stories, Acceptance Criteria and API Test Cases for Activity #4, based on the Notion REST API (Notion-Version: 2025-09-03), following the structure and table columns of the reference files workspaces_crud_ac.md and workspaces_test_cases.md.

Target module and endpoints (Postman collection, Pages):
- POST /v1/pages
- GET /v1/pages/{page_id}
- GET /v1/pages/{page_id}/properties/{property_id}
- POST /v1/pages/{page_id}/move
- PATCH /v1/pages/{page_id}

Part 1: for each endpoint write a User Story and Acceptance Criteria grouped into Happy Path, Negative Scenarios and Boundary Cases, plus a final E2E section with complete lifecycle scenarios.
Part 2: for each endpoint and for the E2E section write a test case table with the columns Test Case ID, Description, Preconditions, Steps, Expected Result, Test Type and Priority. Cover Happy Path, Negative, Boundary and E2E, and state the HTTP status code and the key JSON attributes of every expected result.
```

**Procedimiento de filtrado y validación**

La salida base generada por la IA fue auditada, depurada y contrastada manualmente contra la documentación oficial de *Notion Developers*, aplicando cuatro criterios técnicos de validación.

1. **Adaptación de escenarios ajenos al módulo `Pages`.** El prompt incluía ejemplos propios de `Users` y `OAuth` (`user_id`, `grant_type`, `code`, `Basic Auth`). Se reemplazaron por sus equivalentes en `Pages`, como `page_size` en el endpoint de propiedades, `UUIDv4` con y sin guiones, cadenas vacías en el cuerpo y esquemas de autenticación distintos de `Bearer`.
2. **Validación del contrato del modelo de *data sources*.** Se verificó en la documentación oficial que con `Notion-Version: 2025-09-03` las páginas de una base de datos usan `data_source_id` como padre, y que `POST /v1/pages/{page_id}/move` solo admite `page_id` o `data_source_id`. Por ello se añadió un caso negativo que espera `400 validation_error` al enviar `database_id`.
3. **Contraste de valores límite (`Boundary`).** Se revisaron los límites publicados por Notion (100 bloques por petición, 2,000 caracteres por texto enriquecido, 100 elementos por lista, 25 referencias truncadas en `GET /v1/pages/{page_id}` y `page_size` entre `1` y `100`) y se definieron pares de casos en cada frontera, por ejemplo 100 y 101 bloques o `page_size=0` y `page_size=101`.
4. **Estandarización de resultados esperados.** Se normalizaron los tipos de prueba a `Happy Path`, `Negative`, `Boundary` y `E2E`, y todos los resultados esperados contemplan la estructura real de error de Notion (`object: "error"`, `code: "unauthorized"`, `"validation_error"`, `"object_not_found"`, `"missing_version"`, `"restricted_resource"` o `"rate_limited"`). Los comportamientos ambiguos de la documentación quedaron marcados como "comportamiento documentado" para fijarlos tras la primera ejecución.

---

## Actividad #5

1. Las pruebas escritas deben clasificarse por tipo de prueba.
2. Las pruebas escritas deben ser priorizadas por el equipo.
3. Cada miembro debe revisar el trabajo de su equipo y proveer su opinión o retroalimentación.
4. Se establecen las convenciones del equipo para escribir pruebas de API.

### Clasificación por tipo de prueba

El equipo acordó organizar todas las pruebas de API en cuatro categorías, de modo que cualquier integrante pueda identificar de inmediato la intención de cada caso sin necesidad de leer el detalle completo:

| Categoría | Descripción | Ejemplo representativo |
|-----------|-------------|------------------------|
| **Positiva** | Flujo ideal en el que se envían datos válidos y la API responde con éxito. Verifica que la funcionalidad principal opera conforme a la especificación. | Crear una página con título y padre válido → `200 OK` |
| **Negativa** | Envío deliberado de datos incorrectos, incompletos o no autorizados para confirmar que la API rechaza la solicitud con el código y mensaje de error documentados. | Omitir el header `Authorization` → `401 Unauthorized` |
| **Límite** | Exploración de valores en las fronteras permitidas por el contrato (mínimos, máximos, cadenas vacías, formatos alternativos de UUID) para detectar comportamientos inesperados en los extremos. | Enviar `page_size=0` o `page_size=101` → `400 validation_error` |
| **Flujo completo (E2E)** | Secuencia de varios endpoints encadenados que reproduce un escenario de negocio real de principio a fin, validando la coherencia del estado entre cada paso. | Crear una página → actualizar propiedades → mover a otra base de datos → enviar a la papelera → restaurar |

### Priorización

Se definieron tres niveles de prioridad para ordenar la ejecución de las pruebas y concentrar el esfuerzo en lo que más impacta la estabilidad de la aplicación:

| Nivel | Criterio | Ejemplo |
|-------|----------|---------|
| **Alta** | Si esta prueba falla, la funcionalidad principal queda inutilizable y bloquea al usuario. | Crear una página, autenticación con token válido, recuperar un recurso existente |
| **Media** | Validaciones de errores comunes y controles de seguridad que, de fallar, comprometen la confiabilidad pero no impiden el uso básico. | Token inválido rechazado con `401`, header de versión ausente rechazado con `400` |
| **Baja** | Casos poco frecuentes, funciones secundarias o condiciones de borde que rara vez se presentan en operación normal. | Enviar un payload de 500 KB, UUID nulo `00000000-...`, doble revocación idempotente de un token |

### Retroalimentación entre integrantes

Se estableció un proceso de revisión cruzada: cada integrante debe intercambiar sus pruebas con al menos un compañero de equipo para que este las lea y evalúe. Si el revisor no comprende el objetivo de una prueba con solo leer su título y descripción, el autor debe reescribirla hasta que resulte clara por sí misma. Este mecanismo garantiza que las pruebas sean comprensibles para todo el equipo y no únicamente para quien las redactó.

### Convenciones del equipo

Durante la reunión del equipo se acordaron las siguientes convenciones para mantener uniformidad y claridad en toda la suite de pruebas de API:

#### 1. Formato estándar para nombrar pruebas

Todos los títulos de casos de prueba deben seguir la estructura:

> **[Módulo] - [Tipo] - Acción (Código esperado)**

| | Ejemplo |
|---|---------|
| **Correcto** | `Pages - Positiva - Crear una página con padre válido (200 OK)` |
| **Correcto** | `Users - Negativa - Consultar usuario con token revocado (401 Unauthorized)` |
| **Incorrecto** | `Prueba de creación de usuario que falla` |
| **Incorrecto** | `Test crear página` |

El objetivo es que cualquier persona pueda entender qué se prueba, en qué módulo y cuál es el resultado esperado sin abrir el detalle del caso.

#### 2. Plantilla base para describir cada prueba

Al redactar el detalle de un caso de prueba se deben incluir como mínimo tres datos clave:

| Campo | Contenido |
|-------|-----------|
| **Endpoint** | Método HTTP y ruta (por ejemplo, `POST /v1/pages`) |
| **Datos enviados** | Descripción concisa del cuerpo, headers especiales o parámetros de consulta que se envían |
| **Resultado esperado** | Código de estado HTTP, estructura del JSON de respuesta y valores clave que se deben verificar |

#### 3. Reglas para el uso de IA generativa

Cada integrante que utilice herramientas de IA generativa para obtener una lista base de escenarios debe cumplir dos requisitos:

- **Registro del prompt:** documentar en el laboratorio el prompt exacto que se proporcionó a la herramienta, junto con el nombre del modelo utilizado.
- **Filtrado y justificación:** revisar manualmente cada escenario generado, descartar los que no sean aplicables al contrato real de la API (`2025-09-03`) y anotar brevemente por qué se eliminaron los casos descartados. El estudiante es responsable de validar que solo se conserven pruebas verificables contra el comportamiento documentado del SUT.