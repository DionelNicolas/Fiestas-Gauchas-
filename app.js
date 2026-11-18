
/* =========================================================
   FIESTAS GAUCHAS 🇦🇷
   APP.JS COMPLETO - PARTE 1 DE 3
   ========================================================= */

const SUPABASE_URL = 'https://azaimadkqssbsljpjdqo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UWmpG4BAoWVOJWuzVBppgQ_lwPXbUyP';

const SITE_URL = 'https://dionelnicolas.github.io/Fiestas-Gauchas-/';
const STORAGE_BUCKET = 'Evente-media';

let supabaseClient = null;
let currentUser = null;
let currentSession = null;

let isAdmin = false;
let isApprovedOrganizer = false;

let allEvents = [];
let currentEvent = null;
let editingEventId = null;

let activeFilter = 'Todos';
let activeAdminTab = 'requests';

// =========================================================
// INICIALIZACIÓN
// =========================================================

function initializeSupabase() {
    if (!window.supabase) {
        console.error('No se encontró la librería Supabase.');
        showToast('No se pudo conectar con el servicio.', 'error');
        return false;
    }

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    return true;
}

// =========================================================
// FUNCIONES GENERALES
// =========================================================

function $(selector, parent = document) {
    return parent.querySelector(selector);
}

function $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return entities[character];
    });
}

function showToast(message, type = 'success') {
    const toast = $('#toast');

    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(showToast.timeout);

    showToast.timeout = setTimeout(() => {
        toast.className = 'toast';
    }, 3500);
}

function openDialog(selector) {
    const dialog = $(selector);

    if (!dialog) return;

    if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
    } else {
        dialog.setAttribute('open', '');
    }
}

function closeDialog(dialog) {
    if (!dialog) return;

    if (typeof dialog.close === 'function') {
        dialog.close();
    } else {
        dialog.removeAttribute('open');
    }
}

