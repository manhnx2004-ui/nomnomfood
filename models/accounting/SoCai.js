const mongoose = require("mongoose");

const SoCaiSchema = new mongoose.Schema({
    kyKeToan: { type: mongoose.Schema.Types.ObjectId, ref: "KyKeToan", required: true },
    tkKeToan: { type: mongoose.Schema.Types.ObjectId, ref: "TKKeToan", required: true },
    tongNo: { type: Number, default: 0 },
    tongCo: { type: Number, default: 0 },
    soDu: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
});

SoCaiSchema.index({ kyKeToan: 1, tkKeToan: 1 }, { unique: true });

module.exports = mongoose.model("SoCai", SoCaiSchema);
