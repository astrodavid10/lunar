import { createApp, defineAsyncComponent } from "vue";

import LunarViewer from "./lunar-viewer.vue";
import { boolParam } from "./urlParams";
import "@fontsource-variable/roboto-condensed";
import "./assets/common.less";

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { WWTComponent, wwtPinia } from "@wwtelescope/engine-pinia";

import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faAdjust,
  faArrowsAlt,
  faChevronLeft,
  faChevronRight,
  faCircleInfo,
  faGlobe,
  faHeadphones,
  faLayerGroup,
  faLocationCrosshairs,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faMoon,
  faPause,
  faPlay,
  faQrcode,
  faQuestionCircle,
  faRocket,
  faRoute,
  faTimes,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";

library.add(
  faAdjust,
  faArrowsAlt,
  faChevronLeft,
  faChevronRight,
  faCircleInfo,
  faGlobe,
  faHeadphones,
  faLayerGroup,
  faLocationCrosshairs,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faMoon,
  faPause,
  faPlay,
  faQrcode,
  faQuestionCircle,
  faRocket,
  faRoute,
  faTimes,
  faVolumeHigh,
  faVolumeXmark,
);

// Canonical public URL of the deployed site, set at build time
// (VUE_APP_PUBLIC_URL in .env.production.local or the CI environment). The
// kiosk's take-home QR encodes it; when empty it falls back to the current
// URL, which is wrong for a kiosk served from localhost or a LAN.
const PUBLIC_URL = process.env.VUE_APP_PUBLIC_URL ?? "";

// ?kioskStats=1 → the standalone usage-stats panel instead of the viewer.
// Loaded as a separate chunk so ordinary visitors never download it.
if (boolParam("kioskStats")) {
  createApp(defineAsyncComponent(() => import("./KioskStatsPanel.vue"))).mount("#app");
} else {
  createApp(LunarViewer, {
    wwtNamespace: "wwt-lunar-viewer",
    publicUrl: PUBLIC_URL,
  })
    .use(wwtPinia)
    .component("WorldWideTelescope", WWTComponent)
    .component("FontAwesomeIcon", FontAwesomeIcon)
    .mount("#app");
}
