// Nghiệp vụ kho nguyên liệu: xuất kho (thủ công / tự động theo định mức khi bếp nhận nấu),
// kiểm kê điều chỉnh tồn, thẻ kho. Tồn kho và giá vốn bình quân chỉ thay đổi qua các chứng từ này
// và phiếu nhập kho (purchaseService).
const DanhMucNL = require("../models/accounting/DanhMucNL");
const PhieuXuatNL = require("../models/accounting/PhieuXuatNL");
const NguyenLieu = require("../models/accounting/NguyenLieu");
const PhieuKiemKe = require("../models/accounting/PhieuKiemKe");
const PhieuNhapKho = require("../models/accounting/PhieuNhapKho");
const DinhMucMonAn = require("../models/accounting/DinhMucMonAn");
const ButToan = require("../models/accounting/ButToan");
const Order = require("../models/Order");
const journalService = require("./journalService");
const { getAccountByCode } = require("./accountingHelpers");
const { periodForPosting } = require("./purchaseService");
const { monthKey } = require("./periodUtils");
const { assertEntriesRemovable, removeEntries } = require("./purchaseService");

const LOAI_XUAT = {
    ban_hang: { label: "Xuất bán (theo đơn hàng)", tkNo: "632" },
    che_bien: { label: "Xuất chế biến", tkNo: "632" },
    huy_hong: { label: "Xuất hủy (hư hỏng, hết hạn)", tkNo: "632" },
    noi_bo: { label: "Xuất dùng nội bộ", tkNo: "642" },
};

// Làm tròn số lượng để tránh sai số dấu phẩy động (0.1 + 0.2)
const q = (n) => Math.round(Number(n) * 1000) / 1000;

class ShortageError extends Error {
    constructor(shortages) {
        super("Không đủ nguyên liệu trong kho: " + shortages.map((s) => `${s.tenNL} (cần ${s.can} ${s.donViTinh}, tồn ${s.ton})`).join(", "));
        this.shortages = shortages;
    }
}

async function nextNumber(Model, prefix, date) {
    const p = `${prefix}-${monthKey(date).replace("-", "")}-`;
    const last = await Model.findOne({ soPhieu: new RegExp(`^${p}`) }).sort({ soPhieu: -1 }).select("soPhieu");
    return p + String(last ? Number(last.soPhieu.slice(p.length)) + 1 : 1).padStart(3, "0");
}

async function nextMaterialCode() {
    const list = await DanhMucNL.find({ maNL: /^NL\d+$/ }).select("maNL").lean();
    const max = list.reduce((m, x) => Math.max(m, Number(x.maNL.slice(2))), 0);
    return "NL" + String(max + 1).padStart(3, "0");
}

// Giá vốn bình quân sau khi một lượng hàng quay lại kho với đơn giá cho trước
function avgAfterIn(tonCu, giaCu, soLuong, donGia) {
    const tonMoi = tonCu + soLuong;
    if (tonCu <= 0 || tonMoi <= 0) return Math.round(donGia || giaCu || 0);
    return Math.round((tonCu * giaCu + soLuong * (donGia || 0)) / tonMoi);
}

