type SearchParams = Record<string, string | string[] | undefined>;

/** `path` plus the incoming query, so redirects keep the PB app's ?token= / ?userName= hand-off. */
export function withSearchParams(path: string, params: SearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value !== undefined) query.append(key, value);
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
