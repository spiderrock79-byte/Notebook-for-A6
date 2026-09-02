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
    "option-card";


  syllabusCard.innerHTML = `

    <h3>📄 Syllabus / PDF</h3>

    <p>Subject documents</p>

  `;


  syllabusCard.onclick =
    () => loadSyllabus(subject.id);


  options.appendChild(unitsCard);
  options.appendChild(syllabusCard);

}


// ========================================
// UNITS
// ========================================

async function loadUnits(subjectId) {

  document
    .getElementById("unitsArea")
    ?.classList.remove("hidden");


  document
    .getElementById("syllabusArea")
    ?.classList.add("hidden");


  const { data, error } =
    await db
      .from("units")
      .select("*")
      .eq("subject_id", subjectId)
      .order("unit_number");


  if (error) {

    alert(error.message);
    return;

  }


  const grid =
    document.getElementById("unitsGrid");

  grid.innerHTML = "";


  if (!data.length) {

    grid.innerHTML =
      "<p>No units added yet.</p>";

    return;

  }


  data.forEach(unit => {

    const card =
      document.createElement("div");

    card.className =
      "unit-card";


    card.innerHTML = `

      <h3>
        Unit ${unit.unit_number}
      </h3>

      <p>
        ${escapeHtml(unit.title || "")}
      </p>

    `;


    card.onclick =
      () => openUnit(unit);


    grid.appendChild(card);

  });

}


// ========================================
// OPEN UNIT
// ========================================

async function openUnit(unit) {

  currentUnit = unit;


  document
    .getElementById("subjectView")
    ?.classList.add("hidden");


  document
    .getElementById("unitView")
    ?.classList.remove("hidden");


  document
    .getElementById("unitTitle")
    .textContent =
      `Unit ${unit.unit_number} — ${unit.title}`;


  await loadUnitNotes(unit.id);

}


// ========================================
// LOAD UNIT NOTES
// ========================================

async function loadUnitNotes(unitId) {

  const list =
    document.getElementById("unitNotesList");

  if (!list) return;


  list.innerHTML =
    "<p>Loading notes...</p>";


  const { data: batches, error } =
    await db
      .from("unit_note_batches")
      .select("*")
      .eq("unit_id", unitId)
      .eq("status", "approved")
      .order("created_at");


  if (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;

    return;

  }


  list.innerHTML = "";


  if (!batches.length) {

    list.innerHTML =
      "<p>No approved notes yet.</p>";

    return;

  }


  for (const batch of batches) {

    const { data: files, error: fileError } =
      await db
        .from("unit_note_files")
        .select("*")
        .eq("batch_id", batch.id)
        .order("page_order");


    if (fileError) {

      console.error(fileError);
      continue;

    }


    const card =
      document.createElement("div");

    card.className =
      "note-card";


    let html = `

      <h3>
        ${escapeHtml(batch.title)}
      </h3>

      ${
        batch.description
          ? `<p>${escapeHtml(batch.description)}</p>`
          : ""
      }

      <small>
        ${new Date(batch.created_at).toLocaleString()}
      </small>

      <div>

    `;


    for (const file of files || []) {

      const { data: signed, error: signedError } =
        await db.storage
          .from("notes")
          .createSignedUrl(
            file.file_path,
            3600
          );


      if (signed?.signedUrl) {

        html += `

          <p>

            📎 ${escapeHtml(file.file_name)}

            <br>

            <a
              href="${signed.signedUrl}"
              target="_blank"
              rel="noopener"
            >
              Open / Download
            </a>

          </p>

        `;

      } else {

        console.error(
          "Signed URL error:",
          signedError
        );

      }

    }


    html += "</div>";


    card.innerHTML = html;

    list.appendChild(card);

  }

}


// ========================================
// UPLOAD UNIT DROPDOWN
// ========================================

async function loadUploadUnits() {

  const subjectId =
    document.getElementById("uploadSubject").value;


  const unitSelect =
    document.getElementById("uploadUnit");


  if (!unitSelect) return;


  unitSelect.innerHTML =
    `<option value="">Select Unit</option>`;


  if (!subjectId) return;


  const { data, error } =
    await db
      .from("units")
      .select("*")
      .eq("subject_id", subjectId)
      .order("unit_number");


  if (error) {

    alert(error.message);
    return;

  }


  data.forEach(unit => {

    const option =
      document.createElement("option");


    option.value =
      unit.id;


    option.textContent =
      `Unit ${unit.unit_number} — ${unit.title}`;


    unitSelect.appendChild(option);

  });

}


