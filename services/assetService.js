// Tài sản cố định: ghi tăng (Nợ 211), khấu hao đường thẳng theo tháng (Nợ 642/632 / Có 214), thanh lý.
// Hao mòn lũy kế của từng tài sản lấy trực tiếp từ sổ (bút toán TK 214 gắn với tài sản) để luôn khớp sổ cái.
const TaiSanCoDinh = require("../models/accounting/TaiSanCoDinh");
const KhauHao = require("../models/accounting/KhauHao");
const KyKeToan = require("../models/accounting/KyKeToan");
const ButToan = require("../models/accounting/ButToan");
const Debt = require("../models/Debt");
const journalService = require("./journalService");
const { getAccountByCode } = require("./accountingHelpers");
const { periodForPosting, assertEntriesRemovable, removeEntries } = require("./purchaseService");
const { monthKey, monthRange } = require("./periodUtils");

const NGUONG_TSCD = 30000000; // TT45/2013: nguyên giá từ 30 triệu đồng trở lên
const NHOM = {
    thiet_bi_bep: { label: "Máy móc, thiết bị bếp", thang: 60 },
    thiet_bi_pha_che: { label: "Thiết bị quầy bar, pha chế", thang: 48 },
    thiet_bi_lanh: { label: "Hệ thống lạnh, điều hòa", thang: 60 },
    noi_that: { label: "Bàn ghế, nội thất, trang trí", thang: 60 },
    phuong_tien: { label: "Phương tiện vận chuyển, giao hàng", thang: 72 },
    thiet_bi_quan_ly: { label: "Thiết bị quản lý (POS, máy tính, camera)", thang: 36 },
    nha_cua: { label: "Nhà cửa, cải tạo mặt bằng", thang: 120 },
    khac: { label: "Tài sản khác", thang: 60 },
};

const idx = (key) => { const [y, m] = key.split("-").map(Number); return y * 12 + m - 1; };
const keyOf = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

async function accounts(...codes) {
    const list = await Promise.all(codes.map(getAccountByCode));
    list.forEach((a, i) => { if (!a) throw new Error(`Thiếu tài khoản ${codes[i]} trong hệ thống tài khoản`); });
    return list;
}

// Hao mòn lũy kế theo sổ: Có 214 - Nợ 214 của các bút toán gắn với tài sản
async function ledgerHaoMon(assetIds) {
    const tk214 = await getAccountByCode("214");
    const rows = await ButToan.aggregate([
        { $match: { nguonId: { $in: assetIds }, $or: [{ tkCo: tk214._id }, { tkNo: tk214._id }] } },
        { $group: { _id: "$nguonId", co: { $sum: { $cond: [{ $eq: ["$tkCo", tk214._id] }, "$soTien", 0] } }, no: { $sum: { $cond: [{ $eq: ["$tkNo", tk214._id] }, "$soTien", 0] } } } },
    ]);
    return new Map(rows.map((r) => [String(r._id), r.co - r.no]));
}

// Số khấu hao của tài sản trong một tháng (chưa tính đã ghi sổ hay chưa)
function depreciationFor(asset, periodKey, haoMonTruoc) {
    if (asset.trangThai === "thanh_ly") return { soTien: 0, lyDo: "Đã thanh lý" };
    if (asset.trangThai === "tam_ngung") return { soTien: 0, lyDo: "Tạm ngừng sử dụng" };
    const start = monthKey(asset.ngayMua);
    if (idx(periodKey) < idx(start)) return { soTien: 0, lyDo: "Chưa đến tháng bắt đầu khấu hao" };
    const conLai = asset.nguyenGia - haoMonTruoc;
    if (conLai <= 0) return { soTien: 0, lyDo: "Đã khấu hao hết" };
    const thangThu = idx(periodKey) - idx(start) + 1;
    const muc = Math.round(asset.nguyenGia / asset.thoiGianKhauHaoThang);
    const soTien = thangThu >= asset.thoiGianKhauHaoThang ? conLai : Math.min(muc, conLai);
    return { soTien, thangThu };
}

