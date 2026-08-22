# Refactoring

Prefer a surgical fix when the behavior, boundary, and ownership are already correct. Refactor
when duplication obscures a stable concept, a module violates dependency direction, tests cannot
isolate behavior, or the slice requires the same contract across multiple consumers.

Do not use refactoring to hide a missing backend capability, bypass authorization, or redesign an
unrelated area. Keep abstractions at the owning boundary, prefer composition, and preserve public
contracts unless the slice explicitly includes a versioned migration. Split broad changes into
reviewable commits and retain a tested intermediate state.
