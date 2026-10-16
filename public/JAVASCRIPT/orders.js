let orderDetailModalInst = null;
let cancelRequestModalInst = null;
let currentOrderId = null;
let orderChatPollTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;

    orderDetailModalInst = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    cancelRequestModalInst = new bootstrap.Modal(document.getElementById('cancelRequestModal'));
    document.getElementById('orderDetailModal').addEventListener('hidden.bs.modal', stopOrderChatPolling);

    await loadOrders();

    // After placing order: show success toast + auto-open detail
    const params  = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const orderId = params.get('orderId');

    if (success === '1') {
        showToast('Đặt hàng thành công! Chúng tôi sẽ giao hàng sớm nhất.', 'success');
        if (orderId) {
            setTimeout(() => viewOrderDetail(orderId), 600);
        }
        // Clean URL without reload
        history.replaceState(null, '', 'orders.html');
    }
});

const METHOD_LABEL = {
    cash:          'Tiền mặt (COD)',
    momo:          'Ví MoMo',
    zalopay:       'Ví ZaloPay',
    bank_transfer: 'Chuyển khoản ngân hàng',
};

async function loadOrders() {
    const userId    = getUserId();
    const container = document.getElementById('orders-container');

    try {
        const resp   = await fetch(`${API}/orders?userId=${userId}`);
        const orders = await resp.json();

        if (!Array.isArray(orders) || !orders.length) {
            container.innerHTML = `
                <div class="bg-white rounded-4 shadow-sm p-5 text-center">
                    <i class="fa-solid fa-box-open fa-4x text-muted opacity-25 mb-3"></i>
                    <p class="text-muted fs-5 mb-3">Bạn chưa có đơn hàng nào.</p>
                    <a href="product.html" class="btn btn-danger px-4">
                        <i class="fa-solid fa-utensils me-1"></i>Đặt món ngay
                    </a>
                </div>`;
            return;
        }

        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        container.innerHTML = orders.map(order => renderOrderCard(order)).join('');

    } catch {
        container.innerHTML = `
            <div class="bg-white rounded-4 shadow-sm p-5 text-center text-danger">
                <i class="fa-solid fa-circle-exclamation fa-2x mb-2"></i>
                <p>Lỗi tải đơn hàng. <a href="orders.html" class="text-danger">Thử lại</a></p>
            </div>`;
    }
}

function renderOrderCard(order) {
    const payBadge = order.paymentStatus === 'paid'
        ? '<span class="badge bg-success">Đã thanh toán</span>'
        : '<span class="badge bg-warning text-dark">Chưa thanh toán</span>';

    const itemSummary = order.items
        .map(i => `<span class="me-3 small">${i.product?.name || 'Sản phẩm'} <span class="text-muted">x${i.quantity}</span></span>`)
        .join('');

    return `
        <div class="bg-white rounded-4 shadow-sm p-4 mb-3">
            <div class="d-flex flex-column flex-md-row justify-content-between
                        align-items-start align-items-md-center mb-3 gap-2">
                <div>
                    <h5 class="mb-1 fw-bold">
                        <i class="fa-solid fa-receipt text-danger me-2 small"></i>
                        Đơn hàng #${order._id.slice(-8).toUpperCase()}
                    </h5>
                    <small class="text-secondary">
                        <i class="fa-regular fa-calendar me-1"></i>
                        Đặt ngày ${formatDate(order.createdAt)}
                    </small>
                </div>
                <span class="badge ${statusBadgeClass(order.status)} px-3 py-2">
                    ${statusLabel(order.status)}
                </span>
            </div>

            <div class="mb-3 d-flex flex-wrap gap-1">${itemSummary}</div>

            <hr class="my-2">

            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div class="d-flex align-items-center gap-3">
                    <div>
                        <span class="text-muted small">Tổng tiền</span>
                        <div class="text-danger fw-bold">${formatPrice(order.totalPrice)}</div>
                    </div>
                    ${payBadge}
                </div>
                <button class="btn btn-outline-danger btn-sm"
                        onclick="viewOrderDetail('${order._id}')">
                    <i class="fa-solid fa-eye me-1"></i>Xem chi tiết
                </button>
            </div>

            ${order.shippingAddress?.street ? `
                <div class="text-muted small mt-2">
                    <i class="fa-solid fa-location-dot me-1 text-danger"></i>
                    ${order.shippingAddress.street}${order.shippingAddress.city ? ', ' + order.shippingAddress.city : ''}
                </div>` : ''}

            ${order.status === 'cancelled' && order.note ? `
                <div class="alert alert-danger py-2 px-3 small mt-2 mb-0">
                    <i class="fa-solid fa-ban me-1"></i>
                    <strong>Đã hủy:</strong> ${order.note.replace('[HỦY] ', '').replace('[HỦY ĐƠN]', '').trim()}
                </div>` : ''}
        </div>`;
}