// ==================== Xuất kho ====================
// lines: [{ danhMucNL, soLuong }] — dòng trùng nguyên liệu được cộng gộp
async function createIssue({ loaiXuat = "che_bien", ngay, kho, order, lyDoXuat, nguoiNhan, nguoiLap, ghiChu, lines, allowNegative = false, skipLockedPeriod = false }) {
    if (!LOAI_XUAT[loaiXuat]) throw new Error("Loại xuất kho không hợp lệ");
    const merged = new Map();
    for (const l of lines || []) {
        const sl = q(l.soLuong);
        if (!l.danhMucNL || !(sl > 0)) continue;
        merged.set(String(l.danhMucNL), q((merged.get(String(l.danhMucNL)) || 0) + sl));
    }
    if (!merged.size) throw new Error("Phiếu xuất cần ít nhất một dòng nguyên liệu có số lượng lớn hơn 0");
    const ngayXuat = ngay ? new Date(ngay) : new Date();

    const materials = await DanhMucNL.find({ _id: { $in: [...merged.keys()] } });
    if (materials.length !== merged.size) throw new Error("Có nguyên liệu không còn trong danh mục");
    const shortages = [];
    for (const m of materials) {
        const can = merged.get(String(m._id));
        const ton = q(m.tonHienTai || 0);
        if (can > ton) shortages.push({ danhMucNL: m._id, tenNL: m.tenNL, donViTinh: m.donViTinh || "", can, ton, thieu: q(can - ton) });
    }
    if (shortages.length && !allowNegative) throw new ShortageError(shortages);

    // Kỳ kế toán: xuất bán theo đơn không bị chặn bởi kỳ đã khóa (vẫn trừ kho, chỉ không ghi sổ)
    let period = null, periodNote = "";
    try { period = await periodForPosting(ngayXuat); }
    catch (err) { if (!skipLockedPeriod) throw err; periodNote = `Chưa ghi sổ: ${err.message}`; }

    const issue = await PhieuXuatNL.create({
        soPhieu: await nextNumber(PhieuXuatNL, "PX", ngayXuat), loaiXuat,
        kho: kho || (new Set(materials.map((m) => String(m.kho))).size === 1 ? materials[0].kho : null),
        order: order || null, ngayXuat, createdAt: ngayXuat,
        lyDoXuat: lyDoXuat || LOAI_XUAT[loaiXuat].label, nguoiNhan: nguoiNhan || "", nguoiLap: nguoiLap || "",
        amKho: shortages.length > 0, ghiChu: [ghiChu, periodNote].filter(Boolean).join(" · "),
    });

    let tongTien = 0;
    const docs = [];
    for (const m of materials) {
        const soLuong = merged.get(String(m._id));
        const donGia = Math.round(m.giaVonBinhQuan || 0);
        const thanhTien = Math.round(soLuong * donGia);
        docs.push({ danhMucNL: m._id, phieuXuat: issue._id, soLuong, donGia, thanhTien, tonTruoc: q(m.tonHienTai || 0), createdAt: ngayXuat });
        tongTien += thanhTien;
        m.tonHienTai = q((m.tonHienTai || 0) - soLuong);
        await m.save();
    }
    await NguyenLieu.insertMany(docs);
    issue.tongTien = tongTien;

    if (period && tongTien > 0) {
        const [tkNo, tk152] = await Promise.all([getAccountByCode(LOAI_XUAT[loaiXuat].tkNo), getAccountByCode("152")]);
        const entry = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi: ngayXuat, nguon: "kho", nguonId: issue._id,
            noiDung: `${issue.soPhieu}: ${issue.lyDoXuat}`, tkNo: tkNo._id, tkCo: tk152._id, soTien: tongTien,
        });
        issue.butToan = entry._id;
    }
    await issue.save();
    return issue;
}

// Xóa phiếu xuất: hoàn nguyên liệu về kho, xóa bút toán
async function deleteIssue(id) {
    const issue = await PhieuXuatNL.findById(id);
    if (!issue) throw new Error("Không tìm thấy phiếu xuất");
    const entries = await ButToan.find({ $or: [{ _id: issue.butToan }, { nguonId: issue._id }] });
    await assertEntriesRemovable(entries, "Phiếu xuất");
    const lines = await NguyenLieu.find({ phieuXuat: issue._id });
    for (const l of lines) {
        const m = await DanhMucNL.findById(l.danhMucNL);
        if (!m) continue;
        m.giaVonBinhQuan = avgAfterIn(m.tonHienTai || 0, m.giaVonBinhQuan || 0, l.soLuong, l.donGia ?? m.giaVonBinhQuan);
        m.tonHienTai = q((m.tonHienTai || 0) + l.soLuong);
        await m.save();
    }
    await removeEntries(entries);
    await NguyenLieu.deleteMany({ phieuXuat: issue._id });
    if (issue.order) await Order.updateOne({ _id: issue.order, xuatKho: issue._id }, { $set: { xuatKho: null } });
    await issue.deleteOne();
}

// ==================== Xuất kho theo đơn hàng (định mức món ăn) ====================
async function orderRequirement(order) {
    const items = (order.items || []).filter((i) => i.product);
    const productIds = items.map((i) => i.product._id || i.product);
    const recipes = await DinhMucMonAn.find({ product: { $in: productIds } }).lean();
    const byProduct = new Map();
    for (const r of recipes) {
        const k = String(r.product);
        if (!byProduct.has(k)) byProduct.set(k, []);
        byProduct.get(k).push(r);
    }
    const lines = [], missingRecipe = [];
    for (const it of items) {
        const pid = String(it.product._id || it.product);
        const rs = byProduct.get(pid);
        if (!rs?.length) { missingRecipe.push(it.product.name || pid); continue; }
        for (const r of rs) lines.push({ danhMucNL: r.danhMucNL, soLuong: q(r.dinhLuong * it.quantity) });
    }
    return { lines, missingRecipe };
}

