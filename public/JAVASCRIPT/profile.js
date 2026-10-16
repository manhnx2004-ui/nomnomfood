let avatarModalInst;
let pendingAvatarUrl = '';

const PRESET_AVATARS = [
    // Nhân vật hoạt hình (adventurer)
    { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Lily',   label: 'Lily',   cat: 'nhanvat' },
    { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Mia',    label: 'Mia',    cat: 'nhanvat' },
    { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Coco',   label: 'Coco',   cat: 'nhanvat' },
    { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Zoe',    label: 'Zoe',    cat: 'nhanvat' },
    { url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Emma',   label: 'Emma',   cat: 'nhanvat' },
    // Robot dễ thương (bottts)
    { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Beep',       label: 'Beep',   cat: 'robot' },
    { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Domo',       label: 'Domo',   cat: 'robot' },
    { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Sparky',     label: 'Sparky', cat: 'robot' },
    { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Bloop',      label: 'Bloop',  cat: 'robot' },
    { url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Zippy',      label: 'Zippy',  cat: 'robot' },
    // Vui nhộn (fun-emoji)
    { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Peach',   label: 'Peach',  cat: 'emoji' },
    { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Mochi',   label: 'Mochi',  cat: 'emoji' },
    { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Nova',    label: 'Nova',   cat: 'emoji' },
    { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Pixel',   label: 'Pixel',  cat: 'emoji' },
    { url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Sunny',   label: 'Sunny',  cat: 'emoji' },
    // Tối giản (lorelei)
    { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Kiki',      label: 'Kiki',   cat: 'minimal' },
    { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Nana',      label: 'Nana',   cat: 'minimal' },
    { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Poko',      label: 'Poko',   cat: 'minimal' },
    { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Suki',      label: 'Suki',   cat: 'minimal' },
    { url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Yuki',      label: 'Yuki',   cat: 'minimal' },
];

function defaultAvatar(name) {
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name || 'user')}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;

    avatarModalInst = new bootstrap.Modal(document.getElementById('avatarModal'));

    await loadProfile(getUserId());

    document.getElementById('profileForm').addEventListener('submit', e => {
        e.preventDefault();
        saveProfile(getUserId());
    });

    document.getElementById('avatar-file-input').addEventListener('change', function () {
        if (this.files[0]) uploadAvatarFile(this.files[0]);
    });
});

// ==================== Profile load / save ====================

async function loadProfile(userId) {
    try {
        const resp = await fetch(`${API}/users/${userId}`);
        if (!resp.ok) throw new Error();
        const user = await resp.json();

        const avatarSrc = user.avatar || defaultAvatar(user.name);
        document.getElementById('profile-avatar').src = avatarSrc;

        document.getElementById('profile-name').textContent  = user.name;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-phone').textContent = user.phone || 'Chưa cập nhật';

        document.getElementById('edit-name').value  = user.name  || '';
        document.getElementById('edit-phone').value = user.phone || '';

        if (user.addresses && user.addresses[0]) {
            const a = user.addresses[0];
            document.getElementById('edit-street').value   = a.street     || '';
            document.getElementById('edit-city').value     = a.city       || '';
            document.getElementById('edit-district').value = a.state      || '';
            document.getElementById('edit-postal').value   = a.postalCode || '';
        }
    } catch {
        const cached = getUser();
        if (cached) {
            document.getElementById('profile-avatar').src = cached.avatar || defaultAvatar(cached.name);
            document.getElementById('profile-name').textContent  = cached.name;
            document.getElementById('profile-email').textContent = cached.email;
            document.getElementById('profile-phone').textContent = cached.phone || 'Chưa cập nhật';
            document.getElementById('edit-name').value  = cached.name  || '';
            document.getElementById('edit-phone').value = cached.phone || '';
        }
        showToast('Lỗi tải thông tin tài khoản', 'danger');
    }
}

async function saveProfile(userId) {
    const btn = document.getElementById('save-btn');
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...';

    const updated = {
        name:  document.getElementById('edit-name').value.trim(),
        phone: document.getElementById('edit-phone').value.trim(),
        addresses: [{
            street:     document.getElementById('edit-street').value.trim(),
            city:       document.getElementById('edit-city').value.trim(),
            state:      document.getElementById('edit-district').value.trim(),
            postalCode: document.getElementById('edit-postal').value.trim(),
            country:    'Viet Nam',
        }],
    };

    try {
        const resp = await fetch(`${API}/users/${userId}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(updated),
        });
        if (resp.ok) {
            const user = await resp.json();
            localStorage.setItem('nomnomfood_user', JSON.stringify(user));
            document.getElementById('profile-name').textContent  = user.name;
            document.getElementById('profile-phone').textContent = user.phone || 'Chưa cập nhật';
            updateNavbar();
            showToast('Cập nhật thành công!', 'success');
        } else {
            showToast('Cập nhật thất bại', 'danger');
        }
    } catch {
        showToast('Lỗi kết nối server', 'danger');
    }

    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i>Lưu thay đổi';
}

// ==================== Avatar modal ====================

function openAvatarModal() {
    pendingAvatarUrl = document.getElementById('profile-avatar').src;
    document.getElementById('avatar-preview').src = pendingAvatarUrl;
    document.getElementById('avatar-upload-status').innerHTML = '';
    document.getElementById('avatar-file-input').value = '';
    filterAvatars('all');
    avatarModalInst.show();
}

function filterAvatars(cat) {
    document.querySelectorAll('.avatar-cat-btn').forEach(btn => {
        const active = btn.dataset.cat === cat;
        btn.classList.toggle('btn-danger', active);
        btn.classList.toggle('btn-outline-danger', !active);
    });

    const list = cat === 'all' ? PRESET_AVATARS : PRESET_AVATARS.filter(a => a.cat === cat);
    document.getElementById('preset-avatar-grid').innerHTML = list.map(a => `
        <div class="col-3 col-md-2">
            <div class="avatar-option text-center p-1 rounded-3"
                 onclick="selectPresetAvatar(this, '${a.url}')"
                 style="cursor:pointer;border:2px solid transparent;transition:.15s;border-radius:12px!important"
                 title="${a.label}">
                <img src="${a.url}" alt="${a.label}" loading="lazy"
                     class="rounded-3 w-100"
                     style="aspect-ratio:1;object-fit:contain;background:#f8f9fa">
                <div class="mt-1" style="font-size:10px;color:#888">${a.label}</div>
            </div>
        </div>`).join('');
}

function selectPresetAvatar(el, url) {
    pendingAvatarUrl = url;
    document.getElementById('avatar-preview').src = url;
    document.querySelectorAll('.avatar-option').forEach(e => {
        e.style.borderColor = 'transparent';
        e.style.background  = 'transparent';
    });
    el.style.borderColor = '#dc3545';
    el.style.background  = '#fff5f5';
}

function handleAvatarDrop(event) {
    event.preventDefault();
    document.getElementById('avatar-drop-zone').style.background = '#fff5f5';
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) uploadAvatarFile(file);
}

async function uploadAvatarFile(file) {
    const status   = document.getElementById('avatar-upload-status');
    const dropZone = document.getElementById('avatar-drop-zone');
    status.innerHTML = `
        <div class="text-muted small">
            <span class="spinner-border spinner-border-sm me-1"></span>Đang tải lên...
        </div>`;
    dropZone.style.pointerEvents = 'none';

    try {
        const form = new FormData();
        form.append('image', file);
        const res = await fetch(`${API}/upload/avatar`, { method: 'POST', body: form });
        if (!res.ok) throw new Error((await res.json()).error || 'Upload thất bại');
        const { url } = await res.json();
        pendingAvatarUrl = url;
        document.getElementById('avatar-preview').src = url;
        status.innerHTML = `
            <div class="text-success small">
                <i class="fa-solid fa-circle-check me-1"></i>Tải lên thành công!
            </div>`;
    } catch (err) {
        status.innerHTML = `
            <div class="text-danger small">
                <i class="fa-solid fa-circle-xmark me-1"></i>${err.message || 'Lỗi khi tải ảnh'}
            </div>`;
    } finally {
        dropZone.style.pointerEvents = '';
    }
}

async function saveAvatarSelection() {
    if (!pendingAvatarUrl) { avatarModalInst.hide(); return; }
    const userId = getUserId();
    try {
        const res = await fetch(`${API}/users/${userId}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ avatar: pendingAvatarUrl }),
        });
        if (!res.ok) throw new Error();
        const user = await res.json();
        localStorage.setItem('nomnomfood_user', JSON.stringify(user));
        document.getElementById('profile-avatar').src = pendingAvatarUrl;
        avatarModalInst.hide();
        updateNavbar();
        showToast('Đã cập nhật ảnh đại diện!', 'success');
    } catch {
        showToast('Lỗi khi lưu ảnh đại diện', 'danger');
    }
}
