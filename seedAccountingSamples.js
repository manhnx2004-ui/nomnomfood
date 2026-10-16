// Bổ sung 5 ví dụ mẫu cho từng phần của module Kế toán (chạy qua API để giữ đúng
// nghiệp vụ: tự hạch toán bút toán, cập nhật tồn kho, công nợ...).
// Yêu cầu: server (node server.js) và MongoDB đang chạy tại localhost:3000 / 27017.
// Chạy: node seedAccountingSamples.js

const API = "http://localhost:3000";

async function get(path) {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json();
}

async function post(path, body) {
    const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`POST ${path} -> ${res.status}: ${json.error || JSON.stringify(json)}`);
    return json;
}

async function put(path, body) {
    const res = await fetch(`${API}${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`PUT ${path} -> ${res.status}: ${json.error || JSON.stringify(json)}`);
    return json;
}

async function del(path) {
    const res = await fetch(`${API}${path}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`DELETE ${path} -> ${res.status}: ${json.error || JSON.stringify(json)}`);
    return json;
}

function norm(s) { return String(s || "").trim().toLowerCase(); }

// Đảm bảo mỗi nguyên liệu trong `catalog` đều tồn tại và có tồn kho >= mức đề ra.
// Nguyên liệu đã có (trùng tên, không phân biệt hoa/thường) chỉ được BỔ SUNG thêm
// số lượng tồn (không bao giờ giảm) và không đụng tới giá vốn đã ghi nhận trước đó.
async function ensureMaterials(catalog, existing) {
    const byName = new Map(existing.map(m => [norm(m.tenNL), m]));
    const result = [];
    for (const item of catalog) {
        const found = byName.get(norm(item.tenNL));
        if (found) {
            const needMore = (found.tonHienTai || 0) < item.tonHienTai;
            const needMin = !found.tonToiThieu && item.tonToiThieu;
            if (needMore || needMin) {
                const updated = await put(`/acc/materials/${found._id}`, {
                    tonHienTai: Math.max(found.tonHienTai || 0, item.tonHienTai),
                    tonToiThieu: found.tonToiThieu || item.tonToiThieu,
                });
                console.log(`  ~ [Nguyên liệu] bổ sung tồn kho "${found.tenNL}": ${found.tonHienTai || 0} -> ${updated.tonHienTai}`);
                result.push(updated);
            } else {
                result.push(found);
            }
            continue;
        }
        try {
            const created = await post("/acc/materials", {
                tenNL: item.tenNL,
                kho: item.kho._id || item.kho,
                tonToiThieu: item.tonToiThieu,
                giaVonBinhQuan: item.giaVonBinhQuan,
                tonHienTai: item.tonHienTai,
            });
            console.log(`  + [Nguyên liệu] đã tạo "${item.tenNL}" (tồn: ${item.tonHienTai})`);
            result.push(created);
        } catch (err) {
            console.log(`  ! [Nguyên liệu] lỗi khi tạo "${item.tenNL}": ${err.message}`);
        }
    }
    return result;
}

// Đảm bảo mỗi món trong `recipeMap` có đủ và đúng các dòng nguyên liệu mong muốn.
// Dòng định mức sai/không còn phù hợp (nguyên liệu không thuộc công thức món đó)
// sẽ bị xoá; dòng còn thiếu sẽ được tạo thêm. Dòng đã đúng thì giữ nguyên định lượng.
async function ensureRecipes(recipeMap, existingRecipes, products, materials) {
    const materialByName = new Map(materials.map(m => [norm(m.tenNL), m]));
    const productByName = new Map(products.map(p => [norm(p.name), p]));
    const result = [];

    for (const recipe of existingRecipes) {
        const productName = norm(recipe.product?.name);
        const materialName = norm(recipe.danhMucNL?.tenNL);
        const wanted = Object.keys(recipeMap).find(key => norm(key) === productName);
        const lines = wanted ? recipeMap[wanted] : null;
        const stillWanted = lines && lines.some(([matName]) => norm(matName) === materialName);
        const isDuplicate = stillWanted && result.some(r =>
            norm(r.product?.name) === productName && norm(r.danhMucNL?.tenNL) === materialName
        );
        if (stillWanted && !isDuplicate) {
            result.push(recipe);
        } else {
            try {
                await del(`/acc/recipes/${recipe._id}`);
                const reason = isDuplicate ? "trùng lặp" : "sai";
                console.log(`  - [Định mức] đã xoá dòng ${reason} "${recipe.product?.name} / ${recipe.danhMucNL?.tenNL}"`);
            } catch (err) {
                console.log(`  ! [Định mức] lỗi khi xoá: ${err.message}`);
            }
        }
    }

    for (const [productName, lines] of Object.entries(recipeMap)) {
        const product = productByName.get(norm(productName));
        if (!product) {
            console.log(`  ! [Định mức] không tìm thấy món "${productName}", bỏ qua`);
            continue;
        }
        const already = new Set(
            result.filter(r => norm(r.product?.name) === norm(productName)).map(r => norm(r.danhMucNL?.tenNL))
        );
        for (const [materialName, dinhLuong] of lines) {
            if (already.has(norm(materialName))) continue;
            const material = materialByName.get(norm(materialName));
            if (!material) {
                console.log(`  ! [Định mức] không tìm thấy nguyên liệu "${materialName}" cho món "${productName}"`);
                continue;
            }
            try {
                const created = await post("/acc/recipes", { product: product._id, danhMucNL: material._id, dinhLuong });
                console.log(`  + [Định mức] "${productName}" + "${materialName}" (${dinhLuong})`);
                result.push(created);
            } catch (err) {
                console.log(`  ! [Định mức] lỗi khi tạo "${productName}" + "${materialName}": ${err.message}`);
            }
        }
    }

    return result;
}

