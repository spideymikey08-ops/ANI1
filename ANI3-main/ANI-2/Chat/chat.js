/* Aniya chat widget — available on every logged-in page.
   Conversation transcript and AI context are saved per user in localStorage,
   so changing sidebar pages does not erase the conversation. */

(function () {
    if (document.getElementById('chatFab')) return;

    const scriptUrl = document.currentScript && document.currentScript.src;
    if (!scriptUrl) return;

    const widgetUrl = new URL('chat-widget.html', scriptUrl).href;
    const userName = localStorage.getItem('aniya_user') || 'guest';
    const userRole = localStorage.getItem('aniya_role') || 'user';
    const STORAGE_KEY = 'aniya_chat_v1:' + encodeURIComponent(userRole + ':' + userName);

    let history = [];
    let transcript = [];

    function loadSavedChat() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            history = Array.isArray(saved.history) ? saved.history : [];
            transcript = Array.isArray(saved.transcript) ? saved.transcript : [];
            history = history.filter(m =>
                m && (m.role === 'user' || m.role === 'assistant') &&
                typeof m.content === 'string'
            ).slice(-20);
            transcript = transcript.filter(m =>
                m && (m.role === 'user' || m.role === 'bot' || m.role === 'error') &&
                typeof m.text === 'string'
            ).slice(-100);
        } catch (e) {
            history = [];
            transcript = [];
        }
    }

    function saveChat() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                history: history.slice(-20),
                transcript: transcript.slice(-100)
            }));
        } catch (e) {
            // The chat remains usable if browser storage is unavailable/full.
        }
    }

    async function init() {
        let html;
        try {
            const res = await fetch(widgetUrl);
            if (!res.ok) throw new Error('Chat widget not found');
            html = await res.text();
        } catch (e) {
            return;
        }

        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        document.body.appendChild(wrap);

        const fab = document.getElementById('chatFab');
        const box = document.getElementById('chatBox');
        const log = document.getElementById('chatLog');
        const form = document.getElementById('chatForm');
        const input = document.getElementById('chatInput');
        const sendButton = form.querySelector('button');

        function renderMessage(role, text, persist = true) {
            const d = cloneTemplate('tpl-chat-msg');
            d.classList.add(role);
            d.textContent = text;
            log.appendChild(d);
            log.scrollTop = log.scrollHeight;

            if (persist && (role === 'user' || role === 'bot' || role === 'error')) {
                transcript.push({ role, text });
                transcript = transcript.slice(-100);
                saveChat();
            }
            return d;
        }

        function restoreConversation() {
            log.replaceChildren();
            transcript.forEach(m => renderMessage(m.role, m.text, false));
            if (!transcript.length) {
                renderMessage('bot', "Hi! I'm Ani 🌾 Ask me about your plots, tasks, harvests, seeds or finances.");
            }
            log.scrollTop = log.scrollHeight;
        }

        function toggle(open) {
            box.hidden = !open;
            fab.hidden = open;
            if (open) input.focus();
        }

        loadSavedChat();
        restoreConversation();
fab.addEventListener('click', () => toggle(true));

        document.getElementById('chatClose').addEventListener('click', () => {
            toggle(false);
            fab.focus();
        });

        form.addEventListener('submit', async e => {
            e.preventDefault();

            const message = input.value.trim();
            if (!message || sendButton.disabled) return;

            input.value = '';
            renderMessage('user', message);
            const typing = renderMessage('typing', '…', false);
            sendButton.disabled = true;

            try {
                const response = await post('Chat/chat.php', {
                    message,
                    history: history.slice(-20)
                });
                typing.remove();
                renderMessage('bot', response.reply);
                history.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: response.reply }
                );
                history = history.slice(-20);
                saveChat();
            } catch (err) {
                typing.remove();
                renderMessage('error', err.message || 'Something went wrong.');
            }

            sendButton.disabled = false;
            input.focus();
        });
    }

    init();
})();
