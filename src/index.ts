import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Client } from "@larksuiteoapi/node-sdk";

// Create Lark client instance
const client = new Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  loggerLevel: "error" as any
});

// Validate schemas
const schemas = {
  toolInputs: {
    send_message_to_user: z.object({
      content: z.string()
    })
  }
}

// Tool definition
const TOOL_DEFINITIONS = [
  {
    name: "send_message_to_user",
    description: "Send a message to the user on Lark",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Content of the message"
        }
      },
      required: ["content"]
    }
  }
]

// Tool implementation handlers
const toolHandlers = {
  async send_message_to_user(args: unknown) {
    const { content } = schemas.toolInputs.send_message_to_user.parse(args);
    try {
      const messageContent = JSON.stringify({ text: content });
      console.error("Sending message content:", messageContent);
      
      const result = await client.im.message.create({
          params: {
            receive_id_type: "user_id", 
          },
          data: {
            receive_id: process.env.LARK_USER_ID!,
            msg_type: "text",
            content: messageContent
          },
      });
      
      console.error("Received response:", JSON.stringify(result, null, 2));

      if (!result) {
        return {
          content: [{
            type: "text" as const,
            text: "Failed to send message to Lark"
          }]
        };
      }

      if (result.code !== 0) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to send message: ${result.msg || "Unknown error"}`
          }]
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: `Message sent successfully! Message ID: ${result.data?.message_id || "unknown"}`
        }]
      };
    } catch (error) {
      console.error("Error sending Lark message:", error);
      return {
        content: [{
          type: "text" as const,
          text: `Error sending message: ${error instanceof Error ? error.message : "Unknown error"}`
        }]
      };
    }
  }
};

// Create server instance
const server = new Server({
  name: "lark-mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  }
});


// Register tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Tools requested by client");
  console.error("Returning tools:", JSON.stringify(TOOL_DEFINITIONS, null, 2));
  return { tools: TOOL_DEFINITIONS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const handler = toolHandlers[name as keyof typeof toolHandlers];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    return await handler(args);
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw error;
  }
});

// Main function to run the server
async function main() {
  try {
    // Check for required environment variables
    const requiredEnvVars = [
      'LARK_APP_ID',
      'LARK_APP_SECRET',
      'LARK_USER_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      process.exit(1);
    }

    console.error("Starting server with env vars:", {
      appId: process.env.LARK_APP_ID?.substring(0, 5) + '...',
      appSecret: process.env.LARK_APP_SECRET?.substring(0, 5) + '...',
      hasUserId: !!process.env.LARK_USER_ID
    });

    const transport = new StdioServerTransport();
    console.error("Created transport");
    
    await server.connect(transport);
    console.error("Connected to transport");
    
    console.error("Lark MCP Server running on stdio");
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});