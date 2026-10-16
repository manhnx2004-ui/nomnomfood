const express = require("express");
const router = express.Router();
const KhauHao = require("../../models/accounting/KhauHao");
const assetService = require("../../services/assetService");

const handle = (fn, code = 400) => async (req, res) => {
    try {
        res.json(await fn(req));
    } catch (err) {
        res.status(code).json({ error: err.message });
    }
};

// ==================== Tài sản cố định ====================
router.get("/acc/fixed-assets/meta", (req, res) => res.json({ nhom: assetService.NHOM, nguong: assetService.NGUONG_TSCD }));
router.get("/acc/fixed-assets", handle(() => assetService.listAssets(), 500));
router.get("/acc/fixed-assets/:id", handle((req) => assetService.assetDetail(req.params.id)));
router.post("/acc/fixed-assets", handle((req) => assetService.createAsset(req.body)));
router.put("/acc/fixed-assets/:id", handle((req) => assetService.updateAsset(req.params.id, req.body)));
router.delete("/acc/fixed-assets/:id", handle(async (req) => { await assetService.deleteAsset(req.params.id); return { message: "Đã xóa tài sản cố định" }; }));

// Thanh lý / nhượng bán và hủy thanh lý
router.post("/acc/fixed-assets/:id/dispose", handle((req) => assetService.disposeAsset(req.params.id, req.body)));
router.delete("/acc/fixed-assets/:id/dispose", handle((req) => assetService.undoDispose(req.params.id)));

// ==================== Khấu hao ====================
router.get("/acc/depreciation", handle(async (req) => {
    const filter = {};
    if (req.query.period) filter.kyKeToan = req.query.period;
    if (req.query.asset) filter.taiSan = req.query.asset;
    return KhauHao.find(filter).populate("taiSan kyKeToan").sort({ ngayGhiNhan: -1 });
}, 500));
router.get("/acc/depreciation/history", handle(() => assetService.depreciationHistory(), 500));
// Bảng tính khấu hao của kỳ (đã ghi hoặc dự kiến)
router.get("/acc/depreciation/preview", handle((req) => {
    if (!req.query.period) throw new Error("Thiếu kỳ kế toán");
    return assetService.previewPeriod(req.query.period);
}));
router.post("/acc/depreciation/run", handle((req) => {
    if (!req.body.period) throw new Error("Thiếu kỳ kế toán");
    return assetService.runPeriod(req.body.period);
}));
router.delete("/acc/depreciation/period/:periodId", handle((req) => assetService.cancelPeriod(req.params.periodId)));

module.exports = router;
