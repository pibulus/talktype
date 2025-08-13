# Task-Master User Guide

Task-Master is a powerful CLI tool for project management that helps organize, track, and manage tasks using Claude's AI capabilities.

## Setup

1. **Installation**:

   ```bash
   npm install task-master
   ```

2. **Initialization**:

   ```bash
   npx task-master init
   ```

3. **Environment Variables**:
   - Required: `ANTHROPIC_API_KEY` - Your Anthropic API key
   - Optional: `PERPLEXITY_API_KEY` - For research capabilities

## Key Commands

### Task Generation

- **Parse PRD to generate tasks**:

  ```bash
  npx task-master parse-prd --input=requirements.txt --tasks=10
  ```

- **Generate individual task files**:
  ```bash
  npx task-master generate
  ```

### Task Management

- **List all tasks**:

  ```bash
  npx task-master list
  # Filter by status:
  npx task-master list --status=pending
  # Show subtasks:
  npx task-master list --with-subtasks
  ```

- **Add a new task**:

  ```bash
  npx task-master add-task --prompt="Implement user authentication system"
  # With dependencies:
  npx task-master add-task --prompt="..." --dependencies=1,2
  ```

- **Update task status**:

  ```bash
  npx task-master set-status --id=1 --status=done
  ```

- **Update tasks with new information**:
  ```bash
  npx task-master update --from=3 --prompt="Change the login flow to use OAuth"
  ```

### Task Analysis & Detail

- **Break down a task into subtasks**:

  ```bash
  npx task-master expand --id=1 --num=5
  # Expand all pending tasks:
  npx task-master expand --all
  ```

- **Analyze complexity**:

  ```bash
  npx task-master analyze-complexity
  # With research:
  npx task-master analyze-complexity --research
  ```

- **View complexity report**:
  ```bash
  npx task-master complexity-report
  ```

### Task Navigation & Viewing

- **Show the next task to work on**:

  ```bash
  npx task-master next
  ```

- **Display detailed information about a task**:
  ```bash
  npx task-master show 1
  ```

### Dependency Management

- **Add dependencies between tasks**:

  ```bash
  npx task-master add-dependency --id=2 --depends-on=1
  ```

- **Remove dependencies**:

  ```bash
  npx task-master remove-dependency --id=2 --depends-on=1
  ```

- **Validate dependencies**:

  ```bash
  npx task-master validate-dependencies
  ```

- **Fix invalid dependencies**:
  ```bash
  npx task-master fix-dependencies
  ```

## Best Practices

1. Start by initializing the project: `npx task-master init`
2. Use `parse-prd` if you have a requirements document
3. Regularly use `npx task-master next` to determine what to work on
4. Keep task statuses updated with `set-status`
5. Break complex tasks down using `expand`
6. Manage dependencies properly to ensure correct task ordering

## Workflow Example

1. Initialize project: `npx task-master init`
2. Add initial tasks: `npx task-master add-task --prompt="..."`
3. Analyze complexity: `npx task-master analyze-complexity`
4. Expand complex tasks: `npx task-master expand --id=1`
5. Check next task: `npx task-master next`
6. Work on the task, then mark as done: `npx task-master set-status --id=1 --status=done`
7. Repeat steps 5-6 until project completion

## Customization

You can customize Task-Master behavior with environment variables:

- `MODEL`: Claude model to use (default: claude-3-7-sonnet)
- `MAX_TOKENS`: Maximum tokens for responses (default: 4000)
- `TEMPERATURE`: Temperature for model responses (default: 0.7)
- `DEFAULT_SUBTASKS`: Default number of subtasks to generate (default: 3)
- `DEFAULT_PRIORITY`: Default task priority (default: medium)
- `PROJECT_NAME`: Project name displayed in UI (default: Task Master)
