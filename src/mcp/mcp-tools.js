/**
 * MCP tool registrations for Zalo message access and sending.
 * Registers 4 tools: zalo_get_messages, zalo_send_message, zalo_list_threads, zalo_mark_read.
 */

import { z } from "zod";

/** Thread type constants matching zca-js ThreadType enum */
const THREAD_USER = 0;
const THREAD_GROUP = 1;

/**
 * Wrap a result object into MCP tool content format.
 * @param {object} result
 * @returns {{ content: Array }}
 */
function ok(result) {
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
}

/**
 * Wrap an error message into MCP tool error content format.
 * @param {string} message
 * @returns {{ content: Array, isError: true }}
 */
function err(message) {
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

/**
 * Register all Zalo MCP tools on the server.
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {object} api - zca-js API instance
 * @param {import("./message-buffer.js").MessageBuffer} buffer
 * @param {import("./thread-filter.js").ThreadFilter} filter
 * @param {object} config - MCP config
 */
export function registerTools(server, api, buffer, filter, config) {
    const maxPerPoll = config.limits?.maxMessagesPerPoll ?? 20;

    // --- zalo_get_messages ---
    server.registerTool(
        "zalo_get_messages",
        {
            title: "Get Zalo Messages",
            description:
                "Get messages from Zalo threads (DMs and groups). Returns buffered messages since last read. Use 'since' cursor from previous response for incremental polling.",
            inputSchema: z.object({
                threadId: z.string().optional().describe("Thread ID to read from. Omit for all watched threads."),
                since: z.number().int().min(0).default(0).describe("Cursor from previous read for incremental polling"),
                limit: z.number().int().min(1).max(100).default(maxPerPoll).describe("Max messages to return"),
            }),
        },
        async ({ threadId, since, limit }) => {
            try {
                const result = buffer.read(threadId, since, limit);
                return ok(result);
            } catch (e) {
                console.error("[mcp-tools] zalo_get_messages error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_send_message ---
    server.registerTool(
        "zalo_send_message",
        {
            title: "Send Zalo Message",
            description: "Send a text message to a Zalo thread (DM or group). threadType: 0=DM(User), 1=Group.",
            inputSchema: z.object({
                threadId: z.string().describe("Thread ID to send message to"),
                text: z.string().min(1).describe("Message text to send"),
                threadType: z
                    .number()
                    .int()
                    .min(0)
                    .max(1)
                    .default(THREAD_USER)
                    .describe("Thread type: 0=DM(User), 1=Group"),
            }),
        },
        async ({ threadId, text, threadType }) => {
            try {
                const result = await api.sendMessage(text, threadId, Number(threadType));
                const messageId = result?.message?.msgId ?? result?.msgId ?? null;
                return ok({ success: true, messageId });
            } catch (e) {
                console.error("[mcp-tools] zalo_send_message error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_list_threads ---
    server.registerTool(
        "zalo_list_threads",
        {
            title: "List Zalo Threads",
            description:
                "List all Zalo threads currently buffered with unread message counts. Useful for discovering active conversations.",
            inputSchema: z.object({
                type: z
                    .enum(["group", "dm", "all"])
                    .default("all")
                    .describe("Filter by thread type: 'dm', 'group', or 'all'"),
            }),
        },
        async ({ type }) => {
            try {
                const stats = buffer.getStats(0);
                // Enrich each stat entry with threadType by peeking at the first buffered message.
                // buffer._threads is a Map<threadId, { messages: Array, lastActivity: number }>
                const enriched = stats.map((t) => {
                    const thread = buffer._threads.get(t.threadId);
                    const threadType = thread?.messages?.[0]?.threadType ?? "unknown";
                    return { ...t, threadType };
                });
                const filtered = type === "all" ? enriched : enriched.filter((t) => t.threadType === type);
                return ok({ threads: filtered, total: filtered.length });
            } catch (e) {
                console.error("[mcp-tools] zalo_list_threads error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_mark_read ---
    server.registerTool(
        "zalo_mark_read",
        {
            title: "Mark Zalo Messages Read",
            description:
                "Discard buffered messages up to and including the given cursor. Use the cursor returned by zalo_get_messages.",
            inputSchema: z.object({
                cursor: z
                    .number()
                    .int()
                    .min(0)
                    .describe("Cursor value returned from a previous zalo_get_messages call"),
            }),
        },
        async ({ cursor }) => {
            try {
                const discarded = buffer.markRead(cursor);
                return ok({ success: true, discarded });
            } catch (e) {
                console.error("[mcp-tools] zalo_mark_read error:", e.message);
                return err(e.message);
            }
        },
    );
}
