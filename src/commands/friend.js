/**
 * Friend commands — list, find, info, add, accept, remove, block, unblock, last-online, online.
 */

import { getApi } from "../core/zalo-client.js";
import { success, error, info, output } from "../utils/output.js";

/** Extract numeric error code from zca-js error message string. */
function extractErrorCode(msg) {
    const match = String(msg).match(/\((\-?\d+)\)/);
    return match ? Number(match[1]) : null;
}

export function registerFriendCommands(program) {
    const friend = program.command("friend").description("Manage friends and contacts");

    friend
        .command("list")
        .description("List all friends")
        .action(async () => {
            try {
                const result = await getApi().getAllFriends();
                output(result, program.opts().json, () => {
                    const profiles = result?.changed_profiles || result || {};
                    const entries = Object.entries(profiles);
                    info(`${entries.length} friends`);
                    for (const [uid, p] of entries) {
                        console.log(`  ${uid}  ${p.displayName || p.zaloName || "?"}`);
                    }
                });
            } catch (e) {
                error(e.message);
            }
        });

    friend
        .command("online")
        .description("List currently online friends")
        .action(async () => {
            try {
                const result = await getApi().getFriendOnlines();
                output(result, program.opts().json);
            } catch (e) {
                error(e.message);
            }
        });

    friend
        .command("find <query>")
        .description("Find user by phone number or Zalo ID")
        .action(async (query) => {
            try {
                const result = await getApi().findUser(query);
                if (!result || (!result.uid && !result?.data?.uid)) {
                    error(
                        `No Zalo user found for "${query}". User may not exist, has disabled phone search, or phone is not registered on Zalo.`,
                    );
                    return;
                }
                output(result, program.opts().json, () => {
                    const u = result?.uid ? result : result?.data || result;
                    info(`User ID: ${u.uid || "?"}`);
                    info(`Name: ${u.displayName || u.zaloName || u.display_name || u.zalo_name || "?"}`);
                });
            } catch (e) {
                error(`Find user failed: ${e.message}`);
            }
        });

    friend
        .command("info <userId>")
        .description("Get user profile information")
        .action(async (userId) => {
            try {
                const result = await getApi().getUserInfo(userId);
                output(result, program.opts().json, () => {
                    const profiles = result?.changed_profiles || {};
                    const p = profiles[userId] || {};
                    info(`Name: ${p.displayName || p.zaloName || "?"}`);
                    info(`Phone: ${p.phoneNumber || "?"}`);
                    info(`Avatar: ${p.avatar || "?"}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    friend
        .command("add <userId>")
        .description("Send a friend request")
        .option("-m, --msg <text>", "Message to include", "")
        .action(async (userId, opts) => {
            try {
                // zca-js API signature: sendFriendRequest(msg, userId)
                const result = await getApi().sendFriendRequest(opts.msg, userId);
                output(result, program.opts().json, () => success(`Friend request sent to ${userId}`));
            } catch (e) {
                // Map Zalo error codes to actionable messages
                const code = e.code || extractErrorCode(e.message);
                const errMap = {
                    225: `Already friends with ${userId}. Use "friend list" to verify.`,
                    215: `User ${userId} may have blocked you or is unreachable.`,
                    222: `User ${userId} already sent you a friend request. Use "friend accept ${userId}" instead.`,
                    "-1": `Invalid userId "${userId}". Use "friend find <phone>" to get the correct userId first.`,
                };
                error(errMap[code] || `Friend request failed (code ${code}): ${e.message}`);
            }
        });

    friend
        .command("accept <userId>")
        .description("Accept a friend request")
        .action(async (userId) => {
            try {
                const result = await getApi().acceptFriendRequest(userId);
                output(result, program.opts().json, () => success(`Accepted friend request from ${userId}`));
            } catch (e) {
                error(`Accept friend request failed for ${userId}: ${e.message}`);
            }
        });

    friend
        .command("remove <userId>")
        .description("Remove a friend")
        .action(async (userId) => {
            try {
                const result = await getApi().removeFriend(userId);
                output(result, program.opts().json, () => success(`Removed friend ${userId}`));
            } catch (e) {
                error(`Remove friend failed for ${userId}: ${e.message}`);
            }
        });

    friend
        .command("block <userId>")
        .description("Block a user")
        .action(async (userId) => {
            try {
                const result = await getApi().blockUser(userId);
                output(result, program.opts().json, () => success(`Blocked user ${userId}`));
            } catch (e) {
                error(`Block user failed for ${userId}: ${e.message}`);
            }
        });

    friend
        .command("unblock <userId>")
        .description("Unblock a user")
        .action(async (userId) => {
            try {
                const result = await getApi().unblockUser(userId);
                output(result, program.opts().json, () => success(`Unblocked user ${userId}`));
            } catch (e) {
                error(`Unblock user failed for ${userId}: ${e.message}`);
            }
        });

    friend
        .command("last-online <userId>")
        .description("Check when user was last online")
        .action(async (userId) => {
            try {
                const result = await getApi().getLastOnline(userId);
                output(result, program.opts().json);
            } catch (e) {
                error(e.message);
            }
        });
}
