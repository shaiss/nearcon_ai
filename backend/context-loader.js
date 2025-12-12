const fs = require('fs');
const path = require('path');

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const SYSTEM_PROMPT_PATH = path.join(DATA_DIR, 'system-prompt.md');
const EVENT_CONTEXT_PATH = path.join(DATA_DIR, 'event-context.json');
const FAQS_PATH = path.join(DATA_DIR, 'faqs.json');

// Cached data
let systemPrompt = '';
let eventContext = {};
let faqs = {};
let lastLoaded = null;

/**
 * Load all data files and cache them
 */
function load() {
  try {
    // Load system prompt
    systemPrompt = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');

    // Load event context
    const eventContextRaw = fs.readFileSync(EVENT_CONTEXT_PATH, 'utf-8');
    eventContext = JSON.parse(eventContextRaw);

    // Load FAQs
    const faqsRaw = fs.readFileSync(FAQS_PATH, 'utf-8');
    faqs = JSON.parse(faqsRaw);

    // Update timestamp
    lastLoaded = new Date();

    console.log(`[ContextLoader] Data loaded at ${lastLoaded.toISOString()}`);
    return true;
  } catch (error) {
    console.error('[ContextLoader] Error loading data files:', error.message);
    return false;
  }
}

/**
 * Format event context as readable text
 */
function formatEventContext(ctx) {
  const lines = [];

  // Event details
  lines.push('## EVENT DETAILS');
  lines.push(`- **Event Name**: ${ctx.event.name}`);
  lines.push(`- **Tagline**: ${ctx.event.tagline}`);
  lines.push(`- **Dates**: ${ctx.event.dates}`);
  lines.push(`- **Theme**: ${ctx.event.theme}`);
  lines.push('');

  // Venue
  lines.push('## VENUE INFORMATION');
  lines.push(`- **Venue**: ${ctx.venue.name}`);
  lines.push(`- **Location**: ${ctx.venue.city}, ${ctx.venue.state}, ${ctx.venue.country}`);
  lines.push(`- **ADA Compliant**: ${ctx.venue.adaCompliant ? 'Yes' : 'No'}`);
  lines.push(`- **Accessibility**: ${ctx.venue.accessibility}`);
  lines.push('');

  // Registration
  lines.push('## REGISTRATION & ATTENDANCE');
  lines.push(`- **Platform**: ${ctx.registration.platform}`);
  lines.push(`- **Website**: ${ctx.registration.url}`);
  lines.push(`- **Confirmation**: ${ctx.registration.confirmation}`);
  lines.push(`- **Includes**: ${ctx.registration.includes}`);
  lines.push(`- **Badge Pickup**: ${ctx.registration.badgePickup}`);
  lines.push('');

  // Policies
  lines.push('## POLICIES');
  lines.push(`- **Dress Code**: ${ctx.policies.dressCode.description}`);
  lines.push(`- **Personal Photography**: ${ctx.policies.photography.personal}`);
  lines.push(`- **Professional Video**: ${ctx.policies.photography.professional}`);
  lines.push(`- **Photo/Video Release**: ${ctx.policies.photography.release}`);
  lines.push(`- **Bag Policy**: ${ctx.policies.bags}`);
  lines.push('');

  // Logistics
  lines.push('## LOGISTICS');
  lines.push(`- **WiFi**: ${ctx.logistics.wifi}`);
  lines.push(`- **Security**: ${ctx.logistics.security}`);
  lines.push(`- **Safety**: ${ctx.logistics.safety}`);
  lines.push('');

  // Press
  lines.push('## PRESS & MEDIA');
  lines.push(`- **Press Credentials**: ${ctx.press.credentials}`);
  lines.push(`- **Approval**: ${ctx.press.approval}`);
  lines.push('');

  // Contact
  lines.push('## CONTACT');
  lines.push(`- **Website**: ${ctx.contact.website}`);
  lines.push(`- **Contact Page**: ${ctx.contact.contactPage}`);
  lines.push('');

  // Agenda
  lines.push('## AGENDA & SPEAKERS');
  lines.push(`- **Status**: ${ctx.agenda.status === 'coming_soon' ? 'Coming Soon' : 'Available'}`);
  lines.push(`- **Note**: ${ctx.agenda.note}`);

  return lines.join('\n');
}

/**
 * Format FAQs as readable Q&A sections
 */
function formatFAQs(faqData) {
  const lines = ['## FREQUENTLY ASKED QUESTIONS'];
  lines.push('');

  const categoryLabels = {
    attendance: 'Attendance & Registration',
    general: 'General Information',
    participation: 'Participation & Privacy',
    press: 'Press & Media',
    safety: 'Safety & Security'
  };

  for (const [category, questions] of Object.entries(faqData)) {
    const label = categoryLabels[category] || category;
    lines.push(`### ${label}`);
    lines.push('');

    for (const faq of questions) {
      lines.push(`**Q: ${faq.question}**`);
      lines.push(`A: ${faq.answer}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Get the combined context string for the AI
 */
function getContext() {
  if (!lastLoaded) {
    load();
  }

  const contextParts = [
    systemPrompt,
    '',
    '---',
    '',
    formatEventContext(eventContext),
    '',
    formatFAQs(faqs)
  ];

  return contextParts.join('\n');
}

/**
 * Get the system prompt as a message object for chat API
 */
function getSystemMessage() {
  return {
    role: 'system',
    content: getContext()
  };
}

/**
 * Get the last loaded timestamp
 */
function getLastUpdated() {
  return lastLoaded;
}

/**
 * Get raw data objects
 */
function getRawData() {
  if (!lastLoaded) {
    load();
  }

  return {
    systemPrompt,
    eventContext,
    faqs
  };
}

/**
 * Reload all data files
 */
function reload() {
  return load();
}

/**
 * Get event info summary
 */
function getEventInfo() {
  if (!lastLoaded) {
    load();
  }

  return {
    name: eventContext.event?.name || 'NEARCON 2026',
    dates: eventContext.event?.dates || 'February 23-24, 2026',
    location: `${eventContext.venue?.name}, ${eventContext.venue?.city}, ${eventContext.venue?.state}`,
    theme: eventContext.event?.theme || 'The Premier AI Industry Conference',
    website: eventContext.contact?.website || 'nearcon.org',
    contactUrl: eventContext.contact?.contactPage || 'nearcon.org/contact'
  };
}

// Load data on module initialization
load();

module.exports = {
  load,
  reload,
  getContext,
  getSystemMessage,
  getLastUpdated,
  getRawData,
  getEventInfo
};
