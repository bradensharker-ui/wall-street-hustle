// =============================================================================
// session.js — minimal session API for synchronized classroom play.
//
// One Netlify Function fronts a single Netlify Blob store ("sessions"), keyed
// by the seed code (e.g. WSH-7K3M9P). Game logic stays entirely in the React
// client; the server is a coordinator/clock + a place each student dumps a
// snapshot so the teacher can see the whole class at once.
//
// No PII. Identity is the player's chosen handle (e.g. `leo_lacrosse`).
// Authentication is a per-session opaque `teacherToken` the teacher's browser
// generates at session-create and passes back for privileged ops.
//
// API (one endpoint, dispatched by `action` in POST bodies; GET is read-only):
//   POST /api/session/:seed   { action: "create", turnDuration, totalTurns }
//       → returns { ok, session, teacherToken }
//   POST /api/session/:seed   { action: "start", teacherToken }
//       → sets sessionStartedAt = now; state → "playing"
//   POST /api/session/:seed   { action: "end", teacherToken }
//       → state → "ended"
//   POST /api/session/:seed   { action: "join", handle, name }
//       → adds player row (idempotent by handle within a session)
//   POST /api/session/:seed   { action: "update", handle, turn, netWorth, indexValue }
//       → upserts the player's latest snapshot
//   GET  /api/session/:seed
//       → returns the full session (sans teacherToken)
// =============================================================================

import { getStore } from '@netlify/blobs';

const SEED_PATTERN = /^WSH-[A-Z0-9]{6}$/;
const MAX_PLAYERS = 50;
const MAX_HANDLE = 24;
const MAX_NAME = 32;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function err(status, message) { return json(status, { ok: false, error: message }); }

// Strip the teacherToken before sending session state to clients.
function publicView(session) {
  if (!session) return null;
  const { teacherToken, ...rest } = session;
  return rest;
}

function extractSeed(url) {
  // URL forms:
  //   /api/session/WSH-XXXXXX        (via netlify.toml rewrite)
  //   /.netlify/functions/session/WSH-XXXXXX
  //   /.netlify/functions/session?seed=WSH-XXXXXX
  const u = new URL(url);
  const fromQuery = u.searchParams.get('seed');
  if (fromQuery) return String(fromQuery).toUpperCase();
  const parts = u.pathname.split('/').filter(Boolean);
  // Take the last path segment — that's where the seed lives in either layout.
  const last = parts[parts.length - 1] || '';
  return last.toUpperCase();
}

function cleanHandle(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, MAX_HANDLE);
}

function cleanName(s) { return String(s || '').slice(0, MAX_NAME); }

function randToken() {
  // 22 chars of url-safe base64 from 16 random bytes
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export default async (req) => {
  const seed = extractSeed(req.url);
  if (!SEED_PATTERN.test(seed)) return err(400, 'invalid seed');

  const store = getStore('sessions');

  if (req.method === 'GET') {
    const session = await store.get(seed, { type: 'json' });
    if (!session) return err(404, 'no such session');
    return json(200, { ok: true, session: publicView(session) });
  }

  if (req.method !== 'POST') return err(405, 'method not allowed');

  let body;
  try { body = await req.json(); }
  catch (e) { return err(400, 'invalid JSON body'); }

  const action = String(body?.action || '');
  const now = Date.now();

  if (action === 'create') {
    const existing = await store.get(seed, { type: 'json' });
    if (existing) {
      return json(200, { ok: true, session: publicView(existing), teacherToken: null, note: 'session already exists' });
    }
    const turnDuration = Math.max(5, Math.min(180, Number(body.turnDuration) || 15));
    const totalTurns = Math.max(10, Math.min(200, Number(body.totalTurns) || 100));
    const teacherToken = randToken();
    const session = {
      seed, createdAt: now, sessionStartedAt: null, sessionEndedAt: null,
      turnDuration, totalTurns,
      state: 'lobby',
      teacherToken,
      players: {},
    };
    await store.setJSON(seed, session);
    return json(200, { ok: true, session: publicView(session), teacherToken });
  }

  // All other actions need an existing session.
  const session = await store.get(seed, { type: 'json' });
  if (!session) return err(404, 'no such session');

  const requireTeacher = () => session.teacherToken && body.teacherToken === session.teacherToken;

  if (action === 'start') {
    if (!requireTeacher()) return err(403, 'teacher token required');
    if (session.state !== 'lobby') return err(409, `session already ${session.state}`);
    session.state = 'playing';
    session.sessionStartedAt = now;
    await store.setJSON(seed, session);
    return json(200, { ok: true, session: publicView(session) });
  }

  if (action === 'end') {
    if (!requireTeacher()) return err(403, 'teacher token required');
    session.state = 'ended';
    session.sessionEndedAt = now;
    await store.setJSON(seed, session);
    return json(200, { ok: true, session: publicView(session) });
  }

  if (action === 'pause') {
    if (!requireTeacher()) return err(403, 'teacher token required');
    if (session.state !== 'playing') return err(409, 'not playing');
    session.state = 'paused';
    session.pausedAt = now;
    await store.setJSON(seed, session);
    return json(200, { ok: true, session: publicView(session) });
  }

  if (action === 'resume') {
    if (!requireTeacher()) return err(403, 'teacher token required');
    if (session.state !== 'paused') return err(409, 'not paused');
    // Shift sessionStartedAt forward by the pause duration so currentTurn math
    // (floor((now - sessionStartedAt) / turnDuration)) is undisturbed.
    if (session.pausedAt) session.sessionStartedAt += (now - session.pausedAt);
    session.state = 'playing';
    delete session.pausedAt;
    await store.setJSON(seed, session);
    return json(200, { ok: true, session: publicView(session) });
  }

  if (action === 'join') {
    const handle = cleanHandle(body.handle);
    const name = cleanName(body.name);
    if (!handle) return err(400, 'missing handle');
    if (Object.keys(session.players).length >= MAX_PLAYERS && !session.players[handle]) {
      return err(409, `session at capacity (${MAX_PLAYERS})`);
    }
    session.players[handle] = session.players[handle] || { handle, name, turn: 0, netWorth: 0, indexValue: 0, joinedAt: now };
    if (name) session.players[handle].name = name;
    session.players[handle].updatedAt = now;
    await store.setJSON(seed, session);
    return json(200, { ok: true, session: publicView(session) });
  }

  if (action === 'update') {
    const handle = cleanHandle(body.handle);
    if (!handle) return err(400, 'missing handle');
    const player = session.players[handle] || { handle, name: cleanName(body.name) || handle, joinedAt: now };
    player.turn = Math.max(0, Math.min(500, Number(body.turn) || 0));
    player.netWorth = Number(body.netWorth) || 0;
    player.indexValue = Number(body.indexValue) || 0;
    player.gameOver = !!body.gameOver;
    if (Array.isArray(body.lessons)) player.lessons = body.lessons.slice(0, 30);
    player.updatedAt = now;
    session.players[handle] = player;
    await store.setJSON(seed, session);
    return json(200, { ok: true, session: publicView(session) });
  }

  return err(400, `unknown action: ${action}`);
};

export const config = {
  // Trigger this function for both the friendly rewritten path and the raw
  // function URL. The seed path segment is captured by extractSeed.
  path: ['/api/session/:seed', '/.netlify/functions/session/:seed', '/.netlify/functions/session'],
};
