import { defineAgent } from "eve";

export default defineAgent({
  model: "zai/glm-5.2",
  compaction: {
    thresholdPercent: 0.85,
  },
});
