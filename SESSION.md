# SESSION.md — FBS-App Sessiestatus

## Laatst bijgewerkt: 05-04-2026

## Huidige staat

### Versies
- FBS-App-Dev: v0.1.3 (loopt achter — moet bijgewerkt worden naar Main)
- FBS-App-Main: v0.1.6
- Nep v0.1.7 op GitHub: oude build — moet vervangen worden

### Openstaand
1. Dev bijwerken naar staat van Main (lib.rs, tauri.conf.json)
2. Versie ophogen naar 0.1.7 in Dev
3. Sync Dev → Main via sync.ps1
4. Nieuwe build als echte v0.1.7 via build.ps1 in Main
5. GitHub Release v0.1.7 vervangen met nieuwe installer + .sig
6. Testen op testVM: auto-update van v0.1.6 → v0.1.7

### Bekend probleem (in onderzoek)
- Node proces blijft draaien na update — fix via netstat/taskkill staat al in Main lib.rs
- installMode staat op basicUi in Main tauri.conf.json
- Nep v0.1.7 op GitHub was een oude build zonder deze fixes — vandaar dat update niet werkte

## Poort-verschil Dev vs Main
- FBS-App-Dev: Node draait op poort 3000
- FBS-App-Main: Node draait op poort 3001
- lib.rs in Dev moet altijd poort 3000 gebruiken
- lib.rs in Main moet altijd poort 3001 gebruiken
- sync.ps1 kopieert Dev → Main maar poort moet daarna handmatig gecheckt worden in Main

## Auto-updater architectuur
- Cloudflare Worker: https://fbs-update-worker.section-labs.workers.dev
  - /latest → update-melding banner in de app
  - /tauri → Tauri updater protocol (version, url, signature)
- Worker leest automatisch de nieuwste GitHub Release van FBS-App-Main
- Signing key: ~/.tauri/fbs-app.key (wachtwoord in Bitwarden: "FBS Tauri Signing Key")
- Public key staat in src-tauri/tauri.conf.json

## Releaseproces (volledige workflow)
1. Wijzigingen maken en testen in FBS-App-Dev (poort 3000)
2. Versie ophogen in Dev: package.json + src-tauri/tauri.conf.json + src-tauri/Cargo.toml
3. Commit en push FBS-App-Dev
4. sync.ps1 uitvoeren vanuit FBS-App-Dev
5. In FBS-App-Main controleren: poort in lib.rs moet 3001 zijn (sync overschrijft met 3000)
6. Versie ophogen in Main: zelfde drie bestanden
7. Commit en push FBS-App-Main
8. build.ps1 uitvoeren in FBS-App-Main
9. Installer + .sig staan in src-tauri\target\release\bundle\nsis\
10. GitHub Release aanmaken met tag vX.Y.Z, installer en .sig uploaden
11. Cloudflare Worker pikt automatisch de nieuwe versie op

## Main-only bestanden (worden niet overschreven door sync)
- src-tauri/src/lib.rs (poort 3001)
- build.ps1
- src-tauri/tauri.conf.json (installMode, pubkey, endpoint)
