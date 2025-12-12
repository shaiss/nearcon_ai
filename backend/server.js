require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { NearAIClient } = require('./nearai-client');
const { getSystemPrompt } = require('./event-context');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS configuration for nearcon.org
const corsOptions = {
  origin: ['https://nearcon.org', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Initialize NEAR AI client
const apiKey = process.env.NEAR_AI_API_KEY;
if (!apiKey) {
  console.error('NEAR_AI_API_KEY environment variable is required');
  process.exit(1);
}

const nearAIClient = new NearAIClient(apiKey);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get cached attestation for a model
app.get('/api/attestation/:model', async (req, res) => {
  try {
    const { model } = req.params;
    const attestation = await nearAIClient.getCachedAttestation(model);
    res.json(attestation);
  } catch (error) {
    console.error('Attestation error:', error);
    res.status(500).json({ error: 'Failed to get attestation', details: error.message });
  }
});

// Verify a chat inference
app.get('/api/verify/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { model, requestBody, responseBody } = req.query;

    if (!model || !requestBody || !responseBody) {
      return res.status(400).json({
        error: 'Missing required parameters: model, requestBody, responseBody'
      });
    }

    // Parse request body if it's a string
    let parsedRequestBody;
    let parsedResponseBody;

    try {
      parsedRequestBody = typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody;
      parsedResponseBody = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON in requestBody or responseBody' });
    }

    const verification = await nearAIClient.verifyInference(
      chatId,
      model,
      parsedRequestBody,
      parsedResponseBody
    );

    res.json(verification);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

// Chat endpoint with streaming SSE
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-oss-120b', stream = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Add system prompt for NEARCON context
    const systemPrompt = getSystemPrompt();
    const messagesWithContext = [systemPrompt, ...messages];

    if (stream) {
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': 'https://nearcon.org',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection event
      res.write('event: connected\n');
      res.write('data: {"status": "connected"}\n\n');

      let fullResponse = '';
      let chatId = null;

      try {
        // Use streaming generator
        const streamGenerator = nearAIClient.streamChat(messagesWithContext, model);

        for await (const chunk of streamGenerator) {
          fullResponse += chunk;

          // Send chunk to client
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: chunk,
            timestamp: new Date().toISOString()
          })}\n\n`);
        }

        // Make a non-streaming request to get the complete response with chat ID
        const completeResponse = await nearAIClient.chat(messagesWithContext, model, { stream: false });
        chatId = completeResponse.id;

        // Send completion event with full response
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          chatId: chatId,
          response: completeResponse,
          timestamp: new Date().toISOString()
        })}\n\n`);

      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'Streaming failed',
          details: streamError.message
        })}\n\n`);
      } finally {
        res.write('event: end\n');
        res.write('data: [DONE]\n\n');
        res.end();
      }

    } else {
      // Non-streaming response
      const response = await nearAIClient.chat(messagesWithContext, model, { stream: false });

      res.json({
        chatId: response.id,
        response,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat request failed',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 NEARCON AI Backend running on port ${port}`);
  console.log(`📡 Accepting connections from: ${corsOptions.origin.join(', ')}`);
  console.log(`🔐 NEAR AI API Key configured: ${apiKey ? 'Yes' : 'No'}`);
});

module.exports = app;