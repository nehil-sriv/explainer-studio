Explainer Studio - Incremental Framework Migration Plan
Agent handoff document. Read AGENTS. md and BACKLOG.md before starting work.
Objective
Migrate the current single-file, vanilla HTML/CSS/JavaScript editor to a maintainable React + TypeScript application without rewriting the product in one pass or changing the HTML/CSS scene-output model.
The editor should gain:
• A professional React application shell.
• Typed project and scene models.
• A single predictable state/command layer.
• Direct canvas manipulation: drag, drop, resize, rotate, multi-select and snapping.
• In-place text editing.
• A visual Story workflow for scenes, steps, state changes and component appearance order.
• Light and dark editor modes independent from canvas themes.
• Existing preview, popout, recording and export behavior.
The scene renderer must continue producing ordinary HTML and CSS. React is for the editor Ul and interaction layer, not a replacement for the exported scene format.
Current application
The application is currently centered in index.html, which is approximately 8,000 lines and contains or coordinates:
• The component REGISTRY.
• Component, edge and scene state.
• Canvas rendering.
• Selection and direct manipulation.
• Inspector and sequence Ul rendering.
• Playback and state changes.
• Undo/redo.
• Local persistence and project import/export.
• Popout synchronization.
• PNG, GIF, Web and recording behavior.
Existing canvas/theme CSS and project formats are valuable product assets and should be preserved during migration.
Non-negotiable constraints
1. Do not perform a big-bang rewrite.
2. Keep the current editor usable while systems are migrated.
3. Preserve backwards compatibility with existing project JSON and local storage.
4. Preserve the explicit-save rule: autosave, clear and open must never overwrite explicitly saved scenes.
5. Keep canvas themes independent from editor light/dark mode.
6. Keep editor, preview, popout and export rendering visually equivalent.
7. Do not replace the scene renderer with canvas bitmap drawing or a React-only representation.
8. Do not migrate playback, recording and every export path at the same time as the editor shell.
9. Preserve unrelated user changes in the worktree.
10. Every migration phase needs an acceptance gate and must be independently reversible.

Target architecture

React application shell:
Top toolbar
Component navigation and library
Canvas workspace
Properties inspector
Story
panel

Central editor store and command layer:
Project, scenes and steps
Components and edges
Selection
Playback state
Editor preferences
Undo/redo history

Framework-independent HTML/CSS renderer:
Component registry
Scene renderer
Edge renderer
State resolution
Playback visibility

Theme application:
Editor canvas
Preview
Popout
PNG/ SVG
GIF/WebM/recording

Recommended stack
• Vite for development and production builds.
• React for the editor shell.
•TypeScript for application and renderer code.
• Zustand for editor/project state.
• Zod for project-file validation and schema migration.
• React Moveable for canvas move/resize/rotate/group manipulation.
• React Selecto for marquee and multi-selection.
• dnd-kit for component-library drops and Story/scene sorting.
• Vitest for unit tests.
• Playwright for interaction and browser-level regression tests.
Node is initially build and development tooling. A Node backend is not required for the first migration. Add a backend only when accounts, cloud storage, collaboration, billing, asset hosting or server-side rendering require it.


Proposed source layout
src/
    app/
        App.tsx
        routes/ 
        providers/
    editor/ 
        shell/ 
        toolbar/ 
        library/ 
        canvas/ 
        inspector/ 
        story/ 
        inline-edit/
    domain/
        project.ts 
        scene.ts 
        step.ts 
        component.ts 
        edge.ts
        migrations/
    store/ 
        editorStore.ts
        commands/ 
        selectors/ 
        history/
    catalog /
        registry.ts 
        groups.ts 
        components/
    renderer/
        renderScene.ts 
        renderComponent.ts 
        renderEdges.ts 
        visibility.ts 
        stateChanges.ts 
        richText.ts
    playback/ 
    export/ 
    recording/ 
    persistence/
        localStorage.ts 
        projectFile.ts 
        autosave.ts
    styles/ 
        editor-tokens.css 
        editor-light.css 
        editor-dark. css

