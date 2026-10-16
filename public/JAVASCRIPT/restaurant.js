let countdownVal = 30;
let countdownTimer = null;
let liveTimerInterval = null;
let prevPendingIds = new Set();
let allMenuProducts = [];
let menuLoaded = false;
let materialsById = {};
let recipesByProduct = {};
let prevShortageOrderIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('staff-name').textContent = user.name;
    loadOrders();
    startCountdown();
    startLiveTimers();
});

// ── Tồn kho nguyên liệu & công thức (để cảnh báo thiếu nguyên liệu) ──────────

async function loadInventoryData() {
    try {
        const [materialsRes, recipesRes] = await Promise.all([
            fetch(`${API}/acc/materials`),
            fetch(`${API}/acc/recipes`),
        ]);
        const materials = materialsRes.ok ? await materialsRes.json() : [];
        const recipes = recipesRes.ok ? await recipesRes.json() : [];

        materialsById = {};
        materials.forEach(m => { materialsById[m._id] = m; });

        recipesByProduct = {};
        recipes.forEach(r => {
            const productId = r.product?._id || r.product;
            const materialId = r.danhMucNL?._id || r.danhMucNL;
            if (!productId || !materialId) return;
            if (!recipesByProduct[productId]) recipesByProduct[productId] = [];
            recipesByProduct[productId].push({ materialId, dinhLuong: r.dinhLuong });
        });
    } catch {
        // Giữ dữ liệu cũ nếu tải thất bại; không chặn hiển thị đơn hàng
    }
}

// Trả về danh sách nguyên liệu không đủ tồn kho để làm hết các món trong đơn.
function getStockShortages(order) {
    const needed = {};
    (order.items || []).forEach(item => {
        const productId = item.product?._id || item.product;
        const lines = recipesByProduct[productId];
        if (!lines) return;
        lines.forEach(line => {
            needed[line.materialId] = (needed[line.materialId] || 0) + item.quantity * line.dinhLuong;
        });
    });

    const shortages = [];
    Object.entries(needed).forEach(([materialId, qty]) => {
        const material = materialsById[materialId];
        if (!material) return;
        const ton = material.tonHienTai || 0;
        if (ton < qty) {
            shortages.push({ materialId, ten: material.tenNL, thieu: qty - ton, ton, can: qty });
        }
    });
    return shortages;
}

// ── Auto-refresh countdown ───────────────────────────────────────────────────

function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownVal = 30;
    updateCountdownDisplay();
    countdownTimer = setInterval(() => {
        countdownVal--;
        updateCountdownDisplay();
        if (countdownVal <= 0) {
            loadOrders();
            countdownVal = 30;
        }
    }, 1000);
}

function updateCountdownDisplay() {
    const el = document.getElementById('countdown');
    if (el) el.textContent = countdownVal;
}

// ── Live urgency timers (update age + color every 60s) ──────────────────────

function startLiveTimers() {
    if (liveTimerInterval) clearInterval(liveTimerInterval);
    liveTimerInterval = setInterval(updateAllTimers, 60000);
}

function updateAllTimers() {
    document.querySelectorAll('[data-created]').forEach(el => {
        const created = el.getAttribute('data-created');
        el.textContent = timeSince(created);
        const card = el.closest('.order-card');
        if (card) applyUrgencyStyle(card, created);
    });
}

function applyUrgencyStyle(card, createdAt) {
    const mins = (Date.now() - new Date(createdAt)) / 60000;
    card.classList.remove('urgency-warn', 'urgency-critical');
    if (mins > 20) card.classList.add('urgency-critical');
    else if (mins > 10) card.classList.add('urgency-warn');
}

// ── Load all columns ─────────────────────────────────────────────────────────

