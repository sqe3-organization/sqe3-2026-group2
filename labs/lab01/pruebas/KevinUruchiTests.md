# Activity #4 – Notion REST API (`Notion-Version: 2025-09-03`)

## Module: Pages

**Endpoints covered (Notion Postman collection, Pages folder)**
1. API `POST /v1/pages` (Create a page)
2. API `GET /v1/pages/{page_id}` (Retrieve a page)
3. API `GET /v1/pages/{page_id}/properties/{property_id}` (Retrieve a page property item)
4. API `POST /v1/pages/{page_id}/move` (Move a page)
5. API `PATCH /v1/pages/{page_id}` (Update page properties)

> **Notes**
> - All requests use `Authorization: Bearer {{token}}`, `Notion-Version: 2025-09-03` and, when there is a body, `Content-Type: application/json`.
> - With `2025-09-03` a database is a container of one or more **data sources**. Pages that live in a database use `data_source_id` as parent. The Move endpoint only accepts `page_id` or `data_source_id` parents (not `database_id`).
> - The Pages endpoints use Bearer integration tokens. Basic Auth and OAuth token exchange are not part of this module, so the authentication negative cases use invalid, expired, revoked or wrong-scheme credentials.
> - Variables used in the test cases: `{{token}}`, `{{parent_page_id}}`, `{{page_id}}`, `{{data_source_id}}`, `{{ghost_id}}` (well-formed UUID that does not exist), `{{unshared_page_id}}` (exists but is not shared with the integration).

---

# PART 1: User Stories & Acceptance Criteria

---

### User Story: API POST /v1/pages (Create a page)

As a developer/integration user of the Notion API, I want to create a page under a parent page or inside a data source, with properties, content blocks, icon and cover, so that I can add content to a Notion workspace programmatically.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `POST /v1/pages` with a valid `parent.page_id` and a `title` property, I receive `200 OK` with `object: "page"`, a new `id`, and `parent.type: "page_id"` equal to the parent I sent.
- **As a user**, when I send `POST /v1/pages` with `parent.type: "data_source_id"` and `properties` that match the data source schema, I receive `200 OK` and the page is created as a new row (`parent.type: "data_source_id"`).
- **As a user**, when the page is created, the response contains `created_time`, `last_edited_time`, `created_by`, `last_edited_by`, `archived: false`, `in_trash: false` and a `url`.
- **As a user**, when I include a `children` array of valid blocks (including nested blocks), the blocks are created in the same order and with the same structure.
- **As a user**, when I include `icon` (emoji or external URL) and `cover` (external URL), they are saved and returned in the response.
- **As a user**, when I set each writable property type (`title`, `rich_text`, `number`, `select`, `multi_select`, `status`, `date`, `checkbox`, `url`, `email`, `phone_number`, `people`, `relation`, `files`), the values are stored exactly as sent.
- **As a user**, when I send only a `title` (or an empty title), the page is created with no blocks, `icon: null` and `cover: null`.
- **As a user**, when I use a public integration and send `parent: {"workspace": true}`, a top-level workspace page is created.

#### **Negative Scenarios**
- **As a user**, when I omit the `Authorization` header, or send an invalid, malformed, revoked or expired Bearer token, or a non-Bearer scheme (for example Basic), I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit the `Notion-Version: 2025-09-03` header, I receive `400 Bad Request` with `code: "missing_version"`. With an unsupported version value I receive `400`.
- **As a user**, when the body is empty or malformed JSON I receive `400 Bad Request` with `code: "invalid_json"`, and when `Content-Type` is not `application/json` I receive `400` or `415`.
- **As a user**, when `parent` is missing, empty, or contains more than one parent type, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when `parent.page_id` or `parent.data_source_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the parent does not exist, or exists but is not shared with my integration, I receive the same `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when my integration lacks the insert content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when I send a property that is read-only (`formula`, `rollup`, `created_time`, `created_by`, `last_edited_time`, `last_edited_by`, `unique_id`), does not exist in the schema, or has the wrong type, I receive `400 Bad Request` with `code: "validation_error"` and a message that names the property.
- **As a user**, when the parent is a page and I send a property other than `title`, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when a block, `icon` or `cover` is invalid, I receive `400 Bad Request` and no page is created (no partial creation).
- **As a user**, when the parent page is in the trash, I receive `400 Bad Request`.
- **As a user**, when I exceed the rate limit (average of 3 requests per second), I receive `429 Too Many Requests` with `code: "rate_limited"` and a `Retry-After` header, and the rejected request creates nothing.

#### **Boundary Cases**
- **As a user**, when I send exactly 100 blocks in `children`, I receive `200 OK`; with 101 blocks I receive `400 validation_error`. With `children: []` I receive `200 OK` and no blocks.
- **As a user**, when a rich text `content` has exactly 2,000 characters, I receive `200 OK`; with 2,001 characters I receive `400 validation_error`. The same applies to a rich text array of 100 versus 101 elements.
- **As a user**, when nested blocks go two levels deep I receive `200 OK`; with three levels in one request I receive `400 validation_error`. A request with 1,000 blocks in total is accepted and 1,001 is rejected.
- **As a user**, when the request body is just under 500 KB I receive `200 OK`; when it is over 500 KB I receive `400` or `413`.
- **As a user**, when `multi_select`, `people` or `relation` hold exactly 100 items I receive `200 OK`; with 101 items I receive `400 validation_error`.
- **As a user**, when `url` has exactly 2,000 characters I receive `200 OK`; with 2,001 characters I receive `400 validation_error`.
- **As a user**, when the parent ID is a UUIDv4 with hyphens or the 32-character hex form without hyphens, both are accepted and create the page under the same parent.
- **As a user**, when I send empty strings (`parent.page_id: ""`, `title` content `""`), an empty parent ID returns `400 validation_error` and an empty title is accepted (untitled page).
- **As a user**, when I send Unicode, emoji and special characters (`< > & " '`), they are stored and returned unchanged and are never executed.

---

### User Story: API GET /v1/pages/{page_id} (Retrieve a page)

As a developer/integration user of the Notion API, I want to retrieve a page by its ID, so that I can read its properties and metadata.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `GET /v1/pages/{page_id}` for a page shared with my integration, I receive `200 OK` with `object: "page"`, `id`, `created_time`, `last_edited_time`, `created_by`, `last_edited_by`, `parent`, `archived`, `in_trash`, `icon`, `cover`, `properties` and `url`.
- **As a user**, when the page is a row of a data source, `properties` contains every property with its `id`, `type` and value.
- **As a user**, when the page is under another page, `properties` contains only `title`.
- **As a user**, when I use `filter_properties` with one or more property IDs, only those properties are returned.
- **As a user**, when the page is in the trash, I receive `200 OK` with `in_trash: true`.
- **As a user**, when the page has a relation with more than 25 references, the relation is returned truncated with `has_more: true`.
- **As a user**, the response never contains block content; I use `GET /v1/blocks/{block_id}/children` for that.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing, invalid, expired or uses a non-Bearer scheme, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when `page_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the page does not exist, I receive `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when the page exists but is not shared with my integration, I receive the same `404 Not Found` response, so the existence of private content is not revealed.
- **As a user**, when the ID belongs to a database or a block instead of a page, I receive `404 Not Found` (or `400`) with a clear message.
- **As a user**, when my integration lacks the read content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when I use a malformed `filter_properties` value, the API returns the documented error (`400 validation_error`) and never `500`.
- **As a user**, when I exceed the rate limit, I receive `429 Too Many Requests` with a `Retry-After` header.

#### **Boundary Cases**
- **As a user**, when `page_id` is a UUIDv4 with hyphens or the 32-character hex form without hyphens, both return `200 OK` with the same page.
- **As a user**, when the request path has an empty `page_id` (`/v1/pages/`), I receive `404` or `400`, never `500`.
- **As a user**, when I repeat `filter_properties` several times, the response contains the union of those properties.
- **As a user**, when the page has 100 properties, all of them are returned.
- **As a user**, when the page has a title of 2,000 characters with Unicode, the title is returned unchanged.
- **As a user**, when a relation has exactly 25 references `has_more` is `false`, and with 26 references `has_more` is `true`.

---

### User Story: API GET /v1/pages/{page_id}/properties/{property_id} (Retrieve a page property item)

As a developer/integration user of the Notion API, I want to retrieve a single property item of a page, so that I can read the full value of properties that are truncated in the page response.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I request a simple property (`number`, `checkbox`, `select`, `status`, `date`, `url`, `email`, `phone_number`, `created_time`, `last_edited_time`, `formula`, `unique_id`), I receive `200 OK` with `object: "property_item"`, `id`, `type` and the value.
- **As a user**, when I request a paginated property (`title`, `rich_text`, `relation`, `rollup`, `people`), I receive `200 OK` with `object: "list"`, `results[]`, `has_more`, `next_cursor`, `type: "property_item"` and a `property_item` descriptor.
- **As a user**, when a relation has more than 25 references, I can follow `next_cursor` and receive all of them without gaps or duplicates.
- **As a user**, when a `formula` returns a string, number, boolean or date, the item reports the matching result type.
- **As a user**, when I request `files`, `multi_select`, `created_by` and `last_edited_by`, each has the documented shape.
- **As a user**, when the property ID contains special characters, it works URL-encoded.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing, invalid, expired or uses a non-Bearer scheme, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when `page_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the page does not exist or is not shared with my integration, I receive the same `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when `property_id` does not exist on the page, or belongs to the schema of another data source, I receive `404 Not Found` (or `400`) with a clear message.
- **As a user**, when `property_id` is malformed or contains injection characters, I receive `400` or `404` and nothing is executed.
- **As a user**, when my integration lacks the read content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when `start_cursor` is invalid or belongs to another page or property, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when I exceed the rate limit, I receive `429 Too Many Requests` with a `Retry-After` header.