Existing canvas theme files should stay in their current locations until the renderer extraction is stable.


The exact schema should be validated against all current features before committing it, but the intended shape is;
interface Project {
schemaVersion: number; canvas: CanvasSettings;
scenes: Scene[]; assets: Asset[];
metadata: ProjectMetadata;
interface Scene
{
id: string;
name: string; steps: Step!];
components: SceneComponent[J;
edges: Edge[l;
}
interface Step {
id: string;
label: string;
componentIds: string[]; clearBefore?:
boolean;
holdSeconds?:
number;
}
interface SceneComponent
{
id: string;
type: ComponentType; transform: Transform;
appearance: Appearance;
props: Record<string, unknown>;
}

Transient editor state such as selection, hover, open tabs and live drag previews must not be serialized into project files.
Migration phases
Phase 0 - Establish a regression baseline
Create fixture projects covering:
• Multiple scenes.
• Components and groups.
• Wires, ports and edge routing.
• Clear, pin, hide and exit behavior.
• State-change steps.
• Stepped terminal/checklist components.
• Representative canvas themes.
• Popout playback.
• PNG, GIF and WebM export.
• Legacy project migration.

Add a browser-level smoke path:
Open project
→ select a component
→ move it
→ change a property
→ reorder a Story step
→ play the sequence
→ export
→ reload the project
Capture reference screenshots at fixed viewport and canvas sizes.
Acceptance gate: current behavior is reproducible and critical regressions can be detected automatically.
Phase 1 - Introduce the toolchain
Add Vite, React, TypeScript, Vitest, Playwright and lint/format tooling. Initially serve the existing builder through Vite with minimal behavior changes.
Requirements:
• Produce a deployable static build
• Keep the legacy entry point available during migration.
• Use relative asset URLs where practical.
• Document whether the new build requires HTTP serving. Do not silently break the current file:// fallback before a deliberate product decision is made.
Acceptance gate: the existing tool runs through Vite and the production build passes the Phase 0 smoke tests.
Phase 2 - Formalize and validate project data
Introduce typed domain models, schemaVersion, Zod validation and explicit migration functions.
Tasks:
• Inventory every serialized field currently used by components, edges, scenes, state changes, timing and canvas configuration.
• Create import migrations for current and legacy project variants.
• Separate serialization from DOM and Ul code.
• Separate localStorage, project-file and autosave adapters.
• Add round-trip tests: old JSON → typed project → exported JSON → re-import.
Acceptance gate: representative existing projects load and save without information loss or visual changes.
Phase 3 - Extract the renderer
Move component registry definitions and pure rendering/state-resolution behavior out of index.html.
Extract in small groups:
1. Rich-text parsing.
2. Component defaults and metadata.
3. Component markup functions.
4. Transform and visual-box calculations.
5. State-change resolution.
6. Visibility and sequence-state resolution.
7. Edge rendering and routing.
8. Full scene rendering.
The renderer should accept explicit input instead of reading editor globals:

renderScene({
scene, playbackPosition, selection: I], mode: "export",
}) ;
Suggested modes:
type
RenderMode =
"editor"
I "preview"
"popout"
"snapshot"
I "recording";
Acceptance gate: legacy and extracted renderers are visually equivalent on the fixture projects.
Phase 4- Introduce the store and command layer
Create a Zustand store, but prevent Ul components from modifying the project tree directly. All mutations should flow through commands such as:
commands. addComponent...)
commands. moveComponents...)
commands. resizeComponent(...)
commands . updateComponentProps(... )
commands. moveComponentToStep(...)
commands . reorderStep(... )
commands. deleteSelection(...)
Separate:
• Persistent project state.
• Transient editor state.
• Playback state.
• Export and recording state.
Undo/redo must be transaction-based:
pointer down → begin transaction pointer move → update live preview pointer up → commit one history entry
Acceptance gate: current editing operations work through commands, and one continuous gesture creates one undo step.
Phase 5 - Build the React application shell
Implement the approved editor structure:
AppShell
TopBar
ComponentNavigation
ComponentLibrary
CanvasWorkspace
PropertiesInspector
StoryPanel
Initially mount the existing or extracted renderer inside the React shell. Do not rewrite rendering and editor chrome simultaneously.