async function nextAssetCode() {
    const list = await TaiSanCoDinh.find({ maTS: /^TS\d+$/ }).select("maTS").lean();
    return "TS" + String(list.reduce((m, x) => Math.max(m, Number(x.maTS.slice(2))), 0) + 1).padStart(3, "0");
}

// ==================== Danh sách ====================
async function listAssets() {
    const assets = await TaiSanCoDinh.find().sort({ maTS: 1, ngayMua: 1 }).lean();
    const hm = await ledgerHaoMon(assets.map((a) => a._id));
    const thisKey = monthKey(new Date());
    const thisPeriod = await KyKeToan.findOne({ thang: thisKey }).lean();
    const khThisMonth = thisPeriod ? await KhauHao.find({ kyKeToan: thisPeriod._id }).lean() : [];
    const postedNow = new Map(khThisMonth.map((k) => [String(k.taiSan), k.soTienKhauHao]));
    const counts = new Map((await KhauHao.aggregate([{ $group: { _id: "$taiSan", n: { $sum: 1 } } }])).map((c) => [String(c._id), c.n]));
    return assets.map((a) => {
        const daThanhLy = a.trangThai === "thanh_ly";
        const haoMon = daThanhLy ? (a.thanhLy?.haoMon || 0) : (hm.get(String(a._id)) || 0);
        const daGhi = postedNow.get(String(a._id));
        const truoc = haoMon - (daGhi || 0);
        const thangNay = daGhi ?? depreciationFor(a, thisKey, truoc).soTien;
        const start = monthKey(a.ngayMua);
        return {
            ...a, nhomLabel: NHOM[a.nhom]?.label || a.loaiTaiSan || "",
            haoMonLuyKe: haoMon, giaTriConLai: daThanhLy ? 0 : a.nguyenGia - haoMon,
            mucKhauHaoThang: Math.round(a.nguyenGia / a.thoiGianKhauHaoThang),
            khauHaoThangNay: thangNay, daGhiThangNay: daGhi !== undefined, soKyDaTrich: counts.get(String(a._id)) || 0,
            thangKetThuc: keyOf(idx(start) + a.thoiGianKhauHaoThang - 1),
            duoiNguong: a.nguyenGia < NGUONG_TSCD,
        };
    });
}

// Bảng khấu hao chi tiết của một tài sản: đã ghi sổ + kế hoạch các tháng còn lại
async function assetDetail(id) {
    const a = await TaiSanCoDinh.findById(id).populate("congNo").lean();
    if (!a) throw new Error("Không tìm thấy tài sản cố định");
    const [list] = (await listAssets()).filter((x) => String(x._id) === String(a._id));
    const kh = await KhauHao.find({ taiSan: a._id }).populate("kyKeToan", "thang tenKy").lean();
    kh.sort((x, y) => idx(x.kyKeToan?.thang || "0-01") - idx(y.kyKeToan?.thang || "0-01"));
    const daTrich = kh.reduce((s, k) => s + k.soTienKhauHao, 0);
    const haoMon = a.trangThai === "thanh_ly" ? (a.thanhLy?.haoMon || 0) : list.haoMonLuyKe;
    const truocTheoDoi = Math.max(0, haoMon - daTrich);

    const rows = [];
    let luyKe = truocTheoDoi;
    for (const k of kh) {
        luyKe += k.soTienKhauHao;
        rows.push({ thang: k.kyKeToan?.thang, tenKy: k.kyKeToan?.tenKy, soTien: k.soTienKhauHao, luyKe, conLai: a.nguyenGia - luyKe, trangThai: "da_ghi", ngay: k.ngayGhiNhan });
    }
    if (a.trangThai !== "thanh_ly" && a.trangThai !== "tam_ngung") {
        const thisIdx = idx(monthKey(new Date()));
        const lastPosted = kh.length ? idx(kh[kh.length - 1].kyKeToan.thang) : null;
        let i = lastPosted !== null ? lastPosted + 1 : Math.max(idx(monthKey(a.ngayMua)), truocTheoDoi > 0 ? thisIdx : 0);
        for (let guard = 0; luyKe < a.nguyenGia && guard < 600; guard++, i++) {
            const { soTien } = depreciationFor({ ...a, trangThai: "dang_su_dung" }, keyOf(i), luyKe);
            if (!soTien) break;
            luyKe += soTien;
            rows.push({ thang: keyOf(i), soTien, luyKe, conLai: a.nguyenGia - luyKe, trangThai: i < thisIdx ? "chua_trich" : "ke_hoach" });
        }
    }
    const entries = await ButToan.find({ nguonId: a._id }).populate("tkNo tkCo", "soHieuTK").sort({ ngayGhi: 1 }).lean();
    return { ...list, ...a, truocTheoDoi, lich: rows, butToan: entries };
}

