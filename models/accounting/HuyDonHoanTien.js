const mongoose = require("mongoose");

const HuyDonHoanTienSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    lyDo: { type: String, required: true },
    soTienHoan: { type: Number, required: true },
    butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null },
    trangThai: {
        type: String,
        enum: ["yeu_cau", "da_kiem_tra", "da_hoan_tien", "tu_choi"],
        default: "yeu_cau",
    },
    daXacNhanCK: { type: Boolean, default: false },
    nguoiYeuCau: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HuyDonHoanTien", HuyDonHoanTienSchema);
