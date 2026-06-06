import { Intent, Navigation, Script } from "scripting";
import { View as IntentView } from "./page/intent";
import { github } from "./util/github";

(async () => {
  const fileURLs = Intent.fileURLsParameter;
  if (!fileURLs || fileURLs.length === 0) return;

  github.Local_Path = fileURLs[0];
  await Navigation.present({
    element: <IntentView />,
    // modalPresentationStyle: "fullScreen",
  });
})()
  .catch(async (e) => {
    await new Promise((resolve) => {
      console.present().then(resolve);
      console.error(e);
    });
  })
  .finally(Script.exit);
