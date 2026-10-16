document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) { window.location.href = 'index.html'; return; }

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name     = document.getElementById('regName').value.trim();
        const email    = document.getElementById('regEmail').value.trim();
        const phone    = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;
        const errorDiv = document.getElementById('registerError');
        const btn      = document.getElementById('registerBtn');

        errorDiv.classList.add('d-none');

        if (!name || !email || !password) {
            errorDiv.textContent = 'Vui long dien day du ho ten, email va mat khau';
            errorDiv.classList.remove('d-none');
            return;
        }
        if (password.length < 6) {
            errorDiv.textContent = 'Mat khau phai co it nhat 6 ky tu';
            errorDiv.classList.remove('d-none');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Dang xu ly...';

        try {
            const resp = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password }),
            });
            const data = await resp.json();

            if (resp.ok) {
                window.location.href = 'login.html?registered=1';
            } else {
                errorDiv.textContent = data.error === 'Email already exists'
                    ? 'Email nay da duoc su dung'
                    : (data.error || 'Dang ky that bai');
                errorDiv.classList.remove('d-none');
                btn.disabled = false;
                btn.textContent = 'Tao tai khoan';
            }
        } catch {
            errorDiv.textContent = 'Loi ket noi server. Vui long thu lai.';
            errorDiv.classList.remove('d-none');
            btn.disabled = false;
            btn.textContent = 'Tao tai khoan';
        }
    });
});
