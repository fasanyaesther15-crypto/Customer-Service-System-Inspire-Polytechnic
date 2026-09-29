document.documentElement.classList.add('js-ready');

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-navigation');

if (menuToggle && navigation) {
  const closeMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    const label = menuToggle.querySelector('.menu-toggle-label');
    if (label) label.textContent = 'Menu';
    navigation.classList.remove('is-open');
    document.body.classList.remove('navigation-open');
  };

  const openMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close navigation');
    const label = menuToggle.querySelector('.menu-toggle-label');
    if (label) label.textContent = 'Close';
    navigation.classList.add('is-open');
    document.body.classList.add('navigation-open');
    const firstLink = navigation.querySelector('a');
    if (firstLink && window.matchMedia('(max-width: 980px)').matches) firstLink.focus();
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
      const wasOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      closeMenu();
      if (wasOpen) menuToggle.focus();
    } else if (event.key === 'Tab' && menuToggle.getAttribute('aria-expanded') === 'true' && window.matchMedia('(max-width: 980px)').matches) {
      const focusable = [menuToggle, ...navigation.querySelectorAll('a[href], button:not([disabled])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        menuToggle.focus();
      }
    }
  });
}

const workspaceShell = document.querySelector('.workspace-shell');
const workspaceMenuToggle = document.querySelector('[data-sidebar-open]');
const workspaceSidebar = document.querySelector('.workspace-sidebar');

