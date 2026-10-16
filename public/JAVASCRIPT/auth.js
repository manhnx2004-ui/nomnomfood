// Gọi API cùng tên miền với trang web (chạy máy nhà hay trên hosting đều đúng)
const API = '';
const USER_KEY = 'nomnomfood_user';
const TOKEN_KEY = 'nomnomfood_token';

// =====================
// Auth helpers
// =====================
function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function clearSession() {
    try { localStorage.removeItem(USER_KEY); localStorage.removeItem(TOKEN_KEY); } catch { /* bỏ qua */ }
}

// Phiên đăng nhập cũ: còn lưu mật khẩu, hoặc chưa có token (đăng nhập trước khi có bảo mật) → đăng nhập lại
try {
    const u = JSON.parse(localStorage.getItem(USER_KEY));
    if (u && 'password' in u) { delete u.password; localStorage.setItem(USER_KEY, JSON.stringify(u)); }
    if (u && !localStorage.getItem(TOKEN_KEY)) clearSession();
} catch { /* bỏ qua dữ liệu hỏng */ }

// Tự gắn token vào mọi lời gọi API cùng tên miền; token hết hạn → về trang đăng nhập
(function patchFetch() {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        let sameOrigin = false;
        try { sameOrigin = new URL(url, location.href).origin === location.origin; } catch { /* URL lạ: không gắn token */ }
        const token = getToken();
        if (sameOrigin && token) {
            init = init || {};
            const headers = new Headers(init.headers || (typeof input !== 'string' && input.headers) || undefined);
            if (!headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
            init = { ...init, headers };
        }
        return nativeFetch(input, init).then((resp) => {
            if (resp.status === 401 && sameOrigin && token && !url.includes('/auth/login')) {
                clearSession();
                const back = encodeURIComponent(location.pathname + location.search);
                location.href = 'login.html?expired=1&redirect=' + back;
            }
            return resp;
        });
    };
})();

function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
}
function getUserId() { return getUser()?._id || null; }
function isLoggedIn() { return !!getUser() && !!getToken(); }

function logout() {
    clearSession();
    window.location.href = 'login.html';
}

function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return false;
    }
    return true;
}

// =====================
// Navbar update
// =====================
function updateNavbar() {
    const user = getUser();
    const authDiv = document.getElementById('nav-auth');
    if (!authDiv) return;

    if (user) {
        const role = user.role;
        let staffItems = '';
        if (role === 'admin') {
            staffItems = `
                <li><a class="dropdown-item" href="admin.html">
                    <i class="fa-solid fa-shield-halved me-2 text-warning"></i>Quản trị
                </a></li>
                <li><a class="dropdown-item" href="restaurant.html">
                    <i class="fa-solid fa-kitchen-set me-2" style="color:#ff6b2b"></i>Quản lý bếp
                </a></li>
                <li><hr class="dropdown-divider"></li>`;
        } else if (role === 'manager') {
            staffItems = `
                <li><a class="dropdown-item" href="restaurant.html">
                    <i class="fa-solid fa-kitchen-set me-2" style="color:#ff6b2b"></i>Quản lý bếp
                </a></li>
                <li><hr class="dropdown-divider"></li>`;
        } else if (role === 'shipper') {
            staffItems = `
                <li><a class="dropdown-item" href="shipper.html">
                    <i class="fa-solid fa-motorcycle me-2 text-info"></i>Giao hàng
                </a></li>
                <li><hr class="dropdown-divider"></li>`;
        }
        const avatarSrc = user.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(user.name || 'user')}`;
        const avatarHtml = `<span style="display:inline-block;width:26px;height:26px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,0.85);vertical-align:middle;margin-right:6px;flex-shrink:0"><img src="${avatarSrc}" style="width:100%;height:100%;object-fit:cover;display:block"></span>`;
        authDiv.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false"
                        style="white-space:nowrap">
                    ${avatarHtml}<strong>${user.name.split(' ').pop()}</strong>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 mt-1">
                    <li class="px-3 py-2 d-flex align-items-center gap-2 border-bottom mb-1">
                        <img src="${avatarSrc}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #eee">
                        <div>
                            <div class="fw-semibold" style="font-size:.9rem">${user.name}</div>
                            <div class="text-muted" style="font-size:.75rem">${user.email || ''}</div>
                        </div>
                    </li>
                    ${staffItems}
                    <li><a class="dropdown-item" href="profile.html">
                        <i class="fa-solid fa-user me-2 text-secondary"></i>Thông tin tài khoản
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button class="dropdown-item text-danger fw-semibold" onclick="logout()">
                        <i class="fa-solid fa-right-from-bracket me-2"></i>Đăng xuất
                    </button></li>
                </ul>
            </div>
        `;
    } else {
        authDiv.innerHTML = `
            <a class="btn btn-outline-light btn-sm" href="login.html">Đăng nhập</a>
            <a class="btn btn-light btn-sm text-danger fw-semibold" href="dki.html">Đăng ký</a>
        `;
    }
}

// =====================
// Cart badge
// =====================
async function updateCartBadge() {
    const userId = getUserId();
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    if (!userId) { badge.textContent = '0'; return; }
    try {
        const resp = await fetch(`${API}/cart/${userId}`);
        if (resp.ok) {
            const cart = await resp.json();
            const count = (cart.items || []).reduce((s, i) => s + i.quantity, 0);
            badge.textContent = count;
        } else {
            badge.textContent = '0';
        }
    } catch { badge.textContent = '0'; }
}

