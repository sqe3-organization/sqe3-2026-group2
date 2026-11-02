# Notion REST API (`2025-09-03`) — Blocks Module
**Author:** Karen Ivonne Cruz Alvarez  
**System Under Test (SUT):** Notion Public REST API v1 (`https://api.notion.com/v1/`)  
**Contract Version:** `Notion-Version: 2025-09-03`  
**Assigned Postman Collection Module:** `Blocks`

---

## PART 1: User Stories & Acceptance Criteria

### User Story: API PATCH /v1/blocks/{block_id}/children (Append block children)

> *As a developer/integration user of the Notion API, I want to append one or more new child blocks (paragraphs, headings, to-dos, lists, etc.) to an existing block or page via `PATCH /v1/blocks/{block_id}/children` so that I can programmatically build and extend the content body of pages while preserving the exact order of the inserted blocks.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `PATCH` request to `/v1/blocks/{block_id}/children` with a valid `Authorization: Bearer <NOTION_TOKEN>` header (integration with *Insert content* capability), `Notion-Version: 2025-09-03`, and a JSON body `{"children": [ {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": "Hello"}}]}} ]}`, where `{block_id}` is an existing page or block shared with the integration, the API must respond with HTTP `200 OK` and return `object: "list"`, `type: "block"`, and a `results[]` array containing the newly created block(s) with new `id`s, `parent` pointing to `{block_id}`, and the same `type`.
- **As a user**, when I append several blocks of different types (`heading_2`, `paragraph`, `to_do`, `bulleted_list_item`) in a single request, the API must respond with HTTP `200 OK` and create them as children preserving the order in which they were sent.
- **As a user**, when I append a block using the `after` parameter set to the `id` of an existing child block, the API must respond with HTTP `200 OK` and insert the new block immediately after that sibling instead of at the end of the children list.

