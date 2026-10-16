document.addEventListener('DOMContentLoaded', async () => {
    // Search bar
    const searchForm = document.getElementById('hero-search-form');
    const searchInput = document.getElementById('hero-search');
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = searchInput.value.trim();
            if (q) window.location.href = `product.html?search=${encodeURIComponent(q)}`;
        });
    }

    // Fetch products once, share across all sections
    const allProducts = await fetchAllProducts();

    loadFeatured(allProducts);
    loadRecommendations(allProducts);
    loadTopSelling(allProducts);
    await loadCategories();
    setupCategoryFilter();
});

async function fetchAllProducts() {
    try {
        const resp = await fetch(`${API}/products`);
        return await resp.json();
    } catch {
        return [];
    }
}

// Chuyển tên danh mục thành slug: "Do an nhanh" -> "do-an-nhanh"
function slugify(name) {
    if (!name) return '';
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

function loadFeatured(products) {
    const grid = document.getElementById('featured-products');
    if (!grid) return;

    try {
        const featured = products.slice(0, 20);

        if (!featured.length) {
            grid.innerHTML = '<div class="col-12 text-center text-muted py-5">Chưa có sản phẩm nào.</div>';
            return;
        }

        grid.innerHTML = featured.map(p => {
            const catSlug = slugify(p.category?.name || '');
            const rating  = p.rating || 0;

            // Rating stars (hiển thị trên ảnh)
            const starsHtml = rating > 0 ? `
                <div class="pc-rating">
                    ${Array.from({length:5},(_,i)=>
                        `<i class="fa-${i < Math.round(rating) ? 'solid':'regular'} fa-star"></i>`
                    ).join('')}
                    <span>${rating.toFixed(1)}</span>
                </div>` : '';

            // Badge góc trái ảnh
            const isHot = p.isHot || rating >= 4.5;
            const onSale = p.salePrice > 0;
            const badgeHtml = !p.inStock
                ? ''
                : onSale
                    ? '<span class="pc-badge-hot" style="background:#f59e0b">🏷️ SALE</span>'
                    : isHot
                        ? '<span class="pc-badge-hot">🔥 Hot</span>'
                        : '';

            // Overlay hết hàng
            const soldOutHtml = !p.inStock
                ? '<div class="pc-badge-soldout"><span>Hết hàng</span></div>'
                : '';

            // Giá hiển thị
            const priceHtml = onSale
                ? `<span class="pc-price">${formatPrice(p.salePrice)}</span>
                   <del class="text-muted small ms-1">${formatPrice(p.price)}</del>`
                : `<span class="pc-price">${formatPrice(p.price)}</span>`;

            return `
            <div class="col product-card-item" data-cat="${catSlug}">
                <a href="product-detail.html?id=${p._id}" class="card h-100 border-0 shadow-sm product-card">
                    <div class="pc-img-wrap">
                        <img src="${p.image || 'https://placehold.co/300x200?text=No+Image'}"
                             alt="${p.name}"
                             loading="lazy"
                             onerror="this.src='https://placehold.co/300x200?text=No+Image'">
                        ${badgeHtml}
                        ${starsHtml}
                        ${soldOutHtml}
                    </div>
                    <div class="pc-body">
                        <div class="pc-cat">${p.category?.name || ''}</div>
                        <div class="pc-name">${p.name}</div>
                        <div class="pc-desc">${p.description || ''}</div>
                        <div class="pc-footer">
                            ${priceHtml}
                            <button class="pc-add-btn"
                                    onclick="event.preventDefault();addToCart('${p._id}')"
                                    ${!p.inStock ? 'disabled' : ''}>
                                <i class="fa-solid fa-cart-plus"></i>Thêm
                            </button>
                        </div>
                    </div>
                </a>
            </div>`;
        }).join('');
    } catch {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-4">Không thể tải sản phẩm. Vui lòng kiểm tra server.</div>';
    }
}

async function loadCategories() {
    const nav = document.getElementById('category-nav');
    if (!nav) return;

    // Icon mặc định theo slug danh mục
    const iconMap = {
        'do-an-nhanh': 'fa-burger',
        'mon-viet': 'fa-bowl-food',
        'do-uong': 'fa-mug-hot',
        'com': 'fa-bowl-rice',
        'mi-bun': 'fa-wheat-awn',
        'banh': 'fa-bread-slice',
        'trang-miem': 'fa-ice-cream',
    };

    try {
        const resp = await fetch(`${API}/categories`);
        const cats = await resp.json();

        nav.innerHTML = cats.map(c => {
            const slug = slugify(c.name);
            const icon = iconMap[slug] || 'fa-utensils';
            return `
            <a href="product.html?category=${c._id}"
               class="text-decoration-none text-dark d-flex flex-column align-items-center gap-1"
               style="min-width:72px">
                <div class="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center"
                     style="width:56px;height:56px;">
                    <i class="fa-solid ${icon} text-danger fs-5"></i>
                </div>
                <small class="text-center fw-medium" style="font-size:11px;line-height:1.3">${c.name}</small>
            </a>`;
        }).join('');

        // Cập nhật navbar dropdown
        const navDropdown = document.getElementById('navbar-cat-dropdown');
        if (navDropdown) {
            if (cats.length) {
                navDropdown.innerHTML = cats.map(c => {
                    const slug = slugify(c.name);
                    const icon = iconMap[slug] || 'fa-utensils';
                    return `<li><a class="dropdown-item" href="product.html?category=${c._id}">
                        <i class="fa-solid ${icon} me-2 text-danger"></i>${c.name}
                    </a></li>`;
                }).join('');
            } else {
                navDropdown.innerHTML = '<li><span class="dropdown-item text-muted small">Chưa có danh mục.</span></li>';
            }
        }

        // Gán data-id cho sidebar items khớp với slug
        cats.forEach(c => {
            const slug = slugify(c.name);
            const item = document.querySelector(`.sidebar-items[data-cat="${slug}"]`);
            if (item) item.dataset.id = c._id;
        });
    } catch {
        const navDropdown = document.getElementById('navbar-cat-dropdown');
        if (navDropdown) {
            navDropdown.innerHTML = '<li><span class="dropdown-item text-muted small">Không thể tải danh mục.</span></li>';
        }
    }
}

function loadRecommendations(products) {
    const list = document.getElementById('recommend-list');
    if (!list) return;

    try {
        // Lấy sản phẩm còn hàng, sắp xếp theo rating giảm dần, lấy 10 đầu
        const picks = products
            .filter(p => p.inStock !== false)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 10);

        if (!picks.length) {
            list.innerHTML = '<p class="text-muted py-3">Chưa có gợi ý.</p>';
            return;
        }

        // Tỉ lệ giảm giá giả định: 10-25%
        const discountRates = [10, 12, 15, 18, 20, 22, 25];

        list.innerHTML = picks.map((p, idx) => {
            const discPct  = discountRates[idx % discountRates.length];
            const oldPrice = Math.round(p.price * 100 / (100 - discPct) / 1000) * 1000;
            const catName  = p.category?.name || '';
            const rating   = p.rating || 0;
            const imgSrc   = p.image || 'https://placehold.co/300x200?text=No+Image';
            const detailUrl = `product-detail.html?id=${p._id}`;

            return `
            <div class="rec-card" onclick="window.location.href='${detailUrl}'" style="cursor:pointer">
                <div class="rec-img-wrap">
                    <img src="${imgSrc}" alt="${p.name}" loading="lazy"
                         onerror="this.src='https://placehold.co/300x200?text=No+Image'">
                    <div class="rec-img-overlay"></div>
                    <span class="rec-discount">-${discPct}%</span>
                    <div class="rec-img-name">${p.name}</div>
                    ${rating >= 4.5 ? `<div class="pc-rating">
                        ${Array.from({length:5},(_,i)=>`<i class="fa-${i<Math.round(rating)?'solid':'regular'} fa-star"></i>`).join('')}
                        <span>${rating.toFixed(1)}</span>
                    </div>` : ''}
                </div>
                <div class="rec-body">
                    <div class="rec-cat">${catName}</div>
                    <div class="rec-price-row">
                        <span class="rec-price">${formatPrice(p.salePrice > 0 ? p.salePrice : p.price)}</span>
                        <span class="rec-price-old">${formatPrice(p.salePrice > 0 ? p.price : oldPrice)}</span>
                    </div>
                    <div class="rec-actions" onclick="event.stopPropagation()">
                        <a href="${detailUrl}" class="rec-btn-detail">Xem</a>
                        <button class="rec-btn-cart" onclick="addToCart('${p._id}')"
                                ${!p.inStock ? 'disabled' : ''}>
                            <i class="fa-solid fa-cart-plus"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        // Clone toàn bộ cards để tạo infinite scroll liền mạch
        list.innerHTML += list.innerHTML;

        // Điều chỉnh tốc độ theo độ rộng thực tế (80px/giây)
        requestAnimationFrame(() => {
            const halfWidth = list.scrollWidth / 2;
            const speed = 80; // px per second
            list.style.animationDuration = Math.max(15, halfWidth / speed) + 's';
        });
    } catch {
        list.innerHTML = '<p class="text-muted py-3">Không thể tải gợi ý. Vui lòng kiểm tra server.</p>';
    }
}

function loadTopSelling(products) {
    const list = document.getElementById('top-selling-list');
    if (!list) return;

    try {
        // Sắp xếp theo rating giảm dần, lấy top 6
        const top = products
            .filter(p => p.inStock !== false)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 6);

        if (!top.length) { list.innerHTML = ''; return; }

        const ranks = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'];
        const rankClass = ['r1','r2','r3','rn','rn','rn'];

        list.innerHTML = top.map((p, i) => `
            <a href="product-detail.html?id=${p._id}" class="top-item">
                <span class="top-rank ${rankClass[i]}">${ranks[i]}</span>
                <img class="top-img"
                     src="${p.image || 'https://placehold.co/80x80?text=?'}"
                     alt="${p.name}"
                     onerror="this.src='https://placehold.co/80x80?text=?'">
                <div class="top-info">
                    <div class="top-name">${p.name}</div>
                    <div class="top-price">
                        ${p.salePrice > 0
                            ? `${formatPrice(p.salePrice)} <del class="text-muted" style="font-size:11px">${formatPrice(p.price)}</del>`
                            : formatPrice(p.price)}
                    </div>
                </div>
            </a>`).join('');

        // Stagger entrance: mỗi item trượt vào với delay tăng dần
        list.querySelectorAll('.top-item').forEach((el, i) => {
            el.style.animationDelay = `${i * 0.1}s`;
            el.classList.add('top-item-enter');
        });

        // Spotlight tự động quét tuần tự qua từng item
        const spotItems = Array.from(list.querySelectorAll('.top-item'));
        let spotIdx = 0;
        setInterval(() => {
            spotItems.forEach(el => el.classList.remove('spotlight'));
            if (spotItems.length) {
                spotItems[spotIdx % spotItems.length].classList.add('spotlight');
                spotIdx++;
            }
        }, 2500);
    } catch {
        list.innerHTML = '';
    }
}

function setupCategoryFilter() {
    const buttons = document.querySelectorAll('.category-filter');
    const sidebarItems = document.querySelectorAll('.sidebar-items[data-cat]');

    function setActive(cat) {
        buttons.forEach(btn => {
            const active = btn.dataset.cat === cat;
            btn.classList.toggle('btn-danger', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('btn-outline-danger', !active);
        });
    }

    function filterProducts(cat) {
        document.querySelectorAll('.product-card-item').forEach(card => {
            card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
        });
        setActive(cat);
    }

    buttons.forEach(btn => btn.addEventListener('click', () => filterProducts(btn.dataset.cat)));
    sidebarItems.forEach(item => item.addEventListener('click', () => {
        const catId = item.dataset.id;
        if (catId) {
            // Có ID từ API → chuyển thẳng đến product.html lọc đúng danh mục
            window.location.href = `product.html?category=${catId}`;
        } else {
            // Fallback: filter tại chỗ
            filterProducts(item.dataset.cat);
        }
    }));
}
