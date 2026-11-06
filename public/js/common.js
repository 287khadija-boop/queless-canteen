/**
 * Quesless Campus - Common Client Utilities
 * Malla Reddy Engineering College for Women
 */

/**
 * Format integer paise into Indian Rupee string (e.g., 4500 -> ₹45.00)
 * @param {number} paise 
 * @returns {string}
 */
export function formatINR(paise) {
  if (typeof paise !== 'number' || isNaN(paise)) return '₹0.00';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format ISO timestamp to Asia/Kolkata date & time
 * @param {string} isoString 
 * @returns {string}
 */
export function formatKolkataTime(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/**
 * Check if the canteen is currently within operating hours (09:00 AM - 04:00 PM IST)
 * @returns {{ isOpen: boolean, message: string }}
 */
export function checkCanteenOperatingHours() {
  const now = new Date();
  const kolkataTimeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const [hours, minutes] = kolkataTimeStr.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;
  const openMinutes = 9 * 60;      // 09:00 AM
  const closeMinutes = 16 * 60;    // 04:00 PM

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  return {
    isOpen,
    message: isOpen
      ? 'Canteen is Open (9:00 AM - 4:00 PM)'
      : 'Canteen is Currently Closed (Opens 9:00 AM IST)',
  };
}

/**
 * Show a non-blocking toast notification
 * @param {string} message 
 * @param {'success'|'error'|'warning'|'info'} type 
 * @param {number} durationMs 
 */
export function showToast(message, type = 'info', durationMs = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  toast.innerHTML = `
    <span style="font-size: 1.1rem;">${icons[type] || 'ℹ️'}</span>
    <div style="flex: 1; word-break: break-word;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 250);
  }, durationMs);
}

/**
 * Return human readable HTML badge for order statuses
 * @param {string} status 
 * @returns {string}
 */
export function renderStatusBadge(status) {
  const statusMap = {
    pending_payment: { label: 'Pending Payment', cls: 'badge-warning' },
    placed:          { label: 'Order Placed',    cls: 'badge-info' },
    accepted:        { label: 'Accepted',        cls: 'badge-info' },
    preparing:       { label: 'Preparing',       cls: 'badge-warning' },
    ready:           { label: 'Ready for Pickup',cls: 'badge-success' },
    collected:       { label: 'Collected',       cls: 'badge-neutral' },
    cancelled:       { label: 'Cancelled',       cls: 'badge-danger' },
    payment_failed:  { label: 'Payment Failed',  cls: 'badge-danger' },
  };

  const meta = statusMap[status] || { label: status, cls: 'badge-neutral' };
  return `<span class="badge ${meta.cls}">${meta.label}</span>`;
}

/**
 * Generate a clean, responsive SVG data URI fallback for food dishes
 * Ensures zero broken image icons and prevents layout shift
 * @param {string} dishName
 * @returns {string} Data URI
 */
export function getFoodImageFallback(dishName = 'Food Item') {
  const cleanName = dishName.replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="#f8fafc">
    <rect width="600" height="400" fill="#f1f5f9"/>
    <circle cx="300" cy="180" r="90" fill="#e2e8f0"/>
    <path d="M250 180 Q300 120 350 180" stroke="#059669" stroke-width="8" fill="none" stroke-linecap="round"/>
    <text x="300" y="320" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="22" font-weight="600" fill="#334155" text-anchor="middle">${cleanName}</text>
    <text x="300" y="350" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">MRECW Campus Canteen</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Handle image error safely with fallback
 * @param {HTMLImageElement} imgElement
 * @param {string} dishName
 */
export function handleFoodImageError(imgElement, dishName) {
  if (imgElement && !imgElement.dataset.failed) {
    imgElement.dataset.failed = 'true';
    imgElement.src = getFoodImageFallback(dishName || imgElement.alt || 'Campus Dish');
  }
}

// Attach to window for plain vanilla JS pages
window.Quesless = {
  formatINR,
  formatKolkataTime,
  checkCanteenOperatingHours,
  showToast,
  renderStatusBadge,
  getFoodImageFallback,
  handleFoodImageError,
};
