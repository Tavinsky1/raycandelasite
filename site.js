const STORAGE_KEY = 'ray-candela-site-data-v3';
const ADMIN_SESSION_KEY = 'ray-candela-admin-unlocked';
const ADMIN_PASSWORD = 'colegiala';

const DEFAULT_IMAGE_FILES = [
  'Ray_Candela_Portrait-5.jpg',
  'Ray_Candela_Portrait-6.jpg',
  'Ray_Candela_Portrait-12.jpg',
  'Ray_Candela_Portrait-15.jpg',
  'Ray_Candela_Portrait-21.jpg',
  'Ray_Candela_Portrait-25.jpg',
  'Ray_Candela_Portrait-27.jpg',
  'Ray_Candela_Portrait-33.jpg',
  'Ray_Candela_Portrait-34.jpg',
  'Ray_Candela_Portrait-35.jpg',
  'Ray_Candela_Portrait-37.jpg',
  'Ray_Candela_Portrait-39.jpg',
  'Ray_Candela_Portrait-41.jpg',
  'Ray_Candela_Portrait-44.jpg',
  'Ray_Candela_Portrait-48.jpg',
  'Ray_Candela_Portrait-49.jpg',
  'Ray_Candela_Portrait-55.jpg',
  'Ray_Candela_Portrait-58.jpg',
  'Ray_Candela_Portrait-61.jpg',
  'Ray_Candela_Portrait-63.jpg',
  'Ray_Candela_Portrait-69.jpg',
  'Ray_Candela_Portrait-73.jpg',
  'Ray_Candela_Portrait-75.jpg',
  'Ray_Candela_Portrait-76.jpg',
  'Ray_Candela_Portrait-77.jpg'
];

const WIDE_IMAGES = new Set([
  'Ray_Candela_Portrait-21.jpg',
  'Ray_Candela_Portrait-25.jpg',
  'Ray_Candela_Portrait-27.jpg',
  'Ray_Candela_Portrait-49.jpg'
]);

