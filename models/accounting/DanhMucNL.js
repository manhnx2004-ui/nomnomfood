const mongoose = require("mongoose");

const DanhMucNLSchema = new mongoose.Schema({
    maNL: { type: String, default: "" },
    tenNL: { type: String, required: true },
    donViTinh: { type: String, default: "kg" },
    kho: { type: mongoose.Schema.Types.ObjectId, ref: "Kho", required: true },
    tonToiThieu: { type: Number, default: 0 },
    // Tồn kho và giá vốn chỉ thay đổi qua phiếu nhập / phiếu xuất / kiểm kê
    giaVonBinhQuan: { type: Number, default: 0 },
    tonHienTai: { type: Number, default: 0 },
    ghiChu: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DanhMucNL", DanhMucNLSchema);
