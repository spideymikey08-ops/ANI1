/* Aniya chat widget — add to any page AFTER core.js.
   Markup lives in Chat/chat-widget.html, styles in Chat/chat.css. */

(function () {
    if (document.getElementById('chatFab')) return;

    // document.currentScript is only available while the script first runs
    const widgetUrl = new URL('chat-widget.html', document.currentScript.src).href;
    const history = [];

    async function init() {
        let html;

        try {
            const res = await fetch(widgetUrl);
            if (!res.ok) throw new Error('Chat widget not found');
            html = await res.text();
        } catch (e) {
            return;     // the chat is optional; the page works without it
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

        function add(role, text) {
            const d = cloneTemplate('tpl-chat-msg');
            d.classList.add(...role.split(' '));
            d.textContent = text;           // textContent keeps it XSS-safe
            log.appendChild(d);
            log.scrollTop = log.scrollHeight;
            return d;
        }

        function toggle(open) {
            box.hidden = !open;
            fab.hidden = open;

            if (open) {
                if (!log.children.length) {
                    add('bot', "Hi! I'm Ani 🌾 Ask me about your plots, watering tasks, harvests, seeds or finances.");
                }
                input.focus();
            }
        }

        fab.addEventListener('click', () => toggle(true));
        document.getElementById('chatClose').addEventListener('click', () => toggle(false));

        form.addEventListener('submit', async e => {
            e.preventDefault();

            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            add('user', text);
            const typing = add('bot typing', '…');
            sendButton.disabled = true;

            try {
                const r = await post('Chat/chat.php', { message: text, history });
                typing.remove();
                add('bot', r.reply);
                history.push({ role: 'user', content: text }, { role: 'assistant', content: r.reply });
            } catch (err) {
                typing.remove();
                add('bot error', err.message || 'Something went wrong.');
            }

            sendButton.disabled = false;
            input.focus();
        });
    }

    init();
})();
