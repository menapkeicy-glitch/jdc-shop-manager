/**
 * Agente AI multi-marca (Acuarella + JDC House)
 * - Cambia entre marcas con un solo click
 * - Cada marca tiene sus propios chats, colores, system prompt y personalidad
 * - Soporta modo claro/oscuro, modo directo/backend, adjuntos, web search
 */

// =====================================================
// ESTADO
// =====================================================

const appState = {
  activeBrandId: 'acuarella',     // 'acuarella' | 'jdc' | 'custom_xxx'
  brands: {                        // { [brandId]: { chats: [], activeChatId: null } }
    acuarella: { chats: [], activeChatId: null },
    jdc:       { chats: [], activeChatId: null }
  },
  customBrands: {},                // { [brandId]: brandObject } — marcas personalizadas del usuario
  loadingChats: new Set(),
  loadingStartTimes: new Map(),    // chatId → timestamp del inicio (para mostrar timer)
  loadingTimerInterval: null,      // setInterval handle para refrescar el timer
  pendingAttachments: [],
  apiKey: '',
  mode: 'auto',
  theme: 'system',
  backendAvailable: null,
  editingBrandId: null             // id de la marca custom que se está editando (null = creando)
};

function getAllBrands() {
  // Combina marcas built-in con custom
  return { ...BRANDS, ...appState.customBrands };
}

function getActiveBrand() {
  return getAllBrands()[appState.activeBrandId];
}

function isCustomBrand(brandId) {
  return !!appState.customBrands[brandId];
}

function getBrandState(brandId) {
  return appState.brands[brandId || appState.activeBrandId];
}

function getActiveChat() {
  const bs = getBrandState();
  return bs.chats.find(c => c.id === bs.activeChatId);
}

function isChatLoading(chatId) {
  return appState.loadingChats.has(chatId);
}

function isActiveChatLoading() {
  return isChatLoading(getBrandState().activeChatId);
}

// =====================================================
// DOM
// =====================================================

const $ = (id) => document.getElementById(id);

const elements = {
  app: document.querySelector('.app'),
  sidebarToggle: $('sidebarToggle'),
  brandLogo: $('brandLogo'),
  brandSwitcher: $('brandSwitcher'),
  loadingTime: $('loadingTime'),
  loadingHint: $('loadingHint'),

  // Brand modal (crear/editar marca custom)
  brandModal: $('brandModal'),
  brandModalTitle: $('brandModalTitle'),
  brandModalClose: $('brandModalClose'),
  brandModalCancel: $('brandModalCancel'),
  brandModalSave: $('brandModalSave'),
  brandModalDelete: $('brandModalDelete'),
  brandName: $('brandName'),
  brandTagline: $('brandTagline'),
  brandEmoji: $('brandEmoji'),
  brandColor: $('brandColor'),
  brandColorHex: $('brandColorHex'),
  brandDescription: $('brandDescription'),
  brandBusinessType: $('brandBusinessType'),
  brandPersonality: $('brandPersonality'),
  brandValues: $('brandValues'),
  brandProducts: $('brandProducts'),
  brandWebsite: $('brandWebsite'),
  brandApiKey: $('brandApiKey'),
  brandKeyStatus: $('brandKeyStatus'),
  brandKeyStatusText: $('brandKeyStatusText'),
  brandDeleteApiKey: $('brandDeleteApiKey'),

  messages: $('messages'),
  loading: $('loading'),
  composer: $('composer'),
  input: $('messageInput'),
  sendBtn: $('sendBtn'),
  quickActions: $('quickActions'),
  categoryList: $('categoryList'),
  trendScope: $('trendScope'),
  discoverTrendsBtn: $('discoverTrendsBtn'),
  toast: $('toast'),
  modePill: $('modePill'),
  composerHint: $('composerHint'),
  sidebarHint: $('sidebarHint'),

  newChatBtn: $('newChatBtn'),
  chatList: $('chatList'),

  attachBtn: $('attachBtn'),
  fileInput: $('fileInput'),
  attachmentsList: $('attachmentsList'),

  settingsBtn: $('settingsBtn'),
  settingsModal: $('settingsModal'),
  settingsClose: $('settingsClose'),
  settingsCancel: $('settingsCancel'),
  settingsSave: $('settingsSave'),
  modeSelect: $('modeSelect'),
  apiKeyInput: $('apiKeyInput'),
  keyStatus: $('keyStatus'),
  keyStatusText: $('keyStatusText'),
  deleteApiKey: $('deleteApiKey'),
  clearAllChatsBtn: $('clearAllChatsBtn')
};

// =====================================================
// INIT
// =====================================================

function init() {
  loadFromStorage();
  applyTheme();
  applyBrand();          // aplica colores + system del brand activo
  applySidebarState();
  watchSystemTheme();
  renderBrandSwitcher();
  renderBrandHeader();
  renderBrandSidebar();  // quick actions, categorías, hint, etc.
  renderChatList();
  loadActiveChat();
  updateModePill();
  attachEventListeners();
  elements.input.focus();
}

function attachEventListeners() {
  elements.composer.addEventListener('submit', handleSubmit);
  elements.input.addEventListener('input', autoResizeInput);
  elements.input.addEventListener('keydown', handleKeydown);
  elements.newChatBtn.addEventListener('click', createNewChat);
  elements.discoverTrendsBtn.addEventListener('click', discoverTrends);
  elements.sidebarToggle.addEventListener('click', toggleSidebar);

  // Atajo de teclado
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !elements.input.matches(':focus-within')) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Attachments
  elements.attachBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', handleFileSelection);

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
    elements.composer.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); });
  });
  elements.composer.addEventListener('dragover', () => elements.composer.classList.add('drag-over'));
  elements.composer.addEventListener('dragleave', () => elements.composer.classList.remove('drag-over'));
  elements.composer.addEventListener('drop', async (e) => {
    elements.composer.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files || []);
    for (const file of files) await processAttachment(file);
    renderAttachments();
  });

  // Settings
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.settingsClose.addEventListener('click', closeSettings);
  elements.settingsCancel.addEventListener('click', closeSettings);
  elements.settingsSave.addEventListener('click', saveSettings);
  elements.deleteApiKey.addEventListener('click', removeStoredApiKey);
  elements.clearAllChatsBtn.addEventListener('click', clearAllChats);

  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeSettings();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.settingsModal.hidden) closeSettings();
  });

  // Preview de tema en vivo
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.documentElement.setAttribute('data-theme', resolveTheme(radio.value));
      // Reaplicar colores de marca tras cambiar tema
      applyBrandColors();
    });
  });

  // Brand modal
  elements.brandModalClose.addEventListener('click', closeBrandModal);
  elements.brandModalCancel.addEventListener('click', closeBrandModal);
  elements.brandModalSave.addEventListener('click', saveBrandFromModal);
  elements.brandModalDelete.addEventListener('click', deleteBrandFromModal);
  elements.brandDeleteApiKey.addEventListener('click', removeBrandApiKey);
  elements.brandModal.addEventListener('click', (e) => {
    if (e.target === elements.brandModal) closeBrandModal();
  });

  // Sincronizar color picker ↔ hex input
  elements.brandColor.addEventListener('input', () => {
    elements.brandColorHex.value = elements.brandColor.value.toUpperCase();
  });
  elements.brandColorHex.addEventListener('input', () => {
    const val = elements.brandColorHex.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      elements.brandColor.value = val.toLowerCase();
    }
  });

  // Auto-rellenar valores según tipo de negocio (solo si el usuario no los ha modificado)
  elements.brandBusinessType.addEventListener('change', () => {
    const currentText = elements.brandValues.value;
    if (isStillDefaultValues(currentText)) {
      elements.brandValues.value = getDefaultValuesText(elements.brandBusinessType.value);
    }
  });
}

