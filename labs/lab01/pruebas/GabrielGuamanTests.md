# Notion REST API (`2025-09-03`) — Users & OAuth Modules
**Author:** Gabriel Marcos Guaman Ortuño  
**System Under Test (SUT):** Notion Public REST API v1 (`https://api.notion.com/v1/`)  
**Contract Version:** `Notion-Version: 2025-09-03`  
**Assigned Postman Collection Modules:** `Users` and `OAuth`

---

## PART 1: User Stories & Acceptance Criteria

### User Story: API GET /v1/users/me (Retrieve your token's bot user)

> *As a developer/integration user of the Notion API, I want to retrieve the bot user profile associated with my active authentication token via `GET /v1/users/me` so that I can verify token health, identify the integration's bot metadata, and inspect workspace-level configuration limits before executing automated workflows.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `GET` request to `/v1/users/me` with a valid `Authorization: Bearer <NOTION_TOKEN>` header and `Notion-Version: 2025-09-03`, the API must respond with HTTP `200 OK` and return a JSON payload where `object` is `"user"`, `type` is `"bot"`, `id` is a valid canonical `UUIDv4`, and the `bot` object includes `owner` and `workspace_name` metadata.
- **As a user**, when I authenticate using a valid OAuth 2.0 `access_token` issued for a public integration and call `GET /v1/users/me`, the API must respond with HTTP `200 OK` and return the bot `user` object tied to that specific authorized workspace installation, including `bot.workspace_limits.max_file_upload_size_in_bytes`.

