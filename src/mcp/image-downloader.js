/**
 * Download Zalo images to local filesystem, organized by thread name.
 * Folder structure: {downloadDir}/{threadName}/{date}_{time}_{sender}_{msgId}.{ext}
 * Cross-platform: opens images with system viewer (open/xdg-open/start).
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { platform } from "os";
import { exec } from "child_process";
import { CONFIG_DIR } from "../core/credentials.js";

/** Default download directory when not configured */
const DEFAULT_DIR = join(CONFIG_DIR, "images");

/** Characters unsafe for filesystem paths — stripped from folder/file names */
const UNSAFE_CHARS = /[/\\:*?"<>|]/g;

/**
 * Sanitize a string for use as a filesystem name.
 * @param {string} name
 * @returns {string}
 */
function sanitize(name) {
    return (name || "unknown").replace(UNSAFE_CHARS, "_").trim() || "unknown";
}

/**
 * Guess file extension from URL or content-type header.
 * @param {string} url
 * @param {string} [contentType]
 * @returns {string}
 */
function guessExtension(url, contentType) {
    // Try content-type first
    if (contentType) {
        const match = contentType.match(/image\/(jpeg|jpg|png|gif|webp|bmp)/i);
        if (match) return match[1] === "jpeg" ? "jpg" : match[1].toLowerCase();
    }
    // Try URL path
    const urlMatch = url.match(/\.(jpeg|jpg|png|gif|webp|bmp)(\?|$)/i);
    if (urlMatch) return urlMatch[1] === "jpeg" ? "jpg" : urlMatch[1].toLowerCase();
    return "jpg"; // safe default for Zalo CDN
}

/**
 * Build the folder name for a thread.
 * Groups: thread display name. DMs: "DM_{senderName}".
 * @param {object} message - Normalized message
 * @param {string} [threadName] - Resolved thread name from cache
 * @returns {string}
 */
function buildFolderName(message, threadName) {
    if (message.threadType === "group") {
        return sanitize(threadName || message.threadId);
    }
    return sanitize(`DM_${threadName || message.senderName || message.senderId}`);
}

/**
 * Build a descriptive filename from message metadata.
 * Format: {YYYY-MM-DD}_{HH-mm}_{sender}_{msgId}.{ext}
 * @param {object} message
 * @param {string} ext - File extension
 * @returns {string}
 */
function buildFileName(message, ext) {
    const d = new Date(message.timestamp);
    const date = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = `${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}`;
    const sender = sanitize(message.senderName || message.senderId);
    const msgId = (message.id || "noId").slice(-8); // last 8 chars for brevity
    return `${date}_${time}_${sender}_${msgId}.${ext}`;
}

/**
 * Open a file with the system's default viewer (cross-platform).
 * @param {string} filePath
 */
function openWithSystemViewer(filePath) {
    const cmds = { darwin: "open", win32: "start", linux: "xdg-open" };
    const cmd = cmds[platform()] || "xdg-open";
    // Use double quotes for paths with spaces; detach so CLI doesn't block
    exec(`${cmd} "${filePath}"`, (err) => {
        if (err) console.error(`[image-dl] Failed to open viewer: ${err.message}`);
    });
}

/**
 * Download an image from URL and save to organized local folder.
 * @param {object} message - Normalized message with attachment.url
 * @param {object} [options]
 * @param {string} [options.downloadDir] - Base download directory
 * @param {boolean} [options.autoOpen] - Open image after download
 * @param {string} [options.threadName] - Thread display name from cache
 * @returns {Promise<{ success: boolean, path: string, folder: string, fileName: string }>}
 */
export async function downloadImage(message, options = {}) {
    const url = message.attachment?.url;
    if (!url) throw new Error("Message has no attachment URL");

    const baseDir = options.downloadDir || DEFAULT_DIR;
    const folder = buildFolderName(message, options.threadName);
    const folderPath = join(baseDir, folder);
    mkdirSync(folderPath, { recursive: true });

    // Fetch image from Zalo CDN
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    const ext = guessExtension(url, contentType);
    const fileName = buildFileName(message, ext);
    const filePath = join(folderPath, fileName);

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(filePath, buffer);

    // Auto-open with system viewer if configured
    if (options.autoOpen) {
        openWithSystemViewer(filePath);
    }

    return { success: true, path: filePath, folder, fileName };
}
