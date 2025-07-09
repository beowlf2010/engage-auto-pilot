# AI Messaging Setup & Configuration SOP

## Purpose
This SOP outlines the step-by-step process for setting up and configuring AI messaging for leads in the CRM system.

## Prerequisites
- Manager or Admin access to the CRM
- Understanding of lead sources and types
- Familiarity with compliance requirements

## AI Messaging Setup Process

### 1. Lead Creation and Initial Assessment
**Time Required:** 2-3 minutes per lead

1. **Lead Entry**
   - Navigate to Leads section
   - Click "Add New Lead" or import via CSV
   - Complete required fields: Name, Phone, Email, Vehicle Interest
   - Verify lead source and type classification

2. **AI Eligibility Check**
   - Confirm lead has valid mobile phone number
   - Verify lead has not opted out of communications
   - Check compliance status (DNC list, state regulations)
   - Ensure lead source allows AI messaging

### 2. AI Configuration Per Lead
**Time Required:** 1-2 minutes per lead

1. **Enable AI Messaging**
   - Open lead detail page
   - Toggle "AI Messages" switch to ON
   - System automatically sets super aggressive first-day sequence
   - Verify AI stage is set to "initial_contact"

2. **Strategy Customization** (Optional)
   - Review auto-assigned AI strategy bucket
   - Adjust message intensity if needed (gentle/standard/aggressive)
   - Modify aggression level (1-5 scale) based on lead type
   - Set custom scheduling preferences if required

### 3. Bulk AI Setup Process
**Time Required:** 5-10 minutes for 50+ leads

1. **CSV Import Method**
   - Download lead template from system
   - Populate with lead data
   - Include ai_opt_in=TRUE column for bulk activation
   - Upload and verify import success

2. **Bulk Selection Method**
   - Filter leads by criteria (source, date, status)
   - Select multiple leads using checkboxes
   - Click "Bulk Actions" → "Enable AI Messaging"
   - Confirm bulk activation

### 4. Verification and Monitoring

1. **Setup Verification**
   - Check AI Dashboard for new active leads
   - Verify scheduling appears in message queue
   - Confirm lead temperature scoring is calculated
   - Test opt-out functionality

2. **Initial Monitoring** (First 24 hours)
   - Monitor message delivery status
   - Track response rates and engagement
   - Watch for opt-out requests
   - Check compliance flags

## AI Strategy Configuration

### Message Intensity Levels
- **Gentle (Level 1-2):** Referrals, cold leads
- **Standard (Level 3-4):** Warm leads, finance inquiries  
- **Aggressive (Level 5):** Hot leads, phone inquiries

### AI Strategy Buckets
- **Marketplace:** AutoTrader, Cars.com, CarGurus leads
- **OEM/GM Finance:** Factory leads, GM Financial
- **Website Forms:** Direct website inquiries
- **Phone Up:** Inbound call leads
- **Referral/Repeat:** Previous customers, referrals
- **Trade-in Tools:** Trade evaluation inquiries

### Scheduling Configuration
- **First Day:** 3-5 messages with 2-4 hour intervals
- **Follow-up Days:** 1-2 messages daily
- **Business Hours:** 8 AM - 7 PM (configurable)
- **Compliance Windows:** State-specific restrictions

## Troubleshooting Common Issues

### Lead Not Receiving Messages
1. Check phone number format and validity
2. Verify AI opt-in status is enabled
3. Confirm lead is not on DNC list
4. Check message queue for pending sends

### Messages Going to Spam
1. Review message content for spam triggers
2. Verify sender reputation settings
3. Check compliance disclaimers are included
4. Consider message frequency adjustments

### Low Response Rates
1. Review message templates and personalization
2. Analyze send timing and frequency
3. Check lead quality and source
4. Test different message variants

## Best Practices

1. **Lead Quality Assessment**
   - Prioritize fresh leads (within 5 minutes)
   - Focus on high-intent sources
   - Verify contact information accuracy

2. **AI Strategy Optimization**
   - Monitor performance metrics weekly
   - Adjust intensity based on response patterns
   - A/B test message variants
   - Respect opt-out requests immediately

3. **Compliance Management**
   - Regular DNC list updates
   - State regulation compliance checks
   - Message content review monthly
   - Opt-out process testing

## Success Metrics
- **Response Rate:** Target 25-35%
- **Opt-out Rate:** Keep below 5%
- **Appointment Setting:** Target 8-12%
- **Lead Temperature:** Maintain above 60 average

## Related Documents
- Lead Management Workflows SOP
- Compliance Guidelines SOP
- Message Template Management SOP
- Performance Monitoring SOP

---
**Last Updated:** January 2024  
**Review Schedule:** Quarterly  
**Owner:** CRM Management Team