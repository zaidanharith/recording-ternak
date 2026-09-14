const config = require('../config');

/**
 * Panggil API dashboard-kematian-ternak.
 * - `token`: JWT user yang sedang login, diteruskan agar auth & role check di dashboard tetap berlaku.
 * - Semua request juga membawa header x-internal-key agar dashboard tahu request ini datang dari recording-ternak.
 */
async function dashboardFetch(path, { method = 'GET', body, token } = {}) {
  if (!config.dashboard.apiUrl) {
    throw new Error('DASHBOARD_API_URL belum diset.');
  }

  const headers = {
    'x-internal-key': config.dashboard.internalApiKey || '',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${config.dashboard.apiUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.arrayBuffer();

  if (!response.ok) {
    const message = isJson ? payload?.message : `Dashboard API error (${response.status})`;
    const error = new Error(message || 'Gagal menghubungi dashboard-kematian-ternak.');
    error.status = response.status;
    error.payload = isJson ? payload : undefined;
    throw error;
  }

  return { payload, response };
}

module.exports = { dashboardFetch };