#### **Boundary Cases**
- **As a user**, when `page_size=1` (minimum), each response has at most 1 item and `has_more` is `true` until the last item.
- **As a user**, when `page_size=100` (maximum), the response has at most 100 items.
- **As a user**, when `page_size=0` or `page_size=101` (out of bounds), I receive `400 Bad Request` with `code: "validation_error"` (or the value is capped, as documented).
- **As a user**, when I omit `page_size`, the default of 100 is applied.
- **As a user**, when a property has exactly `page_size` items `has_more` is `false`, and with `page_size + 1` items it is `true`.
- **As a user**, when a paginated property is empty, I receive `results: []`, `has_more: false` and `next_cursor: null`.
- **As a user**, when `page_id` is a UUIDv4 with hyphens or the 32-character hex form without hyphens, both return the same property.

---

### User Story: API POST /v1/pages/{page_id}/move (Move a page)

As a developer/integration user of the Notion API, I want to move an existing page to a new parent page or data source, so that I can reorganize content without recreating it.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `POST /v1/pages/{page_id}/move` with `parent: {"type": "page_id", "page_id": "<id>"}`, I receive `200 OK` with the page and the new `parent.page_id`.
- **As a user**, when I send `parent: {"type": "data_source_id", "data_source_id": "<id>"}`, I receive `200 OK` and the page becomes a row of that data source.
- **As a user**, when I move a row out of a data source to a page parent, I receive `200 OK` and `properties` contains only `title`.
- **As a user**, when I move a page, its `id`, `url`, `created_time`, `created_by`, `icon`, `cover` and blocks do not change, and `last_edited_time` is updated.
- **As a user**, when the page has child pages, they move together with it and keep their hierarchy.
- **As a user**, when the move succeeds, the page appears under the new parent and no longer under the old one.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing, invalid, expired or uses a non-Bearer scheme, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when the body is empty or malformed, I receive `400 Bad Request` with `code: "invalid_json"`; when `parent` is missing or empty, I receive `400` with `code: "validation_error"`.
- **As a user**, when `parent.type` is `database_id`, `workspace` or `block_id` (unsupported), I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when `page_id` or the destination ID is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the destination or the source page does not exist or is not shared with my integration, I receive the same `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when I try to move a page into itself or into one of its descendants, I receive `400 Bad Request` and the hierarchy does not change.
- **As a user**, when the source or the destination is in the trash, I receive `400 Bad Request` and nothing is moved.
- **As a user**, when my integration lacks the update content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when I move a database or a block instead of a page, I receive `400` or `404` with a clear message.
- **As a user**, when I exceed the rate limit, I receive `429 Too Many Requests` with a `Retry-After` header, and the page stays where it was.

#### **Boundary Cases**
- **As a user**, when the destination ID is a UUIDv4 with hyphens or the 32-character hex form without hyphens, both move the page to the same parent.
- **As a user**, when the destination ID is an empty string, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when I move a page to the parent it already has, the request succeeds as a no-op (or returns the documented response) and no duplicate is created.
- **As a user**, when I repeat the same move request, the final state is the same as after the first call.
- **As a user**, when I move a page with five nested levels and about 50 descendants, every descendant is still retrievable afterwards.
- **As a user**, when two moves of the same page run in parallel, the page ends in exactly one parent.

---

### User Story: API PATCH /v1/pages/{page_id} (Update page properties)

As a developer/integration user of the Notion API, I want to update the properties, icon, cover, trash state and lock state of a page, so that I can keep page data current without recreating the page.

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send `PATCH /v1/pages/{page_id}` with one property, I receive `200 OK` with the full updated page and only that property changed.
- **As a user**, when I send several properties in one request, all of them are updated.
- **As a user**, when I update each writable property type, the new value is stored as sent.
- **As a user**, when I send `icon` or `cover`, they are updated, and when I send `null` they are removed.
- **As a user**, when I send `in_trash: true`, the page is moved to the trash and no longer appears in data source queries; when I send `in_trash: false`, it is restored with its previous content.
- **As a user**, when I send `is_locked: true` or `false`, the lock state changes.
- **As a user**, when the update succeeds, `last_edited_time` and `last_edited_by` are updated, and `id`, `created_time`, `parent` and `url` do not change.
- **As a user**, when I update `multi_select`, `people` or `relation`, the full list is replaced by the values I send, and dual relations update the reverse side.

#### **Negative Scenarios**
- **As a user**, when the `Authorization` header is missing, invalid, expired or uses a non-Bearer scheme, I receive `401 Unauthorized` with `code: "unauthorized"`.
- **As a user**, when I omit `Notion-Version: 2025-09-03`, I receive `400 Bad Request` with `code: "missing_version"`.
- **As a user**, when `page_id` is not a valid UUID, I receive `400 Bad Request` with `code: "validation_error"`.
- **As a user**, when the page does not exist or is not shared with my integration, I receive the same `404 Not Found` with `code: "object_not_found"`.
- **As a user**, when my integration lacks the update content capability, I receive `403 Forbidden` with `code: "restricted_resource"`.
- **As a user**, when the body is malformed, I receive `400 Bad Request` with `code: "invalid_json"`.
- **As a user**, when I update a read-only property, a property that does not exist, or a property with the wrong type, I receive `400 Bad Request` with `code: "validation_error"` naming the property.
- **As a user**, when I send `parent` or `children` in the body, I receive `400 Bad Request` (use the Move and Blocks endpoints instead).
- **As a user**, when I set a `status` to an option that does not exist, or a `relation` to a page that does not exist, I receive `400 Bad Request` and the value does not change.
- **As a user**, when one property in the request is invalid, no property is updated (atomic update).
- **As a user**, when I edit properties of a page that is in the trash, I receive `400 Bad Request` until I restore it.
- **As a user**, when I exceed the rate limit, I receive `429 Too Many Requests` with a `Retry-After` header and nothing changes.

#### **Boundary Cases**
- **As a user**, when rich text `content` has 2,000 characters I receive `200 OK`; with 2,001 characters I receive `400 validation_error`. The same applies to 100 versus 101 rich text elements.
- **As a user**, when `multi_select`, `people` or `relation` hold 100 items I receive `200 OK`; with 101 items I receive `400 validation_error`.
- **As a user**, when `url` has 2,000 characters I receive `200 OK`; with 2,001 I receive `400 validation_error`.
- **As a user**, when `page_id` is a UUIDv4 with hyphens or the 32-character hex form without hyphens, both update the same page.
- **As a user**, when I send an empty title (`""`), the page becomes untitled; when I send an empty body `{}`, the API returns the documented response (`400`, or `200` with no changes).
- **As a user**, when I send `null` or an empty array for a clearable property, the property is emptied.
- **As a user**, when I update with numbers `0`, negatives, decimals and the largest safe integer, they are stored without precision loss; an out-of-range number returns `400`.
- **As a user**, when I send the same update twice, the final state is identical (idempotent).
- **As a user**, when two updates to the same property run in parallel, the final value is one of the two sent values and the page is never corrupted.

---

### End-to-End (E2E) Acceptance Criteria for Pages

- **As a user**, I can create a data source (database) with every writable property type, create a row with `POST /v1/pages`, retrieve it with `GET /v1/pages/{page_id}`, and every value I read equals the value I sent.
- **As a user**, I can update three properties with `PATCH /v1/pages/{page_id}`, and `GET /v1/pages/{page_id}` and `GET /v1/pages/{page_id}/properties/{property_id}` both return the new values with a later `last_edited_time`.
- **As a user**, I can send `in_trash: true`, confirm with `GET` that the page is in the trash and no longer appears in data source queries, send `in_trash: false`, and confirm it is back with all of its previous data.
- **As a user**, I can create a parent page, create a child page with blocks under it, update the child, and confirm that the parent and the blocks are unchanged.
- **As a user**, I can move a page from one parent page to another, into a data source, to a second data source with a different schema, and back to a page, and after every move `id`, `url`, `created_by`, `icon`, `cover` and blocks are unchanged.
- **As a user**, I can move a page with three levels of descendants and every descendant remains retrievable; moving it into one of its own descendants returns `400` and leaves the hierarchy unchanged.
- **As a user**, I can create tasks linked to a project through a dual relation, read the relation with `GET .../properties/{property_id}` following `next_cursor` until `has_more: false`, update a task to point to another project, and see the reverse relation move.
- **As a user**, I can create pages with numbers, read a `rollup` and a `formula`, update a source number and read the new computed values, and direct updates to `rollup` or `formula` return `400`.
- **As a user**, I can send an invalid request (invalid token, invalid body, invalid destination) to create, update and move, receive the documented error, and verify that nothing was created, changed or moved.
- **As a user**, I can trigger `429 Too Many Requests` with a burst of requests, wait for `Retry-After`, resend, and end with each operation applied exactly once.
- **As a user**, I can use a read-only integration to read pages successfully while create, update and move return `403 Forbidden`, and an integration without access receives `404 Not Found` on every endpoint.
- **As a user**, I can import 50 pages, update all of them, move them to another data source and move them to the trash, and the counts in each data source are correct after every step.
- **As a user**, I can store XSS and injection payloads in titles and rich text and read them back as inert text through `GET` and `GET .../properties/{property_id}`.

---

# PART 2: API Test Cases

**Common request headers:** `Authorization: Bearer {{token}}`, `Notion-Version: 2025-09-03`, `Content-Type: application/json` (only when there is a body). A test case only mentions headers when it changes them.

**Common preconditions:** the integration `{{token}}` has read, update and insert content capabilities and is connected to a test root page. `{{parent_page_id}}`, `{{data_source_id}}`, `{{page_id}}` and the other variables are created under that root.

---

### Test Cases for POST /v1/pages

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_PAGES_001 | Create a page under a parent page | Valid token. `{{parent_page_id}}` shared with the integration | 1. Send `POST /v1/pages`<br>2. Body: `{"parent":{"page_id":"{{parent_page_id}}"},"properties":{"title":{"title":[{"text":{"content":"TC page"}}]}}}` | `200 OK`. `object: "page"`, new `id`, `parent.type: "page_id"` with `page_id` equal to `{{parent_page_id}}`, title text `TC page` | Happy Path | High |
| TC_PAGES_002 | Create a row in a data source | Data source `{{data_source_id}}` with `Name` (title) and `Count` (number) properties, shared with the integration | 1. Send `POST /v1/pages`<br>2. Body: `parent: {"type":"data_source_id","data_source_id":"{{data_source_id}}"}`, `Name` title, `Count: {"number": 42}` | `200 OK`. `parent.type: "data_source_id"`, `properties.Count.number: 42`. The row appears when the data source is queried | Happy Path | High |
| TC_PAGES_003 | Response contains all metadata fields | Valid token and parent page | 1. Create a page (TC_PAGES_001 body)<br>2. Inspect the response | `200 OK`. `id` is a UUID, `created_time` and `last_edited_time` are ISO 8601 UTC, `created_by.object: "user"`, `last_edited_by.object: "user"`, `archived: false`, `in_trash: false`, `url` is a `notion.so` URL | Happy Path | Medium |
| TC_PAGES_004 | Create a page with children blocks in order | Valid token and parent page | 1. Send **TC_PAGES_001** body plus `children`: heading_1, paragraph, bulleted_list_item, to_do, code<br>2. Send `GET /v1/blocks/{id}/children` | `200 OK` on create. The children call returns `results[]` with the 5 blocks in the same order and types | Happy Path | High |
| TC_PAGES_005 | Create a page with nested blocks | Valid token and parent page | 1. Send a body with a toggle block that has 2 children, one of them with a child<br>2. Retrieve the blocks recursively | `200 OK`. The block tree has the same structure and order that was sent | Happy Path | Medium |
| TC_PAGES_006 | Create a page with icon and cover | Valid token and parent page | 1. Send **TC_PAGES_001** body plus `icon: {"type":"emoji","emoji":"📝"}` and `cover: {"type":"external","external":{"url":"https://example.com/cover.png"}}` | `200 OK`. `icon.emoji: "📝"`, `cover.type: "external"` with the same URL | Happy Path | Medium |
| TC_PAGES_007 | Create a row with every writable property type | Data source with one property of each type (`rich_text`, `number`, `select`, `multi_select`, `status`, `date`, `checkbox`, `url`, `email`, `phone_number`, `people`, `relation`, `files`) | 1. Send `POST /v1/pages` with a valid value for every property (data-driven, one iteration per type)<br>2. `GET /v1/pages/{id}` | `200 OK` for every iteration. Each property keeps its `type` and the value sent | Happy Path | High |
| TC_PAGES_008 | Create a minimal page and an untitled page | Valid token and parent page | 1. Send only `parent` and a title<br>2. Repeat with title content `""` | `200 OK` both times. `icon: null`, `cover: null`, no blocks. The second page is untitled | Happy Path | Medium |
| TC_PAGES_009 | Create a top-level workspace page | Public (OAuth) integration token | 1. Send `POST /v1/pages` with `parent: {"workspace": true}` and a title | `200 OK`. `parent.type: "workspace"`, `parent.workspace: true` | Happy Path | Low |
| TC_PAGES_010 | New select and multi_select options are created automatically | Data source with `select` and `multi_select` properties | 1. Send `Select: {"select":{"name":"NewOpt"}}` and `Tags: {"multi_select":[{"name":"A1"},{"name":"B1"}]}`<br>2. Retrieve the data source | `200 OK`. Values are stored. The data source lists the new options | Happy Path | Low |
| TC_PAGES_011 | Date variants are stored correctly | Data source with a `date` property | 1. Create rows with: start only, start and end, start with `time_zone: "America/La_Paz"` | `200 OK` for each. `date.start`, `date.end` and `date.time_zone` match the request | Happy Path | Medium |
| TC_PAGES_012 | Missing Authorization header | Valid parent page | 1. Send **TC_PAGES_001** without the `Authorization` header | `401 Unauthorized`. `object: "error"`, `code: "unauthorized"`. No page created | Negative | High |
| TC_PAGES_013 | Invalid, malformed or expired token | Valid parent page | 1. Send **TC_PAGES_001** with: `Bearer abc123`, a token with one character removed, a revoked token, an empty `Bearer ` value | `401 Unauthorized`. `code: "unauthorized"` for every iteration | Negative | High |
| TC_PAGES_014 | Non-Bearer authentication scheme | Valid parent page | 1. Send **TC_PAGES_001** with `Authorization: Basic {{token}}`<br>2. Repeat with `Token {{token}}` | `401 Unauthorized`. `code: "unauthorized"` | Negative | Medium |
| TC_PAGES_015 | Missing Notion-Version header | Valid token and parent page | 1. Send **TC_PAGES_001** without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_PAGES_016 | Unsupported Notion-Version value | Valid token and parent page | 1. Send **TC_PAGES_001** with `Notion-Version: abc`, `2000-01-01` and `2099-01-01` | `400 Bad Request` with a descriptive `message` for every iteration | Negative | Medium |
| TC_PAGES_017 | Malformed JSON body | Valid token | 1. Send `POST /v1/pages` with body `{`, an empty body, and a body with a trailing comma | `400 Bad Request`. `code: "invalid_json"`. No page created | Negative | High |
| TC_PAGES_018 | Content-Type is not JSON | Valid token and parent page | 1. Send the valid body with `Content-Type: text/plain`<br>2. Repeat with `application/x-www-form-urlencoded` | `400 Bad Request` or `415 Unsupported Media Type` with a clear message. No page created | Negative | Medium |
| TC_PAGES_019 | Missing parent | Valid token | 1. Send a body without `parent`, then with `parent: {}` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_PAGES_020 | More than one parent type | Valid token | 1. Send `parent` with both `page_id` and `data_source_id` | `400 Bad Request`. `code: "validation_error"` | Negative | Medium |
| TC_PAGES_021 | Invalid UUID in parent | Valid token | 1. Send `parent.page_id` with `123`, `not-a-uuid`, a 31-character hex and a 33-character hex | `400 Bad Request`. `code: "validation_error"` for every iteration | Negative | High |
| TC_PAGES_022 | Parent page does not exist | Valid token | 1. Send **TC_PAGES_001** with `parent.page_id: {{ghost_id}}` | `404 Not Found`. `code: "object_not_found"` | Negative | High |
| TC_PAGES_023 | Parent exists but is not shared | `{{unshared_page_id}}` exists and is not shared with the integration | 1. Send **TC_PAGES_001** with `parent.page_id: {{unshared_page_id}}`<br>2. Compare with TC_PAGES_022 | `404 Not Found`. `code: "object_not_found"`. Same structure as TC_PAGES_022, so existence is not revealed | Negative | High |
| TC_PAGES_024 | Integration without insert capability | Token with read content only | 1. Send **TC_PAGES_001** | `403 Forbidden`. `code: "restricted_resource"`. No page created | Negative | High |
| TC_PAGES_025 | Read-only properties are rejected | Data source with formula, rollup, created_time, created_by, last_edited_time, last_edited_by, unique_id | 1. Send one request per read-only property with a value | `400 Bad Request`. `code: "validation_error"`. `message` names the property | Negative | High |
| TC_PAGES_026 | Property type does not match the schema | Data source with `Count` (number) and `Select` (select) | 1. Send a string for `Count`<br>2. Send a number for `Select`<br>3. Send an object for a checkbox | `400 Bad Request`. `code: "validation_error"`. `message` names the property | Negative | High |
| TC_PAGES_027 | Property does not exist in the schema | Data source `{{data_source_id}}` | 1. Send a property named `Nmber` (typo) | `400 Bad Request`. `code: "validation_error"`. `message` names `Nmber` | Negative | Medium |
| TC_PAGES_028 | Page parent with a property other than title | Parent is a page | 1. Send `parent.page_id` with `properties: {"Status":{"select":{"name":"x"}}}` | `400 Bad Request`. `code: "validation_error"`. No page created | Negative | Medium |
| TC_PAGES_029 | Invalid block type or payload | Valid token and parent page | 1. Send a block with `type: "foo"`<br>2. Send `type: "paragraph"` without a `paragraph` payload | `400 Bad Request`. `code: "validation_error"` for both | Negative | Medium |
| TC_PAGES_030 | Invalid icon or cover | Valid token and parent page | 1. Send `icon.emoji: "abc"`<br>2. Send `cover.external.url: "ftp://x"`<br>3. Send `cover.external.url: "not-a-url"` | `400 Bad Request`. `code: "validation_error"` for each | Negative | Medium |
| TC_PAGES_031 | Parent page is in the trash | `{{trashed_page_id}}` is in the trash | 1. Send **TC_PAGES_001** with that parent | `400 Bad Request`. `code: "validation_error"`. No page created | Negative | Medium |
| TC_PAGES_032 | No partial creation | Valid token and parent page | 1. Send a valid title `partial-{{ts}}` with 3 valid blocks and 1 invalid block<br>2. Search for `partial-{{ts}}` | `400 Bad Request`. Search `results[]` is empty. No page exists with that title | Negative | High |
| TC_PAGES_033 | Rate limit exceeded | Valid token | 1. Send 40 `POST /v1/pages` requests with unique titles in 1 second<br>2. Count pages by title | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header present. Number of pages equals the number of `200 OK` responses | Negative | Medium |
| TC_PAGES_034 | Exactly 100 blocks accepted, 101 rejected | Valid token and parent page | 1. Send `children` with 99, 100 and 101 paragraph blocks | `200 OK` for 99 and 100 (100 blocks retrievable). `400 Bad Request`, `code: "validation_error"` for 101 | Boundary | High |
| TC_PAGES_035 | Empty children array | Valid token and parent page | 1. Send `children: []` | `200 OK`. Page has no blocks | Boundary | Low |
| TC_PAGES_036 | Rich text 2,000 and 2,001 characters | Valid token and parent page | 1. Send a paragraph with `content` of 1,999, 2,000 and 2,001 characters | `200 OK` for 1,999 and 2,000 (returned in full). `400 Bad Request`, `code: "validation_error"` for 2,001 | Boundary | High |
| TC_PAGES_037 | Rich text array of 100 and 101 elements | Valid token and parent page | 1. Send a paragraph whose `rich_text` has 100 elements<br>2. Repeat with 101 | `200 OK` for 100. `400 Bad Request` for 101 | Boundary | Medium |
| TC_PAGES_038 | Nesting depth | Valid token and parent page | 1. Send blocks nested two levels<br>2. Send blocks nested three levels in one request | `200 OK` for two levels. `400 Bad Request` for three levels. Nothing is partially created | Boundary | Medium |
| TC_PAGES_039 | Total blocks per request | Valid token and parent page | 1. Send a tree with 1,000 blocks in total<br>2. Send a tree with 1,001 blocks | `200 OK` for 1,000. `400 Bad Request` for 1,001 | Boundary | Medium |
| TC_PAGES_040 | Payload size around 500 KB | Valid token and parent page | 1. Send a valid body of about 490 KB<br>2. Send a body of about 510 KB | `200 OK` for 490 KB. `400 Bad Request` or `413` for 510 KB, nothing created | Boundary | Low |
| TC_PAGES_041 | List properties with 100 and 101 items | Data source with `multi_select`, `people` and `relation` properties | 1. Send 100 items in each property<br>2. Send 101 items | `200 OK` for 100. `400 Bad Request`, `code: "validation_error"` for 101 | Boundary | Medium |
| TC_PAGES_042 | URL with 2,000 and 2,001 characters | Data source with a `url` property | 1. Send a URL of 2,000 characters<br>2. Send 2,001 | `200 OK` for 2,000. `400 Bad Request`, `code: "validation_error"` for 2,001 | Boundary | Low |
| TC_PAGES_043 | Parent ID with hyphens and 32-character hex | Valid token | 1. Send **TC_PAGES_001** with the parent ID in `8-4-4-4-12` form<br>2. Repeat with the 32-character form | `200 OK` for both. Both pages have the same `parent.page_id` | Boundary | Medium |
| TC_PAGES_044 | Empty string as parent ID | Valid token | 1. Send `parent.page_id: ""` | `400 Bad Request`. `code: "validation_error"` | Boundary | Medium |
| TC_PAGES_045 | Empty title | Valid token and parent page | 1. Send title content `""`<br>2. Send `title: []` | `200 OK`. Page created as untitled | Boundary | Low |
| TC_PAGES_046 | Unicode and special characters | Valid token and parent page | 1. Send title and paragraph with `Привет 你好 😀 مرحبا` and `< > & " '`, newline and tab | `200 OK`. Text is returned unchanged | Boundary | Medium |
| TC_PAGES_047 | Numeric edge values | Data source with a `number` property | 1. Send `0`, `-1`, `1.5`, `9007199254740991`, `-9007199254740991` and `1e400` | `200 OK` and exact values for the safe numbers. `400 Bad Request` for `1e400` | Boundary | Low |
| TC_PAGES_048 | XSS and injection payloads stored as text | Valid token and parent page | 1. Send titles and rich text with `<script>alert(1)</script>`, `javascript:alert(1)`, `' OR 1=1; --`, `{{7*7}}`<br>2. `GET` the page | `200 OK` (or `400` for invalid URLs). Payloads are returned as literal text, never evaluated (no `49`) | Negative | Medium |

---

### Test Cases for GET /v1/pages/{page_id}

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_PAGES_GET_001 | Retrieve a page | `{{page_id}}` exists and is shared | 1. Send `GET /v1/pages/{{page_id}}` | `200 OK`. `object: "page"`, `id`, `created_time`, `last_edited_time`, `created_by`, `last_edited_by`, `parent`, `archived`, `in_trash`, `icon`, `cover`, `properties`, `url` | Happy Path | High |
| TC_PAGES_GET_002 | Retrieve a row with all property types | Row in a data source with every property filled | 1. Send `GET /v1/pages/{{page_id}}`<br>2. Compare each property with the data used to create it | `200 OK`. Every property has `id`, `type` and the expected value | Happy Path | High |
| TC_PAGES_GET_003 | Page under a page returns only title | Page created under `{{parent_page_id}}` | 1. Send `GET /v1/pages/{{page_id}}` | `200 OK`. `parent.type: "page_id"`. `properties` contains only `title` | Happy Path | Medium |
| TC_PAGES_GET_004 | filter_properties with one ID | Row with several properties | 1. Send `GET /v1/pages/{{page_id}}?filter_properties={{prop_id}}` | `200 OK`. `properties` contains only the requested property | Happy Path | Medium |
| TC_PAGES_GET_005 | Repeated filter_properties returns the union | Row with several properties | 1. Send `?filter_properties=A&filter_properties=B&filter_properties=C` | `200 OK`. `properties` contains exactly A, B and C | Happy Path | Low |
| TC_PAGES_GET_006 | Retrieve a page that is in the trash | Page sent to the trash with PATCH | 1. Send `GET /v1/pages/{{page_id}}` | `200 OK`. `in_trash: true` | Happy Path | Medium |
| TC_PAGES_GET_007 | Relation with more than 25 references is truncated | Page with a relation of 30 pages | 1. Send `GET /v1/pages/{{page_id}}` | `200 OK`. The relation property shows 25 items and `has_more: true` | Happy Path | Medium |
| TC_PAGES_GET_008 | Response has no block content | Page with 10 blocks | 1. Send `GET /v1/pages/{{page_id}}` | `200 OK`. No `children` or block content in the body | Happy Path | Low |
| TC_PAGES_GET_009 | Missing Authorization header | `{{page_id}}` exists | 1. Send `GET /v1/pages/{{page_id}}` without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_PAGES_GET_010 | Invalid, expired or wrong-scheme credentials | `{{page_id}}` exists | 1. Send the request with `Bearer abc`, a revoked token and `Basic {{token}}` | `401 Unauthorized`. `code: "unauthorized"` for every iteration | Negative | High |
| TC_PAGES_GET_011 | Missing Notion-Version header | `{{page_id}}` exists | 1. Send the request without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_PAGES_GET_012 | Invalid page UUID | Valid token | 1. Send `GET /v1/pages/123`<br>2. Repeat with `not-a-uuid` and a 33-character hex | `400 Bad Request`. `code: "validation_error"` for every iteration | Negative | High |
| TC_PAGES_GET_013 | Page does not exist | Valid token | 1. Send `GET /v1/pages/{{ghost_id}}` | `404 Not Found`. `code: "object_not_found"` | Negative | High |
| TC_PAGES_GET_014 | Page exists but is not shared | `{{unshared_page_id}}` is not shared with the integration | 1. Send `GET /v1/pages/{{unshared_page_id}}`<br>2. Compare with TC_PAGES_GET_013 | `404 Not Found`. `code: "object_not_found"`. Same structure as TC_PAGES_GET_013 | Negative | High |
| TC_PAGES_GET_015 | ID of a database or block instead of a page | `{{database_id}}` and `{{block_id}}` exist | 1. Send `GET /v1/pages/{{database_id}}`<br>2. Send `GET /v1/pages/{{block_id}}` | `404 Not Found` (or `400`) with a clear `message`. No data returned | Negative | Medium |
| TC_PAGES_GET_016 | Integration without read capability | Token without read content capability | 1. Send `GET /v1/pages/{{page_id}}` | `403 Forbidden`. `code: "restricted_resource"` | Negative | High |
| TC_PAGES_GET_017 | Malformed filter_properties | `{{page_id}}` exists | 1. Send `?filter_properties=%%%`<br>2. Send `?filter_properties=zzzz` | `400 Bad Request`, `code: "validation_error"` (or unknown IDs ignored, as documented). Never `500` | Negative | Low |
| TC_PAGES_GET_018 | Rate limit exceeded | Valid token | 1. Send 40 `GET` requests in 1 second | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header present | Negative | Medium |
| TC_PAGES_GET_019 | Page ID with hyphens and 32-character hex | `{{page_id}}` exists | 1. Send the request with the hyphenated ID<br>2. Send it with the 32-character ID | `200 OK` for both. Same `id` | Boundary | Medium |
| TC_PAGES_GET_020 | Empty page ID in the path | Valid token | 1. Send `GET /v1/pages/` | `404 Not Found` (`code: "invalid_request_url"`) or `400`. Never `500` | Boundary | Low |
| TC_PAGES_GET_021 | Page with 100 properties | Data source with 100 properties and one row | 1. Send `GET /v1/pages/{{page_id}}` | `200 OK`. `properties` has 100 entries | Boundary | Low |
| TC_PAGES_GET_022 | Title of 2,000 characters with Unicode | Page whose title has 2,000 characters with emoji | 1. Send `GET /v1/pages/{{page_id}}` | `200 OK`. Title is returned unchanged | Boundary | Low |
| TC_PAGES_GET_023 | Relation with exactly 25 and 26 references | Two pages with relations of 25 and 26 items | 1. Retrieve both pages | 25 items: `has_more: false`. 26 items: 25 returned and `has_more: true` | Boundary | Medium |
| TC_PAGES_GET_024 | Read after write | Valid token | 1. Create a page, then `GET` it immediately<br>2. PATCH a property, then `GET` again | `200 OK` both times with the latest values (within the documented short delay) | Happy Path | Medium |
| TC_PAGES_GET_025 | Integration without access | A second integration with no access to the page | 1. Send `GET /v1/pages/{{page_id}}` with the second token | `404 Not Found`. `code: "object_not_found"`. No data leaked | Negative | High |

---

### Test Cases for GET /v1/pages/{page_id}/properties/{property_id}

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_PAGES_PROP_001 | Retrieve simple property types | Row with number, checkbox, select, status, date, url, email, phone_number, created_time, last_edited_time, formula, unique_id | 1. Send `GET /v1/pages/{{page_id}}/properties/{{prop_id}}` once per property (data-driven) | `200 OK`. `object: "property_item"`, `id`, `type` and the correct value for each | Happy Path | High |
| TC_PAGES_PROP_002 | Retrieve paginated property types | Row with title, rich_text, relation, rollup, people filled | 1. Send the request for each property | `200 OK`. `object: "list"`, `results[]`, `has_more`, `next_cursor`, `type: "property_item"`, `property_item` descriptor | Happy Path | High |
| TC_PAGES_PROP_003 | Full relation with more than 25 references | Page with a relation of 30 pages | 1. Request the relation with `page_size=10`<br>2. Follow `next_cursor` until `has_more: false` | `200 OK` each time. 30 distinct items in total, no duplicates, no gaps. Last response has `next_cursor: null` | Happy Path | High |
| TC_PAGES_PROP_004 | Formula result types | Formulas returning string, number, boolean and date | 1. Request each formula property | `200 OK`. `formula.type` is `string`, `number`, `boolean` or `date` and the value matches | Happy Path | Medium |
| TC_PAGES_PROP_005 | files, multi_select, created_by and last_edited_by | Row with those properties filled | 1. Request each property | `200 OK`. Each item has the documented shape and equals the value from `GET /v1/pages/{id}` | Happy Path | Medium |
| TC_PAGES_PROP_006 | Property ID with special characters, URL-encoded | A property whose ID contains characters such as `%3A` or `%40` | 1. Request it with the ID URL-encoded | `200 OK`. Correct property returned | Happy Path | Medium |
| TC_PAGES_PROP_007 | Rollup of a relation with many pages | Project with 60 related tasks and a rollup | 1. Request the rollup property | `200 OK`. `results[]` or `rollup` value matches the expected computed value | Happy Path | Medium |
| TC_PAGES_PROP_008 | Missing Authorization header | Valid page and property | 1. Send the request without `Authorization` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_PAGES_PROP_009 | Invalid, expired or wrong-scheme credentials | Valid page and property | 1. Send with `Bearer abc`, a revoked token and `Basic {{token}}` | `401 Unauthorized`. `code: "unauthorized"` | Negative | High |
| TC_PAGES_PROP_010 | Missing Notion-Version header | Valid page and property | 1. Send without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_PAGES_PROP_011 | Invalid page UUID | Valid token | 1. Send with `page_id` `123`, `not-a-uuid` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_PAGES_PROP_012 | Page does not exist or is not shared | `{{ghost_id}}` and `{{unshared_page_id}}` | 1. Send with `{{ghost_id}}`<br>2. Send with `{{unshared_page_id}}` | `404 Not Found`. `code: "object_not_found"` with identical structure in both cases | Negative | High |
| TC_PAGES_PROP_013 | Property does not exist on the page | Valid page | 1. Send with `property_id: zzzz` | `404 Not Found` (or `400`). `code: "object_not_found"` or `"validation_error"` | Negative | High |
| TC_PAGES_PROP_014 | Property from another data source | Property ID taken from a different data source | 1. Send with that property ID and a page of another schema | `404 Not Found` (or `400`). No value returned | Negative | Medium |
| TC_PAGES_PROP_015 | Malformed or injection property ID | Valid page | 1. Send with `%ZZ`, `../../etc/passwd`, `' OR 1=1 --`, `<script>alert(1)</script>` | `400 Bad Request` or `404 Not Found`. Nothing executed, no stack trace, never `500` | Negative | Medium |
| TC_PAGES_PROP_016 | Integration without read capability | Token without read content | 1. Send the request | `403 Forbidden`. `code: "restricted_resource"` | Negative | High |
| TC_PAGES_PROP_017 | Invalid start_cursor | Paginated property | 1. Send `start_cursor=invalid`<br>2. Send an empty `start_cursor=` | `400 Bad Request`. `code: "validation_error"` | Negative | Medium |
| TC_PAGES_PROP_018 | start_cursor from another property or page | Cursor obtained from a different property | 1. Send the cursor with another property or page | `400 Bad Request`. `code: "validation_error"` | Negative | Low |
| TC_PAGES_PROP_019 | Rate limit exceeded | Valid token | 1. Send 40 requests in 1 second | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header | Negative | Medium |
| TC_PAGES_PROP_020 | page_size=1 (minimum) | Relation with 5 items | 1. Send `page_size=1`<br>2. Follow `next_cursor` | `200 OK`. `results[]` has 1 item, `has_more: true`, `next_cursor` not null until the last item | Boundary | High |
| TC_PAGES_PROP_021 | page_size=100 (maximum) | Relation with 120 items | 1. Send `page_size=100` | `200 OK`. `results[]` has 100 items, `has_more: true` | Boundary | High |
| TC_PAGES_PROP_022 | page_size=0 (out of bounds) | Paginated property | 1. Send `page_size=0` | `400 Bad Request`. `code: "validation_error"` | Boundary | High |
| TC_PAGES_PROP_023 | page_size=101 (out of bounds) | Paginated property | 1. Send `page_size=101` | `400 Bad Request`. `code: "validation_error"` (or capped to 100, as documented) | Boundary | High |
| TC_PAGES_PROP_024 | Non-numeric and negative page_size | Paginated property | 1. Send `page_size=abc`, `page_size=-1`, `page_size=1.5` | `400 Bad Request`. `code: "validation_error"` for each | Boundary | Medium |
| TC_PAGES_PROP_025 | Default page_size | Relation with 120 items | 1. Omit `page_size` | `200 OK`. 100 items and `has_more: true` | Boundary | Medium |
| TC_PAGES_PROP_026 | has_more boundary | Relations with exactly 5 and 6 items | 1. Request each with `page_size=5` | 5 items: `has_more: false`, `next_cursor: null`. 6 items: `has_more: true`, next page has 1 item | Boundary | Medium |
| TC_PAGES_PROP_027 | Empty paginated property | Page with an empty relation | 1. Request the relation | `200 OK`. `results: []`, `has_more: false`, `next_cursor: null` | Boundary | Medium |
| TC_PAGES_PROP_028 | Page ID with hyphens and 32-character hex | Valid page and property | 1. Request with both forms | `200 OK` for both. Same item returned | Boundary | Medium |
| TC_PAGES_PROP_029 | Value agrees with Retrieve a page | Row with all property types | 1. Compare each simple property from this endpoint with `GET /v1/pages/{id}` | Values are identical | Happy Path | High |
| TC_PAGES_PROP_030 | Value reflects the latest update | Row with a number property | 1. PATCH `Count` to `99`<br>2. Request the property | `200 OK`. `number: 99` | Happy Path | Medium |

---

### Test Cases for POST /v1/pages/{page_id}/move

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_PAGES_MOVE_001 | Move a page under another page | Page `{{page_id}}` under `{{parent_a}}`. `{{parent_b}}` is a page shared with the integration | 1. Send `POST /v1/pages/{{page_id}}/move`<br>2. Body: `{"parent":{"type":"page_id","page_id":"{{parent_b}}"}}` | `200 OK`. `object: "page"`, `parent.type: "page_id"`, `parent.page_id` equals `{{parent_b}}` | Happy Path | High |
| TC_PAGES_MOVE_002 | Move a page into a data source | `{{data_source_id}}` shared with the integration | 1. Send move with `parent: {"type":"data_source_id","data_source_id":"{{data_source_id}}"}` | `200 OK`. `parent.type: "data_source_id"`. The page is a row of the data source | Happy Path | High |
| TC_PAGES_MOVE_003 | Move a row out of a data source | Row `{{page_id}}` with filled properties | 1. Send move with `parent.type: "page_id"` and `{{parent_a}}` | `200 OK`. `parent.type: "page_id"`. `properties` contains only `title` | Happy Path | Medium |
| TC_PAGES_MOVE_004 | Identity and content unchanged after move | Page with icon, cover and 10 blocks. Snapshot taken before | 1. Move the page<br>2. `GET /v1/pages/{{page_id}}` and its blocks | `id`, `url`, `created_time`, `created_by`, `icon`, `cover` and blocks are identical to the snapshot. `last_edited_time` is later | Happy Path | High |
| TC_PAGES_MOVE_005 | Child pages move with the page | Page with 2 child pages | 1. Move the top page<br>2. `GET` each child | `200 OK` for each child. Each child's `parent.page_id` is still the moved page | Happy Path | High |
| TC_PAGES_MOVE_006 | Old parent no longer lists the page | Page under `{{parent_a}}` | 1. Move it to `{{parent_b}}`<br>2. List the children of both parents | Page appears under `{{parent_b}}` only | Happy Path | Medium |
| TC_PAGES_MOVE_007 | Page into a data source keeps title only | Page titled `Mv` with other content | 1. Move into a data source with several properties<br>2. `GET /v1/pages/{{page_id}}` | `200 OK`. Title `Mv` kept. Other properties are empty or default | Happy Path | Medium |
| TC_PAGES_MOVE_008 | Move between data sources with different schemas | Row in `{{ds_a}}`. `{{ds_b}}` has a different schema | 1. Move the row to `{{ds_b}}`<br>2. `GET` the page | `200 OK`. Properties with the same name and type are kept. The rest follow the documented behavior. No error | Happy Path | Medium |
| TC_PAGES_MOVE_009 | Missing Authorization header | Valid page and destination | 1. Send move without `Authorization` | `401 Unauthorized`. `code: "unauthorized"`. Page not moved | Negative | High |
| TC_PAGES_MOVE_010 | Invalid, expired or wrong-scheme credentials | Valid page and destination | 1. Send with `Bearer abc`, a revoked token and `Basic {{token}}` | `401 Unauthorized`. `code: "unauthorized"` for each | Negative | High |
| TC_PAGES_MOVE_011 | Missing Notion-Version header | Valid page and destination | 1. Send move without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_PAGES_MOVE_012 | Empty or malformed body | Valid page | 1. Send an empty body<br>2. Send `{`<br>3. Send `null` | `400 Bad Request`. `code: "invalid_json"` (or `"validation_error"`). Page not moved | Negative | High |
| TC_PAGES_MOVE_013 | Missing or empty parent | Valid page | 1. Send `{}`<br>2. Send `{"parent":{}}`<br>3. Send `{"parent":null}` | `400 Bad Request`. `code: "validation_error"` for each | Negative | High |
| TC_PAGES_MOVE_014 | Unsupported parent type database_id | Valid page and a database ID | 1. Send `parent: {"type":"database_id","database_id":"{{database_id}}"}` | `400 Bad Request`. `code: "validation_error"`. The message says to use `data_source_id`. Page not moved | Negative | High |
| TC_PAGES_MOVE_015 | Unsupported parent types workspace and block_id | Valid page | 1. Send `parent: {"type":"workspace","workspace":true}`<br>2. Send `parent: {"type":"block_id","block_id":"{{block_id}}"}` | `400 Bad Request`. `code: "validation_error"` for each | Negative | Medium |
| TC_PAGES_MOVE_016 | Invalid destination UUID | Valid page | 1. Send `page_id` `abc`, a 31-character hex and a 33-character hex | `400 Bad Request`. `code: "validation_error"` for each | Negative | High |
| TC_PAGES_MOVE_017 | Invalid source page UUID | Valid destination | 1. Send `POST /v1/pages/not-a-uuid/move` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_PAGES_MOVE_018 | Destination does not exist | Valid page | 1. Send move with `page_id: {{ghost_id}}` | `404 Not Found`. `code: "object_not_found"`. Page not moved | Negative | High |
| TC_PAGES_MOVE_019 | Destination exists but is not shared | `{{unshared_page_id}}` | 1. Send move with `page_id: {{unshared_page_id}}`<br>2. Compare with TC_PAGES_MOVE_018 | `404 Not Found`. `code: "object_not_found"`. Same structure as TC_PAGES_MOVE_018 | Negative | High |
| TC_PAGES_MOVE_020 | Source page does not exist or is not shared | Valid destination | 1. Send `POST /v1/pages/{{ghost_id}}/move`<br>2. Send `POST /v1/pages/{{unshared_page_id}}/move` | `404 Not Found`. `code: "object_not_found"`. Identical structure | Negative | High |
| TC_PAGES_MOVE_021 | Move a page into itself | Page `{{page_id}}` | 1. Send move with `parent.page_id: {{page_id}}` | `400 Bad Request`. Hierarchy unchanged | Negative | High |
| TC_PAGES_MOVE_022 | Move a page into its own descendant | Page with a child and a grandchild | 1. Move the top page into the child<br>2. Move the top page into the grandchild<br>3. `GET` the three pages | `400 Bad Request` for both. Every page keeps its original parent | Negative | High |
| TC_PAGES_MOVE_023 | Source page is in the trash | `{{trashed_page_id}}` | 1. Move it to `{{parent_b}}` | `400 Bad Request`. Page not moved | Negative | Medium |
| TC_PAGES_MOVE_024 | Destination is in the trash | `{{trashed_parent_id}}` | 1. Move a page into it | `400 Bad Request`. Page stays in its parent | Negative | Medium |
| TC_PAGES_MOVE_025 | Integration without update capability | Token with read content only | 1. Send a valid move | `403 Forbidden`. `code: "restricted_resource"`. Page not moved | Negative | High |
| TC_PAGES_MOVE_026 | Moving a database or a block | `{{database_id}}` and `{{block_id}}` | 1. Send `POST /v1/pages/{{database_id}}/move`<br>2. Send `POST /v1/pages/{{block_id}}/move` | `400 Bad Request` or `404 Not Found` with a clear `message`. Nothing moved | Negative | Medium |
| TC_PAGES_MOVE_027 | Page parent is not a regular page | A non-page block ID as `page_id` | 1. Send move with `parent.page_id: {{block_id}}` | `400 Bad Request`. `code: "validation_error"`. Page not moved | Negative | Medium |
| TC_PAGES_MOVE_028 | Rate limit exceeded | Valid token | 1. Send 40 move requests for different pages in 1 second<br>2. Check each page's parent | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header. Pages from `429` responses were not moved | Negative | Medium |
| TC_PAGES_MOVE_029 | Destination ID with hyphens and 32-character hex | Two pages to move | 1. Move the first page with the hyphenated destination<br>2. Move the second with the 32-character form | `200 OK` for both. Both end under the same parent | Boundary | Medium |
| TC_PAGES_MOVE_030 | Empty string as destination ID | Valid page | 1. Send `page_id: ""`<br>2. Send `data_source_id: ""` | `400 Bad Request`. `code: "validation_error"` | Boundary | Medium |
| TC_PAGES_MOVE_031 | Move to the current parent | Page under `{{parent_a}}` | 1. Move it to `{{parent_a}}` | Documented response (`200 OK` as a no-op). Page still has `parent.page_id: {{parent_a}}`. No duplicate created | Boundary | Low |
| TC_PAGES_MOVE_032 | Repeat the same move | Page under `{{parent_a}}` | 1. Send the move to `{{parent_b}}` twice | Same final state. One page only, under `{{parent_b}}` | Boundary | Medium |
| TC_PAGES_MOVE_033 | Deep hierarchy of about 50 pages | Tree with 5 levels and 10 pages per level | 1. Move the top page<br>2. `GET` every descendant | `200 OK` on the move. All descendants return `200 OK` and keep their relative hierarchy | Boundary | Medium |
| TC_PAGES_MOVE_034 | Two parallel moves of the same page | Page under `{{parent_a}}` | 1. Send moves to `{{parent_b}}` and `{{parent_c}}` at the same time (repeat 10 times) | Each response is `200 OK` or `409 Conflict`. The page ends in exactly one parent | Boundary | Low |

---

### Test Cases for PATCH /v1/pages/{page_id}

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_PAGES_PATCH_001 | Update one property | Row `{{page_id}}` with `Count: 10` | 1. Send `PATCH /v1/pages/{{page_id}}`<br>2. Body: `{"properties":{"Count":{"number":99}}}` | `200 OK`. `object: "page"`. `properties.Count.number: 99` | Happy Path | High |
| TC_PAGES_PATCH_002 | Update several properties | Row with title, number, checkbox, select | 1. Send one PATCH changing all four | `200 OK`. All four values are updated | Happy Path | High |
| TC_PAGES_PATCH_003 | Properties not sent stay unchanged | Row with known values and a snapshot | 1. Update only `Count`<br>2. Compare all other properties with the snapshot | `200 OK`. Other properties are identical | Happy Path | High |
| TC_PAGES_PATCH_004 | Update each writable type | Row with every writable type | 1. Send one PATCH per type (data-driven): title, rich_text, number, select, multi_select, status, date, checkbox, url, email, phone_number, people, relation, files | `200 OK` for each. `GET` returns the new value and the same `type` | Happy Path | High |
| TC_PAGES_PATCH_005 | Rename a page under a page | Page under `{{parent_page_id}}` | 1. Send a PATCH with a new `title` | `200 OK`. New title returned | Happy Path | Medium |
| TC_PAGES_PATCH_006 | Set icon and cover | Page without icon and cover | 1. Send `icon` (emoji) and `cover` (external URL) | `200 OK`. `icon` and `cover` match the request | Happy Path | Medium |
| TC_PAGES_PATCH_007 | Remove icon and cover | Page with icon and cover | 1. Send `icon: null` and `cover: null` | `200 OK`. `icon: null`, `cover: null` | Happy Path | Medium |
| TC_PAGES_PATCH_008 | Move a page to the trash | Row in a data source | 1. Send `{"in_trash": true}`<br>2. Query the data source | `200 OK`. `in_trash: true`. The row is not in the query `results[]` | Happy Path | High |
| TC_PAGES_PATCH_009 | Restore a page from the trash | Page in the trash with known properties | 1. Send `{"in_trash": false}`<br>2. `GET` the page and query the data source | `200 OK`. `in_trash: false`. Properties are intact and the row is in the query again | Happy Path | High |
| TC_PAGES_PATCH_010 | Lock and unlock a page | Page that is unlocked | 1. Send `{"is_locked": true}`<br>2. Send `{"is_locked": false}` | `200 OK` each time. `is_locked` changes to `true`, then `false` | Happy Path | Low |
| TC_PAGES_PATCH_011 | Metadata updated and identity unchanged | Snapshot of a page | 1. PATCH any property<br>2. Compare with the snapshot | `last_edited_time` is later and `last_edited_by` is the integration bot. `id`, `created_time`, `created_by`, `parent` and `url` are identical | Happy Path | Medium |
| TC_PAGES_PATCH_012 | multi_select replaces the whole list | Row with `Tags: [A, B]` | 1. Send `Tags: {"multi_select":[{"name":"C"}]}` | `200 OK`. `Tags.multi_select` has only `C` | Happy Path | Medium |
| TC_PAGES_PATCH_013 | relation replaces the list and updates the reverse side | Task related to project P1. Dual relation configured | 1. Send the task's relation with only P2<br>2. Retrieve P1 and P2 | `200 OK`. Task shows only P2. P1 no longer lists the task. P2 lists it | Happy Path | High |
| TC_PAGES_PATCH_014 | people replaces the whole list | Row with users U1 and U2 | 1. Send `people` with U3 only | `200 OK`. `people` contains only U3 | Happy Path | Low |
| TC_PAGES_PATCH_015 | rich_text keeps formatting | Row with a `rich_text` property | 1. Send text with bold, italic, a link and a page mention | `200 OK`. `annotations`, link and mention are returned. Old text is gone | Happy Path | Low |
| TC_PAGES_PATCH_016 | Missing Authorization header | `{{page_id}}` exists | 1. Send PATCH without `Authorization` | `401 Unauthorized`. `code: "unauthorized"`. Nothing changed | Negative | High |
| TC_PAGES_PATCH_017 | Invalid, expired or wrong-scheme credentials | `{{page_id}}` exists | 1. Send with `Bearer abc`, a revoked token and `Basic {{token}}` | `401 Unauthorized`. `code: "unauthorized"` for each | Negative | High |
| TC_PAGES_PATCH_018 | Missing Notion-Version header | `{{page_id}}` exists | 1. Send PATCH without `Notion-Version` | `400 Bad Request`. `code: "missing_version"` | Negative | High |
| TC_PAGES_PATCH_019 | Invalid page UUID | Valid token | 1. Send `PATCH /v1/pages/123`<br>2. Send `PATCH /v1/pages/not-a-uuid` | `400 Bad Request`. `code: "validation_error"` | Negative | High |
| TC_PAGES_PATCH_020 | Page does not exist | Valid token | 1. Send PATCH to `{{ghost_id}}` | `404 Not Found`. `code: "object_not_found"` | Negative | High |
| TC_PAGES_PATCH_021 | Page exists but is not shared | `{{unshared_page_id}}` | 1. Send PATCH to `{{unshared_page_id}}`<br>2. Compare with TC_PAGES_PATCH_020 | `404 Not Found`. `code: "object_not_found"`. Same structure as TC_PAGES_PATCH_020 | Negative | High |
| TC_PAGES_PATCH_022 | Integration without update capability | Token with read content only | 1. Send a valid PATCH | `403 Forbidden`. `code: "restricted_resource"`. Nothing changed | Negative | High |
| TC_PAGES_PATCH_023 | Malformed JSON body | Valid token | 1. Send `{`, an empty body, and a body with a trailing comma | `400 Bad Request`. `code: "invalid_json"` | Negative | High |
| TC_PAGES_PATCH_024 | Read-only properties | Row with formula, rollup, created_time, created_by, last_edited_time, last_edited_by, unique_id | 1. Send one PATCH per read-only property | `400 Bad Request`. `code: "validation_error"`. `message` names the property. Value unchanged | Negative | High |
| TC_PAGES_PATCH_025 | Wrong property type | Row with `Count` (number) and `Select` (select) | 1. Send a string for `Count`<br>2. Send a number for `Select` | `400 Bad Request`. `code: "validation_error"` naming the property | Negative | High |
| TC_PAGES_PATCH_026 | Property not in the schema | Row in a data source | 1. Send a property named `Nmber` | `400 Bad Request`. `code: "validation_error"` naming `Nmber` | Negative | Medium |
| TC_PAGES_PATCH_027 | Non-title property on a page under a page | Page under `{{parent_page_id}}` | 1. Send a PATCH with `Status` | `400 Bad Request`. `code: "validation_error"` | Negative | Medium |
| TC_PAGES_PATCH_028 | parent in the body | Valid page and destination | 1. Send `{"parent":{"page_id":"{{parent_b}}"}}` | `400 Bad Request`. Message points to the Move endpoint. Page not moved | Negative | Medium |
| TC_PAGES_PATCH_029 | children in the body | Valid page | 1. Send `{"children":[{...}]}` | `400 Bad Request`. No blocks added | Negative | Medium |
| TC_PAGES_PATCH_030 | Status with a non-existent option | Row with a `status` property | 1. Send `Status: {"status":{"name":"Nope"}}` | `400 Bad Request`. `code: "validation_error"`. Status unchanged | Negative | Medium |
| TC_PAGES_PATCH_031 | Relation to a page that does not exist | Row with a `relation` property | 1. Send a relation with `{{ghost_id}}` | `400 Bad Request`. Relation unchanged | Negative | Medium |
| TC_PAGES_PATCH_032 | Invalid date, url, email, phone, people | Row with those properties | 1. Send `end` earlier than `start`, `not a url`, `abc` as email, a phone with letters, and an invalid user ID | `400 Bad Request`. `code: "validation_error"` for each (or the documented behavior, identical to POST). Values unchanged | Negative | Medium |
| TC_PAGES_PATCH_033 | Atomic update | Row with `Count: 10` | 1. Send `Count: 5` together with an invalid `Date: "bad"` in one request<br>2. `GET` the page | `400 Bad Request`. `Count` is still `10`. `last_edited_time` unchanged | Negative | High |
| TC_PAGES_PATCH_034 | Edit a page in the trash | Page in the trash | 1. PATCH a property without restoring<br>2. PATCH `in_trash: false` alone | Step 1: `400 Bad Request`, property unchanged. Step 2: `200 OK` | Negative | Medium |
| TC_PAGES_PATCH_035 | Rate limit exceeded | Valid token | 1. Send 40 PATCH requests in 1 second changing a counter property | At least one `429 Too Many Requests`. `code: "rate_limited"`, `Retry-After` header. Final value reflects only the `200 OK` requests | Negative | Medium |
| TC_PAGES_PATCH_036 | XSS and injection payloads | Valid page | 1. PATCH title and rich text with `<script>alert(1)</script>`, `javascript:alert(1)`, `' OR 1=1; --`, `{{7*7}}`<br>2. `GET` the page | `200 OK` (or `400` for invalid URLs). Payloads are stored as literal text and never evaluated | Negative | Medium |
| TC_PAGES_PATCH_037 | Rich text 2,000 and 2,001 characters | Row with a `rich_text` property | 1. Send 2,000 characters<br>2. Send 2,001 characters | `200 OK` for 2,000. `400 Bad Request`, `code: "validation_error"` for 2,001 | Boundary | High |
| TC_PAGES_PATCH_038 | Rich text array of 100 and 101 elements | Row with a `rich_text` property | 1. Send 100 elements<br>2. Send 101 elements | `200 OK` for 100. `400 Bad Request` for 101 | Boundary | Medium |
| TC_PAGES_PATCH_039 | List properties with 100 and 101 items | Row with `multi_select`, `people`, `relation` | 1. Send 100 items in each<br>2. Send 101 | `200 OK` for 100. `400 Bad Request`, `code: "validation_error"` for 101 | Boundary | Medium |
| TC_PAGES_PATCH_040 | URL with 2,000 and 2,001 characters | Row with a `url` property | 1. Send 2,000 characters<br>2. Send 2,001 | `200 OK` for 2,000. `400 Bad Request` for 2,001 | Boundary | Low |
| TC_PAGES_PATCH_041 | Page ID with hyphens and 32-character hex | `{{page_id}}` exists | 1. PATCH using the hyphenated ID<br>2. PATCH using the 32-character ID | `200 OK` for both. Same `id` in the response | Boundary | Medium |
| TC_PAGES_PATCH_042 | Empty title | Page with a title | 1. Send title content `""` | `200 OK`. Page becomes untitled | Boundary | Low |
| TC_PAGES_PATCH_043 | Empty body object | Valid page | 1. Send `{}`<br>2. Compare `last_edited_time` | Documented behavior: `400 Bad Request`, or `200 OK` with no changes and an unchanged `last_edited_time` | Boundary | Low |
| TC_PAGES_PATCH_044 | Clear properties with null and empty arrays | Row with all properties filled | 1. Send `null` for select, date, number, url, email, phone_number<br>2. Send `[]` for multi_select, people, relation, files | `200 OK`. Every property is empty | Boundary | Medium |
| TC_PAGES_PATCH_045 | Numeric edge values | Row with a `number` property | 1. Send `0`, `-1`, `1.5`, `9007199254740991` and `1e400` | `200 OK` and exact values for the safe numbers. `400 Bad Request` for `1e400` | Boundary | Low |
| TC_PAGES_PATCH_046 | Same update twice is idempotent | Row with `Count: 10` | 1. Send the same PATCH twice<br>2. `GET` the page | `200 OK` both times. Same final state | Boundary | Medium |
| TC_PAGES_PATCH_047 | Parallel updates to the same property | Row with a `number` property | 1. Send two PATCH requests at once with `1` and `2` (repeat 20 times) | Each response is `200 OK` or `409 Conflict`. Final value is `1` or `2`. Page is never corrupted | Boundary | Low |

---

### End-to-End (E2E) Test Cases

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| TC_E2E_001 | Full lifecycle of a data source row: create and read | Test root page shared with the integration | 1. Create a database with a data source that has every writable property type<br>2. `POST /v1/pages` with all properties<br>3. `GET /v1/pages/{id}`<br>4. Compare each value with the request | `200 OK` on every call. `object: "page"`. Every property read equals the value sent | E2E | High |
| TC_E2E_002 | Update properties and verify through GET and the property endpoint | Row from TC_E2E_001 | 1. `PATCH` three properties (number, select, date)<br>2. `GET /v1/pages/{id}`<br>3. `GET /v1/pages/{id}/properties/{property_id}` for each of the three | `200 OK` on every call. Both GET endpoints return the new values. `last_edited_time` is later than before the update | E2E | High |
| TC_E2E_003 | Updated values are queryable | Row from TC_E2E_002 | 1. Query the data source with a filter on the three updated values | `200 OK`. `results[]` contains exactly that page (allowing for the documented indexing delay) | E2E | Medium |
| TC_E2E_004 | Trash and restore without data loss | Row with known properties and blocks | 1. `PATCH {"in_trash": true}`<br>2. `GET` the page<br>3. Query the data source<br>4. `PATCH {"in_trash": false}`<br>5. `GET` again and query again | After step 1: `200 OK`, `in_trash: true`. Page is absent from the query. After step 4: `in_trash: false`, all properties and blocks identical to the snapshot, page back in the query | E2E | High |
| TC_E2E_005 | Hierarchy: parent, child and blocks | Test root page | 1. Create a parent page<br>2. Create a child page under it with 3 blocks<br>3. `PATCH /v1/blocks/{child}/children` to append 2 blocks<br>4. `PATCH` the child title, icon and cover<br>5. `GET` both pages and list the blocks | `200 OK` on every call. Child has the new title, icon and cover and 5 blocks in order. Parent and blocks are unchanged | E2E | High |
| TC_E2E_006 | Move through every parent type | Pages `{{parent_a}}`, `{{parent_b}}`. Data sources `{{ds_a}}` and `{{ds_b}}` with different schemas | 1. Create a page under `{{parent_a}}` and snapshot it<br>2. Move to `{{parent_b}}`<br>3. Move to `{{ds_a}}`<br>4. Move to `{{ds_b}}`<br>5. Move back to `{{parent_a}}`<br>6. `GET` the page after each move | `200 OK` on every move. `parent` is correct after each step. Title is kept, matching properties are kept, only `title` remains after step 5. `id`, `url`, `created_by`, `icon`, `cover` and blocks never change. `last_edited_time` changes on each move | E2E | High |
| TC_E2E_007 | Sub-tree moves intact and cycles are rejected | Page with 3 levels of descendants (2 pages per level) | 1. Move the top page to `{{parent_b}}`<br>2. `GET` all 14 descendants<br>3. Move the top page into one of its descendants<br>4. `GET` the tree again | Step 1: `200 OK`. Step 2: every descendant returns `200 OK` with the same relative parent. Step 3: `400 Bad Request`. Step 4: hierarchy and `last_edited_time` unchanged | E2E | High |
| TC_E2E_008 | Dual relation across create, update, read and trash | Projects and tasks data sources linked by a dual relation | 1. Create a project and a task related to it<br>2. `GET` both pages<br>3. Create 30 tasks related to the project<br>4. `GET .../properties/{relation_id}` on the project with `page_size=10` and follow `next_cursor`<br>5. `PATCH` one task to point to project 2<br>6. Read both projects' relation<br>7. Send the task to the trash and read the project's relation | Step 2: both sides show the link. Step 4: 31 distinct items, `has_more: false` at the end. Step 6: project 1 loses the task and project 2 gains it. Step 7: the task is removed from the relation (or flagged, as documented) | E2E | High |
| TC_E2E_009 | Computed properties stay correct and protected | Data source with a number, a relation, a rollup (sum) and a formula (rollup times 2) | 1. Create 5 tasks with numbers `10, 20, 30, 40, 50` related to one project<br>2. `GET` the project and read the rollup and formula with the property endpoint<br>3. `PATCH` one task from `10` to `110`<br>4. Poll the rollup and formula for up to 60 seconds<br>5. `PATCH` the rollup directly | Step 2: rollup `150`, formula `300`. Step 4: rollup `250`, formula `500`. Step 5: `400 Bad Request`, `code: "validation_error"`, value unchanged | E2E | Medium |
| TC_E2E_010 | Truncation and pagination consistency | Data source with `rich_text` and `people` properties | 1. Create a page with a `rich_text` of 2,000 characters in 100 segments and a `people` list of 100 users<br>2. `GET /v1/pages/{id}`<br>3. `GET .../properties/{id}` for both, following `next_cursor`<br>4. `GET` with `filter_properties` for 3 properties<br>5. Read each omitted property with the property endpoint | `200 OK` on every call. Concatenated paginated text equals the text sent and all 100 users are returned. The filtered GET returns only 3 properties and the omitted properties equal the unfiltered values | E2E | Medium |
| TC_E2E_011 | Errors leave no side effects | Valid token and parent page | 1. Create with an invalid token, receive the error, then resend with the valid token and search the title<br>2. Send a create with one invalid block, an update with one invalid property and a move to an invalid destination<br>3. `GET` the page and search | Step 1: `401 Unauthorized`, `code: "unauthorized"`, then `200 OK` and exactly one page with that title. Step 2: `400 Bad Request` for each. Step 3: no new page, no changed property, no changed parent | E2E | High |
| TC_E2E_012 | Rate limiting does not duplicate or lose operations | Valid token | 1. Send 30 creates with unique titles in a burst<br>2. On each `429` wait `Retry-After` and resend the same request<br>3. Count pages by title | `429 Too Many Requests` with `code: "rate_limited"` and `Retry-After` appears. After retries exactly 30 pages exist, each title once | E2E | Medium |
| TC_E2E_013 | Permissions across the lifecycle | Integration A with full access. Integration B with no access. Read-only integration. Insert-only integration | 1. Create a page with A<br>2. Read it with B<br>3. Share it with B and read again<br>4. Revoke B and run GET, property GET, PATCH and move with B<br>5. With the read-only token run GET and property GET, then create, PATCH and move<br>6. With the insert-only token create, then PATCH and move | Step 2: `404 Not Found`, `code: "object_not_found"`. Step 3: `200 OK`. Step 4: `404 Not Found` on all four, A still gets `200 OK`. Step 5: reads `200 OK`, writes `403 Forbidden` with `code: "restricted_resource"`. Step 6: create `200 OK`, PATCH and move `403 Forbidden` | E2E | High |
| TC_E2E_014 | Bulk import, update, move and trash of 50 pages | Two data sources with compatible schemas | 1. Create 50 pages in `{{ds_a}}` at the allowed rate, retrying on `429`<br>2. `PATCH` all 50 with `Status: Done`<br>3. Query `{{ds_a}}` with that filter<br>4. Move all 50 to `{{ds_b}}`<br>5. Query both data sources<br>6. `PATCH {"in_trash": true}` on all 50<br>7. Query `{{ds_b}}` and search | Step 1: 50 pages, none duplicated. Step 3: `results[]` has 50 items. Step 5: `{{ds_a}}` has 0 and `{{ds_b}}` has 50. Step 7: none of the pages appears | E2E | Medium |
| TC_E2E_015 | Concurrent operations leave a consistent state | Valid token and one page | 1. Run 5 `PATCH` requests on 5 different properties in parallel with 20 `GET` requests<br>2. Run a `PATCH` and a move on the same page at once (10 repetitions)<br>3. Run 20 parallel creates under one parent | Step 1: every `GET` is a consistent snapshot and the final state has all 5 updates (or a documented `409 Conflict` that is retried). Step 2: page is moved and updated, or one request gets `409`, never corrupted. Step 3: exactly 20 distinct pages | E2E | Medium |
| TC_E2E_016 | Content fidelity and stored payloads stay inert | Valid token and parent page | 1. Create a page with heading, paragraph, lists, to-do, code, image by URL, divider, quote, callout and a toggle with children<br>2. Move the page, then `PATCH` its properties<br>3. List the blocks after each step<br>4. Create and update titles with Unicode, `<script>alert(1)</script>` and `' OR 1=1; --`, read them with `GET` and the property endpoint | `200 OK` on every call. Blocks are identical and in the same order after every step. Titles are returned unchanged as literal text and nothing executes | E2E | Medium |