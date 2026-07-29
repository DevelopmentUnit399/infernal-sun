const API_BASE = "https://infernalsun.firecloud-tech.com";
let currentAdminKey = "";
let currentCategoryFilter = 'all';

// --- AUTH HANDLER ---

async function handleAdminAuth(event) {
    if (event) event.preventDefault();
    
    const passwordInput = document.getElementById("admin-password");
    const errorText = document.getElementById("admin-error");
    const loginBtn = document.getElementById("admin-login-btn");

    currentAdminKey = passwordInput ? passwordInput.value.trim() : "";
    if (!currentAdminKey) return;

    if (errorText) errorText.style.display = "none";
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Verifying...";
    }

    try {
        await loadAllSubmissions();

        const authModal = document.getElementById("auth-modal");
        const adminDash = document.getElementById("admin-dashboard");
        
        if (authModal) {
            authModal.classList.remove("modal--open");
            authModal.style.display = "none";
        }
        if (adminDash) {
            adminDash.style.display = "block";
        }

    } catch (err) {
        if (errorText) {
            errorText.textContent = err.message || "Unable to reach server API.";
            errorText.style.display = "block";
        }
        console.error("Auth Exception:", err);
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = "Login";
        }
    }
}

// --- DATA FETCHING ---

async function loadAllSubmissions() {
    await Promise.all([
        loadPendingSubmissions(),
        loadApprovedSubmissions()
    ]);
}

// 1. LOAD PENDING SUBMISSIONS
async function loadPendingSubmissions() {
    const container = document.getElementById("pending-submissions");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/submissions?approved=0`, {
            headers: { "x-admin-key": currentAdminKey }
        });

        if (res.status === 401) {
            throw new Error("Incorrect admin password.");
        }
        if (!res.ok) {
            throw new Error(`Server status ${res.status}`);
        }

        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = "<p style='color: #666; padding: 10px;'>No pending submissions.</p>";
            return;
        }

        // Apply active category filter
        const filteredItems = currentCategoryFilter === 'all' 
            ? items 
            : items.filter(item => item.category === currentCategoryFilter);

        if (filteredItems.length === 0) {
            container.innerHTML = `<p style='color: #666; padding: 10px;'>No pending submissions for "${currentCategoryFilter}".</p>`;
            return;
        }

        container.innerHTML = filteredItems.map(item => renderAdminCard(item)).join('');
    } catch (err) {
        console.error("Error loading pending submissions:", err);
        throw err;
    }
}

// 2. LOAD APPROVED SUBMISSIONS
async function loadApprovedSubmissions() {
    const container = document.getElementById("approved-submissions");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/submissions?approved=1`, {
            headers: { "x-admin-key": currentAdminKey }
        });

        if (!res.ok) return;

        const items = await res.json();

        if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = "<p style='color: #666; padding: 10px;'>No approved gallery submissions yet.</p>";
            return;
        }

        // Apply active category filter
        const filteredItems = currentCategoryFilter === 'all' 
            ? items 
            : items.filter(item => item.category === currentCategoryFilter);

        if (filteredItems.length === 0) {
            container.innerHTML = `<p style='color: #666; padding: 10px;'>No approved submissions for "${currentCategoryFilter}".</p>`;
            return;
        }

        container.innerHTML = filteredItems.map(item => renderAdminCard(item)).join('');
    } catch (err) {
        console.error("Error loading approved submissions:", err);
    }
}

// --- UI CARD RENDERER ---

