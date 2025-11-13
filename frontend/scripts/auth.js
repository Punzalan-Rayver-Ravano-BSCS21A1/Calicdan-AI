// scripts/auth.js
// Handles authentication, session management, and logout functionality

const BACKEND_URL = "http://127.0.0.1:8000";

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

// ✅ Handle logout - clears session on both frontend AND backend
async function handleLogout() {
  const sessionToken = getSessionToken();
  
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
document.addEventListener("DOMContentLoaded", initAuthUI);

// ✅ Re-initialize after soft navigation
document.addEventListener("soft:navigated", initAuthUI);

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
  BACKEND_URL
};
