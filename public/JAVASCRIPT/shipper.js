let currentTab = 'delivering';
let countdownVal = 30;
let countdownTimer = null;
let prevDeliveringIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user || (user.role !== 'shipper' && user.role !== 'admin' && user.role !== 'manager')) {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('shipper-name').textContent = user.name;
    loadOrders();
    startCountdown();
});

// ── Countdown ────────────────────────────────────────────────────────────────

function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownVal = 30;
    updateCountdownDisplay();
    countdownTimer = setInterval(() => {
        countdownVal--;
        updateCountdownDisplay();
        if (countdownVal <= 0) { loadOrders(); countdownVal = 30; }
    }, 1000);
}
function updateCountdownDisplay() {
    const el = document.getElementById('countdown');
    if (el) el.textContent = countdownVal;
}

// ── Tab switching ────────────────────────────────────────────────────────────

function switchTab(tab) {
    currentTab = tab;
    ['delivering', 'shipping', 'completed'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
        document.getElementById(`content-${t}`).classList.toggle('d-none', t !== tab);
    });
}

// ── Load orders ──────────────────────────────────────────────────────────────

async function loadOrders() {
    try {
        const [r1, r2, r3] = await Promise.all([
            fetch(`${API}/orders?status=delivering`),
            fetch(`${API}/orders?status=shipping`),
            fetch(`${API}/orders?status=completed&updatedFrom=${new Date(new Date().setHours(0, 0, 0, 0)).toISOString()}`),
        ]);
        const [waiting, inTransit, completed] = await Promise.all([
            r1.ok ? r1.json() : [],
            r2.ok ? r2.json() : [],
            r3.ok ? r3.json() : [],
        ]);

        const todayDone = completed.filter(o =>
            new Date(o.updatedAt || o.createdAt).toDateString() === new Date().toDateString()
        );

        // Badge counts
        document.getElementById('badge-delivering').textContent = waiting.length;
        document.getElementById('badge-shipping').textContent   = inTransit.length;
        document.getElementById('badge-completed').textContent  = todayDone.length;

        // Tab title
        const urgent = waiting.length + inTransit.length;
        document.title = urgent > 0 ? `(${urgent}) Đơn chờ - Shipper` : 'Giao hàng - NomNomFood';

        // Sound alert for new waiting orders
        const newIds = new Set(waiting.map(o => o._id));
        const hasNew = [...newIds].some(id => !prevDeliveringIds.has(id));
        if (hasNew && prevDeliveringIds.size > 0) {
            playAlertSound();
            showToast('Có đơn mới sẵn sàng để nhận!', 'info');
        }
        prevDeliveringIds = newIds;

        renderWaiting(waiting);
        renderInTransit(inTransit);
        renderCompleted(todayDone);

        startCountdown();
    } catch {
        showToast('Lỗi tải đơn hàng', 'danger');
    }
}

// ── Tab 1: Đơn chờ nhận (delivering) ─────────────────────────────────────────

function renderWaiting(orders) {
    const c = document.getElementById('content-delivering');
    if (!orders.length) {
        c.innerHTML = emptyState('fa-box-open', 'Chưa có đơn chờ nhận', 'Đơn sẽ xuất hiện khi bếp hoàn thành');
        return;
    }
    c.innerHTML = orders
        .sort((a, b) => new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt))
        .map(o => renderWaitingCard(o))
        .join('');
}

function renderWaitingCard(order) {
    const shortId  = order._id.slice(-6).toUpperCase();
    const customer = order.user || {};
    const isPaid   = order.paymentStatus === 'paid';
    const elapsed  = timeSince(order.updatedAt || order.createdAt);
    const itemCount = (order.items || []).length;

    return `<div class="waiting-card" id="card-${order._id}">
        <div class="waiting-header">
            <div>
                <span class="wc-id">#${shortId}</span>
                <span class="wc-time"><i class="fa-regular fa-clock me-1"></i>${elapsed}</span>
            </div>
            <span class="wc-badge ${isPaid ? 'paid' : 'cod'}">${isPaid ? 'Online' : 'COD'}</span>
        </div>
        <div class="wc-customer">
            <i class="fa-solid fa-user me-1"></i><strong>${customer.name || 'Khách'}</strong>
        </div>
        <div class="wc-meta">
            <span><i class="fa-solid fa-utensils me-1 text-secondary"></i>${itemCount} món</span>
            <span class="wc-price">${formatPrice(order.totalPrice)}</span>
        </div>
        <button class="btn-accept" onclick="acceptOrder('${order._id}', this)">
            <i class="fa-solid fa-hand-pointer me-2"></i>Nhận đơn này
        </button>
    </div>`;
}

