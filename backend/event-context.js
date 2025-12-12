// NEARCON 2026 Event Context and System Prompt
// This contains all the event information scraped from nearcon.org

const NEARCON_CONTEXT = `You are NearBot, a helpful AI assistant for NEARCON 2026 - The Premier AI Industry Conference.

Your primary role is to answer questions about NEARCON 2026, provide event information, and assist attendees with any conference-related queries. You are running in a Trusted Execution Environment (TEE) on NEAR AI Cloud, providing cryptographically verifiable responses.

## EVENT DETAILS
- **Event Name**: NEARCON 2026 - The Premier AI Industry Conference
- **Dates**: February 23-24, 2026
- **Location**: Fort Mason Center for Arts & Culture, San Francisco, California, USA
- **Theme**: The Premier AI Industry Conference

## REGISTRATION & ATTENDANCE
- Registration is handled through Luma (accessible via nearcon.org)
- You will receive a confirmation when registered
- Badge pickup happens at the event
- Registration includes access to all conference sessions

## VENUE INFORMATION
- **Venue**: Fort Mason Center for Arts & Culture
- **Address**: San Francisco, California, USA
- **ADA Compliant**: Yes, the venue is ADA compliant
- **Accessibility**: We are committed to providing an accessible experience for all attendees

## DRESS CODE & POLICIES
- **Dress Code**: No formal dress code required
- **Comfortable Attire**: Wear what makes you comfortable - it's a conference and cultural gathering
- **Side Events**: Some side events may have different dress expectations

## LOGISTICS
- **WiFi**: Complimentary WiFi available to all registered attendees
- **Bags**: All bags subject to security screening upon entry
- **Badges**: Basic registration information (name, company, email) may be encoded in badges

## PHOTOGRAPHY & MEDIA
- **Personal Photography**: Welcome in public areas
- **Professional Video**: Requires written approval from NEARCON Media Team
- **Photo/Video Release**: By registering, you agree that photographs and video may be used by NEAR Foundation

## PRESS & MEDIA
- **Press Credentials**: Apply for press credentials through the press form
- **Review Process**: All applications reviewed and approved by NEARCON Media Team
- **Contact**: nearcon.org/contact

## HEALTH & SAFETY
- **Safety Priority**: Safety is a top priority at NEARCON
- **Venue Security**: Security and staff present at all times
- **Badge Required**: All attendees must have a valid badge

## SPEAKERS & AGENDA
- Speaker information and agenda details will be announced closer to the event
- Check nearcon.org for the latest updates

## CONTACT INFORMATION
- **Website**: nearcon.org
- **Contact**: nearcon.org/contact

## IMPORTANT NOTES
- This is a professional AI industry conference
- All attendees must register in advance
- Follow the venue and event rules for the best experience
- Network with fellow AI professionals and industry leaders

If you have any questions about NEARCON 2026 that aren't covered here, feel free to ask! I can help with general event information, logistics, and guidance for making the most of your conference experience.`;

const getSystemPrompt = (userQuery = '') => {
  return {
    role: 'system',
    content: NEARCON_CONTEXT
  };
};

const getEventInfo = () => {
  return {
    name: 'NEARCON 2026',
    dates: 'February 23-24, 2026',
    location: 'Fort Mason Center for Arts & Culture, San Francisco, CA',
    theme: 'The Premier AI Industry Conference',
    website: 'nearcon.org',
    registrationUrl: 'nearcon.org (via Luma)',
    contactUrl: 'nearcon.org/contact'
  };
};

const getFAQData = () => {
  return {
    attendance: [
      {
        question: 'How do I register for NEARCON 2026?',
        answer: 'You can register for the event directly through our Luma page accessible from nearcon.org.'
      },
      {
        question: 'What does my registration include?',
        answer: 'Registration includes access to all conference sessions and events.'
      },
      {
        question: 'How will I know that I am registered?',
        answer: 'You will receive a confirmation when registered.'
      },
      {
        question: 'How do I pick up my badge at the event?',
        answer: 'Badge pickup information will be provided closer to the event date.'
      }
    ],
    general: [
      {
        question: 'When and where is NEARCON 2026?',
        answer: 'NEARCON takes place February 23-24, 2026 at Fort Mason Center for Arts & Culture, San Francisco, California, USA.'
      },
      {
        question: 'Is there a dress code?',
        answer: 'No formal dress code is required. NEARCON is a conference and cultural gathering — wear what makes you comfortable.'
      },
      {
        question: 'Do I need a travel visa to attend NEARCON?',
        answer: 'International attendees are responsible for securing any required travel visas. Please check your country\'s requirements.'
      },
      {
        question: 'Will there be WiFi at the event?',
        answer: 'Yes. Complimentary WiFi will be available to all registered attendees at Fort Mason Center.'
      }
    ],
    participation: [
      {
        question: 'What is the privacy policy for NEARCON 2026?',
        answer: 'Your basic registration information (name, company, email) may be encoded in your badge. By allowing a sponsor to scan your badge, you consent to sharing this information with them.'
      },
      {
        question: 'What accessibility measures are in place?',
        answer: 'Fort Mason Center is ADA compliant. We are committed to providing an accessible and inclusive experience for all attendees.'
      },
      {
        question: 'Are photography and video allowed?',
        answer: 'Personal photography is welcome in public areas. Professional video and livestreaming require written approval from the NEARCON Media Team.'
      },
      {
        question: 'What is the photo/video release policy?',
        answer: 'By registering for NEARCON, you agree that photographs and video taken at the event may be used by NEAR Foundation.'
      }
    ],
    press: [
      {
        question: 'How can I obtain a press pass?',
        answer: 'Apply for press credentials through the press form on nearcon.org. All applications are reviewed and approved by the NEARCON Media Team.'
      }
    ],
    safety: [
      {
        question: 'What is the bag policy?',
        answer: 'All bags are subject to security screening upon entry to Fort Mason Center and other official venues. Please allow extra time for security screening.'
      },
      {
        question: 'What safety measures are in place?',
        answer: 'Safety is a top priority at NEARCON. Venue security and staff will be present at all times. All attendees must have a valid badge to access event areas.'
      }
    ]
  };
};

module.exports = {
  NEARCON_CONTEXT,
  getSystemPrompt,
  getEventInfo,
  getFAQData
};