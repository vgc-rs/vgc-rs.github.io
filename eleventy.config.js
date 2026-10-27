import { readFileSync, existsSync } from "node:fs"

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const LONG_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

function readPhotos() {
  const path = "src/_data/photos.json"

  if (!existsSync(path)) return {}

  return JSON.parse(readFileSync(path, "utf8"))
}

function key(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const YOUTH_DIVISIONS = ["Senior", "Junior"]

function readRegistry() {
  return JSON.parse(readFileSync("src/_data/players.json", "utf8"))
}

function byOfficialName(registry) {
  return new Map(registry.flatMap(p => [[p.name, p], ...p.aliases.map(a => [a, p])]))
}

function buildPlayers(events) {
  const registry = readRegistry()
  const canonical = byOfficialName(registry)
  const players = new Map()

  for (const post of events) {
    for (const tournament of post.data.tournaments ?? []) {
      for (const division of tournament.divisions) {
        for (const entry of division.players) {
          const info = canonical.get(entry.name)
          const name = info?.name ?? entry.name

          if (!players.has(name)) players.set(name, { name, display: info?.nickname ?? name, slug: slugify(info?.nickname ?? name), photo: info?.photo ?? null, majors: info?.majors ?? [], wins: [], entries: [] })

          const result = { post, tournament, division: tournament.divisions.length > 1 ? division.name : null, youth: YOUTH_DIVISIONS.includes(division.name), place: entry.place, record: entry.record }
          players.get(name).entries.push(result)

          if (entry.place === 1) players.get(name).wins.push(result)
        }
      }
    }
  }

  const hidden = new Set(registry.filter(p => p.hidden).map(p => p.name))

  return [...players.values()].filter(p => !hidden.has(p.name)).sort((a, b) => b.wins.length - a.wins.length || a.display.localeCompare(b.display, "pt-BR"))
}

function seconds(time) {
  if (!time) return 0
  if (/^\d+$/.test(time)) return Number(time)

  const parts = { h: 3600, m: 60, s: 1 }

  return [...time.matchAll(/(\d+)([hms])/g)].reduce((total, [, n, unit]) => total + Number(n) * parts[unit], 0)
}

function youtubeEmbed(link) {
  const url = new URL(link)
  const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v")
  const start = seconds(url.searchParams.get("t") ?? url.searchParams.get("start"))

  return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`
}

function champions(post) {
  const tournaments = post.data.tournaments ?? []

  return tournaments.map(t => ({ tournament: t, division: t.divisions[0], player: t.divisions[0].players[0] }))
}

export default function (config) {
  config.addPassthroughCopy("src/assets")
  config.addPassthroughCopy("src/photos")
  config.addPassthroughCopy("src/standings")
  config.addWatchTarget("src/assets")
  config.addWatchTarget("src/_data/players.json")

  let photos = readPhotos()
  let registry = byOfficialName(readRegistry())

  config.on("eleventy.before", () => {
    photos = readPhotos()
    registry = byOfficialName(readRegistry())
  })

  config.addCollection("eventsDesc", api => api.getFilteredByTag("events").sort((a, b) => b.date - a.date))
  config.addCollection("players", api => buildPlayers(api.getFilteredByTag("events").sort((a, b) => b.date - a.date)))

  config.addFilter("displayName", name => registry.get(name)?.nickname ?? name)
  config.addFilter("youtubeEmbed", youtubeEmbed)
  config.addFilter("photos", date => photos[key(date)] ?? [])
  config.addFilter("cover", date => (photos[key(date)] ?? [])[0])
  config.addFilter("day", date => new Date(date).getUTCDate())
  config.addFilter("month", date => MONTHS[new Date(date).getUTCMonth()])
  config.addFilter("year", date => new Date(date).getUTCFullYear())
  config.addFilter("iso", date => key(date))
  config.addFilter("longDate", date => {
    const d = new Date(date)

    return `${d.getUTCDate()} de ${LONG_MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
  })
  config.addFilter("photoCount", n => (n === 0 ? "sem fotos" : n === 1 ? "1 foto" : `${n} fotos`))
  config.addFilter("playerGroups", (players, today) => {
    const since = new Date(today)
    since.setUTCMonth(since.getUTCMonth() - 6)
    const byName = (a, b) => a.display.localeCompare(b.display, "pt-BR")
    const hallOfFame = youth =>
      players
        .map(p => ({ player: p, wins: p.wins.filter(w => w.youth === youth).length }))
        .filter(c => c.wins)
        .sort((a, b) => b.wins - a.wins || byName(a.player, b.player))
    const rest = players.filter(p => !p.wins.length)

    return {
      champions: hallOfFame(false),
      youthChampions: hallOfFame(true),
      recent: rest.filter(p => p.entries[0].post.date >= since).sort(byName),
      others: rest.filter(p => p.entries[0].post.date < since).sort(byName)
    }
  })
  config.addFilter("playerNamed", (players, name) => players.find(p => p.name === name))
  config.addFilter("winCount", n => (n === 1 ? "1 vitória" : `${n} vitórias`))
  config.addFilter("champions", champions)
  config.addFilter("latestChampions", (posts, limit) => posts.flatMap(post => champions(post).map(c => ({ ...c, post }))).slice(0, limit))
  config.addFilter("store", (id, stores) => stores.find(s => s.id === id))
  config.addFilter("byYear", posts => {
    const groups = new Map()

    for (const post of posts) {
      const year = post.date.getUTCFullYear()

      if (!groups.has(year)) groups.set(year, [])
      groups.get(year).push(post)
    }

    return [...groups.entries()].map(([year, items]) => ({ year, items }))
  })
  config.addFilter("eventOn", (posts, date) => posts.find(p => key(p.date) === key(date)))
  config.addFilter("countTypes", posts => posts.reduce((c, p) => {
    for (const t of p.data.types ?? []) c[t] = (c[t] ?? 0) + 1

    return c
  }, {}))
  config.addFilter("withAnyType", (posts, types) => posts.filter(p => (p.data.types ?? []).some(t => types.includes(t))))
  config.addFilter("fromStore", (posts, id) => posts.filter(p => p.data.store === id))
  config.addFilter("withResults", posts => posts.filter(p => (p.data.tournaments ?? []).length))
  config.addFilter("totalPhotos", posts => posts.reduce((n, p) => n + (photos[key(p.date)] ?? []).length, 0))
  config.addFilter("uniquePlayers", posts => {
    const names = new Set()

    for (const p of posts) for (const t of p.data.tournaments ?? []) for (const d of t.divisions) for (const pl of d.players) names.add(registry.get(pl.name)?.name ?? pl.name)

    return names.size
  })
  config.addFilter("upcoming", (events, today) => events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)))
  config.addFilter("neighbors", (posts, url) => {
    const i = posts.findIndex(p => p.url === url)

    return { previous: posts[i + 1], next: posts[i - 1] }
  })
  config.addGlobalData("today", () => new Date().toISOString().slice(0, 10))

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  }
}
