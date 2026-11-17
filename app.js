
/* ==========================================
   FIESTAS GAUCHAS 🇦🇷
   APLICACION - SUPABASE
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
    console.log('Supabase conectado correctamente.');
  } else {
    console.error('No se encontró la librería Supabase.');
  }
} catch (error) {
  console.error('Error de conexión:', error);
}

// ==========================================
// VARIABLES
// ==========================================

let filter = 'Todos';
let query = '';
let page = 'home';

let eventsEl;
let searchInput;
let allEvents = [];

let adminDialog = null;
let adminButton = null;

// ==========================================
// SEGURIDAD HTML
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
// FECHAS
// ==========================================

function formatDate(date) {
  if (!date) return 'Fecha a confirmar';

  const parts = String(date).split('-');

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return String(date);
}

// ==========================================
// CARGAR EVENTOS
// ==========================================

async function loadEvents() {
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
      description: event.description || 'Sin descripción disponible.',
      isDemo: false
    }));

    console.log('Eventos publicados:', allEvents.length);
    render();

  } catch (error) {
    console.error('Error al cargar eventos:', error);
    allEvents = [];
    render();

    showLoadError(
      'No se pudieron cargar los eventos. Detalle: ' + error.message
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

  if (count) count.textContent = `${list.length} eventos`;

  if (list.length === 0) {
    eventsEl.innerHTML = `
      <div class="empty">
        ${allEvents.length === 0
          ? 'Todavía no hay eventos publicados.'
          : 'No hay eventos para mostrar con esta búsqueda.'}
      </div>
    `;
    return;
  }

  eventsEl.innerHTML = list.map(event => `
    <article class="event-card" data-id="${escapeHTML(event.id)}">
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

  document.querySelector('#saveBtn')?.addEventListener('click', () => {
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
// BUSCADOR
// ==========================================

function setupSearch() {
  searchInput = document.querySelector('#search');

  if (!searchInput) return;

  searchInput.addEventListener('input', event => {
    query = event.target.value.trim().toLowerCase();
    render();
  });
}

// ==========================================
// FILTROS
// ==========================================

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
      button.closest('dialog')?.close();
    });
  });
}

// ==========================================
// SESION DE USUARIO
// ==========================================

async function getCurrentSession() {
  if (!supabaseClient) {
    throw new Error('No hay conexión con Supabase.');
  }

  const { data, error } = await supabaseClient.auth.getSession();

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

    const { data, error } = await supabaseClient.rpc('is_app_admin');

    if (error) throw error;

    updateAdminButton(data === true);

    return data === true;

  } catch (error) {
    console.error('No se pudo comprobar administrador:', error);
    updateAdminButton(false);
    return false;
  }
}

function updateAdminButton(isAdmin) {
  if (!adminButton) return;

  adminButton.style.display = isAdmin ? 'inline-block' : 'none';
}

// ==========================================
// BOTON DE ADMINISTRACION
// ==========================================

function createAdminButton() {
  const organizer = document.querySelector('#organizerBtn');

  if (!organizer || adminButton) return;

  adminButton = document.createElement('button');
  adminButton.id = 'adminPanelBtn';
  adminButton.className = 'primary';
  adminButton.textContent = '🛡️ Panel administrador';
  adminButton.style.display = 'none';
  adminButton.style.margin = '10px 0';
  adminButton.style.padding = '12px';
  adminButton.style.width = '100%';

  organizer.insertAdjacentElement('afterend', adminButton);

  adminButton.addEventListener('click', openAdminPanel);
}

// ==========================================
// FORMULARIO DE SOLICITUD
// ==========================================

async function requestOrganizer() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      alert('Primero tenés que iniciar sesión.');
      return;
    }

    const { data: existing, error: searchError } =
      await supabaseClient
        .from('organizer_requests')
        .select('id, status')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (searchError) throw searchError;

    if (existing) {
      const statuses = {
        pending: 'Tu solicitud está pendiente de aprobación.',
        approved: 'Tu solicitud fue aprobada. Ya sos organizador.',
        rejected: 'Tu solicitud fue rechazada.'
      };

      alert(statuses[existing.status] || 'Ya tenés una solicitud registrada.');
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
      '¡Solicitud enviada correctamente!\n\n' +
      'El administrador revisará tus datos y podrás consultar el resultado desde tu cuenta.'
    );

  } catch (error) {
    alert('No se pudo enviar la solicitud: ' + error.message);
    console.error(error);
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
      .select('full_name, organization_name, status, created_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      alert('Todavía no enviaste una solicitud para ser organizador.');
      return;
    }

    const statuses = {
      pending: 'PENDIENTE DE APROBACIÓN',
      approved: 'APROBADA',
      rejected: 'RECHAZADA'
    };

    alert(
      'ESTADO DE TU SOLICITUD\n\n' +
      'Nombre: ' + data.full_name + '\n' +
      'Organización: ' + data.organization_name + '\n' +
      'Estado: ' + (statuses[data.status] || data.status)
    );

  } catch (error) {
    alert('Error consultando solicitud: ' + error.message);
  }
}

// ==========================================
// PANEL DE ADMINISTRACION
// ==========================================

function createAdminDialog() {
  if (adminDialog) return;

  adminDialog = document.createElement('dialog');
  adminDialog.id = 'adminDialog';

  adminDialog.style.width = '92%';
  adminDialog.style.maxWidth = '650px';
  adminDialog.style.maxHeight = '85vh';
  adminDialog.style.overflowY = 'auto';
  adminDialog.style.borderRadius = '14px';
  adminDialog.style.border = '1px solid #999';
  adminDialog.style.padding = '20px';

  adminDialog.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <h2>🛡️ Administración</h2>
      <button type="button" id="closeAdminDialog">✕</button>
    </div>

    <p>Solicitudes de organizadores</p>

    <div id="adminRequests">
      Cargando solicitudes...
    </div>
  `;

  document.body.appendChild(adminDialog);

  document.querySelector('#closeAdminDialog').addEventListener(
    'click',
    () => adminDialog.close()
  );

  adminDialog.addEventListener('click', async event => {
    const button = event.target.closest('[data-request-action]');

    if (!button) return;

    const action = button.dataset.requestAction;
    const requestId = button.dataset.requestId;

    if (!requestId || !['approved', 'rejected'].includes(action)) return;

    const confirmed = confirm(
      action === 'approved'
        ? '¿Querés aprobar a este organizador?'
        : '¿Querés rechazar esta solicitud?'
    );

    if (!confirmed) return;

    await updateOrganizerRequest(requestId, action);
  });
}

// ==========================================
// CARGAR SOLICITUDES EN EL PANEL
// ==========================================

async function loadAdminRequests() {
  const container = document.querySelector('#adminRequests');

  if (!container) return;

  container.innerHTML = 'Cargando solicitudes...';

  try {
    const isAdmin = await checkAdmin();

    if (!isAdmin) {
      container.textContent = 'No tenés permisos para acceder.';
      return;
    }

    const { data, error } = await supabaseClient
      .from('organizer_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p>No hay solicitudes registradas.</p>';
      return;
    }

    container.innerHTML = data.map(request => {
      const statusLabels = {
        pending: '⏳ Pendiente',
        approved: '✅ Aprobada',
        rejected: '❌ Rechazada'
      };

      return `
        <div style="
          border:1px solid #aaa;
          border-radius:10px;
          padding:14px;
          margin:12px 0;
        ">
          <h3>${escapeHTML(request.full_name)}</h3>

          <p><strong>Organización:</strong>
          ${escapeHTML(request.organization_name)}</p>

          <p><strong>Teléfono:</strong>
          ${escapeHTML(request.phone || 'No informado')}</p>

          <p><strong>Mensaje:</strong>
          ${escapeHTML(request.message || 'Sin mensaje')}</p>

          <p><strong>Estado:</strong>
          ${statusLabels[request.status] || escapeHTML(request.status)}</p>

          ${request.status === 'pending' ? `
            <button
              type="button"
              data-request-action="approved"
              data-request-id="${escapeHTML(request.id)}"
            >
              ✅ Aprobar
            </button>

            <button
              type="button"
              data-request-action="rejected"
              data-request-id="${escapeHTML(request.id)}"
            >
              ❌ Rechazar
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error cargando solicitudes:', error);

    container.innerHTML = `
      <p>No se pudieron cargar las solicitudes.</p>
      <p>${escapeHTML(error.message)}</p>
    `;
  }
}

// ==========================================
// APROBAR O RECHAZAR ORGANIZADOR
// ==========================================

async function updateOrganizerRequest(requestId, newStatus) {
  try {
    const isAdmin = await checkAdmin();

    if (!isAdmin) {
      alert('No tenés permisos de administrador.');
      return;
    }

    const { error } = await supabaseClient
      .from('organizer_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (error) throw error;

    alert(
      newStatus === 'approved'
        ? '¡Organizador aprobado correctamente!'
        : 'Solicitud rechazada correctamente.'
    );

    await loadAdminRequests();

  } catch (error) {
    alert('No se pudo actualizar la solicitud: ' + error.message);
    console.error(error);
  }
}

// ==========================================
// ABRIR PANEL ADMINISTRADOR
// ==========================================

async function openAdminPanel() {
  try {
    const isAdmin = await checkAdmin();

    if (!isAdmin) {
      alert('Acceso exclusivo para el administrador.');
      return;
    }

    createAdminDialog();

    adminDialog.showModal();

    await loadAdminRequests();

  } catch (error) {
    alert('Error al abrir el panel: ' + error.message);
  }
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
    const session = await getCurrentSession();

    if (session) {
      const option = prompt(
        'Tu cuenta está iniciada: ' + session.user.email +
        '\n\n1. Ver mi cuenta' +
        '\n2. Consultar solicitud de organizador' +
        '\n3. Cerrar sesión'
      );

      if (option === '1') {
        const isAdmin = await checkAdmin();

        alert(
          'Cuenta activa: ' + session.user.email +
          (isAdmin ? '\n\nCuenta de administrador.' : '')
        );
      }

      if (option === '2') {
        await checkMyRequest();
      }

      if (option === '3') {
        const result = await supabaseClient.auth.signOut();

        if (result.error) throw result.error;

        updateAdminButton(false);
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
  
