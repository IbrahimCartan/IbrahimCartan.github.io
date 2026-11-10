# Ibrahim Cartan: portfolio

A professional portfolio for job applications, live at https://ibrahimcartan.github.io. Plain HTML, CSS and JavaScript: no framework, no build step. It carries over the content of my TCSS 490 course portfolio (https://ibrahimcart.github.io, which stays untouched) in a conventional style.

## Run locally

```bash
python3 -m http.server 8500
```

Open http://localhost:8500.

## Files

- `index.html`: all content (hero, about, projects as case studies, skills, education, contact).
- `styles.css`: layout and light/dark themes (follows the system setting; the toggle saves a choice).
- `script.js`: theme toggle, image galleries, copy-email button, resume-link check.
- `images/`: project screenshots and illustrations. `doses-demo/`: web replica of the Doses iPhone app.

## Resume

`resume.pdf` is the public copy linked from the site (no phone number). The source and the full version with the phone number live in `private/`, which is git-ignored and never published. To rebuild after editing `private/resume.html`:

```bash
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$C" --headless=new --no-pdf-header-footer --print-to-pdf="$PWD/resume.pdf" "file://$PWD/private/resume.html?web"
"$C" --headless=new --no-pdf-header-footer --print-to-pdf="$PWD/private/Ibrahim Cartan.pdf" "file://$PWD/private/resume.html"
```

A marked placeholder card under "Also" is reserved for the final project; search `index.html` for `todo`.

## Deploy (GitHub Pages)

Live at **https://ibrahimcartan.github.io**. The repo is `IbrahimCartan/IbrahimCartan.github.io` (owned by the IbrahimCartan organization so it gets its own root URL). Pages serves the `main` branch root, so pushing to `main` deploys; there is no build step.
