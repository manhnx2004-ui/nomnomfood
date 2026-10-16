const mongoose = require("mongoose");

const CongNoPhaiTraNCCSchema = new mongoose.Schema({
    ncc: { type: mongoose.Schema.Types.ObjectId, ref: "NhaCungCap", required: true },
    hoaDonMua: { type: mongoose.Schema.Types.ObjectId, ref: "HoaDonMuaNL", required: true },
    butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null },
    soTienNo: { type: Number, required: true },
    daTra: { type: Number, default: 0 },
    trangThai: {
        type: String,
        enum: ["chua_thanh_toan", "da_thanh_toan_mot_phan", "da_thanh_toan"],
        default: "chua_thanh_toan",
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CongNoPhaiTraNCC", CongNoPhaiTraNCCSchema);
