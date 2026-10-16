// Tờ khai thuế GTGT theo kỳ (phương pháp khấu trừ, giá bán đã bao gồm thuế GTGT)
//
//   Thuế đầu vào  = phát sinh Nợ 1331 trong kỳ (từ hóa đơn mua hàng)
//   Thuế đầu ra   = doanh thu bán hàng thuần (gồm thuế) × thuế suất / (100 + thuế suất)
//   Phải nộp      = đầu ra − đầu vào − còn được khấu trừ kỳ trước + điều chỉnh tăng − điều chỉnh giảm
//                   (âm thì không phải nộp, phần âm được khấu trừ chuyển sang kỳ sau)
//
// Khi chốt tờ khai, hệ thống ghi sổ:
//   Nợ 511 / Có 3331   tách thuế GTGT đầu ra khỏi doanh thu
//   Nợ 3331 / Có 1331  khấu trừ thuế đầu vào
//   Nợ 811 / Có 3331   điều chỉnh tăng · Nợ 3331 / Có 711  điều chỉnh giảm
// Khi ghi nhận nộp thuế: Nợ 3331 / Có 111.
const KyKeToan = require("../models/accounting/KyKeToan");
const TKKeToan = require("../models/accounting/TKKeToan");
const ButToan = require("../models/accounting/ButToan");
const ThueGTGT = require("../models/accounting/ThueGTGT");
const HoaDonMuaNL = require("../models/accounting/HoaDonMuaNL");
const HoaDonBanHang = require("../models/accounting/HoaDonBanHang");
const CongNoPhaiTraNCC = require("../models/accounting/CongNoPhaiTraNCC");
const journalService = require("./journalService");

async function accounts() {
    const codes = ["111", "152", "1331", "331", "3331", "511", "711", "811"];
    const list = await TKKeToan.find({ soHieuTK: { $in: codes } }).lean();
    const tk = Object.fromEntries(list.map((a) => [a.soHieuTK, a]));
    for (const c of codes) if (!tk[c]) throw new Error(`Chưa có tài khoản ${c} trong hệ thống tài khoản`);
    return tk;
}

async function getOrCreate(periodId) {
    let vat = await ThueGTGT.findOne({ kyKeToan: periodId });
    if (!vat) vat = await ThueGTGT.create({ kyKeToan: periodId });
    return vat;
}

// Kỳ liền trước (theo ngày bắt đầu)
async function previousPeriod(period) {
    return KyKeToan.findOne({ ngayBatDau: { $lt: period.ngayBatDau } }).sort({ ngayBatDau: -1 });
}

// Tính lại số liệu của tờ khai nháp (tờ khai đã chốt được giữ nguyên)
async function computeVat(periodId) {
    const period = await KyKeToan.findById(periodId);
    if (!period) throw new Error("Không tìm thấy kỳ kế toán");
    const vat = await getOrCreate(period._id);
    if (vat.trangThai !== "nhap") return vat;

    const tk = await accounts();
    const entries = await ButToan.find({ kyKeToan: period._id, nguon: { $ne: "thue" } }).lean();
    const is = (id, code) => String(id) === String(tk[code]._id);

    vat.thueDauVao = entries.filter((e) => is(e.tkNo, "1331")).reduce((s, e) => s + e.soTien, 0);
    vat.giaTriMuaVao = entries.filter((e) => is(e.tkNo, "152") && is(e.tkCo, "331")).reduce((s, e) => s + e.soTien, 0);
    const banRa = entries.filter((e) => is(e.tkCo, "511")).reduce((s, e) => s + e.soTien, 0);
    const giamTru = entries.filter((e) => is(e.tkNo, "511")).reduce((s, e) => s + e.soTien, 0);
    vat.doanhThuGomThue = banRa - giamTru;
    vat.thueDauRa = Math.round((vat.doanhThuGomThue * vat.thueSuatDauRa) / (100 + vat.thueSuatDauRa));
    vat.doanhThuChuaThue = vat.doanhThuGomThue - vat.thueDauRa;

    const prev = await previousPeriod(period);
    // Tính kỳ trước trước (đệ quy) để số chuyển sang luôn cập nhật
    const prevVat = prev ? await computeVat(prev._id) : null;
    vat.kyTruocChuyenSang = prevVat ? prevVat.conDuocKhauTru : 0;

    const net = vat.thueDauRa - vat.thueDauVao - vat.kyTruocChuyenSang + vat.dieuChinhTang - vat.dieuChinhGiam;
    vat.thuePhaiNop = Math.max(0, net);
    vat.conDuocKhauTru = Math.max(0, -net);
    vat.ngayTinh = new Date();
    await vat.save();
    return vat;
}

