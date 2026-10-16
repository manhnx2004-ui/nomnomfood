// Trung tâm công nợ: gộp công nợ phải trả nhà cung cấp (từ hóa đơn mua) và công nợ nhập tay,
// thanh toán bằng phiếu chi / phiếu thu kèm bút toán.
//   Trả nợ:  Nợ 331 / Có 111 (tiền mặt) hoặc 112 (chuyển khoản)
//   Thu nợ:  Nợ 111 hoặc 112 / Có 131
const CongNoPhaiTraNCC = require("../models/accounting/CongNoPhaiTraNCC");
const Debt = require("../models/Debt");
const NhaCungCap = require("../models/accounting/NhaCungCap");
const PhieuThanhToan = require("../models/accounting/PhieuThanhToan");
const ButToan = require("../models/accounting/ButToan");
const journalService = require("./journalService");
const { getAccountByCode } = require("./accountingHelpers");
const { periodForPosting } = require("./purchaseService");
const { monthKey } = require("./periodUtils");

const payableStatus = (soTienNo, daTra) =>
    daTra <= 0 ? "chua_thanh_toan" : daTra >= soTienNo ? "da_thanh_toan" : "da_thanh_toan_mot_phan";

// Danh sách công nợ dạng thống nhất
async function listDebts() {
    const now = new Date();
    const rows = [];

    const payables = await CongNoPhaiTraNCC.find()
        .populate("ncc", "tenNCC diaChi sdt maSoThue nganHangCode tenNganHang soTaiKhoan chuTaiKhoan chiNhanh")
        .populate("hoaDonMua", "soHoaDon kyHieu ngayHoaDon hanThanhToan createdAt")
        .lean();
    for (const p of payables) {
        const inv = p.hoaDonMua;
        const han = inv?.hanThanhToan || null;
        const conLai = p.soTienNo - (p.daTra || 0);
        rows.push({
            nguon: "ncc", _id: p._id, loai: "phai_tra",
            doiTac: p.ncc?.tenNCC || "(nhà cung cấp đã xóa)", ncc: p.ncc?._id || null, diaChi: p.ncc?.diaChi || "",
            chungTu: inv ? `HĐ ${inv.kyHieu ? inv.kyHieu + "-" : ""}${inv.soHoaDon}` : "Hóa đơn đã xóa",
            hoaDonMua: inv?._id || null,
            ngay: inv?.ngayHoaDon || inv?.createdAt || p.createdAt, han,
            soTien: p.soTienNo, daTra: p.daTra || 0, conLai,
            quaHan: conLai > 0 && han && new Date(han) < now,
        });
    }

    // Công nợ nhập tay: khớp nhà cung cấp theo tên để lấy địa chỉ, tài khoản ngân hàng
    const suppliers = await NhaCungCap.find().select("tenNCC diaChi").lean();
    const byName = new Map(suppliers.map((s) => [s.tenNCC.trim().toLowerCase(), s]));
    const debts = await Debt.find().lean();
    for (const d of debts) {
        const conLai = d.amount - (d.paidAmount || 0);
        const s = byName.get(String(d.partner || "").trim().toLowerCase());
        rows.push({
            nguon: "khac", _id: d._id, loai: d.type === "receivable" ? "phai_thu" : "phai_tra",
            doiTac: d.partner, ncc: s?._id || null, diaChi: s?.diaChi || "",
            chungTu: d.note || "Công nợ khác",
            ngay: d.createdAt, han: d.dueDate || null,
            soTien: d.amount, daTra: d.paidAmount || 0, conLai,
            quaHan: conLai > 0 && d.dueDate && new Date(d.dueDate) < now,
        });
    }
    return rows.sort((a, b) => (b.conLai > 0) - (a.conLai > 0) || new Date(b.ngay) - new Date(a.ngay));
}

async function nextVoucherNumber(loai, date) {
    const prefix = `${loai === "chi" ? "PC" : "PT"}-${monthKey(date).replace("-", "")}-`;
    const last = await PhieuThanhToan.findOne({ soPhieu: new RegExp(`^${prefix}`) }).sort({ soPhieu: -1 });
    return prefix + String(last ? Number(last.soPhieu.slice(prefix.length)) + 1 : 1).padStart(3, "0");
}

