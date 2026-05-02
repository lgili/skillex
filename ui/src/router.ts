import { createRouter, createWebHistory } from "vue-router";
import type { WebUiBootstrap } from "./types";

const CatalogPage = () => import("./pages/CatalogPage.vue");
const SkillDetailPage = () => import("./pages/SkillDetailPage.vue");
const DoctorPage = () => import("./pages/DoctorPage.vue");

export function createSkillexRouter(bootstrap: WebUiBootstrap) {
  return createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: "/",
        name: "catalog",
        component: CatalogPage,
      },
      {
        path: "/skills/:skillId",
        name: "skill-detail",
        component: SkillDetailPage,
        props: true,
      },
      {
        path: "/doctor",
        name: "doctor",
        component: DoctorPage,
      },
    ],
    scrollBehavior() {
      return { top: 0 };
    },
  });
}
