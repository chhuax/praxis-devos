Use this command to start a new OpenSpec change and stop at the first artifact boundary.

Expect a change name or a short description to convert into a kebab-case change id.

Shared workflow expectations:

- Create the change with the project default schema unless the user explicitly asks for another one.
- Show the resulting artifact graph after creation.
- Fetch instructions for the first ready artifact.
- Stop after presenting the first artifact entrypoint instead of drafting artifacts immediately.
- Make it clear how the user can continue from there.
