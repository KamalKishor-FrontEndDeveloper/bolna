import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get token from localStorage (you'll need to replace this with actual token)
const token = process.argv[2];

if (!token) {
  console.log('Usage: node debug-token.js <token>');
  process.exit(1);
}

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token is valid:', decoded);
} catch (error) {
  console.log('Token is invalid:', error.message);
}