// =====================================================
// BRAND MODAL (crear / editar marca custom)
// =====================================================

function openBrandModal(brandId) {
  appState.editingBrandId = brandId;
  const isEditing = !!brandId;
  const brand = isEditing ? appState.customBrands[brandId] : null;

  elements.brandModalTitle.textContent = isEditing ? 'Editar marca' : 'Nueva marca';
  elements.brandModalDelete.hidden = !isEditing;

  const businessType = brand?.businessType || 'marca-propia';

  elements.brandName.value = brand?.name || '';
  elements.brandTagline.value = brand?.tagline || '';
  elements.brandEmoji.value = brand?.emoji && brand.emoji !== '✦' ? brand.emoji : '';
  elements.brandColor.value = brand?.primaryColor || '#7C3AED';
  elements.brandColorHex.value = (brand?.primaryColor || '#7C3AED').toUpperCase();
  elements.brandBusinessType.value = businessType;
  elements.brandDescription.value = brand?.description || '';
  elements.brandPersonality.value = brand?.personality || '';
  // Valores: si está creando (no editando), pre-rellenar con defaults del tipo
  // Si edita, cargar los valores guardados tal cual
  elements.brandValues.value = brand
    ? (brand.values || []).join('\n')
    : getDefaultValuesText(businessType);
  elements.brandProducts.value = (brand?.products || []).join('\n');
  elements.brandWebsite.value = brand?.website || '';

  // API key por marca: NUNCA precargar el valor, solo mostrar status si existe
  elements.brandApiKey.value = '';
  renderBrandKeyStatus();

  elements.brandModal.hidden = false;
  setTimeout(() => elements.brandName.focus(), 50);
}

function closeBrandModal() {
  elements.brandModal.hidden = true;
  appState.editingBrandId = null;
}

function saveBrandFromModal() {
  const name = elements.brandName.value.trim();
  const tagline = elements.brandTagline.value.trim();
  const emoji = elements.brandEmoji.value.trim();
  const color = elements.brandColor.value;
  const description = elements.brandDescription.value.trim();

  if (!name) { showToast('Falta el nombre de la marca', 'error'); elements.brandName.focus(); return; }
  if (!tagline) { showToast('Falta la descripción corta', 'error'); elements.brandTagline.focus(); return; }
  if (!description) { showToast('Falta la descripción de qué vende', 'error'); elements.brandDescription.focus(); return; }
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) { showToast('Color HEX inválido (usa formato #RRGGBB)', 'error'); return; }

  const form = {
    id: appState.editingBrandId,
    name, tagline, emoji, color, description,
    businessType: elements.brandBusinessType.value || 'marca-propia',
    personality: elements.brandPersonality.value.trim(),
    values: elements.brandValues.value,
    products: elements.brandProducts.value,
    website: elements.brandWebsite.value.trim()
  };

  const newBrand = buildCustomBrand(form);

  // Preservar/actualizar la API key específica de la marca
  const typedKey = elements.brandApiKey.value.trim();
  const existing = appState.editingBrandId ? appState.customBrands[appState.editingBrandId] : null;
  if (typedKey) {
    newBrand.apiKey = typedKey;
  } else if (existing && existing.apiKey) {
    newBrand.apiKey = existing.apiKey;
  }

  appState.customBrands[newBrand.id] = newBrand;
  saveCustomBrandsToStorage();
  elements.brandApiKey.value = '';

  // Asegurar que la marca tiene su estado de chats inicializado
  if (!appState.brands[newBrand.id]) {
    const chat = createChatObject();
    appState.brands[newBrand.id] = { chats: [chat], activeChatId: chat.id };
    saveBrandChats(newBrand.id);
  }

  // Si era nueva, cambiar a ella automáticamente
  if (!appState.editingBrandId) {
    appState.activeBrandId = newBrand.id;
    saveSettingsToStorage();
    applyBrand();
    renderBrandHeader();
    renderBrandSidebar();
    loadActiveChat();
  } else if (newBrand.id === appState.activeBrandId) {
    // Si editabas la marca activa, re-aplicar
    applyBrand();
    renderBrandHeader();
    renderBrandSidebar();
    loadActiveChat();
  }

  renderBrandSwitcher();
  renderChatList();
  closeBrandModal();
  showToast(appState.editingBrandId ? 'Marca actualizada' : `Marca "${newBrand.name}" creada`, 'success');
}

function deleteBrandFromModal() {
  if (!appState.editingBrandId) return;
  deleteCustomBrand(appState.editingBrandId);
  closeBrandModal();
}

function renderBrandKeyStatus() {
  const brand = appState.editingBrandId ? appState.customBrands[appState.editingBrandId] : null;
  if (!brand || !brand.apiKey) {
    elements.brandKeyStatus.hidden = true;
    return;
  }
  const key = brand.apiKey;
  const masked = '••••••••••••••' + (key.length > 4 ? key.slice(-4) : '');
  elements.brandKeyStatusText.textContent = `Guardada · ${masked}`;
  elements.brandKeyStatus.hidden = false;
}

