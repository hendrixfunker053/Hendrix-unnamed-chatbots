const $ = (id) => document.getElementById(id);
const STORE = 'uhc.v1.';
const DEFAULT_HELPER = {
  id: 'nova-default', name: 'NOVA', role: 'Ingeniería de software',
  description: 'Eres una ingeniera de software inteligente, paciente, curiosa y directa. Ayudas a diseñar, programar, depurar y explicar soluciones. Entiendes el problema antes de cambiar código, respetas las versiones y limitaciones indicadas, y nunca afirmas que ejecutaste o probaste algo si no lo hiciste. Si falta información esencial, preguntas. Explicas con claridad y colaboras sin imponerte.',
  backstory: 'Creada para resolver problemas técnicos y ayudar a convertir ideas en proyectos reales.'
};
const safeRead = (key, fallback) => { try { const raw = localStorage.getItem(STORE + key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const safeWrite = (key, value) => { try { localStorage.setItem(STORE + key, JSON.stringify(value)); } catch { /* Storage may be disabled or full. */ } };
let helpers = safeRead('helpers', [DEFAULT_HELPER]);
if (!Array.isArray(helpers) || !helpers.length) helpers = [DEFAULT_HELPER];
let chats = safeRead('chats', []);
let activeChatId = safeRead('activeChatId', null);
let selectedHelperIds = safeRead('selectedHelperIds', [helpers[0].id]);
let busy = false;
let drawerBefore = null;
if (!chats.length) { const c = newChatObject(); chats = [c]; activeChatId = c.id; persistChats(); }
if (!chats.some(c => c.id === activeChatId)) activeChatId = chats[0].id;
selectedHelperIds = selectedHelperIds.filter(id => helpers.some(h => h.id === id));
if (!selectedHelperIds.length) selectedHelperIds = [helpers[0].id];

function newChatObject() { return { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title: 'Nuevo chat', messages: [], updatedAt: Date.now() }; }
function currentChat() { return chats.find(c => c.id === activeChatId) || chats[0]; }
function persistChats() { safeWrite('chats', chats); safeWrite('activeChatId', activeChatId); }
function persistHelpers() { safeWrite('helpers', helpers); safeWrite('selectedHelperIds', selectedHelperIds); }
function activeHelpers() { return selectedHelperIds.map(id => helpers.find(h => h.id === id)).filter(Boolean); }
function escapeHTML(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderText(s='') {
  // Intentionally small formatter: escapes HTML first; supports fenced code and inline code only.
  return escapeHTML(s).replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>').replace(/`([^`\n]+)`/g, '<code>$1</code>');
}
function renderChats() {
  $('chatList').innerHTML = chats.slice().sort((a,b)=>b.updatedAt-a.updatedAt).map(c => `<button class="chat-item ${c.id===activeChatId?'active':''}" data-chat="${escapeHTML(c.id)}">${escapeHTML(c.title || 'Nuevo chat')}</button>`).join('') || '<div class="empty-history">Tus chats aparecerán aquí.</div>';
  $('chatList').querySelectorAll('[data-chat]').forEach(b => b.addEventListener('click', () => { activeChatId = b.dataset.chat; persistChats(); renderAll(); closeDrawers(); }));
}
function renderMessages() {
  const c = currentChat();
  $('activeChatTitle').textContent = c.title || 'Nuevo chat';
  $('welcome').hidden = c.messages.length > 0;
  $('messages').innerHTML = c.messages.map(m => `<article class="message ${m.role==='user'?'user':'assistant'}"><div class="avatar">${m.role==='user'?'T':'✦'}</div><div class="message-body"><div class="message-head"><strong>${m.role==='user'?'Tú':escapeHTML(m.name || 'Asistente')}</strong>${m.role==='assistant'&&m.roleLabel?`<span>${escapeHTML(m.roleLabel)}</span>`:''}</div><div class="message-content">${renderText(m.content)}</div></div></article>`).join('');
  $('chatArea').scrollTop = $('chatArea').scrollHeight;
}
function renderActiveHelpers() {
  const list = activeHelpers();
  $('activeHelpers').innerHTML = list.map(h => `<span class="helper-chip">${escapeHTML(h.name)}</span>`).join('') || '<span class="helper-chip">Ninguno</span>';
  $('helperCount').textContent = helpers.length;
}
function renderHelperOptions() {
  $('helperOptions').innerHTML = helpers.map(h => `<label class="helper-option"><input type="checkbox" value="${escapeHTML(h.id)}" ${selectedHelperIds.includes(h.id)?'checked':''}><span><strong>${escapeHTML(h.name)}</strong><p>${escapeHTML(h.role)}${h.backstory?` · ${escapeHTML(h.backstory)}`:''}</p><p>${escapeHTML(h.description)}</p></span></label>`).join('');
}
function renderStatus() {
  const configured = Boolean(safeRead('backendUrl','').trim());
  $('modeText').textContent = configured ? 'Backend configurado' : 'API sin configurar';
  $('modeBadge').querySelector('.status-dot').style.background = configured ? 'var(--good)' : '#797b8a';
}
function renderAll() { renderChats(); renderMessages(); renderActiveHelpers(); renderStatus(); }
function openDrawer(id) { closeDrawers(); drawerBefore = document.activeElement; $(id).hidden = false; $('overlay').hidden = false; if(id==='helpersDrawer') renderHelperOptions(); }
function closeDrawers() { ['helpersDrawer','createDrawer','settingsDrawer'].forEach(id => $(id).hidden = true); $('overlay').hidden = true; }
function newChat() { const c = newChatObject(); chats.push(c); activeChatId = c.id; persistChats(); renderAll(); $('messageInput').focus(); }
function addMessage(msg) { const c = currentChat(); c.messages.push(msg); c.updatedAt = Date.now(); if (msg.role === 'user' && c.title === 'Nuevo chat') c.title = msg.content.trim().slice(0, 34) || 'Nuevo chat'; persistChats(); renderAll(); }
function setBusy(value) { busy = value; $('sendBtn').disabled = value; $('sendBtn').style.opacity = value ? '.55' : '1'; $('messageInput').disabled = value; }
function backendUrl() { return safeRead('backendUrl','').trim().replace(/\/$/, ''); }
async function sendMessage(text) {
  const prompt = text.trim(); if (!prompt || busy) return;
  if (!activeHelpers().length) { openDrawer('helpersDrawer'); return; }
  $('welcome').hidden = true; $('messageInput').value = ''; autoGrow();
  addMessage({role:'user',content:prompt});
  const selected = activeHelpers();
  const typing = document.createElement('article'); typing.className='message assistant'; typing.id='typingIndicator'; typing.innerHTML='<div class="avatar">✦</div><div class="message-body"><div class="message-head"><strong>Equipo de asistentes</strong></div><div class="typing">Pensando en conjunto…</div></div>';
  $('messages').appendChild(typing); $('chatArea').scrollTop = $('chatArea').scrollHeight; setBusy(true);
  try {
    const base = backendUrl();
    if (!base) throw new Error('Configura la URL de tu backend en Ajustes de API antes de enviar mensajes.');
    const history = currentChat().messages.slice(-16).map(m => ({role:m.role,content:m.content}));
    const response = await fetch(base + '/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history, assistants:selected.map(h=>({name:h.name,role:h.role,description:h.description,backstory:h.backstory||''}))})});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || `El servidor respondió ${response.status}.`);
    if (!data.reply) throw new Error('El backend respondió, pero no incluyó el texto de la IA.');
    addMessage({role:'assistant',name:selected.length>1?'Equipo de asistentes':selected[0].name,roleLabel:selected.map(h=>h.role).join(' · '),content:data.reply});
  } catch (err) {
    addMessage({role:'assistant',name:'Aviso de conexión',roleLabel:'Configuración',content:`No pude obtener una respuesta todavía. ${err.message}\n\nTu mensaje sigue guardado en este dispositivo. Configura el backend y vuelve a intentarlo.`});
  } finally { $('typingIndicator')?.remove(); setBusy(false); $('messageInput').focus(); }
}
function autoGrow() { const t=$('messageInput'); t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,180)+'px'; }

$('newChatBtn').addEventListener('click', () => { newChat(); $('sidebar').classList.remove('open'); });
$('helpersBtn').addEventListener('click', () => openDrawer('helpersDrawer'));
$('chooseHelpersBtn').addEventListener('click', () => openDrawer('helpersDrawer'));
$('settingsBtn').addEventListener('click', () => { $('backendUrl').value=safeRead('backendUrl',''); $('connectionMessage').textContent=''; openDrawer('settingsDrawer'); });
$('createHelperBtn').addEventListener('click', () => openDrawer('createDrawer'));
$('overlay').addEventListener('click', closeDrawers);
document.querySelectorAll('.close-drawer').forEach(b=>b.addEventListener('click',closeDrawers));
$('menuBtn').addEventListener('click',()=> $('sidebar').classList.toggle('open'));
$('applyHelpersBtn').addEventListener('click',()=>{ selectedHelperIds=Array.from($('helperOptions').querySelectorAll('input:checked')).map(x=>x.value); if(!selectedHelperIds.length){ $('connectionMessage').textContent='Selecciona al menos un asistente.'; return; } persistHelpers(); renderActiveHelpers(); closeDrawers(); });
$('createHelperForm').addEventListener('submit',e=>{ e.preventDefault(); const h={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:$('helperName').value.trim(),role:$('helperRole').value.trim(),description:$('helperDescription').value.trim(),backstory:$('helperBackstory').value.trim()}; if(!h.name||!h.role||!h.description)return; helpers.push(h); selectedHelperIds.push(h.id); persistHelpers(); $('createHelperForm').reset(); renderAll(); openDrawer('helpersDrawer'); });
$('settingsForm').addEventListener('submit',e=>{e.preventDefault(); const url=$('backendUrl').value.trim().replace(/\/$/,''); safeWrite('backendUrl',url); renderStatus(); $('connectionMessage').textContent=url?'Dirección guardada en este navegador. Ahora puedes probar la conexión.':'Dirección borrada.';});
$('testConnectionBtn').addEventListener('click',async()=>{ const base=$('backendUrl').value.trim().replace(/\/$/,''); if(!base){$('connectionMessage').textContent='Escribe primero la URL de tu backend.';return;} $('connectionMessage').textContent='Probando…'; try{const r=await fetch(base+'/api/health');const d=await r.json();if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);$('connectionMessage').textContent=d.configured?'Conexión correcta. El backend detectó la configuración del proveedor.':'Backend accesible, pero falta configurar el proveedor.';}catch(e){$('connectionMessage').textContent='No se pudo conectar: '+e.message;}});
$('composer').addEventListener('submit',e=>{e.preventDefault();sendMessage($('messageInput').value);});
$('messageInput').addEventListener('input',autoGrow);
$('messageInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('composer').requestSubmit();}});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{ $('messageInput').value=b.dataset.prompt; autoGrow(); $('messageInput').focus(); }));
if('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
renderAll();
