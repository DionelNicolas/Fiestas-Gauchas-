
/* ==========================================
   FIESTAS GAUCHAS 🇦🇷
   APLICACIÓN COMPLETA - SUPABASE
   BLOQUE 1 DE 2
   ========================================== */

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

// ==========================================
// CONEXIÓN SUPABASE
// ==========================================

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

// ==========================================
// FUNCIONES GENERALES
// ==========================================

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function getEventIcon(category) {
  const icons = {
    'Doma': '🐎',
    'Baile': '🪗',
    'Fiesta de campo': '🌾',
    'Festival': '🎶'
  };

  return icons[category] || '🤠';
}

function formatDate(date) {
  if (!date) return 'Fecha a confirmar';

  const parts = String(date).split('-');

  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : String(date);
}

// ==========================================
// CARGAR EVENTOS
// ==========================================

async function loadEvents() {
  if (!eventsEl) return;

  if (!supabaseClient) {
    allEvents = [];
    render();
    showLoadError('No se pudo conectar con Supabase.');
    return;
  }

  eventsEl.innerHTML =
    '<div class="empty">Cargando eventos...</div>';

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

  if (count) {
    count.textContent = 'Error al cargar';
  }

  if (eventsEl) {
    eventsEl.innerHTML = `
      <div class="empty">${escapeHTML(message)}</div>
    `;
  }
}

// ==========================================
// FAVORITOS
// ==========================================

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

// ==========================================
// MOSTRAR EVENTOS
// ==========================================

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

  if (count) {
    count.textContent = `${list.length} eventos`;
  }

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
    <div class="tag">${escapeHTML(event.type)}</div>

    <h2 class="detail-title">
      ${escapeHTML(event.title)}
    </h2>

    <p class="meta">📍 ${escapeHTML(event.place)}</p>

    ${event.venue ? `
      <p class="meta">📌 ${escapeHTML(event.venue)}</p>
    ` : ''}

    <p class="meta">📅 ${escapeHTML(event.date)}</p>
    <p class="price">${escapeHTML(event.price)}</p>

    <p class="detail-copy">
      ${escapeHTML(event.description)}
    </p>

    <button class="primary full" id="saveBtn">
      ${isSaved ? '♥ Quitar de guardados' : '♡ Guardar evento'}
    </button>
  `;

  detail.querySelector('#saveBtn')
    ?.addEventListener('click', () => {

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

  if (!dialog.open) {
    dialog.showModal();
  }
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

  if (!dialog.open) {
    dialog.showModal();
  }
}

// ==========================================
// SESIÓN DE USUARIO
// ==========================================

async function getCurrentSession() {
  if (!supabaseClient) {
    throw new Error('No hay conexión con Supabase.');
  }

  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) throw error;

  return data.session;
}

// ==========================================
// COMPROBAR ADMINISTRADOR
// ==========================================

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

// ==========================================
// BOTÓN ADMINISTRADOR
// ==========================================

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

// ==========================================
// SOLICITUD DE ORGANIZADOR
// ==========================================

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

      alert(
        labels[existing.status] ||
        'Ya tenés una solicitud registrada.'
      );
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

// ==========================================
// CONSULTAR MI SOLICITUD
// ==========================================

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

// ==========================================
// PANEL DE ADMINISTRACIÓN
// ==========================================

function createAdminDialog() {
  if (document.querySelector('#adminDialog')) {
    adminDialog = document.querySelector('#adminDialog');
    return;
  }

  adminDialog = document.createElement('dialog');
  adminDialog.id = 'adminDialog';

  adminDialog.innerHTML = `
    <div style="padding:20px;max-height:80vh;overflow:auto;">
      <h2>🛡️ Panel administrador</h2>
      <p>Solicitudes de organizadores</p>

      <div id="adminRequests">
        Cargando solicitudes...
      </div>

      <button id="closeAdminDialog"
        class="primary full"
        style="margin-top:15px;">
        Cerrar
      </button>
    </div>
  `;

  document.body.appendChild(adminDialog);

  adminDialog.querySelector('#closeAdminDialog')
    .addEventListener('click', () => adminDialog.close());
}

// ==========================================
// ABRIR PANEL ADMINISTRADOR
// ==========================================

async function openAdminPanel() {
  const isAdmin = await checkAdmin();

  if (!isAdmin) {
    alert('No tenés permisos de administrador.');
    return;
  }

  createAdminDialog();

  if (!adminDialog.open) {
    adminDialog.showModal();
  }

  loadAdminRequests();
}

// ==========================================
// CARGAR SOLICITUDES
// ==========================================

async function loadAdminRequests() {
  const container = document.querySelector('#adminRequests');

  if (!container) return;

  container.innerHTML = 'Cargando solicitudes...';

  try {
    const { data, error } = await supabaseClient
      .from('organizer_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <p>No hay solicitudes de organizadores.</p>
      `;
      return;
    }

    container.innerHTML = data.map(request => {
      const statusLabels = {
        pending: 'Pendiente',
        approved: 'Aprobada',
        rejected: 'Rechazada'
      };

      return `
        <div style="
          border:1px solid #ccc;
          border-radius:10px;
          padding:12px;
          margin:12px 0;
        ">
          <h3>${escapeHTML(request.full_name)}</h3>

          <p>
            <strong>Organización:</strong>
            ${escapeHTML(request.organization_name)}
          </p>

          <p>
            <strong>Teléfono:</strong>
            ${escapeHTML(request.phone || 'No informado')}
          </p>

          <p>
            <strong>Mensaje:</strong>
            ${escapeHTML(request.message || 'Sin mensaje')}
          </p>

          <p>
            <strong>Estado:</strong>
            ${statusLabels[request.status] || escapeHTML(request.status)}
          </p>

          ${request.status === 'pending' ? `
            <button
              class="primary"
              data-action="approve"
              data-id="${escapeHTML(request.id)}">
              Aprobar
            </button>

            <button
              class="secondary"
              data-action="reject"
              data-id="${escapeHTML(request.id)}">
              Rechazar
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action]')
      .forEach(button => {

        button.addEventListener('click', async () => {
          const id = button.dataset.id;
          const action = button.dataset.action;

          if (action === 'approve') {
            await updateOrganizerRequest(id, 'approved');
          }

          if (action === 'reject') {
            await updateOrganizerRequest(id, 'rejected');
          }
        });
      });

  } catch (error) {
    console.error('Error cargando solicitudes:', error);

    container.innerHTML = `
      <p>No se pudieron cargar las solicitudes.</p>
      <p>${escapeHTML(error.message)}</p>
    `;
  }
}