function formatDate(value) {
    if (!value) return 'Fecha a confirmar';

    const datePart = String(value).split('T')[0];
    const parts = datePart.split('-');

    if (parts.length !== 3) return datePart;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatPrice(event) {
    if (event.door_price) return `Entrada: ${event.door_price}`;
    if (event.presale_price) return `Anticipada: ${event.presale_price}`;
    if (event.price) return event.price;

    return 'Consultar entradas';
}

function getEventIcon(category) {
    const value = String(category || '').toLowerCase();

    if (value.includes('doma') || value.includes('jineteada')) return '🐎';
    if (value.includes('baile')) return '💃';
    if (value.includes('festival')) return '🎶';
    if (value.includes('campo')) return '🌾';
    if (value.includes('folklore')) return '🪗';
    if (value.includes('criolla')) return '🇦🇷';

    return '🎉';
}

function safeUrl(value) {
    if (!value) return '';

    try {
        const url = new URL(value);

        if (url.protocol === 'https:' || url.protocol === 'http:') {
            return url.href;
        }
    } catch (error) {
        return '';
    }

    return '';
}

function getFormValue(form, name) {
    const field = form.elements.namedItem(name);

    if (!field) return '';

    return field.value?.trim?.() ?? field.value ?? '';
}

function setFormValue(form, name, value) {
    const field = form.elements.namedItem(name);

    if (field) field.value = value ?? '';
}

function setButtonLoading(button, loading, loadingText = 'Procesando...') {
    if (!button) return;

    if (loading) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;

        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

// =========================================================
// SESIÓN Y USUARIO
// =========================================================

async function refreshSession() {
    if (!supabaseClient) return null;

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error('Error obteniendo sesión:', error);
        return null;
    }

    currentSession = data.session;
    currentUser = data.session?.user ?? null;

    return currentSession;
}

// =========================================================
// COMPROBAR ADMINISTRADOR
// =========================================================

async function checkAdmin() {
    isAdmin = false;

    if (!currentUser) return false;

    const { data, error } = await supabaseClient.rpc('is_app_admin');

    if (error) {
        console.error('Error comprobando administrador:', error);
        return false;
    }

    isAdmin = data === true;

    return isAdmin;
}

// =========================================================
// COMPROBAR ORGANIZADOR APROBADO
// =========================================================

async function checkApprovedOrganizer() {
    isApprovedOrganizer = false;

    if (!currentUser) return false;

    const { data, error } = await supabaseClient.rpc(
        'is_approved_organizer'
    );

    if (error) {
        console.error('Error comprobando organizador:', error);
        return false;
    }

    isApprovedOrganizer = data === true;

    return isApprovedOrganizer;
}

// =========================================================
// BOTÓN DE CUENTA
// =========================================================

async function updateAccountButton() {
    const button = $('#profileBtn');

    if (!button) return;

    if (currentUser) {
        const name =
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split('@')[0] ||
            'Mi cuenta';

        button.textContent = name;
        button.title = currentUser.email || '';
    } else {
        button.textContent = 'Ingresar';
        button.title = 'Iniciar sesión o registrarse';
    }
}

// =========================================================
// CARGAR EVENTOS PUBLICADOS
// =========================================================

async function loadEvents() {
    const container = $('#events');

    if (container) {
        container.innerHTML = '<div class="loading">Cargando eventos...</div>';
    }

    const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('event_date', { ascending: true });

    if (error) {
        console.error('Error cargando eventos:', error);

        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No se pudieron cargar los eventos</h3>
                    <p>Verificá tu conexión e intentá nuevamente.</p>
                </div>
            `;
        }

        return;
    }

    allEvents = data || [];

    renderEvents();
}

// =========================================================
// MOSTRAR EVENTOS
// =========================================================

function renderEvents() {
    const container = $('#events');

    if (!container) return;

    const search = ($('#search')?.value || '').toLowerCase().trim();

    let filtered = [...allEvents];

    if (activeFilter && activeFilter !== 'Todos') {
        filtered = filtered.filter(event =>
            String(event.category || '').toLowerCase() ===
            activeFilter.toLowerCase()
        );
    }

    if (search) {
        filtered = filtered.filter(event => {
            const content = [
                event.title,
                event.category,
                event.province,
                event.locality,
                event.venue,
                event.description
            ].join(' ').toLowerCase();

            return content.includes(search);
        });
    }

    const count = $('#count');

    if (count) count.textContent = `${filtered.length} eventos`;

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎪</div>
                <h3>No encontramos eventos</h3>
                <p>Probá con otra búsqueda o categoría.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = filtered.map(event => {
        const title = escapeHTML(event.title);
        const category = escapeHTML(event.category || 'Evento gaucho');
        const locality = escapeHTML(event.locality || '');
        const province = escapeHTML(event.province || '');
        const venue = escapeHTML(event.venue || '');
        const date = escapeHTML(formatDate(event.event_date));
        const price = escapeHTML(formatPrice(event));

        const location = [locality, province]
            .filter(Boolean)
            .join(', ');

        const flyer = safeUrl(event.flyer_url);

        return `
            <article class="event-card" data-event-id="${escapeHTML(event.id)}">
                <div class="event-card-image">
                    ${
                        flyer
                        ? `<img src="${escapeHTML(flyer)}" alt="${title}" loading="lazy">`
                        : `<div class="event-placeholder">${getEventIcon(event.category)}</div>`
                    }

                    <span class="event-category">${category}</span>
                </div>

                <div class="event-card-content">
                    <h3>${title}</h3>
                    <p class="event-date">📅 ${date}</p>
                    ${location ? `<p class="event-location">📍 ${location}</p>` : ''}
                    ${venue ? `<p class="event-venue">${venue}</p>` : ''}
                    <p class="event-price">${price}</p>

                    <button
                        type="button"
                        class="btn-primary event-detail-btn"
                        data-open-event="${escapeHTML(event.id)}">
                        Ver detalles
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

// =========================================================
// DETALLE DEL EVENTO
// =========================================================

function openEventDetail(eventId) {
    const event = allEvents.find(item => item.id === eventId);

    if (!event) {
        showToast('No se encontró el evento.', 'error');
        return;
    }

    currentEvent = event;

    const container = $('#detailContent');

    if (!container) return;

    const title = escapeHTML(event.title);
    const category = escapeHTML(event.category || 'Evento gaucho');
    const description = escapeHTML(event.description || 'Sin descripción.');
    const locality = escapeHTML(event.locality || '');
    const province = escapeHTML(event.province || '');
    const venue = escapeHTML(event.venue || '');
    const address = escapeHTML(event.address || '');
    const date = escapeHTML(formatDate(event.event_date));
    const endDate = event.end_date ? escapeHTML(formatDate(event.end_date)) : '';
    const startTime = escapeHTML(event.end_time || '');
    const price = escapeHTML(formatPrice(event));
    const presale = escapeHTML(event.presale_price || '');
    const door = escapeHTML(event.door_price || '');
    const ticketNotes = escapeHTML(event.ticket_notes || '');
    const minors = escapeHTML(event.minors_info || '');
    const phone = escapeHTML(event.contact_phone || '');
    const whatsapp = String(event.whatsapp || '').replace(/\D/g, '');
    const instagram = safeUrl(event.instagram);
    const facebook = safeUrl(event.facebook);
    const maps = safeUrl(event.maps_url);
    const flyer = safeUrl(event.flyer_url);

    const amenities = [];

    if (event.has_food) amenities.push('🍽️ Servicio de comida');
    if (event.has_parking) amenities.push('🚗 Estacionamiento');
    if (event.has_camping) amenities.push('⛺ Camping');

    container.innerHTML = `
        <div class="detail-view">
            ${flyer ? `<img class="detail-flyer" src="${escapeHTML(flyer)}" alt="${title}">` : ''}

            <span class="event-category">${category}</span>
            <h2>${title}</h2>

            <p>📅 <strong>Fecha:</strong> ${date}</p>
            ${endDate ? `<p>📅 <strong>Hasta:</strong> ${endDate}</p>` : ''}
            ${startTime ? `<p>🕒 <strong>Horario:</strong> ${startTime}</p>` : ''}

            ${locality || province ? `
                <p>📍 <strong>Ubicación:</strong>
                ${locality}${locality && province ? ', ' : ''}${province}</p>
            ` : ''}

            ${venue ? `<p><strong>Predio:</strong> ${venue}</p>` : ''}
            ${address ? `<p><strong>Dirección:</strong> ${address}</p>` : ''}

            <div class="detail-description">
                <h3>Descripción</h3>
                <p>${description}</p>
            </div>

            <div class="detail-prices">
                <h3>Entradas</h3>
                ${presale ? `<p>Anticipadas: ${presale}</p>` : ''}
                ${door ? `<p>En puerta: ${door}</p>` : ''}
                ${!presale && !door ? `<p>${price}</p>` : ''}
                ${ticketNotes ? `<p>${ticketNotes}</p>` : ''}
            </div>

            ${minors ? `<p><strong>Menores:</strong> ${minors}</p>` : ''}

            ${
                amenities.length
                ? `<div class="detail-amenities"><h3>Servicios</h3><p>${amenities.join(' · ')}</p></div>`
                : ''
            }

            <div class="detail-contact">
                <h3>Contacto</h3>
                ${phone ? `<p>📞 ${phone}</p>` : ''}
                ${whatsapp ? `<p><a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener">Consultar por WhatsApp</a></p>` : ''}
                ${instagram ? `<p><a href="${escapeHTML(instagram)}" target="_blank" rel="noopener">Instagram</a></p>` : ''}
                ${facebook ? `<p><a href="${escapeHTML(facebook)}" target="_blank" rel="noopener">Facebook</a></p>` : ''}
                ${maps ? `<p><a href="${escapeHTML(maps)}" target="_blank" rel="noopener">Cómo llegar al evento</a></p>` : ''}
            </div>

            <button type="button" class="btn-secondary" data-close-detail>
                Cerrar
            </button>
        </div>
    `;

    openDialog('#detailDialog');
}

// =========================================================
// FAVORITOS
// =========================================================

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem('fg_saved') || '[]');
    } catch (error) {
        return [];
    }
}

function saveFavorite(eventId) {
    const favorites = getFavorites();

    if (favorites.includes(eventId)) {
        const updated = favorites.filter(id => id !== eventId);
        localStorage.setItem('fg_saved', JSON.stringify(updated));
        showToast('Evento eliminado de favoritos.');
    } else {
        favorites.push(eventId);
        localStorage.setItem('fg_saved', JSON.stringify(favorites));
        showToast('Evento guardado en favoritos.');
    }

    renderSavedEvents();
}

function renderSavedEvents() {
    const container = $('#events');

    if (!container) return;

    const favorites = getFavorites();

    const saved = allEvents.filter(event =>
        favorites.includes(event.id)
    );

    if (!saved.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❤️</div>
                <h3>Todavía no guardaste eventos</h3>
                <p>Los eventos que guardes aparecerán acá.</p>
            </div>
        `;

        return;
    }

    const previous = allEvents;
    allEvents = saved;

    renderEvents();

    allEvents = previous;
}

// =========================================================
// FORMULARIOS DE CUENTA
// =========================================================

function buildAccountForms() {
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');

    if (loginForm) {
        loginForm.innerHTML = `
            <label class="field">
                <span>Correo electrónico</span>
                <input type="email" name="email"
                    placeholder="tucorreo@ejemplo.com"
                    autocomplete="email" required>
            </label>

            <label class="field">
                <span>Contraseña</span>
                <input type="password" name="password"
                    placeholder="Tu contraseña"
                    autocomplete="current-password"
                    minlength="6" required>
            </label>

            <button type="submit" class="btn-primary">
                Iniciar sesión
            </button>
        `;
    }

    if (registerForm) {
        registerForm.innerHTML = `
            <label class="field">
                <span>Nombre y apellido</span>
                <input type="text" name="full_name"
                    placeholder="Tu nombre completo"
                    autocomplete="name" required>
            </label>

            <label class="field">
                <span>Correo electrónico</span>
                <input type="email" name="email"
                    placeholder="tucorreo@ejemplo.com"
                    autocomplete="email" required>
            </label>

            <label class="field">
                <span>Contraseña</span>
                <input type="password" name="password"
                    placeholder="Mínimo 6 caracteres"
                    autocomplete="new-password"
                    minlength="6" required>
            </label>

            <label class="field">
                <span>Repetir contraseña</span>
                <input type="password" name="password_confirm"
                    placeholder="Repetí tu contraseña"
                    autocomplete="new-password"
                    minlength="6" required>
            </label>

            <button type="submit" class="btn-primary">
                Crear cuenta
            </button>
        `;
    }
}

function showAccountTab(tab) {
    $$('.form-tab').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.accountTab === tab
        );
    });

    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');

    if (loginForm) loginForm.hidden = tab !== 'login';
    if (registerForm) registerForm.hidden = tab !== 'register';
}

