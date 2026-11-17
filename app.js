
/* =====================================
   FIESTAS GAUCHAS - APLICACION
   ===================================== */

// CONEXION CON SUPABASE
const SUPABASE_URL = 'https://azaimadkqssbsljpjdqo.supabase.co';

// Pegá aquí tu Publishable Key de Supabase
const SUPABASE_KEY = 'sb_publishable_UWmpG4BAoWVOJWuzVBppgQ_lwPXbUyP';

if (!window.supabase) {
  alert('No se pudo cargar Supabase. Revisá la conexión.');
}

const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;


// =====================================
// EVENTOS DEMOSTRATIVOS
// =====================================

const sampleEvents = [
  {
    id: 1,
    title: 'Gran Festival de Doma y Tradición',
    type: 'Doma',
    place: 'Mercedes, Corrientes',
    date: 'Fecha de ejemplo: 21 de noviembre',
    price: 'Precio a confirmar',
    icon: '🐎',
    description: 'Jineteadas, música en vivo, comidas regionales y encuentro de tradición gaucha.'
  },
  {
    id: 2,
    title: 'Noche de Chamamé',
    type: 'Baile',
    place: 'Corrientes Capital, Corrientes',
    date: 'Fecha de ejemplo: 27 de noviembre',
    price: 'Consultar entradas',
    icon: '🪗',
    description: 'Una noche para disfrutar de conjuntos chamameceros y baile popular.'
  },
  {
    id: 3,
    title: 'Fiesta del Encuentro Rural',
    type: 'Fiesta de campo',
    place: 'Villaguay, Entre Ríos',
    date: 'Fecha de ejemplo: 29 de noviembre',
    price: 'Entrada a confirmar',
    icon: '🌾',
    description: 'Juegos tradicionales, feria de productores, gastronomía y música.'
  },
  {
    id: 4,
    title: 'Jineteada y Festival Folclórico',
    type: 'Doma',
    place: 'Jesús María, Córdoba',
    date: 'Fecha de ejemplo: 5 de diciembre',
    price: 'Consultar entradas',
    icon: '🤠',
    description: 'Destrezas criollas, payadores y artistas invitados.'
  }
];


// =====================================
// VARIABLES
// =====================================

let filter = 'Todos';
let query = '';
let page = 'home';

const eventsEl = document.querySelector('#events');

const saved = () => {
  try {
    return JSON.parse(localStorage.getItem('fg_saved') || '[]');
  } catch {
    return [];
  }
};


// =====================================
// MOSTRAR EVENTOS
// =====================================

function render() {
  if (!eventsEl) return;

  let list = sampleEvents.filter(e =>
    (filter === 'Todos' || e.type === filter) &&
    (`${e.title} ${e.place} ${e.type}`)
      .toLowerCase()
      .includes(query)
  );

  if (page === 'saved') {
    list = list.filter(e => saved().includes(e.id));
  }

  const count = document.querySelector('#count');

  if (count) {
    count.textContent = `${list.length} eventos`;
  }

  eventsEl.innerHTML = list.length
    ? list.map(e => `
      <article class="event-card" data-id="${e.id}">
        <div class="event-art">${e.icon}</div>
        <div class="event-info">
          <div class="tag">${e.type}</div>
          <h3>${e.title}</h3>
          <p class="meta">📍 ${e.place}</p>
          <p class="meta">📅 ${e.date}</p>
          <div class="price">${e.price}</div>
        </div>
        <div class="arrow">›</div>
      </article>
    `).join('')
    : '<div class="empty">No hay eventos para mostrar con esta búsqueda.</div>';
}


// =====================================
// BUSCADOR
// =====================================

const searchInput = document.querySelector('#search');

if (searchInput) {
  searchInput.addEventListener('input', e => {
    query = e.target.value.toLowerCase();
    render();
  });
}


// =====================================
// FILTROS
// =====================================

document.querySelectorAll('.chip').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(item => {
      item.classList.remove('active');
    });

    button.classList.add('active');
    filter = button.dataset.filter;
    render();
  });
});


// =====================================
// DETALLE DE EVENTOS
// =====================================

