const mongoose = require("mongoose");

// Dòng hàng hóa trên hóa đơn mua
const ChiTietHoaDonSchema = new mongoose.Schema({
    danhMucNL: { type: mongoose.Schema.Types.ObjectId, ref: "DanhMucNL", default: null },
    tenHang: { type: String, required: true },
    donViTinh: { type: String, default: "" },
    soLuong: { type: Number, default: 0, min: 0 },
    donGia: { type: Number, default: 0, min: 0 },
    thanhTien: { type: Number, required: true, min: 0 },
}, { _id: false });

// Hóa đơn mua nguyên liệu (hóa đơn GTGT đầu vào của nhà cung cấp)
const HoaDonMuaNLSchema = new mongoose.Schema({
    ncc: { type: mongoose.Schema.Types.ObjectId, ref: "NhaCungCap", required: true },
    phieuNhap: { type: mongoose.Schema.Types.ObjectId, ref: "PhieuNhapKho", default: null },
    mauSo: { type: String, default: "" },        // VD: 1 (hóa đơn GTGT)
    kyHieu: { type: String, default: "" },       // VD: C26TAA
    soHoaDon: { type: String, required: true },
    ngayHoaDon: { type: Date, default: null },
    chiTiet: { type: [ChiTietHoaDonSchema], default: [] },
    tienHang: { type: Number, required: true },
    thueSuat: { type: Number, default: 0 },
    thueGtgtDauVao: { type: Number, default: 0 },
    // cong_no: ghi nợ nhà cung cấp · tien_mat / chuyen_khoan: đã thanh toán ngay khi nhận hóa đơn
    hinhThucTT: { type: String, enum: ["cong_no", "tien_mat", "chuyen_khoan"], default: "cong_no" },
    hanThanhToan: { type: Date, default: null },
    ghiChu: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HoaDonMuaNL", HoaDonMuaNLSchema);
