import { recordInstruction } from "../../src/instruction-logger.mjs"

export const InstructionLogger = async (ctx) => {
  const root = ctx.worktree || ctx.directory
  const userMsgIds = new Set()
  const loggedMsgIds = new Set()

  return {
    "chat.message": async (input, output) => {
      const messageId = input.messageID || output.message?.id
      const text = output.parts
        ?.filter((part) => part?.type === "text" && part.text)
        .map((part) => part.text)
        .join("\n")

      if (messageId) loggedMsgIds.add(messageId)
      await recordInstruction({
        projectRoot: root,
        source: "opencode",
        instruction: text,
      })
    },
    event: async ({ event }) => {
      const type = event.type || event?.payload?.type || ""

      if (type === "message.updated") {
        const info = event.properties?.info || event.payload?.properties?.info
        if (info?.role === "user") {
          userMsgIds.add(info.id)
        }
      }

      if (type === "message.part.updated") {
        const part = event.properties?.part || event.payload?.properties?.part
        if (!part) return

        if (
          part.type === "text" &&
          part.text &&
          !part.synthetic &&
          userMsgIds.has(part.messageID) &&
          !loggedMsgIds.has(part.messageID)
        ) {
          userMsgIds.delete(part.messageID)
          loggedMsgIds.add(part.messageID)
          await recordInstruction({
            projectRoot: root,
            source: "opencode",
            instruction: part.text,
          })
        }
      }
    },
  }
}
