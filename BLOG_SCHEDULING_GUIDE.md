# 📅 Blog Post Scheduling Guide

## 🚀 New Feature: Schedule Blog Posts

You can now schedule blog posts to be published automatically at a specific date and time!

### ✅ Setup Required

**1. Run the Database Migration:**
```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/20250127000000-add-blog-scheduling.sql
```

This adds:
- `scheduled_at` column to `blog_posts` table
- Automatic validation for scheduled posts
- Function to publish scheduled posts
- Proper indexing for performance

### 🎯 How to Use

#### **Creating Scheduled Posts:**

1. **Go to BlogManager → New Post**
2. **Fill in your content** (title, body, etc.)
3. **Set Status to "Scheduled"**
4. **Pick Date & Time** using the datetime picker
5. **Click "Create Post"**

#### **Editing Posts to Schedule:**

1. **Find your draft post** in the BlogManager list
2. **Click "Edit"** on any existing post
3. **Change Status to "Scheduled"**
4. **Pick Date & Time** when the datetime picker appears
5. **Click "Update Post"**

#### **What Happens:**
- ✅ Post is saved with status "scheduled"
- ✅ Shows blue "Scheduled" badge in post list
- ✅ Validation ensures date is in the future
- ✅ Success message shows scheduled time

### 🤖 AI Content + Scheduling

**Perfect Workflow:**
1. **Generate content with AI** using your topic
2. **Review and edit** the generated content
3. **Set status to "Scheduled"**
4. **Pick future publish time**
5. **Create post** - it's ready to go live automatically!

### ⚙️ Publishing Scheduled Posts

**Automatic Publishing:**
The database includes a function `publish_scheduled_blog_posts()` that can be called to publish due posts:

```sql
-- Manual trigger (for testing)
SELECT public.publish_scheduled_blog_posts();
```

**To Set Up Automatic Publishing:**
You can set up a cron job or edge function to call this periodically:

```typescript
// Example: Call every 15 minutes to check for due posts
const { data } = await supabase.rpc('publish_scheduled_blog_posts');
console.log(`Published ${data} posts`);
```

### 📊 Post Statuses

- **🔘 Draft** - Not published, can edit freely
- **🔵 Scheduled** - Will publish automatically at set time
- **🟢 Published** - Live and public

### 🔍 Features Include

#### **Smart Validation:**
- ✅ Prevents scheduling in the past
- ✅ Requires date/time when status is scheduled
- ✅ Clears schedule when status changes

#### **User Experience:**
- ✅ Datetime picker with min date as "now"
- ✅ Clear success messages showing schedule time
- ✅ Visual status badges in post list
- ✅ Responsive form layout

#### **Database Safety:**
- ✅ Proper indexing for performance
- ✅ Row Level Security policies
- ✅ Data validation triggers
- ✅ Atomic operations

### 🎉 Perfect For:

- **Content Planning** - Write posts when inspired, publish on schedule
- **Marketing Campaigns** - Coordinate blog releases with events
- **Consistent Publishing** - Maintain regular content schedule
- **Team Workflows** - Create content in advance for review

### 🔧 Pro Tips:

1. **Batch Content Creation** - Use AI to generate multiple posts, schedule them throughout the week
2. **Marketing Alignment** - Schedule blog posts to coincide with product launches
3. **SEO Strategy** - Spread content releases for consistent SEO benefits
4. **Time Zones** - The system uses your browser's timezone for scheduling
5. **Draft to Scheduled** - Convert any draft post to scheduled by editing it
6. **Reschedule Anytime** - Edit scheduled posts to change their publish time

---

**Ready to schedule your first post?** 🚀

Create content → Set to "Scheduled" → Pick your time → Let the system handle the rest! 