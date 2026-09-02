const SUPABASE_URL = "https://aycsojogegvfarkbmwqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_4CTVyFAMpIbrA_AkMS6j7Q_zM4mWW8w";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;
let currentSubject = null;
let currentUnit = null;


// ========================================
// START
// ========================================

document.addEventListener("DOMContentLoaded", async () => {
  showLogin();

  const {
    data: { session }
  } = await db.auth.getSession();

  if (session) {
    await startApp(session.user);
  }

  db.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      await startApp(session.user);
    } else {
      showLoggedOut();
    }
  });
});


// ========================================
// AUTH
// ========================================

function showLogin() {
  document.getElementById("loginBox").classList.remove("hidden");
  document.getElementById("signupBox").classList.add("hidden");
}

function showSignup() {
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("signupBox").classList.remove("hidden");
}

async function signup() {
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (!name || !email || !password) {
    setMessage("authMessage", "Please fill all fields.");
    return;
  }

  const { error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name
      }
    }
  });

  if (error) {
    setMessage("authMessage", error.message);
    return;
  }

  setMessage(
    "authMessage",
    "Account created! Check your email if confirmation is required."
  );
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    setMessage("authMessage", "Enter email and password.");
    return;
  }

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setMessage("authMessage", error.message);
  }
}

async function logout() {
  await db.auth.signOut();
}

function showLoggedOut() {
  currentUser = null;
  currentProfile = null;

  document.getElementById("authSection").classList.remove("hidden");
  document.getElementById("appSection").classList.add("hidden");
  document.getElementById("adminSection").classList.add("hidden");

  document.getElementById("userArea").innerHTML = "";
}


// ========================================
// APP START
// ========================================

async function startApp(user) {
  currentUser = user;

  const { data: profile, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error(error);
    alert("Profile load error: " + error.message);
    return;
  }

  currentProfile = profile;

  document.getElementById("authSection").classList.add("hidden");
  document.getElementById("appSection").classList.remove("hidden");

  document.getElementById("welcomeText").textContent =
    `Welcome, ${profile.full_name || user.email}!`;

  document.getElementById("userArea").textContent =
    profile.full_name || user.email;

  await loadSubjects();

  if (profile.role === "admin") {
    document.getElementById("adminSection").classList.remove("hidden");

    await loadAdminSubjects();
    await loadPendingUnitNotes();
    await loadPendingSyllabus();
  } else {
    document.getElementById("adminSection").classList.add("hidden");
  }
}


// ========================================
// SUBJECTS
// ========================================

async function loadSubjects() {
  const { data, error } = await db
    .from("subjects")
    .select("*")
    .order("name");

  if (error) {
    console.error(error);
    return;
  }

  const grid = document.getElementById("subjectsGrid");
  grid.innerHTML = "";

  data.forEach(subject => {
    const card = document.createElement("div");
    card.className = "subject-card";

    card.innerHTML = `
      <h3>📘 ${escapeHtml(subject.name)}</h3>
      <p>${subject.is_announcement
        ? "Class announcements"
        : "Units & Syllabus/PDF"}</p>
    `;

    card.onclick = () => openSubject(subject);

    grid.appendChild(card);
  });
}


// ========================================
// SUBJECT VIEW
// ========================================

async function openSubject(subject) {
  currentSubject = subject;

  document.getElementById("subjectView").classList.remove("hidden");
  document.getElementById("subjectTitle").textContent = subject.name;

  document.getElementById("unitsArea").classList.add("hidden");
  document.getElementById("syllabusArea").classList.add("hidden");
  document.getElementById("announcementView").classList.add("hidden");
  document.getElementById("unitView").classList.add("hidden");

  const options = document.getElementById("subjectOptions");
  options.innerHTML = "";

  if (subject.is_announcement) {
    const announcementCard = document.createElement("div");
    announcementCard.className = "option-card";

    announcementCard.innerHTML = `
      <h3>📢 Announcements</h3>
      <p>Latest class announcements</p>
    `;

    announcementCard.onclick = loadAnnouncements;

    options.appendChild(announcementCard);

    return;
  }

  const unitsCard = document.createElement("div");
  unitsCard.className = "option-card";

  unitsCard.innerHTML = `
    <h3>📖 Units</h3>
    <p>Class notes by unit</p>
  `;

  unitsCard.onclick = () => loadUnits(subject.id);

  const syllabusCard = document.createElement("div");
  syllabusCard.className = "option-card";

  syllabusCard.innerHTML = `
    <h3>📄 Syllabus / PDF</h3>
    <p>Subject documents</p>
  `;

  syllabusCard.onclick = () => loadSyllabus(subject.id);

  options.appendChild(unitsCard);
  options.appendChild(syllabusCard);
}


// ========================================
// UNITS
// ========================================

async function loadUnits(subjectId) {
  document.getElementById("unitsArea").classList.remove("hidden");
  document.getElementById("syllabusArea").classList.add("hidden");

  const { data, error } = await db
    .from("units")
    .select("*")
    .eq("subject_id", subjectId)
    .order("unit_number");

  if (error) {
    alert(error.message);
    return;
  }

  const grid = document.getElementById("unitsGrid");
  grid.innerHTML = "";

  if (!data.length) {
    grid.innerHTML = "<p>No units added yet.</p>";
    return;
  }

  data.forEach(unit => {
    const card = document.createElement("div");
    card.className = "unit-card";

    card.innerHTML = `
      <h3>Unit ${unit.unit_number}</h3>
      <p>${escapeHtml(unit.title || "")}</p>
    `;

    card.onclick = () => openUnit(unit);

    grid.appendChild(card);
  });
}


// ========================================
// UNIT NOTES
// ========================================

async function openUnit(unit) {
  currentUnit = unit;

  document.getElementById("subjectView").classList.add("hidden");
  document.getElementById("unitView").classList.remove("hidden");

  document.getElementById("unitTitle").textContent =
    `Unit ${unit.unit_number} — ${unit.title}`;

  await loadUnitNotes(unit.id);
}

async function loadUnitNotes(unitId) {
  const list = document.getElementById("unitNotesList");
  list.innerHTML = "<p>Loading notes...</p>";

  const { data: batches, error } = await db
    .from("unit_note_batches")
    .select("*")
    .eq("unit_id", unitId)
    .eq("status", "approved")
    .order("created_at");

  if (error) {
    list.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    return;
  }

  list.innerHTML = "";

  if (!batches.length) {
    list.innerHTML = "<p>No approved notes yet.</p>";
    return;
  }

  for (const batch of batches) {

    const { data: files } = await db
      .from("unit_note_files")
      .select("*")
      .eq("batch_id", batch.id)
      .order("page_order");

    const card = document.createElement("div");
    card.className = "note-card";

    let html = `
      <h3>${escapeHtml(batch.title)}</h3>
      ${batch.description
        ? `<p>${escapeHtml(batch.description)}</p>`
        : ""}
      <small>
        ${new Date(batch.created_at).toLocaleString()}
      </small>
      <div>
    `;

    if (files) {
      for (const file of files) {
        const { data: signed } = await db.storage
          .from("notes")
          .createSignedUrl(file.file_path, 3600);

        if (signed?.signedUrl) {
          html += `
            <p>