// ========================================
// UPLOAD UNIT NOTES
// ========================================

async function uploadUnitNotes() {

  if (!currentUser || !currentProfile) {

    setMessage(
      "uploadMessage",
      "Please login first."
    );

    return;

  }


  const unitId =
    document.getElementById("uploadUnit").value;


  const title =
    document
      .getElementById("uploadTitle")
      .value
      .trim();


  const description =
    document
      .getElementById("uploadDescription")
      .value
      .trim();


  const files =
    document.getElementById("noteFiles").files;


  if (!unitId) {

    setMessage(
      "uploadMessage",
      "Select a unit."
    );

    return;

  }


  if (!title) {

    setMessage(
      "uploadMessage",
      "Enter upload title."
    );

    return;

  }


  if (!files.length) {

    setMessage(
      "uploadMessage",
      "Select at least one file."
    );

    return;

  }


  setMessage(
    "uploadMessage",
    "Uploading..."
  );


  const { data: batch, error: batchError } =
    await db
      .from("unit_note_batches")
      .insert({

        unit_id: unitId,
        title: title,
        description: description || null,
        uploaded_by: currentUser.id,
        uploaded_by_name:
          currentProfile.full_name || currentUser.email,
        status: "pending"

      })
      .select()
      .single();


  if (batchError) {

    setMessage(
      "uploadMessage",
      batchError.message
    );

    return;

  }


  let pageOrder = 1;


  for (const file of files) {

    const safeName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );


    const path =
      `${currentUser.id}/unit/${batch.id}/${pageOrder}_${safeName}`;


    const { error: uploadError } =
      await db.storage
        .from("notes")
        .upload(
          path,
          file,
          {
            cacheControl: "3600",
            upsert: false
          }
        );


    if (uploadError) {

      setMessage(
        "uploadMessage",
        "File upload failed: " +
        uploadError.message
      );

      return;

    }


    const { error: fileError } =
      await db
        .from("unit_note_files")
        .insert({

          batch_id: batch.id,
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          page_order: pageOrder

        });


    if (fileError) {

      setMessage(
        "uploadMessage",
        fileError.message
      );

      return;

    }


    pageOrder++;

  }


  setMessage(
    "uploadMessage",
    "✅ Uploaded successfully. Waiting for admin approval."
  );


  document.getElementById("uploadTitle").value = "";
  document.getElementById("uploadDescription").value = "";
  document.getElementById("noteFiles").value = "";

}


// ========================================
// ADMIN SUBJECT DROPDOWNS
// ========================================

async function loadAdminSubjects() {

  const { data, error } =
    await db
      .from("subjects")
      .select("*")
      .order("name");


  if (error) {

    console.error(error);
    return;

  }


  const selects = [

    document.getElementById("adminSubject"),
    document.getElementById("syllabusSubject")

  ];


  selects.forEach(select => {

    if (!select) return;


    select.innerHTML =
      `<option value="">Select Subject</option>`;


    data
      .filter(subject => !subject.is_announcement)
      .forEach(subject => {

        const option =
          document.createElement("option");

        option.value =
          subject.id;

        option.textContent =
          subject.name;

        select.appendChild(option);

      });

  });

}


// ========================================
// CREATE UNIT
// ========================================

async function createUnit() {

  if (currentProfile?.role !== "admin") {

    setMessage(
      "adminMessage",
      "Admin only."
    );

    return;

  }


  const subjectId =
    document.getElementById("adminSubject").value;


  const unitNumber =
    Number(
      document.getElementById("newUnitNumber").value
    );


  const title =
    document
      .getElementById("newUnitTitle")
      .value
      .trim();


  if (!subjectId || !unitNumber || !title) {

    setMessage(
      "adminMessage",
      "Select subject, unit number and title."
    );

    return;

  }


  const { error } =
    await db
      .from("units")
      .insert({

        subject_id: subjectId,
        unit_number: unitNumber,
        title: title

      });


  if (error) {

    setMessage(
      "adminMessage",
      error.message
    );

    return;

  }


  setMessage(
    "adminMessage",
    "✅ Unit created successfully."
  );


  document.getElementById("newUnitNumber").value = "";
  document.getElementById("newUnitTitle").value = "";


  await loadSubjects();

}


// ========================================
// PENDING UNIT NOTES
// ========================================

