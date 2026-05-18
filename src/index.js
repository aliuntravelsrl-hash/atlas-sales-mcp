#!/usr/bin/env node
"use strict";

const http = require("http");
const crypto = require("crypto");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { getConfig } = require("./config");
const { buildServer } = require("./server");

const config = getConfig();
const sessions = new Map();

function createSessionId() {
  return crypto.randomUUID();
}

function createSession() {
  const sessionId = createSessionId();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
  });
  const server = buildServer(config);
  const record = { sessionId, transport, server, createdAt: Date.now(), lastSeenAt: Date.now() };
  sessions.set(sessionId, record);
  return record;
}

async function connectSession(record) {
  await record.server.connect(record.transport);
  return record;
}

async function closeSession(sessionId) {
  const record = sessions.get(sessionId);
  if (!record) return false;
  if (typeof record.transport.close === "function") {
    await record.transport.close();
  }
  if (typeof record.server.close === "function") {
    await record.server.close();
  }
  sessions.delete(sessionId);
  return true;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function touch(record) {
  record.lastSeenAt = Date.now();
}

function getSession(req) {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || Array.isArray(sessionId)) return null;
  return sessions.get(sessionId) || null;
}

async function handlePost(req, res) {
  const body = await readRequestBody(req);
  let record = getSession(req);

  if (!record) {
    record = await connectSession(createSession());
  }

  touch(record);
  await record.transport.handleRequest(req, res, body);
}

async function handleDelete(req, res) {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || Array.isArray(sessionId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing mcp-session-id header" }));
    return;
  }

  const closed = await closeSession(sessionId);
  if (!closed) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Session not found" }));
    return;
  }

  res.writeHead(204);
  res.end();
}

function handleHealth(_req, res) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "up",
    server: config.appName,
    version: config.version,
    activeSessions: sessions.size,
  }));
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, record] of sessions.entries()) {
    if (now - record.lastSeenAt > config.sessionTtlMs) {
      closeSession(sessionId).catch(() => {});
    }
  }
}

const httpServer = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      handleHealth(req, res);
      return;
    }

    if (req.url !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    if (req.method === "POST") {
      await handlePost(req, res);
      return;
    }

    if (req.method === "DELETE") {
      await handleDelete(req, res);
      return;
    }

    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

setInterval(cleanupExpiredSessions, 60_000).unref();

httpServer.listen(config.port, () => {
  console.log(`[ATLAS-SALES-MCP] v${config.version} on :${config.port}`);
});
