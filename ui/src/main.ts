import { createApp } from "vue";
import { createSkillexRouter } from "./router";
import { createSkillexStore, SKILLEX_STORE_KEY } from "./store";
import { readBootstrap } from "./types";
import App from "./App.vue";
import "./styles.css";

const bootstrap = readBootstrap();
const router = createSkillexRouter(bootstrap);
const store = createSkillexStore(router, bootstrap);

const app = createApp(App);
app.provide(SKILLEX_STORE_KEY, store);
app.use(router);
app.mount("#app");
