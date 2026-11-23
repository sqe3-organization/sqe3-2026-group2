// core/utils/logReporter.ts
import fs from 'fs';
import path from 'path';
import { Logger } from './logger';

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface ParsedLogEntry {
  index: number;
  timestamp: string;
  level: number;
  severity: LogSeverity;
  message: string;
  meta: unknown;
  httpType: 'request' | 'response' | null;
  httpStatus: number | null;
  durationMs: number | null;
}

export interface LogReportSummary {
  generatedAt: string;
  sourceLogFile: string;
  totalEntries: number;
  skippedLines: number;
  countsBySeverity: Record<LogSeverity, number>;
  httpMetrics: {
    requestCount: number;
    responseCount: number;
    latencySampleCount: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
    minLatencyMs: number;
  };
  timeWindow: {
    start: string | null;
    end: string | null;
    durationMs: number | null;
  };
}

export interface LogReportArtifact {
  summary: LogReportSummary;
  entries: ParsedLogEntry[];
}

const LEVEL_MAP: Record<number, LogSeverity> = {
  10: 'DEBUG',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'ERROR',
};

const REQUEST_PATTERN = /^Request:\s+([A-Z]+)\s+(.+)$/i;
const RESPONSE_PATTERN = /^Response:\s+(\d{3})\s+\((\d+(?:\.\d+)?)ms\)$/i;

function mapPinoLevel(level: unknown): { numeric: number; severity: LogSeverity } {
  const num = typeof level === 'number' ? level : 30;
  const severity = LEVEL_MAP[num] ?? (num >= 50 ? 'ERROR' : num >= 40 ? 'WARN' : num >= 30 ? 'INFO' : 'DEBUG');
  return { numeric: num, severity };
}

function normalizeTimestamp(rawTime: unknown): string {
  if (typeof rawTime === 'string' && rawTime.trim().length > 0) {
    const parsed = Date.parse(rawTime);
    return Number.isNaN(parsed) ? rawTime : new Date(parsed).toISOString();
  }
  if (typeof rawTime === 'number' && Number.isFinite(rawTime)) {
    return new Date(rawTime).toISOString();
  }
  return new Date().toISOString();
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractHttpDetails(
  message: string,
  meta: unknown
): {
  httpType: 'request' | 'response' | null;
  httpStatus: number | null;
  durationMs: number | null;
} {
  let httpType: 'request' | 'response' | null = null;
  let httpStatus: number | null = null;
  let durationMs: number | null = null;

  if (REQUEST_PATTERN.test(message)) {
    httpType = 'request';
  } else {
    const respMatch = message.match(RESPONSE_PATTERN);
    if (respMatch) {
      httpType = 'response';
      httpStatus = Number(respMatch[1]);
      durationMs = Number(respMatch[2]);
    }
  }

  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const record = meta as Record<string, unknown>;
    if (durationMs === null && typeof record.durationMs === 'number' && Number.isFinite(record.durationMs)) {
      durationMs = record.durationMs;
    }
    if (httpStatus === null && typeof record.status === 'number' && Number.isFinite(record.status)) {
      httpStatus = record.status;
    }
  }

  return { httpType, httpStatus, durationMs };
}