async function loadPendingUnitNotes() {

  const list =
    document.getElementById("pendingUnitNotes");

  if (!list) return;


  const { data, error } =
    await db
      .from("unit_note_batches")
      .select(`
        *,
        units (
          unit_number,
          title,
          subjects (
            name
          )
        )
      `)
      .eq("status", "pending")
      .order("created_at");


  if (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;

    return;

  }


  list.innerHTML = "";


  if (!data.length) {

    list.innerHTML =
      "<p>No pending unit notes.</p>";

    return;

  }


  data.forEach(batch => {

    const item =
      document.createElement("div");

    item.className =
      "admin-item";


    const subjectName =
      batch.units?.subjects?.name || "";


    const unitText =
      batch.units
        ? `Unit ${batch.units.unit_number} — ${batch.units.title}`
        : "";


    item.innerHTML = `

      <h3>
        ${escapeHtml(batch.title)}
      </h3>

      <p>
        📘 ${escapeHtml(subjectName)}
      </p>

      <p>
        ${escapeHtml(unitText)}
      </p>

      <p>
        Uploaded by:
        ${escapeHtml(batch.uploaded_by_name || "Unknown")}
      </p>

      ${
        batch.description
          ? `<p>${escapeHtml(batch.description)}</p>`
          : ""
      }

      <button
        class="primary"
        onclick="reviewUnitNote('${batch.id}', 'approved')"
      >
        ✅ Approve
      </button>

      <button
        onclick="reviewUnitNote('${batch.id}', 'rejected')"
      >
        ❌ Reject
      </button>

    `;


    list.appendChild(item);

  });

}


// ========================================
// REVIEW UNIT NOTE
// ========================================

async function reviewUnitNote(batchId, status) {

  if (currentProfile?.role !== "admin") return;


  const { error } =
    await db
      .from("unit_note_batches")
      .update({

        status: status,
        reviewed_at: new Date().toISOString()

      })
      .eq("id", batchId);


  if (error) {

    alert(error.message);
    return;

  }


  await loadPendingUnitNotes();
  await loadApprovedAdminNotes();

}


// ========================================
// APPROVED UNIT NOTES - ADMIN
// ========================================

async function loadApprovedAdminNotes() {

  const list =
    document.getElementById("approvedAdminNotes");

  if (!list) return;


  const { data, error } =
    await db
      .from("unit_note_batches")
      .select(`
        *,
        units (
          unit_number,
          title,
          subjects (
            name
          )
        )
      `)
      .eq("status", "approved")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;

    return;

  }


  list.innerHTML = "";


  if (!data.length) {

    list.innerHTML =
      "<p>No approved notes yet.</p>";

    return;

  }


  data.forEach(batch => {

    const item =
      document.createElement("div");

    item.className =
      "admin-item";


    const subjectName =
      batch.units?.subjects?.name || "";


    item.innerHTML = `

      <h3>
        ${escapeHtml(batch.title)}
      </h3>

      <p>
        📘 ${escapeHtml(subjectName)}
      </p>

      <p>
        Unit ${batch.units?.unit_number || ""}
        —
        ${escapeHtml(batch.units?.title || "")}
      </p>

      <button
        onclick="deleteUnitNote('${batch.id}')"
      >
        🗑️ Delete
      </button>

    `;


    list.appendChild(item);

  });

}


// ========================================
// DELETE UNIT NOTE
// ========================================

async function deleteUnitNote(batchId) {

  if (currentProfile?.role !== "admin") return;


  const ok =
    confirm(
      "Delete this complete note collection?"
    );


  if (!ok) return;


  const { data: files, error: fileError } =
    await db
      .from("unit_note_files")
      .select("file_path")
      .eq("batch_id", batchId);


  if (fileError) {

    alert(fileError.message);
    return;

  }


  if (files?.length) {

    const paths =
      files.map(file => file.file_path);


    const { error: storageError } =
      await db.storage
        .from("notes")
        .remove(paths);


    if (storageError) {

      console.error(storageError);

    }

  }


  const { error } =
    await db
      .from("unit_note_batches")
      .delete()
      .eq("id", batchId);


  if (error) {

    alert(error.message);
    return;

  }


  await loadApprovedAdminNotes();

}


// ========================================
// SYLLABUS UPLOAD
// ========================================

