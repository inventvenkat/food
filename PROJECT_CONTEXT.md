# Recipe App - Project Context & Development Notes

This document serves as a "memory bank" or context summary for the `recipe-app` project, detailing its architecture, key features, development history, and important decisions made as of June 14, 2025.

## 1. Project Overview

-   **Project Name:** `recipe-app`
-   **Type:** Full-stack web application.
    -   **Frontend:** React
    -   **Backend:** Node.js/Express with MongoDB
-   **Purpose:** A platform for users to create, manage, and share recipes. It allows users to input recipe details manually or by parsing text using an external LLM.
-   **Key Feature Focus (Recent):**
    -   Implementation and refinement of a feature to parse recipe details (title, description, ingredients, cooking time, servings, category, tags, instructions) from user-provided text. The primary method for this is by guiding the user to leverage an external LLM of their choice.
    -   This involves the application generating a specific JSON-formatted prompt for the LLM. The user then copies this prompt, uses it with their LLM along with the recipe text/file, and pastes the LLM's JSON output back into the application to populate the recipe creation form.
    -   Audio assistance for reading out recipes on the detail page.

## 2. Key Technical Concepts & Stack

### Frontend (`recipe-app/client/`)
-   **Framework/Library:** React (functional components, Hooks: `useState`, `useEffect`).
-   **Routing:** React Router (`useNavigate`, `useParams`, `Link`).
-   **Styling:** Tailwind CSS.
-   **API Communication:** Primarily `fetch` API for creating recipes; `axios` was used in `RecipeUpload.js` (now removed from `CreateRecipePage`).
-   **Rich Text Editing:** Tiptap editor (`@tiptap/react`, `@tiptap/starter-kit`) for recipe instructions. See `src/components/RichTextEditor.js`.
-   **Speech Synthesis:** Browser's Web Speech API (`window.speechSynthesis`) for audio recipe assistance on `RecipeDetailPage.js`.
-   **Clipboard Interaction:** `navigator.clipboard.writeText()` for copying LLM prompts in `CreateRecipePage.js`.

