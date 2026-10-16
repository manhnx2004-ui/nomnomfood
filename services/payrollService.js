// Tiền lương nhà hàng: chấm công theo ca → bảng lương (02-LĐTL) → chốt ghi sổ → chi trả.
//   Chốt:  Nợ 642 / Có 334 (tổng thu nhập) · Nợ 334 / Có 338 (BH người lao động)
//          Nợ 642 / Có 338 (BH doanh nghiệp) · Nợ 334 / Có 3335 (thuế TNCN) · Nợ 334 / Có 711 (khấu trừ phạt)
//   Tạm ứng / chi trả: Nợ 334 / Có 111 hoặc 112
const NhanVien = require("../models/accounting/NhanVien");
const CaLam = require("../models/accounting/CaLam");
const BangLuong = require("../models/accounting/BangLuong");
const KyKeToan = require("../models/accounting/KyKeToan");
const ButToan = require("../models/accounting/ButToan");
const journalService = require("./journalService");
const { getAccountByCode } = require("./accountingHelpers");
const { periodForPosting, assertEntriesRemovable, removeEntries } = require("./purchaseService");
const { monthRange } = require("./periodUtils");

// Tham số tính lương — điều chỉnh khi quy định thay đổi
const CAU_HINH = {
    ngayCongChuan: 26,
    gioMotCong: 8,
    heSoTangCa: 1.5,        // làm thêm ngày thường 150%
    heSoNgayLe: 3,          // làm ngày lễ, tết 300%
    tyLeBhNLD: 0.105,       // BHXH 8% + BHYT 1.5% + BHTN 1%
    tyLeBhDN: 0.215,        // BHXH 17.5% + BHYT 3% + BHTN 1%
    tranDongBH: 46800000,   // 20 lần mức lương cơ sở 2.340.000đ
    giamTruBanThan: 15500000,
    giamTruPhuThuoc: 6200000,
    mienThueAnCa: 730000,   // tiền ăn giữa ca không tính thuế
    nguongKhauTru10: 2000000, // thời vụ / thử việc: khấu trừ 10% khi thu nhập từ 2 triệu
    bieuThue: [             // biểu thuế lũy tiến từng phần theo tháng
        [5000000, 0.05], [10000000, 0.10], [18000000, 0.15], [32000000, 0.20],
        [52000000, 0.25], [80000000, 0.30], [Infinity, 0.35],
    ],
};

// Mẫu ca làm của nhà hàng
const CA_MAU = {
    S: { ten: "Ca sáng", gioBatDau: "06:00", gioKetThuc: "14:00", nghiGiua: 0 },
    C: { ten: "Ca chiều", gioBatDau: "14:00", gioKetThuc: "22:00", nghiGiua: 0 },
    G: { ten: "Ca gãy", gioBatDau: "10:00", gioKetThuc: "21:00", nghiGiua: 180 },
    HC: { ten: "Hành chính", gioBatDau: "08:00", gioKetThuc: "17:00", nghiGiua: 60 },
    T: { ten: "Ca tối", gioBatDau: "17:00", gioKetThuc: "23:00", nghiGiua: 0 },
};

