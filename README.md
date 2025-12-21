
# Academic Pages

![pages-build-deployment](https://media.licdn.com/dms/image/C5103AQFX1Yn1EIyS5A/profile-displayphoto-shrink_400_400/0/1517505568526?e=1720051200&v=beta&t=B5oyTiuxlS6dl2jPXrtLcTMrgc3xU5W8BTbZjETc3Iw)

Forked from: Academic Pages 


# Getting Started

1. Register a GitHub account if you don't have one and confirm your e-mail (required!)
1. Click the "Use this template" button in the top right.
1. On the "New repository" page, enter your repository name as "[your GitHub username].github.io", which will also be your website's URL.
1. Set site-wide configuration and add your content.
1. Upload any files (like PDFs, .zip files, etc.) to the `files/` directory. They will appear at https://[your GitHub username].github.io/files/example.pdf.  
1. Check status by going to the repository settings, in the "GitHub pages" section
1. (Optional) Use the Jupyter notebooks or python scripts in the `markdown_generator` folder to generate markdown files for publications and talks from a TSV file.

See more info at https://academicpages.github.io/

## Running Locally With Jekyll (recommended)

Quick start (no Ruby version manager required):

1. Install Bundler if needed: `gem install bundler`
2. From the repo root:
   - `bundle config set path 'vendor/bundle'`
   - `bundle install`
3. Serve with live reload:
   - `JEKYLL_ENV=development bundle exec jekyll serve --host 127.0.0.1 --port 4000 --livereload --livereload-ignore assets/**`

Notes:
- Live server will rebuild and refresh on change.
- If port 4000 is busy, change `--port`.

Optional Ruby setup (macOS): If you prefer pinning a Ruby version, see Jekyll’s macOS guide: `https://jekyllrb.com/docs/installation/macos/`.
If you use `chruby`, install via Homebrew and select a Ruby version, then run the same Bundler steps above.

Linux prerequisites: `sudo apt install build-essential gcc make`

# 📝 Publishing New Content

**👉 IMPORTANT: Before creating any new blog posts, reviews, or content, read the [BLOG_PUBLISHING_GUIDE.md](BLOG_PUBLISHING_GUIDE.md)!**

The publishing guide contains:
- Complete workflow for publishing new content
- Collection descriptions (Tech Blog, Finance, Life, Collections, etc.)
- Front matter templates for each content type
- File naming conventions
- Best practices and content guidelines

**Quick Reference:**
- Tech posts → `_posts/`
- Finance/Investment → `_portfolio/`
- Life/Personal → `_life/`
- Sneaker Reviews → `_collections/` 🆕
- Games/Demos → `_playground/`
- Interview Prep → `_interviews/`

See [BLOG_PUBLISHING_GUIDE.md](BLOG_PUBLISHING_GUIDE.md) for complete details.

# Maintenance 

My Personal fork will **not** accept any contributions.

## Original About Page (Sheldon)

This is the front page of a website that is powered by the [Academic Pages template](https://github.com/academicpages/academicpages.github.io) and hosted on GitHub pages. [GitHub pages](https://pages.github.com) is a free service in which websites are built and hosted from code and data stored in a GitHub repository, automatically updating when a new commit is made to the respository. This template was forked from the [Minimal Mistakes Jekyll Theme](https://mmistakes.github.io/minimal-mistakes/) created by Michael Rose, and then extended to support the kinds of content that academics have: publications, talks, teaching, a portfolio, blog posts, and a dynamically-generated CV. You can fork [this repository](https://github.com/academicpages/academicpages.github.io) right now, modify the configuration and markdown files, add your own PDFs and other content, and have your own site for free, with no ads! An older version of this template powers my own personal website at [stuartgeiger.com](http://stuartgeiger.com), which uses [this Github repository](https://github.com/staeiou/staeiou.github.io).

A data-driven personal website
======
Like many other Jekyll-based GitHub Pages templates, Academic Pages makes you separate the website's content from its form. The content & metadata of your website are in structured markdown files, while various other files constitute the theme, specifying how to transform that content & metadata into HTML pages. You keep these various markdown (.md), YAML (.yml), HTML, and CSS files in a public GitHub repository. Each time you commit and push an update to the repository, the [GitHub pages](https://pages.github.com/) service creates static HTML pages based on these files, which are hosted on GitHub's servers free of charge.

Many of the features of dynamic content management systems (like Wordpress) can be achieved in this fashion, using a fraction of the computational resources and with far less vulnerability to hacking and DDoSing. You can also modify the theme to your heart's content without touching the content of your site. If you get to a point where you've broken something in Jekyll/HTML/CSS beyond repair, your markdown files describing your talks, publications, etc. are safe. You can rollback the changes or even delete the repository and start over -- just be sure to save the markdown files! Finally, you can also write scripts that process the structured data on the site, such as [this one](https://github.com/academicpages/academicpages.github.io/blob/master/talkmap.ipynb) that analyzes metadata in pages about talks to display [a map of every location you've given a talk](https://academicpages.github.io/talkmap.html).

Getting started
======
1. Register a GitHub account if you don't have one and confirm your e-mail (required!)
1. Fork [this repository](https://github.com/academicpages/academicpages.github.io) by clicking the "fork" button in the top right. 
1. Go to the repository's settings (rightmost item in the tabs that start with "Code", should be below "Unwatch"). Rename the repository "[your GitHub username].github.io", which will also be your website's URL.
1. Set site-wide configuration and create content & metadata (see below -- also see [this set of diffs](http://archive.is/3TPas) showing what files were changed to set up [an example site](https://getorg-testacct.github.io) for a user with the username "getorg-testacct")
1. Upload any files (like PDFs, .zip files, etc.) to the files/ directory. They will appear at https://[your GitHub username].github.io/files/example.pdf.  
1. Check status by going to the repository settings, in the "GitHub pages" section

Site-wide configuration
------
The main configuration file for the site is in the base directory in [_config.yml](https://github.com/academicpages/academicpages.github.io/blob/master/_config.yml), which defines the content in the sidebars and other site-wide features. You will need to replace the default variables with ones about yourself and your site's github repository. The configuration file for the top menu is in [_data/navigation.yml](https://github.com/academicpages/academicpages.github.io/blob/master/_data/navigation.yml). For example, if you don't have a portfolio or blog posts, you can remove those items from that navigation.yml file to remove them from the header. 

Create content & metadata
------
For site content, there is one markdown file for each type of content, which are stored in directories like _publications, _talks, _posts, _teaching, or _pages. For example, each talk is a markdown file in the [_talks directory](https://github.com/academicpages/academicpages.github.io/tree/master/_talks). At the top of each markdown file is structured data in YAML about the talk, which the theme will parse to do lots of cool stuff. The same structured data about a talk is used to generate the list of talks on the [Talks page](https://academicpages.github.io/talks), each [individual page](https://academicpages.github.io/talks/2012-03-01-talk-1) for specific talks, the talks section for the [CV page](https://academicpages.github.io/cv), and the [map of places you've given a talk](https://academicpages.github.io/talkmap.html) (if you run this [python file](https://github.com/academicpages/academicpages.github.io/blob/master/talkmap.py) or [Jupyter notebook](https://github.com/academicpages/academicpages.github.io/blob/master/talkmap.ipynb), which creates the HTML for the map based on the contents of the _talks directory).

**Markdown generator**

I have also created [a set of Jupyter notebooks](https://github.com/academicpages/academicpages.github.io/tree/master/markdown_generator
) that converts a CSV containing structured data about talks or presentations into individual markdown files that will be properly formatted for the Academic Pages template. The sample CSVs in that directory are the ones I used to create my own personal website at stuartgeiger.com. My usual workflow is that I keep a spreadsheet of my publications and talks, then run the code in these notebooks to generate the markdown files, then commit and push them to the GitHub repository.

How to edit your site's GitHub repository
------
Many people use a git client to create files on their local computer and then push them to GitHub's servers. If you are not familiar with git, you can directly edit these configuration and markdown files directly in the github.com interface. Navigate to a file (like [this one](https://github.com/academicpages/academicpages.github.io/blob/master/_talks/2012-03-01-talk-1.md) and click the pencil icon in the top right of the content preview (to the right of the "Raw | Blame | History" buttons). You can delete a file by clicking the trashcan icon to the right of the pencil icon. You can also create new files or upload files by navigating to a directory and clicking the "Create new file" or "Upload files" buttons. 

Example: editing a markdown file for a talk
![Editing a markdown file for a talk](/images/editing-talk.png)

Example Syntax for Mermaid Diagram, current deploy pipeline has to include `;` at the end of each line different from a lot of examples online, although without `;` will display correctly in local server.
```
{% mermaid %}
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
{% endmermaid %}
```

For more info
------
More info about configuring Academic Pages can be found in [the guide](https://academicpages.github.io/markdown/). The [guides for the Minimal Mistakes theme](https://mmistakes.github.io/minimal-mistakes/docs/configuration/) (which this theme was forked from) might also be helpful.


## Theme customizations (2025)

- Glass + gradient background (lock-screen style): see `assets/css/main.scss` for layered radial gradients and breathing animation.
- Transparent containers and spacing:
  - `.page__inner-wrap` is transparent
  - Responsive padding for `.page__content`, archive lists, and sidebar
  - Bottom padding for `.archive` to avoid last-item collision
- Navigation:
  - Desktop: pill-style nav links with hover/active states
  - Mobile: navbar title emphasized; `.masthead__menu` and `.greedy-nav` backgrounds are transparent
- Sidebar:
  - Sticky and transparent on non-mobile; offset controlled by `--masthead-offset` (in `:root`)
  - Company (building) and GitHub icons forced to light color; other icons inherit as before
- Typography:
  - Inline code in lists/paragraphs uses a higher-contrast pill; block code remains high-contrast
- Footer:
  - Social items styled as compact pills; optional Sitemap button added

## Deploy

Pushing to `master` triggers GitHub Pages to rebuild and deploy. You can view commit history on GitHub and the Pages build status under the repository’s Actions tab.
