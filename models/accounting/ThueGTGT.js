const mongoose = require("mongoose");

// Tờ khai thuế GTGT theo kỳ kế toán (phương pháp khấu trừ, giá bán đã gồm thuế)
const ThueGTGTSchema = new mongoose.Schema({
    kyKeToan: { type: mongoose.Schema.Types.ObjectId, ref: "KyKeToan", required: true, unique: true },

    // Thiết lập (sửa được khi tờ khai còn ở trạng thái nháp)
    thueSuatDauRa: { type: Number, enum: [0, 5, 8, 10], default: 8 },
    dieuChinhTang: { type: Number, default: 0, min: 0 },
    dieuChinhGiam: { type: Number, default: 0, min: 0 },
    ghiChu: { type: String, default: "" },

    // Số liệu tính toán
    giaTriMuaVao: { type: Number, default: 0 },
    thueDauVao: { type: Number, default: 0 },
    doanhThuGomThue: { type: Number, default: 0 },
    doanhThuChuaThue: { type: Number, default: 0 },
    thueDauRa: { type: Number, default: 0 },
    kyTruocChuyenSang: { type: Number, default: 0 },
    thuePhaiNop: { type: Number, default: 0 },
    conDuocKhauTru: { type: Number, default: 0 },

    // nhap: đang lập · da_chot: đã chốt và ghi sổ · da_nop: đã nộp tiền thuế
    trangThai: { type: String, enum: ["nhap", "da_chot", "da_nop"], default: "nhap" },
    ngayChot: { type: Date, default: null },
    ngayNop: { type: Date, default: null },
    butToan: [{ type: mongoose.Schema.Types.ObjectId, ref: "ButToan" }],
    ngayTinh: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ThueGTGT", ThueGTGTSchema);
