# Specification Quality Checklist: Pre-Game Main Menu (`main-menu`)

- [x] No implementation leaks in user stories
- [x] Architecture Law respected (`apps/web` is client only, polls `/occupancy` on `apps/server` derived from `NEXT_PUBLIC_WS_URL`)
- [x] Versioning Law respected (slug `main-menu` only, no feature numbers)
- [x] Canvas does not mount until **PLAY** is clicked
- [x] Old in-flow name prompt removed from `EntryLoadingScreen`
- [x] Designed failure states for `server unreachable`, `room full`, and `name rejected`
- [x] Settings reachable from Main Menu and in-game sharing `gameStore` settings

