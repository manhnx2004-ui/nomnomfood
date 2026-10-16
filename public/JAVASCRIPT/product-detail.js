document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { window.location.href = 'product.html'; return; }
    await loadProduct(id);
    await loadReviews(id);
    loadRelated(id);
});

async function loadProduct(id) {
    const section = document.getElementById('product-main');
    try {
        const resp = await fetch(`${API}/products/${id}`);
        if (!resp.ok) { window.location.href = 'product.html'; return; }
        const p = await resp.json();

        document.title = `${p.name} - NomNomFood`;

        const ratingVal = Math.round(p.rating || 0);
        const stars = Array.from({ length: 5 }, (_, i) =>
            `<i class="fa-${i < ratingVal ? 'solid' : 'regular'} fa-star text-warning"></i>`
        ).join('');

        section.innerHTML = `
            <div class="col-lg-6">
                <div class="position-relative rounded-4 overflow-hidden shadow" style="height:420px">
                    <img id="product-img" src="${p.image || 'https://placehold.co/600x420?text=No+Image'}"
                         alt="${p.name}" class="w-100 h-100"
                         style="object-fit:cover;transition:transform .4s ease"
                         onmouseover="this.style.transform='scale(1.05)'"
                         onmouseout="this.style.transform='scale(1)'">
                    ${!p.inStock ? `<div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                         style="background:rgba(0,0,0,.5)">
                        <span class="badge bg-secondary fs-5 px-4 py-2">Hết hàng</span>
                    </div>` : ''}
                    <span class="badge bg-danger position-absolute top-0 end-0 m-3 px-3 py-2">
                        ${p.category?.name || ''}
                    </span>
                </div>
            </div>

            <div class="col-lg-6">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-2">
                        <i class="fa-solid fa-tag me-1"></i>${p.category?.name || 'Món ăn'}
                    </span>
                    <span class="badge ${p.inStock ? 'bg-success' : 'bg-secondary'} bg-opacity-10
                                       ${p.inStock ? 'text-success' : 'text-secondary'} border px-3 py-2">
                        <i class="fa-solid fa-${p.inStock ? 'circle-check' : 'circle-xmark'} me-1"></i>
                        ${p.inStock ? 'Còn hàng' : 'Hết hàng'}
                    </span>
                </div>

                <h1 class="fs-2 fw-bold mb-1">${p.name}</h1>

                <div class="d-flex align-items-center gap-2 mb-3">
                    <div class="d-flex gap-1">${stars}</div>
                    ${ratingVal > 0
                        ? `<span class="text-muted small">${p.rating?.toFixed(1)}/5</span>`
                        : `<span class="text-muted small fst-italic">Chưa có đánh giá</span>`}
                </div>

                <p class="text-secondary lh-lg mb-4">${p.description || 'Chưa có mô tả cho món này.'}</p>

                <div class="bg-danger bg-opacity-10 rounded-4 p-3 mb-4 d-inline-block">
                    ${p.salePrice > 0
                        ? `<div>
                               <span class="fs-1 fw-bold text-danger">${formatPrice(p.salePrice)}</span>
                               <del class="text-muted fs-5 ms-2">${formatPrice(p.price)}</del>
                               <span class="badge bg-warning text-dark ms-2 fs-6"><i class="fa-solid fa-tag me-1"></i>SALE</span>
                           </div>`
                        : `<span class="fs-1 fw-bold text-danger">${formatPrice(p.price)}</span>`}
                    ${p.isHot ? '<div class="mt-1"><span class="badge bg-danger fs-6"><i class="fa-solid fa-fire me-1"></i>HOT hôm nay</span></div>' : ''}
                </div>

                <div class="d-flex align-items-center gap-3 mb-4">
                    <label class="fw-semibold mb-0">Số lượng:</label>
                    <div class="input-group" style="width:130px">
                        <button class="btn btn-outline-secondary" type="button" onclick="changeQty(-1)">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <input id="qty-input" type="number" class="form-control text-center fw-semibold"
                               value="1" min="1" max="99" ${!p.inStock ? 'disabled' : ''}>
                        <button class="btn btn-outline-secondary" type="button" onclick="changeQty(1)">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>

                <div class="d-flex gap-3 flex-wrap">
                    <button id="btn-add-cart" class="btn btn-danger btn-lg px-4"
                            onclick="handleAddCart('${p._id}')" ${!p.inStock ? 'disabled' : ''}>
                        <i class="fa-solid fa-cart-plus me-2"></i>Thêm vào giỏ
                    </button>
                    <button id="btn-buy-now" class="btn btn-outline-danger btn-lg px-4"
                            onclick="handleBuyNow('${p._id}')" ${!p.inStock ? 'disabled' : ''}>
                        <i class="fa-solid fa-bolt me-1"></i>Mua ngay
                    </button>
                </div>

                <div class="mt-4 pt-3 border-top d-flex gap-4 text-muted small">
                    <span><i class="fa-solid fa-truck me-1 text-success"></i>Giao nhanh 30 phút</span>
                    <span><i class="fa-solid fa-shield-halved me-1 text-primary"></i>Cam kết chất lượng</span>
                    <span><i class="fa-solid fa-rotate-left me-1 text-warning"></i>Đổi trả dễ dàng</span>
                </div>
            </div>`;
    } catch {
        section.innerHTML = `<div class="col-12 text-center py-5 text-danger">
            <i class="fa-solid fa-circle-exclamation fs-1 mb-3"></i>
            <p>Không tải được sản phẩm. <a href="product.html">Quay lại thực đơn</a></p></div>`;
    }
}

function changeQty(delta) {
    const input = document.getElementById('qty-input');
    if (!input) return;
    const val = Math.min(99, Math.max(1, (parseInt(input.value) || 1) + delta));
    input.value = val;
}

