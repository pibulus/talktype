# TalkType Cleanup Plan

## Core Philosophy
- **DON'T BREAK WHAT WORKS**: Current functionality is great - preserve it
- **80/20 PRINCIPLE**: Focus on high-impact simplifications with minimal effort
- **NO OVERENGINEERING**: Prefer simple solutions over complex abstractions
- **CONDENSE & SIMPLIFY**: Reduce code duplication and complexity
- **INCREMENTAL CHANGES**: Make small, testable changes rather than big rewrites

## Priority Areas

### 1. Ghost Animation Consolidation
**Current state**: Animation logic is spread across multiple functions with complex state tracking.

**Cleanup goal**: Create a simpler "ambient blinking" system without changing visual behavior.

**Approach**:
- Replace multiple timeouts with a single controlled system
- Reduce the number of global variables for tracking state
- Ensure animations never conflict with recording state
- DO NOT create complex class hierarchies or state machines

### 2. CSS Animation Simplification
**Current state**: Similar animations have duplicated keyframe definitions.

**Cleanup goal**: Consolidate similar animations without changing visual behavior.

**Approach**:
- Keep all current animation capabilities
- Combine similar keyframe definitions
- Use CSS variables for animation parameters where appropriate
- DO NOT change animation timing or visual appearance

### 3. Event Handling Cleanup
**Current state**: Some event handlers have duplicate error-handling code.

**Cleanup goal**: Reduce code duplication in event handlers.

**Approach**:
- Extract common error handling patterns to helper functions
- Keep current error messages and recovery behavior
- Maintain all existing user-visible error states
- DO NOT change the event flow or add complex abstractions

### 4. Preloading Logic Simplification
**Current state**: Model preloading happens in multiple places.

**Cleanup goal**: Create a single source of truth for preloading.

**Approach**:
- Use a single function for preloading logic
- Keep existing preloading triggers (hover, etc.)
- Maintain current preloading performance benefits
- DO NOT create complex dependency systems

### 5. State Management Improvement
**Current state**: Multiple boolean flags track recording/transcription state.

**Cleanup goal**: Reduce potential for state inconsistencies.

**Approach**:
- Consider a simple enum-style state instead of multiple booleans
- Keep all current state transitions working the same way
- Ensure recording state is always consistent
- DO NOT implement a full reactive state management library

## Implementation Guidelines

### DO:
- Test each change individually
- Preserve all current visual behaviors
- Focus on readability and maintainability
- Keep changes localized to specific components
- Document the purpose of each simplification
- Use consistent naming conventions

### DON'T:
- Add new dependencies or libraries
- Change the user-visible behavior
- Implement complex abstractions
- Create premature optimizations
- Make unrelated style or feature changes
- Rewrite working code unnecessarily

## Success Criteria
- All current functionality works the same way
- Code is easier to understand and maintain
- Fewer potential edge cases and bugs
- Reduced total lines of code
- Improved code consistency

This plan prioritizes practical improvements that make the codebase more maintainable without risking current functionality. Each change should be small, focused, and easy to verify.