async function loadOrders() {
    try {
        const [pendingRes, preparingRes, deliveringRes, completedRes] = await Promise.all([
            fetch(`${API}/orders?status=pending`),
            fetch(`${API}/orders?status=preparing`),
            fetch(`${API}/orders?status=delivering`),
            fetch(`${API}/orders?status=completed&updatedFrom=${new Date(new Date().setHours(0, 0, 0, 0)).toISOString()}`),
            loadInventoryData(),
        ]);

        const [pending, preparing, delivering, completed] = await Promise.all([
            pendingRes.ok ? pendingRes.json() : [],
            preparingRes.ok ? preparingRes.json() : [],
            deliveringRes.ok ? deliveringRes.json() : [],
            completedRes.ok ? completedRes.json() : [],
        ]);

        const todayCompleted = completed.filter(o => {
            const d = new Date(o.updatedAt || o.createdAt);
            return d.toDateString() === new Date().toDateString();
        });

        // Stats bar
        document.getElementById('stat-pending').textContent = pending.length;
        document.getElementById('stat-preparing').textContent = preparing.length;
        document.getElementById('stat-delivering').textContent = delivering.length;
        document.getElementById('stat-completed').textContent = todayCompleted.length;

        document.getElementById('count-pending').textContent = pending.length;
        document.getElementById('count-preparing').textContent = preparing.length;
        document.getElementById('count-delivering').textContent = delivering.length;

        // Browser tab badge
        document.title = pending.length > 0
            ? `(${pending.length}) Đơn mới - Quản lý bếp`
            : 'Quản lý bếp - NomNomFood';

        // Alert for new pending orders
        const newIds = new Set(pending.map(o => o._id));
        const hasNew = [...newIds].some(id => !prevPendingIds.has(id));
        if (hasNew && prevPendingIds.size > 0) {
            playAlertSound();
            showToast('Có đơn hàng mới!', 'warning');
        }

        // Cảnh báo thiếu nguyên liệu cho các đơn mới xuất hiện (mới đặt hoặc đang nấu)
        const activeOrders = [...pending, ...preparing.filter(o => !o.xuatKho)];
        const shortageOrderIds = new Set();
        activeOrders.forEach(o => {
            if (getStockShortages(o).length) shortageOrderIds.add(o._id);
        });
        const newShortageIds = [...shortageOrderIds].filter(id => !prevShortageOrderIds.has(id) && prevPendingIds.size > 0);
        if (newShortageIds.length) {
            playAlertSound();
            showToast(`<i class="fa-solid fa-triangle-exclamation me-1"></i>Có ${newShortageIds.length} đơn hàng thiếu nguyên liệu để chế biến!`, 'danger');
        }
        prevPendingIds = newIds;
        prevShortageOrderIds = shortageOrderIds;

        document.getElementById('stat-shortage-wrap').classList.toggle('d-none', shortageOrderIds.size === 0);
        document.getElementById('stat-shortage').textContent = shortageOrderIds.size;

        renderColumn('col-pending', pending, 'pending');
        renderColumn('col-preparing', preparing, 'preparing');
        renderColumn('col-delivering', delivering, 'delivering');

        startCountdown();
    } catch (err) {
        showToast('Lỗi tải đơn hàng: ' + err.message, 'danger');
    }
}

function renderColumn(colId, orders, status) {
    const col = document.getElementById(colId);
    if (!orders.length) {
        col.innerHTML = `<div class="empty-col">
            <i class="fa-solid fa-circle-check fa-2x mb-2 opacity-25"></i>
            <div>Không có đơn</div>
        </div>`;
        return;
    }
    col.innerHTML = orders
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(o => renderOrderCard(o, status))
        .join('');
}

