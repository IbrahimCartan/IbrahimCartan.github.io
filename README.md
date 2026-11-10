# Ibrahim Cartan: portfolio

A professional portfolio for job applications. Plain HTML, CSS and JavaScript: no framework, no build step. It carries over the content of my TCSS 490 course portfolio (https://ibrahimcart.github.io, which stays untouched) in a conventional style.

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

## Placeholders to fill in

- **Resume:** add `resume.pdf` at the repo root. The Resume buttons appear/activate automatically once it exists.
- **Education:** `index.html` has a marked placeholder for degree, expected graduation and GPA.
- **More projects:** a marked placeholder card under "Also" is reserved for the final project.

Search `index.html` for `todo` to find them.

## Deploy (GitHub Pages)

Not published yet. A `<username>.github.io` repo or any repo with Pages set to the `main` branch root works; no build is needed. All links are relative.