Implement editor design tokens and light/dark editor themes. Canvas theme selection must remain independent of editor appearance.
layer.
Acceptance gate: existing projects display in the new shell and inspector edits update the canvas through the command
Phase 6 - Add direct manipulation
Canvas behavior:
• Drag components directly.
• Resize from eight handles.
• Rotate when relevant.
• Shift-click multi-select.
• Marquee selection.
• Alignment and distance guides.
• Canvas-edge and component snapping.
• Keyboard nudging
• Duplicate and delete shortcuts.
• Group manipulation.
Coordinate conversion must account for the fitted canvas scale:
canvasX = (pointerX - canvasRect.left) / canvasScale;
canvasY = (pointerY - canvasRect.top) / canvasScale;
Use Moveable/Selecto for canvas manipulation and dnd-kit for structured drag-and-drop. Do not force one library to implement both interaction types.
Component-library behavior:
• Drag a component from the library.
• Show an accurate drop preview on the canvas.
• Drop at the corresponding canvas coordinates.
• Add it to the active Story step.
• Immediately select it.
• Retain click-to-add as an accessible alternative.
Acceptance gate: a user can assemble and position a basic explainer without using coordinate fields in the inspector.
Phase 7 - Add in-place text editing
Use a temporary text editor positioned over the rendered text rather than making permanent scene nodes unrestricted contenteditable elements.
Interaction contract:
single click select component
double click edit text
Enter commit a short label
Shift+Enter insert a line break
Escape cancel
click outside commit

The editor overlay must match the rendered font, size, width, line height, alignment and scale. Preserve the existing rich-text token format initially. One editing session should produce one undo entry.
Acceptance gate: supported text fields can be edited accurately on the canvas and remain identical in preview/export output.


Phase 8 - Build the Story workflow
Implement:
• Scene cards.
• Numbered draggable steps.
• Expandable active step.
• Component chips inside steps.
• Appear-together grouping.
• Move-to-new-step.
• Dragging components between steps.
• State-change steps.
• Clear, pin, hide and exit behavior.
• Scene preview cards.
• Scene and step creation.
The product rule is:
Canvas position controls where a component appears. Story order controls when it appears.
Required acceptance workflow:
Drag Database onto canvas
→ component is added to the active step → drag Failure Arrow into the same step
→ choose Appear together
→ add Alert to a new step
→ reorder the steps
→ preview with Space
Acceptance gate: the visual Story workflow produces the same sequence state as the existing engine.
Phase 9-Migrate playback and recording
After creation and Story editing are stable, migrate:
• Step playback.
• Auto playback.
• Hold timing.
• Entrance and exit animations.
• State changes.
• Popout synchronization.
• Region capture and recording controls.
Use one deterministic resolver:
const
frame = resolveSceneAtStep(scene, currentStep);
Editor preview, popout and recording should consume the resolved frame instead of reimplementing visibility rules independently.
Acceptance gate: editor, popout and recording show identical state at every sequence position.


