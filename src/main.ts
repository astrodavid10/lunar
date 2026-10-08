import { createApp } from "vue";

import LunarViewer from "./lunar-viewer.vue";
import "./assets/common.less";

import vuetify from "../plugins/vuetify";

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { WWTComponent, wwtPinia } from "@wwtelescope/engine-pinia";

import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faChevronLeft,
  faChevronRight,
  faSyncAlt,
  faSearchPlus,
  faSearchMinus,
  faAdjust,
  faInfoCircle,
  faQuestionCircle,
  faRocket,
  faMapMarkerAlt,
  faArrowsAlt,
  faTimes,
  faHandPointer,
} from "@fortawesome/free-solid-svg-icons";

library.add(
  faChevronLeft,
  faChevronRight,
  faSyncAlt,
  faSearchPlus,
  faSearchMinus,
  faAdjust,
  faInfoCircle,
  faQuestionCircle,
  faRocket,
  faMapMarkerAlt,
  faArrowsAlt,
  faTimes,
  faHandPointer,
);

createApp(LunarViewer, {
  wwtNamespace: "wwt-lunar-viewer",
})
  .use(wwtPinia)
  .use(vuetify)
  .component("WorldWideTelescope", WWTComponent)
  .component("font-awesome-icon", FontAwesomeIcon)
  .mount("#app");
