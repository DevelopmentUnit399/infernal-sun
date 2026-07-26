const API_BASE = "https://infernalsun.firecloud-tech.com";
let currentAdminKey = "";

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
        // Load data to test auth / populate grids
        await loadAllSubmissions();

        // Reveal dashboard and hide auth modal
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

        container.innerHTML = items.map(item => renderAdminCard(item, false)).join('');
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

        container.innerHTML = items.map(item => renderAdminCard(item, true)).join('');
    } catch (err) {
        console.error("Error loading approved submissions:", err);
    }
}

// --- UI CARD RENDERER ---

function renderAdminCard(item, isApproved) {
    return `
        <div class="admin-card" id="card-${item.id}" style="background: white; border: 1px solid #e0e0e0; padding: 16px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap;">
                <img src="${item.image_url}" alt="Submission" style="width: 160px; height: 160px; object-fit: cover; border-radius: 6px;">
                <div style="flex: 1; min-width: 200px;">
                    <p style="margin: 0 0 6px 0;"><strong>User:</strong> ${item.discord_username}</p>
                    <p style="margin: 0 0 6px 0;"><strong>Email:</strong> ${item.email}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Description:</strong> ${item.description || 'N/A'}</p>
                    
                    <div style="margin-bottom: 12px;">
                        <label><strong>Category:</strong> </label>
                        <select id="category-${item.id}" onchange="updateCategory(${item.id})" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc;">
                            <option value="gallery" ${item.category === 'gallery' ? 'selected' : ''}>Gallery Page</option>
                            <option value="pets" ${item.category === 'pets' ? 'selected' : ''}>Pet Page</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${isApproved 
                            ? `<button onclick="toggleApproval(${item.id}, false)" style="background: #e67e22; color: #fff; padding: 8px 14px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Unapprove / Hide</button>` 
                            : `<button onclick="toggleApproval(${item.id}, true)" style="background: #2ecc71; color: #fff; padding: 8px 14px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Approve</button>`
                        }
                        <button onclick="deleteSubmission(${item.id})" style="background: #e74c3c; color: #fff; padding: 8px 14px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Delete & Purge R2</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- ACTIONS ---

// 1. APPROVE / UNAPPROVE TOGGLE
async function toggleApproval(id, approveStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/submissions/${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "x-admin-key": currentAdminKey
            },
            body: JSON.stringify({ approved: approveStatus })
        });

        if (res.ok) {
            loadAllSubmissions();
        } else {
            alert("Failed to update approval status.");
        }
    } catch (err) {
        console.error("Error updating approval status:", err);
    }
}

// 2. UPDATE CATEGORY
async function updateCategory(id) {
    const categorySelect = document.getElementById(`category-${id}`);
    if (!categorySelect) return;
    
    const category = categorySelect.value;
    try {
        const res = await fetch(`${API_BASE}/api/admin/submissions/${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json",
                "x-admin-key": currentAdminKey
            },
            body: JSON.stringify({ category })
        });

        if (!res.ok) alert("Failed to update category.");
    } catch (err) {
        console.error("Error updating category:", err);
    }
}

// 3. DELETE SUBMISSION & PURGE FROM R2
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

// --- GLOBAL SCOPE EXPORTS ---
window.handleAdminAuth = handleAdminAuth;
window.toggleApproval = toggleApproval;
window.updateCategory = updateCategory;
window.deleteSubmission = deleteSubmission;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // If auth modal isn't present, try loading directly
    const authModal = document.getElementById("auth-modal");
    if (!authModal) {
        loadAllSubmissions();
    }
});