async function openAccount() {
    await refreshSession();

    const title = $('#accountTitle');
    const subtitle = $('#accountSubtitle');
    const logged = $('#accountLogged');
    const forms = $('#accountForms');

    if (currentUser) {
        if (title) title.textContent = 'Mi cuenta';
        if (subtitle) subtitle.textContent = 'Tu perfil en Fiestas Gauchas';
        if (logged) logged.hidden = false;
        if (forms) forms.hidden = true;

        const email = $('#accountEmail');

        if (email) email.textContent = currentUser.email || '';

        await updateAccountButton();

    } else {
        if (title) title.textContent = 'Bienvenido';
        if (subtitle) subtitle.textContent = 'Ingresá o creá tu cuenta';
        if (logged) logged.hidden = true;
        if (forms) forms.hidden = false;

        showAccountTab('login');
    }

    openDialog('#accountDialog');
}

// =========================================================
// INICIAR SESIÓN
// =========================================================

async function signIn(form) {
    const email = getFormValue(form, 'email');
    const password = getFormValue(form, 'password');

    if (!email || !password) {
        showToast('Completá el correo y la contraseña.', 'error');
        return;
    }

    const button = form.querySelector('button[type="submit"]');

    setButtonLoading(button, true, 'Ingresando...');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    setButtonLoading(button, false);

    if (error) {
        console.error(error);
        showToast('No se pudo iniciar sesión. Revisá tus datos.', 'error');
        return;
    }

    currentSession = data.session;
    currentUser = data.user;

    await refreshSession();
    await checkAdmin();
    await checkApprovedOrganizer();
    await updateAccountButton();

    closeDialog($('#accountDialog'));

    showToast('¡Bienvenido a Fiestas Gauchas!');

    updateOrganizerButton();
}

