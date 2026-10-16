// SEO: giúp Google hiểu và hiển thị trang web.
//  - /robots.txt  : cho phép Google đọc trang công khai, chặn trang quản trị / giỏ hàng / tài khoản
//  - /sitemap.xml : danh sách trang + từng món ăn để Google lập chỉ mục nhanh
//  - Chèn thẻ mô tả, Open Graph (ảnh xem trước khi chia sẻ Facebook/Zalo), dữ liệu có cấu trúc (JSON-LD)
//    vào các trang công khai; trang chi tiết món có tiêu đề/mô tả/ảnh riêng của món đó.
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SITE_NAME = process.env.SITE_NAME || "NomNomFood";
const DEFAULT_DESC = process.env.SITE_DESCRIPTION ||
    "NomNomFood - đặt đồ ăn online: burger, gà rán, pizza, sushi, lẩu, đồ uống... Giao tận nơi nhanh chóng, thanh toán tiền mặt, chuyển khoản hoặc MoMo.";

// Trang không nên xuất hiện trên Google
const PRIVATE_PAGES = ["admin.html", "restaurant.html", "shipper.html", "cart.html", "checkout.html",
    "orders.html", "profile.html", "login.html", "dki.html"];

// Trang công khai và mô tả riêng
const PUBLIC_PAGES = {
    "index.html": { loc: "/", priority: "1.0", desc: DEFAULT_DESC },
    "product.html": { loc: "/product.html", priority: "0.9", title: `Thực đơn - ${SITE_NAME}`,
        desc: `Xem toàn bộ thực đơn ${SITE_NAME}: đồ ăn nhanh, món Việt, món Nhật, lẩu, tráng miệng và đồ uống. Đặt online, giao tận nơi.` },
    "about.html": { loc: "/about.html", priority: "0.5", title: `Về chúng tôi - ${SITE_NAME}`,
        desc: `Giới thiệu ${SITE_NAME} - dịch vụ đặt đồ ăn trực tuyến, giao hàng tận nơi.` },
    "contact.html": { loc: "/contact.html", priority: "0.5", title: `Liên hệ - ${SITE_NAME}`,
        desc: `Liên hệ ${SITE_NAME} để được hỗ trợ đặt món, giao hàng và góp ý.` },
    "product-detail.html": { loc: null, desc: DEFAULT_DESC },
};

// "none" = chưa có mã xác minh (Render bắt điền giá trị khi tạo)
const GOOGLE_VERIFY = (process.env.GOOGLE_SITE_VERIFICATION || "").trim().replace(/^none$/i, "");
const siteUrl = (req) => ((process.env.SITE_URL || "").trim() || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const absUrl = (base, u) => (!u ? "" : /^https?:\/\//i.test(u) ? u : base + (u.startsWith("/") ? u : "/" + u));
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

const htmlCache = new Map();
function readPage(file) {
    if (process.env.NODE_ENV === "production" && htmlCache.has(file)) return htmlCache.get(file);
    const html = fs.readFileSync(path.join(PUBLIC_DIR, file), "utf8");
    htmlCache.set(file, html);
    return html;
}

function robots(req, res) {
    const base = siteUrl(req);
    res.type("text/plain").send(
        ["User-agent: *", "Allow: /", ...PRIVATE_PAGES.map((p) => `Disallow: /${p}`), "", `Sitemap: ${base}/sitemap.xml`, ""].join("\n")
    );
}

async function sitemap(req, res, next) {
    try {
        const base = siteUrl(req);
        const urls = Object.values(PUBLIC_PAGES).filter((p) => p.loc)
            .map((p) => `<url><loc>${esc(base + p.loc)}</loc><changefreq>daily</changefreq><priority>${p.priority}</priority></url>`);
        const products = await Product.find({}).select("_id createdAt").lean();
        for (const p of products) {
            const lastmod = p.createdAt ? `<lastmod>${new Date(p.createdAt).toISOString().slice(0, 10)}</lastmod>` : "";
            urls.push(`<url><loc>${esc(`${base}/product-detail.html?id=${p._id}`)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`);
        }
        res.type("application/xml").send(
            `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
        );
    } catch (err) {
        next(err);
    }
}

// Middleware phục vụ trang công khai có chèn thẻ SEO; trang riêng tư gắn noindex.
function pages() {
    return async (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        const file = req.path === "/" ? "index.html" : req.path.replace(/^\//, "");

        if (PRIVATE_PAGES.includes(file)) {
            res.set("X-Robots-Tag", "noindex, nofollow");
            return next(); // express.static phục vụ như cũ
        }
        const meta = PUBLIC_PAGES[file];
        if (!meta) return next();

        try {
            const base = siteUrl(req);
            let html = readPage(file);
            let title = meta.title || null;
            let desc = meta.desc;
            let image = absUrl(base, "/Images/Logo.png");
            let canonical = base + (meta.loc || "/");
            const ld = [];

            if (file === "index.html") {
                ld.push({ "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: base + "/" });
                ld.push({ "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: base + "/", logo: image });
            }

            if (file === "product-detail.html") {
                const id = String(req.query.id || "");
                const product = mongoose.isValidObjectId(id)
                    ? await Product.findById(id).populate("category", "name").lean()
                    : null;
                if (!product) {
                    res.set("X-Robots-Tag", "noindex");
                } else {
                    const price = product.price;
                    title = `${product.name} - ${SITE_NAME}`;
                    desc = (product.description ? `${product.description} ` : "") +
                        `Giá ${Number(price).toLocaleString("vi-VN")}đ. Đặt online tại ${SITE_NAME}, giao tận nơi.`;
                    if (product.image) image = absUrl(base, product.image);
                    canonical = `${base}/product-detail.html?id=${product._id}`;
                    ld.push({
                        "@context": "https://schema.org",
                        "@type": "Product",
                        name: product.name,
                        description: product.description || undefined,
                        image: product.image ? [image] : undefined,
                        category: product.category?.name || undefined,
                        brand: { "@type": "Brand", name: SITE_NAME },
                        offers: {
                            "@type": "Offer",
                            url: canonical,
                            priceCurrency: "VND",
                            price: String(price),
                            availability: product.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                        },
                    });
                }
            }

            const tags = [
                `<meta name="description" content="${esc(desc.slice(0, 300))}" />`,
                `<link rel="canonical" href="${esc(canonical)}" />`,
                `<meta property="og:type" content="${file === "product-detail.html" ? "product" : "website"}" />`,
                `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
                `<meta property="og:title" content="${esc(title || SITE_NAME)}" />`,
                `<meta property="og:description" content="${esc(desc.slice(0, 300))}" />`,
                `<meta property="og:url" content="${esc(canonical)}" />`,
                `<meta property="og:image" content="${esc(image)}" />`,
                `<meta property="og:locale" content="vi_VN" />`,
                `<meta name="twitter:card" content="summary_large_image" />`,
                `<link rel="icon" href="/Images/Logo.png" />`,
                GOOGLE_VERIFY
                    ? `<meta name="google-site-verification" content="${esc(GOOGLE_VERIFY)}" />` : "",
                ...ld.map(jsonLd),
            ].filter(Boolean).join("\n    ");

            if (title) html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
            html = html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
            res.type("html").send(html);
        } catch (err) {
            next(err);
        }
    };
}

module.exports = { robots, sitemap, pages };
