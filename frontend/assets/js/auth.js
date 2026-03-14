// auth.js - Authentication module for ABD News

// Auth state management
const AUTH_STORAGE_KEY = 'newshub_auth';
const TOKEN_STORAGE_KEY = 'newshub_tokens';

/**
 * Get current auth state from localStorage
 */
function getAuthState() {
    try {
        const authData = localStorage.getItem(AUTH_STORAGE_KEY);
        return authData ? JSON.parse(authData) : null;
    } catch (error) {
        console.error('Failed to get auth state:', error);
        return null;
    }
}

/**
 * Set auth state in localStorage
 */
function setAuthState(user) {
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
        console.error('Failed to set auth state:', error);
    }
}

/**
 * Get JWT tokens from localStorage
 */
function getTokens() {
    try {
        const tokens = localStorage.getItem(TOKEN_STORAGE_KEY);
        return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
        console.error('Failed to get tokens:', error);
        return null;
    }
}

/**
 * Set JWT tokens in localStorage
 */
function setTokens(tokens) {
    try {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
        console.error('Failed to set tokens:', error);
    }
}

/**
 * Clear auth data from localStorage
 */
function clearAuthData() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    const tokens = getTokens();
    return tokens && tokens.access;
}

/**
 * Check if user has active subscription
 */
function hasActiveSubscription() {
    const user = getAuthState();
    return user && user.has_active_subscription;
}

/**
 * Check if user is admin
 */
function isAdmin() {
    const user = getAuthState();
    return user && user.role === 'admin';
}

/**
 * Get current user
 */
function getCurrentUser() {
    return getAuthState();
}

/**
 * Get access token
 */
function getAccessToken() {
    const tokens = getTokens();
    return tokens ? tokens.access : null;
}

/**
 * Get refresh token
 */
function getRefreshToken() {
    const tokens = getTokens();
    return tokens ? tokens.refresh : null;
}

/**
 * Login user
 */
async function login(username, password) {
    try {
        const response = await fetch('/api/users/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Store user and tokens
            setAuthState(data.user);
            setTokens(data.tokens);
            
            // Check if admin user needs to be redirected
            if (data.redirect_url) {
                window.location.href = data.redirect_url;
                return {
                    success: true,
                    user: data.user,
                    message: data.message,
                    redirect: true
                };
            }
            
            return {
                success: true,
                user: data.user,
                message: data.message
            };
        } else {
            return {
                success: false,
                message: data.detail || data.non_field_errors?.[0] || 'Login failed'
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            message: 'Network error. Please try again.'
        };
    }
}

/**
 * Signup new user
 */
async function signup(userData) {
    try {
        const response = await fetch('/api/users/auth/signup/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            // Store user and tokens
            setAuthState(data.user);
            setTokens(data.tokens);
            
            return {
                success: true,
                user: data.user,
                message: data.message
            };
        } else {
            // Extract error messages
            let errorMessage = 'Signup failed';
            if (data.username) errorMessage = `Username: ${data.username[0]}`;
            else if (data.email) errorMessage = `Email: ${data.email[0]}`;
            else if (data.password) errorMessage = `Password: ${data.password[0]}`;
            else if (data.non_field_errors) errorMessage = data.non_field_errors[0];
            
            return {
                success: false,
                message: errorMessage
            };
        }
    } catch (error) {
        console.error('Signup error:', error);
        return {
            success: false,
            message: 'Network error. Please try again.'
        };
    }
}

/**
 * Logout user
 */
async function logout() {
    try {
        const refreshToken = getRefreshToken();
        
        if (refreshToken) {
            await fetch('/api/users/auth/logout/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Always clear local auth data
        clearAuthData();
        window.location.href = '/pages/login.html';
    }
}

/**
 * Refresh access token
 */
async function refreshAccessToken() {
    try {
        const refreshToken = getRefreshToken();
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch('/api/users/auth/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh: refreshToken
            })
        });

        if (response.ok) {
            const data = await response.json();
            const tokens = getTokens();
            tokens.access = data.access;
            if (data.refresh) {
                tokens.refresh = data.refresh;
            }
            setTokens(tokens);
            return data.access;
        } else {
            // Refresh token invalid, logout
            clearAuthData();
            window.location.href = '/pages/login.html';
            throw new Error('Session expired');
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        clearAuthData();
        window.location.href = '/pages/login.html';
        throw error;
    }
}

/**
 * Fetch with authentication
 */
async function fetchWithAuth(url, options = {}) {
    let accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error('Not authenticated');
    }

    // Add authorization header
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
    };

    let response = await fetch(url, options);

    // If unauthorized, try refreshing token
    if (response.status === 401) {
        try {
            accessToken = await refreshAccessToken();
            options.headers['Authorization'] = `Bearer ${accessToken}`;
            response = await fetch(url, options);
        } catch (error) {
            throw new Error('Authentication failed');
        }
    }

    return response;
}

/**
 * Get user profile
 */
async function getUserProfile() {
    try {
        const response = await fetchWithAuth('/api/users/auth/profile/');
        
        if (response.ok) {
            const user = await response.json();
            setAuthState(user);
            return user;
        } else {
            throw new Error('Failed to fetch profile');
        }
    } catch (error) {
        console.error('Profile fetch error:', error);
        return null;
    }
}

/**
 * Get subscription plans
 */
async function getSubscriptionPlans() {
    try {
        const response = await fetch('/api/users/subscription-plans/');
        
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Failed to fetch plans');
        }
    } catch (error) {
        console.error('Plans fetch error:', error);
        return [];
    }
}

/**
 * Subscribe to a plan
 */
async function subscribeToPlan(planId) {
    try {
        const response = await fetchWithAuth('/api/users/subscribe/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan_id: planId
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Refresh user profile
            await getUserProfile();
            return {
                success: true,
                subscription: data.subscription,
                message: data.message
            };
        } else {
            return {
                success: false,
                message: data.error || 'Subscription failed'
            };
        }
    } catch (error) {
        console.error('Subscribe error:', error);
        return {
            success: false,
            message: 'Network error. Please try again.'
        };
    }
}

/**
 * Update UI based on auth state
 */
function updateAuthUI() {
    const user = getCurrentUser();
    const isAuth = isAuthenticated();
    
    // Update login/logout buttons
    const authButtons = document.querySelectorAll('[data-auth-button]');
    authButtons.forEach(button => {
        const authAction = button.getAttribute('data-auth-button');
        
        if (authAction === 'login' || authAction === 'signup') {
            button.style.display = isAuth ? 'none' : 'inline-block';
        } else if (authAction === 'logout' || authAction === 'profile') {
            button.style.display = isAuth ? 'inline-block' : 'none';
        }
    });
    
    // Update user info display
    const userInfoElements = document.querySelectorAll('[data-user-info]');
    userInfoElements.forEach(element => {
        const infoType = element.getAttribute('data-user-info');
        
        if (user && infoType in user) {
            element.textContent = user[infoType];
        }
    });
    
    // Update subscription status
    const subscriptionElements = document.querySelectorAll('[data-subscription-status]');
    subscriptionElements.forEach(element => {
        if (hasActiveSubscription()) {
            element.textContent = 'Active';
            element.classList.add('active');
        } else {
            element.textContent = 'Inactive';
            element.classList.remove('active');
        }
    });
}

// Auto-update UI on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', updateAuthUI);
}
