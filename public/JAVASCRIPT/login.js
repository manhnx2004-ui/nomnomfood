document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (isLoggedIn()) { window.location.href = 'index.html'; return; }

    // Show success message after registration
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
        showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'warning');
    }
    if (params.get('registered') === '1') {
        showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        const btn      = document.getElementById('loginBtn');

        errorDiv.classList.add('d-none');
        btn.disabled = true;
        btn.textContent = 'Đang đăng nhập...';

        try {
            const resp = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await resp.json();

            if (resp.ok) {
                const { token, ...user } = data;
                localStorage.setItem('nomnomfood_token', token);
                localStorage.setItem('nomnomfood_user', JSON.stringify(user));
                window.location.href = safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
            } else {
                errorDiv.textContent = data.error || 'Email hoặc mật khẩu không đúng';
                errorDiv.classList.remove('d-none');
                btn.disabled = false;
                btn.textContent = 'Đăng nhập';
            }
        } catch {
            errorDiv.textContent = 'Lỗi kết nối server. Vui lòng thử lại.';
            errorDiv.classList.remove('d-none');
            btn.disabled = false;
            btn.textContent = 'Đăng nhập';
        }
    });
});

// Chỉ chuyển hướng về trang trong chính website (chặn link lừa đảo dạng login.html?redirect=https://trang-gia.com)
function safeRedirect(target) {
    if (!target) return 'index.html';
    try {
        const u = new URL(target, window.location.origin);
        return u.origin === window.location.origin ? u.pathname + u.search + u.hash : 'index.html';
    } catch {
        return 'index.html';
    }
}
