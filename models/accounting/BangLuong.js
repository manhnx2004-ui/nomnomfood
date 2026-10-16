const mongoose = require("mongoose");

// Một dòng bảng thanh toán tiền lương (mẫu 02-LĐTL) của nhân viên trong kỳ
//   nhap → da_chot (ghi sổ chi phí, BH, thuế) → da_tra (chi trả thực lĩnh)
const BangLuongSchema = new mongoose.Schema({
    nhanVien: { type: mongoose.Schema.Types.ObjectId, ref: "NhanVien", required: true },
    kyKeToan: { type: mongoose.Schema.Types.ObjectId, ref: "KyKeToan", required: true },
    trangThai: { type: String, enum: ["nhap", "da_chot", "da_tra"], default: "nhap" },

    // Ảnh chụp hồ sơ lúc tính lương
    hoTen: { type: String, default: "" },
    chucVu: { type: String, default: "" },
    boPhan: { type: String, default: "" },
    hinhThucLuong: { type: String, default: "thang" },
    mucLuong: { type: Number, default: 0 },        // lương tháng hoặc đơn giá giờ

    ngayCong: { type: Number, default: 0 },        // công làm + phép + lễ (lương tháng)
    soNgayLam: { type: Number, default: 0 },       // số ngày đi làm thực tế
    tongGioLam: { type: Number, required: true, default: 0 },
    gioTangCa: { type: Number, default: 0 },
    gioLe: { type: Number, default: 0 },

    luongChinh: { type: Number, default: 0 },
    luongTangCa: { type: Number, default: 0 },
    phuCap: { type: Number, default: 0 },
    phuCapAnCa: { type: Number, default: 0 },
    thuong: { type: Number, default: 0 },
    tongThuNhap: { type: Number, default: 0 },
    bhNLD: { type: Number, default: 0 },           // BHXH 8% + BHYT 1.5% + BHTN 1% trừ vào lương
    bhDN: { type: Number, default: 0 },            // 21.5% doanh nghiệp đóng, tính vào chi phí
    thuNhapTinhThue: { type: Number, default: 0 },
    thueTNCN: { type: Number, default: 0 },
    khauTru: { type: Number, default: 0 },         // phạt, bồi thường
    tamUng: { type: Number, default: 0 },
    tamUngList: [{ ngay: Date, soTien: Number, hinhThuc: String, butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan" } }],
    luongThucLinh: { type: Number, required: true, default: 0 },
    ghiChu: { type: String, default: "" },

    butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null }, // dữ liệu cũ
    butToanChot: [{ type: mongoose.Schema.Types.ObjectId, ref: "ButToan" }],
    butToanTra: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null },
    hinhThucTra: { type: String, default: "" },
    ngayTra: { type: Date, default: null },
    ngayTinh: { type: Date, default: Date.now },
});

BangLuongSchema.index({ nhanVien: 1, kyKeToan: 1 }, { unique: true });

module.exports = mongoose.model("BangLuong", BangLuongSchema);