// Lập phiếu chi / phiếu thu cho một hoặc nhiều khoản nợ cùng đối tác
async function createPayment(body) {
    const items = (body.phanBo || []).filter((x) => Number(x.soTien) > 0);
    if (!items.length) throw new Error("Chọn ít nhất một khoản nợ và nhập số tiền thanh toán");
    const ngay = body.ngay ? new Date(body.ngay) : new Date();
    const period = await periodForPosting(ngay);
    const hinhThuc = body.hinhThuc === "chuyen_khoan" ? "chuyen_khoan" : "tien_mat";

    // Đọc và kiểm tra từng khoản nợ
    const resolved = [];
    for (const it of items) {
        const soTien = Math.round(Number(it.soTien));
        if (it.nguon === "ncc") {
            const p = await CongNoPhaiTraNCC.findById(it.congNo).populate("ncc", "tenNCC diaChi").populate("hoaDonMua", "soHoaDon kyHieu");
            if (!p) throw new Error("Không tìm thấy công nợ nhà cung cấp");
            const conLai = p.soTienNo - (p.daTra || 0);
            const chungTu = p.hoaDonMua ? `HĐ ${p.hoaDonMua.kyHieu ? p.hoaDonMua.kyHieu + "-" : ""}${p.hoaDonMua.soHoaDon}` : "Hóa đơn";
            if (soTien > conLai) throw new Error(`${chungTu}: số tiền trả (${soTien.toLocaleString("vi-VN")}đ) vượt số còn nợ (${conLai.toLocaleString("vi-VN")}đ)`);
            resolved.push({ nguon: "ncc", doc: p, loai: "phai_tra", doiTac: p.ncc?.tenNCC || "", ncc: p.ncc?._id, diaChi: p.ncc?.diaChi || "", chungTu, soTien });
        } else {
            const d = await Debt.findById(it.congNo);
            if (!d) throw new Error("Không tìm thấy công nợ");
            const conLai = d.amount - (d.paidAmount || 0);
            if (soTien > conLai) throw new Error(`${d.partner}: số tiền (${soTien.toLocaleString("vi-VN")}đ) vượt số còn nợ (${conLai.toLocaleString("vi-VN")}đ)`);
            resolved.push({ nguon: "khac", doc: d, loai: d.type === "receivable" ? "phai_thu" : "phai_tra", doiTac: d.partner, ncc: null, diaChi: "", chungTu: d.note || "Công nợ", soTien });
        }
    }
    const loaiSet = new Set(resolved.map((r) => r.loai));
    const doiTacSet = new Set(resolved.map((r) => r.doiTac));
    if (loaiSet.size > 1) throw new Error("Một phiếu chỉ gồm các khoản cùng loại (phải trả hoặc phải thu)");
    if (doiTacSet.size > 1) throw new Error("Một phiếu chỉ thanh toán cho một đối tác");

    const loai = resolved[0].loai === "phai_tra" ? "chi" : "thu";
    const tong = resolved.reduce((s, r) => s + r.soTien, 0);
    const [tk111, tk112, tk131, tk331] = await Promise.all(["111", "112", "131", "331"].map(getAccountByCode));
    const tkTien = hinhThuc === "tien_mat" ? tk111 : tk112;

    // Chuyển khoản: lưu tài khoản nhận / chuyển; tài khoản NCC mới nhập thì ghi lại vào hồ sơ NCC
    const pickTk = (t) => t && String(t.soTaiKhoan || "").trim() ? {
        nganHangCode: String(t.nganHangCode || "").trim(), tenNganHang: String(t.tenNganHang || "").trim(),
        soTaiKhoan: String(t.soTaiKhoan).replace(/\s+/g, ""), chuTaiKhoan: String(t.chuTaiKhoan || "").trim().toUpperCase(),
        chiNhanh: String(t.chiNhanh || "").trim(),
    } : null;
    const tkNhan = hinhThuc === "chuyen_khoan" ? pickTk(body.tkNhan) : null;
    const tkChuyen = hinhThuc === "chuyen_khoan" ? pickTk(body.tkChuyen) : null;
    if (hinhThuc === "chuyen_khoan" && loai === "chi" && !tkNhan) throw new Error("Chuyển khoản: nhập số tài khoản nhận tiền của nhà cung cấp");
    let nccId = resolved[0].ncc || null;
    if (!nccId && loai === "chi") {
        const s = await NhaCungCap.findOne({ tenNCC: resolved[0].doiTac }).select("_id");
        nccId = s?._id || null;
    }
    if (tkNhan && loai === "chi" && nccId && body.luuTkNCC) await NhaCungCap.updateOne({ _id: nccId }, tkNhan);

    const phieu = await PhieuThanhToan.create({
        soPhieu: await nextVoucherNumber(loai, ngay), loai, ngay,
        doiTac: resolved[0].doiTac, ncc: nccId, diaChi: body.diaChi ?? resolved[0].diaChi,
        nguoiNhanNop: body.nguoiNhanNop || "", hinhThuc, soTien: tong,
        tkNhan, tkChuyen, noiDungCK: hinhThuc === "chuyen_khoan" ? String(body.noiDungCK || "").trim() : "",
        lyDo: body.lyDo || (loai === "chi" ? `Thanh toán công nợ cho ${resolved[0].doiTac}` : `Thu tiền công nợ của ${resolved[0].doiTac}`),
        nguoiLap: body.nguoiLap || "",
        phanBo: resolved.map((r) => ({ nguon: r.nguon, congNo: r.doc._id, chungTu: r.chungTu, soTien: r.soTien })),
        createdAt: ngay,
    });

    // Bút toán cho từng khoản và cập nhật số đã trả
    const ids = [];
    for (const r of resolved) {
        const entry = await journalService.postButToan({
            kyKeToan: period._id, ngayGhi: ngay, nguon: "cong_no", nguonId: phieu._id,
            noiDung: `${phieu.soPhieu}: ${loai === "chi" ? "Trả" : "Thu"} ${r.chungTu} — ${r.doiTac}`,
            tkNo: loai === "chi" ? tk331._id : tkTien._id,
            tkCo: loai === "chi" ? tkTien._id : tk131._id,
            soTien: r.soTien,
        });
        ids.push(entry._id);
        if (r.nguon === "ncc") {
            r.doc.daTra = (r.doc.daTra || 0) + r.soTien;
            r.doc.trangThai = payableStatus(r.doc.soTienNo, r.doc.daTra);
            await r.doc.save();
        } else {
            r.doc.paidAmount = (r.doc.paidAmount || 0) + r.soTien;
            await r.doc.save();
        }
    }
    phieu.butToan = ids;
    await phieu.save();
    return phieu;
}

