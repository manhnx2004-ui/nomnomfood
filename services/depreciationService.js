const TaiSanCoDinh = require("../models/accounting/TaiSanCoDinh");
const KhauHao = require("../models/accounting/KhauHao");
const journalService = require("./journalService");
const { getAccountByCode } = require("./accountingHelpers");

async function runMonthlyDepreciation(kyKeToanId) {
    const tk642 = await getAccountByCode("642");
    const tk214 = await getAccountByCode("214");
    if (!tk642 || !tk214) {
        throw new Error("Không tìm thấy tài khoản 642 hoặc 214 trong hệ thống tài khoản");
    }

    const assets = await TaiSanCoDinh.find({ dangSuDung: true });

    const posted = [];
    let skipped = 0;

    for (const asset of assets) {
        const soTienKhauHao = Math.round(asset.nguyenGia / asset.thoiGianKhauHaoThang);

        let khauHao;
        try {
            khauHao = await KhauHao.create({
                taiSan: asset._id,
                kyKeToan: kyKeToanId,
                soTienKhauHao,
            });
        } catch (err) {
            if (err && err.code === 11000) {
                skipped += 1;
                continue;
            }
            throw err;
        }

        const buttoan = await journalService.postButToan({
            kyKeToan: kyKeToanId,
            noiDung: `Khấu hao TSCĐ: ${asset.tenTaiSan}`,
            tkNo: tk642._id,
            tkCo: tk214._id,
            soTien: soTienKhauHao,
            nguon: "khau_hao",
            nguonId: asset._id,
        });

        khauHao.butToan = buttoan._id;
        await khauHao.save();

        posted.push({ tenTaiSan: asset.tenTaiSan, soTienKhauHao });

        const [tongKhauHaoAgg] = await KhauHao.aggregate([
            { $match: { taiSan: asset._id } },
            { $group: { _id: null, total: { $sum: "$soTienKhauHao" } } },
        ]);
        const tongKhauHao = tongKhauHaoAgg ? tongKhauHaoAgg.total : 0;

        if (tongKhauHao >= asset.nguyenGia) {
            asset.dangSuDung = false;
            await asset.save();
        }
    }

    return { posted, skippedCount: skipped };
}

module.exports = { runMonthlyDepreciation };
