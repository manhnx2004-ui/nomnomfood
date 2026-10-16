const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String,
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    isLocked: { type: Boolean, default: false },
    avatar: { type: String, default: '' },
    addresses: [
        {
            street: String,
            city: String,
            state: String,
            postalCode: String,
            country: String,
        },
    ],
    createdAt: { type: Date, default: Date.now },
});

UserSchema.plugin(require("./passwordPlugin"));

module.exports = mongoose.model("User", UserSchema);