// =========================================================
// REGISTRO
// =========================================================

async function signUp(form) {
    const fullName = getFormValue(form, 'full_name');
    const email = getFormValue(form, 'email');
    const password = getFormValue(form, 'password');
    const confirm = getFormValue(form, 'password_confirm');

    if (!fullName || !email || !password || !confirm) {
        showToast('Completá todos los campos.', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    if (password !== confirm) {
        showToast('Las contraseñas no coinciden.', 'error');
        return;
    }

    const button = form.querySelector('button[type="submit"]');

    setButtonLoading(button, true, 'Creando cuenta...');

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: SITE_URL,
            data: {
                full_name: fullName
            }
        }
    });

    setButtonLoading(button, false);

    if (error) {
        console.error(error);
        showToast(error.message || 'No se pudo crear la cuenta.', 'error');
        return;
    }

    if (data.session) {
        currentSession = data.session;
        currentUser = data.user;

        await checkAdmin();
        await checkApprovedOrganizer();
        await updateAccountButton();

        closeDialog($('#accountDialog'));

        showToast('¡Tu cuenta fue creada correctamente!');
    } else {
        showToast(
            'Cuenta creada. Revisá tu correo para confirmar el registro.'
        );

        showAccountTab('login');
    }
}

// =========================================================
// RECUPERAR CONTRASEÑA
// =========================================================

async function recoverPassword() {
    const emailField = $('#loginForm')?.elements.namedItem('email');
    const email = emailField?.value?.trim();

    if (!email) {
        showToast('Ingresá tu correo en el formulario de acceso.', 'error');
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
            redirectTo: SITE_URL
        }
    );

    if (error) {
        console.error(error);
        showToast('No se pudo enviar el correo de recuperación.', 'error');
        return;
    }

    showToast('Te enviamos un correo para recuperar tu contraseña.');
}

// =========================================================
// CERRAR SESIÓN
// =========================================================

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error(error);
        showToast('No se pudo cerrar la sesión.', 'error');
        return;
    }

    currentSession = null;
    currentUser = null;
    isAdmin = false;
    isApprovedOrganizer = false;

    await updateAccountButton();

    closeDialog($('#accountDialog'));

    updateOrganizerButton();

    showToast('Sesión cerrada correctamente.');
}

// =========================================================
// BOTÓN DE ORGANIZADOR
// =========================================================

function updateOrganizerButton() {
    const button = $('#organizerBtn');

    if (!button) return;

    if (isAdmin || isApprovedOrganizer) {
        button.textContent = 'Publicar evento';
    } else {
        button.textContent = 'Ser organizador';
    }
}

// =========================================================
// FORMULARIO PARA SOLICITAR SER ORGANIZADOR
// =========================================================

function buildOrganizerForm() {
    const form = $('#organizerForm');

    if (!form) return;

    form.innerHTML = `
        <div class="form-grid">
            <label class="field">
                <span>Nombre y apellido *</span>
                <input name="full_name" type="text" required>
            </label>

            <label class="field">
                <span>Nombre de la organización</span>
                <input name="organization_name" type="text">
            </label>

            <label class="field">
                <span>Teléfono de contacto *</span>
                <input name="phone" type="tel" required>
            </label>

            <label class="field full-width">
                <span>Contanos sobre tus eventos</span>
                <textarea name="message" rows="4"
                    placeholder="Qué eventos organizás y dónde..."></textarea>
            </label>
        </div>

        <button type="submit" class="btn-primary">
            Enviar solicitud
        </button>
    `;
}

