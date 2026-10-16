const mongoose = require("mongoose");

// Tài sản cố định hữu hình của nhà hàng (TK 211), khấu hao đường thẳng theo tháng (TK 214)
const TaiSanCoDinhSchema = new mongoose.Schema({
    maTS: { type: String, default: "" },
    tenTaiSan: { type: String, required: true },
    nhom: {
        type: String,
        enum: ["thiet_bi_bep", "thiet_bi_pha_che", "thiet_bi_lanh", "noi_that", "phuong_tien", "thiet_bi_quan_ly", "nha_cua", "khac"],
        default: "khac",
    },
    loaiTaiSan: { type: String, default: "" },          // mô tả loại (giữ tương thích dữ liệu cũ)
    boPhan: { type: String, enum: ["bep", "bar", "sanh", "giao_hang", "van_phong"], default: "bep" },
    viTri: { type: String, default: "" },
    nhanHieu: { type: String, default: "" },            // nhãn hiệu / model
    soSeri: { type: String, default: "" },
    nuocSanXuat: { type: String, default: "" },
    nhaCungCap: { type: String, default: "" },
    soChungTu: { type: String, default: "" },           // số hóa đơn mua
    baoHanhDen: { type: Date, default: null },

    nguyenGia: { type: Number, required: true, min: 1 },
    ngayMua: { type: Date, required: true },             // ngày đưa vào sử dụng, bắt đầu khấu hao từ tháng này
    thoiGianKhauHaoThang: { type: Number, required: true, min: 1 },
    tkChiPhi: { type: String, enum: ["642", "632"], default: "642" },

    // Nguồn hình thành khi ghi tăng: 111 tiền mặt · 112 chuyển khoản · 331 mua chịu · 411 góp vốn / có từ trước
    nguonHinhThanh: { type: String, enum: ["111", "112", "331", "411", "khong_ghi_so"], default: "khong_ghi_so" },
    haoMonDauKy: { type: Number, default: 0 },           // hao mòn lũy kế trước khi theo dõi trên phần mềm (chỉ với 411)
    congNo: { type: mongoose.Schema.Types.ObjectId, ref: "Debt", default: null },
    butToanGhiTang: [{ type: mongoose.Schema.Types.ObjectId, ref: "ButToan" }],

    trangThai: { type: String, enum: ["dang_su_dung", "tam_ngung", "het_khau_hao", "thanh_ly"], default: "dang_su_dung" },
    thanhLy: {
        ngay: Date,
        giaBan: { type: Number, default: 0 },
        chiPhi: { type: Number, default: 0 },
        hinhThuc: { type: String, enum: ["111", "112"], default: "111" },
        lyDo: { type: String, default: "" },
        nguyenGia: Number, haoMon: Number, giaTriConLai: Number,
        butToan: [{ type: mongoose.Schema.Types.ObjectId, ref: "ButToan" }],
    },
    ghiChu: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TaiSanCoDinh", TaiSanCoDinhSchema);
