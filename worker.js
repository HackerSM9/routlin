const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

// Handle OPTIONS preflight requests
function handleOptions() {
    return new Response(null, { headers: corsHeaders });
}

// Convert string to ArrayBuffer
function str2ab(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// Convert ArrayBuffer to string
function ab2str(buf) {
    const decoder = new TextDecoder();
    return decoder.decode(buf);
}

// Convert ArrayBuffer to Base64
function ab2base64(buf) {
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base642ab(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Derive encryption key from secret
async function getEncryptionKey(secret) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        str2ab(secret),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: str2ab('activity-tracker-salt-v1'),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt data
async function encryptData(data, secret) {
    const key = await getEncryptionKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = str2ab(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoded
    );
    
    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return ab2base64(combined.buffer);
}

// Decrypt data
async function decryptData(encryptedBase64, secret) {
    try {
        const key = await getEncryptionKey(secret);
        const combined = new Uint8Array(base642ab(encryptedBase64));
        
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        
        return JSON.parse(ab2str(decrypted));
    } catch (e) {
        console.error('Decryption failed:', e);
        return null;
    }
}

// Hash password (for additional security)
async function hashPassword(password) {
    const encoded = str2ab(password + 'activity-tracker-pepper-v1');
    const hash = await crypto.subtle.digest('SHA-256', encoded);
    return ab2base64(hash);
}

// Fetch data from GitHub Gist
async function fetchGistData(env) {
    const response = await fetch(
        `https://api.github.com/gists/${env.GIST_ID}`,
        {
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'User-Agent': 'Activity-Tracker-Worker',
                'Accept': 'application/vnd.github.v3+json'
            }
        }
    );
    
    if (!response.ok) {
        throw new Error('Failed to fetch Gist');
    }
    
    const gist = await response.json();
    const content = gist.files['users.json']?.content || '{}';
    
    // If content is encrypted (starts with encrypted marker)
    if (content.startsWith('ENC:')) {
        const decrypted = await decryptData(content.slice(4), env.ENCRYPTION_KEY);
        return decrypted || {};
    }
    
    // If content is plain (first time or migration)
    try {
        return JSON.parse(content);
    } catch {
        return {};
    }
}

// Save data to GitHub Gist
async function saveGistData(data, env) {
    // Encrypt the entire database
    const encrypted = 'ENC:' + await encryptData(data, env.ENCRYPTION_KEY);
    
    const response = await fetch(
        `https://api.github.com/gists/${env.GIST_ID}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${env.GITHUB_TOKEN}`,
                'User-Agent': 'Activity-Tracker-Worker',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'users.json': {
                        content: encrypted
                    }
                }
            })
        }
    );
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error('Failed to save Gist: ' + error);
    }
    
    return true;
}

