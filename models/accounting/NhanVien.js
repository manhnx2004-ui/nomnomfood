const mongoose = require("mongoose");

// Hồ sơ nhân viên nhà hàng: thông tin cá nhân, hợp đồng, lương - phụ cấp, bảo hiểm, thuế TNCN
const NhanVienSchema = new mongoose.Schema({
    maNV: { type: String, default: "" },
    hoTen: { type: String, required: true },
    gioiTinh: { type: String, enum: ["nam", "nu", ""], default: "" },
    ngaySinh: { type: Date, default: null },
    sdt: { type: String, default: "" },
    email: { type: String, default: "" },
    cccd: { type: String, default: "" },
    diaChi: { type: String, default: "" },

    boPhan: { type: String, enum: ["bep", "bar", "phuc_vu", "thu_ngan", "giao_hang", "quan_ly"], default: "phuc_vu" },
    chucVu: { type: String, required: true },
    loaiHopDong: { type: String, enum: ["chinh_thuc", "thu_viec", "thoi_vu"], default: "chinh_thuc" },
    ngayVaoLam: { type: Date, default: null },
    ngayNghiViec: { type: Date, default: null },

    // Lương tháng: trả theo ngày công / ngày công chuẩn · Lương giờ: trả theo số giờ làm (part-time)
    hinhThucLuong: { type: String, enum: ["thang", "gio"], default: "thang" },
    luongCoBan: { type: Number, required: true, default: 0 }, // lương tháng (hoặc 0 nếu trả theo giờ)
    luongGio: { type: Number, default: 0 },
    phuCapAnCa: { type: Number, default: 0 },    // đ / ngày công
    phuCapTrachNhiem: { type: Number, default: 0 }, // đ / tháng
    phuCapKhac: { type: Number, default: 0 },    // xăng xe, điện thoại... đ / tháng

    thamGiaBHXH: { type: Boolean, default: false },
    luongDongBH: { type: Number, default: 0 },   // 0: dùng lương cơ bản
    maSoThue: { type: String, default: "" },
    soNguoiPhuThuoc: { type: Number, default: 0 },

    nganHang: { type: String, default: "" },
    soTaiKhoan: { type: String, default: "" },

    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    dangLamViec: { type: Boolean, default: true },
    ghiChu: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NhanVien", NhanVienSchema);
