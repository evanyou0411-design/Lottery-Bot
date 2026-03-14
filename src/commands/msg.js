/**
 * Message commands — send text, images, files, cards, bank cards, QR transfers,
 * stickers, reactions, delete, forward.
 */

import { resolve } from "path";
import { getApi, autoLogin, clearSession } from "../core/zalo-client.js";
import { success, error, info, warning, output } from "../utils/output.js";

export function registerMsgCommands(program) {
    const msg = program.command("msg").description("Send and manage messages");

    msg.command("send <threadId> <message>")
        .description("Send a text message")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option(
            "--react <icon>",
            "Auto-react to sent message. Codes: :> (haha), /-heart (heart), /-strong (like), :o (wow), :-(( (cry), :-h (angry)",
        )
        .action(async (threadId, message, opts) => {
            try {
                // Capture clientId before send — zca-js uses Date.now() internally
                const cliMsgId = String(Date.now());
                const result = await getApi().sendMessage(message, threadId, Number(opts.type));
                // Include cliMsgId in output for later use with react command
                result.cliMsgId = cliMsgId;
                output(result, program.opts().json, () => success("Message sent"));

                // Auto-react if --react flag provided
                if (opts.react && result.message?.msgId) {
                    const dest = {
                        data: { msgId: String(result.message.msgId), cliMsgId },
                        threadId,
                        type: Number(opts.type),
                    };
                    await getApi().addReaction(opts.react, dest);
                    success(`Auto-reacted with '${opts.react}'`);
                }
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-image <threadId> <paths...>")
        .description("Send one or more images")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-m, --caption <text>", "Caption text", "")
        .action(async (threadId, paths, opts) => {
            try {
                const absPaths = paths.map((p) => resolve(p));
                const result = await getApi().sendMessage(
                    { msg: opts.caption, attachments: absPaths },
                    threadId,
                    Number(opts.type),
                );
                output(result, program.opts().json, () => success(`Image(s) sent to ${threadId}`));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-file <threadId> <paths...>")
        .description("Send files (docx, pdf, zip, etc.)")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-m, --caption <text>", "Caption text", "")
        .action(async (threadId, paths, opts) => {
            try {
                const absPaths = paths.map((p) => resolve(p));
                const result = await getApi().sendMessage(
                    { msg: opts.caption, attachments: absPaths },
                    threadId,
                    Number(opts.type),
                );
                output(result, program.opts().json, () => success(`File(s) sent to ${threadId}`));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-card <threadId> <userId>")
        .description("Send a contact card (danh thiếp)")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("--phone <num>", "Phone number (auto-fetched if omitted)")
        .action(async (threadId, userId, opts) => {
            try {
                const api = getApi();
                let phone = opts.phone;
                if (!phone) {
                    const userInfo = await api.getUserInfo(userId);
                    const profiles = userInfo?.changed_profiles || {};
                    phone = profiles[userId]?.phoneNumber || "";
                    if (phone) info(`Auto-detected phone: ${phone}`);
                }
                const cardOpts = { userId };
                if (phone) cardOpts.phoneNumber = phone;
                const result = await api.sendCard(cardOpts, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Card sent"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-bank <threadId> <accountNumber>")
        .description("Send a bank card (số tài khoản)")
        .requiredOption("-b, --bank <name>", "Bank name (ocb, vcb, bidv) or BIN code")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-n, --name <holder>", "Account holder name")
        .action(async (threadId, accountNumber, opts) => {
            try {
                const { resolveBankBin, BIN_TO_DISPLAY } = await import("../utils/bank-helpers.js");
                const bin = resolveBankBin(opts.bank);
                if (!bin) {
                    error(`Unknown bank: '${opts.bank}'`);
                    return;
                }
                info(`Bank: ${BIN_TO_DISPLAY[bin] || bin} (BIN ${bin})`);

                const payload = { binBank: bin, numAccBank: accountNumber };
                if (opts.name) payload.nameAccBank = opts.name;
                const result = await getApi().sendBankCard(payload, threadId, Number(opts.type));
                output(result, program.opts().json, () =>
                    success(`Bank card sent: ${BIN_TO_DISPLAY[bin]} / ${accountNumber}`),
                );
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-qr-transfer <threadId> <accountNumber>")
        .description("Generate VietQR and send as image")
        .requiredOption("-b, --bank <name>", "Bank name or BIN code")
        .option("-a, --amount <n>", "Transfer amount in VND", parseInt)
        .option("-m, --content <text>", "Transfer content (max 50 chars)")
        .option("--template <tpl>", "QR style: compact, print, qronly", "compact")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .action(async (threadId, accountNumber, opts) => {
            try {
                const { resolveBankBin, BIN_TO_DISPLAY, generateQrTransferImage } =
                    await import("../utils/bank-helpers.js");
                const bin = resolveBankBin(opts.bank);
                if (!bin) {
                    error(`Unknown bank: '${opts.bank}'`);
                    return;
                }
                if (opts.content && opts.content.length > 50) {
                    error(`Content too long (${opts.content.length} chars). VietQR max is 50.`);
                    return;
                }
                info(
                    `Generating QR: ${BIN_TO_DISPLAY[bin]} / ${accountNumber}${opts.amount ? ` / ${opts.amount.toLocaleString()}đ` : ""}`,
                );

                const qrPath = await generateQrTransferImage(
                    bin,
                    accountNumber,
                    opts.amount,
                    opts.content,
                    opts.template,
                );
                if (!qrPath) {
                    error("Failed to generate QR image");
                    return;
                }

                const caption = [
                    `QR chuyển khoản ${BIN_TO_DISPLAY[bin]} - ${accountNumber}`,
                    opts.amount ? `${opts.amount.toLocaleString()}đ` : null,
                    opts.content || null,
                ]
                    .filter(Boolean)
                    .join(" - ");

                const result = await getApi().sendMessage(
                    { msg: caption, attachments: [qrPath] },
                    threadId,
                    Number(opts.type),
                );

                // Cleanup temp file
                try {
                    (await import("fs")).unlinkSync(qrPath);
                } catch {}

                output(result, program.opts().json, () => success(`QR transfer sent to ${threadId}`));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("sticker <threadId> <keyword>")
        .description("Search and send a sticker")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .action(async (threadId, keyword, opts) => {
            try {
                const api = getApi();
                const search = await api.searchSticker(keyword);
                const stickerId = search?.[0]?.stickerId || "";
                if (!stickerId) {
                    error("No sticker found");
                    return;
                }
                const result = await api.sendSticker(stickerId, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Sticker sent"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("react <msgId> <threadId> <reaction>")
        .description(
            "React to a message. Reaction codes: :> (haha), /-heart (heart), /-strong (like), :o (wow), :-(( (cry), :-h (angry)",
        )
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option(
            "-c, --cli-msg-id <id>",
            "Client message ID (required for reaction to appear, get from msg listen --json)",
        )
        .action(async (msgId, threadId, reaction, opts) => {
            try {
                // zca-js addReaction(icon, dest) — dest needs msgId + cliMsgId
                const dest = {
                    data: { msgId, cliMsgId: opts.cliMsgId || msgId },
                    threadId,
                    type: Number(opts.type),
                };
                const result = await getApi().addReaction(reaction, dest);
                output(result, program.opts().json, () => success(`Reacted with '${reaction}'`));
            } catch (e) {
                error(`React failed: ${e.message}`);
            }
        });

    msg.command("listen")
        .description(
            "Listen for incoming messages in real-time via WebSocket. Outputs msgId + cliMsgId needed for react. Use --json for machine parsing.",
        )
        .option("-f, --filter <type>", "Filter messages: user (DM only), group (groups only), all (default)", "all")
        .option("-w, --webhook <url>", "POST each message as JSON to this URL (for n8n, Make, etc.)")
        .option("--no-self", "Exclude messages sent by this account")
        .action(async (opts) => {
            const jsonMode = program.opts().json;
            const startTime = Date.now();
            let reconnectCount = 0;

            /** Format uptime as human-readable string */
            function uptime() {
                const s = Math.floor((Date.now() - startTime) / 1000);
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                return h > 0 ? `${h}h${m}m` : `${m}m${s % 60}s`;
            }

            /** Attach message handler to current API listener */
            function attachMessageHandler(api) {
                api.listener.on("message", async (msg) => {
                    if (opts.filter === "user" && msg.type !== 0) return;
                    if (opts.filter === "group" && msg.type !== 1) return;
                    if (!opts.self && msg.isSelf) return;

                    const content = typeof msg.data.content === "string" ? msg.data.content : "[non-text]";
                    const data = {
                        msgId: msg.data.msgId,
                        cliMsgId: msg.data.cliMsgId,
                        threadId: msg.threadId,
                        type: msg.type,
                        isSelf: msg.isSelf,
                        content,
                    };

                    if (jsonMode) {
                        console.log(JSON.stringify(data));
                    } else {
                        const dir = msg.isSelf ? "→" : "←";
                        const typeLabel = msg.type === 0 ? "DM" : "GR";
                        console.log(`  ${dir} [${typeLabel}] [${msg.threadId}] ${content}  (msgId: ${msg.data.msgId})`);
                    }

                    if (opts.webhook) {
                        try {
                            await fetch(opts.webhook, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(data),
                            });
                        } catch {
                            // Silent webhook failure
                        }
                    }
                });
            }

            /** Start listener with auto-reconnect and re-login */
            async function startListener() {
                try {
                    const api = getApi();

                    api.listener.on("connected", () => {
                        if (reconnectCount > 0) {
                            info(`Reconnected (attempt #${reconnectCount}, uptime: ${uptime()})`);
                        }
                    });

                    api.listener.on("disconnected", (code, _reason) => {
                        warning(`Disconnected (code: ${code}). Auto-retrying...`);
                    });

                    // "closed" = permanent close (retries exhausted or duplicate connection)
                    api.listener.on("closed", async (code, _reason) => {
                        if (code === 3000) {
                            // Duplicate connection — someone opened Zalo Web
                            error("Another Zalo Web session opened. Listener stopped.");
                            error("Close the other session and restart listener.");
                            process.exit(1);
                        }

                        reconnectCount++;
                        warning(`Connection closed (code: ${code}). Re-login in 5s... (uptime: ${uptime()})`);

                        // Re-login and restart
                        await new Promise((r) => setTimeout(r, 5000));
                        try {
                            clearSession();
                            await autoLogin(jsonMode);
                            info(`Re-login successful. Restarting listener...`);
                            attachMessageHandler(getApi());
                            getApi().listener.start({ retryOnClose: true });
                        } catch (e) {
                            error(`Re-login failed: ${e.message}. Retrying in 30s...`);
                            await new Promise((r) => setTimeout(r, 30000));
                            startListener();
                        }
                    });

                    api.listener.on("error", (_err) => {
                        // Log but don't crash — WS errors are usually followed by close/disconnect
                    });

                    attachMessageHandler(api);
                    // retryOnClose: true = zca-js auto-retries on temporary disconnects
                    api.listener.start({ retryOnClose: true });

                    info("Listening for messages... Press Ctrl+C to stop.");
                    info("Auto-reconnect enabled. Will survive network drops.");
                    if (opts.filter !== "all") info(`Filter: ${opts.filter} messages only`);
                    if (opts.webhook) info(`Webhook: POST to ${opts.webhook}`);
                } catch (e) {
                    error(`Listen failed: ${e.message}`);
                    process.exit(1);
                }
            }

            await startListener();

            // Keep alive until Ctrl+C
            await new Promise((resolve) => {
                process.on("SIGINT", () => {
                    try {
                        getApi().listener.stop();
                    } catch {}
                    info(`Listener stopped. Uptime: ${uptime()}, reconnects: ${reconnectCount}`);
                    resolve();
                });
            });
        });

    msg.command("delete <msgId> <threadId>")
        .description("Delete a message you sent")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .action(async (msgId, threadId, opts) => {
            try {
                const result = await getApi().deleteMessage(msgId, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Message deleted"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("forward <msgId> <threadId>")
        .description("Forward a message to another thread")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .action(async (msgId, threadId, opts) => {
            try {
                const result = await getApi().forwardMessage(msgId, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Message forwarded"));
            } catch (e) {
                error(e.message);
            }
        });
}
