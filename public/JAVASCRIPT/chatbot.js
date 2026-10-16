(function () {
  // ── Styles ──────────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #nombot-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: #dc3545; color: #fff; border: none;
      box-shadow: 0 4px 16px rgba(220,53,69,.45);
      font-size: 24px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #nombot-btn:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(220,53,69,.55); }

    #nombot-window {
      position: fixed; bottom: 90px; right: 24px; z-index: 9998;
      width: 340px; max-height: 520px;
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.18);
      display: flex; flex-direction: column;
      overflow: hidden; transition: opacity .25s, transform .25s;
    }
    #nombot-window.nombot-hidden { opacity: 0; transform: translateY(12px) scale(.97); pointer-events: none; }

    #nombot-header {
      background: #dc3545; color: #fff;
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
    }
    #nombot-header .nombot-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.25);
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    #nombot-header .nombot-info { flex: 1; }
    #nombot-header .nombot-info strong { display: block; font-size: 14px; }
    #nombot-header .nombot-info small { font-size: 11px; opacity: .85; }
    #nombot-close {
      background: none; border: none; color: #fff;
      font-size: 18px; cursor: pointer; line-height: 1; padding: 4px;
    }

    #nombot-messages {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 10px;
      max-height: 350px;
    }
    .nombot-msg { display: flex; gap: 8px; align-items: flex-end; }
    .nombot-msg.user { flex-direction: row-reverse; }
    .nombot-bubble {
      max-width: 75%; padding: 9px 13px; border-radius: 14px;
      font-size: 13.5px; line-height: 1.5; word-break: break-word;
    }
    .nombot-msg.bot .nombot-bubble { background: #f3f4f6; color: #222; border-bottom-left-radius: 4px; }
    .nombot-msg.user .nombot-bubble { background: #dc3545; color: #fff; border-bottom-right-radius: 4px; }
    .nombot-msg-icon { font-size: 20px; flex-shrink: 0; }

    #nombot-input-row {
      padding: 10px 12px; border-top: 1px solid #f0f0f0;
      display: flex; gap: 8px;
    }
    #nombot-input {
      flex: 1; border: 1.5px solid #e0e0e0; border-radius: 20px;
      padding: 8px 14px; font-size: 13.5px; outline: none;
      transition: border-color .2s;
    }
    #nombot-input:focus { border-color: #dc3545; }
    #nombot-send {
      background: #dc3545; color: #fff; border: none;
      border-radius: 50%; width: 38px; height: 38px;
      font-size: 16px; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s;
    }
    #nombot-send:disabled { background: #ccc; cursor: not-allowed; }
    .nombot-typing span {
      display: inline-block; width: 7px; height: 7px;
      background: #aaa; border-radius: 50%; margin: 0 2px;
      animation: nombot-bounce .9s infinite;
    }
    .nombot-typing span:nth-child(2) { animation-delay: .2s; }
    .nombot-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes nombot-bounce {
      0%,60%,100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ────────────────────────────────────────────────────────────────────
  document.body.insertAdjacentHTML("beforeend", `
    <button id="nombot-btn" title="Chat với NomBot">🤖</button>
    <div id="nombot-window" class="nombot-hidden">
      <div id="nombot-header">
        <div class="nombot-avatar">🍜</div>
        <div class="nombot-info">
          <strong>NomBot</strong>
          <small>Trợ lý NomNomFood · Trực tuyến</small>
        </div>
        <button id="nombot-close">✕</button>
      </div>
      <div id="nombot-messages"></div>
      <div id="nombot-input-row">
        <input id="nombot-input" type="text" placeholder="Nhắn tin với NomBot..." maxlength="500" />
        <button id="nombot-send">➤</button>
      </div>
    </div>
  `);

  // ── State & refs ─────────────────────────────────────────────────────────────
  const btn      = document.getElementById("nombot-btn");
  const win      = document.getElementById("nombot-window");
  const closeBtn = document.getElementById("nombot-close");
  const msgBox   = document.getElementById("nombot-messages");
  const input    = document.getElementById("nombot-input");
  const sendBtn  = document.getElementById("nombot-send");

  const history = [];  // [{role, content}]

  // ── Toggle ──────────────────────────────────────────────────────────────────
  function openChat() {
    win.classList.remove("nombot-hidden");
    btn.textContent = "✕";
    input.focus();
    if (!history.length) addBotMessage("Xin chào! 👋 Tôi là NomBot, trợ lý của NomNomFood. Tôi có thể giúp bạn tìm món ăn, hướng dẫn đặt hàng hoặc trả lời thắc mắc. Bạn cần hỗ trợ gì?");
  }
  function closeChat() {
    win.classList.add("nombot-hidden");
    btn.textContent = "🤖";
  }
  btn.addEventListener("click", () => win.classList.contains("nombot-hidden") ? openChat() : closeChat());
  closeBtn.addEventListener("click", closeChat);

  // ── Render helpers ───────────────────────────────────────────────────────────
  function addBotMessage(text) {
    const div = document.createElement("div");
    div.className = "nombot-msg bot";
    div.innerHTML = `<span class="nombot-msg-icon">🍜</span><div class="nombot-bubble">${escapeHtml(text)}</div>`;
    msgBox.appendChild(div);
    scrollDown();
    return div;
  }

  function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "nombot-msg user";
    div.innerHTML = `<div class="nombot-bubble">${escapeHtml(text)}</div><span class="nombot-msg-icon">🧑</span>`;
    msgBox.appendChild(div);
    scrollDown();
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "nombot-msg bot";
    div.id = "nombot-typing";
    div.innerHTML = `<span class="nombot-msg-icon">🍜</span><div class="nombot-bubble nombot-typing"><span></span><span></span><span></span></div>`;
    msgBox.appendChild(div);
    scrollDown();
  }

  function removeTyping() {
    const t = document.getElementById("nombot-typing");
    if (t) t.remove();
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  }

  function scrollDown() {
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  async function sendMessage() {
    const userText = input.value.trim();
    if (!userText || sendBtn.disabled) return;

    input.value = "";
    sendBtn.disabled = true;
    addUserMessage(userText);
    history.push({ role: "user", content: userText });
    showTyping();

    try {
      const apiBase = (typeof API !== "undefined") ? API : "";
      const resp = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      // Nếu server trả lỗi JSON
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

      removeTyping();

      // Tạo bubble bot
      const botDiv = document.createElement("div");
      botDiv.className = "nombot-msg bot";
      botDiv.innerHTML = `<span class="nombot-msg-icon">🍜</span><div class="nombot-bubble" id="nombot-stream-bubble"></div>`;
      msgBox.appendChild(botDiv);
      const bubble = botDiv.querySelector("#nombot-stream-bubble");
      bubble.removeAttribute("id");

      // Đọc stream SSE
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer   = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // giữ dòng chưa đủ

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]" || !raw) continue;
          try {
            const obj = JSON.parse(raw);
            if (obj.text) {
              fullText += obj.text;
              bubble.innerHTML = escapeHtml(fullText);
              scrollDown();
            }
          } catch { /* bỏ qua dòng lỗi parse */ }
        }
      }

      if (fullText) {
        history.push({ role: "assistant", content: fullText });
      } else {
        bubble.innerHTML = '<em class="text-muted">...</em>';
      }

    } catch (err) {
      removeTyping();
      addBotMessage("Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau! 🙏");
      // Xóa tin nhắn user khỏi history nếu thất bại
      if (history.at(-1)?.role === "user") history.pop();
    }

    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
})();
