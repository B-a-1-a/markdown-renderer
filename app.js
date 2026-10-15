/* Markdown Reader: all document handling happens locally, with no network requests. */
"use strict";
const $ = (selector) => document.querySelector(selector);
// Keep image URLs inert until Markdown Reader can handle them without loading remote content.
DOMPurify.addHook("uponSanitizeAttribute", (node, attribute) => {
  if (node.tagName === "IMG" && attribute.attrName === "src") {
    node.setAttribute("data-reader-src", attribute.attrValue);
    attribute.keepAttr = false;
  }
});
const initialDocuments = [
  {
    id: "less",
    name: "a-little-less.md",
    category: "A NOTE ON SIMPLICITY",
    detail: "A note on simplicity",
    content: `# A little less, a little better.

A few thoughts on making space for the things that matter. And letting the rest quietly fall away.

---

## The beauty of enough

There is a particular kind of calm that comes from having just what you need. A clear desk. A good book. A small window with a view of something green.

We spend so much time adding. Another app, another commitment, another thing to keep up with. But the most meaningful improvements often come from taking something away.

> Simplicity is making room for what matters.

It isn’t about owning nothing, or doing less for the sake of it. It’s about being a little more intentional with what we let into our days.

## A little room to think

Good ideas rarely arrive when every moment is full. They tend to find us on a walk, in the quiet before everyone wakes up, or halfway through making a cup of tea.

Leave a few spaces unfilled. Close the tabs you no longer need. Let a thought finish before starting the next one.

- Choose one thing to give your full attention to.
- Keep a small place for ideas, without organizing them first.
- Make something for the simple pleasure of making it.

## Keep what feels useful

A tool should feel like an open door, not another thing to manage. The best ones get out of the way and let you return to what you came to do.

That’s the idea behind this little reader. Your words, a comfortable page, and just enough to make it your own.

Try **bionic reading** above to gently emphasize the beginning of each word. Or switch to **Edit** and make this page yours.

## Start small

You don’t have to change everything. Pick one corner of your day. One shelf. One habit. One document.

Give it a little breathing room, and see what happens.

*Less noise. More meaning. A little better, every day.*`,
  },
];
const STORAGE_KEY = "markdown-reader.workspace.v1";
// Read the original storage key once to preserve documents from before the rename.
const LEGACY_STORAGE_KEY = "folio.workspace.v1";
let stored = {};
try {
  stored =
    JSON.parse(
      localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_STORAGE_KEY) ||
        "{}",
    ) || {};
} catch {
  /* Start fresh if the browser storage is invalid. */
}
const validDoc = (d) =>
  d &&
  typeof d.id === "string" &&
  typeof d.name === "string" &&
  typeof d.content === "string" &&
  d.content.length <= 2 * 1024 * 1024;
let documents =
  Array.isArray(stored.documents) && stored.documents.some(validDoc)
    ? stored.documents.filter(validDoc)
    : structuredClone(initialDocuments);
let activeId = documents.some((d) => d.id === stored.activeId)
  ? stored.activeId
  : documents[0].id;