const toMin = (s) => { const [h, m] = String(s || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };

// Số giờ làm của ca (ca qua đêm được cộng 24 giờ), trừ thời gian nghỉ giữa ca
function gioCuaCa(ca) {
    if (ca.loai !== "lam" || !ca.gioBatDau || !ca.gioKetThuc) return 0;
    let diff = toMin(ca.gioKetThuc) - toMin(ca.gioBatDau);
    if (diff <= 0) diff += 24 * 60;
    return Math.max(0, (diff - (ca.nghiGiua || 0)) / 60);
}

function thueLuyTien(tn) {
    let thue = 0, duoi = 0;
    for (const [tren, rate] of CAU_HINH.bieuThue) {
        if (tn <= duoi) break;
        thue += (Math.min(tn, tren) - duoi) * rate;
        duoi = tren;
    }
    return Math.round(thue);
}

const r2 = (n) => Math.round(n * 100) / 100;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

async function accounts(...codes) {
    const list = await Promise.all(codes.map(getAccountByCode));
    list.forEach((a, i) => { if (!a) throw new Error(`Thiếu tài khoản ${codes[i]} trong hệ thống tài khoản`); });
    return list;
}

async function periodOf(id) {
    const period = await KyKeToan.findById(id);
    if (!period) throw new Error("Không tìm thấy kỳ kế toán");
    return { period, ...monthRange(period.thang) };
}

async function shiftsInMonth(start, end, filter = {}) {
    return CaLam.find({ ...filter, ngayLam: { $gte: start, $lte: end } }).lean();
}

// ==================== Tính lương một nhân viên ====================
function computeRow(nv, shifts, giuLai = {}) {
    const C = CAU_HINH;
    const byDay = new Map();
    let gioLe = 0, ngayPhep = 0;
    for (const s of shifts) {
        if (s.loai === "phep" || s.loai === "nghi_le") { ngayPhep += 1; continue; }
        if (s.loai !== "lam") continue;
        const h = gioCuaCa(s);
        if (s.ngayLe) { gioLe += h; continue; }
        byDay.set(dayKey(s.ngayLam), (byDay.get(dayKey(s.ngayLam)) || 0) + h);
    }
    let congLam = 0, gioThuong = 0, gioTangCa = 0;
    for (const h of byDay.values()) {
        congLam += Math.min(1, h / C.gioMotCong);
        gioThuong += Math.min(h, C.gioMotCong);
        gioTangCa += Math.max(0, h - C.gioMotCong);
    }
    const soNgayLam = byDay.size + (gioLe > 0 ? new Set(shifts.filter((s) => s.ngayLe && s.loai === "lam").map((s) => dayKey(s.ngayLam))).size : 0);
    const tongGioLam = r2(gioThuong + gioTangCa + gioLe);

    const theoThang = nv.hinhThucLuong !== "gio";
    const donGiaGio = theoThang ? nv.luongCoBan / C.ngayCongChuan / C.gioMotCong : (nv.luongGio || 0);
    const ngayCong = theoThang ? r2(congLam + ngayPhep) : 0;
    const luongChinh = Math.round(theoThang ? nv.luongCoBan / C.ngayCongChuan * ngayCong : donGiaGio * gioThuong);
    const luongTangCa = Math.round(donGiaGio * (C.heSoTangCa * gioTangCa + C.heSoNgayLe * gioLe));
    const phanTrMienThueTangCa = Math.round(donGiaGio * ((C.heSoTangCa - 1) * gioTangCa + (C.heSoNgayLe - 1) * gioLe));

    const tyLeCong = theoThang ? Math.min(1, ngayCong / C.ngayCongChuan) : (soNgayLam > 0 ? 1 : 0);
    const phuCap = Math.round(((nv.phuCapTrachNhiem || 0) + (nv.phuCapKhac || 0)) * tyLeCong);
    const phuCapAnCa = Math.round((nv.phuCapAnCa || 0) * soNgayLam);
    const thuong = Math.max(0, Math.round(giuLai.thuong || 0));
    const khauTru = Math.max(0, Math.round(giuLai.khauTru || 0));
    const tamUng = Math.max(0, Math.round(giuLai.tamUng || 0));
    const tongThuNhap = luongChinh + luongTangCa + phuCap + phuCapAnCa + thuong;

    let bhNLD = 0, bhDN = 0;
    // Làm việc và nghỉ có lương dưới 14 ngày trong tháng thì không đóng bảo hiểm tháng đó
    if (nv.thamGiaBHXH && nv.loaiHopDong === "chinh_thuc" && tongThuNhap > 0 && soNgayLam + ngayPhep >= 14) {
        const base = Math.min(nv.luongDongBH || nv.luongCoBan || 0, C.tranDongBH);
        bhNLD = Math.round(base * C.tyLeBhNLD);
        bhDN = Math.round(base * C.tyLeBhDN);
    }

    let thuNhapTinhThue = 0, thueTNCN = 0;
    if (nv.loaiHopDong === "chinh_thuc") {
        const chiuThue = tongThuNhap - Math.min(phuCapAnCa, C.mienThueAnCa) - phanTrMienThueTangCa;
        thuNhapTinhThue = Math.max(0, chiuThue - bhNLD - C.giamTruBanThan - C.giamTruPhuThuoc * (nv.soNguoiPhuThuoc || 0));
        thueTNCN = thueLuyTien(thuNhapTinhThue);
    } else if (tongThuNhap >= C.nguongKhauTru10) {
        thuNhapTinhThue = tongThuNhap;
        thueTNCN = Math.round(tongThuNhap * 0.1);
    }

    return {
        hoTen: nv.hoTen, chucVu: nv.chucVu, boPhan: nv.boPhan, hinhThucLuong: theoThang ? "thang" : "gio",
        mucLuong: theoThang ? nv.luongCoBan : nv.luongGio,
        ngayCong, soNgayLam, tongGioLam, gioTangCa: r2(gioTangCa), gioLe: r2(gioLe),
        luongChinh, luongTangCa, phuCap, phuCapAnCa, thuong, tongThuNhap,
        bhNLD, bhDN, thuNhapTinhThue, thueTNCN, khauTru, tamUng,
        luongThucLinh: tongThuNhap - bhNLD - thueTNCN - khauTru - tamUng,
    };
}

// Tính (lại) bảng lương nháp của kỳ; giữ thưởng / khấu trừ / tạm ứng đã nhập; dòng đã chốt không đổi
async function calcPayroll(periodId) {
    const { period, start, end } = await periodOf(periodId);
    const employees = await NhanVien.find().lean();
    const shifts = await shiftsInMonth(start, end);
    const existing = new Map((await BangLuong.find({ kyKeToan: period._id })).map((b) => [String(b.nhanVien), b]));
    let tinh = 0, giuNguyen = 0;
    for (const nv of employees) {
        const old = existing.get(String(nv._id));
        if (old && old.trangThai !== "nhap") { giuNguyen++; continue; }
        const own = shifts.filter((s) => String(s.nhanVien) === String(nv._id));
        const lamTrongKy = !nv.ngayNghiViec || new Date(nv.ngayNghiViec) >= start;
        if (!own.length && !old) continue; // không có chấm công trong kỳ
        if (!lamTrongKy && !own.length) continue;
        const row = computeRow(nv, own, old || {});
        if (old) { Object.assign(old, row, { ngayTinh: new Date() }); await old.save(); }
        else await BangLuong.create({ nhanVien: nv._id, kyKeToan: period._id, ...row });
        tinh++;
    }
    return { tinh, giuNguyen };
}

async function getPayroll(periodId) {
    const { period } = await periodOf(periodId);
    const rows = await BangLuong.find({ kyKeToan: period._id }).populate("nhanVien", "maNV hoTen chucVu boPhan nganHang soTaiKhoan loaiHopDong").lean();
    rows.sort((a, b) => String(a.nhanVien?.maNV || a.hoTen).localeCompare(String(b.nhanVien?.maNV || b.hoTen)));
    return { period, rows, cauHinh: { ...CAU_HINH, bieuThue: undefined } };
}

// Sửa thưởng / khấu trừ / ghi chú của dòng nháp rồi tính lại
async function updateRow(id, body) {
    const row = await BangLuong.findById(id);
    if (!row) throw new Error("Không tìm thấy dòng lương");
    if (row.trangThai !== "nhap") throw new Error("Bảng lương đã chốt, hãy hủy chốt trước khi sửa");
    const nv = await NhanVien.findById(row.nhanVien).lean();
    const { start, end } = await periodOf(row.kyKeToan);
    const shifts = await shiftsInMonth(start, end, { nhanVien: row.nhanVien });
    const giuLai = { thuong: body.thuong ?? row.thuong, khauTru: body.khauTru ?? row.khauTru, tamUng: row.tamUng };
    Object.assign(row, computeRow(nv, shifts, giuLai));
    if (body.ghiChu !== undefined) row.ghiChu = String(body.ghiChu).trim();
    await row.save();
    return row;
}

const postingDate = (end) => new Date(Math.min(Date.now(), end.getTime()));

// Chốt bảng lương: ghi nhận chi phí lương, bảo hiểm, thuế TNCN
async function closePayroll(periodId, ids) {
    const { period, end } = await periodOf(periodId);
    const ngayGhi = postingDate(end);
    await periodForPosting(ngayGhi);
    const filter = { kyKeToan: period._id, trangThai: "nhap" };
    if (ids?.length) filter._id = { $in: ids };
    const rows = await BangLuong.find(filter);
    if (!rows.length) throw new Error("Không có dòng lương nháp nào để chốt — hãy bấm Tính lương trước");
    const [tk642, tk334, tk338, tk3335, tk711] = await accounts("642", "334", "338", "3335", "711");
    const post = (noiDung, no, co, soTien, row) => soTien > 0 ? journalService.postButToan({
        kyKeToan: period._id, ngayGhi, nguon: "luong", nguonId: row._id, noiDung, tkNo: no._id, tkCo: co._id, soTien,
    }) : null;
    let tong = 0;
    for (const r of rows) {
        const ten = `${r.hoTen} — ${period.tenKy}`;
        const ids2 = [];
        for (const e of [
            await post(`Lương phải trả: ${ten}`, tk642, tk334, r.tongThuNhap, r),
            await post(`BHXH, BHYT, BHTN trừ lương (10,5%): ${ten}`, tk334, tk338, r.bhNLD, r),
            await post(`BHXH, BHYT, BHTN doanh nghiệp đóng (21,5%): ${ten}`, tk642, tk338, r.bhDN, r),
            await post(`Thuế TNCN khấu trừ: ${ten}`, tk334, tk3335, r.thueTNCN, r),
            await post(`Khấu trừ lương (phạt, bồi thường): ${ten}`, tk334, tk711, r.khauTru, r),
        ]) if (e) ids2.push(e._id);
        r.butToanChot = ids2;
        r.butToan = ids2[0] || null;
        r.trangThai = "da_chot";
        await r.save();
        tong += r.tongThuNhap;
    }
    return { chot: rows.length, tong };
}

async function reopenPayroll(periodId, ids) {
    const filter = { kyKeToan: periodId, trangThai: "da_chot" };
    if (ids?.length) filter._id = { $in: ids };
    const rows = await BangLuong.find(filter);
    if (!rows.length) throw new Error("Không có dòng lương đã chốt (chưa chi trả) để hủy chốt");
    const entries = await ButToan.find({ _id: { $in: rows.flatMap((r) => r.butToanChot.length ? r.butToanChot : [r.butToan].filter(Boolean)) } });
    await assertEntriesRemovable(entries, "Bảng lương");
    await removeEntries(entries);
    await BangLuong.updateMany({ _id: { $in: rows.map((r) => r._id) } }, { trangThai: "nhap", butToanChot: [], butToan: null });
    return { mo: rows.length };
}

// Chi trả lương thực lĩnh
async function payPayroll(periodId, { ids, hinhThuc, ngay }) {
    const { period } = await periodOf(periodId);
    const filter = { kyKeToan: period._id, trangThai: "da_chot" };
    if (ids?.length) filter._id = { $in: ids };
    const rows = await BangLuong.find(filter);
    if (!rows.length) throw new Error("Không có dòng lương đã chốt chờ chi trả");
    const ngayTra = ngay ? new Date(ngay) : new Date();
    const payPeriod = await periodForPosting(ngayTra);
    const tien = hinhThuc === "112" ? "112" : "111";
    const [tk334, tkTien] = await accounts("334", tien);
    let tong = 0;
    for (const r of rows) {
        if (r.luongThucLinh > 0) {
            const e = await journalService.postButToan({
                kyKeToan: payPeriod._id, ngayGhi: ngayTra, nguon: "luong", nguonId: r._id,
                noiDung: `Chi trả lương ${period.tenKy}: ${r.hoTen}`, tkNo: tk334._id, tkCo: tkTien._id, soTien: r.luongThucLinh,
            });
            r.butToanTra = e._id;
        }
        r.trangThai = "da_tra"; r.hinhThucTra = tien; r.ngayTra = ngayTra;
        await r.save();
        tong += r.luongThucLinh;
    }
    return { tra: rows.length, tong };
}

async function unpayRow(id) {
    const r = await BangLuong.findById(id);
    if (!r || r.trangThai !== "da_tra") throw new Error("Dòng lương chưa chi trả");
    if (r.butToanTra) {
        const entries = await ButToan.find({ _id: r.butToanTra });
        await assertEntriesRemovable(entries, "Phiếu chi lương");
        await removeEntries(entries);
    }
    r.trangThai = r.butToanChot.length || r.butToan ? "da_chot" : "nhap";
    r.butToanTra = null; r.ngayTra = null; r.hinhThucTra = "";
    await r.save();
    return r;
}

// Tạm ứng lương giữa kỳ (Nợ 334 / Có 111, 112); tự tạo dòng lương nháp nếu chưa có
async function advance(periodId, { nhanVien, soTien, hinhThuc, ngay }) {
    const { period, start, end } = await periodOf(periodId);
    const amount = Math.round(Number(soTien));
    if (!(amount > 0)) throw new Error("Số tiền tạm ứng phải lớn hơn 0");
    const nv = await NhanVien.findById(nhanVien).lean();
    if (!nv) throw new Error("Không tìm thấy nhân viên");
    let row = await BangLuong.findOne({ kyKeToan: period._id, nhanVien });
    if (row && row.trangThai !== "nhap") throw new Error("Bảng lương của nhân viên đã chốt, không thể tạm ứng thêm cho kỳ này");
    const ngayUng = ngay ? new Date(ngay) : new Date();
    const p = await periodForPosting(ngayUng);
    const tien = hinhThuc === "112" ? "112" : "111";
    const [tk334, tkTien] = await accounts("334", tien);
    if (!row) row = new BangLuong({ nhanVien, kyKeToan: period._id, tongGioLam: 0, luongThucLinh: 0 });
    const e = await journalService.postButToan({
        kyKeToan: p._id, ngayGhi: ngayUng, nguon: "luong", nguonId: row._id,
        noiDung: `Tạm ứng lương ${period.tenKy}: ${nv.hoTen}`, tkNo: tk334._id, tkCo: tkTien._id, soTien: amount,
    });
    row.tamUngList.push({ ngay: ngayUng, soTien: amount, hinhThuc: tien, butToan: e._id });
    row.tamUng = row.tamUngList.reduce((s, x) => s + x.soTien, 0);
    const shifts = await shiftsInMonth(start, end, { nhanVien });
    Object.assign(row, computeRow(nv, shifts, { thuong: row.thuong, khauTru: row.khauTru, tamUng: row.tamUng }));
    await row.save();
    return row;
}

async function removeAdvance(rowId, index) {
    const row = await BangLuong.findById(rowId);
    if (!row || row.trangThai !== "nhap") throw new Error("Chỉ xóa tạm ứng khi bảng lương còn nháp");
    const item = row.tamUngList[index];
    if (!item) throw new Error("Không tìm thấy khoản tạm ứng");
    const entries = await ButToan.find({ _id: item.butToan });
    await assertEntriesRemovable(entries, "Tạm ứng");
    await removeEntries(entries);
    row.tamUngList.splice(index, 1);
    row.tamUng = row.tamUngList.reduce((s, x) => s + x.soTien, 0);
    row.luongThucLinh = row.tongThuNhap - row.bhNLD - row.thueTNCN - row.khauTru - row.tamUng;
    await row.save();
    return row;
}

// Xóa dòng lương nháp (vd nhân viên không làm trong kỳ)
async function deleteRow(id) {
    const row = await BangLuong.findById(id);
    if (!row) throw new Error("Không tìm thấy dòng lương");
    if (row.trangThai !== "nhap") throw new Error("Dòng lương đã chốt, không thể xóa");
    if (row.tamUngList.length) throw new Error("Nhân viên đã tạm ứng trong kỳ, hãy xóa khoản tạm ứng trước");
    await row.deleteOne();
}

// ==================== Bảng chấm công ====================
async function timesheet(thang) {
    const { start, end } = monthRange(thang);
    const employees = await NhanVien.find({ $or: [{ dangLamViec: true }, { ngayNghiViec: { $gte: start } }] }).sort({ maNV: 1, hoTen: 1 }).lean();
    const shifts = await shiftsInMonth(start, end);
    const period = await KyKeToan.findOne({ thang }).lean();
    const locked = period ? (await BangLuong.find({ kyKeToan: period._id, trangThai: { $ne: "nhap" } }).select("nhanVien").lean()).map((b) => String(b.nhanVien)) : [];
    return {
        thang, caMau: CA_MAU, khoa: locked,
        employees: employees.map((e) => ({ _id: e._id, maNV: e.maNV, hoTen: e.hoTen, chucVu: e.chucVu, boPhan: e.boPhan, hinhThucLuong: e.hinhThucLuong })),
        shifts: shifts.map((s) => ({ ...s, ngay: dayKey(s.ngayLam), gio: r2(gioCuaCa(s)) })),
    };
}

async function assertNotLocked(nhanVien, ngay) {
    const { monthKey } = require("./periodUtils");
    const period = await KyKeToan.findOne({ thang: monthKey(ngay) }).lean();
    if (period && await BangLuong.exists({ kyKeToan: period._id, nhanVien, trangThai: { $ne: "nhap" } })) {
        throw new Error("Bảng lương tháng này của nhân viên đã chốt, không thể sửa chấm công");
    }
}

function normalizeShift(b) {
    const loai = ["lam", "phep", "nghi_le", "khong_luong"].includes(b.loai) ? b.loai : "lam";
    const mau = CA_MAU[b.ca];
    const s = {
        nhanVien: b.nhanVien, ngayLam: new Date(`${String(b.ngay || b.ngayLam).slice(0, 10)}T00:00:00.000Z`),
        ca: loai === "lam" ? (b.ca || "tu_chon") : loai, loai, ngayLe: loai === "lam" && !!b.ngayLe, ghiChu: (b.ghiChu || "").trim(),
        gioBatDau: "", gioKetThuc: "", nghiGiua: 0,
    };
    if (loai === "lam") {
        s.gioBatDau = b.gioBatDau || mau?.gioBatDau || "";
        s.gioKetThuc = b.gioKetThuc || mau?.gioKetThuc || "";
        s.nghiGiua = b.nghiGiua !== undefined && b.nghiGiua !== "" ? Number(b.nghiGiua) || 0 : (mau?.nghiGiua || 0);
        if (!/^\d{2}:\d{2}$/.test(s.gioBatDau) || !/^\d{2}:\d{2}$/.test(s.gioKetThuc)) throw new Error("Giờ vào / giờ ra không hợp lệ");
        if (gioCuaCa(s) <= 0) throw new Error("Thời gian làm việc của ca phải lớn hơn 0");
        if (gioCuaCa(s) > 16) throw new Error("Một ca không được quá 16 giờ");
    }
    if (isNaN(s.ngayLam)) throw new Error("Ngày không hợp lệ");
    return s;
}

async function saveShift(body, id) {
    const s = normalizeShift(body);
    await assertNotLocked(s.nhanVien, s.ngayLam);
    if (id) {
        const old = await CaLam.findById(id);
        if (!old) throw new Error("Không tìm thấy ca làm");
        await assertNotLocked(old.nhanVien, old.ngayLam);
        Object.assign(old, s);
        return old.save();
    }
    // Nghỉ phép / lễ / không lương thay thế mọi ca trong ngày
    if (s.loai !== "lam") await CaLam.deleteMany({ nhanVien: s.nhanVien, ngayLam: s.ngayLam });
    else await CaLam.deleteMany({ nhanVien: s.nhanVien, ngayLam: s.ngayLam, loai: { $ne: "lam" } });
    return CaLam.create(s);
}

async function deleteShift(id) {
    const s = await CaLam.findById(id);
    if (!s) throw new Error("Không tìm thấy ca làm");
    await assertNotLocked(s.nhanVien, s.ngayLam);
    await s.deleteOne();
}

// Xếp ca hàng loạt: nhiều nhân viên × khoảng ngày, bỏ qua thứ đã chọn; ghi đè ca cũ trong ngày nếu yêu cầu
async function bulkShifts({ nhanVien = [], tuNgay, denNgay, boQuaThu = [], ghiDe = false, ...shift }) {
    if (!nhanVien.length) throw new Error("Chọn ít nhất một nhân viên");
    const from = new Date(`${tuNgay}T00:00:00.000Z`), to = new Date(`${denNgay}T00:00:00.000Z`);
    if (isNaN(from) || isNaN(to) || to < from) throw new Error("Khoảng ngày không hợp lệ");
    if ((to - from) / 864e5 > 62) throw new Error("Chỉ xếp ca tối đa 2 tháng mỗi lần");
    let tao = 0, boQua = 0;
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 864e5)) {
        if (boQuaThu.map(Number).includes(d.getUTCDay())) continue;
        for (const id of nhanVien) {
            const s = normalizeShift({ ...shift, nhanVien: id, ngay: d.toISOString() });
            try { await assertNotLocked(id, s.ngayLam); } catch { boQua++; continue; }
            const exists = await CaLam.exists({ nhanVien: id, ngayLam: s.ngayLam });
            if (exists && !ghiDe) { boQua++; continue; }
            if (exists) await CaLam.deleteMany({ nhanVien: id, ngayLam: s.ngayLam });
            await CaLam.create(s);
            tao++;
        }
    }
    return { tao, boQua };
}

module.exports = {
    CAU_HINH, CA_MAU, gioCuaCa, computeRow, calcPayroll, getPayroll, updateRow, closePayroll, reopenPayroll,
    payPayroll, unpayRow, advance, removeAdvance, deleteRow, timesheet, saveShift, deleteShift, bulkShifts,
};
