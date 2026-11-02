# Activity #4 – Notion REST API (`Notion-Version: 2025-09-03`)
**Author:** Valentina Molina Bustillos  
**System Under Test (SUT):** Notion Public REST API v1 (`https://api.notion.com/v1/`)  
**Contract Version:** `Notion-Version: 2025-09-03`  
**Assigned Postman Collection Module:** `Data sources`

## Module: Data Sources

**Endpoints covered (Notion Postman collection, Data sources folder)**
1. API `POST /v1/data_sources` (Create a data source)
2. API `GET /v1/data_sources/{data_source_id}` (Retrieve a data source)
3. API `PATCH /v1/data_sources/{data_source_id}` (Update a data source)
4. API `POST /v1/data_sources/{data_source_id}/query` (Query a data source)

> **Notes**
> - All requests use `Authorization: Bearer {{token}}`, `Notion-Version: 2025-09-03` and, when there is a body, `Content-Type: application/json`.
> - In `2025-09-03` a database is a container of one or more **data sources**. The schema (typed properties) and row queries belong to data sources, not to the database itself.
> - Variables used in the test cases: `{{token}}`, `{{database_id}}`, `{{data_source_id}}`, `{{ghost_id}}` (well-formed UUID that does not exist), `{{unshared_ds_id}}` (exists but is not shared with the integration), `{{unshared_db_id}}` (database not shared with the integration).

---

# PART 1: User Stories & Acceptance Criteria

---

### User Story: API POST /v1/data_sources (Create a data source)

As a developer/integration user of the Notion API, I want to create a new data source within an existing database, with its own typed property schema, so that I can add additional tabular views or data sets to a database container.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `POST /v1/data_sources` with a valid `database_id` and a `properties` schema, I receive `200 OK` with `object: "data_source"`, a new `id`, and the schema I defined.
- **As a user**, the response contains `created_time`, `last_edited_time`, `parent` referencing the database, and all properties with their `id` and `type`.
- **As a user**, when I include `select` or `multi_select` properties with predefined options in the schema, they are stored correctly.