// Bếp nhận nấu: trừ kho theo định mức. Trả về { issue, missingRecipe }; thiếu nguyên liệu → ShortageError (trừ khi force)
async function issueForOrder(orderId, { force = false, nguoiLap = "" } = {}) {
    const order = await Order.findById(orderId).populate("items.product", "name");
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    if (order.xuatKho && await PhieuXuatNL.exists({ _id: order.xuatKho })) return { issue: null, already: true, missingRecipe: [] };
    const { lines, missingRecipe } = await orderRequirement(order);
    if (!lines.length) return { issue: null, missingRecipe };
    const shortId = String(order._id).slice(-6).toUpperCase();
    const issue = await createIssue({
        loaiXuat: "ban_hang", order: order._id, lines, allowNegative: force, skipLockedPeriod: true,
        lyDoXuat: `Xuất chế biến đơn hàng #${shortId}`, nguoiNhan: "Bếp", nguoiLap,
        ghiChu: missingRecipe.length ? `Món chưa có định mức: ${missingRecipe.join(", ")}` : "",
    });
    await Order.updateOne({ _id: order._id }, { $set: { xuatKho: issue._id } });
    return { issue, missingRecipe };
}

// ==================== Kiểm kê ====================
async function createStocktake({ ngay, kho, nguoiKiem, ghiChu, lines }) {
    const ngayKK = ngay ? new Date(ngay) : new Date();
    const period = await periodForPosting(ngayKK);
    const input = (lines || []).filter((l) => l.danhMucNL && l.tonThucTe !== "" && l.tonThucTe !== null && l.tonThucTe !== undefined);
    if (!input.length) throw new Error("Nhập số lượng thực tế cho ít nhất một nguyên liệu");
    const materials = await DanhMucNL.find({ _id: { $in: input.map((l) => l.danhMucNL) } });
    const byId = new Map(materials.map((m) => [String(m._id), m]));

    const chiTiet = [];
    for (const l of input) {
        const m = byId.get(String(l.danhMucNL));
        if (!m) continue;
        const tonThucTe = q(l.tonThucTe);
        if (!(tonThucTe >= 0)) throw new Error(`${m.tenNL}: số lượng thực tế không hợp lệ`);
        const tonSoSach = q(m.tonHienTai || 0);
        const chenhLech = q(tonThucTe - tonSoSach);
        const donGia = Math.round(m.giaVonBinhQuan || 0);
        chiTiet.push({
            danhMucNL: m._id, tenNL: m.tenNL, donViTinh: m.donViTinh || "", tonSoSach, tonThucTe, chenhLech,
            donGia, giaTriChenhLech: Math.sign(chenhLech) * Math.round(Math.abs(chenhLech) * donGia), // làm tròn đối xứng cho số âm lyDo: (l.lyDo || "").trim(),
        });
    }
    const giaTriThieu = -chiTiet.filter((c) => c.chenhLech < 0).reduce((s, c) => s + c.giaTriChenhLech, 0);
    const giaTriThua = chiTiet.filter((c) => c.chenhLech > 0).reduce((s, c) => s + c.giaTriChenhLech, 0);

    const phieu = await PhieuKiemKe.create({
        soPhieu: await nextNumber(PhieuKiemKe, "KK", ngayKK), ngay: ngayKK, kho: kho || null,
        nguoiKiem: nguoiKiem || "", ghiChu: ghiChu || "", chiTiet, giaTriThieu, giaTriThua, createdAt: ngayKK,
    });
    for (const c of chiTiet) {
        if (!c.chenhLech) continue;
        await DanhMucNL.updateOne({ _id: c.danhMucNL }, { $set: { tonHienTai: c.tonThucTe } });
    }
    const [tk152, tk632, tk711] = await Promise.all(["152", "632", "711"].map(getAccountByCode));
    const ids = [];
    if (giaTriThieu > 0) {
        ids.push((await journalService.postButToan({
            kyKeToan: period._id, ngayGhi: ngayKK, nguon: "kho", nguonId: phieu._id,
            noiDung: `${phieu.soPhieu}: Nguyên liệu thiếu khi kiểm kê`, tkNo: tk632._id, tkCo: tk152._id, soTien: giaTriThieu,
        }))._id);
    }
    if (giaTriThua > 0) {
        ids.push((await journalService.postButToan({
            kyKeToan: period._id, ngayGhi: ngayKK, nguon: "kho", nguonId: phieu._id,
            noiDung: `${phieu.soPhieu}: Nguyên liệu thừa khi kiểm kê`, tkNo: tk152._id, tkCo: tk711._id, soTien: giaTriThua,
        }))._id);
    }
    phieu.butToan = ids;
    await phieu.save();
    return phieu;
}

