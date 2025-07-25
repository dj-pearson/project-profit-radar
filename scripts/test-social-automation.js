#!/usr/bin/env node

/**
 * Social Media Automation Test Script
 *
 * This script tests the blog to social media automation integration
 * Run with: node scripts/test-social-automation.js
 */

const { createClient } = require("@supabase/supabase-js");

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "your-supabase-url";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "your-service-key";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testAutomationSystem() {
  console.log("🚀 Starting Social Media Automation Test...\n");

  try {
    // Test 1: Check database tables exist
    console.log("1️⃣ Testing database schema...");

    const { data: automationSettings, error: settingsError } = await supabase
      .from("social_media_automation_settings")
      .select("*")
      .limit(1);

    if (settingsError) {
      console.error(
        "❌ automation_settings table not found:",
        settingsError.message
      );
      return;
    }
    console.log("✅ automation_settings table exists");

    const { data: automationLogs, error: logsError } = await supabase
      .from("social_media_automation_logs")
      .select("*")
      .limit(1);

    if (logsError) {
      console.error("❌ automation_logs table not found:", logsError.message);
      return;
    }
    console.log("✅ automation_logs table exists");

    // Test 2: Check if blog_post_id column exists in social_media_posts
    console.log("\n2️⃣ Testing social_media_posts schema...");

    const { data: socialPosts, error: postsError } = await supabase
      .from("social_media_posts")
      .select("blog_post_id")
      .limit(1);

    if (postsError) {
      console.error(
        "❌ blog_post_id column not found in social_media_posts:",
        postsError.message
      );
      return;
    }
    console.log("✅ blog_post_id column exists in social_media_posts");

    // Test 3: Check Supabase function exists
    console.log("\n3️⃣ Testing Supabase function...");

    try {
      const { data, error } = await supabase.functions.invoke(
        "blog_social_webhook",
        {
          body: {
            test: true,
            blog_post_id: "test-id",
            company_id: "test-company-id",
          },
        }
      );

      if (error) {
        console.error("❌ Function error:", error.message);
      } else {
        console.log("✅ blog_social_webhook function is accessible");
      }
    } catch (err) {
      console.error("❌ Function deployment issue:", err.message);
    }

    // Test 4: Check for sample data
    console.log("\n4️⃣ Checking for existing data...");

    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("id, title, status")
      .limit(5);

    if (blogPosts && blogPosts.length > 0) {
      console.log(`✅ Found ${blogPosts.length} blog posts for testing`);
      console.log("   Sample posts:");
      blogPosts.forEach((post) => {
        console.log(`   - ${post.title} (${post.status})`);
      });
    } else {
      console.log("⚠️  No blog posts found - create some for testing");
    }

    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .limit(3);

    if (companies && companies.length > 0) {
      console.log(`✅ Found ${companies.length} companies for testing`);
    } else {
      console.log("⚠️  No companies found - ensure proper setup");
    }

    // Test 5: Environment variables check
    console.log("\n5️⃣ Environment variables check...");

    const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

    let envVarsOk = true;
    requiredEnvVars.forEach((envVar) => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`❌ ${envVar} is missing`);
        envVarsOk = false;
      }
    });

    // Note: OPENAI_API_KEY should be set in Supabase, not locally
    console.log(
      "ℹ️  OPENAI_API_KEY should be set in Supabase Function environment"
    );

    console.log("\n🎯 Test Summary:");
    console.log("================");
    console.log("✅ Database schema: Ready");
    console.log("✅ Function accessibility: Tested");
    console.log(
      `${envVarsOk ? "✅" : "❌"} Environment variables: ${
        envVarsOk ? "Ready" : "Missing"
      }`
    );

    if (
      blogPosts &&
      blogPosts.length > 0 &&
      companies &&
      companies.length > 0 &&
      envVarsOk
    ) {
      console.log("\n🚀 System ready for social media automation!");
      console.log("\nNext steps:");
      console.log("1. Set OPENAI_API_KEY in Supabase Function environment");
      console.log(
        "2. Deploy function: supabase functions deploy blog_social_webhook"
      );
      console.log(
        "3. Configure automation in Admin → Social Media Manager → Automation"
      );
      console.log("4. Set up external webhook (Make.com/Zapier) if desired");
      console.log("5. Test with a blog post publication");
    } else {
      console.log(
        "\n⚠️  System needs additional setup before automation will work"
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testAutomationSystem()
  .then(() => {
    console.log("\n✨ Test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test script error:", error);
    process.exit(1);
  });
 