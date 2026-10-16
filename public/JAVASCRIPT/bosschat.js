(function () {
    const FAQS = [
        {
            q: 'Giao hàng bao lâu?',
            a: 'Đơn hàng của bạn sẽ được giao trong vòng <strong>30–45 phút</strong> kể từ khi xác nhận. Khu vực nội thành giao nhanh hơn!'
        },
        {
            q: 'Phí giao hàng bao nhiêu?',
            a: 'Miễn phí giao hàng cho đơn từ <strong>150.000đ</strong>. Đơn dưới 150.000đ phí giao là <strong>15.000đ</strong>.'
        },
        {
            q: 'Cách đặt hàng?',
            a: 'Chọn món trong <a href="product.html" class="text-danger fw-semibold">Thực đơn</a> → Thêm vào giỏ → Thanh toán. Đơn giản và nhanh chóng!'
        },
        {
            q: 'Hủy đơn hàng?',
            a: 'Bạn có thể hủy đơn trong vòng <strong>5 phút</strong> sau khi đặt. Vào <a href="orders.html" class="text-danger fw-semibold">Đơn hàng</a> để kiểm tra.'
        },
        {
            q: 'Thanh toán bằng gì?',
            a: 'Chúng tôi chấp nhận <strong>Tiền mặt (COD)</strong>, <strong>MoMo</strong>, <strong>ZaloPay</strong> và <strong>Chuyển khoản ngân hàng</strong>.'
        },
        {
            q: 'Liên hệ hỗ trợ?',
            a: 'Gọi hotline <strong>0123 456 789</strong> hoặc email <strong>info@nomnomfood.vn</strong>. Chúng tôi phục vụ từ 7:00 – 22:00 mỗi ngày.'
        },
    ];

    const BOT_DELAY = 600;

    function init() {
        if (document.getElementById('bosschat-widget')) return;

        const css = document.createElement('style');
        css.textContent = `
            #bosschat-btn {
                position: fixed; bottom: 24px; right: 24px; z-index: 9998;
                width: 56px; height: 56px; border-radius: 50%;
                background: #dc3545; color: #fff; border: none;
                box-shadow: 0 4px 16px rgba(220,53,69,.45);
                font-size: 22px; cursor: pointer;
                transition: transform .2s, box-shadow .2s;
                display: flex; align-items: center; justify-content: center;
            }
            #bosschat-btn:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(220,53,69,.55); }
            #bosschat-btn .chat-badge {
                position: absolute; top: -4px; right: -4px;
                background: #198754; color: #fff; border-radius: 50%;
                width: 18px; height: 18px; font-size: 10px;
                display: flex; align-items: center; justify-content: center;
            }
            #bosschat-panel {
                position: fixed; bottom: 90px; right: 24px; z-index: 9999;
                width: 340px; max-height: 500px;
                background: #fff; border-radius: 16px;
                box-shadow: 0 8px 40px rgba(0,0,0,.18);
                display: flex; flex-direction: column;
                transform-origin: bottom right;
                transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s;
            }
            #bosschat-panel.hidden { transform: scale(.85); opacity: 0; pointer-events: none; }
            .bc-header {
                background: #dc3545; color: #fff; border-radius: 16px 16px 0 0;
                padding: 14px 16px; display: flex; align-items: center; gap-10px;
            }
            .bc-avatar {
                width: 36px; height: 36px; background: rgba(255,255,255,.25);
                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                font-size: 18px; flex-shrink: 0; margin-right: 10px;
            }
            .bc-header-close {
                margin-left: auto; background: none; border: none; color: #fff;
                font-size: 18px; cursor: pointer; opacity: .8; line-height: 1;
            }
            .bc-messages {
                flex: 1; overflow-y: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 8px;
            }
            .bc-bubble {
                max-width: 82%; padding: 9px 13px; border-radius: 14px;
                font-size: .88rem; line-height: 1.45; word-break: break-word;
            }
            .bc-bubble.bot { background: #f3f4f6; color: #1a1a2e; align-self: flex-start; border-bottom-left-radius: 4px; }
            .bc-bubble.user { background: #dc3545; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
            .bc-typing { display: flex; gap: 4px; align-items: center; padding: 10px 14px; }
            .bc-typing span { width: 7px; height: 7px; border-radius: 50%; background: #adb5bd; display: inline-block; animation: bc-bounce .9s infinite; }
            .bc-typing span:nth-child(2) { animation-delay: .15s; }
            .bc-typing span:nth-child(3) { animation-delay: .3s; }
            @keyframes bc-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
            .bc-faqs { padding: 6px 12px 10px; display: flex; flex-wrap: wrap; gap: 6px; }
            .bc-faq-btn {
                border: 1px solid #dc3545; color: #dc3545; border-radius: 20px;
                padding: 4px 12px; font-size: .8rem; background: #fff;
                cursor: pointer; transition: .15s; white-space: nowrap;
            }
            .bc-faq-btn:hover { background: #dc3545; color: #fff; }
            .bc-input-row {
                display: flex; gap: 8px; padding: 10px 12px;
                border-top: 1px solid #f0f0f0; align-items: center;
            }
            .bc-input {
                flex: 1; border: 1px solid #dee2e6; border-radius: 20px;
                padding: 7px 14px; font-size: .88rem; outline: none;
                transition: border-color .15s;
            }
            .bc-input:focus { border-color: #dc3545; }
            .bc-send {
                width: 36px; height: 36px; border-radius: 50%; background: #dc3545;
                border: none; color: #fff; cursor: pointer; display: flex;
                align-items: center; justify-content: center; flex-shrink: 0;
                transition: transform .15s;
            }
            .bc-send:hover { transform: scale(1.1); }
        `;
        document.head.appendChild(css);

        const btn = document.createElement('button');
        btn.id = 'bosschat-btn';
        btn.title = 'Hỗ trợ trực tuyến';
        btn.innerHTML = `<i class="fa-solid fa-comment-dots"></i><span class="chat-badge">1</span>`;
        document.body.appendChild(btn);

        const panel = document.createElement('div');
        panel.id = 'bosschat-panel';
        panel.classList.add('hidden');
        panel.innerHTML = `
            <div class="bc-header">
                <div class="bc-avatar"><i class="fa-solid fa-headset"></i></div>
                <div>
                    <div class="fw-semibold" style="font-size:.95rem">NomNomFood Hỗ trợ</div>
                    <div style="font-size:.75rem;opacity:.85"><span style="color:#4ade80">●</span> Trực tuyến</div>
                </div>
                <button class="bc-header-close" id="bosschat-close" title="Đóng">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="bc-messages" id="bc-messages"></div>
            <div class="bc-faqs" id="bc-faqs"></div>
            <div class="bc-input-row">
                <input class="bc-input" id="bc-input" placeholder="Nhập câu hỏi..." maxlength="200">
                <button class="bc-send" id="bc-send"><i class="fa-solid fa-paper-plane"></i></button>
            </div>`;
        document.body.appendChild(panel);

        btn.addEventListener('click', openChat);
        document.getElementById('bosschat-close').addEventListener('click', closeChat);
        document.getElementById('bc-send').addEventListener('click', sendMessage);
        document.getElementById('bc-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') sendMessage();
        });

        renderFaqs();
    }

    function openChat() {
        const panel = document.getElementById('bosschat-panel');
        const badge = document.querySelector('#bosschat-btn .chat-badge');
        panel.classList.remove('hidden');
        if (badge) badge.remove();

        const msgs = document.getElementById('bc-messages');
        if (!msgs.hasChildNodes()) {
            appendBotBubble('Xin chào! 👋 Tôi là trợ lý NomNomFood. Bạn cần hỗ trợ gì hôm nay?');
        }
        setTimeout(() => document.getElementById('bc-input')?.focus(), 250);
    }

    function closeChat() {
        document.getElementById('bosschat-panel')?.classList.add('hidden');
    }

    function renderFaqs() {
        const container = document.getElementById('bc-faqs');
        container.innerHTML = FAQS.map((f, i) =>
            `<button class="bc-faq-btn" onclick="window._bcFaq(${i})">${f.q}</button>`
        ).join('');
        window._bcFaq = function (i) {
            appendUserBubble(FAQS[i].q);
            showTyping().then(() => appendBotBubble(FAQS[i].a));
        };
    }

    function appendBotBubble(html) {
        const msgs = document.getElementById('bc-messages');
        const el = document.createElement('div');
        el.className = 'bc-bubble bot';
        el.innerHTML = html;
        msgs.appendChild(el);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function appendUserBubble(text) {
        const msgs = document.getElementById('bc-messages');
        const el = document.createElement('div');
        el.className = 'bc-bubble user';
        el.textContent = text;
        msgs.appendChild(el);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function showTyping() {
        const msgs = document.getElementById('bc-messages');
        const el = document.createElement('div');
        el.className = 'bc-bubble bot bc-typing';
        el.innerHTML = '<span></span><span></span><span></span>';
        msgs.appendChild(el);
        msgs.scrollTop = msgs.scrollHeight;
        return new Promise(resolve => setTimeout(() => { el.remove(); resolve(); }, BOT_DELAY));
    }

    function sendMessage() {
        const input = document.getElementById('bc-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        appendUserBubble(text);

        const lower = text.toLowerCase();
        const matched = FAQS.find(f =>
            f.q.toLowerCase().split(/\s+/).some(w => lower.includes(w)) ||
            lower.includes('giao') && f.q.includes('Giao') ||
            lower.includes('phí') && f.q.includes('phí') ||
            lower.includes('hủy') && f.q.includes('Hủy') ||
            lower.includes('thanh toán') && f.q.includes('Thanh') ||
            lower.includes('liên hệ') && f.q.includes('Liên hệ') ||
            lower.includes('đặt') && f.q.includes('đặt')
        );

        showTyping().then(() => {
            if (matched) {
                appendBotBubble(matched.a);
            } else {
                appendBotBubble(
                    'Xin lỗi, tôi chưa hiểu câu hỏi của bạn. Bạn có thể chọn từ các câu hỏi phổ biến bên dưới, ' +
                    'hoặc gọi hotline <strong>0123 456 789</strong> để được hỗ trợ trực tiếp nhé!'
                );
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
