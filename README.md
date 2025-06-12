# SBB/CFF/FFS MCP

A [Model Context Protocol](https://modelcontextprotocol.io) server for the Swiss Federal Railways.

This project is a proof of concept for a Model Context Protocol server that provides information about the Swiss Federal Railways (SBB/CFF/FFS) trains, stations, and other related data.

## Usage

Run the MCP server with the following command:

```bash
npx -y @mbstudio/sbb-mcp@latest
```

## Available Tools

| Tool             | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `sbb_get_places` | Return a list of places available from name                 |
| `sbb_get_trips`  | Return a list of trips available from two places ID or name |

## Development

To run the MCP server in development mode, you can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector).

First build the server:

```bash
pnpm build
```

Then run the server inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```
