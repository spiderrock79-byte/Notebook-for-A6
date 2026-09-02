const SUPABASE_URL = "https://aycsojogegvfarkbmwqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_4CTVyFAMpIbrA_AkMS6j7Q_zM4mWW8w";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;
let currentSubject = null;
let currentUnit = null;


// ========================================
// PAGE START
// ========================================

document.addEventListener("DOMContentLoaded", async () => {

  showLogin();

  const {
    data: { session }
  } = await db.auth.getSession();

  if (session) {
    await startApp(session.user);
  }

  db.auth.onAuthStateChange((event, session) => {

    setTimeout(async () => {

      if (session) {
        await startApp(session.user);
      } else {
        showLoggedOut();
      }

    }, 0);

  });

});


// ========================================
// AUTH UI
// ========================================

function showLogin() {

  document.getElementById("loginBox")?.classList.remove("hidden");
  document.getElementById("signupBox")?.classList.add("hidden");

}

function showSignup() {

  document.getElementById("loginBox")?.classList.add("hidden");
  document.getElementById("signupBox")?.classList.remove("hidden");

}


// ========================================
// SIGNUP
// ========================================

async function signup() {

  const name =
    document.getElementById("signupName").value.trim();

  const email =
    document.getElementById("signupEmail").value.trim();

  const password =
    document.getElementById("signupPassword").value;


  if (!name || !email || !password) {

    setMessage(
      "authMessage",
      "Please fill all fields."
    );

    return;
  }


  setMessage(
    "authMessage",
    "Creating account..."
  );


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

    setMessage(
      "authMessage",
      error.message
    );

    return;
  }


  if (data.session) {

    setMessage(
      "authMessage",
      "Account created successfully."
    );

    await startApp(data.user);

  } else {

    setMessage(
      "authMessage",
      "Account created! Check your email if confirmation is required."
    );

  }

}


// ========================================
// LOGIN
// ========================================

async function login() {

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;


  if (!email || !password) {

    setMessage(
      "authMessage",
      "Enter email and password."
    );

    return;

  }


  setMessage(
    "authMessage",
    "Logging in..."
  );


  const { data, error } =
    await db.auth.signInWithPassword({

      email,
      password

    });


  if (error) {

    setMessage(
      "authMessage",
      "Login failed: " + error.message
    );

    return;

  }


  if (data?.user) {

    await startApp(data.user);

  }

}


// ========================================
// LOGOUT
// ========================================

async function logout() {

  const { error } =
    await db.auth.signOut();

  if (error) {

    alert(error.message);
    return;

  }

  showLoggedOut();

}


// ========================================
// LOGGED OUT SCREEN
// ========================================

function showLoggedOut() {

  currentUser = null;
  currentProfile = null;
  currentSubject = null;
  currentUnit = null;


  document
    .getElementById("authSection")
    ?.classList.remove("hidden");


  document
    .getElementById("appSection")
    ?.classList.add("hidden");


  document
    .getElementById("adminSection")
    ?.classList.add("hidden");


  const userArea =
    document.getElementById("userArea");

  if (userArea) {
    userArea.innerHTML = "";
  }

}


// ========================================
// START APP
// ========================================

async function startApp(user) {

  if (!user) return;


  currentUser = user;


  const { data: profile, error } =
    await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();


  if (error) {

    console.error("Profile error:", error);

    setMessage(
      "authMessage",
      "Profile load error: " + error.message
    );

    return;

  }


  if (!profile) {

    setMessage(
      "authMessage",
      "Profile not found."
    );

    return;

  }


  currentProfile = profile;


  document
    .getElementById("authSection")
    ?.classList.add("hidden");


  document
    .getElementById("appSection")
    ?.classList.remove("hidden");


  const welcomeText =
    document.getElementById("welcomeText");

  if (welcomeText) {

    welcomeText.textContent =
      `Welcome, ${profile.full_name || user.email}!`;

  }


  const userArea =
    document.getElementById("userArea");

  if (userArea) {

    userArea.textContent =
      profile.full_name || user.email;

  }


  // Load subjects for EVERY logged-in user
  await loadSubjects();
  await loadUploadSubjectSelect();


  if (profile.role === "admin") {

    document
      .getElementById("adminSection")
      ?.classList.remove("hidden");


    await loadAdminSubjects();
    await loadPendingUnitNotes();
    await loadPendingSyllabus();
    await loadApprovedAdminNotes();

  } else {

    document
      .getElementById("adminSection")
      ?.classList.add("hidden");

  }

}


// ========================================
// LOAD SUBJECTS
// ========================================

async function loadSubjects() {

  const { data, error } =
    await db
      .from("subjects")
      .select("*")
      .order("name");


  if (error) {

    console.error(error);

    setMessage(
      "authMessage",
      "Subjects load error: " + error.message
    );

    return;

  }


  const grid =
    document.getElementById("subjectsGrid");

  if (!grid) return;


  grid.innerHTML = "";


  data.forEach(subject => {

    const card =
      document.createElement("div");

    card.className =
      "subject-card";


    card.innerHTML = `

      <h3>
        📘 ${escapeHtml(subject.name)}
      </h3>

      <p>
        ${
          subject.is_announcement
            ? "Class announcements"
            : "Units & Syllabus/PDF"
        }
      </p>

    `;


    card.onclick =
      () => openSubject(subject);


    grid.appendChild(card);

  });

}


// ========================================
// SUBJECT DROPDOWN FOR STUDENTS
// ========================================

async function loadUploadSubjectSelect() {

  const select =
    document.getElementById("uploadSubject");

  if (!select) return;


  const { data, error } =
    await db
      .from("subjects")
      .select("*")
      .eq("is_announcement", false)
      .order("name");


  if (error) {

    console.error(error);
    return;

  }


  select.innerHTML =
    `<option value="">Select Subject</option>`;


  data.forEach(subject => {

    const option =
      document.createElement("option");

    option.value =
      subject.id;

    option.textContent =
      subject.name;

    select.appendChild(option);

  });

}


// ========================================
// SUBJECT VIEW
// ========================================

async function openSubject(subject) {

  currentSubject = subject;


  document
    .getElementById("subjectView")
    ?.classList.remove("hidden");


  document
    .getElementById("subjectTitle")
    .textContent =
      subject.name;


  document
    .getElementById("subjectOptions")
    .innerHTML = "";


  document
    .getElementById("unitsArea")
    ?.classList.add("hidden");


  document
    .getElementById("syllabusArea")
    ?.classList.add("hidden");


  document
    .getElementById("unitView")
    ?.classList.add("hidden");


  document
    .getElementById("announcementView")
    ?.classList.add("hidden");


  const options =
    document.getElementById("subjectOptions");


  if (subject.is_announcement) {

    const card =
      document.createElement("div");

    card.className =
      "option-card";


    card.innerHTML = `

      <h3>📢 Announcements</h3>

      <p>Latest class announcements</p>

    `;


    card.onclick =
      () => loadAnnouncements();


    options.appendChild(card);

    return;

  }


  const unitsCard =
    document.createElement("div");

  unitsCard.className =
    "option-card";


  unitsCard.innerHTML = `

    <h3>📖 Units</h3>

    <p>Class notes by unit</p>

  `;


  unitsCard.onclick =
    () => loadUnits(subject.id);


  const syllabusCard =
    document.createElement("div");

  syllabusCard.className =
   