// =========================================================
// SOLICITAR SER ORGANIZADOR
// =========================================================

async function requestOrganizer() {
    await refreshSession();

    if (!currentUser) {
        showToast('Primero tenés que iniciar sesión.', 'error');
        await openAccount();
        return;
    }

    await checkAdmin();
    await checkApprovedOrganizer();

    if (isAdmin || isApprovedOrganizer) {
        openEventForm();
        return;
    }

    const { data, error } = await supabaseClient
        .from('organizer_requests')
        .select('id,status')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error(error);
        showToast('No se pudo consultar tu solicitud.', 'error');
        return;
    }

    if (data && data.length) {
        const status = data[0].status;

        if (status === 'pending') {
            showToast('Tu solicitud está pendiente de aprobación.');
            return;
        }

        if (status === 'approved') {
            await checkApprovedOrganizer();

            if (isApprovedOrganizer) {
                openEventForm();
                return;
            }
        }

        if (status === 'rejected') {
            showToast('Tu última solicitud fue rechazada. Podés enviar otra.');
        }
    }

    openDialog('#organizerDialog');
}

// =========================================================
// ENVIAR SOLICITUD
// =========================================================

async function submitOrganizerRequest(form) {
    await refreshSession();

    if (!currentUser) {
        showToast('Iniciá sesión para enviar la solicitud.', 'error');
        return;
    }

    const fullName = getFormValue(form, 'full_name');
    const organizationName = getFormValue(form, 'organization_name');
    const phone = getFormValue(form, 'phone');
    const message = getFormValue(form, 'message');

    if (!fullName || !phone) {
        showToast('Completá tu nombre y teléfono.', 'error');
        return;
    }

    const button = form.querySelector('button[type="submit"]');

    setButtonLoading(button, true, 'Enviando...');

    const { error } = await supabaseClient
        .from('organizer_requests')
        .insert({
            user_id: currentUser.id,
            full_name: fullName,
            organization_name: organizationName || null,
            phone,
            message: message || null,
            status: 'pending'
        });

    setButtonLoading(button, false);

    if (error) {
        console.error(error);
        showToast('No se pudo enviar la solicitud.', 'error');
        return;
    }

    closeDialog($('#organizerDialog'));

    form.reset();

    showToast('Solicitud enviada. Esperá la aprobación del administrador.');
}

// =========================================================
// CONSULTAR MI SOLICITUD
// =========================================================

async function checkMyRequest() {
    if (!currentUser) {
        showToast('Iniciá sesión para consultar tu solicitud.', 'error');
        return;
    }

    const { data, error } = await supabaseClient
        .from('organizer_requests')
        .select('status,created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error(error);
        showToast('No se pudo consultar el estado.', 'error');
        return;
    }

    if (!data || !data.length) {
        showToast('Todavía no enviaste una solicitud.');
        return;
    }

    const status = data[0].status;

    const messages = {
        pending: 'Tu solicitud está pendiente de revisión.',
        approved: '¡Tu solicitud fue aprobada! Ya podés publicar eventos.',
        rejected: 'Tu solicitud fue rechazada.'
    };

    showToast(messages[status] || `Estado de solicitud: ${status}`);
}

// =========================================================
// FORMULARIO DE EVENTOS
// =========================================================

