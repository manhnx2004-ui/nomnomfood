const mongoose = require("mongoose");
const Category = require("./models/category");
const Product = require("./models/Product");
const User = require("./models/user");
const Admin = require("./models/Admin");
const Review = require("./models/Review");
const Cart = require("./models/cart");
const Order = require("./models/Order");
const Payment = require("./models/Payment");

const MONGODB_URI = "mongodb://127.0.0.1:27017/nomnomfood";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB: nomnomfood");

  // Xóa toàn bộ dữ liệu cũ
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
    Admin.deleteMany({}),
    Review.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
  ]);
  console.log("Cleared all collections");

  // ========================
  // CATEGORIES (7 danh mục)
  // ========================
  const categories = await Category.insertMany([
    {
      name: "Đồ ăn nhanh",
      description: "Burger, gà rán, khoai tây chiên",
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
    },
    {
      name: "Món Việt",
      description: "Cơm, phở, bún, miến các loại",
      image:
        "https://images.unsplash.com/photo-1503764654157-72d979d9af2f?w=400",
    },
    {
      name: "Đồ uống",
      description: "Trà sữa, cà phê, sinh tố, nước ép",
      image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400",
    },
    {
      name: "Cơm",
      description: "Cơm tấm, cơm gà, cơm sườn",
      image:
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400",
    },
    {
      name: "Mì - Bún",
      description: "Hủ tiếu, bún bò, mì Quảng",
      image:
        "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400",
    },
    {
      name: "Bánh",
      description: "Bánh mì, bánh ngọt, bánh cuốn",
      image:
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    },
    {
      name: "Tráng miệng",
      description: "Chè, kem, bánh ngọt, trái cây",
      image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",
    },
  ]);
  console.log(`Inserted ${categories.length} categories`);

  const [fastFood, monViet, doUong, com, miBun, banh, trangMiem] = categories;

  // ========================
  // PRODUCTS (25 sản phẩm)
  // ========================
  const products = await Product.insertMany([
    // ── Đồ ăn nhanh ──
    {
      name: "Burger Thịt Bò Phô Mai",
      description:
        "Burger kẹp thịt bò Úc 100g, phô mai tan chảy, xà lách giòn và sốt đặc biệt của nhà hàng.",
      price: 119000,
      category: fastFood._id,
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
      inStock: true,
      rating: 4.5,
    },
    {
      name: "Gà Rán Giòn Cay",
      description:
        "Gà rán giòn tan lớp vỏ, ướp gia vị cay đặc biệt, ăn kèm tương ớt và dưa chua.",
      price: 89000,
      category: fastFood._id,
      image:
        "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80",
      inStock: true,
      rating: 4.8,
    },
    {
      name: "Khoai Tây Chiên Vàng",
      description:
        "Khoai tây chiên vàng giòn, rắc muối tiêu, ăn kèm tương cà và mayonnaise.",
      price: 39000,
      category: fastFood._id,
      image:
        "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80",
      inStock: true,
    },
    {
      name: "Hot Dog Xúc Xích Đức",
      description:
        "Bánh mì dài kẹp xúc xích Đức nướng thơm, rưới sốt mù tạt và tương cà.",
      price: 59000,
      category: fastFood._id,
      image:
        "https://images.unsplash.com/photo-1619740455993-9d8d1ff7b11a?w=800&q=80",
      inStock: true,
    },
    {
      name: "Pizza Hải Sản",
      description:
        "Pizza đế giòn phủ hải sản tươi (tôm, mực, nghêu), sốt cà chua và phô mai mozzarella.",
      price: 185000,
      category: fastFood._id,
      image:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
      inStock: true,
      rating: 4.6,
    },
    // ── Món Việt ──
    {
      name: "Phở Bò Tái Nạm",
      description:
        "Phở bò tái nạm nước dùng ninh xương 8 tiếng, thơm ngọt tự nhiên, rắc hành ngò.",
      price: 95000,
      category: monViet._id,
      image:
        "https://images.unsplash.com/photo-1503764654157-72d979d9af2f?w=800&q=80",
      inStock: true,
      rating: 5,
    },
    {
      name: "Bún Bò Huế",
      description:
        "Bún bò Huế cay thơm đặc trưng miền Trung, nước lèo đậm đà với sả và mắm ruốc.",
      price: 79000,
      category: monViet._id,
      image:
        "https://images.unsplash.com/photo-1562802378-063ec186a863?w=800&q=80",
      inStock: true,
      rating: 5,
    },
    {
      name: "Bánh Mì Thịt Nguội",
      description:
        "Bánh mì Sài Gòn giòn tan, nhân thịt nguội, pa-tê, dưa leo, rau thơm và ớt tươi.",
      price: 35000,
      category: monViet._id,
      image:
        "https://images.unsplash.com/photo-1559559853-532ad0a9fbee?w=800&q=80",
      inStock: true,
    },
    {
      name: "Gỏi Cuốn Tôm Thịt",
      description:
        "Gỏi cuốn bánh tráng tươi, tôm luộc đỏ hồng, thịt heo, bún, rau sống và tương đậu.",
      price: 55000,
      category: monViet._id,
      image:
        "https://images.unsplash.com/photo-1456930266018-fda42f7404a7?w=800&q=80",
      inStock: true,
    },
    {
      name: "Bún Chả Hà Nội",
      description:
        "Bún chả đặc sản Hà Nội, chả nướng than hoa thơm lừng, nước chấm ngọt thanh.",
      price: 85000,
      category: monViet._id,
      image:
        "https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80",
      inStock: true,
    },
    // ── Đồ uống ──
    {
      name: "Trà Sữa Trân Châu Đen",
      description:
        "Trà sữa thơm mát, trân châu đen dẻo dai, độ ngọt điều chỉnh theo ý thích.",
      price: 55000,
      category: doUong._id,
      image:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      inStock: true,
      rating: 5,
    },
    {
      name: "Cà Phê Sữa Đá",
      description:
        "Cà phê phin đậm đà pha với sữa đặc, uống lạnh sảng khoái, đúng vị Việt Nam.",
      price: 35000,
      category: doUong._id,
      image:
        "https://images.unsplash.com/photo-1501959915551-4e8d30928317?w=800&q=80",
      inStock: true,
      rating: 4,
    },
    {
      name: "Sinh Tố Bơ Sữa Dừa",
      description:
        "Sinh tố bơ mịn béo ngậy, thêm sữa dừa thơm và đá xay, bổ dưỡng cực kỳ.",
      price: 65000,
      category: doUong._id,
      image:
        "https://images.unsplash.com/photo-1553530979-212c9e3bcd7a?w=800&q=80",
      inStock: true,
    },
    {
      name: "Nước Ép Cam Tươi",
      description:
        "Cam Vinh tươi ép nguyên chất, không đường, không phẩm màu, giàu vitamin C.",
      price: 45000,
      category: doUong._id,
      image:
        "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&q=80",
      inStock: true,
    },
    // ── Cơm ──
    {
      name: "Cơm Tấm Sườn Nướng",
      description:
        "Cơm tấm Sài Gòn trứ danh, sườn nướng than hoa, ăn kèm bì, chả, trứng và nước mắm.",
      price: 85000,
      category: com._id,
      image:
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80",
      inStock: true,
      rating: 5,
    },
    {
      name: "Cơm Gà Hội An",
      description:
        "Cơm gà Hội An truyền thống, gà ta xé tơi, cơm vàng hành phi thơm lừng.",
      price: 75000,
      category: com._id,
      image:
        "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80",
      inStock: true,
    },
    {
      name: "Cơm Chiên Dương Châu",
      description:
        "Cơm chiên tơi hạt, tôm xào, lạp xưởng, trứng và đậu hà lan, đậm đà hương vị.",
      price: 65000,
      category: com._id,
      image:
        "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=800&q=80",
      inStock: true,
    },
    // ── Mì - Bún ──
    {
      name: "Hủ Tiếu Nam Vang",
      description:
        "Hủ tiếu Nam Vang chuẩn vị, nước dùng trong vắt từ xương heo, thịt nạc và tôm tươi.",
      price: 70000,
      category: miBun._id,
      image:
        "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80",
      inStock: true,
    },
    {
      name: "Mì Quảng Gà",
      description:
        "Mì Quảng đặc sản miền Trung, chan ít nước nhưng đậm vị, ăn kèm rau sống và bánh đa.",
      price: 72000,
      category: miBun._id,
      image:
        "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80",
      inStock: true,
    },
    {
      name: "Bún Riêu Cua",
      description:
        "Bún riêu cua đồng truyền thống, nước dùng chua chua ngọt ngọt, thêm đậu hũ chiên.",
      price: 75000,
      category: miBun._id,
      image:
        "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80",
      inStock: true,
    },
    // ── Bánh ──
    {
      name: "Bánh Cuốn Nhân Thịt",
      description:
        "Bánh cuốn mỏng mềm nhân thịt heo xay, mộc nhĩ, chan nước mắm chua ngọt, rắc hành phi.",
      price: 55000,
      category: banh._id,
      image:
        "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
      inStock: true,
    },
    {
      name: "Bánh Xèo Miền Tây",
      description:
        "Bánh xèo giòn rụm nhân tôm thịt và giá đỗ, cuốn với rau sống và chấm nước mắm ngọt.",
      price: 65000,
      category: banh._id,
      image:
        "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80",
      inStock: true,
    },
    {
      name: "Bánh Mì Trứng Ốp La",
      description:
        "Bánh mì nóng giòn kẹp trứng ốp la, xúc xích, rau và sốt tương — bữa sáng hoàn hảo.",
      price: 29000,
      category: banh._id,
      image:
        "https://images.unsplash.com/photo-1484723091739-30990806e64f?w=800&q=80",
      inStock: true,
    },
    // ── Tráng miệng ──
    {
      name: "Chè Ba Màu",
      description:
        "Chè ba màu truyền thống: đậu xanh, đậu đỏ, thạch, nước cốt dừa béo ngậy.",
      price: 30000,
      category: trangMiem._id,
      image:
        "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80",
      inStock: true,
    },
    {
      name: "Kem Dừa Tươi",
      description:
        "Kem dừa tươi mát trong trái dừa, ăn kèm thạch và đậu phộng rang bùi thơm.",
      price: 40000,
      category: trangMiem._id,
      image:
        "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80",
      inStock: false,
    },
    {
      name: "Bánh Flan Caramel",
      description:
        "Bánh flan mềm mịn tan chảy, caramel đắng nhẹ hài hoà, phục vụ lạnh kèm đá bào.",
      price: 35000,
      category: trangMiem._id,
      image:
        "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800&q=80",
      inStock: true,
    },
  ]);
  console.log(`Inserted ${products.length} products`);

  // ========================
  // USERS (3 khách hàng)
  // ========================
  const users = await User.insertMany([
    {
      name: "Nguyen Van An",
      email: "an.nguyen@gmail.com",
      password: "123456",
      phone: "0901234567",
      role: "customer",
      addresses: [
        {
          street: "123 Nguyen Hue",
          city: "TP. Ho Chi Minh",
          state: "HCM",
          postalCode: "70000",
          country: "Viet Nam",
        },
      ],
    },
    {
      name: "Tran Thi Binh",
      email: "binh.tran@gmail.com",
      password: "123456",
      phone: "0912345678",
      role: "customer",
      addresses: [
        {
          street: "456 Le Loi",
          city: "Ha Noi",
          state: "HN",
          postalCode: "10000",
          country: "Viet Nam",
        },
      ],
    },
    {
      name: "Le Van Cuong",
      email: "cuong.le@gmail.com",
      password: "123456",
      phone: "0923456789",
      role: "customer",
      addresses: [
        {
          street: "789 Tran Phu",
          city: "Da Nang",
          state: "DN",
          postalCode: "50000",
          country: "Viet Nam",
        },
      ],
    },
  ]);
  console.log(`Inserted ${users.length} users`);

  // ========================
  // ADMINS (2 quản trị)
  // ========================
  const admins = await Admin.insertMany([
    {
      name: "Admin NomNom",
      email: "admin@nomnomfood.vn",
      password: "admin123",
      role: "admin",
    },
    {
      name: "Quan ly bep",
      email: "manager@nomnomfood.vn",
      password: "manager123",
      role: "manager",
    },
    {
      name: "Nguyen Van Ship",
      email: "shipper@nomnomfood.vn",
      password: "shipper123",
      role: "shipper",
    },
  ]);
  console.log(`Inserted ${admins.length} admins`);

  // ========================
  // REVIEWS (10 đánh giá)
  // products: 0=Burger, 5=Phở, 6=Bún Bò, 10=Trà Sữa, 11=Cà Phê, 14=Cơm Tấm
  // ========================
  const reviews = await Review.insertMany([
    {
      user: users[0]._id,
      product: products[0]._id,
      rating: 5,
      comment:
        "Burger ngon tuyệt! Thịt bò tươi, phô mai tan chảy. Chắc chắn sẽ mua lại!",
    },
    {
      user: users[1]._id,
      product: products[0]._id,
      rating: 4,
      comment: "Ngon nhưng hơi mặn một chút. Lần sau sẽ thử không thêm sốt.",
    },
    {
      user: users[2]._id,
      product: products[5]._id,
      rating: 5,
      comment: "Phở bò chuẩn vị, nước dùng trong và thơm. Xuất sắc!",
    },
    {
      user: users[0]._id,
      product: products[5]._id,
      rating: 4,
      comment: "Phở ngon, giao hàng nhanh. Hài lòng lắm.",
    },
    {
      user: users[1]._id,
      product: products[10]._id,
      rating: 5,
      comment: "Trà sữa đậm đà, trân châu dẻo vừa phải. Yêu thích!",
    },
    {
      user: users[2]._id,
      product: products[14]._id,
      rating: 5,
      comment: "Cơm tấm ngon nhất mình từng ăn. Sườn nướng thơm lắm.",
    },
    {
      user: users[0]._id,
      product: products[11]._id,
      rating: 4,
      comment: "Cà phê đậm vừa uống, sữa đặc đủ ngọt. Okay!",
    },
    {
      user: users[1]._id,
      product: products[6]._id,
      rating: 5,
      comment: "Bún bò Huế đúng vị cay mà không gắt. Tuyệt vời!",
    },
    {
      user: users[2]._id,
      product: products[4]._id,
      rating: 5,
      comment: "Pizza hải sản đế giòn, hải sản tươi rất ngon. 5 sao!",
    },
    {
      user: users[0]._id,
      product: products[14]._id,
      rating: 5,
      comment: "Cơm tấm sườn nướng than hoa thơm lừng, nước mắm đậm đà.",
    },
  ]);
  console.log(`Inserted ${reviews.length} reviews`);

  // Gắn review vào product và cập nhật rating
  // 0=Burger, 4=Pizza, 5=Phở, 6=Bún Bò, 10=Trà Sữa, 11=Cà Phê, 14=Cơm Tấm
  const reviewUpdates = [
    { idx: 0, reviewIds: [reviews[0]._id, reviews[1]._id], rating: 4.5 },
    { idx: 5, reviewIds: [reviews[2]._id, reviews[3]._id], rating: 4.5 },
    { idx: 10, reviewIds: [reviews[4]._id], rating: 5 },
    { idx: 14, reviewIds: [reviews[5]._id, reviews[9]._id], rating: 5 },
    { idx: 11, reviewIds: [reviews[6]._id], rating: 4 },
    { idx: 6, reviewIds: [reviews[7]._id], rating: 5 },
    { idx: 4, reviewIds: [reviews[8]._id], rating: 5 },
  ];

  for (const u of reviewUpdates) {
    await Product.findByIdAndUpdate(products[u.idx]._id, {
      $push: { reviews: { $each: u.reviewIds } },
      rating: u.rating,
    });
  }
  console.log("Updated product ratings and reviews");

  // ========================
  // CARTS (2 giỏ hàng)
  // ========================
  // 0=Burger(119k), 5=Phở(95k), 6=Bún Bò(79k), 10=Trà Sữa(55k), 14=Cơm Tấm(85k), 23=Chè(30k)
  await Cart.insertMany([
    {
      user: users[0]._id,
      items: [
        { product: products[0]._id, quantity: 2 },
        { product: products[10]._id, quantity: 1 },
      ],
    },
    {
      user: users[1]._id,
      items: [
        { product: products[5]._id, quantity: 1 },
        { product: products[14]._id, quantity: 1 },
      ],
    },
  ]);
  console.log("Inserted 2 carts");

  // ========================
  // ORDERS (3 đơn hàng)
  // ========================
  const orders = await Order.insertMany([
    {
      user: users[0]._id,
      items: [
        { product: products[0]._id, quantity: 2, price: products[0].price },
        { product: products[10]._id, quantity: 1, price: products[10].price },
      ],
      shippingAddress: { street: "123 Nguyen Hue", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" },
      totalPrice: products[0].price * 2 + products[10].price,
      status: "completed",
      paymentStatus: "paid",
    },
    {
      user: users[1]._id,
      items: [
        { product: products[5]._id, quantity: 1, price: products[5].price },
        { product: products[14]._id, quantity: 1, price: products[14].price },
      ],
      shippingAddress: { street: "456 Le Loi", city: "Ha Noi", state: "HN", postalCode: "10000", country: "Viet Nam" },
      totalPrice: products[5].price + products[14].price,
      status: "delivering",
      paymentStatus: "paid",
    },
    {
      user: users[2]._id,
      items: [
        { product: products[6]._id, quantity: 2, price: products[6].price },
        { product: products[23]._id, quantity: 2, price: products[23].price },
      ],
      shippingAddress: { street: "789 Tran Phu", city: "Da Nang", state: "DN", postalCode: "50000", country: "Viet Nam" },
      totalPrice: products[6].price * 2 + products[23].price * 2,
      status: "pending",
      paymentStatus: "pending",
    },
    // ── Đơn hàng tháng 6/2026 (ngày 1–21) ──
    {
      user: users[0]._id,
      items: [
        { product: products[0]._id, quantity: 2, price: products[0].price },
        { product: products[10]._id, quantity: 1, price: products[10].price },
      ],
      shippingAddress: { street: "123 Nguyen Hue", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" },
      totalPrice: products[0].price * 2 + products[10].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-01T10:00:00Z"), updatedAt: new Date("2026-06-01T18:00:00Z"),
    },
    {
      user: users[1]._id,
      items: [
        { product: products[5]._id, quantity: 1, price: products[5].price },
        { product: products[14]._id, quantity: 1, price: products[14].price },
      ],
      shippingAddress: { street: "456 Le Loi", city: "Ha Noi", state: "HN", postalCode: "10000", country: "Viet Nam" },
      totalPrice: products[5].price + products[14].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-02T14:00:00Z"), updatedAt: new Date("2026-06-02T16:00:00Z"),
    },
    {
      user: users[2]._id,
      items: [
        { product: products[6]._id, quantity: 2, price: products[6].price },
        { product: products[23]._id, quantity: 2, price: products[23].price },
      ],
      shippingAddress: { street: "789 Tran Phu", city: "Da Nang", state: "DN", postalCode: "50000", country: "Viet Nam" },
      totalPrice: products[6].price * 2 + products[23].price * 2,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-03T09:00:00Z"), updatedAt: new Date("2026-06-03T17:00:00Z"),
    },
    {
      user: users[0]._id,
      items: [
        { product: products[1]._id, quantity: 2, price: products[1].price },
        { product: products[11]._id, quantity: 1, price: products[11].price },
      ],
      shippingAddress: { street: "123 Nguyen Hue", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" },
      totalPrice: products[1].price * 2 + products[11].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-05T11:00:00Z"), updatedAt: new Date("2026-06-05T19:00:00Z"),
    },
    {
      user: users[1]._id,
      items: [
        { product: products[15]._id, quantity: 1, price: products[15].price },
        { product: products[10]._id, quantity: 2, price: products[10].price },
      ],
      shippingAddress: { street: "456 Le Loi", city: "Ha Noi", state: "HN", postalCode: "10000", country: "Viet Nam" },
      totalPrice: products[15].price + products[10].price * 2,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-07T08:00:00Z"), updatedAt: new Date("2026-06-07T16:00:00Z"),
    },
    {
      user: users[2]._id,
      items: [
        { product: products[3]._id, quantity: 2, price: products[3].price },
        { product: products[2]._id, quantity: 1, price: products[2].price },
      ],
      shippingAddress: { street: "789 Tran Phu", city: "Da Nang", state: "DN", postalCode: "50000", country: "Viet Nam" },
      totalPrice: products[3].price * 2 + products[2].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-08T12:00:00Z"), updatedAt: new Date("2026-06-08T20:00:00Z"),
    },
    {
      user: users[0]._id,
      items: [
        { product: products[17]._id, quantity: 1, price: products[17].price },
        { product: products[12]._id, quantity: 1, price: products[12].price },
      ],
      shippingAddress: { street: "123 Nguyen Hue", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" },
      totalPrice: products[17].price + products[12].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-10T09:30:00Z"), updatedAt: new Date("2026-06-10T17:30:00Z"),
    },
    {
      user: users[1]._id,
      items: [
        { product: products[0]._id, quantity: 1, price: products[0].price },
        { product: products[5]._id, quantity: 1, price: products[5].price },
      ],
      shippingAddress: { street: "456 Le Loi", city: "Ha Noi", state: "HN", postalCode: "10000", country: "Viet Nam" },
      totalPrice: products[0].price + products[5].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-12T13:00:00Z"), updatedAt: new Date("2026-06-12T21:00:00Z"),
    },
    {
      user: users[2]._id,
      items: [
        { product: products[18]._id, quantity: 1, price: products[18].price },
        { product: products[20]._id, quantity: 1, price: products[20].price },
      ],
      shippingAddress: { street: "789 Tran Phu", city: "Da Nang", state: "DN", postalCode: "50000", country: "Viet Nam" },
      totalPrice: products[18].price + products[20].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-14T10:00:00Z"), updatedAt: new Date("2026-06-14T18:00:00Z"),
    },
    {
      user: users[0]._id,
      items: [
        { product: products[14]._id, quantity: 2, price: products[14].price },
        { product: products[11]._id, quantity: 2, price: products[11].price },
      ],
      shippingAddress: { street: "123 Nguyen Hue", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" },
      totalPrice: products[14].price * 2 + products[11].price * 2,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-15T11:00:00Z"), updatedAt: new Date("2026-06-15T19:00:00Z"),
    },
    {
      user: users[1]._id,
      items: [
        { product: products[6]._id, quantity: 1, price: products[6].price },
        { product: products[2]._id, quantity: 2, price: products[2].price },
      ],
      shippingAddress: { street: "456 Le Loi", city: "Ha Noi", state: "HN", postalCode: "10000", country: "Viet Nam" },
      totalPrice: products[6].price + products[2].price * 2,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-17T08:30:00Z"), updatedAt: new Date("2026-06-17T16:30:00Z"),
    },
    {
      user: users[2]._id,
      items: [
        { product: products[15]._id, quantity: 2, price: products[15].price },
        { product: products[23]._id, quantity: 3, price: products[23].price },
      ],
      shippingAddress: { street: "789 Tran Phu", city: "Da Nang", state: "DN", postalCode: "50000", country: "Viet Nam" },
      totalPrice: products[15].price * 2 + products[23].price * 3,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-18T12:00:00Z"), updatedAt: new Date("2026-06-18T20:00:00Z"),
    },
    {
      user: users[0]._id,
      items: [
        { product: products[1]._id, quantity: 1, price: products[1].price },
        { product: products[7]._id, quantity: 2, price: products[7].price },
      ],
      shippingAddress: { street: "123 Nguyen Hue", city: "TP. Ho Chi Minh", state: "HCM", postalCode: "70000", country: "Viet Nam" },
      totalPrice: products[1].price + products[7].price * 2,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-19T09:00:00Z"), updatedAt: new Date("2026-06-19T17:00:00Z"),
    },
    {
      user: users[1]._id,
      items: [
        { product: products[5]._id, quantity: 2, price: products[5].price },
        { product: products[10]._id, quantity: 1, price: products[10].price },
      ],
      shippingAddress: { street: "456 Le Loi", city: "Ha Noi", state: "HN", postalCode: "10000", country: "Viet Nam" },
      totalPrice: products[5].price * 2 + products[10].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-20T10:00:00Z"), updatedAt: new Date("2026-06-20T18:00:00Z"),
    },
    {
      user: users[2]._id,
      items: [
        { product: products[0]._id, quantity: 1, price: products[0].price },
        { product: products[12]._id, quantity: 1, price: products[12].price },
        { product: products[11]._id, quantity: 1, price: products[11].price },
      ],
      shippingAddress: { street: "789 Tran Phu", city: "Da Nang", state: "DN", postalCode: "50000", country: "Viet Nam" },
      totalPrice: products[0].price + products[12].price + products[11].price,
      status: "completed", paymentStatus: "paid",
      createdAt: new Date("2026-06-21T11:00:00Z"), updatedAt: new Date("2026-06-21T19:00:00Z"),
    },
  ]);
  console.log(`Inserted ${orders.length} orders`);

  // ========================
  // PAYMENTS (3 thanh toán)
  // ========================
  await Payment.insertMany([
    {
      order: orders[0]._id, user: users[0]._id, amount: orders[0].totalPrice,
      method: "momo", status: "success", transactionId: "MOMO20240101001",
      paidAt: new Date("2024-06-01T10:30:00"),
    },
    {
      order: orders[1]._id, user: users[1]._id, amount: orders[1].totalPrice,
      method: "bank_transfer", status: "success", transactionId: "BANK20240102001",
      paidAt: new Date("2024-06-02T14:20:00"),
    },
    {
      order: orders[2]._id, user: users[2]._id, amount: orders[2].totalPrice,
      method: "cash", status: "pending",
    },
    // Thanh toán cho đơn hàng tháng 6/2026
    {
      order: orders[3]._id, user: users[0]._id, amount: orders[3].totalPrice,
      method: "momo", status: "success", transactionId: "MOMO20260601001",
      paidAt: new Date("2026-06-01T10:30:00Z"), createdAt: new Date("2026-06-01T10:30:00Z"),
    },
    {
      order: orders[4]._id, user: users[1]._id, amount: orders[4].totalPrice,
      method: "bank_transfer", status: "success", transactionId: "BANK20260602001",
      paidAt: new Date("2026-06-02T14:20:00Z"), createdAt: new Date("2026-06-02T14:20:00Z"),
    },
    {
      order: orders[5]._id, user: users[2]._id, amount: orders[5].totalPrice,
      method: "cash", status: "success", transactionId: "CASH20260603001",
      paidAt: new Date("2026-06-03T09:30:00Z"), createdAt: new Date("2026-06-03T09:30:00Z"),
    },
    {
      order: orders[6]._id, user: users[0]._id, amount: orders[6].totalPrice,
      method: "momo", status: "success", transactionId: "MOMO20260605001",
      paidAt: new Date("2026-06-05T11:30:00Z"), createdAt: new Date("2026-06-05T11:30:00Z"),
    },
    {
      order: orders[7]._id, user: users[1]._id, amount: orders[7].totalPrice,
      method: "card", status: "success", transactionId: "CARD20260607001",
      paidAt: new Date("2026-06-07T08:30:00Z"), createdAt: new Date("2026-06-07T08:30:00Z"),
    },
    {
      order: orders[8]._id, user: users[2]._id, amount: orders[8].totalPrice,
      method: "cash", status: "success", transactionId: "CASH20260608001",
      paidAt: new Date("2026-06-08T12:30:00Z"), createdAt: new Date("2026-06-08T12:30:00Z"),
    },
    {
      order: orders[9]._id, user: users[0]._id, amount: orders[9].totalPrice,
      method: "momo", status: "success", transactionId: "MOMO20260610001",
      paidAt: new Date("2026-06-10T10:00:00Z"), createdAt: new Date("2026-06-10T10:00:00Z"),
    },
    {
      order: orders[10]._id, user: users[1]._id, amount: orders[10].totalPrice,
      method: "bank_transfer", status: "success", transactionId: "BANK20260612001",
      paidAt: new Date("2026-06-12T13:30:00Z"), createdAt: new Date("2026-06-12T13:30:00Z"),
    },
    {
      order: orders[11]._id, user: users[2]._id, amount: orders[11].totalPrice,
      method: "cash", status: "success", transactionId: "CASH20260614001",
      paidAt: new Date("2026-06-14T10:30:00Z"), createdAt: new Date("2026-06-14T10:30:00Z"),
    },
    {
      order: orders[12]._id, user: users[0]._id, amount: orders[12].totalPrice,
      method: "momo", status: "success", transactionId: "MOMO20260615001",
      paidAt: new Date("2026-06-15T11:30:00Z"), createdAt: new Date("2026-06-15T11:30:00Z"),
    },
    {
      order: orders[13]._id, user: users[1]._id, amount: orders[13].totalPrice,
      method: "card", status: "success", transactionId: "CARD20260617001",
      paidAt: new Date("2026-06-17T09:00:00Z"), createdAt: new Date("2026-06-17T09:00:00Z"),
    },
    {
      order: orders[14]._id, user: users[2]._id, amount: orders[14].totalPrice,
      method: "bank_transfer", status: "success", transactionId: "BANK20260618001",
      paidAt: new Date("2026-06-18T12:30:00Z"), createdAt: new Date("2026-06-18T12:30:00Z"),
    },
    {
      order: orders[15]._id, user: users[0]._id, amount: orders[15].totalPrice,
      method: "cash", status: "success", transactionId: "CASH20260619001",
      paidAt: new Date("2026-06-19T09:30:00Z"), createdAt: new Date("2026-06-19T09:30:00Z"),
    },
    {
      order: orders[16]._id, user: users[1]._id, amount: orders[16].totalPrice,
      method: "momo", status: "success", transactionId: "MOMO20260620001",
      paidAt: new Date("2026-06-20T10:30:00Z"), createdAt: new Date("2026-06-20T10:30:00Z"),
    },
    {
      order: orders[17]._id, user: users[2]._id, amount: orders[17].totalPrice,
      method: "bank_transfer", status: "success", transactionId: "BANK20260621001",
      paidAt: new Date("2026-06-21T11:30:00Z"), createdAt: new Date("2026-06-21T11:30:00Z"),
    },
  ]);
  console.log("Inserted 3 payments");

  await mongoose.disconnect();

  console.log("\n=== SEED HOAN THANH ===");
  console.log("Database: mongodb://127.0.0.1:27017/nomnomfood");
  console.log("--- Tai khoan test ---");
  console.log("User 1:  an.nguyen@gmail.com   / 123456");
  console.log("User 2:  binh.tran@gmail.com   / 123456");
  console.log("User 3:  cuong.le@gmail.com    / 123456");
  console.log("Admin:   admin@nomnomfood.vn   / admin123");
  console.log("Manager: manager@nomnomfood.vn / manager123");
}

seed().catch((error) => {
  console.error("Seed error:", error.message);
  process.exit(1);
});
