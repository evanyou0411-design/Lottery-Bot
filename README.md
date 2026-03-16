<p align="center">
  <img src="assets/mascot.png" width="200" alt="zalo-agent-cli mascot" />
</p>

# zalo-agent-cli

[![npm version](https://img.shields.io/npm/v/zalo-agent-cli.svg)](https://www.npmjs.com/package/zalo-agent-cli)
[![npm downloads](https://img.shields.io/npm/dm/zalo-agent-cli.svg)](https://www.npmjs.com/package/zalo-agent-cli)
[![npm total downloads](https://img.shields.io/npm/dt/zalo-agent-cli.svg)](https://www.npmjs.com/package/zalo-agent-cli)
[![license](https://img.shields.io/npm/l/zalo-agent-cli.svg)](https://github.com/PhucMPham/zalo-agent-cli/blob/main/LICENSE)

CLI tool for Zalo automation — multi-account, proxy support, bank transfers, QR payments.
Built on [zca-js](https://github.com/RFS-ADRENO/zca-js).

**[Tiếng Việt](https://github.com/PhucMPham/zalo-agent-cli/wiki/Ti%E1%BA%BFng-Vi%E1%BB%87t)** | **[English](#quick-start)**

> **Warning:** Unofficial Zalo API — your account may be banned. Use at your own risk.

---

## Install

```bash
npm install -g zalo-agent-cli
```

## Quick Start

### 1. Login

```bash
zalo-agent login
```

Scan the QR with **Zalo app > QR Scanner**. Credentials auto-saved.

### 2. Find a friend

```bash
zalo-agent friend search "Phúc"
```

### 3. Listen for messages (get thread IDs)

```bash
zalo-agent listen
```

Every incoming message shows the `threadId` you need. Use `--json` for machine-readable output.

### 4. Send a message

```bash
# Send to a user
zalo-agent msg send <THREAD_ID> "Hello!"

# Send to a group
zalo-agent msg send <THREAD_ID> "Hello group!" -t 1
```

---

## Commands

All commands support `--json` for scripting. Full docs: **[Wiki](https://github.com/PhucMPham/zalo-agent-cli/wiki)**

| Command Group | Description | Docs |
|---------------|-------------|------|
| `msg` | Send text, images, files, voice, video, stickers, links, bank cards, QR transfers, reactions | [Messages](https://github.com/PhucMPham/zalo-agent-cli/wiki/Messages) |
| `friend` | List, find, add, remove, block, alias, recommendations | [Friends](https://github.com/PhucMPham/zalo-agent-cli/wiki/Friends) |
| `group` | Create, rename, members, settings, links, notes, invites | [Groups](https://github.com/PhucMPham/zalo-agent-cli/wiki/Groups) |
| `conv` | Mute, pin, archive, hidden conversations, auto-delete | [Conversations](https://github.com/PhucMPham/zalo-agent-cli/wiki/Conversations) |
| `profile` | View/update profile, avatar gallery, privacy settings | [Profile](https://github.com/PhucMPham/zalo-agent-cli/wiki/Profile) |
| `poll` | Create, vote, lock polls in groups | [Polls](https://github.com/PhucMPham/zalo-agent-cli/wiki/Polls) |
| `reminder` | Create, edit, remove reminders | [Reminders](https://github.com/PhucMPham/zalo-agent-cli/wiki/Reminders) |
| `auto-reply` | Manage auto-reply rules | [Auto-Reply](https://github.com/PhucMPham/zalo-agent-cli/wiki/Auto-Reply) |
| `quick-msg` | Saved quick messages | [Quick Messages](https://github.com/PhucMPham/zalo-agent-cli/wiki/Quick-Messages) |
| `label` | Conversation labels | [Labels](https://github.com/PhucMPham/zalo-agent-cli/wiki/Labels) |
| `catalog` | Zalo Shop catalogs & products | [Catalog](https://github.com/PhucMPham/zalo-agent-cli/wiki/Catalog) |
| `listen` | Real-time message listener with webhook & JSONL storage | [Listener](https://github.com/PhucMPham/zalo-agent-cli/wiki/Listener) |
| `account` | Multi-account management with proxy support | [Accounts](https://github.com/PhucMPham/zalo-agent-cli/wiki/Accounts) |

Also see: [Multi-Account & Proxy](https://github.com/PhucMPham/zalo-agent-cli/wiki/Multi-Account-&-Proxy) · [VPS / Headless Setup](https://github.com/PhucMPham/zalo-agent-cli/wiki/VPS-Setup) · [Bank Card & QR Payments](https://github.com/PhucMPham/zalo-agent-cli/wiki/Bank-Card-&-QR-Payments)

---

## Features

- QR login with auto HTTP server (browser + terminal)
- Multi-account with per-account proxy (1:1)
- 90+ commands covering all Zalo features
- Bank cards (55+ Vietnamese banks) & VietQR transfers
- Real-time listener with webhook & local JSONL storage
- `--json` output on all commands for scripting & AI agents
- Credentials encrypted at rest (0600 permissions)

---

## Support Us

If this tool saves you time, consider buying us a coffee!

<p align="center">
  <img src="assets/donate-qr.jpg" width="280" alt="Donate via VietQR (OCB)" />
  <br/>
  <em>Scan with any Vietnamese banking app</em>
</p>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=PhucMPham/zalo-agent-cli&type=Date)](https://star-history.com/#PhucMPham/zalo-agent-cli&Date)

## License

[MIT](LICENSE) · See [DISCLAIMER.md](DISCLAIMER.md) for full terms.