function buildEventForm() {
    const form = $('#eventForm');

    if (!form) return;

    form.innerHTML = `
        <div class="form-grid">

            <label class="field full-width">
                <span>Nombre del evento *</span>
                <input type="text" name="title" maxlength="150"
                    placeholder="Ej.: Gran Festival de Doma y Tradición"
                    required>
            </label>

            <label class="field">
                <span>Categoría *</span>
                <select name="category" required>
                    <option value="">Seleccionar categoría</option>
                    <option value="Doma">Doma y jineteada</option>
                    <option value="Baile">Baile</option>
                    <option value="Fiesta de campo">Fiesta de campo</option>
                    <option value="Festival">Festival</option>
                    <option value="Folklore">Folklore</option>
                    <option value="Fiesta criolla">Fiesta criolla</option>
                    <option value="Otro">Otro</option>
                </select>
            </label>

            <label class="field">
                <span>Provincia *</span>
                <input type="text" name="province" placeholder="Ej.: Corrientes" required>
            </label>

            <label class="field">
                <span>Localidad *</span>
                <input type="text" name="locality" placeholder="Ej.: Mercedes" required>
            </label>

            <label class="field">
                <span>Predio o lugar</span>
                <input type="text" name="venue" placeholder="Nombre del predio">
            </label>

            <label class="field full-width">
                <span>Dirección</span>
                <input type="text" name="address" placeholder="Dirección del evento">
            </label>

            <label class="field">
                <span>Fecha de inicio *</span>
                <input type="date" name="event_date" required>
            </label>

            <label class="field">
                <span>Fecha de finalización</span>
                <input type="date" name="end_date">
            </label>

            <label class="field">
                <span>Horario de inicio</span>
                <input type="time" name="end_time">
            </label>

            <label class="field">
                <span>Precio anticipado</span>
                <input type="text" name="presale_price" placeholder="Ej.: $10.000">
            </label>

            <label class="field">
                <span>Precio en puerta</span>
                <input type="text" name="door_price" placeholder="Ej.: $12.000">
            </label>

            <label class="field full-width">
                <span>Información sobre entradas</span>
                <textarea name="ticket_notes" rows="2"
                    placeholder="Puntos de venta, promociones, reservas..."></textarea>
            </label>

            <label class="field full-width">
                <span>Información para menores</span>
                <textarea name="minors_info" rows="2"
                    placeholder="Ingreso de menores, acompañantes, etc."></textarea>
            </label>

            <label class="field full-width">
                <span>Descripción del evento *</span>
                <textarea name="description" rows="5"
                    placeholder="Contá qué actividades habrá en el evento..."
                    required></textarea>
            </label>

            <label class="field full-width">
                <span>Ubicación en Google Maps</span>
                <input type="url" name="maps_url"
                    placeholder="https://maps.google.com/...">
            </label>

            <div class="field full-width">
                <span>Servicios disponibles</span>

                <label class="check-field">
                    <input type="checkbox" name="has_food">
                    Servicio de comida o cantina
                </label>

                <label class="check-field">
                    <input type="checkbox" name="has_parking">
                    Estacionamiento
                </label>

                <label class="check-field">
                    <input type="checkbox" name="has_camping">
                    Camping
                </label>
            </div>

            <label class="field">
                <span>Teléfono de contacto</span>
                <input type="tel" name="contact_phone">
            </label>

            <label class="field">
                <span>WhatsApp</span>
                <input type="tel" name="whatsapp">
            </label>

            <label class="field">
                <span>Instagram</span>
                <input type="url" name="instagram"
                    placeholder="https://instagram.com/...">
            </label>

            <label class="field">
                <span>Facebook</span>
                <input type="url" name="facebook"
                    placeholder="https://facebook.com/...">
            </label>

            <label class="field full-width">
                <span>Imagen o flyer del evento</span>
                <input type="file" name="flyer"
                    accept="image/jpeg,image/png,image/webp">
                <small>Formatos permitidos: JPG, PNG y WEBP.</small>
                <div id="flyerPreview" class="flyer-preview"></div>
            </label>

        </div>

        <input type="hidden" name="event_id">

        <button type="submit" id="saveEventBtn" class="btn-primary">
            Publicar evento
        </button>
    `;

    const fileInput = form.elements.namedItem('flyer');

    if (fileInput) {
        fileInput.addEventListener('change', previewFlyer);
    }
}

// =========================================================
// VISTA PREVIA DEL FLYER
// =========================================================

function previewFlyer() {
    const form = $('#eventForm');
    const file = form?.elements.namedItem('flyer')?.files?.[0];
    const preview = $('#flyerPreview');

    if (!preview) return;

    if (!file) {
        preview.innerHTML = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        showToast('El archivo seleccionado no es una imagen.', 'error');
   
// =========================================================
// EDITAR EVENTO
// =========================================================

async function editEvent(eventId) {
    await refreshSession();
    await checkAdmin();
    await checkApprovedOrganizer();

    const event = allEvents.find(item => item.id === eventId);

    if (!event) {
        showToast('No se encontró el evento.', 'error');
        return;
    }

    if (
        !isAdmin &&
        (!isApprovedOrganizer || event.organizer_id !== currentUser?.id)
    ) {
        showToast('No tenés permiso para editar este evento.', 'error');
        return;
    }

    editingEventId = eventId;

    const form = $('#eventForm');

    if (!form) return;

    form.reset();

    setFormValue(form, 'title', event.title);
    setFormValue(form, 'category', event.category);
    setFormValue(form, 'province', event.province);
    setFormValue(form, 'locality', event.locality);
    setFormValue(form, 'venue', event.venue);
    setFormValue(form, 'address', event.address);

    setFormValue(
        form,
        'event_date',
        event.event_date ? String(event.event_date).split('T')[0] : ''
    );

    setFormValue(
        form,
        'end_date',
        event.end_date ? String(event.end_date).split('T')[0] : ''
    );

    setFormValue(form, 'end_time', event.end_time);
    setFormValue(form, 'description', event.description);
    setFormValue(form, 'presale_price', event.presale_price);
    setFormValue(form, 'door_price', event.door_price);
    setFormValue(form, 'ticket_notes', event.ticket_notes);
    setFormValue(form, 'minors_info', event.minors_info);
    setFormValue(form, 'maps_url', event.maps_url);
    setFormValue(form, 'contact_phone', event.contact_phone);
    setFormValue(form, 'whatsapp', event.whatsapp);
    setFormValue(form, 'instagram', event.instagram);
    setFormValue(form, 'facebook', event.facebook);

    if (form.elements.namedItem('has_food')) {
        form.elements.namedItem('has_food').checked = !!event.has_food;
    }

    if (form.elements.namedItem('has_parking')) {
        form.elements.namedItem('has_parking').checked = !!event.has_parking;
    }

    if (form.elements.namedItem('has_camping')) {
        form.elements.namedItem('has_camping').checked = !!event.has_camping;
    }

    setFormValue(form, 'event_id', event.id);

    const preview = $('#flyerPreview');

    if (preview) {
        preview.innerHTML = event.flyer_url
            ? `<img src="${escapeHTML(safeUrl(event.flyer_url))}" alt="Flyer actual">`
            : '';
    }

    const title = $('#eventFormTitle');

    if (title) title.textContent = 'Editar evento';

    const button = $('#saveEventBtn');

    if (button) button.textContent = 'Guardar cambios';

    openDialog('#eventDialog');
}

// =========================================================
// PANEL DE ADMINISTRACIÓN
// =========================================================

async function openAdminPanel() {
    await refreshSession();
    await checkAdmin();

    if (!isAdmin) {
        showToast('No tenés permisos de administrador.', 'error');
        return;
    }

    openDialog('#adminDialog');

    await loadAdminRequests();
    await loadAdminEvents();
}

function showAdminTab(tab) {
    activeAdminTab = tab;

    $$('.admin-tab').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.adminTab === tab
        );
    });

    const requests = $('#adminRequests');
    const events = $('#adminEvents');

    if (requests) requests.hidden = tab !== 'requests';
    if (events) events.hidden = tab !== 'events';
}

