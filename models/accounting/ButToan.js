const mongoose = require("mongoose");

const ButToanSchema = new mongoose.Schema({
    kyKeToan: { type: mongoose.Schema.Types.ObjectId, ref: "KyKeToan", required: true },
    ngayGhi: { type: Date, required: true, default: Date.now },
    noiDung: { type: String, required: true },
    tkNo: { type: mongoose.Schema.Types.ObjectId, ref: "TKKeToan", required: true },
    tkCo: { type: mongoose.Schema.Types.ObjectId, ref: "TKKeToan", required: true },
    soTien: { type: Number, required: true, min: 0 },
    nguon: {
        type: String,
        enum: ["thu_chi", "cong_no", "don_hang", "mua_hang", "khau_hao", "luong", "thue", "hoan_tien", "thu_cong", "kho", "tai_san"],
        default: "thu_cong",
    },
    nguonId: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ButToan", ButToanSchema);
