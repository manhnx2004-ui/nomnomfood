const mongoose = require("mongoose");

// Phiếu xuất kho nguyên liệu (theo mẫu 02-VT); các dòng chi tiết lưu ở model NguyenLieu
//   ban_hang  — xuất chế biến tự động khi bếp nhận nấu đơn hàng (Nợ 632 / Có 152)
//   che_bien  — xuất chế biến / sơ chế theo ca, xuất thủ công (Nợ 632 / Có 152)
//   huy_hong  — hủy nguyên liệu hư hỏng, hết hạn (Nợ 632 / Có 152)
//   noi_bo    — xuất dùng nội bộ: bữa ăn nhân viên, quản lý (Nợ 642 / Có 152)
const PhieuXuatNLSchema = new mongoose.Schema({
    soPhieu: { type: String, unique: true, sparse: true },
    loaiXuat: { type: String, enum: ["ban_hang", "che_bien", "huy_hong", "noi_bo"], default: "che_bien" },
    kho: { type: mongoose.Schema.Types.ObjectId, ref: "Kho", default: null }, // null: xuất từ nhiều kho
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null },
    ngayXuat: { type: Date, default: Date.now },
    lyDoXuat: { type: String, default: "" },
    nguoiNhan: { type: String, default: "" },
    nguoiLap: { type: String, default: "" },
    tongTien: { type: Number, default: 0 },
    amKho: { type: Boolean, default: false }, // có dòng xuất vượt tồn (bếp xác nhận vẫn nấu)
    ghiChu: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PhieuXuatNL", PhieuXuatNLSchema);
