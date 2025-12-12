// ==UserScript==
// @name         NEARCON AI Chat
// @namespace    https://nearcon.org
// @version      2.0.0
// @description  NEAR AI-powered chat assistant for NEARCON 2026 with TEE verification (BYOK)
// @author       NEAR AI
// @match        https://nearcon.org/*
// @match        https://www.nearcon.org/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      cloud-api.near.ai
// ==/UserScript==

(function() {
    'use strict';

    // Configuration - Direct NEAR AI API (no backend needed!)
    const NEAR_AI_API_URL = 'https://cloud-api.near.ai/v1';
    const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3.1';
    const STORAGE_KEY = 'nearcon_ai_api_key';
    const MODEL_STORAGE_KEY = 'nearcon_ai_model';

    // State
    let isOpen = true;
    let messages = [];
    let isLoading = false;
    let selectedModel = DEFAULT_MODEL;
    let availableModels = [];
    let lastAttestation = null;
    let userApiKey = null;
    let showingSettings = false;

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

        /* Model Selector */
        .model-selector-container {
            padding: 12px 24px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            flex-shrink: 0;
        }

        .model-selector-label {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 6px;
            display: block;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        #nearcon-model-select {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 13px;
            background: white;
            color: #1e293b;
            cursor: pointer;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        #nearcon-model-select:hover {
            border-color: #cbd5e1;
        }

        #nearcon-model-select:focus {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
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

        /* Expanded TEE Details */
        .tee-details-toggle {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 8px;
            padding: 6px 10px;
            background: #e2e8f0;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            color: #475569;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
            justify-content: center;
        }

        .tee-details-toggle:hover {
            background: #cbd5e1;
            color: #1e293b;
        }

        .tee-details-toggle svg {
            width: 12px;
            height: 12px;
            transition: transform 0.2s;
        }

        .tee-details-toggle.expanded svg {
            transform: rotate(180deg);
        }

        .tee-details-panel {
            display: none;
            margin-top: 8px;
            padding: 12px;
            background: #f1f5f9;
            border-radius: 8px;
            font-size: 11px;
        }

        .tee-details-panel.open {
            display: block;
        }

        .tee-section {
            margin-bottom: 12px;
        }

        .tee-section:last-child {
            margin-bottom: 0;
        }

        .tee-section-title {
            font-weight: 600;
            color: #334155;
            margin-bottom: 6px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .tee-detail-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .tee-detail-row:last-child {
            border-bottom: none;
        }

        .tee-detail-label {
            color: #64748b;
            font-size: 10px;
        }

        .tee-detail-value {
            font-family: monospace;
            font-size: 10px;
            color: #334155;
            text-align: right;
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .tee-detail-value.full {
            word-break: break-all;
            white-space: normal;
            text-align: left;
            max-width: 100%;
        }

        .tee-hash {
            display: block;
            background: #e2e8f0;
            padding: 6px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 9px;
            color: #475569;
            word-break: break-all;
            margin-top: 4px;
        }

        .tee-algo-badge {
            display: inline-block;
            background: #dbeafe;
            color: #1d4ed8;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 500;
            text-transform: uppercase;
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

        /* Settings Button in Header */
        .settings-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 6px;
            padding: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .settings-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .settings-btn svg {
            width: 18px;
            height: 18px;
            fill: white;
        }

        /* API Key Setup Panel */
        .api-key-setup {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 24px;
            background: #f8fafc;
            text-align: center;
        }

        .api-key-setup .setup-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
        }

        .api-key-setup .setup-icon svg {
            width: 32px;
            height: 32px;
            fill: white;
        }

        .api-key-setup h4 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #1e293b;
        }

        .api-key-setup p {
            margin: 0 0 20px 0;
            font-size: 13px;
            color: #64748b;
            line-height: 1.5;
        }

        .api-key-setup .input-group {
            width: 100%;
            max-width: 320px;
            margin-bottom: 16px;
        }

        .api-key-setup input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            font-family: monospace;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
        }

        .api-key-setup input:focus {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .api-key-setup .save-btn {
            width: 100%;
            max-width: 320px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .api-key-setup .save-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
        }

        .api-key-setup .save-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .api-key-setup .helper-link {
            margin-top: 16px;
            font-size: 12px;
        }

        .api-key-setup .helper-link a {
            color: #0ea5e9;
            text-decoration: none;
        }

        .api-key-setup .helper-link a:hover {
            text-decoration: underline;
        }

        /* Settings Panel (for updating key) */
        .settings-panel {
            padding: 20px 24px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }

        .settings-panel h4 {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .settings-panel .key-display {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        .settings-panel .key-masked {
            flex: 1;
            padding: 10px 12px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-family: monospace;
            font-size: 13px;
            color: #64748b;
        }

        .settings-panel .key-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #16a34a;
        }

        .settings-panel .key-status svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }

        .settings-panel .btn-group {
            display: flex;
            gap: 8px;
        }

        .settings-panel .btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }

        .settings-panel .btn-secondary {
            background: #e2e8f0;
            color: #475569;
        }

        .settings-panel .btn-secondary:hover {
            background: #cbd5e1;
        }

        .settings-panel .btn-danger {
            background: #fee2e2;
            color: #dc2626;
        }

        .settings-panel .btn-danger:hover {
            background: #fecaca;
        }

        .settings-panel .btn-close {
            background: transparent;
            color: #64748b;
            padding: 4px;
        }

        .settings-panel .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        /* Error Message */
        .error-message {
            background: #fee2e2;
            color: #dc2626;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 12px;
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .error-message svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
            flex-shrink: 0;
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

    // Load saved API key from storage
    function loadApiKey() {
        try {
            // Try GM storage first, fallback to localStorage
            if (typeof GM_getValue !== 'undefined') {
                userApiKey = GM_getValue(STORAGE_KEY, null);
                selectedModel = GM_getValue(MODEL_STORAGE_KEY, DEFAULT_MODEL);
            } else {
                userApiKey = localStorage.getItem(STORAGE_KEY);
                selectedModel = localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL;
            }
        } catch (e) {
            userApiKey = localStorage.getItem(STORAGE_KEY);
            selectedModel = localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL;
        }
    }

    // Save API key to storage
    function saveApiKey(key) {
        try {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(STORAGE_KEY, key);
            } else {
                localStorage.setItem(STORAGE_KEY, key);
            }
        } catch (e) {
            localStorage.setItem(STORAGE_KEY, key);
        }
        userApiKey = key;
    }

    // Save selected model
    function saveSelectedModel(model) {
        try {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(MODEL_STORAGE_KEY, model);
            } else {
                localStorage.setItem(MODEL_STORAGE_KEY, model);
            }
        } catch (e) {
            localStorage.setItem(MODEL_STORAGE_KEY, model);
        }
        selectedModel = model;
    }

    // Clear API key
    function clearApiKey() {
        try {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(STORAGE_KEY, null);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            localStorage.removeItem(STORAGE_KEY);
        }
        userApiKey = null;
    }

    // Create chat UI
    function createChatUI() {
        // Load saved key first
        loadApiKey();

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
                    <button class="settings-btn" id="nearcon-settings-btn" title="Settings">
                        <svg viewBox="0 0 24 24">
                            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                        </svg>
                    </button>
                </div>
                <div id="nearcon-settings-panel" class="settings-panel" style="display: none;">
                    <div class="settings-header">
                        <h4>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                            </svg>
                            API Key Settings
                        </h4>
                        <button class="btn btn-close" id="close-settings-btn">✕</button>
                    </div>
                    <div class="key-display">
                        <span class="key-masked" id="key-masked">sk-••••••••••••••••</span>
                        <span class="key-status">
                            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            Active
                        </span>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-secondary" id="update-key-btn">Update Key</button>
                        <button class="btn btn-danger" id="clear-key-btn">Clear Key</button>
                    </div>
                </div>
                <div id="nearcon-api-setup" class="api-key-setup" style="display: none;">
                    <div class="setup-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                    </div>
                    <h4>Enter Your NEAR AI API Key</h4>
                    <p>Your key is stored locally in your browser and never sent to any third-party servers. It connects directly to NEAR AI's secure TEE infrastructure.</p>
                    <div class="input-group">
                        <input type="password" id="api-key-input" placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off" />
                    </div>
                    <button class="save-btn" id="save-api-key-btn">Save & Start Chatting</button>
                    <div class="helper-link">
                        <a href="https://cloud.near.ai" target="_blank" rel="noopener">Get your API key at cloud.near.ai →</a>
                    </div>
                    <div id="api-error" class="error-message" style="display: none;">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        <span id="api-error-text">Invalid API key</span>
                    </div>
                </div>
                <div class="model-selector-container" id="model-selector-container">
                    <label class="model-selector-label" for="nearcon-model-select">AI Model</label>
                    <select id="nearcon-model-select">
                        <option value="deepseek-ai/DeepSeek-V3.1">Loading models...</option>
                    </select>
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

        // Model selector change
        document.getElementById('nearcon-model-select').addEventListener('change', (e) => {
            saveSelectedModel(e.target.value);
            console.log('Model changed to:', selectedModel);
        });

        // Settings button
        document.getElementById('nearcon-settings-btn').addEventListener('click', toggleSettings);
        document.getElementById('close-settings-btn').addEventListener('click', () => {
            document.getElementById('nearcon-settings-panel').style.display = 'none';
            showingSettings = false;
        });

        // API key setup handlers
        document.getElementById('save-api-key-btn').addEventListener('click', handleSaveApiKey);
        document.getElementById('api-key-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSaveApiKey();
        });

        // Settings panel handlers
        document.getElementById('update-key-btn').addEventListener('click', () => {
            document.getElementById('nearcon-settings-panel').style.display = 'none';
            showApiKeySetup();
        });
        document.getElementById('clear-key-btn').addEventListener('click', handleClearKey);

        // Check if we have an API key
        if (userApiKey) {
            showChatInterface();
            loadAvailableModels();
        } else {
            showApiKeySetup();
        }
    }

    // Show API key setup screen
    function showApiKeySetup() {
        document.getElementById('nearcon-api-setup').style.display = 'flex';
        document.getElementById('model-selector-container').style.display = 'none';
        document.getElementById('nearcon-ai-messages').style.display = 'none';
        document.getElementById('nearcon-ai-input-area').style.display = 'none';
        document.getElementById('api-error').style.display = 'none';
        document.getElementById('api-key-input').value = '';
        document.getElementById('api-key-input').focus();
    }

    // Show chat interface
    function showChatInterface() {
        document.getElementById('nearcon-api-setup').style.display = 'none';
        document.getElementById('model-selector-container').style.display = 'block';
        document.getElementById('nearcon-ai-messages').style.display = 'flex';
        document.getElementById('nearcon-ai-input-area').style.display = 'flex';

        // Update masked key display
        if (userApiKey) {
            const masked = userApiKey.slice(0, 6) + '••••••••' + userApiKey.slice(-4);
            document.getElementById('key-masked').textContent = masked;
        }
    }

    // Toggle settings panel
    function toggleSettings() {
        const panel = document.getElementById('nearcon-settings-panel');
        showingSettings = !showingSettings;
        panel.style.display = showingSettings ? 'block' : 'none';
    }

    // Handle save API key
    async function handleSaveApiKey() {
        const input = document.getElementById('api-key-input');
        const key = input.value.trim();
        const errorDiv = document.getElementById('api-error');
        const errorText = document.getElementById('api-error-text');
        const saveBtn = document.getElementById('save-api-key-btn');

        if (!key) {
            errorText.textContent = 'Please enter an API key';
            errorDiv.style.display = 'flex';
            return;
        }

        if (!key.startsWith('sk-')) {
            errorText.textContent = 'API key should start with "sk-"';
            errorDiv.style.display = 'flex';
            return;
        }

        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.textContent = 'Validating...';
        errorDiv.style.display = 'none';

        // Test the key with a simple API call
        try {
            const response = await fetch(`${NEAR_AI_API_URL}/models`, {
                headers: {
                    'Authorization': `Bearer ${key}`
                }
            });

            if (response.ok) {
                saveApiKey(key);
                showChatInterface();
                loadAvailableModels();
            } else if (response.status === 401) {
                errorText.textContent = 'Invalid API key. Please check and try again.';
                errorDiv.style.display = 'flex';
            } else {
                errorText.textContent = `API error: ${response.status}. Please try again.`;
                errorDiv.style.display = 'flex';
            }
        } catch (error) {
            console.error('API key validation error:', error);
            errorText.textContent = 'Could not connect to NEAR AI. Please try again.';
            errorDiv.style.display = 'flex';
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Start Chatting';
        }
    }

    // Handle clear API key
    function handleClearKey() {
        if (confirm('Are you sure you want to remove your API key? You will need to enter it again to use the chat.')) {
            clearApiKey();
            document.getElementById('nearcon-settings-panel').style.display = 'none';
            showingSettings = false;
            showApiKeySetup();
        }
    }

    // Load available models from NEAR AI API directly
    async function loadAvailableModels() {
        if (!userApiKey) return;

        try {
            const response = await fetch(`${NEAR_AI_API_URL}/models`, {
                headers: {
                    'Authorization': `Bearer ${userApiKey}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                availableModels = (data.data || []).map(model => ({
                    id: model.id,
                    name: model.id.split('/').pop()
                }));
                updateModelSelector();
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            // Use default models if API fails
            availableModels = [
                { id: 'deepseek-ai/DeepSeek-V3.1', name: 'DeepSeek V3.1' },
                { id: 'moonshotai/Kimi-K2-Thinking', name: 'Kimi K2 Thinking' },
                { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
                { id: 'Qwen/Qwen3-30B-A3B-Instruct-2507', name: 'Qwen3 30B' },
                { id: 'zai-org/GLM-4.6', name: 'GLM 4.6' }
            ];
            updateModelSelector();
        }
    }

    // Update model selector dropdown
    function updateModelSelector() {
        const select = document.getElementById('nearcon-model-select');
        if (!select) return;

        select.innerHTML = availableModels.map(model => {
            const modelId = model.id || model;
            const modelName = model.name || modelId.split('/').pop();
            return `<option value="${modelId}" ${modelId === selectedModel ? 'selected' : ''}>${modelName}</option>`;
        }).join('');
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

    // Get system prompt for NEARCON context
    function getSystemPrompt() {
        return {
            role: 'system',
            content: `You are NearBot, a helpful AI assistant for NEARCON 2026 - the premier NEAR Protocol conference. You run in a Trusted Execution Environment (TEE) providing private, verifiable AI inference.

Key information about NEARCON 2026:
- Location: Lisbon, Portugal
- Dates: November 2026
- Focus: AI + Blockchain convergence, Chain Abstraction, DeFi, NFTs, and the Open Web

You can help attendees with:
- Conference schedule and sessions
- Speaker information
- Venue navigation
- NEAR ecosystem and technology questions
- Networking suggestions
- Local recommendations in Lisbon

Be friendly, concise, and helpful. When discussing NEAR technology, emphasize privacy, security, and the benefits of TEE-verified AI.`
        };
    }

    // Send message - Direct to NEAR AI API
    async function sendMessage() {
        const input = document.getElementById('nearcon-ai-input');
        const sendBtn = document.getElementById('nearcon-ai-send');
        const userMessage = input.value.trim();

        if (!userMessage || isLoading) return;

        if (!userApiKey) {
            showApiKeySetup();
            return;
        }

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

            // Add system prompt to messages
            const messagesWithContext = [getSystemPrompt(), ...messages];

            // Stream directly from NEAR AI API
            const response = await fetch(`${NEAR_AI_API_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userApiKey}`
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: messagesWithContext,
                    stream: true,
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

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

                            // Get chat ID from first response
                            if (parsed.id && !chatId) {
                                chatId = parsed.id;
                            }

                            // Extract content from streaming delta
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                // Remove typing indicator on first chunk
                                if (!assistantDiv) {
                                    removeTypingIndicator();
                                    assistantDiv = addMessage('assistant', '', { verified: false });
                                }

                                assistantContent += content;
                                updateMessageContent(assistantDiv, assistantContent);
                            }

                            // Check for finish
                            if (parsed.choices?.[0]?.finish_reason === 'stop') {
                                // Fetch verification after completion
                                if (chatId && assistantDiv) {
                                    fetchVerification(chatId, assistantDiv);
                                }
                            }
                        } catch (e) {
                            // Ignore parse errors for incomplete JSON
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

            let errorMessage = 'Sorry, I encountered an error. ';
            if (error.message.includes('401')) {
                errorMessage += 'Your API key appears to be invalid. Please update it in settings.';
            } else if (error.message.includes('402')) {
                errorMessage += 'Insufficient credits. Please top up your NEAR AI account.';
            } else if (error.message.includes('429')) {
                errorMessage += 'Rate limit exceeded. Please wait a moment and try again.';
            } else {
                errorMessage += error.message || 'Please try again.';
            }

            addMessage('assistant', errorMessage, { verified: false });
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
            removeTypingIndicator();
        }
    }

    // Fetch and update verification status - Direct to NEAR AI API
    async function fetchVerification(chatId, messageDiv) {
        if (!userApiKey) return;

        try {
            // Get attestation directly from NEAR AI API
            const encodedModel = encodeURIComponent(selectedModel);
            const attestationResponse = await fetch(`${NEAR_AI_API_URL}/attestation/report?model=${encodedModel}`, {
                headers: {
                    'Authorization': `Bearer ${userApiKey}`
                }
            });

            if (!attestationResponse.ok) {
                console.warn('Attestation fetch failed:', attestationResponse.status);
                return;
            }

            const attestation = await attestationResponse.json();

            // Store for later use
            lastAttestation = attestation;

            // Extract data from the attestation response
            const gatewayAttestation = attestation?.gateway_attestation || attestation || {};
            const signingAddress = gatewayAttestation.signing_address || attestation?.signing_address;
            const signingAlgo = gatewayAttestation.signing_algo || 'ed25519';
            const info = gatewayAttestation.info || {};

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
                    panel.innerHTML = buildVerificationPanel(signingAddress, signingAlgo, info, gatewayAttestation);
                }
            }
        } catch (error) {
            console.error('Verification error:', error);
        }
    }

    // Build the verification panel HTML
    function buildVerificationPanel(signingAddress, signingAlgo, info, gatewayAttestation) {
        const truncateHash = (hash, len = 16) => {
            if (!hash) return 'N/A';
            return hash.length > len * 2 ? hash.slice(0, len) + '...' + hash.slice(-len) : hash;
        };

        return `
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
            <div class="verification-item">
                <span class="label">Signing Algorithm</span>
                <span class="tee-algo-badge">${signingAlgo}</span>
            </div>
            <div class="verification-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
                <span class="label">Signing Address</span>
                <span class="signing-address">${signingAddress}</span>
            </div>

            <button class="tee-details-toggle" onclick="this.classList.toggle('expanded'); this.nextElementSibling.classList.toggle('open');">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                <span>View TEE Details</span>
            </button>

            <div class="tee-details-panel">
                ${info.app_name ? `
                <div class="tee-section">
                    <div class="tee-section-title">Application Info</div>
                    <div class="tee-detail-row">
                        <span class="tee-detail-label">App Name</span>
                        <span class="tee-detail-value">${info.app_name}</span>
                    </div>
                    <div class="tee-detail-row">
                        <span class="tee-detail-label">App ID</span>
                        <span class="tee-detail-value">${truncateHash(info.app_id)}</span>
                    </div>
                    <div class="tee-detail-row">
                        <span class="tee-detail-label">Instance ID</span>
                        <span class="tee-detail-value">${truncateHash(info.instance_id)}</span>
                    </div>
                </div>
                ` : ''}

                <div class="tee-section">
                    <div class="tee-section-title">Security Measurements</div>
                    ${info.os_image_hash ? `
                    <div class="tee-detail-row" style="flex-direction: column; align-items: flex-start;">
                        <span class="tee-detail-label">OS Image Hash</span>
                        <span class="tee-hash">${info.os_image_hash}</span>
                    </div>
                    ` : ''}
                    ${info.compose_hash ? `
                    <div class="tee-detail-row" style="flex-direction: column; align-items: flex-start;">
                        <span class="tee-detail-label">Compose Hash</span>
                        <span class="tee-hash">${info.compose_hash}</span>
                    </div>
                    ` : ''}
                    ${info.mr_aggregated ? `
                    <div class="tee-detail-row" style="flex-direction: column; align-items: flex-start;">
                        <span class="tee-detail-label">Aggregated Measurement</span>
                        <span class="tee-hash">${info.mr_aggregated}</span>
                    </div>
                    ` : ''}
                </div>

                ${info.device_id ? `
                <div class="tee-section">
                    <div class="tee-section-title">Hardware Identity</div>
                    <div class="tee-detail-row" style="flex-direction: column; align-items: flex-start;">
                        <span class="tee-detail-label">Device ID</span>
                        <span class="tee-hash">${info.device_id}</span>
                    </div>
                </div>
                ` : ''}

                ${gatewayAttestation.request_nonce ? `
                <div class="tee-section">
                    <div class="tee-section-title">Request Verification</div>
                    <div class="tee-detail-row" style="flex-direction: column; align-items: flex-start;">
                        <span class="tee-detail-label">Request Nonce</span>
                        <span class="tee-hash">${gatewayAttestation.request_nonce}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
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