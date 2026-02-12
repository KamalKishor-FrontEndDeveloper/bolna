# Multi-Account Management Guide

## Problem
When switching between different ThinkVoiceaccounts (with different API keys), the local database still contains old agent records from the previous account. This causes:
- Settings page showing wrong agent count (from local database)
- Dashboard showing correct agent count (from ThinkVoiceAPI)
- Confusion for stakeholders

## Solution
We've implemented a **Database Sync** feature that automatically cleans up orphaned records.

## How It Works

### Automatic Sync
The system compares:
1. **ThinkVoiceAPI** - Source of truth (actual agents in your ThinkVoiceaccount)
2. **Local Database** - Cached records (may contain old data)

Any agents in the local database that don't exist in ThinkVoiceAPI are automatically deleted.

### Manual Sync
You can manually trigger a sync from the **Settings** page:
1. Go to Settings
2. Look for the **Billing & Plan** card
3. Click the **Refresh** button (↻) in the top-right corner
4. Wait for "Sync completed" message

## When to Use Sync

### Scenario 1: Switching ThinkVoiceAccounts
```
Before: Local DB has 3 agents from Account 1
Switch to Account 2 (has 1 agent)
After Sync: Local DB now has 1 agent (matches Account 2)
```

### Scenario 2: Deleted Agents in Bolna
```
Before: Local DB has 5 agents
Delete 2 agents directly in ThinkVoicedashboard
After Sync: Local DB now has 3 agents (matches Bolna)
```

### Scenario 3: Fresh Start
```
Before: Local DB has old test data
After Sync: Local DB matches current ThinkVoiceaccount exactly
```

## Best Practices

1. **After Changing API Key**: Always click the sync button
2. **Before Showing to Stakeholders**: Run sync to ensure accurate counts
3. **Regular Maintenance**: Sync weekly if you frequently create/delete agents

## Technical Details

### Sync Endpoint
```
POST /api/tenant/sync
Authorization: Bearer <token>
```

### What Gets Synced
- ✅ Agents (removes orphaned records)
- ⚠️ Phone Numbers (not yet implemented)
- ⚠️ Campaigns (not yet implemented)
- ⚠️ Executions (not yet implemented)

### What Doesn't Get Deleted
- Users
- Tenant settings
- API keys

## Troubleshooting

### "Sync failed" Error
- Check your ThinkVoiceAPI key is valid
- Ensure you have internet connection
- Try logging out and back in

### Count Still Wrong After Sync
- Hard refresh the page (Ctrl+Shift+R)
- Check if you're looking at the right tenant
- Verify API key matches the ThinkVoiceaccount you expect

## Future Improvements
- Auto-sync on login
- Sync phone numbers and campaigns
- Sync status indicator in UI
- Scheduled background sync
