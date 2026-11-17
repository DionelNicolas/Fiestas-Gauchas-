
/* ==========================================
   FIESTAS GAUCHAS 🇦🇷
   APLICACIÓN - SUPABASE
   ========================================== */

// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://azaimadkqssbsljpjdqo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UWmpG4BAoWVOJWuzVBppgQ_lwPXbUyP';

let supabaseClient = null;
let filter = 'Todos';
let query = '';
let page = 'home';
let eventsEl = null;
let searchInput = null;
let allEvents = [];
let adminDialog = null;
let adminButton = null;

try {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
    console.log('Supabase conectado correctamente.');
  } else {
    console.error('No se encontró la librería Supabase.');
  }
} catch (error) {
  console.error('Error al iniciar Supabase:', error);
}

// SEGURIDAD HTML
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// ICONOS
function getEventIcon(category) {
  const icons = {
    'Doma': '🐎',
    'Baile': '🪗',
    'Fiesta de campo': '🌾',
    'Festival': '🎶'
  };
  return icons[category] || '🤠';
}

// FECHAS
function formatDate(date) {
  if (!date) return 'Fecha a confirmar';
  const parts = String(date).split('-');
  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : String(date);
}

// CARGAR EVENTOS
async function loadEvents() {
  if (!eventsEl) return;

  if (!supabaseClient) {
    allEvents = [];
    render();
    showLoadError('No se pudo conectar con Supabase.');
    return;
  }

  eventsEl.innerHTML = '<div class="empty">Cargando eventos...</div>';

  try {
    const { data, error } = await supabaseClient
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('event_date', { ascending: true });

    if (error) throw error;

    allEvents = (data || []).map(event => ({
      id: event.id,
      title: event.title || 'Evento sin título',
      type: event.category || 'Evento gaucho',
      place: [
        event.locality,
        event.province
      ].filter(Boolean).join(', ') || 'Ubicación a confirmar',
      venue: event.venue || '',
      date: formatDate(event.event_date),
      price: event.price || 'Consultar entradas',
      icon: getEventIcon(event.category),
      description: event.description || 'Sin descripción disponible.'
    }));

    render();
    console.log('Eventos publicados:', allEvents.length);

  } catch (error) {
    console.error('Error al cargar eventos:', error);
    allEvents = [];
    render();
    showLoadError(
      'No se pudieron cargar los eventos. Detalle: ' +
      (error.message || error)
    );
  }
}

function showLoadError(message) {
  const count = document.querySelector('#count');
  if (count) count.textContent = 'Error al cargar';

  if (eventsEl) {
    eventsEl.innerHTML = `
      <div class="empty">${escapeHTML(message)}</div>
    `;
  }
}

// FAVORITOS
function getSaved() {
  try {
    const value = JSON.parse(
      localStorage.getItem('fg_saved') || '[]'
    );
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function saveFavorites(ids) {
  try {
    localStorage.setItem('fg_saved', JSON.stringify(ids));
  } catch (error) {
    console.error('Error guardando favoritos:', error);
  }
}

// MOSTRAR EVENTOS
function render() {
  if (!eventsEl) return;

  let list = allEvents.filter(event => {
    const matchesFilter =
      filter === 'Todos' || event.type === filter;

    const searchable = `
      ${event.title}
      ${event.place}
      ${event.type}
      ${event.description}
    `.toLowerCase();

    return matchesFilter && searchable.includes(query);
  });

  if (page === 'saved') {
    const favorites = getSaved();
    list = list.filter(event =>
      favorites.some(id => String(id) === String(event.id))
    );
  }

  const count = document.querySelector('#count');
  if (count) count.textContent = `${list.length} eventos`;

  if (!list.length) {
    eventsEl.innerHTML = `
      <div class="empty">
        ${page === 'saved'
          ? 'Todavía no guardaste eventos.'
          : allEvents.length === 0
            ? 'Todavía no hay eventos publicados.'
            : 'No hay eventos para mostrar con esta búsqueda.'}
      </div>
    `;
    return;
  }

  eventsEl.innerHTML = list.map(event => `
    <article class="event-card"
      data-id="${escapeHTML(event.id)}"
      role="button"
      tabindex="0">

      <div class="event-art">${event.icon}</div>

      <div class="event-info">
        <div class="tag">${escapeHTML(event.type)}</div>
        <h3>${escapeHTML(event.title)}</h3>
        <p class="meta">📍 ${escapeHTML(event.place)}</p>
        <p class="meta">📅 ${escapeHTML(event.date)}</p>
        <div class="price">${escapeHTML(event.price)}</div>
      </div>

      <div class="arrow">›</div>
    </article>
  `).join('');
}

// DETALLE DE EVENTOS
function openDetail(event) {
  const detail = document.querySelector('#detailContent');
  const dialog = document.querySelector('#detailDialog');

  if (!detail || !dialog) return;

  const isSaved = getSaved().some(
    id => String(id) === String(event.id)
  );

  detail.innerHTML = `
    <div class="detail-art">${event.icon}</div>
    <div class="tag">${escapeHTML(event.type)}</div>
    <h2 class="detail-title">${escapeHTML(event.title)}</h2>
    <p class="meta">📍 ${escapeHTML(event.place)}</p>

    ${event.venue ? `
      <p class="meta">📌 ${escapeHTML(event.venue)}</p>
    ` : ''}

    <p class="meta">📅 ${escapeHTML(event.date)}</p>
    <p class="price">${escapeHTML(event.price)}</p>
    <p class="detail-copy">${escapeHTML(event.description)}</p>

    <button class="primary full" id="saveBtn">
      ${isSaved ? '♥ Quitar de guardados' : '♡ Guardar evento'}
    </button>
  `;

  detail.querySelector('#saveBtn')?.addEventListener('click', () => {
    let favorites = getSaved();

    if (favorites.some(id => String(id) === String(event.id))) {
      favorites = favorites.filter(
        id => String(id) !== String(event.id)
      );
    } else {
      favorites.push(event.id);
    }

    saveFavorites(favorites);
    render();
    openDetail(event);
  });

  if (!dialog.open) dialog.showModal();
}

// VENTANAS INFORMATIVAS
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

// SESIÓN
async function getCurrentSession() {
  if (!supabaseClient) {
    throw new Error('No hay conexión con Supabase.');
  }

  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) throw error;
  return data.session;
}

// COMPROBAR ADMINISTRADOR
async function checkAdmin() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      updateAdminButton(false);
      return false;
    }

    const { data, error } =
      await supabaseClient.rpc('is_app_admin');

    if (error) throw error;

    const isAdmin = data === true;
    updateAdminButton(isAdmin);

    return isAdmin;

  } catch (error) {
    console.error('Error comprobando administrador:', error);
    updateAdminButton(false);
    return false;
  }
}