async function uploadSyllabus() {

  if (currentProfile?.role !== "admin") {

    setMessage(
      "syllabusMessage",
      "Admin only."
    );

    return;

  }


  const subjectId =
    document.getElementById("syllabusSubject").value;


  const title =
    document
      .getElementById("syllabusTitle")
      .value
      .trim();


  const description =
    document
      .getElementById("syllabusDescription")
      .value
      .trim();


  const file =
    document
      .getElementById("syllabusFile")
      .files[0];


  if (!subjectId || !title || !file) {

    setMessage(
      "syllabusMessage",
      "Select subject, title and file."
    );

    return;

  }


  setMessage(
    "syllabusMessage",
    "Uploading..."
  );


  const safeName =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );


  const path =
    `${currentUser.id}/syllabus/${Date.now()}_${safeName}`;


  const { error: uploadError } =
    await db.storage
      .from("notes")
      .upload(
        path,
        file,
        {
          cacheControl: "3600",
          upsert: false
        }
      );


  if (uploadError) {

    setMessage(
      "syllabusMessage",
      uploadError.message
    );

    return;

  }


  const { error } =
    await db
      .from("syllabus_documents")
      .insert({

        subject_id: subjectId,
        title: title,
        description: description || null,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        uploaded_by: currentUser.id,
        uploaded_by_name:
          currentProfile.full_name || currentUser.email,

        // Admin uploads are immediately approved
        status: "approved",

        reviewed_at:
          new Date().toISOString()

      });


  if (error) {

    alert(error.message);
    return;

  }


  setMessage(
    "syllabusMessage",
    "✅ Syllabus uploaded successfully."
  );


  document.getElementById("syllabusTitle").value = "";
  document.getElementById("syllabusDescription").value = "";
  document.getElementById("syllabusFile").value = "";


  await loadPendingSyllabus();

}


// ========================================
// LOAD SYLLABUS
// ========================================

async function loadSyllabus(subjectId) {

  document
    .getElementById("syllabusArea")
    ?.classList.remove("hidden");


  document
    .getElementById("unitsArea")
    ?.classList.add("hidden");


  const list =
    document.getElementById("syllabusList");

  if (!list) return;


  list.innerHTML =
    "<p>Loading syllabus...</p>";


  const { data, error } =
    await db
      .from("syllabus_documents")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("status", "approved")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;

    return;

  }


  list.innerHTML = "";


  if (!data.length) {

    list.innerHTML =
      "<p>No syllabus/PDF uploaded yet.</p>";

    return;

  }


  for (const doc of data) {

    const { data: signed } =
      await db.storage
        .from("notes")
        .createSignedUrl(
          doc.file_path,
          3600
        );


    const card =
      document.createElement("div");

    card.className =
      "note-card";


    let link = "";


    if (signed?.signedUrl) {

      link = `
        <a
          href="${signed.signedUrl}"
          target="_blank"
          rel="noopener"
        >
          📄 Open / Download
        </a>
      `;

    }


    card.innerHTML = `

      <h3>
        ${escapeHtml(doc.title)}
      </h3>

      ${
        doc.description
          ? `<p>${escapeHtml(doc.description)}</p>`
          : ""
      }

      <p>
        ${escapeHtml(doc.file_name)}
      </p>

      ${link}

    `;


    list.appendChild(card);

  }

}


// ========================================
// PENDING SYLLABUS
// ========================================

async function loadPendingSyllabus() {

  const list =
    document.getElementById("pendingSyllabus");

  if (!list) return;


  const { data, error } =
    await db
      .from("syllabus_documents")
      .select(`
        *,
        subjects (
          name
        )
      `)
      .eq("status", "pending")
      .order("created_at");


  if (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;

    return;

  }


  list.innerHTML = "";


  if (!data.length) {

    list.innerHTML =
      "<p>No pending syllabus documents.</p>";

    return;

  }


  data.forEach(doc => {

    const item =
      document.createElement("div");

    item.className =
      "admin-item";


    item.innerHTML = `

      <h3>
        ${escapeHtml(doc.title)}
      </h3>

      <p>
        📘 ${escapeHtml(doc.subjects?.name || "")}
      </p>

      <p>
        ${escapeHtml(doc.file_name)}
      </p>

      <button
        class="primary"
        onclick="reviewSyllabus('${doc.id}', 'approved')"
      >
        ✅ Approve
      </button>

      <button
        onclick="reviewSyllabus('${doc.id}', 'rejected')"
      >
        ❌ Reject
      </button>

    `;


    list.appendChild(item);

  });

}


// ========================================
// REVIEW SYLLABUS
// ========================================

