# Lark MCP Server

A Model Context Protocol (MCP) server implementation for Lark/Feishu, enabling MCP-compatible applications to interact with Lark's various collaboration capabilities.

## Overview

Lark MCP Server provides a bridge between AI models and Lark's collaboration platform by implementing the Model Context Protocol (MCP) specification. This server allows AI assistants to:

- Send messages to Lark users
- Retrieve calendar events
- Create new calendar events
- Add attendees to calendar events

The server uses the standard I/O (stdio) transport layer to communicate with MCP clients, making it compatible with various AI model implementations that support the MCP standard.

## Features

- **Message Sending**: AI models can send direct messages to Lark users
- **Calendar Management**:
  - List events within a specific time range
  - Create new calendar events with customizable details
  - Add various types of attendees to events (users, groups, meeting rooms, external emails)

## Prerequisites

- Node.js v18 or higher
- A registered Lark/Feishu application with appropriate permissions
- User access token for calendar operations

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/junyuan-qi/lark-mcp-server.git
   cd lark-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Connecting with an MCP Client

The server communicates via standard input/output (stdio). MCP clients can connect to the server by launching it as a child process and communicating through its stdin/stdout channels.

### Setting Up with Claude Desktop

You can integrate this MCP server with Claude Desktop by configuring the Claude Desktop application to recognize and use the Lark MCP server.

#### 1. Configure Claude Desktop to recognize the Lark MCP server

You can find `claude_desktop_config.json` inside the settings of Claude Desktop app:

1. Open the Claude Desktop app and enable Developer Mode from the top-left menu bar.
2. Once enabled, open Settings (also from the top-left menu bar) and navigate to the Developer Option, where you'll find the Edit Config button. Clicking it will open the `claude_desktop_config.json` file, allowing you to make the necessary edits.

Alternatively, you can open `claude_desktop_config.json` directly from terminal:

For macOS:
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

For Windows:
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

#### 2. Add the Lark MCP server configuration

Add the following configuration to the `mcpServers` section of your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lark-mcp-server": {
      "command": "node",
      "args": ["/path/to/lark-mcp-server/build/index.js"],
      "env": {
        "LARK_APP_ID": "your_app_id",
        "LARK_APP_SECRET": "your_app_secret",
        "LARK_USER_ID": "target_user_id",
        "LARK_CALENDAR_ID": "target_calendar_id",
        "LARK_USER_ACCESS_TOKEN": "your_user_access_token"
      }
    }
  }
}
```

Replace the path and environment variables with your actual values. This configuration tells Claude Desktop how to launch the Lark MCP server and what environment variables to provide.

#### 3. Restart Claude Desktop

For the changes to take effect:

1. Completely quit Claude Desktop (not just close the window)
2. Start Claude Desktop again
3. Look for an icon in the UI to verify the Lark MCP server is connected

Once connected, Claude will be able to send messages to Lark users and manage calendar events on your behalf.

## Development

### Project Structure

- `src/index.ts`: Main server implementation
- `build/`: Compiled JavaScript files
- `package.json`: Project dependencies and scripts

### Building

```bash
npm run build
```

This compiles the TypeScript code to JavaScript in the `build` directory and sets executable permissions.

## Troubleshooting

Check the server logs (written to stderr) for detailed error information. Common issues include:

- Missing environment variables
- Incorrect or expired access tokens
- Insufficient permissions for the Lark application
- Invalid request parameters

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

For more information about the Model Context Protocol, visit the [MCP Documentation](https://modelcontextprotocol.io/introduction).

For more information about Lark/Feishu API, visit the [Lark Open Platform Documentation](https://open.larkoffice.com/document/home/index).