#### **Negative Scenarios**
- **As a user**, when I send a `PATCH` request to `/v1/blocks/{block_id}/children` with an invalid, malformed, or revoked Bearer token, or without the `Authorization` header, the API must respond with HTTP `401 Unauthorized` and return `object: "error"`, `status: 401`, `code: "unauthorized"`.
- **As a user**, when I omit the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I use an integration that lacks the *Insert content* capability (read-only integration), the API must respond with HTTP `403 Forbidden` and `code: "restricted_resource"`.
- **As a user**, when I send a `PATCH` request with a well-formed `UUIDv4` that does not exist, or that exists but has not been shared with the integration, the API must respond with HTTP `404 Not Found` and `code: "object_not_found"`.
- **As a user**, when I send a `block_id` with a syntactically invalid UUID (e.g., `not-a-valid-uuid`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I send a body that omits the required `children` array, includes an unsupported block `type`, or has a `type` that does not match its payload key, the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`; no block must be created.
- **As a user**, when I send a malformed JSON body (e.g., unclosed brace), the API must respond with HTTP `400 Bad Request` and `code: "invalid_json"`.
- **As a user**, when I try to append children to a block that is archived/in the trash, the API must reject the request with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I exceed the integration rate limit (~3 requests/second sustained), the API must respond with HTTP `429 Too Many Requests`, `code: "rate_limited"`, and include a `Retry-After` header.

#### **Boundary Cases**
- **As a user**, when I append exactly `100` blocks in `children` (maximum per request), the API must respond with HTTP `200 OK` and create all `100` blocks; when I send `101` blocks, the API must reject the request with HTTP `400 Bad Request` (`code: "validation_error"`) and create none.
- **As a user**, when I send an empty `children` array (`[]`), the API must handle the lower boundary deterministically: either reject it with `400 validation_error` or return `200 OK` with an empty `results[]` (documented behavior to be pinned after first execution), never a `500`.
- **As a user**, when a `rich_text` text fragment has exactly `2000` characters, the API must respond with `200 OK`; with `2001` characters it must respond with `400 Bad Request` (`code: "validation_error"`).
- **As a user**, when I pass `{block_id}` as a 36-character hyphenated `UUIDv4` or as a 32-character compact hex string (no hyphens), the API must accept both (`200 OK`); a 31- or 33-character string must be rejected with `400 validation_error`.
- **As a user**, when I append a block with nested `children` up to two levels deep in the same request, the API must respond with `200 OK`; with three levels of nesting it must reject the request with `400 validation_error`.

---

### User Story: API GET /v1/blocks/{block_id} (Retrieve a block)

> *As a developer/integration user of the Notion API, I want to retrieve a single block by its `block_id` via `GET /v1/blocks/{block_id}` so that I can inspect its type, content, parent, `has_children` flag, and lifecycle state before reading or modifying it.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `GET` request to `/v1/blocks/{block_id}` with a valid Bearer token (*Read content* capability), `Notion-Version: 2025-09-03`, and the `id` of an existing shared block, the API must respond with HTTP `200 OK` and return `object: "block"`, `id` matching `{block_id}`, `type`, a payload key matching `type` (e.g., `paragraph`), `parent`, `has_children` (boolean), `created_time`, `last_edited_time`, and `in_trash`/`archived` set to `false`.
- **As a user**, when I retrieve a block that has nested children, the API must respond with `200 OK` and `has_children: true`, without embedding the children in the response (they are fetched through the children endpoint).
- **As a user**, when I retrieve a block that was previously moved to the trash, the API must respond with `200 OK` and `in_trash: true` (`archived: true`).

#### **Negative Scenarios**
- **As a user**, when I send a `GET` request with an invalid, expired, or revoked Bearer token, or omit the `Authorization` header, the API must respond with HTTP `401 Unauthorized` and `code: "unauthorized"`.
- **As a user**, when I omit the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I use an integration without the *Read content* capability, the API must respond with HTTP `403 Forbidden` and `code: "restricted_resource"`.
- **As a user**, when I send a well-formed `UUIDv4` that does not exist or is not shared with the integration, the API must respond with HTTP `404 Not Found` and `code: "object_not_found"` (identical response for both cases, to prevent ID enumeration).
- **As a user**, when I send a syntactically invalid `block_id` (e.g., `invalid-block-id-123`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.

#### **Boundary Cases**
- **As a user**, when I send the hyphenated 36-character `UUIDv4` and the compact 32-character hex form of the same block id, the API must accept both (`200 OK`) and return `id` normalized to the hyphenated format.
- **As a user**, when I send the nil UUID (`00000000-0000-0000-0000-000000000000`), the API must return `404 Not Found` (`code: "object_not_found"`); with 31 or 33 hex characters it must return `400 validation_error`.
- **As a user**, when I retrieve a page `id` as if it were a block (`GET /v1/blocks/{page_id}`), the API must respond with `200 OK` returning a block of `type: "child_page"`, confirming that pages are also addressable as blocks.

---

### User Story: API GET /v1/blocks/{block_id}/children (Retrieve block children)

> *As a developer/integration user of the Notion API, I want to retrieve the paginated list of first-level child blocks of a block or page via `GET /v1/blocks/{block_id}/children` so that I can read the full content of a page, traversing large block trees with cursor-based pagination.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `GET` request to `/v1/blocks/{block_id}/children` with a valid Bearer token (*Read content*), `Notion-Version: 2025-09-03`, and the `id` of a page or block that has children, the API must respond with HTTP `200 OK` and return `object: "list"`, `type: "block"`, `results[]` (block objects in their visual order), `has_more` (boolean), and `next_cursor` (string or `null`).
- **As a user**, when `has_more` is `true` and I send a subsequent request with `start_cursor=<next_cursor>`, the API must respond with `200 OK` and return the next non-overlapping page of children.
- **As a user**, when I retrieve the children of a block with no children, the API must respond with `200 OK`, `results: []`, `has_more: false`, and `next_cursor: null`.

#### **Negative Scenarios**
- **As a user**, when I send the request with an invalid/revoked Bearer token or without `Authorization`, the API must respond with HTTP `401 Unauthorized` and `code: "unauthorized"`.
- **As a user**, when I omit the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I use an integration without the *Read content* capability, the API must respond with HTTP `403 Forbidden` and `code: "restricted_resource"`.
- **As a user**, when `{block_id}` is a well-formed UUID that does not exist or is not shared, the API must respond with HTTP `404 Not Found` and `code: "object_not_found"`.
- **As a user**, when `{block_id}` is not a valid UUID, the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I send a malformed `start_cursor` (e.g., `?start_cursor=invalid_cursor`) or a non-integer `page_size` (e.g., `?page_size=abc`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.

#### **Boundary Cases**
- **As a user**, when I send `?page_size=1` (minimum), the API must respond with `200 OK`, `results[]` length `<= 1`, and `has_more: true` with a non-null `next_cursor` if more than one child exists.
- **As a user**, when I send `?page_size=100` (maximum), the API must respond with `200 OK` and return up to `100` blocks.
- **As a user**, when I send `?page_size=0`, `?page_size=-1`, or `?page_size=101` (out of range), the API must reject the request with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I retrieve children of a page with exactly `100` and then `101` children, the first request must return all `100` with `has_more: false` and the second must return `has_more: true` with a cursor to the remaining child.
- **As a user**, when I request children using the compact 32-character UUID, the API must accept it (`200 OK`).

---

### User Story: API PATCH /v1/blocks/{block_id} (Update a block)

> *As a developer/integration user of the Notion API, I want to update the content of an existing block (or move it to the trash) via `PATCH /v1/blocks/{block_id}` so that I can edit text, toggle to-do states, and maintain page content without recreating blocks.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `PATCH` request to `/v1/blocks/{block_id}` with a valid Bearer token (*Update content* capability), `Notion-Version: 2025-09-03`, and a body that updates the payload of the block's own type (e.g., `{"paragraph": {"rich_text": [{"type": "text", "text": {"content": "Updated"}}]}}`), the API must respond with HTTP `200 OK` and return the updated block with the same `id` and `type`, the new content, and an updated `last_edited_time`.
- **As a user**, when I update a `to_do` block with `{"to_do": {"checked": true}}`, the API must respond with `200 OK` and `to_do.checked: true`, preserving the existing `rich_text`.
- **As a user**, when I send `{"in_trash": true}` (or `{"archived": true}`), the API must respond with `200 OK` and `in_trash: true`; when I later send `{"in_trash": false}`, the block must be restored (`in_trash: false`).

#### **Negative Scenarios**
- **As a user**, when I send the request with an invalid/revoked Bearer token or without `Authorization`, the API must respond with HTTP `401 Unauthorized` and `code: "unauthorized"`.
- **As a user**, when I omit the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I use an integration without the *Update content* capability, the API must respond with HTTP `403 Forbidden` and `code: "restricted_resource"`.
- **As a user**, when `{block_id}` is a well-formed UUID that does not exist or is not shared, the API must respond with HTTP `404 Not Found` and `code: "object_not_found"`.
- **As a user**, when `{block_id}` is not a valid UUID, the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I send a payload key that does not match the block's existing type (e.g., a `heading_1` payload to a `paragraph` block), or a body with invalid field types (e.g., `"checked": "yes"`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`, leaving the block unchanged.
- **As a user**, when I try to change the `type` of an existing block, the API must reject the request with `400 validation_error` (block types are immutable).
- **As a user**, when I send malformed JSON, the API must respond with HTTP `400 Bad Request` and `code: "invalid_json"`.
- **As a user**, when I try to update the content of a block that is in the trash, the API must reject the request with HTTP `400 Bad Request` and `code: "validation_error"` (unless the request only restores it with `in_trash: false`).

#### **Boundary Cases**
- **As a user**, when I update a `rich_text` fragment with exactly `2000` characters, the API must respond with `200 OK`; with `2001` characters it must respond with `400 validation_error`.
- **As a user**, when I send an empty `rich_text` array (`[]`) in a `paragraph` block, the API must respond with `200 OK` and an empty paragraph.
- **As a user**, when I send an empty body `{}`, the API must respond deterministically (`200 OK` with the unchanged block or `400 validation_error`; documented behavior to be pinned after first execution), never a `500`.
- **As a user**, when I pass the block id in compact 32-character format, the API must accept it (`200 OK`); with 31 or 33 characters it must reject it with `400 validation_error`.

---

### User Story: API DELETE /v1/blocks/{block_id} (Delete a block)

> *As a developer/integration user of the Notion API, I want to delete a block via `DELETE /v1/blocks/{block_id}` so that I can remove obsolete content from pages and clean up test data, understanding that deletion is a soft delete that moves the block to the trash.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `DELETE` request to `/v1/blocks/{block_id}` with a valid Bearer token (*Update content* capability), `Notion-Version: 2025-09-03`, and an existing block id, the API must respond with HTTP `200 OK` and return the block object with `object: "block"`, the same `id`, and `in_trash: true` (`archived: true`).
- **As a user**, when I list the parent's children after deleting a block, the deleted block must no longer appear in `results[]`.
- **As a user**, when I delete a block that has nested children, the API must respond with `200 OK` and the children must become inaccessible together with their parent.

#### **Negative Scenarios**
- **As a user**, when I send the request with an invalid/revoked Bearer token or without `Authorization`, the API must respond with HTTP `401 Unauthorized` and `code: "unauthorized"`.
- **As a user**, when I omit the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I use an integration without the *Update content* capability, the API must respond with HTTP `403 Forbidden` and `code: "restricted_resource"`.
- **As a user**, when `{block_id}` is a well-formed UUID that does not exist or is not shared, the API must respond with HTTP `404 Not Found` and `code: "object_not_found"`.
- **As a user**, when `{block_id}` is not a valid UUID, the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.

#### **Boundary Cases**
- **As a user**, when I delete a block that is already in the trash (idempotency boundary), the API must respond deterministically (`200 OK` with `in_trash: true`, or `400 validation_error`; documented behavior to be pinned after first execution), never a `500`.
- **As a user**, when I pass the block id in compact 32-character format, the API must accept it (`200 OK`); with 31 or 33 characters it must reject it with `400 validation_error`; the nil UUID must return `404 object_not_found`.
- **As a user**, when I delete a block and then restore it through `PATCH /v1/blocks/{block_id}` with `{"in_trash": false}`, the block must be restored with the same `id` and original content.

---

### End-to-End (E2E) Acceptance Criteria for Blocks

#### **Scenario 1: Full Block Lifecycle (Append → Retrieve → Update → Delete → Verify)**
- **As a user**, when I execute a complete content lifecycle on a shared test page:
  1. Append a `paragraph` block to the page via `PATCH /v1/blocks/{page_id}/children` (`200 OK`) and store the new `block_id`;
  2. Retrieve it via `GET /v1/blocks/{block_id}` (`200 OK`) and verify `type`, content, and `parent.page_id`;
  3. Update its text via `PATCH /v1/blocks/{block_id}` (`200 OK`) and re-retrieve it to confirm the new content;
  4. Delete it via `DELETE /v1/blocks/{block_id}` (`200 OK`, `in_trash: true`); and
  5. List the page children via `GET /v1/blocks/{page_id}/children` and re-retrieve the block,
  then the deleted block must not appear in the children list and `GET /v1/blocks/{block_id}` must reflect `in_trash: true`, proving end-to-end consistency of creation, modification and soft deletion.

#### **Scenario 2: Nested Block Tree Construction & Paginated Traversal**
- **As a user**, when I build and read a block tree:
  1. Append 100 blocks (including a `toggle` block) to a page in a single request (`200 OK`) and append a 101st block in a second request;
  2. Append child blocks under the `toggle` block via `PATCH /v1/blocks/{toggle_id}/children` (`200 OK`);
  3. Traverse the page children with `GET /v1/blocks/{page_id}/children?page_size=50` following `next_cursor` until `has_more: false`; and
  4. Retrieve the `toggle` block and its children,
  then the total number of retrieved first-level blocks must equal `101` without duplicates or omissions, the toggle must report `has_children: true`, and the order must match the insertion order.

#### **Scenario 3: Ordered Insertion & Restore from Trash**
- **As a user**, when I insert content in a specific position and restore deleted content:
  1. Append blocks `A` and `C` to a page, then append block `B` with `after` = id of `A` (`200 OK`);
  2. List the children and verify the order `A, B, C`;
  3. Delete block `B` (`200 OK`) and verify the order `A, C`; and
  4. Restore block `B` via `PATCH /v1/blocks/{B_id}` with `{"in_trash": false}` (`200 OK`),
  then `B` must be retrievable again with its original content and `in_trash: false`.

---

## PART 2: API Test Cases Tables

### Test Cases for PATCH /v1/blocks/{block_id}/children (Append block children)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_BLK_APP_001` | Verify appending a single `paragraph` block to a shared page | Valid `NOTION_TOKEN` with *Insert content* capability; `PAGE_ID` shared with the integration. | 1. Set `Authorization: Bearer <NOTION_TOKEN>`, `Notion-Version: 2025-09-03`, `Content-Type: application/json`.<br>2. Send `PATCH /v1/blocks/{PAGE_ID}/children` with `{"children": [{"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": "Hello"}}]}}]}`. | Status `200 OK`. JSON body contains `object: "list"`, `results[]` with 1 block of `type: "paragraph"`, a new `id`, `parent.page_id == PAGE_ID`, and `paragraph.rich_text[0].text.content == "Hello"`. | Happy Path | High |
| `TC_BLK_APP_002` | Verify appending multiple blocks of different types preserves order | Same as `TC_BLK_APP_001`. | 1. Send `PATCH /v1/blocks/{PAGE_ID}/children` with 4 children in order: `heading_2`, `paragraph`, `to_do`, `bulleted_list_item`.<br>2. Send `GET /v1/blocks/{PAGE_ID}/children`. | Status `200 OK` on both calls. `results[]` of step 1 has 4 blocks with the sent `type`s; the last 4 blocks of step 2 appear in the same order. | Happy Path | High |
| `TC_BLK_APP_003` | Verify insertion after a specific sibling using the `after` parameter | Page with at least 2 existing child blocks; `FIRST_BLOCK_ID` known. | 1. Send `PATCH /v1/blocks/{PAGE_ID}/children` with `{"after": "<FIRST_BLOCK_ID>", "children": [<paragraph>]}`.<br>2. Send `GET /v1/blocks/{PAGE_ID}/children`. | Status `200 OK`. The new block appears immediately after `FIRST_BLOCK_ID` in the children list. | Happy Path | Medium |
| `TC_BLK_APP_004` | Verify nested children (2 levels) can be appended in a single request | Same as `TC_BLK_APP_001`. | 1. Send `PATCH /v1/blocks/{PAGE_ID}/children` with a `toggle` block containing a `paragraph` child in `toggle.children`.<br>2. Send `GET /v1/blocks/{toggle_id}/children`. | Status `200 OK`. Toggle returned with `has_children: true`; its children list contains the nested paragraph. | Happy Path | Medium |
| `TC_BLK_APP_005` | Verify `401 Unauthorized` with an invalid Bearer token | None. | 1. Set `Authorization: Bearer ntn_invalid_token_99999` and `Notion-Version: 2025-09-03`.<br>2. Send `PATCH /v1/blocks/{PAGE_ID}/children` with a valid body. | Status `401 Unauthorized`. JSON body contains `object: "error"`, `status: 401`, `code: "unauthorized"`. No block created. | Negative | High |
| `TC_BLK_APP_006` | Verify `400 Bad Request` when `Notion-Version` header is missing | Valid `NOTION_TOKEN`. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and omit `Notion-Version`.<br>2. Send `PATCH /v1/blocks/{PAGE_ID}/children` with a valid body. | Status `400 Bad Request`. JSON body contains `object: "error"`, `status: 400`, `code: "missing_version"`. | Negative | Medium |
| `TC_BLK_APP_007` | Verify `403 Forbidden` when integration lacks *Insert content* capability | Secondary integration token configured as read-only, with `PAGE_ID` shared. | 1. Set `Authorization: Bearer <READONLY_TOKEN>` and `Notion-Version: 2025-09-03`.<br>2. Send `PATCH /v1/blocks/{PAGE_ID}/children` with a valid body. | Status `403 Forbidden`. JSON body contains `object: "error"`, `status: 403`, `code: "restricted_resource"`. | Negative | Medium |
| `TC_BLK_APP_008` | Verify `404 Not Found` for a well-formed UUID that does not exist or is not shared | Valid `NOTION_TOKEN`. | 1. Send `PATCH /v1/blocks/f47ac10b-58cc-4372-a567-0e02b2c3d479/children` with a valid body. | Status `404 Not Found`. JSON body contains `object: "error"`, `status: 404`, `code: "object_not_found"`. | Negative | High |
| `TC_BLK_APP_009` | Verify `400 Bad Request` when `block_id` is not a valid UUID | Valid `NOTION_TOKEN`. | 1. Send `PATCH /v1/blocks/not-a-valid-uuid/children` with a valid body. | Status `400 Bad Request`. JSON body contains `object: "error"`, `status: 400`, `code: "validation_error"`. | Negative | High |
| `TC_BLK_APP_010` | Verify `400 Bad Request` when `children` is missing or the block `type` is unsupported / mismatched with its payload | Valid `NOTION_TOKEN`; `PAGE_ID` shared. | 1. Send `PATCH` with body `{}`.<br>2. Send `PATCH` with `{"children": [{"object": "block", "type": "invalid_type"}]}`.<br>3. Send `PATCH` with `type: "paragraph"` but payload key `heading_1`. | All three requests return `400 Bad Request` with `object: "error"` and `code: "validation_error"`. No block created (children count unchanged). | Negative | High |
| `TC_BLK_APP_011` | Verify `400 Bad Request` with malformed JSON body | Valid `NOTION_TOKEN`. | 1. Send `PATCH /v1/blocks/{PAGE_ID}/children` with raw body `{"children": [` (unclosed). | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "invalid_json"`. | Negative | Low |
| `TC_BLK_APP_012` | Verify appending children to a trashed block is rejected | A block `TRASHED_BLOCK_ID` previously deleted. | 1. Send `PATCH /v1/blocks/{TRASHED_BLOCK_ID}/children` with a valid body. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "validation_error"`. | Negative | Medium |
| `TC_BLK_APP_013` | Verify upper boundary of 100 blocks per request (100 vs 101) | Same as `TC_BLK_APP_001`. | 1. Send `PATCH` with exactly `100` paragraph children.<br>2. Send `PATCH` with `101` paragraph children. | Step 1: `200 OK`, `results[]` length `100`.<br>Step 2: `400 Bad Request`, `code: "validation_error"`; no block created. | Boundary | High |
| `TC_BLK_APP_014` | Verify `rich_text` content length boundary (2000 vs 2001 characters) | Same as `TC_BLK_APP_001`. | 1. Send `PATCH` with a paragraph whose `text.content` has exactly `2000` characters.<br>2. Send `PATCH` with `2001` characters. | Step 1: `200 OK` and content stored intact.<br>Step 2: `400 Bad Request`, `code: "validation_error"`. | Boundary | Medium |
| `TC_BLK_APP_015` | Verify empty `children` array boundary | Same as `TC_BLK_APP_001`. | 1. Send `PATCH /v1/blocks/{PAGE_ID}/children` with `{"children": []}`. | Deterministic response, never `500`: either `400 validation_error` or `200 OK` with `results: []` (documented behavior to be pinned after first execution). | Boundary | Low |
| `TC_BLK_APP_016` | Verify UUID formats (36-char hyphenated, 32-char compact, 31 and 33 chars) | Same as `TC_BLK_APP_001`. | 1. Send `PATCH` with hyphenated `PAGE_ID`.<br>2. Send `PATCH` with compact 32-char `PAGE_ID`.<br>3. Send `PATCH` with a 31-char and a 33-char id. | Steps 1–2: `200 OK`.<br>Step 3: both return `400 Bad Request` (`code: "validation_error"`). | Boundary | Medium |
| `TC_BLK_APP_017` | Verify nesting depth boundary (2 levels vs 3 levels in a single request) | Same as `TC_BLK_APP_001`. | 1. Send `PATCH` with `toggle` → `toggle` (2 levels).<br>2. Send `PATCH` with `toggle` → `toggle` → `paragraph` (3 levels). | Step 1: `200 OK`.<br>Step 2: `400 Bad Request`, `code: "validation_error"`. | Boundary | Low |
| `TC_BLK_APP_018` | Verify rate limiting on burst of append requests | Valid `NOTION_TOKEN`. | 1. Dispatch a rapid concurrent burst (`> 15` parallel requests/sec) to `PATCH /v1/blocks/{PAGE_ID}/children`. | Throttled calls return `429 Too Many Requests` with `code: "rate_limited"` and a `Retry-After` header. | Boundary | Low |

---

### Test Cases for GET /v1/blocks/{block_id} (Retrieve a block)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_BLK_GET_001` | Verify retrieval of an existing `paragraph` block | Valid `NOTION_TOKEN` with *Read content*; existing `BLOCK_ID` shared with the integration. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and `Notion-Version: 2025-09-03`.<br>2. Send `GET /v1/blocks/{BLOCK_ID}`. | Status `200 OK`. JSON body contains `object: "block"`, `id == BLOCK_ID`, `type: "paragraph"`, `paragraph.rich_text`, `parent`, boolean `has_children`, `created_time`, `last_edited_time`, `in_trash: false`. | Happy Path | High |
| `TC_BLK_GET_002` | Verify a block with nested children reports `has_children: true` without embedding children | Block `TOGGLE_ID` with at least 1 child. | 1. Send `GET /v1/blocks/{TOGGLE_ID}`. | Status `200 OK`. `type: "toggle"`, `has_children: true`; response does not include a `children` array. | Happy Path | Medium |
| `TC_BLK_GET_003` | Verify retrieval of a trashed block | Block previously deleted (`TRASHED_BLOCK_ID`). | 1. Send `GET /v1/blocks/{TRASHED_BLOCK_ID}`. | Status `200 OK`. JSON body contains `in_trash: true` (`archived: true`). | Happy Path | Medium |
| `TC_BLK_GET_004` | Verify `401 Unauthorized` with an invalid or missing token | None. | 1. Send `GET /v1/blocks/{BLOCK_ID}` with `Authorization: Bearer invalid_secret_token`.<br>2. Send the same request omitting `Authorization`. | Both return `401 Unauthorized` with `object: "error"`, `status: 401`, `code: "unauthorized"`. | Negative | High |
| `TC_BLK_GET_005` | Verify `400 Bad Request` when `Notion-Version` is missing | Valid `NOTION_TOKEN`. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and omit `Notion-Version`.<br>2. Send `GET /v1/blocks/{BLOCK_ID}`. | Status `400 Bad Request`. JSON body contains `code: "missing_version"`. | Negative | Medium |
| `TC_BLK_GET_006` | Verify `403 Forbidden` when integration lacks *Read content* capability | Secondary integration token without *Read content*. | 1. Send `GET /v1/blocks/{BLOCK_ID}` with `<RESTRICTED_TOKEN>`. | Status `403 Forbidden`. JSON body contains `code: "restricted_resource"`. | Negative | Medium |
| `TC_BLK_GET_007` | Verify `404 Not Found` for non-existent or non-shared block | Valid `NOTION_TOKEN`. | 1. Send `GET /v1/blocks/f47ac10b-58cc-4372-a567-0e02b2c3d479`.<br>2. Send `GET /v1/blocks/{UNSHARED_BLOCK_ID}` (exists but not connected to the integration). | Both return `404 Not Found` with identical `code: "object_not_found"` (no enumeration leak). | Negative | High |
| `TC_BLK_GET_008` | Verify `400 Bad Request` for syntactically invalid `block_id` | Valid `NOTION_TOKEN`. | 1. Send `GET /v1/blocks/invalid-block-id-123`. | Status `400 Bad Request`. JSON body contains `code: "validation_error"`. | Negative | High |
| `TC_BLK_GET_009` | Verify UUID format boundary: 36-char hyphenated vs 32-char compact | Valid `NOTION_TOKEN`; existing `BLOCK_ID`. | 1. Send `GET /v1/blocks/{hyphenated_id}`.<br>2. Send `GET /v1/blocks/{compact_32_char_id}`. | Both return `200 OK` with `id` normalized to the hyphenated 36-char format. | Boundary | Medium |
| `TC_BLK_GET_010` | Verify UUID length and nil-value boundaries (nil UUID, 31-char, 33-char) | Valid `NOTION_TOKEN`. | 1. Send `GET /v1/blocks/00000000-0000-0000-0000-000000000000`.<br>2. Send `GET` with a 31-char hex id.<br>3. Send `GET` with a 33-char hex id. | Step 1: `404 Not Found` (`object_not_found`).<br>Steps 2–3: `400 Bad Request` (`validation_error`). | Boundary | Low |
| `TC_BLK_GET_011` | Verify a page id is addressable as a block | Shared `PAGE_ID`. | 1. Send `GET /v1/blocks/{PAGE_ID}`. | Status `200 OK`. JSON body contains `object: "block"`, `id == PAGE_ID`, `type: "child_page"` (documented behavior to be pinned after first execution). | Boundary | Low |

---

### Test Cases for GET /v1/blocks/{block_id}/children (Retrieve block children)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_BLK_CHL_001` | Verify listing children of a page with default pagination | Valid `NOTION_TOKEN` with *Read content*; `PAGE_ID` with `>= 3` children. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and `Notion-Version: 2025-09-03`.<br>2. Send `GET /v1/blocks/{PAGE_ID}/children`. | Status `200 OK`. JSON body contains `object: "list"`, `type: "block"`, non-empty `results[]` of block objects in visual order, boolean `has_more`, and `next_cursor`. | Happy Path | High |
| `TC_BLK_CHL_002` | Verify cursor-based pagination traversal | Page with `>= 3` children. | 1. Send `GET /v1/blocks/{PAGE_ID}/children?page_size=1` and capture `next_cursor`.<br>2. Send `GET ...?page_size=1&start_cursor=<next_cursor>`. | Status `200 OK` on both. `results[0].id` of step 2 differs from step 1; no duplicates or omissions across pages. | Happy Path | High |
| `TC_BLK_CHL_003` | Verify children of a block with no children | Existing leaf block `LEAF_BLOCK_ID` (`has_children: false`). | 1. Send `GET /v1/blocks/{LEAF_BLOCK_ID}/children`. | Status `200 OK`. `object: "list"`, `results: []`, `has_more: false`, `next_cursor: null`. | Happy Path | Medium |
| `TC_BLK_CHL_004` | Verify retrieval of nested children of a `toggle` block | `TOGGLE_ID` with nested children. | 1. Send `GET /v1/blocks/{TOGGLE_ID}/children`. | Status `200 OK`. `results[]` contains only the toggle's direct children with `parent.block_id == TOGGLE_ID`. | Happy Path | Medium |
| `TC_BLK_CHL_005` | Verify `401 Unauthorized` with invalid or missing token | None. | 1. Send `GET /v1/blocks/{PAGE_ID}/children` with an invalid Bearer token.<br>2. Repeat omitting `Authorization`. | Both return `401 Unauthorized`, `code: "unauthorized"`. | Negative | High |
| `TC_BLK_CHL_006` | Verify `400 Bad Request` when `Notion-Version` is missing | Valid `NOTION_TOKEN`. | 1. Omit `Notion-Version` and send `GET /v1/blocks/{PAGE_ID}/children`. | Status `400 Bad Request`. `code: "missing_version"`. | Negative | Medium |
| `TC_BLK_CHL_007` | Verify `403 Forbidden` without *Read content* capability | Restricted integration token. | 1. Send `GET /v1/blocks/{PAGE_ID}/children` with `<RESTRICTED_TOKEN>`. | Status `403 Forbidden`. `code: "restricted_resource"`. | Negative | Medium |
| `TC_BLK_CHL_008` | Verify `404 Not Found` for non-existent or non-shared `block_id` | Valid `NOTION_TOKEN`. | 1. Send `GET /v1/blocks/f47ac10b-58cc-4372-a567-0e02b2c3d479/children`. | Status `404 Not Found`. `code: "object_not_found"`. | Negative | High |
| `TC_BLK_CHL_009` | Verify `400 Bad Request` for invalid `block_id`, malformed `start_cursor`, and non-numeric `page_size` | Valid `NOTION_TOKEN`. | 1. Send `GET /v1/blocks/not-a-uuid/children`.<br>2. Send `GET .../children?start_cursor=invalid_cursor`.<br>3. Send `GET .../children?page_size=abc`. | All three return `400 Bad Request` with `code: "validation_error"`. | Negative | Medium |
| `TC_BLK_CHL_010` | Verify minimum pagination boundary (`page_size=1`) | Page with `>= 2` children. | 1. Send `GET /v1/blocks/{PAGE_ID}/children?page_size=1`. | Status `200 OK`. `results[]` length is exactly `1`, `has_more: true`, non-null `next_cursor`. | Boundary | High |
| `TC_BLK_CHL_011` | Verify maximum pagination boundary (`page_size=100`) | Page with `>= 101` children. | 1. Send `GET /v1/blocks/{PAGE_ID}/children?page_size=100`. | Status `200 OK`. `results[]` length is `100`, `has_more: true`, non-null `next_cursor`. | Boundary | Medium |
| `TC_BLK_CHL_012` | Verify out-of-range pagination values (`0`, `-1`, `101`) | Valid `NOTION_TOKEN`. | 1. Send `GET .../children?page_size=0`.<br>2. Send `GET .../children?page_size=-1`.<br>3. Send `GET .../children?page_size=101`. | All three return `400 Bad Request` with `object: "error"` and `code: "validation_error"`. | Boundary | High |
| `TC_BLK_CHL_013` | Verify exactly `100` vs `101` children boundary | Two pages: one with exactly `100` children, another with `101`. | 1. Send `GET /v1/blocks/{PAGE_100}/children?page_size=100`.<br>2. Send `GET /v1/blocks/{PAGE_101}/children?page_size=100`. | Step 1: `results[]` length `100`, `has_more: false`.<br>Step 2: `results[]` length `100`, `has_more: true`; following the cursor returns the remaining `1` block. | Boundary | Medium |
| `TC_BLK_CHL_014` | Verify compact 32-char UUID is accepted | Valid `NOTION_TOKEN`. | 1. Send `GET /v1/blocks/{compact_32_char_page_id}/children`. | Status `200 OK` with the same `results[]` as the hyphenated request. | Boundary | Low |

---

### Test Cases for PATCH /v1/blocks/{block_id} (Update a block)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_BLK_UPD_001` | Verify updating the text of a `paragraph` block | Valid `NOTION_TOKEN` with *Update content*; existing paragraph `BLOCK_ID`. | 1. Set `Authorization: Bearer <NOTION_TOKEN>`, `Notion-Version: 2025-09-03`, `Content-Type: application/json`.<br>2. Send `PATCH /v1/blocks/{BLOCK_ID}` with `{"paragraph": {"rich_text": [{"type": "text", "text": {"content": "Updated"}}]}}`. | Status `200 OK`. JSON body contains same `id`, `type: "paragraph"`, `paragraph.rich_text[0].text.content == "Updated"`, and updated `last_edited_time`. | Happy Path | High |
| `TC_BLK_UPD_002` | Verify toggling a `to_do` block's `checked` state | Existing `to_do` block `TODO_ID` with `checked: false`. | 1. Send `PATCH /v1/blocks/{TODO_ID}` with `{"to_do": {"checked": true}}`. | Status `200 OK`. `to_do.checked == true` and existing `rich_text` preserved. | Happy Path | Medium |
| `TC_BLK_UPD_003` | Verify moving a block to the trash and restoring it via `in_trash` | Existing `BLOCK_ID`. | 1. Send `PATCH` with `{"in_trash": true}`.<br>2. Send `PATCH` with `{"in_trash": false}`. | Step 1: `200 OK`, `in_trash: true`.<br>Step 2: `200 OK`, `in_trash: false`, same `id` and original content. | Happy Path | Medium |
| `TC_BLK_UPD_004` | Verify `401 Unauthorized` with invalid or missing token | None. | 1. Send `PATCH /v1/blocks/{BLOCK_ID}` with invalid Bearer token and valid body.<br>2. Repeat omitting `Authorization`. | Both return `401 Unauthorized`, `code: "unauthorized"`. Block unchanged. | Negative | High |
| `TC_BLK_UPD_005` | Verify `400 Bad Request` when `Notion-Version` is missing | Valid `NOTION_TOKEN`. | 1. Omit `Notion-Version` and send `PATCH /v1/blocks/{BLOCK_ID}` with a valid body. | Status `400 Bad Request`. `code: "missing_version"`. | Negative | Medium |
| `TC_BLK_UPD_006` | Verify `403 Forbidden` without *Update content* capability | Read-only integration token with `BLOCK_ID` shared. | 1. Send `PATCH /v1/blocks/{BLOCK_ID}` with `<READONLY_TOKEN>`. | Status `403 Forbidden`. `code: "restricted_resource"`. | Negative | Medium |
| `TC_BLK_UPD_007` | Verify `404 Not Found` for non-existent or non-shared block | Valid `NOTION_TOKEN`. | 1. Send `PATCH /v1/blocks/f47ac10b-58cc-4372-a567-0e02b2c3d479` with a valid body. | Status `404 Not Found`. `code: "object_not_found"`. | Negative | High |
| `TC_BLK_UPD_008` | Verify `400 Bad Request` for invalid `block_id` format | Valid `NOTION_TOKEN`. | 1. Send `PATCH /v1/blocks/not-a-valid-uuid` with a valid body. | Status `400 Bad Request`. `code: "validation_error"`. | Negative | High |
| `TC_BLK_UPD_009` | Verify mismatched payload type and invalid field types are rejected | Existing `paragraph` block `BLOCK_ID`. | 1. Send `PATCH` with `{"heading_1": {"rich_text": [...]}}` to the paragraph block.<br>2. Send `PATCH` to a `to_do` block with `{"to_do": {"checked": "yes"}}`.<br>3. Send `PATCH` with `{"type": "heading_1"}`. | All three return `400 Bad Request` with `code: "validation_error"`. Blocks unchanged (verified with `GET`). | Negative | High |
| `TC_BLK_UPD_010` | Verify `400 Bad Request` with malformed JSON | Valid `NOTION_TOKEN`. | 1. Send `PATCH /v1/blocks/{BLOCK_ID}` with raw body `{"paragraph": {`. | Status `400 Bad Request`. `code: "invalid_json"`. | Negative | Low |
| `TC_BLK_UPD_011` | Verify updating content of a trashed block is rejected | `TRASHED_BLOCK_ID` previously deleted. | 1. Send `PATCH /v1/blocks/{TRASHED_BLOCK_ID}` with new `paragraph.rich_text`. | Status `400 Bad Request`. `code: "validation_error"`. | Negative | Medium |
| `TC_BLK_UPD_012` | Verify `rich_text` length boundary (2000 vs 2001 characters) | Existing paragraph `BLOCK_ID`. | 1. Send `PATCH` with `text.content` of exactly `2000` characters.<br>2. Send `PATCH` with `2001` characters. | Step 1: `200 OK`.<br>Step 2: `400 Bad Request`, `code: "validation_error"`; block keeps the previous content. | Boundary | Medium |
| `TC_BLK_UPD_013` | Verify empty `rich_text` array and empty body boundaries | Existing paragraph `BLOCK_ID`. | 1. Send `PATCH` with `{"paragraph": {"rich_text": []}}`.<br>2. Send `PATCH` with `{}`. | Step 1: `200 OK`, empty paragraph.<br>Step 2: deterministic response, never `500` (`200 OK` unchanged or `400 validation_error`; behavior to be pinned after first execution). | Boundary | Low |
| `TC_BLK_UPD_014` | Verify UUID format boundaries (32-char compact, 31 and 33 chars) | Existing `BLOCK_ID`. | 1. Send `PATCH` using compact 32-char id.<br>2. Send `PATCH` using 31-char and 33-char ids. | Step 1: `200 OK`.<br>Step 2: `400 Bad Request`, `code: "validation_error"`. | Boundary | Low |

---

### Test Cases for DELETE /v1/blocks/{block_id} (Delete a block)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_BLK_DEL_001` | Verify successful deletion (soft delete) of an existing block | Valid `NOTION_TOKEN` with *Update content*; existing `BLOCK_ID`. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and `Notion-Version: 2025-09-03`.<br>2. Send `DELETE /v1/blocks/{BLOCK_ID}`. | Status `200 OK`. JSON body contains `object: "block"`, `id == BLOCK_ID`, and `in_trash: true` (`archived: true`). | Happy Path | High |
| `TC_BLK_DEL_002` | Verify deleted block no longer appears in parent's children list | `BLOCK_ID` deleted in `TC_BLK_DEL_001`. | 1. Send `GET /v1/blocks/{PAGE_ID}/children`. | Status `200 OK`. `results[]` does not contain `BLOCK_ID`. | Happy Path | High |
| `TC_BLK_DEL_003` | Verify deleting a block with nested children | `TOGGLE_ID` with nested children. | 1. Send `DELETE /v1/blocks/{TOGGLE_ID}`.<br>2. Send `GET /v1/blocks/{TOGGLE_ID}/children`. | Step 1: `200 OK`, `in_trash: true`.<br>Step 2: children are no longer reachable through the deleted parent (`400 validation_error` or empty list; behavior to be pinned after first execution). | Happy Path | Medium |
| `TC_BLK_DEL_004` | Verify `401 Unauthorized` with invalid or missing token | Existing `BLOCK_ID`. | 1. Send `DELETE /v1/blocks/{BLOCK_ID}` with an invalid Bearer token.<br>2. Repeat omitting `Authorization`. | Both return `401 Unauthorized`, `code: "unauthorized"`. Block remains active (verified with `GET`). | Negative | High |
| `TC_BLK_DEL_005` | Verify `400 Bad Request` when `Notion-Version` is missing | Valid `NOTION_TOKEN`; existing `BLOCK_ID`. | 1. Omit `Notion-Version` and send `DELETE /v1/blocks/{BLOCK_ID}`. | Status `400 Bad Request`. `code: "missing_version"`. Block remains active. | Negative | Medium |
| `TC_BLK_DEL_006` | Verify `403 Forbidden` without *Update content* capability | Read-only integration token. | 1. Send `DELETE /v1/blocks/{BLOCK_ID}` with `<READONLY_TOKEN>`. | Status `403 Forbidden`. `code: "restricted_resource"`. Block remains active. | Negative | Medium |
| `TC_BLK_DEL_007` | Verify `404 Not Found` for non-existent or non-shared block | Valid `NOTION_TOKEN`. | 1. Send `DELETE /v1/blocks/f47ac10b-58cc-4372-a567-0e02b2c3d479`. | Status `404 Not Found`. `code: "object_not_found"`. | Negative | High |
| `TC_BLK_DEL_008` | Verify `400 Bad Request` for invalid `block_id` | Valid `NOTION_TOKEN`. | 1. Send `DELETE /v1/blocks/invalid-block-id-123`. | Status `400 Bad Request`. `code: "validation_error"`. | Negative | High |
| `TC_BLK_DEL_009` | Verify idempotency boundary when deleting an already-deleted block | `BLOCK_ID` already deleted. | 1. Send `DELETE /v1/blocks/{BLOCK_ID}` a second time. | Deterministic response, never `500`: `200 OK` with `in_trash: true` or `400 validation_error` (behavior to be pinned after first execution). | Boundary | Medium |
| `TC_BLK_DEL_010` | Verify UUID boundaries (32-char compact, nil UUID, 31-char, 33-char) | Valid `NOTION_TOKEN`; existing `BLOCK_ID`. | 1. Send `DELETE` using compact 32-char id.<br>2. Send `DELETE /v1/blocks/00000000-0000-0000-0000-000000000000`.<br>3. Send `DELETE` with 31-char and 33-char ids. | Step 1: `200 OK`.<br>Step 2: `404 Not Found` (`object_not_found`).<br>Step 3: `400 Bad Request` (`validation_error`). | Boundary | Low |
| `TC_BLK_DEL_011` | Verify a deleted block can be restored | Block deleted via `DELETE`. | 1. Send `PATCH /v1/blocks/{BLOCK_ID}` with `{"in_trash": false}`.<br>2. Send `GET /v1/blocks/{BLOCK_ID}`. | Status `200 OK` on both. `in_trash: false`, same `id` and original content. | Boundary | Medium |

---

### End-to-End (E2E) Test Cases

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_E2E_BLK_001` | Full block lifecycle (`Append` → `Retrieve` → `Update` → `Delete` → `Verify`) | Valid `NOTION_TOKEN` with read/insert/update capabilities; `PAGE_ID` shared with the integration. | 1. Call `PATCH /v1/blocks/{PAGE_ID}/children` with one `paragraph`; store `block_id`.<br>2. Call `GET /v1/blocks/{block_id}`.<br>3. Call `PATCH /v1/blocks/{block_id}` with new text.<br>4. Call `GET /v1/blocks/{block_id}`.<br>5. Call `DELETE /v1/blocks/{block_id}`.<br>6. Call `GET /v1/blocks/{PAGE_ID}/children` and `GET /v1/blocks/{block_id}`. | Step 1: `200 OK` with new `id`.<br>Step 2: `200 OK`, original text, `parent.page_id == PAGE_ID`.<br>Step 3: `200 OK`.<br>Step 4: new text persisted.<br>Step 5: `200 OK`, `in_trash: true`.<br>Step 6: block absent from children list; direct `GET` shows `in_trash: true`. | E2E | High |
| `TC_E2E_BLK_002` | Nested tree construction and paginated traversal (`Append 100` → `Append 1` → `Append nested` → `Traverse` → `Verify`) | Valid `NOTION_TOKEN`; empty shared `PAGE_ID`. | 1. Call `PATCH /v1/blocks/{PAGE_ID}/children` with 100 blocks (one is a `toggle`).<br>2. Call `PATCH` again with 1 additional block.<br>3. Call `PATCH /v1/blocks/{toggle_id}/children` with 2 nested paragraphs.<br>4. Call `GET /v1/blocks/{PAGE_ID}/children?page_size=50` and follow `next_cursor` until `has_more: false`.<br>5. Call `GET /v1/blocks/{toggle_id}` and `GET /v1/blocks/{toggle_id}/children`. | Steps 1–3: `200 OK`.<br>Step 4: exactly `101` first-level blocks collected across 3 pages, no duplicates, insertion order preserved.<br>Step 5: toggle has `has_children: true` and exactly 2 children. | E2E | High |
| `TC_E2E_BLK_003` | Ordered insertion, delete and restore (`Append A,C` → `Insert B after A` → `Delete B` → `Restore B`) | Valid `NOTION_TOKEN`; empty shared `PAGE_ID`. | 1. Call `PATCH /v1/blocks/{PAGE_ID}/children` with paragraphs `A` and `C`; store `A_id`.<br>2. Call `PATCH` with paragraph `B` and `"after": "<A_id>"`.<br>3. Call `GET /v1/blocks/{PAGE_ID}/children`.<br>4. Call `DELETE /v1/blocks/{B_id}` and re-list children.<br>5. Call `PATCH /v1/blocks/{B_id}` with `{"in_trash": false}` and re-list children. | Step 3: order `A, B, C`.<br>Step 4: `200 OK`, order `A, C`.<br>Step 5: `200 OK`, `B` back with original content and `in_trash: false`. | E2E | Medium |
| `TC_E2E_BLK_004` | Capability enforcement across block operations (`Read-only token` → `Denied writes` → `Unchanged content`) | Read-only integration token with `PAGE_ID` shared; block `BLOCK_ID` exists. | 1. Call `GET /v1/blocks/{BLOCK_ID}` and `GET /v1/blocks/{PAGE_ID}/children` with the read-only token.<br>2. Call `PATCH /v1/blocks/{PAGE_ID}/children`, `PATCH /v1/blocks/{BLOCK_ID}` and `DELETE /v1/blocks/{BLOCK_ID}` with the read-only token.<br>3. Call `GET /v1/blocks/{BLOCK_ID}` with the full-access token. | Step 1: `200 OK`.<br>Step 2: all three return `403 Forbidden` (`restricted_resource`).<br>Step 3: `200 OK`, block content unchanged and `in_trash: false`. | E2E | Medium |
