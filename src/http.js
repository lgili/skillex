export async function fetchJson(url, init = {}) {
  const response = await fetch(url, withDefaultHeaders(init));
  if (!response.ok) {
    throw new Error(`Falha ao buscar JSON ${url} (${response.status})`);
  }
  return response.json();
}

export async function fetchText(url, init = {}) {
  const response = await fetch(url, withDefaultHeaders(init));
  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo ${url} (${response.status})`);
  }
  return response.text();
}

export async function fetchOptionalJson(url, init = {}) {
  const response = await fetch(url, withDefaultHeaders(init));
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Falha ao buscar JSON ${url} (${response.status})`);
  }
  return response.json();
}

function withDefaultHeaders(init) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "askill");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/vnd.github+json");
  }
  return {
    ...init,
    headers,
  };
}