Phase 10 - Migrate export paths
Port and verify one path at a time:
1. PNG.
2. SVG.
3. Per-component image export.
4. GIF.
5. WebM.
6. MP4/recording fallback.
Test canvas dimensions, self-hosted fonts, themes, state changes, hidden/exited elements, animations, edges, transparency and offline behavior where applicable.
Acceptance gate: export output matches the editor/preview fixtures and does not depend on legacy editor DOM ID:
Phase 11- Remove legacy bridges
Only remove a legacy subsystem after its replacement passes its gate.
Final work:
• Remove global mutable state.
• Remove inline event handlers.
• Remove duplicate rendering paths.
• Remove React-to-legacy bridges.
• Split the component registry into maintainable modules.
• Update documentation and deployment instructions.
• Keep a tagged legacy release for rollback and old-project recovery.
Interaction contract
Canvas keyboard behavior
• Arrow keys: nudge 1 px.
• Shift + Arrow: nudge 10 px.
• Shift while resizing: preserve aspect ratio.
• Option/Alt while resizing: resize from center.
• Cmd/Ctrl + D: duplicate.
• Delete/Backspace: remove selection when not editing text.
• Cmd/Ctri + Z: undo.
• Cmd/Ctrl + Shift + Zor Ctri + Y: redo.
• Escape: cancel the active gesture or exit playback according to context.
Story drag targets
• A line between rows reorders a step.
• A highlighted step receives a component.
• A New Step target creates a step containing the dropped component.
• A scene card receives or copies content according to the selected modifier/action.



Selection and inspector behavior
• Canvas selection must never unexpectedly change the active Story position.
• Selecting a component updates the inspector.
• Editing through the inspector and editing in place must invoke the same command.
• Multi-selection exposes only common editable properties.
• Selection Ul must never appear in preview, popout, recording or export.
Testing strategy
Unit tests
• Project validation and migrations.
• Rich-text parsing.
• State-change precedence.
• Step visibility and clear/pin/hide behavior.
• Edge visibility and routing inputs.
• Command results.
• Undo/redo transactions.
• Coordinate conversion.
Browser interaction tests
• Drag from library to canvas.
• Drag, resize and rotate an existing component.
• Marquee and group selection.
• Inline text editing.
• Story reordering and cross-step component moves.
• Keyboard shortcuts.
• Playback navigation.
• Local save and reload.
• Project import and export.
Visual regression tests
Compare fixed-size screenshots for:
• Editor light mode.
• Editor dark mode.
• Representative canvas themes.
• Each sequence position in a fixture scene.
• Editor canvas versus popout.
• Editor canvas versus PNG output.


Feature flags and rollout
Use temporary feature flags:
features. newShell
features. newRenderer
features. directManipulation features. inlineTextEditing features. newStoryPanel features. newPlayback features. newExport
Roll out in three stages:
1. Internal development mode.
2. Opt-in beta editor.
3. New editor becomes the default while legacy remains temporarily accessible.
Do not keep the feature flags indefinitely; remove each one after the new path is stable and the legacy path is retired.
First product milestone
The first user-valuable milestone should include:
Playback, recording and advanced exports may continue through compatibility adapters until the core creation workflow is stable.

React shell

+ typed project model

+ existing/extracted HTML renderer

+ drag from library to canvas

+ direct move and resize

+ in-place text editing

+ new Story panel

+ light and dark
editor modes
Agent execution guidance
1. Start with Phase 0. Do not begin by converting index. html wholesale.
2. Make small commits aligned to one extraction or acceptance gate.
3. Preserve output and behavior before attempting cleanup or redesign.
4. Prefer pure functions at renderer/domain boundaries.
5. Keep compatibility adapters explicit and temporary.
6. Run the relevant unit, browser and visual checks after every phase.
7. Document any schema change and add a migration in the same change.
8. Stop and report before making an architectural choice that changes scene output, project compatibility, offline behavior or the explicit-save rule.


Definition of migration completion
The migration is complete when:
• The new React editor is the default application.
• The current project library opens without destructive migration.
• Users can create, place, resize and edit content directly on the canvas.
• The Story panel is the authoritative appearance-order workflow.
• Light/dark editor mode does not affect canvas output.
• Preview, popout, recording and export agree at every step.
• Undo/redo treats gestures and editing sessions as meaningful transactions.
• The main application no longer depends on the monolithic inline script in index.html.
• Legacy bridges and flags have been removed.
• The static production build is deployable and documented.