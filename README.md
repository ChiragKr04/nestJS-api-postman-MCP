# NestJS to Postman Collection Generator (MCP)

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A Model Context Protocol (MCP) tool that automatically converts your NestJS controllers into importable Postman API collections. This eliminates the need to manually create Postman collections or implement complex swagger documentation directly within your code.

## Features

- 🚀 **Automatic API Collection Generation**: Transform NestJS controllers into complete Postman collections with a single command
- 🔍 **Intelligent Type Detection**: Automatically detects request and response types to generate meaningful examples
- 🔐 **Auth Integration**: Identifies authentication guards and adds appropriate auth configurations
- 📊 **Complete Endpoint Documentation**: Captures routes, methods, request bodies, and query parameters
- 🧩 **Clean Integration**: Works without modifying your NestJS codebase (no decorators or comments needed)
- 🔌 **MCP Integration**: Works as an AI tool with any [Model Context Protocol](https://github.com/microsoft/modelcontextprotocol) compatible assistant

## Installation

1. Clone the repository:

```bash
git clone https://github.com/ChiragKr04/nestJS-api-postman-MCP.git
cd nestJS-api-postman-MCP
```

2. Install dependencies and build the project:

```bash
npm install
npm run build
```

## Usage

### As an MCP Tool

This tool is designed to work with any AI assistant that supports the Model Context Protocol. After installation, you need to configure your MCP-compatible AI assistant to use this tool.

#### Configuration

##### For Claude Desktop

Add the following configuration to your Claude Desktop settings:

```json
{
  "mcpServers": {
    "Nest-Js-MCP-Postman-Generator": {
      "command": "node",
      "args": [
        "/path/to/your/clone/nestJS-api-postman-MCP/dist/main.js",
        "start"
      ]
    }
  }
}
```

##### For GitHub Copilot/Cursor/Windsurf/Other VS Code based AI tools

Add the following configuration to your VS Code settings.json:

```json
{
  "mcp": {
    "servers": {
      "Nest-Js-MCP-Postman-Generator": {
        "command": "node",
        "args": [
          "/path/to/your/clone/nestJS-api-postman-MCP/dist/main.js",
          "start"
        ]
      }
    }
  }
}
```

> **Note**: Replace `/path/to/your/clone/` with the actual path where you cloned the repository.

#### Usage

Once configured:

1. Just ask the AI to generate a Postman collection for your NestJS controller
2. The AI will use this tool to analyze your controller and generate the collection

Example prompt:

```
Generate a Postman collection for my user.controller.ts file in my NestJS project.
```

### Direct Command Line Usage

The tool also provides a command-line interface for direct usage:

```bash
# Generate using the CLI
node dist/main.js generate /path/to/nestjs/project -o collection.json -n "My API Collection"
```

## API Reference

When used as an MCP tool, the following parameters are available:

| Parameter            | Type     | Description                                                   |
| -------------------- | -------- | ------------------------------------------------------------- |
| `controllerFilePath` | `string` | Path to the NestJS controller file (relative to project root) |
| `projectPath`        | `string` | Path to the NestJS project (containing tsconfig.json)         |
| `collectionName`     | `string` | Name for the generated Postman collection                     |

## Why Use This?

### No More Manual Updates

Each time you change your API endpoints, your Postman collection automatically stays in sync.

### Clean Code

Unlike Swagger/OpenAPI decorators that clutter your codebase with documentation:

```typescript
// No more of this annotation clutter
@ApiOperation({ summary: 'Create a new user' })
@ApiBody({ type: CreateUserDto })
@ApiResponse({ status: 201, description: 'User created successfully' })
@ApiResponse({ status: 400, description: 'Bad Request' })
@Post()
create(@Body() createUserDto: CreateUserDto) {
  return this.userService.create(createUserDto);
}
```

### Accurate Documentation

The tool analyzes your actual code including:

- Route paths from controller decorators
- HTTP methods from method decorators
- Request body types from parameter decorators
- Query parameters and their types
- Authentication requirements

## Example Output

The generated Postman collection will look like this:

```json
{
  "name": "User API",
  "item": [
    {
      "name": "POST /api/users (createUser)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/users",
          "host": ["{{baseUrl}}"],
          "path": ["api", "users"],
          "query": []
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\",\n  \"name\": \"John Doe\"\n}"
        },
        "description": "Generated from createUser in UserController."
      }
    }
  ]
}
```

## Requirements

- Node.js 16+
- A NestJS project with TypeScript

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.