let bionic = stored.bionic === true;
let size = [0, 1, 2].includes(stored.size) ? stored.size : 1;
let toastTimer, saveTimer;
let outlineHeadings = [];
let outlinePinned = false;
let outlineFrame = 0;
const current = () => documents.find((d) => d.id === activeId);
const wordCount = (content) =>
  (content.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
function persist() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ documents, activeId, bionic, size }),
    );
  } catch {
    notify("Browser storage is full. Download your document to keep a copy.");
  }
}
function titleOf(doc) {
  return (
    /^#\s+(.+)$/m.exec(doc.content)?.[1]?.replace(/[*_`]/g, "") ||
    doc.name.replace(/\.[^.]+$/, "")
  );
}
function applyBionic(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement.closest(
        "pre, code, strong, b, h1, h2, h3, h4, h5, h6, kbd, samp",
      )
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    const pattern = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;
    let index = 0;
    for (const match of node.textContent.matchAll(pattern)) {
      fragment.append(node.textContent.slice(index, match.index));
      const letters = Array.from(match[0]);
      const count = letters.length <= 3 ? 1 : Math.ceil(letters.length * 0.45);
      const bold = document.createElement("b");
      bold.className = "bionic";
      bold.textContent = letters.slice(0, count).join("");
      fragment.append(bold, letters.slice(count).join(""));
      index = match.index + match[0].length;
    }
    fragment.append(node.textContent.slice(index));
    node.replaceWith(fragment);
  }
}
function renderMarkdown(content) {
  const root = $("#document");
  root.innerHTML = DOMPurify.sanitize(
    marked.parse(content, { gfm: true, breaks: false }),
    {
      USE_PROFILES: { html: true },
      FORBID_TAGS: [
        "style",
        "form",
        "button",
        "textarea",
        "select",
        "video",
        "audio",
        "iframe",
        "object",
        "embed",
        "link",
        "meta",
      ],
      FORBID_ATTR: [
        "style",
        "id",
        "name",
        "autofocus",
        "src",
        "srcset",
        "background",
        "poster",
        "ping",
        "action",
        "formaction",
      ],
    },
  );
  root.querySelectorAll("input").forEach((input) => {
    if (input.type === "checkbox") input.disabled = true;
    else input.remove();
  });
  root.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else if (!href.startsWith("#")) {
      link.removeAttribute("href");
      link.title = "Relative links need the original document location";
    }
  });
  root.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("data-reader-src") || "";
    img.removeAttribute("data-reader-src");
    if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src)) {
      img.src = src;
      return;
    }
    const note = document.createElement("span");
    note.textContent = `[Image: ${img.alt || "image"}]`;
    if (/^https?:\/\//i.test(src)) {
      const a = document.createElement("a");
      a.href = src;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = note.textContent;
      a.title = "Open image in a new tab";
      img.replaceWith(a);
    } else {
      note.title = "Use an embedded data image to display it offline";
      img.replaceWith(note);
    }
  });
  // Heading IDs are generated by Markdown Reader, never taken from imported HTML.
  const used = new Set();
  root.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading) => {
    const slug =
      heading.textContent
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "") || "section";
    let id = slug,
      n = 2;
    while (used.has(id)) id = `${slug}-${n++}`;
    used.add(id);
    heading.id = id;
  });
  buildOutline();
  if (bionic) applyBionic(root);
}
function setOutlineOpen(open) {
  $("#outline-toggle").setAttribute("aria-expanded", String(open));
  $("#outline-toggle").setAttribute(
    "aria-label",
    open ? "Hide sections" : "Show sections",
  );
  $("#outline-links").hidden = !open;
}
function updateOutlinePosition() {
  outlineFrame = 0;
  if (!outlineHeadings.length) return;
  let active = outlineHeadings[0];
  for (const heading of outlineHeadings) {
    if (heading.getBoundingClientRect().top <= innerHeight * 0.3)
      active = heading;
    else break;
  }
  if (
    scrollY > 0 &&
    Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight
  ) {
    active = outlineHeadings.at(-1);
  }
  const links = [...$("#outline-links").querySelectorAll("a")];
  const markers = [...$("#outline-markers").children];
  outlineHeadings.forEach((heading, index) => {
    const current = heading === active;
    links[index].classList.toggle("current", current);
    markers[index].classList.toggle("current", current);
    if (current) links[index].setAttribute("aria-current", "location");
    else links[index].removeAttribute("aria-current");
  });
  const marker = markers[outlineHeadings.indexOf(active)];
  const rail = $("#outline-markers");
  if (marker.offsetTop < rail.scrollTop) rail.scrollTop = marker.offsetTop;
  else if (
    marker.offsetTop + marker.offsetHeight >
    rail.scrollTop + rail.clientHeight
  ) {
    rail.scrollTop = marker.offsetTop + marker.offsetHeight - rail.clientHeight;
  }
}
function buildOutline() {
  outlinePinned = false;
  setOutlineOpen(false);
  const nav = $("#outline-links");
  const markers = $("#outline-markers");
  nav.replaceChildren();
  markers.replaceChildren();
  outlineHeadings = [...$("#document").querySelectorAll("h2, h3, h4, h5, h6")];
  $(".outline").hidden = !outlineHeadings.length || $("#document").hidden;
  outlineHeadings.forEach((heading) => {
    const link = document.createElement("a");
    const marker = document.createElement("span");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    marker.className = "outline-marker";
    if (heading.tagName !== "H2") {
      link.classList.add("is-nested");
      marker.classList.add("is-nested");
    }
    link.addEventListener("click", () => {
      outlinePinned = false;
      setOutlineOpen(false);
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
    nav.append(link);
    markers.append(marker);
  });
  updateOutlinePosition();
}
$(".outline").addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse") setOutlineOpen(true);
});
$(".outline").addEventListener("pointerleave", () => {
  if (!outlinePinned && !$(".outline").contains(document.activeElement))
    setOutlineOpen(false);
});
$(".outline").addEventListener("focusout", (event) => {
  if (!$(".outline").contains(event.relatedTarget)) {
    outlinePinned = false;
    setOutlineOpen(false);
  }
});
$("#outline-toggle").addEventListener("click", () => {
  outlinePinned = !outlinePinned;
  setOutlineOpen(outlinePinned);
});
$(".outline").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.stopPropagation();
    outlinePinned = false;
    setOutlineOpen(false);
    $("#outline-toggle").focus({ preventScroll: true });
  }
});
document.addEventListener("pointerdown", (event) => {
  if (!$(".outline").contains(event.target)) {
    outlinePinned = false;
    setOutlineOpen(false);
  }
});
function scheduleOutlineUpdate() {
  if (!outlineFrame)
    outlineFrame = requestAnimationFrame(updateOutlinePosition);
}
window.addEventListener("scroll", scheduleOutlineUpdate, { passive: true });
window.addEventListener("resize", scheduleOutlineUpdate);
function renderDocument() {
  const doc = current();
  $("#document-category").textContent = doc.category || "YOUR OWN WORDS";
  const count = wordCount(doc.content);
  $("#word-count").textContent = `${count.toLocaleString()} words`;
  $("#read-time").textContent =
    `${Math.max(1, Math.ceil(count / 200))} min read`;
  document.title = `${titleOf(doc)} — Markdown Reader`;
  renderMarkdown(doc.content);
  $("#editor").value = doc.content;
}
function setView(edit) {
  $("#read-view").classList.toggle("selected", !edit);
  $("#read-view").setAttribute("aria-pressed", String(!edit));
  $("#edit-view").classList.toggle("selected", edit);
  $("#edit-view").setAttribute("aria-pressed", String(edit));
  $("#document").hidden = edit;
  $("#editor-panel").hidden = !edit;
  $(".outline").hidden = edit || !outlineHeadings.length;
  outlinePinned = false;
  setOutlineOpen(false);
  $("#bionic-toggle").disabled = edit;
  if (edit) $("#editor").focus();
  else renderDocument();
}
function applyPreferences() {
  $("#bionic-toggle").setAttribute("aria-pressed", String(bionic));
  document.documentElement.style.setProperty(
    "--paper-size",
    ["15px", "17px", "19px"][size],
  );
  $("#font-size").setAttribute(
    "aria-label",
    `Text size: ${["small", "medium", "large"][size]}. Click to change.`,
  );
}
function addDocument(doc) {
  documents.unshift(doc);
  activeId = doc.id;
}
async function importFiles(files) {
  let count = 0;
  const errors = [];
  if (files.length > 1) {
    notify("Open one file at a time.");
    return;
  }
  for (const file of [...files]) {
    if (!/\.(md|markdown|mdown|mkd|txt)$/i.test(file.name)) {
      errors.push("Choose a Markdown or text file.");
      continue;
    }
    if (file.size > 2 * 1024 * 1024) {
      errors.push("Files must be smaller than 2 MB.");
      continue;
    }
    try {
      const content = await file.text();
      if (content.includes("\u0000")) {
        errors.push("This file does not look like plain text.");
        continue;
      }
      addDocument({
        id: crypto.randomUUID(),
        name: file.name,
        content,
        category: "YOUR OWN WORDS",
        detail: "From your device",
      });
      count++;
    } catch {
      errors.push("That file could not be opened. Try it again.");
    }
  }
  if (count) {
    setView(false);

    renderDocument();
    persist();
    window.scrollTo({ top: 0 });
  }
  if (errors.length) notify(errors[0]);
}
function download() {
  const blob = new Blob([current().content], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = current().name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$("#file-input").addEventListener("change", (event) => {
  importFiles(event.target.files);
  event.target.value = "";
});
$("#read-view").addEventListener("click", () => setView(false));
$("#edit-view").addEventListener("click", () => setView(true));
$("#editor").addEventListener("input", (event) => {
  current().content = event.target.value;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist();
  }, 300);
  const count = wordCount(current().content);
  $("#word-count").textContent = `${count.toLocaleString()} words`;
  $("#read-time").textContent =
    `${Math.max(1, Math.ceil(count / 200))} min read`;
});
$("#editor").addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const input = event.target;
  const start = input.selectionStart;
  input.setRangeText("  ", start, input.selectionEnd, "end");
  input.dispatchEvent(new Event("input"));
});
$("#bionic-toggle").addEventListener("click", () => {
  bionic = !bionic;
  applyPreferences();
  renderMarkdown(current().content);
  persist();
});
$("#font-size").addEventListener("click", () => {
  size = (size + 1) % 3;
  applyPreferences();
  persist();
});
document.addEventListener("keydown", (event) => {
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.key.toLowerCase() === "o") {
    event.preventDefault();
    $("#file-input").click();
  }
  if (event.key.toLowerCase() === "s") {
    event.preventDefault();
    persist();
    download();
  }
});
let dragDepth = 0;
document.addEventListener("dragenter", (event) => {
  if (![...event.dataTransfer.types].includes("Files")) return;
  event.preventDefault();
  dragDepth++;
  $("#drop-overlay").hidden = false;
});
document.addEventListener("dragover", (event) => {
  if ([...event.dataTransfer.types].includes("Files")) event.preventDefault();
});
document.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $("#drop-overlay").hidden = true;
});
document.addEventListener("drop", (event) => {
  event.preventDefault();
  dragDepth = 0;
  $("#drop-overlay").hidden = true;
  if (event.dataTransfer.files.length) importFiles(event.dataTransfer.files);
});
window.addEventListener("beforeunload", persist);
applyPreferences();

renderDocument();
