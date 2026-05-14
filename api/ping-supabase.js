// api/ping-supabase.js
// Chiamato da un cron job Vercel ogni 5 giorni per tenere Supabase attivo

export default async function handler(req, res) {
  try {
    const SUPABASE_URL = 'https://qygrzzsukutoegkjpxea.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_sfL9XyJzhnYnuHC8_iOjgg_7ux5znde';
    
    const r = await fetch(`${SUPABASE_URL}/rest/v1/turni?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const status = r.status;
    console.log('Supabase ping:', status);
    res.status(200).json({ ok: true, supabase_status: status, timestamp: new Date().toISOString() });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
