const mongoose = require("mongoose");

const HoaDonBanHangSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    soHoaDon: { type: String, required: true, unique: true },
    tienHang: { type: Number, required: true },
    thueGtgtDauRa: { type: Number, default: 0 },
    ngayLap: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HoaDonBanHang", HoaDonBanHangSchema);
