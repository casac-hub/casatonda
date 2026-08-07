const BASE_URL = 'https://cybhotel.net';

let cachedToken = null;
let tokenExpiry = null;

async function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  // Prova con username (che corrisponde all'email)
  const body = {
    username: process.env.EROOM_USERNAME,
    email: process.env.EROOM_USERNAME,
    password: process.env.EROOM_PASSWORD
  };
  console.log('Trying login with:', JSON.stringify({username: body.username, email: body.email}));
  const r = await fetch(`${BASE_URL}/adminapi/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  console.log('Login response status:', r.status);
  console.log('Login response body:', text);
  let d;
  try { d = JSON.parse(text); } catch(e) { throw new Error('Risposta non JSON: ' + text); }
  if (!d.token) throw new Error('Token mancante. Risposta: ' + JSON.stringify(d));
  cachedToken = d.token;
  tokenExpiry = Date.now() + (d.expires_in || 3600) * 1000 - 60000;
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, hotel_id, from, to, date_type, include_cancelled, room_id } = req.query;

  try {
    const token = await getToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Hotel-ID': hotel_id || ''
    };

    let result;

    if (action === 'get_reservations') {
      let url = `${BASE_URL}/adminapi/get_reservations?from=${from}&to=${to}`;
      if (date_type) url += `&date_type=${date_type}`;
      if (include_cancelled) url += `&include_cancelled=${include_cancelled}`;
      if (room_id) url += `&room_id=${room_id}`;
      const r = await fetch(url, { headers });
      result = await r.json();
    } else if (action === 'get_unavailability') {
      let url = `${BASE_URL}/adminapi/get_unavailability?from=${from}&to=${to}`;
      if (room_id) url += `&room_id=${room_id}`;
      const r = await fetch(url, { headers });
      result = await r.json();
    } else if (action === 'get_rooms') {
      const r = await fetch(`${BASE_URL}/adminapi/get_rooms`, { headers });
      result = await r.json();
    } else if (action === 'get_rooms_status') {
      const r = await fetch(`${BASE_URL}/adminapi/get_rooms_status`, { headers });
      result = await r.json();
    } else if (action === 'update_rooms_status') {
      const r = await fetch(`${BASE_URL}/adminapi/update_rooms_status`, {
        method: 'POST', headers, body: JSON.stringify(req.body)
      });
      result = await r.json();
    } else if (action === 'get_cleaning_prediction') {
      const r = await fetch(`${BASE_URL}/adminapi/get_cleaning_prediction?from=${from}&to=${to}`, { headers });
      result = await r.json();
    } else {
      return res.status(400).json({ error: 'Azione non valida' });
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('Eroom API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
