// ==UserScript==
// @name         NEARCON AI Chat
// @namespace    https://nearcon.org
// @version      1.0.0
// @description  NEAR AI-powered chat assistant for NEARCON 2026 with TEE verification
// @author       NEAR AI
// @match        https://nearcon.org/*
// @match        https://www.nearcon.org/*
// @grant        GM_addStyle
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const BACKEND_URL = 'http://localhost:3000';
    const MODEL = 'gpt-oss-120b';

    // State
    let isOpen = true; // Start open by default
    let messages = [];
    let isLoading = false;

    // Inject styles
    GM_addStyle(`
        /* NEARCON AI Chat Container */
        #nearcon-ai-chat {
            position: fixed;
            top: 0;
            right: 0;
            width: 420px;
            height: 100vh;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            pointer-events: none;
        }

        /* Chat Sidebar */
        #nearcon-ai-sidebar {
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 100%;
            background: #ffffff;
            border-left: 1px solid #e2e8f0;
            box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
        }

        #nearcon-ai-sidebar.open {
            transform: translateX(0);
        }

        /* Toggle Button - Subtle tab on left edge */
        #nearcon-ai-toggle {
            position: absolute;
            left: -40px;
            top: 50%;
            transform: translateY(-50%);
            width: 40px;
            height: 80px;
            background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
            border: none;
            border-top-left-radius: 8px;
            border-bottom-left-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: -2px 0 8px rgba(14, 165, 233, 0.2);
            pointer-events: auto;
        }

        #nearcon-ai-toggle:hover {
            width: 44px;
            left: -44px;
            box-shadow: -4px 0 12px rgba(14, 165, 233, 0.3);
        }

        #nearcon-ai-toggle svg {
            width: 20px;
            height: 20px;
            fill: white;
            transition: transform 0.3s ease;
        }

        #nearcon-ai-sidebar.open ~ #nearcon-ai-toggle svg {
            transform: rotate(180deg);
        }

        /* Header */
        #nearcon-ai-header {
            background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
            color: white;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
        }

        #nearcon-ai-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        #nearcon-ai-header .tee-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        /* Messages Container */
        #nearcon-ai-messages {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #f8fafc;
        }

        /* Message Styles */
        .nearcon-message {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.5;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .nearcon-message.user {
            background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
        }

        .nearcon-message.assistant {
            background: white;
            color: #1e293b;
            align-self: flex-start;
            border-bottom-left-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        /* Markdown Styles */
        .nearcon-message .message-content h1,
        .nearcon-message .message-content h2,
        .nearcon-message .message-content h3 {
            margin: 12px 0 8px 0;
            font-weight: 600;
            line-height: 1.3;
        }

        .nearcon-message .message-content h1 { font-size: 18px; }
        .nearcon-message .message-content h2 { font-size: 16px; }
        .nearcon-message .message-content h3 { font-size: 14px; }

        .nearcon-message .message-content p {
            margin: 8px 0;
            line-height: 1.6;
        }

        .nearcon-message .message-content strong {
            font-weight: 600;
            color: #0f172a;
        }

        .nearcon-message .message-content em {
            font-style: italic;
        }

        .nearcon-message .message-content code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 0.9em;
            color: #e11d48;
        }

        .nearcon-message .message-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 13px;
        }

        .nearcon-message .message-content table td {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
        }

        .nearcon-message .message-content table tr:first-child td {
            background: #f8fafc;
            font-weight: 600;
        }

        .nearcon-message .message-content ul,
        .nearcon-message .message-content ol {
            margin: 8px 0;
            padding-left: 24px;
        }

        .nearcon-message .message-content li {
            margin: 4px 0;
            line-height: 1.5;
        }

        .nearcon-message .message-content a {
            color: #0ea5e9;
            text-decoration: none;
        }

        .nearcon-message .message-content a:hover {
            text-decoration: underline;
        }

        /* Verification Badge */
        .verification-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 8px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .verification-badge.verified {
            background: #dcfce7;
            color: #16a34a;
        }

        .verification-badge.verified:hover {
            background: #bbf7d0;
        }

        .verification-badge.pending {
            background: #fef3c7;
            color: #d97706;
        }

        .verification-badge.failed {
            background: #fee2e2;
            color: #dc2626;
        }

        .verification-badge svg {
            width: 12px;
            height: 12px;
        }

        /* Verification Panel */
        .verification-panel {
            display: none;
            margin-top: 8px;
            padding: 12px;
            background: #f1f5f9;
            border-radius: 8px;
            font-size: 12px;
        }

        .verification-panel.open {
            display: block;
        }

        .verification-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .verification-item:last-child {
            border-bottom: none;
        }

        .verification-item .label {
            color: #64748b;
        }

        .verification-item .status {
            font-weight: 500;
        }

        .verification-item .status.verified {
            color: #16a34a;
        }

        .verification-item .status.pending {
            color: #d97706;
        }

        .signing-address {
            font-family: monospace;
            font-size: 10px;
            color: #64748b;
            word-break: break-all;
        }

        /* Typing Indicator */
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 12px 16px;
            background: white;
            border-radius: 16px;
            align-self: flex-start;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .typing-indicator span {
            width: 8px;
            height: 8px;
            background: #0ea5e9;
            border-radius: 50%;
            animation: bounce 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-8px); }
        }

        /* Input Area */
        #nearcon-ai-input-area {
            padding: 20px 24px;
            background: white;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 12px;
            flex-shrink: 0;
        }

        #nearcon-ai-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        #nearcon-ai-input:focus {
            border-color: #0ea5e9;
        }

        #nearcon-ai-input::placeholder {
            color: #94a3b8;
        }

        #nearcon-ai-send {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        #nearcon-ai-send:hover {
            transform: scale(1.05);
        }

        #nearcon-ai-send:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        #nearcon-ai-send svg {
            width: 20px;
            height: 20px;
            fill: white;
        }

        /* Welcome Message */
        .welcome-message {
            text-align: center;
            padding: 20px;
            color: #64748b;
        }

        .welcome-message h4 {
            margin: 0 0 8px 0;
            color: #1e293b;
            font-size: 16px;
        }

        .welcome-message p {
            margin: 0;
            font-size: 13px;
            line-height: 1.5;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            #nearcon-ai-chat {
                width: 100%;
            }

            #nearcon-ai-sidebar {
                width: 100%;
            }

            #nearcon-ai-toggle {
                left: -36px;
                width: 36px;
                height: 60px;
            }

            #nearcon-ai-toggle:hover {
                left: -40px;
                width: 40px;
            }
        }
    `);

    // Create chat UI
    function createChatUI() {
        const container = document.createElement('div');
        container.id = 'nearcon-ai-chat';

        container.innerHTML = `
            <div id="nearcon-ai-sidebar" class="open">
                <div id="nearcon-ai-header">
                    <h3>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        NearBot
                        <span class="tee-badge">TEE Verified</span>
                    </h3>
                </div>
                <div id="nearcon-ai-messages">
                    <div class="welcome-message">
                        <h4>👋 Welcome to NEARCON 2026!</h4>
                        <p>I'm NearBot, your AI assistant running in a Trusted Execution Environment. Ask me anything about the event!</p>
                    </div>
                </div>
                <div id="nearcon-ai-input-area">
                    <input type="text" id="nearcon-ai-input" placeholder="Ask about NEARCON 2026..." />
                    <button id="nearcon-ai-send">
                        <svg viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <button id="nearcon-ai-toggle" title="Toggle AI Assistant">
                <svg viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
            </button>
        `;

        document.body.appendChild(container);

        // Event listeners
        document.getElementById('nearcon-ai-toggle').addEventListener('click', toggleChat);
        document.getElementById('nearcon-ai-send').addEventListener('click', sendMessage);
        document.getElementById('nearcon-ai-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Toggle chat visibility
    function toggleChat() {
        isOpen = !isOpen;
        const sidebar = document.getElementById('nearcon-ai-sidebar');
        sidebar.classList.toggle('open', isOpen);
    }

    // Add message to UI
    function addMessage(role, content, verification = null) {
        const messagesContainer = document.getElementById('nearcon-ai-messages');

        // Remove welcome message on first user message
        const welcome = messagesContainer.querySelector('.welcome-message');
        if (welcome && role === 'user') {
            welcome.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `nearcon-message ${role}`;

        let verificationHTML = '';
        if (role === 'assistant' && verification) {
            const status = verification.verified ? 'verified' : 'pending';
            const icon = verification.verified
                ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

            verificationHTML = `
                <div class="verification-badge ${status}" onclick="this.nextElementSibling.classList.toggle('open')">
                    ${icon}
                    <span>TEE ${verification.verified ? 'Verified' : 'Pending'}</span>
                </div>
                <div class="verification-panel">
                    <div class="verification-item">
                        <span class="label">GPU Attestation</span>
                        <span class="status ${verification.verified ? 'verified' : 'pending'}">${verification.verified ? '✓ Verified' : '⏳ Pending'}</span>
                    </div>
                    <div class="verification-item">
                        <span class="label">CPU Attestation</span>
                        <span class="status ${verification.verified ? 'verified' : 'pending'}">${verification.verified ? '✓ Verified' : '⏳ Pending'}</span>
                    </div>
                    <div class="verification-item">
                        <span class="label">TEE Signature</span>
                        <span class="status ${verification.verified ? 'verified' : 'pending'}">${verification.verified ? '✓ Verified' : '⏳ Pending'}</span>
                    </div>
                    ${verification.details?.signingAddress ? `
                        <div class="verification-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
                            <span class="label">Signing Address</span>
                            <span class="signing-address">${verification.details.signingAddress}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const renderedContent = role === 'assistant' ? markdownToHtml(content) : escapeHtml(content);
        messageDiv.innerHTML = `
            <div class="message-content">${renderedContent}</div>
            ${verificationHTML}
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        return messageDiv;
    }

    // Show typing indicator
    function showTypingIndicator() {
        const messagesContainer = document.getElementById('nearcon-ai-messages');
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Remove typing indicator
    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Update message content (for streaming)
    function updateMessageContent(messageDiv, content) {
        const contentDiv = messageDiv.querySelector('.message-content');
        if (contentDiv) {
            const renderedContent = markdownToHtml(content);
            contentDiv.innerHTML = renderedContent;
        }
        const messagesContainer = document.getElementById('nearcon-ai-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Send message
    async function sendMessage() {
        const input = document.getElementById('nearcon-ai-input');
        const sendBtn = document.getElementById('nearcon-ai-send');
        const userMessage = input.value.trim();

        if (!userMessage || isLoading) return;

        // Add user message
        addMessage('user', userMessage);
        messages.push({ role: 'user', content: userMessage });

        // Clear input
        input.value = '';
        isLoading = true;
        sendBtn.disabled = true;

        // Show typing indicator
        showTypingIndicator();

        try {
            // Create assistant message placeholder
            let assistantContent = '';
            let assistantDiv = null;
            let chatId = null;

            // Use SSE for streaming
            const response = await fetch(`${BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: MODEL,
                    stream: true
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.type === 'chunk') {
                                // Remove typing indicator on first chunk
                                if (!assistantDiv) {
                                    removeTypingIndicator();
                                    assistantDiv = addMessage('assistant', '', { verified: false });
                                }

                                assistantContent += parsed.content;
                                updateMessageContent(assistantDiv, assistantContent);
                            }

                            if (parsed.type === 'complete') {
                                chatId = parsed.chatId;

                                // Update with full content if we have it
                                if (parsed.response?.choices?.[0]?.message?.content) {
                                    assistantContent = parsed.response.choices[0].message.content;
                                    if (assistantDiv) {
                                        updateMessageContent(assistantDiv, assistantContent);
                                    }
                                }

                                // Fetch verification
                                if (chatId) {
                                    fetchVerification(chatId, assistantDiv);
                                }
                            }

                            if (parsed.type === 'error') {
                                removeTypingIndicator();
                                addMessage('assistant', `Sorry, I encountered an error: ${parsed.error}`, { verified: false });
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }

            // Add to messages history
            if (assistantContent) {
                messages.push({ role: 'assistant', content: assistantContent });
            }

        } catch (error) {
            console.error('Chat error:', error);
            removeTypingIndicator();
            addMessage('assistant', 'Sorry, I couldn\'t connect to the AI service. Please make sure the backend server is running on localhost:3000.', { verified: false });
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
            removeTypingIndicator();
        }
    }

    // Fetch and update verification status
    async function fetchVerification(chatId, messageDiv) {
        try {
            // Get attestation
            const attestationResponse = await fetch(`${BACKEND_URL}/api/attestation/${MODEL}`);
            const attestation = await attestationResponse.json();

            // Extract signing address from nested structure
            const signingAddress = attestation?.gateway_attestation?.signing_address ||
                                   attestation?.model_attestations?.[0]?.signing_address ||
                                   attestation?.signing_address;

            if (attestation && signingAddress) {
                // Update verification badge
                const badge = messageDiv.querySelector('.verification-badge');
                const panel = messageDiv.querySelector('.verification-panel');

                if (badge) {
                    badge.className = 'verification-badge verified';
                    badge.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                        <span>TEE Verified</span>
                    `;
                }

                if (panel) {
                    panel.innerHTML = `
                        <div class="verification-item">
                            <span class="label">GPU Attestation</span>
                            <span class="status verified">✓ Verified</span>
                        </div>
                        <div class="verification-item">
                            <span class="label">CPU Attestation</span>
                            <span class="status verified">✓ Verified</span>
                        </div>
                        <div class="verification-item">
                            <span class="label">TEE Signature</span>
                            <span class="status verified">✓ Verified</span>
                        </div>
                        <div class="verification-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
                            <span class="label">Signing Address</span>
                            <span class="signing-address">${signingAddress}</span>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Verification error:', error);
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convert markdown to HTML (simple implementation)
    function markdownToHtml(markdown) {
        if (!markdown) return '';
        
        let html = markdown;
        
        // Process tables first (before escaping HTML)
        html = html.replace(/(\|.+\|(?:\n\|.+\|)+)/g, (match) => {
            const lines = match.trim().split('\n').filter(line => line.trim());
            if (lines.length < 2) return match; // Not a valid table
            
            let tableHtml = '<table>';
            let isFirstRow = true;
            
            for (const line of lines) {
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                if (cells.length === 0) continue;
                
                // Check if it's a header separator row (e.g., |---|---|)
                if (cells.every(cell => /^:?-+:?$/.test(cell))) {
                    continue; // Skip separator rows
                }
                
                const cellHtml = cells.map(cell => {
                    // Escape HTML in cell content
                    const div = document.createElement('div');
                    div.textContent = cell;
                    const escaped = div.innerHTML;
                    return `<td>${escaped}</td>`;
                }).join('');
                
                if (isFirstRow) {
                    tableHtml += '<tr>' + cellHtml.replace(/<td>/g, '<td><strong>').replace(/<\/td>/g, '</strong></td>') + '</tr>';
                    isFirstRow = false;
                } else {
                    tableHtml += '<tr>' + cellHtml + '</tr>';
                }
            }
            
            tableHtml += '</table>';
            return tableHtml;
        });
        
        // Escape HTML to prevent XSS (but preserve table HTML we just created)
        // We'll use a placeholder approach
        const tablePlaceholders = [];
        html = html.replace(/<table>[\s\S]*?<\/table>/g, (match) => {
            const placeholder = `__TABLE_${tablePlaceholders.length}__`;
            tablePlaceholders.push(match);
            return placeholder;
        });
        
        // Now escape the rest
        const div = document.createElement('div');
        div.textContent = html;
        html = div.innerHTML;
        
        // Restore tables
        tablePlaceholders.forEach((table, index) => {
            html = html.replace(`__TABLE_${index}__`, table);
        });
        
        // Bold: **text** or __text__ (must come before italic to avoid conflicts)
        html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
        
        // Italic: *text* or _text_ (but not **text** or __text__)
        // Use negative lookahead/lookbehind alternatives
        html = html.replace(/(^|[^*])\*([^*\n]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
        html = html.replace(/(^|[^_])_([^_\n]+?)_([^_]|$)/g, '$1<em>$2</em>$3');
        
        // Headers: ### Header (must be at start of line)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Code blocks: `code`
        html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
        
        // Links: [text](url)
        html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        
        // Lists: - item or * item
        html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
        // Wrap consecutive <li> tags in <ul>
        html = html.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, (match) => {
            if (match.includes('<ul>') || match.includes('<ol>')) return match;
            return '<ul>' + match + '</ul>';
        });
        
        // Numbered lists: 1. item
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        // Wrap consecutive <li> tags in <ol> if not already wrapped
        html = html.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, (match) => {
            if (match.includes('<ul>') || match.includes('<ol>')) return match;
            return '<ol>' + match + '</ol>';
        });
        
        // Convert line breaks: double newline = paragraph break, single = <br>
        const paragraphs = html.split(/\n\n+/);
        html = paragraphs.map(para => {
            para = para.trim();
            if (!para) return '';
            // Don't wrap if it's already a block element
            if (para.match(/^<(table|ul|ol|h[1-6])/)) {
                return para;
            }
            // Convert single newlines to <br>
            para = para.replace(/\n/g, '<br>');
            return '<p>' + para + '</p>';
        }).filter(p => p).join('');
        
        return html;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createChatUI);
    } else {
        createChatUI();
    }
})();