# Build Instructions

This project includes a simple build process for bundling `html/app.html` into a single standalone HTML file.

## Usage

From the repository root (`c:\dev\strokes-gained`):

- `python build.py`

## Output

The bundled file is written to:

- `..\SGA.html`

## What it does

- inlines relative `<link rel="stylesheet" href="...">` references from `html/app.html`
- inlines relative `<script src="...">` references from `html/app.html`
- creates one self-contained HTML file ready for publishing