function removeBrandApiKey() {
  if (!appState.editingBrandId) return;
  const brand = appState.customBrands[appState.editingBrandId];
  if (!brand || !brand.apiKey) return;
  if (!confirm('¿Eliminar la API key específica de esta marca? Volverá a usar la global.')) return;
  delete brand.apiKey;
  saveCustomBrandsToStorage();
  renderBrandKeyStatus();
  showToast('API key de la marca eliminada. Usará la global.', 'success');
}

/**
 * Devuelve la API key efectiva para la marca activa:
 * primero la específica del brand, después la global.
 */
function getEffectiveApiKey(brandId) {
  const id = brandId || appState.activeBrandId;
  const customBrand = appState.customBrands[id];
  if (customBrand && customBrand.apiKey) return customBrand.apiKey;
  return appState.apiKey || '';
}

function deleteCustomBrand(brandId) {
  const brand = appState.customBrands[brandId];
  if (!brand) return;
  if (!confirm(`¿Eliminar la marca "${brand.name}" y todos sus chats? Esta acción no se puede deshacer.`)) return;

  delete appState.customBrands[brandId];
  saveCustomBrandsToStorage();

  // Borrar chats almacenados
  localStorage.removeItem(brandChatsKey(brandId));
  localStorage.removeItem(brandActiveChatKey(brandId));
  delete appState.brands[brandId];

  // Si era la marca activa, cambiar a Acuarella
  if (appState.activeBrandId === brandId) {
    appState.activeBrandId = 'acuarella';
    saveSettingsToStorage();
    applyBrand();
    renderBrandHeader();
    renderBrandSidebar();
    loadActiveChat();
  }

  renderBrandSwitcher();
  renderChatList();
  showToast(`Marca "${brand.name}" eliminada`, 'success');
}

// =====================================================
// STORAGE
// =====================================================

function brandChatsKey(brandId) { return `multi.${brandId}.chats`; }
function brandActiveChatKey(brandId) { return `multi.${brandId}.activeChatId`; }

function loadFromStorage() {
  try {
    appState.apiKey = localStorage.getItem(CONFIG.STORAGE.API_KEY) || '';
    appState.mode = localStorage.getItem(CONFIG.STORAGE.MODE) || CONFIG.MODES.AUTO;
    appState.theme = localStorage.getItem(CONFIG.STORAGE.THEME) || CONFIG.THEMES.SYSTEM;

    // Cargar marcas custom primero
    const rawCustom = localStorage.getItem(CONFIG.STORAGE.CUSTOM_BRANDS);
    if (rawCustom) {
      try {
        const parsed = JSON.parse(rawCustom);
        if (parsed && typeof parsed === 'object') appState.customBrands = parsed;
      } catch (_) {}
    }

    appState.activeBrandId = localStorage.getItem(CONFIG.STORAGE.ACTIVE_BRAND) || 'acuarella';
    const allBrands = getAllBrands();
    if (!allBrands[appState.activeBrandId]) appState.activeBrandId = 'acuarella';

    let anySanitized = false;
    for (const brandId of Object.keys(allBrands)) {
      const rawChats = localStorage.getItem(brandChatsKey(brandId));
      const chats = rawChats ? JSON.parse(rawChats) : [];
      if (sanitizeMessagesInPlace(chats.flatMap(c => c.messages || []))) anySanitized = true;
      const activeChatId = localStorage.getItem(brandActiveChatKey(brandId));
      appState.brands[brandId] = { chats, activeChatId };

      if (chats.length === 0) {
        const chat = createChatObject();
        chats.push(chat);
        appState.brands[brandId].activeChatId = chat.id;
        saveBrandChats(brandId);
      } else if (!chats.find(c => c.id === appState.brands[brandId].activeChatId)) {
        appState.brands[brandId].activeChatId = chats[0].id;
      }
    }
    if (anySanitized) {
      for (const brandId of Object.keys(allBrands)) saveBrandChats(brandId);
    }
  } catch (err) {
    console.warn('Storage corrupto, reiniciando.', err);
    for (const brandId of Object.keys(BRANDS)) {
      const chat = createChatObject();
      appState.brands[brandId] = { chats: [chat], activeChatId: chat.id };
      saveBrandChats(brandId);
    }
  }
}

function saveCustomBrandsToStorage() {
  localStorage.setItem(CONFIG.STORAGE.CUSTOM_BRANDS, JSON.stringify(appState.customBrands));
}

function saveBrandChats(brandId) {
  brandId = brandId || appState.activeBrandId;
  try {
    const bs = appState.brands[brandId];
    localStorage.setItem(brandChatsKey(brandId), JSON.stringify(bs.chats));
    if (bs.activeChatId) {
      localStorage.setItem(brandActiveChatKey(brandId), bs.activeChatId);
    }
  } catch (err) {
    showToast('No pude guardar el chat (storage lleno?).', 'error');
  }
}

function saveSettingsToStorage() {
  localStorage.setItem(CONFIG.STORAGE.MODE, appState.mode);
  localStorage.setItem(CONFIG.STORAGE.THEME, appState.theme);
  localStorage.setItem(CONFIG.STORAGE.ACTIVE_BRAND, appState.activeBrandId);
  if (appState.apiKey) {
    localStorage.setItem(CONFIG.STORAGE.API_KEY, appState.apiKey);
  } else {
    localStorage.removeItem(CONFIG.STORAGE.API_KEY);
  }
}

// =====================================================
// TEMA
// =====================================================

function applyTheme() {
  const effective = resolveTheme(appState.theme);
  document.documentElement.setAttribute('data-theme', effective);
  applyBrandColors();
}

function resolveTheme(setting) {
  if (setting === CONFIG.THEMES.SYSTEM) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? CONFIG.THEMES.DARK
      : CONFIG.THEMES.LIGHT;
  }
  return setting;
}

function watchSystemTheme() {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (appState.theme === CONFIG.THEMES.SYSTEM) applyTheme();
  });
}

// =====================================================
// MARCA (switcher + aplicación de identidad)
// =====================================================

function applyBrand() {
  document.documentElement.setAttribute('data-brand', appState.activeBrandId);
  applyBrandColors();
}

function applyBrandColors() {
  const brand = getActiveBrand();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const palette = isDark ? brand.colors.dark : brand.colors.light;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(key, value);
  }
}