async function handleAddCart(productId) {
    const qty = parseInt(document.getElementById('qty-input')?.value) || 1;
    const btn = document.getElementById('btn-add-cart');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang thêm...';
    await addToCart(productId, qty);
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cart-plus me-2"></i>Thêm vào giỏ';
    }, 800);
}

async function handleBuyNow(productId) {
    const qty = parseInt(document.getElementById('qty-input')?.value) || 1;
    await addToCart(productId, qty);
    if (isLoggedIn()) window.location.href = 'checkout.html';
}

// ==================== Reviews ====================
async function loadReviews(productId) {
    const container = document.getElementById('reviews-container');
    try {
        const resp = await fetch(`${API}/reviews/product/${productId}`);
        const reviews = await resp.json();

        if (!reviews.length) {
            container.innerHTML = `<div class="text-center py-4 text-muted">
                <i class="fa-regular fa-comment-dots fs-2 mb-2"></i>
                <p class="fst-italic">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
            </div>`;
        } else {
            container.innerHTML = reviews.map(r => {
                const stars = Array.from({ length: 5 }, (_, i) =>
                    `<i class="fa-${i < r.rating ? 'solid' : 'regular'} fa-star text-warning small"></i>`
                ).join('');
                return `
                <div class="bg-white rounded-4 shadow-sm p-3 mb-3 border-start border-danger border-3">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div>
                            <strong>${r.user?.name || 'Khách hàng'}</strong>
                            <div class="d-flex gap-1 mt-1">${stars}</div>
                        </div>
                        <small class="text-muted">${formatDate(r.createdAt)}</small>
                    </div>
                    <p class="mb-0 text-secondary mt-2">${r.comment || ''}</p>
                </div>`;
            }).join('');
        }

        renderReviewForm(productId);
    } catch {
        container.innerHTML = '<p class="text-muted small">Không tải được đánh giá.</p>';
    }
}

function renderReviewForm(productId) {
    const formSection = document.getElementById('review-form-section');
    if (!formSection) return;

    if (!isLoggedIn()) {
        formSection.innerHTML = `
            <div class="bg-white rounded-4 shadow-sm p-4 text-center">
                <i class="fa-solid fa-lock text-muted fs-3 mb-2"></i>
                <p class="mb-2 text-muted">Đăng nhập để viết đánh giá</p>
                <a href="login.html" class="btn btn-outline-danger btn-sm">Đăng nhập</a>
            </div>`;
        return;
    }

    formSection.innerHTML = `
        <div class="bg-white rounded-4 shadow-sm p-4">
            <h6 class="fw-bold mb-3">Viết đánh giá của bạn</h6>
            <div class="mb-3">
                <label class="form-label fw-semibold">Đánh giá</label>
                <div class="d-flex gap-2" id="star-picker">
                    ${[1,2,3,4,5].map(n => `
                        <i class="fa-regular fa-star text-warning fs-4 cursor-pointer"
                           style="cursor:pointer" onclick="setRating(${n})" id="star-${n}"></i>`
                    ).join('')}
                </div>
                <input type="hidden" id="review-rating" value="0">
            </div>
            <div class="mb-3">
                <label class="form-label fw-semibold">Nhận xét</label>
                <textarea id="review-comment" class="form-control" rows="3"
                          placeholder="Chia sẻ trải nghiệm của bạn về món ăn này..."></textarea>
            </div>
            <button class="btn btn-danger px-4" onclick="submitReview('${productId}')">
                <i class="fa-solid fa-paper-plane me-1"></i>Gửi đánh giá
            </button>
        </div>`;
}

function setRating(n) {
    document.getElementById('review-rating').value = n;
    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`star-${i}`);
        star.className = `fa-${i <= n ? 'solid' : 'regular'} fa-star text-warning fs-4`;
    }
}

async function submitReview(productId) {
    const rating = parseInt(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value.trim();
    if (!rating) { showToast('Vui lòng chọn số sao đánh giá', 'warning'); return; }

    try {
        const res = await fetch(`${API}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: productId, user: getUserId(), rating, comment }),
        });
        if (!res.ok) throw new Error();
        showToast('Cảm ơn đánh giá của bạn!', 'success');
        await loadReviews(productId);
    } catch {
        showToast('Không gửi được đánh giá', 'danger');
    }
}

// ==================== Related products ====================
async function loadRelated(currentId) {
    const container = document.getElementById('related-container');
    if (!container) return;
    try {
        const res = await fetch(`${API}/products`);
        const all = await res.json();
        const related = all.filter(p => p._id !== currentId).slice(0, 4);
        if (!related.length) { container.closest('section')?.remove(); return; }

        container.innerHTML = related.map(p => `
            <div class="col-sm-6 col-lg-3">
                <a href="product-detail.html?id=${p._id}" class="card border-0 rounded-4 shadow-sm h-100 text-decoration-none text-dark hover-lift">
                    <img src="${p.image || 'https://placehold.co/300x200?text=N/A'}"
                         class="card-img-top rounded-top-4"
                         style="height:160px;object-fit:cover"
                         onerror="this.src='https://placehold.co/300x200?text=N/A'">
                    <div class="card-body p-3">
                        <div class="fw-semibold mb-1 text-truncate">${p.name}</div>
                        <span class="text-danger fw-bold">${formatPrice(p.salePrice > 0 ? p.salePrice : p.price)}</span>
                        ${p.salePrice > 0 ? `<del class="text-muted small ms-1">${formatPrice(p.price)}</del>` : ''}
                    </div>
                </a>
            </div>`).join('');
    } catch { /* silent */ }
}
