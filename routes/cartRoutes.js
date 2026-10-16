const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const mongoose = require("mongoose");
const { isAdmin } = require("../middleware/auth");

router.get("/cart/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId }).populate("items.product");
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/cart", async (req, res) => {
  try {
    const { product } = req.body;
    // Luôn thêm vào giỏ của người đang đăng nhập
    const user = isAdmin(req) && req.body.user ? String(req.body.user) : req.account._id;
    const quantity = Math.floor(Number(req.body.quantity) || 1);
    if (!mongoose.isValidObjectId(product) || quantity < 1 || quantity > 99) return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    let cart = await Cart.findOne({ user });
    if (!cart) {
      cart = new Cart({ user, items: [{ product, quantity }] });
    } else {
      const itemIndex = cart.items.findIndex((item) => item.product.toString() === product);
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ product, quantity });
      }
    }
    cart.updatedAt = Date.now();
    await cart.save();
    res.status(201).json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/cart/:userId", async (req, res) => {
  try {
    const { product } = req.body;
    const quantity = Math.floor(Number(req.body.quantity));
    if (!(quantity >= 1 && quantity <= 99)) return res.status(400).json({ error: "Số lượng không hợp lệ" });
    const cart = await Cart.findOne({ user: req.params.userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    const itemIndex = cart.items.findIndex((item) => item.product.toString() === product);
    if (itemIndex === -1) return res.status(404).json({ error: "Item not found" });
    cart.items[itemIndex].quantity = quantity;
    cart.updatedAt = Date.now();
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/cart/:userId/:productId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    cart.items = cart.items.filter((item) => item.product.toString() !== req.params.productId);
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