function updateAdminButton(isAdmin) {
  if (adminButton) {
    adminButton.style.display = isAdmin ? 'block' : 'none';
  }
}

// BOTÓN ADMINISTRADOR
function createAdminButton() {
  const organizer = document.querySelector('#organizerBtn');

  if (!organizer || adminButton) return;

  adminButton = document.createElement('button');
  adminButton.id = 'adminPanelBtn';
  adminButton.className = 'primary';
  adminButton.type = 'button';
  adminButton.textContent = '🛡️ Panel administrador';

  adminButton.style.cssText =
    'display:none;margin:10px 0;padding:12px;width:100%;';

  organizer.insertAdjacentElement('afterend', adminButton);

  adminButton.addEventListener('click', openAdminPanel);
}

// SOLICITUD DE ORGANIZADOR
async function requestOrganizer() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      alert('Primero tenés que iniciar sesión desde Cuenta.');
      return;
    }

    const { data: existing, error: searchError } =
      await supabaseClient
        .from('organizer_requests')
        .select('id,status')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (searchError) throw searchError;

    if (existing) {
      const labels = {
        pending: 'Tu solicitud está pendiente de aprobación.',
        approved: 'Tu solicitud fue aprobada. Ya sos organizador.',
        rejected: 'Tu solicitud fue rechazada.'
      };

      alert(labels[existing.status] || 'Ya tenés una solicitud registrada.');
      return;
    }

    const fullName = prompt('Ingresá tu nombre y apellido:');
    if (!fullName || !fullName.trim()) return;

    const organization = prompt(
      'Ingresá el nombre de tu agrupación, institución u organización:'
    );
    if (!organization || !organization.trim()) return;

    const phone = prompt('Ingresá tu número de teléfono:') || '';
    const message = prompt(
      'Contanos qué tipo de eventos organizás (opcional):'
    ) || '';

    const { error } = await supabaseClient
      .from('organizer_requests')
      .insert({
        user_id: session.user.id,
        full_name: fullName.trim(),
        organization_name: organization.trim(),
        phone: phone.trim(),
        message: message.trim(),
        status: 'pending'
      });

    if (error) throw error;

    alert(
      '¡Solicitud enviada correctamente! ' +
      'El administrador revisará tus datos.'
    );

  } catch (error) {
    console.error(error);
    alert('No se pudo enviar la solicitud: ' + error.message);
  }
}

// CONSULTAR MI SOLICITUD
async function checkMyRequest() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      alert('Primero tenés que iniciar sesión.');
      return;
    }

    const { data, error } = await supabaseClient
      .from('organizer_requests')
      .select('full_name,organization_name,status,created_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      alert('Todavía no enviaste una solicitud para ser organizador.');
      return;
    }

    const labels = {
      pending: 'PENDIENTE DE APROBACIÓN',
      approved: 'APROBADA',
      rejected: 'RECHAZADA'
    };

    alert(
      'ESTADO DE TU SOLICITUD\n\n' +
      'Nombre: ' + data.full_name + '\n' +
      'Organización: ' + data.organization_name + '\n' +
      'Estado: ' + (labels[data.status] || data.status)
    );

  } catch (error) {
    alert('Error consultando solicitud: ' + error.message);
  }
  }
