// Turns a parsed GitHub issue-form submission into template files + an index.json
// entry, downloads the attached preview image, and writes a PR body. Run by the
// "Template submission to PR" workflow. Node 20+ (global fetch).
import { promises as fs } from "node:fs";
import path from "node:path";

const NONE = "_No response_";
const clean = (v) => {
    if (v === undefined || v === null) return "";
    const s = String(v).trim();
    return s === NONE ? "" : s;
};
const slugify = (s) =>
    s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "template";

async function main() {
    const data = JSON.parse(process.env.ISSUE_JSON || "{}");
    const issue = process.env.ISSUE_NUMBER || "";
    const token = process.env.GH_TOKEN || "";

    const name = clean(data.name);
    if (!name) throw new Error("Submission is missing a template name.");
    const id = slugify(name);
    const dir = path.join("templates", id);
    await fs.mkdir(dir, { recursive: true });

    const notes = [];
    const warnings = [];

    // --- layout.json (required, must be valid) ---
    let layout;
    try {
        layout = JSON.parse(clean(data.layout));
    } catch (e) {
        throw new Error("Layout JSON did not parse. Paste the exact 'Export as JSON' output.");
    }
    if (!layout || typeof layout.name !== "string" || !Array.isArray(layout.blocks)) {
        throw new Error("Layout JSON must have a string `name` and an array `blocks`.");
    }
    await fs.writeFile(path.join(dir, "layout.json"), JSON.stringify(layout, null, 4) + "\n");

    // Flag JavaScript blocks for extra maintainer scrutiny.
    if (JSON.stringify(layout).includes('"type":"javascript"')) {
        warnings.push("⚠️ Layout contains **JavaScript blocks** — review the code carefully; it executes in users' vaults.");
    }

    // --- example.md (required) ---
    const example = clean(data.example);
    if (!example) throw new Error("An example note is required.");
    await fs.writeFile(path.join(dir, "example.md"), example.endsWith("\n") ? example : example + "\n");

    // --- entry skeleton ---
    const entry = {
        id,
        name,
        system: clean(data.system) || undefined,
        author: clean(data.author) || undefined,
        description: clean(data.description) || undefined,
        tags: clean(data.tags)
            ? clean(data.tags).split(",").map((t) => t.trim()).filter(Boolean)
            : undefined,
        layout: `${dir.replace(/\\/g, "/")}/layout.json`,
        example: `${dir.replace(/\\/g, "/")}/example.md`
    };

    // --- optional CSS ---
    const css = clean(data.css);
    if (css) {
        if (/@import\s+(url\()?["']?https?:/i.test(css)) {
            warnings.push("⚠️ CSS contains a remote `@import` — not allowed; please inline assets as base64.");
        }
        await fs.writeFile(path.join(dir, "style.css"), css.endsWith("\n") ? css : css + "\n");
        entry.css = `${dir.replace(/\\/g, "/")}/style.css`;
    }

    // --- optional requirements ---
    const requires = clean(data.requires);
    if (requires) {
        entry.requires = requires.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    }

    // --- optional preview image (download the first attachment URL) ---
    const preview = clean(data.preview);
    const m = preview.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/) || preview.match(/(https?:\/\/\S+)/);
    if (m) {
        try {
            const url = m[1];
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
            const buf = Buffer.from(await res.arrayBuffer());
            const MAX = 400 * 1024;
            if (buf.length > MAX) {
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

    // --- merge into index.json (replace same id, else append) ---
    const idxPath = "index.json";
    const idx = JSON.parse(await fs.readFile(idxPath, "utf8"));
    if (!Array.isArray(idx.templates)) idx.templates = [];
    const existing = idx.templates.findIndex((t) => t.id === id);
    const compact = Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined));
    if (existing >= 0) {
        idx.templates[existing] = compact;
        notes.push(`Replaced existing entry with id \`${id}\`.`);
    } else {
        idx.templates.push(compact);
    }
    await fs.writeFile(idxPath, JSON.stringify(idx, null, 4) + "\n");

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

    // outputs for the workflow
    const out = process.env.GITHUB_OUTPUT;
    if (out) {
        await fs.appendFile(out, `name=${name}\n`);
        await fs.appendFile(out, `id=${id}\n`);
    }
    console.log(`Prepared template "${name}" (${id}).`);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
