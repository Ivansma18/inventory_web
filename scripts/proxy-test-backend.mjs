import { createServer } from "node:http";

const backendHost = "127.0.0.1";
const backendPort = 5175;
const controlHost = "127.0.0.1";
const controlPort = 5176;
let recordedRequests = [];

const sendJson = (response, status, value) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
};

const backendServer = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/__proxy-test/health") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ready");
    return;
  }

  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    recordedRequests.push({
      body: Buffer.concat(chunks).toString("utf8"),
      method: request.method ?? "",
      origin: request.headers.origin,
      url: request.url,
    });

    sendJson(response, 200, { ok: true });
  });
});

const controlServer = createServer((request, response) => {
  const path = new URL(request.url ?? "/", `http://${controlHost}`).pathname;

  if (request.method === "POST" && path === "/__control/reset") {
    recordedRequests = [];
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && path === "/__control/requests") {
    sendJson(response, 200, recordedRequests);
    return;
  }

  if (request.method === "POST" && path === "/__control/stop-backend") {
    backendServer.close((error) => {
      if (error) {
        sendJson(response, 500, { error: "Unable to stop the mock backend." });
        return;
      }

      response.writeHead(204);
      response.end();
    });
    return;
  }

  sendJson(response, 404, { error: "Unknown proxy test control operation." });
});

const listen = (server, port, host) =>
  new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.removeListener("error", onError);
      resolve();
    });
  });

const close = (server) =>
  new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }

    server.close(() => resolve());
  });

try {
  await Promise.all([
    listen(backendServer, backendPort, backendHost),
    listen(controlServer, controlPort, controlHost),
  ]);
  process.stdout.write("Mock proxy backend and control server are ready.\n");
} catch (error) {
  process.stderr.write(`Unable to start the isolated proxy test backend: ${error.message}\n`);
  await Promise.all([close(backendServer), close(controlServer)]);
  process.exitCode = 1;
}