function renderOrderCard(order, status) {
    const customer = order.user || {};
    const addr = order.shippingAddress || {};
    const isPaid = order.paymentStatus === 'paid';
    const shortId = order._id ? order._id.slice(-6).toUpperCase() : '------';
    const mins = (Date.now() - new Date(order.createdAt)) / 60000;
    const urgencyClass = mins > 20 ? 'urgency-critical' : mins > 10 ? 'urgency-warn' : '';

    const shortages = (status === 'pending' || (status === 'preparing' && !order.xuatKho)) ? getStockShortages(order) : [];
    const shortageMaterialIds = new Set(shortages.map(s => s.materialId));

    const shortageBanner = shortages.length
        ? `<div class="stock-warning">
            <i class="fa-solid fa-triangle-exclamation me-1"></i>Thiếu nguyên liệu:
            ${shortages.map(s => `${s.ten} (thiếu ${Number(s.thieu.toFixed(2))})`).join(', ')}
        </div>`
        : '';

    const itemsHtml = (order.items || []).map(item => {
        const p = item.product || {};
        const productId = p._id || item.product;
        const lines = recipesByProduct[productId] || [];
        const itemShort = lines.some(line => shortageMaterialIds.has(line.materialId));
        return `<li${itemShort ? ' class="text-danger"' : ''}>
            <span><span class="item-qty">x${item.quantity}</span> ${p.name || 'Sản phẩm'}${itemShort ? ' <i class="fa-solid fa-triangle-exclamation" title="Thiếu nguyên liệu"></i>' : ''}</span>
            <span class="text-muted" style="font-size:.75rem">${formatPrice(item.price * item.quantity)}</span>
        </li>`;
    }).join('');

    const noteHtml = order.note
        ? `<div class="order-note"><i class="fa-solid fa-pen-to-square me-1"></i>${order.note}</div>`
        : '';

    const urgencyBadge = mins > 20
        ? `<span class="urgency-badge critical"><i class="fa-solid fa-triangle-exclamation me-1"></i>Trễ ${Math.floor(mins)} phút</span>`
        : mins > 10
        ? `<span class="urgency-badge warn"><i class="fa-regular fa-clock me-1"></i>${Math.floor(mins)} phút</span>`
        : '';

    let actionHtml = '';
    if (status === 'pending') {
        actionHtml = `
            <button class="btn-confirm" onclick="updateStatus('${order._id}', 'preparing', this)">
                <i class="fa-solid fa-fire me-1"></i>Xác nhận & Bắt đầu nấu
            </button>
            <button class="btn-cancel" onclick="confirmCancel('${order._id}', '${shortId}')">
                <i class="fa-solid fa-xmark me-1"></i>Hủy đơn
            </button>`;
    } else if (status === 'preparing') {
        actionHtml = `
            <button class="btn-deliver" onclick="updateStatus('${order._id}', 'delivering', this)">
                <i class="fa-solid fa-motorcycle me-1"></i>Xong! Giao cho shipper
            </button>`;
    }

    return `<div class="order-card${status === 'pending' ? ' new-order' : ''} ${urgencyClass}${shortages.length ? ' card-shortage' : ''}" id="card-${order._id}">
        <div class="d-flex justify-content-between align-items-start mb-1">
            <div class="d-flex align-items-center gap-2">
                <span class="order-id">#${shortId}</span>
                ${urgencyBadge}
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="order-time" data-created="${order.createdAt}">
                    <i class="fa-regular fa-clock me-1"></i>${timeSince(order.createdAt)}
                </span>
                <button class="btn-print" onclick="printTicket('${order._id}')" title="In phiếu bếp">
                    <i class="fa-solid fa-print"></i>
                </button>
            </div>
        </div>
        <div class="customer-info">
            <i class="fa-solid fa-user me-1 text-secondary"></i>
            <strong>${customer.name || 'Khách'}</strong>
            ${customer.phone ? `&nbsp;·&nbsp;<i class="fa-solid fa-phone me-1 text-secondary"></i>${customer.phone}` : ''}
        </div>
        ${addr.street ? `<div class="customer-info" style="font-size:.78rem">
            <i class="fa-solid fa-location-dot me-1 text-danger"></i>
            ${addr.street}${addr.city ? ', ' + addr.city : ''}
        </div>` : ''}
        ${noteHtml}
        ${shortageBanner}
        ${status === 'preparing' && order.xuatKho ? '<div class="small text-success mb-1"><i class="fa-solid fa-box-open me-1"></i>Đã trừ kho nguyên liệu</div>' : ''}
        <ul class="items-list">${itemsHtml}</ul>
        <div class="d-flex justify-content-between align-items-center mt-1">
            <span class="order-total">${formatPrice(order.totalPrice)}</span>
            <span class="payment-badge ${isPaid ? 'pay-paid' : 'pay-cod'}">
                <i class="fa-solid fa-${isPaid ? 'circle-check' : 'money-bill-wave'} me-1"></i>
                ${isPaid ? 'Đã TT online' : 'Thu tiền mặt'}
            </span>
        </div>
        ${actionHtml}
    </div>`;
}

// ── Update order status ──────────────────────────────────────────────────────

