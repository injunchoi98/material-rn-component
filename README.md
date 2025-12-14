# Epub Reader Module

This module provides a React Native component for rendering EPUB files using `epub.js` inside a `react-native-webview`.

## 📦 Installation

```sh
npx expo install react-native-webview react-native-gesture-handler react-native-fs
```

If you develop for iOS use this command for install CocoaPods deps (if you use an expo managed project you don't need this)
In your ios project folder run:

```sh
npx pod-install
```

For bare react-native projects, add the following permissions to Info.plist:

```xml
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

## 🏗 Architecture

The project is structured into three main layers to separate concerns between State Management, Logic, and UI Rendering.

### 1. Data Layer: `<Book />` & `useBook`
- **Role**: State Provider & Logic Controller.
- **Location**: `src/Book.tsx`, `src/hooks/useBook.ts`
- **Function**:
    - Initializes the `useBook` hook which holds the entire state of the reader (current location, theme, bookmarks, annotations, etc.).
    - Uses a `useReducer` pattern to manage state transitions.
    - Provides `BookContext` so any child component can access or modify the reader state.
    - **Key States**:
        - `isLoading`: Native side preparation (downloading file, reading FS).
        - `isRendering`: WebView side parsing & rendering (parsing EPUB, generating DOM).
        - `bookmarks`, `annotations`: Managed in React state but synthesized into the WebView.

### 2. Logic Layer: `<Reader />`
- **Role**: Bridge & Orchestrator.
- **Location**: `src/Reader.tsx`
- **Function**:
    - Consumes `BookContext`.
    - Handles file system operations (loading local files vs downloading URLs).
    - **"Direct Injection"**: Generates the HTML template string. Crucially, it injects initial state (like `initialAnnotations`, `theme`) *directly* into the HTML string before the WebView even loads. This prevents "flashing" issues where content loads unstyled and then styles apply milliseconds later.
    - Passes the prepared `template` (HTML) and necessary props to the View.

### 3. UI Layer: `<View />`
- **Role**: Presenter.
- **Location**: `src/View.tsx`
- **Function**:
    - Renders the `react-native-webview`.
    - Handles incoming messages from the WebView (`onMessage`) and dispatches them to the `useBook` actions.
    - Manages gestures and UI-related events.

---

## 🌉 The WebView Bridge (How it works)

Since `epub.js` runs in a browser environment (inside WebView) and our app runs in React Native, they communicate via a "Bridge".

### 1. React Native -> WebView (Injection)
We have two ways to send data to the WebView:
*   **Direct Injection (Initialization)**:
    - We manipulate the HTML string in `useInjectWebviewVariables.ts` before rendering.
    - Variables like `window.initialAnnotations`, `window.theme` are baked into the HTML.
    - `template.ts` reads these global variables immediately upon startup.
*   **`injectJavaScript` (Runtime Updates)**:
    - When user changes theme or adds a bookmark *after* load, we use `webviewRef.injectJavaScript('rendition.themes.select(...)')`.
    - Functions in `src/hooks/useBook.ts` often call `injectJavaScript`.

### 2. WebView -> React Native (Messaging)
*   The WebView runs standard JavaScript. We use `window.ReactNativeWebView.postMessage(JSON.stringify(data))` to send events out.
*   **`src/template.ts`**: Contains the logic running inside the WebView. It hooks into `epub.js` events (like `relocated`, `selected`) and posts messages.
*   **`src/View.tsx`**: Listens to `onMessage`, parses the JSON, and calls the appropriate React state update functions.

---

## 📂 Key Files Explained

- **`src/template.ts`**: The "Heart" of the webview. It's a template string containing the actual HTML/JS that runs inside the WebView. It initializes `ePub` object, sets up listeners, and handles rendering loops.
- **`src/hooks/useInjectWebviewVariables.ts`**: A helper hook that takes the raw `template.ts` string and replaces placeholders (e.g., `// location_placeholder`) with actual data.
- **`src/types.ts`**: Shared type definitions.

## 🛠 Common Questions

### Why `isLoading` vs `isRendering`?
- **`isLoading`**: The "Native" loading state. True while downloading the file or reading base64 data. The WebView hasn't even started yet.
- **`isRendering`**: The "Web" loading state. True while `epub.js` is parsing the book and calculating the layout.
- Separating these allows for granular UI feedback (e.g., "Downloading..." vs "Opening Book...").

### Why `setAtStart` / `setAtEnd`?
- While `currentLocation` has this info, `epub.js` emits specific edge events (`onBeginning`, `onFinish`).
- Keeping these as state allows for robust UI blocking (e.g., disabling the "Prev" button) without needing to deeply query the `currentLocation` object on every render.

## 🚀 Usage

Wrap your application (or the screen where you want to show the reader) with the `<Book>` provider. Then, render the `<Reader>` component inside it.

```tsx
import { Book, Reader } from '@epubjs-react-native/core';

export default function App() {
  return (
    <Book
      initialTheme={{ /* ... */ }}
      initialBookmarks={[]}
      // The Reader component will now have access to the book's context
    >
      <MyReaderScreen />
    </Book>
  );
}

function MyReaderScreen() {
    return (
        <Reader
            src="https://example.com/books/moby-dick.epub"
            width="100%"
            height="100%"
        />
    );
}
```
***Note**: Since `Book` uses `React.Context`, any component that wants to access book state (like `useBookContext().bookmarks`) must be a child of `<Book>`. `Reader` is simply the visual component.*

