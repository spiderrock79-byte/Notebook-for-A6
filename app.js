const SUPABASE_URL = "https://aycsojogegvfarkbmwqr.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_4CTVyFAMpIbrA_AkMS6j7Q_zM4mWW8w";

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// -------------------------
// Open / Close popup
// -------------------------

function openLogin() {
  document.getElementById("authModal").style.display = "flex";
  showLogin();
}

function openSignup() {
  document.getElementById("authModal").style.display = "flex";
  showSignup();
}

function closeAuth() {
  document.getElementById("authModal").style.display = "none";
  document.getElementById("authMessage").textContent = "";
}

function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("signupForm").style.display = "none";
}

function showSignup() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("signupForm").style.display = "block";
}


// -------------------------
// Create Account
// -------------------------

async function signup() {

  const name =
    document.getElementById("signupName").value.trim();

  const email =
    document.getElementById("signupEmail").value.trim();

  const password =
    document.getElementById("signupPassword").value;

  const message =
    document.getElementById("authMessage");

  if (!name || !email || !password) {
    message.textContent = "Please fill all fields.";
    return;
  }

  if (password.length < 6) {
    message.textContent =
      "Password must be at least 6 characters.";
    return;
  }

  message.textContent = "Creating account...";

  const { data, error } = await db.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: name
      }
    }
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  if (data.user) {
    message.textContent =
      "Account created! Check your email if verification is required.";
  }
}


// -------------------------
// Login
// -------------------------

async function login() {

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  const message =
    document.getElementById("authMessage");

  if (!email || !password) {
    message.textContent = "Enter email and password.";
    return;
  }

  message.textContent = "Logging in...";

  const { data, error } =
    await db.auth.signInWithPassword({
      email: email,
      password: password
    });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = "Login successful!";

  closeAuth();
  updateUser(data.user);
}


// -------------------------
// Logout
// -------------------------

async function logout() {

  await db.auth.signOut();

  document.getElementById("authButtons").style.display = "block";
  document.getElementById("userArea").style.display = "none";
}


// -------------------------
// Show logged-in user
// -------------------------

function updateUser(user) {

  if (!user) return;

  document.getElementById("authButtons").style.display = "none";
  document.getElementById("userArea").style.display = "block";

  const name =
    user.user_metadata?.full_name || user.email;

  document.getElementById("welcomeUser").textContent =
    "Welcome, " + name + "!";
}


// -------------------------
// Check current login
// -------------------------

async function checkUser() {

  const { data } = await db.auth.getUser();

  if (data.user) {
    updateUser(data.user);
  }
}


// Listen for login/logout
db.auth.onAuthStateChange((event, session) => {

  if (session?.user) {
    updateUser(session.user);
  }

});


// Start
checkUser();
