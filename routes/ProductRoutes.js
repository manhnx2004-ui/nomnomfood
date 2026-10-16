const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Product = require("../models/Product");

router.get("/products", async (req, res) => {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;

    let q = Product.find(query).populate("category");
    if (req.query.limit) q = q.limit(parseInt(req.query.limit));

    const products = await q;
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search MUST be before /:id to avoid being matched as an ID
router.get("/products/search/:keyword", async (req, res) => {
  try {
    const keyword = String(req.params.keyword).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: keyword, $options: "i" };
    const data = await Product.find({
      $or: [{ name: regex }, { description: regex }],
    }).populate("category");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category reviews");
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/products", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) return res.status(404).json({ error: "Product not found" });

    // Xóa file local cũ khi ảnh bị thay hoặc bị xóa
    if (oldProduct.image && oldProduct.image !== req.body.image) {
      if (oldProduct.image.startsWith("/Images/")) {
        const oldPath = path.join(__dirname, "..", oldProduct.image);
        fs.unlink(oldPath, () => {});
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
