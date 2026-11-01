/* Login + Register (needs core.js) */

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

if (loginForm) {
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();

        try {
            const r = await post('Auth/login.php', {
                username: document.getElementById('username').value.trim(),
                password: document.getElementById('password').value
            });

            localStorage.setItem('aniya_user', r.full_name || '');
            localStorage.setItem('aniya_role', r.role || 'user');

            if (r.role === 'admin') {
                window.location.href = urlFor('Admin/index.html');
            } else {
                window.location.href = urlFor('Dashboard/index.html');
            }
        } catch (err) {
            toast(err.message, true);
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async e => {
        e.preventDefault();

        try {
            await post('Auth/register.php', {
                full_name: document.getElementById('full_name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                username: document.getElementById('username').value.trim(),
                password: document.getElementById('password').value,
                confirm_password: document.getElementById('confirm_password').value
            });

            toast('Account created! Redirecting to login...');
            setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        } catch (err) {
            toast(err.message, true);
        }
    });
}
