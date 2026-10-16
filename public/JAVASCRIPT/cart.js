let cartData = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        document.getElementById('cart-body').innerHTML = `
            <tr><td colspan="5" class="text-center py-5">
                <p class="text-muted mb-2">Vui long dang nhap de xem gio hang.</p>
                <a href="login.html" class="btn btn-danger btn-sm">Dang nhap ngay</a>
            </td></tr>`;
        updateSummary(0);
        return;
    }
    await loadCart();
});

async function loadCart() {
    const userId = getUserId();
    const tbody  = document.getElementById('cart-body');

    try {
        const resp = await fetch(`${API}/cart/${userId}`);

        if (!resp.ok) {
            showEmpty(tbody);
            updateSummary(0);
            return;
        }

        cartData = await resp.json();

        if (!cartData.items || cartData.items.length === 0) {
            showEmpty(tbody);
            updateSummary(0);
            return;
        }

        renderCart(tbody);
        recalc();

    } catch {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-danger">
            Loi tai gio hang. <a href="cart.html">Thu lai</a></td></tr>`;
    }
}

function showEmpty(tbody) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">
        <i class="fa-solid fa-cart-shopping fa-3x mb-3 opacity-25"></i>
        <p class="mb-2">Gio hang cua ban dang trong.</p>
        <a href="product.html" class="btn btn-danger btn-sm">Mua sam ngay</a>
    </td></tr>`;
}

function renderCart(tbody) {
    tbody.innerHTML = cartData.items.map(item => {
        const p = item.product;
        return `
        <tr id="row-${p._id}">
            <td class="ps-4">
                <div class="d-flex align-items-center gap-3">
                    <img src="${p.image}" width="72" class="rounded-3 object-fit-cover" alt="${p.name}" style="height:72px;">
                    <div>
                        <div class="fw-semibold">${p.name}</div>
                        <small class="text-muted">${p.category?.name || ''}</small>
                    </div>
                </div>
            </td>
            <td>${formatPrice(p.price)}</td>
            <td>
                <input type="number" class="form-control form-control-sm"
                       style="width:75px" value="${item.quantity}" min="1" max="99"
                       onchange="updateQty('${p._id}', this.value)">
            </td>
            <td><strong id="line-${p._id}">${formatPrice(p.price * item.quantity)}</strong></td>
            <td>
                <button class="btn btn-outline-danger btn-sm" onclick="removeItem('${p._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function recalc() {
    if (!cartData) return;
    const subtotal = cartData.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    updateSummary(subtotal);
}

function updateSummary(subtotal) {
    const ship  = subtotal > 0 ? 15000 : 0;
    document.getElementById('subtotal').textContent = formatPrice(subtotal);
    document.getElementById('shipping').textContent = formatPrice(ship);
    document.getElementById('total').textContent    = formatPrice(subtotal + ship);
}

async function updateQty(productId, rawVal) {
    const qty = Math.max(1, parseInt(rawVal) || 1);
    try {
        const resp = await fetch(`${API}/cart/${getUserId()}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: productId, quantity: qty }),
        });
        if (resp.ok) {
            const item = cartData.items.find(i => i.product._id === productId);
            if (item) {
                item.quantity = qty;
                const el = document.getElementById(`line-${productId}`);
                if (el) el.textContent = formatPrice(item.product.price * qty);
                recalc();
                updateCartBadge();
            }
        }
    } catch { showToast('Loi cap nhat so luong', 'danger'); }
}

async function removeItem(productId) {
    try {
        const resp = await fetch(`${API}/cart/${getUserId()}/${productId}`, { method: 'DELETE' });
        if (resp.ok) {
            cartData.items = cartData.items.filter(i => i.product._id !== productId);
            const row = document.getElementById(`row-${productId}`);
            if (row) row.remove();
            if (cartData.items.length === 0) {
                showEmpty(document.getElementById('cart-body'));
                updateSummary(0);
            } else {
                recalc();
            }
            updateCartBadge();
            showToast('Da xoa san pham', 'success');
        }
    } catch { showToast('Loi xoa san pham', 'danger'); }
}
