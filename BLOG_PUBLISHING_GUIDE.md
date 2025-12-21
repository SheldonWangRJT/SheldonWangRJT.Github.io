# Blog Publishing Guide 📝

This guide outlines the workflow and best practices for publishing new content on your Jekyll site.

## Content Categories & Collections

Your site is organized into the following collections:

### 1. **Tech Blog Posts** (`_posts/`)
- **Purpose**: Technical blog posts, programming tutorials, iOS development content
- **URL**: `/year-archive/`
- **Front Matter**:
  ```yaml
  ---
  title: "Your Post Title"
  description: "Brief description for SEO and previews"
  date: YYYY-MM-DD
  categories: [Category1, Category2]
  tags: [tag1, tag2, tag3]
  ---
  ```

### 2. **Investment & Finance** (`_portfolio/`)
- **Purpose**: Investment strategies, market analysis, financial insights, portfolio tracking
- **URL**: `/portfolio/`
- **Front Matter**:
  ```yaml
  ---
  title: "Your Investment Post Title"
  description: "Brief description"
  date: YYYY-MM-DD
  permalink: /portfolio/your-post-slug/
  tags: [Investment, Finance, Market Analysis]
  ---
  ```

### 3. **Life & Interests** (`_life/`)
- **Purpose**: Personal stories, life lessons, productivity tips, sports, health, lifestyle
- **URL**: `/life/`
- **Front Matter**:
  ```yaml
  ---
  title: "Your Life Post Title"
  description: "Brief description"
  date: YYYY-MM-DD
  permalink: /life/your-post-slug/
  tags: [Life, Productivity, Sports]
  ---
  ```

### 4. **Collections** (`_collections/`) 🆕
- **Purpose**: Sneaker reviews, collectibles, product reviews, hobby collections
- **URL**: `/collections/`
- **Front Matter**:
  ```yaml
  ---
  title: "Your Collection Review Title"
  description: "Brief description"
  date: YYYY-MM-DD
  permalink: /collections/your-post-slug/
  tags: [Sneakers, Reviews, Collections]
  ---
  ```

### 5. **Playground** (`_playground/`)
- **Purpose**: Interactive games, demos, experiments
- **URL**: `/playground/`
- **Front Matter**:
  ```yaml
  ---
  title: "Your Game Title"
  date: YYYY-MM-DD
  permalink: /playground/your-game-slug/
  ---
  ```

### 6. **iOS Interviews** (`_interviews/`)
- **Purpose**: iOS interview preparation content (password protected)
- **URL**: `/ios-interviews/`
- **Front Matter**:
  ```yaml
  ---
  title: "Your Interview Post Title"
  date: YYYY-MM-DD
  permalink: /interviews/your-post-slug/
  ---
  ```

## Publishing Workflow

### Step 1: Choose the Right Collection
- **Tech content** → `_posts/`
- **Finance/Investment** → `_portfolio/`
- **Life/Personal** → `_life/`
- **Sneakers/Reviews** → `_collections/` 🆕
- **Games/Demos** → `_playground/`
- **Interview Prep** → `_interviews/`

### Step 2: Create the File
- **Naming convention**: `YYYY-MM-DD-post-title-slug.md`
- **Location**: Place in the appropriate collection folder
- **Example**: `_collections/2025-01-15-nike-air-jordan-1-review.md`

### Step 3: Write Front Matter
Include all required front matter fields:
- `title`: SEO-friendly title (include emojis if desired) 📝
- `description`: 1-2 sentence description for SEO
- `date`: Publication date (YYYY-MM-DD)
- `permalink`: URL slug (optional, auto-generated if omitted)
- `tags`: Array of relevant tags
- `categories`: Array of categories (for `_posts/` only)

### Step 4: Content Guidelines
- **Use emojis** in titles and content for better readability 📝
- **Include tables** for comparisons when relevant 📝
- **Add hyperlinks, quotes, charts, and images** to enrich content 📝
- **No comments section prompts** - your site doesn't have comments 📝
- **Hide personal information** in public posts 📝

### Step 5: Test Locally
```bash
# Build the site
bundle exec jekyll build

# Or serve with auto-reload
bundle exec jekyll serve
```

Visit `http://localhost:4000` to preview your post.

### Step 6: Commit & Push
```bash
# Stage your changes
git add _collections/YYYY-MM-DD-your-post.md

# Commit (one article per commit)
git commit -m "Add: [Collection Name] Review - Brief Description"

# Push to remote
git push
```

**Note**: Commit one article at a time for cleaner git history.

## File Naming Examples

- ✅ `2025-01-15-nike-air-jordan-1-review.md`
- ✅ `2025-01-20-adidas-yeezy-350-comparison.md`
- ✅ `2025-01-25-sneaker-collection-2025.md`
- ❌ `nike-review.md` (missing date)
- ❌ `2025-1-15-review.md` (wrong date format)

## Content Best Practices

### For Sneaker Reviews (Collections)
- Include high-quality images
- Size/fit information
- Comfort rating
- Style/design analysis
- Price/value assessment
- Comparison with similar models
- Use tables for specifications

### For All Posts
- Start with a compelling introduction
- Use clear headings (H2, H3)
- Break up text with images, tables, or quotes
- Include relevant tags for discoverability
- Add internal links to related posts when possible

## Quick Reference: Collection Folders

| Collection | Folder | URL Path | Use For |
|------------|--------|----------|---------|
| Tech Blog | `_posts/` | `/year-archive/` | Technical content |
| Finance | `_portfolio/` | `/portfolio/` | Investment posts |
| Life | `_life/` | `/life/` | Personal content |
| **Collections** | `_collections/` | `/collections/` | **Sneaker reviews** 🆕 |
| Playground | `_playground/` | `/playground/` | Games/demos |
| Interviews | `_interviews/` | `/ios-interviews/` | Interview prep |

## Troubleshooting

- **Post not showing**: Check date is not in the future (unless `future: true` in `_config.yml`)
- **Wrong URL**: Verify `permalink` in front matter
- **Missing from archive**: Ensure file is in correct collection folder
- **Build errors**: Run `bundle exec jekyll build` to see error messages

---

**Last Updated**: 2025-01-15
**Remember**: One article per commit, test locally first, use emojis! 📝

