const mongoose = require("mongoose");

// Dòng chi tiết của phiếu xuất kho nguyên liệu
const NguyenLieuSchema = new mongoose.Schema({
    danhMucNL: { type: mongoose.Schema.Types.ObjectId, ref: "DanhMucNL", required: true },
    phieuXuat: { type: mongoose.Schema.Types.ObjectId, ref: "PhieuXuatNL", required: true },
    soLuong: { type: Number, required: true },
    donGia: { type: Number, default: null },   // giá vốn bình quân tại thời điểm xuất
    thanhTien: { type: Number, default: null },
    tonTruoc: { type: Number, default: null }, // tồn kho trước khi xuất
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NguyenLieu", NguyenLieuSchema);