// =========================================================
// CARGAR SOLICITUDES DE ORGANIZADORES
// =========================================================

async function loadAdminRequests() {
    const container = $('#adminRequests');

    if (!container) return;

    container.innerHTML = '<p>Cargando solicitudes...</p>';

    const { data, error } = await supabaseClient
        .from('organizer_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                No se pudieron cargar las solicitudes.
            </div>
        `;

        return;
    }

    if (!data || !data.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No hay solicitudes</h3>
                <p>Cuando alguien solicite ser organizador aparecerá acá.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = data.map(request => {
        const status = escapeHTML(request.status || 'pending');

        return `
            <article class="admin-card">
                <h3>${escapeHTML(request.full_name)}</h3>

                <p><strong>Organización:</strong>
                ${escapeHTML(request.organization_name || 'No especificada')}</p>

                <p><strong>Teléfono:</strong>
                ${escapeHTML(request.phone || 'No informado')}</p>

                <p><strong>Mensaje:</strong>
                ${escapeHTML(request.message || 'Sin mensaje')}</p>

                <p><strong>Estado:</strong> ${status}</p>

                ${
                    request.status !== 'approved'
                    ? `
                        <button type="button" class="btn-primary"
                            data-approve-request="${escapeHTML(request.id)}">
                            Aprobar
                        </button>
                    `
                    : '<p class="status-approved">Organizador aprobado</p>'
                }

                ${
                    request.status !== 'rejected'
                    ? `
                        <button type="button" class="btn-secondary"
                            data-reject-request="${escapeHTML(request.id)}">
                            Rechazar
                        </button>
                    `
                    : ''
                }
            </article>
        `;
    }).join('');
}

// =========================================================
// APROBAR O RECHAZAR SOLICITUD
// =========================================================

async function updateOrganizerRequest(requestId, status) {
    await refreshSession();
    await checkAdmin();

    if (!isAdmin) {
        showToast('No tenés permisos para realizar esta acción.', 'error');
        return;
    }

    const { error } = await supabaseClient
        .from('organizer_requests')
        .update({ status })
        .eq('id', requestId);

    if (error) {
        console.error(error);
        showToast('No se pudo actualizar la solicitud.', 'error');
        return;
    }

    showToast(
        status === 'approved'
            ? 'Organizador aprobado correctamente.'
            : 'Solicitud rechazada.'
    );

    await loadAdminRequests();
}

// =========================================================
// CARGAR EVENTOS EN ADMINISTRACIÓN
// =========================================================

async function loadAdminEvents() {
    const container = $('#adminEvents');

    if (!container) return;

    container.innerHTML = '<p>Cargando eventos...</p>';

    const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                No se pudieron cargar los eventos.
            </div>
        `;

        return;
    }

    if (!data || !data.length) {
        container.innerHTML = `
            <div class="empty-state">
                Todavía no hay eventos publicados.
            </div>
        `;

        return;
    }

    container.innerHTML = data.map(event => `
        <article class="admin-card">
            <h3>${escapeHTML(event.title)}</h3>

            <p>${escapeHTML(event.locality || '')},
            ${escapeHTML(event.province || '')}</p>

            <p>📅 ${escapeHTML(formatDate(event.event_date))}</p>

            <button type="button" class="btn-primary"
                data-edit-event="${escapeHTML(event.id)}">
                Editar evento
            </button>
        </article>
    `).join('');
}

// =========================================================
// NAVEGACIÓN PRINCIPAL
// =========================================================

