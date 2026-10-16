const express = require("express");
const router = express.Router();
const NhanVien = require("../../models/accounting/NhanVien");
const CaLam = require("../../models/accounting/CaLam");
const BangLuong = require("../../models/accounting/BangLuong");
const payrollService = require("../../services/payrollService");

const handle = (fn, code = 400) => async (req, res) => {
    try {
        res.json(await fn(req));
    } catch (err) {
        res.status(code).json({ error: err.message });
    }
};

// ==================== Nhân viên ====================
const EMP_FIELDS = ["maNV", "hoTen", "gioiTinh", "sdt", "email", "cccd", "diaChi", "boPhan", "chucVu", "loaiHopDong",
    "hinhThucLuong", "maSoThue", "nganHang", "soTaiKhoan", "ghiChu"];
const EMP_NUMBERS = ["luongCoBan", "luongGio", "phuCapAnCa", "phuCapTrachNhiem", "phuCapKhac", "luongDongBH", "soNguoiPhuThuoc"];

function employeeData(b) {
    const d = {};
    for (const k of EMP_FIELDS) if (b[k] !== undefined) d[k] = String(b[k] ?? "").trim();
    for (const k of EMP_NUMBERS) if (b[k] !== undefined) d[k] = Math.max(0, Math.round(Number(b[k]) || 0));
    for (const k of ["ngaySinh", "ngayVaoLam", "ngayNghiViec"]) if (b[k] !== undefined) d[k] = b[k] ? new Date(b[k]) : null;
    if (b.thamGiaBHXH !== undefined) d.thamGiaBHXH = !!b.thamGiaBHXH;
    if (b.dangLamViec !== undefined) d.dangLamViec = !!b.dangLamViec;
    if (d.dangLamViec === false && !d.ngayNghiViec && b.ngayNghiViec === undefined) d.ngayNghiViec = new Date();
    if (d.dangLamViec === true) d.ngayNghiViec = null;
    return d;
}

function validateEmployee(d) {
    if (!d.hoTen) throw new Error("Vui lòng nhập họ tên");
    if (!d.chucVu) throw new Error("Vui lòng nhập chức vụ");
    if (d.hinhThucLuong === "gio" ? !(d.luongGio > 0) : !(d.luongCoBan > 0)) throw new Error(d.hinhThucLuong === "gio" ? "Vui lòng nhập đơn giá lương giờ" : "Vui lòng nhập lương cơ bản tháng");
}

async function nextEmployeeCode() {
    const list = await NhanVien.find({ maNV: /^NV\d+$/ }).select("maNV").lean();
    return "NV" + String(list.reduce((m, x) => Math.max(m, Number(x.maNV.slice(2))), 0) + 1).padStart(3, "0");
}

router.get("/acc/employees", handle(async () => {
    const list = await NhanVien.find().sort({ dangLamViec: -1, maNV: 1, hoTen: 1 }).lean();
    const thisMonth = new Date(); thisMonth.setUTCDate(1); thisMonth.setUTCHours(0, 0, 0, 0);
    const counts = new Map((await CaLam.aggregate([
        { $match: { ngayLam: { $gte: thisMonth }, loai: "lam" } },
        { $group: { _id: "$nhanVien", n: { $addToSet: "$ngayLam" } } },
    ])).map((c) => [String(c._id), c.n.length]));
    return list.map((e) => ({ ...e, soNgayLamThangNay: counts.get(String(e._id)) || 0 }));
}, 500));

router.get("/acc/employees/meta", (req, res) => res.json({ cauHinh: { ...payrollService.CAU_HINH, bieuThue: undefined }, caMau: payrollService.CA_MAU }));

router.get("/acc/employees/:id", handle(async (req) => {
    const e = await NhanVien.findById(req.params.id).lean();
    if (!e) throw new Error("Không tìm thấy nhân viên");
    e.lichSuLuong = await BangLuong.find({ nhanVien: e._id }).populate("kyKeToan", "thang tenKy").sort({ ngayTinh: -1 }).limit(12).lean();
    return e;
}));

