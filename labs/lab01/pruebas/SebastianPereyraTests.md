# Activity #4 – Notion REST API (`Notion-Version: 2025-09-03`)
**Author:** Sebastián Pereyra  
**System Under Test (SUT):** Notion Public REST API v1 (`https://api.notion.com/v1/`)  
**Contract Version:** `Notion-Version: 2025-09-03`  
**Assigned Postman Collection Modules:** `Databases` and `Search`

## Modules: Databases & Search

**Endpoints covered (Notion Postman collection, Databases & Search folders)**
1. API `POST /v1/databases` (Create a database)
2. API `GET /v1/databases/{database_id}` (Retrieve a database)
3. API `PATCH /v1/databases/{database_id}` (Update a database)
4. API `POST /v1/search` (Search by title / entity filter)

> **Notes**
> - All requests use `Authorization: Bearer {{token}}`, `Notion-Version: 2025-09-03` and, when there is a body, `Content-Type: application/json`.
> - In `2025-09-03`, a database is a container that organizes structured content under a parent page. Metadata updates (title, description, icon, cover, in_trash) belong to `Databases`, while global discovery belongs to `Search`.
> - Variables used in the test cases: `{{token}}`, `{{parent_page_id}}`, `{{database_id}}`, `{{ghost_id}}` (well-formed UUID that does not exist), `{{unshared_db_id}}` (database not shared with the integration), `{{trashed_db_id}}`.

---

# PART 1: User Stories & Acceptance Criteria

---

### User Story: API POST /v1/databases (Create a database)

As a developer/integration user of the Notion API, I want to create a database container under a parent page with a title and an initial property schema, so that I can organize structured data within a Notion workspace programmatically.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `POST /v1/databases` with a valid `parent.page_id` and a `title`, I receive `200 OK` with `object: "database"`, a new `id`, and `parent.type: "page_id"` equal to the parent I sent.
- **As a user**, when I include a `properties` schema with typed columns (`title`, `rich_text`, `number`, `select`, `multi_select`, `status`, `date`, `checkbox`, `url`, `email`, `phone_number`, `people`, `files`), all columns are created and returned in the response with their corresponding type.
- **As a user**, the response contains `created_time`, `last_edited_time`, `created_by`, `last_edited_by`, `archived: false`, `in_trash: false`, `url`, and `is_inline`.
- **As a user**, when I set `is_inline: true`, the database is embedded inline within the parent page body.
- **As a user**, when I include `icon` (emoji or external) and `cover` (external URL), they are saved and returned.
- **As a user**, when I create a database, at least one default data source is automatically generated and associated with it.

#### **Negative Scenarios**
- **As a user**, when I omit the `Authorization` header, or send an invalid, malformed, revoked or expired Bearer token, or a non-Bearer scheme, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when the body is empty or malformed JSON, I receive `400 Bad Request` with `code: "invalid_json"`.
- **As a user**, when `parent` is missing or `parent.page_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the parent page does not exist or is not shared with my integration, I receive `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when my integration lacks the insert content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when I send a property with an invalid type name or malformed configuration, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the parent page is in the trash, I receive `400 Bad Request`.
- **As a user**, when I exceed the rate limit, I receive `429 Too Many Requests` with `code: "rate_limited"` and a `Retry-After` header.

#### **Boundary Cases**
- **As a user**, when I send an empty title or `title: []`, the database is created as untitled (`200 OK`).
- **As a user**, when the parent ID is a UUIDv4 with hyphens or the 32-character hex form, both are accepted (`200 OK`).
- **As a user**, when I send an empty string as `parent.page_id`, I receive `400 validation_error`.
- **As a user**, when I use Unicode, emoji and special characters in the title and property names, they are stored and returned unchanged.
- **As a user**, when I send a minimal `properties` object with only the required `title` property, the database is created successfully.

---

### User Story: API GET /v1/databases/{database_id} (Retrieve a database)