async function acceptOrder(orderId, btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang nhận...';
    try {
        const res = await fetch(`${API}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'shipping', updatedAt: new Date() }),
        });
        if (!res.ok) throw new Error();
        showToast('Đã nhận đơn! Xem chi tiết ở tab "Đang giao"', 'success');
        const card = document.getElementById(`card-${orderId}`);
        if (card) { card.style.opacity = '0'; card.style.transition = 'opacity .3s'; }
        setTimeout(() => { loadOrders(); switchTab('shipping'); }, 400);
    } catch {
        showToast('Nhận đơn thất bại, thử lại!', 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-hand-pointer me-2"></i>Nhận đơn này';
    }
}

// ── Tab 2: Đang giao (shipping) ───────────────────────────────────────────────

function renderInTransit(orders) {
    const c = document.getElementById('content-shipping');
    if (!orders.length) {
        c.innerHTML = emptyState('fa-motorcycle', 'Chưa nhận đơn nào', 'Nhận đơn từ tab "Đơn chờ nhận"');
        return;
    }
    c.innerHTML = orders
        .sort((a, b) => new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt))
        .map(o => renderInTransitCard(o))
        .join('');
}

function renderInTransitCard(order) {
    const shortId  = order._id.slice(-6).toUpperCase();
    const customer = order.user || {};
    const addr     = order.shippingAddress || {};
    const isPaid   = order.paymentStatus === 'paid';
    const elapsed  = timeSince(order.updatedAt || order.createdAt);

    const itemsHtml = (order.items || []).map(item => {
        const p = item.product || {};
        return `<div class="item-row">
            <div class="item-name-qty">
                <span class="qty-badge">x${item.quantity}</span>
                <span>${p.name || 'Sản phẩm'}</span>
            </div>
            <span class="text-muted" style="font-size:.78rem">${formatPrice(item.price * item.quantity)}</span>
        </div>`;
    }).join('');

    const noteHtml = order.note
        ? `<div class="note-block"><i class="fa-solid fa-pen-to-square me-1"></i><strong>Ghi chú:</strong> ${order.note}</div>`
        : '';

    const paymentBlock = isPaid
        ? `<div class="paid-block">
            <i class="fa-solid fa-circle-check"></i>
            <div><div class="paid-text">Đã thanh toán online</div><div class="paid-sub">Không thu tiền mặt</div></div>
           </div>`
        : `<div class="cod-block">
            <div>
                <div class="cod-label"><i class="fa-solid fa-money-bill-wave me-1"></i>THU TIỀN MẶT (COD)</div>
                <div class="cod-amount">${formatPrice(order.totalPrice)}</div>
            </div>
            <i class="fa-solid fa-hand-holding-dollar fa-2x" style="color:#e85d04;opacity:.6"></i>
           </div>`;

    return `<div class="delivery-card" id="card-${order._id}">
        <div class="card-header-strip">
            <span class="order-id-badge"><i class="fa-solid fa-motorcycle me-1"></i>#${shortId}</span>
            <span class="order-elapsed"><i class="fa-regular fa-clock me-1"></i>${elapsed}</span>
        </div>
        <div class="card-body-inner">
            <div class="info-row">
                <div class="info-icon icon-blue"><i class="fa-solid fa-user"></i></div>
                <div class="info-content">
                    <div class="info-label">Khách hàng</div>
                    <div class="info-value">${customer.name || 'Khách'}</div>
                </div>
            </div>
            ${customer.phone ? `
            <div class="info-row">
                <div class="info-icon icon-blue"><i class="fa-solid fa-phone"></i></div>
                <div class="info-content">
                    <div class="info-label">Số điện thoại</div>
                    <div class="info-value">
                        <a href="tel:${customer.phone}" style="color:#0077b6;text-decoration:none;font-weight:700;font-size:1.05rem">
                            ${customer.phone}
                        </a>
                    </div>
                </div>
            </div>` : ''}
            <div class="info-row">
                <div class="info-icon icon-red"><i class="fa-solid fa-location-dot"></i></div>
                <div class="info-content">
                    <div class="info-label">Địa chỉ giao hàng</div>
                    <div class="info-value">
                        ${addr.street || 'Chưa có địa chỉ'}
                        ${addr.city ? `<br><span style="font-weight:400;color:#666;font-size:.82rem">${addr.city}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="items-section">
                <div class="info-label mb-1"><i class="fa-solid fa-utensils me-1"></i>Danh sách món (${(order.items||[]).length} món)</div>
                ${itemsHtml}
            </div>
            ${noteHtml}
            ${paymentBlock}
            <button class="btn-done" onclick="confirmDelivered('${order._id}', ${isPaid}, this)">
                <i class="fa-solid fa-circle-check me-2"></i>Xác nhận đã giao thành công
            </button>
        </div>
    </div>`;
}

async function confirmDelivered(orderId, isPaid, btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang cập nhật...';
    try {
        const updateData = { status: 'completed', updatedAt: new Date() };
        if (!isPaid) updateData.paymentStatus = 'paid';

        const res = await fetch(`${API}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });
        if (!res.ok) throw new Error();
        showToast('Giao hàng thành công! Tiền đã được ghi nhận.', 'success');
        const card = document.getElementById(`card-${orderId}`);
        if (card) { card.style.opacity = '0'; card.style.transition = 'opacity .3s'; }
        setTimeout(loadOrders, 400);
    } catch {
        showToast('Cập nhật thất bại. Thử lại!', 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-circle-check me-2"></i>Xác nhận đã giao thành công';
    }
}

// ── Tab 3: Đã giao hôm nay (completed) ───────────────────────────────────────

function renderCompleted(orders) {
    const c = document.getElementById('content-completed');
    if (!orders.length) {
        c.innerHTML = emptyState('fa-circle-check', 'Chưa giao đơn nào hôm nay', '');
        return;
    }

    const totalCod  = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.totalPrice, 0);
    const countCod  = orders.length;

    c.innerHTML = `
        <div class="summary-bar">
            <div class="summary-item">
                <div class="summary-label">Đơn hoàn thành</div>
                <div class="summary-value">${countCod} đơn</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Tổng tiền đã thu</div>
                <div class="summary-value text-success">${formatPrice(totalCod)}</div>
            </div>
        </div>
        ${orders
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .map(o => renderCompletedCard(o))
            .join('')}`;
}

function renderCompletedCard(order) {
    const shortId  = order._id.slice(-6).toUpperCase();
    const customer = order.user || {};
    const isPaid   = order.paymentStatus === 'paid';
    const elapsed  = timeSince(order.updatedAt || order.createdAt);

    return `<div class="delivery-card done">
        <div class="card-header-strip">
            <span class="order-id-badge"><i class="fa-solid fa-receipt me-1"></i>#${shortId}</span>
            <span class="order-elapsed"><i class="fa-regular fa-clock me-1"></i>${elapsed}</span>
        </div>
        <div class="card-body-inner py-2">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-semibold">${customer.name || 'Khách'}</div>
                    <div class="text-muted small">${formatPrice(order.totalPrice)} · ${isPaid ? 'Đã thu' : 'Online'}</div>
                </div>
                <span class="completed-badge"><i class="fa-solid fa-circle-check me-1"></i>Đã giao</span>
            </div>
        </div>
    </div>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyState(icon, title, sub) {
    return `<div class="empty-state">
        <i class="fa-solid ${icon}"></i>
        <div class="fw-semibold mb-1">${title}</div>
        ${sub ? `<div class="small">${sub}</div>` : ''}
    </div>`;
}

function timeSince(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return diff + 'giây trước';
    if (diff < 3600) return Math.floor(diff / 60) + ' phút trước';
    if (diff < 86400) return Math.floor(diff / 3600) + ' giờ trước';
    return formatDate(dateStr);
}

function playAlertSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [440, 550, 660].forEach((freq, i) => {
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq; osc.type = 'sine';
            gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.28);
        });
    } catch (_) {}
}
