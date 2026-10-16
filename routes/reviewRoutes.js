const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const { isAdmin } = require("../middleware/auth");

// Lấy tất cả review (admin)
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find().populate("user", "name email").populate("product", "name").sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/reviews", async (req, res) => {
  try {
    const review = new Review({
      user: isAdmin(req) && req.body.user ? req.body.user : req.account._id,
      product: req.body.product,
      rating: req.body.rating,
      comment: typeof req.body.comment === "string" ? req.body.comment.slice(0, 2000) : "",
    });
    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/reviews/product/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId, status: { $ne: "rejected" } })
      .populate("user", "name avatar").populate("product", "name image");
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/reviews/user/:userId", async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.params.userId }).populate("user product");
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/reviews/:id", async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/reviews/:id", async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