function switchBrand(brandId) {
  const allBrands = getAllBrands();
  if (!allBrands[brandId] || brandId === appState.activeBrandId) return;
  if (isActiveChatLoading()) {
    showToast('Espera la respuesta actual antes de cambiar de marca', 'info');
    return;
  }
  appState.activeBrandId = brandId;
  saveSettingsToStorage();
  applyBrand();
  renderBrandSwitcher();
  renderBrandHeader();
  renderBrandSidebar();
  renderChatList();
  loadActiveChat();
  updateModePill();
  const brand = allBrands[brandId];
  showToast(`${CONFIG.MESSAGES.BRAND_SWITCHED} ${brand.name} ${brand.emoji || ''}`.trim(), 'success');
  elements.input.focus();
}

function renderBrandSwitcher() {
  const allBrands = Object.values(getAllBrands());
  const chipsHtml = allBrands.map(b => {
    const isActive = b.id === appState.activeBrandId;
    const isCustom = isCustomBrand(b.id);
    const actions = isCustom ? `
      <span class="brand-chip-actions">
        <button type="button" class="brand-chip-action edit" data-action="edit" data-id="${b.id}" title="Editar">✎</button>
        <button type="button" class="brand-chip-action delete" data-action="delete" data-id="${b.id}" title="Eliminar">×</button>
      </span>
    ` : '';
    return `
      <button type="button"
              class="brand-chip ${isActive ? 'active' : ''}"
              data-brand-id="${b.id}"
              role="tab"
              aria-selected="${isActive}"
              title="${escapeHtml(b.tagline)}">
        <span class="brand-chip-emoji">${b.emoji}</span>
        <span class="brand-chip-name">${escapeHtml(b.name)}</span>
        ${actions}
      </button>
    `;
  }).join('');

  elements.brandSwitcher.innerHTML = chipsHtml + `
    <button type="button" class="brand-add-btn" id="addBrandBtn" title="Crear una marca personalizada">
      <span>＋</span>
      <span>Nueva marca</span>
    </button>
  `;

  elements.brandSwitcher.querySelectorAll('.brand-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Si clickearon en edit/delete, no cambiar de marca
      if (e.target.closest('.brand-chip-action')) return;
      switchBrand(btn.dataset.brandId);
    });
  });

  elements.brandSwitcher.querySelectorAll('.brand-chip-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'edit') openBrandModal(id);
      else if (action === 'delete') deleteCustomBrand(id);
    });
  });

  const addBtn = $('addBrandBtn');
  if (addBtn) addBtn.addEventListener('click', () => openBrandModal(null));
}

function renderBrandHeader() {
  const brand = getActiveBrand();
  elements.brandLogo.innerHTML = `
    <span class="logo-text">${escapeHtml(brand.logo.text)}<em>${escapeHtml(brand.logo.italic)}</em></span>
    <span class="logo-badge">${escapeHtml(brand.badge)}</span>
  `;
  document.title = `${brand.name} · Agente AI`;
}

function renderBrandSidebar() {
  renderQuickActions();
  renderCategories();
  renderTrendScopes();
  elements.composerHint.textContent = getActiveBrand().composerHint;
  elements.input.placeholder = getActiveBrand().placeholder;
  elements.sidebarHint.innerHTML = `${getActiveBrand().emoji} ${escapeHtml(getActiveBrand().tagline)}<br />Powered by Claude · v2.0.0`;
}

// =====================================================
// CHAT MANAGEMENT
// =====================================================

function createChatObject() {
  return {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    title: 'Nuevo chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function createNewChat() {
  const bs = getBrandState();
  const chat = createChatObject();
  bs.chats.unshift(chat);
  bs.activeChatId = chat.id;
  saveBrandChats();
  renderChatList();
  loadActiveChat();
  showToast(CONFIG.MESSAGES.CHAT_CLEARED, 'success');
  elements.input.focus();
}

function switchToChat(chatId) {
  getBrandState().activeChatId = chatId;
  saveBrandChats();
  renderChatList();
  loadActiveChat();
}

function deleteChat(chatId, event) {
  if (event) event.stopPropagation();
  if (!confirm('¿Eliminar este chat? Esta acción no se puede deshacer.')) return;
  const bs = getBrandState();
  appState.loadingChats.delete(chatId);
  appState.loadingStartTimes.delete(chatId);
  bs.chats = bs.chats.filter(c => c.id !== chatId);

  if (bs.chats.length === 0) {
    const chat = createChatObject();
    bs.chats.push(chat);
    bs.activeChatId = chat.id;
  } else if (bs.activeChatId === chatId) {
    bs.activeChatId = bs.chats[0].id;
  }
  saveBrandChats();
  renderChatList();
  loadActiveChat();
  showToast(CONFIG.MESSAGES.CHAT_DELETED, 'success');
}

function renameChat(chatId, event) {
  if (event) event.stopPropagation();
  const chat = getBrandState().chats.find(c => c.id === chatId);
  if (!chat) return;
  const newTitle = prompt('Nuevo nombre del chat:', chat.title);
  if (newTitle === null) return;
  const trimmed = newTitle.trim();
  if (!trimmed) return;
  chat.title = trimmed.slice(0, CONFIG.UI.MAX_TITLE_LENGTH);
  chat.updatedAt = Date.now();
  saveBrandChats();
  renderChatList();
}

function clearAllChats() {
  if (!confirm(`¿Borrar TODO el historial de chats de ${getActiveBrand().name}? Esta acción no se puede deshacer.`)) return;
  const bs = getBrandState();
  bs.chats = [];
  const chat = createChatObject();
  bs.chats.push(chat);
  bs.activeChatId = chat.id;
  saveBrandChats();
  renderChatList();
  loadActiveChat();
  showToast(CONFIG.MESSAGES.ALL_CHATS_CLEARED, 'success');
  closeSettings();
}

function autoTitle(firstUserMessage) {
  const clean = firstUserMessage.replace(/\s+/g, ' ').trim();
  return clean.length > CONFIG.UI.MAX_TITLE_LENGTH
    ? clean.slice(0, CONFIG.UI.MAX_TITLE_LENGTH) + '…'
    : clean;
}

// =====================================================
// RENDER
// =====================================================

function renderQuickActions() {
  const brand = getActiveBrand();
  elements.quickActions.innerHTML = brand.quickActions.map(action => `
    <button type="button" class="quick-action" data-key="${action.key}" title="${escapeHtml(action.desc)}">
      <span class="quick-action-emoji">${action.emoji}</span>
      <span class="quick-action-title">${action.title}</span>
    </button>
  `).join('');
  elements.quickActions.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => quickAction(btn.dataset.key));
  });
}