// =====================
// Add to cart (dùng ở nhiều trang)
// =====================
async function addToCart(productId, quantity = 1) {
    if (!isLoggedIn()) {
        if (confirm('Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?')) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        }
        return;
    }
    try {
        const resp = await fetch(`${API}/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: getUserId(), product: productId, quantity }),
        });
        if (resp.ok) {
            showToast('Đã thêm vào giỏ hàng!', 'success');
            updateCartBadge();
        } else {
            showToast('Không thể thêm vào giỏ hàng', 'danger');
        }
    } catch {
        showToast('Lỗi kết nối server', 'danger');
    }
}

// =====================
// Format helpers
// =====================
function formatPrice(price) {
    return Number(price).toLocaleString('vi-VN') + 'đ';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusLabel(status) {
    const map = {
        pending:    'Chờ xác nhận',
        confirmed:  'Đã xác nhận',
        preparing:  'Đang chuẩn bị',
        delivering: 'Chờ shipper nhận',
        shipping:   'Đang giao',
        completed:  'Hoàn tất',
        cancelled:  'Đã hủy',
    };
    return map[status] || status;
}

function statusBadgeClass(status) {
    const map = {
        pending:    'bg-warning text-dark',
        confirmed:  'bg-info text-dark',
        preparing:  'bg-primary',
        delivering: 'bg-secondary',
        shipping:   'bg-info',
        completed:  'bg-success',
        cancelled:  'bg-danger',
    };
    return map[status] || 'bg-secondary';
}

// =====================
// Toast notification
// =====================
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:260px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible shadow mb-2`;
    toast.role = 'alert';
    toast.innerHTML = `${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3000);
}

// =====================
// Navbar categories (load từ API)
// =====================
async function loadNavbarCategories() {
    // Ưu tiên tìm bằng id (index.html), fallback sang icon selector (trang khác)
    let dropdown = document.getElementById('navbar-cat-dropdown');
    if (!dropdown) {
        const barsIcon = document.querySelector('.navbar-nav .fa-bars');
        if (!barsIcon) return;
        const toggle = barsIcon.closest('[data-bs-toggle="dropdown"]');
        if (!toggle) return;
        dropdown = toggle.closest('.nav-item')?.querySelector('.dropdown-menu');
        if (!dropdown) return;
    }

    try {
        const resp = await fetch(`${API}/categories`);
        const cats = await resp.json();
        if (!cats.length) {
            dropdown.innerHTML = '<li><span class="dropdown-item text-muted small">Chưa có danh mục</span></li>';
            return;
        }
        dropdown.innerHTML = cats.map(c =>
            `<li><a class="dropdown-item" href="product.html?category=${c._id}">${c.name}</a></li>`
        ).join('');
    } catch {
        dropdown.innerHTML = '<li><span class="dropdown-item text-muted small">Lỗi tải danh mục</span></li>';
    }
}

// =====================
// City selector (lưu vào localStorage)
// =====================
function initCitySelector() {
    const locIcon = document.querySelector('.navbar-nav .fa-location-dot');
    if (!locIcon) return;
    const toggle = locIcon.closest('[data-bs-toggle="dropdown"]');
    if (!toggle) return;
    const dropdown = toggle.closest('.nav-item')?.querySelector('.dropdown-menu');
    if (!dropdown) return;

    const savedCity = localStorage.getItem('nomnomfood_city') || 'Hà Nội';
    toggle.innerHTML = `<i class="fa-solid fa-location-dot me-1"></i>${savedCity}`;

    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const city = item.textContent.trim();
            localStorage.setItem('nomnomfood_city', city);
            toggle.innerHTML = `<i class="fa-solid fa-location-dot me-1"></i>${city}`;
            showToast(`Đã chuyển sang ${city}`, 'success');
        });
    });
}

// =====================
// Sync user từ server (cập nhật avatar và thông tin mới nhất)
// =====================
async function syncUserFromServer() {
    const user = getUser();
    if (!user || !user._id) return;
    try {
        const resp = await fetch(`${API}/users/${user._id}`);
        if (!resp.ok) return;
        const fresh = await resp.json();
        // Chỉ cập nhật nếu có thay đổi (tránh ghi đè không cần thiết)
        if (JSON.stringify(fresh) !== JSON.stringify(user)) {
            localStorage.setItem('nomnomfood_user', JSON.stringify(fresh));
            updateNavbar();
        }
    } catch { /* bỏ qua nếu offline */ }
}

// =====================
// Init on every page
// =====================
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    updateCartBadge();
    loadNavbarCategories();
    initCitySelector();
    loadBossChat();
    syncUserFromServer(); // luôn lấy dữ liệu mới nhất từ server (avatar, tên, ...)
});

function loadBossChat() {
    if (document.getElementById('bosschat-widget-script')) return;
    const s = document.createElement('script');
    s.id = 'bosschat-widget-script';
    s.src = (typeof BASE_PATH !== 'undefined' ? BASE_PATH : '') + 'JAVASCRIPT/bosschat.js';
    document.body.appendChild(s);
}
