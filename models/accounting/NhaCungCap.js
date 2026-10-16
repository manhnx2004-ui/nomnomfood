const mongoose = require("mongoose");

const NhaCungCapSchema = new mongoose.Schema({
    tenNCC: { type: String, required: true },
    diaChi: { type: String },
    sdt: { type: String },
    maSoThue: { type: String },
    nhomHang: { type: String, default: "" },
    // Tài khoản ngân hàng nhận tiền của nhà cung cấp (dùng khi trả nợ bằng chuyển khoản)
    nganHangCode: { type: String, default: "" },
    tenNganHang: { type: String, default: "" },
    soTaiKhoan: { type: String, default: "" },
    chuTaiKhoan: { type: String, default: "" },
    chiNhanh: { type: String, default: "" }, // VD: Hải sản, Rau củ quả
    // Danh mục nguyên liệu nhà cung cấp này cung cấp (dùng để lọc khi lập phiếu nhập / hóa đơn)
    nguyenLieuCungCap: [{ type: mongoose.Schema.Types.ObjectId, ref: "DanhMucNL" }],
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NhaCungCap", NhaCungCapSchema);
