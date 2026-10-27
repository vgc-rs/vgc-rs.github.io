const gallery = document.querySelector("[data-gallery]")

if (gallery) {
  const links = [...gallery.querySelectorAll("a")]
  const dialog = document.createElement("dialog")
  dialog.className = "lightbox"
  dialog.innerHTML = `
    <div class="lightbox-stage"><img alt="" /></div>
    <div class="lightbox-bar">
      <button type="button" data-action="previous" aria-label="Anterior">◀</button>
      <span class="lightbox-counter"></span>
      <button type="button" data-action="next" aria-label="Próxima">▶</button>
      <button type="button" data-action="close">Fechar</button>
    </div>`
  document.body.append(dialog)

  const img = dialog.querySelector("img")
  const counter = dialog.querySelector(".lightbox-counter")
  let current = 0
  let touchX = null

  const show = i => {
    current = (i + links.length) % links.length
    img.src = links[current].href
    counter.textContent = `${current + 1} / ${links.length}`
    const preload = new Image()
    preload.src = links[(current + 1) % links.length].href
  }

  links.forEach((link, i) =>
    link.addEventListener("click", event => {
      event.preventDefault()
      show(i)
      dialog.showModal()
    })
  )

  dialog.addEventListener("click", event => {
    const action = event.target.dataset.action

    if (action === "previous") show(current - 1)
    if (action === "next") show(current + 1)
    if (action === "close" || event.target.classList.contains("lightbox-stage")) dialog.close()
  })

  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") show(current - 1)
    if (event.key === "ArrowRight") show(current + 1)
  })

  dialog.addEventListener("touchstart", event => (touchX = event.touches[0].clientX), { passive: true })
  dialog.addEventListener("touchend", event => {
    if (touchX === null) return

    const delta = event.changedTouches[0].clientX - touchX
    touchX = null

    if (Math.abs(delta) > 50) show(delta < 0 ? current + 1 : current - 1)
  })
}

const standingsButtons = document.querySelectorAll("[data-standings]")

if (standingsButtons.length) {
  const modal = document.createElement("dialog")
  modal.className = "modal-standings"
  modal.innerHTML = `
    <div class="modal-header">
      <strong class="modal-title"></strong>
      <button type="button" data-close>Fechar</button>
    </div>
    <div class="modal-body"></div>`
  document.body.append(modal)

  const title = modal.querySelector(".modal-title")
  const body = modal.querySelector(".modal-body")

  standingsButtons.forEach(button =>
    button.addEventListener("click", event => {
      event.preventDefault()
      const url = button.getAttribute("href")
      title.textContent = button.dataset.title
      body.innerHTML = url.toLowerCase().endsWith(".pdf") ? `<iframe src="${url}" title="Standings"></iframe>` : `<img src="${url}" alt="Standings" />`
      modal.showModal()
    })
  )

  modal.addEventListener("click", event => {
    if (event.target === modal || event.target.hasAttribute("data-close")) modal.close()
  })

  modal.addEventListener("close", () => (body.innerHTML = ""))
}

const filters = document.querySelector("[data-filters]")

if (filters) {
  const groups = [...filters.querySelectorAll("[data-group]")]
  const cards = [...document.querySelectorAll(".post-summary[data-types]")]
  const years = [...document.querySelectorAll(".year")]
  const empty = filters.querySelector(".filter-empty")
  const selection = { type: "", store: "" }

  const matches = (card, type, store) => {
    const types = type.split(" ").filter(Boolean)
    const typeOk = !types.length || types.some(t => card.dataset.types.split(" ").includes(t))
    const storeOk = !store || card.dataset.store === store

    return typeOk && storeOk
  }

  const apply = () => {
    cards.forEach(card => (card.hidden = !matches(card, selection.type, selection.store)))
    groups.forEach(group =>
      group.querySelectorAll("button").forEach(button => {
        const filter = { ...selection, [group.dataset.group]: button.dataset.value }
        button.querySelector("span").textContent = cards.filter(card => matches(card, filter.type, filter.store)).length
      })
    )
    years.forEach(year => (year.hidden = !year.querySelector(".post-summary:not([hidden])")))
    empty.hidden = cards.some(card => !card.hidden)
  }

  groups.forEach(group => {
    const buttons = [...group.querySelectorAll("button")]
    buttons.forEach(button =>
      button.addEventListener("click", () => {
        buttons.forEach(b => b.setAttribute("aria-pressed", String(b === button)))
        selection[group.dataset.group] = button.dataset.value
        apply()
      })
    )
  })

  filters.hidden = false
}
