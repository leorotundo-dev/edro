import fs from 'fs';
import path from 'path';
import Link from 'next/link';

const resolveStitchRoot = () => {
  const candidates = [
    path.resolve(process.cwd(), 'stitch_today_s_dashboard'),
    path.resolve(process.cwd(), '..', 'stitch_today_s_dashboard'),
    path.resolve(process.cwd(), '..', '..', 'stitch_today_s_dashboard'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
};

const resolveRouteMap = () => {
  const candidates = [
    path.resolve(process.cwd(), 'docs', 'stitch', 'stitch-route-map.csv'),
    path.resolve(process.cwd(), '..', 'docs', 'stitch', 'stitch-route-map.csv'),
    path.resolve(process.cwd(), '..', '..', 'docs', 'stitch', 'stitch-route-map.csv'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
};

const STITCH_ROOT = resolveStitchRoot();
const ROUTE_MAP = resolveRouteMap();

type RouteRow = {
  folder: string;
  route: string;
  action: string;
  status: string;
  variant: string;
  notes: string;
};

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

const loadRouteMap = (): RouteRow[] => {
  if (!fs.existsSync(ROUTE_MAP)) {
    return [];
  }
  const raw = fs.readFileSync(ROUTE_MAP, 'utf8').trim();
  if (!raw) {
    return [];
  }
  const lines = raw.split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return {
      folder: row.folder ?? '',
      route: row.route ?? '',
      action: row.action ?? '',
      status: row.status ?? '',
      variant: row.variant ?? '',
      notes: row.notes ?? '',
    };
  });
};

export default function StitchIndexPage() {
  const folders = fs.existsSync(STITCH_ROOT)
    ? fs
        .readdirSync(STITCH_ROOT, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort()
    : [];
  const routeMap = loadRouteMap();
  const mapByFolder = new Map(routeMap.map((row) => [row.folder, row]));

  return (
    <div className="min-h-screen bg-background-light text-text-main">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Stitch Preview Index</h1>
        <p className="mt-2 text-sm text-text-muted">
          Preview de todas as paginas exportadas. Use as rotas abaixo para validar antes de substituir.
        </p>

        <div className="mt-6 rounded-2xl bg-surface-light p-4 shadow-soft">
          <div className="grid gap-3">
            {folders.map((folder) => {
              const row = mapByFolder.get(folder);
              const previewHref = `/stitch/${encodeURIComponent(folder)}`;
              return (
                <div
                  key={folder}
                  className="flex flex-col gap-1 rounded-xl border border-secondary-lilac/40 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Link className="font-semibold text-primary hover:underline" href={previewHref}>
                      {folder}
                    </Link>
                    {row?.variant ? (
                      <span className="rounded-full bg-secondary-bg px-2 py-0.5 text-xs font-medium text-primary">
                        {row.variant}
                      </span>
                    ) : null}
                    {row?.action ? (
                      <span className="rounded-full bg-secondary-bg px-2 py-0.5 text-xs text-text-muted">
                        {row.action}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-text-muted">
                    rota sugerida: <span className="font-medium text-text-main">{row?.route ?? 'n/d'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