// Thêm cho đủ tối thiểu `target` bản ghi, chỉ tạo thêm phần còn thiếu.
async function topUp(label, listPath, existing, target, factory) {
    const need = Math.max(0, target - existing.length);
    const created = [];
    for (let i = 0; i < need; i++) {
        try {
            const item = await factory(i, existing.concat(created));
            created.push(item);
            console.log(`  + [${label}] đã tạo #${i + 1}/${need}`);
        } catch (err) {
            console.log(`  ! [${label}] lỗi khi tạo #${i + 1}: ${err.message}`);
        }
    }
    return existing.concat(created);
}

function d(dateStr) { return new Date(dateStr).toISOString(); }

async function main() {
    console.log("== Bắt đầu thêm dữ liệu mẫu cho Kế toán ==");

    // ---------- Kỳ kế toán ----------
    let periods = await get("/acc/periods");
    const monthDefs = [
        { m: 5, name: "Tháng 5/2026" }, { m: 6, name: "Tháng 6/2026" },
        { m: 7, name: "Tháng 7/2026" }, { m: 8, name: "Tháng 8/2026" },
    ];
    periods = await topUp("Kỳ kế toán", "/acc/periods", periods, 5, async (i) => {
        const def = monthDefs[i];
        const start = new Date(2026, def.m - 1, 1);
        const end = new Date(2026, def.m, 0, 23, 59, 59);
        return post("/acc/periods", {
            tenKy: def.name, ngayBatDau: start.toISOString(), ngayKetThuc: end.toISOString(), trangThai: "dong",
        });
    });
    const openPeriod = periods.find(p => p.trangThai === "mo") || periods[0];
    console.log(`Kỳ đang mở: ${openPeriod.tenKy} (${openPeriod._id})`);

    // ---------- Kho ----------
    let warehouses = await get("/acc/warehouses");
    warehouses = await topUp("Kho", "/acc/warehouses", warehouses, 5, async (i) => {
        const defs = [
            { tenKho: "Kho lạnh", diaDiem: "Tầng hầm B1 - Chi nhánh trung tâm" },
            { tenKho: "Kho khô", diaDiem: "Tầng 1 - Kho phía sau bếp" },
            { tenKho: "Kho rau củ quả", diaDiem: "Khu sơ chế - Chi nhánh trung tâm" },
            { tenKho: "Kho gia vị - phụ liệu", diaDiem: "Kệ kho bếp chính" },
        ];
        return post("/acc/warehouses", defs[i]);
    });

    // ---------- Nguyên liệu (đủ đa dạng cho toàn bộ thực đơn, mỗi món nhiều nguyên liệu khác nhau) ----------
    let materials = await get("/acc/materials");
    const whLanh = warehouses.find(w => w.tenKho === "Kho lạnh") || warehouses[0];
    const whKho = warehouses.find(w => w.tenKho === "Kho khô") || warehouses[0];
    const whRau = warehouses.find(w => w.tenKho === "Kho rau củ quả") || warehouses[0];
    const whGiaVi = warehouses.find(w => w.tenKho === "Kho gia vị - phụ liệu") || warehouses[0];

    const materialCatalog = [
        // -- Thịt, hải sản, trứng, sữa (Kho lạnh) --
        { tenNL: "Thịt bò", kho: whLanh, tonToiThieu: 8, giaVonBinhQuan: 280000, tonHienTai: 25 },
        { tenNL: "Thịt gà", kho: whLanh, tonToiThieu: 15, giaVonBinhQuan: 85000, tonHienTai: 60 },
        { tenNL: "Thịt heo", kho: whLanh, tonToiThieu: 10, giaVonBinhQuan: 130000, tonHienTai: 30 },
        { tenNL: "Thịt heo xay", kho: whLanh, tonToiThieu: 8, giaVonBinhQuan: 140000, tonHienTai: 20 },
        { tenNL: "Sườn heo", kho: whLanh, tonToiThieu: 6, giaVonBinhQuan: 150000, tonHienTai: 20 },
        { tenNL: "Giò heo", kho: whLanh, tonToiThieu: 5, giaVonBinhQuan: 110000, tonHienTai: 15 },
        { tenNL: "Xương heo", kho: whLanh, tonToiThieu: 8, giaVonBinhQuan: 45000, tonHienTai: 25 },
        { tenNL: "Xương bò", kho: whLanh, tonToiThieu: 8, giaVonBinhQuan: 60000, tonHienTai: 25 },
        { tenNL: "Nạm bò", kho: whLanh, tonToiThieu: 5, giaVonBinhQuan: 260000, tonHienTai: 15 },
        { tenNL: "Cá hồi phi lê", kho: whLanh, tonToiThieu: 5, giaVonBinhQuan: 320000, tonHienTai: 15 },
        { tenNL: "Tôm", kho: whLanh, tonToiThieu: 8, giaVonBinhQuan: 210000, tonHienTai: 20 },
        { tenNL: "Mực", kho: whLanh, tonToiThieu: 5, giaVonBinhQuan: 150000, tonHienTai: 15 },
        { tenNL: "Nghêu", kho: whLanh, tonToiThieu: 5, giaVonBinhQuan: 65000, tonHienTai: 15 },
        { tenNL: "Cua đồng", kho: whLanh, tonToiThieu: 4, giaVonBinhQuan: 190000, tonHienTai: 12 },
        { tenNL: "Xúc xích Đức", kho: whLanh, tonToiThieu: 6, giaVonBinhQuan: 95000, tonHienTai: 20 },
        { tenNL: "Xúc xích", kho: whLanh, tonToiThieu: 6, giaVonBinhQuan: 70000, tonHienTai: 20 },
        { tenNL: "Lạp xưởng", kho: whLanh, tonToiThieu: 4, giaVonBinhQuan: 120000, tonHienTai: 12 },
        { tenNL: "Thịt nguội", kho: whLanh, tonToiThieu: 5, giaVonBinhQuan: 95000, tonHienTai: 15 },
        { tenNL: "Trứng gà", kho: whLanh, tonToiThieu: 100, giaVonBinhQuan: 3200, tonHienTai: 300 },
        { tenNL: "Phô mai", kho: whLanh, tonToiThieu: 5, giaVonBinhQuan: 180000, tonHienTai: 15 },
        { tenNL: "Phô mai mozzarella", kho: whLanh, tonToiThieu: 5, giaVonBinhQuan: 210000, tonHienTai: 15 },
        { tenNL: "Sữa tươi", kho: whLanh, tonToiThieu: 10, giaVonBinhQuan: 32000, tonHienTai: 30 },
        { tenNL: "Sữa đặc", kho: whLanh, tonToiThieu: 8, giaVonBinhQuan: 28000, tonHienTai: 25 },
        { tenNL: "Bì heo", kho: whLanh, tonToiThieu: 3, giaVonBinhQuan: 90000, tonHienTai: 10 },
        { tenNL: "Chả trứng", kho: whLanh, tonToiThieu: 3, giaVonBinhQuan: 85000, tonHienTai: 10 },
        // -- Rau, củ, quả (Kho rau củ quả) --
        { tenNL: "Rau xà lách", kho: whRau, tonToiThieu: 5, giaVonBinhQuan: 25000, tonHienTai: 20 },
        { tenNL: "Dưa leo", kho: whRau, tonToiThieu: 5, giaVonBinhQuan: 18000, tonHienTai: 15 },
        { tenNL: "Cà chua", kho: whRau, tonToiThieu: 5, giaVonBinhQuan: 22000, tonHienTai: 15 },
        { tenNL: "Giá đỗ", kho: whRau, tonToiThieu: 3, giaVonBinhQuan: 15000, tonHienTai: 10 },
        { tenNL: "Hành ngò", kho: whRau, tonToiThieu: 3, giaVonBinhQuan: 25000, tonHienTai: 8 },
        { tenNL: "Sả", kho: whRau, tonToiThieu: 3, giaVonBinhQuan: 20000, tonHienTai: 8 },
        { tenNL: "Rau sống", kho: whRau, tonToiThieu: 4, giaVonBinhQuan: 18000, tonHienTai: 12 },
        { tenNL: "Khoai tây", kho: whRau, tonToiThieu: 15, giaVonBinhQuan: 20000, tonHienTai: 40 },
        { tenNL: "Đậu hà lan", kho: whRau, tonToiThieu: 3, giaVonBinhQuan: 35000, tonHienTai: 10 },
        { tenNL: "Đậu phộng", kho: whRau, tonToiThieu: 5, giaVonBinhQuan: 55000, tonHienTai: 15 },
        { tenNL: "Cam tươi", kho: whRau, tonToiThieu: 10, giaVonBinhQuan: 25000, tonHienTai: 30 },
        { tenNL: "Bơ", kho: whRau, tonToiThieu: 6, giaVonBinhQuan: 48000, tonHienTai: 20 },
        { tenNL: "Dừa tươi", kho: whRau, tonToiThieu: 10, giaVonBinhQuan: 15000, tonHienTai: 30 },
        { tenNL: "Đậu hũ", kho: whRau, tonToiThieu: 5, giaVonBinhQuan: 20000, tonHienTai: 15 },
        { tenNL: "Mộc nhĩ", kho: whRau, tonToiThieu: 2, giaVonBinhQuan: 90000, tonHienTai: 5 },
        { tenNL: "Nước cốt dừa", kho: whRau, tonToiThieu: 6, giaVonBinhQuan: 35000, tonHienTai: 20 },
        { tenNL: "Đậu xanh", kho: whRau, tonToiThieu: 5, giaVonBinhQuan: 38000, tonHienTai: 15 },
        { tenNL: "Đậu đỏ", kho: whRau, tonToiThieu: 5, giaVonBinhQuan: 40000, tonHienTai: 15 },
        // -- Gạo, bún, bánh, đồ khô (Kho khô) --
        { tenNL: "Gạo tẻ", kho: whKho, tonToiThieu: 20, giaVonBinhQuan: 22000, tonHienTai: 80 },
        { tenNL: "Gạo tấm", kho: whKho, tonToiThieu: 15, giaVonBinhQuan: 21000, tonHienTai: 50 },
        { tenNL: "Bún tươi", kho: whKho, tonToiThieu: 12, giaVonBinhQuan: 16000, tonHienTai: 40 },
        { tenNL: "Bánh phở", kho: whKho, tonToiThieu: 10, giaVonBinhQuan: 17000, tonHienTai: 30 },
        { tenNL: "Hủ tiếu", kho: whKho, tonToiThieu: 8, giaVonBinhQuan: 18000, tonHienTai: 25 },
        { tenNL: "Mì Quảng", kho: whKho, tonToiThieu: 6, giaVonBinhQuan: 19000, tonHienTai: 20 },
        { tenNL: "Bánh tráng", kho: whKho, tonToiThieu: 5, giaVonBinhQuan: 30000, tonHienTai: 15 },
        { tenNL: "Bột gạo", kho: whKho, tonToiThieu: 6, giaVonBinhQuan: 18000, tonHienTai: 20 },
        { tenNL: "Bột chiên giòn", kho: whKho, tonToiThieu: 5, giaVonBinhQuan: 32000, tonHienTai: 15 },
        { tenNL: "Bột bánh xèo", kho: whKho, tonToiThieu: 5, giaVonBinhQuan: 28000, tonHienTai: 15 },
        { tenNL: "Bánh mì", kho: whKho, tonToiThieu: 20, giaVonBinhQuan: 5000, tonHienTai: 60 },
        { tenNL: "Bánh burger", kho: whKho, tonToiThieu: 20, giaVonBinhQuan: 6000, tonHienTai: 60 },
        { tenNL: "Bánh hot dog", kho: whKho, tonToiThieu: 15, giaVonBinhQuan: 5500, tonHienTai: 40 },
        { tenNL: "Bánh đa", kho: whKho, tonToiThieu: 6, giaVonBinhQuan: 12000, tonHienTai: 20 },
        { tenNL: "Đế bánh pizza", kho: whKho, tonToiThieu: 6, giaVonBinhQuan: 25000, tonHienTai: 20 },
        { tenNL: "Thạch", kho: whKho, tonToiThieu: 5, giaVonBinhQuan: 30000, tonHienTai: 15 },
        { tenNL: "Trân châu đen", kho: whKho, tonToiThieu: 6, giaVonBinhQuan: 45000, tonHienTai: 20 },
        { tenNL: "Trà", kho: whKho, tonToiThieu: 3, giaVonBinhQuan: 120000, tonHienTai: 10 },
        { tenNL: "Cà phê", kho: whKho, tonToiThieu: 5, giaVonBinhQuan: 180000, tonHienTai: 15 },
        { tenNL: "Đường", kho: whKho, tonToiThieu: 10, giaVonBinhQuan: 20000, tonHienTai: 30 },
        // -- Gia vị, nước sốt, phụ liệu (Kho gia vị - phụ liệu) --
        { tenNL: "Nước mắm", kho: whGiaVi, tonToiThieu: 6, giaVonBinhQuan: 45000, tonHienTai: 20 },
        { tenNL: "Mắm ruốc", kho: whGiaVi, tonToiThieu: 3, giaVonBinhQuan: 60000, tonHienTai: 8 },
        { tenNL: "Tương ớt", kho: whGiaVi, tonToiThieu: 5, giaVonBinhQuan: 35000, tonHienTai: 15 },
        { tenNL: "Tương cà", kho: whGiaVi, tonToiThieu: 5, giaVonBinhQuan: 32000, tonHienTai: 15 },
        { tenNL: "Sốt mù tạt", kho: whGiaVi, tonToiThieu: 3, giaVonBinhQuan: 40000, tonHienTai: 10 },
        { tenNL: "Mayonnaise", kho: whGiaVi, tonToiThieu: 4, giaVonBinhQuan: 45000, tonHienTai: 12 },
        { tenNL: "Pa-tê", kho: whGiaVi, tonToiThieu: 3, giaVonBinhQuan: 75000, tonHienTai: 10 },
        { tenNL: "Sốt cà chua", kho: whGiaVi, tonToiThieu: 5, giaVonBinhQuan: 38000, tonHienTai: 15 },
        { tenNL: "Sốt burger đặc biệt", kho: whGiaVi, tonToiThieu: 3, giaVonBinhQuan: 55000, tonHienTai: 10 },
        { tenNL: "Hành phi", kho: whGiaVi, tonToiThieu: 3, giaVonBinhQuan: 65000, tonHienTai: 8 },
        { tenNL: "Muối tiêu", kho: whGiaVi, tonToiThieu: 3, giaVonBinhQuan: 15000, tonHienTai: 10 },
        { tenNL: "Dầu ăn", kho: whGiaVi, tonToiThieu: 10, giaVonBinhQuan: 42000, tonHienTai: 30 },
        { tenNL: "Dưa chua", kho: whGiaVi, tonToiThieu: 3, giaVonBinhQuan: 20000, tonHienTai: 10 },
    ];
    materials = await ensureMaterials(materialCatalog, materials);

    // ---------- Nhà cung cấp ----------
    let suppliers = await get("/acc/suppliers");
    suppliers = await topUp("Nhà cung cấp", "/acc/suppliers", suppliers, 5, async (i) => {
        const defs = [
            { tenNCC: "Công ty TNHH Thực phẩm Sài Gòn", diaChi: "Q.7, TP.HCM", sdt: "0901234567", maSoThue: "0312345671" },
            { tenNCC: "Trang trại rau sạch Đà Lạt", diaChi: "Đà Lạt, Lâm Đồng", sdt: "0913456789", maSoThue: "0312345672" },
            { tenNCC: "Công ty CP Hải sản Miền Trung", diaChi: "Nha Trang, Khánh Hòa", sdt: "0987654321", maSoThue: "0312345673" },
        ];
        return post("/acc/suppliers", defs[i]);
    });

    // ---------- Phiếu nhập kho ----------
    let receipts = await get("/acc/goods-receipts");
    receipts = await topUp("Phiếu nhập kho", "/acc/goods-receipts", receipts, 5, async (i) => {
        const amounts = [12000000, 8500000, 15300000, 6200000, 9800000];
        return post("/acc/goods-receipts", {
            ncc: suppliers[i % suppliers.length]._id,
            ngayNhap: d(`2026-09-0${(i % 9) + 1}`),
            tongTien: amounts[i],
        });
    });

    // ---------- Hóa đơn mua hàng (tự tạo công nợ phải trả) ----------
    let purchaseInvoices = await get("/acc/purchase-invoices");
    purchaseInvoices = await topUp("Hóa đơn mua hàng", "/acc/purchase-invoices", purchaseInvoices, 5, async (i) => {
        const tienHangList = [11000000, 7800000, 14000000, 5600000, 9000000];
        const res = await post("/acc/purchase-invoices", {
            ncc: suppliers[i % suppliers.length]._id,
            phieuNhap: receipts[i % receipts.length]?._id,
            soHoaDon: `HDM2026${String(1000 + i)}`,
            tienHang: tienHangList[i],
            thueGtgtDauVao: Math.round(tienHangList[i] * 0.08),
        });
        return res.invoice;
    });

    // ---------- Phiếu xuất nguyên liệu ----------
    let issues = await get("/acc/material-issues");
    issues = await topUp("Phiếu xuất kho", "/acc/material-issues", issues, 5, async (i) => {
        const mat1 = materials[i % materials.length];
        const mat2 = materials[(i + 1) % materials.length];
        return post("/acc/material-issues", {
            kho: mat1.kho?._id || mat1.kho,
            lyDoXuat: `Xuất chế biến món ăn ngày 2026-09-0${(i % 9) + 1}`,
            lines: [
                { danhMucNL: mat1._id, soLuong: 3 + i },
                { danhMucNL: mat2._id, soLuong: 2 + i },
            ],
        });
    });

    // ---------- Định mức món ăn (mỗi món gồm nhiều nguyên liệu khác nhau, đúng với công thức thực tế) ----------
    const products = await get("/products");
    let recipes = await get("/acc/recipes");
    const recipeMap = {
        "Burger Thịt Bò Phô Mai": [["Thịt bò", 0.1], ["Phô mai", 0.03], ["Bánh burger", 1], ["Rau xà lách", 0.02], ["Sốt burger đặc biệt", 0.02]],
        "Gà Rán Giòn Cay": [["Thịt gà", 0.25], ["Bột chiên giòn", 0.05], ["Tương ớt", 0.02], ["Dưa chua", 0.03]],
        "Khoai Tây Chiên Vàng": [["Khoai tây", 0.2], ["Dầu ăn", 0.03], ["Tương cà", 0.02], ["Mayonnaise", 0.02]],
        "Hot Dog Xúc Xích Đức": [["Xúc xích Đức", 0.1], ["Bánh hot dog", 1], ["Sốt mù tạt", 0.015], ["Tương cà", 0.015]],
        "Pizza Hải Sản": [["Đế bánh pizza", 1], ["Phô mai mozzarella", 0.15], ["Tôm", 0.08], ["Mực", 0.06], ["Nghêu", 0.05], ["Sốt cà chua", 0.05]],
        "Phở Bò Tái Nạm": [["Bánh phở", 0.25], ["Thịt bò", 0.08], ["Nạm bò", 0.05], ["Xương bò", 0.3], ["Hành ngò", 0.01]],
        "Bún Bò Huế": [["Bún tươi", 0.25], ["Thịt bò", 0.07], ["Giò heo", 0.08], ["Sả", 0.02], ["Mắm ruốc", 0.015]],
        "Bánh Mì Thịt Nguội": [["Bánh mì", 1], ["Thịt nguội", 0.06], ["Pa-tê", 0.02], ["Dưa leo", 0.02], ["Rau sống", 0.01]],
        "Gỏi Cuốn Tôm Thịt": [["Bánh tráng", 0.05], ["Tôm", 0.06], ["Thịt heo", 0.05], ["Bún tươi", 0.08], ["Rau sống", 0.03]],
        "Bún Chả Hà Nội": [["Bún tươi", 0.2], ["Thịt heo xay", 0.12], ["Nước mắm", 0.03], ["Rau sống", 0.03]],
        "Trà Sữa Trân Châu Đen": [["Trà", 0.01], ["Sữa đặc", 0.03], ["Trân châu đen", 0.05], ["Đường", 0.02]],
        "Cà Phê Sữa Đá": [["Cà phê", 0.02], ["Sữa đặc", 0.03]],
        "Sinh Tố Bơ Sữa Dừa": [["Bơ", 0.15], ["Nước cốt dừa", 0.1], ["Sữa đặc", 0.02]],
        "Nước Ép Cam Tươi": [["Cam tươi", 0.3]],
        "Cơm Tấm Sườn Nướng": [["Gạo tấm", 0.2], ["Sườn heo", 0.15], ["Bì heo", 0.05], ["Chả trứng", 0.05], ["Nước mắm", 0.02]],
        "Cơm Gà Hội An": [["Gạo tẻ", 0.2], ["Thịt gà", 0.15], ["Hành phi", 0.01]],
        "Cơm Chiên Dương Châu": [["Gạo tẻ", 0.25], ["Tôm", 0.04], ["Lạp xưởng", 0.03], ["Trứng gà", 1], ["Đậu hà lan", 0.02]],
        "Hủ Tiếu Nam Vang": [["Hủ tiếu", 0.2], ["Thịt heo", 0.06], ["Tôm", 0.04], ["Xương heo", 0.2]],
        "Mì Quảng Gà": [["Mì Quảng", 0.2], ["Thịt gà", 0.12], ["Đậu phộng", 0.02], ["Bánh đa", 0.02]],
        "Bún Riêu Cua": [["Bún tươi", 0.22], ["Cua đồng", 0.1], ["Đậu hũ", 0.05], ["Cà chua", 0.05]],
        "Bánh Cuốn Nhân Thịt": [["Bột gạo", 0.15], ["Thịt heo xay", 0.08], ["Mộc nhĩ", 0.01], ["Hành phi", 0.01]],
        "Bánh Xèo Miền Tây": [["Bột bánh xèo", 0.15], ["Tôm", 0.05], ["Thịt heo", 0.05], ["Giá đỗ", 0.05]],
        "Bánh Mì Trứng Ốp La": [["Bánh mì", 1], ["Trứng gà", 2], ["Xúc xích", 0.05], ["Rau sống", 0.01]],
        "Chè Ba Màu": [["Đậu xanh", 0.04], ["Đậu đỏ", 0.04], ["Thạch", 0.03], ["Nước cốt dừa", 0.05]],
        "Kem Dừa Tươi": [["Dừa tươi", 1], ["Sữa tươi", 0.1], ["Đậu phộng", 0.02]],
        "Bánh Flan Caramel": [["Trứng gà", 2], ["Sữa tươi", 0.1], ["Đường", 0.03]],
    };
    recipes = await ensureRecipes(recipeMap, recipes, products, materials);

    // ---------- Tài sản cố định ----------
    let assets = await get("/acc/fixed-assets");
    assets = await topUp("Tài sản cố định", "/acc/fixed-assets", assets, 5, async (i) => {
        const defs = [
            { tenTaiSan: "Tủ đông công nghiệp", loaiTaiSan: "Thiết bị bếp", nguyenGia: 45000000, ngayMua: d("2025-03-10"), thoiGianKhauHaoThang: 60 },
            { tenTaiSan: "Máy pha cà phê", loaiTaiSan: "Thiết bị pha chế", nguyenGia: 32000000, ngayMua: d("2025-06-20"), thoiGianKhauHaoThang: 48 },
            { tenTaiSan: "Điều hòa nhiệt độ", loaiTaiSan: "Thiết bị nhà hàng", nguyenGia: 18000000, ngayMua: d("2025-01-15"), thoiGianKhauHaoThang: 60 },
            { tenTaiSan: "Xe máy giao hàng", loaiTaiSan: "Phương tiện", nguyenGia: 38000000, ngayMua: d("2024-11-05"), thoiGianKhauHaoThang: 48 },
        ];
        return post("/acc/fixed-assets", { ...defs[i], dangSuDung: true });
    });

    // ---------- Nhân viên ----------
    let employees = await get("/acc/employees");
    employees = await topUp("Nhân viên", "/acc/employees", employees, 5, async (i) => {
        const defs = [
            { hoTen: "Nguyễn Văn An", chucVu: "Đầu bếp", luongCoBan: 9000000 },
            { hoTen: "Trần Thị Bình", chucVu: "Phục vụ", luongCoBan: 7000000 },
            { hoTen: "Lê Hoàng Nam", chucVu: "Thu ngân", luongCoBan: 7500000 },
        ];
        return post("/acc/employees", { ...defs[i], dangLamViec: true });
    });

    // ---------- Ca làm (trong kỳ đang mở, để tính lương) ----------
    let shifts = await get("/acc/shifts");
    shifts = await topUp("Ca làm", "/acc/shifts", shifts, 5, async (i) => {
        const emp = employees[i % employees.length];
        return post("/acc/shifts", {
            nhanVien: emp._id,
            ngayLam: d(`2026-09-0${(i % 9) + 1}`),
            gioBatDau: "08:00",
            gioKetThuc: "17:00",
        });
    });

    // ---------- Chạy tính lương cho kỳ đang mở ----------
    try {
        const payrollResult = await post("/acc/payroll/run", { period: openPeriod._id });
        console.log(`  = [Bảng lương] đã ghi ${payrollResult.soLuongDaGhi}, bỏ qua ${payrollResult.soLuongBoQua}`);
    } catch (err) {
        console.log(`  ! [Bảng lương] lỗi: ${err.message}`);
    }

    // ---------- Chạy khấu hao cho kỳ đang mở ----------
    try {
        const depResult = await post("/acc/depreciation/run", { period: openPeriod._id });
        console.log(`  = [Khấu hao] đã ghi ${depResult.posted.length}, bỏ qua ${depResult.skippedCount}`);
    } catch (err) {
        console.log(`  ! [Khấu hao] lỗi: ${err.message}`);
    }

    // ---------- Kênh bán hàng ----------
    let channels = await get("/acc/channels");
    channels = await topUp("Kênh bán hàng", "/acc/channels", channels, 5, async (i) => {
        const names = ["Tại quầy", "ShopeeFood", "GrabFood", "Baemin", "Website NomNomFood"];
        return post("/acc/channels", { tenKenh: names[i] });
    });

    // ---------- Sổ quỹ thu/chi ----------
    let transactions = await get("/transactions");
    transactions = await topUp("Sổ quỹ thu/chi", "/transactions", transactions, 5, async (i) => {
        const defs = [
            { type: "thu", category: "Doanh thu khác", amount: 1500000, description: "Thu tiền bán vé sự kiện ẩm thực" },
            { type: "chi", category: "Điện nước", amount: 3200000, description: "Thanh toán tiền điện tháng 9" },
        ];
        return post("/transactions", { ...defs[i], date: d(`2026-09-0${(i % 9) + 2}`) });
    });

    // ---------- Công nợ ----------
    let debts = await get("/debts");
    debts = await topUp("Công nợ", "/debts", debts, 5, async (i) => {
        const defs = [
            { type: "payable", partner: "Công ty TNHH Thực phẩm Sài Gòn", amount: 15000000, paidAmount: 5000000, note: "Công nợ tiền hàng tháng 9" },
            { type: "receivable", partner: "Khách sạn Rex - hợp đồng suất ăn", amount: 8000000, paidAmount: 0, note: "Hợp đồng cung cấp suất ăn văn phòng" },
            { type: "payable", partner: "Trang trại rau sạch Đà Lạt", amount: 6000000, paidAmount: 6000000, note: "Đã thanh toán đủ" },
            { type: "receivable", partner: "Công ty Sự kiện ABC", amount: 12000000, paidAmount: 4000000, note: "Tiệc công ty 200 khách" },
            { type: "payable", partner: "Công ty CP Hải sản Miền Trung", amount: 9000000, paidAmount: 0, note: "Nhập hải sản đợt tháng 9" },
        ];
        return post("/debts", { ...defs[i], dueDate: d("2026-09-30") });
    });

    // ---------- Đơn hàng mẫu để phát sinh Hóa đơn bán hàng + Hủy đơn/hoàn tiền ----------
    const users = await get("/users");
    let salesInvoices = await get("/acc/sales-invoices");
    let refunds = await get("/acc/refunds");
    const needOrders = Math.max(0, 5 - salesInvoices.length, 5 - refunds.length);

    const completedOrders = [];
    for (let i = 0; i < needOrders; i++) {
        try {
            const user = users[i % users.length];
            const product = products[i % products.length];
            const quantity = 1 + (i % 3);
            const order = await post("/orders", {
                user: user._id,
                items: [{ product: product._id, quantity, price: product.price }],
                totalPrice: product.price * quantity,
                status: "pending",
            });
            const updated = await put(`/orders/${order._id}`, { status: "completed" });
            completedOrders.push(updated);
            console.log(`  + [Đơn hàng mẫu] đã tạo & hoàn tất #${i + 1}/${needOrders}`);
        } catch (err) {
            console.log(`  ! [Đơn hàng mẫu] lỗi khi tạo #${i + 1}: ${err.message}`);
        }
    }

    salesInvoices = await get("/acc/sales-invoices");
    console.log(`  = [Hóa đơn bán hàng] tổng hiện có: ${salesInvoices.length}`);

    refunds = await topUp("Hủy đơn/hoàn tiền", "/acc/refunds", refunds, 5, async (i) => {
        const order = completedOrders[i % completedOrders.length];
        return post("/acc/refunds", {
            order: order._id,
            lyDo: "Khách yêu cầu hoàn một phần do giao thiếu món",
            soTienHoan: Math.round(order.totalPrice * 0.2),
        });
    });

    // ---------- Thuế GTGT: tính cho từng kỳ ----------
    for (const p of periods) {
        try {
            await get(`/acc/vat?period=${p._id}`);
        } catch (err) {
            console.log(`  ! [VAT] lỗi kỳ ${p.tenKy}: ${err.message}`);
        }
    }
    console.log("  = [Thuế GTGT] đã tính cho tất cả kỳ kế toán");

    console.log("== Hoàn tất thêm dữ liệu mẫu ==");
}

main().catch(err => {
    console.error("Lỗi seed:", err);
    process.exit(1);
});
