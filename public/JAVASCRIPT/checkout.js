let checkoutCart   = null;
let appliedCoupon  = null;
let pendingOrderData = null;
let qrModalInst    = null;
let storeBankAccount = null;


document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;

    qrModalInst = new bootstrap.Modal(document.getElementById('qrPaymentModal'));
    loadStoreBankAccount();

    const user = getUser();
    document.getElementById('checkout-name').value  = user.name  || '';
    document.getElementById('checkout-phone').value = user.phone || '';
    if (user.addresses && user.addresses[0]) {
        const a = user.addresses[0];
        document.getElementById('checkout-street').value   = a.street || '';
        document.getElementById('checkout-city').value     = a.city   || '';
        document.getElementById('checkout-district').value = a.state  || '';
    }

    await loadSummary();

    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
    document.getElementById('coupon-btn').addEventListener('click', applyCoupon);
    document.getElementById('coupon-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
    });
    document.getElementById('coupon-input').addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase();
    });
});

// ==================== Coupon ====================

function calcDiscount(subtotal, shipping) {
    if (!appliedCoupon) return { discount: 0, shipDiscount: 0 };
    return { discount: appliedCoupon.discount || 0, shipDiscount: 0 };
}

async function applyCoupon() {
    const code  = document.getElementById('coupon-input').value.trim().toUpperCase();
    const msgEl = document.getElementById('coupon-msg');
    const btn   = document.getElementById('coupon-btn');

    if (!code) {
        msgEl.innerHTML = '<span class="text-danger">Vui lòng nhập mã giảm giá.</span>';
        return;
    }

    const subtotal = checkoutCart?.items?.reduce((s, i) => s + i.product.price * i.quantity, 0) || 0;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const res = await fetch(`${API}/coupons/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, orderTotal: subtotal }),
        });
        const data = await res.json();
        if (!res.ok) {
            appliedCoupon = null;
            msgEl.innerHTML = `<span class="text-danger"><i class="fa-solid fa-circle-xmark me-1"></i>${data.error}</span>`;
            renderSummary();
            return;
        }
        appliedCoupon = { code: data.coupon.code, couponId: data.coupon._id, usedCount: data.coupon.usedCount, discount: data.discount, label: data.coupon.description || data.coupon.code };
        const discountLabel = data.coupon.type === 'percent'
            ? `Giảm ${data.coupon.value}% (${formatPrice(data.discount)})`
            : `Giảm ${formatPrice(data.discount)}`;
        msgEl.innerHTML = `<span class="text-success"><i class="fa-solid fa-circle-check me-1"></i>Áp dụng thành công: <strong>${discountLabel}</strong></span>`;
        renderSummary();
    } catch {
        appliedCoupon = null;
        msgEl.innerHTML = '<span class="text-danger">Lỗi khi kiểm tra mã giảm giá.</span>';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Áp dụng';
    }
}

// ==================== Summary ====================

function renderSummary() {
    if (!checkoutCart?.items?.length) return;
    const container = document.getElementById('order-summary');
    const subtotal  = checkoutCart.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const shipping  = 15000;
    const { discount, shipDiscount } = calcDiscount(subtotal, shipping);
    const total = subtotal + shipping - discount - shipDiscount;

    container.innerHTML = `
        <div class="mb-3">
            ${checkoutCart.items.map(i => `
                <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${i.product.image}" width="44" class="rounded-2 object-fit-cover"
                             style="height:44px" alt="${i.product.name}">
                        <div>
                            <div class="small fw-semibold">${i.product.name}</div>
                            <div class="text-muted small">x${i.quantity}</div>
                        </div>
                    </div>
                    <span class="small fw-semibold">${formatPrice(i.product.price * i.quantity)}</span>
                </div>`).join('')}
        </div>
        <div class="d-flex justify-content-between py-1">
            <span class="text-secondary">Tiền hàng</span>
            <strong>${formatPrice(subtotal)}</strong>
        </div>
        <div class="d-flex justify-content-between py-1">
            <span class="text-secondary">Phí giao hàng</span>
            <strong>${shipDiscount ? `<s class="text-muted me-1">${formatPrice(shipping)}</s><span class="text-success">Miễn phí</span>` : formatPrice(shipping)}</strong>
        </div>
        ${discount ? `
        <div class="d-flex justify-content-between py-1 text-success">
            <span><i class="fa-solid fa-tag me-1"></i>Giảm giá (${appliedCoupon.code})</span>
            <strong>- ${formatPrice(discount)}</strong>
        </div>` : ''}
        <div class="d-flex justify-content-between py-2 border-top mt-2">
            <strong class="fs-5">Tổng thanh toán</strong>
            <strong class="fs-5 text-danger">${formatPrice(Math.max(0, total))}</strong>
        </div>`;
}

async function loadSummary() {
    const container = document.getElementById('order-summary');
    const userId    = getUserId();
    try {
        const resp = await fetch(`${API}/cart/${userId}`);
        if (!resp.ok) { container.innerHTML = '<p class="text-muted">Giỏ hàng trống. <a href="product.html">Mua sắm ngay</a></p>'; return; }
        checkoutCart = await resp.json();
        if (!checkoutCart.items || !checkoutCart.items.length) {
            container.innerHTML = '<p class="text-muted">Giỏ hàng trống. <a href="product.html">Mua sắm ngay</a></p>';
            return;
        }
        renderSummary();
    } catch {
        container.innerHTML = '<p class="text-danger small">Lỗi tải giỏ hàng.</p>';
    }
}

// ==================== Checkout ====================

async function handleCheckout(e) {
    e.preventDefault();

    const errorDiv = document.getElementById('checkout-error');
    errorDiv.classList.add('d-none');

    if (!checkoutCart?.items?.length) {
        errorDiv.textContent = 'Giỏ hàng trống, không thể đặt hàng.';
        errorDiv.classList.remove('d-none');
        return;
    }

    const name   = document.getElementById('checkout-name').value.trim();
    const phone  = document.getElementById('checkout-phone').value.trim();
    const street = document.getElementById('checkout-street').value.trim();

    if (!name || !phone || !street) {
        errorDiv.textContent = 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.';
        errorDiv.classList.remove('d-none');
        return;
    }

    const user   = getUser();
    const method = document.querySelector('input[name="payment"]:checked')?.value || 'cash';
    const subtotal = checkoutCart.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const shipping = 15000;
    const { discount, shipDiscount } = calcDiscount(subtotal, shipping);
    const total = Math.max(0, subtotal + shipping - discount - shipDiscount);

    pendingOrderData = {
        user:    user._id,
        items:   checkoutCart.items.map(i => ({
            product:  i.product._id,
            quantity: i.quantity,
            price:    i.product.price,
        })),
        shippingAddress: {
            receiverName:  name,
            receiverPhone: phone,
            street:        street,
            city:          document.getElementById('checkout-city').value.trim(),
            state:         document.getElementById('checkout-district').value.trim(),
            postalCode:    '',
            country:       'Viet Nam',
        },
        totalPrice: total,
        note:       (document.getElementById('checkout-note')?.value || '').trim(),
        _method:    method,
    };

    if (method === 'cash') {
        await placeOrder('pending');
    } else {
        showQRModal(method, total);
    }
}

async function placeOrder(paymentStatus) {
    const btn = document.getElementById('checkout-btn');
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang xử lý...';

    const errorDiv = document.getElementById('checkout-error');
    const user     = getUser();

    try {
        const orderResp = await fetch(`${API}/orders`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                user:            pendingOrderData.user,
                items:           pendingOrderData.items,
                shippingAddress: pendingOrderData.shippingAddress,
                totalPrice:      pendingOrderData.totalPrice,
                note:            pendingOrderData.note,
                couponCode:      appliedCoupon?.code || '',
                status:          'pending',
                paymentStatus,
            }),
        });
        if (!orderResp.ok) {
            const err = await orderResp.json().catch(() => ({}));
            throw new Error(err.error || '');
        }
        const order = await orderResp.json();

        await fetch(`${API}/payments`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                order:  order._id,
                user:   user._id,
                amount: pendingOrderData.totalPrice,
                method: pendingOrderData._method,
                status: paymentStatus === 'paid' ? 'success' : 'pending',
            }),
        });

        for (const item of checkoutCart.items) {
            await fetch(`${API}/cart/${user._id}/${item.product._id}`, { method: 'DELETE' });
        }

        // Lượt dùng mã giảm giá được server tự cộng khi tạo đơn

        window.location.href = `orders.html?success=1&orderId=${order._id}`;
    } catch (e) {
        errorDiv.textContent = e?.message || 'Đặt hàng thất bại. Vui lòng thử lại.';
        errorDiv.classList.remove('d-none');
        btn.disabled  = false;
        btn.innerHTML = '<i class="fa-solid fa-check me-2"></i>Xác nhận và đặt hàng';
    }
}

// ==================== QR Modal ====================

const QR_CONFIG = {
    momo: {
        title:   '<i class="fa-solid fa-mobile-screen me-2" style="color:#d82d8b"></i>Thanh toán qua MoMo',
        accent:  '#d82d8b',
        icon:    `<div class="rounded-circle d-flex align-items-center justify-content-center"
                       style="width:48px;height:48px;background:#d82d8b;flex-shrink:0">
                      <i class="fa-solid fa-mobile-screen text-white fs-5"></i>
                  </div>`,
        label:   'Ví MoMo',
        info:    '<div class="small text-muted">Số điện thoại: <strong>0359 123 456</strong></div><div class="small text-muted">Tên TK: <strong>NOMNOMFOOD</strong></div>',
        qr:      (amt) => `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`2|99|0359123456|NomNomFood|0|0|0|${amt}|Thanh toan NomNomFood`)}`,
    },
    zalopay: {
        title:   '<i class="fa-solid fa-bolt me-2" style="color:#0068ff"></i>Thanh toán qua ZaloPay',
        accent:  '#0068ff',
        icon:    `<div class="rounded-circle d-flex align-items-center justify-content-center"
                       style="width:48px;height:48px;background:#0068ff;flex-shrink:0">
                      <i class="fa-solid fa-bolt text-white fs-5"></i>
                  </div>`,
        label:   'Ví ZaloPay',
        info:    '<div class="small text-muted">Số điện thoại: <strong>0359 123 456</strong></div><div class="small text-muted">Tên TK: <strong>NOMNOMFOOD</strong></div>',
        qr:      (amt) => `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`zalopay://transfer?amount=${amt}&description=Thanh+toan+NomNomFood&receiver=0359123456`)}`,
    },
    bank_transfer: {
        title:   '<i class="fa-solid fa-building-columns me-2 text-primary"></i>Chuyển khoản ngân hàng',
        accent:  '#0068b0',
        icon:    `<div class="rounded-circle d-flex align-items-center justify-content-center"
                       style="width:48px;height:48px;background:#0068b0;flex-shrink:0">
                      <span class="text-white fw-bold" style="font-size:13px">MB</span>
                  </div>`,
        label:   'MB Bank',
        info:    '<div class="small text-muted">Số tài khoản: <strong>0123 456 789</strong></div><div class="small text-muted">Chủ TK: <strong>NOMNOMFOOD</strong></div><div class="small text-muted">Chi nhánh: <strong>Hà Nội</strong></div>',
        qr:      (amt) => `https://img.vietqr.io/image/MB-0123456789-print.png?amount=${amt}&addInfo=Thanh+toan+NomNomFood&accountName=NOMNOMFOOD`,
    },
};

