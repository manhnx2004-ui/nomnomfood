const mongoose = require("mongoose");

const KhauHaoSchema = new mongoose.Schema({
    taiSan: { type: mongoose.Schema.Types.ObjectId, ref: "TaiSanCoDinh", required: true },
    kyKeToan: { type: mongoose.Schema.Types.ObjectId, ref: "KyKeToan", required: true },
    butToan: { type: mongoose.Schema.Types.ObjectId, ref: "ButToan", default: null },
    soTienKhauHao: { type: Number, required: true },
    ngayGhiNhan: { type: Date, default: Date.now },
});

KhauHaoSchema.index({ taiSan: 1, kyKeToan: 1 }, { unique: true });

module.exports = mongoose.model("KhauHao", KhauHaoSchema);
