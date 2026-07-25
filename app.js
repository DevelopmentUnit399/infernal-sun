const TEAM_PASSWORD = "CalamityAshe"
const TARGET_UPLOAD_URL = "upload.html"

// -- AUTH MODAL CONTROLS ---

function openModal() {
  const modal = document.getElementById("auth-modal")
  modal.classList.add("modal--open")
  document.getElementById("modal-password").focus()
}

function closeModal() {
  const modal = document.getElementById("auth-modal")
  const passwordInput = document.getElementById("modal-password")
  const errorText = document.getElementById("modal-error")

  modal.classList.remove("modal--open")
  passwordInput.value = ""
  errorText.style.display = "none"
}

function handleAuth(event) {
  event.preventDefault()

  const passwordInput = document.getElementById("modal-password").value
  const errorText = document.getElementById("modal-error")

  if (passwordInput === TEAM_PASSWORD) {
    window.location.href = TARGET_UPLOAD_URL
  } else {
    errorText.textContent = "Incorrect password. Please try again."
    errorText.style.display = "block"
  }
}

window.addEventListener("click", (event) => {
  const modal = document.getElementById("auth-modal")
  if (event.target === modal) {
    closeModal()
  }
})

async function loadGallery(category = 'gallery') {
  const container = document.getElementById("gallery-container")
  if (!container) return

  try {
    const response = await fetch(`/api/gallery?category=${category}`)
    const items = await response.json()

    if (items.length === 0) {
      container.innerHTML = `
        <header class="header">
          <p style="text-align: center; width: 100%; color: #888;">No submissions approved yet for this section.</p>
        </header>`
      return
    }

    container.innerHTML = items.map(item => `
      <header class="header" style="margin-bottom: 40px;">
        <div class="gallery__card">
          <div class="gallery__card--text">
            <h2 class="gallery__username">${item.discord_username}</h2>
            <p class="gallery__description">${item.description}</p>
          </div>
        </div>
      </header>
      `).join('')

  } catch (err) {
    console.error("Error loading gallery:", err)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadGallery('gallery')
})