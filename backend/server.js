require('dotenv').config();
const express = require('express');
const cors = require('cors');
const contextLoader = require('./context-loader');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS configuration for nearcon.org and local development
const corsOptions = {
  origin: ['https://nearcon.org', 'https://www.nearcon.org', 'http://localhost:3000', 'http://localhost:5500'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    lastDataUpdate: contextLoader.getLastUpdated()?.toISOString() || null
  });
});

// Get server status and metadata
app.get('/api/status', (req, res) => {
  const lastUpdated = contextLoader.getLastUpdated();
  const eventInfo = contextLoader.getEventInfo();

  res.json({
    status: 'ok',
    lastUpdated: lastUpdated?.toISOString() || null,
    lastUpdatedUnix: lastUpdated?.getTime() || null,
    event: eventInfo,
    version: '2.0.0'
  });
});

// Get context for AI chat (system prompt + event context + FAQs)
app.get('/api/context', (req, res) => {
  try {
    const context = contextLoader.getContext();
    const lastUpdated = contextLoader.getLastUpdated();
    const eventInfo = contextLoader.getEventInfo();

    res.json({
      context,
      systemMessage: contextLoader.getSystemMessage(),
      lastUpdated: lastUpdated?.toISOString() || null,
      lastUpdatedUnix: lastUpdated?.getTime() || null,
      event: eventInfo
    });
  } catch (error) {
    console.error('Context error:', error);
    res.status(500).json({ error: 'Failed to get context', details: error.message });
  }
});

// Get raw data (for debugging or advanced use)
app.get('/api/context/raw', (req, res) => {
  try {
    const rawData = contextLoader.getRawData();
    const lastUpdated = contextLoader.getLastUpdated();

    res.json({
      ...rawData,
      lastUpdated: lastUpdated?.toISOString() || null
    });
  } catch (error) {
    console.error('Raw context error:', error);
    res.status(500).json({ error: 'Failed to get raw context', details: error.message });
  }
});

// Reload context data (useful for hot reloading during development)
app.post('/api/context/reload', (req, res) => {
  try {
    const success = contextLoader.reload();
    const lastUpdated = contextLoader.getLastUpdated();

    if (success) {
      res.json({
        status: 'ok',
        message: 'Context reloaded successfully',
        lastUpdated: lastUpdated?.toISOString() || null
      });
    } else {
      res.status(500).json({ error: 'Failed to reload context' });
    }
  } catch (error) {
    console.error('Reload error:', error);
    res.status(500).json({ error: 'Failed to reload context', details: error.message });
  }
});

// Get FAQs only
app.get('/api/faqs', (req, res) => {
  try {
    const { faqs } = contextLoader.getRawData();
    const lastUpdated = contextLoader.getLastUpdated();

    res.json({
      faqs,
      lastUpdated: lastUpdated?.toISOString() || null
    });
  } catch (error) {
    console.error('FAQs error:', error);
    res.status(500).json({ error: 'Failed to get FAQs', details: error.message });
  }
});

// Get event info only
app.get('/api/event', (req, res) => {
  try {
    const eventInfo = contextLoader.getEventInfo();
    const { eventContext } = contextLoader.getRawData();
    const lastUpdated = contextLoader.getLastUpdated();

    res.json({
      ...eventInfo,
      details: eventContext,
      lastUpdated: lastUpdated?.toISOString() || null
    });
  } catch (error) {
    console.error('Event info error:', error);
    res.status(500).json({ error: 'Failed to get event info', details: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 NEARCON AI Context Server running on port ${port}`);
  console.log(`📡 Accepting connections from: ${corsOptions.origin.join(', ')}`);
  console.log(`📄 Context loaded at: ${contextLoader.getLastUpdated()?.toISOString() || 'Not loaded'}`);
  console.log(`📋 Event: ${contextLoader.getEventInfo().name} - ${contextLoader.getEventInfo().dates}`);
});

module.exports = app;
