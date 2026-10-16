const mongoose = require("mongoose");

const ChiTietKiemKeSchema = new mongoose.Schema({
    danhMucNL: { type: mongoose.Schema.Types.ObjectId, ref: "DanhMucNL", required: true },
    tenNL: { type: String, required: true },
    donViTinh: { type: String, default: "" },
    tonSoSach: { type: Number, required: true },
    tonThucTe: { type: Number, required: true, min: 0 },
    chenhLech: { type: Number, required: true },     // thực tế - sổ sách (âm: thiếu, dương: thừa)
    donGia: { type: Number, default: 0 },
    giaTriChenhLech: { type: Number, default: 0 },
    lyDo: { type: String, default: "" },
}, { _id: false });

// Biên bản kiểm kê kho nguyên liệu (mẫu 05-VT): điều chỉnh tồn sổ sách theo thực tế
//   Thiếu: Nợ 632 / Có 152 · Thừa: Nợ 152 / Có 711
const PhieuKiemKeSchema = new mongoose.Schema({
    soPhieu: { type: String, required: true, unique: true },
    ngay: { type: Date, default: Date.now },
    kho: { type: mongoose.Schema.Types.ObjectId, ref: "Kho", default: null },
    nguoiKiem: { type: String, default: "" },
    ghiChu: { type: String, default: "" },
    chiTiet: { type: [ChiTietKiemKeSchema], default: [] },
    giaTriThieu: { type: Number, default: 0 },
    giaTriThua: { type: Number, default: 0 },
    butToan: [{ type: mongoose.Schema.Types.ObjectId, ref: "ButToan" }],
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PhieuKiemKe", PhieuKiemKeSchema);