// ==================== Ghi tăng / sửa / xóa ====================
async function postAcquisition(asset) {
    if (asset.nguonHinhThanh === "khong_ghi_so") return;
    let ngay = new Date(asset.ngayMua), period;
    try { period = await periodForPosting(ngay); }
    catch (err) {
        if (asset.nguonHinhThanh !== "411") throw new Error(`${err.message}. Tài sản mua trong kỳ đã khóa: chọn nguồn "Có từ trước / góp vốn (TK 411)" để ghi nhận vào kỳ hiện tại`);
        ngay = new Date();
        period = await periodForPosting(ngay);
    }
    const [tk211, tkNguon] = await accounts("211", asset.nguonHinhThanh);
    const ids = [];
    const label = { 111: "trả tiền mặt", 112: "chuyển khoản", 331: "mua chịu", 411: "góp vốn / có từ trước" }[asset.nguonHinhThanh];
    ids.push((await journalService.postButToan({
        kyKeToan: period._id, ngayGhi: ngay, nguon: "tai_san", nguonId: asset._id,
        noiDung: `Ghi tăng TSCĐ ${asset.maTS} ${asset.tenTaiSan} (${label})`, tkNo: tk211._id, tkCo: tkNguon._id, soTien: asset.nguyenGia,
    }))._id);
    if (asset.nguonHinhThanh === "411" && asset.haoMonDauKy > 0) {
        const [tk214] = await accounts("214");
        ids.push((await journalService.postButToan({
            kyKeToan: period._id, ngayGhi: ngay, nguon: "tai_san", nguonId: asset._id,
            noiDung: `Hao mòn lũy kế đầu kỳ TSCĐ ${asset.maTS} ${asset.tenTaiSan}`, tkNo: tkNguon._id, tkCo: tk214._id, soTien: asset.haoMonDauKy,
        }))._id);
    }
    asset.butToanGhiTang = ids;
    if (asset.nguonHinhThanh === "331") {
        const debt = await Debt.create({
            type: "payable", partner: asset.nhaCungCap || "Nhà cung cấp TSCĐ", amount: asset.nguyenGia,
            note: `Mua TSCĐ ${asset.maTS} ${asset.tenTaiSan}${asset.soChungTu ? " - HĐ " + asset.soChungTu : ""}`, butToan: ids[0],
        });
        asset.congNo = debt._id;
    }
}

async function unpostAcquisition(asset) {
    if (asset.congNo) {
        const d = await Debt.findById(asset.congNo);
        if (d && d.paidAmount > 0) throw new Error("Công nợ mua tài sản đã được thanh toán một phần, hãy hủy phiếu chi trước");
        if (d) await d.deleteOne();
        asset.congNo = null;
    }
    const entries = await ButToan.find({ _id: { $in: asset.butToanGhiTang || [] } });
    await assertEntriesRemovable(entries, "Bút toán ghi tăng tài sản");
    await removeEntries(entries);
    asset.butToanGhiTang = [];
}

