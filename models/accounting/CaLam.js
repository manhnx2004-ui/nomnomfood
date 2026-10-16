const mongoose = require("mongoose");

// Một ô chấm công: ca làm việc hoặc ngày nghỉ của nhân viên trong một ngày
//   loai: lam (đi làm) · phep (nghỉ phép có lương) · nghi_le (nghỉ lễ có lương) · khong_luong (nghỉ không lương)
//   ngayLe: đi làm vào ngày lễ, tết → tính 300%
const CaLamSchema = new mongoose.Schema({
    nhanVien: { type: mongoose.Schema.Types.ObjectId, ref: "NhanVien", required: true },
    ngayLam: { type: Date, required: true },
    ca: { type: String, default: "tu_chon" },
    loai: { type: String, enum: ["lam", "phep", "nghi_le", "khong_luong"], default: "lam" },
    gioBatDau: { type: String, default: "" },
    gioKetThuc: { type: String, default: "" },
    nghiGiua: { type: Number, default: 0 },  // phút nghỉ giữa ca (không tính công)
    ngayLe: { type: Boolean, default: false },
    ghiChu: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

CaLamSchema.index({ nhanVien: 1, ngayLam: 1 });

module.exports = mongoose.model("CaLam", CaLamSchema);
