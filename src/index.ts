import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as lark from "@larksuiteoapi/node-sdk";

// Create Lark client instance
const client = new lark.Client({
  appId: process.env.LARK_APP_ID!,
  appSecret: process.env.LARK_APP_SECRET!,
  loggerLevel: "error" as any
});

// Validate schemas
const schemas = {
  toolInputs: {
    send_message_to_user: z.object({
      content: z.string()
    }),
    list_events: z.object({
      start_time: z.string(),
      end_time: z.string()
    }),
    create_event: z.object({
      summary: z.string(),
      description: z.string().optional(),
      start_time: z.string(),
      end_time: z.string(),
      location: z.string().optional(),
      need_notification: z.boolean().optional()
    }),
    add_attendees: z.object({
      event_id: z.string(),
      attendees: z.array(
        z.object({
          type: z.enum(["user", "chat", "resource", "third_party"]),
          user_id: z.string().optional(),
          chat_id: z.string().optional(),
          resource_id: z.string().optional(),
          third_party_email: z.string().optional(),
          is_optional: z.boolean().optional(),
          operate_id: z.string().optional(),
          approval_reason: z.string().optional()
        })
      ),
      need_notification: z.boolean().optional()
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
        },
      },
      required: ["content"]
    },
  },
  {
    name: "list_events",
    description: "List events from the user on Lark",
    inputSchema: {
      type: "object",
      properties: {
        start_time: {
          type: "string",
          description: "Start time in ISO format with UTC+8 timezone (e.g. 2024-03-20T10:00:00+08:00)"
        },
        end_time: {
          type: "string",
          description: "End time in ISO format with UTC+8 timezone (e.g. 2024-03-20T11:00:00+08:00)"
        },
      },
    }
  },
  {
    name: "create_event",
    description: "Create a calendar event on Lark",
    inputSchema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Event title or summary"
        },
        description: {
          type: "string",
          description: "Event description (optional)"
        },
        start_time: {
          type: "string",
          description: "Event start time in ISO format with UTC+8 timezone (e.g. 2024-03-20T10:00:00+08:00)"
        },
        end_time: {
          type: "string",
          description: "Event end time in ISO format with UTC+8 timezone (e.g. 2024-03-20T11:00:00+08:00)"
        },
        location: {
          type: "string",
          description: "Event location (optional)"
        },
        need_notification: {
          type: "boolean",
          description: "Whether to send notification to participants (default: true)"
        }
      },
      required: ["summary", "start_time", "end_time"]
    },
  },

  {
    name: "add_attendees",
    description: "Add attendees to a calendar event on Lark",
    inputSchema: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          description: "ID of the event to add attendees to"
        },
        attendees: {
          type: "array",
          description: "List of attendees to add to the event",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description: "Type of attendee: 'user', 'chat', 'resource', or 'third_party'",
                enum: ["user", "chat", "resource", "third_party"]
              },
              user_id: {
                type: "string",
                description: "User ID when type is 'user'"
              },
              chat_id: {
                type: "string",
                description: "Chat/Group ID when type is 'chat'"
              },
              resource_id: {
                type: "string",
                description: "Resource (meeting room) ID when type is 'resource'"
              },
              third_party_email: {
                type: "string",
                description: "Email address when type is 'third_party'"
              },
              is_optional: {
                type: "boolean",
                description: "Whether the attendee is optional (default: false)"
              },
              operate_id: {
                type: "string",
                description: "Operator ID for room booking contact"
              },
              approval_reason: {
                type: "string",
                description: "Reason for booking a room"
              }
            },
            required: ["type"]
          }
        },
        need_notification: {
          type: "boolean",
          description: "Whether to send notifications to added attendees (default: true)"
        }
      },
      required: ["event_id", "attendees"]
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
  },

  async list_events(args: unknown) {
    const { start_time, end_time } = schemas.toolInputs.list_events.parse(args);
    
    // Convert ISO strings to Unix timestamps
    const startUnix = Math.floor(new Date(start_time).getTime() / 1000).toString();
    const endUnix = Math.floor(new Date(end_time).getTime() / 1000).toString();
    
    const result = await client.calendar.v4.calendarEvent.list({
      path: {
        calendar_id: process.env.LARK_CALENDAR_ID!,
      },
      params: {
        page_size: 500,
        start_time: startUnix,
        end_time: endUnix,
      }
    }, lark.withUserAccessToken(process.env.LARK_USER_ACCESS_TOKEN!));

    console.error("Received response:", JSON.stringify(result, null, 2));

    if (!result) {
      return {
        content: [{
          type: "text" as const,
          text: "Failed to list events from Lark"
        }]
      };
    }
    
    if (result.code !== 0) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to list events: ${result.msg || "Unknown error"}`
        }]
      };
    }

    const allEvents = result.data?.items || [];
    // Filter out cancelled events
    const events = allEvents.filter(event => 
      event.status !== "cancelled" && 
      event.is_exception !== true
    );

    
    // Format events in the desired structure
    const formattedEvents = events.map(event => {
      const startTimestamp = event.start_time?.timestamp || "0";
      const endTimestamp = event.end_time?.timestamp || "0";
      
      return {
        summary: event.summary || "",
        organizer: event.event_organizer?.display_name || "",
        status: event.status || "unknown",
        startTime: new Date(parseInt(startTimestamp) * 1000).toISOString(),
        endTime: new Date(parseInt(endTimestamp) * 1000).toISOString()
      };
    });

    return {
      content: [{
        type: "text" as const,
        text: events.length ? 
          `Found ${events.length} active events:\n\n${JSON.stringify(formattedEvents, null, 2)}` : 
          "No active events found in the given time range"
      }]
    };
  },

  async create_event(args: unknown) {
    const { summary, description, start_time, end_time, location, need_notification } = 
      schemas.toolInputs.create_event.parse(args);
    
    try {
      // Convert ISO strings to time_info objects
      const startTimestamp = Math.floor(Date.parse(start_time) / 1000).toString();
      const endTimestamp = Math.floor(Date.parse(end_time) / 1000).toString();
      
      // Create request data
      const requestData: any = {
        summary,
        need_notification: need_notification ?? true,
        start_time: {
          timestamp: startTimestamp,
          timezone: "Asia/Shanghai"
        },
        end_time: {
          timestamp: endTimestamp,
          timezone: "Asia/Shanghai"
        }
      };
      
      // Add optional fields if provided
      if (description) {
        requestData.description = description;
      }
      
      if (location) {
        requestData.location = {
          name: location
        };
      }
      
      // Generate a UUID for idempotency_key
      
      console.error("Creating event with data:", JSON.stringify(requestData, null, 2));
      
      const result = await client.calendar.v4.calendarEvent.create({
        path: {
          calendar_id: process.env.LARK_CALENDAR_ID!,
        },
        data: requestData
      }, lark.withUserAccessToken(process.env.LARK_USER_ACCESS_TOKEN!));
      
      console.error("Received response:", JSON.stringify(result, null, 2));
      
      if (!result) {
        return {
          content: [{
            type: "text" as const,
            text: "Failed to create event in Lark calendar"
          }]
        };
      }
      
      if (result.code !== 0) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to create event: ${result.msg || "Unknown error"}`
          }]
        };
      }
      
      // Extract event details from the response
      const eventData = result.data?.event;
      const eventId = eventData?.event_id || "unknown";
      const eventSummary = eventData?.summary || summary;
      
      return {
        content: [{
          type: "text" as const,
          text: `Event "${eventSummary}" created successfully!\nEvent ID: ${eventId}`
        }]
      };
    } catch (error) {
      console.error("Error creating Lark calendar event:", error);
      return {
        content: [{
          type: "text" as const,
          text: `Error creating event: ${error instanceof Error ? error.message : "Unknown error"}`
        }]
      };
    }
  },
  async add_attendees(args: unknown) {
    const { event_id, attendees, need_notification } = schemas.toolInputs.add_attendees.parse(args);
    
    try {
      // Transform attendees to Lark API format
      const transformedAttendees = attendees.map(attendee => {
        const transformedAttendee: any = {
          type: attendee.type,
          is_optional: attendee.is_optional || false
        };
        
        // Add type-specific ID field
        switch (attendee.type) {
          case "user":
            if (!attendee.user_id) {
              throw new Error("user_id is required when type is 'user'");
            }
            transformedAttendee.user_id = attendee.user_id;
            break;
          case "chat":
            if (!attendee.chat_id) {
              throw new Error("chat_id is required when type is 'chat'");
            }
            transformedAttendee.chat_id = attendee.chat_id;
            break;
          case "resource":
            if (!attendee.resource_id) {
              throw new Error("resource_id is required when type is 'resource'");
            }
            transformedAttendee.resource_id = attendee.resource_id;
            break;
          case "third_party":
            if (!attendee.third_party_email) {
              throw new Error("third_party_email is required when type is 'third_party'");
            }
            transformedAttendee.third_party_email = attendee.third_party_email;
            break;
        }
        
        // Add optional fields if present
        if (attendee.operate_id) {
          transformedAttendee.operate_id = attendee.operate_id;
        }
        
        if (attendee.approval_reason) {
          transformedAttendee.approval_reason = attendee.approval_reason;
        }
        
        return transformedAttendee;
      });
      
      // Prepare request data
      const requestData = {
        attendees: transformedAttendees,
        need_notification: need_notification ?? true
      };
      
      console.error(`Adding attendees to event ${event_id} with data:`, JSON.stringify(requestData, null, 2));
      
      const result = await client.calendar.v4.calendarEventAttendee.create({
        path: {
          calendar_id: process.env.LARK_CALENDAR_ID!,
          event_id: event_id
        },
        data: requestData
      }, lark.withUserAccessToken(process.env.LARK_USER_ACCESS_TOKEN!));
      
      console.error("Received response:", JSON.stringify(result, null, 2));
      
      if (!result) {
        return {
          content: [{
            type: "text" as const,
            text: "Failed to add attendees to event"
          }]
        };
      }
      
      if (result.code !== 0) {
        return {
          content: [{
            type: "text" as const,
            text: `Failed to add attendees: ${result.msg || "Unknown error"}`
          }]
        };
      }
      
      // Get information about added attendees
      const addedAttendees = result.data?.attendees || [];
      const attendeeCount = addedAttendees.length;
      
      return {
        content: [{
          type: "text" as const,
          text: `Successfully added ${attendeeCount} attendee(s) to the event`
        }]
      };
    } catch (error) {
      console.error("Error adding attendees to event:", error);
      return {
        content: [{
          type: "text" as const,
          text: `Error adding attendees: ${error instanceof Error ? error.message : "Unknown error"}`
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
      'LARK_USER_ID',
      'LARK_CALENDAR_ID',
      'LARK_USER_ACCESS_TOKEN'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      process.exit(1);
    }

    console.error("Starting server with env vars:", {
      appId: process.env.LARK_APP_ID?.substring(0, 5) + '...',
      appSecret: process.env.LARK_APP_SECRET?.substring(0, 5) + '...',
      hasUserId: !!process.env.LARK_USER_ID,
      hasCalendarId: !!process.env.LARK_CALENDAR_ID
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