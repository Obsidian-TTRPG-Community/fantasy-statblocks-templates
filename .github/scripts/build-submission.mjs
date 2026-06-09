// Turns a GitHub issue-form submission into template files + an index.json
// entry, downloads the attached preview image, and writes a PR body.
// Parses the raw issue body (no third-party actions). Node 20+ (global fetch).
import { promises as fs } from "node:fs";
import path from "node:path";

const NONE = "_No response_";

/** Parse a GitHub issue-form body into { "<label>": "<value>" }. */
function parseIssueBody(body) {
    const sections = {};
    const parts = body.split(/\r?\n### /);
    for (let i = 0; i < parts.length; i++) {
        let chunk = i === 0 ? parts[i].replace(/^### /, "") : parts[i];
        const nl = chunk.indexOf("\n");
        if (nl < 0) continue;
        const label = chunk.slice(0, nl).trim();
        let val = chunk.slice(nl + 1).trim();
        // Strip a fenced code block (render: json/css/markdown fields). The
        // opening fence may be 3+ backticks (longer when content nests ```).
        const m = val.match(/^(`{3,})[^\n]*\n([\s\S]*?)\n\1\s*$/);
        if (m) val = m[2];
        sections[label] = val;
    }
    return sections;
}

const slugify = (s) =>
    s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "template";

async function main() {
    const sections = parseIssueBody(process.env.ISSUE_BODY || "");
    const get = (label) => {
        const v = (sections[label] || "").trim();
        return v === NONE ? "" : v;
    };
    const issue = process.env.ISSUE_NUMBER || "";
    const token = process.env.GH_TOKEN || "";

    const name = get("Template name");
    if (!name) throw new Error("Submission is missing a template name.");
    const id = slugify(name);
    const dir = path.join("templates", id);
    await fs.mkdir(dir, { recursive: true });

    const notes = [];
    const warnings = [];

    // --- layout.json (required, must be valid) ---
    let layout;
    try {
        layout = JSON.parse(get("Layout JSON"));
    } catch (e) {
        throw new Error("Layout JSON did not parse. Paste the exact 'Export as JSON' output.");
    }
    if (!layout || typeof layout.name !== "string" || !Array.isArray(layout.blocks)) {
        throw new Error("Layout JSON must have a string `name` and an array `blocks`.");
    }
    await fs.writeFile(path.join(dir, "layout.json"), JSON.stringify(layout, null, 4) + "\n");
    if (JSON.stringify(layout).includes('"type":"javascript"')) {
        warnings.push("⚠️ Layout contains **JavaScript blocks** — review the code carefully; it executes in users' vaults.");
    }

    // --- example.md (required) ---
    const example = get("Example note");
    if (!example) throw new Error("An example note is required.");
    await fs.writeFile(path.join(dir, "example.md"), example.endsWith("\n") ? example : example + "\n");

    const entry = {
        id,
        name,
        system: get("Game system") || undefined,
        author: get("Author / credit") || undefined,
        description: get("Short description") || undefined,
        tags: get("Tags")
            ? get("Tags").split(",").map((t) => t.trim()).filter(Boolean)
            : undefined,
        layout: `${dir.replace(/\\/g, "/")}/layout.json`,
        example: `${dir.replace(/\\/g, "/")}/example.md`
    };

    // --- optional CSS ---
    const css = get("CSS snippet (optional)");
    if (css) {
        if (/@import\s+(url\()?["']?https?:/i.test(css)) {
            warnings.push("⚠️ CSS contains a remote `@import` — not allowed; please inline assets as base64.");
        }
        await fs.writeFile(path.join(dir, "style.css"), css.endsWith("\n") ? css : css + "\n");
        entry.css = `${dir.replace(/\\/g, "/")}/style.css`;
    }

    // --- optional requirements ---
    const requires = get("Requirements (optional)");
    if (requires) {
        entry.requires = requires.split(/\r?\n/).map((l) => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
    }

    // --- optional preview image ---
    const preview = get("Preview image");
    const m = preview.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/) || preview.match(/(https?:\/\/\S+)/);
    if (m) {
        try {
            const res = await fetch(m[1], { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!res.ok) throw new Error(`status ${res.status}`);
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length > 400 * 1024) {
                warnings.push(`⚠️ Preview image is ${(buf.length / 1024).toFixed(0)} KB (over ~250 KB suggested).`);
            }
            await fs.writeFile(path.join(dir, "preview.png"), buf);
            entry.preview = `${dir.replace(/\\/g, "/")}/preview.png`;
        } catch (e) {
            warnings.push(`Could not download the preview image (${e.message}). A maintainer can add it.`);
        }
    } else {
        notes.push("No preview image was provided — the gallery will show a placeholder tile.");
    }

    // --- merge into index.json ---
    const idx = JSON.parse(await fs.readFile("index.json", "utf8"));
    if (!Array.isArray(idx.templates)) idx.templates = [];
    const compact = Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined));
    const existing = idx.templates.findIndex((t) => t.id === id);
    if (existing >= 0) {
        idx.templates[existing] = compact;
        notes.push(`Replaced existing entry with id \`${id}\`.`);
    } else {
        idx.templates.push(compact);
    }
    await fs.writeFile("index.json", JSON.stringify(idx, null, 4) + "\n");

    // --- PR body ---
    const body = [
        `Automated pull request from #${issue}.`,
        "",
        `**Template:** ${name}${entry.system ? ` (${entry.system})` : ""}`,
        `**Author:** ${entry.author ?? "—"}`,
        `**Files:** \`${dir}/\``,
        "",
        warnings.length ? "### Needs attention\n" + warnings.map((w) => `- ${w}`).join("\n") : "### No automated warnings",
        "",
        notes.length ? notes.map((n) => `- ${n}`).join("\n") : "",
        "",
        "### Maintainer checklist",
        "- [ ] Layout renders correctly in Obsidian",
        "- [ ] Example note uses original, non-copyrighted content",
        "- [ ] CSS is self-contained (no remote imports) and reasonably scoped",
        "- [ ] JavaScript blocks (if any) are safe",
        "- [ ] Preview image is appropriate and within size limits",
        "",
        `Closes #${issue}`
    ].join("\n");
    await fs.writeFile(".github/submission-pr-body.md", body);

    const out = process.env.GITHUB_OUTPUT;
    if (out) {
        await fs.appendFile(out, `name=${name}\n`);
        await fs.appendFile(out, `id=${id}\n`);
        await fs.appendFile(out, `branch=submission/issue-${issue}\n`);
    }
    console.log(`Prepared template "${name}" (${id}).`);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
