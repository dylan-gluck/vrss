# Risk Mitigation

**Risk 1: Timeline Slippage**
- **Mitigation:** Prioritize P0/P1 features first, defer P2 to post-MVP
- **Fallback:** Ship Phase 1-4 as minimal MVP, iterate on Phase 5-7

**Risk 2: Testcontainers Performance**
- **Mitigation:** Use Testcontainers only for integration tests, unit tests use mocks
- **Fallback:** Shared test database with aggressive cleanup

**Risk 3: Complex Drag-and-Drop UI**
- **Mitigation:** Use proven library (@dnd-kit), extensive testing
- **Fallback:** Manual reorder buttons if drag-drop too complex

**Risk 4: Offline Sync Conflicts**
- **Mitigation:** Last-write-wins for MVP, show conflict UI
- **Fallback:** Queue only idempotent operations (likes, follows)

**Risk 5: Better-auth Integration Issues**
- **Mitigation:** Follow official docs, test heavily, fallback to custom JWT
- **Fallback:** Implement session management manually with JWT

---
