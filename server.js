const http = require("http");
const { URL } = require("url");

// Helpers
function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

// Lee el body como string (útil para JSON)
function readBody(req, { limitBytes = 1_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(Object.assign(new Error("Payload too large"), { code: "PAYLOAD_TOO_LARGE" }));
        req.destroy(); // corta la conexión
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJsonSafe(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

// “DB” en memoria solo para demo
const todos = new Map(); // id -> {id, title, done}
let nextId = 1;

const server = http.createServer(async (req, res) => {
  // 1) Parsear URL (path + query)
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const path = fullUrl.pathname;
  const method = req.method || "GET";

  // Log mínimo
  console.log(`${method} ${path}`);

  // 2) Routing básico
  try {
    // Health check
    if (method === "GET" && path === "/health") {
      return sendJson(res, 200, { ok: true, uptime: process.uptime() });
    }

    // GET /todos
    if (method === "GET" && path === "/todos") {
      // ejemplo de query: /todos?done=true
      const doneParam = fullUrl.searchParams.get("done");
      const filterDone = doneParam === null ? null : doneParam === "true";

      let list = Array.from(todos.values());
      if (filterDone !== null) {
        list = list.filter((t) => t.done === filterDone);
      }

      return sendJson(res, 200, { items: list, count: list.length });
    }

    // POST /todos  body: { "title": "..." }
    if (method === "POST" && path === "/todos") {
      const contentType = (req.headers["content-type"] || "").split(";")[0].trim();

      if (contentType !== "application/json") {
        return sendJson(res, 415, { message: "Content-Type must be application/json" });
      }

      const bodyText = await readBody(req, { limitBytes: 200_000 });
      const parsed = parseJsonSafe(bodyText);

      if (!parsed.ok) {
        return sendJson(res, 400, { message: "Invalid JSON" });
      }

      const title = (parsed.value?.title || "").toString().trim();
      if (!title) {
        return sendJson(res, 422, { message: "title is required" });
      }

      const todo = { id: nextId++, title, done: false };
      todos.set(todo.id, todo);

      return sendJson(res, 201, todo);
    }

    // Rutas con parámetro: /todos/:id
    // Ej: GET /todos/3, PATCH /todos/3, DELETE /todos/3
    const todoIdMatch = path.match(/^\/todos\/(\d+)$/);
    if (todoIdMatch) {
      const id = Number(todoIdMatch[1]);
      const existing = todos.get(id);

      if (!existing) {
        return sendJson(res, 404, { message: "Todo not found" });
      }

      // GET /todos/:id
      if (method === "GET") {
        return sendJson(res, 200, existing);
      }

      // PATCH /todos/:id  body: { "title"?: "...", "done"?: true/false }
      if (method === "PATCH") {
        const contentType = (req.headers["content-type"] || "").split(";")[0].trim();
        if (contentType !== "application/json") {
          return sendJson(res, 415, { message: "Content-Type must be application/json" });
        }

        const bodyText = await readBody(req, { limitBytes: 200_000 });
        const parsed = parseJsonSafe(bodyText);
        if (!parsed.ok) return sendJson(res, 400, { message: "Invalid JSON" });

        const next = { ...existing };

        if (parsed.value.title !== undefined) {
          const title = (parsed.value.title || "").toString().trim();
          if (!title) return sendJson(res, 422, { message: "title cannot be empty" });
          next.title = title;
        }

        if (parsed.value.done !== undefined) {
          if (typeof parsed.value.done !== "boolean") {
            return sendJson(res, 422, { message: "done must be boolean" });
          }
          next.done = parsed.value.done;
        }

        todos.set(id, next);
        return sendJson(res, 200, next);
      }

      // DELETE /todos/:id
      if (method === "DELETE") {
        todos.delete(id);
        // 204 = no content
        res.writeHead(204);
        return res.end();
      }

      // Método no permitido para esa ruta
      res.setHeader("Allow", "GET, PATCH, DELETE");
      return sendJson(res, 405, { message: "Method Not Allowed" });
    }

    // Si no matcheó nada:
    return sendJson(res, 404, { message: "Not Found" });
  } catch (err) {
    // Error handler “global” del request
    if (err?.code === "PAYLOAD_TOO_LARGE") {
      return sendJson(res, 413, { message: "Payload too large" });
    }
    console.error(err);
    return sendJson(res, 500, { message: "Internal Server Error" });
  }
});

server.listen(3000, () => {
  console.log("HTTP API listening on http://localhost:3000");
});
