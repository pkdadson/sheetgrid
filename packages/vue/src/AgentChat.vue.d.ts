import type { DefineComponent } from "vue";
import type {
  AgentLoopOptions,
  GridController,
} from "@sheetgrid/agent";

export interface AgentChatProps {
  controller: GridController;
  send: AgentLoopOptions["send"];
  onBeforeTool?: AgentLoopOptions["onBeforeTool"];
  onAfterTool?: AgentLoopOptions["onAfterTool"];
  maxHistory?: AgentLoopOptions["maxHistory"];
  toolFilter?: AgentLoopOptions["toolFilter"];
  systemPrompt?: AgentLoopOptions["systemPrompt"];
  maxIterations?: AgentLoopOptions["maxIterations"];
  placeholder?: string;
}

declare const AgentChat: DefineComponent<AgentChatProps>;
export default AgentChat;
