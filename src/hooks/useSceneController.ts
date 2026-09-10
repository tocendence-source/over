import { useEffect, useState } from "react";
import { sceneBus, setSceneState, type SceneStateName } from "@/lib/sceneBus";
import { systems } from "@/data/systems";

const sections: SceneStateName[] = ["entry", "network", "systems", "methodology", "operator", "contact"];

export function useSceneController(home: boolean, path: string) {
  const [active, setActive] = useState("entry");
  useEffect(() => {
    if (!home) {
      setSceneState("detail");
      sceneBus.visible = true;
      sceneBus.focus = systems.findIndex((system) => system.href === path);
      setActive("systems");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const cursor = window.innerHeight * .36;
      let section: SceneStateName = "entry";
      for (const id of sections) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= cursor) section = id;
      }
      if (sceneBus.state !== section) {
        setSceneState(section);
        if (section === "systems") sceneBus.focus = sceneBus.selectedSystem;
      }
      // Opaque editorial sections do not need the full-screen GPU scene.
      sceneBus.visible = section === "entry" || section === "systems";
      setActive(section);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [home, path]);
  return active;
}