function renderCategories() {
  const brand = getActiveBrand();
  elements.categoryList.innerHTML = brand.categories.map(cat => `
    <li class="category-item" data-query="${escapeHtml(cat.query)}">
      <span class="category-emoji">${cat.emoji}</span>
      <span>${cat.name}</span>
    </li>
  `).join('');
  elements.categoryList.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      elements.input.value = item.dataset.query;
      autoResizeInput();
      elements.input.focus();
    });
  });
}

function renderTrendScopes() {
  const brand = getActiveBrand();
  elements.trendScope.innerHTML = Object.entries(brand.trendsDiscovery).map(([key, scope]) => `
    <option value="${key}">${scope.label}</option>
  `).join('');
}

function renderChatList() {
  const bs = getBrandState();
  if (bs.chats.length === 0) {
    elements.chatList.innerHTML = '<li class="chat-empty">Sin chats aún ✨</li>';
    return;
  }
  const sorted = [...bs.chats].sort((a, b) => b.updatedAt - a.updatedAt);
  elements.chatList.innerHTML = sorted.map(chat => {
    const isActive = chat.id === bs.activeChatId;
    const loading = isChatLoading(chat.id);
    const cls = `chat-item ${isActive ? 'active' : ''} ${loading ? 'is-loading' : ''}`.trim();
    const icon = loading
      ? '<span class="chat-item-spinner" aria-label="Pensando"></span>'
      : '';
    return `
      <li class="${cls}" data-chat-id="${chat.id}" role="button" tabindex="0">
        ${icon}
        <span class="chat-item-title" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
        <span class="chat-item-actions">
          <button type="button" class="chat-item-btn rename" data-action="rename" title="Renombrar">✎</button>
          <button type="button" class="chat-item-btn delete" data-action="delete" title="Eliminar">×</button>
        </span>
      </li>
    `;
  }).join('');

  elements.chatList.querySelectorAll('.chat-item').forEach(item => {
    const id = item.dataset.chatId;
    item.addEventListener('click', () => switchToChat(id));
    item.querySelector('[data-action="rename"]').addEventListener('click', (e) => renameChat(id, e));
    item.querySelector('[data-action="delete"]').addEventListener('click', (e) => deleteChat(id, e));
  });
}

function loadActiveChat() {
  const chat = getActiveChat();
  elements.messages.innerHTML = '';
  if (!chat || chat.messages.length === 0) {
    addMessageElement(getActiveBrand().greeting, 'assistant');
  } else {
    chat.messages.forEach(m => addMessageElement(m.content, m.role));
  }
  updateLoadingUI();
}

// =====================================================
// MESSAGES
// =====================================================

function handleSubmit(event) {
  event.preventDefault();
  sendMessage();
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

async function sendMessage(textOverride) {
  const chat = getActiveChat();
  if (!chat) return;
  if (isChatLoading(chat.id)) return;

  const text = (textOverride || elements.input.value).trim();
  const attachments = [...appState.pendingAttachments];

  if (!text && attachments.length === 0) {
    showToast(CONFIG.MESSAGES.INPUT_EMPTY, 'info');
    return;
  }

  const attachmentBlocks = attachmentsToContent(attachments);
  const textBlock = text ? [{ type: 'text', text }] : [];
  const contentArr = [...attachmentBlocks, ...textBlock];
  const messageContent = (contentArr.length === 1 && contentArr[0].type === 'text')
    ? contentArr[0].text
    : contentArr;

  const chatId = chat.id;
  const brandId = appState.activeBrandId;

  if (chat.messages.length === 0) {
    chat.title = autoTitle(text || attachments[0]?.name || 'Chat con archivos');
  }

  chat.messages.push({ role: 'user', content: messageContent });
  chat.updatedAt = Date.now();
  addMessageElement(messageContent, 'user');

  appState.pendingAttachments = [];
  renderAttachments();
  elements.input.value = '';
  autoResizeInput();
  appState.loadingChats.add(chatId);
  appState.loadingStartTimes.set(chatId, Date.now());
  updateLoadingUI();
  saveBrandChats();
  renderChatList();

  try {
    if (sanitizeMessagesInPlace(chat.messages)) saveBrandChats();

    const history = chat.messages
      .slice(0, -1)
      .slice(-CONFIG.API.MAX_HISTORY * 2);

    const reply = await routeMessage(messageContent, history, brandId);

    // El chat puede haber sido borrado o la marca cambiada
    const targetChat = appState.brands[brandId]?.chats.find(c => c.id === chatId);
    if (!targetChat) return;

    targetChat.messages.push({ role: 'assistant', content: reply });
    targetChat.updatedAt = Date.now();
    saveBrandChats(brandId);

    if (appState.activeBrandId === brandId && getBrandState().activeChatId === chatId) {
      addMessageElement(reply, 'assistant');
    } else {
      showToast(`Respuesta lista en "${truncate(targetChat.title, 28)}" ${BRANDS[brandId].emoji}`, 'success');
    }
  } catch (error) {
    const msg = resolveErrorMessage(error);
    const targetChat = appState.brands[brandId]?.chats.find(c => c.id === chatId);
    if (targetChat) {
      targetChat.messages.push({ role: 'assistant', content: msg });
      targetChat.updatedAt = Date.now();
      saveBrandChats(brandId);
    }
    if (appState.activeBrandId === brandId && getBrandState().activeChatId === chatId) {
      addMessageElement(msg, 'assistant');
    }
    showToast(msg, 'error');
  } finally {
    appState.loadingChats.delete(chatId);
    appState.loadingStartTimes.delete(chatId);
    if (appState.activeBrandId === brandId && getBrandState().activeChatId === chatId) {
      updateLoadingUI();
      elements.input.focus();
    }
    renderChatList();
  }
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// =====================================================
// API ROUTING
// =====================================================

async function routeMessage(message, history, brandId) {
  const mode = appState.mode;
  const effectiveKey = getEffectiveApiKey(brandId);
  const hasKey = !!effectiveKey;

  if (mode === CONFIG.MODES.DIRECT) {
    if (!hasKey) throw new Error('NO_KEY');
    return callAnthropicDirect(message, history, brandId);
  }
  if (mode === CONFIG.MODES.BACKEND) {
    return callBackend(message, history, brandId);
  }
  try {
    const reply = await callBackend(message, history, brandId);
    appState.backendAvailable = true;
    updateModePill();
    return reply;
  } catch (err) {
    appState.backendAvailable = false;
    if (hasKey) {
      updateModePill();
      return callAnthropicDirect(message, history, brandId);
    }
    updateModePill();
    throw new Error('NO_KEY');
  }
}

async function callBackend(message, history, brandId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT_MS);

  // Para marcas custom: enviar el system prompt generado al backend
  const customPrompt = appState.customBrands[brandId]
    ? generateSystemPromptForCustom(appState.customBrands[brandId])
    : null;

  try {
    const response = await fetch(CONFIG.API.BACKEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        brand: brandId,
        systemPromptOverride: customPrompt
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`BACKEND ${response.status}: ${errorBody || response.statusText}`);
    }
    const data = await response.json();
    if (!data.reply) throw new Error('Respuesta vacía del backend');
    return data.reply;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('TIMEOUT');
    throw err;
  }
}

