# Multi-Account Sync Solution

## Your Problem
You have 2 different Bolna accounts with different API keys:
- **Account 1**: Has 3 agents
- **Account 2**: Has 1 agent

When switching between accounts, the Settings page shows wrong agent count (3 instead of 1) because the local database still has old records.

## The Solution: Sync Feature

### What It Does
The sync feature compares your local database with the current Bolna API and removes orphaned records.

### How to Use

#### Step 1: Switch Bolna Accounts
1. Go to **Settings** page
2. Enter your new Bolna API key
3. Click **Save**

#### Step 2: Sync Database
1. Look at the **Billing & Plan** card
2. Click the **Refresh button** (↻) in the top-right corner
3. Wait for "Sync completed" message

#### Step 3: Verify
- Dashboard now shows correct agent count
- Settings billing shows correct agent count
- No more confusion!

## What Gets Synced
- ✅ **Agents**: Removes agents that don't exist in current Bolna account
- ⚠️ **Phone Numbers**: Not yet implemented
- ⚠️ **Campaigns**: Not yet implemented

## When to Sync
- After changing your Bolna API key
- Before showing dashboard to stakeholders
- When agent counts look wrong
- Weekly maintenance (optional)

## Technical Details

### Files Changed
1. `server/lib/syncService.ts` - Sync logic
2. `server/multiTenantRoutes.ts` - Added `/api/tenant/sync` endpoint
3. `client/src/pages/Settings.tsx` - Added sync button

### API Endpoint
```
POST /api/tenant/sync
Authorization: Bearer <token>
Response: { "message": "Sync completed", "success": true, "deleted": 2 }
```

### How It Works
1. Fetches all agents from Bolna API
2. Compares with local database agents
3. Deletes agents that exist in DB but not in Bolna
4. Returns count of deleted records

## Example Scenario

### Before Sync
- Local DB: 3 agents (from Account 1)
- Bolna API: 1 agent (Account 2)
- Settings shows: 3 agents ❌

### After Sync
- Local DB: 1 agent (synced with Account 2)
- Bolna API: 1 agent (Account 2)
- Settings shows: 1 agent ✅

## Troubleshooting

### "Sync failed" Error
- Check your Bolna API key is valid
- Ensure you have internet connection
- Try logging out and back in

### Count Still Wrong
- Hard refresh the page (Ctrl+Shift+R)
- Check if you're using the correct API key
- Verify the key matches your intended Bolna account

## Future Improvements
- Auto-sync on login
- Sync phone numbers and campaigns
- Background scheduled sync
- Sync status indicator
