const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const mongoose = require("mongoose");
const Upload  = require("../models/Upload");

// Kiểu ảnh cho phép → Content-Type trả về (không dùng kiểu do trình duyệt khai báo, tránh ai đó tải lên HTML/SVG giả ảnh)
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" };

function makeUploader(maxMB) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMB * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      TYPES[ext] ? cb(null, true) : cb(new Error("Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF, AVIF"));
    },
  }).single("image");
}

function uploadHandler(kind, maxMB) {
  const upload = makeUploader(maxMB);
  return (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        const msg = err.code === "LIMIT_FILE_SIZE" ? `Ảnh tối đa ${maxMB}MB` : (err.message || "Upload thất bại");
        return res.status(400).json({ error: msg });
      }
      if (!req.file) return res.status(400).json({ error: "Không có file ảnh" });
      try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const doc = await Upload.create({
          kind,
          contentType: TYPES[ext],
          size: req.file.size,
          data: req.file.buffer,
          owner: req.account?._id || "",
        });
        res.json({ url: `/uploads/${doc._id}${ext}` });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  };
}

router.post("/upload/product-image", uploadHandler("product", 5));
router.post("/upload/avatar", uploadHandler("avatar", 3));
router.post("/upload/chat-image", uploadHandler("chat", 5));

// Phục vụ ảnh: /uploads/<id>.<đuôi>
router.get("/uploads/:file", async (req, res) => {
  try {
    const id = req.params.file.replace(/\.[a-z0-9]+$/i, "");
    if (!mongoose.isValidObjectId(id)) return res.status(404).end();
    const doc = await Upload.findById(id).lean();
    if (!doc) return res.status(404).end();
    res.set("Content-Type", doc.contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(doc.data.buffer ? Buffer.from(doc.data.buffer) : doc.data);
  } catch {
    res.status(404).end();
  }
});

module.exports = router;
