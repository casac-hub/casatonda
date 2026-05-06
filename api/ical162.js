export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const r = await fetch('http://cleaning.cybhotel.net/room_calendar_a?hotel_ext_id=162');
    const text = await r.text();
    res.setHeader('Content-Type', 'text/calendar');
    return res.status(200).send(text);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
