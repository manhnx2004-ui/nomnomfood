const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");

// Thiếu khóa thì không tạo client (groq-sdk ném lỗi làm sập cả server); route bên dưới trả 503
const client = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const SYSTEM_PROMPT = `Bạn là trợ lý ảo NomBot của NomNomFood - ứng dụng đặt đồ ăn trực tuyến tại Việt Nam.

Nhiệm vụ:
- Giúp khách tìm món ăn, gợi ý thực đơn theo khẩu vị hoặc ngân sách
- Hướng dẫn đặt hàng, theo dõi đơn, thanh toán
- Trả lời về chính sách: giao hàng miễn phí đơn từ 150.000đ, giao trong 30 phút
- Hỗ trợ các vấn đề về tài khoản, giỏ hàng
- Đề xuất combo, khuyến mãi đang có

Quy tắc:
- Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn (2-4 câu)
- Nếu hỏi giá/tồn kho cụ thể: hướng dẫn xem trang Sản phẩm
- Không bịa đặt thông tin về menu cụ thể
- Kết thúc câu trả lời bằng một gợi ý hành động nếu phù hợp`;

router.post("/api/chat", async (req, res) => {
  try {
    // Chỉ nhận tin nhắn user/assistant dạng chữ, giới hạn độ dài (chặn chèn lệnh "system" và tốn phí API)
    const messages = (Array.isArray(req.body.messages) ? req.body.messages : [])
      .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    if (messages.length === 0) {
      return res.status(400).json({ error: "Thiếu tin nhắn" });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "Chatbot chưa được cấu hình" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Chat error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Lỗi hệ thống, vui lòng thử lại" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Lỗi xử lý" })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
