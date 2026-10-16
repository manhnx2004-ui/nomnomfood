let allProducts = [];
let allCategories = [];
let allOrders = [];
let allUsers = [];
let allTransactions = [];
let allDebts = [];
let allPayments = [];
let pnlData = null;
let productModalInst, categoryModalInst, userDetailModalInst, orderDetailModalInst;
let transactionModalInst, debtModalInst;
let isUploading = false;

let allPeriods = [], allCoa = [], allJournal = [], allLedger = [];
let allSalesInvoices = [], allRefunds = [], allChannels = [], allOrdersForAcc = [];
let allSuppliers = [], allReceipts = [], allPurchaseInvoices = [], allPayables = [];
let allWarehouses = [], allMaterials = [], allIssues = [], allRecipes = [], allProductsForAcc = [];
let allAssets = [], allDepreciation = [];
let allEmployees = [], allShifts = [], allPayroll = [];
let allBankAccounts = [];
let currentAccPeriod = null, currentStatementType = 'bang_can_doi_ke_toan';
let periodModalInst, periodDetailModalInst, coaDetailModalInst, coaModalInst, journalModalInst, refundModalInst, channelModalInst;
let supplierModalInst, receiptModalInst, purchaseInvoiceModalInst, warehouseModalInst;
let materialModalInst, issueModalInst, recipeModalInst, assetModalInst, employeeModalInst, shiftModalInst;
let bankAccountModalInst, refundDetailModalInst;
let currentRefundId = null, refundChatPollTimer = null;

const VIETQR_BANKS = [
    { code: 'MB',       name: 'MB Bank' },
    { code: 'VCB',      name: 'Vietcombank' },
    { code: 'TCB',      name: 'Techcombank' },
    { code: 'ACB',      name: 'ACB' },
    { code: 'VPB',      name: 'VPBank' },
    { code: 'BIDV',     name: 'BIDV' },
    { code: 'ICB',      name: 'VietinBank' },
    { code: 'STB',      name: 'Sacombank' },
    { code: 'TPB',      name: 'TPBank' },
    { code: 'VIB',      name: 'VIB' },
    { code: 'SHB',      name: 'SHB' },
    { code: 'HDB',      name: 'HDBank' },
    { code: 'OCB',      name: 'OCB' },
    { code: 'MSB',      name: 'MSB' },
    { code: 'SCB',      name: 'SCB' },
    { code: 'AGRIBANK', name: 'Agribank' },
];

document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('admin-name').textContent = user.name;
    productModalInst    = new bootstrap.Modal(document.getElementById('productModal'));
    categoryModalInst   = new bootstrap.Modal(document.getElementById('categoryModal'));
    userDetailModalInst = new bootstrap.Modal(document.getElementById('userDetailModal'));
    orderDetailModalInst = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    couponModalInst     = new bootstrap.Modal(document.getElementById('couponModal'));
    transactionModalInst = new bootstrap.Modal(document.getElementById('transactionModal'));
    debtModalInst        = new bootstrap.Modal(document.getElementById('debtModal'));
    periodModalInst          = new bootstrap.Modal(document.getElementById('periodModal'));
    periodDetailModalInst    = new bootstrap.Modal(document.getElementById('periodDetailModal'));
    coaDetailModalInst       = new bootstrap.Modal(document.getElementById('coaDetailModal'));
    coaModalInst             = new bootstrap.Modal(document.getElementById('coaModal'));
    journalModalInst         = new bootstrap.Modal(document.getElementById('journalModal'));
    refundModalInst          = new bootstrap.Modal(document.getElementById('refundModal'));
    channelModalInst         = new bootstrap.Modal(document.getElementById('channelModal'));
    supplierModalInst        = new bootstrap.Modal(document.getElementById('supplierModal'));
    receiptModalInst         = new bootstrap.Modal(document.getElementById('receiptModal'));
    purchaseInvoiceModalInst = new bootstrap.Modal(document.getElementById('purchaseInvoiceModal'));
    warehouseModalInst       = new bootstrap.Modal(document.getElementById('warehouseModal'));
    materialModalInst        = new bootstrap.Modal(document.getElementById('materialModal'));
    issueModalInst           = new bootstrap.Modal(document.getElementById('issueModal'));
    recipeModalInst          = new bootstrap.Modal(document.getElementById('recipeModal'));
    assetModalInst           = new bootstrap.Modal(document.getElementById('assetModal'));
    employeeModalInst        = new bootstrap.Modal(document.getElementById('employeeModal'));
    shiftModalInst           = new bootstrap.Modal(document.getElementById('shiftModal'));
    bankAccountModalInst     = new bootstrap.Modal(document.getElementById('bankAccountModal'));
    refundDetailModalInst    = new bootstrap.Modal(document.getElementById('refundDetailModal'));
    document.getElementById('refundDetailModal').addEventListener('hidden.bs.modal', stopRefundChatPolling);

    document.getElementById('p-image').addEventListener('input', function () {
        setImagePreview(this.value);
    });

    initAdmin();
});

// ==================== Image tab switch ====================
function switchImgTab(tab) {
    const isUrl = tab === 'url';
    document.getElementById('img-url-section').classList.toggle('d-none', !isUrl);
    document.getElementById('img-upload-section').classList.toggle('d-none', isUrl);
    document.getElementById('img-tab-url').classList.toggle('active', isUrl);
    document.getElementById('img-tab-upload').classList.toggle('active', !isUrl);
    if (!isUrl) {
        document.getElementById('p-image-file').value = '';
    }
}

function setImagePreview(url) {
    const preview = document.getElementById('p-image-preview');
    if (!url) { preview.innerHTML = ''; return; }
    preview.innerHTML = `
        <div class="position-relative d-inline-block">
            <img src="${url}" class="rounded-3 border" style="height:100px;max-width:180px;object-fit:cover"
                 onerror="this.src='https://placehold.co/100x100?text=Lỗi+ảnh'">
            <button type="button" onclick="clearProductImage()"
                    class="btn btn-danger btn-sm position-absolute top-0 end-0"
                    style="padding:2px 7px;font-size:11px;line-height:1.4;transform:translate(40%,-40%);border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"
                    title="Xóa ảnh">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>`;
}

function clearProductImage() {
    document.getElementById('p-image').value = '';
    document.getElementById('p-image-preview').innerHTML = '';
}

async function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        await uploadImageFile(input.files[0]);
    }
}

async function handleDrop(event) {
    event.preventDefault();
    document.getElementById('img-drop-zone').style.background = '#fff5f5';
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        await uploadImageFile(file);
    }
}

function setSaveButtonUploading(state) {
    const btn = document.querySelector('#productModal .btn-danger[onclick="saveProduct()"]');
    if (!btn) return;
    if (state) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang tải ảnh...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i>Lưu sản phẩm';
    }
}

async function uploadImageFile(file) {
    const progress = document.getElementById('upload-progress');
    const dropZone  = document.getElementById('img-drop-zone');
    isUploading = true;
    setSaveButtonUploading(true);
    progress.classList.remove('d-none');
    dropZone.style.pointerEvents = 'none';

    try {
        const form = new FormData();
        form.append('image', file);
        const res = await fetch(`${API}/upload/product-image`, { method: 'POST', body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload thất bại');
        const url = json.url;
        document.getElementById('p-image').value = url;
        setImagePreview(url);
        showToast('Tải ảnh lên thành công!', 'success');

        document.getElementById('p-image-file').value = '';
        dropZone.innerHTML = `
            <i class="fa-solid fa-circle-check text-success fs-3 mb-1"></i>
            <p class="mb-0 small text-success fw-semibold">Ảnh đã tải lên!</p>
            <p class="mb-0" style="font-size:11px;color:#888">${file.name}</p>
            <p class="mb-0 mt-1" style="font-size:11px;color:#dc3545;text-decoration:underline">Nhấn để chọn ảnh khác</p>`;
    } catch (err) {
        showToast(err.message || 'Lỗi khi tải ảnh lên', 'danger');
    } finally {
        isUploading = false;
        setSaveButtonUploading(false);
        progress.classList.add('d-none');
        dropZone.style.pointerEvents = '';
    }
}

async function initAdmin() {
    await Promise.all([loadProducts(), loadCategories(), loadOrders(), loadUsers()]);
    renderCategories();
    renderRecentOrders();
    renderRevenueHistory();
    setInterval(silentRefreshStats, 30000);
    refreshRefundBadge();
    setInterval(refreshRefundBadge, 30000);
}

// ==================== Tab navigation ====================
function showTab(name) {
    ['dashboard', 'products', 'categories', 'orders', 'accounts', 'revenue', 'coupons', 'reviews', 'reports', 'accounting'].forEach(t => {
        document.getElementById(`panel-${t}`).classList.add('d-none');
        document.getElementById(`tab-${t}`)?.classList.remove('active');
    });
    document.getElementById(`panel-${name}`).classList.remove('d-none');
    document.getElementById(`tab-${name}`)?.classList.add('active');
    if (name === 'revenue') renderRevenuePanel();
    if (name === 'coupons') loadCoupons();
    if (name === 'reviews') loadReviews();
    if (name === 'reports') initReportsTab();
    if (name === 'accounting') {
        initAccounting();
    }
}

// ==================== Products ====================
async function loadProducts() {
    try {
        const res = await fetch(`${API}/products`);
        allProducts = await res.json();
        renderProducts(allProducts);
        document.getElementById('stat-products').textContent = allProducts.length;
        document.getElementById('product-count').textContent = `${allProducts.length} sản phẩm`;
        refreshCategorySelect();
    } catch {
        showToast('Không tải được danh sách sản phẩm', 'danger');
    }
}

function renderProducts(list) {
    const tbody = document.getElementById('product-table-body');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Chưa có sản phẩm nào</td></tr>';
        return;
    }
    tbody.innerHTML = list.map((p, i) => `
        <tr>
            <td class="text-muted small">${i + 1}</td>
            <td>
                <img src="${p.image || 'https://placehold.co/48x48?text=N'}"
                     style="width:44px;height:44px;object-fit:cover;border-radius:8px"
                     onerror="this.src='https://placehold.co/48x48?text=N'">
            </td>
            <td>
                <div class="fw-semibold">${p.name}</div>
                <div class="text-muted small text-truncate" style="max-width:200px">${p.description || ''}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${p.category?.name || '—'}</span></td>
            <td>
                ${p.salePrice > 0
                    ? `<del class="text-muted small d-block">${formatPrice(p.price)}</del><span class="fw-bold text-danger">${formatPrice(p.salePrice)}</span>`
                    : `<span class="fw-semibold text-danger">${formatPrice(p.price)}</span>`}
            </td>
            <td>
                ${p.isHot ? '<span class="badge bg-danger me-1"><i class="fa-solid fa-fire me-1"></i>HOT</span>' : ''}
                ${p.salePrice > 0 ? '<span class="badge bg-warning text-dark"><i class="fa-solid fa-tag me-1"></i>SALE</span>' : ''}
                ${!p.isHot && !(p.salePrice > 0) ? '<span class="text-muted small">—</span>' : ''}
            </td>
            <td>
                <span class="badge ${p.inStock ? 'bg-success' : 'bg-secondary'}">
                    ${p.inStock ? 'Còn hàng' : 'Hết hàng'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="Sửa" onclick="editProduct('${p._id}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Xóa" onclick="deleteProduct('${p._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`).join('');
}

function filterProducts(q) {
    const lower = q.toLowerCase();
    renderProducts(allProducts.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        (p.category?.name || '').toLowerCase().includes(lower)
    ));
}

function refreshCategorySelect() {
    const sel = document.getElementById('p-category');
    const cur = sel.value;
    sel.innerHTML = '<option value="">Chọn danh mục</option>' +
        allCategories.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    sel.value = cur;
}

function openProductModal(product = null) {
    try {
        document.getElementById('product-modal-title').textContent = product ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
        document.getElementById('product-id').value = product?._id || '';
        document.getElementById('p-name').value = product?.name || '';
        document.getElementById('p-price').value = product?.price || '';
        document.getElementById('p-description').value = product?.description || '';
        document.getElementById('p-instock').value = product?.inStock !== false ? 'true' : 'false';
        document.getElementById('p-sale-price').value = product?.salePrice > 0 ? product.salePrice : '';
        document.getElementById('p-is-hot').checked = product?.isHot || false;
        document.getElementById('p-image').value = product?.image || '';

        // Gán category sau khi categories đã load
        const catSel = document.getElementById('p-category');
        catSel.innerHTML = '<option value="">Chọn danh mục</option>' +
            allCategories.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
        catSel.value = product?.category?._id || '';

        // Reset tab ảnh về URL
        switchImgTab('url');

        // Reset drop zone về trạng thái ban đầu
        const dz = document.getElementById('img-drop-zone');
        dz.innerHTML = `
            <i class="fa-solid fa-cloud-arrow-up text-danger fs-3 mb-2"></i>
            <p class="mb-1 text-muted small">Kéo thả ảnh vào đây hoặc <span class="text-danger fw-semibold">chọn file</span></p>
            <p class="text-muted" style="font-size:11px">JPG, PNG, WEBP, GIF — Tối đa 8MB</p>`;
        dz.style.pointerEvents = '';
        dz.style.background = '#fff5f5';
        document.getElementById('p-image-file').value = '';

        setImagePreview(product?.image || '');
        productModalInst.show();
    } catch (err) {
        console.error('openProductModal error:', err);
        showToast('Không thể mở form sản phẩm: ' + err.message, 'danger');
    }
}

function editProduct(id) {
    const p = allProducts.find(x => x._id === id);
    if (p) openProductModal(p);
}

async function saveProduct() {
    if (isUploading) { showToast('Vui lòng chờ ảnh tải lên xong', 'warning'); return; }
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('p-name').value.trim();
    const price = Number(document.getElementById('p-price').value);
    if (!name || !price) { showToast('Vui lòng nhập tên và giá sản phẩm', 'warning'); return; }

    const salePriceVal = Number(document.getElementById('p-sale-price').value);
    const data = {
        name,
        price,
        description: document.getElementById('p-description').value.trim(),
        category: document.getElementById('p-category').value || null,
        image: document.getElementById('p-image').value.trim(),
        inStock: document.getElementById('p-instock').value === 'true',
        salePrice: salePriceVal > 0 ? salePriceVal : 0,
        isHot: document.getElementById('p-is-hot').checked,
    };

    try {
        const res = await fetch(id ? `${API}/products/${id}` : `${API}/products`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || `Server trả về lỗi ${res.status}`);
        }
    } catch (err) {
        console.error('saveProduct error:', err);
        showToast('Lỗi khi lưu sản phẩm: ' + err.message, 'danger');
        return;
    }
    productModalInst.hide();
    showToast(id ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!', 'success');
    await loadProducts();
}

async function deleteProduct(id) {
    if (!confirm('Xác nhận xóa sản phẩm này?')) return;
    try {
        const res = await fetch(`${API}/products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa sản phẩm', 'success');
        await loadProducts();
    } catch {
        showToast('Lỗi khi xóa sản phẩm', 'danger');
    }
}

// ==================== Categories ====================
async function loadCategories() {
    try {
        const res = await fetch(`${API}/categories`);
        allCategories = await res.json();
        renderCategories();
        document.getElementById('stat-categories').textContent = allCategories.length;
        refreshCategorySelect();
    } catch {
        showToast('Không tải được danh mục', 'danger');
    }
}

function renderCategories() {
    const tbody = document.getElementById('category-table-body');
    if (!allCategories.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có danh mục nào</td></tr>';
        return;
    }
    tbody.innerHTML = allCategories.map((c, i) => {
        const count = allProducts.filter(p => p.category?._id === c._id || p.category === c._id).length;
        return `
        <tr>
            <td class="text-muted small">${i + 1}</td>
            <td class="fw-semibold">${c.name}</td>
            <td class="text-muted">${c.description || '—'}</td>
            <td><span class="badge bg-danger bg-opacity-10 text-danger">${count} sản phẩm</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="Sửa" onclick="editCategory('${c._id}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Xóa" onclick="deleteCategory('${c._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function openCategoryModal(cat = null) {
    document.getElementById('cat-modal-title').textContent = cat ? 'Sửa danh mục' : 'Thêm danh mục';
    document.getElementById('cat-id').value = cat?._id || '';
    document.getElementById('cat-name').value = cat?.name || '';
    document.getElementById('cat-description').value = cat?.description || '';
    categoryModalInst.show();
}

function editCategory(id) {
    const cat = allCategories.find(c => c._id === id);
    if (cat) openCategoryModal(cat);
}

async function saveCategory() {
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value.trim();
    if (!name) { showToast('Vui lòng nhập tên danh mục', 'warning'); return; }

    const data = {
        name,
        description: document.getElementById('cat-description').value.trim(),
    };

    try {
        const res = await fetch(id ? `${API}/categories/${id}` : `${API}/categories`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error();
        categoryModalInst.hide();
        showToast(id ? 'Cập nhật danh mục thành công!' : 'Thêm danh mục thành công!', 'success');
        await loadCategories();
    } catch {
        showToast('Lỗi khi lưu danh mục', 'danger');
    }
}

async function deleteCategory(id) {
    const count = allProducts.filter(p => p.category?._id === id || p.category === id).length;
    const msg = count > 0
        ? `Danh mục này đang có ${count} sản phẩm. Xác nhận xóa?`
        : 'Xác nhận xóa danh mục này?';
    if (!confirm(msg)) return;
    try {
        const res = await fetch(`${API}/categories/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa danh mục', 'success');
        await loadCategories();
    } catch {
        showToast('Lỗi khi xóa danh mục', 'danger');
    }
}

// ==================== Orders ====================
async function loadOrders() {
    try {
        const res = await fetch(`${API}/orders`);
        allOrders = await res.json();
        renderOrders(allOrders);
        document.getElementById('stat-orders').textContent = allOrders.length;
        document.getElementById('stat-completed').textContent =
            allOrders.filter(o => o.status === 'completed').length;
        updateRevenueStats();
        renderRevenueHistory();
    } catch {
        showToast('Không tải được đơn hàng', 'danger');
    }
}

function updateRevenueStats() {
    const today = new Date().toDateString();
    const todayDone = allOrders.filter(o =>
        o.status === 'completed' &&
        new Date(o.updatedAt || o.createdAt).toDateString() === today
    );
    const revenue = todayDone.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const pending = allOrders.filter(o => o.status === 'shipping' || o.status === 'delivering').length;

    const revEl  = document.getElementById('stat-revenue-today');
    const shipEl = document.getElementById('stat-shipping');
    if (revEl)  revEl.textContent  = formatPrice(revenue);
    if (shipEl) shipEl.textContent = pending + ' đơn';
}

function getOrderBuyer(o) {
    const name  = o.user?.name  || o.shippingAddress?.receiverName  || 'Khách hàng';
    const email = o.user?.email || '';
    const phone = o.user?.phone || o.shippingAddress?.receiverPhone || '';
    return { name, email, phone };
}

function renderOrders(list) {
    const tbody = document.getElementById('order-table-body');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Chưa có đơn hàng nào</td></tr>';
        return;
    }
    const statuses = ['pending', 'confirmed', 'preparing', 'delivering', 'shipping', 'completed', 'cancelled'];
    tbody.innerHTML = list.map((o, i) => '<tr>'
        + '<td class="text-muted small">' + (i + 1) + '</td>'
        + '<td><div class="fw-semibold">' + getOrderBuyer(o).name + '</div>'
        + '<div class="text-muted small">' + (getOrderBuyer(o).email || getOrderBuyer(o).phone || '') + '</div></td>'
        + '<td>' + (o.items || []).length + ' món</td>'
        + '<td class="fw-semibold text-danger">' + formatPrice(o.totalPrice || 0) + '</td>'
        + '<td><span class="badge ' + statusBadgeClass(o.status) + '">' + statusLabel(o.status) + '</span></td>'
        + '<td class="text-muted small">' + formatDate(o.createdAt) + '</td>'
        + '<td class="d-flex gap-1 align-items-center">'
        + '<select class="form-select form-select-sm" style="min-width:130px" onchange="updateOrderStatus(\'' + o._id + '\', this.value)">'
        + statuses.map(s => '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + statusLabel(s) + '</option>').join('')
        + '</select>'
        + '<button class="btn btn-sm btn-outline-secondary" title="Xem chi tiết" onclick="viewOrder(\'' + o._id + '\')">'
        + '<i class="fa-solid fa-eye"></i></button></td></tr>'
    ).join('');
}

function filterOrders(status) {
    renderOrders(status ? allOrders.filter(o => o.status === status) : allOrders);
}

async function updateOrderStatus(id, status, forceStock = false) {
    try {
        const res = await fetch(`${API}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, updatedAt: new Date(), forceStock, nguoiLap: getUser()?.name || '' }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 409 && json.shortages) {
            const list = json.shortages.map(s => `• ${s.tenNL}: cần ${s.can} ${s.donViTinh}, tồn ${s.ton}`).join('\n');
            if (confirm(`Kho không đủ nguyên liệu cho đơn này:\n${list}\n\nVẫn chuyển trạng thái? Tồn kho sẽ bị âm, cần nhập bổ sung hoặc kiểm kê.`)) return updateOrderStatus(id, status, true);
            if (typeof loadOrders === 'function') loadOrders();
            return;
        }
        if (!res.ok) throw new Error(json.error);
        if (json.stockIssue) showToast(`Đã xuất kho nguyên liệu ${json.stockIssue.soPhieu} (${formatPrice(json.stockIssue.tongTien)})`, 'info');
        const idx = allOrders.findIndex(o => o._id === id);
        if (idx !== -1) {
            allOrders[idx].status = status;
            allOrders[idx].updatedAt = new Date().toISOString();
        }
        document.getElementById('stat-completed').textContent =
            allOrders.filter(o => o.status === 'completed').length;
        updateRevenueStats();
        renderRevenueHistory();
        showToast('Cập nhật trạng thái thành công!', 'success');
    } catch {
        showToast('Lỗi khi cập nhật đơn hàng', 'danger');
    }
}

// ==================== Accounts ====================
async function loadUsers() {
    try {
        const res = await fetch(`${API}/users`);
        allUsers = await res.json();
        renderUserStats();
        renderUsers(allUsers);
        document.getElementById('user-count').textContent = `${allUsers.length} tài khoản`;
    } catch {
        showToast('Không tải được danh sách tài khoản', 'danger');
    }
}

function renderUserStats() {
    const total = allUsers.length;
    const locked = allUsers.filter(u => u.isLocked).length;
    const now = new Date();
    const newThisMonth = allUsers.filter(u => {
        const d = new Date(u.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    document.getElementById('stat-users-total').textContent = total;
    document.getElementById('stat-users-active').textContent = total - locked;
    document.getElementById('stat-users-locked').textContent = locked;
    document.getElementById('stat-users-new').textContent = newThisMonth;
}

function renderUsers(list) {
    const tbody = document.getElementById('user-table-body');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Không tìm thấy tài khoản nào</td></tr>';
        return;
    }
    tbody.innerHTML = list.map((u, i) => `
        <tr>
            <td class="text-muted small">${i + 1}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                         style="width:36px;height:36px;min-width:36px;background:${u.isLocked ? '#6c757d' : '#dc3545'};font-size:14px">
                        ${u.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="fw-semibold">${u.name}</div>
                </div>
            </td>
            <td class="text-muted small">${u.email}</td>
            <td class="text-muted small">${u.phone || '—'}</td>
            <td>
                ${u.isLocked
                    ? '<span class="badge bg-danger"><i class="fa-solid fa-lock me-1"></i>Đã khóa</span>'
                    : '<span class="badge bg-success"><i class="fa-solid fa-circle-check me-1"></i>Hoạt động</span>'
                }
            </td>
            <td class="text-muted small">${formatDate(u.createdAt)}</td>
            <td>
                <button class="btn btn-sm btn-outline-info me-1" title="Xem chi tiết" onclick="viewUser('${u._id}')">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn btn-sm ${u.isLocked ? 'btn-outline-success' : 'btn-outline-warning'} me-1"
                        title="${u.isLocked ? 'Mở khóa' : 'Khóa tài khoản'}"
                        onclick="toggleLockUser('${u._id}', ${u.isLocked})">
                    <i class="fa-solid ${u.isLocked ? 'fa-lock-open' : 'fa-lock'}"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Xóa tài khoản" onclick="deleteUser('${u._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`).join('');
}

function applyUserFilters() {
    const q = (document.getElementById('user-search').value || '').toLowerCase();
    const status = document.getElementById('user-filter-status').value;
    let filtered = allUsers;
    if (status === 'active') filtered = filtered.filter(u => !u.isLocked);
    if (status === 'locked') filtered = filtered.filter(u => u.isLocked);
    if (q) filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone || '').includes(q)
    );
    renderUsers(filtered);
}

function viewUser(id) {
    const u = allUsers.find(x => x._id === id);
    if (!u) return;

    const addressHtml = u.addresses && u.addresses.length
        ? u.addresses.map((a, i) => `
            <div class="small text-muted ms-1">
                ${i + 1}. ${[a.street, a.city, a.state, a.country].filter(Boolean).join(', ') || '—'}
            </div>`).join('')
        : '<span class="text-muted small">Chưa có địa chỉ</span>';

    document.getElementById('user-detail-body').innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-4">
            <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                 style="width:64px;height:64px;min-width:64px;font-size:24px;background:${u.isLocked ? '#6c757d' : '#dc3545'}">
                ${u.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <div class="fw-bold fs-5">${u.name}</div>
                <div class="text-muted small">${u.email}</div>
                <div class="mt-1">
                    ${u.isLocked
                        ? '<span class="badge bg-danger"><i class="fa-solid fa-lock me-1"></i>Tài khoản bị khóa</span>'
                        : '<span class="badge bg-success"><i class="fa-solid fa-circle-check me-1"></i>Đang hoạt động</span>'
                    }
                </div>
            </div>
        </div>
        <div class="row g-3">
            <div class="col-md-6">
                <div class="small text-secondary mb-1">Số điện thoại</div>
                <div>${u.phone || '—'}</div>
            </div>
            <div class="col-md-6">
                <div class="small text-secondary mb-1">Vai trò</div>
                <div><span class="badge bg-primary">${u.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</span></div>
            </div>
            <div class="col-md-6">
                <div class="small text-secondary mb-1">Ngày đăng ký</div>
                <div>${formatDate(u.createdAt)}</div>
            </div>
            <div class="col-md-6">
                <div class="small text-secondary mb-1">ID tài khoản</div>
                <div class="text-muted small font-monospace">${u._id}</div>
            </div>
            <div class="col-12">
                <div class="small text-secondary mb-1">Địa chỉ đã lưu</div>
                ${addressHtml}
            </div>
        </div>`;

    document.getElementById('user-detail-footer').innerHTML = `
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Đóng</button>
        <button type="button" class="btn ${u.isLocked ? 'btn-success' : 'btn-warning'}"
                onclick="toggleLockUser('${u._id}', ${u.isLocked}); userDetailModalInst.hide()">
            <i class="fa-solid ${u.isLocked ? 'fa-lock-open' : 'fa-lock'} me-1"></i>
            ${u.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        </button>
        <button type="button" class="btn btn-danger"
                onclick="deleteUser('${u._id}'); userDetailModalInst.hide()">
            <i class="fa-solid fa-trash me-1"></i>Xóa tài khoản
        </button>`;

    userDetailModalInst.show();
}

async function toggleLockUser(id, currentlyLocked) {
    const action = currentlyLocked ? 'mở khóa' : 'khóa';
    if (!confirm(`Xác nhận ${action} tài khoản này?`)) return;
    try {
        const res = await fetch(`${API}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isLocked: !currentlyLocked }),
        });
        if (!res.ok) throw new Error();
        showToast(`Đã ${action} tài khoản thành công!`, 'success');
        await loadUsers();
    } catch {
        showToast('Lỗi khi cập nhật tài khoản', 'danger');
    }
}

async function deleteUser(id) {
    if (!confirm('Xác nhận xóa tài khoản này? Hành động này không thể hoàn tác!')) return;
    try {
        const res = await fetch(`${API}/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa tài khoản thành công', 'success');
        await loadUsers();
    } catch {
        showToast('Lỗi khi xóa tài khoản', 'danger');
    }
}

// ==================== Silent refresh ====================
async function silentRefreshStats() {
    try {
        const res = await fetch(`${API}/orders`);
        allOrders = await res.json();
        document.getElementById('stat-orders').textContent = allOrders.length;
        document.getElementById('stat-completed').textContent =
            allOrders.filter(o => o.status === 'completed').length;
        updateRevenueStats();
        renderRevenueHistory();
        renderRecentOrders();
        if (!document.getElementById('panel-revenue').classList.contains('d-none')) {
            renderRevenuePanel();
        }
    } catch {}
}

// ==================== Dashboard ====================
function renderRecentOrders() {
    const container = document.getElementById('recent-orders-list');
    const recent = [...allOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6);

    if (!recent.length) {
        container.innerHTML = '<p class="text-muted fst-italic mb-0">Chưa có đơn hàng nào.</p>';
        return;
    }
    container.innerHTML = recent.map(o =>
        '<div class="d-flex align-items-center justify-content-between py-2 border-bottom"'
        + ' style="cursor:pointer" onclick="viewOrder(\'' + o._id + '\')" title="Xem chi tiết">'
        + '<div>'
        + '<span class="fw-semibold">' + getOrderBuyer(o).name + '</span>'
        + '<span class="text-muted ms-2 small">' + (o.items || []).length + ' món</span>'
        + '<span class="text-muted ms-2 small">' + formatDate(o.createdAt) + '</span>'
        + '</div>'
        + '<div class="d-flex align-items-center gap-2">'
        + '<span class="fw-semibold text-danger">' + formatPrice(o.totalPrice || 0) + '</span>'
        + '<span class="badge ' + statusBadgeClass(o.status) + '">' + statusLabel(o.status) + '</span>'
        + '</div></div>'
    ).join('');
}

// ==================== Revenue history ====================
function renderRevenueHistory() {
    const container = document.getElementById('revenue-history-list');
    const badge = document.getElementById('revenue-history-count');
    if (!container) return;

    const today = new Date().toDateString();
    const todayDone = allOrders
        .filter(o => o.status === 'completed' &&
            new Date(o.updatedAt || o.createdAt).toDateString() === today)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    if (badge) badge.textContent = todayDone.length + ' đơn';

    if (!todayDone.length) {
        container.innerHTML = '<p class="text-muted fst-italic mb-0 py-2">Chưa có đơn nào hoàn tất hôm nay.</p>';
        return;
    }

    const total = todayDone.reduce((s, o) => s + (o.totalPrice || 0), 0);

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center py-2 px-3 rounded-3 mb-3"
             style="background:rgba(25,135,84,.08)">
            <div class="text-success fw-semibold">
                <i class="fa-solid fa-circle-check me-1"></i>${todayDone.length} đơn hoàn tất
            </div>
            <div class="fw-bold text-success fs-5">${formatPrice(total)}</div>
        </div>
        ${todayDone.map(o => {
            const t = new Date(o.updatedAt || o.createdAt);
            const timeStr = t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const isPaid = o.paymentStatus === 'paid';
            return `<div class="d-flex align-items-center justify-content-between py-2 border-bottom"
                         style="cursor:pointer" onclick="viewOrder('${o._id}')" title="Xem chi tiết">
                <div class="d-flex align-items-center gap-3">
                    <span class="text-muted small" style="min-width:46px">${timeStr}</span>
                    <div>
                        <div class="fw-semibold">${getOrderBuyer(o).name}</div>
                        <div class="text-muted small">${(o.items || []).length} món ·
                            <span class="${isPaid ? 'text-info' : 'text-warning'}">${isPaid ? 'Online' : 'COD'}</span>
                        </div>
                    </div>
                </div>
                <span class="fw-semibold text-success">${formatPrice(o.totalPrice || 0)}</span>
            </div>`;
        }).join('')}`;
}

// ==================== Revenue Panel ====================
let revenueChartInstance = null;
let currentChartPeriod = 'day';
let currentTopPeriod = 'day';

function renderRevenuePanel() {
    const now = new Date();
    const completed = allOrders.filter(o => o.status === 'completed');

    const todayStr = now.toDateString();
    const revToday = completed
        .filter(o => new Date(o.updatedAt || o.createdAt).toDateString() === todayStr)
        .reduce((s, o) => s + (o.totalPrice || 0), 0);

    const revMonth = completed
        .filter(o => {
            const d = new Date(o.updatedAt || o.createdAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, o) => s + (o.totalPrice || 0), 0);

    const revYear = completed
        .filter(o => new Date(o.updatedAt || o.createdAt).getFullYear() === now.getFullYear())
        .reduce((s, o) => s + (o.totalPrice || 0), 0);

    document.getElementById('rev-today').textContent = formatPrice(revToday);
    document.getElementById('rev-month').textContent = formatPrice(revMonth);
    document.getElementById('rev-year').textContent = formatPrice(revYear);

    renderRevenueChart(currentChartPeriod);
    renderTopDishes(currentTopPeriod);
}

function getCompletedOrdersForPeriod(period) {
    const now = new Date();
    const completed = allOrders.filter(o => o.status === 'completed');

    if (period === 'day') {
        const todayStr = now.toDateString();
        return completed.filter(o => new Date(o.updatedAt || o.createdAt).toDateString() === todayStr);
    }
    if (period === 'week') {
        const dayOfWeek = now.getDay();
        const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysFromMon);
        startOfWeek.setHours(0, 0, 0, 0);
        return completed.filter(o => new Date(o.updatedAt || o.createdAt) >= startOfWeek);
    }
    // month
    return completed.filter(o => {
        const d = new Date(o.updatedAt || o.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
}

function switchRevenueChart(period) {
    currentChartPeriod = period;
    ['day', 'week', 'month'].forEach(p => {
        const btn = document.getElementById(`chart-btn-${p}`);
        if (!btn) return;
        btn.classList.toggle('btn-danger', p === period);
        btn.classList.toggle('btn-outline-danger', p !== period);
    });
    renderRevenueChart(period);
}

function switchTopDishes(period) {
    currentTopPeriod = period;
    ['day', 'week', 'month'].forEach(p => {
        const btn = document.getElementById(`top-btn-${p}`);
        if (!btn) return;
        btn.classList.toggle('btn-danger', p === period);
        btn.classList.toggle('btn-outline-danger', p !== period);
    });
    renderTopDishes(period);
}

function renderRevenueChart(period) {
    const now = new Date();
    const completed = allOrders.filter(o => o.status === 'completed');
    let labels = [], data = [], periodLabel = '';

    if (period === 'day') {
        periodLabel = `Hôm nay — ${now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}`;
        labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
        data = Array(24).fill(0);
        const todayStr = now.toDateString();
        completed.forEach(o => {
            const d = new Date(o.updatedAt || o.createdAt);
            if (d.toDateString() === todayStr) data[d.getHours()] += (o.totalPrice || 0);
        });
    } else if (period === 'week') {
        const dayOfWeek = now.getDay();
        const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysFromMon);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        periodLabel = `Tuần này — ${startOfWeek.toLocaleDateString('vi-VN')} đến ${endOfWeek.toLocaleDateString('vi-VN')}`;
        const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        labels = dayNames;
        data = Array(7).fill(0);
        completed.forEach(o => {
            const d = new Date(o.updatedAt || o.createdAt);
            const diff = Math.floor((d - startOfWeek) / 86400000);
            if (diff >= 0 && diff < 7) data[diff] += (o.totalPrice || 0);
        });
    } else {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        periodLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
        labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
        data = Array(daysInMonth).fill(0);
        completed.forEach(o => {
            const d = new Date(o.updatedAt || o.createdAt);
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                data[d.getDate() - 1] += (o.totalPrice || 0);
            }
        });
    }

    const labelEl = document.getElementById('chart-period-label');
    if (labelEl) labelEl.textContent = periodLabel;

    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Doanh thu',
                data,
                backgroundColor: 'rgba(220,53,69,0.75)',
                borderColor: 'rgba(220,53,69,1)',
                borderWidth: 1,
                borderRadius: 5,
                hoverBackgroundColor: 'rgba(220,53,69,0.95)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => '  ' + formatPrice(ctx.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,.05)' },
                    ticks: {
                        callback: val => {
                            if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                            if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                            return val;
                        }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderTopDishes(period) {
    const orders = getCompletedOrdersForPeriod(period);
    const dishMap = {};

    orders.forEach(o => {
        (o.items || []).forEach(item => {
            const name = item.product?.name || 'Không rõ';
            const image = item.product?.image || '';
            if (!dishMap[name]) dishMap[name] = { name, image, qty: 0, revenue: 0 };
            dishMap[name].qty += (item.quantity || 0);
            dishMap[name].revenue += (item.price || 0) * (item.quantity || 0);
        });
    });

    const sorted = Object.values(dishMap).sort((a, b) => b.qty - a.qty).slice(0, 10);
    const container = document.getElementById('top-dishes-list');
    if (!container) return;

    if (!sorted.length) {
        container.innerHTML = '<p class="text-muted fst-italic py-2">Chưa có dữ liệu bán hàng cho kỳ này.</p>';
        return;
    }

    const maxQty = sorted[0].qty;
    container.innerHTML = sorted.map((d, i) => `
        <div class="d-flex align-items-center gap-3 py-2 ${i < sorted.length - 1 ? 'border-bottom' : ''}">
            <div class="fw-bold text-muted text-center" style="min-width:24px;font-size:.85rem">${i + 1}</div>
            ${d.image
                ? `<img src="${d.image}" style="width:42px;height:42px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.style.display='none'">`
                : `<div style="width:42px;height:42px;flex-shrink:0;border-radius:8px;background:#f1f3f5;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-utensils text-muted"></i></div>`
            }
            <div class="flex-grow-1 min-width-0">
                <div class="fw-semibold text-truncate">${d.name}</div>
                <div class="progress mt-1" style="height:5px;border-radius:3px">
                    <div class="progress-bar bg-danger" style="width:${Math.round((d.qty / maxQty) * 100)}%;border-radius:3px"></div>
                </div>
            </div>
            <div class="text-end" style="flex-shrink:0">
                <div class="fw-bold text-danger">${d.qty} phần</div>
                <div class="text-muted small">${formatPrice(d.revenue)}</div>
            </div>
        </div>`).join('');
}

// ==================== Order detail ====================
function viewOrder(id) {
    const o = allOrders.find(x => x._id === id);
    if (!o) return;

    const addr = o.shippingAddress || {};
    const addrStr = [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ') || '—';
    const isPaid = o.paymentStatus === 'paid';
    const completedAt = o.status === 'completed'
        ? `<div class="col-md-6">
               <div class="small text-secondary mb-1">Hoàn tất lúc</div>
               <div>${new Date(o.updatedAt).toLocaleString('vi-VN')}</div>
           </div>`
        : '';

    const itemsHtml = (o.items || []).map(item => {
        const p = item.product || {};
        return `<div class="d-flex justify-content-between align-items-center py-1 border-bottom">
            <div class="d-flex align-items-center gap-2">
                ${p.image ? `<img src="${p.image}" style="width:36px;height:36px;object-fit:cover;border-radius:6px"
                                   onerror="this.style.display='none'">` : ''}
                <div>
                    <div class="fw-semibold small">${p.name || 'Sản phẩm'}</div>
                    <div class="text-muted" style="font-size:.75rem">${formatPrice(item.price)} × ${item.quantity}</div>
                </div>
            </div>
            <span class="fw-semibold text-danger small">${formatPrice(item.price * item.quantity)}</span>
        </div>`;
    }).join('');

    document.getElementById('order-detail-body').innerHTML = `
        <div class="d-flex align-items-center justify-content-between gap-2 mb-3">
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="fw-bold font-monospace text-secondary">#${o._id.slice(-6).toUpperCase()}</span>
                <span class="badge ${statusBadgeClass(o.status)} ms-1">${statusLabel(o.status)}</span>
                <span class="badge ${isPaid ? 'bg-info' : 'bg-warning text-dark'} ms-1">
                    ${isPaid ? 'Đã thanh toán online' : 'COD - Thu tiền mặt'}
                </span>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="printInvoice('${o._id}')">
                <i class="fa-solid fa-print me-1"></i>In hóa đơn
            </button>
        </div>
        <div class="row g-3 mb-3">
            <div class="col-md-6">
                <div class="small text-secondary mb-1">Khách hàng</div>
                <div class="fw-semibold">${getOrderBuyer(o).name}</div>
                ${getOrderBuyer(o).email ? '<div class="text-muted small">' + getOrderBuyer(o).email + '</div>' : ''}
                ${getOrderBuyer(o).phone ? '<div class="text-muted small"><i class="fa-solid fa-phone me-1"></i>' + getOrderBuyer(o).phone + '</div>' : ''}
            </div>
            <div class="col-md-6">
                <div class="small text-secondary mb-1">Địa chỉ giao hàng</div>
                <div>${addrStr}</div>
            </div>
            <div class="col-md-6">
                <div class="small text-secondary mb-1">Ngày đặt</div>
                <div>${new Date(o.createdAt).toLocaleString('vi-VN')}</div>
            </div>
            ${completedAt}
            ${o.note ? `<div class="col-12">
                <div class="small text-secondary mb-1">Ghi chú</div>
                <div class="text-muted fst-italic">${o.note}</div>
            </div>` : ''}
        </div>
        <div class="mb-3">
            <div class="small text-secondary mb-2 fw-semibold">Danh sách món (${(o.items || []).length} món)</div>
            ${itemsHtml}
        </div>
        <div class="d-flex justify-content-between align-items-center pt-2 border-top">
            <span class="fw-bold">Tổng cộng</span>
            <span class="fw-bold text-danger fs-5">${formatPrice(o.totalPrice || 0)}</span>
        </div>`;

    orderDetailModalInst.show();
}

// ==================== Coupons ====================
let allCoupons = [];
let couponModalInst;

async function loadCoupons() {
    try {
        const res = await fetch(`${API}/coupons`);
        allCoupons = await res.json();
        renderCoupons();
    } catch {
        showToast('Không tải được danh sách mã giảm giá', 'danger');
    }
}

function renderCoupons() {
    const tbody = document.getElementById('coupon-table-body');
    const total = allCoupons.length;
    const active = allCoupons.filter(c => c.isActive).length;
    const used = allCoupons.reduce((s, c) => s + (c.usedCount || 0), 0);

    document.getElementById('stat-coupons-total').textContent = total;
    document.getElementById('stat-coupons-active').textContent = active;
    document.getElementById('stat-coupons-used').textContent = used;

    if (!total) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Chưa có mã giảm giá nào</td></tr>';
        return;
    }

    tbody.innerHTML = allCoupons.map((c, i) => {
        const expired = c.expiresAt && new Date() > new Date(c.expiresAt);
        const exhausted = c.usageLimit > 0 && c.usedCount >= c.usageLimit;
        const statusBadge = !c.isActive
            ? '<span class="badge bg-secondary">Vô hiệu</span>'
            : expired
            ? '<span class="badge bg-danger">Hết hạn</span>'
            : exhausted
            ? '<span class="badge bg-warning text-dark">Hết lượt</span>'
            : '<span class="badge bg-success">Hoạt động</span>';

        const valueStr = c.type === 'percent'
            ? `${c.value}%${c.maxDiscount > 0 ? ` (tối đa ${formatPrice(c.maxDiscount)})` : ''}`
            : formatPrice(c.value);

        const expiryStr = c.expiresAt
            ? `<span class="${expired ? 'text-danger' : 'text-muted'} small">${new Date(c.expiresAt).toLocaleDateString('vi-VN')}</span>`
            : '<span class="text-muted small">—</span>';

        const usageStr = c.usageLimit > 0 ? `${c.usedCount}/${c.usageLimit}` : `${c.usedCount}/∞`;

        return `<tr>
            <td class="text-muted small">${i + 1}</td>
            <td><span class="font-monospace fw-bold text-danger">${c.code}</span>
                ${c.description ? `<div class="text-muted small">${c.description}</div>` : ''}
            </td>
            <td><span class="badge ${c.type === 'percent' ? 'bg-info' : 'bg-primary'} bg-opacity-75">${c.type === 'percent' ? 'Phần trăm' : 'Cố định'}</span></td>
            <td class="fw-semibold">${valueStr}</td>
            <td class="text-muted small">${c.minOrder > 0 ? formatPrice(c.minOrder) : '—'}</td>
            <td class="text-muted small">${usageStr}</td>
            <td>${expiryStr}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="Sửa" onclick="editCoupon('${c._id}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-sm ${c.isActive ? 'btn-outline-warning' : 'btn-outline-success'} me-1"
                        title="${c.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}"
                        onclick="toggleCoupon('${c._id}', ${c.isActive})">
                    <i class="fa-solid ${c.isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Xóa" onclick="deleteCoupon('${c._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function openCouponModal(coupon = null) {
    document.getElementById('coupon-modal-title').textContent = coupon ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá';
    document.getElementById('coupon-id').value = coupon?._id || '';
    document.getElementById('c-code').value = coupon?.code || '';
    document.getElementById('c-description').value = coupon?.description || '';
    document.getElementById('c-type').value = coupon?.type || 'percent';
    document.getElementById('c-value').value = coupon?.value || '';
    document.getElementById('c-min-order').value = coupon?.minOrder || '';
    document.getElementById('c-max-discount').value = coupon?.maxDiscount || '';
    document.getElementById('c-usage-limit').value = coupon?.usageLimit || '';
    document.getElementById('c-expires-at').value = coupon?.expiresAt
        ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '';
    document.getElementById('c-is-active').checked = coupon ? coupon.isActive : true;
    updateCouponTypeHint();
    couponModalInst.show();
}

function updateCouponTypeHint() {
    const type = document.getElementById('c-type').value;
    const hint = document.getElementById('c-value-hint');
    const maxRow = document.getElementById('c-max-discount-row');
    if (type === 'percent') {
        hint.textContent = 'Nhập số % (ví dụ: 10 = 10%)';
        maxRow.classList.remove('d-none');
    } else {
        hint.textContent = 'Nhập số tiền giảm (VNĐ)';
        maxRow.classList.add('d-none');
    }
}

function editCoupon(id) {
    const c = allCoupons.find(x => x._id === id);
    if (c) openCouponModal(c);
}

async function saveCoupon() {
    const id = document.getElementById('coupon-id').value;
    const code = document.getElementById('c-code').value.trim().toUpperCase();
    const value = Number(document.getElementById('c-value').value);
    const type = document.getElementById('c-type').value;

    if (!code) { showToast('Vui lòng nhập mã giảm giá', 'warning'); return; }
    if (!value || value <= 0) { showToast('Vui lòng nhập giá trị giảm hợp lệ', 'warning'); return; }
    if (type === 'percent' && value > 100) { showToast('Phần trăm không thể lớn hơn 100', 'warning'); return; }

    const expiresAt = document.getElementById('c-expires-at').value;
    const data = {
        code,
        description: document.getElementById('c-description').value.trim(),
        type,
        value,
        minOrder: Number(document.getElementById('c-min-order').value) || 0,
        maxDiscount: Number(document.getElementById('c-max-discount').value) || 0,
        usageLimit: Number(document.getElementById('c-usage-limit').value) || 0,
        expiresAt: expiresAt || null,
        isActive: document.getElementById('c-is-active').checked,
    };

    try {
        const res = await fetch(id ? `${API}/coupons/${id}` : `${API}/coupons`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Lỗi lưu mã giảm giá');
        }
        couponModalInst.hide();
        showToast(id ? 'Cập nhật mã giảm giá thành công!' : 'Tạo mã giảm giá thành công!', 'success');
        await loadCoupons();
    } catch (err) {
        showToast(err.message || 'Lỗi khi lưu mã giảm giá', 'danger');
    }
}

async function toggleCoupon(id, currentActive) {
    try {
        const res = await fetch(`${API}/coupons/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !currentActive }),
        });
        if (!res.ok) throw new Error();
        showToast(currentActive ? 'Đã vô hiệu hóa mã giảm giá' : 'Đã kích hoạt mã giảm giá', 'success');
        await loadCoupons();
    } catch {
        showToast('Lỗi khi cập nhật mã giảm giá', 'danger');
    }
}

async function deleteCoupon(id) {
    if (!confirm('Xác nhận xóa mã giảm giá này?')) return;
    try {
        const res = await fetch(`${API}/coupons/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa mã giảm giá', 'success');
        await loadCoupons();
    } catch {
        showToast('Lỗi khi xóa mã giảm giá', 'danger');
    }
}

// ==================== Reviews ====================
let allReviews = [];

async function loadReviews() {
    try {
        const res = await fetch(`${API}/reviews`);
        allReviews = await res.json();
        renderReviews();
    } catch {
        showToast('Không tải được danh sách đánh giá', 'danger');
    }
}

function filterReviews() {
    renderReviews();
}

function renderReviews() {
    const statusFilter = document.getElementById('review-filter-status').value;
    const ratingFilter = document.getElementById('review-filter-rating').value;

    let filtered = allReviews;
    if (statusFilter) filtered = filtered.filter(r => r.status === statusFilter);
    if (ratingFilter) filtered = filtered.filter(r => r.rating === Number(ratingFilter));

    const total = allReviews.length;
    const pending = allReviews.filter(r => r.status === 'pending').length;
    const approved = allReviews.filter(r => r.status === 'approved').length;
    const rejected = allReviews.filter(r => r.status === 'rejected').length;

    document.getElementById('stat-reviews-total').textContent = total;
    document.getElementById('stat-reviews-pending').textContent = pending;
    document.getElementById('stat-reviews-approved').textContent = approved;
    document.getElementById('stat-reviews-rejected').textContent = rejected;

    const tbody = document.getElementById('review-table-body');
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Không có đánh giá nào</td></tr>';
        return;
    }

    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    const starColor = n => n >= 4 ? '#f59e0b' : n === 3 ? '#64748b' : '#ef4444';

    tbody.innerHTML = filtered.map((r, i) => {
        const statusBadge = {
            approved: '<span class="badge bg-success">Đã duyệt</span>',
            pending:  '<span class="badge bg-warning text-dark">Chờ duyệt</span>',
            rejected: '<span class="badge bg-secondary">Đã ẩn</span>',
        }[r.status] || '<span class="badge bg-secondary">—</span>';

        const actions = r.status !== 'approved'
            ? `<button class="btn btn-sm btn-outline-success me-1" title="Duyệt" onclick="setReviewStatus('${r._id}','approved')">
                   <i class="fa-solid fa-check"></i>
               </button>` : '';
        const hideBtn = r.status !== 'rejected'
            ? `<button class="btn btn-sm btn-outline-secondary me-1" title="Ẩn" onclick="setReviewStatus('${r._id}','rejected')">
                   <i class="fa-solid fa-eye-slash"></i>
               </button>` : '';

        return `<tr>
            <td class="text-muted small">${i + 1}</td>
            <td>
                <div class="fw-semibold">${r.user?.name || '—'}</div>
                <div class="text-muted small">${r.user?.email || ''}</div>
            </td>
            <td class="small">${r.product?.name || '—'}</td>
            <td style="color:${starColor(r.rating)};font-size:1.05rem;letter-spacing:1px">${stars(r.rating)}</td>
            <td class="small text-muted" style="max-width:220px">
                <div class="text-truncate" title="${(r.comment || '').replace(/"/g, '&quot;')}">${r.comment || '<em>Không có nội dung</em>'}</div>
            </td>
            <td class="text-muted small">${formatDate(r.createdAt)}</td>
            <td>${statusBadge}</td>
            <td>
                ${actions}${hideBtn}
                <button class="btn btn-sm btn-outline-danger" title="Xóa" onclick="deleteReview('${r._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function setReviewStatus(id, status) {
    try {
        const res = await fetch(`${API}/reviews/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
        const label = { approved: 'duyệt', rejected: 'ẩn' }[status] || status;
        showToast(`Đã ${label} đánh giá thành công!`, 'success');
        await loadReviews();
    } catch {
        showToast('Lỗi khi cập nhật đánh giá', 'danger');
    }
}

async function deleteReview(id) {
    if (!confirm('Xác nhận xóa đánh giá này?')) return;
    try {
        const res = await fetch(`${API}/reviews/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa đánh giá', 'success');
        await loadReviews();
    } catch {
        showToast('Lỗi khi xóa đánh giá', 'danger');
    }
}

// ==================== Reports ====================
let reportData = null;
let reportChartInstance = null;

function initReportsTab() {
    // Đặt mặc định tháng này nếu chưa có
    const fromEl = document.getElementById('report-from');
    const toEl = document.getElementById('report-to');
    if (!fromEl.value) {
        const now = new Date();
        fromEl.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        toEl.value = now.toISOString().split('T')[0];
        document.getElementById('report-quick-range').value = 'thismonth';
    }
}

function applyQuickRange(val) {
    const now = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    let from, to;
    switch (val) {
        case 'today':    from = to = fmt(now); break;
        case 'yesterday': { const y = new Date(now); y.setDate(now.getDate()-1); from = to = fmt(y); break; }
        case '7days':    { const w = new Date(now); w.setDate(now.getDate()-6); from = fmt(w); to = fmt(now); break; }
        case '30days':   { const m = new Date(now); m.setDate(now.getDate()-29); from = fmt(m); to = fmt(now); break; }
        case 'thismonth': from = fmt(new Date(now.getFullYear(), now.getMonth(), 1)); to = fmt(now); break;
        case 'lastmonth': {
            const lms = new Date(now.getFullYear(), now.getMonth()-1, 1);
            const lme = new Date(now.getFullYear(), now.getMonth(), 0);
            from = fmt(lms); to = fmt(lme); break;
        }
        case 'thisyear': from = fmt(new Date(now.getFullYear(), 0, 1)); to = fmt(now); break;
        default: return;
    }
    document.getElementById('report-from').value = from;
    document.getElementById('report-to').value = to;
}

function generateReport() {
    const from = document.getElementById('report-from').value;
    const to   = document.getElementById('report-to').value;
    if (!from || !to) { showToast('Vui lòng chọn khoảng thời gian', 'warning'); return; }

    const fromDate = new Date(from + 'T00:00:00');
    const toDate   = new Date(to   + 'T23:59:59');
    if (fromDate > toDate) { showToast('Ngày bắt đầu phải nhỏ hơn ngày kết thúc', 'warning'); return; }

    const completedOrders = allOrders.filter(o => {
        if (o.status !== 'completed') return false;
        const d = new Date(o.updatedAt || o.createdAt);
        return d >= fromDate && d <= toDate;
    });

    // Dish map
    const dishMap = {};
    completedOrders.forEach(o => {
        (o.items || []).forEach(item => {
            const name = item.product?.name || 'Không rõ';
            const cat  = item.product?.category?.name || '—';
            if (!dishMap[name]) dishMap[name] = { name, category: cat, qty: 0, revenue: 0 };
            dishMap[name].qty     += (item.quantity || 0);
            dishMap[name].revenue += (item.price || 0) * (item.quantity || 0);
        });
    });
    const topDishes = Object.values(dishMap).sort((a, b) => b.qty - a.qty);

    // Day map
    const dayMap = {};
    completedOrders.forEach(o => {
        const d = new Date(o.updatedAt || o.createdAt);
        const key = d.toLocaleDateString('vi-VN');
        if (!dayMap[key]) dayMap[key] = { date: key, rawDate: d, count: 0, revenue: 0 };
        dayMap[key].count++;
        dayMap[key].revenue += o.totalPrice || 0;
    });
    const dayStats = Object.values(dayMap).sort((a, b) => a.rawDate - b.rawDate);

    // New users in range
    const newUsers = allUsers.filter(u => {
        const d = new Date(u.createdAt);
        return d >= fromDate && d <= toDate;
    });

    const totalRevenue = completedOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const onlinePaid   = completedOrders.filter(o => o.paymentStatus === 'paid').length;

    reportData = {
        from, to, fromDate, toDate,
        orders: completedOrders,
        topDishes,
        dayStats,
        newUsers,
        totalRevenue,
        totalOrders:   completedOrders.length,
        avgOrder:      completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0,
        onlineOrders:  onlinePaid,
        codOrders:     completedOrders.length - onlinePaid,
        totalItemsSold: topDishes.reduce((s, d) => s + d.qty, 0),
    };

    renderReportPreview();
}

function renderReportPreview() {
    const { from, to, totalRevenue, totalOrders, avgOrder, onlineOrders, codOrders,
            topDishes, orders, dayStats, newUsers, totalItemsSold } = reportData;

    document.getElementById('report-empty').classList.add('d-none');
    document.getElementById('report-preview').classList.remove('d-none');

    const fmtD = s => new Date(s).toLocaleDateString('vi-VN');
    const periodLabel = `Kỳ: ${fmtD(from)} — ${fmtD(to)}  ·  Xuất lúc: ${new Date().toLocaleString('vi-VN')}`;
    document.getElementById('report-period-label').textContent = periodLabel;
    document.getElementById('report-order-count').textContent  = totalOrders + ' đơn';
    document.getElementById('report-dish-count').textContent   = topDishes.length + ' món';

    // --- Summary cards ---
    document.getElementById('report-summary-cards').innerHTML = `
        <div class="col-sm-6 col-xl-3">
            <div class="card stat-card shadow-sm p-3" style="border-left:3px solid #198754">
                <div class="text-secondary small mb-1"><i class="fa-solid fa-sack-dollar text-success me-1"></i>Tổng doanh thu</div>
                <div class="fw-bold text-success fs-5">${formatPrice(totalRevenue)}</div>
            </div>
        </div>
        <div class="col-sm-6 col-xl-3">
            <div class="card stat-card shadow-sm p-3" style="border-left:3px solid #0d6efd">
                <div class="text-secondary small mb-1"><i class="fa-solid fa-box text-primary me-1"></i>Đơn hoàn tất</div>
                <div class="fw-bold text-primary fs-5">${totalOrders} đơn</div>
            </div>
        </div>
        <div class="col-sm-6 col-xl-3">
            <div class="card stat-card shadow-sm p-3" style="border-left:3px solid #fd7e14">
                <div class="text-secondary small mb-1"><i class="fa-solid fa-calculator text-warning me-1"></i>Doanh thu TB/đơn</div>
                <div class="fw-bold" style="color:#fd7e14;font-size:1.1rem">${formatPrice(avgOrder)}</div>
            </div>
        </div>
        <div class="col-sm-6 col-xl-3">
            <div class="card stat-card shadow-sm p-3" style="border-left:3px solid #0dcaf0">
                <div class="text-secondary small mb-1"><i class="fa-solid fa-utensils text-info me-1"></i>Tổng món đã bán</div>
                <div class="fw-bold text-info fs-5">${totalItemsSold} phần</div>
            </div>
        </div>
        <div class="col-sm-6 col-xl-3">
            <div class="card stat-card shadow-sm p-3" style="border-left:3px solid #6610f2">
                <div class="text-secondary small mb-1"><i class="fa-solid fa-credit-card me-1" style="color:#6610f2"></i>Online / COD</div>
                <div class="fw-bold fs-5" style="color:#6610f2">${onlineOrders} / ${codOrders}</div>
            </div>
        </div>
        <div class="col-sm-6 col-xl-3">
            <div class="card stat-card shadow-sm p-3" style="border-left:3px solid #dc3545">
                <div class="text-secondary small mb-1"><i class="fa-solid fa-user-plus text-danger me-1"></i>Người dùng mới</div>
                <div class="fw-bold text-danger fs-5">${newUsers.length} tài khoản</div>
            </div>
        </div>`;

    // --- Chart theo ngày ---
    const ctx = document.getElementById('report-chart');
    if (reportChartInstance) reportChartInstance.destroy();
    if (dayStats.length) {
        reportChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dayStats.map(d => d.date),
                datasets: [{
                    label: 'Doanh thu',
                    data: dayStats.map(d => d.revenue),
                    backgroundColor: 'rgba(25,135,84,0.7)',
                    borderColor: '#198754',
                    borderWidth: 1,
                    borderRadius: 5,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => '  ' + formatPrice(c.parsed.y) } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    } else {
        ctx.closest('div').innerHTML = '<p class="text-muted fst-italic text-center py-4">Không có dữ liệu trong kỳ này.</p>';
    }

    // --- Top dishes ---
    if (!topDishes.length) {
        document.getElementById('report-top-dishes').innerHTML = '<p class="text-muted fst-italic">Không có dữ liệu món ăn.</p>';
    } else {
        const maxQty = topDishes[0].qty;
        document.getElementById('report-top-dishes').innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle admin-table">
                    <thead class="table-light">
                        <tr><th>#</th><th>Tên món</th><th>Danh mục</th><th>Số lượng</th><th>Doanh thu</th><th>% Tổng DT</th></tr>
                    </thead>
                    <tbody>${topDishes.slice(0, 20).map((d, i) => `
                        <tr>
                            <td class="text-muted small fw-bold">${i + 1}</td>
                            <td class="fw-semibold">${d.name}</td>
                            <td><span class="badge bg-light text-dark border">${d.category}</span></td>
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    <div class="progress flex-grow-1" style="height:6px;min-width:70px">
                                        <div class="progress-bar bg-danger" style="width:${Math.round(d.qty/maxQty*100)}%"></div>
                                    </div>
                                    <span class="fw-bold text-danger small">${d.qty}</span>
                                </div>
                            </td>
                            <td class="fw-semibold text-success">${formatPrice(d.revenue)}</td>
                            <td>
                                <span class="badge bg-light text-dark border">
                                    ${totalRevenue ? Math.round(d.revenue/totalRevenue*100) : 0}%
                                </span>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    // --- Orders table ---
    if (!orders.length) {
        document.getElementById('report-orders-table').innerHTML =
            '<tr><td colspan="8" class="text-center text-muted py-4">Không có đơn hàng nào trong kỳ này</td></tr>';
    } else {
        document.getElementById('report-orders-table').innerHTML = orders.map((o, i) => `
            <tr>
                <td class="text-muted small">${i + 1}</td>
                <td class="font-monospace small text-secondary">#${o._id.slice(-6).toUpperCase()}</td>
                <td>
                    <div class="fw-semibold">${getOrderBuyer(o).name}</div>
                    <div class="text-muted small">${getOrderBuyer(o).email || getOrderBuyer(o).phone || ''}</div>
                </td>
                <td class="text-muted small">${formatDate(o.createdAt)}</td>
                <td class="text-muted small">${formatDate(o.updatedAt || o.createdAt)}</td>
                <td class="text-muted small">${(o.items || []).length} món</td>
                <td class="fw-semibold text-danger">${formatPrice(o.totalPrice || 0)}</td>
                <td><span class="badge ${o.paymentStatus === 'paid' ? 'bg-info' : 'bg-warning text-dark'}">
                    ${o.paymentStatus === 'paid' ? 'Online' : 'COD'}</span></td>
            </tr>`).join('');
    }

    // --- New users ---
    if (!newUsers.length) {
        document.getElementById('report-new-users').innerHTML = '<p class="text-muted fst-italic">Không có tài khoản mới trong kỳ này.</p>';
    } else {
        document.getElementById('report-new-users').innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle admin-table">
                    <thead class="table-light">
                        <tr><th>#</th><th>Tên</th><th>Email</th><th>SĐT</th><th>Ngày đăng ký</th></tr>
                    </thead>
                    <tbody>${newUsers.map((u, i) => `
                        <tr>
                            <td class="text-muted small">${i+1}</td>
                            <td class="fw-semibold">${u.name}</td>
                            <td class="text-muted small">${u.email}</td>
                            <td class="text-muted small">${u.phone || '—'}</td>
                            <td class="text-muted small">${formatDate(u.createdAt)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    }
}

// ==================== Export Excel ====================
function exportExcel() {
    if (!reportData) { showToast('Vui lòng xem báo cáo trước', 'warning'); return; }
    if (typeof XLSX === 'undefined') { showToast('Thư viện Excel chưa tải xong, thử lại sau', 'warning'); return; }

    const { from, to, orders, topDishes, dayStats, newUsers,
            totalRevenue, totalOrders, avgOrder, onlineOrders, codOrders, totalItemsSold } = reportData;

    const wb = XLSX.utils.book_new();
    const fmt = s => new Date(s).toLocaleDateString('vi-VN');

    // ---- Sheet 1: Tổng quan ----
    const ws1 = XLSX.utils.aoa_to_sheet([
        ['BÁO CÁO DOANH THU — NOMNOMFOOD'],
        [''],
        ['Kỳ báo cáo:', `${fmt(from)} — ${fmt(to)}`],
        ['Ngày xuất báo cáo:', new Date().toLocaleString('vi-VN')],
        [''],
        ['CHỈ TIÊU',                   'GIÁ TRỊ'],
        ['Tổng doanh thu (VNĐ)',        totalRevenue],
        ['Số đơn hàng hoàn tất',        totalOrders],
        ['Doanh thu trung bình / đơn',  avgOrder],
        ['Tổng số món đã bán',          totalItemsSold],
        ['Đơn thanh toán Online',        onlineOrders],
        ['Đơn COD (thu tiền mặt)',       codOrders],
        ['Số người dùng mới đăng ký',   newUsers.length],
    ]);
    ws1['!cols'] = [{ wch: 32 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Tổng quan');

    // ---- Sheet 2: Chi tiết đơn hàng ----
    const ws2 = XLSX.utils.aoa_to_sheet([
        ['STT', 'Mã đơn', 'Khách hàng', 'Email', 'SĐT', 'Ngày đặt', 'Hoàn tất lúc',
         'Số món', 'Tổng tiền (VNĐ)', 'Thanh toán', 'Địa chỉ giao hàng'],
        ...orders.map((o, i) => {
            const addr = o.shippingAddress || {};
            const buyer = getOrderBuyer(o);
            return [
                i + 1,
                '#' + o._id.slice(-6).toUpperCase(),
                buyer.name,
                buyer.email || '—',
                buyer.phone || '—',
                new Date(o.createdAt).toLocaleString('vi-VN'),
                new Date(o.updatedAt || o.createdAt).toLocaleString('vi-VN'),
                (o.items || []).length,
                o.totalPrice || 0,
                o.paymentStatus === 'paid' ? 'Online' : 'COD',
                [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ') || '—',
            ];
        })
    ]);
    ws2['!cols'] = [{wch:5},{wch:10},{wch:22},{wch:28},{wch:14},{wch:20},{wch:20},{wch:8},{wch:18},{wch:10},{wch:35}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết đơn hàng');

    // ---- Sheet 3: Món ăn bán chạy ----
    const ws3 = XLSX.utils.aoa_to_sheet([
        ['STT', 'Tên món', 'Danh mục', 'Số lượng bán', 'Doanh thu (VNĐ)', '% Tổng doanh thu'],
        ...topDishes.map((d, i) => [
            i + 1, d.name, d.category, d.qty, d.revenue,
            totalRevenue ? +((d.revenue / totalRevenue * 100).toFixed(1)) : 0,
        ])
    ]);
    ws3['!cols'] = [{wch:5},{wch:32},{wch:18},{wch:16},{wch:18},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws3, 'Món bán chạy');

    // ---- Sheet 4: Doanh thu theo ngày ----
    const ws4 = XLSX.utils.aoa_to_sheet([
        ['Ngày', 'Số đơn hoàn tất', 'Doanh thu (VNĐ)'],
        ...dayStats.map(d => [d.date, d.count, d.revenue])
    ]);
    ws4['!cols'] = [{wch:14},{wch:18},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws4, 'Theo ngày');

    // ---- Sheet 5: Người dùng mới ----
    const ws5 = XLSX.utils.aoa_to_sheet([
        ['STT', 'Tên', 'Email', 'Số điện thoại', 'Ngày đăng ký'],
        ...newUsers.map((u, i) => [
            i + 1, u.name, u.email, u.phone || '—',
            new Date(u.createdAt).toLocaleString('vi-VN')
        ])
    ]);
    ws5['!cols'] = [{wch:5},{wch:22},{wch:28},{wch:14},{wch:20}];
    XLSX.utils.book_append_sheet(wb, ws5, 'Người dùng mới');

    XLSX.writeFile(wb, `BaoCao_DoanhThu_${from}_${to}.xlsx`);
    showToast('Xuất Excel thành công!', 'success');
}

// ==================== Export CSV ====================
function exportCSV() {
    if (!reportData) { showToast('Vui lòng xem báo cáo trước', 'warning'); return; }
    const { from, to, orders } = reportData;

    const rows = [
        ['STT','Mã đơn','Khách hàng','Email','SĐT','Ngày đặt','Hoàn tất','Số món','Tổng tiền','Thanh toán'],
        ...orders.map((o, i) => {
            const b = getOrderBuyer(o);
            return [
                i + 1,
                '#' + o._id.slice(-6).toUpperCase(),
                b.name,
                b.email || '—',
                b.phone || '—',
                new Date(o.createdAt).toLocaleString('vi-VN'),
                new Date(o.updatedAt || o.createdAt).toLocaleString('vi-VN'),
                (o.items || []).length,
                o.totalPrice || 0,
                o.paymentStatus === 'paid' ? 'Online' : 'COD',
            ];
        })
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `BaoCao_DoanhThu_${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('Xuất CSV thành công!', 'success');
}

// ==================== In / PDF ====================
function exportPrint() {
    if (!reportData) { showToast('Vui lòng xem báo cáo trước', 'warning'); return; }
    const { from, to, totalRevenue, totalOrders, avgOrder, onlineOrders, codOrders,
            totalItemsSold, topDishes, orders, dayStats, newUsers } = reportData;

    const fmt  = s => new Date(s).toLocaleDateString('vi-VN');
    const fmtP = n => Number(n).toLocaleString('vi-VN') + 'đ';

    const dishRows = topDishes.slice(0, 20).map((d, i) => `
        <tr>
            <td>${i+1}</td><td>${d.name}</td><td>${d.category}</td>
            <td style="text-align:right">${d.qty}</td>
            <td style="text-align:right">${fmtP(d.revenue)}</td>
            <td style="text-align:right">${totalRevenue ? Math.round(d.revenue/totalRevenue*100) : 0}%</td>
        </tr>`).join('');

    const orderRows = orders.map((o, i) => `
        <tr>
            <td>${i+1}</td>
            <td>#${o._id.slice(-6).toUpperCase()}</td>
            <td>${getOrderBuyer(o).name}</td>
            <td>${fmt(o.createdAt)}</td>
            <td>${fmt(o.updatedAt || o.createdAt)}</td>
            <td style="text-align:right">${(o.items||[]).length}</td>
            <td style="text-align:right">${fmtP(o.totalPrice||0)}</td>
            <td>${o.paymentStatus === 'paid' ? 'Online' : 'COD'}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8">
        <title>Báo cáo doanh thu ${fmt(from)} — ${fmt(to)}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }
            h1 { font-size: 18px; text-align: center; color: #dc3545; margin-bottom: 4px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 11px; }
            h2 { font-size: 13px; margin: 20px 0 8px; border-left: 3px solid #dc3545; padding-left: 8px; color: #dc3545; }
            .stats-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
            .stat-box { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 14px; }
            .stat-box .label { color: #888; font-size: 10px; }
            .stat-box .value { font-weight: 700; font-size: 15px; color: #198754; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
            th { background: #f8f9fa; text-transform: uppercase; font-size: 10px; letter-spacing: .3px;
                 padding: 6px 8px; border: 1px solid #dee2e6; text-align: left; }
            td { padding: 5px 8px; border: 1px solid #dee2e6; }
            tr:nth-child(even) td { background: #fafafa; }
            .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { body { padding: 10px; } }
        </style>
    </head><body>
        <h1>BÁO CÁO DOANH THU — NOMNOMFOOD</h1>
        <p class="subtitle">Kỳ báo cáo: ${fmt(from)} — ${fmt(to)} &nbsp;|&nbsp; Xuất lúc: ${new Date().toLocaleString('vi-VN')}</p>

        <h2>TỔNG QUAN</h2>
        <div class="stats-grid">
            <div class="stat-box"><div class="label">Tổng doanh thu</div><div class="value">${fmtP(totalRevenue)}</div></div>
            <div class="stat-box"><div class="label">Số đơn hoàn tất</div><div class="value" style="color:#0d6efd">${totalOrders} đơn</div></div>
            <div class="stat-box"><div class="label">Doanh thu TB/đơn</div><div class="value" style="color:#fd7e14">${fmtP(avgOrder)}</div></div>
            <div class="stat-box"><div class="label">Tổng món đã bán</div><div class="value" style="color:#0dcaf0">${totalItemsSold} phần</div></div>
            <div class="stat-box"><div class="label">Đơn Online / COD</div><div class="value" style="color:#6610f2">${onlineOrders} / ${codOrders}</div></div>
            <div class="stat-box"><div class="label">Người dùng mới</div><div class="value" style="color:#dc3545">${newUsers.length} tài khoản</div></div>
        </div>

        <h2>DOANH THU THEO NGÀY</h2>
        <table>
            <thead><tr><th>#</th><th>Ngày</th><th>Số đơn</th><th style="text-align:right">Doanh thu</th></tr></thead>
            <tbody>${dayStats.map((d,i) => `
                <tr><td>${i+1}</td><td>${d.date}</td><td>${d.count}</td>
                    <td style="text-align:right;font-weight:600">${fmtP(d.revenue)}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#999">Không có dữ liệu</td></tr>'}
            </tbody>
        </table>

        <h2>MÓN ĂN BÁN CHẠY (TOP ${Math.min(topDishes.length, 20)})</h2>
        <table>
            <thead><tr><th>#</th><th>Tên món</th><th>Danh mục</th><th style="text-align:right">Số lượng</th><th style="text-align:right">Doanh thu</th><th style="text-align:right">%</th></tr></thead>
            <tbody>${dishRows || '<tr><td colspan="6" style="text-align:center;color:#999">Không có dữ liệu</td></tr>'}</tbody>
        </table>

        <h2>CHI TIẾT ĐƠN HÀNG HOÀN TẤT (${orders.length} đơn)</h2>
        <table>
            <thead><tr><th>#</th><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Hoàn tất</th><th style="text-align:right">Món</th><th style="text-align:right">Tổng tiền</th><th>TT</th></tr></thead>
            <tbody>${orderRows || '<tr><td colspan="8" style="text-align:center;color:#999">Không có đơn hàng</td></tr>'}</tbody>
        </table>

        <div class="footer">NomNomFood — Báo cáo được tạo tự động · ${new Date().toLocaleString('vi-VN')}</div>
        <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ==================== Kế toán: điều hướng 2 cấp ====================
const ACC_CATEGORIES = {
    'so-sach': ['periods', 'coa', 'journal', 'ledger', 'statements'],
    'quy-congno': ['cashbook', 'debt', 'payment', 'bank-accounts', 'pnl'],
    'banhang': ['sales-invoices', 'refunds', 'channels', 'vat'],
    'muahang': ['suppliers', 'goods-receipts', 'purchase-invoices', 'payables'],
    'kho': ['warehouses', 'materials', 'material-issues', 'stocktakes', 'recipes'],
    'taisan': ['fixed-assets', 'depreciation'],
    'nhansu': ['employees', 'shifts', 'payroll'],
};

const ACC_LOADERS = {
    periods: loadPeriods, coa: loadCoa, journal: loadJournal, ledger: loadLedger, statements: loadStatementsTab,
    cashbook: loadTransactions, debt: loadDebts, payment: loadPayments, 'bank-accounts': loadBankAccounts, pnl: initPnlTab,
    'sales-invoices': loadSalesInvoices, refunds: loadRefunds, channels: loadChannels, vat: loadVat,
    suppliers: loadSuppliers, 'goods-receipts': loadReceipts, 'purchase-invoices': loadPurchaseInvoices, payables: loadPayables,
    warehouses: loadWarehouses, materials: loadMaterials, 'material-issues': loadIssues, stocktakes: loadStocktakes, recipes: loadRecipes,
    'fixed-assets': loadAssets, depreciation: loadDepreciation,
    employees: loadEmployees, shifts: loadShifts, payroll: loadPayroll,
};

async function initAccounting() {
    await loadPeriods();
    showAccCategory('so-sach');
}

function showAccCategory(cat) {
    Object.keys(ACC_CATEGORIES).forEach(c => {
        const btn = document.getElementById(`acc-cat-${c}`);
        btn?.classList.toggle('active', c === cat);
        btn?.classList.toggle('btn-danger', c === cat);
        btn?.classList.toggle('btn-outline-danger', c !== cat);
        document.getElementById(`acc-subtab-${c}`)?.classList.toggle('d-none', c !== cat);
    });
    showAccSubTab(cat, ACC_CATEGORIES[cat][0]);
}

let currentAccSubTab = null;

function showAccSubTab(cat, name) {
    currentAccSubTab = name;
    Object.values(ACC_CATEGORIES).flat().forEach(t => {
        document.getElementById(`acc-panel-${t}`)?.classList.toggle('d-none', t !== name);
        document.getElementById(`acc-tab-${t}`)?.classList.toggle('active', t === name);
    });
    ACC_LOADERS[name]?.();
}

function onAccPeriodChange() {
    currentAccPeriod = document.getElementById('acc-period-select').value;
    // Tab danh sách kỳ không phụ thuộc kỳ đang chọn, các tab khác tải lại theo kỳ mới
    if (currentAccSubTab && currentAccSubTab !== 'periods') ACC_LOADERS[currentAccSubTab]?.();
}

// ==================== Kế toán: Sổ quỹ thu/chi ====================
async function loadTransactions() {
    try {
        const res = await fetch(`${API}/transactions`);
        allTransactions = await res.json();
        renderTransactions();
    } catch {
        showToast('Không tải được sổ quỹ', 'danger');
    }
}

function renderTransactions() {
    const tbody = document.getElementById('transaction-table-body');
    if (!allTransactions.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Chưa có phiếu thu/chi nào</td></tr>';
        return;
    }
    tbody.innerHTML = allTransactions.map(t => `
        <tr>
            <td><span class="badge ${t.type === 'thu' ? 'bg-success' : 'bg-danger'}">${t.type === 'thu' ? 'Thu' : 'Chi'}</span></td>
            <td>${t.category}</td>
            <td class="text-muted small">${t.description || '—'}</td>
            <td>${new Date(t.date).toLocaleDateString('vi-VN')}</td>
            <td class="text-end fw-semibold ${t.type === 'thu' ? 'text-success' : 'text-danger'}">${t.type === 'thu' ? '+' : '-'}${formatPrice(t.amount)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openTransactionModal('${t._id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction('${t._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

function openTransactionModal(id) {
    document.getElementById('t-id').value = '';
    document.getElementById('t-type').value = 'chi';
    document.getElementById('t-category').value = '';
    document.getElementById('t-amount').value = '';
    document.getElementById('t-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('t-description').value = '';
    document.getElementById('transaction-modal-title').textContent = 'Thêm phiếu thu/chi';

    if (id) {
        const t = allTransactions.find(x => x._id === id);
        if (t) {
            document.getElementById('t-id').value = t._id;
            document.getElementById('t-type').value = t.type;
            document.getElementById('t-category').value = t.category;
            document.getElementById('t-amount').value = t.amount;
            document.getElementById('t-date').value = new Date(t.date).toISOString().split('T')[0];
            document.getElementById('t-description').value = t.description || '';
            document.getElementById('transaction-modal-title').textContent = 'Sửa phiếu thu/chi';
        }
    }
    transactionModalInst.show();
}

async function saveTransaction() {
    const id = document.getElementById('t-id').value;
    const category = document.getElementById('t-category').value.trim();
    const amount = Number(document.getElementById('t-amount').value);
    if (!category) { showToast('Vui lòng nhập danh mục', 'warning'); return; }
    if (!amount || amount <= 0) { showToast('Vui lòng nhập số tiền hợp lệ', 'warning'); return; }

    const body = {
        type: document.getElementById('t-type').value,
        category,
        amount,
        date: document.getElementById('t-date').value || new Date().toISOString(),
        description: document.getElementById('t-description').value.trim(),
    };

    try {
        const res = await fetch(`${API}/transactions${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật phiếu' : 'Đã thêm phiếu thu/chi', 'success');
        transactionModalInst.hide();
        await loadTransactions();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Xác nhận xóa phiếu thu/chi này?')) return;
    try {
        const res = await fetch(`${API}/transactions/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa phiếu thu/chi', 'success');
        await loadTransactions();
    } catch {
        showToast('Lỗi khi xóa phiếu thu/chi', 'danger');
    }
}

// ==================== Kế toán: Trung tâm công nợ ====================
let debtRows = [], debtVouchers = [], debtPaymentModalInst = null, debtPaymentCtx = null;

async function loadDebts() {
    try {
        const [center, vouchers, debts] = await Promise.all([
            fetch(`${API}/acc/debt-center`).then(r => r.json()),
            fetch(`${API}/acc/debt-payments`).then(r => r.json()),
            fetch(`${API}/debts`).then(r => r.json()),
        ]);
        debtRows = center.rows || [];
        debtVouchers = vouchers || [];
        allDebts = debts || [];
        renderDebtSummary(center.summary || {});
        renderDebts();
        renderVouchers();
    } catch {
        showToast('Không tải được công nợ', 'danger');
    }
}

function renderDebtSummary(s) {
    const card = (label, value, note, color, filter) => `
        <div class="col-6 col-lg-3">
            <div class="border rounded-3 p-3 h-100" style="border-left:4px solid ${color} !important;cursor:pointer" onclick="${filter}">
                <div class="text-muted small">${label}</div>
                <div class="fs-5 fw-bold" style="color:${color}">${formatPrice(value || 0)}</div>
                <div class="text-muted small">${note}</div>
            </div>
        </div>`;
    document.getElementById('debt-summary').innerHTML =
        card('Phải trả còn lại', s.phaiTra, 'Nhà cung cấp & khoản phải trả khác', '#dc3545', "setDebtFilter('phai_tra','open')") +
        card('Phải trả quá hạn', s.phaiTraQuaHan, 'Đã quá hạn thanh toán', '#fd7e14', "setDebtFilter('phai_tra','overdue')") +
        card('Phải thu còn lại', s.phaiThu, 'Khách hàng, đối tác còn nợ', '#0d6efd', "setDebtFilter('phai_thu','open')") +
        card('Phải thu quá hạn', s.phaiThuQuaHan, 'Cần đôn đốc thu hồi', '#6f42c1', "setDebtFilter('phai_thu','overdue')");
    document.getElementById('debt-tab-list-btn').textContent = `Công nợ (${s.soKhoanMo || 0} khoản chưa tất toán)`;
}

function setDebtFilter(type, status) {
    document.getElementById('debt-filter-type').value = type;
    document.getElementById('debt-filter-status').value = status;
    bootstrap.Tab.getOrCreateInstance(document.getElementById('debt-tab-list-btn')).show();
    renderDebts();
}

function debtStatusBadge(r) {
    if (r.conLai <= 0) return '<span class="badge bg-success">Đã tất toán</span>';
    if (r.quaHan) return '<span class="badge bg-danger">Quá hạn</span>';
    return r.daTra > 0 ? '<span class="badge bg-warning text-dark">Trả một phần</span>' : `<span class="badge bg-secondary">${r.loai === 'phai_thu' ? 'Chưa thu' : 'Chưa trả'}</span>`;
}

function renderDebts() {
    const tbody = document.getElementById('debt-table-body');
    if (!tbody) return;
    const type = document.getElementById('debt-filter-type').value;
    const status = document.getElementById('debt-filter-status').value;
    const q = document.getElementById('debt-filter-q').value.trim().toLowerCase();
    const list = debtRows.filter(r =>
        (!type || r.loai === type)
        && (!status || (status === 'open' ? r.conLai > 0 : status === 'done' ? r.conLai <= 0 : r.quaHan))
        && (!q || `${r.doiTac} ${r.chungTu}`.toLowerCase().includes(q)));
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">Không có khoản công nợ phù hợp</td></tr>'; return; }
    const fmtD = s => s ? new Date(s).toLocaleDateString('vi-VN') : '—';
    tbody.innerHTML = list.map(r => `
        <tr>
            <td class="fw-semibold">${escHtml(r.doiTac)}</td>
            <td>
                <div>${escHtml(r.chungTu)}</div>
                <div class="small text-muted">${r.nguon === 'ncc' ? '<i class="fa-solid fa-file-invoice me-1"></i>Hóa đơn mua hàng' : '<i class="fa-solid fa-pen me-1"></i>Công nợ khác'}</div>
            </td>
            <td><span class="badge ${r.loai === 'phai_thu' ? 'bg-info text-dark' : 'bg-dark'}">${r.loai === 'phai_thu' ? 'Phải thu' : 'Phải trả'}</span></td>
            <td>${fmtD(r.ngay)}</td>
            <td class="${r.quaHan ? 'text-danger fw-semibold' : ''}">${fmtD(r.han)}</td>
            <td class="text-end">${formatPrice(r.soTien)}</td>
            <td class="text-end">${formatPrice(r.daTra)}</td>
            <td class="text-end fw-bold">${formatPrice(r.conLai)}</td>
            <td>${debtStatusBadge(r)}</td>
            <td class="text-end text-nowrap">
                ${r.conLai > 0 ? `<button class="btn btn-sm btn-success me-1" onclick="openDebtPaymentModal('${r.nguon}','${r._id}')" title="${r.loai === 'phai_thu' ? 'Thu tiền' : 'Thanh toán'}"><i class="fa-solid fa-money-bill-wave me-1"></i>${r.loai === 'phai_thu' ? 'Thu' : 'Trả'}</button>` : ''}
                ${r.nguon === 'khac' ? `
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openDebtModal('${r._id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteDebt('${r._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>` : ''}
            </td>
        </tr>`).join('');
}

function renderVouchers() {
    const tbody = document.getElementById('voucher-table-body');
    if (!tbody) return;
    document.getElementById('debt-tab-vouchers-btn').textContent = `Phiếu thu / chi (${debtVouchers.length})`;
    if (!debtVouchers.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Chưa lập phiếu nào</td></tr>'; return; }
    tbody.innerHTML = debtVouchers.map(v => `
        <tr style="cursor:pointer" onclick="printDebtVoucher('${v._id}')" title="Xem / in phiếu">
            <td class="font-monospace fw-semibold text-primary">${escHtml(v.soPhieu)}</td>
            <td>${new Date(v.ngay).toLocaleDateString('vi-VN')}</td>
            <td><span class="badge ${v.loai === 'chi' ? 'bg-danger' : 'bg-primary'}">${v.loai === 'chi' ? 'Phiếu chi' : 'Phiếu thu'}</span></td>
            <td>${escHtml(v.doiTac)}</td>
            <td class="small">${(v.phanBo || []).map(p => escHtml(p.chungTu)).join('<br>')}</td>
            <td>${v.hinhThuc === 'chuyen_khoan' ? 'Chuyển khoản' : 'Tiền mặt'}</td>
            <td class="text-end fw-bold">${formatPrice(v.soTien)}</td>
            <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="event.stopPropagation(); printDebtVoucher('${v._id}')" title="In phiếu"><i class="fa-solid fa-print"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); cancelDebtVoucher('${v._id}')" title="Hủy phiếu"><i class="fa-solid fa-ban"></i></button>
            </td>
        </tr>`).join('');
}

// ---------- Lập phiếu thu / chi ----------
// Mở phiếu cho khoản nợ đã chọn, kèm các khoản còn nợ khác của cùng đối tác để trả gộp
async function openDebtPaymentModal(nguon, id) {
    if (!debtRows.length || !debtRows.some(r => String(r._id) === String(id))) {
        try {
            const center = await fetch(`${API}/acc/debt-center`).then(r => r.json());
            debtRows = center.rows || [];
        } catch { showToast('Không tải được công nợ', 'danger'); return; }
    }
    const target = debtRows.find(r => String(r._id) === String(id) && r.nguon === nguon);
    if (!target) { showToast('Không tìm thấy khoản công nợ', 'warning'); return; }
    const related = debtRows.filter(r => r.conLai > 0 && r.loai === target.loai && r.doiTac === target.doiTac)
        .sort((a, b) => (String(b._id) === String(id)) - (String(a._id) === String(id)) || new Date(a.han || a.ngay) - new Date(b.han || b.ngay));
    const isChi = target.loai === 'phai_tra';
    const [supplier, bankAccounts] = await Promise.all([
        target.ncc ? fetch(`${API}/acc/suppliers/${target.ncc}`).then(r => r.ok ? r.json() : null).catch(() => null) : null,
        fetch(`${API}/acc/bank-accounts`).then(r => r.json()).catch(() => []),
    ]);
    debtPaymentCtx = { isChi, related, supplier, bankAccounts: (bankAccounts || []).filter(a => a.active !== false) };

    document.getElementById('dp-title').textContent = isChi ? 'Lập phiếu chi (trả nợ)' : 'Lập phiếu thu (thu nợ)';
    document.getElementById('dp-subtitle').textContent = isChi ? 'Mẫu số 02-TT · Ghi sổ Nợ 331 / Có 111, 112' : 'Mẫu số 01-TT · Ghi sổ Nợ 111, 112 / Có 131';
    document.getElementById('dp-doitac').value = target.doiTac;
    document.getElementById('dp-ngay').value = pnlDateStr(new Date());
    document.getElementById('dp-hinhthuc').value = 'tien_mat';
    document.getElementById('dp-nguoi-label').textContent = isChi ? 'Người nhận tiền' : 'Người nộp tiền';
    document.getElementById('dp-nguoi').value = '';
    document.getElementById('dp-diachi').value = target.diaChi || '';
    document.getElementById('dp-lydo').value = isChi ? `Thanh toán công nợ cho ${target.doiTac}` : `Thu tiền công nợ của ${target.doiTac}`;
    const fmtD = s => s ? new Date(s).toLocaleDateString('vi-VN') : '—';
    document.getElementById('dp-lines').innerHTML = related.map((r, i) => `
        <tr data-nguon="${r.nguon}" data-id="${r._id}" data-max="${r.conLai}" data-chungtu="${escHtml(r.chungTu)}">
            <td><input type="checkbox" class="form-check-input dp-cb" ${i === 0 ? 'checked' : ''} onchange="onDebtLineToggle(this)"></td>
            <td>${escHtml(r.chungTu)}${r.quaHan ? ' <span class="badge bg-danger">Quá hạn</span>' : ''}</td>
            <td>${fmtD(r.han)}</td>
            <td class="text-end">${formatPrice(r.conLai)}</td>
            <td><input type="number" min="0" max="${r.conLai}" step="1000" class="form-control form-control-sm text-end dp-amount" value="${i === 0 ? r.conLai : ''}" ${i === 0 ? '' : 'disabled'} oninput="updateDebtPaymentTotal()"></td>
        </tr>`).join('');
    fillDebtTransferBox(target);
    updateDebtPaymentTotal();
    if (!debtPaymentModalInst) debtPaymentModalInst = new bootstrap.Modal(document.getElementById('debtPaymentModal'));
    debtPaymentModalInst.show();
}

function onDebtLineToggle(cb) {
    const tr = cb.closest('tr');
    const input = tr.querySelector('.dp-amount');
    input.disabled = !cb.checked;
    input.value = cb.checked ? tr.dataset.max : '';
    updateDebtPaymentTotal();
}

function updateDebtPaymentTotal() {
    let tong = 0;
    document.querySelectorAll('#dp-lines tr').forEach(tr => {
        if (tr.querySelector('.dp-cb').checked) tong += Number(tr.querySelector('.dp-amount').value) || 0;
    });
    document.getElementById('dp-tong').textContent = formatPrice(tong);
    document.getElementById('dp-bangchu').textContent = tong ? `Bằng chữ: ${soThanhChu(tong)}` : '';
    const tien = document.getElementById('dp-hinhthuc').value === 'chuyen_khoan' ? '112' : '111';
    document.getElementById('dp-dinhkhoan').textContent = debtPaymentCtx
        ? `Định khoản: ${debtPaymentCtx.isChi ? `Nợ 331 / Có ${tien}` : `Nợ ${tien} / Có 131`}`
        : '';
    document.getElementById('dp-ck-box').classList.toggle('d-none', tien !== '112');
    updateDebtTransferQr();
}

function bankOptionsHtml(selected) {
    const list = !selected || VIETQR_BANKS.some(b => b.code === selected) ? VIETQR_BANKS : [...VIETQR_BANKS, { code: selected, name: selected }];
    return '<option value="">— Chọn ngân hàng —</option>' +
        list.map(b => `<option value="${b.code}" ${b.code === selected ? 'selected' : ''}>${escHtml(b.name)}</option>`).join('');
}

// Khối chuyển khoản: phiếu chi → tài khoản NCC nhận + tài khoản nhà hàng chuyển; phiếu thu → tài khoản nhà hàng nhận
function fillDebtTransferBox(target) {
    const { isChi, supplier, bankAccounts } = debtPaymentCtx;
    const s = isChi ? (supplier || {}) : {};
    document.getElementById('dp-ck-nhan').classList.toggle('d-none', !isChi);
    document.getElementById('dp-ck-bank').innerHTML = bankOptionsHtml(s.nganHangCode || '');
    document.getElementById('dp-ck-stk').value = s.soTaiKhoan || '';
    document.getElementById('dp-ck-chu').value = s.chuTaiKhoan || '';
    document.getElementById('dp-ck-cn').value = s.chiNhanh || '';
    const hasTk = !!s.soTaiKhoan;
    document.getElementById('dp-ck-empty').classList.toggle('d-none', hasTk);
    const luu = document.getElementById('dp-ck-luu');
    luu.checked = !hasTk && !!target.ncc;
    luu.closest('.form-check').classList.toggle('d-none', !target.ncc);
    document.getElementById('dp-ck-from-label').textContent = isChi ? 'Chuyển từ tài khoản (nhà hàng)' : 'Nhận vào tài khoản (nhà hàng)';
    document.getElementById('dp-ck-from').innerHTML = bankAccounts.length
        ? bankAccounts.map(a => `<option value="${a._id}" ${a.isDefault ? 'selected' : ''}>${escHtml(a.tenNganHang)} · ${escHtml(a.soTaiKhoan)} · ${escHtml(a.chuTaiKhoan)}</option>`).join('')
        : '<option value="">(chưa khai báo tài khoản ngân hàng)</option>';
    const soCT = debtPaymentCtx.related[0]?.chungTu || '';
    document.getElementById('dp-ck-nd').value = isChi ? `NOMNOMFOOD thanh toan ${soCT}` : `${target.doiTac} thanh toan ${soCT}`;
}

function debtTransferAccounts() {
    const { isChi, bankAccounts } = debtPaymentCtx;
    const code = document.getElementById('dp-ck-bank').value;
    const ncc = {
        nganHangCode: code,
        tenNganHang: VIETQR_BANKS.find(b => b.code === code)?.name || code,
        soTaiKhoan: document.getElementById('dp-ck-stk').value.replace(/\s+/g, ''),
        chuTaiKhoan: document.getElementById('dp-ck-chu').value.trim().toUpperCase(),
        chiNhanh: document.getElementById('dp-ck-cn').value.trim(),
    };
    const a = bankAccounts.find(x => x._id === document.getElementById('dp-ck-from').value);
    const own = a ? { nganHangCode: a.nganHangCode, tenNganHang: a.tenNganHang, soTaiKhoan: a.soTaiKhoan, chuTaiKhoan: a.chuTaiKhoan, chiNhanh: a.chiNhanh || '' } : null;
    return isChi ? { tkNhan: ncc, tkChuyen: own } : { tkNhan: own, tkChuyen: null };
}

function vietQrUrl(tk, amount, info, style = 'compact2') {
    if (!tk?.nganHangCode || !tk?.soTaiKhoan) return '';
    const q = new URLSearchParams();
    if (amount) q.set('amount', Math.round(amount));
    if (info) q.set('addInfo', info);
    if (tk.chuTaiKhoan) q.set('accountName', tk.chuTaiKhoan);
    return `https://img.vietqr.io/image/${encodeURIComponent(tk.nganHangCode)}-${encodeURIComponent(tk.soTaiKhoan)}-${style}.png?${q}`;
}

let debtQrTimer = null;
function updateDebtTransferQr() {
    if (!debtPaymentCtx || document.getElementById('dp-ck-box').classList.contains('d-none')) return;
    clearTimeout(debtQrTimer);
    debtQrTimer = setTimeout(() => {
        let tong = 0;
        document.querySelectorAll('#dp-lines tr').forEach(tr => {
            if (tr.querySelector('.dp-cb').checked) tong += Number(tr.querySelector('.dp-amount').value) || 0;
        });
        const url = vietQrUrl(debtTransferAccounts().tkNhan, tong, document.getElementById('dp-ck-nd').value.trim());
        const img = document.getElementById('dp-ck-qr');
        img.classList.toggle('d-none', !url);
        document.getElementById('dp-ck-qr-empty').classList.toggle('d-none', !!url);
        if (url && img.src !== url) img.src = url;
    }, 300);
}

async function saveDebtPayment(andPrint) {
    const phanBo = [];
    for (const tr of document.querySelectorAll('#dp-lines tr')) {
        if (!tr.querySelector('.dp-cb').checked) continue;
        const soTien = Number(tr.querySelector('.dp-amount').value) || 0;
        const max = Number(tr.dataset.max);
        if (soTien <= 0) { showToast(`${tr.dataset.chungtu}: nhập số tiền thanh toán`, 'warning'); return; }
        if (soTien > max) { showToast(`${tr.dataset.chungtu}: không được vượt số còn nợ ${formatPrice(max)}`, 'warning'); return; }
        phanBo.push({ nguon: tr.dataset.nguon, congNo: tr.dataset.id, soTien });
    }
    if (!phanBo.length) { showToast('Chọn ít nhất một khoản nợ', 'warning'); return; }
    const ngay = document.getElementById('dp-ngay').value;
    if (!ngay) { showToast('Vui lòng chọn ngày', 'warning'); return; }
    const body = {
        phanBo,
        ngay: `${ngay}T${new Date().toTimeString().slice(0, 8)}`,
        hinhThuc: document.getElementById('dp-hinhthuc').value,
        nguoiNhanNop: document.getElementById('dp-nguoi').value.trim(),
        diaChi: document.getElementById('dp-diachi').value.trim(),
        lyDo: document.getElementById('dp-lydo').value.trim(),
        nguoiLap: (typeof getUser === 'function' && getUser()?.name) || '',
    };
    if (body.hinhThuc === 'chuyen_khoan') {
        Object.assign(body, debtTransferAccounts());
        if (debtPaymentCtx.isChi && !body.tkNhan.nganHangCode) { showToast('Chọn ngân hàng của nhà cung cấp', 'warning'); return; }
        if (debtPaymentCtx.isChi && !body.tkNhan.soTaiKhoan) { showToast('Nhập số tài khoản nhận tiền của nhà cung cấp', 'warning'); return; }
        body.noiDungCK = document.getElementById('dp-ck-nd').value.trim();
        body.luuTkNCC = document.getElementById('dp-ck-luu').checked;
    }
    try {
        const res = await fetch(`${API}/acc/debt-payments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(`Đã lập ${json.loai === 'chi' ? 'phiếu chi' : 'phiếu thu'} ${json.soPhieu}`, 'success');
        debtPaymentModalInst.hide();
        await loadDebts();
        if (document.getElementById('payable-table-body')) await loadPayables();
        if (andPrint) printDebtVoucher(json._id, true);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function cancelDebtVoucher(id) {
    const v = debtVouchers.find(x => x._id === id);
    if (!confirm(`Hủy ${v?.loai === 'chi' ? 'phiếu chi' : 'phiếu thu'} ${v?.soPhieu || ''}?\n\nBút toán của phiếu sẽ bị xóa và số tiền ${formatPrice(v?.soTien || 0)} được hoàn lại vào công nợ.`)) return;
    try {
        const res = await fetch(`${API}/acc/debt-payments/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Không hủy được phiếu');
        showToast('Đã hủy phiếu', 'success');
        await loadDebts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Thanh toán từ tab Mua hàng → Công nợ NCC dùng chung phiếu chi
function recordDebtPayment(id) { openDebtPaymentModal('khac', id); }
function payPayable(id) { openDebtPaymentModal('ncc', id); }

// ---------- In phiếu chi (02-TT) / phiếu thu (01-TT) ----------
async function printDebtVoucher(id, autoPrint) {
    const win = window.open('', '_blank');
    if (!win) { showToast('Trình duyệt đã chặn cửa sổ, hãy cho phép popup', 'warning'); return; }
    win.document.write('<p style="font-family:sans-serif;padding:24px">Đang tải phiếu...</p>');
    let v;
    try {
        const res = await fetch(`${API}/acc/debt-payments/${id}`);
        v = await res.json();
        if (!res.ok) throw new Error(v.error || 'Không tải được phiếu');
    } catch (err) {
        win.close();
        showToast(err.message, 'danger');
        return;
    }
    const isChi = v.loai === 'chi';
    const d = new Date(v.ngay);
    const tien = v.hinhThuc === 'chuyen_khoan' ? '112' : '111';
    const fmtN = n => Number(n || 0).toLocaleString('vi-VN');
    const tkLine = t => `<b>${escHtml(t.soTaiKhoan)}</b> — ${escHtml(t.tenNganHang || t.nganHangCode)}${t.chiNhanh ? ' (CN ' + escHtml(t.chiNhanh) + ')' : ''} — Chủ TK: <b>${escHtml(t.chuTaiKhoan)}</b>`;
    const ckHtml = v.hinhThuc !== 'chuyen_khoan' ? '' :
        (v.tkNhan?.soTaiKhoan ? `Tài khoản nhận: ${tkLine(v.tkNhan)}<br>` : '') +
        (v.tkChuyen?.soTaiKhoan ? `Tài khoản chuyển: ${tkLine(v.tkChuyen)}<br>` : '') +
        (v.noiDungCK ? `Nội dung chuyển khoản: <i>${escHtml(v.noiDungCK)}</i><br>` : '');
    const lines = (v.phanBo || []).map((p, i) => `<tr><td class="c">${i + 1}</td><td>${escHtml(p.chungTu)}</td><td class="num">${fmtN(p.soTien)}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8"><title>${isChi ? 'Phiếu chi' : 'Phiếu thu'} ${escHtml(v.soPhieu)}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Times New Roman', serif; font-size: 14px; color: #000; padding: 24px 36px; }
            .top { display: flex; justify-content: space-between; }
            .top .right { text-align: center; font-size: 12px; }
            .title { display: flex; justify-content: space-between; align-items: flex-start; margin: 18px 0 8px; }
            .title .mid { text-align: center; flex: 1; }
            h1 { font-size: 22px; letter-spacing: 2px; }
            .acc { font-size: 13px; line-height: 1.6; min-width: 140px; }
            .body { line-height: 2; margin-top: 10px; }
            .dots { border-bottom: 1px dotted #000; display: inline-block; min-width: 60%; }
            table { width: 70%; border-collapse: collapse; margin: 6px 0 6px 24px; font-size: 13px; }
            th, td { border: 1px solid #000; padding: 3px 6px; }
            th { background: #f2f2f2; }
            .c { text-align: center; } .num { text-align: right; white-space: nowrap; }
            .sign { display: grid; grid-template-columns: repeat(5, 1fr); text-align: center; margin-top: 18px; font-size: 13px; }
            .sign div { min-height: 110px; }
            .date { text-align: right; font-style: italic; margin-top: 14px; }
            .note { margin-top: 10px; font-size: 13px; }
            .toolbar { text-align: right; margin-bottom: 12px; }
            .toolbar button { padding: 6px 14px; font-size: 13px; cursor: pointer; }
            @page { size: A5 landscape; margin: 10mm; }
            @media print { .toolbar { display: none; } body { padding: 0; } }
        </style></head><body>
        <div class="toolbar"><button onclick="window.print()">🖨 In phiếu</button></div>
        <div class="top">
            <div><b>Đơn vị: NOMNOMFOOD</b><br>Địa chỉ: ..............................................</div>
            <div class="right"><b>Mẫu số ${isChi ? '02' : '01'} - TT</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div>
        </div>
        <div class="title">
            <div class="acc"></div>
            <div class="mid">
                <h1>${isChi ? 'PHIẾU CHI' : 'PHIẾU THU'}</h1>
                <i>Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</i>
            </div>
            <div class="acc">Quyển số: ..........<br>Số: <b>${escHtml(v.soPhieu)}</b><br>Nợ: <b>${isChi ? '331' : tien}</b><br>Có: <b>${isChi ? tien : '131'}</b></div>
        </div>
        <div class="body">
            Họ và tên người ${isChi ? 'nhận' : 'nộp'} tiền: <b>${escHtml(v.nguoiNhanNop || '')}</b> <span class="dots"></span><br>
            Đơn vị: <b>${escHtml(v.doiTac)}</b>${v.ncc?.maSoThue ? ` &nbsp; MST: ${escHtml(v.ncc.maSoThue)}` : ''}<br>
            Địa chỉ: ${escHtml(v.diaChi || v.ncc?.diaChi || '')}<br>
            Lý do ${isChi ? 'chi' : 'nộp'}: ${escHtml(v.lyDo || '')}<br>
            Số tiền: <b>${fmtN(v.soTien)} đồng</b> &nbsp; (${v.hinhThuc === 'chuyen_khoan' ? 'chuyển khoản' : 'tiền mặt'})<br>
            Viết bằng chữ: <b><i>${soThanhChu(v.soTien)}</i></b><br>
            ${ckHtml}
            Kèm theo: <b>${(v.phanBo || []).length}</b> chứng từ gốc:
        </div>
        <table>
            <thead><tr><th style="width:40px">STT</th><th>Chứng từ</th><th style="width:140px">Số tiền</th></tr></thead>
            <tbody>${lines}</tbody>
        </table>
        <p class="date">Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</p>
        <div class="sign">
            <div><b>Giám đốc</b><br><i>(Ký, họ tên, đóng dấu)</i></div>
            <div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div>
            <div><b>Thủ quỹ</b><br><i>(Ký, họ tên)</i></div>
            <div><b>Người lập phiếu</b><br><i>(Ký, họ tên)</i><br><br><br><br>${escHtml(v.nguoiLap || '')}</div>
            <div><b>Người ${isChi ? 'nhận' : 'nộp'} tiền</b><br><i>(Ký, họ tên)</i><br><br><br><br>${escHtml(v.nguoiNhanNop || '')}</div>
        </div>
        <p class="note">Đã ${isChi ? 'nhận' : 'nộp'} đủ số tiền (viết bằng chữ): ...................................................................................</p>
        ${autoPrint ? '<script>window.onload = () => { window.print(); }<\/script>' : ''}
    </body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
}

function openDebtModal(id) {
    document.getElementById('d-id').value = '';
    document.getElementById('d-type').value = 'receivable';
    document.getElementById('d-partner').value = '';
    document.getElementById('d-amount').value = '';
    document.getElementById('d-paid-amount').value = 0;
    document.getElementById('d-due-date').value = '';
    document.getElementById('d-note').value = '';
    document.getElementById('debt-modal-title').textContent = 'Thêm công nợ';

    if (id) {
        const d = allDebts.find(x => x._id === id);
        if (d) {
            document.getElementById('d-id').value = d._id;
            document.getElementById('d-type').value = d.type;
            document.getElementById('d-partner').value = d.partner;
            document.getElementById('d-amount').value = d.amount;
            document.getElementById('d-paid-amount').value = d.paidAmount || 0;
            document.getElementById('d-due-date').value = d.dueDate ? new Date(d.dueDate).toISOString().split('T')[0] : '';
            document.getElementById('d-note').value = d.note || '';
            document.getElementById('debt-modal-title').textContent = 'Sửa công nợ';
        }
    }
    debtModalInst.show();
}

async function saveDebt() {
    const id = document.getElementById('d-id').value;
    const partner = document.getElementById('d-partner').value.trim();
    const amount = Number(document.getElementById('d-amount').value);
    const paidAmount = Number(document.getElementById('d-paid-amount').value) || 0;
    if (!partner) { showToast('Vui lòng nhập tên đối tác', 'warning'); return; }
    if (!amount || amount <= 0) { showToast('Vui lòng nhập tổng nợ hợp lệ', 'warning'); return; }
    if (paidAmount > amount) { showToast('Số đã trả không thể lớn hơn tổng nợ', 'warning'); return; }

    const body = {
        type: document.getElementById('d-type').value,
        partner,
        amount,
        paidAmount,
        dueDate: document.getElementById('d-due-date').value || null,
        note: document.getElementById('d-note').value.trim(),
    };

    try {
        const res = await fetch(`${API}/debts${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật công nợ' : 'Đã thêm công nợ', 'success');
        debtModalInst.hide();
        await loadDebts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


async function deleteDebt(id) {
    if (!confirm('Xác nhận xóa công nợ này?')) return;
    try {
        const res = await fetch(`${API}/debts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa công nợ', 'success');
        await loadDebts();
    } catch {
        showToast('Lỗi khi xóa công nợ', 'danger');
    }
}

// ==================== Kế toán: Thanh toán ====================
function paymentMethodLabel(m) {
    return { cash: 'Tiền mặt', card: 'Thẻ', bank_transfer: 'Chuyển khoản', momo: 'Momo', other: 'Khác' }[m] || m;
}
function paymentStatusLabel(s) {
    return { pending: 'Chờ xử lý', success: 'Thành công', failed: 'Thất bại', refunded: 'Đã hoàn tiền' }[s] || s;
}

async function loadPayments() {
    try {
        const all = document.getElementById('payment-all-periods')?.checked;
        const period = !all && currentAccPeriod ? allPeriods.find(p => p._id === currentAccPeriod) : null;
        const res = await fetch(`${API}/payments${period ? `?period=${period._id}` : ''}`);
        allPayments = await res.json();
        const label = document.getElementById('payment-period-label');
        if (label) {
            label.textContent = period
                ? `Kỳ ${period.tenKy}: ${new Date(period.ngayBatDau).toLocaleDateString('vi-VN')} – ${new Date(period.ngayKetThuc).toLocaleDateString('vi-VN')}`
                : 'Tất cả các kỳ';
        }
        renderPaymentSummary();
        renderPayments();
    } catch {
        showToast('Không tải được danh sách thanh toán', 'danger');
    }
}

// Tổng hợp theo trạng thái và phương thức
function renderPaymentSummary() {
    const el = document.getElementById('payment-summary');
    if (!el) return;
    if (!allPayments.length) { el.innerHTML = ''; return; }
    const sum = list => list.reduce((s, p) => s + (p.amount || 0), 0);
    const byStatus = s => allPayments.filter(p => p.status === s);
    const statusCards = [
        ['success', 'Thành công', 'success'],
        ['pending', 'Chờ xử lý', 'warning'],
        ['refunded', 'Đã hoàn tiền', 'info'],
        ['failed', 'Thất bại', 'secondary'],
    ].map(([key, label, color]) => {
        const list = byStatus(key);
        return `
            <div class="col-6 col-md-3">
                <div class="border rounded-3 p-2 h-100 border-start border-4 border-${color}">
                    <div class="text-muted small">${label} (${list.length})</div>
                    <div class="fw-bold">${formatPrice(sum(list))}</div>
                </div>
            </div>`;
    }).join('');
    const success = byStatus('success');
    const methods = [...new Set(success.map(p => p.method))]
        .map(m => ({ m, list: success.filter(p => p.method === m) }))
        .sort((a, b) => sum(b.list) - sum(a.list))
        .map(({ m, list }) => `<span class="badge bg-light text-dark border me-1 mb-1">${paymentMethodLabel(m)}: ${list.length} giao dịch · ${formatPrice(sum(list))}</span>`)
        .join('');
    el.innerHTML = `
        <div class="row g-2 mb-2">${statusCards}</div>
        ${methods ? `<div class="small"><span class="text-muted me-1">Đã thu theo phương thức:</span>${methods}</div>` : ''}`;
}

function renderPayments() {
    const tbody = document.getElementById('payment-table-body');
    if (!allPayments.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Chưa có giao dịch thanh toán nào</td></tr>';
        return;
    }
    tbody.innerHTML = allPayments.map(p => `
        <tr>
            <td class="font-monospace">${p.order ? '#' + p.order._id.slice(-6).toUpperCase() : '—'}</td>
            <td>${p.user?.name || '—'}</td>
            <td class="text-end fw-semibold">${formatPrice(p.amount)}</td>
            <td>${paymentMethodLabel(p.method)}</td>
            <td>
                <select class="form-select form-select-sm" style="width:auto" onchange="updatePaymentStatus('${p._id}', this.value)">
                    ${['pending', 'success', 'failed', 'refunded'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${paymentStatusLabel(s)}</option>`).join('')}
                </select>
            </td>
            <td>${new Date(p.createdAt).toLocaleDateString('vi-VN')}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="deletePayment('${p._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

async function updatePaymentStatus(id, status) {
    try {
        const res = await fetch(`${API}/payments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, ...(status === 'success' ? { paidAt: new Date().toISOString() } : {}) }),
        });
        if (!res.ok) throw new Error('Cập nhật thất bại');
        showToast('Đã cập nhật trạng thái thanh toán', 'success');
        await loadPayments();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deletePayment(id) {
    if (!confirm('Xác nhận xóa giao dịch thanh toán này?')) return;
    try {
        const res = await fetch(`${API}/payments/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa giao dịch thanh toán', 'success');
        await loadPayments();
    } catch {
        showToast('Lỗi khi xóa giao dịch thanh toán', 'danger');
    }
}

// ==================== Kế toán: Báo cáo lãi lỗ ====================
// Ngày theo giờ máy (toISOString dùng UTC nên có thể lệch sang ngày hôm trước)
const pnlDateStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function initPnlTab() {
    const fromEl = document.getElementById('pnl-from');
    const toEl = document.getElementById('pnl-to');
    if (!fromEl.value) {
        const now = new Date();
        fromEl.value = pnlDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
        toEl.value = pnlDateStr(now);
        generatePnl();
    }
}

function applyPnlQuickRange(val) {
    const now = new Date();
    const fmt = pnlDateStr;
    let from, to;
    switch (val) {
        case 'today':    from = to = fmt(now); break;
        case '7days':    { const w = new Date(now); w.setDate(now.getDate()-6); from = fmt(w); to = fmt(now); break; }
        case '30days':   { const m = new Date(now); m.setDate(now.getDate()-29); from = fmt(m); to = fmt(now); break; }
        case 'thismonth': from = fmt(new Date(now.getFullYear(), now.getMonth(), 1)); to = fmt(now); break;
        case 'lastmonth': {
            const lms = new Date(now.getFullYear(), now.getMonth()-1, 1);
            const lme = new Date(now.getFullYear(), now.getMonth(), 0);
            from = fmt(lms); to = fmt(lme); break;
        }
        case 'thisyear': from = fmt(new Date(now.getFullYear(), 0, 1)); to = fmt(now); break;
        default: return;
    }
    document.getElementById('pnl-from').value = from;
    document.getElementById('pnl-to').value = to;
}

// Lãi lỗ tính từ bút toán trên server, cùng công thức với báo cáo kết quả kinh doanh
async function generatePnl() {
    const from = document.getElementById('pnl-from').value;
    const to   = document.getElementById('pnl-to').value;
    if (!from || !to) { showToast('Vui lòng chọn khoảng thời gian', 'warning'); return; }
    if (from > to) { showToast('Ngày bắt đầu phải nhỏ hơn ngày kết thúc', 'warning'); return; }
    try {
        const res = await fetch(`${API}/acc/pnl?from=${from}&to=${to}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không tải được báo cáo lãi lỗ');
        pnlData = { ...data, fromStr: from, toStr: to };
        renderPnlPreview();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Các dòng của báo cáo kết quả kinh doanh rút gọn (dùng cho màn hình và bản in)
function pnlStatementLines(d) {
    return [
        ['Doanh thu bán hàng', d.doanhThu, `${d.soDonHang} đơn hàng`],
        ['Giảm trừ doanh thu (hoàn tiền)', -d.giamTru, `${d.soHoanTien} lần hoàn tiền`],
        ['Doanh thu thuần', d.doanhThuThuan, '', true],
        ['Giá vốn hàng bán', -d.giaVon, 'Nguyên liệu xuất chế biến'],
        ['Lợi nhuận gộp', d.loiNhuanGop, `Biên lợi nhuận gộp ${d.bienLoiNhuanGop}%`, true],
        ['Chi phí hoạt động', -d.chiPhiHoatDong, 'Lương, mặt bằng, điện nước, khấu hao...'],
        ['Thu nhập khác', d.thuNhapKhac + d.dtTaiChinh, ''],
        ['Chi phí khác', -d.chiPhiKhac, ''],
        ['Lợi nhuận trước thuế', d.lnTruocThue, '', true],
        ['Thuế thu nhập doanh nghiệp', -d.thueTNDN, ''],
        ['LỢI NHUẬN SAU THUẾ', d.lnSauThue, `Biên lợi nhuận ${d.bienLoiNhuan}%`, true],
    ];
}

function renderPnlPreview() {
    const d = pnlData;
    const color = n => n >= 0 ? '#198754' : '#dc3545';
    const money = n => {
        const v = Math.round(n || 0);
        if (!v) return '<span class="text-muted">–</span>';
        return v < 0 ? `<span class="text-danger">(${formatPrice(-v)})</span>` : formatPrice(v);
    };
    const card = (icon, label, value, note, c) => `
        <div class="col-sm-6 col-xl-3">
            <div class="card stat-card shadow-sm p-3 h-100" style="border-left:3px solid ${c}">
                <div class="text-secondary small mb-1"><i class="fa-solid ${icon} me-1" style="color:${c}"></i>${label}</div>
                <div class="fw-bold fs-5" style="color:${c}">${formatPrice(value)}</div>
                <div class="text-muted small">${note}</div>
            </div>
        </div>`;

    document.getElementById('pnl-empty').classList.add('d-none');
    document.getElementById('pnl-preview').classList.remove('d-none');

    const tongChiPhi = d.giaVon + d.chiPhiHoatDong + d.chiPhiKhac + d.thueTNDN;
    document.getElementById('pnl-summary-cards').innerHTML =
        card('fa-sack-dollar', 'Doanh thu thuần', d.doanhThuThuan, `${d.soDonHang} đơn · TB ${formatPrice(d.giaTriDonTrungBinh)}/đơn`, '#198754') +
        card('fa-bowl-food', 'Lợi nhuận gộp', d.loiNhuanGop, `Biên gộp ${d.bienLoiNhuanGop}% (sau giá vốn)`, '#0dcaf0') +
        card('fa-circle-minus', 'Tổng chi phí', tongChiPhi, 'Giá vốn + chi phí hoạt động + khác', '#dc3545') +
        card('fa-scale-balanced', 'Lợi nhuận', d.lnSauThue, `Biên lợi nhuận ${d.bienLoiNhuan}%`, color(d.lnSauThue));

    const fmtD = s => new Date(s).toLocaleDateString('vi-VN');
    document.getElementById('pnl-range-label').textContent =
        `Từ ${fmtD(d.fromStr)} đến ${fmtD(d.toStr)} · Số liệu lấy từ sổ nhật ký chung (bút toán đã ghi sổ)`;

    document.getElementById('pnl-statement').innerHTML = pnlStatementLines(d).map(([label, value, note, bold]) => `
        <tr class="${bold ? 'fw-bold table-light' : ''}">
            <td class="${bold ? '' : 'ps-3'}">${label}${note ? `<div class="small text-muted fw-normal">${note}</div>` : ''}</td>
            <td class="text-end text-nowrap">${money(value)}</td>
        </tr>`).join('');

    const expenseRows = [{ danhMuc: 'Giá vốn hàng bán (nguyên liệu)', soTien: d.giaVon }, ...d.chiPhiTheoDanhMuc]
        .concat(d.chiPhiKhac ? [{ danhMuc: 'Chi phí khác', soTien: d.chiPhiKhac }] : [])
        .filter(e => e.soTien);
    document.getElementById('pnl-expense-breakdown').innerHTML = expenseRows.length
        ? expenseRows.map(e => `
            <tr>
                <td>${escHtml(e.danhMuc)}</td>
                <td class="text-end">${formatPrice(e.soTien)}</td>
                <td class="text-end">${tongChiPhi ? Math.round(e.soTien / tongChiPhi * 100) : 0}%</td>
            </tr>`).join('') + `
            <tr class="fw-bold table-light"><td>Tổng chi phí</td><td class="text-end">${formatPrice(tongChiPhi)}</td><td class="text-end">100%</td></tr>`
        : '<tr><td colspan="3" class="text-center text-muted py-3">Không có chi phí trong khoảng thời gian này</td></tr>';

    document.getElementById('pnl-monthly').innerHTML = d.theoThang.length
        ? d.theoThang.map(m => `
            <tr>
                <td class="fw-semibold">${m.thang}</td>
                <td class="text-end">${money(m.doanhThuThuan)}</td>
                <td class="text-end">${money(m.giaVon)}</td>
                <td class="text-end">${money(m.loiNhuanGop)}</td>
                <td class="text-end">${money(m.chiPhiHoatDong)}</td>
                <td class="text-end">${money(m.khac)}</td>
                <td class="text-end fw-bold" style="color:${color(m.loiNhuan)}">${formatPrice(m.loiNhuan)}</td>
                <td class="text-end">${m.doanhThuThuan ? Math.round(m.loiNhuan / m.doanhThuThuan * 1000) / 10 + '%' : '–'}</td>
            </tr>`).join('')
        : '<tr><td colspan="8" class="text-center text-muted py-3">Không có số liệu</td></tr>';
}

function printPnl() {
    if (!pnlData) { showToast('Vui lòng xem báo cáo trước', 'warning'); return; }
    const d = pnlData;
    const fmt  = s => new Date(s).toLocaleDateString('vi-VN');
    const money = n => {
        const v = Math.round(n || 0);
        if (!v) return '–';
        return v < 0 ? `(${formatPrice(-v)})` : formatPrice(v);
    };
    const tongChiPhi = d.giaVon + d.chiPhiHoatDong + d.chiPhiKhac + d.thueTNDN;
    const statementRows = pnlStatementLines(d).map(([label, value, note, bold]) => `
        <tr class="${bold ? 'bold' : ''}"><td class="${bold ? '' : 'indent'}">${label}${note ? ` <span class="note">— ${note}</span>` : ''}</td><td class="num">${money(value)}</td></tr>`).join('');
    const expenseRows = [{ danhMuc: 'Giá vốn hàng bán (nguyên liệu)', soTien: d.giaVon }, ...d.chiPhiTheoDanhMuc]
        .concat(d.chiPhiKhac ? [{ danhMuc: 'Chi phí khác', soTien: d.chiPhiKhac }] : [])
        .filter(e => e.soTien)
        .map((e, i) => `<tr><td>${i + 1}</td><td>${escHtml(e.danhMuc)}</td><td class="num">${formatPrice(e.soTien)}</td><td class="num">${tongChiPhi ? Math.round(e.soTien / tongChiPhi * 100) : 0}%</td></tr>`).join('');
    const monthRows = d.theoThang.map(m => `
        <tr><td>${m.thang}</td><td class="num">${money(m.doanhThuThuan)}</td><td class="num">${money(m.giaVon)}</td><td class="num">${money(m.chiPhiHoatDong)}</td><td class="num">${money(m.khac)}</td><td class="num"><b>${money(m.loiNhuan)}</b></td></tr>`).join('');

    const html = `<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8">
        <title>Báo cáo lãi lỗ ${fmt(d.fromStr)} — ${fmt(d.toStr)}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }
            h1 { font-size: 18px; text-align: center; color: #dc3545; margin-bottom: 4px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 11px; }
            h2 { font-size: 13px; margin: 20px 0 8px; border-left: 3px solid #dc3545; padding-left: 8px; color: #dc3545; }
            .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 16px; }
            .stat-box { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 14px; }
            .stat-box .label { color: #888; font-size: 10px; }
            .stat-box .value { font-weight: 700; font-size: 15px; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
            th { background: #f8f9fa; text-transform: uppercase; font-size: 10px; letter-spacing: .3px;
                 padding: 6px 8px; border: 1px solid #dee2e6; text-align: left; }
            td { padding: 5px 8px; border: 1px solid #dee2e6; }
            .num { text-align: right; white-space: nowrap; }
            .indent { padding-left: 20px; }
            tr.bold td { font-weight: 700; background: #f8f9fa; }
            .note { color: #888; font-size: 10px; font-weight: normal; }
            .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { body { padding: 10px; } }
        </style>
    </head><body>
        <h1>BÁO CÁO LÃI LỖ — NOMNOMFOOD</h1>
        <p class="subtitle">Từ ${fmt(d.fromStr)} đến ${fmt(d.toStr)} &nbsp;|&nbsp; Số liệu từ sổ nhật ký chung &nbsp;|&nbsp; Xuất lúc: ${new Date().toLocaleString('vi-VN')}</p>

        <h2>TỔNG QUAN</h2>
        <div class="stats-grid">
            <div class="stat-box"><div class="label">Doanh thu thuần (${d.soDonHang} đơn)</div><div class="value" style="color:#198754">${formatPrice(d.doanhThuThuan)}</div></div>
            <div class="stat-box"><div class="label">Lợi nhuận gộp (${d.bienLoiNhuanGop}%)</div><div class="value" style="color:#0dcaf0">${formatPrice(d.loiNhuanGop)}</div></div>
            <div class="stat-box"><div class="label">Tổng chi phí</div><div class="value" style="color:#dc3545">${formatPrice(tongChiPhi)}</div></div>
            <div class="stat-box"><div class="label">Lợi nhuận (${d.bienLoiNhuan}%)</div><div class="value" style="color:${d.lnSauThue >= 0 ? '#198754' : '#dc3545'}">${formatPrice(d.lnSauThue)}</div></div>
        </div>

        <h2>KẾT QUẢ KINH DOANH</h2>
        <table><tbody>${statementRows}</tbody></table>

        <h2>CHI PHÍ THEO DANH MỤC</h2>
        <table>
            <thead><tr><th>#</th><th>Danh mục</th><th class="num">Số tiền</th><th class="num">Tỷ trọng</th></tr></thead>
            <tbody>${expenseRows || '<tr><td colspan="4" style="text-align:center;color:#999">Không có chi phí</td></tr>'}</tbody>
        </table>

        <h2>DIỄN BIẾN THEO THÁNG</h2>
        <table>
            <thead><tr><th>Tháng</th><th class="num">Doanh thu thuần</th><th class="num">Giá vốn</th><th class="num">Chi phí hoạt động</th><th class="num">Thu/chi khác</th><th class="num">Lợi nhuận</th></tr></thead>
            <tbody>${monthRows || '<tr><td colspan="6" style="text-align:center;color:#999">Không có số liệu</td></tr>'}</tbody>
        </table>

        <div class="footer">NomNomFood — Báo cáo được tạo tự động · Số trong ngoặc ( ) là số âm · ${new Date().toLocaleString('vi-VN')}</div>
        <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ==================== Kế toán: In hóa đơn ====================
function printInvoice(orderId) {
    const o = allOrders.find(x => x._id === orderId);
    if (!o) { showToast('Không tìm thấy đơn hàng', 'danger'); return; }

    const buyer = getOrderBuyer(o);
    const addr = o.shippingAddress || {};
    const addrStr = [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ') || '—';
    const fmtP = n => Number(n).toLocaleString('vi-VN') + 'đ';

    const itemRows = (o.items || []).map((item, i) => {
        const p = item.product || {};
        return `<tr>
            <td>${i+1}</td>
            <td>${p.name || 'Sản phẩm'}</td>
            <td style="text-align:right">${fmtP(item.price)}</td>
            <td style="text-align:right">${item.quantity}</td>
            <td style="text-align:right">${fmtP(item.price * item.quantity)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8">
        <title>Hóa đơn #${o._id.slice(-6).toUpperCase()}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #222; padding: 30px; }
            h1 { font-size: 20px; text-align: center; color: #dc3545; margin-bottom: 2px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 12px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .info-box .label { color: #888; font-size: 11px; }
            .info-box .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
            th { background: #f8f9fa; text-transform: uppercase; font-size: 10px; letter-spacing: .3px;
                 padding: 8px; border: 1px solid #dee2e6; text-align: left; }
            td { padding: 7px 8px; border: 1px solid #dee2e6; }
            .total-row td { font-weight: 700; font-size: 14px; background: #fff5f5; }
            .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { body { padding: 10px; } }
        </style>
    </head><body>
        <h1>HÓA ĐƠN BÁN HÀNG</h1>
        <p class="subtitle">NomNomFood &nbsp;|&nbsp; Mã đơn: #${o._id.slice(-6).toUpperCase()} &nbsp;|&nbsp; Ngày: ${new Date(o.createdAt).toLocaleString('vi-VN')}</p>

        <div class="info-grid">
            <div class="info-box"><div class="label">Khách hàng</div><div class="value">${buyer.name}</div></div>
            <div class="info-box"><div class="label">Điện thoại</div><div class="value">${buyer.phone || '—'}</div></div>
            <div class="info-box"><div class="label">Địa chỉ giao hàng</div><div class="value">${addrStr}</div></div>
            <div class="info-box"><div class="label">Hình thức thanh toán</div><div class="value">${o.paymentStatus === 'paid' ? 'Đã thanh toán online' : 'Thu tiền mặt khi nhận hàng (COD)'}</div></div>
        </div>

        <table>
            <thead><tr><th>#</th><th>Sản phẩm</th><th style="text-align:right">Đơn giá</th><th style="text-align:right">SL</th><th style="text-align:right">Thành tiền</th></tr></thead>
            <tbody>
                ${itemRows || '<tr><td colspan="5" style="text-align:center;color:#999">Không có sản phẩm</td></tr>'}
                <tr class="total-row"><td colspan="4" style="text-align:right">TỔNG CỘNG</td><td style="text-align:right">${fmtP(o.totalPrice)}</td></tr>
            </tbody>
        </table>

        <div class="footer">Cảm ơn quý khách đã đặt hàng tại NomNomFood · ${new Date().toLocaleString('vi-VN')}</div>
        <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ==================== Kế toán: Kỳ kế toán ====================
async function loadPeriods() {
    try {
        const res = await fetch(`${API}/acc/periods`);
        allPeriods = await res.json();
        const openPeriod = allPeriods.find(p => p.trangThai === 'mo') || allPeriods[0];
        if (openPeriod && !currentAccPeriod) currentAccPeriod = openPeriod._id;
        const sel = document.getElementById('acc-period-select');
        if (sel) {
            sel.innerHTML = allPeriods.map(p => `<option value="${p._id}" ${p._id === currentAccPeriod ? 'selected' : ''}>${p.tenKy} ${p.trangThai === 'mo' ? '(Đang mở)' : '(Đã đóng)'}</option>`).join('');
        }
        renderPeriods();
    } catch {
        showToast('Không tải được danh sách kỳ kế toán', 'danger');
    }
}

// Kỳ đã qua khi đã hết ngày kết thúc
function isPeriodExpired(p) {
    const endOfDay = new Date(p.ngayKetThuc);
    endOfDay.setHours(24, 0, 0, 0);
    return endOfDay.getTime() <= Date.now();
}

function renderPeriods() {
    const tbody = document.getElementById('period-table-body');
    if (!tbody) return;
    if (!allPeriods.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Chưa có kỳ kế toán nào</td></tr>'; return; }
    tbody.innerHTML = allPeriods.map(p => {
        const expired = isPeriodExpired(p);
        const isOpen = p.trangThai === 'mo' && !expired;
        const editAction = expired
            ? `<span class="text-muted small me-2" title="Kỳ đã qua, không thể chỉnh sửa"><i class="fa-solid fa-lock me-1"></i>Đã khóa</span>`
            : `<button class="btn btn-sm btn-outline-primary me-1" onclick="event.stopPropagation(); openPeriodModal('${p._id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>`;
        const actions = `${editAction}
               <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deletePeriod('${p._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>`;
        return `
        <tr style="cursor:pointer" onclick="viewPeriodDetail('${p._id}')" title="Bấm để xem chi tiết kỳ">
            <td class="fw-semibold text-primary">${escHtml(p.tenKy)}</td>
            <td>${new Date(p.ngayBatDau).toLocaleDateString('vi-VN')}</td>
            <td>${new Date(p.ngayKetThuc).toLocaleDateString('vi-VN')}</td>
            <td class="text-end">${(p.soDonHang || 0).toLocaleString('vi-VN')}</td>
            <td class="text-end fw-semibold">${formatPrice(p.doanhThu || 0)}</td>
            <td class="text-end">${(p.soButToan || 0).toLocaleString('vi-VN')}</td>
            <td><span class="badge ${isOpen ? 'bg-success' : 'bg-secondary'}">${isOpen ? 'Đang mở' : 'Đã đóng'}</span></td>
            <td class="text-end">${actions}</td>
        </tr>`;
    }).join('');
}

function escHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Chi tiết kỳ: giải thích nguồn gốc các số tổng hợp
async function viewPeriodDetail(id) {
    const body = document.getElementById('period-detail-body');
    const p = allPeriods.find(x => x._id === id);
    document.getElementById('period-detail-title').textContent = `Chi tiết kỳ: ${p?.tenKy || ''}`;
    document.getElementById('period-detail-range').textContent = p
        ? `${new Date(p.ngayBatDau).toLocaleDateString('vi-VN')} — ${new Date(p.ngayKetThuc).toLocaleDateString('vi-VN')}`
        : '';
    body.innerHTML = '<p class="text-muted">Đang tải...</p>';
    periodDetailModalInst.show();

    try {
        const res = await fetch(`${API}/acc/periods/${id}/detail`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không tải được chi tiết kỳ');
        body.innerHTML = renderPeriodDetail(data);
    } catch (err) {
        body.innerHTML = `<p class="text-danger">${escHtml(err.message)}</p>`;
    }
}

function renderPeriodDetail({ summary, byNguon, orders, otherRevenue, entries }) {
    const fmtDate = d => new Date(d).toLocaleDateString('vi-VN');
    const fmtDateTime = d => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const nguon = n => NGUON_LABELS[n] || n;
    const tk = t => t ? `${escHtml(t.soHieuTK)} <span class="text-muted small">${escHtml(t.tenTK)}</span>` : '–';
    const card = (label, value, note) => `
        <div class="col-md-4">
            <div class="border rounded-3 p-3 h-100">
                <div class="text-muted small">${label}</div>
                <div class="fs-4 fw-bold">${value}</div>
                <div class="text-muted small">${note}</div>
            </div>
        </div>`;

    const revenueNote = summary.doanhThuKhac
        ? `= ${formatPrice(summary.doanhThuDonHang)} từ đơn hàng + ${formatPrice(summary.doanhThuKhac)} doanh thu khác`
        : 'Tổng tiền các đơn hàng hoàn thành (ghi Có TK 511)';

    const ordersHtml = orders.length ? `
        <div class="table-responsive">
            <table class="table table-sm align-middle">
                <thead class="table-light"><tr><th>#</th><th>Ngày</th><th>Mã đơn</th><th>Khách hàng</th><th>Món</th><th class="text-end">Thành tiền</th></tr></thead>
                <tbody>
                    ${orders.map((o, i) => `
                    <tr>
                        <td class="text-muted">${i + 1}</td>
                        <td class="text-nowrap">${fmtDateTime(o.ngayGhi)}</td>
                        <td class="font-monospace small">#${String(o._id).slice(-6).toUpperCase()}</td>
                        <td>${o.daXoa ? '<span class="text-muted fst-italic">Đơn đã xóa</span>' : escHtml(o.khachHang)}</td>
                        <td class="small">${o.items.map(it => `${escHtml(it.name)} × ${it.quantity}`).join('<br>')}</td>
                        <td class="text-end fw-semibold">${formatPrice(o.soTien)}</td>
                    </tr>`).join('')}
                </tbody>
                <tfoot><tr class="fw-bold"><td colspan="5" class="text-end">Tổng doanh thu đơn hàng</td><td class="text-end">${formatPrice(summary.doanhThuDonHang)}</td></tr></tfoot>
            </table>
        </div>` : '<p class="text-muted fst-italic">Kỳ này chưa có đơn hàng hoàn thành nào.</p>';

    const otherHtml = otherRevenue.length ? `
        <h6 class="fw-bold mt-4">Doanh thu khác (không từ đơn hàng)</h6>
        <table class="table table-sm align-middle">
            <thead class="table-light"><tr><th>Ngày</th><th>Nội dung</th><th>Nguồn</th><th class="text-end">Số tiền</th></tr></thead>
            <tbody>${otherRevenue.map(e => `
                <tr><td>${fmtDate(e.ngayGhi)}</td><td>${escHtml(e.noiDung)}</td><td>${nguon(e.nguon)}</td><td class="text-end">${formatPrice(e.soTien)}</td></tr>`).join('')}
            </tbody>
        </table>` : '';

    const byNguonHtml = `
        <table class="table table-sm align-middle">
            <thead class="table-light"><tr><th>Nguồn phát sinh</th><th class="text-end">Số bút toán</th><th class="text-end">Tổng tiền</th></tr></thead>
            <tbody>${byNguon.map(g => `
                <tr><td>${nguon(g.nguon)}</td><td class="text-end">${g.soButToan}</td><td class="text-end">${formatPrice(g.soTien)}</td></tr>`).join('')}
            </tbody>
            <tfoot><tr class="fw-bold"><td>Tổng cộng</td><td class="text-end">${summary.soButToan}</td><td></td></tr></tfoot>
        </table>`;

    const entriesHtml = entries.length ? `
        <div class="table-responsive">
            <table class="table table-sm align-middle small">
                <thead class="table-light"><tr><th>Ngày</th><th>Nội dung</th><th>TK Nợ</th><th>TK Có</th><th>Nguồn</th><th class="text-end">Số tiền</th></tr></thead>
                <tbody>${entries.map(e => `
                    <tr>
                        <td class="text-nowrap">${fmtDate(e.ngayGhi)}</td>
                        <td>${escHtml(e.noiDung)}</td>
                        <td class="text-nowrap">${tk(e.tkNo)}</td>
                        <td class="text-nowrap">${tk(e.tkCo)}</td>
                        <td>${nguon(e.nguon)}</td>
                        <td class="text-end">${formatPrice(e.soTien)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>` : '<p class="text-muted fst-italic">Kỳ này chưa có bút toán nào.</p>';

    return `
        <div class="row g-3 mb-4">
            ${card('Đơn hàng', summary.soDonHang.toLocaleString('vi-VN'), 'Số đơn hoàn thành đã ghi nhận doanh thu')}
            ${card('Doanh thu', formatPrice(summary.doanhThu), revenueNote)}
            ${card('Bút toán', summary.soButToan.toLocaleString('vi-VN'), 'Tổng số nghiệp vụ đã ghi sổ trong kỳ')}
        </div>
        <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#pd-orders" type="button">Đơn hàng (${orders.length})</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#pd-sources" type="button">Theo nguồn</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#pd-entries" type="button">Bút toán (${entries.length})</button></li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="pd-orders">${ordersHtml}${otherHtml}</div>
            <div class="tab-pane fade" id="pd-sources">${byNguonHtml}</div>
            <div class="tab-pane fade" id="pd-entries">${entriesHtml}</div>
        </div>`;
}

function openPeriodModal(id) {
    if (id) {
        const p = allPeriods.find(x => x._id === id);
        if (p && isPeriodExpired(p)) { showToast('Kỳ kế toán đã qua, không thể chỉnh sửa', 'warning'); return; }
    }
    document.getElementById('per-id').value = '';
    document.getElementById('per-ten').value = '';
    document.getElementById('per-batdau').value = '';
    document.getElementById('per-ketthuc').value = '';
    document.getElementById('per-trangthai').value = 'mo';
    document.getElementById('period-modal-title').textContent = 'Thêm kỳ kế toán';
    if (id) {
        const p = allPeriods.find(x => x._id === id);
        if (p) {
            document.getElementById('per-id').value = p._id;
            document.getElementById('per-ten').value = p.tenKy;
            document.getElementById('per-batdau').value = new Date(p.ngayBatDau).toISOString().split('T')[0];
            document.getElementById('per-ketthuc').value = new Date(p.ngayKetThuc).toISOString().split('T')[0];
            document.getElementById('per-trangthai').value = p.trangThai;
            document.getElementById('period-modal-title').textContent = 'Sửa kỳ kế toán';
        }
    }
    periodModalInst.show();
}

async function savePeriod() {
    const id = document.getElementById('per-id').value;
    const tenKy = document.getElementById('per-ten').value.trim();
    const ngayBatDau = document.getElementById('per-batdau').value;
    const ngayKetThuc = document.getElementById('per-ketthuc').value;
    if (!tenKy || !ngayBatDau || !ngayKetThuc) { showToast('Vui lòng nhập đầy đủ thông tin', 'warning'); return; }
    const body = { tenKy, ngayBatDau, ngayKetThuc, trangThai: document.getElementById('per-trangthai').value };
    try {
        const res = await fetch(`${API}/acc/periods${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật kỳ kế toán' : 'Đã thêm kỳ kế toán', 'success');
        periodModalInst.hide();
        await loadPeriods();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deletePeriod(id) {
    const p = allPeriods.find(x => x._id === id);
    const msg = p && isPeriodExpired(p)
        ? `Kỳ "${p.tenKy}" đã khóa. Xác nhận xóa kỳ kế toán này?\n(Chỉ xóa được nếu kỳ chưa có dữ liệu)`
        : 'Xác nhận xóa kỳ kế toán này?';
    if (!confirm(msg)) return;
    try {
        const res = await fetch(`${API}/acc/periods/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Lỗi khi xóa kỳ kế toán');
        showToast('Đã xóa kỳ kế toán', 'success');
        await loadPeriods();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== Kế toán: Hệ thống tài khoản ====================
async function loadCoa() {
    try {
        const res = await fetch(`${API}/acc/chart-of-accounts`);
        allCoa = await res.json();
        renderCoa();
    } catch {
        showToast('Không tải được hệ thống tài khoản', 'danger');
    }
}

function coaTypeLabel(t) {
    return { tai_san: 'Tài sản', no_phai_tra: 'Nợ phải trả', von_chu_so_huu: 'Vốn chủ sở hữu', doanh_thu: 'Doanh thu', chi_phi: 'Chi phí' }[t] || t;
}

function renderCoa() {
    const tbody = document.getElementById('coa-table-body');
    if (!allCoa.length) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">Chưa có tài khoản nào</td></tr>'; return; }
    const money = n => n ? formatPrice(n) : '<span class="text-muted">–</span>';
    tbody.innerHTML = allCoa.map(a => `
        <tr style="cursor:pointer" onclick="viewCoaDetail('${a._id}')" title="Bấm để xem dữ liệu liên quan">
            <td class="font-monospace text-primary fw-semibold">${escHtml(a.soHieuTK)}</td><td>${escHtml(a.tenTK)}</td>
            <td>${coaTypeLabel(a.loaiTK)}</td>
            <td><span class="badge bg-light text-dark border">${a.banChat === 'no' ? 'Bên Nợ' : 'Bên Có'}</span></td>
            <td class="text-end">${money(a.tongNo)}</td>
            <td class="text-end">${money(a.tongCo)}</td>
            <td class="text-end fw-semibold ${a.soDu < 0 ? 'text-danger' : ''}">${a.soButToan ? formatPrice(a.soDu) : '<span class="text-muted">–</span>'}</td>
            <td class="text-end">${(a.soButToan || 0).toLocaleString('vi-VN')}</td>
            <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="event.stopPropagation(); openCoaModal('${a._id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteCoa('${a._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

// Chi tiết tài khoản: mọi dữ liệu phát sinh liên quan tới tài khoản
let currentCoaDetailId = null;

async function viewCoaDetail(id) {
    currentCoaDetailId = id;
    const a = allCoa.find(x => x._id === id);
    document.getElementById('coa-detail-title').textContent = a ? `${a.soHieuTK} - ${a.tenTK}` : 'Chi tiết tài khoản';
    document.getElementById('coa-detail-sub').textContent = a
        ? `${coaTypeLabel(a.loaiTK)} · Số dư bên ${a.banChat === 'no' ? 'Nợ' : 'Có'}`
        : '';
    if (!allPeriods.length) {
        try { allPeriods = await (await fetch(`${API}/acc/periods`)).json(); } catch { /* bỏ qua, vẫn xem được tất cả kỳ */ }
    }
    document.getElementById('coa-detail-period').innerHTML = '<option value="">Tất cả các kỳ</option>' +
        allPeriods.map(p => `<option value="${p._id}">${escHtml(p.tenKy)}</option>`).join('');
    coaDetailModalInst.show();
    await reloadCoaDetail();
}

async function reloadCoaDetail() {
    const body = document.getElementById('coa-detail-body');
    const period = document.getElementById('coa-detail-period').value;
    body.innerHTML = '<p class="text-muted">Đang tải...</p>';
    try {
        const res = await fetch(`${API}/acc/chart-of-accounts/${currentCoaDetailId}/detail${period ? `?period=${period}` : ''}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không tải được chi tiết tài khoản');
        body.innerHTML = renderCoaDetail(data, !!period);
    } catch (err) {
        body.innerHTML = `<p class="text-danger">${escHtml(err.message)}</p>`;
    }
}

// Lọc nhanh theo kỳ khi bấm vào một dòng ở tab "Theo kỳ"
function filterCoaDetailByPeriod(periodId) {
    document.getElementById('coa-detail-period').value = periodId;
    reloadCoaDetail();
}

function renderCoaDetail({ account, summary, byPeriod, byCounterpart, byNguon, entries }, filtered) {
    const fmtDate = d => new Date(d).toLocaleDateString('vi-VN');
    const money = n => n ? formatPrice(n) : '<span class="text-muted">–</span>';
    const nguon = n => NGUON_LABELS[n] || n;
    const tk = t => t ? `<span class="font-monospace">${escHtml(t.soHieuTK)}</span> <span class="text-muted small">${escHtml(t.tenTK)}</span>` : '–';
    const side = account.banChat === 'no' ? 'Nợ' : 'Có';
    const card = (label, value, note) => `
        <div class="col-6 col-md-3">
            <div class="border rounded-3 p-3 h-100">
                <div class="text-muted small">${label}</div>
                <div class="fs-5 fw-bold">${value}</div>
                <div class="text-muted small">${note}</div>
            </div>
        </div>`;
    const totalRow = (label, colspan) => `
        <tfoot><tr class="fw-bold">
            <td colspan="${colspan}">${label}</td>
            <td class="text-end">${formatPrice(summary.tongNo)}</td>
            <td class="text-end">${formatPrice(summary.tongCo)}</td>
            <td class="text-end">${formatPrice(summary.soDu)}</td>
        </tr></tfoot>`;

    if (!entries.length) {
        return `<p class="text-muted fst-italic">Tài khoản này chưa có bút toán nào${filtered ? ' trong kỳ đã chọn' : ''}.</p>`;
    }

    const periodHtml = `
        <p class="text-muted small mb-2">Bấm vào một kỳ để chỉ xem dữ liệu của kỳ đó.</p>
        <table class="table table-sm table-hover align-middle">
            <thead class="table-light"><tr><th>Kỳ kế toán</th><th class="text-end">Số bút toán</th><th class="text-end">Phát sinh Nợ</th><th class="text-end">Phát sinh Có</th><th class="text-end">Số dư</th></tr></thead>
            <tbody>${byPeriod.map(g => `
                <tr style="cursor:pointer" onclick="filterCoaDetailByPeriod('${g.kyKeToan?._id || ''}')">
                    <td class="text-primary fw-semibold">${escHtml(g.kyKeToan?.tenKy || '(kỳ đã xóa)')}</td>
                    <td class="text-end">${g.soButToan}</td>
                    <td class="text-end">${money(g.no)}</td>
                    <td class="text-end">${money(g.co)}</td>
                    <td class="text-end fw-semibold">${formatPrice(g.soDu)}</td>
                </tr>`).join('')}
            </tbody>
            ${totalRow(`Tổng cộng (${summary.soButToan} bút toán)`, 2)}
        </table>`;

    const counterpartHtml = `
        <p class="text-muted small mb-2">Tài khoản ${escHtml(account.soHieuTK)} được ghi cùng với những tài khoản nào.</p>
        <table class="table table-sm align-middle">
            <thead class="table-light"><tr><th>Tài khoản đối ứng</th><th class="text-end">Số bút toán</th><th class="text-end">Phát sinh Nợ</th><th class="text-end">Phát sinh Có</th><th class="text-end">Ảnh hưởng số dư</th></tr></thead>
            <tbody>${byCounterpart.map(g => `
                <tr>
                    <td>${tk(g.taiKhoan)}</td>
                    <td class="text-end">${g.soButToan}</td>
                    <td class="text-end">${money(g.no)}</td>
                    <td class="text-end">${money(g.co)}</td>
                    <td class="text-end ${g.soDu < 0 ? 'text-danger' : ''}">${formatPrice(g.soDu)}</td>
                </tr>`).join('')}
            </tbody>
            ${totalRow('Tổng cộng', 2)}
        </table>`;

    const nguonHtml = `
        <table class="table table-sm align-middle">
            <thead class="table-light"><tr><th>Nguồn phát sinh</th><th class="text-end">Số bút toán</th><th class="text-end">Phát sinh Nợ</th><th class="text-end">Phát sinh Có</th><th class="text-end">Ảnh hưởng số dư</th></tr></thead>
            <tbody>${byNguon.map(g => `
                <tr>
                    <td>${nguon(g.nguon)}</td>
                    <td class="text-end">${g.soButToan}</td>
                    <td class="text-end">${money(g.no)}</td>
                    <td class="text-end">${money(g.co)}</td>
                    <td class="text-end ${g.soDu < 0 ? 'text-danger' : ''}">${formatPrice(g.soDu)}</td>
                </tr>`).join('')}
            </tbody>
            ${totalRow('Tổng cộng', 2)}
        </table>`;

    const entriesHtml = `
        <div class="table-responsive">
            <table class="table table-sm align-middle small">
                <thead class="table-light"><tr><th>Ngày</th><th>Kỳ</th><th>Nội dung</th><th>TK đối ứng</th><th>Nguồn</th><th class="text-end">Nợ</th><th class="text-end">Có</th><th class="text-end">Số dư lũy kế</th></tr></thead>
                <tbody>${entries.map(e => `
                    <tr>
                        <td class="text-nowrap">${fmtDate(e.ngayGhi)}</td>
                        <td class="text-nowrap">${escHtml(e.kyKeToan?.tenKy || '')}</td>
                        <td>${escHtml(e.noiDung)}</td>
                        <td class="text-nowrap">${tk(e.doiUng)}</td>
                        <td>${nguon(e.nguon)}</td>
                        <td class="text-end">${money(e.no)}</td>
                        <td class="text-end">${money(e.co)}</td>
                        <td class="text-end fw-semibold">${formatPrice(e.soDuLuyKe)}</td>
                    </tr>`).join('')}
                </tbody>
                ${totalRow('Tổng cộng', 5)}
            </table>
        </div>`;

    return `
        <div class="row g-3 mb-3">
            ${card('Phát sinh Nợ', formatPrice(summary.tongNo), 'Tổng tiền ghi bên Nợ')}
            ${card('Phát sinh Có', formatPrice(summary.tongCo), 'Tổng tiền ghi bên Có')}
            ${card('Số dư', formatPrice(summary.soDu), `Bên ${side}: ${account.banChat === 'no' ? 'Nợ − Có' : 'Có − Nợ'}`)}
            ${card('Bút toán', summary.soButToan.toLocaleString('vi-VN'), filtered ? 'Trong kỳ đã chọn' : 'Trên tất cả các kỳ')}
        </div>
        <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#cd-period" type="button">Theo kỳ (${byPeriod.length})</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#cd-counter" type="button">Tài khoản đối ứng (${byCounterpart.length})</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#cd-nguon" type="button">Theo nguồn</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#cd-entries" type="button">Bút toán (${entries.length})</button></li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="cd-period">${periodHtml}</div>
            <div class="tab-pane fade" id="cd-counter">${counterpartHtml}</div>
            <div class="tab-pane fade" id="cd-nguon">${nguonHtml}</div>
            <div class="tab-pane fade" id="cd-entries">${entriesHtml}</div>
        </div>`;
}

function openCoaModal(id) {
    document.getElementById('coa-id').value = '';
    document.getElementById('coa-so').value = '';
    document.getElementById('coa-ten').value = '';
    document.getElementById('coa-loai').value = 'tai_san';
    document.getElementById('coa-banchat').value = 'no';
    document.getElementById('coa-modal-title').textContent = 'Thêm tài khoản';
    if (id) {
        const a = allCoa.find(x => x._id === id);
        if (a) {
            document.getElementById('coa-id').value = a._id;
            document.getElementById('coa-so').value = a.soHieuTK;
            document.getElementById('coa-ten').value = a.tenTK;
            document.getElementById('coa-loai').value = a.loaiTK;
            document.getElementById('coa-banchat').value = a.banChat;
            document.getElementById('coa-modal-title').textContent = 'Sửa tài khoản';
        }
    }
    coaModalInst.show();
}

async function saveCoa() {
    const id = document.getElementById('coa-id').value;
    const soHieuTK = document.getElementById('coa-so').value.trim();
    const tenTK = document.getElementById('coa-ten').value.trim();
    if (!soHieuTK || !tenTK) { showToast('Vui lòng nhập đầy đủ thông tin', 'warning'); return; }
    const body = { soHieuTK, tenTK, loaiTK: document.getElementById('coa-loai').value, banChat: document.getElementById('coa-banchat').value };
    try {
        const res = await fetch(`${API}/acc/chart-of-accounts${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật tài khoản' : 'Đã thêm tài khoản', 'success');
        coaModalInst.hide();
        await loadCoa();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteCoa(id) {
    if (!confirm('Xác nhận xóa tài khoản này?')) return;
    try {
        const res = await fetch(`${API}/acc/chart-of-accounts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa tài khoản', 'success');
        await loadCoa();
    } catch {
        showToast('Lỗi khi xóa tài khoản', 'danger');
    }
}

// ==================== Kế toán: Bút toán ====================
function coaOptionsHtml() {
    return allCoa.map(a => `<option value="${a._id}">${a.soHieuTK} - ${a.tenTK}</option>`).join('');
}

async function loadJournal() {
    try {
        if (!allCoa.length) await loadCoa();
        const url = currentAccPeriod ? `${API}/acc/journal-entries?period=${currentAccPeriod}` : `${API}/acc/journal-entries`;
        const res = await fetch(url);
        allJournal = await res.json();
        renderJournal();
    } catch {
        showToast('Không tải được sổ nhật ký chung', 'danger');
    }
}

function renderJournal() {
    const tbody = document.getElementById('journal-table-body');
    if (!allJournal.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Chưa có bút toán nào</td></tr>'; return; }
    tbody.innerHTML = allJournal.map(e => `
        <tr>
            <td>${new Date(e.ngayGhi).toLocaleDateString('vi-VN')}</td>
            <td>${e.noiDung}</td>
            <td><span class="badge bg-light text-dark border">${e.tkNo?.soHieuTK || '—'}</span></td>
            <td><span class="badge bg-light text-dark border">${e.tkCo?.soHieuTK || '—'}</span></td>
            <td class="text-end fw-semibold">${formatPrice(e.soTien)}</td>
            <td><span class="badge bg-secondary">${e.nguon}</span></td>
        </tr>`).join('');
}

function openJournalModal() {
    document.getElementById('je-noidung').value = '';
    document.getElementById('je-sotien').value = '';
    document.getElementById('je-ngay').value = new Date().toISOString().split('T')[0];
    document.getElementById('je-tkno').innerHTML = coaOptionsHtml();
    document.getElementById('je-tkco').innerHTML = coaOptionsHtml();
    journalModalInst.show();
}

async function saveJournalEntry() {
    if (!currentAccPeriod) { showToast('Vui lòng chọn kỳ kế toán', 'warning'); return; }
    const noiDung = document.getElementById('je-noidung').value.trim();
    const tkNo = document.getElementById('je-tkno').value;
    const tkCo = document.getElementById('je-tkco').value;
    const soTien = Number(document.getElementById('je-sotien').value);
    if (!noiDung) { showToast('Vui lòng nhập diễn giải', 'warning'); return; }
    if (!soTien || soTien <= 0) { showToast('Vui lòng nhập số tiền hợp lệ', 'warning'); return; }
    if (tkNo === tkCo) { showToast('Tài khoản Nợ và Có không được trùng nhau', 'warning'); return; }
    try {
        const res = await fetch(`${API}/acc/journal-entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kyKeToan: currentAccPeriod, ngayGhi: document.getElementById('je-ngay').value, noiDung, tkNo, tkCo, soTien }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Hạch toán thất bại');
        showToast('Đã hạch toán bút toán', 'success');
        journalModalInst.hide();
        await loadJournal();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== Kế toán: Sổ cái ====================
async function loadLedger() {
    if (!currentAccPeriod) { document.getElementById('ledger-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Vui lòng chọn kỳ kế toán</td></tr>'; return; }
    try {
        const res = await fetch(`${API}/acc/ledger?period=${currentAccPeriod}`);
        allLedger = await res.json();
        renderLedger();
        document.getElementById('ledger-detail-card').classList.add('d-none');
    } catch {
        showToast('Không tải được sổ cái', 'danger');
    }
}

function renderLedger() {
    const tbody = document.getElementById('ledger-table-body');
    if (!allLedger.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Chưa có số dư nào trong kỳ này</td></tr>'; return; }
    tbody.innerHTML = allLedger.map(r => `
        <tr>
            <td>${r.tkKeToan?.soHieuTK || '—'}</td>
            <td>${r.tkKeToan?.tenTK || '—'}</td>
            <td class="text-end">${formatPrice(r.tongNo)}</td>
            <td class="text-end">${formatPrice(r.tongCo)}</td>
            <td class="text-end fw-semibold">${formatPrice(r.soDu)}</td>
            <td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="viewLedgerDetail('${r.tkKeToan?._id}')" title="Xem chi tiết"><i class="fa-solid fa-magnifying-glass"></i></button></td>
        </tr>`).join('');
}

const NGUON_LABELS = {
    thu_chi: 'Thu chi', cong_no: 'Công nợ', don_hang: 'Đơn hàng', mua_hang: 'Mua hàng',
    khau_hao: 'Khấu hao', luong: 'Lương', thue: 'Thuế', hoan_tien: 'Hoàn tiền', thu_cong: 'Thủ công', kho: 'Kho', tai_san: 'Tài sản',
};

let lastLedgerDetail = null;

async function viewLedgerDetail(accountId) {
    if (!currentAccPeriod || !accountId) return;
    const row = allLedger.find(r => r.tkKeToan?._id === accountId);
    const tk = row?.tkKeToan;
    const label = tk ? `${tk.soHieuTK} - ${tk.tenTK}` : '';
    const periodLabel = allPeriods.find(p => p._id === currentAccPeriod)?.tenKy || '';
    try {
        const query = `period=${currentAccPeriod}&account=${accountId}`;
        const [entries, openingData] = await Promise.all([
            fetch(`${API}/acc/ledger/detail?${query}`).then(r => r.json()),
            fetch(`${API}/acc/ledger/opening?${query}`).then(r => r.json()),
        ]);

        // Số dư đầu kỳ chuyển từ các kỳ trước (TK doanh thu/chi phí kết chuyển nên bằng 0);
        // "banChat" (nợ/có) của tài khoản quyết định chiều tăng/giảm của số dư lũy kế.
        const banChat = tk?.banChat || 'no';
        const opening = openingData.soDuDauKy || 0;
        let running = opening, tongNo = 0, tongCo = 0;
        const rows = entries.map(e => {
            const isNo = String(e.tkNo?._id || e.tkNo) === String(accountId);
            const phatSinhNo = isNo ? e.soTien : 0;
            const phatSinhCo = isNo ? 0 : e.soTien;
            tongNo += phatSinhNo;
            tongCo += phatSinhCo;
            running += banChat === 'no' ? (phatSinhNo - phatSinhCo) : (phatSinhCo - phatSinhNo);
            const doiUng = isNo ? e.tkCo : e.tkNo;
            return {
                ngay: new Date(e.ngayGhi).toLocaleDateString('vi-VN'),
                noiDung: e.noiDung,
                nguon: NGUON_LABELS[e.nguon] || e.nguon,
                doiUng: doiUng?.soHieuTK || '—',
                phatSinhNo, phatSinhCo, soDu: running,
            };
        });

        lastLedgerDetail = { label, periodLabel, banChat, rows, opening, tongNo, tongCo, closing: running };

        document.getElementById('ledger-detail-title').textContent = `Sổ cái tài khoản: ${label}`;
        document.getElementById('ledger-detail-period').textContent = periodLabel ? `Kỳ kế toán: ${periodLabel}` : '';
        document.getElementById('ledger-detail-opening').textContent = formatPrice(opening);
        document.getElementById('ledger-detail-totalno').textContent = formatPrice(tongNo);
        document.getElementById('ledger-detail-totalco').textContent = formatPrice(tongCo);
        document.getElementById('ledger-detail-closing').textContent = formatPrice(running);

        const tbody = document.getElementById('ledger-detail-body');
        const openingRow = `<tr class="table-light"><td colspan="6" class="fw-semibold">Số dư đầu kỳ${openingData.ketChuyen ? ' <span class="text-muted fw-normal small">(TK doanh thu/chi phí được kết chuyển cuối mỗi kỳ)</span>' : ' <span class="text-muted fw-normal small">(chuyển từ các kỳ trước)</span>'}</td><td class="text-end fw-semibold">${formatPrice(opening)}</td></tr>`;
        const bodyRows = rows.length ? rows.map(r => `
            <tr>
                <td>${r.ngay}</td>
                <td>${r.noiDung}</td>
                <td><span class="badge bg-light text-dark border">${r.nguon}</span></td>
                <td><span class="badge bg-light text-dark border">${r.doiUng}</span></td>
                <td class="text-end">${r.phatSinhNo ? formatPrice(r.phatSinhNo) : ''}</td>
                <td class="text-end">${r.phatSinhCo ? formatPrice(r.phatSinhCo) : ''}</td>
                <td class="text-end fw-semibold">${formatPrice(r.soDu)}</td>
            </tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted py-3">Không có phát sinh trong kỳ</td></tr>';
        const closingRow = `<tr class="table-light"><td colspan="4" class="fw-semibold">Cộng phát sinh / Dư cuối kỳ</td>
            <td class="text-end fw-semibold">${formatPrice(tongNo)}</td>
            <td class="text-end fw-semibold">${formatPrice(tongCo)}</td>
            <td class="text-end fw-semibold">${formatPrice(running)}</td></tr>`;
        tbody.innerHTML = openingRow + bodyRows + closingRow;

        document.getElementById('ledger-detail-card').classList.remove('d-none');
        document.getElementById('ledger-detail-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {
        showToast('Không tải được chi tiết sổ cái', 'danger');
    }
}

function closeLedgerDetail() {
    document.getElementById('ledger-detail-card').classList.add('d-none');
}

function printLedgerDetail() {
    if (!lastLedgerDetail) return;
    const { label, periodLabel, rows, opening, tongNo, tongCo, closing } = lastLedgerDetail;
    const fmtP = n => formatPrice(n);
    const bodyRows = rows.length ? rows.map(r => `
        <tr>
            <td>${r.ngay}</td><td>${r.noiDung}</td><td>${r.nguon}</td><td>${r.doiUng}</td>
            <td style="text-align:right">${r.phatSinhNo ? fmtP(r.phatSinhNo) : ''}</td>
            <td style="text-align:right">${r.phatSinhCo ? fmtP(r.phatSinhCo) : ''}</td>
            <td style="text-align:right">${fmtP(r.soDu)}</td>
        </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:#999">Không có phát sinh trong kỳ</td></tr>';

    const html = `<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8">
        <title>Sổ cái ${label}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }
            h1 { font-size: 18px; text-align: center; color: #dc3545; margin-bottom: 4px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
            th { background: #f8f9fa; text-transform: uppercase; font-size: 10px; letter-spacing: .3px;
                 padding: 6px 8px; border: 1px solid #dee2e6; text-align: left; }
            td { padding: 5px 8px; border: 1px solid #dee2e6; }
            tr.summary td { background: #f8f9fa; font-weight: 700; }
            .footer { text-align: center; color: #aaa; font-size: 10px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { body { padding: 10px; } }
        </style>
    </head><body>
        <h1>SỔ CÁI TÀI KHOẢN — NOMNOMFOOD</h1>
        <p class="subtitle">${label} &nbsp;|&nbsp; Kỳ kế toán: ${periodLabel} &nbsp;|&nbsp; Xuất lúc: ${new Date().toLocaleString('vi-VN')}</p>
        <table>
            <thead><tr><th>Ngày ghi sổ</th><th>Diễn giải</th><th>Nguồn</th><th>TK đối ứng</th>
                <th style="text-align:right">Phát sinh Nợ</th><th style="text-align:right">Phát sinh Có</th><th style="text-align:right">Số dư</th></tr></thead>
            <tbody>
                <tr class="summary"><td colspan="6">Số dư đầu kỳ</td><td style="text-align:right">${fmtP(opening)}</td></tr>
                ${bodyRows}
                <tr class="summary"><td colspan="4">Cộng phát sinh / Dư cuối kỳ</td>
                    <td style="text-align:right">${fmtP(tongNo)}</td>
                    <td style="text-align:right">${fmtP(tongCo)}</td>
                    <td style="text-align:right">${fmtP(closing)}</td></tr>
            </tbody>
        </table>
        <div class="footer">NomNomFood — Sổ được tạo tự động · ${new Date().toLocaleString('vi-VN')}</div>
        <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ==================== Kế toán: Báo cáo tài chính ====================
function loadStatementsTab() {
    switchStatement(currentStatementType);
}

async function switchStatement(type) {
    currentStatementType = type;
    document.getElementById('stmt-btn-bcdkt').classList.toggle('btn-danger', type === 'bang_can_doi_ke_toan');
    document.getElementById('stmt-btn-bcdkt').classList.toggle('btn-outline-danger', type !== 'bang_can_doi_ke_toan');
    document.getElementById('stmt-btn-kqkd').classList.toggle('btn-danger', type === 'ket_qua_kinh_doanh');
    document.getElementById('stmt-btn-kqkd').classList.toggle('btn-outline-danger', type !== 'ket_qua_kinh_doanh');
    await fetchAndRenderStatement(true);
}

function refreshStatement() { fetchAndRenderStatement(true); }

async function fetchAndRenderStatement(refresh) {
    const el = document.getElementById('statement-content');
    if (!currentAccPeriod) { el.innerHTML = '<p class="text-muted fst-italic">Vui lòng chọn kỳ kế toán</p>'; return; }
    el.innerHTML = '<p class="text-muted fst-italic">Đang tải...</p>';
    try {
        const res = await fetch(`${API}/acc/statements?period=${currentAccPeriod}&type=${currentStatementType}${refresh ? '&refresh=1' : ''}`);
        const report = await res.json();
        if (!res.ok) throw new Error(report.error || 'Không tải được báo cáo');
        renderStatement(report);
    } catch (err) {
        el.innerHTML = `<p class="text-danger">${err.message}</p>`;
    }
}

function renderStatement(report) {
    const el = document.getElementById('statement-content');
    const d = report.duLieu || {};
    const money = n => {
        const v = Math.round(n || 0);
        if (!v) return '<span class="text-muted">–</span>';
        return v < 0 ? `<span class="text-danger">(${formatPrice(-v)})</span>` : formatPrice(v);
    };
    const ngayLap = report.ngayLap ? `Lập lúc ${new Date(report.ngayLap).toLocaleString('vi-VN')}` : '';

    if (report.loaiBaoCao === 'bang_can_doi_ke_toan') {
        const fmtD = s => new Date(s).toLocaleDateString('vi-VN');
        const sectionRows = sec => `
            <tr class="table-light fw-bold"><td>${sec.ma}</td><td>${sec.ten}</td><td></td><td class="text-end">${money(sec.tong.dauKy)}</td><td class="text-end">${money(sec.tong.cuoiKy)}</td></tr>
            ${sec.dong.map(r => `
            <tr>
                <td></td>
                <td class="ps-4">${escHtml(r.ten)}${r.giamTru ? ' <span class="text-muted small">(ghi âm)</span>' : ''}</td>
                <td class="font-monospace small text-muted">${escHtml(r.tk)}</td>
                <td class="text-end">${money(r.dauKy)}</td>
                <td class="text-end">${money(r.cuoiKy)}</td>
            </tr>`).join('')}`;
        const totalRow = (label, t) => `
            <tr class="fw-bold" style="border-top:2px solid #333"><td></td><td>${label}</td><td></td><td class="text-end">${money(t.dauKy)}</td><td class="text-end">${money(t.cuoiKy)}</td></tr>`;
        const sections = d.sections || [];
        const head = `<thead class="table-light"><tr><th style="width:40px">Mã</th><th>Chỉ tiêu</th><th style="width:110px">Tài khoản</th>
            <th class="text-end" style="width:170px">Đầu kỳ<div class="small fw-normal text-muted">${d.ngayDauKy ? fmtD(d.ngayDauKy) : ''}</div></th>
            <th class="text-end" style="width:170px">Cuối kỳ<div class="small fw-normal text-muted">${d.ngayCuoiKy ? fmtD(d.ngayCuoiKy) : ''}</div></th></tr></thead>`;

        el.innerHTML = `
            <div class="text-center mb-3">
                <h5 class="fw-bold mb-0">BẢNG CÂN ĐỐI KẾ TOÁN</h5>
                <div class="text-muted small">Kỳ: ${escHtml(d.tenKy || '')} · Đơn vị tính: đồng · ${ngayLap}</div>
            </div>
            <div class="table-responsive">
                <table class="table table-sm align-middle admin-table">
                    ${head}
                    <tbody>
                        ${sections.filter(s => s.phia === 'taiSan').map(sectionRows).join('')}
                        ${totalRow('TỔNG CỘNG TÀI SẢN', d.tongTaiSan || {})}
                        ${sections.filter(s => s.phia === 'nguonVon').map(sectionRows).join('')}
                        ${totalRow('TỔNG CỘNG NGUỒN VỐN', d.tongNguonVon || {})}
                    </tbody>
                </table>
            </div>
            <div class="alert ${d.canDoi ? 'alert-success' : 'alert-warning'} mb-0">
                ${d.canDoi
                    ? '<i class="fa-solid fa-circle-check me-1"></i>Bảng cân đối kế toán cân bằng: Tổng tài sản = Tổng nguồn vốn (Nợ phải trả + Vốn chủ sở hữu).'
                    : '<i class="fa-solid fa-triangle-exclamation me-1"></i>Bảng cân đối chưa cân bằng — kiểm tra lại các bút toán.'}
                <div class="small text-muted mt-1">Số dư được lũy kế qua các kỳ. "Lợi nhuận sau thuế chưa phân phối" gồm lợi nhuận của tất cả các kỳ tính tới thời điểm báo cáo.</div>
            </div>`;
    } else {
        const rows = d.dong || [];
        el.innerHTML = `
            <div class="text-center mb-3">
                <h5 class="fw-bold mb-0">BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH</h5>
                <div class="text-muted small">Kỳ: ${escHtml(d.tenKy || '')} · Đơn vị tính: đồng · ${ngayLap}</div>
            </div>
            <div class="table-responsive">
                <table class="table table-sm align-middle admin-table">
                    <thead class="table-light"><tr>
                        <th style="width:50px">Mã số</th><th>Chỉ tiêu</th><th style="width:150px">Cách tính</th>
                        <th class="text-end" style="width:170px">Kỳ này</th>
                        <th class="text-end" style="width:170px">Lũy kế<div class="small fw-normal text-muted">${escHtml(d.luyKeTu || '')}</div></th>
                    </tr></thead>
                    <tbody>
                        ${rows.map(r => `
                        <tr class="${r.tong ? 'fw-bold table-light' : ''}">
                            <td class="font-monospace">${r.ma}</td>
                            <td class="${r.tong ? '' : 'ps-3'}">${escHtml(r.ten)}</td>
                            <td class="small text-muted">${escHtml(r.cachTinh)}</td>
                            <td class="text-end">${money(r.kyNay)}</td>
                            <td class="text-end">${money(r.luyKe)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div class="card border-0 rounded-4 shadow-sm p-3" style="border-left:4px solid ${d.loiNhuan >= 0 ? '#198754' : '#dc3545'} !important">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 class="fw-bold mb-0">LỢI NHUẬN SAU THUẾ KỲ NÀY</h6>
                    <span class="fs-5 fw-bold" style="color:${d.loiNhuan >= 0 ? '#198754' : '#dc3545'}">${formatPrice(d.loiNhuan || 0)}</span>
                </div>
                <div class="text-muted small mt-1">Lũy kế từ đầu năm: ${formatPrice(d.loiNhuanLuyKe || 0)}. Số trong ngoặc ( ) là số âm.</div>
            </div>`;
    }
}

// ==================== In báo cáo tài chính ====================
async function fetchStatement(type) {
    const res = await fetch(`${API}/acc/statements?period=${currentAccPeriod}&type=${type}`);
    const report = await res.json();
    if (!res.ok) throw new Error(report.error || 'Không tải được báo cáo');
    return report;
}

function statementPrintBody(report) {
    const d = report.duLieu || {};
    const money = n => {
        const v = Math.round(n || 0);
        if (!v) return '–';
        return v < 0 ? `(${formatPrice(-v)})` : formatPrice(v);
    };
    const fmtD = s => s ? new Date(s).toLocaleDateString('vi-VN') : '';

    if (report.loaiBaoCao === 'bang_can_doi_ke_toan') {
        const sections = d.sections || [];
        const sectionRows = sec => `
            <tr class="section"><td>${sec.ma}</td><td>${sec.ten}</td><td></td><td class="num">${money(sec.tong.dauKy)}</td><td class="num">${money(sec.tong.cuoiKy)}</td></tr>
            ${sec.dong.map(r => `
            <tr><td></td><td class="indent">${escHtml(r.ten)}</td><td class="tk">${escHtml(r.tk)}</td><td class="num">${money(r.dauKy)}</td><td class="num">${money(r.cuoiKy)}</td></tr>`).join('')}`;
        const totalRow = (label, t) => `<tr class="total"><td></td><td>${label}</td><td></td><td class="num">${money(t.dauKy)}</td><td class="num">${money(t.cuoiKy)}</td></tr>`;
        return `
            <section class="report">
                <div class="form-code">Mẫu số B01 (rút gọn)</div>
                <h1>BẢNG CÂN ĐỐI KẾ TOÁN</h1>
                <p class="subtitle">Kỳ kế toán: ${escHtml(d.tenKy || '')} (${fmtD(d.ngayDauKy)} – ${fmtD(d.ngayCuoiKy)})</p>
                <p class="unit">Đơn vị tính: đồng</p>
                <table>
                    <thead><tr><th style="width:40px">Mã</th><th>Chỉ tiêu</th><th style="width:90px">Tài khoản</th>
                        <th class="num" style="width:130px">Đầu kỳ<br><small>${fmtD(d.ngayDauKy)}</small></th>
                        <th class="num" style="width:130px">Cuối kỳ<br><small>${fmtD(d.ngayCuoiKy)}</small></th></tr></thead>
                    <tbody>
                        ${sections.filter(s => s.phia === 'taiSan').map(sectionRows).join('')}
                        ${totalRow('TỔNG CỘNG TÀI SẢN', d.tongTaiSan || {})}
                        ${sections.filter(s => s.phia === 'nguonVon').map(sectionRows).join('')}
                        ${totalRow('TỔNG CỘNG NGUỒN VỐN', d.tongNguonVon || {})}
                    </tbody>
                </table>
                <p class="note">${d.canDoi ? '✔ Tổng tài sản = Tổng nguồn vốn.' : '⚠ Bảng cân đối chưa cân bằng — cần kiểm tra lại bút toán.'} Số trong ngoặc ( ) là số âm.</p>
            </section>`;
    }

    return `
        <section class="report">
            <div class="form-code">Mẫu số B02 (rút gọn)</div>
            <h1>BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH</h1>
            <p class="subtitle">Kỳ kế toán: ${escHtml(d.tenKy || '')}</p>
            <p class="unit">Đơn vị tính: đồng</p>
            <table>
                <thead><tr><th style="width:50px">Mã số</th><th>Chỉ tiêu</th><th style="width:120px">Cách tính</th>
                    <th class="num" style="width:130px">Kỳ này</th>
                    <th class="num" style="width:130px">Lũy kế<br><small>${escHtml(d.luyKeTu || '')}</small></th></tr></thead>
                <tbody>
                    ${(d.dong || []).map(r => `
                    <tr class="${r.tong ? 'section' : ''}">
                        <td>${r.ma}</td><td class="${r.tong ? '' : 'indent'}">${escHtml(r.ten)}</td><td class="tk">${escHtml(r.cachTinh)}</td>
                        <td class="num">${money(r.kyNay)}</td><td class="num">${money(r.luyKe)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <p class="note">Lợi nhuận sau thuế kỳ này: <b>${formatPrice(d.loiNhuan || 0)}</b> · Lũy kế từ đầu năm: <b>${formatPrice(d.loiNhuanLuyKe || 0)}</b>. Số trong ngoặc ( ) là số âm.</p>
        </section>`;
}

async function printStatement(all) {
    if (!currentAccPeriod) { showToast('Vui lòng chọn kỳ kế toán', 'warning'); return; }
    // Mở cửa sổ ngay khi bấm để trình duyệt không chặn popup
    const win = window.open('', '_blank');
    if (!win) { showToast('Trình duyệt đã chặn cửa sổ in, hãy cho phép popup', 'warning'); return; }
    win.document.write('<p style="font-family:sans-serif;padding:24px">Đang chuẩn bị báo cáo...</p>');
    try {
        const types = all ? ['bang_can_doi_ke_toan', 'ket_qua_kinh_doanh'] : [currentStatementType];
        const reports = await Promise.all(types.map(fetchStatement));
        const tenKy = reports[0].duLieu?.tenKy || '';
        const now = new Date();
        const signDate = `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
        const signature = `
            <div class="sign">
                <div><b>Người lập biểu</b><br><i>(Ký, họ tên)</i></div>
                <div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div>
                <div>${signDate}<br><b>Giám đốc</b><br><i>(Ký, họ tên, đóng dấu)</i></div>
            </div>`;

        win.document.open();
        win.document.write(`<!DOCTYPE html><html lang="vi"><head>
            <meta charset="UTF-8">
            <title>Báo cáo tài chính ${escHtml(tenKy)}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Times New Roman', serif; font-size: 13px; color: #000; padding: 24px 32px; }
                .company { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; }
                .form-code { text-align: right; font-size: 11px; font-style: italic; }
                h1 { font-size: 18px; text-align: center; margin: 6px 0 2px; }
                .subtitle { text-align: center; font-style: italic; }
                .unit { text-align: right; font-size: 11px; font-style: italic; margin: 6px 0 4px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
                th { background: #f2f2f2; text-align: center; font-size: 12px; }
                th small { font-weight: normal; }
                td.num, th.num { text-align: right; white-space: nowrap; }
                td.indent { padding-left: 18px; }
                td.tk { font-size: 11px; color: #444; }
                tr.section td { font-weight: bold; background: #fafafa; }
                tr.total td { font-weight: bold; border-top: 2px solid #000; }
                .note { font-size: 11px; font-style: italic; margin-top: 6px; }
                .report ~ .report { page-break-before: always; }
                .sign { display: flex; justify-content: space-between; text-align: center; margin-top: 28px; page-break-inside: avoid; }
                .sign div { width: 32%; min-height: 110px; }
                .footer { text-align: center; color: #888; font-size: 10px; margin-top: 16px; }
                @page { size: A4; margin: 14mm; }
                @media print { body { padding: 0; } }
            </style>
        </head><body>
            <div class="company">
                <div><b>Đơn vị: NOMNOMFOOD</b><br>Địa chỉ: ..........................................</div>
                <div style="text-align:right">Kỳ báo cáo: ${escHtml(tenKy)}</div>
            </div>
            ${reports.map(r => statementPrintBody(r) + signature).join('')}
            <div class="footer">Báo cáo được tạo tự động từ hệ thống kế toán NomNomFood · ${now.toLocaleString('vi-VN')}</div>
            <script>window.onload = () => { window.print(); }<\/script>
        </body></html>`);
        win.document.close();
    } catch (err) {
        win.close();
        showToast(err.message, 'danger');
    }
}

// ==================== Kế toán: Hóa đơn bán hàng ====================
async function loadSalesInvoices() {
    try {
        const res = await fetch(`${API}/acc/sales-invoices`);
        allSalesInvoices = await res.json();
        renderSalesInvoices();
    } catch {
        showToast('Không tải được hóa đơn bán hàng', 'danger');
    }
}

function renderSalesInvoices() {
    const tbody = document.getElementById('sales-invoice-table-body');
    if (!allSalesInvoices.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Chưa có hóa đơn nào</td></tr>'; return; }
    tbody.innerHTML = allSalesInvoices.map(i => `
        <tr>
            <td class="font-monospace">${i.soHoaDon}</td>
            <td class="font-monospace">${i.order ? '#' + i.order._id.slice(-6).toUpperCase() : '—'}</td>
            <td class="text-end">${formatPrice(i.tienHang)}</td>
            <td class="text-end">${formatPrice(i.thueGtgtDauRa)}</td>
            <td>${new Date(i.ngayLap).toLocaleDateString('vi-VN')}</td>
        </tr>`).join('');
}

// ==================== Kế toán: Hủy đơn / Hoàn tiền ====================
function refundStatusLabel(s) {
    return {
        yeu_cau:      'Chờ kiểm tra',
        da_kiem_tra:  'Đã nhận chuyển khoản',
        da_hoan_tien: 'Đã hoàn tiền',
        tu_choi:      'Đã từ chối',
    }[s] || s;
}
function refundStatusBadgeClass(s) {
    return {
        yeu_cau:      'bg-warning text-dark',
        da_kiem_tra:  'bg-info',
        da_hoan_tien: 'bg-success',
        tu_choi:      'bg-secondary',
    }[s] || 'bg-secondary';
}

async function loadRefunds() {
    try {
        const res = await fetch(`${API}/acc/refunds`);
        allRefunds = await res.json();
        renderRefunds();
    } catch {
        showToast('Không tải được danh sách hoàn tiền', 'danger');
    }
}

function renderRefunds() {
    const tbody = document.getElementById('refund-table-body');
    if (!allRefunds.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Chưa có hoàn tiền nào</td></tr>'; return; }
    tbody.innerHTML = allRefunds.map(r => `
        <tr>
            <td class="font-monospace">${r.order ? '#' + r.order._id.slice(-6).toUpperCase() : '—'}</td>
            <td>${r.order?.user?.name || '—'}</td>
            <td>${r.lyDo || '—'}</td>
            <td class="text-end text-danger fw-semibold">${formatPrice(r.soTienHoan)}</td>
            <td><span class="badge ${refundStatusBadgeClass(r.trangThai)}">${refundStatusLabel(r.trangThai)}</span></td>
            <td>${new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="openRefundDetail('${r._id}')" title="Xem & trả lời">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        </tr>`).join('');
}

async function refreshRefundBadge() {
    try {
        const res = await fetch(`${API}/acc/refunds`);
        const refunds = await res.json();
        const pending = refunds.filter(r => r.trangThai === 'yeu_cau' || r.trangThai === 'da_kiem_tra').length;
        [document.getElementById('refund-request-badge'), document.getElementById('refund-request-badge-tab')].forEach(el => {
            if (!el) return;
            el.textContent = pending;
            el.classList.toggle('d-none', pending === 0);
        });
    } catch {
        // bỏ qua lỗi polling badge
    }
}

async function openRefundDetail(id) {
    currentRefundId = id;
    const refund = allRefunds.find(r => r._id === id);
    if (!refund) return;

    const order = refund.order;
    document.getElementById('rfd-title').textContent =
        `Hoàn tiền đơn #${order ? order._id.slice(-6).toUpperCase() : '—'}`;
    document.getElementById('rfd-info').innerHTML = `
        <div class="p-3 rounded-3" style="background:#f8f9fa">
            <div class="d-flex justify-content-between py-1"><span class="text-muted">Khách hàng</span><strong>${order?.user?.name || '—'}</strong></div>
            <div class="d-flex justify-content-between py-1"><span class="text-muted">Số tiền hoàn</span><strong class="text-danger">${formatPrice(refund.soTienHoan)}</strong></div>
            <div class="d-flex justify-content-between py-1"><span class="text-muted">Lý do</span><span>${refund.lyDo || '—'}</span></div>
            <div class="d-flex justify-content-between py-1"><span class="text-muted">Trạng thái</span><span class="badge ${refundStatusBadgeClass(refund.trangThai)}">${refundStatusLabel(refund.trangThai)}</span></div>
        </div>`;

    const actions = [];
    if (refund.trangThai === 'yeu_cau') {
        actions.push(`<button class="btn btn-success" onclick="confirmRefundTransfer()"><i class="fa-solid fa-check me-1"></i>Xác nhận đã nhận chuyển khoản</button>`);
        actions.push(`<button class="btn btn-outline-secondary" onclick="rejectRefund()"><i class="fa-solid fa-xmark me-1"></i>Từ chối</button>`);
    } else if (refund.trangThai === 'da_kiem_tra') {
        actions.push(`<button class="btn btn-danger" onclick="processRefund()"><i class="fa-solid fa-money-bill-transfer me-1"></i>Xác nhận hoàn tiền</button>`);
        actions.push(`<button class="btn btn-outline-secondary" onclick="rejectRefund()"><i class="fa-solid fa-xmark me-1"></i>Từ chối</button>`);
    }
    document.getElementById('rfd-actions').innerHTML = actions.join('');

    refundDetailModalInst.show();
    if (order) {
        await loadRefundChatMessages(order._id);
        startRefundChatPolling(order._id);
    }
}

async function confirmRefundTransfer() {
    try {
        const res = await fetch(`${API}/acc/refunds/${currentRefundId}/confirm-transfer`, { method: 'PUT' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Thao tác thất bại');
        showToast('Đã xác nhận nhận chuyển khoản', 'success');
        await loadRefunds();
        await refreshRefundBadge();
        openRefundDetail(currentRefundId);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function processRefund() {
    if (!confirm('Xác nhận hoàn tiền cho khách hàng?')) return;
    try {
        const res = await fetch(`${API}/acc/refunds/${currentRefundId}/process`, { method: 'PUT' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Thao tác thất bại');
        showToast('Đã hoàn tiền cho khách hàng', 'success');
        await loadRefunds();
        await refreshRefundBadge();
        refundDetailModalInst.hide();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function rejectRefund() {
    if (!confirm('Từ chối yêu cầu hoàn tiền này?')) return;
    try {
        const res = await fetch(`${API}/acc/refunds/${currentRefundId}/reject`, { method: 'PUT' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Thao tác thất bại');
        showToast('Đã từ chối yêu cầu hoàn tiền', 'success');
        await loadRefunds();
        await refreshRefundBadge();
        refundDetailModalInst.hide();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ---- Chat hoàn tiền ----
async function loadRefundChatMessages(orderId) {
    try {
        const res = await fetch(`${API}/orders/${orderId}/messages`);
        const messages = await res.json();
        renderRefundChatMessages(messages);
    } catch {
        // bỏ qua lỗi tải chat
    }
}

function escapeChatHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function renderRefundChatMessages(messages) {
    const box = document.getElementById('rfd-chat-messages');
    if (!messages.length) {
        box.innerHTML = '<p class="text-muted small text-center mt-3">Chưa có tin nhắn nào</p>';
        return;
    }
    box.innerHTML = messages.map(m => `
        <div class="d-flex ${m.sender === 'accounting' ? 'justify-content-end' : 'justify-content-start'} mb-2">
            <div class="px-2 py-2 rounded-3 small" style="max-width:75%;background:${m.sender === 'accounting' ? '#dc3545' : '#e9ecef'};color:${m.sender === 'accounting' ? '#fff' : '#1a1a2e'}">
                ${m.imageUrl ? `<img src="${m.imageUrl}" class="rounded-2 d-block" style="max-width:100%;max-height:200px;cursor:pointer" onclick="window.open(this.src,'_blank')">` : ''}
                ${m.text ? `<div${m.imageUrl ? ' class="mt-1"' : ''}>${escapeChatHtml(m.text)}</div>` : ''}
            </div>
        </div>`).join('');
    box.scrollTop = box.scrollHeight;
}

function startRefundChatPolling(orderId) {
    stopRefundChatPolling();
    refundChatPollTimer = setInterval(() => loadRefundChatMessages(orderId), 5000);
}

function stopRefundChatPolling() {
    if (refundChatPollTimer) { clearInterval(refundChatPollTimer); refundChatPollTimer = null; }
}

async function sendRefundChatMessage() {
    const input = document.getElementById('rfd-chat-input');
    const text = input.value.trim();
    const refund = allRefunds.find(r => r._id === currentRefundId);
    if (!text || !refund?.order) return;
    input.value = '';
    try {
        await fetch(`${API}/orders/${refund.order._id}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: 'accounting', text }),
        });
        await loadRefundChatMessages(refund.order._id);
    } catch {
        showToast('Gửi tin nhắn thất bại', 'danger');
    }
}

async function sendRefundChatImage(input) {
    const file = input.files[0];
    input.value = '';
    const refund = allRefunds.find(r => r._id === currentRefundId);
    if (!file || !refund?.order) return;
    try {
        const fd = new FormData();
        fd.append('image', file);
        const upRes = await fetch(`${API}/upload/chat-image`, { method: 'POST', body: fd });
        const upJson = await upRes.json();
        if (!upRes.ok) throw new Error(upJson.error || 'Tải ảnh thất bại');
        await fetch(`${API}/orders/${refund.order._id}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: 'accounting', imageUrl: upJson.url }),
        });
        await loadRefundChatMessages(refund.order._id);
    } catch (err) {
        showToast(err.message || 'Gửi hình ảnh thất bại', 'danger');
    }
}

async function openRefundModal() {
    if (!allOrders.length) await loadOrders();
    const completed = allOrders.filter(o => o.status === 'completed');
    document.getElementById('rf-order').innerHTML = completed.map(o => `<option value="${o._id}">#${o._id.slice(-6).toUpperCase()} - ${formatPrice(o.totalPrice)}</option>`).join('');
    document.getElementById('rf-lydo').value = '';
    document.getElementById('rf-sotien').value = '';
    refundModalInst.show();
}

async function saveRefund() {
    const order = document.getElementById('rf-order').value;
    const lyDo = document.getElementById('rf-lydo').value.trim();
    const soTienHoan = Number(document.getElementById('rf-sotien').value);
    if (!order) { showToast('Vui lòng chọn đơn hàng', 'warning'); return; }
    if (!soTienHoan || soTienHoan <= 0) { showToast('Vui lòng nhập số tiền hợp lệ', 'warning'); return; }
    try {
        const res = await fetch(`${API}/acc/refunds`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order, lyDo, soTienHoan }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast('Đã ghi nhận hoàn tiền', 'success');
        refundModalInst.hide();
        await loadRefunds();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== Kế toán: Kênh bán hàng ====================
async function loadChannels() {
    try {
        const res = await fetch(`${API}/acc/channels`);
        allChannels = await res.json();
        renderChannels();
    } catch {
        showToast('Không tải được kênh bán hàng', 'danger');
    }
}

function renderChannels() {
    const tbody = document.getElementById('channel-table-body');
    if (!allChannels.length) { tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-3">Chưa có kênh bán hàng nào</td></tr>'; return; }
    tbody.innerHTML = allChannels.map(c => `
        <tr><td>${c.tenKenh}</td><td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="deleteChannel('${c._id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('');
}

function openChannelModal() {
    document.getElementById('ch-ten').value = '';
    channelModalInst.show();
}

async function saveChannel() {
    const tenKenh = document.getElementById('ch-ten').value.trim();
    if (!tenKenh) { showToast('Vui lòng nhập tên kênh', 'warning'); return; }
    try {
        const res = await fetch(`${API}/acc/channels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenKenh }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast('Đã thêm kênh bán hàng', 'success');
        channelModalInst.hide();
        await loadChannels();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteChannel(id) {
    if (!confirm('Xác nhận xóa kênh bán hàng này?')) return;
    try {
        const res = await fetch(`${API}/acc/channels/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa kênh bán hàng', 'success');
        await loadChannels();
    } catch {
        showToast('Lỗi khi xóa kênh bán hàng', 'danger');
    }
}

// ==================== Kế toán: Tài khoản ngân hàng ====================
async function loadBankAccounts() {
    try {
        const res = await fetch(`${API}/acc/bank-accounts`);
        allBankAccounts = await res.json();
        renderBankAccounts();
    } catch {
        showToast('Không tải được danh sách tài khoản ngân hàng', 'danger');
    }
}

function renderBankAccounts() {
    const tbody = document.getElementById('bank-account-table-body');
    if (!allBankAccounts.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Chưa có tài khoản ngân hàng nào</td></tr>';
        return;
    }
    tbody.innerHTML = allBankAccounts.map(a => `
        <tr>
            <td>${a.tenNganHang}</td>
            <td class="font-monospace">${a.soTaiKhoan}</td>
            <td>${a.chuTaiKhoan}</td>
            <td>${a.chiNhanh || '—'}</td>
            <td>${a.isDefault ? '<span class="badge bg-danger">Mặc định</span>' : '—'}</td>
            <td>${a.active ? '<span class="badge bg-success">Hoạt động</span>' : '<span class="badge bg-secondary">Tạm khóa</span>'}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openBankAccountModal('${a._id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteBankAccount('${a._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

function openBankAccountModal(id) {
    document.getElementById('ba-nganhang-code').innerHTML =
        VIETQR_BANKS.map(b => `<option value="${b.code}">${b.name}</option>`).join('');

    const account = id ? allBankAccounts.find(a => a._id === id) : null;
    document.getElementById('ba-id').value = account?._id || '';
    document.getElementById('ba-nganhang-code').value = account?.nganHangCode || VIETQR_BANKS[0].code;
    document.getElementById('ba-sotk').value = account?.soTaiKhoan || '';
    document.getElementById('ba-chutk').value = account?.chuTaiKhoan || '';
    document.getElementById('ba-chinhanh').value = account?.chiNhanh || '';
    document.getElementById('ba-macdinh').checked = account?.isDefault || false;
    document.getElementById('ba-active').checked = account ? account.active : true;
    document.querySelector('#bankAccountModal .modal-title').textContent =
        account ? 'Sửa tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng';

    bankAccountModalInst.show();
}

async function saveBankAccount() {
    const id = document.getElementById('ba-id').value;
    const nganHangCode = document.getElementById('ba-nganhang-code').value;
    const tenNganHang = VIETQR_BANKS.find(b => b.code === nganHangCode)?.name || nganHangCode;
    const soTaiKhoan = document.getElementById('ba-sotk').value.trim();
    const chuTaiKhoan = document.getElementById('ba-chutk').value.trim().toUpperCase();
    const chiNhanh = document.getElementById('ba-chinhanh').value.trim();
    const isDefault = document.getElementById('ba-macdinh').checked;
    const active = document.getElementById('ba-active').checked;

    if (!soTaiKhoan || !chuTaiKhoan) {
        showToast('Vui lòng nhập đầy đủ số tài khoản và chủ tài khoản', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API}/acc/bank-accounts${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nganHangCode, tenNganHang, soTaiKhoan, chuTaiKhoan, chiNhanh, isDefault, active }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast('Đã lưu tài khoản ngân hàng', 'success');
        bankAccountModalInst.hide();
        await loadBankAccounts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteBankAccount(id) {
    if (!confirm('Xác nhận xóa tài khoản ngân hàng này?')) return;
    try {
        const res = await fetch(`${API}/acc/bank-accounts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa tài khoản ngân hàng', 'success');
        await loadBankAccounts();
    } catch {
        showToast('Lỗi khi xóa tài khoản ngân hàng', 'danger');
    }
}

// ==================== Kế toán: Tờ khai thuế GTGT ====================
let vatDetail = null;
let vatEditingInvoice = null;

const VAT_STATUS = {
    nhap:    ['Đang lập', 'bg-warning text-dark'],
    da_chot: ['Đã chốt', 'bg-primary'],
    da_nop:  ['Đã nộp thuế', 'bg-success'],
};

async function loadVat() {
    const el = document.getElementById('vat-content');
    if (!currentAccPeriod) { el.innerHTML = '<p class="text-muted fst-italic">Vui lòng chọn kỳ kế toán</p>'; return; }
    el.innerHTML = '<p class="text-muted fst-italic">Đang tải...</p>';
    try {
        const res = await fetch(`${API}/acc/vat?period=${currentAccPeriod}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không tải được tờ khai thuế GTGT');
        vatDetail = data;
        renderVat();
    } catch (err) {
        el.innerHTML = `<p class="text-danger">${escHtml(err.message)}</p>`;
    }
}

// Gọi một thao tác trên tờ khai rồi hiển thị lại kết quả
async function vatRequest(url, method, body, okMsg) {
    try {
        const res = await fetch(`${API}${url}`, {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Thao tác thất bại');
        if (okMsg) showToast(okMsg, 'success');
        return data;
    } catch (err) {
        showToast(err.message, 'danger');
        return null;
    }
}

async function saveVatSettings() {
    const body = {
        thueSuatDauRa: Number(document.getElementById('vat-rate').value),
        dieuChinhTang: Number(document.getElementById('vat-adj-up').value) || 0,
        dieuChinhGiam: Number(document.getElementById('vat-adj-down').value) || 0,
        ghiChu: document.getElementById('vat-note').value,
    };
    const data = await vatRequest(`/acc/vat/${currentAccPeriod}`, 'PUT', body, 'Đã lưu tờ khai');
    if (data) { vatDetail = data; renderVat(); }
}

async function closeVatDeclaration() {
    const v = vatDetail.vat;
    if (!confirm(`Chốt tờ khai ${vatDetail.period.tenKy}?\n\nHệ thống sẽ ghi sổ:\n• Nợ 511 / Có 3331: ${formatPrice(v.thueDauRa)} (tách thuế đầu ra khỏi doanh thu)\n• Nợ 3331 / Có 1331: khấu trừ thuế đầu vào${v.dieuChinhTang ? `\n• Nợ 811 / Có 3331: ${formatPrice(v.dieuChinhTang)} (điều chỉnh tăng)` : ''}${v.dieuChinhGiam ? `\n• Nợ 3331 / Có 711: ${formatPrice(v.dieuChinhGiam)} (điều chỉnh giảm)` : ''}\n\nSau khi chốt, muốn sửa phải mở lại tờ khai.`)) return;
    const data = await vatRequest(`/acc/vat/${currentAccPeriod}/close`, 'POST', {}, 'Đã chốt tờ khai và ghi sổ thuế');
    if (data) { vatDetail = data; renderVat(); }
}

async function payVatDeclaration() {
    const v = vatDetail.vat;
    const today = new Date();
    const def = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const ngayNop = prompt(`Ghi nhận đã nộp ${formatPrice(v.thuePhaiNop)} thuế GTGT (Nợ 3331 / Có 111).\nNhập ngày nộp (YYYY-MM-DD):`, def);
    if (!ngayNop) return;
    const data = await vatRequest(`/acc/vat/${currentAccPeriod}/pay`, 'POST', { ngayNop }, 'Đã ghi nhận nộp thuế');
    if (data) { vatDetail = data; renderVat(); }
}

async function reopenVatDeclaration() {
    if (!confirm('Mở lại tờ khai? Các bút toán thuế đã ghi cho kỳ này sẽ bị xóa để bạn sửa và chốt lại.')) return;
    const data = await vatRequest(`/acc/vat/${currentAccPeriod}/reopen`, 'POST', {}, 'Đã mở lại tờ khai');
    if (data) { vatDetail = data; renderVat(); }
}

function editVatInvoice(id) { vatEditingInvoice = id; renderVat(); document.getElementById('vat-inv-input')?.focus(); }
function cancelVatInvoice() { vatEditingInvoice = null; renderVat(); }

// Gợi ý nhanh: điền thuế theo thuế suất trên tiền hàng
function fillVatInvoiceRate(tienHang, rate) {
    document.getElementById('vat-inv-input').value = Math.round(tienHang * rate / 100);
}

async function saveVatInvoice(id) {
    const thueGtgtDauVao = Number(document.getElementById('vat-inv-input').value) || 0;
    const data = await vatRequest(`/acc/purchase-invoices/${id}/vat`, 'PUT', { thueGtgtDauVao }, 'Đã cập nhật thuế đầu vào của hóa đơn');
    if (data) { vatEditingInvoice = null; await loadVat(); }
}

function renderVat() {
    const { vat: v, period, hoaDonDauVao, banRaTheoNgay, butToanThue } = vatDetail;
    const editable = v.trangThai === 'nhap';
    const money = n => {
        const x = Math.round(n || 0);
        if (!x) return '<span class="text-muted">–</span>';
        return x < 0 ? `<span class="text-danger">(${formatPrice(-x)})</span>` : formatPrice(x);
    };
    const fmtD = s => new Date(s).toLocaleDateString('vi-VN');
    const [statusLabel, statusClass] = VAT_STATUS[v.trangThai] || [v.trangThai, 'bg-secondary'];

    document.getElementById('vat-status-badge').innerHTML = `<span class="badge ${statusClass} ms-1 align-middle small">${statusLabel}</span>`;
    document.getElementById('vat-subtitle').textContent =
        `Kỳ ${period.tenKy} (${fmtD(period.ngayBatDau)} – ${fmtD(period.ngayKetThuc)}) · Phương pháp khấu trừ · Giá bán đã bao gồm thuế GTGT`
        + (v.ngayChot ? ` · Chốt ngày ${fmtD(v.ngayChot)}` : '') + (v.ngayNop ? ` · Nộp ngày ${fmtD(v.ngayNop)}` : '');

    document.getElementById('vat-actions').innerHTML = [
        editable ? `<button class="btn btn-outline-secondary btn-sm" onclick="loadVat()"><i class="fa-solid fa-rotate me-1"></i>Tính lại</button>` : '',
        editable ? `<button class="btn btn-danger btn-sm" onclick="closeVatDeclaration()"><i class="fa-solid fa-lock me-1"></i>Chốt tờ khai</button>` : '',
        v.trangThai === 'da_chot' ? `<button class="btn btn-success btn-sm" onclick="payVatDeclaration()"><i class="fa-solid fa-money-bill-wave me-1"></i>Ghi nhận nộp thuế</button>` : '',
        !editable ? `<button class="btn btn-outline-danger btn-sm" onclick="reopenVatDeclaration()"><i class="fa-solid fa-lock-open me-1"></i>Mở lại</button>` : '',
        `<button class="btn btn-outline-dark btn-sm" onclick="printVat()"><i class="fa-solid fa-print me-1"></i>In tờ khai</button>`,
    ].join('');

    const net = v.thuePhaiNop > 0;
    const card = (label, value, note, color) => `
        <div class="col-6 col-lg-3">
            <div class="border rounded-3 p-3 h-100" style="border-left:4px solid ${color} !important">
                <div class="text-muted small">${label}</div>
                <div class="fs-5 fw-bold" style="color:${color}">${formatPrice(value)}</div>
                <div class="text-muted small">${note}</div>
            </div>
        </div>`;

    const line = (ma, label, value, opts = {}) => `
        <tr class="${opts.bold ? 'fw-bold table-light' : ''}">
            <td class="font-monospace text-muted">[${ma}]</td>
            <td class="${opts.bold ? '' : 'ps-3'}">${label}${opts.note ? `<div class="small text-muted fw-normal">${opts.note}</div>` : ''}</td>
            <td class="text-end text-nowrap">${opts.raw ?? money(value)}</td>
        </tr>`;

    const settingsHtml = editable ? `
        <div class="border rounded-3 p-3 h-100 bg-light">
            <h6 class="fw-bold mb-3"><i class="fa-solid fa-pen-to-square me-1 text-primary"></i>Chỉnh sửa tờ khai</h6>
            <div class="mb-2">
                <label class="form-label small fw-semibold mb-1">Thuế suất đầu ra</label>
                <select class="form-select form-select-sm" id="vat-rate">
                    ${[0, 5, 8, 10].map(r => `<option value="${r}" ${v.thueSuatDauRa === r ? 'selected' : ''}>${r}%${r === 8 ? ' (dịch vụ ăn uống, giảm 2%)' : r === 10 ? ' (thông thường)' : ''}</option>`).join('')}
                </select>
            </div>
            <div class="row g-2 mb-2">
                <div class="col-6">
                    <label class="form-label small fw-semibold mb-1">Điều chỉnh tăng</label>
                    <input type="number" min="0" step="1000" class="form-control form-control-sm" id="vat-adj-up" value="${v.dieuChinhTang || 0}">
                </div>
                <div class="col-6">
                    <label class="form-label small fw-semibold mb-1">Điều chỉnh giảm</label>
                    <input type="number" min="0" step="1000" class="form-control form-control-sm" id="vat-adj-down" value="${v.dieuChinhGiam || 0}">
                </div>
            </div>
            <div class="mb-2">
                <label class="form-label small fw-semibold mb-1">Ghi chú</label>
                <textarea class="form-control form-control-sm" id="vat-note" rows="2" placeholder="Lý do điều chỉnh, ghi chú cho kỳ...">${escHtml(v.ghiChu || '')}</textarea>
            </div>
            <button class="btn btn-primary btn-sm w-100" onclick="saveVatSettings()"><i class="fa-solid fa-floppy-disk me-1"></i>Lưu và tính lại</button>
            <div class="small text-muted mt-2">Thuế đầu vào của từng hóa đơn sửa ở tab "Hóa đơn đầu vào" bên dưới.</div>
        </div>` : `
        <div class="border rounded-3 p-3 h-100 bg-light">
            <h6 class="fw-bold mb-2"><i class="fa-solid fa-lock me-1"></i>Tờ khai đã chốt</h6>
            <div class="small mb-1">Thuế suất đầu ra: <b>${v.thueSuatDauRa}%</b></div>
            <div class="small mb-1">Điều chỉnh tăng / giảm: <b>${formatPrice(v.dieuChinhTang)}</b> / <b>${formatPrice(v.dieuChinhGiam)}</b></div>
            ${v.ghiChu ? `<div class="small mb-1">Ghi chú: ${escHtml(v.ghiChu)}</div>` : ''}
            <div class="small text-muted mt-2">Muốn sửa số liệu, bấm <b>Mở lại</b> để hủy các bút toán thuế đã ghi rồi chỉnh sửa.</div>
        </div>`;

    const invoiceRows = hoaDonDauVao.length ? hoaDonDauVao.map(i => {
        const editing = editable && vatEditingInvoice === i._id;
        return `
            <tr>
                <td class="font-monospace">${escHtml(i.soHoaDon)}</td>
                <td>${fmtD(i.ngay)}</td>
                <td>${escHtml(i.ncc)}${i.maSoThue ? `<div class="small text-muted">MST: ${escHtml(i.maSoThue)}</div>` : ''}</td>
                <td class="text-end">${formatPrice(i.tienHang)}</td>
                <td class="text-end">${editing ? '' : `${i.thueSuat}%`}</td>
                <td class="text-end" style="min-width:${editing ? 260 : 120}px">
                    ${editing ? `
                        <div class="input-group input-group-sm">
                            <input type="number" min="0" step="1000" class="form-control text-end" id="vat-inv-input" value="${i.thueGtgt}">
                            <button class="btn btn-outline-secondary" onclick="fillVatInvoiceRate(${i.tienHang}, 8)" title="Tính theo 8%">8%</button>
                            <button class="btn btn-outline-secondary" onclick="fillVatInvoiceRate(${i.tienHang}, 10)" title="Tính theo 10%">10%</button>
                        </div>` : formatPrice(i.thueGtgt)}
                </td>
                <td class="text-end text-nowrap">
                    ${editing
                        ? `<button class="btn btn-sm btn-primary me-1" onclick="saveVatInvoice('${i._id}')" title="Lưu"><i class="fa-solid fa-check"></i></button><button class="btn btn-sm btn-outline-secondary" onclick="cancelVatInvoice()" title="Hủy"><i class="fa-solid fa-xmark"></i></button>`
                        : editable ? `<button class="btn btn-sm btn-outline-primary" onclick="editVatInvoice('${i._id}')" title="Sửa thuế GTGT"><i class="fa-solid fa-pen"></i></button>` : ''}
                </td>
            </tr>`;
    }).join('') + `
        <tr class="fw-bold table-light"><td colspan="3">Tổng cộng (${hoaDonDauVao.length} hóa đơn)</td>
            <td class="text-end">${formatPrice(hoaDonDauVao.reduce((s, i) => s + i.tienHang, 0))}</td><td></td>
            <td class="text-end">${formatPrice(hoaDonDauVao.reduce((s, i) => s + i.thueGtgt, 0))}</td><td></td></tr>`
        : '<tr><td colspan="7" class="text-center text-muted py-3">Kỳ này chưa có hóa đơn mua vào</td></tr>';

    const salesRows = banRaTheoNgay.length ? banRaTheoNgay.map(g => `
            <tr>
                <td>${fmtD(g.ngay)}</td>
                <td class="text-end">${g.soHoaDon}</td>
                <td class="text-end">${formatPrice(g.tienHang)}</td>
                <td class="text-end">${formatPrice(g.chuaThue)}</td>
                <td class="text-end">${formatPrice(g.thueGtgt)}</td>
            </tr>`).join('') + `
        <tr class="fw-bold table-light"><td>Tổng cộng</td>
            <td class="text-end">${banRaTheoNgay.reduce((s, g) => s + g.soHoaDon, 0)}</td>
            <td class="text-end">${formatPrice(banRaTheoNgay.reduce((s, g) => s + g.tienHang, 0))}</td>
            <td class="text-end">${formatPrice(banRaTheoNgay.reduce((s, g) => s + g.chuaThue, 0))}</td>
            <td class="text-end">${formatPrice(banRaTheoNgay.reduce((s, g) => s + g.thueGtgt, 0))}</td></tr>`
        : '<tr><td colspan="5" class="text-center text-muted py-3">Kỳ này chưa có hóa đơn bán ra</td></tr>';

    const entryRows = butToanThue.length ? butToanThue.map(e => `
            <tr>
                <td>${fmtD(e.ngayGhi)}</td>
                <td>${escHtml(e.noiDung)}</td>
                <td class="font-monospace">${escHtml(e.tkNo?.soHieuTK || '')}</td>
                <td class="font-monospace">${escHtml(e.tkCo?.soHieuTK || '')}</td>
                <td class="text-end">${formatPrice(e.soTien)}</td>
            </tr>`).join('')
        : `<tr><td colspan="5" class="text-center text-muted py-3">${editable ? 'Chưa ghi sổ. Bút toán thuế được tạo khi bấm "Chốt tờ khai".' : 'Không có bút toán thuế'}</td></tr>`;

    document.getElementById('vat-content').innerHTML = `
        <div class="row g-3 mb-4">
            ${card('Thuế GTGT đầu ra', v.thueDauRa, `${v.thueSuatDauRa}% trên ${formatPrice(v.doanhThuGomThue)} doanh thu`, '#0d6efd')}
            ${card('Thuế GTGT đầu vào', v.thueDauVao, `${hoaDonDauVao.length} hóa đơn mua vào`, '#6f42c1')}
            ${card('Kỳ trước chuyển sang', v.kyTruocChuyenSang, 'Thuế đầu vào còn được khấu trừ', '#6c757d')}
            ${net
                ? card('Thuế phải nộp', v.thuePhaiNop, v.trangThai === 'da_nop' ? 'Đã nộp' : 'Số phải nộp ngân sách', '#dc3545')
                : card('Còn được khấu trừ', v.conDuocKhauTru, 'Chuyển sang kỳ sau', '#198754')}
        </div>

        <div class="row g-4 mb-4">
            <div class="col-lg-7">
                <h6 class="fw-bold mb-2">Các chỉ tiêu tờ khai</h6>
                <table class="table table-sm align-middle admin-table mb-0">
                    <tbody>
                        ${line('22', 'Thuế GTGT còn được khấu trừ kỳ trước chuyển sang', v.kyTruocChuyenSang)}
                        ${line('23', 'Giá trị hàng hóa, dịch vụ mua vào', v.giaTriMuaVao, { note: 'Tiền hàng trên hóa đơn mua nguyên liệu (chưa thuế)' })}
                        ${line('25', 'Thuế GTGT của hàng hóa, dịch vụ mua vào được khấu trừ', v.thueDauVao)}
                        ${line('26', 'Doanh thu bán ra (đã gồm thuế)', v.doanhThuGomThue, { note: 'Doanh thu bán hàng trừ hoàn tiền' })}
                        ${line('32', `Doanh thu chịu thuế suất ${v.thueSuatDauRa}% (chưa thuế)`, v.doanhThuChuaThue)}
                        ${line('33', 'Thuế GTGT đầu ra', v.thueDauRa, { note: `= [26] × ${v.thueSuatDauRa} / ${100 + v.thueSuatDauRa}` })}
                        ${line('37', 'Điều chỉnh giảm', v.dieuChinhGiam)}
                        ${line('38', 'Điều chỉnh tăng', v.dieuChinhTang)}
                        ${line('40', 'Thuế GTGT phải nộp trong kỳ', v.thuePhaiNop, { bold: true, note: '= [33] − [25] − [22] + [38] − [37], nếu dương' })}
                        ${line('43', 'Thuế GTGT còn được khấu trừ chuyển kỳ sau', v.conDuocKhauTru, { bold: true, note: 'Nếu phần trên âm' })}
                    </tbody>
                </table>
            </div>
            <div class="col-lg-5">${settingsHtml}</div>
        </div>

        <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#vat-tab-in" type="button">Hóa đơn đầu vào (${hoaDonDauVao.length})</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#vat-tab-out" type="button">Doanh thu bán ra (${banRaTheoNgay.length} ngày)</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#vat-tab-je" type="button">Bút toán thuế (${butToanThue.length})</button></li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="vat-tab-in">
                <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle admin-table">
                        <thead class="table-light"><tr><th>Số hóa đơn</th><th>Ngày</th><th>Nhà cung cấp</th><th class="text-end">Tiền hàng</th><th class="text-end">Thuế suất</th><th class="text-end">Thuế GTGT</th><th></th></tr></thead>
                        <tbody>${invoiceRows}</tbody>
                    </table>
                </div>
            </div>
            <div class="tab-pane fade" id="vat-tab-out">
                <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle admin-table">
                        <thead class="table-light"><tr><th>Ngày</th><th class="text-end">Số hóa đơn</th><th class="text-end">Doanh thu (gồm thuế)</th><th class="text-end">Chưa thuế</th><th class="text-end">Thuế GTGT ${v.thueSuatDauRa}%</th></tr></thead>
                        <tbody>${salesRows}</tbody>
                    </table>
                </div>
                <div class="small text-muted">Tổng theo hóa đơn bán hàng lập trong kỳ. Thuế đầu ra trên tờ khai tính trên doanh thu đã trừ hoàn tiền.</div>
            </div>
            <div class="tab-pane fade" id="vat-tab-je">
                <table class="table table-sm align-middle admin-table">
                    <thead class="table-light"><tr><th>Ngày</th><th>Nội dung</th><th>TK Nợ</th><th>TK Có</th><th class="text-end">Số tiền</th></tr></thead>
                    <tbody>${entryRows}</tbody>
                </table>
            </div>
        </div>`;
}

function printVat() {
    if (!vatDetail) return;
    const { vat: v, period, hoaDonDauVao } = vatDetail;
    const fmtD = s => new Date(s).toLocaleDateString('vi-VN');
    const money = n => { const x = Math.round(n || 0); return x ? formatPrice(x) : '–'; };
    const row = (ma, label, value, bold) => `<tr class="${bold ? 'bold' : ''}"><td class="c">[${ma}]</td><td>${label}</td><td class="num">${money(value)}</td></tr>`;
    const invRows = hoaDonDauVao.map((i, k) => `<tr><td class="c">${k + 1}</td><td>${escHtml(i.soHoaDon)}</td><td>${fmtD(i.ngay)}</td><td>${escHtml(i.ncc)}</td><td>${escHtml(i.maSoThue || '')}</td><td class="num">${money(i.tienHang)}</td><td class="num">${money(i.thueGtgt)}</td></tr>`).join('');
    const now = new Date();
    const html = `<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8"><title>Tờ khai thuế GTGT ${escHtml(period.tenKy)}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Times New Roman', serif; font-size: 13px; color: #000; padding: 24px 32px; }
            h1 { font-size: 18px; text-align: center; margin: 8px 0 2px; }
            h2 { font-size: 14px; margin: 18px 0 6px; }
            .c { text-align: center; } .subtitle { text-align: center; font-style: italic; }
            .info { margin: 12px 0; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px 6px; }
            th { background: #f2f2f2; }
            .num { text-align: right; white-space: nowrap; }
            tr.bold td { font-weight: bold; background: #fafafa; }
            .sign { display: flex; justify-content: flex-end; text-align: center; margin-top: 24px; }
            .sign div { width: 40%; min-height: 100px; }
            @page { size: A4; margin: 14mm; }
        </style></head><body>
        <div class="c"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><u>Độc lập - Tự do - Hạnh phúc</u></div>
        <h1>TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG</h1>
        <p class="subtitle">(Áp dụng cho người nộp thuế tính thuế theo phương pháp khấu trừ — bản tổng hợp nội bộ)</p>
        <div class="info">
            Kỳ tính thuế: <b>${escHtml(period.tenKy)}</b> (${fmtD(period.ngayBatDau)} – ${fmtD(period.ngayKetThuc)})<br>
            Tên người nộp thuế: <b>NOMNOMFOOD</b> &nbsp;·&nbsp; Mã số thuế: .............................<br>
            Trạng thái: ${(VAT_STATUS[v.trangThai] || [v.trangThai])[0]}${v.ngayChot ? ` · Chốt ngày ${fmtD(v.ngayChot)}` : ''}${v.ngayNop ? ` · Nộp ngày ${fmtD(v.ngayNop)}` : ''}
        </div>
        <p style="text-align:right;font-style:italic;font-size:11px">Đơn vị tính: đồng</p>
        <table>
            <thead><tr><th style="width:60px">Mã</th><th>Chỉ tiêu</th><th style="width:160px">Số tiền</th></tr></thead>
            <tbody>
                ${row('22', 'Thuế GTGT còn được khấu trừ kỳ trước chuyển sang', v.kyTruocChuyenSang)}
                ${row('23', 'Giá trị hàng hóa, dịch vụ mua vào', v.giaTriMuaVao)}
                ${row('25', 'Thuế GTGT của hàng hóa, dịch vụ mua vào được khấu trừ', v.thueDauVao)}
                ${row('26', 'Doanh thu bán ra (đã gồm thuế)', v.doanhThuGomThue)}
                ${row('32', `Doanh thu chịu thuế suất ${v.thueSuatDauRa}% (chưa thuế)`, v.doanhThuChuaThue)}
                ${row('33', 'Thuế GTGT đầu ra', v.thueDauRa)}
                ${row('37', 'Điều chỉnh giảm', v.dieuChinhGiam)}
                ${row('38', 'Điều chỉnh tăng', v.dieuChinhTang)}
                ${row('40', 'Thuế GTGT phải nộp trong kỳ', v.thuePhaiNop, true)}
                ${row('43', 'Thuế GTGT còn được khấu trừ chuyển kỳ sau', v.conDuocKhauTru, true)}
            </tbody>
        </table>
        ${v.ghiChu ? `<p style="margin-top:6px"><i>Ghi chú: ${escHtml(v.ghiChu)}</i></p>` : ''}
        <h2>Bảng kê hóa đơn hàng hóa, dịch vụ mua vào</h2>
        <table>
            <thead><tr><th>STT</th><th>Số hóa đơn</th><th>Ngày</th><th>Người bán</th><th>MST người bán</th><th>Giá trị chưa thuế</th><th>Thuế GTGT</th></tr></thead>
            <tbody>${invRows || '<tr><td colspan="7" class="c">Không có hóa đơn</td></tr>'}</tbody>
        </table>
        <div class="sign"><div>Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}<br><b>NGƯỜI NỘP THUẾ</b><br><i>(Ký, ghi rõ họ tên)</i></div></div>
        <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ==================== Kế toán: Nhà cung cấp ====================
async function loadSuppliers() {
    try {
        const res = await fetch(`${API}/acc/suppliers`);
        allSuppliers = await res.json();
        renderSuppliers();
    } catch {
        showToast('Không tải được nhà cung cấp', 'danger');
    }
}

function renderSuppliers() {
    const tbody = document.getElementById('supplier-table-body');
    if (!allSuppliers.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Chưa có nhà cung cấp nào</td></tr>'; return; }
    tbody.innerHTML = allSuppliers.map(s => `
        <tr>
            <td>${escHtml(s.tenNCC)}</td>
            <td>${s.nhomHang ? `<span class="badge bg-light text-dark border">${escHtml(s.nhomHang)}</span>` : ''}${s.nguyenLieuCungCap?.length ? `<div class="small text-muted">${s.nguyenLieuCungCap.length} nguyên liệu</div>` : '<div class="small text-muted">Chưa gán nguyên liệu</div>'}</td>
            <td>${escHtml(s.diaChi || '—')}</td><td>${s.sdt || '—'}</td><td>${s.maSoThue || '—'}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openSupplierModal('${s._id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSupplier('${s._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

let supplierMaterials = [];

async function openSupplierModal(id) {
    try {
        supplierMaterials = await fetch(`${API}/acc/materials`).then(r => r.json());
    } catch {
        supplierMaterials = [];
    }
    document.getElementById('sup-id').value = '';
    ['sup-ten', 'sup-diachi', 'sup-sdt', 'sup-mst', 'sup-nhomhang', 'sup-nl-search', 'sup-stk', 'sup-chutk', 'sup-chinhanh'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('sup-bank').innerHTML = bankOptionsHtml('');
    document.getElementById('supplier-modal-title').textContent = 'Thêm nhà cung cấp';
    let selected = [];
    if (id) {
        const s = allSuppliers.find(x => x._id === id);
        if (s) {
            document.getElementById('sup-id').value = s._id;
            document.getElementById('sup-ten').value = s.tenNCC;
            document.getElementById('sup-diachi').value = s.diaChi || '';
            document.getElementById('sup-sdt').value = s.sdt || '';
            document.getElementById('sup-mst').value = s.maSoThue || '';
            document.getElementById('sup-nhomhang').value = s.nhomHang || '';
            document.getElementById('sup-bank').innerHTML = bankOptionsHtml(s.nganHangCode || '');
            document.getElementById('sup-stk').value = s.soTaiKhoan || '';
            document.getElementById('sup-chutk').value = s.chuTaiKhoan || '';
            document.getElementById('sup-chinhanh').value = s.chiNhanh || '';
            document.getElementById('supplier-modal-title').textContent = 'Sửa nhà cung cấp';
            selected = (s.nguyenLieuCungCap || []).map(String);
        }
    }
    renderSupplierMaterials(selected);
    supplierModalInst.show();
}

// Danh sách nguyên liệu dạng ô tích, nhóm theo kho
function renderSupplierMaterials(selected) {
    const box = document.getElementById('sup-nl-list');
    if (!supplierMaterials.length) { box.innerHTML = '<div class="text-muted small p-2">Chưa có nguyên liệu trong danh mục</div>'; return; }
    const sel = new Set(selected);
    const groups = new Map();
    for (const m of supplierMaterials) {
        const k = m.kho?.tenKho || 'Khác';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(m);
    }
    box.innerHTML = [...groups.entries()].map(([kho, list]) => `
        <div class="sup-nl-group mb-2">
            <div class="d-flex justify-content-between align-items-center border-bottom mb-1">
                <span class="small fw-bold text-muted">${escHtml(kho)}</span>
                <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" onclick="toggleSupplierGroup(this)">Chọn cả nhóm</button>
            </div>
            <div class="row g-1">
                ${list.sort((a, b) => a.tenNL.localeCompare(b.tenNL, 'vi')).map(m => `
                <div class="col-6 col-md-4 sup-nl-item" data-name="${escHtml(m.tenNL.toLowerCase())}">
                    <div class="form-check mb-0">
                        <input class="form-check-input sup-nl-cb" type="checkbox" value="${m._id}" id="sup-nl-${m._id}" ${sel.has(m._id) ? 'checked' : ''} onchange="updateSupplierMaterialCount()">
                        <label class="form-check-label small" for="sup-nl-${m._id}">${escHtml(m.tenNL)}</label>
                    </div>
                </div>`).join('')}
            </div>
        </div>`).join('');
    updateSupplierMaterialCount();
}

function toggleSupplierGroup(btn) {
    const cbs = [...btn.closest('.sup-nl-group').querySelectorAll('.sup-nl-item:not(.d-none) .sup-nl-cb')];
    const allChecked = cbs.every(cb => cb.checked);
    cbs.forEach(cb => cb.checked = !allChecked);
    updateSupplierMaterialCount();
}

function filterSupplierMaterials() {
    const q = document.getElementById('sup-nl-search').value.trim().toLowerCase();
    document.querySelectorAll('#sup-nl-list .sup-nl-item').forEach(el => el.classList.toggle('d-none', !!q && !el.dataset.name.includes(q)));
    document.querySelectorAll('#sup-nl-list .sup-nl-group').forEach(g => g.classList.toggle('d-none', !g.querySelector('.sup-nl-item:not(.d-none)')));
}

function updateSupplierMaterialCount() {
    const n = document.querySelectorAll('#sup-nl-list .sup-nl-cb:checked').length;
    document.getElementById('sup-nl-count').textContent = n ? `(đã chọn ${n})` : '(chưa chọn — hiện tất cả)';
}

async function saveSupplier() {
    const id = document.getElementById('sup-id').value;
    const tenNCC = document.getElementById('sup-ten').value.trim();
    if (!tenNCC) { showToast('Vui lòng nhập tên nhà cung cấp', 'warning'); return; }
    const body = {
        tenNCC,
        diaChi: document.getElementById('sup-diachi').value.trim(),
        sdt: document.getElementById('sup-sdt').value.trim(),
        maSoThue: document.getElementById('sup-mst').value.trim(),
        nhomHang: document.getElementById('sup-nhomhang').value.trim(),
        nganHangCode: document.getElementById('sup-bank').value,
        tenNganHang: VIETQR_BANKS.find(b => b.code === document.getElementById('sup-bank').value)?.name || '',
        soTaiKhoan: document.getElementById('sup-stk').value.replace(/\s+/g, ''),
        chuTaiKhoan: document.getElementById('sup-chutk').value.trim().toUpperCase(),
        chiNhanh: document.getElementById('sup-chinhanh').value.trim(),
        nguyenLieuCungCap: [...document.querySelectorAll('#sup-nl-list .sup-nl-cb:checked')].map(cb => cb.value),
    };
    try {
        const res = await fetch(`${API}/acc/suppliers${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật nhà cung cấp' : 'Đã thêm nhà cung cấp', 'success');
        supplierModalInst.hide();
        await loadSuppliers();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Nguyên liệu dùng cho một nhà cung cấp: theo danh mục đã gán, hoặc tất cả nếu chưa gán / bật "hiện tất cả"
function materialsForSupplier(materials, nccId, showAll) {
    const s = allSuppliers.find(x => x._id === nccId);
    const ids = new Set((s?.nguyenLieuCungCap || []).map(String));
    if (showAll || !ids.size) return { list: materials, filtered: false, supplier: s };
    return { list: materials.filter(m => ids.has(m._id)), filtered: true, supplier: s };
}

// Dòng gợi ý dưới bảng hàng hóa: đang lọc theo nhà cung cấp nào
function supplierFilterHint(elId, info, total) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!info.supplier) { el.textContent = ''; return; }
    el.innerHTML = info.filtered
        ? `<i class="fa-solid fa-filter me-1"></i>Đang hiện ${info.list.length}/${total} nguyên liệu do <b>${escHtml(info.supplier.tenNCC)}</b> cung cấp${info.supplier.nhomHang ? ` (${escHtml(info.supplier.nhomHang)})` : ''}.`
        : (info.supplier.nguyenLieuCungCap?.length ? 'Đang hiện tất cả nguyên liệu.' : `<i class="fa-solid fa-circle-info me-1"></i>${escHtml(info.supplier.tenNCC)} chưa gán danh mục nguyên liệu nên hiện tất cả. Gán ở mục Nhà cung cấp.`);
}


async function deleteSupplier(id) {
    if (!confirm('Xác nhận xóa nhà cung cấp này?')) return;
    try {
        const res = await fetch(`${API}/acc/suppliers/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa nhà cung cấp', 'success');
        await loadSuppliers();
    } catch {
        showToast('Lỗi khi xóa nhà cung cấp', 'danger');
    }
}

// ==================== Kế toán: Phiếu nhập kho ====================
async function loadReceipts() {
    try {
        if (!allSuppliers.length) await loadSuppliers();
        const res = await fetch(`${API}/acc/goods-receipts`);
        allReceipts = await res.json();
        renderReceipts();
    } catch {
        showToast('Không tải được phiếu nhập kho', 'danger');
    }
}

function renderReceipts() {
    const tbody = document.getElementById('receipt-table-body');
    if (!allReceipts.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Chưa có phiếu nhập nào</td></tr>'; return; }
    tbody.innerHTML = allReceipts.map(r => {
        const lines = r.chiTiet || [];
        return `
        <tr style="cursor:pointer" onclick="viewReceipt('${r._id}')" title="Xem phiếu nhập">
            <td class="font-monospace fw-semibold text-primary">${escHtml(r.soPhieu || '(phiếu cũ)')}</td>
            <td>${new Date(r.ngayNhap).toLocaleDateString('vi-VN')}</td>
            <td>${escHtml(r.ncc?.tenNCC || '—')}</td>
            <td>${escHtml(r.kho?.tenKho || '—')}</td>
            <td>${r.hoaDonMua
                ? `<span class="badge bg-light text-dark border"><i class="fa-solid fa-file-invoice me-1"></i>HĐ ${escHtml(r.hoaDonMua.soHoaDon || r.soChungTu)}</span>`
                : r.chiTiet?.length
                    ? `<button class="btn btn-sm btn-outline-primary py-0" onclick="event.stopPropagation(); openInvoiceForReceipt('${r._id}')" title="Lập hóa đơn mua cho phiếu này"><i class="fa-solid fa-plus me-1"></i>Lập hóa đơn</button>`
                    : '<span class="text-muted small">Chưa có HĐ</span>'}</td>
            <td class="text-end">${lines.length || '—'}</td>
            <td class="text-end fw-semibold">${formatPrice(r.tongTien)}</td>
            <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="event.stopPropagation(); viewReceipt('${r._id}')" title="Xem / In"><i class="fa-solid fa-print"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteReceipt('${r._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// ---------- Lập phiếu ----------
let receiptMaterials = [], receiptWarehouses = [], receiptLineSeq = 0, receiptVatManual = false;

async function openReceiptModal() {
    try {
        if (!allSuppliers.length) await loadSuppliers();
        [receiptWarehouses, receiptMaterials] = await Promise.all([
            fetch(`${API}/acc/warehouses`).then(r => r.json()),
            fetch(`${API}/acc/materials`).then(r => r.json()),
        ]);
    } catch {
        showToast('Không tải được danh mục kho / nguyên liệu', 'danger');
        return;
    }
    if (!allSuppliers.length) { showToast('Chưa có nhà cung cấp, hãy thêm nhà cung cấp trước', 'warning'); return; }
    if (!receiptMaterials.length) { showToast('Chưa có nguyên liệu trong danh mục', 'warning'); return; }

    const usable = allSuppliers.filter(s => !/playwright/i.test(s.tenNCC));
    document.getElementById('gr-ncc').innerHTML = '<option value="">— Chọn nhà cung cấp —</option>' +
        (usable.length ? usable : allSuppliers).map(s => `<option value="${s._id}">${escHtml(s.tenNCC)}</option>`).join('');
    document.getElementById('gr-kho').innerHTML = receiptWarehouses.map(w => `<option value="${w._id}">${escHtml(w.tenKho)}</option>`).join('');
    document.getElementById('gr-ngay').value = pnlDateStr(new Date());
    ['gr-nguoigiao', 'gr-sochungtu', 'gr-diengiai'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('gr-nguoilap').value = (typeof getUser === 'function' && getUser()?.name) || '';
    document.getElementById('gr-ncc-info').textContent = '';
    document.getElementById('gr-thuesuat').value = '0';
    document.getElementById('gr-showall').checked = false;
    document.getElementById('gr-filter-hint').textContent = '';
    document.getElementById('gr-thue').value = '';
    receiptVatManual = false;
    document.getElementById('gr-lines').innerHTML = '';
    receiptLineSeq = 0;
    addReceiptLine();
    receiptModalInst.show();
}

function onReceiptSupplierChange() {
    const s = allSuppliers.find(x => x._id === document.getElementById('gr-ncc').value);
    document.getElementById('gr-ncc-info').textContent = s
        ? [s.nhomHang, s.maSoThue && `MST: ${s.maSoThue}`, s.sdt && `ĐT: ${s.sdt}`, s.diaChi].filter(Boolean).join(' · ')
        : '';
    refreshReceiptLineOptions();
}

// Dựng lại danh sách nguyên liệu của các dòng theo NCC đang chọn (giữ dòng đã chọn nếu còn hợp lệ)
function refreshReceiptLineOptions() {
    const options = receiptMaterialOptions();
    document.querySelectorAll('#gr-lines .gr-nl').forEach(sel => {
        const v = sel.value;
        sel.innerHTML = options;
        if ([...sel.options].some(o => o.value === v)) sel.value = v;
    });
}

function receiptMaterialOptions() {
    const info = materialsForSupplier(receiptMaterials, document.getElementById('gr-ncc').value, document.getElementById('gr-showall')?.checked);
    supplierFilterHint('gr-filter-hint', info, receiptMaterials.length);
    const byKho = new Map();
    for (const m of info.list) {
        const key = m.kho?.tenKho || 'Khác';
        if (!byKho.has(key)) byKho.set(key, []);
        byKho.get(key).push(m);
    }
    return '<option value="">— Chọn nguyên liệu —</option>' + [...byKho.entries()].map(([kho, list]) => `
        <optgroup label="${escHtml(kho)}">
            ${list.sort((a, b) => a.tenNL.localeCompare(b.tenNL, 'vi')).map(m => `<option value="${m._id}">${escHtml(m.tenNL)} (tồn ${m.tonHienTai || 0})</option>`).join('')}
        </optgroup>`).join('');
}

function addReceiptLine() {
    const id = ++receiptLineSeq;
    const tr = document.createElement('tr');
    tr.dataset.line = id;
    tr.innerHTML = `
        <td class="text-muted gr-stt"></td>
        <td><select class="form-select form-select-sm gr-nl" onchange="onReceiptMaterialChange(this)">${receiptMaterialOptions()}</select></td>
        <td><input type="text" class="form-control form-control-sm gr-dvt" value="kg"></td>
        <td><input type="number" min="0" step="any" class="form-control form-control-sm text-end gr-slct" placeholder="0" oninput="onReceiptQtyDocChange(this)"></td>
        <td><input type="number" min="0" step="any" class="form-control form-control-sm text-end gr-sl" placeholder="0" oninput="updateReceiptTotals()"></td>
        <td><input type="number" min="0" step="100" class="form-control form-control-sm text-end gr-gia" placeholder="0" oninput="updateReceiptTotals()"></td>
        <td class="text-end fw-semibold gr-tt">0đ</td>
        <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeReceiptLine(this)" title="Xóa dòng"><i class="fa-solid fa-xmark"></i></button></td>`;
    document.getElementById('gr-lines').appendChild(tr);
    updateReceiptTotals();
}

function removeReceiptLine(btn) {
    const tbody = document.getElementById('gr-lines');
    if (tbody.children.length <= 1) { showToast('Phiếu cần ít nhất một dòng nguyên liệu', 'warning'); return; }
    btn.closest('tr').remove();
    updateReceiptTotals();
}

// Chọn nguyên liệu: điền sẵn ĐVT, đơn giá theo giá vốn bình quân và kho của nguyên liệu
function onReceiptMaterialChange(sel) {
    const tr = sel.closest('tr');
    const m = receiptMaterials.find(x => x._id === sel.value);
    if (!m) return;
    tr.querySelector('.gr-dvt').value = m.donViTinh || 'kg';
    if (!tr.querySelector('.gr-gia').value) tr.querySelector('.gr-gia').value = m.giaVonBinhQuan || '';
    const khoSel = document.getElementById('gr-kho');
    if (document.querySelectorAll('#gr-lines tr').length === 1 && m.kho?._id) khoSel.value = m.kho._id;
    updateReceiptTotals();
}

// SL thực nhập mặc định bằng SL chứng từ
function onReceiptQtyDocChange(input) {
    const sl = input.closest('tr').querySelector('.gr-sl');
    if (!sl.dataset.touched) sl.value = input.value;
    updateReceiptTotals();
}

function collectReceiptLines() {
    return [...document.querySelectorAll('#gr-lines tr')].map(tr => ({
        danhMucNL: tr.querySelector('.gr-nl').value,
        donViTinh: tr.querySelector('.gr-dvt').value.trim(),
        soLuongChungTu: Number(tr.querySelector('.gr-slct').value) || 0,
        soLuongThucNhap: Number(tr.querySelector('.gr-sl').value) || 0,
        donGia: Number(tr.querySelector('.gr-gia').value) || 0,
    }));
}

function onReceiptRateChange() {
    receiptVatManual = false;
    updateReceiptTotals();
}

function updateReceiptTotals() {
    document.querySelectorAll('#gr-lines tr').forEach((tr, i) => {
        tr.querySelector('.gr-stt').textContent = i + 1;
        const sl = tr.querySelector('.gr-sl');
        if (document.activeElement === sl) sl.dataset.touched = '1';
        const tt = Math.round((Number(sl.value) || 0) * (Number(tr.querySelector('.gr-gia').value) || 0));
        tr.querySelector('.gr-tt').textContent = formatPrice(tt);
    });
    const tienHang = collectReceiptLines().reduce((s, l) => s + Math.round(l.soLuongThucNhap * l.donGia), 0);
    const rate = Number(document.getElementById('gr-thuesuat').value) || 0;
    const thueEl = document.getElementById('gr-thue');
    if (!receiptVatManual) thueEl.value = Math.round(tienHang * rate / 100);
    const tong = tienHang + (Number(thueEl.value) || 0);
    document.getElementById('gr-tienhang').textContent = formatPrice(tienHang);
    document.getElementById('gr-tongtien').textContent = formatPrice(tong);
    document.getElementById('gr-bangchu').textContent = tong ? `Bằng chữ: ${soThanhChu(tong)}` : '';
}

async function saveReceipt(andPrint) {
    const ncc = document.getElementById('gr-ncc').value;
    const kho = document.getElementById('gr-kho').value;
    const ngayNhap = document.getElementById('gr-ngay').value;
    if (!ncc) { showToast('Vui lòng chọn nhà cung cấp', 'warning'); return; }
    if (!kho) { showToast('Vui lòng chọn kho nhập', 'warning'); return; }
    if (!ngayNhap) { showToast('Vui lòng chọn ngày nhập', 'warning'); return; }
    const chiTiet = collectReceiptLines();
    const bad = chiTiet.findIndex(l => !l.danhMucNL || l.soLuongThucNhap <= 0 || l.donGia < 0);
    if (bad !== -1) { showToast(`Dòng ${bad + 1}: chọn nguyên liệu và nhập số lượng thực nhập lớn hơn 0`, 'warning'); return; }
    const ids = chiTiet.map(l => l.danhMucNL);
    if (new Set(ids).size !== ids.length) { showToast('Mỗi nguyên liệu chỉ nên xuất hiện một dòng trên phiếu', 'warning'); return; }

    const body = {
        ncc, kho, ngayNhap: `${ngayNhap}T${new Date().toTimeString().slice(0, 8)}`,
        nguoiGiao: document.getElementById('gr-nguoigiao').value.trim(),
        nguoiLap: document.getElementById('gr-nguoilap').value.trim(),
        soChungTu: document.getElementById('gr-sochungtu').value.trim(),
        dienGiai: document.getElementById('gr-diengiai').value.trim(),
        thueSuat: Number(document.getElementById('gr-thuesuat').value) || 0,
        thueGtgt: Number(document.getElementById('gr-thue').value) || 0,
        chiTiet,
    };
    try {
        const res = await fetch(`${API}/acc/goods-receipts`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(`Đã lập phiếu ${json.soPhieu} và cộng tồn kho`, 'success');
        receiptModalInst.hide();
        await loadReceipts();
        if (andPrint) printReceipt(json, true);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteReceipt(id) {
    const r = allReceipts.find(x => x._id === id);
    const msg = r?.chiTiet?.length
        ? `Xóa phiếu ${r.soPhieu}?\n\nTồn kho các nguyên liệu sẽ bị trừ lại, bút toán${r.hoaDonMua ? ', hóa đơn mua và công nợ' : ''} đi kèm sẽ bị xóa.`
        : 'Xác nhận xóa phiếu nhập kho này?';
    if (!confirm(msg)) return;
    try {
        const res = await fetch(`${API}/acc/goods-receipts/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Lỗi khi xóa phiếu nhập kho');
        showToast('Đã xóa phiếu nhập kho', 'success');
        await loadReceipts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function openReceiptById(id) {
    if (!allReceipts.some(x => x._id === id)) await loadReceipts();
    viewReceipt(id);
}

function viewReceipt(id) {
    const r = allReceipts.find(x => x._id === id);
    if (r) printReceipt(r, false);
}

// ---------- Đọc số thành chữ ----------
function soThanhChu(n) {
    n = Math.round(Math.abs(n));
    if (n === 0) return 'Không đồng';
    const so = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const docBa = (x, full) => {
        const tram = Math.floor(x / 100), chuc = Math.floor((x % 100) / 10), dv = x % 10;
        const out = [];
        if (full || tram) out.push(so[tram], 'trăm');
        if (chuc > 1) {
            out.push(so[chuc], 'mươi');
            if (dv === 1) out.push('mốt'); else if (dv === 5) out.push('lăm'); else if (dv) out.push(so[dv]);
        } else if (chuc === 1) {
            out.push('mười');
            if (dv === 5) out.push('lăm'); else if (dv) out.push(so[dv]);
        } else if (dv) {
            if (full || tram) out.push('lẻ');
            out.push(so[dv]);
        }
        return out.join(' ');
    };
    const donVi = ['', 'nghìn', 'triệu', 'tỷ'];
    const groups = [];
    while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
    const parts = [];
    for (let i = groups.length - 1; i >= 0; i--) {
        if (!groups[i]) continue;
        const full = i < groups.length - 1;
        parts.push(docBa(groups[i], full) + (donVi[i % 4] ? ' ' + donVi[i % 4] : '') + (i >= 4 && i % 4 === 0 ? ' tỷ' : ''));
    }
    const s = parts.join(' ').replace(/\s+/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1) + ' đồng';
}

// ---------- In phiếu nhập kho (mẫu 01-VT) ----------
function printReceipt(r, autoPrint) {
    const d = new Date(r.ngayNhap);
    const lines = r.chiTiet || [];
    const fmtN = n => Number(n || 0).toLocaleString('vi-VN');
    const tienHang = r.tienHang || lines.reduce((s, l) => s + l.thanhTien, 0) || r.tongTien;
    const rows = lines.length ? lines.map((l, i) => `
        <tr>
            <td class="c">${i + 1}</td><td>${escHtml(l.tenNL)}</td><td class="c">${escHtml(l.donViTinh)}</td>
            <td class="num">${fmtN(l.soLuongChungTu)}</td><td class="num">${fmtN(l.soLuongThucNhap)}</td>
            <td class="num">${fmtN(l.donGia)}</td><td class="num">${fmtN(l.thanhTien)}</td>
        </tr>`).join('')
        : '<tr><td colspan="7" class="c"><i>Phiếu lập trước khi có chi tiết nguyên liệu</i></td></tr>';
    const ncc = r.ncc || {};
    const html = `<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8"><title>Phiếu nhập kho ${escHtml(r.soPhieu || '')}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Times New Roman', serif; font-size: 13px; color: #000; padding: 24px 32px; }
            .top { display: flex; justify-content: space-between; }
            .top .right { text-align: center; font-size: 12px; }
            h1 { text-align: center; font-size: 20px; margin: 14px 0 2px; letter-spacing: 1px; }
            .c { text-align: center; } .num { text-align: right; white-space: nowrap; }
            .meta { text-align: center; font-style: italic; margin-bottom: 4px; }
            .no { text-align: right; margin-top: -40px; font-size: 12px; line-height: 1.5; }
            .info { margin: 18px 0 10px; line-height: 1.8; }
            .info b { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border: 1px solid #000; padding: 5px 6px; }
            th { background: #f2f2f2; font-size: 12px; }
            tr.sum td { font-weight: bold; }
            .words { margin: 10px 0; }
            .sign { display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; margin-top: 18px; }
            .sign div { min-height: 110px; }
            .date { text-align: right; font-style: italic; margin-top: 14px; }
            .toolbar { text-align: right; margin-bottom: 12px; }
            .toolbar button { padding: 6px 14px; font-size: 13px; cursor: pointer; }
            @page { size: A4; margin: 14mm; }
            @media print { .toolbar { display: none; } body { padding: 0; } }
        </style></head><body>
        <div class="toolbar"><button onclick="window.print()">🖨 In phiếu</button></div>
        <div class="top">
            <div><b>Đơn vị: NOMNOMFOOD</b><br>Bộ phận: Kho ${escHtml(r.kho?.tenKho || '')}</div>
            <div class="right"><b>Mẫu số 01 - VT</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div>
        </div>
        <h1>PHIẾU NHẬP KHO</h1>
        <p class="meta">Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</p>
        <p class="meta">Số: <b>${escHtml(r.soPhieu || '........')}</b></p>
        <div class="no">Nợ: 152<br>Có: 331</div>
        <div class="info">
            - Họ và tên người giao: <b>${escHtml(r.nguoiGiao || '..............................')}</b><br>
            - Đơn vị giao hàng: <b>${escHtml(ncc.tenNCC || '')}</b>${ncc.maSoThue ? ` &nbsp; MST: ${escHtml(ncc.maSoThue)}` : ''}${ncc.diaChi ? ` &nbsp; Địa chỉ: ${escHtml(ncc.diaChi)}` : ''}<br>
            - Theo: <b>${r.soChungTu ? `Hóa đơn số ${escHtml(r.soChungTu)}` : '..............................'}</b> &nbsp; ngày ${d.toLocaleDateString('vi-VN')} của ${escHtml(ncc.tenNCC || '')}<br>
            - Lý do nhập: ${escHtml(r.dienGiai || 'Nhập nguyên liệu')}<br>
            - Nhập tại kho: <b>${escHtml(r.kho?.tenKho || '')}</b>${r.kho?.diaDiem ? ` &nbsp; Địa điểm: ${escHtml(r.kho.diaDiem)}` : ''}
        </div>
        <table>
            <thead>
                <tr><th rowspan="2" style="width:40px">STT</th><th rowspan="2">Tên nguyên liệu</th><th rowspan="2" style="width:60px">ĐVT</th>
                    <th colspan="2">Số lượng</th><th rowspan="2" style="width:110px">Đơn giá</th><th rowspan="2" style="width:130px">Thành tiền</th></tr>
                <tr><th style="width:90px">Theo chứng từ</th><th style="width:90px">Thực nhập</th></tr>
                <tr><th>A</th><th>B</th><th>C</th><th>1</th><th>2</th><th>3</th><th>4</th></tr>
            </thead>
            <tbody>
                ${rows}
                <tr class="sum"><td></td><td>Cộng tiền hàng</td><td></td><td></td><td></td><td></td><td class="num">${fmtN(tienHang)}</td></tr>
                ${r.thueGtgt ? `<tr><td></td><td>Thuế GTGT ${r.thueSuat ? r.thueSuat + '%' : ''}</td><td></td><td></td><td></td><td></td><td class="num">${fmtN(r.thueGtgt)}</td></tr>` : ''}
                <tr class="sum"><td></td><td>Tổng cộng thanh toán</td><td></td><td></td><td></td><td></td><td class="num">${fmtN(r.tongTien)}</td></tr>
            </tbody>
        </table>
        <p class="words">- Tổng số tiền (viết bằng chữ): <b><i>${soThanhChu(r.tongTien)}</i></b></p>
        <p>- Số chứng từ gốc kèm theo: ${r.soChungTu ? '01 hóa đơn' : '..............'}</p>
        <p class="date">Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</p>
        <div class="sign">
            <div><b>Người lập phiếu</b><br><i>(Ký, họ tên)</i><br><br><br><br>${escHtml(r.nguoiLap || '')}</div>
            <div><b>Người giao hàng</b><br><i>(Ký, họ tên)</i><br><br><br><br>${escHtml(r.nguoiGiao || '')}</div>
            <div><b>Thủ kho</b><br><i>(Ký, họ tên)</i></div>
            <div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div>
        </div>
        ${autoPrint ? '<script>window.onload = () => { window.print(); }<\/script>' : ''}
    </body></html>`;
    const win = window.open('', '_blank');
    if (!win) { showToast('Trình duyệt đã chặn cửa sổ, hãy cho phép popup', 'warning'); return; }
    win.document.write(html);
    win.document.close();
}


// ==================== Kế toán: Hóa đơn mua hàng ====================
async function loadPurchaseInvoices() {
    try {
        if (!allSuppliers.length) await loadSuppliers();
        const res = await fetch(`${API}/acc/purchase-invoices`);
        allPurchaseInvoices = await res.json();
        renderPurchaseInvoices();
    } catch {
        showToast('Không tải được hóa đơn mua hàng', 'danger');
    }
}

const PI_PAYMENT_LABEL = { cong_no: 'Công nợ', tien_mat: 'Tiền mặt', chuyen_khoan: 'Chuyển khoản' };

function invoicePaymentBadge(i) {
    const c = i.congNo;
    if (!c) return '<span class="text-muted small">—</span>';
    if (c.conLai <= 0) return `<span class="badge bg-success">Đã thanh toán</span>${i.hinhThucTT && i.hinhThucTT !== 'cong_no' ? `<div class="small text-muted">${PI_PAYMENT_LABEL[i.hinhThucTT]}</div>` : ''}`;
    const overdue = i.hanThanhToan && new Date(i.hanThanhToan) < new Date();
    const due = i.hanThanhToan ? `<div class="small ${overdue ? 'text-danger fw-semibold' : 'text-muted'}">${overdue ? 'Quá hạn ' : 'Hạn '}${new Date(i.hanThanhToan).toLocaleDateString('vi-VN')}</div>` : '';
    return c.daTra > 0
        ? `<span class="badge bg-info text-dark">Còn nợ ${formatPrice(c.conLai)}</span>${due}`
        : `<span class="badge ${overdue ? 'bg-danger' : 'bg-warning text-dark'}">Chưa thanh toán</span>${due}`;
}

function renderPurchaseInvoices() {
    const tbody = document.getElementById('purchase-invoice-table-body');
    if (!allPurchaseInvoices.length) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">Chưa có hóa đơn nào</td></tr>'; return; }
    tbody.innerHTML = allPurchaseInvoices.map(i => `
        <tr style="cursor:pointer" onclick="viewPurchaseInvoice('${i._id}')" title="Xem hóa đơn">
            <td>
                <div class="font-monospace fw-semibold text-primary">${escHtml(i.soHoaDon)}</div>
                ${i.kyHieu || i.mauSo ? `<div class="small text-muted">${escHtml([i.mauSo && 'Mẫu ' + i.mauSo, i.kyHieu && 'KH ' + i.kyHieu].filter(Boolean).join(' · '))}</div>` : ''}
            </td>
            <td>${new Date(i.ngayHoaDon || i.createdAt).toLocaleDateString('vi-VN')}</td>
            <td>${escHtml(i.ncc?.tenNCC || '—')}</td>
            <td>${i.phieuNhap
                ? `<span class="badge bg-light text-dark border"><i class="fa-solid fa-dolly me-1"></i>${escHtml(i.phieuNhap.soPhieu || 'Phiếu cũ')}</span>`
                : '<span class="text-muted small">Không nhập kho</span>'}</td>
            <td class="text-end">${formatPrice(i.tienHang)}</td>
            <td class="text-end">${formatPrice(i.thueGtgtDauVao)}${i.thueSuat ? `<div class="small text-muted">${i.thueSuat}%</div>` : ''}</td>
            <td class="text-end fw-semibold">${formatPrice(i.tongThanhToan)}</td>
            <td>${invoicePaymentBadge(i)}</td>
            <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="event.stopPropagation(); viewPurchaseInvoice('${i._id}')" title="Xem / In"><i class="fa-solid fa-print"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deletePurchaseInvoice('${i._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

// ---------- Lập hóa đơn ----------
let invoiceMaterials = [], invoiceReceipts = [], invoiceWarehouses = [], invoiceVatManual = false;

async function openPurchaseInvoiceModal() {
    try {
        if (!allSuppliers.length) await loadSuppliers();
        [invoiceMaterials, invoiceReceipts, invoiceWarehouses] = await Promise.all([
            fetch(`${API}/acc/materials`).then(r => r.json()),
            fetch(`${API}/acc/goods-receipts`).then(r => r.json()),
            fetch(`${API}/acc/warehouses`).then(r => r.json()),
        ]);
    } catch {
        showToast('Không tải được danh mục', 'danger');
        return;
    }
    const usable = allSuppliers.filter(s => !/playwright/i.test(s.tenNCC));
    document.getElementById('pi-ncc').innerHTML = '<option value="">— Chọn nhà cung cấp —</option>' +
        (usable.length ? usable : allSuppliers).map(s => `<option value="${s._id}">${escHtml(s.tenNCC)}</option>`).join('');
    document.getElementById('pi-kho').innerHTML = invoiceWarehouses.map(w => `<option value="${w._id}">${escHtml(w.tenKho)}</option>`).join('');
    ['pi-mauso', 'pi-kyhieu', 'pi-sohoadon', 'pi-nguoigiao', 'pi-ghichu', 'pi-thuegtgt'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pi-mauso').value = '1';
    document.getElementById('pi-ngayhd').value = pnlDateStr(new Date());
    document.getElementById('pi-httt').value = 'cong_no';
    const due = new Date(); due.setDate(due.getDate() + 15);
    document.getElementById('pi-han').value = pnlDateStr(due);
    document.getElementById('pi-thuesuat').value = '8';
    document.getElementById('pi-showall').checked = false;
    document.getElementById('pi-ncc-info').textContent = '';
    invoiceVatManual = false;
    document.getElementById('pi-link-new').checked = true;
    onInvoiceSupplierChange();
    onInvoicePaymentChange();
    purchaseInvoiceModalInst.show();
}

// Mở form hóa đơn từ một phiếu nhập đã có (dùng ở danh sách phiếu nhập)
async function openInvoiceForReceipt(receiptId) {
    await openPurchaseInvoiceModal();
    const r = invoiceReceipts.find(x => x._id === receiptId);
    if (!r) return;
    document.getElementById('pi-ncc').value = r.ncc?._id || r.ncc;
    document.getElementById('pi-link-existing').checked = true;
    onInvoiceSupplierChange();
    document.getElementById('pi-receipt').value = receiptId;
    onInvoiceReceiptChange();
}

function onInvoiceSupplierChange() {
    const nccId = document.getElementById('pi-ncc').value;
    const s = allSuppliers.find(x => x._id === nccId);
    document.getElementById('pi-ncc-info').textContent = s
        ? [s.nhomHang, s.maSoThue && `MST: ${s.maSoThue}`, s.sdt && `ĐT: ${s.sdt}`, s.diaChi].filter(Boolean).join(' · ') || 'Chưa có mã số thuế / địa chỉ'
        : '';
    // Phiếu nhập của NCC này chưa có hóa đơn
    const open = invoiceReceipts.filter(r => (r.ncc?._id || r.ncc) === nccId && !r.hoaDonMua);
    document.getElementById('pi-receipt').innerHTML = open.length
        ? '<option value="">— Chọn phiếu nhập —</option>' + open.map(r =>
            `<option value="${r._id}">${escHtml(r.soPhieu || 'Phiếu cũ')} · ${new Date(r.ngayNhap).toLocaleDateString('vi-VN')} · ${formatPrice(r.tienHang || r.tongTien)}</option>`).join('')
        : '<option value="">Không có phiếu nhập chờ hóa đơn</option>';
    document.getElementById('pi-link-existing').disabled = !open.length;
    if (!open.length && document.getElementById('pi-link-existing').checked) document.getElementById('pi-link-new').checked = true;
    onInvoiceLinkChange();
}

function invoiceLinkMode() {
    return document.querySelector('input[name="pi-link"]:checked')?.value || 'tao_phieu';
}

function onInvoiceLinkChange() {
    const mode = invoiceLinkMode();
    document.getElementById('pi-receipt').disabled = mode !== 'phieu_co_san';
    document.getElementById('pi-newreceipt-fields').classList.toggle('d-none', mode !== 'tao_phieu');
    document.getElementById('pi-addline-btn').classList.toggle('d-none', mode === 'phieu_co_san');
    document.getElementById('pi-link-hint').innerHTML = {
        phieu_co_san: 'Hàng hóa lấy theo phiếu nhập. Hàng đã ghi sổ khi nhập kho nên hóa đơn chỉ ghi thêm thuế GTGT và công nợ.',
        tao_phieu: 'Tạo phiếu nhập kho theo các dòng hóa đơn: cộng tồn kho, cập nhật giá vốn bình quân.',
        khong: 'Chỉ ghi nhận hóa đơn (Nợ 152 / Có 331), không thay đổi tồn kho.',
    }[mode];
    document.getElementById('pi-lines').innerHTML = '';
    if (mode === 'phieu_co_san') onInvoiceReceiptChange();
    else addInvoiceLine();
}

function onInvoiceReceiptChange() {
    if (invoiceLinkMode() !== 'phieu_co_san') return;
    const r = invoiceReceipts.find(x => x._id === document.getElementById('pi-receipt').value);
    const tbody = document.getElementById('pi-lines');
    if (!r) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Chọn phiếu nhập kho để lấy hàng hóa</td></tr>'; updateInvoiceTotals(); return; }
    const lines = r.chiTiet?.length ? r.chiTiet : [{ tenNL: 'Hàng hóa theo phiếu nhập', donViTinh: '', soLuongThucNhap: 1, donGia: r.tienHang || r.tongTien, thanhTien: r.tienHang || r.tongTien }];
    tbody.innerHTML = lines.map((l, i) => `
        <tr class="pi-row" data-amount="${l.thanhTien}">
            <td class="text-muted">${i + 1}</td>
            <td>${escHtml(l.tenNL)}</td>
            <td>${escHtml(l.donViTinh || '')}</td>
            <td class="text-end">${Number(l.soLuongThucNhap).toLocaleString('vi-VN')}</td>
            <td class="text-end">${formatPrice(l.donGia)}</td>
            <td class="text-end fw-semibold">${formatPrice(l.thanhTien)}</td>
            <td><i class="fa-solid fa-lock text-muted" title="Theo phiếu nhập kho"></i></td>
        </tr>`).join('');
    if (r.nguoiGiao) document.getElementById('pi-nguoigiao').value = r.nguoiGiao;
    updateInvoiceTotals();
}

function addInvoiceLine() {
    const mode = invoiceLinkMode();
    const tr = document.createElement('tr');
    tr.className = 'pi-row';
    const materialOptions = invoiceMaterialOptions();
    const nameCell = mode === 'tao_phieu'
        ? `<select class="form-select form-select-sm pi-nl" onchange="onInvoiceMaterialChange(this)">${materialOptions}</select>`
        : `<input type="text" class="form-control form-control-sm pi-ten" list="pi-material-names" placeholder="Tên hàng hóa, dịch vụ">`;
    tr.innerHTML = `
        <td class="text-muted pi-stt"></td>
        <td>${nameCell}</td>
        <td><input type="text" class="form-control form-control-sm pi-dvt" value="kg"></td>
        <td><input type="number" min="0" step="any" class="form-control form-control-sm text-end pi-sl" placeholder="0" oninput="updateInvoiceTotals()"></td>
        <td><input type="number" min="0" step="100" class="form-control form-control-sm text-end pi-gia" placeholder="0" oninput="updateInvoiceTotals()"></td>
        <td class="text-end fw-semibold pi-tt">0đ</td>
        <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeInvoiceLine(this)" title="Xóa dòng"><i class="fa-solid fa-xmark"></i></button></td>`;
    document.getElementById('pi-lines').appendChild(tr);
    updateInvoiceTotals();
}

// Nguyên liệu cho dòng hóa đơn theo NCC đang chọn; cập nhật luôn gợi ý tên hàng (datalist)
function invoiceMaterialOptions() {
    const info = materialsForSupplier(invoiceMaterials, document.getElementById('pi-ncc').value, document.getElementById('pi-showall')?.checked);
    supplierFilterHint('pi-filter-hint', info, invoiceMaterials.length);
    let dl = document.getElementById('pi-material-names');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'pi-material-names'; document.body.appendChild(dl); }
    dl.innerHTML = info.list.map(m => `<option value="${escHtml(m.tenNL)}">`).join('');
    return '<option value="">— Chọn nguyên liệu —</option>' + info.list
        .slice().sort((a, b) => a.tenNL.localeCompare(b.tenNL, 'vi'))
        .map(m => `<option value="${m._id}">${escHtml(m.tenNL)}</option>`).join('');
}

function refreshInvoiceLineOptions() {
    const options = invoiceMaterialOptions();
    document.querySelectorAll('#pi-lines .pi-nl').forEach(sel => {
        const v = sel.value;
        sel.innerHTML = options;
        if ([...sel.options].some(o => o.value === v)) sel.value = v;
    });
}

function removeInvoiceLine(btn) {
    if (document.querySelectorAll('#pi-lines .pi-row').length <= 1) { showToast('Hóa đơn cần ít nhất một dòng', 'warning'); return; }
    btn.closest('tr').remove();
    updateInvoiceTotals();
}

function onInvoiceMaterialChange(sel) {
    const tr = sel.closest('tr');
    const m = invoiceMaterials.find(x => x._id === sel.value);
    if (!m) return;
    tr.querySelector('.pi-dvt').value = m.donViTinh || 'kg';
    if (!tr.querySelector('.pi-gia').value) tr.querySelector('.pi-gia').value = m.giaVonBinhQuan || '';
    if (document.querySelectorAll('#pi-lines .pi-row').length === 1 && m.kho?._id) document.getElementById('pi-kho').value = m.kho._id;
    updateInvoiceTotals();
}

function collectInvoiceLines() {
    return [...document.querySelectorAll('#pi-lines .pi-row')].map(tr => {
        if (tr.dataset.amount !== undefined) return { thanhTien: Number(tr.dataset.amount) };
        const sl = Number(tr.querySelector('.pi-sl').value) || 0;
        const gia = Number(tr.querySelector('.pi-gia').value) || 0;
        return {
            danhMucNL: tr.querySelector('.pi-nl')?.value || null,
            tenHang: tr.querySelector('.pi-ten')?.value.trim() || '',
            donViTinh: tr.querySelector('.pi-dvt').value.trim(),
            soLuong: sl, donGia: gia, thanhTien: Math.round(sl * gia),
        };
    });
}

function updateInvoiceTotals() {
    document.querySelectorAll('#pi-lines .pi-row').forEach((tr, i) => {
        const stt = tr.querySelector('.pi-stt');
        if (stt) stt.textContent = i + 1;
        const tt = tr.querySelector('.pi-tt');
        if (tt) tt.textContent = formatPrice(Math.round((Number(tr.querySelector('.pi-sl').value) || 0) * (Number(tr.querySelector('.pi-gia').value) || 0)));
    });
    const tienHang = collectInvoiceLines().reduce((s, l) => s + l.thanhTien, 0);
    const rate = Number(document.getElementById('pi-thuesuat').value) || 0;
    const thueEl = document.getElementById('pi-thuegtgt');
    if (!invoiceVatManual) thueEl.value = Math.round(tienHang * rate / 100);
    const tong = tienHang + (Number(thueEl.value) || 0);
    document.getElementById('pi-tienhang-view').textContent = formatPrice(tienHang);
    document.getElementById('pi-tong').textContent = formatPrice(tong);
    document.getElementById('pi-bangchu').textContent = tong ? `Bằng chữ: ${soThanhChu(tong)}` : '';
    onInvoicePaymentChange();
}

function onInvoicePaymentChange() {
    const ht = document.getElementById('pi-httt').value;
    document.getElementById('pi-han-wrap').classList.toggle('d-none', ht !== 'cong_no');
    document.getElementById('pi-payment-hint').textContent = {
        cong_no: 'Ghi nhận công nợ phải trả nhà cung cấp, thanh toán sau ở mục Công nợ.',
        tien_mat: 'Đã trả bằng tiền mặt: ghi thêm Nợ 331 / Có 111, công nợ tất toán ngay.',
        chuyen_khoan: 'Đã chuyển khoản: ghi thêm Nợ 331 / Có 112, công nợ tất toán ngay.',
    }[ht];
}

async function savePurchaseInvoice(andPrint) {
    const ncc = document.getElementById('pi-ncc').value;
    const soHoaDon = document.getElementById('pi-sohoadon').value.trim();
    const ngayHoaDon = document.getElementById('pi-ngayhd').value;
    const lienKet = invoiceLinkMode();
    if (!ncc) { showToast('Vui lòng chọn nhà cung cấp', 'warning'); return; }
    if (!soHoaDon) { showToast('Vui lòng nhập số hóa đơn', 'warning'); return; }
    if (!ngayHoaDon) { showToast('Vui lòng chọn ngày hóa đơn', 'warning'); return; }

    const body = {
        ncc, soHoaDon, lienKet,
        mauSo: document.getElementById('pi-mauso').value.trim(),
        kyHieu: document.getElementById('pi-kyhieu').value.trim(),
        ngayHoaDon,
        ngay: `${ngayHoaDon}T${new Date().toTimeString().slice(0, 8)}`,
        thueSuat: Number(document.getElementById('pi-thuesuat').value) || 0,
        thueGtgtDauVao: Number(document.getElementById('pi-thuegtgt').value) || 0,
        hinhThucTT: document.getElementById('pi-httt').value,
        hanThanhToan: document.getElementById('pi-han').value || null,
        ghiChu: document.getElementById('pi-ghichu').value.trim(),
    };
    if (lienKet === 'phieu_co_san') {
        body.phieuNhap = document.getElementById('pi-receipt').value;
        if (!body.phieuNhap) { showToast('Vui lòng chọn phiếu nhập kho', 'warning'); return; }
    } else {
        const lines = collectInvoiceLines();
        const bad = lines.findIndex(l => (lienKet === 'tao_phieu' ? !l.danhMucNL : !l.tenHang) || l.soLuong <= 0);
        if (bad !== -1) { showToast(`Dòng ${bad + 1}: ${lienKet === 'tao_phieu' ? 'chọn nguyên liệu' : 'nhập tên hàng'} và số lượng lớn hơn 0`, 'warning'); return; }
        if (lienKet === 'tao_phieu') {
            const ids = lines.map(l => l.danhMucNL);
            if (new Set(ids).size !== ids.length) { showToast('Mỗi nguyên liệu chỉ nên xuất hiện một dòng', 'warning'); return; }
            body.kho = document.getElementById('pi-kho').value;
            body.nguoiGiao = document.getElementById('pi-nguoigiao').value.trim();
            body.nguoiLap = (typeof getUser === 'function' && getUser()?.name) || '';
        }
        body.chiTiet = lines;
    }
    try {
        const res = await fetch(`${API}/acc/purchase-invoices`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(`Đã lưu hóa đơn ${json.soHoaDon}${json.phieuNhap?.soPhieu ? ` · phiếu nhập ${json.phieuNhap.soPhieu}` : ''}`, 'success');
        purchaseInvoiceModalInst.hide();
        await loadPurchaseInvoices();
        await loadReceipts(); // phiếu nhập liên kết thay đổi theo hóa đơn
        if (andPrint) viewPurchaseInvoice(json._id, true);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deletePurchaseInvoice(id) {
    const i = allPurchaseInvoices.find(x => x._id === id);
    if (!confirm(`Xóa hóa đơn ${i?.soHoaDon || ''}?\n\nBút toán và công nợ của hóa đơn sẽ bị xóa${i?.phieuNhap ? `, phiếu nhập ${i.phieuNhap.soPhieu || ''} được bỏ liên kết` : ''}.`)) return;
    try {
        const res = await fetch(`${API}/acc/purchase-invoices/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Lỗi khi xóa hóa đơn');
        showToast('Đã xóa hóa đơn mua hàng', 'success');
        await loadPurchaseInvoices();
        await loadReceipts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ---------- Xem / in hóa đơn mua hàng ----------
async function viewPurchaseInvoice(id, autoPrint) {
    const win = window.open('', '_blank');
    if (!win) { showToast('Trình duyệt đã chặn cửa sổ, hãy cho phép popup', 'warning'); return; }
    win.document.write('<p style="font-family:sans-serif;padding:24px">Đang tải hóa đơn...</p>');
    let inv;
    try {
        const res = await fetch(`${API}/acc/purchase-invoices/${id}`);
        inv = await res.json();
        if (!res.ok) throw new Error(inv.error || 'Không tải được hóa đơn');
    } catch (err) {
        win.close();
        showToast(err.message, 'danger');
        return;
    }
    const ncc = inv.ncc || {};
    const d = new Date(inv.ngayHoaDon || inv.createdAt);
    const fmtN = n => Number(n || 0).toLocaleString('vi-VN');
    const lines = inv.chiTiet?.length ? inv.chiTiet : [{ tenHang: 'Hàng hóa (hóa đơn lập trước khi có chi tiết)', donViTinh: '', soLuong: '', donGia: '', thanhTien: inv.tienHang }];
    const rows = lines.map((l, k) => `
        <tr><td class="c">${k + 1}</td><td>${escHtml(l.tenHang)}</td><td class="c">${escHtml(l.donViTinh || '')}</td>
            <td class="num">${l.soLuong === '' ? '' : fmtN(l.soLuong)}</td><td class="num">${l.donGia === '' ? '' : fmtN(l.donGia)}</td><td class="num">${fmtN(l.thanhTien)}</td></tr>`).join('');
    const c = inv.congNo;
    const payText = !c ? '—'
        : c.conLai <= 0 ? `Đã thanh toán${inv.hinhThucTT !== 'cong_no' ? ' (' + PI_PAYMENT_LABEL[inv.hinhThucTT] + ')' : ''}`
        : `Ghi công nợ · đã trả ${fmtN(c.daTra)}đ · còn nợ ${fmtN(c.conLai)}đ${inv.hanThanhToan ? ' · hạn ' + new Date(inv.hanThanhToan).toLocaleDateString('vi-VN') : ''}`;
    const entries = (inv.butToan || []).map(e => `<tr><td>${new Date(e.ngayGhi).toLocaleDateString('vi-VN')}</td><td>${escHtml(e.noiDung)}</td><td class="c">${escHtml(e.tkNo?.soHieuTK || '')}</td><td class="c">${escHtml(e.tkCo?.soHieuTK || '')}</td><td class="num">${fmtN(e.soTien)}</td></tr>`).join('');

    const html = `<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8"><title>Hóa đơn mua hàng ${escHtml(inv.soHoaDon)}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Times New Roman', serif; font-size: 13px; color: #000; padding: 24px 32px; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; }
            h1 { font-size: 20px; letter-spacing: 1px; }
            .sub { font-style: italic; }
            .serial { text-align: right; line-height: 1.6; }
            .party { margin: 12px 0; line-height: 1.7; }
            .party b { font-weight: 600; }
            .c { text-align: center; } .num { text-align: right; white-space: nowrap; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border: 1px solid #000; padding: 5px 6px; }
            th { background: #f2f2f2; font-size: 12px; }
            tr.sum td { font-weight: bold; }
            .words { margin: 10px 0; }
            .box { border: 1px dashed #666; padding: 8px 10px; margin-top: 12px; line-height: 1.6; }
            h3 { font-size: 13px; margin: 16px 0 4px; }
            .small { font-size: 11px; }
            .sign { display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 20px; }
            .sign div { min-height: 100px; }
            .toolbar { text-align: right; margin-bottom: 12px; }
            .toolbar button { padding: 6px 14px; font-size: 13px; cursor: pointer; }
            @page { size: A4; margin: 14mm; }
            @media print { .toolbar { display: none; } body { padding: 0; } }
        </style></head><body>
        <div class="toolbar"><button onclick="window.print()">🖨 In hóa đơn</button></div>
        <div class="head">
            <div>
                <h1>HÓA ĐƠN MUA HÀNG</h1>
                <div class="sub">(Hóa đơn giá trị gia tăng đầu vào — bản lưu nội bộ)</div>
                <div class="sub">Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</div>
            </div>
            <div class="serial">
                Mẫu số: <b>${escHtml(inv.mauSo || '......')}</b><br>
                Ký hiệu: <b>${escHtml(inv.kyHieu || '......')}</b><br>
                Số: <b>${escHtml(inv.soHoaDon)}</b>
            </div>
        </div>
        <div class="party">
            Đơn vị bán hàng: <b>${escHtml(ncc.tenNCC || '')}</b><br>
            Mã số thuế: ${escHtml(ncc.maSoThue || '..............................')} &nbsp;·&nbsp; Điện thoại: ${escHtml(ncc.sdt || '..............')}<br>
            Địa chỉ: ${escHtml(ncc.diaChi || '..............................................................')}
        </div>
        <div class="party" style="border-top:1px solid #ccc;padding-top:8px">
            Đơn vị mua hàng: <b>NOMNOMFOOD</b> &nbsp;·&nbsp; Mã số thuế: ..............................<br>
            Hình thức thanh toán: ${PI_PAYMENT_LABEL[inv.hinhThucTT] || 'Công nợ'}${inv.phieuNhap ? ` &nbsp;·&nbsp; Phiếu nhập kho: <b>${escHtml(inv.phieuNhap.soPhieu || 'phiếu cũ')}</b>${inv.phieuNhap.kho?.tenKho ? ' (' + escHtml(inv.phieuNhap.kho.tenKho) + ')' : ''}` : ''}
        </div>
        <table>
            <thead><tr><th style="width:40px">STT</th><th>Tên hàng hóa, dịch vụ</th><th style="width:60px">ĐVT</th><th style="width:80px">Số lượng</th><th style="width:110px">Đơn giá</th><th style="width:130px">Thành tiền</th></tr>
            <tr><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6 = 4 × 5</th></tr></thead>
            <tbody>
                ${rows}
                <tr class="sum"><td colspan="5" class="num">Cộng tiền hàng</td><td class="num">${fmtN(inv.tienHang)}</td></tr>
                <tr><td colspan="5" class="num">Thuế suất GTGT: ${inv.thueSuat || 0}% &nbsp; — &nbsp; Tiền thuế GTGT</td><td class="num">${fmtN(inv.thueGtgtDauVao)}</td></tr>
                <tr class="sum"><td colspan="5" class="num">Tổng cộng tiền thanh toán</td><td class="num">${fmtN(inv.tongThanhToan)}</td></tr>
            </tbody>
        </table>
        <p class="words">Số tiền viết bằng chữ: <b><i>${soThanhChu(inv.tongThanhToan)}</i></b></p>
        <div class="box small">
            <b>Tình trạng thanh toán:</b> ${payText}<br>
            ${inv.ghiChu ? `<b>Ghi chú:</b> ${escHtml(inv.ghiChu)}` : ''}
        </div>
        ${entries ? `<h3>Định khoản kế toán</h3>
        <table class="small"><thead><tr><th style="width:80px">Ngày</th><th>Diễn giải</th><th style="width:60px">TK Nợ</th><th style="width:60px">TK Có</th><th style="width:110px">Số tiền</th></tr></thead><tbody>${entries}</tbody></table>` : ''}
        <div class="sign">
            <div><b>Người mua hàng</b><br><i>(Ký, ghi rõ họ tên)</i></div>
            <div><b>Kế toán</b><br><i>(Ký, ghi rõ họ tên)</i></div>
        </div>
        ${autoPrint ? '<script>window.onload = () => { window.print(); }<\/script>' : ''}
    </body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
}


// ==================== Kế toán: Công nợ phải trả NCC ====================
function payableStatusInfo(p) {
    if (p.trangThai === 'da_thanh_toan') return { label: 'Đã thanh toán', cls: 'bg-success' };
    if (p.trangThai === 'da_thanh_toan_mot_phan') return { label: 'Thanh toán một phần', cls: 'bg-warning text-dark' };
    return { label: 'Chưa thanh toán', cls: 'bg-danger' };
}

async function loadPayables() {
    try {
        const res = await fetch(`${API}/acc/payables`);
        allPayables = await res.json();
        renderPayables();
    } catch {
        showToast('Không tải được công nợ phải trả', 'danger');
    }
}

function renderPayables() {
    const tbody = document.getElementById('payable-table-body');
    if (!allPayables.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Chưa có công nợ nào</td></tr>'; return; }
    tbody.innerHTML = allPayables.map(p => {
        const info = payableStatusInfo(p);
        const remaining = p.soTienNo - (p.daTra || 0);
        return `
        <tr>
            <td>${p.ncc?.tenNCC || '—'}</td>
            <td class="font-monospace">${p.hoaDonMua?.soHoaDon || '—'}</td>
            <td class="text-end">${formatPrice(p.soTienNo)}</td>
            <td class="text-end">${formatPrice(p.daTra || 0)}</td>
            <td class="text-end fw-semibold">${formatPrice(remaining)}</td>
            <td><span class="badge ${info.cls}">${info.label}</span></td>
            <td class="text-end">${remaining > 0 ? `<button class="btn btn-sm btn-outline-success" onclick="payPayable('${p._id}')" title="Thanh toán"><i class="fa-solid fa-money-bill-wave"></i></button>` : ''}</td>
        </tr>`;
    }).join('');
}


// ==================== Kế toán: Kho ====================
async function loadWarehouses() {
    try {
        const res = await fetch(`${API}/acc/warehouses`);
        allWarehouses = await res.json();
        renderWarehouses();
    } catch {
        showToast('Không tải được danh sách kho', 'danger');
    }
}

function renderWarehouses() {
    const tbody = document.getElementById('warehouse-table-body');
    if (!allWarehouses.length) { tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">Chưa có kho nào</td></tr>'; return; }
    tbody.innerHTML = allWarehouses.map(w => `
        <tr>
            <td>${w.tenKho}</td><td>${w.diaDiem || '—'}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openWarehouseModal('${w._id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteWarehouse('${w._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

function openWarehouseModal(id) {
    document.getElementById('wh-id').value = '';
    document.getElementById('wh-ten').value = '';
    document.getElementById('wh-diadiem').value = '';
    document.getElementById('warehouse-modal-title').textContent = 'Thêm kho';
    if (id) {
        const w = allWarehouses.find(x => x._id === id);
        if (w) {
            document.getElementById('wh-id').value = w._id;
            document.getElementById('wh-ten').value = w.tenKho;
            document.getElementById('wh-diadiem').value = w.diaDiem || '';
            document.getElementById('warehouse-modal-title').textContent = 'Sửa kho';
        }
    }
    warehouseModalInst.show();
}

async function saveWarehouse() {
    const id = document.getElementById('wh-id').value;
    const tenKho = document.getElementById('wh-ten').value.trim();
    if (!tenKho) { showToast('Vui lòng nhập tên kho', 'warning'); return; }
    const body = { tenKho, diaDiem: document.getElementById('wh-diadiem').value.trim() };
    try {
        const res = await fetch(`${API}/acc/warehouses${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật kho' : 'Đã thêm kho', 'success');
        warehouseModalInst.hide();
        await loadWarehouses();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteWarehouse(id) {
    if (!confirm('Xác nhận xóa kho này?')) return;
    try {
        const res = await fetch(`${API}/acc/warehouses/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa kho', 'success');
        await loadWarehouses();
    } catch {
        showToast('Lỗi khi xóa kho', 'danger');
    }
}

// ==================== Kế toán: Nguyên liệu & tồn kho ====================
const fmtQty = n => Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
const LOAI_XUAT_INFO = {
    ban_hang: { label: 'Xuất bán', cls: 'bg-danger', tk: '632' },
    che_bien: { label: 'Xuất chế biến', cls: 'bg-primary', tk: '632' },
    huy_hong: { label: 'Xuất hủy', cls: 'bg-dark', tk: '632' },
    noi_bo: { label: 'Dùng nội bộ', cls: 'bg-secondary', tk: '642' },
};
const modalOf = id => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));

function materialStatus(m) {
    const ton = m.tonHienTai || 0;
    if (ton < 0) return { key: 'out', label: 'Âm kho', cls: 'bg-danger' };
    if (ton === 0) return { key: 'out', label: 'Hết hàng', cls: 'bg-danger' };
    if (ton <= (m.tonToiThieu || 0)) return { key: 'low', label: 'Sắp hết', cls: 'bg-warning text-dark' };
    return { key: 'ok', label: 'Đủ hàng', cls: 'bg-success-subtle text-success' };
}

async function loadMaterials() {
    try {
        if (!allWarehouses.length) await loadWarehouses();
        const res = await fetch(`${API}/acc/materials`);
        allMaterials = await res.json();
        const sel = document.getElementById('mat-filter-kho');
        if (sel) {
            const cur = sel.value;
            sel.innerHTML = '<option value="">Tất cả kho</option>' + allWarehouses.map(w => `<option value="${w._id}">${escHtml(w.tenKho)}</option>`).join('');
            sel.value = cur;
        }
        renderMaterials();
        loadInventoryReconcile();
    } catch {
        showToast('Không tải được nguyên liệu', 'danger');
    }
}

// Đối chiếu giá trị tồn kho (danh mục) với số dư sổ cái TK 152
async function loadInventoryReconcile() {
    const el = document.getElementById('inv-kpi-recon');
    if (!el) return;
    try {
        const r = await fetch(`${API}/acc/inventory/reconcile`).then(res => res.json());
        el.innerHTML = r.khop
            ? `<span class="text-success"><i class="fa-solid fa-circle-check me-1"></i>Khớp sổ cái TK 152</span>`
            : `<span class="text-danger"><i class="fa-solid fa-triangle-exclamation me-1"></i>Sổ cái TK 152: ${formatPrice(r.soDu152)} · lệch ${formatPrice(r.chenhLech)}</span>
               <button class="btn btn-link btn-sm p-0 ms-1 align-baseline" onclick="reconcileInventory(${r.chenhLech})">Điều chỉnh</button>`;
    } catch {
        el.textContent = 'Theo giá vốn bình quân';
    }
}

async function reconcileInventory(chenhLech) {
    const tang = chenhLech > 0;
    if (!confirm(`Điều chỉnh sổ cái TK 152 cho khớp giá trị tồn kho thực tế?

Chênh lệch: ${formatPrice(Math.abs(chenhLech))}
Bút toán: ${tang ? 'Nợ 152 / Có 411 (tồn kho có sẵn chưa từng hạch toán)' : 'Nợ 632 / Có 152 (hao hụt chưa ghi nhận)'}

Nên kiểm kê trước để số tồn kho là số thực tế.`)) return;
    try {
        const res = await fetch(`${API}/acc/inventory/reconcile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nguoiLap: getUser()?.name || '' }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Không điều chỉnh được');
        showToast(`Đã ghi ${json.dinhKhoan}: ${formatPrice(Math.abs(json.chenhLech))}`, 'success');
        loadInventoryReconcile();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function setMaterialStatusFilter(v) {
    document.getElementById('mat-filter-status').value = v;
    renderMaterials();
}

function renderMaterials() {
    const tbody = document.getElementById('material-table-body');
    const foot = document.getElementById('material-table-foot');
    const stats = allMaterials.map(m => materialStatus(m));
    document.getElementById('inv-kpi-count').textContent = allMaterials.length;
    document.getElementById('inv-kpi-kho').textContent = `${allWarehouses.length} kho`;
    document.getElementById('inv-kpi-value').textContent = formatPrice(allMaterials.reduce((s, m) => s + (m.giaTriTon || 0), 0));
    document.getElementById('inv-kpi-low').textContent = stats.filter(s => s.key === 'low').length;
    document.getElementById('inv-kpi-out').textContent = stats.filter(s => s.key === 'out').length;

    const kw = (document.getElementById('mat-search')?.value || '').trim().toLowerCase();
    const kho = document.getElementById('mat-filter-kho')?.value || '';
    const st = document.getElementById('mat-filter-status')?.value || '';
    const rows = allMaterials.filter(m => {
        if (kw && !`${m.maNL || ''} ${m.tenNL}`.toLowerCase().includes(kw)) return false;
        if (kho && (m.kho?._id || m.kho) !== kho) return false;
        if (st === 'norecipe') return !m.soMonDung;
        if (st && materialStatus(m).key !== st) return false;
        return true;
    });
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">Không có nguyên liệu phù hợp</td></tr>';
        foot.innerHTML = '';
        return;
    }
    tbody.innerHTML = rows.map(m => {
        const s = materialStatus(m);
        const dvt = escHtml(m.donViTinh || '');
        return `
        <tr role="button" onclick="openStockCard('${m._id}')" class="${s.key === 'out' ? 'table-danger' : s.key === 'low' ? 'table-warning' : ''}">
            <td class="font-monospace small text-muted">${escHtml(m.maNL || '')}</td>
            <td class="fw-semibold">${escHtml(m.tenNL)}${m.soMonDung ? `<div class="small text-muted fw-normal">Dùng trong ${m.soMonDung} món</div>` : '<div class="small text-muted fw-normal fst-italic">Chưa có trong định mức</div>'}</td>
            <td>${dvt}</td>
            <td>${escHtml(m.kho?.tenKho || '—')}</td>
            <td class="text-end fw-bold ${(m.tonHienTai || 0) < 0 ? 'text-danger' : ''}">${fmtQty(m.tonHienTai)}</td>
            <td class="text-end text-muted">${fmtQty(m.tonToiThieu)}</td>
            <td class="text-end">${formatPrice(m.giaVonBinhQuan || 0)}</td>
            <td class="text-end">${formatPrice(m.giaTriTon || 0)}</td>
            <td><span class="badge ${s.cls}">${s.label}</span></td>
            <td class="text-end text-nowrap" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="openStockCard('${m._id}')" title="Thẻ kho"><i class="fa-solid fa-book"></i></button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openMaterialModal('${m._id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMaterial('${m._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
    foot.innerHTML = `<tr class="fw-bold"><td colspan="7" class="text-end">Cộng (${rows.length} mặt hàng)</td><td class="text-end">${formatPrice(rows.reduce((s, m) => s + (m.giaTriTon || 0), 0))}</td><td colspan="2"></td></tr>`;
}

async function openMaterialModal(id) {
    if (!allWarehouses.length) await loadWarehouses();
    if (!allWarehouses.length) { showToast('Chưa có kho nào, vui lòng tạo kho trước', 'warning'); return; }
    const m = id ? allMaterials.find(x => x._id === id) : null;
    document.getElementById('mat-id').value = m?._id || '';
    document.getElementById('mat-ma').value = m?.maNL || '';
    document.getElementById('mat-ten').value = m?.tenNL || '';
    document.getElementById('mat-dvt').value = m?.donViTinh || 'kg';
    document.getElementById('mat-kho').innerHTML = allWarehouses.map(w => `<option value="${w._id}">${escHtml(w.tenKho)}</option>`).join('');
    if (m) document.getElementById('mat-kho').value = m.kho?._id || m.kho;
    document.getElementById('mat-tontoithieu').value = m?.tonToiThieu || 0;
    document.getElementById('mat-ghichu').value = m?.ghiChu || '';
    document.getElementById('mat-tonhientai').value = 0;
    document.getElementById('mat-giavon').value = 0;
    document.getElementById('mat-opening-box').classList.toggle('d-none', !!m);
    document.getElementById('mat-stock-box').classList.toggle('d-none', !m);
    if (m) {
        document.getElementById('mat-stock-ton').textContent = `${fmtQty(m.tonHienTai)} ${m.donViTinh || ''}`;
        document.getElementById('mat-stock-gia').textContent = formatPrice(m.giaVonBinhQuan || 0);
    }
    document.getElementById('material-modal-title').textContent = m ? `Sửa nguyên liệu ${m.maNL || ''}` : 'Thêm nguyên liệu';
    const syncDvt = () => document.querySelectorAll('.mat-dvt-label').forEach(el => el.textContent = document.getElementById('mat-dvt').value || '—');
    document.getElementById('mat-dvt').oninput = syncDvt;
    syncDvt();
    materialModalInst.show();
}

async function saveMaterial() {
    const id = document.getElementById('mat-id').value;
    const tenNL = document.getElementById('mat-ten').value.trim();
    const kho = document.getElementById('mat-kho').value;
    const donViTinh = document.getElementById('mat-dvt').value.trim();
    if (!tenNL) { showToast('Vui lòng nhập tên nguyên liệu', 'warning'); return; }
    if (!donViTinh) { showToast('Vui lòng nhập đơn vị tính', 'warning'); return; }
    if (!kho) { showToast('Vui lòng chọn kho', 'warning'); return; }
    const body = {
        maNL: document.getElementById('mat-ma').value.trim(), tenNL, donViTinh, kho,
        tonToiThieu: Number(document.getElementById('mat-tontoithieu').value) || 0,
        ghiChu: document.getElementById('mat-ghichu').value.trim(),
    };
    if (!id) {
        body.tonHienTai = Number(document.getElementById('mat-tonhientai').value) || 0;
        body.giaVonBinhQuan = Number(document.getElementById('mat-giavon').value) || 0;
    }
    try {
        const res = await fetch(`${API}/acc/materials${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật nguyên liệu' : `Đã thêm nguyên liệu ${json.maNL}`, 'success');
        materialModalInst.hide();
        await loadMaterials();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteMaterial(id) {
    const m = allMaterials.find(x => x._id === id);
    if (!confirm(`Xóa nguyên liệu "${m?.tenNL || ''}"?`)) return;
    try {
        const res = await fetch(`${API}/acc/materials/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Lỗi khi xóa nguyên liệu');
        showToast('Đã xóa nguyên liệu', 'success');
        await loadMaterials();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ---------- Thẻ kho ----------
let stockCardId = null, stockCardData = null;

function openStockCard(id) {
    stockCardId = id;
    const now = new Date();
    document.getElementById('sc-from').value = pnlDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    document.getElementById('sc-to').value = pnlDateStr(now);
    document.getElementById('sc-body').innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Đang tải...</td></tr>';
    modalOf('stockCardModal').show();
    loadStockCard();
}

async function loadStockCard() {
    const from = document.getElementById('sc-from').value, to = document.getElementById('sc-to').value;
    try {
        const res = await fetch(`${API}/acc/materials/${stockCardId}/stock-card?from=${from}&to=${to}`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        stockCardData = d;
        const m = d.material, dvt = escHtml(m.donViTinh || '');
        document.getElementById('sc-title').textContent = `${m.maNL ? m.maNL + ' · ' : ''}${m.tenNL}`;
        document.getElementById('sc-subtitle').textContent = `${m.kho?.tenKho || ''} · ĐVT: ${m.donViTinh || ''} · Giá vốn BQ: ${formatPrice(m.giaVonBinhQuan || 0)} · Tồn hiện tại: ${fmtQty(m.tonHienTai)}`;
        const kpi = (label, val, cls = '') => `<div class="col-6 col-md-3"><div class="border rounded-3 p-2 text-center"><div class="small text-muted">${label}</div><div class="fw-bold fs-5 ${cls}">${val}</div></div></div>`;
        document.getElementById('sc-kpis').innerHTML =
            kpi('Tồn đầu kỳ', `${fmtQty(d.tonDau)} ${dvt}`) + kpi('Nhập trong kỳ', `${fmtQty(d.tongNhap)} ${dvt}`, 'text-success') +
            kpi('Xuất trong kỳ', `${fmtQty(d.tongXuat)} ${dvt}`, 'text-danger') + kpi('Tồn cuối kỳ', `${fmtQty(d.tonCuoi)} ${dvt}`, d.tonCuoi < 0 ? 'text-danger' : 'text-primary');
        const typeBadge = r => r.loai === 'nhap' ? '<span class="badge bg-success">Nhập</span>'
            : r.loai === 'kiem_ke' ? '<span class="badge bg-info text-dark">Kiểm kê</span>'
            : `<span class="badge ${LOAI_XUAT_INFO[r.loaiXuat]?.cls || 'bg-secondary'}">${LOAI_XUAT_INFO[r.loaiXuat]?.label || 'Xuất'}</span>`;
        const open = r => r.loai === 'xuat' ? `viewIssueDetail('${r.chungTuId}')` : r.loai === 'kiem_ke' ? `printStocktake('${r.chungTuId}')` : `openReceiptById('${r.chungTuId}')`;
        document.getElementById('sc-body').innerHTML = `
            <tr class="table-light"><td colspan="5" class="fst-italic">Tồn đầu kỳ</td><td class="text-end fw-bold">${fmtQty(d.tonDau)}</td><td colspan="2"></td></tr>
            ${d.rows.map(r => `
            <tr>
                <td class="text-nowrap">${new Date(r.ngay).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td class="text-nowrap"><a href="#" onclick="event.preventDefault(); ${open(r)}" class="font-monospace text-decoration-none">${escHtml(r.chungTu)}</a> ${typeBadge(r)}</td>
                <td class="small">${escHtml(r.dienGiai)}</td>
                <td class="text-end text-success">${r.nhap ? fmtQty(r.nhap) : ''}</td>
                <td class="text-end text-danger">${r.xuat ? fmtQty(r.xuat) : ''}</td>
                <td class="text-end fw-semibold ${r.ton < 0 ? 'text-danger' : ''}">${fmtQty(r.ton)}</td>
                <td class="text-end small">${r.donGia != null ? formatPrice(r.donGia) : '—'}</td>
                <td class="text-end small">${r.giaTri != null ? formatPrice(r.giaTri) : '—'}</td>
            </tr>`).join('') || '<tr><td colspan="8" class="text-center text-muted py-3">Không có phát sinh trong khoảng thời gian này</td></tr>'}
            <tr class="table-light fw-bold"><td colspan="3" class="text-end">Cộng phát sinh / Tồn cuối kỳ</td><td class="text-end text-success">${fmtQty(d.tongNhap)}</td><td class="text-end text-danger">${fmtQty(d.tongXuat)}</td><td class="text-end">${fmtQty(d.tonCuoi)}</td><td colspan="2"></td></tr>`;
        document.getElementById('sc-dishes').innerHTML = d.monSuDung.length
            ? d.monSuDung.map(x => `<span class="badge bg-light text-dark border me-1 mb-1">${escHtml(x.name)}: ${fmtQty(x.dinhLuong)} ${dvt}/phần</span>`).join('')
            : '<span class="small text-muted fst-italic">Chưa có món nào dùng nguyên liệu này — bếp nấu sẽ không trừ kho nguyên liệu này</span>';
    } catch (err) {
        showToast(err.message || 'Không tải được thẻ kho', 'danger');
    }
}

function printStockCard() {
    const d = stockCardData;
    if (!d) return;
    const m = d.material;
    const fmtD = s => new Date(s).toLocaleDateString('vi-VN');
    const rows = d.rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td class="c">${fmtD(r.ngay)}</td><td>${escHtml(r.chungTu)}</td><td>${escHtml(r.dienGiai)}</td>
        <td class="num">${r.nhap ? fmtQty(r.nhap) : ''}</td><td class="num">${r.xuat ? fmtQty(r.xuat) : ''}</td><td class="num">${fmtQty(r.ton)}</td><td></td></tr>`).join('');
    openPrintWindow(`Thẻ kho ${m.tenNL}`, `
        <div class="top"><div><b>Đơn vị: NOMNOMFOOD</b><br>Kho: ${escHtml(m.kho?.tenKho || '')}</div>
        <div class="right"><b>Mẫu số S09-DNN</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div></div>
        <h1>THẺ KHO (SỔ KHO)</h1>
        <p class="c"><i>Từ ngày ${fmtD(document.getElementById('sc-from').value)} đến ngày ${fmtD(document.getElementById('sc-to').value)}</i></p>
        <p>Tên vật tư: <b>${escHtml(m.tenNL)}</b> &nbsp; Mã số: <b>${escHtml(m.maNL || '')}</b> &nbsp; Đơn vị tính: <b>${escHtml(m.donViTinh || '')}</b></p>
        <table><thead><tr><th>STT</th><th>Ngày</th><th>Số chứng từ</th><th>Diễn giải</th><th>Nhập</th><th>Xuất</th><th>Tồn</th><th>Ký xác nhận của kế toán</th></tr></thead>
        <tbody><tr><td></td><td></td><td></td><td><i>Tồn đầu kỳ</i></td><td></td><td></td><td class="num">${fmtQty(d.tonDau)}</td><td></td></tr>${rows}
        <tr><td></td><td></td><td></td><td><b>Cộng cuối kỳ</b></td><td class="num"><b>${fmtQty(d.tongNhap)}</b></td><td class="num"><b>${fmtQty(d.tongXuat)}</b></td><td class="num"><b>${fmtQty(d.tonCuoi)}</b></td><td></td></tr></tbody></table>
        <div class="sign3"><div><b>Người lập</b><br><i>(Ký, họ tên)</i></div><div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div><div><b>Giám đốc</b><br><i>(Ký, họ tên, đóng dấu)</i></div></div>`);
}

// Cửa sổ in dùng chung cho chứng từ kho
function openPrintWindow(title, body, landscape = false) {
    const win = window.open('', '_blank');
    if (!win) { showToast('Trình duyệt đã chặn cửa sổ, hãy cho phép popup', 'warning'); return; }
    win.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${escHtml(title)}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', serif; font-size: 13px; color: #000; padding: 24px 32px; }
        .top { display: flex; justify-content: space-between; margin-bottom: 12px; } .top .right { text-align: center; font-size: 12px; }
        h1 { text-align: center; font-size: 20px; margin: 10px 0 2px; letter-spacing: 1px; }
        p { margin: 4px 0; line-height: 1.6; } .c { text-align: center; } .num { text-align: right; white-space: nowrap; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; } th, td { border: 1px solid #000; padding: 4px 6px; }
        th { background: #f2f2f2; } .sign3, .sign4 { display: grid; text-align: center; margin-top: 20px; } .sign3 { grid-template-columns: repeat(3, 1fr); } .sign4 { grid-template-columns: repeat(4, 1fr); }
        .sign3 div, .sign4 div { min-height: 100px; } .toolbar { text-align: right; margin-bottom: 10px; } .toolbar button { padding: 6px 14px; cursor: pointer; }
        @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 12mm; } @media print { .toolbar { display: none; } body { padding: 0; } }
    </style></head><body><div class="toolbar"><button onclick="window.print()">🖨 In</button></div>${body}</body></html>`);
    win.document.close();
}

// ==================== Kế toán: Phiếu xuất kho ====================
async function loadIssues() {
    const thangEl = document.getElementById('iss-filter-thang');
    if (thangEl && !thangEl.value) thangEl.value = pnlDateStr(new Date()).slice(0, 7);
    const qs = new URLSearchParams();
    if (thangEl?.value) qs.set('thang', thangEl.value);
    const loai = document.getElementById('iss-filter-loai')?.value;
    if (loai) qs.set('loai', loai);
    try {
        const res = await fetch(`${API}/acc/material-issues?${qs}`);
        allIssues = await res.json();
        renderIssues();
    } catch {
        showToast('Không tải được phiếu xuất kho', 'danger');
    }
}

function renderIssues() {
    const sum = {};
    allIssues.forEach(i => { const k = i.loaiXuat || 'che_bien'; sum[k] = sum[k] || { n: 0, v: 0 }; sum[k].n++; sum[k].v += i.tongTien || 0; });
    document.getElementById('issue-kpis').innerHTML = Object.entries(LOAI_XUAT_INFO).map(([k, info]) => `
        <div class="col-6 col-lg-3"><div class="card border-0 rounded-4 shadow-sm p-3 h-100" role="button" onclick="document.getElementById('iss-filter-loai').value='${k}'; loadIssues()">
            <div class="small text-muted"><span class="badge ${info.cls} me-1">&nbsp;</span>${info.label}</div>
            <div class="fs-5 fw-bold">${formatPrice(sum[k]?.v || 0)}</div>
            <div class="small text-muted">${sum[k]?.n || 0} phiếu · Nợ ${info.tk} / Có 152</div>
        </div></div>`).join('');
    const tbody = document.getElementById('issue-table-body');
    if (!allIssues.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Không có phiếu xuất nào</td></tr>'; return; }
    tbody.innerHTML = allIssues.map(i => {
        const info = LOAI_XUAT_INFO[i.loaiXuat] || LOAI_XUAT_INFO.che_bien;
        return `
        <tr role="button" onclick="viewIssueDetail('${i._id}')">
            <td class="font-monospace fw-semibold text-primary">${escHtml(i.soPhieu || '')}</td>
            <td class="text-nowrap">${new Date(i.ngayXuat).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td><span class="badge ${info.cls}">${info.label}</span>${i.amKho ? ' <span class="badge bg-warning text-dark" title="Xuất vượt tồn kho">Âm kho</span>' : ''}</td>
            <td class="small">${escHtml(i.lyDoXuat || '—')}${i.ghiChu ? `<div class="text-muted fst-italic">${escHtml(i.ghiChu)}</div>` : ''}</td>
            <td class="text-center">${i.soDong}</td>
            <td class="text-end fw-semibold">${formatPrice(i.tongTien || 0)}</td>
            <td class="text-end text-nowrap" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="printIssue('${i._id}')" title="In phiếu"><i class="fa-solid fa-print"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteIssue('${i._id}')" title="Xóa & hoàn kho"><i class="fa-solid fa-rotate-left"></i></button>
            </td>
        </tr>`;
    }).join('');
}

async function fetchIssue(id) {
    const res = await fetch(`${API}/acc/material-issues/${id}`);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Không tải được phiếu xuất');
    return d;
}

async function viewIssueDetail(id) {
    try {
        const d = await fetchIssue(id);
        const info = LOAI_XUAT_INFO[d.loaiXuat] || LOAI_XUAT_INFO.che_bien;
        document.getElementById('isd-so').textContent = d.soPhieu || '';
        document.getElementById('isd-sub').innerHTML = `<span class="badge ${info.cls}">${info.label}</span> · ${new Date(d.ngayXuat).toLocaleString('vi-VN')} · Nợ ${info.tk} / Có 152`;
        const o = d.order;
        document.getElementById('isd-body').innerHTML = `
            <div class="row g-2 small mb-3">
                <div class="col-md-6"><span class="text-muted">Lý do xuất:</span> <b>${escHtml(d.lyDoXuat || '')}</b></div>
                <div class="col-md-3"><span class="text-muted">Người nhận:</span> ${escHtml(d.nguoiNhan || '—')}</div>
                <div class="col-md-3"><span class="text-muted">Kho:</span> ${escHtml(d.kho?.tenKho || 'Nhiều kho')}</div>
                ${o ? `<div class="col-12"><span class="text-muted">Đơn hàng:</span> <b>#${String(o._id).slice(-6).toUpperCase()}</b> · ${escHtml(o.user?.name || '')} · ${(o.items || []).map(it => `${it.quantity}× ${escHtml(it.product?.name || '')}`).join(', ')}</div>` : ''}
                ${d.ghiChu ? `<div class="col-12 text-warning-emphasis"><i class="fa-solid fa-circle-info me-1"></i>${escHtml(d.ghiChu)}</div>` : ''}
            </div>
            <table class="table table-sm align-middle">
                <thead class="table-light"><tr><th>Mã</th><th>Nguyên liệu</th><th>Kho</th><th>ĐVT</th><th class="text-end">Tồn trước</th><th class="text-end">SL xuất</th><th class="text-end">Đơn giá</th><th class="text-end">Thành tiền</th></tr></thead>
                <tbody>${d.lines.map(l => `<tr class="${l.tonTruoc != null && l.soLuong > l.tonTruoc ? 'table-warning' : ''}">
                    <td class="font-monospace small">${escHtml(l.danhMucNL?.maNL || '')}</td><td>${escHtml(l.danhMucNL?.tenNL || '—')}</td>
                    <td class="small">${escHtml(l.danhMucNL?.kho?.tenKho || '')}</td><td>${escHtml(l.danhMucNL?.donViTinh || '')}</td>
                    <td class="text-end text-muted">${l.tonTruoc != null ? fmtQty(l.tonTruoc) : '—'}</td><td class="text-end fw-semibold">${fmtQty(l.soLuong)}</td>
                    <td class="text-end">${l.donGia != null ? formatPrice(l.donGia) : '—'}</td><td class="text-end">${l.thanhTien != null ? formatPrice(l.thanhTien) : '—'}</td></tr>`).join('')}</tbody>
                <tfoot><tr class="fw-bold"><td colspan="7" class="text-end">Tổng cộng</td><td class="text-end text-danger">${formatPrice(d.tongTien || 0)}</td></tr></tfoot>
            </table>`;
        document.getElementById('isd-print').onclick = () => printIssue(id);
        document.getElementById('isd-delete').onclick = async () => { if (await deleteIssue(id)) modalOf('issueDetailModal').hide(); };
        modalOf('issueDetailModal').show();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function printIssue(id) {
    try {
        const d = await fetchIssue(id);
        const dt = new Date(d.ngayXuat);
        const info = LOAI_XUAT_INFO[d.loaiXuat] || LOAI_XUAT_INFO.che_bien;
        const rows = d.lines.map((l, i) => `<tr><td class="c">${i + 1}</td><td>${escHtml(l.danhMucNL?.tenNL || '')}</td><td class="c">${escHtml(l.danhMucNL?.maNL || '')}</td><td class="c">${escHtml(l.danhMucNL?.donViTinh || '')}</td>
            <td class="num">${fmtQty(l.soLuong)}</td><td class="num">${fmtQty(l.soLuong)}</td><td class="num">${l.donGia != null ? Number(l.donGia).toLocaleString('vi-VN') : ''}</td><td class="num">${l.thanhTien != null ? Number(l.thanhTien).toLocaleString('vi-VN') : ''}</td></tr>`).join('');
        openPrintWindow(`Phiếu xuất kho ${d.soPhieu}`, `
            <div class="top"><div><b>Đơn vị: NOMNOMFOOD</b><br>Bộ phận: Kho</div>
            <div class="right"><b>Mẫu số 02 - VT</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div></div>
            <h1>PHIẾU XUẤT KHO</h1>
            <p class="c"><i>Ngày ${dt.getDate()} tháng ${dt.getMonth() + 1} năm ${dt.getFullYear()}</i> &nbsp; Số: <b>${escHtml(d.soPhieu || '')}</b> &nbsp; Nợ: <b>${info.tk}</b> &nbsp; Có: <b>152</b></p>
            <p>- Họ và tên người nhận hàng: <b>${escHtml(d.nguoiNhan || '')}</b></p>
            <p>- Lý do xuất kho: ${escHtml(d.lyDoXuat || '')}</p>
            <p>- Xuất tại kho: ${escHtml(d.kho?.tenKho || 'Nhiều kho')}${d.kho?.diaDiem ? ' &nbsp; Địa điểm: ' + escHtml(d.kho.diaDiem) : ''}</p>
            <table><thead><tr><th rowspan="2">STT</th><th rowspan="2">Tên vật tư</th><th rowspan="2">Mã số</th><th rowspan="2">ĐVT</th><th colspan="2">Số lượng</th><th rowspan="2">Đơn giá</th><th rowspan="2">Thành tiền</th></tr>
            <tr><th>Yêu cầu</th><th>Thực xuất</th></tr></thead>
            <tbody>${rows}<tr><td></td><td><b>Cộng</b></td><td></td><td></td><td></td><td></td><td></td><td class="num"><b>${Number(d.tongTien || 0).toLocaleString('vi-VN')}</b></td></tr></tbody></table>
            <p>- Tổng số tiền (viết bằng chữ): <b><i>${soThanhChu(d.tongTien || 0)}</i></b></p>
            <p>- Số chứng từ gốc kèm theo: ${d.order ? 'Đơn hàng #' + String(d.order._id).slice(-6).toUpperCase() : '................'}</p>
            <div class="sign4"><div><b>Người lập phiếu</b><br><i>(Ký, họ tên)</i><br><br><br><br>${escHtml(d.nguoiLap || '')}</div><div><b>Người nhận hàng</b><br><i>(Ký, họ tên)</i><br><br><br><br>${escHtml(d.nguoiNhan || '')}</div><div><b>Thủ kho</b><br><i>(Ký, họ tên)</i></div><div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div></div>`);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteIssue(id) {
    const i = allIssues.find(x => x._id === id);
    const msg = i?.loaiXuat === 'ban_hang'
        ? `Xóa phiếu ${i.soPhieu}?\n\nNguyên liệu sẽ được hoàn lại kho. Chỉ làm khi đơn hàng thực tế KHÔNG chế biến (nguyên liệu còn nguyên).`
        : `Xóa phiếu xuất ${i?.soPhieu || ''}?\n\nNguyên liệu được hoàn lại kho và bút toán giá vốn bị xóa.`;
    if (!confirm(msg)) return false;
    try {
        const res = await fetch(`${API}/acc/material-issues/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Không xóa được phiếu');
        showToast(json.message || 'Đã xóa phiếu xuất', 'success');
        await Promise.all([loadIssues(), loadMaterials()]);
        return true;
    } catch (err) {
        showToast(err.message, 'danger');
        return false;
    }
}

async function openIssueModal() {
    if (!allWarehouses.length) await loadWarehouses();
    await loadMaterials();
    document.getElementById('iss-loai').value = 'che_bien';
    document.getElementById('iss-ngay').value = pnlDateStr(new Date());
    document.getElementById('iss-kho').innerHTML = '<option value="">Tất cả kho</option>' + allWarehouses.map(w => `<option value="${w._id}">${escHtml(w.tenKho)}</option>`).join('');
    document.getElementById('iss-nguoinhan').value = 'Bếp chính';
    document.getElementById('issue-lines').innerHTML = '';
    onIssueTypeChange();
    addIssueLine();
    issueModalInst.show();
}

function onIssueTypeChange() {
    const loai = document.getElementById('iss-loai').value;
    const defaults = { che_bien: 'Xuất nguyên liệu sơ chế, chế biến', huy_hong: 'Hủy nguyên liệu hư hỏng / hết hạn sử dụng', noi_bo: 'Xuất nấu bữa ăn cho nhân viên' };
    const lydo = document.getElementById('iss-lydo');
    if (!lydo.value || Object.values(defaults).includes(lydo.value)) lydo.value = defaults[loai];
    document.getElementById('iss-dinhkhoan').textContent = `Nợ ${LOAI_XUAT_INFO[loai].tk} / Có 152`;
}

function issueMaterialOptions(selected) {
    const kho = document.getElementById('iss-kho').value;
    return '<option value="">— Chọn nguyên liệu —</option>' + allMaterials
        .filter(m => !kho || (m.kho?._id || m.kho) === kho || m._id === selected)
        .map(m => `<option value="${m._id}" ${m._id === selected ? 'selected' : ''} ${(m.tonHienTai || 0) <= 0 ? 'class="text-muted"' : ''}>${escHtml(m.tenNL)} (tồn ${fmtQty(m.tonHienTai)} ${escHtml(m.donViTinh || '')})</option>`).join('');
}

function refreshIssueMaterialOptions() {
    document.querySelectorAll('#issue-lines tr').forEach(tr => {
        const sel = tr.querySelector('.issue-line-material');
        sel.innerHTML = issueMaterialOptions(sel.value);
    });
}

function addIssueLine() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><select class="form-select form-select-sm issue-line-material" onchange="updateIssueLine(this)">${issueMaterialOptions('')}</select></td>
        <td class="issue-dvt small"></td>
        <td class="text-end issue-ton small"></td>
        <td><input type="number" class="form-control form-control-sm text-end issue-line-qty" min="0" step="0.01" oninput="updateIssueLine(this)"></td>
        <td class="text-end issue-gia small"></td>
        <td class="text-end issue-tt fw-semibold"></td>
        <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove(); updateIssueTotal()"><i class="fa-solid fa-trash"></i></button></td>`;
    document.getElementById('issue-lines').appendChild(tr);
}

function updateIssueLine(el) {
    const tr = el.closest('tr');
    const m = allMaterials.find(x => x._id === tr.querySelector('.issue-line-material').value);
    const qty = Number(tr.querySelector('.issue-line-qty').value) || 0;
    tr.querySelector('.issue-dvt').textContent = m?.donViTinh || '';
    tr.querySelector('.issue-ton').textContent = m ? fmtQty(m.tonHienTai) : '';
    tr.querySelector('.issue-gia').textContent = m ? formatPrice(m.giaVonBinhQuan || 0) : '';
    tr.querySelector('.issue-tt').textContent = m && qty ? formatPrice(Math.round(qty * (m.giaVonBinhQuan || 0))) : '';
    tr.classList.toggle('table-danger', !!m && qty > (m.tonHienTai || 0));
    updateIssueTotal();
}

function updateIssueTotal() {
    let tong = 0;
    document.querySelectorAll('#issue-lines tr').forEach(tr => {
        const m = allMaterials.find(x => x._id === tr.querySelector('.issue-line-material').value);
        tong += m ? Math.round((Number(tr.querySelector('.issue-line-qty').value) || 0) * (m.giaVonBinhQuan || 0)) : 0;
    });
    document.getElementById('iss-tong').textContent = formatPrice(tong);
}

async function saveIssue() {
    const lines = [];
    for (const tr of document.querySelectorAll('#issue-lines tr')) {
        const id = tr.querySelector('.issue-line-material').value;
        const soLuong = Number(tr.querySelector('.issue-line-qty').value) || 0;
        if (!id && !soLuong) continue;
        const m = allMaterials.find(x => x._id === id);
        if (!m) { showToast('Chọn nguyên liệu cho dòng còn trống', 'warning'); return; }
        if (soLuong <= 0) { showToast(`${m.tenNL}: nhập số lượng xuất`, 'warning'); return; }
        if (soLuong > (m.tonHienTai || 0)) { showToast(`${m.tenNL}: chỉ còn ${fmtQty(m.tonHienTai)} ${m.donViTinh || ''} trong kho`, 'warning'); return; }
        lines.push({ danhMucNL: id, soLuong });
    }
    if (!lines.length) { showToast('Vui lòng nhập ít nhất một dòng nguyên liệu', 'warning'); return; }
    const ngay = document.getElementById('iss-ngay').value;
    if (!ngay) { showToast('Vui lòng chọn ngày xuất', 'warning'); return; }
    const body = {
        loaiXuat: document.getElementById('iss-loai').value,
        ngayXuat: `${ngay}T${new Date().toTimeString().slice(0, 8)}`,
        kho: document.getElementById('iss-kho').value || null,
        nguoiNhan: document.getElementById('iss-nguoinhan').value.trim(),
        lyDoXuat: document.getElementById('iss-lydo').value.trim(),
        nguoiLap: getUser()?.name || '',
        lines,
    };
    try {
        const res = await fetch(`${API}/acc/material-issues`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(`Đã lập phiếu ${json.soPhieu} và hạch toán giá vốn ${formatPrice(json.tongTien)}`, 'success');
        issueModalInst.hide();
        await Promise.all([loadIssues(), loadMaterials()]);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== Kế toán: Kiểm kê kho ====================
let allStocktakes = [];

async function loadStocktakes() {
    try {
        allStocktakes = await fetch(`${API}/acc/stocktakes`).then(r => r.json());
        const tbody = document.getElementById('stocktake-table-body');
        if (!allStocktakes.length) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">Chưa có phiếu kiểm kê nào</td></tr>'; return; }
        tbody.innerHTML = allStocktakes.map(p => `
            <tr role="button" onclick="printStocktake('${p._id}')">
                <td class="font-monospace fw-semibold text-primary">${escHtml(p.soPhieu)}</td>
                <td>${new Date(p.ngay).toLocaleDateString('vi-VN')}</td>
                <td>${escHtml(p.kho?.tenKho || 'Tất cả kho')}</td>
                <td>${escHtml(p.nguoiKiem || '—')}</td>
                <td class="text-center">${p.chiTiet.length}</td>
                <td class="text-center">${p.chiTiet.filter(c => c.chenhLech).length}</td>
                <td class="text-end text-danger">${p.giaTriThieu ? formatPrice(p.giaTriThieu) : '—'}</td>
                <td class="text-end text-success">${p.giaTriThua ? formatPrice(p.giaTriThua) : '—'}</td>
                <td class="text-end text-nowrap" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="printStocktake('${p._id}')" title="In biên bản"><i class="fa-solid fa-print"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStocktake('${p._id}')" title="Xóa & hoàn tồn"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join('');
    } catch {
        showToast('Không tải được phiếu kiểm kê', 'danger');
    }
}

async function openStocktakeModal() {
    if (!allWarehouses.length) await loadWarehouses();
    await loadMaterials();
    document.getElementById('kk-kho').innerHTML = '<option value="">Tất cả kho</option>' + allWarehouses.map(w => `<option value="${w._id}">${escHtml(w.tenKho)}</option>`).join('');
    document.getElementById('kk-ngay').value = pnlDateStr(new Date());
    document.getElementById('kk-nguoi').value = getUser()?.name || '';
    document.getElementById('kk-ghichu').value = '';
    document.getElementById('kk-search').value = '';
    renderStocktakeLines();
    modalOf('stocktakeModal').show();
}

function renderStocktakeLines() {
    const kho = document.getElementById('kk-kho').value;
    const list = allMaterials.filter(m => !kho || (m.kho?._id || m.kho) === kho);
    document.getElementById('kk-lines').innerHTML = list.map(m => `
        <tr data-id="${m._id}" data-ton="${m.tonHienTai || 0}" data-gia="${m.giaVonBinhQuan || 0}" data-name="${escHtml(`${m.maNL || ''} ${m.tenNL}`.toLowerCase())}">
            <td class="font-monospace small text-muted">${escHtml(m.maNL || '')}</td>
            <td>${escHtml(m.tenNL)}</td>
            <td class="small">${escHtml(m.donViTinh || '')}</td>
            <td class="text-end">${fmtQty(m.tonHienTai)}</td>
            <td><input type="number" class="form-control form-control-sm text-end kk-thucte" min="0" step="0.01" value="${Math.max(0, m.tonHienTai || 0)}" oninput="updateStocktakeLine(this)"></td>
            <td class="text-end kk-cl"></td>
            <td class="text-end kk-gt small"></td>
            <td><input type="text" class="form-control form-control-sm kk-lydo" placeholder="Hao hụt, hư hỏng..."></td>
        </tr>`).join('') || '<tr><td colspan="8" class="text-center text-muted py-3">Kho chưa có nguyên liệu</td></tr>';
    document.querySelectorAll('#kk-lines .kk-thucte').forEach(updateStocktakeLine);
}

function filterStocktakeLines() {
    const kw = document.getElementById('kk-search').value.trim().toLowerCase();
    document.querySelectorAll('#kk-lines tr[data-id]').forEach(tr => tr.classList.toggle('d-none', !!kw && !tr.dataset.name.includes(kw)));
}

function updateStocktakeLine(input) {
    const tr = input.closest('tr');
    const cl = Math.round(((Number(input.value) || 0) - Number(tr.dataset.ton)) * 1000) / 1000;
    const gt = Math.round(cl * Number(tr.dataset.gia));
    tr.querySelector('.kk-cl').innerHTML = cl ? `<span class="fw-bold ${cl < 0 ? 'text-danger' : 'text-success'}">${cl > 0 ? '+' : ''}${fmtQty(cl)}</span>` : '<span class="text-muted">0</span>';
    tr.querySelector('.kk-gt').textContent = cl ? formatPrice(gt) : '';
    tr.classList.toggle('table-warning', !!cl);
    let thieu = 0, thua = 0;
    document.querySelectorAll('#kk-lines tr[data-id]').forEach(r => {
        const c = ((Number(r.querySelector('.kk-thucte').value) || 0) - Number(r.dataset.ton)) * Number(r.dataset.gia);
        if (c < 0) thieu -= c; else thua += c;
    });
    document.getElementById('kk-thieu').textContent = formatPrice(Math.round(thieu));
    document.getElementById('kk-thua').textContent = formatPrice(Math.round(thua));
}

async function saveStocktake() {
    const lines = [...document.querySelectorAll('#kk-lines tr[data-id]')].map(tr => ({
        danhMucNL: tr.dataset.id, tonThucTe: tr.querySelector('.kk-thucte').value, lyDo: tr.querySelector('.kk-lydo').value.trim(),
    })).filter(l => l.tonThucTe !== '');
    if (!lines.length) { showToast('Chưa có nguyên liệu nào để kiểm kê', 'warning'); return; }
    if (lines.some(l => Number(l.tonThucTe) < 0)) { showToast('Số lượng thực tế không được âm', 'warning'); return; }
    const lech = lines.filter(l => Math.abs(Number(l.tonThucTe) - Number(document.querySelector(`#kk-lines tr[data-id="${l.danhMucNL}"]`).dataset.ton)) > 1e-9).length;
    if (!confirm(`Lưu phiếu kiểm kê ${lines.length} mặt hàng (${lech} mặt hàng chênh lệch)?\nTồn kho sẽ được điều chỉnh theo số thực tế.`)) return;
    const ngay = document.getElementById('kk-ngay').value;
    try {
        const res = await fetch(`${API}/acc/stocktakes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ngay: `${ngay}T${new Date().toTimeString().slice(0, 8)}`, kho: document.getElementById('kk-kho').value || null,
                nguoiKiem: document.getElementById('kk-nguoi').value.trim(), ghiChu: document.getElementById('kk-ghichu').value.trim(), lines,
            }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(`Đã lập phiếu kiểm kê ${json.soPhieu}`, 'success');
        modalOf('stocktakeModal').hide();
        await Promise.all([loadStocktakes(), loadMaterials()]);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteStocktake(id) {
    const p = allStocktakes.find(x => x._id === id);
    if (!confirm(`Xóa phiếu kiểm kê ${p?.soPhieu || ''}?\nTồn kho được hoàn lại số trước khi kiểm kê và bút toán điều chỉnh bị xóa.`)) return;
    try {
        const res = await fetch(`${API}/acc/stocktakes/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Không xóa được phiếu');
        showToast(json.message, 'success');
        await Promise.all([loadStocktakes(), loadMaterials()]);
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function printStocktake(id) {
    try {
        const res = await fetch(`${API}/acc/stocktakes/${id}`);
        const p = await res.json();
        if (!res.ok) throw new Error(p.error);
        const dt = new Date(p.ngay);
        const n = v => Number(v || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
        const rows = p.chiTiet.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${escHtml(c.tenNL)}</td><td class="c">${escHtml(c.donViTinh)}</td><td class="num">${n(c.donGia)}</td>
            <td class="num">${n(c.tonSoSach)}</td><td class="num">${n(c.tonSoSach * c.donGia)}</td><td class="num">${n(c.tonThucTe)}</td><td class="num">${n(c.tonThucTe * c.donGia)}</td>
            <td class="num">${c.chenhLech > 0 ? n(c.chenhLech) : ''}</td><td class="num">${c.chenhLech > 0 ? n(c.giaTriChenhLech) : ''}</td>
            <td class="num">${c.chenhLech < 0 ? n(-c.chenhLech) : ''}</td><td class="num">${c.chenhLech < 0 ? n(-c.giaTriChenhLech) : ''}</td><td>${escHtml(c.lyDo)}</td></tr>`).join('');
        openPrintWindow(`Biên bản kiểm kê ${p.soPhieu}`, `
            <div class="top"><div><b>Đơn vị: NOMNOMFOOD</b><br>Kho: ${escHtml(p.kho?.tenKho || 'Tất cả kho')}</div>
            <div class="right"><b>Mẫu số 05 - VT</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div></div>
            <h1>BIÊN BẢN KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HÓA</h1>
            <p class="c">Thời điểm kiểm kê: ${dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${dt.getDate()} tháng ${dt.getMonth() + 1} năm ${dt.getFullYear()} &nbsp; Số: <b>${escHtml(p.soPhieu)}</b></p>
            <p>Ban kiểm kê gồm: <b>${escHtml(p.nguoiKiem || '')}</b>${p.ghiChu ? ' &nbsp; Ghi chú: ' + escHtml(p.ghiChu) : ''}</p>
            <table><thead><tr><th rowspan="2">STT</th><th rowspan="2">Tên vật tư</th><th rowspan="2">ĐVT</th><th rowspan="2">Đơn giá</th><th colspan="2">Theo sổ kế toán</th><th colspan="2">Theo kiểm kê</th><th colspan="2">Thừa</th><th colspan="2">Thiếu</th><th rowspan="2">Lý do</th></tr>
            <tr><th>SL</th><th>Thành tiền</th><th>SL</th><th>Thành tiền</th><th>SL</th><th>Thành tiền</th><th>SL</th><th>Thành tiền</th></tr></thead>
            <tbody>${rows}<tr><td></td><td><b>Cộng</b></td><td colspan="7"></td><td class="num"><b>${n(p.giaTriThua)}</b></td><td></td><td class="num"><b>${n(p.giaTriThieu)}</b></td><td></td></tr></tbody></table>
            <div class="sign4"><div><b>Giám đốc</b><br><i>(Ý kiến giải quyết số chênh lệch)</i></div><div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div><div><b>Thủ kho</b><br><i>(Ký, họ tên)</i></div><div><b>Trưởng ban kiểm kê</b><br><i>(Ký, họ tên)</i><br><br><br>${escHtml(p.nguoiKiem || '')}</div></div>`, true);
    } catch (err) {
        showToast(err.message || 'Không tải được phiếu kiểm kê', 'danger');
    }
}

// ==================== Kế toán: Định mức món ăn (công thức) ====================
let currentRecipeProductId = null;

async function loadRecipes() {
    try {
        if (!allMaterials.length) await loadMaterials();
        if (!allProductsForAcc.length) {
            const res = await fetch(`${API}/products`);
            allProductsForAcc = await res.json();
        }
        const res = await fetch(`${API}/acc/recipes`);
        allRecipes = await res.json();
        renderRecipes();
    } catch {
        showToast('Không tải được định mức món ăn', 'danger');
    }
}

// Bảng danh sách: mỗi dòng là 1 MÓN ĂN (không phải 1 dòng nguyên liệu), để dễ thấy
// ngay món nào còn thiếu công thức và bấm vào để tạo/quản lý công thức cho món đó.
function renderRecipes() {
    const tbody = document.getElementById('recipe-table-body');
    const summaryEl = document.getElementById('recipe-summary');
    const onlyMissing = document.getElementById('recipe-filter-missing')?.checked;
    const keyword = (document.getElementById('recipe-search')?.value || '').trim().toLowerCase();

    const linesByProduct = {};
    allRecipes.forEach(r => {
        const pid = r.product?._id;
        if (!pid) return;
        (linesByProduct[pid] = linesByProduct[pid] || []).push(r);
    });

    const missingCount = allProductsForAcc.filter(p => !linesByProduct[p._id]?.length).length;
    if (summaryEl) {
        summaryEl.textContent = `${allProductsForAcc.length - missingCount}/${allProductsForAcc.length} món đã có công thức`
            + (missingCount ? ` — còn ${missingCount} món chưa có công thức` : '');
    }

    let rows = allProductsForAcc.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (keyword) rows = rows.filter(p => p.name.toLowerCase().includes(keyword));
    if (onlyMissing) rows = rows.filter(p => !linesByProduct[p._id]?.length);

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Không có món ăn nào phù hợp</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map(p => {
        const lines = linesByProduct[p._id] || [];
        const ingredientBadges = lines.length
            ? lines.map(l => `<span class="badge bg-light text-dark border me-1 mb-1">${l.danhMucNL?.tenNL || '—'}: ${fmtQty(l.dinhLuong)} ${l.danhMucNL?.donViTinh || ''}</span>`).join('')
            : '<span class="badge bg-danger bg-opacity-10 text-danger">Chưa có công thức — bếp nấu không trừ kho</span>';
        const cost = lines.reduce((sum, l) => sum + l.dinhLuong * (l.danhMucNL?.giaVonBinhQuan || 0), 0);
        const ratio = lines.length && p.price ? cost / p.price * 100 : null;
        return `
        <tr>
            <td class="fw-semibold">${p.name}</td>
            <td>${ingredientBadges}</td>
            <td class="text-center">${lines.length}</td>
            <td class="text-end">${lines.length ? formatPrice(Math.round(cost)) : '—'}</td>
            <td class="text-end">${formatPrice(p.price || 0)}</td>
            <td class="text-end">${ratio == null ? '—' : `<span class="badge ${ratio > 40 ? 'bg-danger' : ratio > 30 ? 'bg-warning text-dark' : 'bg-success'}">${ratio.toFixed(1)}%</span>`}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="openRecipeModal('${p._id}')">
                    <i class="fa-solid fa-list-check me-1"></i>${lines.length ? 'Quản lý' : 'Tạo công thức'}
                </button>
            </td>
        </tr>`;
    }).join('');
}

// Mở modal quản lý công thức cho MỘT món ăn cụ thể: xem/sửa/xóa nguyên liệu đã có
// và thêm nhiều dòng nguyên liệu mới cùng lúc.
function openRecipeModal(productId) {
    currentRecipeProductId = productId;
    const product = allProductsForAcc.find(p => p._id === productId);
    document.getElementById('recipe-modal-dish-name').textContent = product?.name || '';
    document.getElementById('rec-product').value = productId;
    document.getElementById('recipe-new-lines').innerHTML = '';
    renderExistingRecipeLines();
    addRecipeLine();
    recipeModalInst.show();
}

function renderExistingRecipeLines() {
    const container = document.getElementById('recipe-existing-lines');
    const lines = allRecipes.filter(r => r.product?._id === currentRecipeProductId);
    if (!lines.length) {
        container.innerHTML = '<div class="text-muted small fst-italic">Món này chưa có nguyên liệu nào.</div>';
        return;
    }
    container.innerHTML = lines.map(l => `
        <div class="row g-2 mb-2 align-items-center">
            <div class="col-6">${l.danhMucNL?.tenNL || '—'} <span class="small text-muted">(${l.danhMucNL?.donViTinh || ''}/phần)</span></div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" min="0" step="0.01"
                    value="${l.dinhLuong}" onchange="updateRecipeLine('${l._id}', this.value)">
            </div>
            <div class="col-2">
                <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="deleteRecipeLine('${l._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`).join('');
}

function addRecipeLine() {
    const container = document.getElementById('recipe-new-lines');
    const usedIds = new Set(allRecipes.filter(r => r.product?._id === currentRecipeProductId).map(r => r.danhMucNL?._id));
    const options = allMaterials.filter(m => !usedIds.has(m._id));
    if (!options.length) { showToast('Tất cả nguyên liệu đã có trong công thức này', 'warning'); return; }
    const div = document.createElement('div');
    div.className = 'row g-2 mb-2 recipe-new-line';
    div.innerHTML = `
        <div class="col-6"><select class="form-select form-select-sm recipe-line-material">${options.map(m => `<option value="${m._id}">${m.tenNL} (${m.donViTinh || ''})</option>`).join('')}</select></div>
        <div class="col-4"><input type="number" class="form-control form-control-sm recipe-line-qty" placeholder="Định lượng / phần" min="0" step="0.01"></div>
        <div class="col-2"><button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="this.closest('.recipe-new-line').remove()"><i class="fa-solid fa-trash"></i></button></div>`;
    container.appendChild(div);
}

async function updateRecipeLine(id, dinhLuong) {
    const value = Number(dinhLuong);
    if (!value || value <= 0) {
        showToast('Định lượng phải lớn hơn 0', 'warning');
        renderExistingRecipeLines();
        return;
    }
    try {
        const res = await fetch(`${API}/acc/recipes/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dinhLuong: value }),
        });
        if (!res.ok) throw new Error();
        showToast('Đã cập nhật định lượng', 'success');
        await loadRecipes();
        renderExistingRecipeLines();
    } catch {
        showToast('Lỗi khi cập nhật định lượng', 'danger');
    }
}

async function deleteRecipeLine(id) {
    if (!confirm('Xác nhận xóa nguyên liệu này khỏi công thức?')) return;
    try {
        const res = await fetch(`${API}/acc/recipes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Đã xóa nguyên liệu khỏi công thức', 'success');
        await loadRecipes();
        renderExistingRecipeLines();
    } catch {
        showToast('Lỗi khi xóa nguyên liệu', 'danger');
    }
}

async function saveRecipeLines() {
    const product = document.getElementById('rec-product').value;
    const rows = Array.from(document.querySelectorAll('.recipe-new-line'));
    const seen = new Set();
    const lines = rows.map(row => ({
        danhMucNL: row.querySelector('.recipe-line-material').value,
        dinhLuong: Number(row.querySelector('.recipe-line-qty').value),
    })).filter(l => {
        if (!l.danhMucNL || !(l.dinhLuong > 0) || seen.has(l.danhMucNL)) return false;
        seen.add(l.danhMucNL);
        return true;
    });

    if (!lines.length) { showToast('Vui lòng nhập ít nhất một dòng nguyên liệu hợp lệ', 'warning'); return; }

    let successCount = 0;
    for (const line of lines) {
        try {
            const res = await fetch(`${API}/acc/recipes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product, ...line }),
            });
            if (res.ok) successCount++;
        } catch {
            // bỏ qua dòng lỗi, tiếp tục các dòng còn lại
        }
    }

    if (successCount) showToast(`Đã thêm ${successCount} nguyên liệu vào công thức`, 'success');
    if (successCount < lines.length) showToast('Một vài dòng không lưu được, vui lòng kiểm tra lại', 'warning');

    await loadRecipes();
    document.getElementById('recipe-new-lines').innerHTML = '';
    renderExistingRecipeLines();
    addRecipeLine();
}

// ==================== Kế toán: Tài sản cố định ====================
let assetMeta = null;
const BO_PHAN = { bep: 'Bếp', bar: 'Quầy bar', sanh: 'Sảnh / phòng ăn', giao_hang: 'Giao hàng', van_phong: 'Văn phòng / quản lý' };
const AS_TRANG_THAI = {
    dang_su_dung: { label: 'Đang sử dụng', cls: 'bg-success' },
    tam_ngung: { label: 'Tạm ngừng', cls: 'bg-warning text-dark' },
    het_khau_hao: { label: 'Đã khấu hao hết', cls: 'bg-secondary' },
    thanh_ly: { label: 'Đã thanh lý', cls: 'bg-dark' },
};
const NGUON_TS = { 111: 'Mua bằng tiền mặt', 112: 'Mua bằng chuyển khoản', 331: 'Mua chịu nhà cung cấp', 411: 'Có từ trước / góp vốn', khong_ghi_so: 'Không ghi sổ qua phân hệ' };
const fmtThang = k => { if (!k) return ''; const [y, m] = k.split('-'); return `${m}/${y}`; };

async function ensureAssetMeta() {
    if (!assetMeta) assetMeta = await fetch(`${API}/acc/fixed-assets/meta`).then(r => r.json());
    return assetMeta;
}

async function loadAssets() {
    try {
        await ensureAssetMeta();
        const res = await fetch(`${API}/acc/fixed-assets`);
        allAssets = await res.json();
        if (!res.ok) throw new Error(allAssets.error);
        const nhomSel = document.getElementById('as-filter-nhom');
        if (nhomSel && nhomSel.options.length === 0) {
            nhomSel.innerHTML = '<option value="">Tất cả nhóm</option>' + Object.entries(assetMeta.nhom).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
            document.getElementById('as-filter-bophan').innerHTML = '<option value="">Tất cả bộ phận</option>' + Object.entries(BO_PHAN).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
        }
        renderAssets();
    } catch {
        showToast('Không tải được tài sản cố định', 'danger');
    }
}

function renderAssets() {
    const active = allAssets.filter(a => a.trangThai !== 'thanh_ly');
    const ng = active.reduce((s, a) => s + a.nguyenGia, 0), hm = active.reduce((s, a) => s + a.haoMonLuyKe, 0);
    document.getElementById('as-kpi-ng').textContent = formatPrice(ng);
    document.getElementById('as-kpi-count').textContent = `${active.length} tài sản đang theo dõi`;
    document.getElementById('as-kpi-hm').textContent = formatPrice(hm);
    document.getElementById('as-kpi-hm-pct').textContent = ng ? `${(hm / ng * 100).toFixed(1)}% nguyên giá` : '';
    document.getElementById('as-kpi-gtcl').textContent = formatPrice(ng - hm);
    const kh = active.reduce((s, a) => s + (a.khauHaoThangNay || 0), 0);
    const daGhi = active.some(a => a.daGhiThangNay);
    document.getElementById('as-kpi-kh').textContent = formatPrice(kh);
    document.getElementById('as-kpi-kh-st').innerHTML = daGhi ? '<span class="text-success"><i class="fa-solid fa-circle-check me-1"></i>Đã trích &amp; ghi sổ</span>' : '<span class="text-warning-emphasis"><i class="fa-solid fa-clock me-1"></i>Chưa trích — bấm để trích</span>';

    const kw = (document.getElementById('as-search').value || '').trim().toLowerCase();
    const nhom = document.getElementById('as-filter-nhom').value, bp = document.getElementById('as-filter-bophan').value, tt = document.getElementById('as-filter-tt').value;
    const rows = allAssets.filter(a => (!kw || `${a.maTS} ${a.tenTaiSan} ${a.soSeri || ''} ${a.nhanHieu || ''}`.toLowerCase().includes(kw))
        && (!nhom || a.nhom === nhom) && (!bp || a.boPhan === bp) && (!tt || a.trangThai === tt));
    const tbody = document.getElementById('asset-table-body');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">Không có tài sản phù hợp</td></tr>';
        document.getElementById('asset-table-foot').innerHTML = '';
        return;
    }
    tbody.innerHTML = rows.map(a => {
        const st = AS_TRANG_THAI[a.trangThai] || AS_TRANG_THAI.dang_su_dung;
        const pct = a.nguyenGia ? Math.min(100, a.haoMonLuyKe / a.nguyenGia * 100) : 0;
        const tl = a.trangThai === 'thanh_ly';
        return `
        <tr role="button" onclick="openAssetDetail('${a._id}')" class="${tl ? 'text-muted' : ''}">
            <td class="font-monospace small">${escHtml(a.maTS || '')}</td>
            <td><div class="fw-semibold">${escHtml(a.tenTaiSan)}${a.duoiNguong ? ' <i class="fa-solid fa-circle-info text-warning" title="Nguyên giá dưới 30 triệu: theo TT45/2013 nên theo dõi là công cụ dụng cụ (TK 242)"></i>' : ''}</div>
                <div class="small text-muted">${escHtml(a.nhomLabel)}${a.nhanHieu ? ' · ' + escHtml(a.nhanHieu) : ''}</div></td>
            <td class="small">${escHtml(BO_PHAN[a.boPhan] || '')}${a.viTri ? `<div class="text-muted">${escHtml(a.viTri)}</div>` : ''}</td>
            <td class="small text-nowrap">${new Date(a.ngayMua).toLocaleDateString('vi-VN')}<div class="text-muted">${a.thoiGianKhauHaoThang} tháng → ${fmtThang(a.thangKetThuc)}</div></td>
            <td class="text-end">${formatPrice(a.nguyenGia)}</td>
            <td class="text-end">${tl ? '—' : formatPrice(a.mucKhauHaoThang)}</td>
            <td class="text-end text-danger">${formatPrice(a.haoMonLuyKe)}</td>
            <td class="text-end">
                <div class="fw-bold">${formatPrice(a.giaTriConLai)}</div>
                <div class="progress mt-1" style="height: 5px" title="Đã khấu hao ${pct.toFixed(0)}%"><div class="progress-bar ${pct >= 100 ? 'bg-secondary' : 'bg-danger'}" style="width: ${pct}%"></div></div>
                <div class="small text-muted">đã KH ${pct.toFixed(0)}%</div>
            </td>
            <td><span class="badge ${st.cls}">${st.label}</span></td>
            <td class="text-end text-nowrap" onclick="event.stopPropagation()">
                ${tl ? '' : `<button class="btn btn-sm btn-outline-primary me-1" onclick="openAssetModal('${a._id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-dark me-1" onclick="openDisposeModal('${a._id}')" title="Thanh lý"><i class="fa-solid fa-file-circle-xmark"></i></button>`}
                <button class="btn btn-sm btn-outline-danger" onclick="deleteAsset('${a._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
    const sum = k => rows.reduce((s, a) => s + (a[k] || 0), 0);
    document.getElementById('asset-table-foot').innerHTML = `<tr class="fw-bold"><td colspan="4" class="text-end">Cộng (${rows.length} tài sản)</td>
        <td class="text-end">${formatPrice(sum('nguyenGia'))}</td><td></td><td class="text-end text-danger">${formatPrice(sum('haoMonLuyKe'))}</td>
        <td class="text-end">${formatPrice(sum('giaTriConLai'))}</td><td colspan="2"></td></tr>`;
}

async function openAssetModal(id) {
    await ensureAssetMeta();
    if (!allAssets.length && id) await loadAssets();
    const a = id ? allAssets.find(x => x._id === id) : null;
    const locked = !!a && a.soKyDaTrich > 0;
    document.getElementById('as-id').value = a?._id || '';
    document.getElementById('asset-modal-title').textContent = a ? `Sửa tài sản ${a.maTS}` : 'Ghi tăng tài sản cố định';
    document.getElementById('as-nhom').innerHTML = Object.entries(assetMeta.nhom).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    document.getElementById('as-bophan').innerHTML = Object.entries(BO_PHAN).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    const set = (fid, v) => document.getElementById(fid).value = v ?? '';
    set('as-ma', a?.maTS); set('as-ten', a?.tenTaiSan); set('as-nhom', a?.nhom || 'thiet_bi_bep'); set('as-bophan', a?.boPhan || 'bep');
    set('as-vitri', a?.viTri); set('as-nhanhieu', a?.nhanHieu); set('as-seri', a?.soSeri); set('as-nuocsx', a?.nuocSanXuat);
    set('as-ncc', a?.nhaCungCap); set('as-sohd', a?.soChungTu); set('as-baohanh', a?.baoHanhDen ? pnlDateStr(new Date(a.baoHanhDen)) : '');
    set('as-nguyengia', a?.nguyenGia); set('as-ngaymua', a ? pnlDateStr(new Date(a.ngayMua)) : pnlDateStr(new Date()));
    set('as-thoigian', a?.thoiGianKhauHaoThang || assetMeta.nhom.thiet_bi_bep.thang);
    set('as-nguon', a?.nguonHinhThanh || '112'); set('as-haomon', a?.haoMonDauKy || 0); set('as-tkcp', a?.tkChiPhi || '642'); set('as-ghichu', a?.ghiChu);
    document.querySelectorAll('#assetModal .as-money').forEach(el => el.disabled = locked);
    document.getElementById('as-lock-note').classList.toggle('d-none', !locked);
    try {
        const sup = await fetch(`${API}/acc/suppliers`).then(r => r.json());
        document.getElementById('as-ncc-list').innerHTML = sup.map(s => `<option value="${escHtml(s.tenNCC)}"></option>`).join('');
    } catch { /* gợi ý nhà cung cấp không bắt buộc */ }
    updateAssetPreview();
    assetModalInst.show();
}

function onAssetGroupChange() {
    const g = assetMeta.nhom[document.getElementById('as-nhom').value];
    if (g && !document.getElementById('as-id').value) document.getElementById('as-thoigian').value = g.thang;
    const bp = { thiet_bi_bep: 'bep', thiet_bi_pha_che: 'bar', phuong_tien: 'giao_hang', thiet_bi_quan_ly: 'van_phong', noi_that: 'sanh', thiet_bi_lanh: 'sanh' }[document.getElementById('as-nhom').value];
    if (bp && !document.getElementById('as-id').value) document.getElementById('as-bophan').value = bp;
    updateAssetPreview();
}

function updateAssetPreview() {
    const ng = Number(document.getElementById('as-nguyengia').value) || 0;
    const n = Number(document.getElementById('as-thoigian').value) || 0;
    const nguon = document.getElementById('as-nguon').value;
    const hm = Number(document.getElementById('as-haomon').value) || 0;
    document.getElementById('as-haomon-wrap').classList.toggle('d-none', nguon !== '411');
    const ngay = document.getElementById('as-ngaymua').value;
    let end = '';
    if (ngay && n) { const d = new Date(ngay); d.setMonth(d.getMonth() + n - 1); end = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }
    const lines = [];
    if (ng && n) lines.push(`Khấu hao mỗi tháng: <b>${formatPrice(Math.round(ng / n))}</b> (${(100 / n * 12).toFixed(1)}%/năm) · Kết thúc khấu hao: <b>${end}</b>`);
    if (nguon !== 'khong_ghi_so' && ng) {
        lines.push(`Bút toán ghi tăng: <b>Nợ 211 / Có ${nguon}</b> ${formatPrice(ng)}${nguon === '411' && hm ? ` · <b>Nợ 411 / Có 214</b> ${formatPrice(hm)}` : ''}`);
        if (nguon === '331') lines.push('Khoản nợ nhà cung cấp được đưa vào <b>Công nợ phải trả</b> để lập phiếu chi thanh toán.');
    }
    if (ng && ng < (assetMeta?.nguong || 30000000)) lines.push(`<span class="text-warning-emphasis"><i class="fa-solid fa-triangle-exclamation me-1"></i>Nguyên giá dưới 30.000.000đ — theo Thông tư 45/2013/TT-BTC chưa đủ tiêu chuẩn TSCĐ, nên theo dõi là công cụ dụng cụ (TK 242).</span>`);
    document.getElementById('as-preview').innerHTML = lines.join('<br>') || '<span class="text-muted">Nhập nguyên giá và thời gian khấu hao để xem mức trích hàng tháng</span>';
}

async function saveAsset() {
    const id = document.getElementById('as-id').value;
    const v = fid => document.getElementById(fid).value.trim();
    const body = {
        maTS: v('as-ma'), tenTaiSan: v('as-ten'), nhom: v('as-nhom'), boPhan: v('as-bophan'), viTri: v('as-vitri'),
        nhanHieu: v('as-nhanhieu'), soSeri: v('as-seri'), nuocSanXuat: v('as-nuocsx'), nhaCungCap: v('as-ncc'), soChungTu: v('as-sohd'),
        baoHanhDen: v('as-baohanh') || null, thoiGianKhauHaoThang: Number(v('as-thoigian')), tkChiPhi: v('as-tkcp'), ghiChu: v('as-ghichu'),
    };
    if (!body.tenTaiSan) { showToast('Vui lòng nhập tên tài sản', 'warning'); return; }
    if (!(body.thoiGianKhauHaoThang > 0)) { showToast('Vui lòng nhập thời gian khấu hao', 'warning'); return; }
    if (!document.getElementById('as-nguyengia').disabled) {
        Object.assign(body, { nguyenGia: Number(v('as-nguyengia')), ngayMua: v('as-ngaymua'), nguonHinhThanh: v('as-nguon'), haoMonDauKy: v('as-nguon') === '411' ? Number(v('as-haomon')) || 0 : 0 });
        if (!(body.nguyenGia > 0)) { showToast('Vui lòng nhập nguyên giá', 'warning'); return; }
        if (!body.ngayMua) { showToast('Vui lòng chọn ngày đưa vào sử dụng', 'warning'); return; }
        if (body.nguonHinhThanh === '331' && !body.nhaCungCap) { showToast('Mua chịu: vui lòng nhập nhà cung cấp', 'warning'); return; }
    }
    try {
        const res = await fetch(`${API}/acc/fixed-assets${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật tài sản' : `Đã ghi tăng tài sản ${json.maTS}`, 'success');
        assetModalInst.hide();
        await loadAssets();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteAsset(id) {
    const a = allAssets.find(x => x._id === id);
    if (!confirm(`Xóa tài sản ${a?.maTS || ''} "${a?.tenTaiSan || ''}"?\n\nBút toán ghi tăng và công nợ mua tài sản (nếu có) sẽ bị xóa theo.\nTài sản đã trích khấu hao thì không xóa được — hãy dùng chức năng Thanh lý.`)) return;
    try {
        const res = await fetch(`${API}/acc/fixed-assets/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Lỗi khi xóa tài sản');
        showToast('Đã xóa tài sản cố định', 'success');
        await loadAssets();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ---------- Thẻ tài sản ----------
let assetDetailData = null;

async function openAssetDetail(id) {
    try {
        const res = await fetch(`${API}/acc/fixed-assets/${id}`);
        const a = await res.json();
        if (!res.ok) throw new Error(a.error);
        assetDetailData = a;
        const st = AS_TRANG_THAI[a.trangThai] || AS_TRANG_THAI.dang_su_dung;
        const pct = a.nguyenGia ? Math.min(100, a.haoMonLuyKe / a.nguyenGia * 100) : 0;
        document.getElementById('asd-title').textContent = `${a.maTS} · ${a.tenTaiSan}`;
        document.getElementById('asd-sub').innerHTML = `<span class="badge ${st.cls}">${st.label}</span> · ${escHtml(a.nhomLabel)} · ${escHtml(BO_PHAN[a.boPhan] || '')}${a.viTri ? ' — ' + escHtml(a.viTri) : ''}`;
        const info = (k, v) => v ? `<div class="col-md-4 col-6"><div class="small text-muted">${k}</div><div class="fw-semibold">${v}</div></div>` : '';
        const kpi = (k, v, cls = '') => `<div class="col-6 col-md-3"><div class="border rounded-3 p-2 text-center"><div class="small text-muted">${k}</div><div class="fw-bold fs-5 ${cls}">${v}</div></div></div>`;
        const tlInfo = a.trangThai === 'thanh_ly' ? `<div class="alert alert-dark small py-2"><b>Đã thanh lý ngày ${new Date(a.thanhLy.ngay).toLocaleDateString('vi-VN')}</b> · Giá trị còn lại ${formatPrice(a.thanhLy.giaTriConLai)} · Thu ${formatPrice(a.thanhLy.giaBan)} · Chi phí ${formatPrice(a.thanhLy.chiPhi)} · <b>${a.thanhLy.giaBan - a.thanhLy.chiPhi - a.thanhLy.giaTriConLai >= 0 ? 'Lãi' : 'Lỗ'} ${formatPrice(Math.abs(a.thanhLy.giaBan - a.thanhLy.chiPhi - a.thanhLy.giaTriConLai))}</b>${a.thanhLy.lyDo ? ' · ' + escHtml(a.thanhLy.lyDo) : ''}</div>` : '';
        const stLabel = { da_ghi: '<span class="badge bg-success">Đã ghi sổ</span>', chua_trich: '<span class="badge bg-warning text-dark">Chưa trích</span>', ke_hoach: '<span class="badge bg-light text-muted border">Kế hoạch</span>' };
        document.getElementById('asd-body').innerHTML = `
            ${tlInfo}
            <div class="row g-2 mb-3">
                ${kpi('Nguyên giá', formatPrice(a.nguyenGia))}${kpi('Hao mòn lũy kế', formatPrice(a.haoMonLuyKe), 'text-danger')}
                ${kpi('Giá trị còn lại', formatPrice(a.giaTriConLai), 'text-primary')}${kpi('Đã khấu hao', pct.toFixed(1) + '%')}
            </div>
            <div class="row g-2 mb-3 border rounded-3 p-2 mx-0">
                ${info('Ngày đưa vào sử dụng', new Date(a.ngayMua).toLocaleDateString('vi-VN'))}
                ${info('Thời gian khấu hao', `${a.thoiGianKhauHaoThang} tháng (đến ${fmtThang(a.thangKetThuc)})`)}
                ${info('Mức khấu hao tháng', formatPrice(a.mucKhauHaoThang) + ` · Nợ ${a.tkChiPhi || '642'}`)}
                ${info('Nguồn hình thành', NGUON_TS[a.nguonHinhThanh])}
                ${info('Nhà cung cấp', escHtml(a.nhaCungCap))}${info('Số hóa đơn', escHtml(a.soChungTu))}
                ${info('Nhãn hiệu / model', escHtml(a.nhanHieu))}${info('Số seri', escHtml(a.soSeri))}${info('Nước sản xuất', escHtml(a.nuocSanXuat))}
                ${info('Bảo hành đến', a.baoHanhDen ? new Date(a.baoHanhDen).toLocaleDateString('vi-VN') + (new Date(a.baoHanhDen) < new Date() ? ' <span class="badge bg-secondary">hết hạn</span>' : ' <span class="badge bg-success">còn hạn</span>') : '')}
                ${info('Công nợ mua tài sản', a.congNo ? `${formatPrice(a.congNo.amount - (a.congNo.paidAmount || 0))} còn nợ` : '')}
                ${info('Ghi chú', escHtml(a.ghiChu))}
            </div>
            <div class="small fw-bold text-uppercase text-muted mb-1">Lịch khấu hao</div>
            <div class="table-responsive" style="max-height: 340px">
                <table class="table table-sm align-middle">
                    <thead class="table-light sticky-top"><tr><th>Tháng</th><th class="text-end">Khấu hao</th><th class="text-end">Hao mòn lũy kế</th><th class="text-end">Giá trị còn lại</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                        ${a.truocTheoDoi > 0 ? `<tr class="table-light"><td class="fst-italic">Hao mòn trước khi theo dõi</td><td></td><td class="text-end">${formatPrice(a.truocTheoDoi)}</td><td class="text-end">${formatPrice(a.nguyenGia - a.truocTheoDoi)}</td><td></td></tr>` : ''}
                        ${a.lich.map(r => `<tr class="${r.trangThai === 'ke_hoach' ? 'text-muted' : ''}"><td>${fmtThang(r.thang)}</td><td class="text-end">${formatPrice(r.soTien)}</td><td class="text-end">${formatPrice(r.luyKe)}</td><td class="text-end">${formatPrice(r.conLai)}</td><td>${stLabel[r.trangThai]}</td></tr>`).join('') || '<tr><td colspan="5" class="text-center text-muted">Không có lịch khấu hao</td></tr>'}
                    </tbody>
                </table>
            </div>
            <div class="small fw-bold text-uppercase text-muted mt-3 mb-1">Bút toán liên quan (${a.butToan.length})</div>
            <div class="table-responsive" style="max-height: 220px">
                <table class="table table-sm small align-middle mb-0">
                    <thead class="table-light"><tr><th>Ngày</th><th>Nội dung</th><th class="text-center">Nợ</th><th class="text-center">Có</th><th class="text-end">Số tiền</th></tr></thead>
                    <tbody>${a.butToan.map(e => `<tr><td>${new Date(e.ngayGhi).toLocaleDateString('vi-VN')}</td><td>${escHtml(e.noiDung)}</td><td class="text-center">${e.tkNo?.soHieuTK || ''}</td><td class="text-center">${e.tkCo?.soHieuTK || ''}</td><td class="text-end">${formatPrice(e.soTien)}</td></tr>`).join('')}</tbody>
                </table>
            </div>`;
        const tl = a.trangThai === 'thanh_ly';
        document.getElementById('asd-footer').innerHTML = `
            ${tl ? `<button class="btn btn-outline-danger me-auto" onclick="undoDispose('${a._id}')"><i class="fa-solid fa-rotate-left me-1"></i>Hủy thanh lý</button>`
                 : `<button class="btn btn-outline-dark me-auto" onclick="modalOf('assetDetailModal').hide(); openDisposeModal('${a._id}')"><i class="fa-solid fa-file-circle-xmark me-1"></i>Thanh lý</button>
                    <button class="btn btn-outline-primary" onclick="modalOf('assetDetailModal').hide(); openAssetModal('${a._id}')"><i class="fa-solid fa-pen me-1"></i>Sửa</button>`}
            ${tl ? `<button class="btn btn-outline-secondary" onclick="printDisposal()"><i class="fa-solid fa-print me-1"></i>In biên bản thanh lý</button>` : ''}
            <button class="btn btn-danger" onclick="printAssetCard()"><i class="fa-solid fa-print me-1"></i>In thẻ TSCĐ</button>`;
        modalOf('assetDetailModal').show();
    } catch (err) {
        showToast(err.message || 'Không tải được tài sản', 'danger');
    }
}

function printAssetCard() {
    const a = assetDetailData;
    if (!a) return;
    const n = v => Number(v || 0).toLocaleString('vi-VN');
    const d = new Date(a.ngayMua);
    const byYear = {};
    for (const r of a.lich.filter(x => x.trangThai === 'da_ghi')) {
        const y = r.thang.slice(0, 4);
        byYear[y] = byYear[y] || { soTien: 0, luyKe: 0 };
        byYear[y].soTien += r.soTien; byYear[y].luyKe = r.luyKe;
    }
    openPrintWindow(`Thẻ TSCĐ ${a.maTS}`, `
        <div class="top"><div><b>Đơn vị: NOMNOMFOOD</b><br>Bộ phận: ${escHtml(BO_PHAN[a.boPhan] || '')}</div>
        <div class="right"><i>(Theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div></div>
        <h1>THẺ TÀI SẢN CỐ ĐỊNH</h1>
        <p class="c">Số: <b>${escHtml(a.maTS)}</b> &nbsp; Ngày lập thẻ: ${new Date().toLocaleDateString('vi-VN')}</p>
        <p>Căn cứ vào biên bản giao nhận TSCĐ ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}${a.soChungTu ? ', hóa đơn số ' + escHtml(a.soChungTu) : ''}</p>
        <p>Tên, ký mã hiệu, quy cách TSCĐ: <b>${escHtml(a.tenTaiSan)}</b>${a.nhanHieu ? ' — ' + escHtml(a.nhanHieu) : ''} &nbsp; Số hiệu TSCĐ: <b>${escHtml(a.soSeri || a.maTS)}</b></p>
        <p>Nước sản xuất: ${escHtml(a.nuocSanXuat || '........')} &nbsp; Nhóm: ${escHtml(a.nhomLabel)} &nbsp; Bộ phận quản lý, sử dụng: ${escHtml(BO_PHAN[a.boPhan] || '')}${a.viTri ? ' (' + escHtml(a.viTri) + ')' : ''}</p>
        <p>Năm đưa vào sử dụng: <b>${d.getFullYear()}</b> &nbsp; Thời gian khấu hao: <b>${a.thoiGianKhauHaoThang} tháng</b> &nbsp; Mức khấu hao tháng: <b>${n(a.mucKhauHaoThang)} đồng</b></p>
        ${a.trangThai === 'thanh_ly' ? `<p>Đình chỉ sử dụng TSCĐ ngày ${new Date(a.thanhLy.ngay).toLocaleDateString('vi-VN')} &nbsp; Lý do: ${escHtml(a.thanhLy.lyDo || 'Thanh lý')}</p>` : ''}
        <table><thead><tr><th colspan="3">Nguyên giá tài sản cố định</th><th colspan="3">Giá trị hao mòn tài sản cố định</th></tr>
        <tr><th>Số hiệu chứng từ</th><th>Ngày</th><th>Nguyên giá</th><th>Năm</th><th>Giá trị hao mòn</th><th>Cộng dồn</th></tr></thead>
        <tbody>${(Object.keys(byYear).length ? Object.entries(byYear) : [['', { soTien: 0, luyKe: 0 }]]).map(([y, v], i) => `<tr><td>${i === 0 ? escHtml(a.soChungTu || a.maTS) : ''}</td><td>${i === 0 ? d.toLocaleDateString('vi-VN') : ''}</td><td class="num">${i === 0 ? n(a.nguyenGia) : ''}</td><td class="c">${y}</td><td class="num">${y ? n(v.soTien) : ''}</td><td class="num">${y ? n(v.luyKe) : ''}</td></tr>`).join('')}</tbody></table>
        <p>Hao mòn trước khi theo dõi trên phần mềm: ${n(a.truocTheoDoi)} đồng &nbsp; Hao mòn lũy kế: <b>${n(a.haoMonLuyKe)}</b> đồng &nbsp; Giá trị còn lại: <b>${n(a.giaTriConLai)}</b> đồng</p>
        <div class="sign3"><div><b>Người lập thẻ</b><br><i>(Ký, họ tên)</i></div><div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div><div><b>Giám đốc</b><br><i>(Ký, họ tên, đóng dấu)</i></div></div>`);
}

function printDisposal() {
    const a = assetDetailData;
    if (!a?.thanhLy) return;
    const t = a.thanhLy, d = new Date(t.ngay), n = v => Number(v || 0).toLocaleString('vi-VN');
    openPrintWindow(`Biên bản thanh lý ${a.maTS}`, `
        <div class="top"><div><b>Đơn vị: NOMNOMFOOD</b></div>
        <div class="right"><b>Mẫu số 02 - TSCĐ</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div></div>
        <h1>BIÊN BẢN THANH LÝ TSCĐ</h1>
        <p class="c"><i>Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</i></p>
        <p><b>I. Tiến hành thanh lý TSCĐ</b></p>
        <p>- Tên, ký mã hiệu, quy cách TSCĐ: <b>${escHtml(a.tenTaiSan)}</b>${a.nhanHieu ? ' — ' + escHtml(a.nhanHieu) : ''}</p>
        <p>- Số hiệu TSCĐ: ${escHtml(a.maTS)}${a.soSeri ? ' / Seri ' + escHtml(a.soSeri) : ''} &nbsp; Nước sản xuất: ${escHtml(a.nuocSanXuat || '........')}</p>
        <p>- Năm đưa vào sử dụng: ${new Date(a.ngayMua).getFullYear()}</p>
        <p>- Nguyên giá TSCĐ: <b>${n(t.nguyenGia)}</b> đồng</p>
        <p>- Giá trị hao mòn đã trích đến thời điểm thanh lý: <b>${n(t.haoMon)}</b> đồng</p>
        <p>- Giá trị còn lại của TSCĐ: <b>${n(t.giaTriConLai)}</b> đồng</p>
        <p><b>II. Kết luận của Ban thanh lý TSCĐ</b></p>
        <p>${escHtml(t.lyDo || '...............................................................')}</p>
        <p><b>III. Kết quả thanh lý TSCĐ</b></p>
        <p>- Chi phí thanh lý TSCĐ: <b>${n(t.chiPhi)}</b> đồng (viết bằng chữ: ${t.chiPhi ? soThanhChu(t.chiPhi) : 'Không đồng'})</p>
        <p>- Giá trị thu hồi: <b>${n(t.giaBan)}</b> đồng (viết bằng chữ: ${t.giaBan ? soThanhChu(t.giaBan) : 'Không đồng'})</p>
        <p>- Đã ghi giảm sổ TSCĐ ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</p>
        <div class="sign3"><div><b>Trưởng ban thanh lý</b><br><i>(Ký, họ tên)</i></div><div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div><div><b>Giám đốc</b><br><i>(Ký, họ tên, đóng dấu)</i></div></div>`);
}

// ---------- Thanh lý ----------
function openDisposeModal(id) {
    const a = allAssets.find(x => x._id === id);
    if (!a) return;
    document.getElementById('tl-id').value = id;
    document.getElementById('tl-ngay').value = pnlDateStr(new Date());
    document.getElementById('tl-giaban').value = 0;
    document.getElementById('tl-chiphi').value = 0;
    document.getElementById('tl-lydo').value = '';
    document.getElementById('tl-info').innerHTML = `<b>${escHtml(a.maTS)} · ${escHtml(a.tenTaiSan)}</b><br>Nguyên giá ${formatPrice(a.nguyenGia)} · Hao mòn ${formatPrice(a.haoMonLuyKe)} · <b>Giá trị còn lại ${formatPrice(a.giaTriConLai)}</b>
        ${!a.daGhiThangNay && a.khauHaoThangNay > 0 ? '<div class="text-warning-emphasis mt-1"><i class="fa-solid fa-triangle-exclamation me-1"></i>Tháng này chưa trích khấu hao — nên trích trước khi thanh lý.</div>' : ''}`;
    updateDisposePreview();
    modalOf('assetDisposeModal').show();
}

function updateDisposePreview() {
    const a = allAssets.find(x => x._id === document.getElementById('tl-id').value);
    if (!a) return;
    const gb = Number(document.getElementById('tl-giaban').value) || 0, cp = Number(document.getElementById('tl-chiphi').value) || 0;
    const tien = document.getElementById('tl-hinhthuc').value;
    const kq = gb - cp - a.giaTriConLai;
    const line = (no, co, v, t) => v > 0 ? `<tr><td>${t}</td><td class="text-center">${no}</td><td class="text-center">${co}</td><td class="text-end">${formatPrice(v)}</td></tr>` : '';
    document.getElementById('tl-preview').innerHTML = `
        <table class="table table-sm mb-1"><thead class="table-light"><tr><th>Bút toán</th><th class="text-center">Nợ</th><th class="text-center">Có</th><th class="text-end">Số tiền</th></tr></thead><tbody>
        ${line('214', '211', a.haoMonLuyKe, 'Giảm hao mòn lũy kế')}${line('811', '211', a.giaTriConLai, 'Giá trị còn lại vào chi phí khác')}
        ${line(tien, '711', gb, 'Thu tiền bán thanh lý')}${line('811', tien, cp, 'Chi phí thanh lý')}</tbody></table>
        <div class="fw-bold ${kq >= 0 ? 'text-success' : 'text-danger'}">Kết quả thanh lý: ${kq >= 0 ? 'Lãi' : 'Lỗ'} ${formatPrice(Math.abs(kq))}</div>`;
}

async function saveDispose() {
    const id = document.getElementById('tl-id').value;
    const a = allAssets.find(x => x._id === id);
    if (!confirm(`Thanh lý tài sản ${a?.maTS} "${a?.tenTaiSan}"?\nTài sản sẽ được ghi giảm và ngừng trích khấu hao.`)) return;
    const ngay = document.getElementById('tl-ngay').value;
    try {
        const res = await fetch(`${API}/acc/fixed-assets/${id}/dispose`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ngay: `${ngay}T${new Date().toTimeString().slice(0, 8)}`, giaBan: Number(document.getElementById('tl-giaban').value) || 0,
                chiPhi: Number(document.getElementById('tl-chiphi').value) || 0, hinhThuc: document.getElementById('tl-hinhthuc').value,
                lyDo: document.getElementById('tl-lydo').value.trim(),
            }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Thanh lý thất bại');
        showToast(`Đã thanh lý tài sản ${json.maTS}`, 'success');
        modalOf('assetDisposeModal').hide();
        await loadAssets();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function undoDispose(id) {
    if (!confirm('Hủy thanh lý? Các bút toán thanh lý sẽ bị xóa và tài sản trở lại sổ.')) return;
    try {
        const res = await fetch(`${API}/acc/fixed-assets/${id}/dispose`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Không hủy được');
        showToast('Đã hủy thanh lý', 'success');
        modalOf('assetDetailModal').hide();
        await loadAssets();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// ==================== Kế toán: Khấu hao ====================
let depPreview = null;

async function loadDepreciation() {
    loadDepreciationHistory();
    if (!currentAccPeriod) { document.getElementById('depreciation-table-body').innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">Vui lòng chọn kỳ kế toán</td></tr>'; return; }
    try {
        const res = await fetch(`${API}/acc/depreciation/preview?period=${currentAccPeriod}`);
        depPreview = await res.json();
        if (!res.ok) throw new Error(depPreview.error);
        renderDepreciation();
    } catch (err) {
        showToast(err.message || 'Không tải được dữ liệu khấu hao', 'danger');
    }
}

function renderDepreciation() {
    const { period, rows, daGhi, tong } = depPreview;
    document.getElementById('dep-period-name').textContent = period.tenKy;
    const canRun = rows.some(r => !r.daGhi && r.soTien > 0);
    document.getElementById('dep-run-btn').classList.toggle('d-none', !canRun);
    document.getElementById('dep-cancel-btn').classList.toggle('d-none', !daGhi);
    document.getElementById('dep-status').innerHTML = daGhi
        ? `<span class="badge bg-success"><i class="fa-solid fa-circle-check me-1"></i>Đã trích và ghi sổ</span>${canRun ? ' <span class="badge bg-warning text-dark">Còn tài sản chưa trích</span>' : ''}`
        : (canRun ? `<span class="badge bg-warning text-dark"><i class="fa-solid fa-clock me-1"></i>Dự kiến — chưa ghi sổ</span>` : '<span class="badge bg-light text-muted border">Không có tài sản cần trích</span>');
    const tbody = document.getElementById('depreciation-table-body');
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">Chưa có tài sản cố định</td></tr>'; document.getElementById('depreciation-table-foot').innerHTML = ''; return; }
    tbody.innerHTML = rows.map(r => `
        <tr role="button" onclick="openAssetDetail('${r._id}')" class="${r.soTien ? '' : 'text-muted'}">
            <td class="font-monospace small">${escHtml(r.maTS)}</td>
            <td>${escHtml(r.tenTaiSan)}${r.lyDo ? `<div class="small fst-italic">${escHtml(r.lyDo)}</div>` : ''}</td>
            <td class="small">${escHtml(BO_PHAN[r.boPhan] || '')}</td>
            <td class="text-center">${r.tkChiPhi}</td>
            <td class="text-end">${formatPrice(r.nguyenGia)}</td>
            <td class="text-end">${formatPrice(r.haoMonDauKy)}</td>
            <td class="text-end fw-bold ${r.daGhi ? 'text-success' : ''}">${r.soTien ? formatPrice(r.soTien) : '—'}${r.daGhi ? ' <i class="fa-solid fa-check"></i>' : ''}</td>
            <td class="text-end">${formatPrice(r.haoMonCuoiKy)}</td>
            <td class="text-end">${formatPrice(r.giaTriConLai)}</td>
        </tr>`).join('');
    const s = k => rows.reduce((t, r) => t + r[k], 0);
    const byTk = rows.reduce((m, r) => { if (r.soTien) m[r.tkChiPhi] = (m[r.tkChiPhi] || 0) + r.soTien; return m; }, {});
    document.getElementById('depreciation-table-foot').innerHTML = `
        <tr class="fw-bold"><td colspan="4" class="text-end">Cộng</td><td class="text-end">${formatPrice(s('nguyenGia'))}</td><td class="text-end">${formatPrice(s('haoMonDauKy'))}</td>
        <td class="text-end text-danger">${formatPrice(tong)}</td><td class="text-end">${formatPrice(s('haoMonCuoiKy'))}</td><td class="text-end">${formatPrice(s('giaTriConLai'))}</td></tr>
        <tr><td colspan="9" class="small text-muted text-end">Phân bổ: ${Object.entries(byTk).map(([tk, v]) => `Nợ ${tk}: ${formatPrice(v)}`).join(' · ') || '—'} / Có 214</td></tr>`;
}

async function loadDepreciationHistory() {
    try {
        const list = await fetch(`${API}/acc/depreciation/history`).then(r => r.json());
        document.getElementById('dep-history-body').innerHTML = list.map(h => `
            <tr role="button" onclick="selectAccPeriodById('${h._id}')" class="${h._id === currentAccPeriod ? 'table-active' : ''}">
                <td class="fw-semibold">${escHtml(h.tenKy)}</td><td class="text-center">${h.soTaiSan}</td>
                <td class="text-end">${formatPrice(h.tong)}</td><td>${new Date(h.ngay).toLocaleDateString('vi-VN')}</td>
            </tr>`).join('') || '<tr><td colspan="4" class="text-center text-muted py-3">Chưa trích khấu hao kỳ nào</td></tr>';
    } catch { /* bảng lịch sử không bắt buộc */ }
}

function selectAccPeriodById(id) {
    const sel = document.getElementById('acc-period-select');
    if (![...sel.options].some(o => o.value === id)) return;
    sel.value = id;
    onAccPeriodChange();
}

async function runDepreciation() {
    const rows = depPreview.rows.filter(r => !r.daGhi && r.soTien > 0);
    const tong = rows.reduce((s, r) => s + r.soTien, 0);
    if (!confirm(`Trích khấu hao ${depPreview.period.tenKy} cho ${rows.length} tài sản, tổng ${formatPrice(tong)}?`)) return;
    try {
        const res = await fetch(`${API}/acc/depreciation/run`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period: currentAccPeriod }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Trích khấu hao thất bại');
        showToast(`Đã trích khấu hao ${result.posted} tài sản: ${formatPrice(result.tong)}`, 'success');
        await loadDepreciation();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function cancelDepreciation() {
    if (!confirm(`Hủy toàn bộ khấu hao đã trích của ${depPreview.period.tenKy}?\nCác bút toán khấu hao kỳ này sẽ bị xóa.`)) return;
    try {
        const res = await fetch(`${API}/acc/depreciation/period/${currentAccPeriod}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Không hủy được');
        showToast(`Đã hủy khấu hao của ${result.removed} tài sản`, 'success');
        await loadDepreciation();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function printDepreciation() {
    if (!depPreview) return;
    const { period, rows, tong } = depPreview;
    const n = v => Number(v || 0).toLocaleString('vi-VN');
    const list = rows.filter(r => r.soTien > 0);
    const byBp = {};
    list.forEach(r => { const k = `${r.tkChiPhi}|${r.boPhan}`; byBp[k] = (byBp[k] || 0) + r.soTien; });
    openPrintWindow(`Bảng tính khấu hao ${period.tenKy}`, `
        <div class="top"><div><b>Đơn vị: NOMNOMFOOD</b></div>
        <div class="right"><b>Mẫu số 06 - TSCĐ</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div></div>
        <h1>BẢNG TÍNH VÀ PHÂN BỔ KHẤU HAO TSCĐ</h1>
        <p class="c"><i>${escHtml(period.tenKy)}</i></p>
        <table><thead><tr><th>STT</th><th>Mã TS</th><th>Tên tài sản</th><th>Bộ phận sử dụng</th><th>Nguyên giá</th><th>Thời gian KH (tháng)</th><th>Hao mòn đầu kỳ</th><th>Khấu hao trong kỳ</th><th>Hao mòn cuối kỳ</th><th>Giá trị còn lại</th></tr></thead>
        <tbody>${list.map((r, i) => {
            const a = allAssets.find(x => x._id === r._id);
            return `<tr><td class="c">${i + 1}</td><td>${escHtml(r.maTS)}</td><td>${escHtml(r.tenTaiSan)}</td><td>${escHtml(BO_PHAN[r.boPhan] || '')}</td><td class="num">${n(r.nguyenGia)}</td><td class="c">${a?.thoiGianKhauHaoThang || ''}</td><td class="num">${n(r.haoMonDauKy)}</td><td class="num">${n(r.soTien)}</td><td class="num">${n(r.haoMonCuoiKy)}</td><td class="num">${n(r.giaTriConLai)}</td></tr>`;
        }).join('')}
        <tr><td></td><td></td><td><b>Cộng</b></td><td></td><td class="num"><b>${n(list.reduce((s, r) => s + r.nguyenGia, 0))}</b></td><td></td><td class="num"><b>${n(list.reduce((s, r) => s + r.haoMonDauKy, 0))}</b></td><td class="num"><b>${n(tong)}</b></td><td class="num"><b>${n(list.reduce((s, r) => s + r.haoMonCuoiKy, 0))}</b></td><td class="num"><b>${n(list.reduce((s, r) => s + r.giaTriConLai, 0))}</b></td></tr></tbody></table>
        <p><b>Phân bổ chi phí khấu hao:</b></p>
        <table style="width: 60%"><thead><tr><th>TK ghi Nợ</th><th>Bộ phận</th><th>Số tiền</th></tr></thead>
        <tbody>${Object.entries(byBp).map(([k, v]) => { const [tk, bp] = k.split('|'); return `<tr><td class="c">${tk}</td><td>${escHtml(BO_PHAN[bp] || '')}</td><td class="num">${n(v)}</td></tr>`; }).join('')}
        <tr><td class="c"><b>Có 214</b></td><td><b>Tổng cộng</b></td><td class="num"><b>${n(tong)}</b></td></tr></tbody></table>
        <div class="sign3"><div><b>Người lập bảng</b><br><i>(Ký, họ tên)</i></div><div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div><div><b>Giám đốc</b><br><i>(Ký, họ tên, đóng dấu)</i></div></div>`, true);
}

// ==================== Kế toán: Nhân sự ====================
const BO_PHAN_NV = { bep: 'Bếp', bar: 'Quầy bar', phuc_vu: 'Phục vụ', thu_ngan: 'Thu ngân', giao_hang: 'Giao hàng', quan_ly: 'Quản lý' };
const HOP_DONG = { chinh_thuc: { label: 'Chính thức', cls: 'bg-success' }, thu_viec: { label: 'Thử việc', cls: 'bg-info text-dark' }, thoi_vu: { label: 'Thời vụ / part-time', cls: 'bg-warning text-dark' } };
let hrMeta = null;

async function ensureHrMeta() {
    if (!hrMeta) hrMeta = await fetch(`${API}/acc/employees/meta`).then(r => r.json());
    return hrMeta;
}

function seniority(d) {
    if (!d) return '';
    const m = Math.max(0, Math.floor((Date.now() - new Date(d)) / (30.44 * 864e5)));
    if (m < 1) return 'dưới 1 tháng';
    return m >= 12 ? `${Math.floor(m / 12)} năm ${m % 12 ? (m % 12) + ' tháng' : ''}` : `${m} tháng`;
}

// ---------- Nhân viên ----------
async function loadEmployees() {
    try {
        await ensureHrMeta();
        const res = await fetch(`${API}/acc/employees`);
        allEmployees = await res.json();
        if (!res.ok) throw new Error();
        const bp = document.getElementById('emp-filter-bp');
        if (bp && !bp.options.length) {
            bp.innerHTML = '<option value="">Tất cả bộ phận</option>' + Object.entries(BO_PHAN_NV).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
            document.getElementById('emp-filter-hd').innerHTML = '<option value="">Tất cả hợp đồng</option>' + Object.entries(HOP_DONG).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
        }
        renderEmployees();
    } catch {
        showToast('Không tải được danh sách nhân viên', 'danger');
    }
}

function renderEmployees() {
    const active = allEmployees.filter(e => e.dangLamViec);
    const byDept = {};
    active.forEach(e => byDept[e.boPhan] = (byDept[e.boPhan] || 0) + 1);
    document.getElementById('emp-kpi-count').textContent = active.length;
    document.getElementById('emp-kpi-dept').textContent = Object.entries(byDept).map(([k, n]) => `${BO_PHAN_NV[k] || k} ${n}`).join(' · ');
    document.getElementById('emp-kpi-fund').textContent = formatPrice(active.reduce((s, e) => s + (e.hinhThucLuong === 'gio' ? 0 : e.luongCoBan || 0), 0));
    document.getElementById('emp-kpi-bh').textContent = active.filter(e => e.thamGiaBHXH).length;
    document.getElementById('emp-kpi-hd').textContent = Object.entries(HOP_DONG).map(([k, v]) => `${v.label}: ${active.filter(e => e.loaiHopDong === k).length}`).join(' · ');
    document.getElementById('emp-kpi-off').textContent = allEmployees.length - active.length;

    const kw = document.getElementById('emp-search').value.trim().toLowerCase();
    const bp = document.getElementById('emp-filter-bp').value, hd = document.getElementById('emp-filter-hd').value, tt = document.getElementById('emp-filter-tt').value;
    const rows = allEmployees.filter(e => (!kw || `${e.maNV} ${e.hoTen} ${e.sdt || ''}`.toLowerCase().includes(kw))
        && (!bp || e.boPhan === bp) && (!hd || e.loaiHopDong === hd) && (tt === '' || String(+!!e.dangLamViec) === tt));
    const tbody = document.getElementById('employee-table-body');
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">Không có nhân viên phù hợp</td></tr>'; return; }
    tbody.innerHTML = rows.map(e => {
        const hdInfo = HOP_DONG[e.loaiHopDong] || HOP_DONG.chinh_thuc;
        const pc = (e.phuCapTrachNhiem || 0) + (e.phuCapKhac || 0);
        return `
        <tr role="button" onclick="openEmployeeDetail('${e._id}')" class="${e.dangLamViec ? '' : 'text-muted'}">
            <td class="font-monospace small">${escHtml(e.maNV || '')}</td>
            <td><div class="fw-semibold">${escHtml(e.hoTen)}</div><div class="small text-muted">${escHtml(e.sdt || '')}</div></td>
            <td><span class="badge bg-light text-dark border">${BO_PHAN_NV[e.boPhan] || ''}</span><div class="small">${escHtml(e.chucVu)}</div></td>
            <td><span class="badge ${hdInfo.cls}">${hdInfo.label}</span><div class="small text-muted">${e.ngayVaoLam ? 'Vào ' + new Date(e.ngayVaoLam).toLocaleDateString('vi-VN') + ' · ' + seniority(e.ngayVaoLam) : ''}</div></td>
            <td class="text-end">${e.hinhThucLuong === 'gio' ? `${formatPrice(e.luongGio)}<div class="small text-muted">/ giờ</div>` : `${formatPrice(e.luongCoBan)}<div class="small text-muted">/ tháng</div>`}</td>
            <td class="text-end small">${pc ? formatPrice(pc) + '/th' : ''}${e.phuCapAnCa ? `<div class="text-muted">ăn ca ${formatPrice(e.phuCapAnCa)}/ngày</div>` : ''}${!pc && !e.phuCapAnCa ? '—' : ''}</td>
            <td class="text-center">${e.thamGiaBHXH ? '<i class="fa-solid fa-circle-check text-success"></i>' : '<span class="text-muted">—</span>'}</td>
            <td class="text-center">${e.soNgayLamThangNay || 0}</td>
            <td><span class="badge ${e.dangLamViec ? 'bg-success' : 'bg-secondary'}">${e.dangLamViec ? 'Đang làm việc' : 'Đã nghỉ'}</span></td>
            <td class="text-end text-nowrap" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEmployeeModal('${e._id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${e._id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

async function openEmployeeModal(id) {
    await ensureHrMeta();
    const e = id ? allEmployees.find(x => x._id === id) : null;
    const d = v => v ? pnlDateStr(new Date(v)) : '';
    document.getElementById('emp-bophan').innerHTML = Object.entries(BO_PHAN_NV).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    document.getElementById('emp-hopdong').innerHTML = Object.entries(HOP_DONG).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    document.getElementById('emp-bank-list').innerHTML = VIETQR_BANKS.map(b => `<option value="${b.name}"></option>`).join('');
    const set = (fid, v) => document.getElementById(fid).value = v ?? '';
    set('emp-id', e?._id); set('emp-ma', e?.maNV); set('emp-hoten', e?.hoTen); set('emp-gioitinh', e?.gioiTinh); set('emp-ngaysinh', d(e?.ngaySinh));
    set('emp-sdt', e?.sdt); set('emp-email', e?.email); set('emp-cccd', e?.cccd); set('emp-diachi', e?.diaChi);
    set('emp-bophan', e?.boPhan || 'phuc_vu'); set('emp-chucvu', e?.chucVu); set('emp-hopdong', e?.loaiHopDong || 'chinh_thuc');
    set('emp-ngayvao', e ? d(e.ngayVaoLam) : pnlDateStr(new Date())); set('emp-trangthai', e && !e.dangLamViec ? '0' : '1'); set('emp-ngaynghi', d(e?.ngayNghiViec));
    set('emp-hinhthuc', e?.hinhThucLuong || 'thang'); set('emp-luong', e?.luongCoBan || ''); set('emp-luonggio', e?.luongGio || '');
    set('emp-pcanca', e?.phuCapAnCa || 0); set('emp-pctrachnhiem', e?.phuCapTrachNhiem || 0); set('emp-pckhac', e?.phuCapKhac || 0);
    document.getElementById('emp-bhxh').checked = !!e?.thamGiaBHXH;
    set('emp-luongbh', e?.luongDongBH || ''); set('emp-mst', e?.maSoThue); set('emp-npt', e?.soNguoiPhuThuoc || 0);
    set('emp-nganhang', e?.nganHang); set('emp-stk', e?.soTaiKhoan); set('emp-ghichu', e?.ghiChu);
    document.getElementById('employee-modal-title').textContent = e ? `Sửa hồ sơ ${e.maNV} · ${e.hoTen}` : 'Thêm nhân viên';
    updateEmployeeFormHints();
    employeeModalInst.show();
}

function updateEmployeeFormHints() {
    const C = hrMeta.cauHinh;
    const gio = document.getElementById('emp-hinhthuc').value === 'gio';
    document.getElementById('emp-luongthang-wrap').classList.toggle('d-none', gio);
    document.getElementById('emp-luonggio-wrap').classList.toggle('d-none', !gio);
    document.getElementById('emp-ngaynghi-wrap').classList.toggle('d-none', document.getElementById('emp-trangthai').value === '1');
    const luong = Number(document.getElementById('emp-luong').value) || 0;
    document.getElementById('emp-luong-hint').innerHTML = gio
        ? `Lương = đơn giá × số giờ làm; giờ vượt ${C.gioMotCong}h/ngày tính ${C.heSoTangCa * 100}%, ngày lễ ${C.heSoNgayLe * 100}%.`
        : (luong ? `Ngày công chuẩn ${C.ngayCongChuan} → <b>${formatPrice(Math.round(luong / C.ngayCongChuan))}/công</b>, ${formatPrice(Math.round(luong / C.ngayCongChuan / C.gioMotCong))}/giờ; tăng ca ${C.heSoTangCa * 100}%, làm ngày lễ ${C.heSoNgayLe * 100}%.` : '');
    const hd = document.getElementById('emp-hopdong').value;
    const bh = document.getElementById('emp-bhxh').checked;
    document.getElementById('emp-luongbh-wrap').classList.toggle('d-none', !bh);
    const base = Math.min(Number(document.getElementById('emp-luongbh').value) || luong, C.tranDongBH);
    document.getElementById('emp-bh-hint').innerHTML = (bh && hd === 'chinh_thuc' && base
        ? `Trừ lương ${(C.tyLeBhNLD * 100).toFixed(1)}%: <b>${formatPrice(Math.round(base * C.tyLeBhNLD))}</b> · Doanh nghiệp đóng ${(C.tyLeBhDN * 100).toFixed(1)}%: <b>${formatPrice(Math.round(base * C.tyLeBhDN))}</b>/tháng (không đóng tháng làm dưới 14 ngày). `
        : (bh && hd !== 'chinh_thuc' ? 'Bảo hiểm chỉ áp dụng cho hợp đồng chính thức. ' : ''))
        + (hd === 'chinh_thuc' ? `Thuế TNCN lũy tiến, giảm trừ bản thân ${formatPrice(C.giamTruBanThan)}, người phụ thuộc ${formatPrice(C.giamTruPhuThuoc)}/người.`
            : `Thử việc / thời vụ: khấu trừ 10% thuế TNCN khi thu nhập từ ${formatPrice(C.nguongKhauTru10)}.`);
}

async function saveEmployee() {
    const id = document.getElementById('emp-id').value;
    const v = fid => document.getElementById(fid).value.trim();
    const body = {
        maNV: v('emp-ma'), hoTen: v('emp-hoten'), gioiTinh: v('emp-gioitinh'), ngaySinh: v('emp-ngaysinh') || null, sdt: v('emp-sdt'), email: v('emp-email'),
        cccd: v('emp-cccd'), diaChi: v('emp-diachi'), boPhan: v('emp-bophan'), chucVu: v('emp-chucvu'), loaiHopDong: v('emp-hopdong'),
        ngayVaoLam: v('emp-ngayvao') || null, dangLamViec: v('emp-trangthai') === '1', ngayNghiViec: v('emp-trangthai') === '1' ? null : (v('emp-ngaynghi') || pnlDateStr(new Date())),
        hinhThucLuong: v('emp-hinhthuc'), luongCoBan: Number(v('emp-luong')) || 0, luongGio: Number(v('emp-luonggio')) || 0,
        phuCapAnCa: Number(v('emp-pcanca')) || 0, phuCapTrachNhiem: Number(v('emp-pctrachnhiem')) || 0, phuCapKhac: Number(v('emp-pckhac')) || 0,
        thamGiaBHXH: document.getElementById('emp-bhxh').checked, luongDongBH: Number(v('emp-luongbh')) || 0, maSoThue: v('emp-mst'),
        soNguoiPhuThuoc: Number(v('emp-npt')) || 0, nganHang: v('emp-nganhang'), soTaiKhoan: v('emp-stk'), ghiChu: v('emp-ghichu'),
    };
    if (!body.hoTen) { showToast('Vui lòng nhập họ tên', 'warning'); return; }
    if (!body.chucVu) { showToast('Vui lòng nhập chức vụ', 'warning'); return; }
    if (body.hinhThucLuong === 'gio' ? !body.luongGio : !body.luongCoBan) { showToast('Vui lòng nhập mức lương', 'warning'); return; }
    try {
        const res = await fetch(`${API}/acc/employees${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        showToast(id ? 'Đã cập nhật hồ sơ' : `Đã thêm nhân viên ${json.maNV}`, 'success');
        employeeModalInst.hide();
        await loadEmployees();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteEmployee(id) {
    const e = allEmployees.find(x => x._id === id);
    if (!confirm(`Xóa nhân viên ${e?.maNV || ''} ${e?.hoTen || ''}?\nNhân viên đã có chấm công hoặc bảng lương thì không xóa được — hãy chuyển sang "Đã nghỉ việc".`)) return;
    try {
        const res = await fetch(`${API}/acc/employees/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Lỗi khi xóa nhân viên');
        showToast('Đã xóa nhân viên', 'success');
        await loadEmployees();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function openEmployeeDetail(id) {
    try {
        const res = await fetch(`${API}/acc/employees/${id}`);
        const e = await res.json();
        if (!res.ok) throw new Error(e.error);
        const hd = HOP_DONG[e.loaiHopDong] || HOP_DONG.chinh_thuc;
        document.getElementById('empd-title').textContent = `${e.maNV} · ${e.hoTen}`;
        document.getElementById('empd-sub').innerHTML = `<span class="badge ${hd.cls}">${hd.label}</span> · ${BO_PHAN_NV[e.boPhan] || ''} · ${escHtml(e.chucVu)} · <span class="badge ${e.dangLamViec ? 'bg-success' : 'bg-secondary'}">${e.dangLamViec ? 'Đang làm việc' : 'Đã nghỉ ' + (e.ngayNghiViec ? new Date(e.ngayNghiViec).toLocaleDateString('vi-VN') : '')}</span>`;
        const info = (k, v) => v ? `<div class="col-md-4 col-6"><div class="small text-muted">${k}</div><div class="fw-semibold">${v}</div></div>` : '';
        const ST = { nhap: '<span class="badge bg-warning text-dark">Nháp</span>', da_chot: '<span class="badge bg-primary">Đã chốt</span>', da_tra: '<span class="badge bg-success">Đã trả</span>' };
        document.getElementById('empd-body').innerHTML = `
            <div class="row g-2 border rounded-3 p-2 mx-0 mb-3">
                ${info('Giới tính', { nam: 'Nam', nu: 'Nữ' }[e.gioiTinh])}${info('Ngày sinh', e.ngaySinh ? new Date(e.ngaySinh).toLocaleDateString('vi-VN') : '')}
                ${info('Điện thoại', escHtml(e.sdt))}${info('Email', escHtml(e.email))}${info('CCCD', escHtml(e.cccd))}${info('Địa chỉ', escHtml(e.diaChi))}
                ${info('Ngày vào làm', e.ngayVaoLam ? new Date(e.ngayVaoLam).toLocaleDateString('vi-VN') + ' (' + seniority(e.ngayVaoLam) + ')' : '')}
                ${info('Mức lương', e.hinhThucLuong === 'gio' ? formatPrice(e.luongGio) + ' / giờ' : formatPrice(e.luongCoBan) + ' / tháng')}
                ${info('Phụ cấp', [e.phuCapTrachNhiem ? 'Trách nhiệm ' + formatPrice(e.phuCapTrachNhiem) : '', e.phuCapKhac ? 'Khác ' + formatPrice(e.phuCapKhac) : '', e.phuCapAnCa ? 'Ăn ca ' + formatPrice(e.phuCapAnCa) + '/ngày' : ''].filter(Boolean).join('<br>'))}
                ${info('Bảo hiểm', e.thamGiaBHXH ? 'Có tham gia · mức đóng ' + formatPrice(e.luongDongBH || e.luongCoBan) : 'Không tham gia')}
                ${info('Thuế TNCN', `${e.maSoThue ? 'MST ' + escHtml(e.maSoThue) + ' · ' : ''}${e.soNguoiPhuThuoc || 0} người phụ thuộc`)}
                ${info('Tài khoản nhận lương', e.soTaiKhoan ? `${escHtml(e.soTaiKhoan)} — ${escHtml(e.nganHang)}` : '')}
                ${info('Ghi chú', escHtml(e.ghiChu))}
            </div>
            <div class="small fw-bold text-uppercase text-muted mb-1">Lịch sử lương</div>
            <table class="table table-sm align-middle small">
                <thead class="table-light"><tr><th>Kỳ</th><th class="text-end">Công / giờ</th><th class="text-end">Tổng thu nhập</th><th class="text-end">BH</th><th class="text-end">Thuế</th><th class="text-end">Thực lĩnh</th><th>Trạng thái</th></tr></thead>
                <tbody>${e.lichSuLuong.map(r => `<tr><td>${escHtml(r.kyKeToan?.tenKy || '')}</td><td class="text-end">${r.hinhThucLuong === 'gio' ? r.tongGioLam + 'h' : (r.ngayCong || '—') + ' công'}</td>
                    <td class="text-end">${formatPrice(r.tongThuNhap || r.luongThucLinh)}</td><td class="text-end">${formatPrice(r.bhNLD || 0)}</td><td class="text-end">${formatPrice(r.thueTNCN || 0)}</td>
                    <td class="text-end fw-semibold">${formatPrice(r.luongThucLinh)}</td><td>${ST[r.trangThai] || ''}</td></tr>`).join('') || '<tr><td colspan="7" class="text-center text-muted">Chưa có bảng lương</td></tr>'}</tbody>
            </table>`;
        document.getElementById('empd-footer').innerHTML = `<button class="btn btn-outline-primary" onclick="modalOf('employeeDetailModal').hide(); openEmployeeModal('${e._id}')"><i class="fa-solid fa-pen me-1"></i>Sửa hồ sơ</button>`;
        modalOf('employeeDetailModal').show();
    } catch (err) {
        showToast(err.message || 'Không tải được hồ sơ', 'danger');
    }
}

// ---------- Bảng chấm công ----------
let tsData = null;
const TS_LEAVE = { phep: { code: 'P', cls: 'bg-info-subtle text-info-emphasis', ten: 'Nghỉ phép' }, nghi_le: { code: 'L', cls: 'bg-primary-subtle text-primary-emphasis', ten: 'Nghỉ lễ' }, khong_luong: { code: 'KL', cls: 'bg-secondary-subtle text-secondary-emphasis', ten: 'Nghỉ không lương' } };
const TS_COLORS = { S: '#fff3cd', C: '#d1e7dd', G: '#f8d7da', HC: '#e2e3e5', T: '#cfe2ff', tu_chon: '#f3e8ff' };

function shiftHours(s) {
    if (s.loai !== 'lam' || !s.gioBatDau || !s.gioKetThuc) return 0;
    const m = t => { const [h, mi] = t.split(':').map(Number); return h * 60 + mi; };
    let d = m(s.gioKetThuc) - m(s.gioBatDau);
    if (d <= 0) d += 1440;
    return Math.max(0, (d - (Number(s.nghiGiua) || 0)) / 60);
}

async function loadShifts() {
    await ensureHrMeta();
    const el = document.getElementById('ts-thang');
    if (!el.value) el.value = pnlDateStr(new Date()).slice(0, 7);
    const bp = document.getElementById('ts-filter-bp');
    if (!bp.options.length) bp.innerHTML = '<option value="">Tất cả bộ phận</option>' + Object.entries(BO_PHAN_NV).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    try {
        const res = await fetch(`${API}/acc/timesheet?thang=${el.value}`);
        tsData = await res.json();
        if (!res.ok) throw new Error(tsData.error);
        renderTimesheet();
    } catch (err) {
        showToast(err.message || 'Không tải được bảng chấm công', 'danger');
    }
}

function tsSummary(list) {
    const byDay = {};
    let le = 0, phep = 0;
    list.forEach(s => {
        if (s.loai === 'phep' || s.loai === 'nghi_le') { phep++; return; }
        if (s.loai !== 'lam') return;
        if (s.ngayLe) { le += s.gio; return; }
        byDay[s.ngay] = (byDay[s.ngay] || 0) + s.gio;
    });
    let cong = 0, gio = le, ot = 0;
    Object.values(byDay).forEach(h => { cong += Math.min(1, h / 8); gio += h; ot += Math.max(0, h - 8); });
    return { cong: Math.round((cong + phep) * 100) / 100, gio: Math.round(gio * 10) / 10, ot: Math.round(ot * 10) / 10, le: Math.round(le * 10) / 10, phep };
}

function renderTimesheet() {
    const { thang, employees, shifts, khoa, caMau } = tsData;
    const [y, m] = thang.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const today = pnlDateStr(new Date());
    const bp = document.getElementById('ts-filter-bp').value;
    const emps = employees.filter(e => !bp || e.boPhan === bp);
    document.getElementById('ts-legend').innerHTML = Object.entries(caMau).map(([k, c]) => `<span class="px-2 py-1 rounded border" style="background:${TS_COLORS[k]}"><b>${k}</b> ${c.ten} ${c.gioBatDau}–${c.gioKetThuc}</span>`).join('')
        + Object.values(TS_LEAVE).map(l => `<span class="px-2 py-1 rounded border ${l.cls}"><b>${l.code}</b> ${l.ten}</span>`).join('')
        + '<span class="px-2 py-1 rounded border border-danger"><b class="text-danger">★</b> Làm ngày lễ</span>';
    const dow = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    let head = '<tr><th class="bg-light" style="position:sticky;left:0;z-index:3;min-width:170px">Nhân viên</th>';
    for (let d = 1; d <= days; d++) {
        const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        const key = `${thang}-${String(d).padStart(2, '0')}`;
        head += `<th class="text-center p-1 ${wd === 0 ? 'text-danger' : ''} ${key === today ? 'table-warning' : ''}" style="min-width:34px">${d}<div class="fw-normal" style="font-size:.65rem">${dow[wd]}</div></th>`;
    }
    head += '<th class="text-center">Công</th><th class="text-center">Giờ</th><th class="text-center">TC</th><th class="text-center">P/L</th></tr>';
    document.getElementById('ts-head').innerHTML = head;
    const byEmp = {};
    shifts.forEach(s => (byEmp[s.nhanVien] = byEmp[s.nhanVien] || []).push(s));
    document.getElementById('ts-body').innerHTML = emps.map(e => {
        const list = byEmp[e._id] || [];
        const locked = khoa.includes(String(e._id));
        let row = `<tr><td class="bg-white" style="position:sticky;left:0;z-index:2"><div class="fw-semibold">${locked ? '<i class="fa-solid fa-lock text-secondary me-1" title="Bảng lương đã chốt"></i>' : ''}${escHtml(e.hoTen)}</div><div class="text-muted" style="font-size:.7rem">${escHtml(e.maNV || '')} · ${escHtml(e.chucVu)}</div></td>`;
        for (let d = 1; d <= days; d++) {
            const key = `${thang}-${String(d).padStart(2, '0')}`;
            const cell = list.filter(s => s.ngay === key);
            let html = '', style = '', cls = '';
            if (cell.length) {
                const leave = cell.find(s => s.loai !== 'lam');
                if (leave) { html = TS_LEAVE[leave.loai].code; cls = TS_LEAVE[leave.loai].cls; }
                else {
                    html = cell.map(s => s.ca === 'tu_chon' ? `${s.gio}h` : s.ca).join('+') + (cell.some(s => s.ngayLe) ? '<span class="text-danger">★</span>' : '');
                    style = `background:${TS_COLORS[cell[0].ca] || TS_COLORS.tu_chon}`;
                }
            }
            const tip = cell.map(s => s.loai === 'lam' ? `${s.gioBatDau}–${s.gioKetThuc} (${s.gio}h)${s.ghiChu ? ' ' + s.ghiChu : ''}` : TS_LEAVE[s.loai].ten).join(' | ');
            row += `<td class="text-center p-1 fw-semibold ${cls}" style="${style};${locked ? '' : 'cursor:pointer'}" title="${escHtml(tip)}" ${locked ? '' : `onclick="openShiftModal('${e._id}', '${key}')"`}>${html}</td>`;
        }
        const sum = tsSummary(list);
        row += `<td class="text-center fw-bold">${e.hinhThucLuong === 'gio' ? '—' : sum.cong}</td><td class="text-center">${sum.gio}</td><td class="text-center ${sum.ot ? 'text-danger fw-semibold' : ''}">${sum.ot || ''}</td><td class="text-center">${sum.phep || ''}</td></tr>`;
        return row;
    }).join('') || `<tr><td colspan="${days + 5}" class="text-center text-muted py-3">Không có nhân viên</td></tr>`;
}

let shiftCtx = null;

function openShiftModal(nhanVien, ngay) {
    if (!nhanVien) { showToast('Bấm vào ô của nhân viên trong bảng chấm công để chấm công', 'info'); return; }
    const e = tsData.employees.find(x => x._id === nhanVien);
    shiftCtx = { nhanVien, ngay };
    document.getElementById('sh-title').textContent = `Chấm công: ${e?.hoTen || ''}`;
    document.getElementById('sh-sub').textContent = new Date(`${ngay}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById('sh-ca').innerHTML = Object.entries(tsData.caMau).map(([k, c]) => `<option value="${k}">${k} — ${c.ten} (${c.gioBatDau}–${c.gioKetThuc})</option>`).join('') + '<option value="tu_chon">Tự chọn giờ</option>';
    renderShiftCell();
    resetShiftForm();
    shiftModalInst.show();
}

function renderShiftCell() {
    const list = tsData.shifts.filter(s => s.nhanVien === shiftCtx.nhanVien && s.ngay === shiftCtx.ngay);
    document.getElementById('sh-existing').innerHTML = list.length ? `<div class="small fw-bold text-uppercase text-muted mb-1">Đã chấm</div>` + list.map(s => `
        <div class="d-flex justify-content-between align-items-center border rounded-3 px-2 py-1 mb-1">
            <div class="small">${s.loai === 'lam' ? `<b>${s.ca === 'tu_chon' ? 'Tự chọn' : s.ca}</b> ${s.gioBatDau}–${s.gioKetThuc}${s.nghiGiua ? ` (nghỉ ${s.nghiGiua}p)` : ''} · <b>${s.gio}h</b>${s.ngayLe ? ' <span class="badge bg-danger">Lễ 300%</span>' : ''}` : `<b>${TS_LEAVE[s.loai].ten}</b>`}${s.ghiChu ? ` · <i>${escHtml(s.ghiChu)}</i>` : ''}</div>
            <div class="text-nowrap">
                <button class="btn btn-sm btn-link p-0 me-2" onclick="editShift('${s._id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteShift('${s._id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`).join('') : '<div class="small text-muted fst-italic">Chưa chấm công ngày này</div>';
}

function resetShiftForm() {
    document.getElementById('sh-edit-id').value = '';
    document.getElementById('sh-form-title').textContent = 'Thêm ca';
    document.getElementById('sh-loai').value = 'lam';
    const emp = allEmployees.find(e => e._id === shiftCtx.nhanVien) || tsData.employees.find(e => e._id === shiftCtx.nhanVien);
    document.getElementById('sh-ca').value = emp?.boPhan === 'quan_ly' ? 'HC' : 'S';
    document.getElementById('sh-le').checked = false;
    document.getElementById('sh-ghichu').value = '';
    onShiftTemplateChange();
    onShiftTypeChange();
}

function editShift(id) {
    const s = tsData.shifts.find(x => x._id === id);
    document.getElementById('sh-edit-id').value = id;
    document.getElementById('sh-form-title').textContent = 'Sửa ca';
    document.getElementById('sh-loai').value = s.loai;
    document.getElementById('sh-ca').value = tsData.caMau[s.ca] ? s.ca : 'tu_chon';
    document.getElementById('sh-batdau').value = s.gioBatDau;
    document.getElementById('sh-ketthuc').value = s.gioKetThuc;
    document.getElementById('sh-nghi').value = s.nghiGiua || 0;
    document.getElementById('sh-le').checked = !!s.ngayLe;
    document.getElementById('sh-ghichu').value = s.ghiChu || '';
    onShiftTypeChange();
}

function onShiftTypeChange() {
    document.querySelectorAll('#shiftModal .sh-work').forEach(el => el.classList.toggle('d-none', document.getElementById('sh-loai').value !== 'lam'));
    updateShiftHours();
}

function onShiftTemplateChange() {
    const c = tsData.caMau[document.getElementById('sh-ca').value];
    if (c) {
        document.getElementById('sh-batdau').value = c.gioBatDau;
        document.getElementById('sh-ketthuc').value = c.gioKetThuc;
        document.getElementById('sh-nghi').value = c.nghiGiua;
    }
    updateShiftHours();
}

function updateShiftHours() {
    const loai = document.getElementById('sh-loai').value;
    const h = shiftHours({ loai, gioBatDau: document.getElementById('sh-batdau').value, gioKetThuc: document.getElementById('sh-ketthuc').value, nghiGiua: document.getElementById('sh-nghi').value });
    document.getElementById('sh-hours').innerHTML = loai === 'lam' ? `Thời gian làm: <span class="text-primary">${Math.round(h * 100) / 100} giờ</span>${h > 8 ? ` <span class="text-danger">(tăng ca ${Math.round((h - 8) * 100) / 100}h nếu là ca duy nhất trong ngày)</span>` : ''}` : (loai === 'khong_luong' ? 'Không tính công' : 'Tính 1 ngày công có lương');
}

async function saveShift() {
    const id = document.getElementById('sh-edit-id').value;
    const ca = document.getElementById('sh-ca').value;
    const body = {
        nhanVien: shiftCtx.nhanVien, ngay: shiftCtx.ngay, loai: document.getElementById('sh-loai').value, ca,
        gioBatDau: document.getElementById('sh-batdau').value, gioKetThuc: document.getElementById('sh-ketthuc').value,
        nghiGiua: document.getElementById('sh-nghi').value, ngayLe: document.getElementById('sh-le').checked, ghiChu: document.getElementById('sh-ghichu').value,
    };
    try {
        const res = await fetch(`${API}/acc/shifts${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Lưu thất bại');
        await loadShifts();
        renderShiftCell();
        resetShiftForm();
        showToast('Đã chấm công', 'success');
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function deleteShift(id) {
    if (!confirm('Xóa ca này?')) return;
    try {
        const res = await fetch(`${API}/acc/shifts/${id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Lỗi khi xóa ca');
        await loadShifts();
        renderShiftCell();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function openBulkShiftModal() {
    const [y, m] = document.getElementById('ts-thang').value.split('-').map(Number);
    document.getElementById('bs-tu').value = `${y}-${String(m).padStart(2, '0')}-01`;
    document.getElementById('bs-den').value = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
    document.getElementById('bs-ca').innerHTML = Object.entries(tsData.caMau).map(([k, c]) => `<option value="${k}">${k} — ${c.ten} (${c.gioBatDau}–${c.gioKetThuc})</option>`).join('');
    document.getElementById('bs-loai').value = 'lam';
    document.getElementById('bs-ghide').checked = false;
    document.getElementById('bs-thu').innerHTML = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((t, i) => `<div class="form-check form-check-inline m-0"><input class="form-check-input bs-thu" type="checkbox" value="${i}" id="bs-thu-${i}"><label class="form-check-label small" for="bs-thu-${i}">${t}</label></div>`).join('');
    const bp = document.getElementById('ts-filter-bp').value;
    document.getElementById('bs-nv-list').innerHTML = tsData.employees.filter(e => !tsData.khoa.includes(String(e._id))).map(e => `
        <div class="col-md-4 col-6"><div class="form-check"><input class="form-check-input bs-nv" type="checkbox" value="${e._id}" id="bs-nv-${e._id}" ${!bp || e.boPhan === bp ? 'checked' : ''}>
        <label class="form-check-label small" for="bs-nv-${e._id}">${escHtml(e.hoTen)} <span class="text-muted">(${BO_PHAN_NV[e.boPhan] || ''})</span></label></div></div>`).join('');
    modalOf('bulkShiftModal').show();
}

async function saveBulkShifts() {
    const nhanVien = [...document.querySelectorAll('.bs-nv:checked')].map(c => c.value);
    if (!nhanVien.length) { showToast('Chọn ít nhất một nhân viên', 'warning'); return; }
    const body = {
        nhanVien, tuNgay: document.getElementById('bs-tu').value, denNgay: document.getElementById('bs-den').value,
        ca: document.getElementById('bs-ca').value, loai: document.getElementById('bs-loai').value,
        boQuaThu: [...document.querySelectorAll('.bs-thu:checked')].map(c => Number(c.value)), ghiDe: document.getElementById('bs-ghide').checked,
    };
    try {
        const res = await fetch(`${API}/acc/shifts/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Xếp ca thất bại');
        showToast(`Đã xếp ${json.tao} ca${json.boQua ? `, bỏ qua ${json.boQua} ngày đã có chấm công` : ''}`, 'success');
        modalOf('bulkShiftModal').hide();
        await loadShifts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function printTimesheet() {
    if (!tsData) return;
    const { thang, employees, shifts } = tsData;
    const [y, m] = thang.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const bp = document.getElementById('ts-filter-bp').value;
    const byEmp = {};
    shifts.forEach(s => (byEmp[s.nhanVien] = byEmp[s.nhanVien] || []).push(s));
    const code = list => { const l = list.find(s => s.loai !== 'lam'); return l ? TS_LEAVE[l.loai].code : list.map(s => s.ca === 'tu_chon' ? s.gio : s.ca).join('+') + (list.some(s => s.ngayLe) ? '*' : ''); };
    const rows = employees.filter(e => !bp || e.boPhan === bp).map((e, i) => {
        const list = byEmp[e._id] || [];
        let cells = '';
        for (let d = 1; d <= days; d++) {
            const key = `${thang}-${String(d).padStart(2, '0')}`;
            const c = list.filter(s => s.ngay === key);
            cells += `<td class="c" style="padding:2px;font-size:10px">${c.length ? code(c) : ''}</td>`;
        }
        const s = tsSummary(list);
        return `<tr><td class="c">${i + 1}</td><td>${escHtml(e.hoTen)}</td><td>${escHtml(e.chucVu)}</td>${cells}<td class="c">${s.cong}</td><td class="c">${s.gio}</td><td class="c">${s.ot || ''}</td><td class="c">${s.phep || ''}</td></tr>`;
    }).join('');
    let dh = '';
    for (let d = 1; d <= days; d++) dh += `<th style="padding:2px;font-size:10px">${d}</th>`;
    openPrintWindow(`Bảng chấm công ${m}/${y}`, `
        <div class="top"><div><b>Đơn vị: NOMNOMFOOD</b><br>Bộ phận: ${bp ? BO_PHAN_NV[bp] : 'Toàn nhà hàng'}</div>
        <div class="right"><b>Mẫu số 01a - LĐTL</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div></div>
        <h1>BẢNG CHẤM CÔNG</h1><p class="c"><i>Tháng ${m} năm ${y}</i></p>
        <table style="font-size:11px"><thead><tr><th>STT</th><th>Họ và tên</th><th>Chức vụ</th>${dh}<th>Công</th><th>Giờ</th><th>Tăng ca</th><th>Phép/Lễ</th></tr></thead><tbody>${rows}</tbody></table>
        <p style="font-size:11px">Ký hiệu: ${Object.entries(tsData.caMau).map(([k, c]) => `${k}: ${c.ten} ${c.gioBatDau}–${c.gioKetThuc}`).join('; ')}; số: giờ làm ca tự chọn; P: nghỉ phép; L: nghỉ lễ; KL: nghỉ không lương; *: làm ngày lễ.</p>
        <div class="sign3"><div><b>Người chấm công</b><br><i>(Ký, họ tên)</i></div><div><b>Phụ trách bộ phận</b><br><i>(Ký, họ tên)</i></div><div><b>Người duyệt</b><br><i>(Ký, họ tên)</i></div></div>`, true);
}

// ---------- Bảng lương ----------
let payrollData = null;
const PR_ST = { nhap: { label: 'Nháp', cls: 'bg-warning text-dark' }, da_chot: { label: 'Đã chốt', cls: 'bg-primary' }, da_tra: { label: 'Đã trả', cls: 'bg-success' } };

async function loadPayroll() {
    if (!currentAccPeriod) { document.getElementById('payroll-table-body').innerHTML = '<tr><td colspan="15" class="text-center text-muted py-3">Vui lòng chọn kỳ kế toán</td></tr>'; return; }
    try {
        await ensureHrMeta();
        const res = await fetch(`${API}/acc/payroll?period=${currentAccPeriod}`);
        payrollData = await res.json();
        if (!res.ok) throw new Error(payrollData.error);
        renderPayroll();
    } catch (err) {
        showToast(err.message || 'Không tải được bảng lương', 'danger');
    }
}

function renderPayroll() {
    const { period, rows } = payrollData;
    document.getElementById('pr-period-name').textContent = period.tenKy;
    const sum = k => rows.reduce((s, r) => s + (r[k] || 0), 0);
    const daTra = rows.filter(r => r.trangThai === 'da_tra').reduce((s, r) => s + r.luongThucLinh, 0);
    const kpi = (t, v, sub, cls = '') => `<div class="col-6 col-lg-3"><div class="card border-0 rounded-4 shadow-sm p-3 h-100"><div class="small text-muted">${t}</div><div class="fs-5 fw-bold ${cls}">${v}</div><div class="small text-muted">${sub}</div></div></div>`;
    document.getElementById('pr-kpis').innerHTML =
        kpi('Tổng thu nhập (Có 334)', formatPrice(sum('tongThuNhap')), `${rows.length} nhân viên · tăng ca ${formatPrice(sum('luongTangCa'))}`)
        + kpi('Bảo hiểm', formatPrice(sum('bhNLD') + sum('bhDN')), `NLĐ ${formatPrice(sum('bhNLD'))} · DN ${formatPrice(sum('bhDN'))}`, 'text-primary')
        + kpi('Thuế TNCN khấu trừ', formatPrice(sum('thueTNCN')), 'Nộp Nhà nước (TK 3335)', 'text-danger')
        + kpi('Thực lĩnh', formatPrice(sum('luongThucLinh')), `Đã trả ${formatPrice(daTra)} · tạm ứng ${formatPrice(sum('tamUng'))}`, 'text-success');
    const has = st => rows.some(r => r.trangThai === st);
    document.getElementById('pr-close-btn').classList.toggle('d-none', !has('nhap'));
    document.getElementById('pr-reopen-btn').classList.toggle('d-none', !has('da_chot'));
    document.getElementById('pr-pay-btn').classList.toggle('d-none', !has('da_chot'));
    document.getElementById('pr-note').innerHTML = rows.length
        ? 'Chốt: Nợ 642 / Có 334 (thu nhập) · Nợ 334 / Có 338 (BH 10,5%) · Nợ 642 / Có 338 (BH 21,5%) · Nợ 334 / Có 3335 (thuế TNCN) — Chi trả: Nợ 334 / Có 111, 112. Tích chọn dòng để chốt / trả riêng.'
        : 'Chưa có bảng lương kỳ này — chấm công rồi bấm <b>Tính lương</b>.';
    const tbody = document.getElementById('payroll-table-body');
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="15" class="text-center text-muted py-3">Chưa có dữ liệu</td></tr>'; document.getElementById('payroll-table-foot').innerHTML = ''; return; }
    const money = (r, k) => r.trangThai === 'nhap'
        ? `<input type="number" class="form-control form-control-sm text-end" style="width:100px" min="0" step="50000" value="${r[k] || 0}" onchange="updatePayrollRow('${r._id}', '${k}', this.value)">`
        : (r[k] ? formatPrice(r[k]) : '—');
    tbody.innerHTML = rows.map(r => {
        const st = PR_ST[r.trangThai] || PR_ST.nhap;
        return `
        <tr>
            <td><input type="checkbox" class="form-check-input pr-cb" value="${r._id}"></td>
            <td><div class="fw-semibold">${escHtml(r.hoTen || r.nhanVien?.hoTen || '')}</div><div class="small text-muted">${escHtml(r.nhanVien?.maNV || '')} · ${escHtml(r.chucVu || '')}</div></td>
            <td class="text-end small">${r.hinhThucLuong === 'gio' ? `${r.tongGioLam}h` : `${r.ngayCong || 0} công`}${r.gioTangCa || r.gioLe ? `<div class="text-danger">TC ${r.gioTangCa}h${r.gioLe ? ' · lễ ' + r.gioLe + 'h' : ''}</div>` : ''}</td>
            <td class="text-end">${formatPrice(r.luongChinh || 0)}</td>
            <td class="text-end">${r.luongTangCa ? formatPrice(r.luongTangCa) : '—'}</td>
            <td class="text-end">${(r.phuCap || 0) + (r.phuCapAnCa || 0) ? formatPrice((r.phuCap || 0) + (r.phuCapAnCa || 0)) : '—'}</td>
            <td class="text-end">${money(r, 'thuong')}</td>
            <td class="text-end fw-semibold">${formatPrice(r.tongThuNhap || 0)}</td>
            <td class="text-end">${r.bhNLD ? formatPrice(r.bhNLD) : '—'}</td>
            <td class="text-end">${r.thueTNCN ? formatPrice(r.thueTNCN) : '—'}</td>
            <td class="text-end">${money(r, 'khauTru')}</td>
            <td class="text-end">${r.tamUng ? `<a href="#" onclick="event.preventDefault(); showAdvances('${r._id}')">${formatPrice(r.tamUng)}</a>` : '—'}</td>
            <td class="text-end fw-bold text-success">${formatPrice(r.luongThucLinh)}</td>
            <td><span class="badge ${st.cls}">${st.label}</span>${r.ngayTra ? `<div class="small text-muted">${new Date(r.ngayTra).toLocaleDateString('vi-VN')} · ${r.hinhThucTra === '112' ? 'CK' : 'TM'}</div>` : ''}</td>
            <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-secondary" onclick="printPayslip('${r._id}')" title="In phiếu lương"><i class="fa-solid fa-receipt"></i></button>
                ${r.trangThai === 'nhap' ? `<button class="btn btn-sm btn-outline-danger" onclick="deletePayrollRow('${r._id}')" title="Xóa dòng"><i class="fa-solid fa-trash"></i></button>` : ''}
                ${r.trangThai === 'da_tra' ? `<button class="btn btn-sm btn-outline-danger" onclick="unpayPayrollRow('${r._id}')" title="Hủy chi trả"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
            </td>
        </tr>`;
    }).join('');
    document.getElementById('payroll-table-foot').innerHTML = `<tr class="fw-bold"><td></td><td>Cộng</td><td></td>
        <td class="text-end">${formatPrice(sum('luongChinh'))}</td><td class="text-end">${formatPrice(sum('luongTangCa'))}</td><td class="text-end">${formatPrice(sum('phuCap') + sum('phuCapAnCa'))}</td>
        <td class="text-end">${formatPrice(sum('thuong'))}</td><td class="text-end">${formatPrice(sum('tongThuNhap'))}</td><td class="text-end">${formatPrice(sum('bhNLD'))}</td>
        <td class="text-end">${formatPrice(sum('thueTNCN'))}</td><td class="text-end">${formatPrice(sum('khauTru'))}</td><td class="text-end">${formatPrice(sum('tamUng'))}</td>
        <td class="text-end text-success">${formatPrice(sum('luongThucLinh'))}</td><td colspan="2"></td></tr>`;
    document.getElementById('pr-check-all').checked = false;
}

const selectedPayrollIds = () => [...document.querySelectorAll('.pr-cb:checked')].map(c => c.value);

async function payrollPost(url, body, okMsg) {
    try {
        const res = await fetch(`${API}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Thao tác thất bại');
        showToast(okMsg(json), 'success');
        await loadPayroll();
        return true;
    } catch (err) {
        showToast(err.message, 'danger');
        return false;
    }
}

async function runPayroll() {
    if (!currentAccPeriod) { showToast('Vui lòng chọn kỳ kế toán', 'warning'); return; }
    await payrollPost('/acc/payroll/run', { period: currentAccPeriod }, j => `Đã tính lương ${j.tinh} nhân viên${j.giuNguyen ? ` (giữ nguyên ${j.giuNguyen} dòng đã chốt)` : ''}`);
}

async function closePayroll() {
    const ids = selectedPayrollIds();
    const rows = payrollData.rows.filter(r => r.trangThai === 'nhap' && (!ids.length || ids.includes(r._id)));
    if (!rows.length) { showToast('Không có dòng nháp nào được chọn', 'warning'); return; }
    if (!confirm(`Chốt bảng lương ${rows.length} nhân viên, tổng thu nhập ${formatPrice(rows.reduce((s, r) => s + r.tongThuNhap, 0))}?\nSau khi chốt sẽ ghi sổ và khóa chấm công của các nhân viên này.`)) return;
    await payrollPost('/acc/payroll/close', { period: currentAccPeriod, ids: rows.map(r => r._id) }, j => `Đã chốt ${j.chot} dòng lương, ghi sổ ${formatPrice(j.tong)}`);
}

async function reopenPayroll() {
    const ids = selectedPayrollIds();
    if (!confirm(`Hủy chốt ${ids.length ? ids.length + ' dòng đã chọn' : 'toàn bộ dòng đã chốt (chưa trả)'}? Bút toán lương sẽ bị xóa.`)) return;
    await payrollPost('/acc/payroll/reopen', { period: currentAccPeriod, ids }, j => `Đã mở lại ${j.mo} dòng lương`);
}

async function updatePayrollRow(id, field, value) {
    try {
        const res = await fetch(`${API}/acc/payroll/rows/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: Number(value) || 0 }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        await loadPayroll();
    } catch (err) {
        showToast(err.message || 'Không cập nhật được', 'danger');
    }
}

async function deletePayrollRow(id) {
    if (!confirm('Xóa dòng lương nháp này?')) return;
    try {
        const res = await fetch(`${API}/acc/payroll/rows/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        await loadPayroll();
    } catch (err) {
        showToast(err.message || 'Không xóa được', 'danger');
    }
}

async function unpayPayrollRow(id) {
    if (!confirm('Hủy chi trả lương của nhân viên này? Bút toán chi lương sẽ bị xóa.')) return;
    try {
        const res = await fetch(`${API}/acc/payroll/rows/${id}/pay`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        showToast('Đã hủy chi trả', 'success');
        await loadPayroll();
    } catch (err) {
        showToast(err.message || 'Không hủy được', 'danger');
    }
}

function openPayModal() {
    const ids = selectedPayrollIds();
    const rows = payrollData.rows.filter(r => r.trangThai === 'da_chot' && (!ids.length || ids.includes(r._id)));
    if (!rows.length) { showToast('Không có dòng đã chốt nào được chọn', 'warning'); return; }
    document.getElementById('pp-info').innerHTML = `<b>${rows.length} nhân viên</b> · Tổng thực lĩnh <b class="text-success">${formatPrice(rows.reduce((s, r) => s + r.luongThucLinh, 0))}</b><div class="text-muted">${rows.map(r => escHtml(r.hoTen)).join(', ')}</div>`;
    document.getElementById('pp-ngay').value = pnlDateStr(new Date());
    document.getElementById('payrollPayModal').dataset.ids = JSON.stringify(rows.map(r => r._id));
    modalOf('payrollPayModal').show();
}

async function savePayrollPay() {
    const ids = JSON.parse(document.getElementById('payrollPayModal').dataset.ids || '[]');
    const ngay = document.getElementById('pp-ngay').value;
    const ok = await payrollPost('/acc/payroll/pay', { period: currentAccPeriod, ids, hinhThuc: document.getElementById('pp-hinhthuc').value, ngay: `${ngay}T${new Date().toTimeString().slice(0, 8)}` },
        j => `Đã chi trả lương ${j.tra} nhân viên: ${formatPrice(j.tong)}`);
    if (ok) modalOf('payrollPayModal').hide();
}

async function openAdvanceModal() {
    if (!currentAccPeriod) { showToast('Vui lòng chọn kỳ kế toán', 'warning'); return; }
    if (!allEmployees.length) allEmployees = await fetch(`${API}/acc/employees`).then(r => r.json());
    document.getElementById('ad-nv').innerHTML = allEmployees.filter(e => e.dangLamViec).map(e => `<option value="${e._id}">${escHtml(e.maNV)} · ${escHtml(e.hoTen)} (${escHtml(e.chucVu)})</option>`).join('');
    document.getElementById('ad-sotien').value = '';
    document.getElementById('ad-ngay').value = pnlDateStr(new Date());
    modalOf('payrollAdvanceModal').show();
}

async function saveAdvance() {
    const soTien = Number(document.getElementById('ad-sotien').value) || 0;
    if (soTien <= 0) { showToast('Nhập số tiền tạm ứng', 'warning'); return; }
    const ngay = document.getElementById('ad-ngay').value;
    const ok = await payrollPost('/acc/payroll/advance', {
        period: currentAccPeriod, nhanVien: document.getElementById('ad-nv').value, soTien,
        hinhThuc: document.getElementById('ad-hinhthuc').value, ngay: `${ngay}T${new Date().toTimeString().slice(0, 8)}`,
    }, j => `Đã tạm ứng ${formatPrice(soTien)} cho ${j.hoTen || 'nhân viên'}`);
    if (ok) modalOf('payrollAdvanceModal').hide();
}

async function showAdvances(rowId) {
    const r = payrollData.rows.find(x => x._id === rowId);
    const list = r.tamUngList.map((a, i) => `${i + 1}. ${new Date(a.ngay).toLocaleDateString('vi-VN')} — ${formatPrice(a.soTien)} (${a.hinhThuc === '112' ? 'CK' : 'TM'})`).join('\n');
    if (r.trangThai !== 'nhap') { alert(`Tạm ứng của ${r.hoTen}:\n${list}`); return; }
    const idx = prompt(`Tạm ứng của ${r.hoTen}:\n${list}\n\nNhập số thứ tự để XÓA khoản tạm ứng (bỏ trống để đóng):`);
    if (!idx) return;
    try {
        const res = await fetch(`${API}/acc/payroll/rows/${rowId}/advance/${Number(idx) - 1}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        showToast('Đã xóa khoản tạm ứng', 'success');
        await loadPayroll();
    } catch (err) {
        showToast(err.message || 'Không xóa được', 'danger');
    }
}

function printPayslip(id) {
    const r = payrollData.rows.find(x => x._id === id);
    if (!r) return;
    const n = v => Number(v || 0).toLocaleString('vi-VN');
    const line = (k, v, b) => `<tr><td>${k}</td><td class="num">${b ? '<b>' : ''}${n(v)}${b ? '</b>' : ''}</td></tr>`;
    openPrintWindow(`Phiếu lương ${r.hoTen} ${payrollData.period.tenKy}`, `
        <div class="top"><div><b>NOMNOMFOOD</b></div><div class="right"><i>${escHtml(payrollData.period.tenKy)}</i></div></div>
        <h1>PHIẾU LƯƠNG</h1>
        <p>Họ tên: <b>${escHtml(r.hoTen)}</b> &nbsp; Mã NV: ${escHtml(r.nhanVien?.maNV || '')} &nbsp; Chức vụ: ${escHtml(r.chucVu || '')} &nbsp; Bộ phận: ${BO_PHAN_NV[r.boPhan] || ''}</p>
        <p>Mức lương: ${n(r.mucLuong)} ${r.hinhThucLuong === 'gio' ? 'đ/giờ' : 'đ/tháng'} &nbsp; ${r.hinhThucLuong === 'gio' ? '' : `Ngày công: <b>${r.ngayCong}</b>/${hrMeta.cauHinh.ngayCongChuan} &nbsp;`} Giờ làm: ${r.tongGioLam} &nbsp; Tăng ca: ${r.gioTangCa}h${r.gioLe ? ` &nbsp; Lễ: ${r.gioLe}h` : ''}</p>
        <table style="width: 70%; margin: 10px auto"><tbody>
            <tr><th colspan="2">THU NHẬP</th></tr>
            ${line('Lương chính', r.luongChinh)}${line('Lương tăng ca / ngày lễ', r.luongTangCa)}${line('Phụ cấp trách nhiệm, phụ cấp khác', r.phuCap)}${line('Phụ cấp ăn ca', r.phuCapAnCa)}${line('Thưởng', r.thuong)}
            ${line('Tổng thu nhập', r.tongThuNhap, true)}
            <tr><th colspan="2">CÁC KHOẢN KHẤU TRỪ</th></tr>
            ${line('BHXH 8%, BHYT 1,5%, BHTN 1%', r.bhNLD)}${line('Thuế TNCN', r.thueTNCN)}${line('Khấu trừ khác (phạt, bồi thường)', r.khauTru)}${line('Đã tạm ứng', r.tamUng)}
            ${line('THỰC LĨNH', r.luongThucLinh, true)}
        </tbody></table>
        <p>Bằng chữ: <b><i>${soThanhChu(r.luongThucLinh)}</i></b></p>
        ${r.nhanVien?.soTaiKhoan ? `<p>Tài khoản nhận: ${escHtml(r.nhanVien.soTaiKhoan)} — ${escHtml(r.nhanVien.nganHang || '')}</p>` : ''}
        <div class="sign3"><div><b>Người lập</b><br><i>(Ký, họ tên)</i></div><div></div><div><b>Người nhận</b><br><i>(Ký, họ tên)</i><br><br><br><br>${escHtml(r.hoTen)}</div></div>`);
}

function printPayroll() {
    if (!payrollData?.rows.length) { showToast('Chưa có bảng lương để in', 'warning'); return; }
    const { period, rows } = payrollData;
    const n = v => v ? Number(v).toLocaleString('vi-VN') : '';
    const sum = k => rows.reduce((s, r) => s + (r[k] || 0), 0);
    openPrintWindow(`Bảng thanh toán tiền lương ${period.tenKy}`, `
        <div class="top"><div><b>Đơn vị: NOMNOMFOOD</b></div>
        <div class="right"><b>Mẫu số 02 - LĐTL</b><br><i>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</i></div></div>
        <h1>BẢNG THANH TOÁN TIỀN LƯƠNG</h1><p class="c"><i>${escHtml(period.tenKy)}</i></p>
        <table style="font-size: 11px"><thead><tr><th>STT</th><th>Họ và tên</th><th>Chức vụ</th><th>Mức lương</th><th>Công / giờ</th><th>Lương chính</th><th>Tăng ca</th><th>Phụ cấp</th><th>Thưởng</th><th>Tổng thu nhập</th><th>BH 10,5%</th><th>Thuế TNCN</th><th>Khấu trừ</th><th>Tạm ứng</th><th>Thực lĩnh</th><th>Ký nhận</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${escHtml(r.hoTen)}</td><td>${escHtml(r.chucVu || '')}</td><td class="num">${n(r.mucLuong)}</td><td class="c">${r.hinhThucLuong === 'gio' ? r.tongGioLam + 'h' : r.ngayCong}</td>
            <td class="num">${n(r.luongChinh)}</td><td class="num">${n(r.luongTangCa)}</td><td class="num">${n((r.phuCap || 0) + (r.phuCapAnCa || 0))}</td><td class="num">${n(r.thuong)}</td><td class="num"><b>${n(r.tongThuNhap)}</b></td>
            <td class="num">${n(r.bhNLD)}</td><td class="num">${n(r.thueTNCN)}</td><td class="num">${n(r.khauTru)}</td><td class="num">${n(r.tamUng)}</td><td class="num"><b>${n(r.luongThucLinh)}</b></td><td></td></tr>`).join('')}
        <tr><td></td><td><b>Cộng</b></td><td></td><td></td><td></td><td class="num"><b>${n(sum('luongChinh'))}</b></td><td class="num"><b>${n(sum('luongTangCa'))}</b></td><td class="num"><b>${n(sum('phuCap') + sum('phuCapAnCa'))}</b></td><td class="num"><b>${n(sum('thuong'))}</b></td>
            <td class="num"><b>${n(sum('tongThuNhap'))}</b></td><td class="num"><b>${n(sum('bhNLD'))}</b></td><td class="num"><b>${n(sum('thueTNCN'))}</b></td><td class="num"><b>${n(sum('khauTru'))}</b></td><td class="num"><b>${n(sum('tamUng'))}</b></td><td class="num"><b>${n(sum('luongThucLinh'))}</b></td><td></td></tr></tbody></table>
        <p>Tổng số tiền thực lĩnh (viết bằng chữ): <b><i>${soThanhChu(sum('luongThucLinh'))}</i></b></p>
        <div class="sign3"><div><b>Người lập biểu</b><br><i>(Ký, họ tên)</i></div><div><b>Kế toán trưởng</b><br><i>(Ký, họ tên)</i></div><div><b>Giám đốc</b><br><i>(Ký, họ tên, đóng dấu)</i></div></div>`, true);
}
