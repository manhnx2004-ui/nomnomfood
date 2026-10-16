const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const journalService = require("../services/journalService");
const { getOpenPeriod, getAccountByCode } = require("../services/accountingHelpers");
const HoaDonBanHang = require("../models/accounting/HoaDonBanHang");
const { syncPaymentForOrder } = require("../services/paymentSync");
const inventoryService = require("../services/inventoryService");
const PhieuXuatNL = require("../models/accounting/PhieuXuatNL");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { evaluateCoupon, consumeCoupon, CouponError } = require("../services/couponService");
const { isStaff, isAdmin } = require("../middleware/auth");

// Đơn chuyển từ chờ xác nhận sang chế biến / giao / hoàn thành → xuất nguyên liệu theo định mức
const BEFORE_KITCHEN = ["pending", "confirmed"];
const KITCHEN_OR_LATER = ["preparing", "delivering", "shipping", "completed"];

// Chỉ lấy các trường giao diện cần (không trả mật khẩu, mô tả sản phẩm) để danh sách đơn nhẹ hơn
const ORDER_POPULATE = [
  { path: "user", select: "name email phone avatar addresses" },
  { path: "items.product", select: "name price salePrice image category" },
];

const SHIPPING_FEE = 15000; // phí giao hàng cố định (trùng với trang thanh toán)
const MAX_ITEMS = 50;
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Tạo đơn: server tự tính giá từ DB — không tin giá / tổng tiền do trình duyệt gửi lên
router.post("/orders", async (req, res) => {
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!rawItems.length) return res.status(400).json({ error: "Giỏ hàng trống" });
    if (rawItems.length > MAX_ITEMS) return res.status(400).json({ error: "Đơn hàng có quá nhiều món" });

    const items = [];
    let subtotal = 0;
    for (const it of rawItems) {
      const productId = typeof it?.product === "object" ? it.product?._id : it?.product;
      if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ error: "Món ăn không hợp lệ" });
      const quantity = Math.floor(Number(it.quantity));
      if (!(quantity >= 1 && quantity <= 99)) return res.status(400).json({ error: "Số lượng không hợp lệ" });
      const product = await Product.findById(productId).select("name price inStock").lean();
      if (!product) return res.status(400).json({ error: "Có món không còn tồn tại, vui lòng cập nhật giỏ hàng" });
      if (product.inStock === false) return res.status(400).json({ error: `Món "${product.name}" đã hết hàng` });
      items.push({ product: product._id, quantity, price: product.price });
      subtotal += product.price * quantity;
    }

    let discount = 0;
    let coupon = null;
    if (req.body.couponCode) {
      try {
        ({ coupon, discount } = await evaluateCoupon(String(req.body.couponCode), subtotal));
      } catch (err) {
        if (err instanceof CouponError) return res.status(400).json({ error: err.message });
        throw err;
      }
    }

    const a = req.body.shippingAddress || {};
    const shippingAddress = {
      receiverName: str(a.receiverName, 100),
      receiverPhone: str(a.receiverPhone, 20),
      street: str(a.street, 300),
      city: str(a.city, 100),
      state: str(a.state, 100),
      postalCode: str(a.postalCode, 20),
      country: str(a.country, 60) || "Viet Nam",
    };
    if (!shippingAddress.receiverName || !shippingAddress.receiverPhone || !shippingAddress.street) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng" });
    }

    // "paid" = khách chọn chuyển khoản/MoMo và xác nhận đã chuyển; nhân viên cần đối chiếu tài khoản ngân hàng
    const paymentStatus = req.body.paymentStatus === "paid" ? "paid" : "pending";

    if (coupon) await consumeCoupon(coupon);
    const order = new Order({
      user: req.account._id,
      items,
      shippingAddress,
      totalPrice: Math.max(0, subtotal + SHIPPING_FEE - discount),
      note: str(req.body.note, 500),
      status: "pending",
      paymentStatus,
    });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ?userId= · ?status= · ?updatedFrom=ISO (đơn cập nhật từ thời điểm đó, vd hôm nay)
