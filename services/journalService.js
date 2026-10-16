const mongoose = require("mongoose");
const ButToan = require("../models/accounting/ButToan");
const SoCai = require("../models/accounting/SoCai");
const TKKeToan = require("../models/accounting/TKKeToan");

async function recomputeSoCai(kyKeToanId, tkKeToanId) {
    const tk = await TKKeToan.findById(tkKeToanId);
    if (!tk) return;

    const kyId = new mongoose.Types.ObjectId(String(kyKeToanId));

    const [noAgg] = await ButToan.aggregate([
        { $match: { kyKeToan: kyId, tkNo: tk._id } },
        { $group: { _id: null, total: { $sum: "$soTien" } } },
    ]);
    const [coAgg] = await ButToan.aggregate([
        { $match: { kyKeToan: kyId, tkCo: tk._id } },
        { $group: { _id: null, total: { $sum: "$soTien" } } },
    ]);

    const tongNo = noAgg ? noAgg.total : 0;
    const tongCo = coAgg ? coAgg.total : 0;
    const soDu = tk.banChat === "no" ? tongNo - tongCo : tongCo - tongNo;

    await SoCai.findOneAndUpdate(
        { kyKeToan: kyKeToanId, tkKeToan: tkKeToanId },
        { tongNo, tongCo, soDu, updatedAt: new Date() },
        { upsert: true, returnDocument: "after" }
    );
}

async function postButToan({ kyKeToan, ngayGhi, noiDung, tkNo, tkCo, soTien, nguon, nguonId }) {
    if (!kyKeToan || !tkNo || !tkCo || !soTien) {
        throw new Error("Thiếu thông tin bắt buộc để hạch toán (kỳ kế toán, tài khoản nợ/có, số tiền)");
    }
    if (String(tkNo) === String(tkCo)) {
        throw new Error("Tài khoản nợ và tài khoản có không được trùng nhau");
    }

    const buttoan = await ButToan.create({
        kyKeToan,
        ngayGhi: ngayGhi || new Date(),
        noiDung: noiDung || "",
        tkNo,
        tkCo,
        soTien,
        nguon: nguon || "thu_cong",
        nguonId: nguonId || null,
    });

    await recomputeSoCai(kyKeToan, tkNo);
    await recomputeSoCai(kyKeToan, tkCo);

    return buttoan;
}

module.exports = { postButToan, recomputeSoCai };