if (workspaceShell && workspaceMenuToggle && workspaceSidebar) {
  const closeWorkspaceMenu = (restoreFocus = false) => {
    workspaceShell.classList.remove('is-nav-open');
    workspaceMenuToggle.setAttribute('aria-expanded', 'false');
    workspaceMenuToggle.setAttribute('aria-label', 'Open workspace navigation');
    document.body.classList.remove('workspace-navigation-open');
    if (restoreFocus) workspaceMenuToggle.focus();
  };

  workspaceMenuToggle.addEventListener('click', () => {
    workspaceShell.classList.add('is-nav-open');
    workspaceMenuToggle.setAttribute('aria-expanded', 'true');
    workspaceMenuToggle.setAttribute('aria-label', 'Close workspace navigation');
    document.body.classList.add('workspace-navigation-open');
    workspaceSidebar.querySelector('.workspace-close').focus();
  });

  workspaceShell.querySelectorAll('[data-sidebar-close]').forEach((button) => {
    button.addEventListener('click', () => closeWorkspaceMenu(true));
  });

  workspaceSidebar.querySelectorAll('.workspace-nav-link').forEach((link) => {
    link.addEventListener('click', () => closeWorkspaceMenu());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && workspaceShell.classList.contains('is-nav-open')) {
      closeWorkspaceMenu(true);
      return;
    }
    if (event.key === 'Tab' && workspaceShell.classList.contains('is-nav-open')) {
      const focusable = Array.from(workspaceSidebar.querySelectorAll('a[href], button:not([disabled])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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

const userRows = Array.from(document.querySelectorAll('[data-user-row]'));
const userSearch = document.querySelector('[data-user-search]');
const userRoleFilter = document.querySelector('[data-user-role-filter]');
const userStatusFilter = document.querySelector('[data-user-status-filter]');

if (userRows.length) {
  userRows.forEach((row) => {
    const form = row.querySelector('[data-user-form]');
    const roleInput = row.querySelector('[data-user-role]');
    const roleValue = row.querySelector('[data-user-role-value]');
    const activeInput = row.querySelector('[data-user-active]');
    const saveButton = row.querySelector('[data-user-save]');
    const statusLabel = row.querySelector('[data-user-status-label]');
    const original = { role: roleValue.value, active: activeInput.checked };

    const updateRow = () => {
      roleValue.value = roleInput.value;
      row.dataset.role = roleInput.value;
      row.dataset.status = activeInput.checked ? 'active' : 'inactive';
      statusLabel.textContent = activeInput.checked ? 'Active' : 'Inactive';
      statusLabel.classList.toggle('user-status-active', activeInput.checked);
      statusLabel.classList.toggle('user-status-inactive', !activeInput.checked);
      const dirty = roleValue.value !== original.role || activeInput.checked !== original.active;
      saveButton.disabled = !dirty;
      saveButton.classList.toggle('is-dirty', dirty);
      form.classList.toggle('has-changes', dirty);
    };

    roleInput.addEventListener('change', updateRow);
    activeInput.addEventListener('change', updateRow);
    form.addEventListener('submit', () => { saveButton.disabled = true; });
  });

  const filterUsers = () => {
    const query = (userSearch.value || '').trim().toLowerCase();
    const role = userRoleFilter.value;
    const status = userStatusFilter.value;
    let visibleCount = 0;
    userRows.forEach((row) => {
      const matches = (!query || `${row.dataset.name} ${row.dataset.email}`.includes(query))
        && (!role || row.dataset.role === role)
        && (!status || row.dataset.status === status);
      row.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    document.querySelector('[data-user-empty]').hidden = visibleCount !== 0;
    document.querySelector('[data-user-result-count]').textContent = `${visibleCount} ${visibleCount === 1 ? 'user' : 'users'}`;
  };

  [userSearch, userRoleFilter, userStatusFilter].forEach((control) => {
    control.addEventListener(control === userSearch ? 'input' : 'change', filterUsers);
  });
}

const activityEntries = Array.from(document.querySelectorAll('[data-activity-entry]'));
if (activityEntries.length) {
  const search = document.querySelector('[data-activity-search]');
  const category = document.querySelector('[data-activity-category]');
  const dateFilter = document.querySelector('[data-activity-date]');
  const feed = document.querySelector('[data-activity-feed]');
  const filterActivity = () => {
    const query = search.value.trim().toLowerCase();
    const selectedCategory = category.value;
    const selectedDate = dateFilter.value;
    const days = Number(selectedDate) || 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = selectedDate === 'today' ? today.getTime() : days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
    let visibleCount = 0;
    activityEntries.forEach((entry) => {
      const matches = (!query || entry.dataset.search.includes(query))
        && (!selectedCategory || entry.dataset.category === selectedCategory)
        && (!cutoff || new Date(entry.dataset.date).getTime() >= cutoff);
      entry.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    feed.querySelectorAll('.activity-date-heading').forEach((heading) => {
      let next = heading.nextElementSibling;
      let hasVisibleEntry = false;
      while (next && !next.classList.contains('activity-date-heading')) {
        if (next.matches('[data-activity-entry]') && !next.hidden) hasVisibleEntry = true;
        next = next.nextElementSibling;
      }
      heading.hidden = !hasVisibleEntry;
    });
    feed.querySelector('[data-activity-empty]').hidden = visibleCount !== 0;
  };
  [search, category, dateFilter].forEach((control) => {
    control.addEventListener(control === search ? 'input' : 'change', filterActivity);
  });
}

const chatPanel = document.querySelector('[data-chat-session]');
if (chatPanel && typeof io === 'function') {
	const socket = io();
	const sessionId = chatPanel.dataset.chatSession;
	const messages = chatPanel.querySelector('[data-chat-messages]');
	const form = chatPanel.querySelector('[data-chat-form]');
	const error = chatPanel.querySelector('[data-chat-error]');
  const input = form.elements.message;
  const sendButton = form.querySelector('button[type="submit"]');
  const connection = chatPanel.querySelector('[data-chat-connection]');
  const status = chatPanel.querySelector('[data-chat-status]');
  const currentUserId = chatPanel.dataset.currentUser;
  const workspaceRole = document.body.dataset.workspaceRole;
  let isClosed = chatPanel.dataset.sessionStatus === 'closed';
  let joined = false;

  const setConnection = (label) => {
    if (connection) {
      connection.textContent = label;
      connection.dataset.state = label.toLowerCase().replaceAll(' ', '-');
    }
  };
  const setComposerState = () => {
    const canSend = socket.connected && joined && !isClosed;
    input.disabled = isClosed || (!canSend && workspaceRole !== 'support_agent' && workspaceRole !== 'administrator');
    sendButton.disabled = isClosed || (!canSend && workspaceRole !== 'support_agent' && workspaceRole !== 'administrator');
  };
  const appendMessage = (message) => {
    if (message.id && messages.querySelector(`[data-message-id="${message.id}"]`)) return;
    messages.querySelector('.chat-empty-state, .chat-loading')?.remove();
    const timestamp = new Date(message.created_at || Date.now());
    const day = timestamp.toDateString();
    const lastMessage = messages.querySelector('.chat-message:last-of-type');
    if (!lastMessage || lastMessage.dataset.day !== day) {
      const separator = document.createElement('div');
      separator.className = 'chat-date-separator';
      separator.textContent = day === new Date().toDateString() ? 'Today' : timestamp.toLocaleDateString([], { dateStyle: 'long' });
      messages.appendChild(separator);
    }
    const item = document.createElement('article');
    item.className = 'chat-message';
    item.dataset.day = day;
    if (message.id) item.dataset.messageId = message.id;
    if (message.sender_id) item.dataset.senderId = message.sender_id;
    const isOwn = Boolean(currentUserId && message.sender_id === currentUserId);
    if (isOwn) item.classList.add('is-own');
    const sender = document.createElement('span');
    sender.className = 'message-author';
    sender.textContent = isOwn ? 'You' : (message.sender_name || (workspaceRole === 'student' ? 'Support team' : 'Student'));
    const text = document.createElement('p');
    text.textContent = message.message;
    const time = document.createElement('time');
    time.dateTime = timestamp.toISOString();
    time.textContent = timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    item.append(sender, text, time);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  };
  const markClosed = () => {
    isClosed = true;
    chatPanel.dataset.sessionStatus = 'closed';
    setConnection('Conversation closed');
    if (status) {
      status.textContent = 'Closed';
      status.className = 'status-badge status-closed';
    }
    const closeButton = chatPanel.querySelector('[data-close-chat]');
    if (closeButton) closeButton.remove();
    const closedNotice = chatPanel.querySelector('[data-chat-closed-message]');
    if (closedNotice) closedNotice.hidden = false;
    setComposerState();
  };
  const loadHistory = () => {
    socket.emit('chat:history', { sessionId }, (result) => {
      if (result.error) {
        if (error) error.textContent = result.error;
        setConnection('Connection error');
        return;
      }
      messages.replaceChildren();
      (result.messages || []).forEach(appendMessage);
      if (!messages.children.length) {
        const empty = document.createElement('p');
        empty.className = 'chat-empty-state';
      empty.textContent = 'This conversation is ready. Send a message to begin.';
        messages.appendChild(empty);
      }
      messages.scrollTop = messages.scrollHeight;
    });
  };

  socket.on('connect', () => {
    joined = false;
    setConnection('Connecting...');
    socket.emit('chat:join', { sessionId }, (result) => {
      if (result.error) {
        if (error) error.textContent = result.error;
        setConnection('Connection error');
        setComposerState();
        return;
      }
      joined = true;
      setConnection(isClosed ? 'Conversation closed' : 'Connected');
      setComposerState();
      loadHistory();
    });
  });
  socket.on('disconnect', () => {
    joined = false;
    if (!isClosed) setConnection('Reconnecting...');
    setComposerState();
  });
  socket.on('connect_error', () => {
    setConnection('Connection error');
    setComposerState();
  });
  socket.on('chat:message', appendMessage);
  socket.on('chat:closed', markClosed);
  form.addEventListener('submit', (event) => {
    if (!socket.connected || !joined) {
      if (workspaceRole === 'student' || isClosed) {
        event.preventDefault();
        if (error) error.textContent = isClosed ? 'This conversation is closed.' : 'The chat connection is unavailable. Please try again.';
      }
      return;
    }
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    sendButton.disabled = true;
    socket.emit('chat:message', { sessionId, message: value }, (result) => {
      if (result.error) {
        if (error) error.textContent = result.error;
      } else {
        input.value = '';
        if (error) error.textContent = '';
      }
      setComposerState();
    });
  });
  if (input.tagName === 'TEXTAREA') {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
  }
  const closeButton = chatPanel.querySelector('[data-close-chat]');
  if (closeButton) closeButton.addEventListener('click', () => socket.emit('chat:close', { sessionId }, (result) => {
    if (result.error) {
      if (error) error.textContent = result.error;
    } else {
      markClosed();
    }
  }));
  if (isClosed) markClosed();
  else setConnection('Connecting...');
  setComposerState();
}