const PLAIN = ["maTS", "tenTaiSan", "nhom", "loaiTaiSan", "boPhan", "viTri", "nhanHieu", "soSeri", "nuocSanXuat", "nhaCungCap", "soChungTu", "ghiChu", "tkChiPhi"];
function pick(body) {
    const d = {};
    for (const k of PLAIN) if (body[k] !== undefined) d[k] = typeof body[k] === "string" ? body[k].trim() : body[k];
    if (body.baoHanhDen !== undefined) d.baoHanhDen = body.baoHanhDen || null;
    if (body.thoiGianKhauHaoThang !== undefined) d.thoiGianKhauHaoThang = Math.round(Number(body.thoiGianKhauHaoThang));
    return d;
}
function pickMoney(body) {
    return {
        nguyenGia: Math.round(Number(body.nguyenGia)), ngayMua: new Date(body.ngayMua),
        nguonHinhThanh: body.nguonHinhThanh || "khong_ghi_so", haoMonDauKy: Math.max(0, Math.round(Number(body.haoMonDauKy) || 0)),
    };
}
function validate(a) {
    if (!a.tenTaiSan) throw new Error("Vui lòng nhập tên tài sản");
    if (!(a.nguyenGia > 0)) throw new Error("Nguyên giá phải lớn hơn 0");
    if (isNaN(new Date(a.ngayMua))) throw new Error("Ngày đưa vào sử dụng không hợp lệ");
    if (!(a.thoiGianKhauHaoThang > 0)) throw new Error("Thời gian khấu hao phải lớn hơn 0 tháng");
    if (a.haoMonDauKy >= a.nguyenGia) throw new Error("Hao mòn lũy kế đầu kỳ phải nhỏ hơn nguyên giá");
    if (a.haoMonDauKy > 0 && a.nguonHinhThanh !== "411") throw new Error("Hao mòn đầu kỳ chỉ áp dụng cho tài sản có từ trước (TK 411)");
}

async function createAsset(body) {
    const data = { ...pick(body), ...pickMoney(body) };
    if (!data.maTS) data.maTS = await nextAssetCode();
    else if (await TaiSanCoDinh.exists({ maTS: data.maTS })) throw new Error(`Mã tài sản ${data.maTS} đã tồn tại`);
    validate(data);
    const asset = new TaiSanCoDinh(data);
    await postAcquisition(asset);
    await asset.save();
    return asset;
}

async function updateAsset(id, body) {
    const asset = await TaiSanCoDinh.findById(id);
    if (!asset) throw new Error("Không tìm thấy tài sản cố định");
    if (asset.trangThai === "thanh_ly") throw new Error("Tài sản đã thanh lý, hãy hủy thanh lý trước khi sửa");
    const plain = pick(body);
    if (plain.maTS && plain.maTS !== asset.maTS && await TaiSanCoDinh.exists({ maTS: plain.maTS })) throw new Error(`Mã tài sản ${plain.maTS} đã tồn tại`);
    const money = body.nguyenGia !== undefined ? pickMoney(body) : null;
    const moneyChanged = money && (money.nguyenGia !== asset.nguyenGia || +money.ngayMua !== +asset.ngayMua
        || money.nguonHinhThanh !== asset.nguonHinhThanh || money.haoMonDauKy !== (asset.haoMonDauKy || 0));
    if (moneyChanged && await KhauHao.exists({ taiSan: asset._id })) {
        throw new Error("Tài sản đã trích khấu hao, không thể sửa nguyên giá / ngày sử dụng / nguồn hình thành");
    }
    Object.assign(asset, plain);
    if (["dang_su_dung", "tam_ngung"].includes(body.trangThai) && asset.trangThai !== "het_khau_hao") asset.trangThai = body.trangThai;
    if (moneyChanged) {
        await unpostAcquisition(asset);
        Object.assign(asset, money);
        validate(asset);
        await postAcquisition(asset);
    }
    validate(asset);
    await asset.save();
    return asset;
}

