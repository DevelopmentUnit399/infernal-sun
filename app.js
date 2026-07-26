const TEAM_PASSWORD = "CalamityAshe";
const API_BASE = "https://infernalsun.firecloud-tech.com";

// --- AUTH & UPLOAD MODAL CONTROLS ---

function openModal() {
  const modal = document.getElementById("auth-modal");
  modal.classList.add("modal--open");
  
  // Reset modal state back to Step 1 (Password Gate)
  document.getElementById("modal-step-auth").style.display = "block";
  document.getElementById("modal-step-upload").style.display = "none";
  document.getElementById("modal-password").value = "";
  
  const errorText = document.getElementById("modal-error");
  if (errorText) errorText.style.display = "none";
  
  document.getElementById("modal-password").focus();
}

function closeModal() {
  const modal = document.getElementById("auth-modal");
  const passwordInput = document.getElementById("modal-password");
  const errorText = document.getElementById("modal-error");

  modal.classList.remove("modal--open");
  if (passwordInput) passwordInput.value = "";
  if (errorText) errorText.style.display = "none";
  
  // Clear upload form fields
  const uploadForm = document.querySelector("#modal-step-upload form");
  if (uploadForm) uploadForm.reset();
  
  const statusText = document.getElementById("upload-status");
  if (statusText) statusText.textContent = "";
}

function handleAuth(event) {
  event.preventDefault();

  const passwordInput = document.getElementById("modal-password").value;
  const errorText = document.getElementById("modal-error");

  if (passwordInput === TEAM_PASSWORD) {
    // Hide password step and show upload form step inside the modal
    document.getElementById("modal-step-auth").style.display = "none";
    document.getElementById("modal-step-upload").style.display = "block";
  } else {
    errorText.textContent = "Incorrect password. Please try again.";
    errorText.style.display = "block";
  }
}

// Close modal when clicking on background overlay
window.addEventListener("click", (event) => {
  const modal = document.getElementById("auth-modal");
  if (event.target === modal) {
    closeModal();
  }
});

// --- SUBMISSION & R2 UPLOAD HANDLER ---

async function handleUpload(event) {
  event.preventDefault();
  
  const statusText = document.getElementById("upload-status");
  const uploadBtn = document.getElementById("upload-btn");

  const discord_username = document.getElementById("upload-username").value;
  const email = document.getElementById("upload-email").value;
  const description = document.getElementById("upload-description").value;
  const category = document.getElementById("upload-category").value;
  const fileInput = document.getElementById("upload-file");
  const file = fileInput.files[0];

  if (!file) return;

  try {
    uploadBtn.disabled = true;
    statusText.style.color = "#666";
    statusText.textContent = "Getting secure upload link...";

    // 1. Get Presigned URL from Backend
    const presignRes = await fetch(`${API_BASE}/api/get-upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileType: file.type, category })
    });

    if (!presignRes.ok) throw new Error("Failed to generate upload link.");
    const { uploadUrl, publicImageUrl } = await presignRes.json();

    // 2. Upload file directly to Cloudflare R2
    statusText.textContent = "Uploading image...";
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });

    if (!uploadRes.ok) throw new Error("Image upload to R2 failed.");

    // 3. Save submission record to Database (includes email)
    statusText.textContent = "Saving submission...";
    const subRes = await fetch(`${API_BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discord_username,
        email,
        description,
        category,
        image_url: publicImageUrl
      })
    });

    if (subRes.ok) {
      statusText.style.color = "green";
      statusText.textContent = "Submitted for admin approval!";
      setTimeout(() => { 
        closeModal(); 
      }, 2000);
    } else {
      throw new Error("Failed to save submission to database.");
    }

  } catch (err) {
    console.error("Upload error:", err);
    statusText.style.color = "red";
    statusText.textContent = err.message || "An error occurred during upload.";
  } finally {
    uploadBtn.disabled = false;
  }
}

// --- PUBLIC GALLERY LOADER ---

async function loadGallery(category = 'gallery') {
  const container = document.getElementById("gallery-container");
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE}/api/gallery?category=${category}`);
    const items = await response.json();

    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = `
        <header class="header">
          <p style="text-align: center; width: 100%; color: #888;">No submissions approved yet for this section.</p>
        </header>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <header class="header" style="margin-bottom: 40px;">
        <div class="gallery__card">
          <img src="${item.image_url}" alt="${item.description}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;">
          <div class="gallery__card--text">
            <h2 class="gallery__username">${item.discord_username}</h2>
            <p class="gallery__description">${item.description}</p>
          </div>
        </div>
      </header>
    `).join('');

  } catch (err) {
    console.error("Error loading gallery:", err);
    container.innerHTML = `<p style="text-align: center; color: red;">Failed to load gallery images.</p>`;
  }
}

// Initial gallery load on page ready
document.addEventListener("DOMContentLoaded", () => {
  loadGallery('gallery');
});