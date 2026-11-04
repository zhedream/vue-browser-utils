// npm run dev: 构建运行时、监听 examples 的 TS，再启动本地静态服务。
const { build } = require("./build-runtime");
const { watchTs } = require("./internal/watch-ts");
const httpServer = require("http-server");
const path = require("path");
async function main() {
  await build();
  const watcher = watchTs();
  await watcher.ready;
  const server = httpServer.createServer({ root: path.resolve(__dirname, ".."), cache: -1 });
  const port = Number(process.env.PORT) || 14030;
  server.listen(port, "127.0.0.1", () =>
    console.log(`Example: http://127.0.0.1:${port}/examples/`)
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await watcher.close();
      server.close();
      process.exit();
    });
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
