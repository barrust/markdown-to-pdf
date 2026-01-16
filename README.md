# Markdown to PDF
![markdown icon](images/color-splash-icon_500x333.png "A nice markdown icon")

[![CI](https://github.com/barrust/markdown-to-pdf/actions/workflows/main.yml/badge.svg)](https://github.com/barrust/markdown-to-pdf/actions/workflows/main.yml)

Creates PDF and HTML files from Markdown using the GitHub (or custom) theme.

## NOTICE:

This is a fork of [BaileyJM02/markdown-to-pdf](https://github.com/BaileyJM02/markdown-to-pdf)

## Notable Features:

- Code highlighting
- Tables
- Images (see docs)
- Internal and external links
- Emojis (rendered by [twemoji](https://github.com/twitter/twemoji)) :rocket: :100:
- Task Lists
  - [x] Completed
  - [ ] Not completed
- Footnotes [^1]

## GitHub Action Inputs

### Input Path

```yaml
with:
  input_path: value
```

(**Required**)
([Path](#path)) or ([File](#file))
The location of the folder containing your .md or .markdown files, or a path to a single .md or .markdown file that you would like to convert.

*Note, previous versions of this action accepted the `input_dir` input. This is still accepted as input for backwards compatibility, but passing a directory as `input_path` now carries out the same functionality.

### Images Directory

```yaml
with:
  images_dir: value
```

([Path](#path))
The location of the folder containing your images, this should be the route of all images. So of you had images located
at `images/about/file.png` and `images/something-else/file.png` you would pass the value `images`.

### Output Directory

```yaml
with:
  output_dir: value
```

([Path](#path))
The location of the folder you want to place the built files.



### Build HTML

```yaml
with:
  build_html: value
```

([Boolean](#boolean))
Whether to also create a .html file.

### Build PDF

```yaml
with:
  build_pdf: value
```

([Boolean](#boolean))
Whether to also create a .pdf file (defaults to `true`. After all, this is the intended behaviour).

### CSS Theme

```yaml
with:
  theme: value
```

([File](#file))
The location of the CSS file you want to use as the theme.

```yaml
with:
  extend_default_theme: value
```

([Boolean](#boolean))
Whether to extend your custom CSS file with the default theme

### Highlight CSS Theme

```yaml
with:
  highlight_theme: value
```

([File](#file))
The location of the CSS file you want to use as the code snipped highlight theme.

### HTML/Mustache Template file

```yaml
with:
  template: value
```

([File](#file))
The location of the HTML/Mustache file you want to use as the HTML template.

### Table Of Contents

```yaml
with:
  table_of_contents: value
```

([Boolean](#boolean))
Whether a table of contents should be generated

## Input Types

A few pieces to describe what input each value expects.

### Path

A path will most likely be from your repository's route, it should not be prefixed or suffixed with a `/`. The path
should look like so `docs/topic/featureDocs` or `writing/category`.

### String

A string could be anything, and using `YAML` (or `YML`) does not need to be encased in quotes.

### Boolean

This should be either `true` or `false`.

### File

This should be the direct path to a file, it should not be prefixed with a `/`. An example: `styles/markdown-theme.css`.

## Usage Examples

An example of a workflow for some documentation.

``` yaml
# .github/workflows/convert-to-pdf.yml

name: Docs to PDF
# This workflow is triggered on pushes to the repository.
on:
  push:
    branches:
      - main
    # Paths can be used to only trigger actions when you have edited certain files, such as a file within the /docs directory
    paths:
      - 'docs/**.md'
      - 'docs/images/**'

jobs:
  converttopdf:
    name: Build PDF
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: barrust/markdown-to-pdf@v1
        with:
          input_dir: docs
          output_dir: pdfs
          images_dir: docs/images
          # Default is true, can set to false to only get PDF files
          build_html: false
      - uses: actions/upload-artifact@v5
        with:
          name: docs
          path: pdfs
```

## Contributions

Any contributions are helpful and welcome, please make a pull-request.
If you would like to discuses a new feature, please create an issue first.

### Local Testing

To run or test locally, you will need to install NodeJS 24 and run the following commands in a clean environment

**Install dependencies**
``` bash
npm install
```

**Run local instance**
``` bash
LOCAL_RUNNER=1 INPUT_PATH=README.md IMAGES_DIR=images OUTPUT_DIR=generated node --trace-uncaught src/github_interface.js
```


[^1]: Support for markdown footnotes!