// Chi tiết để hiển thị: hóa đơn đầu vào, doanh thu bán ra theo ngày, bút toán thuế
async function getVatDetail(periodId) {
    const vat = await computeVat(periodId);
    const period = await KyKeToan.findById(periodId).lean();
    const tk = await accounts();

    // Hóa đơn mua vào: nhận diện qua bút toán mua hàng trong kỳ
    const purchaseEntries = await ButToan.find({
        kyKeToan: periodId, nguon: "mua_hang",
        $or: [{ tkNo: tk["1331"]._id }, { tkNo: tk["152"]._id, tkCo: tk["331"]._id }],
    }).lean();
    const invoiceIds = [...new Set(purchaseEntries.map((e) => String(e.nguonId)).filter(Boolean))];
    const invoices = await HoaDonMuaNL.find({ _id: { $in: invoiceIds } }).populate("ncc", "tenNCC maSoThue").lean();
    const hoaDonDauVao = invoices.map((inv) => {
        const vatEntry = purchaseEntries.find((e) => String(e.nguonId) === String(inv._id) && String(e.tkNo) === String(tk["1331"]._id));
        const ngay = purchaseEntries.find((e) => String(e.nguonId) === String(inv._id))?.ngayGhi || inv.createdAt;
        const thue = vatEntry ? vatEntry.soTien : 0;
        return {
            _id: inv._id, soHoaDon: inv.soHoaDon, ngay,
            ncc: inv.ncc?.tenNCC || "", maSoThue: inv.ncc?.maSoThue || "",
            tienHang: inv.tienHang, thueGtgt: thue,
            thueSuat: inv.tienHang ? Math.round((thue / inv.tienHang) * 1000) / 10 : 0,
        };
    }).sort((a, b) => new Date(a.ngay) - new Date(b.ngay));

    // Doanh thu bán ra theo ngày (từ hóa đơn bán hàng trong kỳ)
    const sales = await HoaDonBanHang.find({ ngayLap: { $gte: period.ngayBatDau, $lte: period.ngayKetThuc } }, "tienHang ngayLap").lean();
    const dayMap = new Map();
    for (const s of sales) {
        const d = new Date(new Date(s.ngayLap).getTime() + 7 * 3600000).toISOString().slice(0, 10);
        const g = dayMap.get(d) || { ngay: d, soHoaDon: 0, tienHang: 0 };
        g.soHoaDon++;
        g.tienHang += s.tienHang;
        dayMap.set(d, g);
    }
    const r = vat.thueSuatDauRa;
    const banRaTheoNgay = [...dayMap.values()].sort((a, b) => a.ngay.localeCompare(b.ngay)).map((g) => {
        const thue = Math.round((g.tienHang * r) / (100 + r));
        return { ...g, chuaThue: g.tienHang - thue, thueGtgt: thue };
    });

    const butToanThue = await ButToan.find({ _id: { $in: vat.butToan } }).populate("tkNo tkCo", "soHieuTK tenTK").sort({ ngayGhi: 1 }).lean();

    return { vat, period, hoaDonDauVao, banRaTheoNgay, butToanThue };
}