async function viewOrderDetail(orderId) {
    currentOrderId = orderId;
    stopOrderChatPolling();
    document.getElementById('modal-order-id').innerHTML =
        `<i class="fa-solid fa-receipt text-danger me-2"></i>Đơn hàng #${orderId.slice(-8).toUpperCase()}`;
    document.getElementById('modal-order-date').textContent = '';
    document.getElementById('order-detail-body').innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-danger spinner-border-sm"></div>
        </div>`;

    orderDetailModalInst.show();

    try {
        const resp  = await fetch(`${API}/orders/${orderId}`);
        if (!resp.ok) throw new Error();
        const order = await resp.json();
        renderOrderDetail(order);

        if (order.status === 'cancelled') {
            const refundResp = await fetch(`${API}/acc/refunds?order=${orderId}`);
            const refunds = await refundResp.json();
            const refund = Array.isArray(refunds) ? refunds.find(r => r.nguoiYeuCau) : null;
            if (refund) {
                renderRefundPanel(refund);
                await loadOrderChatMessages(orderId);
                startOrderChatPolling(orderId);
            }
        }
    } catch {
        document.getElementById('order-detail-body').innerHTML =
            '<p class="text-danger text-center py-3">Không thể tải thông tin đơn hàng.</p>';
    }
}

function openCancelRequestModal() {
    document.getElementById('cancel-request-reason').value = '';
    cancelRequestModalInst.show();
}

async function submitCancelRequest() {
    const lyDo = document.getElementById('cancel-request-reason').value.trim();
    const user = getUser();
    try {
        const res = await fetch(`${API}/orders/${currentOrderId}/cancel-request`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id, lyDo }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Hủy đơn thất bại');
        cancelRequestModalInst.hide();
        showToast('Đã gửi yêu cầu hủy đơn & hoàn tiền tới bộ phận kế toán', 'success');
        await loadOrders();
        viewOrderDetail(currentOrderId);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

const REFUND_STATUS_LABEL = {
    yeu_cau:      { text: 'Đã gửi yêu cầu hoàn tiền',      cls: 'bg-warning text-dark' },
    da_kiem_tra:  { text: 'Kế toán đang xử lý hoàn tiền',  cls: 'bg-info' },
    da_hoan_tien: { text: 'Đã hoàn tiền',                  cls: 'bg-success' },
    tu_choi:      { text: 'Yêu cầu hoàn tiền bị từ chối',  cls: 'bg-secondary' },
};

function renderRefundPanel(refund) {
    const status = REFUND_STATUS_LABEL[refund.trangThai] || { text: refund.trangThai, cls: 'bg-secondary' };
    const container = document.getElementById('order-refund-panel');
    if (!container) return;
    container.innerHTML = `
        <hr>
        <div class="d-flex align-items-center justify-content-between mb-2">
            <h6 class="fw-bold text-secondary small text-uppercase mb-0">Yêu cầu hoàn tiền</h6>
            <span class="badge ${status.cls}">${status.text}</span>
        </div>
        <div class="d-flex justify-content-between small text-muted mb-2">
            <span>Số tiền yêu cầu hoàn</span><strong class="text-danger">${formatPrice(refund.soTienHoan)}</strong>
        </div>
        <div class="border rounded-3 p-2 mb-2" id="order-chat-messages" style="height:180px;overflow-y:auto;background:#f8f9fa"></div>
        <div class="d-flex gap-2">
            <input type="file" id="order-chat-image-input" accept="image/*" class="d-none" onchange="sendOrderChatImage(this)">
            <button class="btn btn-outline-secondary" type="button" title="Gửi hình ảnh" onclick="document.getElementById('order-chat-image-input').click()">
                <i class="fa-solid fa-image"></i>
            </button>
            <input type="text" class="form-control" id="order-chat-input" placeholder="Nhắn tin cho kế toán..." maxlength="500"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();sendOrderChatMessage();}">
            <button class="btn btn-danger" onclick="sendOrderChatMessage()"><i class="fa-solid fa-paper-plane"></i></button>
        </div>`;
}

async function loadOrderChatMessages(orderId) {
    try {
        const res = await fetch(`${API}/orders/${orderId}/messages`);
        const messages = await res.json();
        renderOrderChatMessages(messages);
    } catch {
        // bỏ qua lỗi tải chat
    }
}

function escapeChatHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function renderOrderChatMessages(messages) {
    const box = document.getElementById('order-chat-messages');
    if (!box) return;
    if (!messages.length) {
        box.innerHTML = '<p class="text-muted small text-center mt-3">Chưa có tin nhắn nào</p>';
        return;
    }
    box.innerHTML = messages.map(m => `
        <div class="d-flex ${m.sender === 'customer' ? 'justify-content-end' : 'justify-content-start'} mb-2">
            <div class="px-2 py-2 rounded-3 small" style="max-width:75%;background:${m.sender === 'customer' ? '#dc3545' : '#e9ecef'};color:${m.sender === 'customer' ? '#fff' : '#1a1a2e'}">
                ${m.imageUrl ? `<img src="${m.imageUrl}" class="rounded-2 d-block" style="max-width:100%;max-height:200px;cursor:pointer" onclick="window.open(this.src,'_blank')">` : ''}
                ${m.text ? `<div${m.imageUrl ? ' class="mt-1"' : ''}>${escapeChatHtml(m.text)}</div>` : ''}
            </div>
        </div>`).join('');
    box.scrollTop = box.scrollHeight;
}

async function sendOrderChatImage(input) {
    const file = input.files[0];
    input.value = '';
    if (!file || !currentOrderId) return;
    try {
        const fd = new FormData();
        fd.append('image', file);
        const upRes = await fetch(`${API}/upload/chat-image`, { method: 'POST', body: fd });
        const upJson = await upRes.json();
        if (!upRes.ok) throw new Error(upJson.error || 'Tải ảnh thất bại');
        await fetch(`${API}/orders/${currentOrderId}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: 'customer', imageUrl: upJson.url }),
        });
        await loadOrderChatMessages(currentOrderId);
    } catch (err) {
        showToast(err.message || 'Gửi hình ảnh thất bại', 'danger');
    }
}

