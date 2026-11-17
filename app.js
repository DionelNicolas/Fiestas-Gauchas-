
/* ==========================================
   FIESTAS GAUCHAS 🇦🇷
   APLICACION - VERSION CON SUPABASE
   ========================================== */

// ==========================================
// CONFIGURACION SUPABASE
// ==========================================

const SUPABASE_URL = 'https://azaimadkqssbsljpjdqo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UWmpG4BAoWVOJWuzVBppgQ_lwPXbUyP';

let supabaseClient = null;

try {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
    console.log('Supabase conectado.');
  } else {
    console.warn('Supabase no está disponible.');
  }
} catch (error) {
  console.error('Error de conexión Supabase:', error);
}

// ==========================================
// EVENTOS DE DEMOSTRACION
// ==========================================

const sampleEvents = [
  {
    id: 1,
    title: 'Gran Festival de Doma y Tradición',
    type: 'Doma',
    place: 'Mercedes, Corrientes',
    date: '21 de noviembre',
    price: 'Precio a confirmar',
    icon: '🐎',
    description: 'Jineteadas, música en vivo, comidas regionales y encuentro de tradición gaucha.',
    isDemo: true
  },
  {
    id: 2,
    title: 'Noche de Chamamé',
    type: 'Baile',
    place: 'Corrientes Capital, Corrientes',
    date: '27 de noviembre',
    price: 'Consultar entradas',
    icon: '🪗',
    description: 'Una noche para disfrutar de conjuntos chamameceros y baile popular.',
    isDemo: true
  },
  {
    id: 3,
    title: 'Fiesta del Encuentro Rural',
    type: 'Fiesta de campo',
    place: 'Villaguay, Entre Ríos',
    date: '29 de noviembre',
    price: 'Entrada a confirmar',
    icon: '🌾',
    description: 'Juegos tradicionales, feria de productores, gastronomía y música.',
    isDemo: true
  },
  {
    id: 4,
    title: 'Jineteada y Festival Folclórico',
    type: 'Doma',
    place: 'Jesús María, Córdoba',
    date: '5 de diciembre',
    price: 'Consultar entradas',
    icon: '🤠',
    description: 'Destrezas criollas, payadores y artistas invitados.',
    isDemo: true
  }
];

// ==========================================
// VARIABLES
// ==========================================

let filter = 'Todos';
let query = '';
let page = 'home';

let eventsEl;
let searchInput;
let allEvents = [...sampleEvents];

// ==========================================
// ICONOS
// ==========================================

function getEventIcon(category) {
  const icons = {
    'Doma': '🐎',
    'Baile': '🪗',
    'Fiesta de campo': '🌾',
    'Festival': '🎶'
  };

  return icons[category] || '🤠';
}

// ==========================================
// CARGAR EVENTOS DESDE SUPABASE
// ==========================================

async function loadEvents() {
  if (!supabaseClient) {
    render();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('event_date', { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      allEvents = data.map(event => ({
        id: event.id,
        title: event.title,
        type: event.category || 'Evento gaucho',
        place: [event.locality, event.province]
          .filter(Boolean).join(', '),
        date: event.event_date
          ? new Date(event.event_date + 'T12:00:00')
              .toLocaleDateString('es-AR')
          : 'Fecha a confirmar',
        price: event.price || 'Consultar entradas',
        icon: getEventIcon(event.category),
        description: event.description || 'Sin descripción disponible.',
        isDemo: false
      }));
    } else {
      allEvents = [...sampleEvents];
    }

    render();

  } catch (error) {
    console.error('Error al cargar eventos:', error);
    allEvents = [...sampleEvents];
    render();
  }
}

// ==========================================
// FAVORITOS
// ==========================================

function getSaved() {
  try {
    return JSON.parse(localStorage.getItem('fg_saved') || '[]');
  } catch (error) {
    return [];
  }
}

function saveFavorites(ids) {
  try {
    localStorage.setItem('fg_saved', JSON.stringify(ids));
  } catch (error) {
    console.error('No se pudieron guardar los favoritos:', error);
  }
}

// ==========================================
// MOSTRAR EVENTOS
// ==========================================

function render() {
  if (!eventsEl) return;

  let list = allEvents.filter(event => {
    const matchesFilter =
      filter === 'Todos' || event.type === filter;

    const searchable =
      `${event.title} ${event.place} ${event.type}`.toLowerCase();

    const matchesSearch = searchable.includes(query);

    return matchesFilter && matchesSearch;
  });

  if (page === 'saved') {
    const favorites = getSaved();
    list = list.filter(event =>
      favorites.includes(event.id) ||
      favorites.includes(String(event.id))
    );
  }

  const count = document.querySelector('#count');

  if (count) {
    count.textContent = `${list.length} eventos`;
  }

  if (list.length === 0) {
    eventsEl.innerHTML = `
      <div class="empty">
        No hay eventos para mostrar con esta búsqueda.
      </div>
    `;
    return;
  }

  eventsEl.innerHTML = list.map(event => `
    <article class="event-card" data-id="${event.id}">
      <div class="event-art">${event.icon}</div>

      <div class="event-info">
        <div class="tag">${event.type}</div>
        <h3>${event.title}</h3>
        <p class="meta">📍 ${event.place}</p>
        <p class="meta">📅 ${event.date}</p>
        <div class="price">${event.price}</div>
        ${event.isDemo ? '<small>Evento demostrativo</small>' : ''}
      </div>

      <div class="arrow">›</div>
    </article>
  `).join('');
}

// ==========================================
// DETALLE DE EVENTOS
// ==========================================

function openDetail(event) {
  const detail = document.querySelector('#detailContent');
  const dialog = document.querySelector('#detailDialog');

  if (!detail || !dialog) return;

  const isSaved = getSaved().some(
    id => String(id) === String(event.id)
  );

  detail.innerHTML = `
    <div class="detail-art">${event.icon}</div>
    <div class="tag">${event.type}</div>
    <h2 class="detail-title">${event.title}</h2>
    <p class="meta">📍 ${event.place}</p>
    <p class="meta">📅 ${event.date}</p>
    <p class="price">${event.price}</p>
    <p class="detail-copy">${event.description}</p>

    ${event.isDemo ? `
      <p class="detail-copy">
        <strong>Atención:</strong>
        publicación demostrativa. Los datos no representan una convocatoria confirmada.
      </p>
    ` : ''}

    <button class="primary full" id="saveBtn">
      ${isSaved ? '♥ Quitar de guardados' : '♡ Guardar evento'}
    </button>
  `;

  const saveButton = document.querySelector('#saveBtn');

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      let favorites = getSaved();

      if (favorites.some(id => String(id) === String(event.id))) {
        favorites = favorites.filter(
          id => String(id) !== String(event.id)
        );
      } else {
        favorites.push(event.id);
      }

      saveFavorites(favorites);
      openDetail(event);
      render();
    });
  }

  if (!dialog.open) dialog.showModal();
}