async function updateSettings(periodId, { thueSuatDauRa, dieuChinhTang, dieuChinhGiam, ghiChu }) {
    const vat = await getOrCreate(periodId);
    if (vat.trangThai !== "nhap") throw new Error("Tờ khai đã chốt, hãy mở lại trước khi sửa");
    if (thueSuatDauRa !== undefined) vat.thueSuatDauRa = Number(thueSuatDauRa);
    if (dieuChinhTang !== undefined) vat.dieuChinhTang = Math.max(0, Number(dieuChinhTang) || 0);
    if (dieuChinhGiam !== undefined) vat.dieuChinhGiam = Math.max(0, Number(dieuChinhGiam) || 0);
    if (ghiChu !== undefined) vat.ghiChu = String(ghiChu);
    await vat.save();
    return computeVat(periodId);
}

// Ngày ghi sổ thuế: cuối kỳ, nhưng không vượt quá hiện tại
function postingDate(period) {
    return new Date(Math.min(new Date(period.ngayKetThuc).getTime(), Date.now()));
}

async function closeVat(periodId) {
    const vat = await computeVat(periodId);
    if (vat.trangThai !== "nhap") throw new Error("Tờ khai đã được chốt");
    const period = await KyKeToan.findById(periodId);
    const tk = await accounts();
    const ngayGhi = postingDate(period);
    const ids = [];

    if (vat.thueDauRa > 0) {
        const e = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi, nguon: "thue", nguonId: vat._id,
            noiDung: `Tách thuế GTGT đầu ra ${vat.thueSuatDauRa}% khỏi doanh thu ${period.tenKy}`,
            tkNo: tk["511"]._id, tkCo: tk["3331"]._id, soTien: vat.thueDauRa,
        });
        ids.push(e._id);
    }
    // Khấu trừ phần thuế đầu vào (kể cả phần kỳ trước chuyển sang) tối đa bằng thuế đầu ra
    const khauTru = Math.min(vat.thueDauVao + vat.kyTruocChuyenSang, vat.thueDauRa);
    if (khauTru > 0) {
        const e = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi, nguon: "thue", nguonId: vat._id,
            noiDung: `Khấu trừ thuế GTGT đầu vào ${period.tenKy}`,
            tkNo: tk["3331"]._id, tkCo: tk["1331"]._id, soTien: khauTru,
        });
        ids.push(e._id);
    }

    // Điều chỉnh trên tờ khai: tăng ghi nhận chi phí khác, giảm ghi nhận thu nhập khác
    if (vat.dieuChinhTang > 0) {
        const e = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi, nguon: "thue", nguonId: vat._id,
            noiDung: `Điều chỉnh tăng thuế GTGT phải nộp ${period.tenKy}${vat.ghiChu ? `: ${vat.ghiChu}` : ""}`,
            tkNo: tk["811"]._id, tkCo: tk["3331"]._id, soTien: vat.dieuChinhTang,
        });
        ids.push(e._id);
    }
    if (vat.dieuChinhGiam > 0) {
        const e = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi, nguon: "thue", nguonId: vat._id,
            noiDung: `Điều chỉnh giảm thuế GTGT phải nộp ${period.tenKy}${vat.ghiChu ? `: ${vat.ghiChu}` : ""}`,
            tkNo: tk["3331"]._id, tkCo: tk["711"]._id, soTien: vat.dieuChinhGiam,
        });
        ids.push(e._id);
    }

    vat.butToan = ids;
    vat.trangThai = "da_chot";
    vat.ngayChot = new Date();
    await vat.save();
    return vat;
}

async function recordPayment(periodId, { ngayNop } = {}) {
    const vat = await getOrCreate(periodId);
    if (vat.trangThai !== "da_chot") throw new Error("Chỉ ghi nhận nộp thuế cho tờ khai đã chốt");
    const period = await KyKeToan.findById(periodId);
    const tk = await accounts();
    if (vat.thuePhaiNop > 0) {
        const e = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi: ngayNop ? new Date(ngayNop) : postingDate(period),
            nguon: "thue", nguonId: vat._id,
            noiDung: `Nộp thuế GTGT ${period.tenKy}`,
            tkNo: tk["3331"]._id, tkCo: tk["111"]._id, soTien: vat.thuePhaiNop,
        });
        vat.butToan.push(e._id);
    }
    vat.trangThai = "da_nop";
    vat.ngayNop = ngayNop ? new Date(ngayNop) : new Date();
    await vat.save();
    return vat;
}

