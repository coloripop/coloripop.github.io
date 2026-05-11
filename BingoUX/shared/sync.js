/* ─────────────────────────────────────────────────────────
   Acronym Bingo — Sync Layer
   Default: BroadcastChannel + localStorage (cross-tab sync).
   Designed as a drop-in for Supabase (or any pub/sub) later.

   Public API:
     Sync.createRoom(opts) → roomCode
     Sync.joinRoom(roomCode, player)  // upsert player
     Sync.getRoom(roomCode) → state | null
     Sync.callAcronym(roomCode, idx)
     Sync.markCell(roomCode, playerId, cellIdx, value)
     Sync.savePlayerCard(roomCode, playerId, name, cardIndices)
     Sync.claimBingo(roomCode, playerId, lineIndices)
     Sync.resetRoom(roomCode)
     Sync.subscribe(roomCode, fn) → unsub
   ───────────────────────────────────────────────────────── */

(function(global){
  const STORAGE_PREFIX = 'bingo-room-';
  const BC_NAME = 'bingo-sync-v1';

  // single broadcast channel
  const bc = ('BroadcastChannel' in global) ? new BroadcastChannel(BC_NAME) : null;
  const localListeners = new Map(); // roomCode -> Set<fn>

  function key(code){ return STORAGE_PREFIX + code; }

  function loadRoom(code){
    try{
      const raw = localStorage.getItem(key(code));
      return raw ? JSON.parse(raw) : null;
    }catch{ return null }
  }
  function saveRoom(code, state){
    state.updatedAt = Date.now();
    localStorage.setItem(key(code), JSON.stringify(state));
    notify(code, state);
  }
  function notify(code, state){
    if(bc) bc.postMessage({code, state});
    const set = localListeners.get(code);
    if(set) set.forEach(fn=>{ try{fn(state)}catch{} });
  }

  // listen for bc messages
  if(bc){
    bc.addEventListener('message', e=>{
      const {code, state} = e.data || {};
      if(!code) return;
      const set = localListeners.get(code);
      if(set) set.forEach(fn=>{ try{fn(state)}catch{} });
    });
  }
  // also listen to storage events (other tabs that don't share BC)
  global.addEventListener('storage', e=>{
    if(!e.key || !e.key.startsWith(STORAGE_PREFIX)) return;
    const code = e.key.slice(STORAGE_PREFIX.length);
    try{
      const state = e.newValue ? JSON.parse(e.newValue) : null;
      const set = localListeners.get(code);
      if(set) set.forEach(fn=>{ try{fn(state)}catch{} });
    }catch{}
  });

  function newCode(){
    // 4-char human-readable room code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
    let s = '';
    for(let i=0;i<4;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }

  const Sync = {
    /** Create a fresh room. opts: { lang } */
    createRoom(opts={}){
      let code;
      do { code = newCode(); } while(loadRoom(code));
      const state = {
        code,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lang: opts.lang || 'es',
        called: [],          // array of acronym indices in ALL_ACRONYMS
        currentIdx: -1,      // last called index
        revealed: false,     // caller revealed the answer
        players: {},         // playerId -> {id, name, card, marked, claimed}
        winners: [],         // [{playerId, name, line, verifiedAt}]
      };
      saveRoom(code, state);
      return code;
    },

    getRoom(code){ return loadRoom(code); },

    joinRoom(code, player){
      const state = loadRoom(code);
      if(!state) return null;
      state.players[player.id] = Object.assign(
        state.players[player.id] || {},
        player,
        {joinedAt: state.players[player.id]?.joinedAt || Date.now()}
      );
      saveRoom(code, state);
      return state;
    },

    savePlayerCard(code, playerId, name, cardIndices){
      const state = loadRoom(code);
      if(!state) return null;
      const existing = state.players[playerId] || {};
      state.players[playerId] = {
        ...existing,
        id: playerId,
        name: name || existing.name || '—',
        card: cardIndices,
        marked: existing.marked || [],
        joinedAt: existing.joinedAt || Date.now(),
      };
      saveRoom(code, state);
      return state;
    },

    markCell(code, playerId, cellIdx, value){
      const state = loadRoom(code);
      if(!state || !state.players[playerId]) return null;
      const p = state.players[playerId];
      const set = new Set(p.marked || []);
      if(value) set.add(cellIdx); else set.delete(cellIdx);
      p.marked = [...set];
      saveRoom(code, state);
      return state;
    },

    callAcronym(code, idx){
      const state = loadRoom(code);
      if(!state) return null;
      if(!state.called.includes(idx)){
        state.called.push(idx);
      }
      state.currentIdx = idx;
      state.revealed = false;
      saveRoom(code, state);
      return state;
    },

    revealCurrent(code){
      const state = loadRoom(code);
      if(!state) return null;
      state.revealed = true;
      saveRoom(code, state);
      return state;
    },

    claimBingo(code, playerId, lineIndices){
      const state = loadRoom(code);
      if(!state || !state.players[playerId]) return null;
      const p = state.players[playerId];
      p.claimed = {line: lineIndices, at: Date.now(), verified: null};
      saveRoom(code, state);
      return state;
    },

    /** Caller verifies a claim. result: 'valid' | 'invalid' */
    verifyClaim(code, playerId, result){
      const state = loadRoom(code);
      if(!state || !state.players[playerId]) return null;
      const p = state.players[playerId];
      if(p.claimed){
        p.claimed.verified = result;
        p.claimed.verifiedAt = Date.now();
        if(result === 'valid'){
          state.winners.push({
            playerId, name: p.name,
            line: p.claimed.line,
            verifiedAt: Date.now(),
          });
        }
      }
      saveRoom(code, state);
      return state;
    },

    resetRoom(code){
      const state = loadRoom(code);
      if(!state) return null;
      state.called = [];
      state.currentIdx = -1;
      state.revealed = false;
      state.winners = [];
      state.ended = false;
      state.endedAt = null;
      Object.values(state.players).forEach(p=>{
        p.marked = [];
        p.claimed = null;
      });
      saveRoom(code, state);
      return state;
    },

    /** Teacher ends the session — kicks all players. */
    endRoom(code){
      const state = loadRoom(code);
      if(!state) return null;
      state.ended = true;
      state.endedAt = Date.now();
      saveRoom(code, state);
      return state;
    },

    deleteRoom(code){
      localStorage.removeItem(key(code));
      notify(code, null);
    },

    listRooms(){
      const out = [];
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(k && k.startsWith(STORAGE_PREFIX)){
          try{ out.push(JSON.parse(localStorage.getItem(k))) }catch{}
        }
      }
      return out;
    },

    subscribe(code, fn){
      if(!localListeners.has(code)) localListeners.set(code, new Set());
      localListeners.get(code).add(fn);
      return () => localListeners.get(code)?.delete(fn);
    },

    /** generate stable id per device-tab */
    getOrCreatePlayerId(){
      let id = localStorage.getItem('bingo-player-id');
      if(!id){
        id = 'p_' + Math.random().toString(36).slice(2,10);
        localStorage.setItem('bingo-player-id', id);
      }
      return id;
    },
  };

  global.Sync = Sync;
})(window);

/*
 ─── SUPABASE SWAP NOTES ────────────────────────────────────────
 To migrate to Supabase later, replace the storage layer above:
   - rooms table (code PK, state JSONB, updated_at)
   - subscribe via supabase.channel().on('postgres_changes', ...)
   - keep the same Sync.* method signatures
 The UI code only depends on this API — no other changes needed.
*/