function buildHtmlDashboard(report: LogReportArtifact): string {
  const { summary, entries } = report;
  const rowsHtml = entries
    .map((entry) => {
      const metaText =
        entry.meta !== null && entry.meta !== undefined
          ? JSON.stringify(entry.meta, null, 2)
          : '';
      const httpBadge =
        entry.httpType === 'request'
          ? '<span class="pill pill-http-req">HTTP REQ</span>'
          : entry.httpType === 'response'
            ? `<span class="pill pill-http-res">HTTP ${entry.httpStatus ?? ''}</span>`
            : '';
      const latencyBadge =
        entry.durationMs !== null
          ? `<span class="pill pill-latency">${entry.durationMs} ms</span>`
          : '';

      return `<tr data-severity="${entry.severity}">
        <td class="col-idx">${entry.index}</td>
        <td class="col-time">${escapeHtml(entry.timestamp)}</td>
        <td class="col-sev"><span class="badge badge-${entry.severity.toLowerCase()}">${entry.severity}</span></td>
        <td class="col-msg">
          <div class="msg-line">${httpBadge}${latencyBadge}<span>${escapeHtml(entry.message)}</span></div>
        </td>
        <td class="col-meta">${metaText ? `<pre>${escapeHtml(metaText)}</pre>` : '<span class="muted">—</span>'}</td>
      </tr>`;
    })
    .join('\n');

  const emptyStateHtml =
    entries.length === 0
      ? `<tr><td colspan="5" class="empty-state">No log entries found in ${escapeHtml(summary.sourceLogFile)}.</td></tr>`
      : rowsHtml;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Test Execution Log Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --surface-alt: #162032;
      --border: #334155;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --info: #38bdf8;
      --warn: #fbbf24;
      --error: #f87171;
      --debug: #a78bfa;
      --accent: #3b82f6;
      --ok: #34d399;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .container { max-width: 1380px; margin: 0 auto; }
    header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    h1 { margin: 0 0 4px 0; font-size: 1.65rem; letter-spacing: -0.02em; }
    .subtitle { color: var(--muted); font-size: 0.9rem; margin: 0; }
    .meta-strip { color: var(--muted); font-size: 0.82rem; text-align: right; }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 16px;
    }
    .card-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
    .card-value { font-size: 1.6rem; font-weight: 700; margin-top: 4px; }
    .card-sub { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }
    .c-info { color: var(--info); }
    .c-warn { color: var(--warn); }
    .c-error { color: var(--error); }
    .c-debug { color: var(--debug); }
    .c-ok { color: var(--ok); }
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px;
    }
    .filter-group { display: flex; flex-wrap: wrap; gap: 8px; }
    .filter-btn {
      border: 1px solid var(--border);
      background: var(--surface-alt);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
    }
    .filter-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .search-input {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 6px;
      padding: 7px 12px;
      min-width: 260px;
      font-size: 0.88rem;
    }
    .table-wrap {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
    thead { background: var(--surface-alt); }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
    tbody tr:hover { background: rgba(59, 130, 246, 0.08); }
    .col-idx { width: 48px; color: var(--muted); }
    .col-time { width: 210px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.8rem; color: var(--muted); white-space: nowrap; }
    .col-sev { width: 92px; }
    .col-meta { max-width: 420px; }
    .col-meta pre {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 0.77rem;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px;
      color: #cbd5e1;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .badge-info { background: rgba(56, 189, 248, 0.16); color: var(--info); border: 1px solid rgba(56, 189, 248, 0.4); }
    .badge-warn { background: rgba(251, 191, 36, 0.16); color: var(--warn); border: 1px solid rgba(251, 191, 36, 0.4); }
    .badge-error { background: rgba(248, 113, 113, 0.16); color: var(--error); border: 1px solid rgba(248, 113, 113, 0.4); }
    .badge-debug { background: rgba(167, 139, 250, 0.16); color: var(--debug); border: 1px solid rgba(167, 139, 250, 0.4); }
    .msg-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }
    .pill-http-req { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .pill-http-res { background: rgba(52, 211, 153, 0.2); color: #6ee7b7; }
    .pill-latency { background: rgba(148, 163, 184, 0.2); color: #e2e8f0; }
    .muted { color: var(--muted); }
    .empty-state { text-align: center; padding: 32px; color: var(--muted); }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Automated Test Execution Log Report</h1>
        <p class="subtitle">Generated from structured Pino NDJSON execution logs</p>
      </div>
      <div class="meta-strip">
        <div><strong>Generated:</strong> ${escapeHtml(summary.generatedAt)}</div>
        <div><strong>Window:</strong> ${escapeHtml(summary.timeWindow.start ?? 'N/A')} &rarr; ${escapeHtml(summary.timeWindow.end ?? 'N/A')}</div>
        <div><strong>Source:</strong> ${escapeHtml(summary.sourceLogFile)}</div>
      </div>
    </header>

    <section class="cards">
      <div class="card">
        <div class="card-label">Total Entries</div>
        <div class="card-value">${summary.totalEntries}</div>
        <div class="card-sub">Skipped lines: ${summary.skippedLines}</div>
      </div>
      <div class="card">
        <div class="card-label">INFO</div>
        <div class="card-value c-info">${summary.countsBySeverity.INFO}</div>
        <div class="card-sub">Lifecycle &amp; summary events</div>
      </div>
      <div class="card">
        <div class="card-label">WARN</div>
        <div class="card-value c-warn">${summary.countsBySeverity.WARN}</div>
        <div class="card-sub">Warnings &amp; fallbacks</div>
      </div>
      <div class="card">
        <div class="card-label">ERROR</div>
        <div class="card-value c-error">${summary.countsBySeverity.ERROR}</div>
        <div class="card-sub">Failures &amp; exceptions</div>
      </div>
      <div class="card">
        <div class="card-label">DEBUG</div>
        <div class="card-value c-debug">${summary.countsBySeverity.DEBUG}</div>
        <div class="card-sub">HTTP traces &amp; telemetry</div>
      </div>
      <div class="card">
        <div class="card-label">HTTP Traces</div>
        <div class="card-value c-ok">${summary.httpMetrics.requestCount} / ${summary.httpMetrics.responseCount}</div>
        <div class="card-sub">Requests / Responses</div>
      </div>
      <div class="card">
        <div class="card-label">Latency (Avg / Max)</div>
        <div class="card-value">${summary.httpMetrics.avgLatencyMs} / ${summary.httpMetrics.maxLatencyMs} ms</div>
        <div class="card-sub">Samples: ${summary.httpMetrics.latencySampleCount}</div>
      </div>
    </section>

    <section class="controls">
      <div class="filter-group" id="severity-filters">
        <button class="filter-btn active" data-filter="ALL">ALL (${summary.totalEntries})</button>
        <button class="filter-btn" data-filter="ERROR">ERROR (${summary.countsBySeverity.ERROR})</button>
        <button class="filter-btn" data-filter="WARN">WARN (${summary.countsBySeverity.WARN})</button>
        <button class="filter-btn" data-filter="INFO">INFO (${summary.countsBySeverity.INFO})</button>
        <button class="filter-btn" data-filter="DEBUG">DEBUG (${summary.countsBySeverity.DEBUG})</button>
      </div>
      <input
        type="search"
        id="search-box"
        class="search-input"
        placeholder="Filter by message, status, or metadata..."
      />
    </section>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Timestamp (UTC)</th>
            <th>Severity</th>
            <th>Message</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody id="log-table-body">
          ${emptyStateHtml}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    (function () {
      let activeSeverity = 'ALL';
      const buttons = document.querySelectorAll('#severity-filters .filter-btn');
      const searchBox = document.getElementById('search-box');
      const rows = document.querySelectorAll('#log-table-body tr[data-severity]');

      function applyFilters() {
        const term = (searchBox.value || '').trim().toLowerCase();
        rows.forEach((row) => {
          const sev = row.getAttribute('data-severity');
          const matchesSeverity = activeSeverity === 'ALL' || sev === activeSeverity;
          const matchesTerm = !term || row.textContent.toLowerCase().includes(term);
          row.classList.toggle('hidden', !(matchesSeverity && matchesTerm));
        });
      }

      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          buttons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          activeSeverity = btn.getAttribute('data-filter') || 'ALL';
          applyFilters();
        });
      });

      searchBox.addEventListener('input', applyFilters);
    })();
  </script>