// Bắt đầu nấu: server trừ kho nguyên liệu theo định mức; thiếu nguyên liệu thì hỏi bếp có vẫn nấu không
async function updateStatus(orderId, newStatus, btn, forceStock = false) {
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang xử lý...';

    try {
        const res = await fetch(`${API}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, updatedAt: new Date(), forceStock, nguoiLap: getUser()?.name || '' }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 409 && json.shortages) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            const list = json.shortages.map(s => `• ${s.tenNL}: cần ${Number(s.can.toFixed(3))} ${s.donViTinh}, kho còn ${Number(s.ton.toFixed(3))}`).join('\n');
            const ok = confirm(`KHO KHÔNG ĐỦ NGUYÊN LIỆU:\n${list}\n\nNếu thực tế bếp vẫn còn đủ để nấu, bấm OK để tiếp tục (tồn kho sẽ bị âm, kế toán cần nhập bổ sung hoặc kiểm kê).\nBấm Hủy để không nhận đơn.`);
            if (ok) return updateStatus(orderId, newStatus, btn, true);
            loadOrders();
            return;
        }
        if (!res.ok) throw new Error(json.error || 'Cập nhật thất bại');

        const messages = {
            preparing: 'Đã xác nhận, bắt đầu nấu!',
            delivering: 'Đã chuyển sang shipper!',
        };
        let msg = messages[newStatus] || 'Cập nhật thành công!';
        if (json.stockIssue) msg += `<br><small><i class="fa-solid fa-box-open me-1"></i>Đã trừ kho nguyên liệu (phiếu ${json.stockIssue.soPhieu})</small>`;
        if (json.missingRecipe?.length) msg += `<br><small class="text-danger">Chưa có định mức: ${json.missingRecipe.join(', ')}</small>`;
        showToast(msg, json.missingRecipe?.length ? 'warning' : 'success');
        animateCardOut(orderId, loadOrders);
    } catch (err) {
        showToast(err.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ── Cancel order ─────────────────────────────────────────────────────────────

function confirmCancel(orderId, shortId) {
    const modal = document.getElementById('cancelModal');
    document.getElementById('cancel-order-id').textContent = '#' + shortId;
    document.getElementById('cancel-reason').value = '';
    document.getElementById('cancel-confirm-btn').onclick = () => cancelOrder(orderId);
    new bootstrap.Modal(modal).show();
}

async function cancelOrder(orderId) {
    const reason = document.getElementById('cancel-reason').value.trim();
    const btn = document.getElementById('cancel-confirm-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang hủy...';

    try {
        const note = reason ? `[HỦY] ${reason}` : '[HỦY ĐƠN]';
        const res = await fetch(`${API}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled', note, updatedAt: new Date() }),
        });
        if (!res.ok) throw new Error();
        bootstrap.Modal.getInstance(document.getElementById('cancelModal')).hide();
        showToast('Đã hủy đơn hàng.', 'warning');
        animateCardOut(orderId, loadOrders);
    } catch {
        showToast('Hủy đơn thất bại. Thử lại!', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-xmark me-1"></i>Xác nhận hủy';
    }
}

// ── Print ticket ─────────────────────────────────────────────────────────────

