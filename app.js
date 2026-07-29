const TEAM_PASSWORD = "CalamityAshe";
const API_BASE = "https://infernalsun.firecloud-tech.com";
let isModalOpen = false
let contrastToggle = true
const scaleFactor = 1 / 20

function moveBackground(event) {
  const shapes = document.querySelectorAll(".shape")
  const x = event.clientX * scaleFactor
  const y = event.clientY * scaleFactor

  for (let i = 0; i < shapes.length; ++i) {
    const isOdd = i % 2 !== 0
    const boolInt = isOdd ? -1 : 1
    shapes[i].style.transform = `translate(${x * boolInt}px, ${y * boolInt}px)`
  }
}

function toggleContrast() {
  contrastToggle = !contrastToggle
  if (contrastToggle) {
    document.body.classList += " dark--theme"
  }
  else {
    document.body.classList.remove("dark--theme")
  }
}

// Module-level lock to prevent double execution
let isUploading = false;

// --- AUTH & UPLOAD MODAL CONTROLS ---

function openModal() {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
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

  if (modal) modal.classList.remove("modal--open");
  if (passwordInput) passwordInput.value = "";
  if (errorText) errorText.style.display = "none";
  
  // Clear upload form fields
  const uploadForm = document.querySelector("#modal-step-upload form");
  if (uploadForm) uploadForm.reset();
  
  const statusText = document.getElementById("upload-status");
  if (statusText) {
    statusText.textContent = "";
    statusText.style.color = "#666";
  }

  const uploadBtn = document.getElementById("upload-btn");
  if (uploadBtn) {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload & Submit";
  }

  // Reset upload execution flag
  isUploading = false;
}

function handleAuth(event) {
  if (event) event.preventDefault();

  const passwordInput = document.getElementById("modal-password")?.value || "";
  const errorText = document.getElementById("modal-error");

  if (passwordInput === TEAM_PASSWORD) {
    // Hide password step and show upload form step inside the modal
    document.getElementById("modal-step-auth").style.display = "none";
    document.getElementById("modal-step-upload").style.display = "block";
  } else if (errorText) {
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
  if (event) event.preventDefault();

  console.log("--> handleUpload triggered!");

  // HARD LOCK: If already processing an upload, exit immediately!
  if (isUploading) {
    console.log("Upload already in progress, skipping execution.");
    return;
  }
  isUploading = true;

  const statusText = document.getElementById("upload-status");
  const uploadBtn = document.getElementById("upload-btn");

  const discord_username = document.getElementById("upload-username")?.value || "";
  const email = document.getElementById("upload-email")?.value || "";
  const description = document.getElementById("upload-description")?.value || "";
  const category = document.getElementById("upload-category")?.value || "gallery";
  const fileInput = document.getElementById("upload-file");
  const file = fileInput?.files[0];

  console.log("Payload parameters:", { discord_username, email, category, fileName: file?.name });

  if (!file) {
    if (statusText) {
      statusText.style.color = "#e74c3c";
      statusText.textContent = "Please select a file to upload.";
    }
    isUploading = false;
    return;
  }

  try {
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";
    }
    if (statusText) {
      statusText.style.color = "#e67e22";
      statusText.textContent = "Uploading file to server...";
    }

    // 1. Prepare Multipart Form Data for Direct Server Upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    // 2. Upload file through Express Backend Proxy (Bypasses Browser CORS)
    console.log("Uploading file via backend proxy...");
    const uploadRes = await fetch(`${API_BASE}/api/upload-direct`, {
      method: "POST",
      body: formData
    });

    if (!uploadRes.ok) throw new Error("Failed to upload image to server.");
    const { image_url } = await uploadRes.json();
    console.log("Server upload complete! Image URL:", image_url);

    // 3. Save submission record to Database
    if (statusText) statusText.textContent = "Saving submission details...";
    console.log("Saving submission entry to server backend...");
    const subRes = await fetch(`${API_BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discord_username,
        email,
        description,
        category,
        image_url
      })
    });

    if (subRes.ok) {
      console.log("Submission saved successfully!");
      if (statusText) {
        statusText.style.color = "#2ecc71";
        statusText.textContent = "Upload successful! Waiting for admin approval.";
      }
      if (uploadBtn) uploadBtn.textContent = "Submitted!";

      setTimeout(() => { 
        closeModal(); 
      }, 2500);
    } else {
      throw new Error("Failed to save submission to database.");
    }

  } catch (err) {
    console.error("Upload error:", err);
    if (statusText) {
      statusText.style.color = "#e74c3c";
      statusText.textContent = err.message || "An error occurred during upload.";
    }
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload & Submit";
    }
  } finally {
    isUploading = false; // Always release lock
  }
}

// --- PUBLIC GALLERY LOADER (GRID LAYOUT + 6 RECENT LIMIT) ---

async function loadGallery(category = 'gallery', containerId = 'gallery-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE}/api/gallery?category=${category}`);
    const items = await response.json();

    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #888; width: 100%;">
          No submissions approved yet for this section.
        </div>`;
      return;
    }

    // Limit display to the 6 most recent submissions
    const recentItems = items.slice(0, 6);

    const cardsHtml = recentItems.map(item => {
      const uploadDate = item.created_at 
        ? new Date(item.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })
        : "";

      return `
        <div class="gallery-card" style="background: transparent; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <img src="${item.image_url}" 
                 alt="${item.description || 'Artwork'}" 
                 onclick="openLightbox('${item.image_url}')" 
                 style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; cursor: pointer;" 
                 title="Click to enlarge">
          </div>
          <div style="width: 100%;">
            <h3 style="margin: 0 0 6px 0; color: inherit; font-size: 1.15rem; font-weight: bold;">${item.discord_username}</h3>
            ${uploadDate ? `<div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 10px; font-style: italic;">${uploadDate}</div>` : ''}
            <p style="margin: 0; opacity: 0.9; font-size: 0.95rem; line-height: 1.4;">${item.description || 'No description provided.'}</p>
          </div>
        </div>
      `;
    }).join('');

    // Responsive grid wrapper
    const gridWrapper = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; width: 100%; max-width: 1200px; margin: 0 auto 25px auto; padding: 0 20px; box-sizing: border-box;">
        ${cardsHtml}
      </div>
    `;

    // Dynamic "View All" link triggers if there are more than 6 submissions
    const viewAllLink = items.length > 6 
      ? `<div style="text-align: center; margin-top: 20px; margin-bottom: 40px;">
           <a href="gallery.html?category=${category}" class="btn click" style="display: inline-block; padding: 12px 24px; background: orange; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
             View All Submissions (${items.length}) &rarr;
           </a>
         </div>`
      : '';

    container.innerHTML = gridWrapper + viewAllLink;

  } catch (err) {
    console.error(`Error loading ${category} section:`, err);
    container.innerHTML = `<p style="text-align: center; color: red;">Failed to load section items.</p>`;
  }
}

