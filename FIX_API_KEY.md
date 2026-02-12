# Fix ThinkVoiceAPI Key Issue

## Steps to Fix:

1. **Stop the server** (Ctrl+C in terminal)

2. **Verify the API key is saved in database:**
   - Login as super admin
   - Check Settings page shows the key exists

3. **Get a VALID ThinkVoiceAPI key:**
   - Go to https://app.bolna.dev or https://bolna.ai
   - Login to your ThinkVoiceaccount
   - Go to Settings → API Keys
   - Copy your API key (starts with "bn-")

4. **Update the key via Super Admin UI:**
   - Login at http://localhost:5000/login as super admin
   - Go to Settings
   - Paste the NEW valid key
   - Click Save

5. **Restart the server:**
   ```bash
   npm run dev
   ```

6. **Test the connection:**
   - Login as tenant user
   - Go to Dashboard
   - Check if agents/phone numbers load without 403 errors

## Why this happens:
- The ThinkVoiceAPI key `bn-d10b4f42c17941b3a2f8514f257b03f2` is invalid/expired
- ThinkVoiceAPI returns 403 "Unrecognized access token" for invalid keys
- The server was caching the old client, but I fixed that
- After restart, it will use the new key from database

## If still not working:
- Check server logs for "[BOLNA] API error"
- Verify the key in database: `SELECT * FROM api_configurations WHERE key = 'BOLNA_API_KEY';`
- Make sure you're using a key from YOUR ThinkVoiceaccount, not a demo/test key