// ==========================================
// VENTANAS INFORMATIVAS
// ==========================================

function info(title, message) {
  const titleEl = document.querySelector('#infoTitle');
  const textEl = document.querySelector('#infoText');
  const dialog = document.querySelector('#infoDialog');

  if (!titleEl || !textEl || !dialog) {
    alert(message);
    return;
  }

  titleEl.textContent = title;
  textEl.textContent = message;

  if (!dialog.open) dialog.showModal();
}

// ==========================================
// BUSCADOR Y FILTROS
// ==========================================

function setupSearch() {
  searchInput = document.querySelector('#search');

  if (!searchInput) return;

  searchInput.addEventListener('input', event => {
    query = event.target.value.trim().toLowerCase();
    render();
  });
}

function setupFilters() {
  document.querySelectorAll('.chip').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(item => {
        item.classList.remove('active');
      });

      button.classList.add('active');
      filter = button.dataset.filter || 'Todos';
      render();
    });
  });
}

// ==========================================
// CERRAR VENTANAS
// ==========================================

function setupDialogs() {
  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = button.closest('dialog');
      if (dialog) dialog.close();
    });
  });
}

// ==========================================
// CUENTAS DE USUARIO
// ==========================================

async function accountAccess() {
  if (!supabaseClient) {
    alert('No se pudo conectar con Supabase.');
    return;
  }

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    const session = data.session;

    if (session) {
      const option = prompt(
        'Tu cuenta está iniciada: ' + session.user.email +
        '\n\n1. Ver mi cuenta' +
        '\n2. Cerrar sesión'
      );

      if (option === '1') {
        alert('Cuenta activa: ' + session.user.email);
      }

      if (option === '2') {
        const result = await supabaseClient.auth.signOut();
        if (result.error) throw result.error;
        alert('Sesión cerrada correctamente.');
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
      alert('Ingresá un correo válido.');
      return;
    }

    const password = prompt('Ingresá tu contraseña:');
    if (!password) return;

    if (option === '1') {
      if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      const result = await supabaseClient.auth.signUp({
        email: email.trim(),
        password
      });

      if (result.error) throw result.error;

      alert(
        result.data.session
          ? '¡Tu cuenta fue creada correctamente!'
          : 'Registro realizado. Revisá tu correo para confirmar la cuenta.'
      );
    }

    if (option === '2') {
      const result =
        await supabaseClient.auth.signInWithPassword({
          email: email.trim(),
          password
        });

      if (result.error) throw result.error;
      alert('¡Bienvenido a Fiestas gauchas!');
    }

  } catch (error) {
    alert('No se pudo completar la operación: ' + error.message);
  }
}

// ==========================================
// NAVEGACION
// ==========================================

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
      page = button.dataset.page || 'home';

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
}

// ==========================================
// ORGANIZADORES
// ==========================================

function setupOrganizer() {
  const button = document.querySelector('#organizerBtn');
  if (!button) return;

  button.addEventListener('click', async () => {
    if (!supabaseClient) {
      alert('No se pudo conectar con Supabase.');
      return;
    }

    try {
      const { data, error } =
        await supabaseClient.auth.getSession();

      if (error) throw error;

      if (!data.session) {
        alert('Primero tenés que iniciar sesión.');
        return;
      }

      info(
        'Publicar un evento',
        'Para publicar necesitás solicitar una cuenta de organizador y esperar la aprobación del administrador.'
      );

    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
}

// ==========================================
// PERFIL
// ==========================================

function setupProfile() {
  const button = document.querySelector('#profileBtn');
  if (!button) return;

  button.addEventListener('click', accountAccess);
}

// ==========================================
// INICIO DE LA APLICACION
// ==========================================

function startApp() {
  try {
    eventsEl = document.querySelector('#events');

    if (!eventsEl) {
      console.error('No se encontró el contenedor #events.');
      return;
    }

    setupSearch();
    setupFilters();
    setupDialogs();
    setupNavigation();
    setupOrganizer();
    setupProfile();

    eventsEl.addEventListener('click', event => {
      const card = event.target.closest('[data-id]');
      if (!card) return;

      const selectedEvent = allEvents.find(
        item => String(item.id) === card.dataset.id
      );

      if (selectedEvent) openDetail(selectedEvent);
    });

    if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Estado de cuenta:', event);
      });
    }

    loadEvents();

    console.log('Fiestas gauchas inició correctamente.');

  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    alert('Error al iniciar Fiestas gauchas: ' + error.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
