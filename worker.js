// ==================== ROUTLIN WORKER API ====================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// ==================== UTILITY FUNCTIONS ====================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
      status,
      headers: CORS_HEADERS
  });
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: CORS_HEADERS
  });
}

// Hash password using Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'activity-tracker-pepper-v1');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
}

// Generate session token
function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
}

// ==================== AUTHENTICATION ====================

async function authenticateSession(token, db) {
  if (!token) return null;
  
  const now = Date.now();
  const session = await db.prepare(
      'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();
  
  return session ? session.user_id : null;
}

// ==================== DATA LOADING FUNCTIONS ====================

async function loadUserData(userId, db) {
  // Load tags
  const tagsResult = await db.prepare(
      'SELECT tag_id as id, name, color FROM tags WHERE user_id = ? ORDER BY created_at ASC'
  ).bind(userId).all();
  
  const tags = tagsResult.results || [];
  
  // Load entries (grouped by date)
  const entriesResult = await db.prepare(
      'SELECT date, tag_id FROM calendar_entries WHERE user_id = ? ORDER BY date ASC'
  ).bind(userId).all();
  
  const entries = {};
  (entriesResult.results || []).forEach(entry => {
      if (!entries[entry.date]) {
          entries[entry.date] = [];
      }
      entries[entry.date].push(entry.tag_id);
  });
  
  // Load goals
  const goalsResult = await db.prepare(
      'SELECT goal_id as id, tag_id as tagId, target_count as targetCount, period FROM goals WHERE user_id = ? ORDER BY created_at ASC'
  ).bind(userId).all();
  
  const goals = goalsResult.results || [];
  
  return { tags, entries, goals };
}

// ==================== SIGNUP ====================

async function handleSignup(request, db) {
  try {
      const { username, password } = await request.json();
      
      if (!username || !password) {
          return errorResponse('Username and password required');
      }
      
      const normalizedUsername = username.toLowerCase().trim();
      
      if (normalizedUsername.length < 3) {
          return errorResponse('Username must be at least 3 characters');
      }
      
      if (password.length < 4) {
          return errorResponse('Password must be at least 4 characters');
      }
      
      // Check if username exists
      const existing = await db.prepare(
          'SELECT id FROM users WHERE username = ?'
      ).bind(normalizedUsername).first();
      
      if (existing) {
          return errorResponse('Username already exists', 409);
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      const now = Date.now();
      
      // Create user
      const result = await db.prepare(
          'INSERT INTO users (username, password_hash, created_at, last_login) VALUES (?, ?, ?, ?)'
      ).bind(normalizedUsername, passwordHash, now, now).run();
      
      const userId = result.meta.last_row_id;
      
      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days
      
      await db.prepare(
          'INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)'
      ).bind(userId, sessionToken, now, expiresAt).run();
      
      return jsonResponse({
          success: true,
          message: 'Account created successfully',
          username: normalizedUsername,
          sessionToken: sessionToken,
          userData: {
              tags: [],
              entries: {},
              goals: []
          }
      });
      
  } catch (error) {
      console.error('Signup error:', error);
      return errorResponse('Server error: ' + error.message, 500);
  }
}

// ==================== LOGIN ====================

async function handleLogin(request, db) {
  try {
      const { username, password } = await request.json();
      
      if (!username || !password) {
          return errorResponse('Username and password required');
      }
      
      const normalizedUsername = username.toLowerCase().trim();
      
      // Get user
      const user = await db.prepare(
          'SELECT id, username, password_hash FROM users WHERE username = ?'
      ).bind(normalizedUsername).first();
      
      if (!user) {
          return errorResponse('Invalid username or password', 401);
      }
      
      // Verify password
      const passwordHash = await hashPassword(password);
      
      if (user.password_hash !== passwordHash) {
          return errorResponse('Invalid username or password', 401);
      }
      
      // Update last login
      const now = Date.now();
      await db.prepare(
          'UPDATE users SET last_login = ? WHERE id = ?'
      ).bind(now, user.id).run();
      
      // Create new session
      const sessionToken = generateSessionToken();
      const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days
      
      await db.prepare(
          'INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)'
      ).bind(user.id, sessionToken, now, expiresAt).run();
      
      // Load user data
      const userData = await loadUserData(user.id, db);
      
      return jsonResponse({
          success: true,
          message: 'Login successful',
          username: user.username,
          sessionToken: sessionToken,
          userData: userData
      });
      
  } catch (error) {
      console.error('Login error:', error);
      return errorResponse('Server error: ' + error.message, 500);
  }
}

// ==================== SYNC DATA ====================

async function handleSync(request, db) {
  try {
      const { username, sessionToken, userData } = await request.json();
      
      if (!username || !userData) {
          return errorResponse('Invalid request');
      }
      
      const normalizedUsername = username.toLowerCase().trim();
      
      // Get user
      const user = await db.prepare(
          'SELECT id FROM users WHERE username = ?'
      ).bind(normalizedUsername).first();
      
      if (!user) {
          return errorResponse('User not found', 404);
      }
      
      const userId = user.id;
      const now = Date.now();
      
      // SYNC TAGS
      if (userData.tags && Array.isArray(userData.tags)) {
          // Get existing tag IDs
          const existingTagsResult = await db.prepare(
              'SELECT tag_id FROM tags WHERE user_id = ?'
          ).bind(userId).all();
          
          const existingTagIds = new Set((existingTagsResult.results || []).map(t => t.tag_id));
          const newTagIds = new Set(userData.tags.map(t => t.id));
          
          // Delete removed tags
          for (const tagId of existingTagIds) {
              if (!newTagIds.has(tagId)) {
                  await db.prepare('DELETE FROM tags WHERE user_id = ? AND tag_id = ?')
                      .bind(userId, tagId).run();
                  await db.prepare('DELETE FROM calendar_entries WHERE user_id = ? AND tag_id = ?')
                      .bind(userId, tagId).run();
                  await db.prepare('DELETE FROM goals WHERE user_id = ? AND tag_id = ?')
                      .bind(userId, tagId).run();
              }
          }
          
          // Insert or update tags
          for (const tag of userData.tags) {
              if (existingTagIds.has(tag.id)) {
                  // Update existing tag
                  await db.prepare(
                      'UPDATE tags SET name = ?, color = ? WHERE user_id = ? AND tag_id = ?'
                  ).bind(tag.name, tag.color, userId, tag.id).run();
              } else {
                  // Insert new tag
                  await db.prepare(
                      'INSERT INTO tags (user_id, tag_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)'
                  ).bind(userId, tag.id, tag.name, tag.color, now).run();
              }
          }
      }
      
      // SYNC ENTRIES
      if (userData.entries && typeof userData.entries === 'object') {
          // Clear all existing entries for this user
          await db.prepare('DELETE FROM calendar_entries WHERE user_id = ?').bind(userId).run();
          
          // Insert all entries
          for (const [date, tagIds] of Object.entries(userData.entries)) {
              if (Array.isArray(tagIds)) {
                  for (const tagId of tagIds) {
                      try {
                          await db.prepare(
                              'INSERT OR IGNORE INTO calendar_entries (user_id, tag_id, date, created_at) VALUES (?, ?, ?, ?)'
                          ).bind(userId, tagId, date, now).run();
                      } catch (e) {
                          console.error('Entry insert error:', e);
                      }
                  }
              }
          }
      }
      
      // SYNC GOALS
      if (userData.goals && Array.isArray(userData.goals)) {
          // Get existing goal IDs
          const existingGoalsResult = await db.prepare(
              'SELECT goal_id FROM goals WHERE user_id = ?'
          ).bind(userId).all();
          
          const existingGoalIds = new Set((existingGoalsResult.results || []).map(g => g.goal_id));
          const newGoalIds = new Set(userData.goals.map(g => g.id));
          
          // Delete removed goals
          for (const goalId of existingGoalIds) {
              if (!newGoalIds.has(goalId)) {
                  await db.prepare('DELETE FROM goals WHERE user_id = ? AND goal_id = ?')
                      .bind(userId, goalId).run();
              }
          }
          
          // Insert or update goals
          for (const goal of userData.goals) {
              if (existingGoalIds.has(goal.id)) {
                  // Update existing goal
                  await db.prepare(
                      'UPDATE goals SET tag_id = ?, target_count = ?, period = ? WHERE user_id = ? AND goal_id = ?'
                  ).bind(goal.tagId, goal.targetCount, goal.period, userId, goal.id).run();
              } else {
                  // Insert new goal
                  await db.prepare(
                      'INSERT INTO goals (user_id, goal_id, tag_id, target_count, period, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                  ).bind(userId, goal.id, goal.tagId, goal.targetCount, goal.period, now).run();
              }
          }
      }
      
      return jsonResponse({
          success: true,
          message: 'Data synced successfully'
      });
      
  } catch (error) {
      console.error('Sync error:', error);
      return errorResponse('Server error: ' + error.message, 500);
  }
}

// ==================== CHANGE PASSWORD ====================

async function handleChangePassword(request, db) {
  try {
      const { username, currentPassword, newPassword } = await request.json();
      
      if (!username || !currentPassword || !newPassword) {
          return errorResponse('All fields required');
      }
      
      const normalizedUsername = username.toLowerCase().trim();
      
      // Get user
      const user = await db.prepare(
          'SELECT id, password_hash FROM users WHERE username = ?'
      ).bind(normalizedUsername).first();
      
      if (!user) {
          return errorResponse('User not found', 404);
      }
      
      // Verify current password
      const currentHash = await hashPassword(currentPassword);
      
      if (user.password_hash !== currentHash) {
          return errorResponse('Current password is incorrect', 401);
      }
      
      // Update password
      const newHash = await hashPassword(newPassword);
      await db.prepare(
          'UPDATE users SET password_hash = ? WHERE id = ?'
      ).bind(newHash, user.id).run();
      
      return jsonResponse({
          success: true,
          message: 'Password changed successfully'
      });
      
  } catch (error) {
      console.error('Change password error:', error);
      return errorResponse('Server error: ' + error.message, 500);
  }
}

// ==================== DELETE ACCOUNT ====================

async function handleDeleteAccount(request, db) {
  try {
      const { username, sessionToken } = await request.json();
      
      if (!username) {
          return errorResponse('Username required');
      }
      
      const normalizedUsername = username.toLowerCase().trim();
      
      // Get user
      const user = await db.prepare(
          'SELECT id FROM users WHERE username = ?'
      ).bind(normalizedUsername).first();
      
      if (!user) {
          return errorResponse('User not found', 404);
      }
      
      // Delete user (cascades to tags, entries, goals, sessions)
      await db.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
      
      return jsonResponse({
          success: true,
          message: 'Account permanently deleted from cloud storage'
      });
      
  } catch (error) {
      console.error('Delete account error:', error);
      return errorResponse('Server error: ' + error.message, 500);
  }
}

// ==================== MAIN ROUTER ====================

export default {
  async fetch(request, env) {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
          return new Response(null, { headers: CORS_HEADERS });
      }
      
      const url = new URL(request.url);
      const path = url.pathname;
      
      try {
          // Health check
          if (path === '/health') {
              return jsonResponse({ 
                  status: 'ok', 
                  timestamp: Date.now() 
              });
          }
          
          // SIGNUP
          if (path === '/api/signup' && request.method === 'POST') {
              return handleSignup(request, env.DB);
          }
          
          // LOGIN
          if (path === '/api/login' && request.method === 'POST') {
              return handleLogin(request, env.DB);
          }
          
          // SYNC
          if (path === '/api/sync' && request.method === 'POST') {
              return handleSync(request, env.DB);
          }
          
          // CHANGE PASSWORD
          if (path === '/api/change-password' && request.method === 'POST') {
              return handleChangePassword(request, env.DB);
          }
          
          // DELETE ACCOUNT
          if (path === '/api/delete-account' && request.method === 'POST') {
              return handleDeleteAccount(request, env.DB);
          }
          
          // 404 for unknown routes
          return errorResponse('Not found', 404);
          
      } catch (error) {
          console.error('Worker error:', error);
          return errorResponse('Server error: ' + error.message, 500);
      }
  }
};
