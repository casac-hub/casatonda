export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const BASE = 'https://cleaning.cybhotel.net/hotelkeepingapi';
  const { action } = req.query;

  try {
    if (action === 'login') {
      const r = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const d = await r.json();
      return res.status(200).json(d);
    }

    if (action === 'get_rooms_status') {
      const r = await fetch(`${BASE}/get_rooms_status`, {
        headers: { 'Authorization': req.headers.authorization }
      });
      const d = await r.json();
      return res.status(200).json(d);
    }

    if (action === 'update_rooms_status') {
      const r = await fetch(`${BASE}/update_rooms_status`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });
      const d = await r.json();
      return res.status(200).json(d);
    }

    if (action === 'get_rooms') {
      const r = await fetch(`${BASE}/get_rooms`, {
        headers: { 'Authorization': req.headers.authorization }
      });
      const d = await r.json();
      return res.status(200).json(d);
    }

    return res.status(400).json({ error: 'Action non valida' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
