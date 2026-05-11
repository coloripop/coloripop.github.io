// ─── TEACHER AUTH GATE ─────────────────────────────────────────
// Simple client-side password gate for caller.html and verify.html.
// NOT cryptographic security — this is a friction layer to keep
// students from peeking at the answer key. Easily bypassed by
// anyone who opens DevTools.
//
// To change the password, edit TEACHER_PASSWORD below.

(function(){
  const TEACHER_PASSWORD = 'profe2024';
  const STORAGE_KEY = 'bingo-teacher-auth';
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

  function isAuthed(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return false;
      const {ok, ts} = JSON.parse(raw);
      if(!ok) return false;
      if(Date.now() - ts > SESSION_TTL) return false;
      return true;
    }catch(e){ return false; }
  }

  function setAuthed(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ok:true, ts:Date.now()}));
  }

  function logout(){
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
  window.teacherLogout = logout;

  function getLang(){
    return localStorage.getItem('bingo-lang') || 'es';
  }

  function showGate(){
    const lang = getLang();
    const T = {
      es: {
        title: 'Zona del profe',
        sub: 'Esta sección está protegida. Ingresa la contraseña para continuar.',
        ph: 'Contraseña',
        btn: 'Entrar',
        wrong: 'Contraseña incorrecta',
        back: '← Volver al hub',
        hint: 'Si eres jugadora o jugador, vuelve al hub y elige otra opción.'
      },
      en: {
        title: 'Teacher zone',
        sub: 'This section is protected. Enter the password to continue.',
        ph: 'Password',
        btn: 'Enter',
        wrong: 'Wrong password',
        back: '← Back to hub',
        hint: "If you're a player, go back to the hub and pick another option."
      }
    }[lang];

    // Hide everything that may have already rendered
    document.documentElement.style.overflow = 'hidden';

    const gate = document.createElement('div');
    gate.id = 'teacher-gate';
    gate.innerHTML = `
      <style>
        #teacher-gate{
          position:fixed;inset:0;z-index:99999;
          background:#0d0612;
          display:flex;align-items:center;justify-content:center;
          padding:1.4rem;
          font-family:'DM Sans', system-ui, sans-serif;
        }
        #teacher-gate::before, #teacher-gate::after{
          content:'';position:absolute;border-radius:50%;
          filter:blur(80px);opacity:.4;pointer-events:none;
        }
        #teacher-gate::before{
          width:380px;height:380px;background:#f03b72;
          top:-100px;left:-100px;
        }
        #teacher-gate::after{
          width:420px;height:420px;background:#7c3aed;
          bottom:-120px;right:-100px;
        }
        #teacher-gate .gbox{
          position:relative;
          width:100%;max-width:420px;
          background:rgba(28,18,40,.92);
          backdrop-filter:blur(12px);
          border:1.5px solid rgba(255,255,255,.12);
          border-radius:24px;
          padding:2rem 1.8rem;
          display:flex;flex-direction:column;gap:1.1rem;
          box-shadow:0 30px 80px rgba(0,0,0,.5);
        }
        #teacher-gate .glock{
          width:56px;height:56px;border-radius:16px;
          background:linear-gradient(135deg,#f03b72,#7c3aed);
          display:flex;align-items:center;justify-content:center;
          font-size:28px;
        }
        #teacher-gate .gtitle{
          font-family:'Syne', sans-serif;
          font-size:28px;font-weight:800;color:#fff;
          letter-spacing:-1px;line-height:1.1;
        }
        #teacher-gate .gsub{
          font-size:14px;color:rgba(255,255,255,.65);
          line-height:1.5;
        }
        #teacher-gate input{
          width:100%;
          background:rgba(0,0,0,.35);
          border:1.5px solid rgba(255,255,255,.15);
          border-radius:12px;
          color:#fff;
          font-family:'Space Mono', monospace;
          font-size:16px;letter-spacing:2px;
          padding:14px 16px;
          outline:none;
          transition:border-color .2s, background .2s;
        }
        #teacher-gate input:focus{
          border-color:#f03b72;
          background:rgba(0,0,0,.5);
        }
        #teacher-gate input::placeholder{
          color:rgba(255,255,255,.3);letter-spacing:1px;
        }
        #teacher-gate .gerror{
          font-size:13px;color:#ff6b8a;font-weight:600;
          min-height:1.2em;
        }
        #teacher-gate .gbtn{
          background:#fff;color:#1c1228;
          border:none;
          padding:14px 18px;
          border-radius:12px;
          font-size:14px;font-weight:700;
          cursor:pointer;
          transition:transform .15s, opacity .2s;
          font-family:inherit;
        }
        #teacher-gate .gbtn:hover{transform:translateY(-1px)}
        #teacher-gate .gbtn:active{transform:translateY(0);opacity:.85}
        #teacher-gate .gback{
          background:transparent;color:rgba(255,255,255,.55);
          border:none;padding:8px;
          font-size:13px;cursor:pointer;font-family:inherit;
          text-decoration:underline;text-underline-offset:3px;
        }
        #teacher-gate .gback:hover{color:#fff}
        #teacher-gate .ghint{
          font-size:12px;color:rgba(255,255,255,.4);
          text-align:center;line-height:1.5;
          padding-top:.4rem;border-top:1px solid rgba(255,255,255,.08);
        }
        #teacher-gate .glang{
          position:absolute;top:14px;right:14px;
          display:flex;gap:4px;
        }
        #teacher-gate .glang button{
          background:transparent;border:1px solid rgba(255,255,255,.15);
          color:rgba(255,255,255,.6);
          width:32px;height:28px;border-radius:8px;
          font-size:11px;font-weight:700;cursor:pointer;
          font-family:inherit;
        }
        #teacher-gate .glang button.on{
          background:#fff;color:#1c1228;border-color:#fff;
        }
      </style>
      <div class="gbox">
        <div class="glang">
          <button data-l="es" class="${lang==='es'?'on':''}">ES</button>
          <button data-l="en" class="${lang==='en'?'on':''}">EN</button>
        </div>
        <div class="glock">🔒</div>
        <div>
          <div class="gtitle">${T.title}</div>
          <div class="gsub" style="margin-top:6px">${T.sub}</div>
        </div>
        <form id="gate-form" autocomplete="off">
          <input id="gate-input" type="password" placeholder="${T.ph}" autofocus/>
          <div class="gerror" id="gate-err"></div>
          <button type="submit" class="gbtn" style="width:100%;margin-top:6px">${T.btn}</button>
        </form>
        <button class="gback" onclick="location.href='index.html'">${T.back}</button>
        <div class="ghint">${T.hint}</div>
      </div>
    `;
    document.body.appendChild(gate);

    const input = gate.querySelector('#gate-input');
    const err = gate.querySelector('#gate-err');
    const form = gate.querySelector('#gate-form');
    const T_wrong = T.wrong;

    form.addEventListener('submit', e=>{
      e.preventDefault();
      if(input.value === TEACHER_PASSWORD){
        setAuthed();
        gate.remove();
        document.documentElement.style.overflow = '';
      } else {
        err.textContent = T_wrong;
        input.value = '';
        gate.querySelector('.gbox').animate(
          [{transform:'translateX(-8px)'},{transform:'translateX(8px)'},{transform:'translateX(0)'}],
          {duration:280}
        );
      }
    });

    gate.querySelectorAll('.glang button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        localStorage.setItem('bingo-lang', btn.dataset.l);
        gate.remove();
        document.documentElement.style.overflow = '';
        showGate();
      });
    });
  }

  // Run gate immediately if not authed
  if(!isAuthed()){
    if(document.body){
      showGate();
    } else {
      document.addEventListener('DOMContentLoaded', showGate);
    }
  }
})();
