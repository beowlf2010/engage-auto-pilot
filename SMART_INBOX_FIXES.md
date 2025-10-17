# Smart Inbox Fixes - Message Deduplication & Visibility

## Problems Fixed

### 1. ✅ Duplicate Daily Messages
**Issue**: Leads receiving identical AI messages every day (e.g., Thomas Bailey)
**Root Cause**: No message deduplication or AI stage progression

**Solutions Implemented**:

#### A. Message Deduplication (`intelligent-conversation-ai`)
- Added check against `ai_message_history` table for last 7 days
- Created message hash comparison with 80% similarity threshold
- Prevents sending similar messages within 7-day window
- Stores all generated messages in `ai_message_history` for future checks

#### B. AI Stage Progression (`intelligent-conversation-ai`)
- Automatically advances `ai_stage` after each message:
  - `initial` → `follow_up_1` → `follow_up_2` → `nurture`
- Tracks `ai_messages_sent` counter
- Prevents getting stuck in "initial" stage loop

#### C. Smart Scheduling (`ai-automation`)
- **Customer Response Detection**: Pauses AI if customer replied in last 48 hours
- **24-Hour Minimum Gap**: Won't send if message sent < 24 hours ago
- **Exponential Backoff** based on AI stage:
  - Initial: 24 hours (Day 1)
  - Follow-up 1: 48 hours later (Day 3)
  - Follow-up 2: 96 hours later (Day 7)
  - Nurture: 7/14/30 days (based on message count)

### 2. ✅ Messages Not Visible in Inbox
**Issue**: Loading spinner loop, messages not displaying
**Root Cause**: Potential timeout issues in data loading

**Solutions Implemented**:

#### A. Timeout Protection (`smartInboxDataLoader`)
- Added 10-second timeout wrapper on conversation loading
- Better error messages when timeout occurs
- Separate internal loading method for clean separation

#### B. Enhanced Loading States (`ConversationView`)
- Shows message count while loading
- Displays specific error messages
- Clear differentiation between loading, error, and empty states

#### C. Better Logging (`smartInboxDataLoader`)
- Added detailed breakdown of loaded conversations
- Tracks messages with/without content
- Tracks unread message counts

---

## Code Changes Summary

### Edge Functions

**`supabase/functions/intelligent-conversation-ai/index.ts`**
- ✅ Message deduplication check (lines 71-84)
- ✅ Store messages in `ai_message_history` (lines 273-284)
- ✅ AI stage progression logic (lines 286-298)
- ✅ Helper functions for hash generation and similarity (lines 391-423)

**`supabase/functions/ai-automation/index.ts`**
- ✅ Customer response detection (lines 278-299)
- ✅ 24-hour gap enforcement (lines 301-315)
- ✅ Exponential backoff scheduling (lines 381-395, 519-534)

### Frontend Services

**`src/services/smartInboxDataLoader.ts`**
- ✅ 10-second timeout protection (lines 6-20)
- ✅ Enhanced logging for debugging (lines 119-125)

**`src/components/inbox/ConversationView.tsx`**
- ✅ Better loading state display (lines 283-295)
- ✅ Error state handling

---

## Testing Checklist

- [x] ✅ Duplicate message prevention (7-day deduplication window)
- [x] ✅ AI stage progression (initial → follow_up → nurture)
- [x] ✅ Customer response auto-pause (48-hour window)
- [x] ✅ 24-hour minimum gap between messages
- [x] ✅ Exponential backoff scheduling
- [x] ✅ Timeout protection for inbox loading
- [x] ✅ Enhanced error states in UI

---

## Expected Behavior After Fix

### For Thomas Bailey (and other leads):
1. **No more duplicate messages** - Each message will be unique or sufficiently different
2. **Proper progression** - Messages will follow: initial → follow-up 1 → follow-up 2 → nurture
3. **Auto-pause on response** - If Thomas replies, AI will pause and wait for human follow-up
4. **Smart spacing** - Messages spread out: Day 1, Day 3, Day 7, then weekly/bi-weekly

### For Smart Inbox:
1. **Visible messages** - All conversations display without infinite loading
2. **Fast loading** - 10-second timeout ensures UI doesn't hang
3. **Clear error states** - Users see helpful messages if something goes wrong
4. **Real-time updates** - Messages appear immediately when sent/received

---

## Database Tables Used

### `ai_message_history` (for deduplication)
- Stores: message_content, message_hash, context_data
- Used to prevent sending similar messages within 7 days

### `leads` table (for tracking)
- `ai_stage`: Tracks progression (initial/follow_up_1/follow_up_2/nurture)
- `ai_messages_sent`: Counts total messages sent
- `ai_sequence_paused`: Auto-paused when customer responds
- `next_ai_send_at`: Smart scheduling with exponential backoff

### `conversations` table (for detection)
- Used to detect customer responses
- Used to check 24-hour message gap

---

## Monitoring & Debugging

### Check if deduplication is working:
```sql
SELECT lead_id, COUNT(*), array_agg(message_content) 
FROM ai_message_history 
WHERE created_at > now() - interval '7 days'
GROUP BY lead_id 
HAVING COUNT(*) > 1;
```

### Check AI stage progression:
```sql
SELECT id, first_name, last_name, ai_stage, ai_messages_sent, next_ai_send_at
FROM leads 
WHERE ai_opt_in = true
ORDER BY next_ai_send_at;
```

### Check paused leads (customer responded):
```sql
SELECT id, first_name, last_name, ai_pause_reason, updated_at
FROM leads 
WHERE ai_sequence_paused = true 
AND ai_pause_reason LIKE '%responded%';
```

---

## Edge Function Logs to Watch

**For `intelligent-conversation-ai`:**
- `⚠️ [FINN AI] Duplicate message detected, skipping send`
- `📈 [FINN AI] AI stage updated: initial -> follow_up_1`

**For `ai-automation`:**
- `⏸️ [LEAD] Customer responded recently, pausing AI`
- `⏰ [LEAD] Message sent < 24h ago, skipping`
- `📅 [LEAD] Next message scheduled in X hours`

---

## Emergency Controls

If issues persist, you can:

1. **Pause all AI globally**:
```sql
UPDATE leads SET ai_opt_in = false, ai_sequence_paused = true WHERE ai_opt_in = true;
```

2. **Reset a specific lead's AI**:
```sql
UPDATE leads 
SET ai_stage = 'initial', 
    ai_messages_sent = 0, 
    next_ai_send_at = now() + interval '1 day'
WHERE id = '<lead_id>';
```

3. **Clear message history for fresh start**:
```sql
DELETE FROM ai_message_history WHERE lead_id = '<lead_id>';
```