async function printTicket(orderId) {
    try {
        const res = await fetch(`${API}/orders/${orderId}`);
        if (!res.ok) throw new Error();
        const order = await res.json();
        const customer = order.user || {};
        const addr = order.shippingAddress || {};
        const now = new Date().toLocaleString('vi-VN');
        const shortId = orderId.slice(-6).toUpperCase();

        const itemsRows = (order.items || []).map(item => {
            const p = item.product || {};
            return `<tr>
                <td>${p.name || 'Sản phẩm'}</td>
                <td style="text-align:center">x${item.quantity}</td>
                <td style="text-align:right">${formatPrice(item.price * item.quantity)}</td>
            </tr>`;
        }).join('');

        const win = window.open('', '_blank', 'width=400,height=600');
        win.document.write(`<!DOCTYPE html><html><head>
            <meta charset="UTF-8">
            <title>Phiếu bếp #${shortId}</title>
            <style>
                body{font-family:monospace;font-size:13px;padding:16px;max-width:320px;margin:0 auto}
                h2{text-align:center;font-size:16px;margin:0 0 4px}
                .center{text-align:center}
                hr{border:none;border-top:1px dashed #000;margin:8px 0}
                table{width:100%;border-collapse:collapse}
                td{padding:3px 0;vertical-align:top}
                .total{font-size:15px;font-weight:bold}
                .note{background:#ffe;border:1px dashed #999;padding:4px 8px;margin:6px 0;font-size:12px}
                @media print{button{display:none}}
            </style>
        </head><body>
            <h2>NomNomFood</h2>
            <div class="center" style="font-size:11px">PHIẾU BẾP</div>
            <hr>
            <div><b>Mã đơn:</b> #${shortId}</div>
            <div><b>Thời gian:</b> ${now}</div>
            <div><b>Khách:</b> ${customer.name || '---'}</div>
            ${customer.phone ? `<div><b>SĐT:</b> ${customer.phone}</div>` : ''}
            ${addr.street ? `<div><b>Địa chỉ:</b> ${addr.street}${addr.city ? ', ' + addr.city : ''}</div>` : ''}
            <hr>
            <table>
                <thead><tr><td><b>Món</b></td><td style="text-align:center"><b>SL</b></td><td style="text-align:right"><b>Giá</b></td></tr></thead>
                <tbody>${itemsRows}</tbody>
            </table>
            <hr>
            ${order.note ? `<div class="note"><b>Ghi chú:</b> ${order.note}</div><hr>` : ''}
            <div class="total d-flex" style="display:flex;justify-content:space-between">
                <span>TỔNG CỘNG</span><span>${formatPrice(order.totalPrice)}</span>
            </div>
            <div style="font-size:11px;margin-top:4px">${order.paymentStatus === 'paid' ? '✓ Đã thanh toán online' : '⊙ Thu tiền mặt khi giao'}</div>
            <hr>
            <div class="center" style="font-size:11px">★ Cảm ơn quý khách! ★</div>
            <br>
            <button onclick="window.print();window.close()" style="width:100%;padding:8px;font-size:14px;cursor:pointer">In phiếu</button>
        </body></html>`);
        win.document.close();
        win.focus();
    } catch {
        showToast('Không thể tải thông tin đơn hàng', 'danger');
    }
}

// ── Chuyển view: Đơn hàng / Thực đơn & Công thức ─────────────────────────────

function switchView(view) {
    document.getElementById('view-orders').classList.toggle('d-none', view !== 'orders');
    document.getElementById('view-menu').classList.toggle('d-none', view !== 'menu');
    document.getElementById('view-tab-orders').classList.toggle('active', view === 'orders');
    document.getElementById('view-tab-menu').classList.toggle('active', view === 'menu');
    if (view === 'menu' && !menuLoaded) loadMenu();
}

// ── Thực đơn: danh sách món ăn ────────────────────────────────────────────────

async function loadMenu() {
    try {
        const res = await fetch(`${API}/products`);
        if (!res.ok) throw new Error();
        allMenuProducts = await res.json();
        menuLoaded = true;
        renderMenu();
    } catch {
        document.getElementById('menu-grid').innerHTML =
            '<div class="text-center text-danger py-5">Không tải được thực đơn</div>';
    }
}