function openDetail(event) {
  const detail = document.querySelector('#detailContent');

  if (!detail) return;

  const isSaved = saved().includes(event.id);

  detail.innerHTML = `
    <div class="detail-art">${event.icon}</div>
    <div class="tag">${event.type}</div>
    <h2 class="detail-title">${event.title}</h2>
    <p class="meta">📍 ${event.place}</p>
    <p class="meta">📅 ${event.date}</p>
    <p class="price">${event.price}</p>
    <p class="detail-copy">${event.description}</p>
    <p class="detail-copy">
      <strong>Atención:</strong>
      publicación demostrativa. Los datos no representan una convocatoria confirmada.
    </p>
    <button class="primary full" id="saveBtn">
      ${isSaved ? '♥ Quitar de guardados' : '♡ Guardar evento'}
    </button>
  `;

  document.querySelector('#saveBtn').onclick = () => {
    let current = saved();

    if (current.includes(event.id)) {
      current = current.filter(id => id !== event.id);
    } else {
      current.push(event.id);
    }

    localStorage.setItem('fg_saved', JSON.stringify(current));

    openDetail(event);
    render();
  };

  document.querySelector('#detailDialog').showModal();
}

if (eventsEl) {
  eventsEl.addEventListener('click', e => {
    const card = e.target.closest('[data-id]');

    if (!card) return;

    const event = sampleEvents.find(
      item => item.id === Number(card.dataset.id)
    );

    if (event) openDetail(event);
  });
}


// =====================================
// VENTANAS INFORMATIVAS
// =====================================

function info(title, text) {
  document.querySelector('#infoTitle').textContent = title;
  document.querySelector('#infoText').textContent = text;
  document.querySelector('#infoDialog').showModal();
}

document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => {
    button.closest('dialog').close();
  });
});


// =====================================
// REGISTRO E INICIO DE SESION
// =====================================

async function accountAccess() {
  if (!supabase) {
    alert('No se pudo conectar con Supabase.');
    return;
  }

  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData.session;

    if (session) {
      const option = prompt(
        'Tu cuenta está iniciada: ' + session.user.email +
        '\n\n1. Ver mi cuenta' +
        '\n2. Cerrar sesión'
      );

      if (option === '2') {
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        alert('Sesión cerrada correctamente.');
      }

      if (option === '1') {
        alert('Cuenta activa: ' + session.user.email);
      }

      return;
    }

    const option = prompt(
      'BIENVENIDO A FIESTAS GAUCHAS\n\n' +
      '1. Crear una cuenta\n' +
      '2. Iniciar sesión'
    );

    if (option !== '1' && option !== '2') return;

    const email = prompt('Ingresá tu correo electrónico:');

    if (!email || !email.includes('@')) {
      alert('Ingresá un correo electrónico válido.');
      return;
    }

    const password = prompt('Ingresá tu contraseña:');

    if (!password) return;

    if (option === '1') {
      if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });

      if (error) throw error;

      if (data.session) {
        alert('¡Tu cuenta fue creada correctamente!');
      } else {
        alert(
          '¡Registro realizado! Revisá tu correo electrónico ' +
          'para confirmar tu cuenta antes de iniciar sesión.'
        );
      }

    } else {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

      if (error) throw error;

      alert('¡Bienvenido a Fiestas gauchas!');
    }

  } catch (error) {
    alert('No se pudo completar la operación: ' + error.message);
  }
}


// =====================================
// NAVEGACION PRINCIPAL
// =====================================

document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => {
    page = button.dataset.page;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('selected', item === button);
    });

    if (page === 'home' || page === 'saved') {
      render();
    }

    if (page === 'account') {
      accountAccess();
    }

    if (page === 'map') {
      info(
        'Mapa de eventos',
        'El mapa interactivo se incorporará en una próxima versión.'
      );
    }
  });
});


// =====================================
// PUBLICACION DE EVENTOS
// =====================================

const organizerButton = document.querySelector('#organizerBtn');

if (organizerButton) {
  organizerButton.onclick = async () => {
    if (!supabase) {
      alert('No se pudo conectar con Supabase.');
      return;
    }

    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      alert('Primero tenés que iniciar sesión.');
      return;
    }

    info(
      'Publicar un evento',
      'Para publicar necesitás una cuenta de organizador aprobada por el administrador.'
    );
  };
}


// =====================================
// PERFIL
// =====================================

const profileButton = document.querySelector('#profileBtn');

if (profileButton) {
  profileButton.onclick = () => accountAccess();
}


// =====================================
// ACTUALIZACION DE SESION
// =====================================

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Estado de cuenta:', event);
  });
}


// =====================================
// APLICACION SIN CONEXION
// =====================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(error => console.log('Service Worker:', error));
  });
}


// =====================================
// INICIAR APLICACION
// =====================================

// INICIAR APLICACION

try {
  const caja = document.querySelector('#events');

  if (!caja) {
    alert('ERROR: No se encontró el contenedor #events');
  } else {
    render();

    alert(
      'Diagnóstico correcto.\n' +
      'Eventos encontrados: ' +
      caja.querySelectorAll('.event-card').length
    );
  }
} catch (error) {
  alert('ERROR EN LA APLICACIÓN: ' + error.message);
}