async function deleteStocktake(id) {
    const phieu = await PhieuKiemKe.findById(id);
    if (!phieu) throw new Error("Không tìm thấy phiếu kiểm kê");
    const entries = await ButToan.find({ nguonId: phieu._id });
    await assertEntriesRemovable(entries, "Phiếu kiểm kê");
    for (const c of phieu.chiTiet) {
        if (!c.chenhLech) continue;
        const m = await DanhMucNL.findById(c.danhMucNL);
        if (!m) continue;
        m.tonHienTai = q((m.tonHienTai || 0) - c.chenhLech);
        await m.save();
    }
    await removeEntries(entries);
    await phieu.deleteOne();
}

// ==================== Thẻ kho ====================
// Dựng từ chứng từ gốc (phiếu nhập, phiếu xuất, kiểm kê); tồn đầu = tồn hiện tại - tổng phát sinh
async function stockCard(materialId, from, to) {
    const m = await DanhMucNL.findById(materialId).populate("kho").lean();
    if (!m) throw new Error("Không tìm thấy nguyên liệu");
    const moves = [];

    const receipts = await PhieuNhapKho.find({ "chiTiet.danhMucNL": m._id }).populate("ncc", "tenNCC").lean();
    for (const r of receipts) {
        for (const l of r.chiTiet.filter((x) => String(x.danhMucNL) === String(m._id))) {
            moves.push({
                ngay: r.ngayNhap || r.createdAt, loai: "nhap", chungTu: r.soPhieu || "Phiếu nhập", chungTuId: r._id,
                dienGiai: `Nhập mua${r.ncc ? " — " + r.ncc.tenNCC : ""}`, nhap: l.soLuongThucNhap, xuat: 0,
                donGia: l.donGia, giaTri: l.thanhTien,
            });
        }
    }
    const issueLines = await NguyenLieu.find({ danhMucNL: m._id }).populate("phieuXuat").lean();
    for (const l of issueLines) {
        const p = l.phieuXuat;
        if (!p) continue;
        moves.push({
            ngay: p.ngayXuat || p.createdAt, loai: "xuat", loaiXuat: p.loaiXuat || "che_bien",
            chungTu: p.soPhieu || "PX-" + String(p._id).slice(-6).toUpperCase(), chungTuId: p._id,
            dienGiai: p.lyDoXuat || "Xuất kho", nhap: 0, xuat: l.soLuong,
            donGia: l.donGia ?? null, giaTri: l.thanhTien ?? null,
        });
    }
    const takes = await PhieuKiemKe.find({ "chiTiet.danhMucNL": m._id }).lean();
    for (const t of takes) {
        for (const c of t.chiTiet.filter((x) => String(x.danhMucNL) === String(m._id) && x.chenhLech)) {
            moves.push({
                ngay: t.ngay, loai: "kiem_ke", chungTu: t.soPhieu, chungTuId: t._id,
                dienGiai: `Kiểm kê ${c.chenhLech < 0 ? "thiếu" : "thừa"}${c.lyDo ? " — " + c.lyDo : ""}`,
                nhap: c.chenhLech > 0 ? c.chenhLech : 0, xuat: c.chenhLech < 0 ? -c.chenhLech : 0,
                donGia: c.donGia, giaTri: Math.abs(c.giaTriChenhLech),
            });
        }
    }
    moves.sort((a, b) => new Date(a.ngay) - new Date(b.ngay));

    const net = moves.reduce((s, x) => s + x.nhap - x.xuat, 0);
    let ton = q((m.tonHienTai || 0) - net); // tồn trước chứng từ đầu tiên được theo dõi
    const fromD = from ? new Date(from) : null, toD = to ? new Date(to) : null;
    const rows = [];
    let tonDau = null, tongNhap = 0, tongXuat = 0;
    for (const x of moves) {
        const d = new Date(x.ngay);
        if (fromD && d < fromD) { ton = q(ton + x.nhap - x.xuat); continue; }
        if (toD && d > toD) break;
        if (tonDau === null) tonDau = ton;
        ton = q(ton + x.nhap - x.xuat);
        tongNhap += x.nhap; tongXuat += x.xuat;
        rows.push({ ...x, ton });
    }
    if (tonDau === null) tonDau = ton;

    const recipes = await DinhMucMonAn.find({ danhMucNL: m._id }).populate("product", "name price").lean();
    return {
        material: m, tonDau, tonCuoi: rows.length ? rows[rows.length - 1].ton : tonDau,
        tongNhap: q(tongNhap), tongXuat: q(tongXuat), rows,
        monSuDung: recipes.filter((r) => r.product).map((r) => ({ _id: r.product._id, name: r.product.name, dinhLuong: r.dinhLuong })),
    };
}

