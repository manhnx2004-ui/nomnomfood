const mongoose = require("mongoose");

const OnlineSchema = new mongoose.Schema({
    tenKenh: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Online", OnlineSchema);
