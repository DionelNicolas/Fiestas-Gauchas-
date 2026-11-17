const SUPABASE_URL = 'https://azaimadkqssbsljpjdqo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UWmpG4BAoWVOJWuzVBppgQ_lwPXbUyP';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const sampleEvents = [
 {id:1,title:'Gran Festival de Doma y Tradición',type:'Doma',place:'Mercedes, Corrientes',date:'Fecha de ejemplo: 21 de noviembre',price:'Precio a confirmar',icon:'🐎',description:'Jineteadas, música en vivo, comidas regionales y encuentro de tradición gaucha.'},
 {id:2,title:'Noche de Chamamé',type:'Baile',place:'Corrientes Capital, Corrientes',date:'Fecha de ejemplo: 27 de noviembre',price:'Consultar entradas',icon:'🪗',description:'Una noche para disfrutar de conjuntos chamameceros y baile popular.'},
 {id:3,title:'Fiesta del Encuentro Rural',type:'Fiesta de campo',place:'Villaguay, Entre Ríos',date:'Fecha de ejemplo: 29 de noviembre',price:'Entrada a confirmar',icon:'🌾',description:'Juegos tradicionales, feria de productores, gastronomía y música.'},
 {id:4,title:'Jineteada y Festival Folclórico',type:'Doma',place:'Jesús María, Córdoba',date:'Fecha de ejemplo: 5 de diciembre',price:'Consultar entradas',icon:'🤠',description:'Destrezas criollas, payadores y artistas invitados.'}
];
let filter='Todos', query='', page='home';
const eventsEl=document.querySelector('#events');
const saved=()=>JSON.parse(localStorage.getItem('fg_saved')||'[]');
function render(){
 let list=sampleEvents.filter(e=>(filter==='Todos'||e.type===filter)&&(`${e.title} ${e.place} ${e.type}`.toLowerCase().includes(query)));
 if(page==='saved') list=list.filter(e=>saved().includes(e.id));
 document.querySelector('#count').textContent=`${list.length} eventos`;
 eventsEl.innerHTML=list.length?list.map(e=>`<article class="event-card" data-id="${e.id}"><div class="event-art">${e.icon}</div><div class="event-info"><div class="tag">${e.type}</div><h3>${e.title}</h3><p class="meta">📍 ${e.place}</p><p class="meta">📅 ${e.date}</p><div class="price">${e.price}</div></div><div class="arrow">›</div></article>`).join(''):'<div class="empty">No hay eventos para mostrar con esta búsqueda.</div>';
}
document.querySelector('#search').addEventListener('input',e=>{query=e.target.value.toLowerCase();render()});
document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render()}));
eventsEl.addEventListener('click',e=>{const card=e.target.closest('[data-id]');if(!card)return;const item=sampleEvents.find(x=>x.id===Number(card.dataset.id));openDetail(item)});
function openDetail(e){
 const isSaved=saved().includes(e.id);
 document.querySelector('#detailContent').innerHTML=`<div class="detail-art">${e.icon}</div><div class="tag">${e.type}</div><h2 class="detail-title">${e.title}</h2><p class="meta">📍 ${e.place}</p><p class="meta">📅 ${e.date}</p><p class="price">${e.price}</p><p class="detail-copy">${e.description}</p><p class="detail-copy"><strong>Atención:</strong> publicación demostrativa. Los datos no representan una convocatoria confirmada.</p><button class="primary full" id="saveBtn">${isSaved?'♥ Quitar de guardados':'♡ Guardar evento'}</button>`;
 document.querySelector('#saveBtn').onclick=()=>{let s=saved();s=isSaved?s.filter(x=>x!==e.id):[...s,e.id];localStorage.setItem('fg_saved',JSON.stringify(s));document.querySelector('#saveBtn').textContent=isSaved?'♡ Guardar evento':'♥ Quitar de guardados';render()};
 document.querySelector('#detailDialog').showModal();
}
function info(title,text){document.querySelector('#infoTitle').textContent=title;document.querySelector('#infoText').textContent=text;document.querySelector('#infoDialog').showModal()}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelector('#organizerBtn').onclick=()=>info('Publicar un evento','Estamos preparando el registro de organizadores. En esta versión inicial todavía no se reciben publicaciones reales.');
document.querySelector('#profileBtn').onclick=()=>info('Tu cuenta','El registro de usuarios se incorporará en la siguiente etapa.');
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{
 page=b.dataset.page;document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('selected',x===b));
 if(page==='map')info('Mapa de eventos','El mapa interactivo se incorporará en una próxima versión.');
 if(page==='account')info('Tu cuenta','El registro e inicio de sesión se incorporarán próximamente.');
 if(page==='home'||page==='saved')render();
}));
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