#### **Negative Scenarios**
- **As a user**, when I omit the `Authorization` header or send an invalid token, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when the body is malformed JSON, I receive `400 Bad Request` with `code: "invalid_json"`.
- **As a user**, when `database_id` is missing, invalid or does not exist, I receive `400` or `404` with the corresponding error code.
- **As a user**, when the database is not shared with my integration, I receive `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when my integration lacks insert content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.

#### **Boundary Cases**
- **As a user**, when I create a data source with only a `title` property (minimal schema), I receive `200 OK`.
- **As a user**, when `database_id` is a UUIDv4 with or without hyphens, both formats are accepted.
- **As a user**, when property names contain Unicode or special characters, they are stored unchanged.

---

### User Story: API GET /v1/data_sources/{data_source_id} (Retrieve a data source)

As a developer/integration user of the Notion API, I want to retrieve a data source by its ID so that I can inspect its property schema, parent database, and metadata before querying or modifying it.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `GET /v1/data_sources/{{data_source_id}}` for a data source shared with my integration, I receive `200 OK` with `object: "data_source"`, `id`, `parent`, `properties` (the full schema with each property's `id`, `type`, and configuration), `created_time`, and `last_edited_time`.
- **As a user**, when the data source has `select`, `multi_select` or `status` properties, the response includes the available options with their names and colors.
- **As a user**, when the data source belongs to a database with multiple data sources, I retrieve only the requested data source and not the others.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing, invalid or expired, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when `data_source_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the data source does not exist, I receive `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when the data source exists but is not shared with my integration, I receive `404 Not Found` with `code: "object_not_found"` (same response, to prevent enumeration).
- **As a user**, when my integration lacks read content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.

#### **Boundary Cases**
- **As a user**, when `data_source_id` is a UUIDv4 with hyphens or the 32-character hex form, both return `200 OK` with the same data source.
- **As a user**, when the path has an empty `data_source_id` (`/v1/data_sources/`), I receive `404` or `400`, never `500`.
- **As a user**, when a data source has many properties (for example 50 typed columns), all of them are returned in the schema.

---

### User Story: API PATCH /v1/data_sources/{data_source_id} (Update a data source)

As a developer/integration user of the Notion API, I want to update the property schema of a data source so that I can add new columns, rename existing properties, change property configurations or remove columns from the tabular structure.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `PATCH /v1/data_sources/{{data_source_id}}` adding a new property to the schema, I receive `200 OK` and the new property appears in `properties` alongside the existing ones.
- **As a user**, when I rename a property by sending its `id` with a new `name`, I receive `200 OK` and the property name is updated while its data is preserved.
- **As a user**, when I update a `select` or `multi_select` property to add new options, the new options are appended to the existing list.
- **As a user**, when I remove a property by setting it to `null` in the schema, I receive `200 OK` and the property no longer appears (or is archived, as documented).
- **As a user**, when I update the data source, `last_edited_time` is updated while `id`, `created_time` and `parent` remain unchanged.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing or invalid, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when `data_source_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the data source does not exist or is not shared, I receive `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when my integration lacks update content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when I send malformed JSON, I receive `400 Bad Request` with `code: "invalid_json"`.
- **As a user**, when I try to change a property to an incompatible type, I receive `400 Bad Request` with `code: "validation_error"`.

#### **Boundary Cases**
- **As a user**, when I send an empty body `{}`, the API returns the documented response (either `200 OK` with no changes or `400`).
- **As a user**, when `data_source_id` is a UUIDv4 with or without hyphens, both update the same data source.
- **As a user**, when I rename a property using Unicode or special characters, the name is stored unchanged.
- **As a user**, when I send the same update twice, the result is identical (idempotent).

---

### User Story: API POST /v1/data_sources/{data_source_id}/query (Query a data source)

As a developer/integration user of the Notion API, I want to query a data source using filters, sorting rules and cursor-based pagination, so that I can retrieve specific rows matching business criteria without downloading the entire dataset.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `POST /v1/data_sources/{{data_source_id}}/query` with an empty body or `{}`, I receive `200 OK` with `object: "list"`, `results[]` containing page objects, `has_more`, and `next_cursor`.
- **As a user**, when I include a simple `filter` on a property (for example `{"property": "Status", "status": {"equals": "Done"}}`), the `results[]` contain only pages where that condition is true.
- **As a user**, when I include a compound `filter` using `and` with two conditions, only pages satisfying both conditions are returned.
- **As a user**, when I include a compound `filter` using `or` with two conditions, pages satisfying at least one condition are returned.
- **As a user**, when I include `sorts` with a property name and direction (`ascending` or `descending`), the `results[]` are returned in the specified order.
- **As a user**, when I include multiple `sorts`, the results are ordered by the first sort and ties are broken by the second.
- **As a user**, when I set `page_size` and the data source has more rows than that limit, the response has `has_more: true` and a valid `next_cursor`.
- **As a user**, when I send `start_cursor` from a previous response, I receive the next page of results with no overlapping or missing rows.
- **As a user**, when I sort by `created_time` or `last_edited_time` (timestamp sorts), the results follow the specified chronological order.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing or invalid, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when `data_source_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the data source does not exist or is not shared, I receive `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when my integration lacks read content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when I filter by a property name that does not exist in the schema, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when I use a filter operator incompatible with the property type (for example `greater_than` on a `checkbox`), I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when `start_cursor` is invalid or belongs to another data source, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when I send malformed JSON, I receive `400 Bad Request` with `code: "invalid_json"`.

#### **Boundary Cases**
- **As a user**, when `page_size=1` (minimum), I receive at most 1 result and `has_more: true` if more rows exist.
- **As a user**, when `page_size=100` (maximum), I receive at most 100 results.
- **As a user**, when `page_size=0` or `page_size=101` (out of bounds), I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when I omit `page_size`, the default (100) is applied.
- **As a user**, when the data source is empty (no rows), I receive `200 OK` with `results: []`, `has_more: false` and `next_cursor: null`.
- **As a user**, when a filter matches exactly `page_size` rows, `has_more` is `false`; with `page_size + 1` matching rows, `has_more` is `true`.
- **As a user**, when I nest `and` inside `or` (or vice versa) to build deeply compound filters, the query executes correctly.
- **As a user**, when `data_source_id` is a UUIDv4 with or without hyphens, both query the same data source.
- **As a user**, when I send `filter: {}` or `sorts: []`, the API treats them as no filter and no sort respectively.

---

### End-to-End (E2E) Acceptance Criteria for Data Sources

- **As a user**, I can retrieve a data source, inspect its schema, populate rows via `POST /v1/pages`, and query those rows with exact matching filters.
- **As a user**, I can update a data source schema to add a new property, populate that property in new records, and query specifically for records containing that attribute.
- **As a user**, I can execute complex queries with nested compound filters (`and` inside `or`), verifying that only qualifying rows are returned without false positives.
- **As a user**, I can traverse all pages of a multi-page query using `start_cursor`, collecting all records without missing any item or encountering duplicates.
- **As a user**, I can archive and unarchive records, confirming that archived rows are excluded from standard query results.

---

# PART 2: API Test Cases

**Common request headers:** `Authorization: Bearer {{token}}`, `Notion-Version: 2025-09-03`, `Content-Type: application/json` (only when there is a body). A test case only mentions headers when it changes them.

**Common preconditions:** the integration `{{token}}` has read, update and insert content capabilities and is connected to a test root page with a test database. `{{database_id}}`, `{{data_source_id}}` and the other variables are created under that environment.

---

### Test Cases for POST /v1/data_sources

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_DS_CREATE_001 | Create a data source within a database | Valid token. `{{database_id}}` shared with the integration | 1. Send `POST /v1/data_sources` with `database_id: {{database_id}}` and a schema with `Name` (title) and `Count` (number) | `200 OK`. `object: "data_source"`, new `id`, `parent` referencing the database, schema with both properties | Happy Path | High |
| TC_DS_CREATE_002 | Response contains metadata fields | Valid token and database | 1. Create a data source (TC_DS_CREATE_001 body)<br>2. Inspect the response | `200 OK`. `created_time` and `last_edited_time` present, properties include `id` and `type` for each column | Happy Path | Medium |
| TC_DS_CREATE_003 | Data source with select and multi_select options | Valid token and database | 1. Send a schema with `Priority: {"select": {"options": [{"name":"High"},{"name":"Low"}]}}` and `Tags: {"multi_select": {"options": [{"name":"A"},{"name":"B"}]}}` | `200 OK`. Options stored with names | Happy Path | Medium |
| TC_DS_CREATE_004 | Missing Authorization header | Valid database | 1. Send without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DS_CREATE_005 | Missing Notion-Version header | Valid token and database | 1. Send without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_DS_CREATE_006 | Malformed JSON body | Valid token | 1. Send `{`, then an empty body | `400 Bad Request`. `code: "invalid_json"` | Negative | High |
| TC_DS_CREATE_007 | Invalid or missing database_id | Valid token | 1. Send without `database_id`<br>2. Send `database_id: "invalid"` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_DS_CREATE_008 | Database does not exist or is not shared | Valid token | 1. Send with `database_id: {{ghost_id}}`<br>2. Send with `{{unshared_db_id}}` | `404 Not Found`. `code: "object_not_found"` for both | Negative | High |
| TC_DS_CREATE_009 | Integration without insert capability | Read-only token | 1. Send a valid request | `403 Forbidden`. `code: "restricted_resource"` | Negative | High |
| TC_DS_CREATE_010 | Minimal schema with only title | Valid token and database | 1. Send `properties: {"Name": {"title": {}}}` | `200 OK`. Data source created with only `Name` | Boundary | Low |
| TC_DS_CREATE_011 | database_id with hyphens and 32-character hex | Valid token | 1. Send with hyphenated ID<br>2. Send with compact hex ID | `200 OK` for both | Boundary | Medium |
| TC_DS_CREATE_012 | Unicode property names | Valid token and database | 1. Send properties with names in Japanese, Spanish accents, and emoji | `200 OK`. Property names returned unchanged | Boundary | Low |

---

### Test Cases for GET /v1/data_sources/{data_source_id}

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_DS_GET_001 | Retrieve a data source | `{{data_source_id}}` exists and is shared | 1. Send `GET /v1/data_sources/{{data_source_id}}` | `200 OK`. `object: "data_source"`, `id`, `parent`, `properties` with full schema, `created_time`, `last_edited_time` | Happy Path | High |
| TC_DS_GET_002 | Schema includes select/multi_select options | Data source with `select` and `multi_select` columns with predefined options | 1. Retrieve the data source | `200 OK`. Options listed with name and color for each column | Happy Path | Medium |
| TC_DS_GET_003 | Retrieve one data source from a multi-source database | Database with two data sources | 1. Retrieve `{{data_source_id}}`<br>2. Compare with the second data source | `200 OK` both times. Different `id` values, each with its own schema | Happy Path | Medium |
| TC_DS_GET_004 | Missing Authorization header | `{{data_source_id}}` exists | 1. Send without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DS_GET_005 | Invalid, expired or wrong-scheme credentials | `{{data_source_id}}` exists | 1. Send with `Bearer abc`, a revoked token and `Basic {{token}}` | `401 Unauthorized`. `code: "unauthorized"` for every iteration | Negative | High |
| TC_DS_GET_006 | Missing Notion-Version header | `{{data_source_id}}` exists | 1. Send without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_DS_GET_007 | Invalid data source UUID | Valid token | 1. Send `GET /v1/data_sources/123`<br>2. Repeat with `not-a-uuid` and a 33-character hex | `400 Bad Request`. `code: "validation_error"` for every iteration | Negative | High |
| TC_DS_GET_008 | Data source does not exist | Valid token | 1. Send `GET /v1/data_sources/{{ghost_id}}` | `404 Not Found`. `code: "object_not_found"` | Negative | High |
| TC_DS_GET_009 | Data source exists but is not shared | `{{unshared_ds_id}}` | 1. Send `GET /v1/data_sources/{{unshared_ds_id}}`<br>2. Compare with TC_DS_GET_008 | `404 Not Found`. `code: "object_not_found"`. Same structure as TC_DS_GET_008 | Negative | High |
| TC_DS_GET_010 | Integration without read capability | Token without read content | 1. Send the request | `403 Forbidden`. `code: "restricted_resource"` | Negative | High |
| TC_DS_GET_011 | Rate limit exceeded | Valid token | 1. Send 40 `GET` requests in 1 second | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header | Negative | Medium |
| TC_DS_GET_012 | Data source ID with hyphens and 32-character hex | `{{data_source_id}}` exists | 1. Send with the hyphenated ID<br>2. Send with the 32-character ID | `200 OK` for both. Same `id` in response | Boundary | Medium |
| TC_DS_GET_013 | Empty data source ID in the path | Valid token | 1. Send `GET /v1/data_sources/` | `404 Not Found` or `400`. Never `500` | Boundary | Low |
| TC_DS_GET_014 | Data source with many properties | Data source with 50 typed columns | 1. Retrieve the data source | `200 OK`. `properties` has 50 entries | Boundary | Low |

---

### Test Cases for PATCH /v1/data_sources/{data_source_id}

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_DS_PATCH_001 | Add a new property to the schema | `{{data_source_id}}` with `Name` (title) only | 1. Send `PATCH /v1/data_sources/{{data_source_id}}` with `properties: {"Count": {"number": {"format": "number"}}}` | `200 OK`. `properties` now includes `Name` and `Count` | Happy Path | High |
| TC_DS_PATCH_002 | Rename a property | Data source with `Description` (rich_text) | 1. Send PATCH with the property `id` and a new `name: "Notes"` | `200 OK`. Property name changed to `Notes`, data preserved | Happy Path | High |
| TC_DS_PATCH_003 | Add options to a select property | Data source with `Priority` (select) having options `High` and `Low` | 1. Send PATCH adding option `Medium` | `200 OK`. `Priority.select.options` now has `High`, `Low`, and `Medium` | Happy Path | Medium |
| TC_DS_PATCH_004 | Remove a property by setting it to null | Data source with `Count` (number) | 1. Send `properties: {"Count": null}` | `200 OK`. `Count` no longer appears in the schema (or is archived) | Happy Path | Medium |
| TC_DS_PATCH_005 | Metadata updated and identity unchanged | Snapshot of data source | 1. Add a property<br>2. Compare with snapshot | `last_edited_time` is later. `id`, `created_time`, `parent` unchanged | Happy Path | Medium |
| TC_DS_PATCH_006 | Missing Authorization header | `{{data_source_id}}` exists | 1. Send PATCH without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DS_PATCH_007 | Invalid or expired token | `{{data_source_id}}` exists | 1. Send with `Bearer abc` and a revoked token | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DS_PATCH_008 | Missing Notion-Version header | `{{data_source_id}}` exists | 1. Send PATCH without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_DS_PATCH_009 | Invalid data source UUID | Valid token | 1. Send `PATCH /v1/data_sources/not-a-uuid` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_DS_PATCH_010 | Data source does not exist or is not shared | Valid token | 1. Send PATCH to `{{ghost_id}}`<br>2. Send to `{{unshared_ds_id}}` | `404 Not Found`. `code: "object_not_found"` for both | Negative | High |
| TC_DS_PATCH_011 | Integration without update capability | Read-only token | 1. Send a valid PATCH | `403 Forbidden`. `code: "restricted_resource"` | Negative | High |
| TC_DS_PATCH_012 | Malformed JSON body | Valid token | 1. Send `{`, then an empty string body | `400 Bad Request`. `code: "invalid_json"` | Negative | High |
| TC_DS_PATCH_013 | Change property to an incompatible type | Data source with `Count` (number) containing data | 1. Send `properties: {"Count": {"rich_text": {}}}` | `400 Bad Request`. `code: "validation_error"`. Property unchanged | Negative | Medium |
| TC_DS_PATCH_014 | Rate limit exceeded | Valid token | 1. Send 40 PATCH requests in 1 second | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header | Negative | Medium |
| TC_DS_PATCH_015 | Empty body object | Valid data source | 1. Send `{}` | Documented response: `400 Bad Request` or `200 OK` with no changes | Boundary | Low |
| TC_DS_PATCH_016 | Data source ID with hyphens and 32-character hex | `{{data_source_id}}` exists | 1. PATCH using the hyphenated ID<br>2. PATCH using the 32-character ID | `200 OK` for both. Same `id` in response | Boundary | Medium |
| TC_DS_PATCH_017 | Unicode and special characters in property names | Valid data source | 1. Add a property named `Descripción 📝` | `200 OK`. Property name returned unchanged | Boundary | Low |
| TC_DS_PATCH_018 | Same update twice is idempotent | Valid data source | 1. Send the same PATCH twice | `200 OK` both times. Same final schema | Boundary | Medium |

---

### Test Cases for POST /v1/data_sources/{data_source_id}/query

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_DS_QUERY_001 | Query with no filter or sort | `{{data_source_id}}` with 5 rows | 1. Send `POST /v1/data_sources/{{data_source_id}}/query` with `{}` | `200 OK`. `object: "list"`, `results[]` with 5 page objects, `has_more: false` | Happy Path | High |
| TC_DS_QUERY_002 | Simple filter on a text property | Data source with rows where `Name` varies | 1. Send filter `{"property":"Name","rich_text":{"contains":"Test"}}` | `200 OK`. `results[]` contains only pages where Name contains `Test` | Happy Path | High |
| TC_DS_QUERY_003 | Simple filter on a number property | Data source with rows where `Count` varies (5, 10, 15, 20, 25) | 1. Send filter `{"property":"Count","number":{"greater_than":10}}` | `200 OK`. `results[]` contains only pages where `Count > 10` (3 results) | Happy Path | High |
| TC_DS_QUERY_004 | Filter on a select property | Data source with `Status` values `Done`, `In Progress`, `Not Started` | 1. Send filter `{"property":"Status","status":{"equals":"Done"}}` | `200 OK`. `results[]` contains only pages with `Status = Done` | Happy Path | High |
| TC_DS_QUERY_005 | Filter on a checkbox property | Data source with `Done` (checkbox) | 1. Send filter `{"property":"Done","checkbox":{"equals":true}}` | `200 OK`. Only checked rows returned | Happy Path | Medium |
| TC_DS_QUERY_006 | Filter on a date property | Data source with `Due Date` values | 1. Send filter `{"property":"Due Date","date":{"on_or_after":"2026-01-01"}}` | `200 OK`. Only rows with `Due Date >= 2026-01-01` returned | Happy Path | Medium |
| TC_DS_QUERY_007 | Compound filter with AND | Data source with varied rows | 1. Send `filter: {"and":[{"property":"Status","status":{"equals":"Done"}},{"property":"Count","number":{"greater_than":5}}]}` | `200 OK`. Only rows satisfying both conditions returned | Happy Path | High |
| TC_DS_QUERY_008 | Compound filter with OR | Data source with varied rows | 1. Send `filter: {"or":[{"property":"Count","number":{"equals":0}},{"property":"Count","number":{"equals":100}}]}` | `200 OK`. Rows where Count is 0 or 100 returned | Happy Path | High |
| TC_DS_QUERY_009 | Sort ascending by property | Data source with `Count` values 30, 10, 20 | 1. Send `sorts: [{"property":"Count","direction":"ascending"}]` | `200 OK`. `results[]` ordered as 10, 20, 30 | Happy Path | High |
| TC_DS_QUERY_010 | Sort descending by last_edited_time | Data source with rows edited at different times | 1. Send `sorts: [{"timestamp":"last_edited_time","direction":"descending"}]` | `200 OK`. Most recently edited row first | Happy Path | Medium |
| TC_DS_QUERY_011 | Multiple sorts with tie-breaking | Data source with rows having same `Status` but different `Count` | 1. Send `sorts: [{"property":"Status","direction":"ascending"},{"property":"Count","direction":"descending"}]` | `200 OK`. Rows grouped by Status ascending, then by Count descending within each group | Happy Path | Medium |
| TC_DS_QUERY_012 | Pagination with start_cursor | Data source with 5 rows | 1. Send query with `page_size: 2`<br>2. Send with `start_cursor` from step 1<br>3. Send with `start_cursor` from step 2 | `200 OK` each time. Step 1: 2 results, `has_more: true`. Step 2: 2 results, `has_more: true`. Step 3: 1 result, `has_more: false`. 5 distinct pages total | Happy Path | High |
| TC_DS_QUERY_013 | Sort by created_time ascending | Data source with rows created in sequence | 1. Send `sorts: [{"timestamp":"created_time","direction":"ascending"}]` | `200 OK`. Earliest created row first | Happy Path | Medium |
| TC_DS_QUERY_014 | Missing Authorization header | Valid data source | 1. Send without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DS_QUERY_015 | Invalid or expired token | Valid data source | 1. Send with `Bearer abc` and a revoked token | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_DS_QUERY_016 | Missing Notion-Version header | Valid data source | 1. Send without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_DS_QUERY_017 | Invalid data source UUID | Valid token | 1. Send `POST /v1/data_sources/not-a-uuid/query` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_DS_QUERY_018 | Data source does not exist or is not shared | Valid token | 1. Send query to `{{ghost_id}}`<br>2. Send to `{{unshared_ds_id}}` | `404 Not Found`. `code: "object_not_found"` for both | Negative | High |
| TC_DS_QUERY_019 | Integration without read capability | Token without read content | 1. Send a valid query | `403 Forbidden`. `code: "restricted_resource"` | Negative | High |
| TC_DS_QUERY_020 | Filter on a property that does not exist | Valid data source | 1. Send filter `{"property":"Nonexistent","number":{"equals":1}}` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_DS_QUERY_021 | Incompatible filter operator for the property type | Data source with `Done` (checkbox) | 1. Send filter `{"property":"Done","checkbox":{"greater_than":1}}` | `400 Bad Request`. `code: "validation_error"` | Negative | Medium |
| TC_DS_QUERY_022 | Invalid start_cursor | Valid data source | 1. Send `start_cursor: "invalid_cursor"` | `400 Bad Request`. `code: "validation_error"` | Negative | Medium |
| TC_DS_QUERY_023 | Malformed JSON body | Valid token and data source | 1. Send `{` as body | `400 Bad Request`. `code: "invalid_json"` | Negative | High |
| TC_DS_QUERY_024 | Rate limit exceeded | Valid token | 1. Send 40 query requests in 1 second | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header | Negative | Medium |
| TC_DS_QUERY_025 | page_size=1 (minimum) | Data source with 3 rows | 1. Send `page_size: 1` | `200 OK`. `results[]` has 1 item, `has_more: true` | Boundary | High |
| TC_DS_QUERY_026 | page_size=100 (maximum) | Data source with 120 rows | 1. Send `page_size: 100` | `200 OK`. `results[]` has 100 items, `has_more: true` | Boundary | High |
| TC_DS_QUERY_027 | page_size=0 (out of bounds) | Valid data source | 1. Send `page_size: 0` | `400 Bad Request`. `code: "validation_error"` | Boundary | High |
| TC_DS_QUERY_028 | page_size=101 (out of bounds) | Valid data source | 1. Send `page_size: 101` | `400 Bad Request`. `code: "validation_error"` | Boundary | High |
| TC_DS_QUERY_029 | Default page_size when omitted | Data source with 120 rows | 1. Omit `page_size` | `200 OK`. At most 100 results, `has_more: true` | Boundary | Medium |
| TC_DS_QUERY_030 | Empty data source | Data source with no rows | 1. Send query with `{}` | `200 OK`. `results: []`, `has_more: false`, `next_cursor: null` | Boundary | Medium |
| TC_DS_QUERY_031 | has_more boundary | Data source with exactly 5 rows | 1. Send `page_size: 5`<br>2. Send `page_size: 4` | Step 1: `has_more: false`. Step 2: `has_more: true`, next page has 1 item | Boundary | Medium |
| TC_DS_QUERY_032 | Nested compound filter (AND inside OR) | Data source with varied rows | 1. Send `filter: {"or":[{"and":[cond1,cond2]},{"and":[cond3,cond4]}]}` | `200 OK`. Results match the compound logic | Boundary | Medium |
| TC_DS_QUERY_033 | Empty filter and empty sorts | Valid data source | 1. Send `filter: {}` and `sorts: []` | `200 OK`. All rows returned in default order | Boundary | Low |
| TC_DS_QUERY_034 | Data source ID with hyphens and 32-character hex | Valid data source | 1. Query with the hyphenated ID<br>2. Query with the 32-character ID | `200 OK` for both. Same results | Boundary | Medium |
| TC_DS_QUERY_035 | Non-numeric and negative page_size | Valid data source | 1. Send `page_size: "abc"`, `page_size: -1`, `page_size: 1.5` | `400 Bad Request`. `code: "validation_error"` for each | Boundary | Medium |
| TC_DS_QUERY_036 | Filter with is_empty and is_not_empty | Data source with rows where some properties are null | 1. Send `{"property":"Due Date","date":{"is_empty":true}}`<br>2. Send `{"property":"Due Date","date":{"is_not_empty":true}}` | `200 OK` for both. Results correctly separated between empty and non-empty values | Happy Path | Medium |

---

### End-to-End (E2E) Test Cases

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_E2E_DS_001 | Full tabular lifecycle: create data source, insert rows, query results | Test database shared with integration | 1. `POST /v1/data_sources` with schema: `Name` (title), `Count` (number), `Status` (select with `Done`, `Pending`)<br>2. `POST /v1/pages` with `parent.data_source_id` to create 3 rows<br>3. `POST /v1/data_sources/{id}/query` with `{}` | `200 OK` on every call. Query returns exactly 3 pages matching the schema | E2E | High |
| TC_E2E_DS_002 | Filtered query matches only qualifying rows | Data source with 5 rows: Count = 5, 10, 15, 20, 25 | 1. Query with `filter: {"property":"Count","number":{"greater_than_or_equal_to":15}}`<br>2. Query with `filter: {"and":[{"property":"Count","number":{"greater_than":5}},{"property":"Count","number":{"less_than":25}}]}` | Step 1: 3 results (15, 20, 25). Step 2: rows with Count 10, 15, 20 | E2E | High |
| TC_E2E_DS_003 | Update schema, create a row with the new property, query for it | Data source with `Name` and `Count` | 1. `PATCH /v1/data_sources/{id}` to add `Priority` (select with `High`, `Low`)<br>2. `GET /v1/data_sources/{id}` to verify the new schema<br>3. `POST /v1/pages` with `Priority: High`<br>4. Query with `filter: {"property":"Priority","select":{"equals":"High"}}` | `200 OK` on every call. Step 2 shows `Priority` in schema. Step 4 returns the new row | E2E | High |
| TC_E2E_DS_004 | Sorted query and reverse order | Data source with rows: Count = 30, 10, 20 | 1. Query with `sorts: [{"property":"Count","direction":"ascending"}]`<br>2. Query with `sorts: [{"property":"Count","direction":"descending"}]` | Step 1: order 10, 20, 30. Step 2: order 30, 20, 10 | E2E | High |
| TC_E2E_DS_005 | Pagination traversal collects all rows without duplicates | Data source with 15 rows | 1. Query with `page_size: 4` and follow `next_cursor` until `has_more: false`<br>2. Collect all `id` values | 4 requests total (4 + 4 + 4 + 3). 15 distinct IDs, no duplicates, no gaps | E2E | High |
| TC_E2E_DS_006 | Archived rows excluded from query | Data source with 5 rows, one titled `ArchiveMe` | 1. `PATCH /v1/pages/{id}` with `{"in_trash": true}` on `ArchiveMe`<br>2. Query data source<br>3. Restore with `{"in_trash": false}`<br>4. Query again | Step 2: 4 results, `ArchiveMe` absent. Step 4: 5 results, `ArchiveMe` present | E2E | High |
| TC_E2E_DS_007 | Compound filter with AND and OR combined | Data source with 10 rows: varied Status and Count | 1. Query `{"filter":{"or":[{"and":[{"property":"Status","status":{"equals":"Done"}},{"property":"Count","number":{"greater_than":10}}]},{"property":"Count","number":{"equals":0}}]}}`<br>2. Manually verify each result | `200 OK`. Every page in `results[]` satisfies compound logic | E2E | Medium |
| TC_E2E_DS_008 | Query consistency after property update | Data source with row `Count: 10`, `Status: Pending` | 1. Query with `filter: {"property":"Status","status":{"equals":"Done"}}` (0 results)<br>2. `PATCH /v1/pages/{id}` with `Status: Done`<br>3. Repeat query | Step 1: 0 results. Step 3: 1 result (the updated row) | E2E | Medium |
