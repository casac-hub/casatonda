import crypto from 'crypto';

const BASE_URL = 'https://cybhotel.net';

// hotel_id del gestionale -> casa nella pagina ospite
const CASE_PER_HOTEL = {
  '164': 'piumogna',
  '160': 'cvb',
  '161': 'liberty',
  '162': 'rustico',
  '159': 'rurale'
};

let cachedToken = null;
let tokenExpiry = null;

async function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken;
  cachedToken = null;
  tokenExpiry = null;

  const r = await fetch(`${BASE_URL}/adminapi/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      username: (process.env.EROOM_USERNAME || '').trim(),
      password: (process.env.EROOM_PASSWORD || '').trim()
    })
  });
  const d = await r.json();
  if (!d.token) throw new Error('Token mancante');

  cachedToken = d.token;
  tokenExpiry = Date.now() + (d.expires_in || 3600) * 1000 - 60000;
  return cachedToken;
}

// Il codice del link: si calcola dalla prenotazione più una parola segreta
// che sta solo qui sul server. Senza quella non è ricostruibile.
function firma(r, h, d) {
  const segreto = process.env.OSPITE_SECRET || '';
  return crypto.createHmac('sha256', segreto).update(`${r}|${h}|${d}`)
    .digest('base64url').slice(0, 12);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, r: numero, h: hotel, d: giorno, s: codice, k: chiave } = req.query;

  try {
    // --- uso interno: il gestionale chiede il link da mandare all'ospite ---
    if (action === 'link') {
      if (!process.env.OSPITE_ADMIN_KEY || chiave !== process.env.OSPITE_ADMIN_KEY) {
        return res.status(403).json({ error: 'non autorizzato' });
      }
      if (!numero || !hotel || !giorno) return res.status(400).json({ error: 'dati mancanti' });
      const s = firma(numero, hotel, giorno);
      return res.status(200).json({
        url: `/ospite.html?r=${encodeURIComponent(numero)}&h=${hotel}&d=${giorno}&s=${s}`
      });
    }

    // --- uso pubblico: la pagina dell'ospite chiede i suoi dati ---
    if (!numero || !hotel || !giorno || !codice) {
      return res.status(400).json({ error: 'link incompleto' });
    }
    if (codice !== firma(numero, hotel, giorno)) {
      return res.status(403).json({ error: 'link non valido' });
    }

    const token = await getToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Hotel-ID': hotel
    };

    // Cerchiamo solo nel giorno di arrivo: poche prenotazioni, una pagina sola
    const url = `${BASE_URL}/adminapi/get_reservations?from=${giorno}&to=${giorno}` +
                `&date_type=stay&include_cancelled=1`;
    const risp = await fetch(url, { headers });
    const dati = await risp.json();
    const lista = Array.isArray(dati.data) ? dati.data : [];
    const p = lista.find(x => String(x.reservationNumber) === String(numero));
    if (!p) return res.status(404).json({ error: 'prenotazione non trovata' });

    // Quanti ospiti sono già registrati: conta chi ha il numero del documento
    const totale = (p.bookedRooms || []).reduce(
      (s, b) => s + (b.numAdults || 0) + (b.numKids || 0), 0) || 1;
    const registrati =
      (p.mainGuest && p.mainGuest.document_identity_number ? 1 : 0) +
      (p.otherGuests || []).filter(g => g.document_identity_number).length;

    // Da qui esce solo questo. Niente documenti, date di nascita,
    // indirizzi, email, telefono, importi.
    return res.status(200).json({
      casa: CASE_PER_HOTEL[String(hotel)] || 'cvb',
      camera: (p.bookedRooms && p.bookedRooms[0] && p.bookedRooms[0].room)
                ? p.bookedRooms[0].room.number : '',
      nome: p.mainGuest ? (p.mainGuest.first_name || '') : '',
      lang: p.mainGuest && p.mainGuest.lang ? p.mainGuest.lang : 'en',
      ci: p.expectedArrivalDate ? p.expectedArrivalDate.slice(0, 10) : null,
      co: p.expectedDepartureDate ? p.expectedDepartureDate.slice(0, 10) : null,
      fatta: p.reservationDate || null,
      ospiti: totale,
      ospitiOk: registrati,
      checkin: !!p.checkinDate,
      annullata: !!Number(p.cancelled)
    });

  } catch (err) {
    console.error('Ospite API error:', err.message);
    return res.status(500).json({ error: 'errore' });
  }
}
