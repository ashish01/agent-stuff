# Additional Global Instructions

## Python

- For Python-related tasks, prefer `uv` for running Python commands, scripts, tests, and tools.
- Use `uv run ...` instead of calling `python`, `python3`, `pip`, or virtualenv commands directly when practical.
- For ad-hoc Python dependencies, use `uv run --with <package> ...` rather than installing packages globally.