function renderAdminCard(item) {
  return `
    <div class="submission-card" data-id="${item.id}" style="background: #ffffff !important; padding: 20px !important; border-radius: 12px !important; margin-bottom: 20px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; width: 100% !important; box-sizing: border-box !important; display: block !important;">
      
      <!-- TOP: IMAGE PREVIEW -->
      <div style="width: 100%; margin-bottom: 16px; text-align: center;">
        <img src="${item.image_url}" 
             alt="Submission" 
             onclick="openLightbox('${item.image_url}')" 
             style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 8px; cursor: pointer; display: block;" 
             title="Click to enlarge">
      </div>

      <!-- BOTTOM: DETAILS & ACTIONS -->
      <div style="width: 100%; box-sizing: border-box;">
        <h3 style="margin: 0 0 10px 0; font-size: 1.15rem; color: #2c3e50;">Submission #${item.id}</h3>
        <p style="margin: 6px 0; font-size: 0.9rem; color: #333;"><strong>User:</strong> ${item.discord_username}</p>
        <p style="margin: 6px 0; font-size: 0.9rem; color: #333; word-break: break-all;"><strong>Email:</strong> ${item.email}</p>
        <p style="margin: 6px 0; font-size: 0.9rem; color: #333;"><strong>Description:</strong> ${item.description || 'N/A'}</p>
        
        <div style="margin: 12px 0;">
            <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px; color: #555;">Category:</label>
            <select onchange="updateCategory(${item.id}, this.value)" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; background: #fff; font-size: 0.9rem;">
                <option value="gallery" ${item.category === 'gallery' ? 'selected' : ''}>Gallery Page</option>
                <option value="bounty-board" ${item.category === 'bounty-board' ? 'selected' : ''}>Bounty Board Page</option>
                <option value="pets" ${item.category === 'pets' ? 'selected' : ''}>Pet Page</option>
                <option value="misc" ${item.category === 'misc' ? 'selected' : ''}>Misc Page</option>
            </select>
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
          ${
            item.approved === 0
              ? `<button onclick="approveSubmission(${item.id})" style="flex: 1; min-width: 120px; background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">Approve</button>`
              : `<button onclick="hideSubmission(${item.id})" style="flex: 1; min-width: 120px; background: #f39c12; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">Hide Submission</button>`
          }
          <button onclick="deleteSubmission(${item.id})" style="flex: 1; min-width: 120px; background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">Delete & Purge R2</button>
        </div>
      </div>

    </div>
  `;
}

// --- ACTIONS ---

async function approveSubmission(id) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/submissions/${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "x-admin-key": currentAdminKey
            },
            body: JSON.stringify({ approved: 1 })
        });

        if (res.ok) {
            loadAllSubmissions();
        } else {
            alert("Failed to approve submission.");
        }
    } catch (err) {
        console.error("Error approving submission:", err);
    }
}

async function hideSubmission(id) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/submissions/${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "x-admin-key": currentAdminKey
            },
            body: JSON.stringify({ approved: 0 })
        });

        if (res.ok) {
            loadAllSubmissions();
        } else {
            alert("Failed to hide submission.");
        }
    } catch (err) {
        console.error("Error hiding submission:", err);
    }
}

async function updateCategory(id, newCategory) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/submissions/${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "x-admin-key": currentAdminKey
            },
            body: JSON.stringify({ category: newCategory })
        });

        if (!res.ok) alert("Failed to update category.");
    } catch (err) {
        console.error("Error updating category:", err);
    }
}

async function deleteSubmission(id) {
    if (!confirm("Are you sure you want to delete this submission? This will permanently delete the image file from Cloudflare R2.")) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/admin/submissions/${id}`, {
            method: "DELETE",
            headers: { "x-admin-key": currentAdminKey }
        });

        if (res.ok) {
            loadAllSubmissions();
        } else {
            alert("Failed to delete submission.");
        }
    } catch (err) {
        console.error("Error deleting submission:", err);
    }
}

// --- CATEGORY FILTER HANDLER ---

function filterAdminCategory(category, evt) {
    currentCategoryFilter = category;
    
    // Update active tab styles
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.style.background = '#fff';
        btn.style.color = '#333';
        btn.style.border = '1px solid #ccc';
    });

    const targetBtn = evt ? evt.target : event?.target;
    if (targetBtn) {
        targetBtn.style.background = '#2c3e50';
        targetBtn.style.color = '#fff';
        targetBtn.style.border = 'none';
    }

    loadAllSubmissions();
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

window.handleAdminAuth = handleAdminAuth;
window.approveSubmission = approveSubmission;
window.hideSubmission = hideSubmission;
window.updateCategory = updateCategory;
window.deleteSubmission = deleteSubmission;
window.filterAdminCategory = filterAdminCategory;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

// --- INITIALIZATION ---

document.addEventListener("DOMContentLoaded", () => {
    const authModal = document.getElementById("auth-modal");
    if (!authModal) {
        loadAllSubmissions();
    }
});