function startOrderChatPolling(orderId) {
    stopOrderChatPolling();
    orderChatPollTimer = setInterval(() => loadOrderChatMessages(orderId), 5000);
}

function stopOrderChatPolling() {
    if (orderChatPollTimer) { clearInterval(orderChatPollTimer); orderChatPollTimer = null; }
}

async function sendOrderChatMessage() {
    const input = document.getElementById('order-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !currentOrderId) return;
    input.value = '';
    try {
        await fetch(`${API}/orders/${currentOrderId}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: 'customer', text }),
        });
        await loadOrderChatMessages(currentOrderId);
    } catch {
        showToast('Gửi tin nhắn thất bại', 'danger');
    }
}

function renderOrderDetail(order) {
    document.getElementById('modal-order-date').textContent =
        `Đặt ngày ${formatDate(order.createdAt)}`;

    const payBadge = order.paymentStatus === 'paid'
        ? '<span class="badge bg-success">Đã thanh toán</span>'
        : '<span class="badge bg-warning text-dark">Chưa thanh toán</span>';

    const statusSteps = ['pending', 'confirmed', 'preparing', 'delivering', 'completed'];
    const displayStatus = (order.status === 'shipping') ? 'delivering' : order.status;
    const currentIdx  = statusSteps.indexOf(displayStatus);

    const stepLabels = {
        pending:    { icon: 'fa-clock',              label: 'Chờ xác nhận' },
        confirmed:  { icon: 'fa-circle-check',       label: 'Đã xác nhận' },
        preparing:  { icon: 'fa-fire-burner',        label: 'Đang chuẩn bị' },
        delivering: { icon: 'fa-motorcycle',         label: 'Đang giao' },
        completed:  { icon: 'fa-house-circle-check', label: 'Hoàn tất' },
    };

    const isCancelled = order.status === 'cancelled';
    const cancelReason = isCancelled && order.note
        ? order.note.replace('[HỦY] ', '').replace('[HỦY ĐƠN]', '').trim()
        : null;

    const progressHtml = isCancelled
        ? `<div class="alert alert-danger mb-3">
               <div class="fw-semibold"><i class="fa-solid fa-ban me-1"></i>Đơn hàng đã bị hủy</div>
               ${cancelReason ? `<div class="mt-1 small"><strong>Lý do:</strong> ${cancelReason}</div>` : ''}
           </div>`
        : `<div class="d-flex justify-content-between mb-4 position-relative">
               <div class="position-absolute top-50 start-0 end-0 translate-middle-y"
                    style="height:3px;background:#e9ecef;z-index:0;margin:0 28px"></div>
               <div class="position-absolute top-50 start-0 translate-middle-y"
                    style="height:3px;background:#dc3545;z-index:0;margin:0 28px;width:${currentIdx <= 0 ? 0 : Math.min(100, (currentIdx / (statusSteps.length - 1)) * 100)}%"></div>
               ${statusSteps.map((s, i) => {
                   const done   = i <= currentIdx;
                   const active = i === currentIdx;
                   const { icon, label } = stepLabels[s];
                   return `
                       <div class="text-center position-relative" style="z-index:1;min-width:56px">
                           <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1"
                                style="width:36px;height:36px;background:${done ? '#dc3545' : '#e9ecef'};border:2px solid ${done ? '#dc3545' : '#ced4da'}">
                               <i class="fa-solid ${icon}" style="font-size:14px;color:${done ? '#fff' : '#adb5bd'}"></i>
                           </div>
                           <div style="font-size:10px;color:${active ? '#dc3545' : done ? '#495057' : '#adb5bd'};font-weight:${active ? '700' : '400'}">${label}</div>
                       </div>`;
               }).join('')}
           </div>`;

    const itemsHtml = order.items.map(item => {
        const product = item.product || {};
        return `
            <div class="d-flex align-items-center gap-3 py-2 border-bottom">
                ${product.image ? `<img src="${product.image}" width="56" height="56"
                     class="rounded-3 object-fit-cover flex-shrink-0" alt="${product.name || ''}">` :
                  `<div class="rounded-3 bg-light d-flex align-items-center justify-content-center flex-shrink-0"
                        style="width:56px;height:56px">
                       <i class="fa-solid fa-utensils text-muted"></i>
                   </div>`}
                <div class="flex-grow-1">
                    <div class="fw-semibold">${product.name || 'Sản phẩm'}</div>
                    <div class="text-muted small">Đơn giá: ${formatPrice(item.price)}</div>
                </div>
                <div class="text-end">
                    <div class="text-muted small">x${item.quantity}</div>
                    <div class="fw-bold text-danger">${formatPrice(item.price * item.quantity)}</div>
                </div>
            </div>`;
    }).join('');

    const addr = order.shippingAddress;
    const addrText = addr?.street
        ? [addr.street, addr.state, addr.city, addr.country].filter(Boolean).join(', ')
        : 'Chưa có địa chỉ';

    document.getElementById('order-detail-body').innerHTML = `
        ${progressHtml}

        <h6 class="fw-bold mb-2 text-secondary small text-uppercase">Sản phẩm đã đặt</h6>
        <div class="mb-4">${itemsHtml}</div>

        <div class="row g-3">
            <div class="col-md-6">
                <h6 class="fw-bold mb-2 text-secondary small text-uppercase">Thanh toán</h6>
                <div class="p-3 rounded-3" style="background:#f8f9fa">
                    <div class="d-flex justify-content-between py-1">
                        <span class="text-muted">Tiền hàng</span>
                        <span>${formatPrice(order.items.reduce((s, i) => s + i.price * i.quantity, 0))}</span>
                    </div>
                    <div class="d-flex justify-content-between py-1">
                        <span class="text-muted">Phí giao hàng</span>
                        <span>15.000đ</span>
                    </div>
                    <div class="d-flex justify-content-between py-1 border-top mt-1 pt-2">
                        <strong>Tổng cộng</strong>
                        <strong class="text-danger">${formatPrice(order.totalPrice)}</strong>
                    </div>
                    <div class="mt-2">${payBadge}</div>
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold mb-2 text-secondary small text-uppercase">Địa chỉ giao hàng</h6>
                <div class="p-3 rounded-3" style="background:#f8f9fa">
                    <div class="small">
                        <i class="fa-solid fa-location-dot text-danger me-1"></i>${addrText}
                    </div>
                </div>
            </div>
        </div>

        ${order.status === 'pending' && order.paymentStatus === 'paid' ? `
            <div class="mt-3 text-end">
                <button class="btn btn-outline-danger btn-sm" onclick="openCancelRequestModal()">
                    <i class="fa-solid fa-ban me-1"></i>Hủy đơn &amp; yêu cầu hoàn tiền
                </button>
            </div>` : ''}

        <div id="order-refund-panel"></div>`;
}
