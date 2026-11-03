<!--
Sync Impact Report
- Version change: N/A (uninitialized template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Gameplay-First Development
  - [PRINCIPLE_2_NAME] → II. Modular Architecture
  - [PRINCIPLE_3_NAME] → III. Multiplayer Correctness
  - [PRINCIPLE_4_NAME] → IV. Responsive by Design
  - [PRINCIPLE_5_NAME] → V. Performance and Asset Quality
- Added principles:
  - VI. Security and Player Safety
  - VII. Testing and Verification
  - VIII. Specification-Driven Development
  - IX. Incremental Delivery
- Added sections:
  - Technical & Operational Constraints (resolved from [SECTION_2_NAME])
  - Development Workflow & Quality Gates (resolved from [SECTION_3_NAME])
- Removed sections: None
- Follow-up TODOs: None
-->

# Online Zoo Constitution

## Core Principles

### I. Gameplay-First Development
- Online Zoo MUST be built as a real multiplayer game, not a 3D website.
- Every feature MUST contribute to exploration, social interaction, or immersive zoo experiences.
- Implementation MUST prioritize actual playable functionality over static mockups.
- The world itself MUST provide intrinsic entertainment without requiring constant quests or
  mandatory progression loops.

**Rationale**: A social zoo simulation succeeds only when inhabiting and exploring the shared
world is inherently engaging; treating the project as a static web page with 3D embeds undermines
playability and player retention.

### II. Modular Architecture
- The codebase MUST separate game rendering, gameplay logic, networking, UI, and persistence into
  distinct modules.
- Features MUST be built from reusable systems rather than monolithic components.
- Clear boundaries MUST be maintained between client and server responsibilities.
- Shared game types and contracts MUST have a single source of truth consumed by both client and
  server.

**Rationale**: Strict modular boundaries and shared contracts prevent client-server drift and
allow rendering, gameplay, UI, and persistence layers to evolve independently without regressions.

### III. Multiplayer Correctness
- Critical game state and state transitions MUST use server-authoritative validation.
- The server MUST NOT trust client-provided positions, currency, inventory, or purchase results.
- Transient multiplayer state MUST be kept separate from persistent database state.
- All multiplayer features MUST be designed and verified for multiple concurrent players.

**Rationale**: Client-side authority in a shared multiplayer environment leads to desynchronization,
exploits, and corrupted economy or world state.

### IV. Responsive by Design
- Desktop and mobile browsers MUST be treated as first-class platforms.
- All gameplay systems MUST support keyboard/mouse and touchscreen input where applicable.
- Input handling MUST use a shared, device-agnostic input abstraction.
- Mobile performance and ergonomics MUST be designed and verified during implementation, not added
  afterward.

**Rationale**: Retrofitting touch controls and mobile performance budgets onto desktop-only 3D
systems causes expensive rewrites and poor mobile playability.

### V. Performance and Asset Quality
- All visual assets and environments MUST maintain a consistent stylized 3D art direction.
- 3D models, textures, animations, and rendering pipelines MUST be optimized prior to completion.
- Rendering systems MUST use lazy loading, Level of Detail (LOD), instancing, and appropriate
  asset compression where applicable.
- Basic gameplay responsiveness and frame pacing MUST NOT be sacrificed for unnecessary visual
  effects.

**Rationale**: Browser-based 3D games operate under strict memory, network, and GPU budgets across
desktop and mobile devices; consistent frame rates and fast loading are essential for multiplayer
accessibility.

### VI. Security and Player Safety
- All important and state-mutating player actions MUST be validated server-side.
- Social systems MUST implement chat rate limiting, mute, block, and report mechanisms.
- Authentication credentials and database secrets MUST be protected and never exposed to client
  bundles or version control.
- Database schemas and storage systems MUST enforce appropriate least-privilege access policies.

**Rationale**: A public multiplayer social game requires strong technical safeguards against both
state manipulation and disruptive player behavior.

### VII. Testing and Verification
- Every feature MUST define measurable acceptance criteria before implementation is considered
  complete.
- Verification MUST test gameplay behavior, multiplayer synchronization, and responsive controls
  across target input modes.
- An untested implementation MUST NOT be reported as complete.
- Automated tests MUST be maintained where practical for shared logic, contracts, and server
  validation rules.

**Rationale**: Concurrent multiplayer state and cross-device controls introduce failure modes that
cannot be verified by code inspection alone.

### VIII. Specification-Driven Development
- Every substantial feature MUST have a reviewed specification before implementation begins.
- Development MUST follow Spec Kit's `Specify → Clarify → Plan → Tasks → Analyze → Implement →
  Converge` workflow where appropriate.
- Established product requirements MUST NOT be silently changed during implementation.
- Important architectural decisions MUST be recorded in feature design artifacts.
- Specifications MUST be updated whenever requirements change.

**Rationale**: Specification-driven workflows align complex multi-system game features with
product intent and prevent undocumented architectural drift.

### IX. Incremental Delivery
- Features MUST be built as end-to-end vertical slices rather than disconnected horizontal systems.
- The application MUST remain runnable after each milestone.
- Implementation MUST prioritize the smallest complete playable experience before expanding breadth
  or polish.
- Scope MUST NOT be expanded without documenting the reason in the project specifications.

**Rationale**: Vertical slices validate rendering, networking, and gameplay integration early while
keeping the game continuously playable.

## Technical & Operational Constraints

- **Target Environment**: Browser-based 3D multiplayer social simulation running natively in modern
  desktop and mobile web browsers.
- **State Separation**: High-frequency transient session state (player transforms, animations,
  real-time presence) MUST remain decoupled from durable persistence (accounts, currency,
  inventory, moderation records).
- **Contract Integrity**: Network protocol schemas and shared domain types MUST reside in a single
  authoritative module shared across client and server boundaries.

## Development Workflow & Quality Gates

- **Workflow Progression**: Features progress through `Specify → Clarify → Plan → Tasks → Analyze
  → Implement → Converge`, ensuring design ambiguities are resolved prior to code execution.
- **Milestone Readiness**: Every milestone MUST leave the application in a buildable, runnable, and
  playable state.
- **Verification Gate**: No feature or task may be marked complete until server authority,
  multi-client synchronization, desktop/mobile input handling, and performance responsiveness have
  been verified against measurable acceptance criteria.

## Governance

- **Supremacy**: This Constitution governs all architectural, gameplay, and process decisions for
  Online Zoo and supersedes conflicting ad-hoc practices.
- **Amendment Process**: Any change to this Constitution MUST be executed via the
  `/speckit-constitution` workflow, documenting the rationale and updating the Sync Impact Report
  for review.
- **Versioning Policy**: Constitution revisions MUST follow Semantic Versioning (`MAJOR.MINOR.PATCH`):
  - `MAJOR`: Backward-incompatible governance changes, principle removals, or fundamental
    redefinitions.
  - `MINOR`: Addition of new principles or sections, or materially expanded compliance rules.
  - `PATCH`: Clarifications, wording refinements, or typo fixes that do not alter governance
    meaning.
- **Compliance Review**: All feature specifications, implementation plans, task lists, and code
  reviews MUST verify compliance with Principles I–IX. Any proposed complexity or exception MUST be
  explicitly justified in the relevant plan artifact.

**Version**: 1.0.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-04
