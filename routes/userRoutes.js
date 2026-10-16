const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Admin = require("../models/Admin");
const { createToken } = require("../services/authToken");
const { isAdmin } = require("../middleware/auth");

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Đăng ký: chỉ nhận các trường an toàn — không cho tự đặt role / isLocked (trước đây gửi role:"admin" là thành admin)
router.post("/auth/register", async (req, res) => {
  try {
    const name = str(req.body.name, 100);
    const email = str(req.body.email, 200).toLowerCase();
    const phone = str(req.body.phone, 20);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!name || !email || !password) return res.status(400).json({ error: "Vui lòng nhập đủ họ tên, email và mật khẩu" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    if (password.length < 6) return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });

    const existing = (await User.findOne({ email })) || (await Admin.findOne({ email }));
    if (existing) return res.status(400).json({ error: "Email already exists" });
    const user = new User({ name, email, phone, password, role: "customer" });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Đăng nhập: trả về thông tin tài khoản + token (frontend gửi token trong header Authorization)
router.post("/auth/login", async (req, res) => {
  try {
    const email = str(req.body.email, 200);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    // Tìm đúng email đã nhập, rồi thử dạng chữ thường (tài khoản mới đăng ký lưu chữ thường)
    const findByEmail = async (Model) =>
      (await Model.findOne({ email })) || (email !== email.toLowerCase() ? await Model.findOne({ email: email.toLowerCase() }) : null);

    // Check User collection first
    const user = await findByEmail(User);
    if (user) {
      if (!(await user.verifyPassword(password))) {
        return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
      }
      if (user.isLocked) {
        return res.status(403).json({ error: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." });
      }
      return res.json({ ...user.toJSON(), token: createToken(user, "u") });
    }

    // Check Admin collection
    const admin = await findByEmail(Admin);
    if (!admin || !(await admin.verifyPassword(password))) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    }
    res.json({ ...admin.toJSON(), token: createToken(admin, "a") });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/users", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (typeof search === "string" && search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query = {
        $or: [
          { name: { $regex: safe, $options: "i" } },
          { email: { $regex: safe, $options: "i" } },
          { phone: { $regex: safe, $options: "i" } },
        ],
      };
    }
    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    // ID sai định dạng (vd tài khoản cũ trong trình duyệt) → không tìm thấy, không phải lỗi server
    if (!require("mongoose").isValidObjectId(req.params.id)) return res.status(404).json({ error: "User not found" });
    const user = await User.findById(req.params.id);
    if (user) return res.json(user);
    const admin = await Admin.findById(req.params.id);
    if (admin) return res.json(admin);
    res.status(404).json({ error: "User not found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const update = { ...req.body };
    delete update._id;
    delete update.createdAt;
    delete update.token;
    // Người dùng tự sửa hồ sơ: không được tự đổi quyền hay mở khóa tài khoản
    if (!isAdmin(req)) {
      delete update.role;
      delete update.isLocked;
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (user) return res.json(user);
    const admin = await Admin.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (admin) return res.json(admin);
    res.status(404).json({ error: "User not found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
