# Blog Templates

## Technical Post (`_posts/`) Front Matter

```yaml
---
layout: single
title: "Your Title"
description: "Clear 1-2 sentence summary of what readers will learn."
date: 2026-02-28 10:00:00 -0700
categories:
  - iOS Development
  - Swift
tags:
  - Swift
  - iOS
  - Architecture
excerpt: "One sentence on practical takeaways."
header:
  overlay_image: https://images.unsplash.com/example
  overlay_filter: 0.5
  caption: "Optional image caption"
---
```

## Technical Post Body Skeleton

```markdown
<!--more-->

## Why This Matters

## Common Pitfall

## Implementation Pattern

```swift
// concrete example
```

## Rollout Checklist

- [ ] Item 1
- [ ] Item 2

## Final Takeaway
```

## Investment/Finance Post (`_portfolio/`) Front Matter

```yaml
---
title: "Your Investment Post Title"
description: "What market context and decisions this article helps with."
date: 2026-02-28
permalink: /portfolio/your-post-slug/
tags:
  - Market Analysis
  - Investment Strategy
excerpt: "One-sentence practical takeaway."
---
```

## Life Post (`_life/`) Front Matter

```yaml
---
title: "Your Life Post Title"
description: "What practical lesson or framework readers gain."
date: 2026-02-28
permalink: /life/your-post-slug/
tags:
  - Life
  - Productivity
---
```

## Collections Post (`_collections/`) Front Matter

```yaml
---
title: "Your Collection Review Title"
description: "What this review covers and who it helps."
date: 2026-02-28
permalink: /collections/your-post-slug/
tags:
  - Sneakers
  - Reviews
  - Collections
---
```

## Playground Entry (`_playground/`) Front Matter

```yaml
---
title: "Your Demo/Game Title"
date: 2026-02-28
permalink: /playground/your-game-slug/
---
```