async function deleteAsset(id) {
    const asset = await TaiSanCoDinh.findById(id);
    if (!asset) throw new Error("Không tìm thấy tài sản cố định");
    if (asset.trangThai === "thanh_ly") throw new Error("Tài sản đã thanh lý, hãy hủy thanh lý trước khi xóa");
    if (await KhauHao.exists({ taiSan: asset._id })) throw new Error("Tài sản đã trích khấu hao, không thể xóa (có thể thanh lý hoặc hủy khấu hao các kỳ trước)");
    await unpostAcquisition(asset);
    await asset.deleteOne();
}

// ==================== Khấu hao theo kỳ ====================
async function previewPeriod(periodId) {
    const period = await KyKeToan.findById(periodId).lean();
    if (!period) throw new Error("Không tìm thấy kỳ kế toán");
    const assets = await TaiSanCoDinh.find().sort({ maTS: 1 }).lean();
    const hm = await ledgerHaoMon(assets.map((a) => a._id));
    const posted = new Map((await KhauHao.find({ kyKeToan: period._id }).lean()).map((k) => [String(k.taiSan), k]));
    const rows = assets.map((a) => {
        const p = posted.get(String(a._id));
        const haoMon = a.trangThai === "thanh_ly" ? (a.thanhLy?.haoMon || 0) : (hm.get(String(a._id)) || 0);
        const truoc = haoMon - (p?.soTienKhauHao || 0);
        const calc = p ? { soTien: p.soTienKhauHao } : depreciationFor(a, period.thang, truoc);
        return {
            _id: a._id, maTS: a.maTS, tenTaiSan: a.tenTaiSan, boPhan: a.boPhan, nhom: a.nhom, tkChiPhi: a.tkChiPhi || "642",
            nguyenGia: a.nguyenGia, haoMonDauKy: truoc, soTien: calc.soTien, lyDo: calc.lyDo || "",
            haoMonCuoiKy: truoc + calc.soTien, giaTriConLai: a.nguyenGia - truoc - calc.soTien, daGhi: !!p,
        };
    }).filter((r) => r.daGhi || r.soTien > 0 || r.lyDo !== "Đã thanh lý");
    return { period, rows, daGhi: posted.size > 0, tong: rows.reduce((s, r) => s + r.soTien, 0) };
}

async function runPeriod(periodId) {
    const { period, rows } = await previewPeriod(periodId);
    const { end } = monthRange(period.thang);
    const ngayGhi = new Date(Math.min(Date.now(), end.getTime()));
    await periodForPosting(ngayGhi);
    const tk214 = (await accounts("214"))[0];
    const tkCp = { 642: (await accounts("642"))[0], 632: (await accounts("632"))[0] };
    const posted = [];
    for (const r of rows.filter((x) => !x.daGhi && x.soTien > 0)) {
        const entry = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi, nguon: "khau_hao", nguonId: r._id,
            noiDung: `Khấu hao TSCĐ ${r.maTS} ${r.tenTaiSan} — ${period.tenKy}`, tkNo: tkCp[r.tkChiPhi]._id, tkCo: tk214._id, soTien: r.soTien,
        });
        await KhauHao.create({ taiSan: r._id, kyKeToan: period._id, soTienKhauHao: r.soTien, butToan: entry._id, ngayGhiNhan: ngayGhi });
        if (r.giaTriConLai <= 0) await TaiSanCoDinh.updateOne({ _id: r._id }, { trangThai: "het_khau_hao" });
        posted.push(r);
    }
    if (!posted.length) throw new Error(`Không có tài sản nào cần trích khấu hao trong ${period.tenKy}`);
    return { posted: posted.length, tong: posted.reduce((s, r) => s + r.soTien, 0) };
}

async function cancelPeriod(periodId) {
    const list = await KhauHao.find({ kyKeToan: periodId });
    if (!list.length) throw new Error("Kỳ này chưa trích khấu hao");
    const entries = await ButToan.find({ _id: { $in: list.map((k) => k.butToan).filter(Boolean) } });
    await assertEntriesRemovable(entries, "Khấu hao");
    await removeEntries(entries);
    await KhauHao.deleteMany({ _id: { $in: list.map((k) => k._id) } });
    await TaiSanCoDinh.updateMany({ _id: { $in: list.map((k) => k.taiSan) }, trangThai: "het_khau_hao" }, { trangThai: "dang_su_dung" });
    return { removed: list.length };
}