// Hủy phiếu: xóa bút toán, hoàn lại số đã trả của các khoản nợ
async function cancelPayment(id) {
    const phieu = await PhieuThanhToan.findById(id);
    if (!phieu) throw new Error("Không tìm thấy phiếu");
    await periodForPosting(phieu.ngay); // kỳ đã khóa / đã chốt thuế thì không hủy được
    const entries = await ButToan.find({ _id: { $in: phieu.butToan } });
    await ButToan.deleteMany({ _id: { $in: phieu.butToan } });
    for (const e of entries) {
        await journalService.recomputeSoCai(e.kyKeToan, e.tkNo);
        await journalService.recomputeSoCai(e.kyKeToan, e.tkCo);
    }
    for (const pb of phieu.phanBo) {
        if (pb.nguon === "ncc") {
            const p = await CongNoPhaiTraNCC.findById(pb.congNo);
            if (p) {
                p.daTra = Math.max(0, (p.daTra || 0) - pb.soTien);
                p.trangThai = payableStatus(p.soTienNo, p.daTra);
                await p.save();
            }
        } else {
            const d = await Debt.findById(pb.congNo);
            if (d) {
                d.paidAmount = Math.max(0, (d.paidAmount || 0) - pb.soTien);
                await d.save();
            }
        }
    }
    await phieu.deleteOne();
}

module.exports = { listDebts, createPayment, cancelPayment };