</body>
</html>
`;
}

/**
 * Core Layer LogReporter — parses Pino NDJSON execution logs and produces
 * structured JSON and interactive HTML dashboard reports under `reports/`.
 */
export class LogReporter {
  static async generate(logFilePath?: string, outputDir?: string): Promise<void> {
    const resolvedLogFile = logFilePath
      ? path.resolve(process.cwd(), logFilePath)
      : Logger.getLogFilePath();
    const resolvedOutputDir = outputDir
      ? path.resolve(process.cwd(), outputDir)
      : path.resolve(process.cwd(), 'reports');

    fs.mkdirSync(resolvedOutputDir, { recursive: true });

    const countsBySeverity: Record<LogSeverity, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    const entries: ParsedLogEntry[] = [];
    let skippedLines = 0;
    let requestCount = 0;
    let responseCount = 0;
    const responseLatencies: number[] = [];
    const fallbackMetaLatencies: number[] = [];

    if (fs.existsSync(resolvedLogFile)) {
      const rawContent = fs.readFileSync(resolvedLogFile, 'utf-8');
      const lines = rawContent.split(/\r?\n/);

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }

        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          const { numeric, severity } = mapPinoLevel(parsed.level);
          const timestamp = normalizeTimestamp(parsed.time);
          const message = typeof parsed.msg === 'string' ? parsed.msg : '';
          const meta = parsed.meta !== undefined ? parsed.meta : null;

          const { httpType, httpStatus, durationMs } = extractHttpDetails(message, meta);

          countsBySeverity[severity] += 1;
          if (httpType === 'request') {
            requestCount += 1;
          } else if (httpType === 'response') {
            responseCount += 1;
            if (durationMs !== null) {
              responseLatencies.push(durationMs);
            }
          } else if (durationMs !== null) {
            fallbackMetaLatencies.push(durationMs);
          }

          entries.push({
            index: entries.length + 1,
            timestamp,
            level: numeric,
            severity,
            message,
            meta,
            httpType,
            httpStatus,
            durationMs,
          });
        } catch {
          skippedLines += 1;
        }
      }
    }

    const latencies = responseLatencies.length > 0 ? responseLatencies : fallbackMetaLatencies;

    const timestampsMs = entries
      .map((e) => Date.parse(e.timestamp))
      .filter((ms) => !Number.isNaN(ms));

    const startMs = timestampsMs.length > 0 ? Math.min(...timestampsMs) : null;
    const endMs = timestampsMs.length > 0 ? Math.max(...timestampsMs) : null;

    const avgLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((acc, value) => acc + value, 0) / latencies.length)
        : 0;
    const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : 0;
    const minLatencyMs = latencies.length > 0 ? Math.min(...latencies) : 0;

    const summary: LogReportSummary = {
      generatedAt: new Date().toISOString(),
      sourceLogFile: resolvedLogFile,
      totalEntries: entries.length,
      skippedLines,
      countsBySeverity,
      httpMetrics: {
        requestCount,
        responseCount,
        latencySampleCount: latencies.length,
        avgLatencyMs,
        maxLatencyMs,
        minLatencyMs,
      },
      timeWindow: {
        start: startMs !== null ? new Date(startMs).toISOString() : null,
        end: endMs !== null ? new Date(endMs).toISOString() : null,
        durationMs: startMs !== null && endMs !== null ? endMs - startMs : null,
      },
    };

    const artifact: LogReportArtifact = { summary, entries };

    const jsonOutputPath = path.join(resolvedOutputDir, 'log-report.json');
    const htmlOutputPath = path.join(resolvedOutputDir, 'log-report.html');

    fs.writeFileSync(jsonOutputPath, JSON.stringify(artifact, null, 2), 'utf-8');
    fs.writeFileSync(htmlOutputPath, buildHtmlDashboard(artifact), 'utf-8');

    console.log(`[LogReporter] Parsed ${entries.length} entries from ${resolvedLogFile}`);
    console.log(`[LogReporter] JSON report written to ${jsonOutputPath}`);
    console.log(`[LogReporter] HTML report written to ${htmlOutputPath}`);
  }
}

// CLI entry point (`npm run report:logs`)
if (typeof require !== 'undefined' && require.main === module) {
  const [, , cliLogPath, cliOutputDir] = process.argv;
  LogReporter.generate(cliLogPath, cliOutputDir).catch((error) => {
    console.error('[LogReporter] Failed to generate log report:', error);
    process.exitCode = 1;
  });
}
