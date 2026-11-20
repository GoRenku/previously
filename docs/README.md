# Previously Documentation

This folder holds accepted project knowledge. Plans and explorations live in
[`plans/`](../plans/README.md).

Each folder answers a different question:

| Folder | Answers | Status values |
|---|---|---|
| `architecture/` | How does the system fit together **now**? Short maps of the current system that link to decisions and code. | `current` |
| `decisions/` | What did we decide, when, and why? One ADR per durable decision. | `proposed`, `accepted`, `superseded by NNNN`, `rejected` |
| `operations/` | How do I run, deploy and publish it? Step-by-step operating guides. | `current` |
| `product/` | What is the product and why? Concept, design language, content rules. | `current` |

When a plan in `plans/active/` is accepted, record its durable decisions as
ADRs here, and update `architecture/` so it describes the system as it then
is. Architecture pages describe the present; they do not hold proposals or
sequencing.

This repository is public. Docs may describe how spoilers are handled, but
must not contain real spoilers: use a made-up show for examples. Show
content and private product notes live in the private content repository.

## Contents

- [architecture/README.md](architecture/README.md) – system overview: data
  model, spoiler gate, web app, API, MCP server, QA tooling.
- [decisions/README.md](decisions/README.md) – how ADRs are written, and the
  accepted ones.
- [operations/cloudflare-setup.md](operations/cloudflare-setup.md) – one-time
  Cloudflare setup for `previously.fyi`, step by step.
- [operations/deploy.md](operations/deploy.md) – deploying and rolling back
  code.
- [operations/content-publishing.md](operations/content-publishing.md) –
  publishing, promoting and rolling back show content.
- [concept.md](concept.md) – product concept and design (to move into
  `product/`).
