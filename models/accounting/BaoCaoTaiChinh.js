const mongoose = require("mongoose");

const BaoCaoTaiChinhSchema = new mongoose.Schema({
    kyKeToan: { type: mongoose.Schema.Types.ObjectId, ref: "KyKeToan", required: true },
    loaiBaoCao: { type: String, enum: ["bang_can_doi_ke_toan", "ket_qua_kinh_doanh"], required: true },
    ngayLap: { type: Date, default: Date.now },
    duLieu: { type: mongoose.Schema.Types.Mixed, default: {} },
});

BaoCaoTaiChinhSchema.index({ kyKeToan: 1, loaiBaoCao: 1 }, { unique: true });

module.exports = mongoose.model("BaoCaoTaiChinh", BaoCaoTaiChinhSchema);