async function loadStoreBankAccount() {
    try {
        const res = await fetch(`${API}/acc/bank-accounts/public`);
        if (!res.ok) return;
        const accounts = await res.json();
        if (Array.isArray(accounts) && accounts.length) {
            storeBankAccount = accounts.find(a => a.isDefault) || accounts[0];
        }
    } catch {
        // Không tải được tài khoản ngân hàng cửa hàng, giữ QR mẫu mặc định
    }
}

function showQRModal(method, amount) {
    let cfg = QR_CONFIG[method];
    if (!cfg) return;

    if (method === 'bank_transfer' && storeBankAccount) {
        const { nganHangCode, tenNganHang, soTaiKhoan, chuTaiKhoan, chiNhanh } = storeBankAccount;
        cfg = {
            ...cfg,
            label: tenNganHang,
            info: `<div class="small text-muted">Số tài khoản: <strong>${soTaiKhoan}</strong></div><div class="small text-muted">Chủ TK: <strong>${chuTaiKhoan}</strong></div>${chiNhanh ? `<div class="small text-muted">Chi nhánh: <strong>${chiNhanh}</strong></div>` : ''}`,
            qr: (amt) => `https://img.vietqr.io/image/${nganHangCode}-${soTaiKhoan}-print.png?amount=${amt}&addInfo=${encodeURIComponent('Thanh toan NomNomFood')}&accountName=${encodeURIComponent(chuTaiKhoan)}`,
        };
    }

    document.getElementById('qr-modal-title').innerHTML = cfg.title;
    document.getElementById('qr-amount').textContent = formatPrice(amount);
    document.getElementById('qr-image').src = cfg.qr(amount);
    document.getElementById('qr-image').alt = `QR ${cfg.label}`;
    document.getElementById('qr-account-info').innerHTML = `
        <div class="d-flex align-items-center gap-3">
            ${cfg.icon}
            <div>
                <div class="fw-bold mb-1">${cfg.label}</div>
                ${cfg.info}
            </div>
        </div>`;

    qrModalInst.show();
}

async function confirmOnlinePayment() {
    qrModalInst.hide();
    await placeOrder('paid');
}

function cancelQRPayment() {
    qrModalInst.hide();
    const btn = document.getElementById('checkout-btn');
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-check me-2"></i>Xác nhận và đặt hàng';
}