function showPage(page) {
    $$('.nav-item').forEach(item => {
        item.classList.toggle(
            'active',
            item.dataset.page === page
        );
    });

    if (page === 'saved') {
        renderSavedEvents();
        return;
    }

    if (page === 'home' || page === 'map') {
        renderEvents();
        return;
    }

    if (page === 'account') {
        openAccount();
    }
}

// =========================================================
// BOTÓN DE ADMINISTRACIÓN
// =========================================================

function addAdminButton() {
    if (!isAdmin) return;
    if ($('#adminPanelBtn')) return;

    const organizerButton = $('#organizerBtn');

    if (!organizerButton) return;

    const button = document.createElement('button');

    button.id = 'adminPanelBtn';
    button.type = 'button';
    button.className = 'btn-secondary';
    button.textContent = 'Administración';

    organizerButton.insertAdjacentElement('afterend', button);

    button.addEventListener('click', openAdminPanel);
}

// =========================================================
// EVENTOS DE INTERFAZ
// =========================================================

function setupEventListeners() {

    // Cuenta
    $('#profileBtn')?.addEventListener('click', openAccount);

    // Organizador
    $('#organizerBtn')?.addEventListener('click', requestOrganizer);

    // Marca principal
    $('#brandHome')?.addEventListener('click', event => {
        event.preventDefault();
        showPage('home');
    });

    // Buscador
    $('#search')?.addEventListener('input', renderEvents);

    // Filtros
    $$('.chip[data-filter]').forEach(chip => {
        chip.addEventListener('click', () => {
            activeFilter = chip.dataset.filter || 'Todos';

            $$('.chip[data-filter]').forEach(item => {
                item.classList.toggle('active', item === chip);
            });

            renderEvents();
        });
    });

    // Navegación
    $$('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            showPage(item.dataset.page);
        });
    });

    // Formularios de cuenta
    $('#loginForm')?.addEventListener('submit', event => {
        event.preventDefault();
        signIn(event.currentTarget);
    });

    $('#registerForm')?.addEventListener('submit', event => {
        event.preventDefault();
        signUp(event.currentTarget);
    });

    // Pestañas de cuenta
    $$('.form-tab[data-account-tab]').forEach(button => {
        button.addEventListener('click', () => {
            showAccountTab(button.dataset.accountTab);
        });
    });

    // Recuperar contraseña
    $('#forgotPasswordBtn')?.addEventListener('click', recoverPassword);

    // Cerrar sesión
    $('#signOutBtn')?.addEventListener('click', signOut);

    // Estado de solicitud
    $('#myRequestBtn')?.addEventListener('click', checkMyRequest);

    // Solicitud de organizador
    $('#organizerForm')?.addEventListener('submit', event => {
        event.preventDefault();
        submitOrganizerRequest(event.currentTarget);
    });

    // Publicar o editar evento
    $('#eventForm')?.addEventListener('submit', event => {
        event.preventDefault();
        saveEvent(event.currentTarget);
    });

    // Pestañas de administración
    $$('.admin-tab[data-admin-tab]').forEach(button => {
        button.addEventListener('click', () => {
            showAdminTab(button.dataset.adminTab);
        });
    });

    // Cerrar diálogos
    $$('[data-close]').forEach(button => {
        button.addEventListener('click', () => {
            const dialog = button.closest('dialog');
            closeDialog(dialog);
        });
    });

    // Cerrar detalle
    $('#detailContent')?.addEventListener('click', event => {
        if (event.target.closest('[data-close-detail]')) {
            closeDialog($('#detailDialog'));
        }
    });

    // Acciones dinámicas
    document.addEventListener('click', event => {

        const detailButton = event.target.closest('[data-open-event]');

        if (detailButton) {
            openEventDetail(detailButton.dataset.openEvent);
            return;
        }

        const approveButton = event.target.closest('[data-approve-request]');

        if (approveButton) {
            updateOrganizerRequest(
                approveButton.dataset.approveRequest,
                'approved'
            );
            return;
        }

        const rejectButton = event.target.closest('[data-reject-request]');

        if (rejectButton) {
            updateOrganizerRequest(
                rejectButton.dataset.rejectRequest,
                'rejected'
            );
            return;
        }

        const editButton = event.target.closest('[data-edit-event]');

        if (editButton) {
            editEvent(editButton.dataset.editEvent);
            return;
        }
    });
}

// =========================================================
// INICIAR APLICACIÓN
// =========================================================

async function setupApp() {
    console.log('Iniciando Fiestas Gauchas...');

    if (!initializeSupabase()) return;

    buildAccountForms();
    buildOrganizerForm();
    buildEventForm();

    setupEventListeners();

    await refreshSession();

    await checkAdmin();
    await checkApprovedOrganizer();

    await updateAccountButton();

    updateOrganizerButton();

    if (isAdmin) {
        addAdminButton();
    }

    await loadEvents();

    // Escuchar cambios de sesión
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentSession = session;
        currentUser = session?.user ?? null;

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            updateAccountButton();
        }
    });

    console.log('Fiestas Gauchas está funcionando correctamente.');
}

// =========================================================
// ARRANQUE DE LA APLICACIÓN
// =========================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupApp);
} else {
    setupApp();
}
       
