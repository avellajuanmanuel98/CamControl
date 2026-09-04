import { createApp } from "./app";
import { env } from "./config/env";
import { startMonitoringScheduler } from "./modules/monitoring/monitor.service";

const app = createApp();

app.listen(env.port, () => {
  console.log(`CamControl backend escuchando en http://localhost:${env.port}`);
  startMonitoringScheduler();
});
