<text_mode_protocol>

## Text Mode — Plain-Text Menu Fallback

**When active:** Replace ALL `AskUserQuestion` calls with plain-text numbered lists.
The user types a number to select an option, or types free text for custom input.

**Activation (check in this order):**
1. `--text` flag in `$ARGUMENTS` → text mode ON for this session
2. `text_mode: true` in init JSON (from config) → text mode ON
3. Neither present → use normal `AskUserQuestion` TUI menus

**Why this exists:** Claude Code's `/rc` remote mode and the Claude mobile App cannot
forward TUI menu selections back to the host. Text-based input works across all
connection methods.

**How to present questions in text mode:**

Instead of:
```
AskUserQuestion(header: "Layout", question: "Which layout?", options: ["Cards", "List", "Grid"])
```

Present as:
```
**Layout** — Which layout?

1. Cards
2. List
3. Grid
4. Other (type your preference)

Type a number:
```

Parse the user's response:
- Number → select that option
- Text → treat as custom "Other" response
- Empty → retry once, then use option 1 as default

**This protocol applies to every workflow that uses AskUserQuestion.**

</text_mode_protocol>
