# NEARCON AI Chat Assistant

[![NEAR AI](https://img.shields.io/badge/Powered%20by-NEAR%20AI-blue?style=flat-square)](https://cloud.near.ai)
[![TEE Verified](https://img.shields.io/badge/TEE-Verified-green?style=flat-square)](https://docs.near.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

An AI-powered chat assistant for **NEARCON 2026** that runs on NEAR AI Cloud with cryptographically verifiable responses using Trusted Execution Environments (TEE).

![NearBot Preview](https://img.shields.io/badge/NearBot-NEARCON%202026-0ea5e9?style=for-the-badge&logo=near&logoColor=white)

## ✨ Features

- 🤖 **AI-Powered Assistant** - Answers questions about NEARCON 2026 event details, logistics, and FAQs
- 🔒 **TEE Verified Responses** - All AI inferences run in Intel TDX + NVIDIA TEE environments
- ✅ **Cryptographic Verification** - Every response is signed and verifiable via ECDSA signatures
- 📡 **Real-time Streaming** - Server-Sent Events (SSE) for instant, streaming AI responses
- 💬 **Beautiful UI** - Modern sidebar chat widget with markdown rendering
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NEARCON.org Website                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Userscript (nearcon-chat.user.js)                   │   │
│  │  • Floating chat sidebar                                         │   │
│  │  • Message rendering with markdown                               │   │
│  │  • TEE verification badges                                       │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ SSE / REST API
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Backend Server (Express.js)                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Chat endpoint with streaming                                  │   │
│  │  • Attestation caching (24h TTL)                                │   │
│  │  • Signature verification                                        │   │
│  │  • Event context injection                                       │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEAR AI Cloud (TEE Environment)                      │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│  │   Intel TDX CVM   │  │   NVIDIA H200 GPU │  │  Private-ML-SDK   │   │
│  │   (CPU Security)  │  │   (GPU Security)  │  │  (Attestation)    │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
nearcon_ai/
├── backend/
│   ├── server.js          # Express server with SSE streaming
│   ├── nearai-client.js   # NEAR AI Cloud SDK client
│   ├── event-context.js   # NEARCON 2026 event data & system prompts
│   ├── package.json       # Node.js dependencies
│   └── .env.example       # Environment variables template
├── userscript/
│   └── nearcon-chat.user.js  # Tampermonkey/Greasemonkey userscript
├── docs/
│   └── system_prompt.md   # AI assistant system prompt documentation
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **NEAR AI API Key** - Get one at [cloud.near.ai](https://cloud.near.ai)
- **Tampermonkey** or **Greasemonkey** browser extension (for the chat widget)

### Backend Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/nearcon-ai.git
   cd nearcon-ai/backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the `backend` directory:

   ```env
   NEAR_AI_API_KEY=your-api-key-here
   PORT=3000
   ```

4. **Start the server**

   ```bash
   npm start
   ```

   The server will start at `http://localhost:3000`

### Userscript Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge) or [Greasemonkey](https://www.greasespot.net/) (Firefox)

2. Create a new userscript and paste the contents of `userscript/nearcon-chat.user.js`

3. Visit [nearcon.org](https://nearcon.org) - the chat sidebar will appear on the right side

## 📡 API Reference

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-11T12:00:00.000Z"
}
```

### Chat Completion

```http
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "When is NEARCON 2026?" }
  ],
  "model": "gpt-oss-120b",
  "stream": true
}
```

**Response (SSE stream):**
```
event: connected
data: {"status": "connected"}

data: {"type": "chunk", "content": "NEARCON", "timestamp": "..."}
data: {"type": "chunk", "content": " 2026", "timestamp": "..."}
data: {"type": "complete", "chatId": "...", "response": {...}}

event: end
data: [DONE]
```

### Get Model Attestation

```http
GET /api/attestation/:model
```

**Response:**
```json
{
  "signing_address": "0x...",
  "nvidia_payload": "...",
  "intel_quote": "..."
}
```

### Verify Chat Inference

```http
GET /api/verify/:chatId?model=...&requestBody=...&responseBody=...
```

**Response:**
```json
{
  "verified": true,
  "attestation": {...},
  "signature": "0x...",
  "details": {
    "signingAddress": "0x...",
    "recoveredAddress": "0x...",
    "messageHash": "..."
  }
}
```

## 🔐 TEE Verification

Every AI response is cryptographically verified through a multi-layer security chain:

1. **Hardware Root of Trust** - NVIDIA and Intel hardware attestation
2. **TEE Attestation** - Proves secure execution environment
3. **ECDSA Signature** - Every response signed with TEE private key
4. **On-chain Verification** - Signatures verifiable via Ethereum-compatible tools

The chat widget displays verification status for each AI response:

| Badge | Meaning |
|-------|---------|
| 🟢 TEE Verified | Response verified via GPU + CPU attestation |
| 🟡 Pending | Verification in progress |
| 🔴 Failed | Verification failed (potential tampering) |

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Backend Runtime | Node.js 18+ |
| Web Framework | Express.js |
| AI Platform | NEAR AI Cloud |
| LLM Model | gpt-oss-120b |
| Security | Intel TDX + NVIDIA TEE |
| Crypto | ethers.js (ECDSA verification) |
| Frontend | Vanilla JS + CSS (Userscript) |
| Streaming | Server-Sent Events (SSE) |

## 📋 Event Information

The assistant is pre-configured with NEARCON 2026 event details:

- **Event**: NEARCON 2026 - The Premier AI Industry Conference
- **Dates**: February 23-24, 2026
- **Location**: Fort Mason Center for Arts & Culture, San Francisco, CA
- **Website**: [nearcon.org](https://nearcon.org)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [NEAR AI Cloud Documentation](https://docs.near.ai)
- [NEAR AI Cloud Console](https://cloud.near.ai)
- [NEARCON 2026 Official Website](https://nearcon.org)
- [Intel TDX Overview](https://www.intel.com/content/www/us/en/developer/tools/trust-domain-extensions/overview.html)
- [NVIDIA Confidential Computing](https://www.nvidia.com/en-us/data-center/solutions/confidential-computing/)

---

<p align="center">
  Built with 💚 for <strong>NEARCON 2026</strong>
  <br>
  Powered by <a href="https://cloud.near.ai">NEAR AI Cloud</a> with TEE Verification
</p>
