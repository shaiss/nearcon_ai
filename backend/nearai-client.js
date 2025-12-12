const crypto = require('crypto');
const { ethers } = require('ethers');

// Error types from rules
class NearAIError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'NearAIError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const ERROR_CODES = {
  INVALID_API_KEY: 'invalid_api_key',
  INSUFFICIENT_CREDITS: 'insufficient_credits',
  MODEL_NOT_AVAILABLE: 'model_not_available',
  RATE_LIMITED: 'rate_limited',
  VERIFICATION_FAILED: 'verification_failed'
};

// Cache for attestations (24h TTL)
const ATTESTATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const attestationCache = new Map();

class NearAIClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://cloud-api.near.ai/v1';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    let lastError;
    for (let i = 0; i <= this.retries; i++) {
      try {
        const response = await fetch(url, config);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        if (i < this.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  }

  async chat(messages, model = 'gpt-oss-120b', options = {}) {
    return await this.makeRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: options.stream || false
      })
    });
  }

  // Streaming chat completion generator
  async* streamChat(messages, model = 'gpt-oss-120b', options = {}) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                yield parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Ignore malformed JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async getAttestation(model) {
    return await this.makeRequest(`/attestation/report?model=${encodeURIComponent(model)}`);
  }

  // Get available models
  async getModels() {
    const response = await this.makeRequest('/models');
    // Transform the response to a consistent format
    if (response.data && Array.isArray(response.data)) {
      return response.data.map(model => ({
        id: model.id,
        name: model.id.split('/').pop(),
        owned_by: model.owned_by
      }));
    }
    return [];
  }

  async getSignature(chatId, model) {
    return await this.makeRequest(`/signature/${chatId}?model=${model}&signing_algo=ecdsa`);
  }

  // Cached attestation getter
  async getCachedAttestation(model) {
    const cacheKey = `attestation_${model}`;
    const cached = attestationCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ATTESTATION_CACHE_TTL) {
      return cached.data;
    }

    const attestation = await this.getAttestation(model);
    attestationCache.set(cacheKey, { data: attestation, timestamp: Date.now() });

    return attestation;
  }

  // Complete verification workflow
  async verifyInference(chatId, model, requestBody, responseBody) {
    try {
      // 1. Get signature for chat
      const sigResponse = await this.getSignature(chatId, model);
      const { signature, signing_address, text } = sigResponse;

      // 2. Generate message hash
      const requestHash = crypto.createHash('sha256').update(JSON.stringify(requestBody)).digest('hex');
      const responseHash = crypto.createHash('sha256').update(responseBody).digest('hex');
      const expectedMessage = `${requestHash}:${responseHash}`;

      // 3. Verify message matches signature
      if (text !== expectedMessage) {
        throw new Error('Message hash mismatch');
      }

      // 4. Verify ECDSA signature
      const recoveredAddress = ethers.verifyMessage(text, signature);
      if (recoveredAddress.toLowerCase() !== signing_address.toLowerCase()) {
        throw new Error('Signature verification failed');
      }

      // 5. Verify attestation (cached for performance)
      const attestation = await this.getCachedAttestation(model);
      if (signing_address !== attestation.signing_address) {
        throw new Error('Signing address not in attestation');
      }

      return {
        verified: true,
        attestation,
        signature,
        details: {
          signingAddress: signing_address,
          recoveredAddress,
          messageHash: text
        }
      };
    } catch (error) {
      return {
        verified: false,
        error: error.message,
        details: null
      };
    }
  }

  // Handle errors and convert to NearAIError
  handleError(error) {
    if (error.message.includes('401')) {
      throw new NearAIError('Invalid API key', ERROR_CODES.INVALID_API_KEY, 401);
    }

    if (error.message.includes('402')) {
      throw new NearAIError('Insufficient credits', ERROR_CODES.INSUFFICIENT_CREDITS, 402);
    }

    if (error.message.includes('404')) {
      throw new NearAIError('Model not available', ERROR_CODES.MODEL_NOT_AVAILABLE, 404);
    }

    if (error.message.includes('429')) {
      throw new NearAIError('Rate limited', ERROR_CODES.RATE_LIMITED, 429);
    }

    if (error.message.includes('verification failed')) {
      throw new NearAIError('Verification failed', ERROR_CODES.VERIFICATION_FAILED, 500);
    }

    // Network or other errors
    throw new NearAIError(`Request failed: ${error.message}`, 'network_error', 0);
  }
}

module.exports = {
  NearAIClient,
  NearAIError,
  ERROR_CODES
};