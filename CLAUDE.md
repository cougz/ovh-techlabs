Here's a reduced version of CLAUDE.md that maintains the essential guidelines while being more manageable:

```markdown
# CLAUDE.md - Development Guidelines for Claude Code

## Critical Workflow Instructions

1. Always read PROJECT.md first to understand current state and next tasks
2. Work autonomously - follow TDD and commit frequently
3. Update PROJECT.md after completing tasks or discovering important context

## Development Process

```bash
# TDD Cycle - NO EXCEPTIONS
1. Red: Write failing test first
2. Green: Write minimal code to pass
3. Refactor: Improve if valuable
4. Commit: git add . && git commit -m "type: message" && git push
```

## Core Principles

### Test-Driven Development (Non-Negotiable)
- NO production code without failing test first
- Test behavior through public APIs only
- 100% coverage through business behavior tests
- No testing implementation details

### TypeScript Standards
```json
// tsconfig.json - strict mode required
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```
- Never use `any` - use `unknown` if needed
- Prefer `type` over `interface`
- Use real schemas/types in tests - never redefine

### Code Style
- Functional approach: immutable data, pure functions
- Small functions with single responsibility
- Options objects for function parameters
- Self-documenting code - no comments
- Early returns over nested conditionals

### Testing Best Practices
```typescript
// ✅ Good - Test behavior
it("should decline payment when insufficient funds", () => {
  const result = processPayment(payment, account);
  expect(result.success).toBe(false);
  expect(result.error.message).toBe("Insufficient funds");
});

// ❌ Bad - Testing implementation
it("should call checkBalance method", () => {
  // Tests HOW not WHAT
});
```

### Refactoring Guidelines
- Always assess after green
- Only refactor if it adds value
- Maintain external APIs
- Commit before and after refactoring
- DRY is about knowledge, not code structure

```typescript
// These look similar but represent different knowledge - DON'T abstract
const validateUserAge = (age: number): boolean => {
  return age >= 18 && age <= 100;
};

const validateProductRating = (rating: number): boolean => {
  return rating >= 1 && rating <= 5;
};
```

## Commit Standards
```bash
feat: add payment validation
fix: correct date formatting
refactor: extract validation logic
test: add edge cases
docs: update PROJECT.md
```

## Key Reminders
1. TDD is mandatory - no exceptions
2. Test behavior, not implementation
3. Refactor only when it improves code
4. Keep functions small and pure
5. Update PROJECT.md with learnings
6. Commit after every small change
7. No Commit CoAuthor messages

## Summary
Write clean, testable, functional code through small increments. Every line of production code must be driven by a failing test. When in doubt, favor simplicity over cleverness.
```
