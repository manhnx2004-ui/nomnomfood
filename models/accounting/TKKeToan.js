const mongoose = require("mongoose");

const TKKeToanSchema = new mongoose.Schema({
    soHieuTK: { type: String, required: true, unique: true },
    tenTK: { type: String, required: true },
    loaiTK: {
        type: String,
        enum: ["tai_san", "no_phai_tra", "von_chu_so_huu", "doanh_thu", "chi_phi"],
        required: true,
    },
    banChat: { type: String, enum: ["no", "co"], required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TKKeToan", TKKeToanSchema);