async function callAnthropicDirect(message, history, brandId) {
  const messages = [...history, { role: 'user', content: message }];
  // Para marcas custom: genera el system prompt dinámicamente desde el objeto brand
  let systemPrompt;
  if (appState.customBrands[brandId]) {
    systemPrompt = generateSystemPromptForCustom(appState.customBrands[brandId]);
  } else {
    systemPrompt = SYSTEM_PROMPTS[brandId] || SYSTEM_PROMPTS.acuarella;
  }

  // Usar la API key específica de la marca, o la global como fallback
  const apiKey = getEffectiveApiKey(brandId);
  if (!apiKey) throw new Error('NO_KEY');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT_MS);

  try {
    const response = await fetch(CONFIG.API.ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': CONFIG.API.ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CONFIG.API.MODEL,
        max_tokens: CONFIG.API.MAX_TOKENS,
        system: systemPrompt,
        messages,
        tools: [
          { type: 'web_search_20250305', name: 'web_search', max_uses: CONFIG.API.WEB_SEARCH_MAX_USES }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401 || response.status === 403) throw new Error('BAD_KEY');
      let detail = body || response.statusText;
      try {
        const parsed = JSON.parse(body);
        if (parsed.error && parsed.error.message) detail = parsed.error.message;
      } catch (_) {}
      throw new Error(`ANTHROPIC ${response.status}: ${detail}`);
    }

    const data = await response.json();
    const text = extractText(data);
    if (!text) throw new Error('Respuesta vacía de Anthropic');
    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('TIMEOUT');
    throw err;
  }
}

function extractText(data) {
  if (!data || !Array.isArray(data.content)) return null;
  return data.content
    .filter(b => b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('\n')
    .trim();
}

function resolveErrorMessage(error) {
  const msg = (error && error.message) || '';
  if (msg === 'TIMEOUT') return CONFIG.MESSAGES.ERROR_TIMEOUT;
  if (msg === 'NO_KEY') return CONFIG.MESSAGES.ERROR_NO_KEY;
  if (msg === 'BAD_KEY') return CONFIG.MESSAGES.ERROR_BAD_KEY;

  const lower = msg.toLowerCase();
  const isImageError = lower.includes('image') || lower.includes('media') || lower.includes('source');
  if (isImageError && (msg.startsWith('ANTHROPIC') || msg.startsWith('BACKEND'))) {
    return `📷 La API rechazó un archivo:\n\n${msg}\n\n💡 Tip: crea un **nuevo chat** y vuelve a intentar.`;
  }
  if (msg.startsWith('BACKEND ') || msg.startsWith('ANTHROPIC ')) {
    return `${CONFIG.MESSAGES.ERROR_GENERIC}\n\n${msg}`;
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return CONFIG.MESSAGES.ERROR_NETWORK;
  }
  return CONFIG.MESSAGES.ERROR_GENERIC;
}

// =====================================================
// RENDER DE MENSAJES INDIVIDUALES
// =====================================================

function addMessageElement(content, role) {
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${role}`;
  const avatarContent = role === 'user'
    ? 'Tú'
    : `<svg class="avatar-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
         <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
       </svg>`;
  messageEl.innerHTML = `
    <div class="message-avatar" aria-hidden="true">${avatarContent}</div>
    <div class="message-bubble">${renderContent(content)}</div>
  `;
  elements.messages.appendChild(messageEl);
  scrollToBottom();
}

function renderContent(content) {
  if (typeof content === 'string') return formatMessage(content);
  if (!Array.isArray(content)) return '';

  const parts = [];
  const attachmentParts = [];
  for (const block of content) {
    if (block.type === 'text') {
      const match = block.text.match(/^\[Archivo adjunto:\s*([^\]]+)\]/);
      if (match) {
        attachmentParts.push(`<div class="message-doc">📝 <span>${escapeHtml(match[1])}</span></div>`);
      } else {
        parts.push(formatMessage(block.text));
      }
    } else if (block.type === 'image' && block.source) {
      const src = `data:${block.source.media_type};base64,${block.source.data}`;
      attachmentParts.push(`<img src="${src}" alt="Imagen adjunta" class="message-image" />`);
    } else if (block.type === 'document') {
      attachmentParts.push(`<div class="message-doc">📄 <span>Documento PDF adjunto</span></div>`);
    }
  }
  const attachmentsHtml = attachmentParts.length
    ? `<div class="message-attachments">${attachmentParts.join('')}</div>`
    : '';
  return attachmentsHtml + parts.join('\n');
}

function formatMessage(text) {
  const safe = escapeHtml(text);
  const lines = safe.split('\n');
  const out = [];
  let inList = false;
  let listType = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { out.push(`</${listType}>`); inList = false; listType = null; }
      out.push('');
      continue;
    }
    const h2 = line.match(/^##\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    if (h3) {
      if (inList) { out.push(`</${listType}>`); inList = false; }
      out.push(`<h3>${inlineFormat(h3[1])}</h3>`);
      continue;
    }
    if (h2) {
      if (inList) { out.push(`</${listType}>`); inList = false; }
      out.push(`<h2>${inlineFormat(h2[1])}</h2>`);
      continue;
    }
    if (/^\d+[\.\)]\s+/.test(line)) {
      if (!inList || listType !== 'ol') {
        if (inList) out.push(`</${listType}>`);
        out.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      out.push(`<li>${inlineFormat(line.replace(/^\d+[\.\)]\s+/, ''))}</li>`);
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      if (!inList || listType !== 'ul') {
        if (inList) out.push(`</${listType}>`);
        out.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      out.push(`<li>${inlineFormat(line.replace(/^[-*•]\s+/, ''))}</li>`);
      continue;
    }
    if (inList) { out.push(`</${listType}>`); inList = false; listType = null; }
    out.push(`<p>${inlineFormat(line)}</p>`);
  }
  if (inList) out.push(`</${listType}>`);
  return out.join('\n');
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    elements.messages.scrollTo({
      top: elements.messages.scrollHeight,
      behavior: CONFIG.UI.SCROLL_BEHAVIOR
    });
  });
}

// =====================================================
// LOADING / TOAST
// =====================================================

function updateLoadingUI() {
  const loading = isActiveChatLoading();
  elements.loading.hidden = !loading;
  elements.sendBtn.disabled = loading;
  elements.input.disabled = loading;

  // Manejar el temporizador
  if (loading) {
    refreshLoadingTimer();
    // Arrancar interval si no está corriendo
    if (!appState.loadingTimerInterval) {
      appState.loadingTimerInterval = setInterval(refreshLoadingTimer, 1000);
    }
    scrollToBottom();
  } else {
    // Si ya no hay ningún chat cargando, parar el interval globalmente
    if (appState.loadingChats.size === 0 && appState.loadingTimerInterval) {
      clearInterval(appState.loadingTimerInterval);
      appState.loadingTimerInterval = null;
    }
  }
}

function refreshLoadingTimer() {
  const chatId = getBrandState().activeChatId;
  const startTime = appState.loadingStartTimes.get(chatId);
  if (!startTime) {
    elements.loadingTime.textContent = '';
    elements.loadingHint.textContent = '';
    return;
  }
  const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
  elements.loadingTime.textContent = formatElapsedTime(elapsedSec);
  elements.loadingHint.textContent = getLoadingHint(elapsedSec);
}

function formatElapsedTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function getLoadingHint(elapsedSec) {
  if (elapsedSec < 5) return '';
  if (elapsedSec < 15) return 'Procesando tu mensaje…';
  if (elapsedSec < 30) return 'Buscando en la web…';
  if (elapsedSec < 60) return 'Verificando datos…';
  return 'Tomando más de lo normal, casi listo…';
}

let toastTimer = null;
function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast toast-${type}`;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, CONFIG.UI.TOAST_DURATION);
}

