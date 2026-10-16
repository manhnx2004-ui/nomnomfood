const mongoose = require("mongoose");

// Dòng nguyên liệu trên phiếu nhập kho
const ChiTietNhapSchema = new mongoose.Schema({
    danhMucNL: { type: mongoose.Schema.Types.ObjectId, ref: "DanhMucNL", required: true },
    tenNL: { type: String, required: true },            // lưu lại tên tại thời điểm nhập
    donViTinh: { type: String, default: "kg" },
    soLuongChungTu: { type: Number, default: 0, min: 0 }, // theo hóa đơn / phiếu giao hàng
    soLuongThucNhap: { type: Number, required: true, min: 0 },
    donGia: { type: Number, required: true, min: 0 },
    thanhTien: { type: Number, required: true, min: 0 },
}, { _id: false });

// Phiếu nhập kho nguyên liệu (theo mẫu 01-VT)
const PhieuNhapKhoSchema = new mongoose.Schema({
    soPhieu: { type: String, unique: true, sparse: true },
    ncc: { type: mongoose.Schema.Types.ObjectId, ref: "NhaCungCap", required: true },
    kho: { type: mongoose.Schema.Types.ObjectId, ref: "Kho", default: null },
    ngayNhap: { type: Date, default: Date.now },
    nguoiGiao: { type: String, default: "" },
    nguoiLap: { type: String, default: "" },
    soChungTu: { type: String, default: "" },   // số hóa đơn / phiếu giao hàng kèm theo
    dienGiai: { type: String, default: "" },
    chiTiet: { type: [ChiTietNhapSchema], default: [] },
    tienHang: { type: Number, default: 0 },
    thueSuat: { type: Number, default: 0 },
    thueGtgt: { type: Number, default: 0 },
    tongTien: { type: Number, required: true },  // tổng thanh toán = tiền hàng + thuế
    hoaDonMua: { type: mongoose.Schema.Types.ObjectId, ref: "HoaDonMuaNL", default: null },
    butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PhieuNhapKho", PhieuNhapKhoSchema);
