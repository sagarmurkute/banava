# Banava (Sagar Design)

A fast, modern, and extensible browser-based UI design editor built with React, TypeScript, Vite, and Zustand.

## Features

- **Infinite Canvas Workspace**: Smooth panning (`Space + Drag`), zooming centered around the cursor, and subtle vector canvas grid.
- **Document & Layer Architecture**: Supports Frames, Rectangles, Ellipses, Lines, and Text objects with nesting and hierarchical layer tree.
- **Selection & Transform System**: Single/multi-selection, bounding box with 8 resize handles, drag-to-move, and drag-to-create primitives.
- **Inspector Panel**: Real-time property editing for transforms, corner radius, appearance, fill/stroke colors, and typography.
- **Multi-Selection Alignment**: One-click alignment tools (Align Left, Center, Right, Top, Middle, Bottom, Distribute Horizontally & Vertically).
- **Undo / Redo & History**: Full document state snapshot history.
- **Multi-Page Support**: Create, rename, delete, and switch between separate design pages.
- **Local Persistence**: Automatic versioned local storage saving and rehydration.

## Keyboard Shortcuts

| Key / Shortcut | Action |
| --- | --- |
| `V` | Select Tool |
| `F` | Frame Tool |
| `R` | Rectangle Tool |
| `O` | Ellipse Tool |
| `L` | Line Tool |
| `T` | Text Tool |
| `Space + Drag` | Pan Canvas |
| `Ctrl / ⌘ + Z` | Undo |
| `Ctrl / ⌘ + Shift + Z` | Redo |
| `Ctrl / ⌘ + A` | Select All |
| `Ctrl / ⌘ + S` | Save to Local Storage |
| `Delete / Backspace` | Delete Selection |
| `Escape` | Deselect |

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **State Management**: Zustand
- **Styling**: Modular Vanilla CSS & Custom Design Tokens
- **Icons**: Lucide React

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/sagarmurkute/banava.git
   cd banava
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```
