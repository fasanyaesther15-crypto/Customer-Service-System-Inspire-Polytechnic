document.documentElement.classList.add('js-ready');

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-navigation');

if (menuToggle && navigation) {
  const closeMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('is-open');
  };

  const openMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close navigation');
    navigation.classList.add('is-open');
  };

  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });

  document.addEventListener('click', (event) => {
    if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });
}

const passwordToggles = document.querySelectorAll('[data-password-toggle]');
passwordToggles.forEach((toggle) => {
	const targetId = toggle.dataset.passwordToggle;
	const targetInput = targetId ? document.getElementById(targetId) : null;
	if (!targetInput) return;

	toggle.addEventListener('click', () => {
		const isHidden = targetInput.type === 'password';
		targetInput.type = isHidden ? 'text' : 'password';
		toggle.setAttribute('aria-pressed', String(isHidden));
		toggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
		toggle.querySelector('span').textContent = isHidden ? 'Hide' : 'Show';
	});
});

const chatPanel = document.querySelector('[data-chat-session]');
if (chatPanel && typeof io === 'function') {
	const socket = io();
	const sessionId = chatPanel.dataset.chatSession;
	const messages = chatPanel.querySelector('[data-chat-messages]');
	const form = chatPanel.querySelector('[data-chat-form]');
	const error = chatPanel.querySelector('[data-chat-error]');
	const addMessage = (message) => {
		const item = document.createElement('p');
		item.textContent = `${message.sender_name || 'You'}: ${message.message}`;
		messages.appendChild(item);
	};
	socket.emit('chat:join', { sessionId }, (result) => { if (result.error) error.textContent = result.error; });
	socket.emit('chat:history', { sessionId }, (result) => { messages.textContent = ''; (result.messages || []).forEach(addMessage); });
	socket.on('chat:message', addMessage);
	form.addEventListener('submit', (event) => { event.preventDefault(); const input = form.elements.message; socket.emit('chat:message', { sessionId, message: input.value }, (result) => { if (result.error) error.textContent = result.error; else input.value = ''; }); });
	chatPanel.querySelector('[data-close-chat]').addEventListener('click', () => socket.emit('chat:close', { sessionId }));
}