// ==================== Đối chiếu kho ↔ sổ cái TK 152 ====================
const NGUONG_LECH = 1000; // chênh lệch do làm tròn giá bình quân dưới mức này coi như khớp

async function balance152() {
    const tk152 = await getAccountByCode("152");
    const [r] = await ButToan.aggregate([
        { $match: { $or: [{ tkNo: tk152._id }, { tkCo: tk152._id }] } },
        { $group: { _id: null, no: { $sum: { $cond: [{ $eq: ["$tkNo", tk152._id] }, "$soTien", 0] } }, co: { $sum: { $cond: [{ $eq: ["$tkCo", tk152._id] }, "$soTien", 0] } } } },
    ]);
    return (r?.no || 0) - (r?.co || 0);
}

async function reconcile() {
    const mats = await DanhMucNL.find().lean();
    const giaTriKho = Math.round(mats.reduce((s, m) => s + (m.tonHienTai || 0) * (m.giaVonBinhQuan || 0), 0));
    const soDu152 = await balance152();
    const chenhLech = giaTriKho - soDu152;
    return { giaTriKho, soDu152, chenhLech, khop: Math.abs(chenhLech) < NGUONG_LECH, nguong: NGUONG_LECH };
}

// Ghi bút toán điều chỉnh để sổ cái TK 152 khớp giá trị tồn kho thực tế (theo danh mục / kiểm kê)
//   Kho > sổ: Nợ 152 / Có 411 (tồn kho có sẵn chưa từng hạch toán) · Kho < sổ: Nợ 632 / Có 152 (hao hụt chưa ghi nhận)
async function postReconcile({ nguoiLap = "" } = {}) {
    const r = await reconcile();
    if (r.khop) throw new Error("Kho và sổ cái TK 152 đã khớp, không cần điều chỉnh");
    const ngay = new Date();
    const period = await periodForPosting(ngay);
    const [tk152, tk411, tk632] = await Promise.all(["152", "411", "632"].map(getAccountByCode));
    const tang = r.chenhLech > 0;
    const entry = await journalService.postButToan({
        kyKeToan: period._id, ngayGhi: ngay, nguon: "kho", nguonId: null,
        noiDung: tang
            ? `Đối chiếu kho: ghi bổ sung giá trị tồn kho nguyên liệu chưa hạch toán${nguoiLap ? " (" + nguoiLap + ")" : ""}`
            : `Đối chiếu kho: ghi nhận hao hụt nguyên liệu chưa hạch toán${nguoiLap ? " (" + nguoiLap + ")" : ""}`,
        tkNo: tang ? tk152._id : tk632._id, tkCo: tang ? tk411._id : tk152._id, soTien: Math.abs(r.chenhLech),
    });
    return { ...r, butToan: entry._id, dinhKhoan: tang ? "Nợ 152 / Có 411" : "Nợ 632 / Có 152" };
}

// Tồn đầu kỳ khai khi thêm nguyên liệu mới: Nợ 152 / Có 411
async function postOpeningStock(material) {
    const giaTri = Math.round((material.tonHienTai || 0) * (material.giaVonBinhQuan || 0));
    if (giaTri <= 0) return null;
    const ngay = new Date();
    const period = await periodForPosting(ngay);
    const [tk152, tk411] = await Promise.all(["152", "411"].map(getAccountByCode));
    return journalService.postButToan({
        kyKeToan: period._id, ngayGhi: ngay, nguon: "kho", nguonId: material._id,
        noiDung: `Tồn đầu kỳ nguyên liệu ${material.maNL} ${material.tenNL}: ${material.tonHienTai} ${material.donViTinh || ""}`,
        tkNo: tk152._id, tkCo: tk411._id, soTien: giaTri,
    });
}

async function removeOpeningStock(materialId) {
    const entries = await ButToan.find({ nguonId: materialId, nguon: "kho" });
    await assertEntriesRemovable(entries, "Tồn đầu kỳ của nguyên liệu");
    await removeEntries(entries);
}

module.exports = {
    reconcile, postReconcile, postOpeningStock, removeOpeningStock,
    LOAI_XUAT, ShortageError, nextMaterialCode, avgAfterIn,
    createIssue, deleteIssue, orderRequirement, issueForOrder,
    createStocktake, deleteStocktake, stockCard,
};
