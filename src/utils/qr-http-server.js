/**
 * Temporary local HTTP server for QR display on headless/VPS environments.
 * Serves QR image as a simple HTML page on localhost.
 * Auto-closes after login completes.
 */

import http from "http";
import { readFileSync, existsSync } from "fs";
import { info } from "./output.js";

/**
 * Start a temporary HTTP server that serves the QR image.
 * @param {string} qrImagePath - path to QR PNG file
 * @param {number} port - default 18927
 * @returns {{ url: string, close: () => void }}
 */
export function startQrServer(qrImagePath, port = 18927) {
    const server = http.createServer((req, res) => {
        if (req.url === "/qr" || req.url === "/") {
            if (!existsSync(qrImagePath)) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="2">
<title>Waiting for QR...</title></head>
<body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;color:#fff;font-family:system-ui">
<p>QR code generating... auto-refreshing in 2s</p></body></html>`);
                return;
            }
            const img = readFileSync(qrImagePath);
            const b64 = img.toString("base64");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Zalo QR Login</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#111;font-family:system-ui}
.card{text-align:center;padding:2rem;background:#1a1a2e;border-radius:16px}
h2{color:#fff;margin-bottom:1rem}img{width:280px;border-radius:8px}
p{color:#888;font-size:0.9rem;margin-top:1rem}</style></head>
<body><div class="card">
<h2>Scan with Zalo app</h2>
<img src="data:image/png;base64,${b64}" alt="QR Code"/>
<p>This page auto-closes after login</p>
</div></body></html>`);
        } else {
            res.writeHead(404);
            res.end("Not found");
        }
    });

    // Listen on all interfaces so VPS users can access directly
    // QR codes are one-time use and expire quickly — low security risk
    server.listen(port, "0.0.0.0", () => {
        info(`QR available at: http://localhost:${port}/qr`);
        info(`On VPS, open: http://<your-server-ip>:${port}/qr`);
        info(`Or SSH tunnel: ssh -L ${port}:localhost:${port} user@server`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            // Try next port
            info(`Port ${port} in use, trying ${port + 1}...`);
            server.listen(port + 1, "127.0.0.1");
        }
    });

    return {
        url: `http://localhost:${port}/qr`,
        close: () => {
            try {
                server.close();
            } catch {}
        },
    };
}