// --- FULL GALLERY LOADER (GRID LAYOUT - UNLIMITED) ---

async function loadFullGallery(category = 'gallery', containerId = 'full-gallery-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE}/api/gallery?category=${category}`);
    const items = await response.json();

    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #888;">
          No submissions found for this category.
        </div>`;
      return;
    }

    const cardsHtml = items.map(item => {
      const uploadDate = item.created_at 
        ? new Date(item.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })
        : "";

      return `
        <div class="gallery-card" style="background: transparent; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <img src="${item.image_url}" 
                 alt="${item.description || 'Artwork'}" 
                 onclick="openLightbox('${item.image_url}')" 
                 style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; cursor: pointer;" 
                 title="Click to enlarge">
          </div>
          <div style="width: 100%;">
            <h3 style="margin: 0 0 6px 0; color: inherit; font-size: 1.15rem; font-weight: bold;">${item.discord_username}</h3>
            ${uploadDate ? `<div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 10px; font-style: italic;">${uploadDate}</div>` : ''}
            <p style="margin: 0; opacity: 0.9; font-size: 0.95rem; line-height: 1.4;">${item.description || 'No description provided.'}</p>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; width: 100%; margin-bottom: 25px;">
        ${cardsHtml}
      </div>
    `;

  } catch (err) {
    console.error("Error loading full gallery:", err);
    container.innerHTML = `<p style="text-align: center; color: red;">Failed to load submissions.</p>`;
  }
}

// --- LIGHTBOX UTILITIES ---

function openLightbox(src) {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  if (lightbox && lightboxImg) {
    lightboxImg.src = src;
    lightbox.classList.add("active");
  }
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (lightbox) {
    lightbox.classList.remove("active");
  }
}

// --- GLOBAL SCOPE EXPORTS ---
window.openModal = openModal;
window.closeModal = closeModal;
window.handleAuth = handleAuth;
window.handleUpload = handleUpload;
window.loadGallery = loadGallery;
window.loadFullGallery = loadFullGallery;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

// --- DOM INITIALIZATION ---

document.addEventListener("DOMContentLoaded", () => {
  // Pass (category, containerElementId)
  loadGallery('gallery', 'gallery-container');
  loadGallery('bounty-board', 'bounty-board-container');
  loadGallery('pets', 'pets-container');
  loadGallery('misc', 'misc-container');
});