// Mở lại tờ khai: xóa các bút toán thuế đã ghi để sửa và tính lại
async function reopenVat(periodId) {
    const vat = await getOrCreate(periodId);
    if (vat.trangThai === "nhap") return vat;
    const period = await KyKeToan.findById(periodId);
    const later = await KyKeToan.find({ ngayBatDau: { $gt: period.ngayBatDau } }, "_id");
    if (await ThueGTGT.exists({ kyKeToan: { $in: later.map((p) => p._id) }, trangThai: { $ne: "nhap" } })) {
        throw new Error("Kỳ sau đã chốt tờ khai, cần mở lại kỳ sau trước");
    }
    const entries = await ButToan.find({ _id: { $in: vat.butToan } });
    await ButToan.deleteMany({ _id: { $in: vat.butToan } });
    for (const e of entries) {
        await journalService.recomputeSoCai(e.kyKeToan, e.tkNo);
        await journalService.recomputeSoCai(e.kyKeToan, e.tkCo);
    }
    vat.butToan = [];
    vat.trangThai = "nhap";
    vat.ngayChot = null;
    vat.ngayNop = null;
    await vat.save();
    return computeVat(periodId);
}

// Sửa thuế GTGT đầu vào của một hóa đơn mua hàng: cập nhật hóa đơn, bút toán Nợ 1331 / Có 331 và công nợ
async function updatePurchaseInvoiceVat(invoiceId, thueGtgtDauVao) {
    const thue = Math.max(0, Math.round(Number(thueGtgtDauVao) || 0));
    const invoice = await HoaDonMuaNL.findById(invoiceId);
    if (!invoice) throw new Error("Không tìm thấy hóa đơn mua hàng");
    const tk = await accounts();

    const anyEntry = await ButToan.findOne({ nguon: "mua_hang", nguonId: invoice._id }).sort({ ngayGhi: 1 });
    if (!anyEntry) throw new Error("Hóa đơn chưa được ghi sổ nên không xác định được kỳ");
    const vat = await ThueGTGT.findOne({ kyKeToan: anyEntry.kyKeToan });
    if (vat && vat.trangThai !== "nhap") throw new Error("Tờ khai thuế của kỳ này đã chốt, hãy mở lại trước khi sửa");

    let vatEntry = await ButToan.findOne({ nguon: "mua_hang", nguonId: invoice._id, tkNo: tk["1331"]._id });
    if (vatEntry && thue > 0) {
        vatEntry.soTien = thue;
        await vatEntry.save();
    } else if (vatEntry && thue === 0) {
        await vatEntry.deleteOne();
    } else if (!vatEntry && thue > 0) {
        vatEntry = await ButToan.create({
            kyKeToan: anyEntry.kyKeToan, ngayGhi: anyEntry.ngayGhi, nguon: "mua_hang", nguonId: invoice._id,
            noiDung: `Thuế GTGT đầu vào theo hóa đơn ${invoice.soHoaDon}`,
            tkNo: tk["1331"]._id, tkCo: tk["331"]._id, soTien: thue,
        });
    }
    await journalService.recomputeSoCai(anyEntry.kyKeToan, tk["1331"]._id);
    await journalService.recomputeSoCai(anyEntry.kyKeToan, tk["331"]._id);

    invoice.thueGtgtDauVao = thue;
    await invoice.save();

    const payable = await CongNoPhaiTraNCC.findOne({ hoaDonMua: invoice._id });
    if (payable) {
        payable.soTienNo = invoice.tienHang + thue;
        payable.trangThai = payable.daTra <= 0 ? "chua_thanh_toan"
            : payable.daTra >= payable.soTienNo ? "da_thanh_toan" : "da_thanh_toan_mot_phan";
        await payable.save();
    }

    await computeVat(anyEntry.kyKeToan);
    return invoice;
}

module.exports = { computeVat, getVatDetail, updateSettings, closeVat, recordPayment, reopenVat, updatePurchaseInvoiceVat };
