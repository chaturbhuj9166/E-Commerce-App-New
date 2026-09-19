export async function api(path, options = {}) {
  const token = sessionStorage.getItem('ntsa-token');
  const form = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers: { ...(!form ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, body: options.body ? (form ? options.body : JSON.stringify(options.body)) : undefined });
  } catch {
    throw new Error('Could not reach the NTSA server. Check your connection and try again.');
  }
  if (response.status === 204) return null;
  // A non-JSON body (e.g. a proxy/rate-limit page, or the dev server
  // restarting mid-request) would otherwise surface as a cryptic
  // "Unexpected end of JSON input" -- read as text first so we can give a
  // clear message instead.
  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch {
      throw new Error(response.ok ? 'Unexpected response from the server. Please try again.' : `Server error (${response.status}). Please try again in a moment.`);
    }
  }
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data;
}
export const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format((amount || 0) / 100);
export function paise(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a positive amount with at most two decimal places');
  const [whole, fraction = ''] = String(value).split('.'); return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
