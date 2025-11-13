// scripts/auth.js
// Handles authentication, session management, and logout functionality
// Now includes Google OAuth integration

const BACKEND_URL = "http://127.0.0.1:8000";
const GOOGLE_CLIENT_ID = "530881158509-8a6u8us164cvqolnnqn9qf7j7g10geii.apps.googleusercontent.com"; // ⚠️ Replace with your actual client ID

// ✅ Get current session data from localStorage
function getSession() {
  try {
    const sessionData = localStorage.getItem("calicdan-session");
    return sessionData ? JSON.parse(sessionData) : null;
  } catch {
    return null;
  }
}

// ✅ Save session data to localStorage
function saveSession(data) {
  localStorage.setItem("calicdan-session", JSON.stringify(data));
}

// ✅ Clear all session data
function clearSession() {
  localStorage.removeItem("calicdan-session");
  localStorage.removeItem("chatHistory");
  localStorage.removeItem("loggedIn");
}

// ✅ Check if user is logged in
function isLoggedIn() {
  const session = getSession();
  return !!(session && session.session_token);
}

// ✅ Get session token for API calls
function getSessionToken() {
  const session = getSession();
  return session ? session.session_token : null;
}

// ✅ Get current user info
function getCurrentUser() {
  const session = getSession();
  return session ? { user_id: session.user_id, email: session.email } : null;
}

// ✅ Email validation function (client-side)
function isValidEmail(email) {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

// ========================================
// GOOGLE OAUTH FUNCTIONS
// ========================================

// ✅ Initialize Google Sign-In
function initGoogleSignIn() {
  // Check if we're on a page that needs Google Sign-In
  const googleBtnContainer = document.getElementById('google-signin-btn');
  if (!googleBtnContainer) return;

  // Load Google Identity Services library
  if (typeof google === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = setupGoogleButton;
    document.head.appendChild(script);
  } else {
    setupGoogleButton();
  }
}

// ✅ Setup Google Sign-In button
function setupGoogleButton() {
  const googleBtnContainer = document.getElementById('google-signin-btn');
  
  if (!googleBtnContainer) return;

  try {
    // Initialize Google Identity Services
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    // Render the button
    google.accounts.id.renderButton(
      googleBtnContainer,
      {
        theme: 'outline',
        size: 'large',
        width: googleBtnContainer.offsetWidth || 280,
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      }
    );

    console.log('✅ Google Sign-In button initialized');
  } catch (error) {
    console.error('❌ Error setting up Google Sign-In:', error);
  }
}

// ✅ Handle Google OAuth callback
async function handleGoogleCallback(response) {
  try {
    const idToken = response.credential;

    // Show loading notification
    if (window.AppUtils && window.AppUtils.showNotification) {
      window.AppUtils.showNotification("Signing in with Google...", "info");
    }

    // Send token to backend for verification
    const backendResponse = await fetch(`${BACKEND_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token: idToken })
    });

    const data = await backendResponse.json();

    if (backendResponse.ok && data.session_token) {
      // Save session data
      saveSession({
        session_token: data.session_token,
        user_id: data.user_id,
        email: data.email,
        auth_provider: 'google'
      });

      console.log('✅ Google sign-in successful:', data.email);

      // Show success notification
      if (window.AppUtils && window.AppUtils.showNotification) {
        window.AppUtils.showNotification("Successfully signed in with Google!", "success");
      }

      // Redirect to chat page
      setTimeout(() => {
        window.location.href = "chat.html";
      }, 500);
    } else {
      throw new Error(data.error || data.detail || "Google sign-in failed");
    }
  } catch (error) {
    console.error("❌ Google sign-in error:", error);
    
    if (window.AppUtils && window.AppUtils.showNotification) {
      window.AppUtils.showNotification(
        error.message || "Failed to sign in with Google. Please try again.",
        "error"
      );
    }
  }
}

// ========================================
// LOGOUT FUNCTION (Enhanced with Google)
// ========================================

// ✅ Handle logout - clears session on both frontend AND backend
async function handleLogout() {
  const sessionToken = getSessionToken();
  const session = getSession();
  
  if (!sessionToken) {
    clearSession();
    window.location.href = "index.html";
    return;
  }

  try {
    // ✅ Call backend logout endpoint to invalidate session
    const response = await fetch(`${BACKEND_URL}/logout`, {
      method: "POST",
      headers: {
        "Authorization": sessionToken,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      console.log("✅ Logout successful on backend");
    } else {
      console.warn("⚠️ Backend logout failed, clearing local session anyway");
    }

    // If logged in via Google, sign out from Google as well
    if (session && session.auth_provider === 'google' && typeof google !== 'undefined') {
      try {
        google.accounts.id.disableAutoSelect();
        console.log("✅ Google sign-out successful");
      } catch (error) {
        console.warn("⚠️ Google sign-out error:", error);
      }
    }
  } catch (error) {
    console.error("❌ Logout error:", error);
  } finally {
    // ✅ Always clear local session data
    clearSession();
    
    // Show notification if available
    if (window.AppUtils && window.AppUtils.showNotification) {
      window.AppUtils.showNotification("Logged out successfully", "success");
    }
    
    // Redirect to login page
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  }
}

// ✅ Check authentication status on protected pages
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// ✅ Redirect to chat if already logged in (for login page)
function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = "chat.html";
  }
}

// ✅ Initialize auth UI elements
function initAuthUI() {
  const currentUser = getCurrentUser();
  
  if (currentUser) {
    // Update user avatar with first letter of email
    const avatars = document.querySelectorAll(".user-avatar");
    avatars.forEach(avatar => {
      avatar.textContent = currentUser.email.charAt(0).toUpperCase();
      avatar.title = currentUser.email;
    });

    // Hide login button, show user menu
    const loginButtons = document.querySelectorAll(".login-btn");
    loginButtons.forEach(btn => btn.style.display = "none");

    const userMenus = document.querySelectorAll(".user-menu");
    userMenus.forEach(menu => {
      menu.style.display = "flex";
      menu.style.cursor = "pointer";
    });
  } else {
    // Show login button, hide user menu
    const loginButtons = document.querySelectorAll(".login-btn");
    loginButtons.forEach(btn => btn.style.display = "flex");

    const userMenus = document.querySelectorAll(".user-menu");
    userMenus.forEach(menu => menu.style.display = "none");
  }
}

// ✅ Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initAuthUI();
  initGoogleSignIn();
});

// ✅ Re-initialize after soft navigation
document.addEventListener("soft:navigated", () => {
  initAuthUI();
  initGoogleSignIn();
});

// ✅ Export functions for use in other scripts
window.AuthModule = {
  getSession,
  saveSession,
  clearSession,
  isLoggedIn,
  getSessionToken,
  getCurrentUser,
  isValidEmail,
  handleLogout,
  requireAuth,
  redirectIfLoggedIn,
  initAuthUI,
  initGoogleSignIn,
  handleGoogleCallback,
  BACKEND_URL,
  GOOGLE_CLIENT_ID
};