import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

export const generateImage = mutation({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to generate images");
    }

    const imageId = await ctx.db.insert("images", {
      prompt: args.prompt,
      userId,
      status: "generating",
    });

    // Schedule the actual image generation
    await ctx.scheduler.runAfter(0, internal.images.processImageGeneration, {
      imageId,
    });

    return imageId;
  },
});

export const processImageGeneration = internalAction({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    try {
      const image = await ctx.runQuery(internal.images.getImage, {
        imageId: args.imageId,
      });

      if (!image) {
        throw new Error("Image not found");
      }

      // For demo purposes, create a placeholder image
      // To use real AI image generation, set up your OpenAI API key
      const placeholderUrl = `https://via.placeholder.com/1024x1024/3b82f6/ffffff?text=${encodeURIComponent(image.prompt.slice(0, 50))}`;
      const imageResponse = await fetch(placeholderUrl);
      const imageBlob = await imageResponse.blob();
      
      const storageId = await ctx.storage.store(imageBlob);

      // Update the image record
      await ctx.runMutation(internal.images.updateImageResult, {
        imageId: args.imageId,
        storageId,
        status: "completed",
      });
    } catch (error) {
      console.error("Image generation failed:", error);
      await ctx.runMutation(internal.images.updateImageResult, {
        imageId: args.imageId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

export const getImage = internalQuery({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.imageId);
  },
});

export const updateImageResult = internalMutation({
  args: {
    imageId: v.id("images"),
    storageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("generating"), v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.imageId, {
      storageId: args.storageId,
      status: args.status,
      error: args.error,
    });
  },
});

export const getUserImages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const images = await ctx.db
      .query("images")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Get storage URLs for completed images
    return await Promise.all(
      images.map(async (image) => ({
        ...image,
        url: image.storageId ? await ctx.storage.getUrl(image.storageId) : null,
      }))
    );
  },
});