// Main request handler
export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleOptions();
        }
        
        const url = new URL(request.url);
        const path = url.pathname;
        
        try {
            // Health check
            if (path === '/health') {
                return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), { headers: corsHeaders });
            }
            
            // SIGNUP
            if (path === '/api/signup' && request.method === 'POST') {
                const { username, password } = await request.json();
                
                if (!username || !password) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Username and password required' }),
                        { status: 400, headers: corsHeaders }
                    );
                }
                
                const normalizedUsername = username.toLowerCase().trim();
                
                if (normalizedUsername.length < 3) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Username must be at least 3 characters' }),
                        { status: 400, headers: corsHeaders }
                    );
                }
                
                if (password.length < 4) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Password must be at least 4 characters' }),
                        { status: 400, headers: corsHeaders }
                    );
                }
                
                // Fetch existing users
                const users = await fetchGistData(env);
                
                // Check if username exists
                if (users[normalizedUsername]) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Username already exists' }),
                        { status: 409, headers: corsHeaders }
                    );
                }
                
                // Hash password
                const passwordHash = await hashPassword(password);
                
                // Create new user
                users[normalizedUsername] = {
                    passwordHash: passwordHash,
                    tags: [],
                    entries: {},
                    goals: [],
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                };
                
                // Save to Gist
                await saveGistData(users, env);
                
                // Generate session token
                const sessionToken = ab2base64(crypto.getRandomValues(new Uint8Array(32)).buffer);
                
                return new Response(
                    JSON.stringify({ 
                        success: true, 
                        message: 'Account created successfully',
                        username: normalizedUsername,
                        sessionToken: sessionToken,
                        userData: {
                            tags: [],
                            entries: {},
                            goals: []
                        }
                    }),
                    { headers: corsHeaders }
                );
            }
            
            // LOGIN
            if (path === '/api/login' && request.method === 'POST') {
                const { username, password } = await request.json();
                
                if (!username || !password) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Username and password required' }),
                        { status: 400, headers: corsHeaders }
                    );
                }
                
                const normalizedUsername = username.toLowerCase().trim();
                
                // Fetch users
                const users = await fetchGistData(env);
                
                // Check if user exists
                if (!users[normalizedUsername]) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Invalid username or password' }),
                        { status: 401, headers: corsHeaders }
                    );
                }
                
                // Verify password
                const passwordHash = await hashPassword(password);
                
                if (users[normalizedUsername].passwordHash !== passwordHash) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Invalid username or password' }),
                        { status: 401, headers: corsHeaders }
                    );
                }
                
                // Update last login
                users[normalizedUsername].lastLogin = Date.now();
                await saveGistData(users, env);
                
                // Generate session token
                const sessionToken = ab2base64(crypto.getRandomValues(new Uint8Array(32)).buffer);
                
                return new Response(
                    JSON.stringify({ 
                        success: true, 
                        message: 'Login successful',
                        username: normalizedUsername,
                        sessionToken: sessionToken,
                        userData: {
                            tags: users[normalizedUsername].tags || [],
                            entries: users[normalizedUsername].entries || {},
                            goals: users[normalizedUsername].goals || []
                        }
                    }),
                    { headers: corsHeaders }
                );
            }
            
            // SAVE DATA (sync)
            if (path === '/api/sync' && request.method === 'POST') {
                const { username, sessionToken, userData } = await request.json();
                
                if (!username || !userData) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Invalid request' }),
                        { status: 400, headers: corsHeaders }
                    );
                }
                
                const normalizedUsername = username.toLowerCase().trim();
                
                // Fetch users
                const users = await fetchGistData(env);
                
                // Check if user exists
                if (!users[normalizedUsername]) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'User not found' }),
                        { status: 404, headers: corsHeaders }
                    );
                }
                
                // Update user data
                users[normalizedUsername].tags = userData.tags || [];
                users[normalizedUsername].entries = userData.entries || {};
                users[normalizedUsername].goals = userData.goals || [];
                users[normalizedUsername].lastSync = Date.now();
                
                // Save to Gist
                await saveGistData(users, env);
                
                return new Response(
                    JSON.stringify({ success: true, message: 'Data synced successfully' }),
                    { headers: corsHeaders }
                );
            }
            
            // CHANGE PASSWORD
            if (path === '/api/change-password' && request.method === 'POST') {
                const { username, currentPassword, newPassword } = await request.json();
                
                if (!username || !currentPassword || !newPassword) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'All fields required' }),
                        { status: 400, headers: corsHeaders }
                    );
                }
                
                const normalizedUsername = username.toLowerCase().trim();
                
                // Fetch users
                const users = await fetchGistData(env);
                
                // Check if user exists
                if (!users[normalizedUsername]) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'User not found' }),
                        { status: 404, headers: corsHeaders }
                    );
                }
                
                // Verify current password
                const currentHash = await hashPassword(currentPassword);
                
                if (users[normalizedUsername].passwordHash !== currentHash) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Current password is incorrect' }),
                        { status: 401, headers: corsHeaders }
                    );
                }
                
                // Update password
                users[normalizedUsername].passwordHash = await hashPassword(newPassword);
                await saveGistData(users, env);
                
                return new Response(
                    JSON.stringify({ success: true, message: 'Password changed successfully' }),
                    { headers: corsHeaders }
                );
            }
            
            // 404 for unknown routes
            return new Response(
                JSON.stringify({ error: 'Not found' }),
                { status: 404, headers: corsHeaders }
            );
            
        } catch (error) {
            console.error('Worker error:', error);
            return new Response(
                JSON.stringify({ success: false, error: 'Server error: ' + error.message }),
                { status: 500, headers: corsHeaders }
            );
        }
    }
};
