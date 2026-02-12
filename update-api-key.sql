-- Update the ThinkVoiceAPI key in the database
-- Replace 'YOUR_NEW_BOLNA_API_KEY' with your actual valid key from https://bolna.ai

UPDATE api_keys 
SET value = 'YOUR_NEW_BOLNA_API_KEY', 
    updated_at = NOW() 
WHERE key = 'BOLNA_API_KEY';

-- If the key doesn't exist, insert it:
INSERT INTO api_keys (key, value, created_at, updated_at)
VALUES ('BOLNA_API_KEY', 'YOUR_NEW_BOLNA_API_KEY', NOW(), NOW())
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();
