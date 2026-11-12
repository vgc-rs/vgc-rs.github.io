const toggle = document.querySelector(".menu-toggle")

if (toggle) {
  const setOpen = open => {
    toggle.setAttribute("aria-expanded", String(open))
    document.documentElement.classList.toggle("menu-open", open)
  }

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"))
  document.querySelector(".menu-scrim").addEventListener("click", () => setOpen(false))

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setOpen(false)
  })
}
