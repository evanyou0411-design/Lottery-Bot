/**
 * Profile commands — view/update profile, avatar, bio, and privacy settings.
 */

import { resolve } from "path";
import { getApi } from "../core/zalo-client.js";
import { success, error, info, output } from "../utils/output.js";

/** Valid privacy setting keys and their human-readable labels + value descriptions. */
const SETTING_MAP = {
    "online-status": {
        key: "show_online_status",
        label: "Show online status",
        values: { 0: "hidden", 1: "visible" },
    },
    "seen-status": {
        key: "display_seen_status",
        label: "Display seen status",
        values: { 0: "hidden", 1: "visible" },
    },
    "birthday": {
        key: "view_birthday",
        label: "Birthday visibility",
        values: { 0: "hidden", 1: "full (day/month/year)", 2: "partial (day/month)" },
    },
    "receive-msg": {
        key: "receive_message",
        label: "Receive messages from",
        values: { 1: "everyone", 2: "friends only" },
    },
    "accept-call": {
        key: "accept_stranger_call",
        label: "Accept calls from",
        values: { 2: "friends only", 3: "everyone", 4: "friends + contacted" },
    },
    "add-by-phone": {
        key: "add_friend_via_phone",
        label: "Find by phone number",
        values: { 0: "disabled", 1: "enabled" },
    },
    "add-by-qr": {
        key: "add_friend_via_qr",
        label: "Find by QR code",
        values: { 0: "disabled", 1: "enabled" },
    },
    "add-by-group": {
        key: "add_friend_via_group",
        label: "Find via group",
        values: { 0: "disabled", 1: "enabled" },
    },
    "recommend": {
        key: "display_on_recommend_friend",
        label: "Show in friend recommendations",
        values: { 0: "disabled", 1: "enabled" },
    },
};

export function registerProfileCommands(program) {
    const profile = program.command("profile").description("View and update your Zalo profile and settings");

    profile
        .command("me")
        .description("Show current account profile")
        .action(async () => {
            try {
                const result = await getApi().fetchAccountInfo();
                const p = result?.profile || {};
                output(result, program.opts().json, () => {
                    info(`Name: ${p.displayName || p.zaloName || "?"}`);
                    info(`User ID: ${p.userId || "?"}`);
                    info(`Phone: ${p.phoneNumber || "?"}`);
                    info(`Gender: ${p.gender === 0 ? "Male" : p.gender === 1 ? "Female" : "?"}`);
                    info(`DOB: ${p.sdob || "?"}`);
                    info(`Status: ${p.status || "(none)"}`);
                    info(`Avatar: ${p.avatar || "?"}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    profile
        .command("avatar <imagePath>")
        .description("Change your profile avatar")
        .action(async (imagePath) => {
            try {
                const absPath = resolve(imagePath);
                const result = await getApi().changeAccountAvatar(absPath);
                output(result, program.opts().json, () => success("Avatar updated"));
            } catch (e) {
                error(`Avatar update failed: ${e.message}`);
            }
        });

    profile
        .command("bio [text]")
        .description("View or update your profile bio/status")
        .action(async (text) => {
            try {
                if (text === undefined) {
                    const result = await getApi().fetchAccountInfo();
                    const bio = result?.profile?.status || "(empty)";
                    output({ bio }, program.opts().json, () => info(`Bio: ${bio}`));
                } else {
                    const result = await getApi().updateProfileBio(text);
                    output(result, program.opts().json, () => success(`Bio updated to: "${text}"`));
                }
            } catch (e) {
                error(`Bio update failed: ${e.message}`);
            }
        });

    profile
        .command("update")
        .description("Update profile name, birthday, or gender")
        .option("-n, --name <name>", "Display name")
        .option("-d, --dob <YYYY-MM-DD>", "Date of birth")
        .option("-g, --gender <0|1>", "Gender: 0=Male, 1=Female")
        .action(async (opts) => {
            try {
                if (!opts.name && !opts.dob && !opts.gender) {
                    error("Provide at least one: --name, --dob, or --gender");
                    return;
                }
                // Fetch current profile to fill missing fields (API requires all 3)
                const current = await getApi().fetchAccountInfo();
                const p = current?.profile || {};
                const payload = {
                    profile: {
                        name: opts.name || p.displayName || p.zaloName,
                        dob: opts.dob || p.sdob || "2000-01-01",
                        gender: opts.gender !== undefined ? Number(opts.gender) : p.gender ?? 0,
                    },
                };
                const result = await getApi().updateProfile(payload);
                output(result, program.opts().json, () => success("Profile updated"));
            } catch (e) {
                error(`Profile update failed: ${e.message}`);
            }
        });

    profile
        .command("settings")
        .description("View current privacy settings")
        .action(async () => {
            try {
                const result = await getApi().getSettings();
                output(result, program.opts().json, () => {
                    info("Privacy settings:");
                    console.log();
                    for (const [slug, meta] of Object.entries(SETTING_MAP)) {
                        const raw = result[meta.key];
                        // Normalize booleans to 0/1 (API returns bool for some settings)
                        const val = raw === true ? 1 : raw === false ? 0 : raw;
                        const label = meta.values[val] || String(val);
                        console.log(`  ${meta.label.padEnd(30)} ${label}  (${slug}=${val})`);
                    }
                    console.log();
                    info("Update: zalo-agent profile set <setting> <value>");
                    info("Example: zalo-agent profile set online-status 0");
                });
            } catch (e) {
                error(e.message);
            }
        });

    profile
        .command("set <setting> <value>")
        .description("Update a privacy setting (use 'profile settings' to see options)")
        .action(async (setting, value) => {
            try {
                const meta = SETTING_MAP[setting];
                if (!meta) {
                    error(`Unknown setting: "${setting}". Valid: ${Object.keys(SETTING_MAP).join(", ")}`);
                    return;
                }
                const numVal = Number(value);
                if (!(numVal in meta.values)) {
                    error(
                        `Invalid value for ${setting}. Valid: ${Object.entries(meta.values).map(([k, v]) => `${k}=${v}`).join(", ")}`,
                    );
                    return;
                }
                const result = await getApi().updateSettings(meta.key, numVal);
                output(result, program.opts().json, () =>
                    success(`${meta.label}: ${meta.values[numVal]} (${numVal})`),
                );
            } catch (e) {
                error(`Setting update failed: ${e.message}`);
            }
        });
}