As a developer/integration user of the Notion API, I want to retrieve a database container by its ID, so that I can inspect its title, description, icon, cover, parent, associated data sources, and container metadata.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `GET /v1/databases/{{database_id}}` for a database shared with my integration, I receive `200 OK` with `object: "database"`, `id`, `title`, `description`, `icon`, `cover`, `parent`, `is_inline`, `archived`, `in_trash`, `url`, `created_time`, and `last_edited_time`.
- **As a user**, the response includes references to associated data sources created for this database container.
- **As a user**, when the database has description rich text or custom icon/cover, they are returned with full fidelity.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing or invalid, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when `database_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the database does not exist, I receive `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when the database exists but is not shared with my integration, I receive `404 Not Found` with `code: "object_not_found"` (to prevent enumeration).
- **As a user**, when my integration lacks read content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.

#### **Boundary Cases**
- **As a user**, when `database_id` is provided in UUIDv4 format with hyphens or 32-character hex format without hyphens, both return `200 OK`.
- **As a user**, when the database is in the trash (`in_trash: true`), `GET` still returns `200 OK` with `in_trash: true`.
- **As a user**, when an empty `database_id` is passed (`/v1/databases/`), the API responds with `404` or `400`, never `500`.

---

### User Story: API PATCH /v1/databases/{database_id} (Update a database)

