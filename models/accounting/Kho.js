const mongoose = require("mongoose");

const KhoSchema = new mongoose.Schema({
    tenKho: { type: String, required: true },
    diaDiem: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Kho", KhoSchema);
