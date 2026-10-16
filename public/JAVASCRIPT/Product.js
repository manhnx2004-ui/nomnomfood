document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const search   = params.get('search') || '';
    const catId    = params.get('category') || '';

    if (search) document.getElementById('searchInput').value = search;

    await loadCategories(catId);
    await loadProducts(search, catId);

    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = document.getElementById('searchInput').value.trim();
        window.location.href = `product.html?search=${encodeURIComponent(q)}`;
    });
});

async function loadCategories(activeCatId) {
    const container = document.getElementById('category-filters');
    try {
        const resp = await fetch(`${API}/categories`);
        const cats = await resp.json();

        const allActive = !activeCatId ? 'btn-danger text-white' : 'btn-outline-danger';
        let html = `<button class="btn btn-sm btn-filter ${allActive}" onclick="filterCat('')">Tất cả</button>`;

        cats.forEach(c => {
            const active = activeCatId === c._id ? 'btn-danger text-white' : 'btn-outline-danger';
            html += `<button class="btn btn-sm btn-filter ${active}" onclick="filterCat('${c._id}')">${c.name}</button>`;
        });

        container.innerHTML = html;
    } catch {
        container.innerHTML = '';
    }
}

function filterCat(catId) {
    const search = document.getElementById('searchInput').value.trim();
    let url = 'product.html?';
    if (catId) url += `category=${catId}`;
    if (search) url += `${catId ? '&' : ''}search=${encodeURIComponent(search)}`;
    window.location.href = url;
}

async function loadProducts(search, catId) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = `<div class="col-12 text-center py-5">
        <div class="spinner-border text-danger"></div>
        <p class="text-muted mt-2 small">Đang tải...</p></div>`;

    try {
        let url = `${API}/products`;
        if (search) {
            url = `${API}/products/search/${encodeURIComponent(search)}`;
        } else if (catId) {
            url = `${API}/products?category=${catId}`;
        }

        const resp = await fetch(url);
        let products = await resp.json();

        // Search results may contain multiple categories; filter client-side only when searching + filtering
        if (search && catId) {
            products = products.filter(p => p.category && p.category._id === catId);
        }

        // Hiển thị kết quả tìm kiếm
        const resultInfo = document.getElementById('search-result-info');
        if (resultInfo) {
            if (search) {
                resultInfo.innerHTML = `<span class="text-muted small">Kết quả tìm kiếm cho <strong class="text-danger">"${search}"</strong>: ${products.length} sản phẩm</span>`;
                resultInfo.classList.remove('d-none');
            } else {
                resultInfo.classList.add('d-none');
            }
        }

        if (!products.length) {
            grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">
                <i class="fa-solid fa-bowl-food fa-3x mb-3 opacity-25"></i>
                <p>Không tìm thấy sản phẩm nào.</p>
                <a href="product.html" class="btn btn-outline-danger btn-sm">Xem tất cả</a></div>`;
            return;
        }

        grid.innerHTML = products.map(p => `
            <div class="col-12 col-sm-6 col-xl-4">
                <div class="card product-card h-100 shadow-sm">
                    <img src="${p.image || 'https://placehold.co/400x250?text=No+Image'}"
                         class="card-img-top" alt="${p.name}">
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-secondary align-self-start mb-2">${p.category?.name || ''}</span>
                        <h5 class="card-title mb-1">${p.name}</h5>
                        <p class="card-text text-secondary small mb-2 flex-grow-1">${p.description || ''}</p>
                        ${p.rating > 0
                            ? `<div class="text-warning small mb-2">
                                ${'&#9733;'.repeat(Math.round(p.rating))}${'&#9734;'.repeat(5 - Math.round(p.rating))}
                                <span class="text-muted ms-1">${p.rating}/5</span></div>`
                            : ''}
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                ${p.salePrice > 0
                                    ? `<span class="fw-bold text-danger fs-5">${formatPrice(p.salePrice)}</span>
                                       <del class="text-muted small ms-2">${formatPrice(p.price)}</del>
                                       <span class="badge bg-warning text-dark ms-1"><i class="fa-solid fa-tag me-1"></i>SALE</span>`
                                    : `<span class="fw-bold text-danger fs-5">${formatPrice(p.price)}</span>`}
                                ${p.isHot ? '<span class="badge bg-danger ms-1"><i class="fa-solid fa-fire me-1"></i>HOT</span>' : ''}
                            </div>
                            ${!p.inStock ? '<span class="badge bg-secondary">Hết hàng</span>' : ''}
                        </div>
                        <div class="d-flex gap-2">
                            <a href="product-detail.html?id=${p._id}"
                               class="btn btn-outline-danger btn-sm"
                               style="flex:0 0 auto;padding-left:14px;padding-right:14px">
                                <i class="fa-solid fa-eye me-1"></i>Chi tiết
                            </a>
                            ${p.inStock
                                ? `<button class="btn btn-danger btn-sm flex-fill"
                                           onclick="addToCart('${p._id}')">
                                       <i class="fa-solid fa-cart-plus me-1"></i>Thêm vào giỏ
                                   </button>`
                                : `<button class="btn btn-secondary btn-sm flex-fill" disabled>
                                       <i class="fa-solid fa-ban me-1"></i>Hết hàng
                                   </button>`}
                        </div>
                    </div>
                </div>
            </div>`).join('');

    } catch {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger">
            Lỗi tải sản phẩm. <a href="product.html" class="text-danger">Thử lại</a></div>`;
    }
}
