# Dashboard: News CMS

Full news and announcement management system for all BroBlox games.

## Overview

The News CMS lets dashboard users with the appropriate permissions create, edit, publish, archive and delete news posts. Published posts are served through a public API consumed by the website.

## Model

| Field         | Type              | Notes                                              |
| ------------- | ----------------- | -------------------------------------------------- |
| `id`          | String (cuid)     | Primary key                                        |
| `title`       | String            | Required                                           |
| `slug`        | String            | Unique, URL-safe, auto-generated from title        |
| `body`        | String (LongText) | Markdown content                                   |
| `excerpt`     | String?           | Optional short summary                             |
| `status`      | NewsStatus        | `DRAFT` / `PUBLISHED` / `ARCHIVED`                 |
| `tags`        | Json?             | Array of strings (e.g. `["patch-notes", "event"]`) |
| `gameId`      | String?           | Optional FK to Game                                |
| `authorId`    | String            | FK to User                                         |
| `publishedAt` | DateTime?         | Set on first publish                               |

## Permissions

| Action               | Permission    |
| -------------------- | ------------- |
| View news list       | `news:view`   |
| Create posts         | `news:create` |
| Edit / archive posts | `news:edit`   |
| Delete posts         | `news:delete` |

All actions are audited via the audit log.

## CRUD operations

### Create

- Auto-generates a slug from the title with collision fallback (`slug-2`, `slug-3`, ...).
- Can save as **Draft** or **Publish** immediately.
- Sets `publishedAt` on first publish.

### Update

- Edit title, body, excerpt, tags, and game association.
- Status transitions: Draft → Published, Published → Archived, etc.
- Preserves original `publishedAt` if already published.

### Archive

- Sets status to `ARCHIVED`, hiding the post from the public API.

### Delete

- Hard-deletes the post from the database.

## Public API

**`GET /api/news`** — public, no authentication required.

| Param    | Type   | Default | Description                  |
| -------- | ------ | ------- | ---------------------------- |
| `slug`   | string | —       | Return a single post by slug |
| `page`   | number | 1       | Pagination page              |
| `limit`  | number | 10      | Items per page (max 50)      |
| `tag`    | string | —       | Filter by tag                |
| `gameId` | string | —       | Filter by game               |

Only **PUBLISHED** posts are returned.

Response shape:

```json
{
  "posts": [...],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 },
  "fetchedAt": "2026-02-25T12:00:00Z"
}
```

## Website integration

The website fetches news from the dashboard API via `lib/news.ts`:

- ISR with **5-minute revalidation** (`next: { revalidate: 300 }`).
- Graceful fallback to hardcoded sample posts if the API is unreachable.
- Base URL configured via `DASHBOARD_URL` environment variable.

## Dashboard UI

### News list page (`/news`)

- Paginated table (20 per page) with status filter tabs (All / Draft / Published / Archived).
- Each card shows: title, status badge, game badge, author, date, tags.
- Inline action buttons: Edit, Archive, Delete — visibility gated by permissions.

### Edit page (`/news/[id]`)

- Form fields: Title, Excerpt, Body (Markdown textarea), Tags (comma-separated), Game (dropdown).
- Draft posts show two buttons: "Publish" and "Save Draft".
- Published/archived posts show "Save Changes".
