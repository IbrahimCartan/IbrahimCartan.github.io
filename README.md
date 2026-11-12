# Ibrahim Cartan: portfolio

A professional portfolio for job applications, live at https://ibrahimcartan.github.io. Plain HTML, CSS and JavaScript: no framework, no build step. It carries over the content of my TCSS 490 course portfolio (https://ibrahimcart.github.io, which stays untouched) in a conventional style.

## Run locally

```bash
python3 -m http.server 8500
```

Open http://localhost:8500.

## Files

- `index.html`: all content. Two halves: the left (name, a clickable contents list for About Me / Education / Projects, and Contact docked at the bottom) stays in place while the right (About Me, Education, then the four strongest projects with short descriptions, tags, links and an expandable "What I learned" section, with screenshots for the AI code reviewer and Doses) scrolls. On narrow screens the halves stack.
- `styles.css`: layout and light/dark themes (follows the system setting; the toggle saves a choice).
- `projects.html`: the full project list (linked from the bottom of the home page's Projects), including older projects.
- `script.js`: theme toggle, image galleries, copy-email button, and highlighting the current section in the contents list.
- `images/`: project screenshots and illustrations. `doses-demo/`: web replica of the Doses iPhone app.

## Resume

`resume.pdf` is the public copy linked from the site (no phone number). The source and the full version with the phone number live in `private/`, which is git-ignored and never published. To rebuild after editing `private/resume.html`:

```bash
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$C" --headless=new --no-pdf-header-footer --print-to-pdf="$PWD/resume.pdf" "file://$PWD/private/resume.html?web"
"$C" --headless=new --no-pdf-header-footer --print-to-pdf="$PWD/private/Ibrahim Cartan.pdf" "file://$PWD/private/resume.html"
```

## Deploy (GitHub Pages)

Live at **https://ibrahimcartan.github.io**. The repo is `IbrahimCartan/IbrahimCartan.github.io` (owned by the IbrahimCartan organization so it gets its own root URL). Pages serves the `main` branch root, so pushing to `main` deploys; there is no build step.