As a developer/integration user of the Notion API, I want to update a database container's title, description, icon, cover, or trash status, so that I can maintain and rebrand database containers programmatically.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `PATCH /v1/databases/{{database_id}}` with an updated `title`, I receive `200 OK` and the database title reflects the new value.
- **As a user**, when I send an updated `description`, `icon`, or `cover`, the attributes are updated and returned in the `200 OK` response.
- **As a user**, when I send `{"in_trash": true}`, the database is moved to the trash (`in_trash: true`).
- **As a user**, when I send `{"in_trash": false}` on a trashed database, it is restored from the trash (`in_trash: false`).
- **As a user**, when the update succeeds, `last_edited_time` is updated while `id`, `created_time` and `parent` remain intact.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing or invalid, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when `database_id` is invalid or malformed, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the database does not exist or is not shared, I receive `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when my integration lacks update content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when I send malformed JSON, I receive `400 Bad Request` with `code: "invalid_json"`.

#### **Boundary Cases**
- **As a user**, when I send `title: []`, the title is cleared and the database becomes untitled (`200 OK`).
- **As a user**, when I update the title with 2,000 characters of rich text including Unicode and emoji, the update succeeds (`200 OK`).
- **As a user**, when I send an empty body `{}` to `PATCH`, the API returns `200 OK` without altering existing attributes.

---

### User Story: API POST /v1/search (Search)

As a developer/integration user of the Notion API, I want to search across all pages and databases shared with my integration by title, with optional type filtering and sorting, so that I can discover and navigate workspace resources programmatically.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `POST /v1/search` with a `query` string, I receive `200 OK` with `object: "list"` and `results[]` containing resources whose titles match the query.
- **As a user**, when I include `filter: {"value": "database", "property": "object"}`, only database container objects are returned.
- **As a user**, when I include `filter: {"value": "page", "property": "object"}`, only page objects are returned.
- **As a user**, when I include `sort: {"direction": "descending", "timestamp": "last_edited_time"}`, results are ordered from most recently edited to oldest.
- **As a user**, when I include `sort: {"direction": "ascending", "timestamp": "last_edited_time"}`, results are ordered from oldest to most recently edited.
- **As a user**, when I specify `page_size`, the response respects the limit and provides `has_more` and `next_cursor` when additional matches exist.
- **As a user**, when I send an empty body `{}` without a query, all shared workspace resources are returned (subject to pagination).

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing or invalid, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when I send malformed JSON, I receive `400 Bad Request` with `code: "invalid_json"`.
- **As a user**, when `start_cursor` is invalid, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when `filter.value` is invalid (e.g., `"user"` or `"block"`), I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when `sort.timestamp` is not `"last_edited_time"`, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when I exceed the rate limit, I receive `429 Too Many Requests` with `code: "rate_limited"` and `Retry-After`.

#### **Boundary Cases**
- **As a user**, when `page_size=1` (minimum), I receive at most 1 result with `has_more: true` if more exist.
- **As a user**, when `page_size=100` (maximum), I receive at most 100 results.
- **As a user**, when `page_size=0` or `page_size=101`, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when I search for a query matching no resources, I receive `200 OK` with `results: []` and `has_more: false`.
- **As a user**, when the search query contains Unicode, emoji or special characters, matching operates safely without `500` errors.
- **As a user**, resources not shared with the integration are strictly excluded from search results.

---

### End-to-End (E2E) Acceptance Criteria for Databases & Search

- **As a user**, I can create a database (`POST /v1/databases`), retrieve its metadata (`GET /v1/databases/{id}`), update its title and icon (`PATCH /v1/databases/{id}`), and discover it immediately using global search (`POST /v1/search`).
- **As a user**, I can filter global search strictly by `database` object type, confirming that no page objects are mixed into database search results.
- **As a user**, I can archive a database container with `PATCH` (`in_trash: true`), verify its trash status via `GET`, and restore it with `in_trash: false`, verifying its rediscovery in search.
- **As a user**, unshared databases never appear in search results or direct `GET` calls, ensuring workspace permission isolation.

---

# PART 2: API Test Cases

**Common request headers:** `Authorization: Bearer {{token}}`, `Notion-Version: 2025-09-03`, `Content-Type: application/json` (only when there is a body). A test case only mentions headers when it changes them.

**Common preconditions:** the integration `{{token}}` has read, update and insert content capabilities and is connected to a test root page. `{{parent_page_id}}`, `{{database_id}}` and `{{ghost_id}}` are initialized in the test workspace.

---

### Test Cases for POST /v1/databases

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_DB_001 | Create a database with title under a parent page | Valid token. `{{parent_page_id}}` shared with the integration | 1. Send `POST /v1/databases`<br>2. Body: `{"parent":{"page_id":"{{parent_page_id}}"},"title":[{"text":{"content":"Test DB"}}],"properties":{"Name":{"title":{}}}}` | `200 OK`. `object: "database"`, new `id`, `parent.type: "page_id"`, title text `Test DB` | Happy Path | High |
| TC_DB_002 | Create a database with a full typed schema | Valid token and parent page | 1. Send `POST /v1/databases` with properties: `title`, `rich_text`, `number`, `select` (with options), `multi_select`, `status`, `date`, `checkbox`, `url`, `email`, `phone_number`, `people`, `files` | `200 OK`. Every property returned with matching `type` and configuration | Happy Path | High |
| TC_DB_003 | Response contains all metadata fields | Valid token and parent page | 1. Create a database (TC_DB_001 body)<br>2. Inspect the response | `200 OK`. `id` is a UUID, `created_time` and `last_edited_time` are ISO 8601, `created_by.object: "user"`, `last_edited_by.object: "user"`, `archived: false`, `in_trash: false`, `url` present | Happy Path | Medium |
| TC_DB_004 | Create an inline database | Valid token and parent page | 1. Send TC_DB_001 body with `"is_inline": true` | `200 OK`. `is_inline: true` in the response | Happy Path | Medium |
| TC_DB_005 | Create a database with icon and cover | Valid token and parent page | 1. Send TC_DB_001 body with `icon: {"type":"emoji","emoji":"📊"}` and `cover: {"type":"external","external":{"url":"https://example.com/cover.png"}}` | `200 OK`. `icon.emoji: "📊"`, `cover.type: "external"` with the same URL | Happy Path | Low |
| TC_DB_006 | Select and multi_select options are stored | Valid token and parent page | 1. Create a database with `Priority: {"select":{"options":[{"name":"High","color":"red"},{"name":"Low","color":"green"}]}}` | `200 OK`. `Priority.select.options` contains both options with their names and colors | Happy Path | Medium |
| TC_DB_007 | Missing Authorization header | Valid parent page | 1. Send TC_DB_001 without the `Authorization` header | `401 Unauthorized`. `object: "error"`, `code: "unauthorized"`. No database created | Negative | High |
| TC_DB_008 | Invalid, malformed or revoked token | Valid parent page | 1. Send TC_DB_001 with: `Bearer abc123`, a token with one character removed, a revoked token | `401 Unauthorized`. `code: "unauthorized"` for every iteration | Negative | High |
| TC_DB_009 | Non-Bearer authentication scheme | Valid parent page | 1. Send TC_DB_001 with `Authorization: Basic {{token}}` | `401 Unauthorized`. `code: "unauthorized"` | Negative | Medium |
| TC_DB_010 | Missing Notion-Version header | Valid token and parent page | 1. Send TC_DB_001 without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_DB_011 | Malformed JSON body | Valid token | 1. Send `POST /v1/databases` with body `{`, an empty body, and a body with a trailing comma | `400 Bad Request`. `code: "invalid_json"`. No database created | Negative | High |
| TC_DB_012 | Missing parent | Valid token | 1. Send a body without `parent`<br>2. Send with `parent: {}` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_DB_013 | Invalid UUID in parent | Valid token | 1. Send `parent.page_id` with `123`, `not-a-uuid`, a 31-character hex and a 33-character hex | `400 Bad Request`. `code: "validation_error"` for every iteration | Negative | High |
| TC_DB_014 | Parent page does not exist | Valid token | 1. Send TC_DB_001 with `parent.page_id: {{ghost_id}}` | `404 Not Found`. `code: "object_not_found"` | Negative | High |
| TC_DB_015 | Parent exists but is not shared | `{{unshared_page_id}}` exists and is not shared | 1. Send TC_DB_001 with that parent<br>2. Compare with TC_DB_014 | `404 Not Found`. `code: "object_not_found"`. Same structure as TC_DB_014 | Negative | High |
| TC_DB_016 | Integration without insert capability | Token with read content only | 1. Send TC_DB_001 | `403 Forbidden`. `code: "restricted_resource"`. No database created | Negative | High |
| TC_DB_017 | Invalid property type name | Valid token and parent page | 1. Send a property with `"type": "nonexistent_type"` | `400 Bad Request`. `code: "validation_error"` | Negative | Medium |
| TC_DB_018 | Parent page is in the trash | `{{trashed_page_id}}` is in the trash | 1. Send TC_DB_001 with that parent | `400 Bad Request`. No database created | Negative | Medium |
| TC_DB_019 | Rate limit exceeded | Valid token | 1. Send 40 `POST /v1/databases` requests in 1 second | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header present | Negative | Medium |
| TC_DB_020 | Empty title | Valid token and parent page | 1. Send `title: []` | `200 OK`. Database created as untitled | Boundary | Low |
| TC_DB_021 | Parent ID with hyphens and 32-character hex | Valid token | 1. Send TC_DB_001 with the parent ID in `8-4-4-4-12` form<br>2. Repeat with the 32-character form | `200 OK` for both. Both databases have the same `parent.page_id` | Boundary | Medium |
| TC_DB_022 | Empty string as parent ID | Valid token | 1. Send `parent.page_id: ""` | `400 Bad Request`. `code: "validation_error"` | Boundary | Medium |
| TC_DB_023 | Unicode and special characters in title and property names | Valid token and parent page | 1. Send title `"日本語テスト 📊"` and property names with accents, emoji, and `< > & " '` | `200 OK`. Title and property names returned unchanged | Boundary | Medium |
| TC_DB_024 | Minimal schema with only title property | Valid token and parent page | 1. Send `properties: {"Name": {"title": {}}}` with no other columns | `200 OK`. Schema contains only `Name` with `type: "title"` | Boundary | Low |

---

### Test Cases for GET /v1/databases/{database_id}

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_DB_GET_001 | Retrieve an existing database | `{{database_id}}` exists and is shared | 1. Send `GET /v1/databases/{{database_id}}` | `200 OK`. `object: "database"`, `id`, `parent`, `title`, `description`, `icon`, `cover`, `is_inline`, `created_time`, `last_edited_time` | Happy Path | High |
| TC_DB_GET_002 | Response includes associated data sources | Database container with default data source | 1. Send `GET /v1/databases/{{database_id}}`<br>2. Inspect `data_sources` list | `200 OK`. Contains data source references with their IDs | Happy Path | High |
| TC_DB_GET_003 | Retrieve database with icon and cover | Database created with custom emoji icon and external cover | 1. Send `GET /v1/databases/{{database_id}}` | `200 OK`. `icon` and `cover` match the configured values | Happy Path | Medium |
| TC_DB_GET_004 | Missing Authorization header | `{{database_id}}` exists | 1. Send without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DB_GET_005 | Invalid or expired token | `{{database_id}}` exists | 1. Send with `Bearer abc` and a revoked token | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DB_GET_006 | Missing Notion-Version header | `{{database_id}}` exists | 1. Send without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_DB_GET_007 | Invalid database UUID format | Valid token | 1. Send `GET /v1/databases/invalid-uuid`<br>2. Repeat with 31-char and 33-char hex | `400 Bad Request`. `code: "validation_error"` for each | Negative | High |
| TC_DB_GET_008 | Database does not exist | Valid token | 1. Send `GET /v1/databases/{{ghost_id}}` | `404 Not Found`. `code: "object_not_found"` | Negative | High |
| TC_DB_GET_009 | Database exists but is not shared | `{{unshared_db_id}}` exists | 1. Send `GET /v1/databases/{{unshared_db_id}}` | `404 Not Found`. `code: "object_not_found"` (prevents enumeration) | Negative | High |
| TC_DB_GET_010 | Integration without read capability | Read capability disabled | 1. Send `GET /v1/databases/{{database_id}}` | `403 Forbidden`. `code: "restricted_resource"` | Negative | High |
| TC_DB_GET_011 | Database in trash returns in_trash true | Database moved to trash | 1. Send `GET /v1/databases/{{trashed_db_id}}` | `200 OK`. `in_trash: true`, `archived: true` | Boundary | Medium |
| TC_DB_GET_012 | Database ID with hyphens vs compact hex | `{{database_id}}` exists | 1. Send with canonical hyphenated UUID<br>2. Send with 32-character compact hex | `200 OK` for both. Same database returned | Boundary | Medium |
| TC_DB_GET_013 | Trailing slash with empty ID | Valid token | 1. Send `GET /v1/databases/` | `404 Not Found` or `400 Bad Request`, never `500` | Boundary | Low |

---

### Test Cases for PATCH /v1/databases/{database_id}

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_DB_PATCH_001 | Update database title | `{{database_id}}` exists | 1. Send `PATCH /v1/databases/{{database_id}}` with `{"title":[{"text":{"content":"Updated DB Title"}}]}` | `200 OK`. `title` array contains updated text `Updated DB Title` | Happy Path | High |
| TC_DB_PATCH_002 | Update database description | `{{database_id}}` exists | 1. Send `PATCH` with `{"description":[{"text":{"content":"Database documentation and logs"}}]}` | `200 OK`. `description` updated accordingly | Happy Path | Medium |
| TC_DB_PATCH_003 | Update database icon and cover | `{{database_id}}` exists | 1. Send `PATCH` with `icon: {"type":"emoji","emoji":"📁"}` and new cover URL | `200 OK`. Updated icon and cover reflected in response | Happy Path | Medium |
| TC_DB_PATCH_004 | Move database to trash (archive) | `{{database_id}}` active | 1. Send `PATCH` with `{"in_trash": true}` | `200 OK`. `in_trash: true` | Happy Path | High |
| TC_DB_PATCH_005 | Restore database from trash | Database with `in_trash: true` | 1. Send `PATCH` with `{"in_trash": false}` | `200 OK`. `in_trash: false` | Happy Path | High |
| TC_DB_PATCH_006 | Metadata timestamps updated | Snapshot of database | 1. Send valid PATCH<br>2. Compare timestamps | `last_edited_time` is updated. `id`, `created_time`, `parent` preserved | Happy Path | Medium |
| TC_DB_PATCH_007 | Missing Authorization header | `{{database_id}}` exists | 1. Send PATCH without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DB_PATCH_008 | Invalid or expired token | `{{database_id}}` exists | 1. Send with invalid Bearer token | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DB_PATCH_009 | Missing Notion-Version header | `{{database_id}}` exists | 1. Send PATCH without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_DB_PATCH_010 | Invalid database UUID in path | Valid token | 1. Send `PATCH /v1/databases/invalid-id` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_DB_PATCH_011 | Database does not exist or is unshared | Valid token | 1. Send PATCH to `{{ghost_id}}`<br>2. Send to `{{unshared_db_id}}` | `404 Not Found`. `code: "object_not_found"` for both | Negative | High |
| TC_DB_PATCH_012 | Integration without update capability | Read-only token | 1. Send valid PATCH request | `403 Forbidden`. `code: "restricted_resource"` | Negative | High |
| TC_DB_PATCH_013 | Malformed JSON payload | Valid token | 1. Send `{` as body | `400 Bad Request`. `code: "invalid_json"` | Negative | High |
| TC_DB_PATCH_014 | Empty body object sent | `{{database_id}}` exists | 1. Send `PATCH` with `{}` | `200 OK` with no modifications, or documented `400` | Boundary | Low |
| TC_DB_PATCH_015 | Clear title to make untitled | `{{database_id}}` exists | 1. Send `{"title": []}` | `200 OK`. Database becomes untitled | Boundary | Low |
| TC_DB_PATCH_016 | Long title with Unicode and emoji | `{{database_id}}` exists | 1. Send 2,000-character title with Unicode symbols | `200 OK`. Title saved and returned completely | Boundary | Medium |
| TC_DB_PATCH_017 | Idempotent double update | `{{database_id}}` exists | 1. Send identical PATCH twice | `200 OK` both times with consistent state | Boundary | Medium |

---

### Test Cases for POST /v1/search

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_SEARCH_001 | Search by title | At least one database with title containing `Project` shared | 1. Send `POST /v1/search` with `{"query":"Project"}` | `200 OK`. `object: "list"`, `results[]` contains items whose title includes `Project` | Happy Path | High |
| TC_SEARCH_002 | Search with no query returns all accessible resources | Multiple resources shared | 1. Send `POST /v1/search` with `{}` | `200 OK`. `results[]` contains resources. `has_more` and `next_cursor` populated | Happy Path | High |
| TC_SEARCH_003 | Filter by type database strictly | Databases and pages shared | 1. Send `{"query":"Test","filter":{"value":"database","property":"object"}}` | `200 OK`. Every item in `results[]` has `object: "database"` | Happy Path | High |
| TC_SEARCH_004 | Filter by type page strictly | Databases and pages shared | 1. Send `{"query":"Test","filter":{"value":"page","property":"object"}}` | `200 OK`. Every item in `results[]` has `object: "page"` | Happy Path | High |
| TC_SEARCH_005 | Sort descending by last_edited_time | Multiple databases edited at different times | 1. Send `{"sort":{"direction":"descending","timestamp":"last_edited_time"}}` | `200 OK`. First result has the most recent `last_edited_time` | Happy Path | High |
| TC_SEARCH_006 | Sort ascending by last_edited_time | Multiple databases edited at different times | 1. Send `{"sort":{"direction":"ascending","timestamp":"last_edited_time"}}` | `200 OK`. First result has the oldest `last_edited_time` | Happy Path | Medium |
| TC_SEARCH_007 | Pagination with start_cursor | More than 2 accessible resources | 1. Send `page_size: 1`<br>2. Send with `start_cursor` from step 1 | `200 OK` both times. Different results, no overlap | Happy Path | High |
| TC_SEARCH_008 | Full pagination traversal | 10 resources shared | 1. Send `page_size: 3` and follow `next_cursor` until `has_more: false` | `200 OK` each time. 10 distinct items total, no duplicates | Happy Path | Medium |
| TC_SEARCH_009 | Missing Authorization header | None | 1. Send without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_SEARCH_010 | Invalid or expired token | None | 1. Send with `Bearer abc` and a revoked token | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_SEARCH_011 | Missing Notion-Version header | Valid token | 1. Send without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_SEARCH_012 | Malformed JSON body | Valid token | 1. Send `{` as body | `400 Bad Request`. `code: "invalid_json"` | Negative | High |
| TC_SEARCH_013 | Invalid filter value | Valid token | 1. Send `filter: {"value":"block","property":"object"}`<br>2. Send `filter: {"value":"user","property":"object"}` | `400 Bad Request`. `code: "validation_error"` for both | Negative | Medium |
| TC_SEARCH_014 | Invalid sort timestamp | Valid token | 1. Send `sort: {"direction":"descending","timestamp":"created_time"}` | `400 Bad Request`. `code: "validation_error"` (only `last_edited_time` is supported) | Negative | Medium |
| TC_SEARCH_015 | Invalid start_cursor | Valid token | 1. Send `start_cursor: "invalid"` | `400 Bad Request`. `code: "validation_error"` | Negative | Medium |
| TC_SEARCH_016 | Rate limit exceeded | Valid token | 1. Send 40 search requests in 1 second | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header | Negative | Medium |
| TC_SEARCH_017 | page_size=1 (minimum) | At least 2 accessible resources | 1. Send `page_size: 1` | `200 OK`. `results[]` has 1 item, `has_more: true` | Boundary | High |
| TC_SEARCH_018 | page_size=100 (maximum) | Valid token | 1. Send `page_size: 100` | `200 OK`. At most 100 results | Boundary | Medium |
| TC_SEARCH_019 | page_size=0 (out of bounds) | Valid token | 1. Send `page_size: 0` | `400 Bad Request`. `code: "validation_error"` | Boundary | High |
| TC_SEARCH_020 | page_size=101 (out of bounds) | Valid token | 1. Send `page_size: 101` | `400 Bad Request`. `code: "validation_error"` | Boundary | High |
| TC_SEARCH_021 | Query with no matches | Valid token | 1. Send `{"query":"zzz_nonexistent_title_zzz_12345"}` | `200 OK`. `results: []`, `has_more: false` | Boundary | Medium |
| TC_SEARCH_022 | Query with Unicode and special characters | Database with title `Sprint Backlog 📊` shared | 1. Send `{"query":"Sprint"}`<br>2. Send `{"query":"📊"}` | `200 OK` for both. The database appears in `results[]` | Boundary | Medium |
| TC_SEARCH_023 | Unshared resources never appear | A database `{{unshared_db_id}}` exists with a known title | 1. Search for that exact title | `200 OK`. `results[]` does not contain any entity with `{{unshared_db_id}}` | Boundary | High |
| TC_SEARCH_024 | Trashed databases in search results | Database sent to trash | 1. Search for that database title | `200 OK`. Trashed database excluded from active results or flagged with `in_trash: true` | Boundary | Medium |

---

### End-to-End (E2E) Test Cases

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_E2E_DB_001 | Complete database lifecycle with global search discovery | Parent page shared | 1. `POST /v1/databases` with title `Roadmap 2026`<br>2. `GET /v1/databases/{id}` to verify metadata<br>3. `PATCH /v1/databases/{id}` with title `Roadmap 2026 Q1` and icon `🗺️`<br>4. `POST /v1/search` with `{"query":"Roadmap 2026 Q1"}` | `200 OK` on every step. Search discovers the newly created and renamed database container | E2E | High |
| TC_E2E_DB_002 | Search filter isolates database containers from pages | Workspace with both pages and databases | 1. Search with `filter: {"value":"database","property":"object"}`<br>2. Verify each result item | `200 OK`. All items in `results[]` have `object: "database"`. No pages returned | E2E | High |
| TC_E2E_DB_003 | Archiving and restoration reflected in search | Active database container | 1. `PATCH /v1/databases/{id}` with `{"in_trash": true}`<br>2. `POST /v1/search` for database title<br>3. `PATCH /v1/databases/{id}` with `{"in_trash": false}`<br>4. Search again | Step 1: `200 OK`, `in_trash: true`. Step 2: resource excluded or flagged. Step 4: database restored and visible | E2E | High |
| TC_E2E_DB_004 | Search pagination full traversal without duplicates | 12 shared database containers | 1. `POST /v1/search` with `page_size: 4`<br>2. Follow `next_cursor` until `has_more: false`<br>3. Collect all `id` values | 3 pagination requests. Exactly 12 distinct IDs collected without gaps or duplicates | E2E | High |
| TC_E2E_DB_005 | Permission isolation on database retrieval and search | Integration A (full access), Integration B (no access) | 1. Create database with Integration A<br>2. Attempt `GET` with Integration B<br>3. Search for database title with Integration B | Step 1: `200 OK`. Step 2: `404 Not Found` (`code: "object_not_found"`). Step 3: empty search results | E2E | High |
| TC_E2E_DB_006 | Error handling leaves database state unaltered | Valid database container | 1. Send PATCH with malformed JSON<br>2. Send PATCH with invalid version header<br>3. Send valid GET to inspect database | Steps 1-2: appropriate `400` errors. Step 3: database title, icon and metadata completely unchanged | E2E | Medium |
