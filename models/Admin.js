const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "shipper"], default: "admin" },
    avatar: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

AdminSchema.plugin(require("./passwordPlugin"));

module.exports = mongoose.model("Admin", AdminSchema);