function renderMenu(filter = '') {
    const grid = document.getElementById('menu-grid');
    const keyword = filter.trim().toLowerCase();
    const products = keyword
        ? allMenuProducts.filter(p => p.name.toLowerCase().includes(keyword))
        : allMenuProducts;

    if (!products.length) {
        grid.innerHTML = '<div class="text-center text-muted py-5">Không tìm thấy món ăn nào</div>';
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="col-6 col-md-4 col-lg-3 col-xl-2">
            <div class="menu-card" onclick="openRecipe('${p._id}', '${(p.name || '').replace(/'/g, "\\'")}')">
                <img src="${p.image || 'https://placehold.co/300x200?text=No+Image'}" alt="${p.name}">
                <div class="menu-card-body">
                    <div class="menu-card-name">${p.name}</div>
                    <div class="menu-card-cat">${p.category?.name || 'Chưa phân loại'}</div>
                </div>
            </div>
        </div>`).join('');
}

// ── Công thức món ăn (kết nối danh mục nguyên liệu Kế toán) ──────────────────

let currentRecipeProductId = null;
let currentRecipeProductName = '';
let currentRecipeLines = [];

async function openRecipe(productId, productName) {
    currentRecipeProductId = productId;
    currentRecipeProductName = productName;
    document.getElementById('recipe-modal-title').textContent = productName;
    document.getElementById('recipe-modal-body').innerHTML =
        '<div class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Đang tải công thức...</div>';
    new bootstrap.Modal(document.getElementById('recipeModal')).show();
    if (!Object.keys(materialsById).length) await loadInventoryData();
    await reloadRecipeModal();
}

async function reloadRecipeModal() {
    try {
        const res = await fetch(`${API}/acc/recipes?product=${currentRecipeProductId}`);
        if (!res.ok) throw new Error();
        currentRecipeLines = await res.json();
        renderRecipeModal(currentRecipeLines);
        renderRecipeAddForm();
    } catch {
        document.getElementById('recipe-modal-body').innerHTML =
            '<div class="text-center text-danger py-4">Không tải được công thức món ăn</div>';
    }
}

function renderRecipeModal(recipes) {
    const body = document.getElementById('recipe-modal-body');
    if (!recipes.length) {
        body.innerHTML = `<div class="text-center text-muted py-4">
            <i class="fa-solid fa-circle-exclamation fa-lg mb-2 d-block"></i>
            Chưa có công thức được thiết lập cho món này.<br>
            <span class="small">Thêm nguyên liệu ở bên dưới để tạo công thức.</span>
        </div>`;
        return;
    }

    body.innerHTML = recipes.map(r => {
        const nl = r.danhMucNL || {};
        const ton = nl.tonHienTai ?? 0;
        const du = ton - (r.dinhLuong || 0);
        const stockClass = du < 0 ? 'low' : 'ok';
        const stockLabel = du < 0
            ? `<i class="fa-solid fa-triangle-exclamation me-1"></i>Tồn kho thấp (còn ${ton})`
            : `Tồn kho: ${ton}`;
        return `<div class="recipe-row">
            <div>
                <div class="fw-semibold">${nl.tenNL || '—'}</div>
                <div class="recipe-stock ${stockClass}">${stockLabel}</div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="recipe-qty">${r.dinhLuong}</span>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteRecipeIngredient('${r._id}')" title="Xóa nguyên liệu">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

// Danh sách nguyên liệu để thêm mới: chỉ hiện nguyên liệu chưa có trong công thức món này.
function renderRecipeAddForm() {
    const select = document.getElementById('recipe-add-material');
    const usedIds = new Set(currentRecipeLines.map(r => r.danhMucNL?._id || r.danhMucNL));
    const options = Object.values(materialsById).filter(m => !usedIds.has(m._id));
    document.getElementById('recipe-add-dinhluong').value = '';
    if (!options.length) {
        select.innerHTML = '<option value="">Đã thêm hết nguyên liệu hiện có</option>';
        select.disabled = true;
        return;
    }
    select.disabled = false;
    select.innerHTML = options
        .sort((a, b) => a.tenNL.localeCompare(b.tenNL))
        .map(m => `<option value="${m._id}">${m.tenNL}</option>`).join('');
}

async function addRecipeIngredient() {
    const danhMucNL = document.getElementById('recipe-add-material').value;
    const dinhLuong = Number(document.getElementById('recipe-add-dinhluong').value);
    if (!danhMucNL) { showToast('Vui lòng chọn nguyên liệu', 'warning'); return; }
    if (!dinhLuong || dinhLuong <= 0) { showToast('Vui lòng nhập định lượng hợp lệ', 'warning'); return; }
    try {
        const res = await fetch(`${API}/acc/recipes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: currentRecipeProductId, danhMucNL, dinhLuong }),
        });
        if (!res.ok) throw new Error();
        showToast('Đã thêm nguyên liệu vào công thức', 'success');
        await reloadRecipeModal();
        await loadInventoryData();
    } catch {
        showToast('Lỗi khi thêm nguyên liệu', 'danger');
    }
}

async function deleteRecipeIngredient(id) {
    if (!confirm('Xác nhận xóa nguyên liệu này khỏi công thức?')) return;
    try {
        const res = await fetch(`${API}/acc/recipes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa nguyên liệu khỏi công thức', 'success');
        await reloadRecipeModal();
        await loadInventoryData();
    } catch {
        showToast('Lỗi khi xóa nguyên liệu', 'danger');
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function animateCardOut(orderId, callback) {
    const card = document.getElementById(`card-${orderId}`);
    if (card) {
        card.style.transition = 'opacity .3s, transform .3s';
        card.style.opacity = '0';
        card.style.transform = 'translateX(20px)';
        setTimeout(callback, 350);
    } else {
        callback();
    }
}

function timeSince(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return diff + 'giây trước';
    if (diff < 3600) return Math.floor(diff / 60) + ' phút trước';
    return Math.floor(diff / 3600) + ' giờ trước';
}

function playAlertSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.35);
        });
    } catch (_) {}
}