### Backend (`recipe-app/server/`)
-   **Framework:** Node.js with Express.js.
-   **Database:** MongoDB with Mongoose ODM.
-   **Authentication:** JWT (JSON Web Tokens) via `authMiddleware.js`.
-   **File Uploads:** `multer` (used for image uploads and previously for server-side recipe file parsing).
-   **Text Extraction from Files:**
    -   `mammoth` for DOCX.
    -   `pdf-parse` for PDF.
    (Implemented in `utils/recipeParser.js`'s `extractTextFromFile` function).

## 3. Core Features Implemented/Worked On

-   **User Authentication:** Registration, login, protected routes using JWT.
-   **Recipe Management (CRUD):**
    -   Creating new recipes with detailed fields (name, description, cooking time, servings, instructions, category, tags, ingredients, image, public/private status).
    -   Viewing recipe details (`RecipeDetailPage.js`).
    -   Editing and Deleting recipes (functionality present in `RecipeDetailPage.js` for authorized users).
    -   Listing public recipes and user's own recipes.
-   **LLM-Assisted Recipe Parsing (Primary Method for Importing):**
    -   Located in `recipe-app/client/src/pages/CreateRecipePage.js`.
    -   Workflow:
        1.  User clicks "Copy LLM Formatting Instructions".
        2.  Application generates a prompt containing a target JSON schema and copies it to the clipboard.
        3.  User pastes these instructions into their preferred external LLM, then provides their recipe text/file to that LLM.
        4.  User copies the JSON output from the LLM.
        5.  User pastes this JSON into a designated textarea in the application.
        6.  User clicks "Fill Form from LLM JSON".
        7.  The application parses this JSON and populates all relevant fields in the recipe creation form.
    -   Expected JSON structure from LLM: `{ title, description, cookingTime, servings, category, tags: [], ingredients: [{ quantity, unit, name }], instructions }`.
-   **Audio Assistance for Recipes:**
    -   Implemented in `recipe-app/client/src/pages/RecipeDetailPage.js`.
    -   Uses `window.speechSynthesis` to read out recipe details.
    -   Includes play/pause/stop controls.
-   **Internal Recipe Parser (Server-Side - `customIngredientParser` in `utils/recipeParser.js`):**
    -   This parser was iteratively developed to extract title, description, and structured ingredients (quantity, unit, name).
    -   It includes heuristics for various quantity formats (simple fractions, Unicode fractions, mixed fractions, ranges) and for filtering subheadings/instructional phrases.
    -   The UI flow for direct server-side parsing ("Option 1") was removed from `CreateRecipePage.js` in favor of the LLM-assisted approach. The backend endpoint `/api/recipes/upload-extract` which used this parser is likely no longer hit from the primary UI flow but the code still exists.

## 4. Relevant Files and Code Structure (Key Files)

-   **`recipe-app/client/src/pages/CreateRecipePage.js`:**
    -   Central component for recipe creation.
    -   Manages the LLM-assisted parsing workflow.
    -   `handleRecipeDetailsExtracted(parsedRecipeData)`: Populates form state from LLM JSON. Includes logic to parse servings string to number and convert tags array to comma-separated string for the form.
    -   `handleGenerateLlmPrompt()`: Creates JSON schema prompt and copies to clipboard.
    -   `handleFillFormFromLlmJson()`: Parses LLM JSON and calls `handleRecipeDetailsExtracted`.
-   **`recipe-app/client/src/components/RichTextEditor.js`:**
    -   Tiptap-based rich text editor.
    -   Includes a `useEffect` hook to synchronize its internal state with the `value` prop, ensuring external updates (like from LLM parsing) are displayed.
-   **`recipe-app/client/src/pages/RecipeDetailPage.js`:**
    -   Displays full recipe details.
    -   Contains the audio assistance feature logic.
    -   Handles fetching public or owned recipes.
-   **`recipe-app/server/utils/recipeParser.js`:**
    -   `extractTextFromFile(file)`: Extracts raw text from DOCX, PDF, TXT files.
    -   `customIngredientParser(text)`: The original server-side parser, now more of a utility if direct server parsing is ever re-enabled. It attempts to parse title, description, and structured ingredients.
-   **`recipe-app/server/routes/recipes.js`:**
    -   Defines API endpoints for recipes (CRUD, public listing, search).
    -   The `/api/recipes/upload-extract` endpoint uses `customIngredientParser`.
-   **Models (`recipe-app/server/models/`):**
    -   `Recipe.js`: Mongoose schema for recipes.
    -   `User.js`: Mongoose schema for users.
-   **Middleware (`recipe-app/server/middleware/`):**
    -   `authMiddleware.js`: Protects routes using JWT.

## 5. Problem Solving & Key Decisions During Development

-   **Shift to LLM-Assisted Parsing:** The initial approach of building a comprehensive server-side parser (`customIngredientParser`) proved challenging due to the high variability in recipe formats. The decision was made to shift the primary import/parsing mechanism to an LLM-assisted workflow, where the application provides formatting instructions to the user, who then uses their own LLM. This offers greater flexibility and potentially higher accuracy.
-   **Debugging `RichTextEditor` Display:** Resolved an issue where the `RichTextEditor` (for instructions) wouldn't update its display when its `value` prop was changed programmatically (e.g., after LLM parsing). This was fixed by adding a `useEffect` hook in `RichTextEditor.js` to explicitly set the editor's content when the `value` prop changes.
-   **Servings Input Type:** Addressed a console error caused by trying to set a string like "4 people" to an `<input type="number">` for servings. The `handleRecipeDetailsExtracted` function now parses out the numerical part.
-   **UX Enhancements for LLM Workflow:**
    -   Changed the "Get LLM Formatting Instructions" button to also copy the instructions to the clipboard.
    -   Removed the intermediate step of pasting raw recipe text into the app for the LLM workflow; users now provide text/file directly to their LLM.
-   **Iterative Parser Development (for `customIngredientParser`):**
    -   Significant effort was invested in incrementally improving the server-side parser's ability to detect titles, descriptions, and structured ingredients (quantity, unit, name), including handling various fraction formats and filtering non-ingredient lines. While not the primary UI path now, this logic remains in the codebase.

## 6. Current State & Potential Future Considerations

-   **Primary Recipe Import:** Relies on the LLM-assisted workflow.
-   **Internal Parser:** The `customIngredientParser` and its associated API endpoint `/api/recipes/upload-extract` are still in the backend codebase but are not directly triggered by the main UI flow in `CreateRecipePage.js` anymore. A decision could be made to fully remove this backend code or keep it for potential future use/internal tools.
-   **Further UI/UX Refinements for LLM Workflow:** Discussed ideas like a stepper/accordion layout or a modal for displaying LLM instructions to make the process even more user-friendly.
-   **Parsing Other Fields with Internal Parser:** Before shifting focus heavily to the LLM approach, there was a plan to extend `customIngredientParser` to also extract cooking time, servings, category, tags, and instructions. This work was superseded by the LLM strategy for those fields.

This document should help maintain context and understanding of the `recipe-app` project's development and current state.
