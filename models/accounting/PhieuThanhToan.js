const mongoose = require("mongoose");

// Một khoản công nợ được thanh toán trong phiếu
const PhanBoSchema = new mongoose.Schema({
    nguon: { type: String, enum: ["ncc", "khac"], required: true }, // ncc: công nợ hóa đơn mua · khac: công nợ nhập tay
    congNo: { type: mongoose.Schema.Types.ObjectId, required: true }, // CongNoPhaiTraNCC hoặc Debt
    chungTu: { type: String, default: "" },                            // số hóa đơn / diễn giải khoản nợ
    soTien: { type: Number, required: true, min: 0 },
}, { _id: false });

const TaiKhoanSchema = new mongoose.Schema({
    nganHangCode: { type: String, default: "" },
    tenNganHang: { type: String, default: "" },
    soTaiKhoan: { type: String, default: "" },
    chuTaiKhoan: { type: String, default: "" },
    chiNhanh: { type: String, default: "" },
}, { _id: false });

// Phiếu chi (trả nợ) / phiếu thu (thu nợ) — mẫu 02-TT / 01-TT
const PhieuThanhToanSchema = new mongoose.Schema({
    soPhieu: { type: String, required: true, unique: true },
    loai: { type: String, enum: ["chi", "thu"], required: true },
    ngay: { type: Date, default: Date.now },
    doiTac: { type: String, required: true },
    ncc: { type: mongoose.Schema.Types.ObjectId, ref: "NhaCungCap", default: null },
    nguoiNhanNop: { type: String, default: "" },   // người nhận tiền (phiếu chi) / người nộp tiền (phiếu thu)
    diaChi: { type: String, default: "" },
    hinhThuc: { type: String, enum: ["tien_mat", "chuyen_khoan"], default: "tien_mat" },
    soTien: { type: Number, required: true, min: 0 },
    // Chuyển khoản: tài khoản bên nhận tiền và tài khoản bên chuyển (ảnh chụp tại thời điểm lập phiếu)
    tkNhan: { type: TaiKhoanSchema, default: null },
    tkChuyen: { type: TaiKhoanSchema, default: null },
    noiDungCK: { type: String, default: "" },
    lyDo: { type: String, default: "" },
    nguoiLap: { type: String, default: "" },
    phanBo: { type: [PhanBoSchema], default: [] },
    butToan: [{ type: mongoose.Schema.Types.ObjectId, ref: "ButToan" }],
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PhieuThanhToan", PhieuThanhToanSchema);
