# folio

Folio is a minimal Markdown reader and editor for Chrome. It uses a cream background, quiet colors, and generous spacing. Bionic reading emphasizes the beginning of each word.

Documents stay in the browser. The extension requests zero Chrome permissions and does not access other tabs. It only opens files that you choose or drop into the reader.

## Install manually in Chrome

You do not need Node.js or a build step to install folio. The download includes all extension files. Chrome loads the extension from a folder on your computer.

1. [Download the repository ZIP](https://github.com/B-a-1-a/markdown-renderer/archive/refs/heads/main.zip).
2. Extract the ZIP to a permanent folder on your computer.
3. Open `chrome://extensions` in Chrome.
4. Turn on Developer mode in the top-right corner.
5. Click Load unpacked.
6. Select the extracted `markdown-renderer-main` folder that contains `manifest.json`.
7. Open the Extensions menu in the Chrome toolbar.
8. Pin folio for easy access.
9. Click the folio icon to open the reader.

Select the extracted folder, not the ZIP file or its parent folder. Keep that folder in place while you use the extension. Folio requests zero Chrome permissions.

If you already cloned this repository, select your local repository folder in step 6. To update an installed copy, replace its files with the latest download. Then click Reload on the folio card at `chrome://extensions` and reopen the reader.

For a folder that contains only extension files, run `npm ci` and `npm run build`. Select the generated `dist/` folder in step 6. This build step is optional.

## Read and write

Drop a `.md`, `.markdown`, `.mdown`, `.mkd`, or `.txt` file onto the page. Each file can be up to 2 MB. Open one file at a time. Command/Ctrl + O opens the file picker.

Choose Read to view a document or Edit to change its Markdown. Replace the editor contents to start a new document. Changes save automatically in browser storage and do not change your original file. Command/Ctrl + S downloads a Markdown copy.

Turn on Bionic reading to emphasize word beginnings. Code blocks, inline code, headings, and existing bold text keep their formatting. The Aa button cycles through three text sizes.

Command/Ctrl + O opens a file. Command/Ctrl + S downloads the current document. The current document, reading size, and bionic preference persist across visits.

The page contains only reading controls, the document, and a collapsed section rail. Hover over the bars or click them to reveal section names. Click a section name to jump to it. The darker bar marks the current section. Escape closes the section list.

## Privacy and file support

The extension has no permissions, content scripts, analytics, remote fonts, or network requests. A content security policy blocks network connections and remote images. External links only open when you click them.

Remote images appear as links. Relative image paths appear as placeholders because the reader cannot access nearby files. Embedded PNG, JPEG, GIF, and WebP data images work offline. Marked parses Markdown, and DOMPurify removes unsafe HTML before display. Both libraries ship with the extension and include their licenses in `vendor/`.

Browser storage has a size limit. If storage is full, folio shows a message that asks you to download your document. Browser data removal or extension removal deletes saved documents. Keep downloaded copies of work that you need.

## Run the browser preview

Use Node.js 20 or later. Run `npm ci`, then `npm start`. Open `http://localhost:3000` to use the same reader as a local website. The preview server listens only on this computer.

Run `npm run check` to inspect JavaScript syntax, packaged files, and the permission policy. Run `npm run build` to create the extension folder at `dist/`. Dependency versions are fixed in `package-lock.json`.

## License

Folio is available under the [MIT License](LICENSE). Copyright (c) 2026 BalaS. Bundled libraries retain their original licenses in `vendor/`.