const DEFAULT_SITE_DATA = {
  galleryImages: DEFAULT_IMAGE_FILES.map((fileName, index) => ({
    id: `default-${index + 1}`,
    src: `pictures/${fileName}`,
    alt: `Ray Candela promo photo ${String(index + 1).padStart(2, '0')}`,
    shape: WIDE_IMAGES.has(fileName) ? 'wide' : 'portrait'
  })),
  music: {
    spotify: '',
    soundcloud: '',
    youtube: '',
    apple: '',
    embed: ''
  },
  shows: [],
  socials: {
    instagramUrl: '',
    instagramHandle: '@raycandela',
    facebookUrl: '',
    facebookHandle: 'Ray Candela',
    tiktokUrl: '',
    tiktokHandle: '@raycandela'
  }
};

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function uniqueId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeUrl(rawValue = '') {
  const value = String(rawValue).trim();
  if (!value) return '';

  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

function coerceShowDate(value) {
  if (!value) return '';
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : value;
}

function mergeData(saved) {
  const defaults = cloneData(DEFAULT_SITE_DATA);
  if (!saved || typeof saved !== 'object') {
    return defaults;
  }

  return {
    galleryImages: Array.isArray(saved.galleryImages)
      ? saved.galleryImages.filter((image) => image && typeof image.src === 'string')
      : defaults.galleryImages,
    music: {
      ...defaults.music,
      ...(saved.music || {})
    },
    shows: Array.isArray(saved.shows)
      ? saved.shows.filter((show) => show && show.id)
      : defaults.shows,
    socials: {
      ...defaults.socials,
      ...(saved.socials || {})
    }
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return mergeData(saved);
  } catch {
    return cloneData(DEFAULT_SITE_DATA);
  }
}

const state = loadState();

function persistState() {
  const payload = {
    galleryImages: state.galleryImages,
    music: state.music,
    shows: state.shows,
    socials: state.socials
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function setState(nextState) {
  state.galleryImages = nextState.galleryImages;
  state.music = nextState.music;
  state.shows = nextState.shows;
  state.socials = nextState.socials;
}

function showAdminStatus(message, tone = 'neutral') {
  const status = document.getElementById('admin-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function clearAdminStatus() {
  showAdminStatus('');
}

function parseEmbedInput(rawValue = '') {
  const value = String(rawValue).trim();
  if (!value) return '';

  const iframeMatch = value.match(/src=["']([^"']+)["']/i);
  const candidate = iframeMatch ? iframeMatch[1] : value;
  const normalized = normalizeUrl(candidate);
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'open.spotify.com') {
      if (!url.pathname.startsWith('/embed/')) {
        url.pathname = `/embed${url.pathname}`;
      }
      return url.toString();
    }

    if (host === 'youtu.be') {
      const videoId = url.pathname.replace(/^\//, '');
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.toString();
      }
      if (url.pathname.startsWith('/shorts/')) {
        const shortId = url.pathname.split('/')[2];
        return shortId ? `https://www.youtube-nocookie.com/embed/${shortId}` : '';
      }
    }

    if (host === 'youtube-nocookie.com') {
      return url.toString();
    }

    if (host === 'soundcloud.com') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}&color=%23ff2d20&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&visual=true`;
    }

    if (host === 'w.soundcloud.com') {
      return url.toString();
    }

    if (host === 'music.apple.com' || host === 'embed.music.apple.com') {
      return url.toString();
    }

    return url.toString();
  } catch {
    return '';
  }
}

function formatShowParts(dateValue) {
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { day: '??', month: 'TBA', year: '' };
  }

  return {
    day: String(parsed.getDate()).padStart(2, '0'),
    month: parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    year: String(parsed.getFullYear())
  };
}

function sortedShows() {
  return [...state.shows].sort((a, b) => {
    const dateA = new Date(`${a.date || '9999-12-31'}T12:00:00`).getTime();
    const dateB = new Date(`${b.date || '9999-12-31'}T12:00:00`).getTime();
    return dateA - dateB;
  });
}

function renderGallery() {
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryCount = document.getElementById('gallery-count');
  if (!galleryGrid || !galleryCount) return;

  galleryCount.textContent = `${state.galleryImages.length} photos`;

  galleryGrid.innerHTML = state.galleryImages.map((image, index) => {
    const classes = ['gallery-card'];
    if (image.shape === 'wide') {
      classes.push('gallery-card--wide');
    }

    return `
      <article class="${classes.join(' ')}" role="listitem">
        <span class="gallery-card__index">${String(index + 1).padStart(2, '0')}</span>
        <img class="gallery-card__image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || `Ray Candela photo ${index + 1}`)}" loading="lazy">
      </article>
    `;
  }).join('');
}

function renderMusic() {
  const platformsEl = document.getElementById('music-platforms');
  const embedShell = document.getElementById('music-embed-shell');
  if (!platformsEl || !embedShell) return;

  const platforms = [
    { key: 'spotify', label: 'Spotify' },
    { key: 'soundcloud', label: 'SoundCloud' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'apple', label: 'Apple Music' }
  ];

  platformsEl.innerHTML = platforms.map((platform) => {
    const url = normalizeUrl(state.music[platform.key]);
    if (url) {
      return `
        <a href="${escapeHtml(url)}" class="platform-link" target="_blank" rel="noopener noreferrer">
          <span>${platform.label}</span>
          <span class="arrow">↗</span>
        </a>
      `;
    }

    return `
      <div class="platform-link soon" aria-disabled="true">
        <span>${platform.label}</span>
        <span class="arrow" style="font-size:0.65rem; letter-spacing:0.15em; text-transform:uppercase; opacity:0.5;">Soon</span>
      </div>
    `;
  }).join('');

  const embedSrc = parseEmbedInput(state.music.embed);
  if (embedSrc) {
    embedShell.innerHTML = `
      <div class="music-embed-shell">
        <iframe
          class="music-embed-frame"
          src="${escapeHtml(embedSrc)}"
          title="Ray Candela featured player"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
    `;
    return;
  }

  embedShell.innerHTML = `
    <div class="music-placeholder">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="opacity:0.2;">
        <circle cx="12" cy="12" r="10" stroke="#F7F0E8" stroke-width="1.5"></circle>
        <polygon points="10,8 16,12 10,16" fill="#F7F0E8" opacity="0.6"></polygon>
      </svg>
      <p>Music embed coming soon</p>
    </div>
  `;
}

function renderShows() {
  const showsBoard = document.getElementById('shows-board');
  if (!showsBoard) return;

  const shows = sortedShows();

  if (!shows.length) {
    showsBoard.innerHTML = `
      <div class="show-card show-card--empty">
        <p>No shows announced yet. Follow us on Instagram for updates.</p>
        <a href="#contact" class="btn btn-red btn-pill" style="margin-top: var(--space-6); font-size:0.82rem; align-self:flex-start;">
          Booking Enquiries →
        </a>
      </div>
    `;
    return;
  }

  showsBoard.innerHTML = shows.map((show) => {
    const parts = formatShowParts(show.date);
    const ticketUrl = normalizeUrl(show.ticketUrl);

    return `
      <article class="show-card">
        <div class="show-card__date">
          <div class="show-card__day">${parts.day}</div>
          <div class="show-card__month-group">
            <div class="show-card__month">${parts.month}</div>
            <div class="show-card__year">${parts.year}</div>
          </div>
        </div>
        <h3 class="show-card__venue">${escapeHtml(show.venue || 'Venue TBA')}</h3>
        <p class="show-card__city">${escapeHtml(show.city || 'City TBA')}${show.time ? ` · ${escapeHtml(show.time)}` : ''}</p>
        ${ticketUrl ? `<a href="${escapeHtml(ticketUrl)}" class="btn btn-outline btn-pill show-card__ticket" target="_blank" rel="noopener noreferrer">Tickets ↗</a>` : '<span class="show-card__ticket-note">More info soon</span>'}
      </article>
    `;
  }).join('');
}

function renderSocials() {
  const socialLinks = document.getElementById('social-links');
  if (!socialLinks) return;

  const socials = [
    {
      label: 'Instagram',
      handle: state.socials.instagramHandle || '@raycandela',
      url: normalizeUrl(state.socials.instagramUrl)
    },
    {
      label: 'Facebook',
      handle: state.socials.facebookHandle || 'Ray Candela',
      url: normalizeUrl(state.socials.facebookUrl)
    },
    {
      label: 'TikTok',
      handle: state.socials.tiktokHandle || '@raycandela',
      url: normalizeUrl(state.socials.tiktokUrl)
    }
  ];

  socialLinks.innerHTML = socials.map((social) => {
    if (social.url) {
      return `
        <a href="${escapeHtml(social.url)}" class="social-row" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(social.label)}">
          <span class="platform-name">${escapeHtml(social.label)}</span>
          <span class="handle">${escapeHtml(social.handle)} ↗</span>
        </a>
      `;
    }

    return `
      <div class="social-row social-row--off" aria-disabled="true">
        <span class="platform-name">${escapeHtml(social.label)}</span>
        <span class="handle">${escapeHtml(social.handle)}</span>
      </div>
    `;
  }).join('');
}

function renderAdminLists() {
  const adminGalleryList = document.getElementById('admin-gallery-list');
  const adminShowsList = document.getElementById('admin-shows-list');
  const adminGalleryCount = document.getElementById('admin-gallery-count');
  if (!adminGalleryList || !adminShowsList || !adminGalleryCount) return;

  adminGalleryCount.textContent = `${state.galleryImages.length} in gallery`;

  adminGalleryList.innerHTML = state.galleryImages.length
    ? state.galleryImages.map((image, index) => `
        <article class="admin-item">
          <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || `Photo ${index + 1}`)}">
          <div class="admin-item__meta">
            <strong>${String(index + 1).padStart(2, '0')} · ${escapeHtml(image.alt || 'Untitled image')}</strong>
            <span>${escapeHtml(image.src.startsWith('data:') ? 'Uploaded in this browser' : image.src)}</span>
          </div>
          <button class="admin-remove" type="button" data-remove-image="${escapeHtml(image.id)}">Remove</button>
        </article>
      `).join('')
    : '<p class="admin-empty">No images in the gallery yet.</p>';

  const shows = sortedShows();
  adminShowsList.innerHTML = shows.length
    ? shows.map((show) => `
        <article class="admin-item admin-item--text">
          <div class="admin-item__meta">
            <strong>${escapeHtml(show.venue || 'Venue TBA')}</strong>
            <span>${escapeHtml(show.date || 'Date TBA')} · ${escapeHtml(show.city || 'City TBA')}${show.time ? ` · ${escapeHtml(show.time)}` : ''}</span>
          </div>
          <button class="admin-remove" type="button" data-remove-show="${escapeHtml(show.id)}">Remove</button>
        </article>
      `).join('')
    : '<p class="admin-empty">No upcoming shows saved yet.</p>';

  const musicForm = document.getElementById('admin-music-form');
  if (musicForm) {
    musicForm.spotify.value = state.music.spotify || '';
    musicForm.soundcloud.value = state.music.soundcloud || '';
    musicForm.youtube.value = state.music.youtube || '';
    musicForm.apple.value = state.music.apple || '';
    musicForm.embed.value = state.music.embed || '';
  }

  const socialsForm = document.getElementById('admin-socials-form');
  if (socialsForm) {
    socialsForm.instagramUrl.value = state.socials.instagramUrl || '';
    socialsForm.instagramHandle.value = state.socials.instagramHandle || '@raycandela';
    socialsForm.facebookUrl.value = state.socials.facebookUrl || '';
    socialsForm.facebookHandle.value = state.socials.facebookHandle || 'Ray Candela';
    socialsForm.tiktokUrl.value = state.socials.tiktokUrl || '';
    socialsForm.tiktokHandle.value = state.socials.tiktokHandle || '@raycandela';
  }
}

function renderAll() {
  renderGallery();
  renderMusic();
  renderShows();
  renderSocials();
  renderAdminLists();
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function setupFadeIn() {
  const fadeItems = document.querySelectorAll('.fi');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  fadeItems.forEach((item) => observer.observe(item));

  window.addEventListener('load', () => {
    document.querySelectorAll('.hero .fi').forEach((item, index) => {
      setTimeout(() => item.classList.add('show'), index * 130);
    });
  });
}

function setupBookingForm() {
  const form = document.getElementById('booking-form');
  const success = document.getElementById('form-success');
  if (!form || !success) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    button.textContent = 'Sending...';
    button.disabled = true;

    setTimeout(() => {
      form.style.display = 'none';
      success.style.display = 'block';
    }, 900);
  });
}

function setupAdminPanel() {
  const adminToggle = document.getElementById('admin-toggle');
  const adminPanel = document.getElementById('admin-panel');
  const adminClose = document.getElementById('admin-close');
  const adminLock = document.getElementById('admin-lock');
  const adminContent = document.getElementById('admin-content');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminPasswordField = document.getElementById('admin-password');
  const adminMusicForm = document.getElementById('admin-music-form');
  const adminGalleryUrlForm = document.getElementById('admin-gallery-url-form');
  const adminGalleryUploadForm = document.getElementById('admin-gallery-upload-form');
  const adminShowsForm = document.getElementById('admin-shows-form');
  const adminSocialsForm = document.getElementById('admin-socials-form');
  const adminReset = document.getElementById('admin-reset');
  const adminLockButton = document.getElementById('admin-lock-button');

  if (!adminToggle || !adminPanel || !adminClose || !adminLock || !adminContent || !adminLoginForm) {
    return;
  }

  function setUnlocked(unlocked) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, unlocked ? '1' : '0');
    adminLock.hidden = unlocked;
    adminContent.hidden = !unlocked;
    if (unlocked) {
      clearAdminStatus();
      renderAdminLists();
    }
  }

  function openAdmin() {
    adminPanel.hidden = false;
    document.body.classList.add('admin-open');
    adminToggle.setAttribute('aria-expanded', 'true');
    adminPanel.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => adminPanel.classList.add('is-open'));
  }

  function closeAdmin() {
    adminPanel.classList.remove('is-open');
    document.body.classList.remove('admin-open');
    adminToggle.setAttribute('aria-expanded', 'false');
    adminPanel.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (!adminPanel.classList.contains('is-open')) {
        adminPanel.hidden = true;
      }
    }, 220);
  }

  adminToggle.addEventListener('click', openAdmin);
  adminClose.addEventListener('click', closeAdmin);
  adminPanel.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close-admin')) {
      closeAdmin();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !adminPanel.hidden) {
      closeAdmin();
    }
  });

  adminLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (adminPasswordField.value === ADMIN_PASSWORD) {
      adminPasswordField.value = '';
      setUnlocked(true);
      showAdminStatus('Admin unlocked on this browser.', 'success');
      return;
    }

    showAdminStatus('Wrong password. Try again.', 'error');
  });

  adminGalleryUrlForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(adminGalleryUrlForm);
    const src = normalizeUrl(formData.get('imageUrl'));
    const alt = String(formData.get('imageAlt') || '').trim() || `Ray Candela added photo ${state.galleryImages.length + 1}`;

    if (!src) {
      showAdminStatus('Add a valid image URL first.', 'error');
      return;
    }

    const nextState = cloneData(state);
    nextState.galleryImages.push({
      id: uniqueId('gallery'),
      src,
      alt,
      shape: 'portrait'
    });

    try {
      setState(nextState);
      persistState();
      adminGalleryUrlForm.reset();
      renderAll();
      showAdminStatus('Image added from URL.', 'success');
    } catch (error) {
      showAdminStatus('Could not save that image in this browser.', 'error');
      console.error(error);
    }
  });

  adminGalleryUploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById('admin-image-files');
    const files = fileInput ? [...fileInput.files] : [];
    if (!files.length) {
      showAdminStatus('Choose one or more images first.', 'error');
      return;
    }

    const currentSnapshot = cloneData(state);

    try {
      const uploads = await Promise.all(files.map(fileToCompressedImage));
      const nextState = cloneData(state);
      uploads.forEach((upload, index) => {
        nextState.galleryImages.push({
          id: uniqueId('gallery'),
          src: upload.src,
          alt: upload.alt || `Ray Candela uploaded photo ${state.galleryImages.length + index + 1}`,
          shape: upload.shape
        });
      });
      setState(nextState);
      persistState();
      adminGalleryUploadForm.reset();
      renderAll();
      showAdminStatus(`${uploads.length} image${uploads.length > 1 ? 's' : ''} added in this browser.`, 'success');
    } catch (error) {
      setState(currentSnapshot);
      showAdminStatus('Image upload was too large for browser storage. Try fewer or smaller files.', 'error');
      console.error(error);
    }
  });

  document.getElementById('admin-gallery-list').addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-image]');
    if (!removeButton) return;

    const imageId = removeButton.getAttribute('data-remove-image');
    const nextState = cloneData(state);
    nextState.galleryImages = nextState.galleryImages.filter((image) => image.id !== imageId);

    setState(nextState);
    persistState();
    renderAll();
    showAdminStatus('Image removed from this browser view.', 'success');
  });

  adminMusicForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(adminMusicForm);

    const nextState = cloneData(state);
    nextState.music = {
      spotify: normalizeUrl(formData.get('spotify')),
      soundcloud: normalizeUrl(formData.get('soundcloud')),
      youtube: normalizeUrl(formData.get('youtube')),
      apple: normalizeUrl(formData.get('apple')),
      embed: String(formData.get('embed') || '').trim()
    };

    setState(nextState);
    persistState();
    renderAll();
    showAdminStatus('Music links updated.', 'success');
  });

  adminShowsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(adminShowsForm);

    const date = coerceShowDate(formData.get('showDate'));
    const venue = String(formData.get('showVenue') || '').trim();
    const city = String(formData.get('showCity') || '').trim();
    const time = String(formData.get('showTime') || '').trim();
    const ticketUrl = normalizeUrl(formData.get('showTicket'));

    if (!date || !venue || !city) {
      showAdminStatus('A show needs at least a date, venue, and city.', 'error');
      return;
    }

    const nextState = cloneData(state);
    nextState.shows.push({
      id: uniqueId('show'),
      date,
      venue,
      city,
      time,
      ticketUrl
    });

    setState(nextState);
    persistState();
    adminShowsForm.reset();
    renderAll();
    showAdminStatus('Show added to the board.', 'success');
  });

  document.getElementById('admin-shows-list').addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-show]');
    if (!removeButton) return;

    const showId = removeButton.getAttribute('data-remove-show');
    const nextState = cloneData(state);
    nextState.shows = nextState.shows.filter((show) => show.id !== showId);

    setState(nextState);
    persistState();
    renderAll();
    showAdminStatus('Show removed.', 'success');
  });

  adminSocialsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(adminSocialsForm);

    const nextState = cloneData(state);
    nextState.socials = {
      instagramUrl: normalizeUrl(formData.get('instagramUrl')),
      instagramHandle: String(formData.get('instagramHandle') || '').trim() || '@raycandela',
      facebookUrl: normalizeUrl(formData.get('facebookUrl')),
      facebookHandle: String(formData.get('facebookHandle') || '').trim() || 'Ray Candela',
      tiktokUrl: normalizeUrl(formData.get('tiktokUrl')),
      tiktokHandle: String(formData.get('tiktokHandle') || '').trim() || '@raycandela'
    };

    setState(nextState);
    persistState();
    renderAll();
    showAdminStatus('Social links updated.', 'success');
  });

  adminReset.addEventListener('click', () => {
    const confirmed = window.confirm('Reset all admin changes saved in this browser?');
    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    setState(cloneData(DEFAULT_SITE_DATA));
    renderAll();
    showAdminStatus('Local admin changes reset to the published default.', 'success');
  });

  adminLockButton.addEventListener('click', () => {
    setUnlocked(false);
    showAdminStatus('Admin locked.', 'neutral');
  });

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') {
    setUnlocked(true);
  } else {
    setUnlocked(false);
  }
}

function fileToCompressedImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not decode image'));
      image.onload = () => {
        const maxSize = 1800;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('No canvas context available'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        const src = canvas.toDataURL('image/jpeg', 0.84);
        resolve({
          src,
          alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          shape: width > height ? 'wide' : 'portrait'
        });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function setupCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) {
    return;
  }

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  document.documentElement.classList.add('has-custom-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let visible = false;
  let interactive = false;
  let pressed = false;

  const showCursor = () => {
    if (visible) return;
    visible = true;
    dot.classList.add('is-visible');
    ring.classList.add('is-visible');
  };

  const hideCursor = () => {
    visible = false;
    dot.classList.remove('is-visible');
    ring.classList.remove('is-visible');
  };

  const updateInteractiveState = (eventTarget) => {
    interactive = Boolean(eventTarget.closest('a, button, input, textarea, select, label, summary, .gallery-card, .admin-shell'));
    ring.classList.toggle('is-active', interactive);
  };

  document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    showCursor();
    updateInteractiveState(event.target);
  });

  document.addEventListener('mouseover', (event) => {
    updateInteractiveState(event.target);
  });

  document.addEventListener('mousedown', () => {
    pressed = true;
    ring.classList.add('is-down');
  });

  document.addEventListener('mouseup', () => {
    pressed = false;
    ring.classList.remove('is-down');
  });

  document.addEventListener('mouseleave', hideCursor);
  window.addEventListener('blur', hideCursor);

  const animate = () => {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;

    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%) scale(${pressed ? 0.88 : interactive ? 1.35 : 1})`;

    requestAnimationFrame(animate);
  };

  animate();
}

renderAll();
setupSmoothScroll();
setupFadeIn();
setupBookingForm();
setupAdminPanel();
setupCursor();
