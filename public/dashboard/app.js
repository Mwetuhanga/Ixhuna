const state = {
  token: localStorage.getItem('token'),
  activeConversationId: null,
};

function api(path, opts = {}) {
  return fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(opts.headers || {}),
    },
  }).then(async (res) => {
    if (!res.ok) throw new Error(await res.text());
    return res.status === 204 ? null : res.json();
  });
}

function identityLabel(customer) {
  if (customer.displayName) return customer.displayName;
  const identity = customer.identities?.[0];
  return identity ? `${identity.channel}:${identity.externalId}` : customer.id.slice(0, 8);
}

function showApp() {
  document.getElementById('login-view').hidden = true;
  document.getElementById('app-view').hidden = false;
  connectSocket();
  loadConversations();
  loadComplaints();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const { accessToken } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    state.token = accessToken;
    localStorage.setItem('token', accessToken);
    showApp();
  } catch (err) {
    document.getElementById('login-error').textContent = 'Invalid email or password.';
  }
});

document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  location.reload();
});

function connectSocket() {
  const socket = io('/agents', { auth: { token: state.token } });
  socket.on('message.created', ({ conversationId }) => {
    loadConversations();
    if (conversationId === state.activeConversationId) selectConversation(conversationId);
  });
  socket.on('complaint.created', () => loadComplaints());
  socket.on('conversation.handover', ({ conversationId }) => {
    loadConversations();
    if (conversationId === state.activeConversationId) selectConversation(conversationId);
  });
}

async function loadConversations() {
  const conversations = await api('/conversations');
  const list = document.getElementById('conversation-list');
  list.innerHTML = '';
  for (const conv of conversations) {
    const li = document.createElement('li');
    const last = conv.messages?.[0];
    li.textContent = `${identityLabel(conv.customer)} — ${conv.handoverState}${last ? `: ${last.body.slice(0, 30)}` : ''}`;
    li.className = conv.id === state.activeConversationId ? 'active' : '';
    li.addEventListener('click', () => selectConversation(conv.id));
    list.appendChild(li);
  }
}

async function loadComplaints() {
  const complaints = await api('/complaints');
  const list = document.getElementById('complaint-list');
  list.innerHTML = '';
  for (const complaint of complaints) {
    const li = document.createElement('li');
    li.textContent = `#${complaint.ticket} ${complaint.category} · ${complaint.channel} — ${complaint.status}`;
    // Chat complaints open their conversation; form complaints have none.
    li.addEventListener('click', () =>
      complaint.conversationId ? selectConversation(complaint.conversationId) : showComplaint(complaint)
    );
    list.appendChild(li);
  }
}

function showComplaint(complaint) {
  state.activeConversationId = null;
  document.getElementById('thread-header').textContent =
    `Complaint #${complaint.ticket} — ${complaint.category} via ${complaint.channel} (no chat to reply in)`;

  const thread = document.getElementById('message-thread');
  thread.innerHTML = '';
  const li = document.createElement('li');
  const details = [`Contact: ${complaint.contact}`];
  if (complaint.language) details.push(`Language: ${complaint.language}`);
  li.innerHTML =
    `<span class="meta">${escapeHtml(details.join(' · '))} · ${new Date(complaint.createdAt).toLocaleString()}</span>` +
    escapeHtml(complaint.description);
  thread.appendChild(li);

  document.querySelectorAll('#conversation-list li').forEach((el) => el.classList.remove('active'));
}

async function selectConversation(id) {
  state.activeConversationId = id;
  const conv = await api(`/conversations/${id}`);

  document.getElementById('thread-header').textContent =
    `${identityLabel(conv.customer)} — handover: ${conv.handoverState}` +
    (conv.assignedAgent ? ` (assigned: ${conv.assignedAgent.name})` : '');

  const thread = document.getElementById('message-thread');
  thread.innerHTML = '';
  for (const message of conv.messages) {
    const li = document.createElement('li');
    li.className = message.direction === 'OUTBOUND' ? 'outbound' : '';
    li.innerHTML = `<span class="meta">${message.senderType} · ${message.channel}</span>${escapeHtml(message.body)}`;
    thread.appendChild(li);
  }
  thread.scrollTop = thread.scrollHeight;

  document.querySelectorAll('#conversation-list li').forEach((li) => li.classList.remove('active'));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById('reply-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.activeConversationId) return;
  const textarea = document.getElementById('reply-text');
  const text = textarea.value.trim();
  if (!text) return;

  await api(`/conversations/${state.activeConversationId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  textarea.value = '';
  selectConversation(state.activeConversationId);
});

document.getElementById('suggest-btn').addEventListener('click', async () => {
  if (!state.activeConversationId) return;
  const { suggestion } = await api(`/conversations/${state.activeConversationId}/suggested-reply`);
  document.getElementById('reply-text').value = suggestion;
});

document.getElementById('handover-human').addEventListener('click', async () => {
  if (!state.activeConversationId) return;
  await api(`/conversations/${state.activeConversationId}/handover`, {
    method: 'POST',
    body: JSON.stringify({ handoverState: 'HUMAN' }),
  });
  selectConversation(state.activeConversationId);
});

document.getElementById('handover-bot').addEventListener('click', async () => {
  if (!state.activeConversationId) return;
  await api(`/conversations/${state.activeConversationId}/handover`, {
    method: 'POST',
    body: JSON.stringify({ handoverState: 'BOT' }),
  });
  selectConversation(state.activeConversationId);
});

if (state.token) showApp();