// =====================================================
// QUICK ACTIONS / TENDENCIAS
// =====================================================

function quickAction(actionKey) {
  if (isActiveChatLoading()) {
    showToast('Este chat ya está pensando. Crea un nuevo chat o espera.', 'info');
    return;
  }
  const action = getActiveBrand().quickActions.find(a => a.key === actionKey);
  if (!action) return;
  sendMessage(action.prompt);
}

function discoverTrends() {
  if (isActiveChatLoading()) {
    showToast('Este chat ya está pensando. Crea un nuevo chat o espera.', 'info');
    return;
  }
  const scope = elements.trendScope.value;
  const config = getActiveBrand().trendsDiscovery[scope];
  if (!config) return;
  sendMessage(config.prompt);
}

// =====================================================
// MODE PILL
// =====================================================

function updateModePill() {
  let label = '';
  let cls = '';
  const effectiveKey = getEffectiveApiKey();
  const usingBrandKey = appState.customBrands[appState.activeBrandId]
    && appState.customBrands[appState.activeBrandId].apiKey;
  const keySuffix = usingBrandKey ? ' · key propia' : '';

  if (appState.mode === CONFIG.MODES.DIRECT) {
    label = effectiveKey ? `Modo: Directo${keySuffix}` : 'Sin API key';
    cls = effectiveKey ? 'mode-direct' : '';
  } else if (appState.mode === CONFIG.MODES.BACKEND) {
    label = 'Modo: Backend';
    cls = 'mode-backend';
  } else {
    if (appState.backendAvailable === true) { label = 'Auto · Backend'; cls = 'mode-backend'; }
    else if (appState.backendAvailable === false && effectiveKey) { label = `Auto · Directo${keySuffix}`; cls = 'mode-direct'; }
    else if (effectiveKey) { label = `Auto · Listo${keySuffix}`; cls = 'mode-ready'; }
    else { label = 'Sin API key'; cls = ''; }
  }
  elements.modePill.textContent = label;
  elements.modePill.className = `mode-pill ${cls}`.trim();
}

// =====================================================
// SETTINGS MODAL
// =====================================================

function openSettings() {
  elements.modeSelect.value = appState.mode;
  const themeRadio = document.querySelector(`input[name="theme"][value="${appState.theme}"]`);
  if (themeRadio) themeRadio.checked = true;
  elements.apiKeyInput.value = '';
  elements.apiKeyInput.type = 'password';
  renderKeyStatus();
  elements.settingsModal.hidden = false;
  setTimeout(() => {
    if (appState.apiKey) elements.modeSelect.focus();
    else elements.apiKeyInput.focus();
  }, 50);
}

function closeSettings() {
  elements.settingsModal.hidden = true;
  elements.apiKeyInput.value = '';
  applyTheme();
}

function saveSettings() {
  appState.mode = elements.modeSelect.value;
  const themeRadio = document.querySelector('input[name="theme"]:checked');
  if (themeRadio) {
    appState.theme = themeRadio.value;
    applyTheme();
  }
  const typed = elements.apiKeyInput.value.trim();
  if (typed) appState.apiKey = typed;
  saveSettingsToStorage();
  elements.apiKeyInput.value = '';
  updateModePill();
  closeSettings();
  showToast(CONFIG.MESSAGES.SETTINGS_SAVED, 'success');
}

function removeStoredApiKey() {
  if (!appState.apiKey) return;
  if (!confirm('¿Eliminar la API key guardada?')) return;
  appState.apiKey = '';
  saveSettingsToStorage();
  renderKeyStatus();
  updateModePill();
  showToast('API key eliminada 🔒', 'success');
}

function renderKeyStatus() {
  if (!appState.apiKey) { elements.keyStatus.hidden = true; return; }
  const key = appState.apiKey;
  const masked = '••••••••••••••' + (key.length > 4 ? key.slice(-4) : '');
  elements.keyStatusText.textContent = `Guardada · ${masked}`;
  elements.keyStatus.hidden = false;
}

// =====================================================
// SIDEBAR TOGGLE
// =====================================================

function applySidebarState() {
  const collapsed = localStorage.getItem(CONFIG.STORAGE.SIDEBAR_COLLAPSED) === 'true';
  elements.app.classList.toggle('sidebar-collapsed', collapsed);
}

function toggleSidebar() {
  const isCollapsed = elements.app.classList.toggle('sidebar-collapsed');
  localStorage.setItem(CONFIG.STORAGE.SIDEBAR_COLLAPSED, isCollapsed ? 'true' : 'false');
}

// =====================================================
// TEXTAREA AUTO-RESIZE
// =====================================================