async function reviewSyllabus(id, status) {

  if (currentProfile?.role !== "admin") return;


  const { error } =
    await db
      .from("syllabus_documents")
      .update({

        status: status,
        reviewed_at:
          new Date().toISOString()

      })
      .eq("id", id);


  if (error) {

    alert(error.message);
    return;

  }


  await loadPendingSyllabus();

}


// ========================================
// CREATE ANNOUNCEMENT
// ========================================

async function createAnnouncement() {

  if (currentProfile?.role !== "admin") {

    setMessage(
      "adminMessage",
      "Admin only."
    );

    return;

  }


  const title =
    document
      .getElementById("announcementTitle")
      .value
      .trim();


  const content =
    document
      .getElementById("announcementContent")
      .value
      .trim();


  const file =
    document
      .getElementById("announcementFile")
      ?.files[0];


  if (!title || !content) {

    setMessage(
      "adminMessage",
      "Enter announcement title and content."
    );

    return;

  }


  let attachmentPath = null;
  let attachmentName = null;
  let attachmentType = null;


  if (file) {

    const safeName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );


    attachmentPath =
      `${currentUser.id}/announcements/${Date.now()}_${safeName}`;


    const { error: uploadError } =
      await db.storage
        .from("notes")
        .upload(
          attachmentPath,
          file,
          {
            cacheControl: "3600",
            upsert: false
          }
        );


    if (uploadError) {

      setMessage(
        "adminMessage",
        "Attachment upload failed: " +
        uploadError.message
      );

      return;

    }


    attachmentName = file.name;
    attachmentType = file.type;

  }


  const { error } =
    await db
      .from("class_announcements")
      .insert({

        title: title,
        content: content,
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        created_by: currentUser.id,
        created_by_name:
          currentProfile.full_name || currentUser.email

      });


  if (error) {

    setMessage(
      "adminMessage",
      error.message
    );

    return;

  }


  setMessage(
    "adminMessage",
    "✅ Announcement created."
  );


  document.getElementById("announcementTitle").value = "";
  document.getElementById("announcementContent").value = "";

  if (document.getElementById("announcementFile")) {
    document.getElementById("announcementFile").value = "";
  }

}


// ========================================
// LOAD ANNOUNCEMENTS
// ========================================

async function loadAnnouncements() {

  document
    .getElementById("subjectView")
    ?.classList.add("hidden");


  document
    .getElementById("announcementView")
    ?.classList.remove("hidden");


  const list =
    document.getElementById("announcementList");

  if (!list) return;


  list.innerHTML =
    "<p>Loading announcements...</p>";


  const { data, error } =
    await db
      .from("class_announcements")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;

    return;

  }


  list.innerHTML = "";


  if (!data.length) {

    list.innerHTML =
      "<p>No announcements yet.</p>";

    return;

  }


  for (const announcement of data) {

    const card =
      document.createElement("div");

    card.className =
      "announcement-card";


    let attachmentHTML = "";


    if (announcement.attachment_path) {

      const { data: signed } =
        await db.storage
          .from("notes")
          .createSignedUrl(
            announcement.attachment_path,
            3600
          );


      if (signed?.signedUrl) {

        attachmentHTML = `

          <p>
            📎
            ${escapeHtml(
              announcement.attachment_name || "Attachment"
            )}

            <br>

            <a
              href="${signed.signedUrl}"
              target="_blank"
              rel="noopener"
            >
              Open attachment
            </a>
          </p>

        `;

      }

    }


    card.innerHTML = `

      <h3>
        📢 ${escapeHtml(announcement.title)}
      </h3>

      <p>
        ${escapeHtml(announcement.content)}
      </p>

      <small>
        ${new Date(
          announcement.created_at
        ).toLocaleString()}
      </small>

      ${attachmentHTML}

    `;


    list.appendChild(card);

  }

}


// ========================================
// NAVIGATION
// ========================================


function backToSubjects() {

  document
    .getElementById("subjectView")
    ?.classList.add("hidden");

  document
    .getElementById("unitView")
    ?.classList.add("hidden");

  document
    .getElementById("announcementView")
    ?.classList.add("hidden");

}


function backToSubject() {

  document
    .getElementById("unitView")
    ?.classList.add("hidden");

  document
    .getElementById("subjectView")
    ?.classList.remove("hidden");

}


// ========================================
// MESSAGE
// ========================================

function setMessage(id, message) {

  const element =
    document.getElementById(id);

  if (element) {

    element.textContent =
      message;

  }

}


// ========================================
// SECURITY / HTML ESCAPE
// ========================================

function escapeHtml(text) {

  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