router.post("/acc/employees", handle(async (req) => {
    const d = employeeData(req.body);
    validateEmployee(d);
    if (!d.maNV) d.maNV = await nextEmployeeCode();
    else if (await NhanVien.exists({ maNV: d.maNV })) throw new Error(`Mã nhân viên ${d.maNV} đã tồn tại`);
    if (!d.ngayVaoLam) d.ngayVaoLam = new Date();
    return NhanVien.create(d);
}));

router.put("/acc/employees/:id", handle(async (req) => {
    const e = await NhanVien.findById(req.params.id);
    if (!e) throw new Error("Không tìm thấy nhân viên");
    const d = employeeData(req.body);
    if (d.maNV && d.maNV !== e.maNV && await NhanVien.exists({ maNV: d.maNV })) throw new Error(`Mã nhân viên ${d.maNV} đã tồn tại`);
    Object.assign(e, d);
    validateEmployee(e);
    return e.save();
}));

router.delete("/acc/employees/:id", handle(async (req) => {
    const id = req.params.id;
    if (await BangLuong.exists({ nhanVien: id }) || await CaLam.exists({ nhanVien: id })) {
        throw new Error("Nhân viên đã có chấm công / bảng lương, không thể xóa. Hãy chuyển trạng thái sang Nghỉ việc");
    }
    const e = await NhanVien.findByIdAndDelete(id);
    if (!e) throw new Error("Không tìm thấy nhân viên");
    return { message: "Đã xóa nhân viên" };
}));

// ==================== Chấm công ====================
router.get("/acc/timesheet", handle((req) => {
    if (!/^\d{4}-\d{2}$/.test(req.query.thang || "")) throw new Error("Tháng không hợp lệ");
    return payrollService.timesheet(req.query.thang);
}));

router.get("/acc/shifts", handle(async (req) => {
    const filter = {};
    if (req.query.employee) filter.nhanVien = req.query.employee;
    return CaLam.find(filter).populate("nhanVien").sort({ ngayLam: -1 });
}, 500));
router.post("/acc/shifts/bulk", handle((req) => payrollService.bulkShifts(req.body)));
router.post("/acc/shifts", handle((req) => payrollService.saveShift(req.body)));
router.put("/acc/shifts/:id", handle((req) => payrollService.saveShift(req.body, req.params.id)));
router.delete("/acc/shifts/:id", handle(async (req) => { await payrollService.deleteShift(req.params.id); return { message: "Đã xóa ca làm" }; }));

// ==================== Bảng lương ====================
router.get("/acc/payroll", handle((req) => {
    if (!req.query.period) throw new Error("Thiếu kỳ kế toán");
    return payrollService.getPayroll(req.query.period);
}));
router.post("/acc/payroll/run", handle((req) => {
    if (!req.body.period) throw new Error("Thiếu kỳ kế toán");
    return payrollService.calcPayroll(req.body.period);
}));
router.post("/acc/payroll/close", handle((req) => payrollService.closePayroll(req.body.period, req.body.ids)));
router.post("/acc/payroll/reopen", handle((req) => payrollService.reopenPayroll(req.body.period, req.body.ids)));
router.post("/acc/payroll/pay", handle((req) => payrollService.payPayroll(req.body.period, req.body)));
router.post("/acc/payroll/advance", handle((req) => payrollService.advance(req.body.period, req.body)));
router.put("/acc/payroll/rows/:id", handle((req) => payrollService.updateRow(req.params.id, req.body)));
router.delete("/acc/payroll/rows/:id", handle(async (req) => { await payrollService.deleteRow(req.params.id); return { message: "Đã xóa dòng lương" }; }));
router.delete("/acc/payroll/rows/:id/pay", handle((req) => payrollService.unpayRow(req.params.id)));
router.delete("/acc/payroll/rows/:id/advance/:index", handle((req) => payrollService.removeAdvance(req.params.id, Number(req.params.index))));

module.exports = router;
