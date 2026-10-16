const mongoose = require("mongoose");

const TaiKhoanNganHangSchema = new mongoose.Schema({
    nganHangCode: { type: String, required: true },
    tenNganHang: { type: String, required: true },
    soTaiKhoan: { type: String, required: true },
    chuTaiKhoan: { type: String, required: true },
    chiNhanh: { type: String, default: '' },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TaiKhoanNganHang", TaiKhoanNganHangSchema);