// Tổng hợp khấu hao các kỳ
async function depreciationHistory() {
    return KhauHao.aggregate([
        { $group: { _id: "$kyKeToan", soTaiSan: { $sum: 1 }, tong: { $sum: "$soTienKhauHao" }, ngay: { $max: "$ngayGhiNhan" } } },
        { $lookup: { from: "kyketoans", localField: "_id", foreignField: "_id", as: "ky" } },
        { $unwind: "$ky" }, { $sort: { "ky.thang": -1 } },
        { $project: { soTaiSan: 1, tong: 1, ngay: 1, thang: "$ky.thang", tenKy: "$ky.tenKy" } },
    ]);
}

// ==================== Thanh lý ====================
async function disposeAsset(id, body) {
    const asset = await TaiSanCoDinh.findById(id);
    if (!asset) throw new Error("Không tìm thấy tài sản cố định");
    if (asset.trangThai === "thanh_ly") throw new Error("Tài sản đã được thanh lý");
    const ngay = body.ngay ? new Date(body.ngay) : new Date();
    const period = await periodForPosting(ngay);
    const giaBan = Math.max(0, Math.round(Number(body.giaBan) || 0));
    const chiPhi = Math.max(0, Math.round(Number(body.chiPhi) || 0));
    const hinhThuc = body.hinhThuc === "112" ? "112" : "111";
    const haoMon = (await ledgerHaoMon([asset._id])).get(String(asset._id)) || 0;
    const gtcl = asset.nguyenGia - haoMon;
    const [tk211, tk214, tk811, tk711, tkTien] = await accounts("211", "214", "811", "711", hinhThuc);
    const post = (noiDung, no, co, soTien) => soTien > 0 ? journalService.postButToan({
        kyKeToan: period._id, ngayGhi: ngay, nguon: "tai_san", nguonId: asset._id,
        noiDung: `Thanh lý ${asset.maTS} ${asset.tenTaiSan}: ${noiDung}`, tkNo: no._id, tkCo: co._id, soTien,
    }) : null;
    const ids = [];
    for (const e of [
        await post("giảm hao mòn lũy kế", tk214, tk211, haoMon),
        await post("giá trị còn lại", tk811, tk211, gtcl),
        await post("thu tiền bán thanh lý", tkTien, tk711, giaBan),
        await post("chi phí thanh lý", tk811, tkTien, chiPhi),
    ]) if (e) ids.push(e._id);
    asset.trangThai = "thanh_ly";
    asset.thanhLy = { ngay, giaBan, chiPhi, hinhThuc, lyDo: (body.lyDo || "").trim(), nguyenGia: asset.nguyenGia, haoMon, giaTriConLai: gtcl, butToan: ids };
    await asset.save();
    return asset;
}

async function undoDispose(id) {
    const asset = await TaiSanCoDinh.findById(id);
    if (!asset || asset.trangThai !== "thanh_ly") throw new Error("Tài sản chưa thanh lý");
    const entries = await ButToan.find({ _id: { $in: asset.thanhLy.butToan || [] } });
    await assertEntriesRemovable(entries, "Bút toán thanh lý");
    await removeEntries(entries);
    asset.trangThai = (asset.thanhLy.giaTriConLai || 0) <= 0 ? "het_khau_hao" : "dang_su_dung";
    asset.thanhLy = undefined;
    await asset.save();
    return asset;
}

module.exports = {
    NHOM, NGUONG_TSCD, listAssets, assetDetail, createAsset, updateAsset, deleteAsset,
    previewPeriod, runPeriod, cancelPeriod, depreciationHistory, disposeAsset, undoDispose,
};