#### **Negative Scenarios**
- **As a user**, when I send a `GET` request to `/v1/users/me` with an invalid, malformed, expired, or revoked Bearer token, the API must reject the request with HTTP `401 Unauthorized` and return an error object containing `object: "error"`, `status: 401`, and `code: "unauthorized"`.
- **As a user**, when I send a `GET` request to `/v1/users/me` omitting the `Authorization` header completely, the API must respond with HTTP `401 Unauthorized` and `code: "unauthorized"`.
- **As a user**, when I send a `GET` request to `/v1/users/me` without the required `Notion-Version: 2025-09-03` header, the API must reject the request with HTTP `400 Bad Request` and return `object: "error"` with `code: "missing_version"`.
- **As a user**, when I send a `GET` request to `/v1/users/me` with an unsupported or malformed `Notion-Version` header value (e.g., `Notion-Version: 9999-99-99`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I exceed the integration rate limit threshold (~3 requests/second sustained burst) on `GET /v1/users/me`, the API must respond with HTTP `429 Too Many Requests`, `code: "rate_limited"`, and include a `Retry-After` response header.

#### **Boundary Cases**
- **As a user**, when I send a `GET` request to `/v1/users/me` with an empty Bearer credential (`Authorization: Bearer ` followed only by whitespace), the API must treat the credential as missing/invalid and respond with HTTP `401 Unauthorized` (`code: "unauthorized"`).
- **As a user**, when I inspect the `bot.workspace_limits` object returned by `GET /v1/users/me`, the `max_file_upload_size_in_bytes` attribute must be a strictly positive integer (`> 0`) matching the workspace plan tier boundary.

---

### User Story: API GET /v1/users/{user_id} (Retrieve a user)

> *As a developer/integration user of the Notion API, I want to retrieve the profile details of a specific workspace user or bot by their unique `user_id` via `GET /v1/users/{user_id}` so that I can resolve user identities, display names, avatars, and ownership attributes referenced across pages, comments, and data sources.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` with a valid `Bearer` token (having *Read user information* capability), `Notion-Version: 2025-09-03`, and an existing member's `user_id`, the API must respond with HTTP `200 OK` and return `object: "user"`, `id` matching the target UUID, `type: "person"` (with `person.email` if email capability is enabled), `name`, and `avatar_url`.
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` passing the UUID of an existing workspace bot user, the API must respond with HTTP `200 OK` and return `object: "user"` with `type: "bot"`.

#### **Negative Scenarios**
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` with a syntactically invalid UUID path parameter (e.g., `invalid-user-id-123`), the API must respond with HTTP `400 Bad Request` and return `object: "error"` with `code: "validation_error"`.
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` using a well-formed `UUIDv4` that does not correspond to any user in the workspace, the API must respond with HTTP `404 Not Found` and `code: "object_not_found"`.
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` with an invalid or revoked Bearer token, the API must respond with HTTP `401 Unauthorized` and `code: "unauthorized"`.
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` using an integration token that has *No user information* capability configured, the API must respond with HTTP `403 Forbidden` and `code: "restricted_resource"`.
- **As a user**, when I omit the `Notion-Version: 2025-09-03` header on `GET /v1/users/{user_id}`, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.

#### **Boundary Cases**
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` passing a valid 32-character hexadecimal UUID **without hyphens** (e.g., `e79a0b743aba41499f740bb5791a6ee6`) vs. a 36-character canonical `UUIDv4` **with hyphens** (`e79a0b74-3aba-4149-9f74-0bb5791a6ee6`), the API must accept both formats (`200 OK`) and normalize the `id` in the response payload to the hyphenated 36-character `UUIDv4` format.
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` with an all-zero nil UUID (`00000000-0000-0000-0000-000000000000`), the API must handle the boundary UUID cleanly and return HTTP `404 Not Found` (`code: "object_not_found"`).
- **As a user**, when I send a `GET` request to `/v1/users/{user_id}` with a 31-character (off-by-one short) or 33-character (off-by-one long) hexadecimal string, the API must reject the path parameter with HTTP `400 Bad Request` (`code: "validation_error"`).

---

### User Story: API GET /v1/users (List all users)

> *As a developer/integration user of the Notion API, I want to retrieve a paginated list of all workspace members and bots via `GET /v1/users` so that I can synchronize workspace directories, map user identifiers in bulk, and traverse large user sets reliably using cursor-based pagination.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `GET` request to `/v1/users` with a valid `Bearer` token (with *Read user information* capability) and `Notion-Version: 2025-09-03`, the API must respond with HTTP `200 OK` and return a paginated list object containing `object: "list"`, `type: "user"`, `results[]` (an array of `person` and `bot` user objects, excluding workspace guests), `has_more` (boolean), and `next_cursor` (string or `null`).
- **As a user**, when `has_more` is `true` on an initial `GET /v1/users` call and I send a subsequent `GET` request with `start_cursor=<next_cursor>`, the API must respond with HTTP `200 OK` and return the next non-overlapping page of user records in `results[]`.

#### **Negative Scenarios**
- **As a user**, when I send a `GET` request to `/v1/users` with an invalid, expired, or revoked Bearer token, the API must respond with HTTP `401 Unauthorized` and `code: "unauthorized"`.
- **As a user**, when I send a `GET` request to `/v1/users` without the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I send a `GET` request to `/v1/users` with a malformed or non-UUID `start_cursor` query parameter (e.g., `?start_cursor=invalid_cursor`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I send a `GET` request to `/v1/users` with a non-integer `page_size` query parameter (e.g., `?page_size=abc`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I send a `GET` request to `/v1/users` using an integration token lacking *Read user information* capability, the API must respond with HTTP `403 Forbidden` and `code: "restricted_resource"`.

#### **Boundary Cases**
- **As a user**, when I send a `GET` request to `/v1/users?page_size=1` (minimum allowed page size), the API must respond with HTTP `200 OK`, return `results[]` with length `<= 1`, and populate `has_more: true` along with a non-null `next_cursor` if more than 1 user exists in the workspace.
- **As a user**, when I send a `GET` request to `/v1/users?page_size=100` (maximum allowed page size), the API must respond with HTTP `200 OK` and return up to `100` user objects in `results[]`.
- **As a user**, when I send a `GET` request to `/v1/users?page_size=0` or `/v1/users?page_size=-1` (below minimum boundary), the API must reject the request with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I send a `GET` request to `/v1/users?page_size=101` (above maximum boundary), the API must reject the request with HTTP `400 Bad Request` and `code: "validation_error"`.

---

### User Story: API POST /v1/oauth/token (Token)

> *As a developer/integration user of the Notion API, I want to exchange a temporary OAuth authorization code or an active refresh token for an `access_token` via `POST /v1/oauth/token` so that my public integration can securely authenticate on behalf of a workspace and maintain uninterrupted session continuity through token rotation.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `POST` request to `/v1/oauth/token` authenticated via HTTP Basic Auth (`Authorization: Basic base64(client_id:client_secret)`), header `Notion-Version: 2025-09-03`, `Content-Type: application/json`, and a valid JSON payload containing `grant_type: "authorization_code"`, a valid unused `code`, and the matching `redirect_uri`, the API must respond with HTTP `200 OK` and return `access_token`, `token_type: "bearer"`, `refresh_token`, `bot_id`, `workspace_id`, `workspace_name`, and `owner`.
- **As a user**, when I send a `POST` request to `/v1/oauth/token` with valid Basic Auth credentials and a JSON body containing `grant_type: "refresh_token"` and an active `refresh_token`, the API must respond with HTTP `200 OK` and issue a newly rotated `access_token` and `refresh_token` pair.

#### **Negative Scenarios**
- **As a user**, when I send a `POST` request to `/v1/oauth/token` with invalid `client_id` or `client_secret` in the `Authorization: Basic` header (or without the `Authorization` header), the API must reject the request with HTTP `401 Unauthorized` (`error: "invalid_client"` / `code: "unauthorized"`).
- **As a user**, when I send a `POST` request to `/v1/oauth/token` without the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I send a `POST` request to `/v1/oauth/token` with an expired, forged, or already-redeemed `code` (or an invalid/revoked `refresh_token`), the API must reject the request with HTTP `400 Bad Request` and return `error: "invalid_grant"`.
- **As a user**, when I send a `POST` request to `/v1/oauth/token` with an unsupported `grant_type` (e.g., `"client_credentials"` or `"password"`), the API must respond with HTTP `400 Bad Request` (`error: "unsupported_grant_type"` / `code: "validation_error"`).
- **As a user**, when I send a `POST` request to `/v1/oauth/token` omitting required body attributes (such as missing `grant_type`, missing `code` for `authorization_code`, or mismatched `redirect_uri`), the API must respond with HTTP `400 Bad Request` (`error: "invalid_request"` / `error: "invalid_grant"`).

#### **Boundary Cases**
- **As a user**, when I send a `POST` request to `/v1/oauth/token` with empty strings for required properties (`{"grant_type": "", "code": "", "redirect_uri": ""}`) or an empty JSON object (`{}`), the API must reject the payload with HTTP `400 Bad Request`.
- **As a user**, when I attempt to exchange the exact same single-use `authorization_code` a second time immediately after a successful `200 OK` exchange (replay boundary `N = 2`), the API must reject the second attempt with HTTP `400 Bad Request` (`error: "invalid_grant"`).

---

### User Story: API POST /v1/oauth/revoke (Revoke)

> *As a developer/integration user of the Notion API, I want to programmatically revoke an active OAuth access token via `POST /v1/oauth/revoke` so that I can immediately terminate workspace access upon user offboarding, integration disconnection, or suspected credential compromise.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `POST` request to `/v1/oauth/revoke` with valid HTTP Basic Auth credentials (`Authorization: Basic base64(client_id:client_secret)`), `Notion-Version: 2025-09-03`, `Content-Type: application/json`, and a valid body `{"token": "<active_access_token>"}`, the API must respond with HTTP `200 OK` and immediately invalidate the specified token across all Notion API endpoints.

#### **Negative Scenarios**
- **As a user**, when I send a `POST` request to `/v1/oauth/revoke` with invalid, malformed, or missing Basic Auth client credentials, the API must respond with HTTP `401 Unauthorized` (`error: "invalid_client"` / `code: "unauthorized"`).
- **As a user**, when I send a `POST` request to `/v1/oauth/revoke` omitting the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I send a `POST` request to `/v1/oauth/revoke` missing the required `token` field in the JSON body (`{}`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I send a `POST` request to `/v1/oauth/revoke` with malformed JSON syntax in the request payload, the API must respond with HTTP `400 Bad Request` and `code: "invalid_json"`.

#### **Boundary Cases**
- **As a user**, when I send a `POST` request to `/v1/oauth/revoke` with an empty string `{"token": ""}` or whitespace-only string `{"token": "   "}`, the API must reject the empty boundary input with HTTP `400 Bad Request` (`code: "validation_error"`).
- **As a user**, when I send a `POST` request to `/v1/oauth/revoke` targeting an `access_token` that has already been revoked previously (idempotency boundary per RFC 7009), the API must process the request gracefully and respond with HTTP `200 OK` without throwing a `500` server error, keeping the token inactive.

---

### User Story: API POST /v1/oauth/introspect (Introspect)

> *As a developer/integration user of the Notion API, I want to inspect the validity, active state, and metadata of an OAuth token via `POST /v1/oauth/introspect` so that my backend services can verify whether a stored token is still active and audit its workspace/bot bindings without triggering unintended business operations.*

### Acceptance Criteria:

#### **Happy Path**
- **As a user**, when I send a `POST` request to `/v1/oauth/introspect` with valid HTTP Basic Auth credentials (`Authorization: Basic base64(client_id:client_secret)`), `Notion-Version: 2025-09-03`, `Content-Type: application/json`, and `{"token": "<active_access_token>"}`, the API must respond with HTTP `200 OK` and return a JSON payload with `active: true` along with token metadata (`iat` timestamp and `request_id` / scope details).
- **As a user**, when I send a `POST` request to `/v1/oauth/introspect` with valid Basic Auth credentials and a `token` that has been revoked, expired, or is unknown, the API must respond with HTTP `200 OK` and return `active: false` in compliance with RFC 7662.

#### **Negative Scenarios**
- **As a user**, when I send a `POST` request to `/v1/oauth/introspect` with invalid or missing HTTP Basic Auth credentials, the API must reject the request with HTTP `401 Unauthorized` (`error: "invalid_client"` / `code: "unauthorized"`).
- **As a user**, when I send a `POST` request to `/v1/oauth/introspect` without the `Notion-Version: 2025-09-03` header, the API must respond with HTTP `400 Bad Request` and `code: "missing_version"`.
- **As a user**, when I send a `POST` request to `/v1/oauth/introspect` omitting the `token` field in the JSON body (`{}`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.
- **As a user**, when I send a `POST` request to `/v1/oauth/introspect` passing a non-string data type for `token` (e.g., `{"token": 12345}` or `{"token": null}`), the API must respond with HTTP `400 Bad Request` and `code: "validation_error"`.

#### **Boundary Cases**
- **As a user**, when I send a `POST` request to `/v1/oauth/introspect` with an empty string `{"token": ""}`, the API must reject the empty boundary value with HTTP `400 Bad Request` (`code: "validation_error"`).
- **As a user**, when I send a `POST` request to `/v1/oauth/introspect` with an oversized random string payload (`2048` characters) in `token`, the API must safely handle the upper length boundary by returning HTTP `200 OK` with `active: false` (or `400 validation_error`) without server degradation (`500`).
- **As a user**, when I introspect an `access_token` immediately (`0 ms` delay) after revoking it via `POST /v1/oauth/revoke`, `POST /v1/oauth/introspect` must deterministically reflect the state transition from `active: true` to `active: false`.

---

### End-to-End (E2E) Acceptance Criteria for Users & OAuth

#### **Scenario 1: Full OAuth Token Lifecycle & Bot Identity Verification**
- **As a user**, when I execute a complete OAuth 2.0 credential lifecycle:
  1. Exchange a valid authorization code via `POST /v1/oauth/token` (`200 OK`) to obtain a fresh `access_token` and `bot_id`;
  2. Inspect the issued `access_token` via `POST /v1/oauth/introspect` (`200 OK`) and confirm `active: true`;
  3. Authenticate with `Authorization: Bearer <access_token>` on `GET /v1/users/me` (`200 OK`) and verify that the returned `id` (`object: "user"`, `type: "bot"`) matches the `bot_id` from step 1;
  4. Revoke the `access_token` via `POST /v1/oauth/revoke` (`200 OK`); and
  5. Re-inspect the token via `POST /v1/oauth/introspect` (`200 OK`, `active: false`) and re-invoke `GET /v1/users/me` with the revoked token,
  then the final `GET /v1/users/me` request must be strictly denied with HTTP `401 Unauthorized` (`code: "unauthorized"`), proving end-to-end enforcement of token issuance, identity binding, introspection, and revocation.

#### **Scenario 2: Workspace Users Discovery & Individual Profile Inspection**
- **As a user**, when I execute a complete workspace user discovery and access-control flow:
  1. Query `GET /v1/users?page_size=1` (`200 OK`, `object: "list"`) using an active token to validate cursor pagination (`has_more`, `next_cursor`) and extract a valid `user_id` from `results[0].id`;
  2. Retrieve the full profile of that extracted `user_id` via `GET /v1/users/{user_id}` (`200 OK`) in both hyphenated `UUIDv4` and compact 32-character hex formats, confirming consistent attributes (`id`, `name`, `type`); and
  3. Attempt to access `GET /v1/users` and `GET /v1/users/{user_id}` using a revoked or unauthorized token,
  then both unauthorized calls must fail deterministically with HTTP `401 Unauthorized` (`code: "unauthorized"`), ensuring end-to-end data consistency and workspace privacy protection.

---

## PART 2: API Test Cases Tables

### Test Cases for GET /v1/users/me (Retrieve your token's bot user)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_USR_ME_001` | Verify successful retrieval of the integration's bot user profile with a valid Internal Integration Token | Valid active `NOTION_TOKEN` exists in the test workspace. | 1. Set header `Authorization: Bearer <NOTION_TOKEN>`.<br>2. Set header `Notion-Version: 2025-09-03`.<br>3. Send `GET` request to `/v1/users/me`. | Status `200 OK`. JSON body contains `object: "user"`, valid `id` (`UUIDv4`), `type: "bot"`, non-empty `name`, and `bot.owner` metadata. | Happy Path | High |
| `TC_USR_ME_002` | Verify successful retrieval of bot user profile and workspace upload limits using an OAuth `access_token` | Active OAuth `access_token` issued via `/v1/oauth/token`. | 1. Set header `Authorization: Bearer <OAUTH_ACCESS_TOKEN>`.<br>2. Set header `Notion-Version: 2025-09-03`.<br>3. Send `GET` request to `/v1/users/me`. | Status `200 OK`. JSON body contains `object: "user"`, `type: "bot"`, `bot.workspace_name`, and `bot.workspace_limits.max_file_upload_size_in_bytes > 0`. | Happy Path | High |
| `TC_USR_ME_003` | Verify rejection when sending an invalid or forged Bearer token | None. | 1. Set header `Authorization: Bearer ntn_invalid_token_99999`.<br>2. Set header `Notion-Version: 2025-09-03`.<br>3. Send `GET` request to `/v1/users/me`. | Status `401 Unauthorized`. JSON body contains `object: "error"`, `status: 401`, and `code: "unauthorized"`. | Negative | High |
| `TC_USR_ME_004` | Verify rejection when `Authorization` header is completely omitted | None. | 1. Omit `Authorization` header.<br>2. Set header `Notion-Version: 2025-09-03`.<br>3. Send `GET` request to `/v1/users/me`. | Status `401 Unauthorized`. JSON body contains `object: "error"`, `status: 401`, and `code: "unauthorized"`. | Negative | High |
| `TC_USR_ME_005` | Verify contract enforcement when `Notion-Version` header is missing | Valid active `NOTION_TOKEN` exists. | 1. Set header `Authorization: Bearer <NOTION_TOKEN>`.<br>2. Omit `Notion-Version` header.<br>3. Send `GET` request to `/v1/users/me`. | Status `400 Bad Request`. JSON body contains `object: "error"`, `status: 400`, and `code: "missing_version"`. | Negative | High |
| `TC_USR_ME_006` | Verify validation failure when `Notion-Version` header has an unsupported version string | Valid active `NOTION_TOKEN` exists. | 1. Set header `Authorization: Bearer <NOTION_TOKEN>`.<br>2. Set header `Notion-Version: 2099-01-01`.<br>3. Send `GET` request to `/v1/users/me`. | Status `400 Bad Request`. JSON body contains `object: "error"`, `status: 400`, and `code: "validation_error"`. | Negative | Medium |
| `TC_USR_ME_007` | Verify boundary behavior when `Authorization` header contains `Bearer` with empty/whitespace token | None. | 1. Set header `Authorization: Bearer    `.<br>2. Set header `Notion-Version: 2025-09-03`.<br>3. Send `GET` request to `/v1/users/me`. | Status `401 Unauthorized`. JSON body contains `object: "error"`, `status: 401`, and `code: "unauthorized"`. | Boundary | Medium |
| `TC_USR_ME_008` | Verify rate limiting response when exceeding sustained request burst threshold | Valid active `NOTION_TOKEN` exists. | 1. Set valid `Authorization` and `Notion-Version: 2025-09-03` headers.<br>2. Dispatch rapid concurrent burst (`> 15` parallel requests/sec) to `GET /v1/users/me`. | Status `429 Too Many Requests` on throttled calls. JSON body contains `object: "error"`, `code: "rate_limited"`, and response includes `Retry-After` header. | Boundary | Low |

---

### Test Cases for GET /v1/users/{user_id} (Retrieve a user)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_USR_GET_001` | Verify retrieval of an existing workspace member (`person`) using canonical hyphenated `UUIDv4` | Valid `NOTION_TOKEN` with *Read user information* capability; valid member `USER_ID` exists. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and `Notion-Version: 2025-09-03`.<br>2. Send `GET` request to `/v1/users/{user_id}` with 36-char hyphenated `UUIDv4`. | Status `200 OK`. JSON body contains `object: "user"`, `id` matching `{user_id}`, `type: "person"`, `name`, and `person` object (`person.email` if permitted). | Happy Path | High |
| `TC_USR_GET_002` | Verify retrieval of an existing bot user by `user_id` | Valid `NOTION_TOKEN` with *Read user information* capability; valid bot `BOT_USER_ID` exists. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and `Notion-Version: 2025-09-03`.<br>2. Send `GET` request to `/v1/users/{bot_user_id}`. | Status `200 OK`. JSON body contains `object: "user"`, `id` matching `{bot_user_id}`, and `type: "bot"`. | Happy Path | Medium |
| `TC_USR_GET_003` | Verify error response when `{user_id}` has an invalid non-UUID format | Valid `NOTION_TOKEN` exists. | 1. Set valid `Authorization` and `Notion-Version: 2025-09-03` headers.<br>2. Send `GET` request to `/v1/users/not-a-valid-uuid-123`. | Status `400 Bad Request`. JSON body contains `object: "error"`, `status: 400`, and `code: "validation_error"`. | Negative | High |
| `TC_USR_GET_004` | Verify `404 Not Found` when `{user_id}` is a well-formed `UUIDv4` not present in the workspace | Valid `NOTION_TOKEN` with *Read user information* capability. | 1. Set valid `Authorization` and `Notion-Version: 2025-09-03` headers.<br>2. Send `GET` request to `/v1/users/f47ac10b-58cc-4372-a567-0e02b2c3d479` (unassigned UUID). | Status `404 Not Found`. JSON body contains `object: "error"`, `status: 404`, and `code: "object_not_found"`. | Negative | High |
| `TC_USR_GET_005` | Verify `401 Unauthorized` when querying `{user_id}` with an invalid Bearer token | Valid `USER_ID` exists. | 1. Set `Authorization: Bearer invalid_secret_token` and `Notion-Version: 2025-09-03`.<br>2. Send `GET` request to `/v1/users/{user_id}`. | Status `401 Unauthorized`. JSON body contains `object: "error"` and `code: "unauthorized"`. | Negative | High |
| `TC_USR_GET_006` | Verify `403 Forbidden` when integration lacks *Read user information* capability | Valid secondary integration token configured with *No user information* capability. | 1. Set `Authorization: Bearer <RESTRICTED_TOKEN>` and `Notion-Version: 2025-09-03`.<br>2. Send `GET` request to `/v1/users/{user_id}`. | Status `403 Forbidden`. JSON body contains `object: "error"`, `status: 403`, and `code: "restricted_resource"`. | Negative | Medium |
| `TC_USR_GET_007` | Verify `400 Bad Request` when `Notion-Version` header is omitted | Valid `NOTION_TOKEN` and `USER_ID` exist. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and omit `Notion-Version`.<br>2. Send `GET` request to `/v1/users/{user_id}`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "missing_version"`. | Negative | Medium |
| `TC_USR_GET_008` | Verify UUID format boundary using compact 32-character hex string without hyphens | Valid `NOTION_TOKEN` and valid `USER_ID` exist. | 1. Strip hyphens from `{user_id}` to form a 32-char hex string.<br>2. Send `GET` request to `/v1/users/{compact_32_char_id}` with `Notion-Version: 2025-09-03`. | Status `200 OK`. JSON body returns `object: "user"` with `id` normalized to canonical 36-char hyphenated `UUIDv4`. | Boundary | Medium |
| `TC_USR_GET_009` | Verify UUID length and nil-value boundaries (`00000000-0000-0000-0000-000000000000` and 31-char hex) | Valid `NOTION_TOKEN` exists. | 1. Send `GET` to `/v1/users/00000000-0000-0000-0000-000000000000`.<br>2. Send `GET` to `/v1/users/e79a0b743aba41499f740bb5791a6ee` (31 chars). | Step 1 returns `404 Not Found` (`code: "object_not_found"`).<br>Step 2 returns `400 Bad Request` (`code: "validation_error"`). | Boundary | Low |

---

### Test Cases for GET /v1/users (List all users)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_USR_LIST_001` | Verify listing all workspace users with default pagination parameters | Valid `NOTION_TOKEN` with *Read user information* capability; workspace has `>= 1` member and `1` bot. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and `Notion-Version: 2025-09-03`.<br>2. Send `GET` request to `/v1/users`. | Status `200 OK`. JSON body contains `object: "list"`, `type: "user"`, non-empty `results[]` array of `user` objects, boolean `has_more`, and `next_cursor`. | Happy Path | High |
| `TC_USR_LIST_002` | Verify cursor-based pagination traversal using `start_cursor` | Workspace contains `>= 2` accessible users (`person` + `bot`). | 1. Send `GET /v1/users?page_size=1` and capture `next_cursor`.<br>2. Send `GET /v1/users?page_size=1&start_cursor=<next_cursor>` with `Notion-Version: 2025-09-03`. | Status `200 OK` on both requests. Second response returns `object: "list"` where `results[0].id` differs from the first page's `results[0].id`. | Happy Path | High |
| `TC_USR_LIST_003` | Verify `401 Unauthorized` when listing users with an invalid or expired token | None. | 1. Set `Authorization: Bearer expired_or_invalid_token` and `Notion-Version: 2025-09-03`.<br>2. Send `GET` request to `/v1/users`. | Status `401 Unauthorized`. JSON body contains `object: "error"`, `status: 401`, and `code: "unauthorized"`. | Negative | High |
| `TC_USR_LIST_004` | Verify `400 Bad Request` when `Notion-Version` header is missing on `/v1/users` | Valid `NOTION_TOKEN` exists. | 1. Set `Authorization: Bearer <NOTION_TOKEN>` and omit `Notion-Version`.<br>2. Send `GET` request to `/v1/users`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "missing_version"`. | Negative | Medium |
| `TC_USR_LIST_005` | Verify validation error when `start_cursor` is malformed | Valid `NOTION_TOKEN` exists. | 1. Set valid `Authorization` and `Notion-Version: 2025-09-03` headers.<br>2. Send `GET` request to `/v1/users?start_cursor=malformed_cursor_xyz`. | Status `400 Bad Request`. JSON body contains `object: "error"`, `status: 400`, and `code: "validation_error"`. | Negative | Medium |
| `TC_USR_LIST_006` | Verify validation error when `page_size` is non-numeric | Valid `NOTION_TOKEN` exists. | 1. Set valid `Authorization` and `Notion-Version: 2025-09-03` headers.<br>2. Send `GET` request to `/v1/users?page_size=ten`. | Status `400 Bad Request`. JSON body contains `object: "error"`, `status: 400`, and `code: "validation_error"`. | Negative | Medium |
| `TC_USR_LIST_007` | Verify minimum valid pagination boundary (`page_size=1`) | Valid `NOTION_TOKEN`; workspace has `>= 2` users. | 1. Set valid `Authorization` and `Notion-Version: 2025-09-03` headers.<br>2. Send `GET` request to `/v1/users?page_size=1`. | Status `200 OK`. `results[]` contains exactly `1` user object, `has_more` is `true`, and `next_cursor` is a valid non-null UUID string. | Boundary | High |
| `TC_USR_LIST_008` | Verify maximum valid pagination boundary (`page_size=100`) | Valid `NOTION_TOKEN` exists. | 1. Set valid `Authorization` and `Notion-Version: 2025-09-03` headers.<br>2. Send `GET` request to `/v1/users?page_size=100`. | Status `200 OK`. `object: "list"`, `results[]` length is `<= 100`, and pagination fields (`has_more`, `next_cursor`) are properly populated. | Boundary | Medium |
| `TC_USR_LIST_009` | Verify out-of-bounds pagination values (`page_size=0` and `page_size=101`) | Valid `NOTION_TOKEN` exists. | 1. Send `GET /v1/users?page_size=0` with valid headers.<br>2. Send `GET /v1/users?page_size=101` with valid headers. | Both requests return Status `400 Bad Request` with `object: "error"` and `code: "validation_error"`. | Boundary | High |

---

### Test Cases for POST /v1/oauth/token (Token)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_OAUTH_TOK_001` | Verify exchanging a valid `authorization_code` for an `access_token` and `refresh_token` | Public Notion OAuth integration configured (`CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`); fresh unused `AUTH_CODE` generated. | 1. Set `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`, `Notion-Version: 2025-09-03`, and `Content-Type: application/json`.<br>2. Send `POST /v1/oauth/token` with `{"grant_type": "authorization_code", "code": "<AUTH_CODE>", "redirect_uri": "<REDIRECT_URI>"}`. | Status `200 OK`. JSON body contains non-empty `access_token`, `token_type: "bearer"`, `refresh_token`, `bot_id`, `workspace_id`, `workspace_name`, and `owner`. | Happy Path | High |
| `TC_OAUTH_TOK_002` | Verify token rotation using `grant_type: "refresh_token"` | Valid active `REFRESH_TOKEN` previously issued by `/v1/oauth/token`. | 1. Set valid `Authorization: Basic`, `Notion-Version: 2025-09-03`, and `Content-Type: application/json`.<br>2. Send `POST /v1/oauth/token` with `{"grant_type": "refresh_token", "refresh_token": "<REFRESH_TOKEN>"}`. | Status `200 OK`. JSON body returns a newly rotated `access_token`, `refresh_token`, `token_type: "bearer"`, and `bot_id`. | Happy Path | High |
| `TC_OAUTH_TOK_003` | Verify `401 Unauthorized` when Basic Auth `client_id` or `client_secret` is invalid | None. | 1. Set `Authorization: Basic base64(invalid_id:wrong_secret)` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/token` with `{"grant_type": "authorization_code", "code": "any_code"}`. | Status `401 Unauthorized`. JSON body contains `error: "invalid_client"` (or `code: "unauthorized"`). | Negative | High |
| `TC_OAUTH_TOK_004` | Verify `400 Bad Request` when `code` is invalid or expired | Valid OAuth `CLIENT_ID` and `CLIENT_SECRET`. | 1. Set valid `Authorization: Basic` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/token` with `{"grant_type": "authorization_code", "code": "expired_or_fake_code_001", "redirect_uri": "<REDIRECT_URI>"}`. | Status `400 Bad Request`. JSON body contains `error: "invalid_grant"`. | Negative | High |
| `TC_OAUTH_TOK_005` | Verify `400 Bad Request` when `grant_type` is unsupported | Valid OAuth `CLIENT_ID` and `CLIENT_SECRET`. | 1. Set valid `Authorization: Basic` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/token` with `{"grant_type": "client_credentials"}`. | Status `400 Bad Request`. JSON body contains `error: "unsupported_grant_type"` (or `code: "validation_error"`). | Negative | Medium |
| `TC_OAUTH_TOK_006` | Verify `400 Bad Request` when `redirect_uri` does not match the registered authorization URI | Valid OAuth `CLIENT_ID`, `CLIENT_SECRET`, and `AUTH_CODE`. | 1. Set valid `Authorization: Basic` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/token` with `{"grant_type": "authorization_code", "code": "<AUTH_CODE>", "redirect_uri": "https://unregistered.example.com/callback"}`. | Status `400 Bad Request`. JSON body contains `error: "invalid_grant"` (or `error: "invalid_request"`). | Negative | Medium |
| `TC_OAUTH_TOK_007` | Verify `400 Bad Request` when `Notion-Version: 2025-09-03` header is omitted | Valid OAuth `CLIENT_ID` and `CLIENT_SECRET`. | 1. Set valid `Authorization: Basic` and omit `Notion-Version`.<br>2. Send `POST /v1/oauth/token` with valid JSON structure. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "missing_version"`. | Negative | Medium |
| `TC_OAUTH_TOK_008` | Verify boundary rejection when payload contains empty strings or an empty JSON object `{}` | Valid OAuth `CLIENT_ID` and `CLIENT_SECRET`. | 1. Send `POST /v1/oauth/token` with `{}`.<br>2. Send `POST /v1/oauth/token` with `{"grant_type": "", "code": ""}`. | Both requests return Status `400 Bad Request` indicating invalid/missing grant parameters (`error: "invalid_request"` / `code: "validation_error"`). | Boundary | Medium |
| `TC_OAUTH_TOK_009` | Verify single-use replay boundary by submitting a consumed `authorization_code` a second time | `AUTH_CODE` was just exchanged once (`200 OK`). | 1. Immediately send a second `POST /v1/oauth/token` request using the exact same `AUTH_CODE` and valid Basic Auth headers. | Status `400 Bad Request`. JSON body contains `error: "invalid_grant"`, preventing authorization code replay. | Boundary | High |

---

### Test Cases for POST /v1/oauth/revoke (Revoke)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_OAUTH_REV_001` | Verify successful revocation of an active OAuth `access_token` | Valid `CLIENT_ID`, `CLIENT_SECRET`, and an active `OAUTH_ACCESS_TOKEN`. | 1. Set `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`, `Notion-Version: 2025-09-03`, and `Content-Type: application/json`.<br>2. Send `POST /v1/oauth/revoke` with `{"token": "<OAUTH_ACCESS_TOKEN>"}`. | Status `200 OK`. Response returns clean acknowledgment (`{}` / `request_id`), and the token is immediately invalidated. | Happy Path | High |
| `TC_OAUTH_REV_002` | Verify `401 Unauthorized` when revoking a token with invalid Basic Auth credentials | Active `OAUTH_ACCESS_TOKEN` exists. | 1. Set `Authorization: Basic base64(wrong_client:wrong_secret)` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/revoke` with `{"token": "<OAUTH_ACCESS_TOKEN>"}`. | Status `401 Unauthorized`. JSON body contains `error: "invalid_client"` / `code: "unauthorized"`. Token remains active. | Negative | High |
| `TC_OAUTH_REV_003` | Verify `400 Bad Request` when required `token` field is omitted from request body | Valid `CLIENT_ID` and `CLIENT_SECRET`. | 1. Set valid `Authorization: Basic`, `Notion-Version: 2025-09-03`, and `Content-Type: application/json`.<br>2. Send `POST /v1/oauth/revoke` with body `{}`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "validation_error"`. | Negative | High |
| `TC_OAUTH_REV_004` | Verify `400 Bad Request` when `Notion-Version` header is omitted on `/v1/oauth/revoke` | Valid `CLIENT_ID`, `CLIENT_SECRET`, and `OAUTH_ACCESS_TOKEN`. | 1. Set valid `Authorization: Basic` and omit `Notion-Version`.<br>2. Send `POST /v1/oauth/revoke` with `{"token": "<OAUTH_ACCESS_TOKEN>"}`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "missing_version"`. | Negative | Medium |
| `TC_OAUTH_REV_005` | Verify `400 Bad Request` when sending malformed JSON payload | Valid `CLIENT_ID` and `CLIENT_SECRET`. | 1. Set valid `Authorization: Basic`, `Notion-Version: 2025-09-03`, and `Content-Type: application/json`.<br>2. Send `POST /v1/oauth/revoke` with raw body `{"token": "unclosed_string}`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "invalid_json"`. | Negative | Low |
| `TC_OAUTH_REV_006` | Verify empty and whitespace-only string boundary in `token` field | Valid `CLIENT_ID` and `CLIENT_SECRET`. | 1. Send `POST /v1/oauth/revoke` with `{"token": ""}`.<br>2. Send `POST /v1/oauth/revoke` with `{"token": "   "}`. | Status `400 Bad Request` (`code: "validation_error"`) on empty/blank boundary inputs. | Boundary | Medium |
| `TC_OAUTH_REV_007` | Verify idempotency boundary when revoking an already-revoked `access_token` | `OAUTH_ACCESS_TOKEN` was already revoked via `/v1/oauth/revoke`. | 1. Set valid `Authorization: Basic` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/revoke` again with `{"token": "<REVOKED_ACCESS_TOKEN>"}`. | Status `200 OK` per RFC 7009 idempotency (no `500` error), and token remains inactive. | Boundary | Medium |

---

### Test Cases for POST /v1/oauth/introspect (Introspect)

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_OAUTH_INT_001` | Verify introspection of an active OAuth `access_token` returns `active: true` and metadata | Valid `CLIENT_ID`, `CLIENT_SECRET`, and active `OAUTH_ACCESS_TOKEN`. | 1. Set `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`, `Notion-Version: 2025-09-03`, and `Content-Type: application/json`.<br>2. Send `POST /v1/oauth/introspect` with `{"token": "<OAUTH_ACCESS_TOKEN>"}`. | Status `200 OK`. JSON body contains `active: true`, integer timestamp `iat`, and `request_id`. | Happy Path | High |
| `TC_OAUTH_INT_002` | Verify introspection of a revoked or unknown token returns `200 OK` with `active: false` | Valid `CLIENT_ID`, `CLIENT_SECRET`, and a revoked or non-existent token string. | 1. Set valid `Authorization: Basic`, `Notion-Version: 2025-09-03`, and `Content-Type: application/json`.<br>2. Send `POST /v1/oauth/introspect` with `{"token": "<REVOKED_OR_UNKNOWN_TOKEN>"}`. | Status `200 OK`. JSON body contains `active: false` (conforming to RFC 7662). | Happy Path | High |
| `TC_OAUTH_INT_003` | Verify `401 Unauthorized` when introspecting with invalid or missing Basic Auth credentials | Active `OAUTH_ACCESS_TOKEN` exists. | 1. Omit `Authorization` header (or provide invalid Basic credentials) with `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/introspect` with `{"token": "<OAUTH_ACCESS_TOKEN>"}`. | Status `401 Unauthorized`. JSON body contains `error: "invalid_client"` / `code: "unauthorized"`. | Negative | High |
| `TC_OAUTH_INT_004` | Verify `400 Bad Request` when `token` parameter is missing from payload | Valid `CLIENT_ID` and `CLIENT_SECRET`. | 1. Set valid `Authorization: Basic` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/introspect` with `{}`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "validation_error"`. | Negative | Medium |
| `TC_OAUTH_INT_005` | Verify `400 Bad Request` when `token` has an invalid non-string type | Valid `CLIENT_ID` and `CLIENT_SECRET`. | 1. Set valid `Authorization: Basic` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/introspect` with `{"token": 987654321}`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "validation_error"`. | Negative | Medium |
| `TC_OAUTH_INT_006` | Verify `400 Bad Request` when `Notion-Version: 2025-09-03` header is omitted | Valid `CLIENT_ID`, `CLIENT_SECRET`, and `OAUTH_ACCESS_TOKEN`. | 1. Set valid `Authorization: Basic` and omit `Notion-Version`.<br>2. Send `POST /v1/oauth/introspect` with `{"token": "<OAUTH_ACCESS_TOKEN>"}`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "missing_version"`. | Negative | Medium |
| `TC_OAUTH_INT_007` | Verify boundary handling for empty string `{"token": ""}` | Valid `CLIENT_ID` and `CLIENT_SECRET`. | 1. Set valid `Authorization: Basic` and `Notion-Version: 2025-09-03`.<br>2. Send `POST /v1/oauth/introspect` with `{"token": ""}`. | Status `400 Bad Request`. JSON body contains `object: "error"` and `code: "validation_error"`. | Boundary | Medium |
| `TC_OAUTH_INT_008` | Verify upper-length boundary with oversized 2048-character token string | Valid `CLIENT_ID` and `CLIENT_SECRET`. | 1. Generate a 2048-character alphanumeric string.<br>2. Send `POST /v1/oauth/introspect` with `{"token": "<2048_CHAR_STRING>"}` and valid headers. | Status `200 OK` with `active: false` (or `400 validation_error`), without triggering `500 Internal Server Error`. | Boundary | Low |

---

### End-to-End (E2E) Test Cases

| Test Case ID | Description | Preconditions | Steps | Expected Result | Test Type | Priority |
|---|---|---|---|---|---|---|
| `TC_E2E_001` | Full OAuth Token Lifecycle & Bot Identity Verification (`Token` -> `Introspect` -> `Users/Me` -> `Revoke` -> `Verify Denial`) | Valid OAuth `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`, and fresh `AUTH_CODE` from workspace authorization. | 1. Call `POST /v1/oauth/token` with `grant_type: "authorization_code"` and `AUTH_CODE`; store `access_token` and `bot_id`.<br>2. Call `POST /v1/oauth/introspect` with `{"token": "<access_token>"}`.<br>3. Call `GET /v1/users/me` with `Authorization: Bearer <access_token>` and `Notion-Version: 2025-09-03`.<br>4. Call `POST /v1/oauth/revoke` with `{"token": "<access_token>"}`.<br>5. Re-call `POST /v1/oauth/introspect` with `{"token": "<access_token>"}`.<br>6. Re-call `GET /v1/users/me` using the revoked `<access_token>`. | Step 1: `200 OK` with `access_token` and `bot_id`.<br>Step 2: `200 OK` with `active: true`.<br>Step 3: `200 OK` with `object: "user"`, `type: "bot"`, and `id == bot_id`.<br>Step 4: `200 OK`.<br>Step 5: `200 OK` with `active: false`.<br>Step 6: `401 Unauthorized` with `code: "unauthorized"`. | E2E | High |
| `TC_E2E_002` | Workspace Users Discovery, Cursor Pagination & Individual Profile Inspection with Access Restriction Check | Active OAuth `access_token` (or `NOTION_TOKEN`) with *Read user information* capability; workspace has `>= 2` users. | 1. Call `GET /v1/users?page_size=1` with `Notion-Version: 2025-09-03`; extract `first_user_id = results[0].id` and `next_cursor`.<br>2. Call `GET /v1/users?page_size=1&start_cursor=<next_cursor>`; extract `second_user_id = results[0].id`.<br>3. Call `GET /v1/users/{first_user_id}` (hyphenated `UUIDv4`) and `GET /v1/users/{compact_first_user_id}` (32-char hex without hyphens).<br>4. Call `GET /v1/users/{first_user_id}` using a revoked/unauthorized Bearer token. | Step 1 & 2: `200 OK`, `object: "list"`, `first_user_id != second_user_id`.<br>Step 3: Both calls return `200 OK` (`object: "user"`) with identical normalized `id`, `name`, and `type` matching list metadata.<br>Step 4: `401 Unauthorized` (`code: "unauthorized"`). | E2E | High |
| `TC_E2E_003` | OAuth Refresh Token Rotation Continuity & Bot Workspace Verification (`Token` -> `Refresh` -> `Introspect` -> `Users`) | Active `access_token` and `refresh_token` pair issued via `/v1/oauth/token`. | 1. Call `POST /v1/oauth/token` with `{"grant_type": "refresh_token", "refresh_token": "<refresh_token>"}`; store `new_access_token` and `new_refresh_token`.<br>2. Call `POST /v1/oauth/introspect` with `{"token": "<new_access_token>"}`.<br>3. Call `GET /v1/users/me` and `GET /v1/users` using `Authorization: Bearer <new_access_token>` and `Notion-Version: 2025-09-03`. | Step 1: `200 OK` returning newly rotated `new_access_token` and `new_refresh_token`.<br>Step 2: `200 OK` with `active: true`.<br>Step 3: Both `/v1/users/me` (`object: "user"`, `type: "bot"`) and `/v1/users` (`object: "list"`, `results[]`) succeed with `200 OK`. | E2E | Medium |