// ==========================================
// APROBAR O RECHAZAR ORGANIZADORES
// ==========================================

async function updateOrganizerRequest(id, status) {
  const actionText = status === 'approved'
    ? 'aprobar'
    : 'rechazar';

  if (!confirm(`¿Estás seguro de ${actionText} esta solicitud?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('organizer_requests')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    alert(
      status === 'approved'
        ? 'Organizador aprobado correctamente.'
        : 'Solicitud rechazada.'
    );

    await loadAdminRequests();

  } catch (error) {
    console.error(error);
    alert('No se pudo actualizar la solicitud: ' + error.message);
  }
}

// ==========================================
// REGISTRO E INICIO DE SESIÓN
// ==========================================

async function accountAccess() {
  if (!supabaseClient) {
    alert('No hay conexión con Supabase.');
    return;
  }

  try {
    const session = await getCurrentSession();

    if (session) {
      const action = confirm(
        'Ya tenés una sesión iniciada.\n\n' +
        'Correo: ' + session.user.email + '\n\n' +
        '¿Querés cerrar sesión?'
      );

      if (action) {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        alert('Sesión cerrada correctamente.');

        await updateAccountButton();
        updateAdminButton(false);
      }

      return;
    }

    const choice = prompt(
      'CUENTA - FIESTAS GAUCHAS\n\n' +
      'Escribí 1 para iniciar sesión.\n' +
      'Escribí 2 para crear una cuenta.'
    );

    if (choice !== '1' && choice !== '2') return;

    const email = prompt('Ingresá tu correo electrónico:');

    if (!email || !email.includes('@')) {
      alert('Ingresá un correo electrónico válido.');
      return;
    }

    const password = prompt('Ingresá tu contraseña:');

    if (!password || password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (choice === '1') {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;

      alert('¡Iniciaste sesión correctamente!');

    } else {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password
      });

      if (error) throw error;

      if (data.session) {
        alert('¡Cuenta creada correctamente!');
      } else {
        alert(
          'Cuenta creada. Revisá tu correo electrónico ' +
          'para confirmar el registro.'
        );
      }
    }

    await updateAccountButton();
    await checkAdmin();

  } catch (error) {
    console.error('Error de cuenta:', error);

    alert(
      'No se pudo completar la operación: ' + error.message
    );
  }
}

// ==========================================
// ACTUALIZAR BOTÓN DE CUENTA
// ==========================================

async function updateAccountButton() {
  const button = document.querySelector('#profileBtn');

  if (!button) return;

  try {
    const session = await getCurrentSession();

    button.textContent = session
      ? 'Mi cuenta'
      : '♙';

    button.setAttribute(
      'aria-label',
      session ? 'Mi cuenta' : 'Ingresar o registrarse'
    );

  } catch (error) {
    button.textContent = '♙';
  }
}

// ==========================================
// NAVEGACIÓN
// ==========================================

function setupNavigation() {
  document.querySelectorAll('.nav-item[data-page]')
    .forEach(button => {

      button.addEventListener('click', async () => {
        page = button.dataset.page;

        document.querySelectorAll('.nav-item[data-page]')
          .forEach(item => {
            item.classList.remove('active', 'selected');
          });

        button.classList.add('active');

        if (page === 'map') {
          info(
            'Mapa',
            'La sección del mapa estará disponible próximamente.'
          );
        }

        if (page === 'account') {
          await accountAccess();
        }

        render();
      });

    });
}

// ==========================================
// BÚSQUEDA
// ==========================================

function setupSearch() {
  searchInput = document.querySelector('#search');

  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    query = searchInput.value.trim().toLowerCase();
    render();
  });
}

// ==========================================
// FILTROS
// ==========================================

function setupFilters() {
  document.querySelectorAll('.chip[data-filter]')
    .forEach(button => {

      button.addEventListener('click', () => {
        filter = button.dataset.filter || 'Todos';

        document.querySelectorAll('.chip[data-filter]')
          .forEach(item => {
            item.classList.remove('active', 'selected');
          });

        button.classList.add('active');

        render();
      });

    });
}

// ==========================================
// CLIC EN EVENTOS
// ==========================================

function setupEventClicks() {
  if (!eventsEl) return;

  eventsEl.addEventListener('click', event => {
    const card = event.target.closest('.event-card');

    if (!card) return;

    const selectedEvent = allEvents.find(
      item => String(item.id) === String(card.dataset.id)
    );

    if (selectedEvent) {
      openDetail(selectedEvent);
    }
  });

  eventsEl.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const card = event.target.closest('.event-card');

    if (!card) return;

    event.preventDefault();

    const selectedEvent = allEvents.find(
      item => String(item.id) === String(card.dataset.id)
    );

    if (selectedEvent) {
      openDetail(selectedEvent);
    }
  });
}

// ==========================================
// BOTONES GENERALES
// ==========================================

function setupButtons() {
  const profileButton = document.querySelector('#profileBtn');

  if (profileButton) {
    profileButton.addEventListener('click', accountAccess);
  }

  const organizer = document.querySelector('#organizerBtn');

  if (organizer) {
    organizer.addEventListener('click', requestOrganizer);
  }

  document.querySelectorAll('[data-close]')
    .forEach(button => {
      button.addEventListener('click', () => {
        const dialog = button.closest('dialog');

        if (dialog && dialog.open) {
          dialog.close();
        }
      });
    });
}

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================

async function setupApp() {
  console.log('Iniciando Fiestas Gauchas...');

  eventsEl = document.querySelector('#events');

  if (!eventsEl) {
    console.error('No se encontró el contenedor de eventos.');
    return;
  }

  createAdminButton();

  setupNavigation();
  setupSearch();
  setupFilters();
  setupEventClicks();
  setupButtons();

  await updateAccountButton();
  await checkAdmin();

  await loadEvents();

  const diagnostic = document.querySelector('#fg-diagnostic');

  if (diagnostic) {
    diagnostic.textContent =
      'Diagnóstico: aplicación cargada correctamente.';
  }

  console.log('Fiestas Gauchas está funcionando.');
}

// ==========================================
// INICIAR CUANDO CARGUE EL DOCUMENTO
// ==========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupApp);
} else {
  setupApp();
}
