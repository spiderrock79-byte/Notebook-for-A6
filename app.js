const SUPABASE_URL =
  "https://aycsojogegvfarkbmwqr.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_4CTVyFAMpIbrA_AkMS6j7Q_zM4mWW8w";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==========================
// AUTH POPUP
// ==========================

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


// ==========================
// SIGNUP
// ==========================

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

  const { data, error } =
    await db.auth.signUp({
      email,
      password,
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

  message.textContent =
    "Account created! Check your email if verification is required.";
}


// ==========================
// LOGIN
// ==========================

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
      email,
      password
    });

  if (error) {
    message.textContent = error.message;
    return;
  }

  closeAuth();

  await setupUser(data.user);
}


// ==========================
// LOGOUT
// ==========================

async function logout() {

  await db.auth.signOut();

  document.getElementById("authButtons").style.display = "block";
  document.getElementById("userArea").style.display = "none";

  document.getElementById("uploadSection").style.display = "none";
  document.getElementById("adminSection").style.display = "none";

  loadApprovedNotes();
}


// ==========================
// USER SETUP
// ==========================

async function setupUser(user) {

  if (!user) return;

  document.getElementById("authButtons").style.display = "none";
  document.getElementById("userArea").style.display = "block";

  const name =
    user.user_metadata?.full_name || user.email;

  document.getElementById("welcomeUser").textContent =
    "Welcome, " + name + "!";

  // Everyone logged in can upload
  document.getElementById("uploadSection").style.display = "block";

  // Check admin role
  const { data: profile, error } =
    await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (!error && profile?.role === "admin") {

    document.getElementById("adminSection").style.display =
      "block";

    loadPendingNotes();
  }

  loadApprovedNotes();
}


// ==========================
// UPLOAD NOTE
// ==========================

async function uploadNote() {

  const title =
    document.getElementById("noteTitle").value.trim();

  const subject =
    document.getElementById("noteSubject").value.trim();

  const description =
    document.getElementById("noteDescription").value.trim();

  const file =
    document.getElementById("noteFile").files[0];

  const message =
    document.getElementById("uploadMessage");

  if (!title || !subject || !file) {
    message.textContent =
      "Title, subject and PDF are required.";
    return;
  }

  if (file.type !== "application/pdf") {
    message.textContent =
      "Only PDF files are allowed.";
    return;
  }

  message.textContent = "Uploading...";

  const { data: userData } =
    await db.auth.getUser();

  const user = userData.user;

  if (!user) {
    message.textContent =
      "Please login first.";
    return;
  }

  // Create unique file path
  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const filePath =
    user.id + "/" + Date.now() + "_" + safeName;


  // Upload PDF to Supabase Storage

  const { error: storageError } =
    await db.storage
      .from("notes")
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: false
      });

  if (storageError) {
    message.textContent =
      "File upload failed: " +
      storageError.message;
    return;
  }


  // Add note information to database

  const { error: noteError } =
    await db
      .from("notes")
      .insert({
        title: title,
        subject: subject,
        description: description || null,
        file_path: filePath,
        file_name: file.name,
        uploaded_by: user.id,
        uploaded_by_name:
          user.user_metadata?.full_name ||
          user.email,
        status: "pending"
      });

  if (noteError) {

    // Remove uploaded file if database insert fails
    await db.storage
      .from("notes")
      .remove([filePath]);

    message.textContent =
      "Database error: " +
      noteError.message;

    return;
  }


  message.textContent =
    "✅ Note uploaded! Waiting for admin approval.";

  document.getElementById("noteTitle").value = "";
  document.getElementById("noteSubject").value = "";
  document.getElementById("noteDescription").value = "";
  document.getElementById("noteFile").value = "";
}


// ==========================
// LOAD APPROVED NOTES
// ==========================

async function loadApprovedNotes() {

  const container =
    document.getElementById("approvedNotes");

  container.innerHTML =
    "Loading notes...";

  const { data, error } =
    await db
      .from("notes")
      .select("*")
      .eq("status", "approved")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    container.innerHTML =
      "Could not load notes.";
    console.log(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML =
      "<p>No approved notes yet.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach(note => {

    const card =
      document.createElement("div");

    card.className = "note-card";

    card.innerHTML = `
      <h3>📄 ${escapeHtml(note.title)}</h3>

      <p><b>Subject:</b>
        ${escapeHtml(note.subject)}
      </p>

      <p>
        ${escapeHtml(note.description || "")}
      </p>

      <p>
        <b>Uploaded by:</b>
        ${escapeHtml(note.uploaded_by_name)}
      </p>

      <button onclick="downloadNote('${note.file_path}')">
        📥 View / Download PDF
      </button>
    `;

    container.appendChild(card);
  });
}


// ==========================
// DOWNLOAD APPROVED NOTE
// ==========================

async function downloadNote(filePath) {

  const { data, error } =
    await db.storage
      .from("notes")
      .createSignedUrl(filePath, 60);

  if (error) {
    alert(
      "Could not open file: " +
      error.message
    );
    return;
  }

  window.open(data.signedUrl, "_blank");
}


// ==========================
// ADMIN: LOAD PENDING NOTES
// ==========================

async function loadPendingNotes() {

  const container =
    document.getElementById("pendingNotes");

  container.innerHTML =
    "Loading pending notes...";

  const { data, error } =
    await db
      .from("notes")
      .select("*")
      .eq("status", "pending")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    container.innerHTML =
      "Could not load pending notes: " +
      error.message;

    console.log(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML =
      "<p>🎉 No pending notes.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach(note => {

    const card =
      document.createElement("div");

    card.className = "note-card";

    card.innerHTML = `
      <h3>📄 ${escapeHtml(note.title)}</h3>

      <p>
        <b>Subject:</b>
        ${escapeHtml(note.subject)}
      </p>

      <p>
        <b>Uploaded by:</b>
        ${escapeHtml(note.uploaded_by_name)}
      </p>

      <p>
        ${escapeHtml(note.description || "")}
      </p>

      <button onclick="reviewNote('${note.id}', 'approved')">
        ✅ Approve
      </button>

      <button onclick="reviewNote('${note.id}', 'rejected')">
        ❌ Reject
      </button>

      <button onclick="downloadNote('${note.file_path}')">
        👀 View PDF
      </button>
    `;

    container.appendChild(card);
  });
}


// ==========================
// ADMIN: APPROVE / REJECT
// ==========================

async function reviewNote(noteId, status) {

  const action =
    status === "approved"
      ? "approve"
      : "reject";

  const confirmed =
    confirm(
      "Are you sure you want to " +
      action +
      " this note?"
    );

  if (!confirmed) return;

  const { error } =
    await db
      .from("notes")
      .update({
        status: status,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", noteId);

  if (error) {

    alert(
      "Action failed: " +
      error.message
    );

    return;
  }

  alert(
    status === "approved"
      ? "✅ Note approved!"
      : "❌ Note rejected!"
  );

  loadPendingNotes();
  loadApprovedNotes();
}


// ==========================
// SIMPLE HTML SAFETY
// ==========================

function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


// ==========================
// AUTH STATE
// ==========================

db.auth.onAuthStateChange(
  async (event, session) => {

    if (session?.user) {
      await setupUser(session.user);
    }

  }
);


// ==========================
// START WEBSITE
// ==========================

async function startApp() {

  const { data } =
    await db.auth.getUser();

  if (data.user) {
    await setupUser(data.user);
  } else {
    loadApprovedNotes();
  }
}

startApp();