function autoResizeInput() {
  elements.input.style.height = 'auto';
  const newHeight = Math.min(elements.input.scrollHeight, CONFIG.UI.MAX_INPUT_HEIGHT);
  elements.input.style.height = `${newHeight}px`;
}

// =====================================================
// ATTACHMENTS
// =====================================================

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const SUPPORTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const IMAGE_MAX = 5 * 1024 * 1024;
const PDF_MAX = 32 * 1024 * 1024;
const TEXT_MAX = 2 * 1024 * 1024;
const TEXT_EXTS = [
  'txt', 'md', 'markdown', 'rtf', 'log', 'csv', 'tsv',
  'json', 'jsonl', 'xml', 'yaml', 'yml', 'toml', 'ini', 'env', 'conf',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'rb', 'php', 'java', 'kt', 'swift', 'go', 'rs', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
  'sql', 'graphql', 'gql', 'proto'
];

async function handleFileSelection(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) await processAttachment(file);
  event.target.value = '';
  renderAttachments();
}

async function processAttachment(file) {
  const id = 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mime = file.type || '';

  const isImage = mime.startsWith('image/') || IMAGE_EXTS.includes(ext);
  if (isImage) {
    if (file.size > IMAGE_MAX) {
      showToast(`"${file.name}" pesa más de 5 MB. Comprime o reduce tamaño.`, 'error');
      return;
    }
    const realFormat = await detectImageFormat(file);
    const claimedMime = normalizeImageMime(mime, ext);

    if (!realFormat) {
      showToast(`No pude reconocer "${file.name}". Convierte a JPG/PNG/GIF/WebP.`, 'error');
      return;
    }
    if (!SUPPORTED_IMAGE_MIMES.includes(realFormat)) {
      showToast(`"${file.name}" es "${realFormat}", no soportado. Usa JPG/PNG/GIF/WebP.`, 'error');
      return;
    }
    if (claimedMime && claimedMime !== realFormat) {
      showToast(`"${file.name}" se subirá como ${realFormat.split('/')[1]} (formato real).`, 'info');
    }

    const data = await fileToBase64(file);
    appState.pendingAttachments.push({
      id, name: file.name, size: file.size, kind: 'image', mediaType: realFormat, data
    });
    return;
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    if (file.size > PDF_MAX) {
      showToast(`"${file.name}" supera 32 MB.`, 'error');
      return;
    }
    const data = await fileToBase64(file);
    appState.pendingAttachments.push({
      id, name: file.name, size: file.size, kind: 'document',
      mediaType: 'application/pdf', data
    });
    return;
  }

  const isTextMime = mime.startsWith('text/') ||
                     mime === 'application/json' ||
                     mime === 'application/xml' ||
                     mime === 'application/javascript';
  if (isTextMime || TEXT_EXTS.includes(ext)) {
    if (file.size > TEXT_MAX) {
      showToast(`"${file.name}" pesa más de 2 MB.`, 'error');
      return;
    }
    const text = await file.text();
    appState.pendingAttachments.push({
      id, name: file.name, size: file.size, kind: 'text', text
    });
    return;
  }

  try {
    const text = await file.text();
    if (text && isReadableText(text)) {
      appState.pendingAttachments.push({
        id, name: file.name, size: file.size, kind: 'text', text
      });
      showToast(`"${file.name}" leído como texto plano.`, 'info');
      return;
    }
  } catch (err) {}

  showToast(`No puedo leer "${file.name}". Conviértelo a PDF/imagen/texto.`, 'error');
}

function isReadableText(text) {
  if (!text) return false;
  const sample = text.slice(0, 2000);
  let weird = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32)) weird++;
  }
  return (weird / sample.length) < 0.3;
}

function normalizeImageMime(mime, ext) {
  if (mime === 'image/jpg' || mime === 'image/pjpeg') return 'image/jpeg';
  if (mime && mime.startsWith('image/')) return mime;
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return map[ext] || '';
}

async function detectImageFormat(file) {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    return detectImageFormatFromBytes(new Uint8Array(buffer));
  } catch (err) { return null; }
}

function detectImageFormatFromBase64(base64) {
  try {
    const head = base64.slice(0, 24);
    const binary = atob(head);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return detectImageFormatFromBytes(bytes);
  } catch (err) { return null; }
}

function detectImageFormatFromBytes(b) {
  if (!b || b.length < 4) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

function sanitizeMessagesInPlace(messages) {
  let changed = false;
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue;
    const filtered = [];
    for (const block of msg.content) {
      if (block.type === 'image' && block.source && block.source.type === 'base64') {
        const realMime = detectImageFormatFromBase64(block.source.data || '');
        if (!realMime || !SUPPORTED_IMAGE_MIMES.includes(realMime)) { changed = true; continue; }
        if (block.source.media_type !== realMime) {
          block.source.media_type = realMime;
          changed = true;
        }
      }
      filtered.push(block);
    }
    if (filtered.length !== msg.content.length) msg.content = filtered;
  }
  return changed;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderAttachments() {
  if (appState.pendingAttachments.length === 0) {
    elements.attachmentsList.hidden = true;
    elements.attachmentsList.innerHTML = '';
    return;
  }
  elements.attachmentsList.hidden = false;
  elements.attachmentsList.innerHTML = appState.pendingAttachments.map(att => {
    const icon = att.kind === 'image' ? '🖼' : att.kind === 'document' ? '📄' : '📝';
    return `
      <div class="attachment-chip" data-id="${att.id}">
        <span class="attachment-icon">${icon}</span>
        <span class="attachment-name" title="${escapeHtml(att.name)}">${escapeHtml(att.name)}</span>
        <span class="attachment-size">${formatBytes(att.size)}</span>
        <button type="button" class="attachment-remove" data-id="${att.id}" aria-label="Quitar">×</button>
      </div>
    `;
  }).join('');
  elements.attachmentsList.querySelectorAll('.attachment-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      appState.pendingAttachments = appState.pendingAttachments.filter(a => a.id !== id);
      renderAttachments();
    });
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function attachmentsToContent(attachments) {
  const blocks = [];
  for (const att of attachments) {
    if (att.kind === 'image') {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: att.mediaType, data: att.data } });
    } else if (att.kind === 'document') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: att.mediaType, data: att.data } });
    } else if (att.kind === 'text') {
      blocks.push({ type: 'text', text: `[Archivo adjunto: ${att.name}]\n\`\`\`\n${att.text}\n\`\`\`` });
    }
  }
  return blocks;
}

// =====================================================
// BOOTSTRAP
// =====================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