// ?from=&to= (ngày tạo) · ?limit=&page= (phân trang, tổng số trả trong header X-Total-Count)
router.get("/orders", async (req, res) => {
  try {
    const filter = {};
    // Khách hàng chỉ xem được đơn của chính mình (bỏ qua userId trên URL)
    if (!isStaff(req)) filter.user = req.account._id;
    else if (req.query.userId) filter.user = String(req.query.userId);
    if (req.query.status) filter.status = String(req.query.status);
    const date = (v) => { const d = new Date(v); return isNaN(d) ? null : d; };
    if (req.query.updatedFrom && date(req.query.updatedFrom)) filter.updatedAt = { $gte: date(req.query.updatedFrom) };
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (date(req.query.from)) filter.createdAt.$gte = date(req.query.from);
      if (date(req.query.to)) filter.createdAt.$lte = date(req.query.to);
    }
    let query = Order.find(filter).populate(ORDER_POPULATE).sort({ createdAt: -1 }).lean();
    const limit = Math.min(500, Math.max(0, Number(req.query.limit) || 0));
    if (limit) {
      const page = Math.max(1, Number(req.query.page) || 1);
      res.set("X-Total-Count", String(await Order.countDocuments(filter)));
      query = query.skip((page - 1) * limit).limit(limit);
    }
    res.json(await query);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(ORDER_POPULATE);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/orders/:id", async (req, res) => {
  try {
    const current = await Order.findById(req.params.id);
    if (!current) return res.status(404).json({ error: "Order not found" });

    // Bếp nhận nấu: trừ kho trước khi đổi trạng thái; thiếu nguyên liệu thì chặn (trừ khi bếp xác nhận vẫn nấu)
    let stockIssue = null;
    const { forceStock, nguoiLap, ...update } = req.body;
    delete update.xuatKho;
    delete update.revenuePosted;
    // Bếp / shipper chỉ đổi trạng thái, thanh toán và ghi chú — không sửa giá, món, khách hàng
    if (!isAdmin(req)) {
      for (const k of Object.keys(update)) if (!["status", "paymentStatus", "note", "updatedAt"].includes(k)) delete update[k];
    }
    update.updatedAt = new Date(); // luôn ghi thời điểm cập nhật (bếp, shipper lọc đơn trong ngày theo trường này)
    if (update.status && BEFORE_KITCHEN.includes(current.status) && KITCHEN_OR_LATER.includes(update.status)) {
      try {
        stockIssue = await inventoryService.issueForOrder(current._id, { force: !!forceStock, nguoiLap: String(nguoiLap || req.account?.name || "") });
      } catch (err) {
        if (err instanceof inventoryService.ShortageError) {
          return res.status(409).json({ error: err.message, shortages: err.shortages });
        }
        throw err;
      }
    }

    const order = await Order.findByIdAndUpdate(req.params.id, update, { returnDocument: "after" });

    // Hủy sau khi đã chế biến: nguyên liệu đã dùng, ghi chú lên phiếu xuất
    if (order.status === "cancelled" && current.status !== "cancelled" && order.xuatKho) {
      await PhieuXuatNL.updateOne({ _id: order.xuatKho }, { $set: { ghiChu: "Đơn đã hủy sau khi chế biến — nguyên liệu đã sử dụng" } });
    }

    if (order.status === "completed" && !order.revenuePosted) {
      const period = await getOpenPeriod();
      const tk111 = await getAccountByCode("111");
      const tk511 = await getAccountByCode("511");
      if (period && tk111 && tk511) {
        await journalService.postButToan({
          kyKeToan: period._id,
          noiDung: `Doanh thu đơn hàng #${order._id}`,
          tkNo: tk111._id,
          tkCo: tk511._id,
          soTien: order.totalPrice,
          nguon: "don_hang",
          nguonId: order._id,
        });
        order.revenuePosted = true;
        await order.save();

        const invoiceCount = await HoaDonBanHang.countDocuments();
        const year = new Date().getFullYear();
        await HoaDonBanHang.create({
          order: order._id,
          soHoaDon: `HD${year}${String(invoiceCount + 1).padStart(6, "0")}`,
          tienHang: order.totalPrice,
          thueGtgtDauRa: 0,
        });
      }
    }

    // Giao dịch thanh toán đi theo trạng thái đơn (hoàn thành → thành công, hủy → thất bại...)
    await syncPaymentForOrder(order);

    const result = order.toObject();
    if (stockIssue) {
      result.stockIssue = stockIssue.issue
        ? { _id: stockIssue.issue._id, soPhieu: stockIssue.issue.soPhieu, tongTien: stockIssue.issue.tongTien, amKho: stockIssue.issue.amKho }
        : null;
      result.missingRecipe = stockIssue.missingRecipe;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
